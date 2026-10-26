package com.onkey.onestep.practice.gateway;

/**
 * AI 아바타 대화 포트. 구현체가 Gemini Live 등 실제 모델과 연결한다.
 *
 * 흐름: 브라우저 마이크 PCM → /ws/practice → AvatarGateway → 모델
 *       모델 음성·자막 → AvatarGateway → /ws/practice → 브라우저
 *
 * 공통 규칙(모든 구현체가 지켜야 함)
 *  - 이용자를 평가·진단하지 않는다. 목소리로 감정 상태를 추정하지 않는다.
 *  - 실제 정책 질문은 대사로 지어내지 않고 program_fact 근거로 답하거나 "확인 필요"라고 말한다.
 *  - pause() 이후에는 사용자가 resume() 하기 전까지 듣기·말하기를 모두 멈춘다.
 */
public interface AvatarGateway {

    AvatarSession open(String sceneId, String programId, AvatarListener listener);

    interface AvatarSession {
        void sendAudio(byte[] pcm16k);
        void sendText(String text);
        void pause();
        void resume();
        void close();
    }

    interface AvatarListener {
        void onAudio(byte[] pcm24k);
        void onCaption(String role, String text);
        void onState(String state); // listening | speaking | paused | ended
    }
}
