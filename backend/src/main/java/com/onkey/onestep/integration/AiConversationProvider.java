package com.onkey.onestep.integration;

import java.util.List;

import com.onkey.onestep.inquiry.InquiryDtos.InquiryDraftRequest;
import com.onkey.onestep.simulation.SimulationDtos.ChatLine;
import com.onkey.onestep.simulation.SimulationDtos.Opening;
import com.onkey.onestep.simulation.SimulationDtos.Reply;
import com.onkey.onestep.simulation.SimulationDtos.SimulationCompleteResponse;
import com.onkey.onestep.simulation.SimulationDtos.SimulationContext;
import com.onkey.onestep.timeline.TimelineDtos.ProgramRef;
import com.onkey.onestep.timeline.TimelineDtos.TimelineDraft;

/**
 * AI 생성 포트. 구현: {@link MockConversationProvider}(기본, 키 불필요) / {@link GeminiConversationProvider}.
 * 실패는 {@code ApiException(LLM_ERROR | LLM_TIMEOUT | RATE_LIMITED)} 로 알린다.
 * 구현체는 입력을 저장하거나 로그로 남기지 않는다.
 */
public interface AiConversationProvider {

    /** 응답의 source 값: MOCK · GEMINI */
    String source();

    /** 검증 전 타임라인 초안. 서버가 TimelineVerifier 로 다시 검증한다. */
    TimelineDraft generateTimeline(String noticeText, List<String> concerns, ProgramRef program);

    Opening startSimulation(SimulationContext ctx);

    /**
     * @param turn     이번 사용자 발화의 턴 번호(history 의 USER 수 + 1)
     * @param finished true 면 짧은 마무리 인사를 돌려준다
     */
    Reply reply(SimulationContext ctx, List<ChatLine> history, String userText, int turn, boolean finished);

    SimulationCompleteResponse summarize(SimulationContext ctx, List<ChatLine> history);

    /** 템플릿을 다듬은 문의 문장. 실패하면 서비스가 템플릿으로 대신한다. */
    String refineInquiry(InquiryDraftRequest request, String template);
}
