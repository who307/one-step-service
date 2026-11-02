package com.onkey.onestep.rag;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.function.Function;
import com.onkey.onestep.common.ApiException;
import com.onkey.onestep.common.ErrorCode;
import com.onkey.onestep.rag.RagDtos.*;
import lombok.extern.slf4j.Slf4j;

@Slf4j
public class RagService {
    private final RagStore store;
    private final EmbeddingClient embedding;
    private final RagChunker chunker;
    private final Function<String,Optional<RagSourceDocument>> source;
    private final RagProperties properties;

    public RagService(RagStore store, EmbeddingClient embedding, RagChunker chunker,
            Function<String,Optional<RagSourceDocument>> source, RagProperties properties) {
        this.store=store; this.embedding=embedding; this.chunker=chunker; this.source=source; this.properties=properties;
    }
    public IndexResponse index(String programId) {
        requireProgramId(programId);
        return store.locked(programId, () -> {
            UUID job = store.begin(programId);
            try {
                RagSourceDocument doc = source.apply(programId).orElseThrow(() -> new ApiException(ErrorCode.NOT_FOUND));
                if (!programId.equals(doc.programId())) throw new IllegalStateException("Source identifier mismatch");
                String fingerprint = fingerprint(doc,embedding.model(),embedding.dimensions());
                Optional<RagStore.Version> active = store.active(programId);
                if (active.isPresent() && active.get().fingerprint().equals(fingerprint)) {
                    store.unchanged(job,programId);
                    return new IndexResponse(programId,"UNCHANGED",active.get().id(),store.chunkCount(active.get().id()));
                }
                List<RagChunker.Chunk> chunks = chunker.split(doc);
                if (chunks.isEmpty()) throw new ApiException(ErrorCode.RAG_UNAVAILABLE);
                List<float[]> vectors = embedding.embed(chunks.stream().map(RagChunker.Chunk::content).toList());
                UUID version = store.save(job,doc,fingerprint,embedding.model(),embedding.dimensions(),chunks,vectors);
                log.info("rag indexed programId={} chunks={} version={}", programId,chunks.size(),version);
                return new IndexResponse(programId,"READY",version,chunks.size());
            } catch (RuntimeException e) {
                String code = e instanceof ApiException api ? api.getErrorCode().code() : "INDEX_FAILED";
                try { store.fail(job,code); } catch (RuntimeException ignored) { log.warn("rag job status update failed job={}",job); }
                log.warn("rag indexing failed programId={} code={}", programId,code);
                if (e instanceof ApiException) throw e;
                throw new ApiException(ErrorCode.RAG_UNAVAILABLE);
            }
        });
    }
    public StatusResponse status(String programId) {
        requireProgramId(programId);
        StatusResponse status = store.status(programId);
        Optional<RagStore.Version> version = store.active(programId);
        if (version.isPresent() && !compatible(version.get()))
            return new StatusResponse(programId,"REINDEX_REQUIRED",status.documentVersion(),status.model(),status.dimensions(),status.lastError());
        return status;
    }
    public SearchResponse search(SearchRequest request) {
        requireProgramId(request.programId());
        Optional<RagStore.Version> active = store.active(request.programId());
        if (active.isEmpty()) {
            String state = store.status(request.programId()).status();
            if ("READY".equals(state)) active = store.active(request.programId());
            if (active.isEmpty()) return new SearchResponse(request.programId(),
                    "READY".equals(state) ? "NOT_INDEXED" : state,null,List.of(),0,0);
        }
        RagStore.Version v = active.get();
        if (!compatible(v))
            return new SearchResponse(request.programId(),"REINDEX_REQUIRED",v.id(),List.of(),0,0);
        long start = System.nanoTime();
        float[] query = embedding.embed(List.of(request.query())).getFirst();
        long embeddingMs = elapsed(start);
        start = System.nanoTime();
        List<Evidence> evidence = store.search(request.programId(),v.id(),query,
                request.topK()==null ? properties.topK() : request.topK(),properties.minScore());
        return new SearchResponse(request.programId(),evidence.isEmpty()?"NO_EVIDENCE":"OK",v.id(),evidence,embeddingMs,elapsed(start));
    }
    static String fingerprint(RagSourceDocument doc, String model, int dimensions) {
        try {
            String input = String.join("\u0000", doc.programId(),doc.title(),doc.sourceUrl(),doc.content(),
                    model,Integer.toString(dimensions),RagChunker.PIPELINE_VERSION);
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(input.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException e) { throw new IllegalStateException("SHA-256 unavailable"); }
    }
    private static long elapsed(long start) { return (System.nanoTime()-start)/1_000_000; }
    private boolean compatible(RagStore.Version v) {
        return embedding.model().equals(v.model()) && embedding.dimensions()==v.dimensions()
                && RagChunker.PIPELINE_VERSION.equals(v.pipelineVersion());
    }
    private static void requireProgramId(String id) {
        if (id==null || !id.matches("ontong-[0-9]{1,30}")) throw new ApiException(ErrorCode.INVALID_REQUEST);
    }
}
