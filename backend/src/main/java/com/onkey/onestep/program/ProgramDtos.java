package com.onkey.onestep.program;

import java.util.List;
import java.util.Map;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;

/** 공고·추천 API 요청/응답 DTO. */
public final class ProgramDtos {

    private ProgramDtos() {}

    public record ProgramListResponse(String source, List<ProgramSummary> items) {}

    /**
     * 같은 묶음 안에서 여러 개를 고르면 그중 하나라도 맞으면 되고(OR), 묶음끼리는 모두 맞아야 한다(AND).
     * category·mode 는 예전 단일 선택 필드로, categories·modes 에 더해진다.
     * openOnly=true 면 신청이 끝난 공고를 뺀다. limit 를 비우면 전체를 돌려준다.
     */
    public record RecommendationRequest(
            Category category,
            Mode mode,
            @Size(max = 6) List<Category> categories,
            @Size(max = 4) List<Mode> modes,
            @Size(max = 100) String q,
            Boolean openOnly,
            ProgramSort sort,
            @Min(0) Integer offset,
            @Min(1) @Max(100) Integer limit) {}

    public record RecommendationItem(ProgramSummary program, List<String> reasons) {}

    /**
     * total: 조건에 맞는 전체 공고 수(items 는 그중 offset~limit 만큼).
     * categoryCounts·modeCounts: 칩 옆에 보일 숫자. 그 묶음의 선택만 빼고 나머지 조건을 모두 적용했을 때 그 칩에 맞는 공고 수.
     */
    public record RecommendationResponse(
            String source,
            List<RecommendationItem> items,
            int total,
            Map<Category, Integer> categoryCounts,
            Map<Mode, Integer> modeCounts) {}
}
