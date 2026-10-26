package com.onkey.onestep.practice.gateway;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

/** onestep.gemini.enabled=false 일 때. 받은 글에 고정 대사로만 답한다(흐름 확인용). */
@Component
@ConditionalOnProperty(name = "onestep.gemini.enabled", havingValue = "false", matchIfMissing = true)
public class MockAvatarGateway implements AvatarGateway {

    @Override
    public AvatarSession open(String sceneId, String programId, AvatarListener listener) {
        listener.onState("speaking");
        listener.onCaption("avatar", "안녕하세요, 어서 오세요. 천천히 말씀하셔도 괜찮아요.");
        listener.onState("listening");

        return new AvatarSession() {
            private boolean paused;

            @Override public void sendAudio(byte[] pcm16k) { /* mock: 음성 무시 */ }

            @Override public void sendText(String text) {
                if (paused) return;
                listener.onCaption("user", text);
                listener.onCaption("avatar", "네, 잘 들었어요. 고마워요.");
            }

            @Override public void pause() { paused = true; listener.onState("paused"); }
            @Override public void resume() { paused = false; listener.onState("listening"); }
            @Override public void close() { listener.onState("ended"); }
        };
    }
}
