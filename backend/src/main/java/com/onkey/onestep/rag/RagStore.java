package com.onkey.onestep.rag;

import java.sql.Connection;
import java.sql.SQLException;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.function.Supplier;
import javax.sql.DataSource;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DataSourceTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import com.onkey.onestep.common.ApiException;
import com.onkey.onestep.common.ErrorCode;
import com.onkey.onestep.rag.RagDtos.Evidence;
import com.onkey.onestep.rag.RagDtos.StatusResponse;

public class RagStore {
    private final DataSource dataSource;
    private final JdbcTemplate jdbc;
    private final TransactionTemplate tx;

    public RagStore(DataSource dataSource) {
        this.dataSource = dataSource;
        this.jdbc = new JdbcTemplate(dataSource);
        this.tx = new TransactionTemplate(new DataSourceTransactionManager(dataSource));
    }
    public record Version(UUID id, String fingerprint, String model, int dimensions, String sourceUrl, String pipelineVersion) {}

    /** DB 세션 잠금은 서버 간 중복 처리를 막고, 연결 종료 시 자동 해제된다. */
    public <T> T locked(String programId, Supplier<T> action) {
        try (Connection c = dataSource.getConnection()) {
            try (var s = c.prepareStatement("SELECT pg_try_advisory_lock(hashtextextended(?, 0))")) {
                s.setString(1, programId);
                try (var r = s.executeQuery()) {
                    r.next();
                    if (!r.getBoolean(1)) throw new ApiException(ErrorCode.RAG_INDEXING);
                }
            }
            return action.get(); // connection close releases the session lock even when work fails
        } catch (SQLException e) {
            throw new ApiException(ErrorCode.RAG_UNAVAILABLE);
        }
    }

    public UUID begin(String programId) {
        return tx.execute(status -> {
            jdbc.update("INSERT INTO rag_sources(program_id) VALUES (?) ON CONFLICT DO NOTHING", programId);
            // Having acquired the session lock, any prior INDEXING job belongs to an interrupted process.
            jdbc.update("UPDATE rag_ingestion_jobs SET status='FAILED',error_code='INTERRUPTED',finished_at=now() WHERE program_id=? AND status='INDEXING'", programId);
            UUID job = UUID.randomUUID();
            jdbc.update("INSERT INTO rag_ingestion_jobs(id,program_id,status) VALUES (?,?,'INDEXING')", job, programId);
            return job;
        });
    }
    public void fail(UUID job, String safeCode) {
        jdbc.update("UPDATE rag_ingestion_jobs SET status='FAILED',error_code=?,finished_at=now() WHERE id=?", safeCode, job);
    }
    public Optional<Version> active(String programId) {
        return jdbc.query("""
                SELECT v.id,v.fingerprint,v.model,v.dimensions,v.source_url,v.pipeline_version FROM rag_sources s
                JOIN rag_document_versions v ON v.id=s.active_version AND v.program_id=s.program_id
                WHERE s.program_id=?
                """, (r,n) -> new Version(r.getObject(1, UUID.class),r.getString(2),r.getString(3),r.getInt(4),r.getString(5),r.getString(6)), programId)
                .stream().findFirst();
    }
    public int chunkCount(UUID version) {
        return jdbc.queryForObject("SELECT count(*) FROM rag_chunks WHERE version_id=?", Integer.class, version);
    }
    public UUID save(UUID job, RagSourceDocument doc, String fingerprint, String model, int dimensions,
            List<RagChunker.Chunk> chunks, List<float[]> vectors) {
        if (chunks.isEmpty() || chunks.size() != vectors.size()) throw new IllegalArgumentException("Invalid chunk embeddings");
        for (float[] v : vectors) {
            if (v.length != dimensions) throw new IllegalArgumentException("Embedding dimensions mismatch");
            vector(v);
        }
        return tx.execute(status -> {
            List<UUID> previous = jdbc.query("SELECT id FROM rag_document_versions WHERE program_id=? AND fingerprint=?",
                    (r,n) -> r.getObject(1, UUID.class), doc.programId(), fingerprint);
            UUID version;
            if (!previous.isEmpty()) {
                version = previous.getFirst();
            } else {
                version = UUID.randomUUID();
                jdbc.update("""
                        INSERT INTO rag_document_versions(id,program_id,title,source_url,raw_json,content,fingerprint,model,dimensions,pipeline_version)
                        VALUES (?,?,?,?,?::jsonb,?,?,?,?,?)
                        """, version, doc.programId(), doc.title(), doc.sourceUrl(), doc.rawJson(), doc.content(),
                        fingerprint, model, dimensions, RagChunker.PIPELINE_VERSION);
                for (int i=0;i<chunks.size();i++) {
                    RagChunker.Chunk chunk = chunks.get(i);
                    jdbc.update("INSERT INTO rag_chunks(id,version_id,ordinal,section,content,embedding) VALUES (?,?,?,?,?,?::vector)",
                            UUID.randomUUID(), version, i, chunk.section(), chunk.content(), vector(vectors.get(i)));
                }
            }
            jdbc.update("UPDATE rag_sources SET active_version=?,last_checked_at=now() WHERE program_id=?", version, doc.programId());
            jdbc.update("UPDATE rag_ingestion_jobs SET status='READY',finished_at=now() WHERE id=?", job);
            return version;
        });
    }
    public void unchanged(UUID job, String programId) {
        tx.executeWithoutResult(status -> {
            jdbc.update("UPDATE rag_sources SET last_checked_at=now() WHERE program_id=?", programId);
            jdbc.update("UPDATE rag_ingestion_jobs SET status='UNCHANGED',finished_at=now() WHERE id=?", job);
        });
    }
    public List<Evidence> search(String programId, UUID version, float[] query, int topK, double minScore) {
        // Exact similarity within one program/version: no ANN post-filter omissions, deterministic ties.
        return jdbc.query("""
                SELECT c.id,c.section,c.content,v.source_url,1-(c.embedding <=> ?::vector) AS score
                FROM rag_chunks c JOIN rag_document_versions v ON v.id=c.version_id
                WHERE v.program_id=? AND v.id=?
                AND 1-(c.embedding <=> ?::vector) >= ?
                ORDER BY c.embedding <=> ?::vector, c.ordinal LIMIT ?
                """, (r,n) -> new Evidence(r.getObject(1, UUID.class),r.getString(2),r.getString(3),r.getString(4),r.getDouble(5)),
                vector(query), programId, version, vector(query), minScore, vector(query), topK);
    }
    public StatusResponse status(String programId) {
        Optional<Version> active = active(programId);
        List<String[]> jobs = jdbc.query("SELECT status,error_code FROM rag_ingestion_jobs WHERE program_id=? ORDER BY started_at DESC,id DESC LIMIT 1",
                (r,n) -> new String[] {r.getString(1),r.getString(2)}, programId);
        String jobState = jobs.isEmpty() ? "NOT_INDEXED" : jobs.getFirst()[0];
        String error = jobs.isEmpty() ? null : jobs.getFirst()[1];
        // A failed refresh must not hide a previously usable version.
        String state = "INDEXING".equals(jobState) ? jobState : active.isPresent() ? "READY" : jobState;
        return new StatusResponse(programId,state,active.map(Version::id).orElse(null),active.map(Version::model).orElse(null),
                active.map(Version::dimensions).orElse(null),error);
    }
    static String vector(float[] values) {
        if (values.length == 0) throw new IllegalArgumentException("Empty embedding");
        StringBuilder result = new StringBuilder("[");
        boolean nonzero = false;
        for (int i=0;i<values.length;i++) {
            if (!Float.isFinite(values[i])) throw new IllegalArgumentException("Invalid embedding");
            nonzero |= values[i] != 0;
            if (i>0) result.append(',');
            result.append(values[i]);
        }
        if (!nonzero) throw new IllegalArgumentException("Zero embedding");
        return result.append(']').toString();
    }
}
