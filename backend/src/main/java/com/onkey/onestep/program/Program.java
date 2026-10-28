package com.onkey.onestep.program;

import java.time.LocalDate;
import java.util.List;

import com.fasterxml.jackson.annotation.JsonProperty;

/**
 * 공개 공고 한 건(ProgramProvider가 돌려주는 도메인 값). 사용자 데이터는 담지 않는다.
 * 모르는 값은 null.
 * locationSource·suppliesSource: NOTICE(원문에서 찾음) · ESTIMATED(원문에 없어 추정). 값만 있고 출처가 비면 NOTICE.
 * closed: 신청·사업 기간이 끝나 지금은 신청할 수 없는 공고.
 */
public record Program(
        String id,
        String title,
        String organization,
        Category category,
        List<Mode> modes,
        String summary,
        LocalDate applicationStart,
        LocalDate applicationEnd,
        String location,
        @JsonProperty("isSample") boolean isSample,
        String eligibility,
        String activitySchedule,
        String supplies,
        String contact,
        String applicationUrl,
        String sourceUrl,
        String noticeText,
        String locationSource,
        String suppliesSource,
        boolean closed
) {
    public static final String NOTICE = "NOTICE";
    public static final String ESTIMATED = "ESTIMATED";

    public Program {
        modes = modes == null ? List.of() : List.copyOf(modes);
        if (location != null && locationSource == null) locationSource = NOTICE;
        if (location == null) locationSource = null;
        if (supplies != null && suppliesSource == null) suppliesSource = NOTICE;
        if (supplies == null) suppliesSource = null;
    }
}
