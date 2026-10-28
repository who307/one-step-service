package com.onkey.onestep.common;

import java.util.Arrays;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import lombok.RequiredArgsConstructor;

@Configuration
@RequiredArgsConstructor
public class WebConfig implements WebMvcConfigurer {

    private final AppProperties properties;

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        String raw = properties.cors() == null ? null : properties.cors().allowedOrigins();
        String[] origins = raw == null ? new String[0]
                : Arrays.stream(raw.split(",")).map(String::trim).filter(s -> !s.isEmpty()).toArray(String[]::new);
        registry.addMapping("/api/**")
                .allowedOrigins(origins)
                .allowedMethods("GET", "POST")
                .allowedHeaders("*")
                .maxAge(3600);
    }
}
