package com.onkey.onestep.program;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.Test;

import com.onkey.onestep.integration.ProgramProvider;
import com.onkey.onestep.program.ProgramDtos.RecommendationItem;
import com.onkey.onestep.program.ProgramDtos.RecommendationRequest;
import com.onkey.onestep.program.ProgramDtos.RecommendationResponse;

/** 추천 필터·정렬·페이지·칩 숫자(네트워크 호출 없음). */
class ProgramServiceTest {

    private static Program program(String id, String title, Category category, List<Mode> modes,
                                   String start, String end, boolean closed) {
        return new Program(id, title, "다온청년공간", category, modes, "함께 하는 활동", date(start), date(end),
                "서울 마포구", false, null, null, null, null, null, null, "", null, null, closed);
    }

    private static LocalDate date(String s) {
        return s == null ? null : LocalDate.parse(s);
    }

    private static final List<Program> PROGRAMS = List.of(
            program("a", "같이 밥 먹는 목요일", Category.COOKING, List.of(Mode.OFFLINE, Mode.GROUP), "2026-10-20", "2026-11-20", false),
            program("b", "온라인 그림 모임", Category.ART, List.of(Mode.ONLINE, Mode.GROUP), "2026-10-25", "2026-11-05", false),
            program("c", "혼자 걷기 챌린지", Category.EXERCISE, List.of(Mode.SOLO), null, null, false),
            program("d", "지난 요리 교실", Category.COOKING, List.of(Mode.OFFLINE), "2026-09-01", "2026-09-30", true));

    private final ProgramService service = new ProgramService(new ProgramProvider() {
        @Override
        public String source() {
            return "MOCK";
        }

        @Override
        public List<Program> findAll() {
            return PROGRAMS;
        }

        @Override
        public Optional<Program> findById(String id) {
            return PROGRAMS.stream().filter(p -> p.id().equals(id)).findFirst();
        }
    });

    private static RecommendationRequest req(List<Category> categories, List<Mode> modes, String q,
                                             Boolean openOnly, ProgramSort sort, Integer offset, Integer limit) {
        return new RecommendationRequest(null, null, categories, modes, q, openOnly, sort, offset, limit);
    }

    private static List<String> ids(RecommendationResponse r) {
        return r.items().stream().map(RecommendationItem::program).map(ProgramSummary::id).toList();
    }

    @Test
    void noConditionsReturnsAllWithOpenFirst() {
        RecommendationResponse r = service.recommend(null);
        assertThat(ids(r)).containsExactly("a", "b", "c", "d");
        assertThat(r.total()).isEqualTo(4);
        assertThat(r.items()).allSatisfy(i -> assertThat(i.reasons()).isEmpty());
    }

    @Test
    void sameGroupIsOrAndGroupsAreAnd() {
        RecommendationResponse r = service.recommend(req(List.of(Category.COOKING, Category.ART), List.of(Mode.GROUP), null, null, null, null, null));
        assertThat(ids(r)).containsExactly("a", "b");
    }

    @Test
    void legacySingleFieldsStillWork() {
        RecommendationResponse r = service.recommend(new RecommendationRequest(Category.COOKING, Mode.OFFLINE, null, null, null, true, null, null, null));
        assertThat(ids(r)).containsExactly("a");
        assertThat(r.items().get(0).reasons()).containsExactly("고른 활동 종류(요리·살림)예요", "직접 방문하는 활동이에요");
    }

    @Test
    void searchMatchesEveryWordAndIgnoresSpaces() {
        assertThat(ids(service.recommend(req(null, null, "밥 목요일", null, null, null, null)))).containsExactly("a");
        assertThat(ids(service.recommend(req(null, null, "그림모임", null, null, null, null)))).containsExactly("b");
        assertThat(ids(service.recommend(req(null, null, "밥 그림", null, null, null, null)))).isEmpty();
    }

    @Test
    void deadlineSortPutsSoonestFirstAndMissingDatesLast() {
        RecommendationResponse r = service.recommend(req(null, null, null, null, ProgramSort.DEADLINE, null, null));
        assertThat(ids(r)).containsExactly("b", "a", "c", "d");
    }

    @Test
    void latestSortPutsNewestStartFirst() {
        RecommendationResponse r = service.recommend(req(null, null, null, null, ProgramSort.LATEST, null, null));
        assertThat(ids(r)).containsExactly("b", "a", "c", "d");
    }

    @Test
    void pagesWithOffsetAndLimitButKeepsTotal() {
        RecommendationResponse r = service.recommend(req(null, null, null, null, null, 1, 2));
        assertThat(ids(r)).containsExactly("b", "c");
        assertThat(r.total()).isEqualTo(4);
        assertThat(service.recommend(req(null, null, null, null, null, 10, 2)).items()).isEmpty();
    }

    @Test
    void chipCountsIgnoreOwnGroupButApplyOthers() {
        RecommendationResponse r = service.recommend(req(List.of(Category.COOKING), List.of(), null, true, null, null, null));
        // 활동 종류 숫자는 활동 종류 선택을 빼고(모집 중만 적용) 센다
        assertThat(r.categoryCounts()).containsEntry(Category.COOKING, 1).containsEntry(Category.ART, 1).containsEntry(Category.TALK, 0);
        // 참여 방식 숫자는 고른 활동 종류(요리·살림, 모집 중) 안에서 센다
        assertThat(r.modeCounts()).containsEntry(Mode.OFFLINE, 1).containsEntry(Mode.GROUP, 1).containsEntry(Mode.ONLINE, 0);
    }
}
