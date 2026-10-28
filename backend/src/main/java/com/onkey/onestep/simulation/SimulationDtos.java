package com.onkey.onestep.simulation;

import java.util.List;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/** 상황 연습 API 요청/응답 DTO. 서버는 연습 세션을 저장하지 않는다(무상태). */
public final class SimulationDtos {

    private SimulationDtos() {}

    static final int MAX_HISTORY = 20;

    public enum Role { AI, USER }

    public record ChatLine(@NotNull Role role, @NotBlank @Size(max = 500) String text) {}

    /** 상대역 한 마디. choices 는 L2 에서만 3개, 그 외에는 null. */
    public record AiMessage(String text, List<String> choices) {}

    public record SimulationStartRequest(
            @NotNull SceneId sceneId,
            @NotNull Level level,
            @Size(max = 100) String programTitle,
            @Size(max = 3) List<@Size(max = 100) String> concerns
    ) {}

    public record SimulationStartResponse(
            String simulationId,
            String source,
            int maxTurns,
            String disclaimer,
            AiMessage opening,
            List<ChatLine> script
    ) {}

    public record SimulationMessageRequest(
            @NotNull SceneId sceneId,
            @NotNull Level level,
            @Size(max = 100) String programTitle,
            @Size(max = MAX_HISTORY) List<@Valid ChatLine> history,
            @NotBlank @Size(min = 1, max = 300) String userText
    ) {}

    public record SimulationMessageResponse(
            boolean crisis,
            AiMessage reply,
            List<String> alternatives,
            int turn,
            boolean finished
    ) {}

    public record SimulationCompleteRequest(
            @NotNull SceneId sceneId,
            @NotNull Level level,
            @Size(max = 100) String programTitle,
            @Size(max = MAX_HISTORY) List<@Valid ChatLine> history
    ) {}

    public record SimulationCompleteResponse(String summary, List<String> nextPhrases) {}

    /** 제공자(Mock/Gemini)에 넘기는 연습 맥락. */
    public record SimulationContext(SceneId sceneId, Level level, String programTitle, List<String> concerns) {}

    /** 제공자가 돌려주는 시작 정보. */
    public record Opening(String text, List<String> choices, List<ChatLine> script) {}

    /** 제공자가 돌려주는 응답. */
    public record Reply(String text, List<String> choices, List<String> alternatives) {}
}
