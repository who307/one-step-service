package com.onkey.onestep.rag;

import static org.assertj.core.api.Assertions.*;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicReference;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.postgresql.ds.PGSimpleDataSource;
import org.springframework.jdbc.core.JdbcTemplate;
import com.onkey.onestep.common.ApiException;
import com.onkey.onestep.common.ErrorCode;
import com.onkey.onestep.rag.RagDtos.SearchRequest;

/** Real PostgreSQL+pgvector integration, isolated random schema, no paid network calls. */
@EnabledIfEnvironmentVariable(named="RAG_TEST_DB_URL",matches=".+")
class RagDatabaseTest {
    private PGSimpleDataSource ds;
    private String schema;
    private RagStore store;
    private FakeEmbedding embedding;
    private AtomicReference<RagSourceDocument> document;
    private RagService service;
    private static final String ID="ontong-123";

    @BeforeEach void setup() {
        ds=new PGSimpleDataSource();
        ds.setURL(System.getenv("RAG_TEST_DB_URL"));
        ds.setUser(System.getenv().getOrDefault("RAG_TEST_DB_USER","onestep"));
        ds.setPassword(System.getenv().getOrDefault("RAG_TEST_DB_PASSWORD",""));
        schema="rag_test_"+UUID.randomUUID().toString().replace("-","");
        ds.setCurrentSchema(schema+",public");
        Flyway.configure().dataSource(ds).schemas(schema).defaultSchema(schema)
                .locations("classpath:db/rag").load().migrate();
        store=new RagStore(ds);
        embedding=new FakeEmbedding();
        document=new AtomicReference<>(doc(ID,"## 참여 대상\n서울 청년\n## 제출 서류\n신청서"));
        service=new RagService(store,embedding,new RagChunker(),id->Optional.of(document.get()),properties());
    }
    @AfterEach void cleanup() {
        if (ds!=null && schema!=null) new JdbcTemplate(ds).execute("DROP SCHEMA "+schema+" CASCADE");
    }
    @Test void ingestsThenSkipsUnchangedAndSearches() {
        var first=service.index(ID);
        assertThat(first.status()).isEqualTo("READY");
        assertThat(first.chunkCount()).isEqualTo(2);
        var unchanged=service.index(ID);
        assertThat(unchanged.status()).isEqualTo("UNCHANGED");
        assertThat(unchanged.documentVersion()).isEqualTo(first.documentVersion());
        assertThat(embedding.calls).isEqualTo(1);
        var result=service.search(new SearchRequest(ID,"제출 서류",4));
        assertThat(result.status()).isEqualTo("OK");
        assertThat(result.evidence()).hasSize(2);
        assertThat(result.documentVersion()).isEqualTo(first.documentVersion());
        assertThat(result.evidence()).allSatisfy(e->assertThat(e.sourceUrl()).endsWith(ID));
    }
    @Test void changedSourceAtomicallyReplacesAndOtherProgramsNeverLeak() {
        UUID old=service.index(ID).documentVersion();
        document.set(doc(ID,"## 제출 서류\n변경된 새 서류"));
        UUID current=service.index(ID).documentVersion();
        assertThat(current).isNotEqualTo(old);
        document.set(doc("ontong-456","## 제출 서류\n다른 공고의 기밀조건"));
        service.index("ontong-456");
        var result=service.search(new SearchRequest(ID,"서류",8));
        assertThat(result.evidence()).hasSize(1);
        assertThat(result.evidence().getFirst().text()).contains("변경된 새 서류").doesNotContain("기밀조건");
        assertThat(store.chunkCount(old)).isEqualTo(2); // historical evidence remains reproducible
    }
    @Test void failedRefreshKeepsPreviousVersionAndReportsFailure() {
        UUID old=service.index(ID).documentVersion();
        document.set(doc(ID,"## 참여 대상\n변경 내용"));
        embedding.fail=true;
        assertThatThrownBy(()->service.index(ID)).isInstanceOf(ApiException.class);
        assertThat(store.active(ID).orElseThrow().id()).isEqualTo(old);
        assertThat(service.status(ID).status()).isEqualTo("READY");
        assertThat(service.status(ID).lastError()).isEqualTo("LLM_ERROR");
        embedding.fail=false;
        assertThat(service.search(new SearchRequest(ID,"서류",4)).evidence()).hasSize(2);
    }
    @Test void modelChangeRequiresReindexBeforeQueryEmbedding() {
        service.index(ID);
        embedding.name="text-embedding-3-large";
        int calls=embedding.calls;
        assertThat(service.search(new SearchRequest(ID,"서류",4)).status()).isEqualTo("REINDEX_REQUIRED");
        assertThat(service.status(ID).status()).isEqualTo("REINDEX_REQUIRED");
        assertThat(embedding.calls).isEqualTo(calls);
        service.index(ID);
        assertThat(service.status(ID).status()).isEqualTo("READY");
    }
    @Test void missingDocumentReturnsStatusWithoutEmbeddingCall() {
        assertThat(service.search(new SearchRequest(ID,"질문",4)).status()).isEqualTo("NOT_INDEXED");
        assertThat(embedding.calls).isZero();
    }
    @Test void advisoryLockPreventsConcurrentIndexingAndIsReleasedAfterFailure() {
        assertThatThrownBy(()->store.locked(ID,()->store.locked(ID,()->true)))
                .isInstanceOfSatisfying(ApiException.class,e->assertThat(e.getErrorCode()).isEqualTo(ErrorCode.RAG_INDEXING));
        assertThat(store.locked(ID,()->true)).isTrue();
    }
    @Test void sqlFailureRollsBackVersionAndChunks() {
        UUID old=service.index(ID).documentVersion();
        UUID job=store.begin(ID);
        RagSourceDocument invalid=new RagSourceDocument(ID,"title","https://example.test", "not-json","content");
        assertThatThrownBy(()->store.save(job,invalid,"changed","text-embedding-3-small",3,
                List.of(new RagChunker.Chunk("section","content")),List.of(new float[]{1,0,0}))).isInstanceOf(RuntimeException.class);
        assertThat(store.active(ID).orElseThrow().id()).isEqualTo(old);
        assertThat(new JdbcTemplate(ds).queryForObject("SELECT count(*) FROM rag_document_versions",Integer.class)).isEqualTo(1);
    }
    private static RagSourceDocument doc(String id,String content) {
        return new RagSourceDocument(id,"테스트 공고","https://example.test/"+id,"{}",content);
    }
    private static RagProperties properties() {
        return new RagProperties(true,"","","","","text-embedding-3-small",3,"test-token",4,0.25,false,List.of());
    }
    private static class FakeEmbedding implements EmbeddingClient {
        int calls; boolean fail; String name="text-embedding-3-small";
        public String model() { return name; }
        public int dimensions() { return 3; }
        public List<float[]> embed(List<String> texts) {
            calls++;
            if (fail) throw new ApiException(ErrorCode.LLM_ERROR);
            return texts.stream().map(t->new float[]{1,0,0}).toList();
        }
    }
}
