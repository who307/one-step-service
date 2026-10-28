package com.onkey.onestep.integration;

import java.util.ArrayList;
import java.util.List;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

import com.onkey.onestep.inquiry.InquiryDtos.InquiryDraftRequest;
import com.onkey.onestep.simulation.SimulationDtos.ChatLine;
import com.onkey.onestep.simulation.SimulationDtos.Opening;
import com.onkey.onestep.simulation.SimulationDtos.Reply;
import com.onkey.onestep.simulation.SimulationDtos.Role;
import com.onkey.onestep.simulation.SimulationDtos.SimulationCompleteResponse;
import com.onkey.onestep.simulation.SimulationDtos.SimulationContext;
import com.onkey.onestep.timeline.TimelineDtos.ProgramRef;
import com.onkey.onestep.timeline.TimelineDtos.TimelineDraft;

/** API 키 없이 동작하는 결정적·규칙 기반 구현(기본값). 같은 입력이면 항상 같은 결과. */
@Component
@ConditionalOnProperty(name = "onestep.gemini.enabled", havingValue = "false", matchIfMissing = true)
public class MockConversationProvider implements AiConversationProvider {

    static final int L1_SCRIPT_PAIRS = 3;

    @Override
    public String source() {
        return "MOCK";
    }

    @Override
    public TimelineDraft generateTimeline(String noticeText, List<String> concerns, ProgramRef program) {
        return MockTimelineGenerator.generate(noticeText, concerns, program);
    }

    @Override
    public Opening startSimulation(SimulationContext ctx) {
        MockScripts.Scene scene = MockScripts.scene(ctx.sceneId());
        String opening = MockScripts.fill(scene.lines().get(0), ctx.programTitle());

        List<ChatLine> script = new ArrayList<>();
        for (int i = 0; i < L1_SCRIPT_PAIRS; i++) {
            script.add(new ChatLine(Role.AI, MockScripts.fill(scene.lines().get(i), ctx.programTitle())));
            script.add(new ChatLine(Role.USER, scene.choices().get(i).get(1)));
        }
        return new Opening(opening, scene.choices().get(0), script);
    }

    @Override
    public Reply reply(SimulationContext ctx, List<ChatLine> history, String userText, int turn, boolean finished) {
        MockScripts.Scene scene = MockScripts.scene(ctx.sceneId());
        int last = scene.lines().size() - 1;
        // 사용자가 방금 답한 상대역 말의 위치(turn-1)에 맞는 다른 표현을 대안으로 준다.
        List<String> alternatives = scene.choices().get(Math.min(turn - 1, last));
        if (finished) {
            return new Reply(scene.closing(), null, alternatives);
        }
        int index = Math.min(turn, last);
        return new Reply(MockScripts.fill(scene.lines().get(index), ctx.programTitle()),
                scene.choices().get(index), alternatives);
    }

    @Override
    public SimulationCompleteResponse summarize(SimulationContext ctx, List<ChatLine> history) {
        MockScripts.Scene scene = MockScripts.scene(ctx.sceneId());
        List<String> userLines = history.stream().filter(l -> l.role() == Role.USER).map(ChatLine::text).toList();

        String summary;
        if (userLines.isEmpty()) {
            summary = ctx.sceneId().label() + " 장면을 함께 살펴봤어요.";
        } else {
            StringBuilder sb = new StringBuilder(scene.summaryLead())
                    .append(' ').append(userLines.size()).append("번 직접 말해 봤어요.");
            if (userLines.stream().anyMatch(t -> t.contains("처음"))) {
                sb.append(" 처음이라는 것도 알렸어요.");
            }
            if (userLines.stream().anyMatch(t -> t.contains("?") || t.contains("궁금") || t.contains("될까요"))) {
                sb.append(" 궁금한 점도 물어봤어요.");
            }
            summary = sb.toString();
        }
        List<String> next = scene.nextPhrases().stream().filter(p -> !userLines.contains(p)).limit(3).toList();
        return new SimulationCompleteResponse(summary, next);
    }

    @Override
    public String refineInquiry(InquiryDraftRequest request, String template) {
        return template;
    }
}
