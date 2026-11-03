package com.onkey.onestep.rag;

import java.util.List;
import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties("onestep.rag")
public record RagProperties(boolean enabled, String dbUrl, String dbUser, String dbPassword,
        String apiKey, String embeddingModel, int embeddingDimensions, String adminToken,
        int topK, double minScore, boolean syncEnabled, List<String> programIds) {
    // 키/비밀번호가 record 기본 toString에 포함되지 않도록 한다.
    @Override public String toString() { return "RagProperties[enabled=" + enabled + "]"; }
}
