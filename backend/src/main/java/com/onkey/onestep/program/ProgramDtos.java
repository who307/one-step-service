package com.onkey.onestep.program;

import java.util.List;

import jakarta.validation.constraints.Size;

/** 공고·추천 API 요청/응답 DTO. */
public final class ProgramDtos {

    private ProgramDtos() {}

    public record ProgramListResponse(String source, List<ProgramSummary> items) {}

    /** openOnly=true 면 신청이 끝난 공고를 뺀다. */
    public record RecommendationRequest(Category category, Mode mode, @Size(max = 100) String q, Boolean openOnly) {}

    public record RecommendationItem(ProgramSummary program, List<String> reasons) {}

    public record RecommendationResponse(String source, List<RecommendationItem> items) {}
}
