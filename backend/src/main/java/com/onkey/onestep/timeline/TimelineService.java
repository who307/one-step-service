package com.onkey.onestep.timeline;

import java.util.List;

import org.springframework.stereotype.Service;

import com.onkey.onestep.common.ApiException;
import com.onkey.onestep.common.ErrorCode;
import com.onkey.onestep.common.NoticeValidator;
import com.onkey.onestep.integration.AiConversationProvider;
import com.onkey.onestep.program.Program;
import com.onkey.onestep.program.ProgramService;
import com.onkey.onestep.timeline.TimelineDtos.ProgramRef;
import com.onkey.onestep.timeline.TimelineDtos.TimelineDraft;
import com.onkey.onestep.timeline.TimelineDtos.TimelineRequest;
import com.onkey.onestep.timeline.TimelineDtos.TimelineResponse;

import lombok.RequiredArgsConstructor;

/** 공고문 + 걱정 → 생성 → 구조·원문 인용 검증 → 타임라인. 결과를 저장하지 않는다. */
@Service
@RequiredArgsConstructor
public class TimelineService {

    static final int MIN_LENGTH = 100;
    static final int MAX_LENGTH = 4000;

    private final NoticeValidator noticeValidator;
    private final AiConversationProvider provider;
    private final TimelineVerifier verifier;
    private final ProgramService programService;

    public TimelineResponse create(TimelineRequest request) {
        String notice = request.noticeText() == null ? "" : request.noticeText().trim();
        int length = notice.codePointCount(0, notice.length());
        if (length < MIN_LENGTH || length > MAX_LENGTH) {
            throw new ApiException(ErrorCode.INVALID_LENGTH, "공고문은 100자 이상 4,000자 이하로 붙여 넣어 주세요.");
        }
        if (!noticeValidator.isNotice(notice)) {
            throw new ApiException(ErrorCode.NOT_A_NOTICE);
        }
        List<String> concerns = request.concerns() == null ? List.of()
                : request.concerns().stream().filter(c -> c != null && !c.isBlank()).map(String::trim).toList();

        ProgramRef program = null;
        if (request.programId() != null && !request.programId().isBlank()) {
            Program p = programService.find(request.programId().trim());
            program = new ProgramRef(p.title(), p.organization());
        }

        TimelineDraft draft = provider.generateTimeline(notice, concerns, program);
        TimelineDraft verified = verifier.verify(draft, notice);
        ProgramRef ref = program != null ? program
                : verified.program() != null ? verified.program() : new ProgramRef(null, null);
        return new TimelineResponse(true, provider.source(), ref, verified.steps(), verified.checklist(),
                verified.unknowns(), verified.tips());
    }
}
