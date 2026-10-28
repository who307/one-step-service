package com.onkey.onestep.program;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;

import org.springframework.stereotype.Service;

import com.onkey.onestep.common.ApiException;
import com.onkey.onestep.common.ErrorCode;
import com.onkey.onestep.integration.ProgramProvider;
import com.onkey.onestep.program.ProgramDtos.ProgramListResponse;
import com.onkey.onestep.program.ProgramDtos.RecommendationItem;
import com.onkey.onestep.program.ProgramDtos.RecommendationRequest;
import com.onkey.onestep.program.ProgramDtos.RecommendationResponse;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class ProgramService {

    private final ProgramProvider provider;

    public ProgramListResponse list(Category category, Mode mode, String q) {
        List<ProgramSummary> items = provider.findAll().stream()
                .filter(p -> category == null || p.category() == category)
                .filter(p -> mode == null || p.modes().contains(mode))
                .filter(p -> matchesQuery(p, q))
                .map(ProgramSummary::from)
                .toList();
        return new ProgramListResponse(provider.source(), items);
    }

    public ProgramDetail get(String id) {
        return ProgramDetail.from(find(id));
    }

    public Program find(String id) {
        return provider.findById(id).orElseThrow(() -> new ApiException(ErrorCode.NOT_FOUND));
    }

    /**
     * 고른 조건(활동 종류·참여 방식·검색어)을 모두 만족하는 공고만 돌려주고, 맞은 조건을 추천 이유로 붙인다.
     * 조건이 없으면 전체를 reasons: [] 로 돌려준다. 신청할 수 있는 공고가 위로 온다(그다음은 원래 순서).
     * 과거 이용 기록은 쓰지 않는다. 추천은 지원 자격 충족을 뜻하지 않는다.
     */
    public RecommendationResponse recommend(RecommendationRequest request) {
        Category category = request == null ? null : request.category();
        Mode mode = request == null ? null : request.mode();
        String q = request == null || request.q() == null || request.q().isBlank() ? null : request.q().trim();
        boolean openOnly = request != null && Boolean.TRUE.equals(request.openOnly());

        List<RecommendationItem> items = provider.findAll().stream()
                .filter(p -> category == null || p.category() == category)
                .filter(p -> mode == null || p.modes().contains(mode))
                .filter(p -> matchesQuery(p, q))
                .filter(p -> !openOnly || !p.closed())
                .sorted(Comparator.comparing(Program::closed))
                .map(p -> new RecommendationItem(ProgramSummary.from(p), reasons(p, category, mode, q)))
                .toList();
        return new RecommendationResponse(provider.source(), items);
    }

    private List<String> reasons(Program p, Category category, Mode mode, String q) {
        List<String> reasons = new ArrayList<>();
        if (category != null && p.category() == category) {
            reasons.add("고른 활동 종류(" + category.label() + ")예요");
        }
        if (mode != null && p.modes().contains(mode)) {
            reasons.add(mode.reason());
        }
        if (q != null && matchesQuery(p, q)) {
            reasons.add("검색어와 관련된 내용이 있어요");
        }
        return List.copyOf(reasons);
    }

    private static boolean matchesQuery(Program p, String q) {
        if (q == null || q.isBlank()) {
            return true;
        }
        String needle = q.trim().toLowerCase(Locale.ROOT);
        return contains(p.title(), needle) || contains(p.organization(), needle)
                || contains(p.summary(), needle) || contains(p.location(), needle)
                || contains(p.eligibility(), needle);
    }

    private static boolean contains(String haystack, String needle) {
        return haystack != null && haystack.toLowerCase(Locale.ROOT).contains(needle);
    }
}
