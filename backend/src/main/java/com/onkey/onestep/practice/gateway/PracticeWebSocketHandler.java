package com.onkey.onestep.practice.gateway;

import java.io.IOException;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.*;
import org.springframework.web.socket.handler.AbstractWebSocketHandler;
import org.springframework.web.util.UriComponentsBuilder;

/**
 * /ws/practice?sceneId=..&programId=..
 * 바이너리 프레임 = 마이크 PCM, 텍스트 프레임 = 제어 명령(pause | resume | end | text:&lt;내용&gt;)
 * 서버 → 클라이언트: 텍스트 JSON {type:"caption"|"state", ...}, 바이너리 = 아바타 음성
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class PracticeWebSocketHandler extends AbstractWebSocketHandler {

    private final AvatarGateway avatarGateway;
    private final Map<String, AvatarGateway.AvatarSession> sessions = new ConcurrentHashMap<>();

    @Override
    public void afterConnectionEstablished(WebSocketSession ws) {
        var params = UriComponentsBuilder.fromUri(ws.getUri()).build().getQueryParams();
        var session = avatarGateway.open(params.getFirst("sceneId"), params.getFirst("programId"), new AvatarGateway.AvatarListener() {
            @Override public void onAudio(byte[] pcm) { send(ws, new BinaryMessage(pcm)); }
            @Override public void onCaption(String role, String text) {
                send(ws, new TextMessage("{\"type\":\"caption\",\"role\":\"" + role + "\",\"text\":\"" + escape(text) + "\"}"));
            }
            @Override public void onState(String state) {
                send(ws, new TextMessage("{\"type\":\"state\",\"state\":\"" + state + "\"}"));
            }
        });
        sessions.put(ws.getId(), session);
    }

    @Override
    protected void handleBinaryMessage(WebSocketSession ws, BinaryMessage message) {
        var s = sessions.get(ws.getId());
        if (s == null) return;
        var buf = message.getPayload();
        var bytes = new byte[buf.remaining()];
        buf.get(bytes);
        s.sendAudio(bytes);
    }

    @Override
    protected void handleTextMessage(WebSocketSession ws, TextMessage message) {
        var s = sessions.get(ws.getId());
        if (s == null) return;
        var cmd = message.getPayload();
        switch (cmd) {
            case "pause" -> s.pause();
            case "resume" -> s.resume();
            case "end" -> s.close();
            default -> { if (cmd.startsWith("text:")) s.sendText(cmd.substring(5)); }
        }
    }

    @Override
    public void afterConnectionClosed(WebSocketSession ws, CloseStatus status) {
        var s = sessions.remove(ws.getId());
        if (s != null) s.close();
    }

    private static void send(WebSocketSession ws, WebSocketMessage<?> msg) {
        try {
            synchronized (ws) {
                if (ws.isOpen()) ws.sendMessage(msg);
            }
        } catch (IOException e) {
            log.warn("ws send 실패: {}", e.getMessage());
        }
    }

    private static String escape(String s) {
        return s.replace("\\", "\\\\").replace("\"", "\\\"").replace("\n", "\\n");
    }
}
