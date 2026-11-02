package com.onkey.onestep.rag;

import org.flywaydb.core.Flyway;
import org.postgresql.ds.PGSimpleDataSource;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;
import com.onkey.onestep.integration.OntongYouthProgramProvider;

@Configuration(proxyBeanMethods = false)
@ConditionalOnProperty(name = "onestep.rag.enabled", havingValue = "true")
@EnableScheduling
public class RagConfiguration {
    @Bean
    RagStore ragStore(RagProperties p) {
        if (p.apiKey() == null || p.apiKey().isBlank() || p.adminToken() == null || p.adminToken().isBlank())
            throw new IllegalStateException("RAG requires OPENAI_API_KEY and RAG_ADMIN_TOKEN");
        if (p.topK() < 1 || p.topK() > 8 || !Double.isFinite(p.minScore()) || p.minScore() < -1 || p.minScore() > 1)
            throw new IllegalStateException("Invalid RAG retrieval configuration");
        PGSimpleDataSource ds = new PGSimpleDataSource();
        ds.setURL(p.dbUrl());
        ds.setUser(p.dbUser());
        ds.setPassword(p.dbPassword());
        ds.setConnectTimeout(5);
        ds.setSocketTimeout(30);
        Flyway.configure().dataSource(ds).locations("classpath:db/rag")
                .table("rag_schema_history").cleanDisabled(true).load().migrate();
        return new RagStore(ds);
    }

    @Bean EmbeddingClient ragEmbeddingClient(RagProperties p) {
        return new OpenAiEmbeddingClient(p.apiKey(), p.embeddingModel(), p.embeddingDimensions());
    }
    @Bean RagChunker ragChunker() { return new RagChunker(); }
    @Bean RagService ragService(RagStore store, EmbeddingClient embedding, RagChunker chunker,
            OntongYouthProgramProvider source, RagProperties p) {
        return new RagService(store, embedding, chunker, source::fetchRagDocument, p);
    }
    @Bean RagSync ragSync(RagService service, RagProperties properties) {
        return new RagSync(service, properties);
    }
}
