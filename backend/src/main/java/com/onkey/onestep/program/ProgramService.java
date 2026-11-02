package com.onkey.onestep.program;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.EnumMap;
import java.util.EnumSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;

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

    private volatile ProgramSearchIndex index;

    public ProgramListResponse list(Category category, Mode mode, String q) {
        String[] tokens = ProgramSearchIndex.tokens(q);
        List<ProgramSummary> items = index().entries().stream()
                .filter(e -> category == null || e.program().category() == category)
                .filter(e -> mode == null || e.program().modes().contains(mode))
                .filter(e -> ProgramSearchIndex.matches(e, tokens))
                .map(e -> ProgramSummary.from(e.program()))
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
     * 같은 묶음에서 여러 개를 고르면 하나만 맞아도 된다. 조건이 없으면 전체를 reasons: [] 로 돌려준다.
     * 어느 정렬이든 신청할 수 있는 공고가 위로 온다. limit 가 있으면 그만큼만 잘라 보내고 total 에 전체 수를 적는다.
     * 과거 이용 기록은 쓰지 않는다. 추천은 지원 자격 충족을 뜻하지 않는다.
     */
    public RecommendationResponse recommend(RecommendationRequest request) {
        RecommendationRequest r = request == null ? new RecommendationRequest(null, null, null, null, null, null, null, null, null) : request;
        Set<Category> categories = union(r.category(), r.categories(), Category.class);
        Set<Mode> modes = union(r.mode(), r.modes(), Mode.class);
        String[] tokens = ProgramSearchIndex.tokens(r.q());
        boolean openOnly = Boolean.TRUE.equals(r.openOnly());

        // 칩 숫자를 위해 검색어·모집 중 조건만 먼저 적용하고, 활동 종류·참여 방식은 아래에서 따로 센다
        List<Program> base = index().entries().stream()
                .filter(e -> !openOnly || !e.program().closed())
                .filter(e -> ProgramSearchIndex.matches(e, tokens))
                .map(ProgramSearchIndex.Entry::program)
                .toList();

        Map<Category, Integer> categoryCounts = new EnumMap<>(Category.class);
        Map<Mode, Integer> modeCounts = new EnumMap<>(Mode.class);
        for (Category c : Category.values()) categoryCounts.put(c, 0);
        for (Mode m : Mode.values()) modeCounts.put(m, 0);
        List<Program> matched = new ArrayList<>();
        for (Program p : base) {
            boolean categoryOk = categories.isEmpty() || categories.contains(p.category());
            boolean modeOk = modes.isEmpty() || p.modes().stream().anyMatch(modes::contains);
            if (modeOk) categoryCounts.merge(p.category(), 1, Integer::sum);
            if (categoryOk) p.modes().forEach(m -> modeCounts.merge(m, 1, Integer::sum));
            if (categoryOk && modeOk) matched.add(p);
        }

        matched.sort(comparator(r.sort()));
        int total = matched.size();
        int from = Math.min(r.offset() == null ? 0 : r.offset(), total);
        int to = r.limit() == null ? total : Math.min(from + r.limit(), total);
        boolean hasQuery = tokens.length > 0;
        List<RecommendationItem> items = matched.subList(from, to).stream()
                .map(p -> new RecommendationItem(ProgramSummary.from(p), reasons(p, categories, modes, hasQuery)))
                .toList();
        return new RecommendationResponse(provider.source(), items, total, categoryCounts, modeCounts);
    }

    /** provider 목록이 바뀔 때만(온통청년은 6시간마다) 검색 색인을 다시 만든다. */
    private ProgramSearchIndex index() {
        ProgramSearchIndex next = ProgramSearchIndex.of(provider.findAll(), index);
        index = next;
        return next;
    }

    private static <E extends Enum<E>> Set<E> union(E single, List<E> many, Class<E> type) {
        Set<E> set = EnumSet.noneOf(type);
        if (single != null) set.add(single);
        if (many != null) many.stream().filter(Objects::nonNull).forEach(set::add);
        return set;
    }

    private static final Comparator<LocalDate> NULLS_LAST = Comparator.nullsLast(Comparator.naturalOrder());

    private static Comparator<Program> comparator(ProgramSort sort) {
        Comparator<Program> openFirst = Comparator.comparing(Program::closed);
        return switch (sort == null ? ProgramSort.RECOMMENDED : sort) {
            case RECOMMENDED -> openFirst;
            case DEADLINE -> openFirst.thenComparing(Program::applicationEnd, NULLS_LAST);
            case LATEST -> openFirst.thenComparing(Program::applicationStart, Comparator.nullsLast(Comparator.<LocalDate>reverseOrder()));
        };
    }

    private List<String> reasons(Program p, Set<Category> categories, Set<Mode> modes, boolean hasQuery) {
        List<String> reasons = new ArrayList<>();
        if (categories.contains(p.category())) {
            reasons.add("고른 활동 종류(" + p.category().label() + ")예요");
        }
        for (Mode m : p.modes()) {
            if (modes.contains(m)) reasons.add(m.reason());
        }
        if (hasQuery) {
            reasons.add("검색어와 관련된 내용이 있어요");
        }
        return List.copyOf(reasons);
    }
}
