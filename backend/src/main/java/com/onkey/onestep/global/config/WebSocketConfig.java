package com.onkey.onestep.global.config;

import com.onkey.onestep.practice.gateway.PracticeWebSocketHandler;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.socket.config.annotation.EnableWebSocket;
import org.springframework.web.socket.config.annotation.WebSocketConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketHandlerRegistry;

@Configuration
@EnableWebSocket
@RequiredArgsConstructor
public class WebSocketConfig implements WebSocketConfigurer {

    private final PracticeWebSocketHandler practiceHandler;
    private final AppProperties props;

    @Override
    public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
        registry.addHandler(practiceHandler, "/ws/practice")
                .setAllowedOrigins(props.cors().allowedOrigins().split(","));
    }
}
