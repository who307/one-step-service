package com.onkey.onestep.program;

import java.time.LocalDate;
import java.util.List;

import com.fasterxml.jackson.annotation.JsonProperty;

public record ProgramSummary(
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
        String locationSource,
        boolean closed
) {
    public static ProgramSummary from(Program p) {
        return new ProgramSummary(p.id(), p.title(), p.organization(), p.category(), p.modes(), p.summary(),
                p.applicationStart(), p.applicationEnd(), p.location(), p.isSample(), p.locationSource(), p.closed());
    }
}
