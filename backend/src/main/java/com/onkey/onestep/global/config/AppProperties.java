package com.onkey.onestep.global.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * 외부 연동 설정. 키는 환경변수로만 주입하고 저장소에 커밋하지 않는다.
 * enabled=false 인 동안은 Mock 구현이 쓰인다.
 */
@ConfigurationProperties(prefix = "onestep")
public record AppProperties(Cors cors, YouthCenter youthCenter, Gemini gemini) {

    public record Cors(String allowedOrigins) {}

    /** 온통청년 청년정책 API */
    public record YouthCenter(boolean enabled, String baseUrl, String apiKey) {}

    /** Gemini Live (AI 아바타 대화) */
    public record Gemini(boolean enabled, String apiKey, String model) {}
}
