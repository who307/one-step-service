package com.onkey.onestep.simulation;

import java.util.Comparator;
import java.util.List;
import java.util.UUID;

import org.springframework.stereotype.Service;

import com.onkey.onestep.common.ApiException;
import com.onkey.onestep.common.CrisisDetector;
import com.onkey.onestep.common.ErrorCode;
import com.onkey.onestep.integration.AiConversationProvider;
import com.onkey.onestep.simulation.SimulationDtos.AiMessage;
import com.onkey.onestep.simulation.SimulationDtos.ChatLine;
import com.onkey.onestep.simulation.SimulationDtos.NoticeEvidence;
import com.onkey.onestep.simulation.SimulationDtos.Opening;
import com.onkey.onestep.simulation.SimulationDtos.Reply;
import com.onkey.onestep.simulation.SimulationDtos.Role;
import com.onkey.onestep.simulation.SimulationDtos.SimulationCompleteRequest;
import com.onkey.onestep.simulation.SimulationDtos.SimulationCompleteResponse;
import com.onkey.onestep.simulation.SimulationDtos.SimulationContext;
import com.onkey.onestep.simulation.SimulationDtos.SimulationMessageRequest;
import com.onkey.onestep.simulation.SimulationDtos.SimulationMessageResponse;
import com.onkey.onestep.simulation.SimulationDtos.SimulationStartRequest;
import com.onkey.onestep.simulation.SimulationDtos.SimulationStartResponse;

import lombok.RequiredArgsConstructor;

/**
 * 무상태 연습 서비스. 세션을 어디에도 보관하지 않으며 클라이언트가 매 요청에 history 를 보낸다.
 */
@Service
@RequiredArgsConstructor
public class SimulationService {

    public static final String DISCLAIMER = "저는 실제 담당자가 아니라 연습 상대예요. 언제든 멈춰도 괜찮아요.";
    static final int L1_SCRIPT_MAX = 6;
    static final int CHOICE_COUNT = 3;
    static final int MAX_ALTERNATIVES = 3;

    private final AiConversationProvider provider;
    private final CrisisDetector crisisDetector;
    private final NoticeTextFinder noticeTextFinder;

    public SimulationStartResponse start(SimulationStartRequest request) {
        SimulationContext ctx = new SimulationContext(request.sceneId(), request.level(),
                clean(request.programTitle()), request.concerns() == null ? List.of() : request.concerns(), List.of());
        Opening opening = provider.startSimulation(ctx);

        List<String> choices = request.level() == Level.L2 ? limit(opening.choices(), CHOICE_COUNT) : null;
        List<ChatLine> script = request.level() == Level.L1
                ? opening.script() == null ? List.of() : opening.script().stream().limit(L1_SCRIPT_MAX).toList()
                : null;
        return new SimulationStartResponse(UUID.randomUUID().toString(), provider.source(),
                request.level().maxTurns(), DISCLAIMER, new AiMessage(opening.text(), choices), script);
    }

    public SimulationMessageResponse message(SimulationMessageRequest request) {
        List<ChatLine> history = request.history() == null ? List.of() : request.history();
        int maxTurns = request.level().maxTurns();
        int turn = (int) history.stream().filter(l -> l.role() == Role.USER).count() + 1;

        // 위기 신호는 규칙 기반으로 먼저 본다. 감지되면 AI 를 부르지 않는다.
        if (crisisDetector.isCrisis(request.userText())) {
            return new SimulationMessageResponse(true, null, List.of(), turn, true);
        }
        if (request.level() == Level.L1) {
            // L1 은 예시 대화만 보여주고 메시지 API 를 쓰지 않는다.
            throw new ApiException(ErrorCode.INVALID_STATE, "지켜보기 단계에서는 메시지를 보내지 않아요.");
        }
        if (turn > maxTurns) {
            throw new ApiException(ErrorCode.INVALID_STATE);
        }

        boolean finished = turn >= maxTurns;
        List<NoticeEvidence> evidence = noticeTextFinder.find(request.programId());
        SimulationContext ctx = new SimulationContext(request.sceneId(), request.level(),
                clean(request.programTitle()), List.of(), evidence);
        Reply reply = provider.reply(ctx, history, request.userText().trim(), turn, finished);

        List<String> choices = request.level() == Level.L2 && !finished ? limit(reply.choices(), CHOICE_COUNT) : null;
        List<String> alternatives = reply.alternatives() == null ? List.of()
                : reply.alternatives().stream()
                        .filter(a -> a != null && !a.isBlank())
                        .map(String::trim)
                        .filter(a -> !a.equals(request.userText().trim()))
                        .distinct()
                        .sorted(Comparator.comparingInt(String::length))
                        .limit(MAX_ALTERNATIVES)
                        .toList();
        return new SimulationMessageResponse(false, new AiMessage(reply.text(), choices), alternatives, turn, finished);
    }

    public SimulationCompleteResponse complete(SimulationCompleteRequest request) {
        SimulationContext ctx = new SimulationContext(request.sceneId(), request.level(),
                clean(request.programTitle()), List.of(), List.of());
        List<ChatLine> history = request.history() == null ? List.of() : request.history();
        SimulationCompleteResponse summary = provider.summarize(ctx, history);
        List<String> phrases = summary.nextPhrases() == null ? List.of()
                : summary.nextPhrases().stream().filter(p -> p != null && !p.isBlank()).distinct().limit(3).toList();
        return new SimulationCompleteResponse(summary.summary(), phrases);
    }

    private static List<String> limit(List<String> list, int max) {
        if (list == null) {
            return null;
        }
        return list.stream().filter(s -> s != null && !s.isBlank()).limit(max).toList();
    }

    private static String clean(String text) {
        return text == null || text.isBlank() ? null : text.trim();
    }
}
