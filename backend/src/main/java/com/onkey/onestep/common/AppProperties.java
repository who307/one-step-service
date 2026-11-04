package com.onkey.onestep.common;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * 외부 연동 설정({@code onestep.*}). 키는 환경변수로만 주입하고 저장소에 커밋하지 않는다.
 * enabled=false 인 동안은 Mock 구현이 쓰인다.
 */
@ConfigurationProperties(prefix = "onestep")
public record AppProperties(Cors cors, YouthCenter youthCenter, OpenAi openai) {

    public record Cors(String allowedOrigins) {}

    /** 온통청년 청년정책 API */
    public record YouthCenter(boolean enabled, String baseUrl, String apiKey) {}

    /** OpenAI (타임라인·상황 연습·문의 문장). 키는 RAG 임베딩과 같은 OPENAI_API_KEY 를 쓴다. */
    public record OpenAi(boolean enabled, String apiKey, String model, String reasoningEffort) {}
}
