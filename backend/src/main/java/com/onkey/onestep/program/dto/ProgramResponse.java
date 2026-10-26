package com.onkey.onestep.program.dto;

import com.onkey.onestep.program.domain.Program;
import com.onkey.onestep.program.domain.ProgramFact;
import java.util.List;
import java.util.Set;

/** 프론트 lib/types.ts 의 Program 과 같은 모양 */
public record ProgramResponse(
        String id,
        boolean sample,
        String title,
        String organization,
        String summary,
        Set<String> interests,
        Set<String> modes,
        Set<String> knownBurdens,
        List<Fact> facts,
        LocationDto location,
        String sourceUrl,
        String sourceCheckedAt,
        String applyUrl,
        String source
) {
    public record Fact(String key, String label, String value, String status, String note) {
        static Fact from(ProgramFact f) {
            return new Fact(f.getKey(), f.getLabel(), f.getValue(), f.getStatus().name().toLowerCase(), f.getNote());
        }
    }

    public record LocationDto(String name, String address, Double lat, Double lng) {}

    public static ProgramResponse from(Program p) {
        var loc = p.getLocation();
        return new ProgramResponse(
                p.getId(), p.isSample(), p.getTitle(), p.getOrganization(), p.getSummary(),
                p.getInterests(), p.getModes(), p.getKnownBurdens(),
                p.getFacts().stream().map(Fact::from).toList(),
                loc == null || loc.getPlaceName() == null ? null
                        : new LocationDto(loc.getPlaceName(), loc.getAddress(), loc.getLat(), loc.getLng()),
                p.getSourceUrl(), p.getSourceCheckedAt().toString(), p.getApplyUrl(),
                p.getSource().name().toLowerCase());
    }
}
