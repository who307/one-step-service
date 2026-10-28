package com.onkey.onestep.timeline;

import java.util.List;

import com.fasterxml.jackson.annotation.JsonProperty;

import jakarta.validation.constraints.Size;

/** 참여 타임라인 API 요청/응답 DTO. */
public final class TimelineDtos {

    private TimelineDtos() {}

    /** noticeText 길이(100~4,000자, trim 후)는 서비스에서 검사한다. */
    public record TimelineRequest(
            String noticeText,
            @Size(max = 3) List<@Size(max = 100) String> concerns,
            @Size(max = 100) String programId
    ) {}

    public record ProgramRef(String title, String organization) {}

    public record TimelineStep(
            Phase phase,
            String title,
            String description,
            String time,
            String place,
            Label label,
            String sourceQuote
    ) {}

    public record ChecklistItem(String item, Label label, String sourceQuote) {}

    /** AI(또는 Mock)가 만든 검증 전 초안. */
    public record TimelineDraft(
            ProgramRef program,
            List<TimelineStep> steps,
            List<ChecklistItem> checklist,
            List<String> unknowns,
            List<String> tips
    ) {}

    public record TimelineResponse(
            @JsonProperty("isNotice") boolean isNotice,
            String source,
            ProgramRef program,
            List<TimelineStep> steps,
            List<ChecklistItem> checklist,
            List<String> unknowns,
            List<String> tips
    ) {}
}
