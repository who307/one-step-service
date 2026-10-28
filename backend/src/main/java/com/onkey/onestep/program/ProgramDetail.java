package com.onkey.onestep.program;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

import com.fasterxml.jackson.annotation.JsonProperty;

/** ProgramSummary + 상세 필드. */
public record ProgramDetail(
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
        List<String> unknowns,
        String locationSource,
        String suppliesSource,
        boolean closed
) {
    public static ProgramDetail from(Program p) {
        List<String> unknowns = new ArrayList<>();
        if (p.eligibility() == null) unknowns.add("참여 대상");
        if (p.activitySchedule() == null) unknowns.add("활동 일정");
        if (p.location() == null || Program.ESTIMATED.equals(p.locationSource())) unknowns.add("장소");
        if (p.supplies() == null || Program.ESTIMATED.equals(p.suppliesSource())) unknowns.add("준비물");
        if (p.contact() == null) unknowns.add("문의처");
        return new ProgramDetail(p.id(), p.title(), p.organization(), p.category(), p.modes(), p.summary(),
                p.applicationStart(), p.applicationEnd(), p.location(), p.isSample(),
                p.eligibility(), p.activitySchedule(), p.supplies(), p.contact(),
                p.applicationUrl(), p.sourceUrl(), p.noticeText(), List.copyOf(unknowns),
                p.locationSource(), p.suppliesSource(), p.closed());
    }
}
