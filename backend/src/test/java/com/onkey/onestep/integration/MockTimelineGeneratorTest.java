package com.onkey.onestep.integration;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;

import org.junit.jupiter.api.Test;

import com.onkey.onestep.program.Program;
import com.onkey.onestep.timeline.Label;
import com.onkey.onestep.timeline.Phase;
import com.onkey.onestep.timeline.TimelineDtos.ChecklistItem;
import com.onkey.onestep.timeline.TimelineDtos.TimelineDraft;
import com.onkey.onestep.timeline.TimelineDtos.TimelineStep;
import com.onkey.onestep.timeline.TimelineVerifier;

import tools.jackson.databind.json.JsonMapper;

class MockTimelineGeneratorTest {

    private static final List<Program> PROGRAMS = MockProgramProvider.load(JsonMapper.builder().build());

    private static String notice(String id) {
        return PROGRAMS.stream().filter(p -> p.id().equals(id)).findFirst().orElseThrow().noticeText();
    }

    private static TimelineDraft generate(String id, List<String> concerns) {
        String notice = notice(id);
        return new TimelineVerifier().verify(MockTimelineGenerator.generate(notice, concerns, null), notice);
    }

    @Test
    void thursdayTableHasConfirmedPlaceFromNotice() {
        TimelineDraft draft = generate("sample-thursday-table", List.of("다른 사람과 대화하기가 어려워요"));

        TimelineStep arrive = draft.steps().get(0);
        assertThat(arrive.phase()).isEqualTo(Phase.ARRIVE);
        assertThat(arrive.label()).isEqualTo(Label.CONFIRMED);
        assertThat(arrive.place()).isEqualTo("다온청년공간 2층 공유주방");
        assertThat(arrive.sourceQuote()).isEqualTo("장소: 다온청년공간 2층 공유주방");
        assertThat(arrive.time()).isEqualTo("18:30");
        assertThat(arrive.description()).isEqualTo("18:30까지 다온청년공간 2층 공유주방으로 가요.");

        assertThat(draft.steps()).extracting(TimelineStep::phase)
                .containsExactly(Phase.ARRIVE, Phase.CHECKIN, Phase.ACTIVITY, Phase.LEAVE);
        assertThat(draft.steps()).allMatch(s -> s.label() == Label.CONFIRMED);
        assertThat(draft.steps().get(3).time()).isEqualTo("20:30");
        assertThat(draft.checklist()).extracting(ChecklistItem::sourceQuote)
                .contains("준비물: 없음 (앞치마는 공간에서 빌려드려요)");
        assertThat(draft.program().title()).isEqualTo("같이 밥 먹는 목요일");
        assertThat(draft.program().organization()).isEqualTo("다온청년공간");
        assertThat(draft.unknowns()).contains("마치고 나가는 방법").doesNotContain("장소", "준비물");
        assertThat(draft.tips()).hasSizeBetween(1, 3);
    }

    @Test
    void unknownFieldsStaySimulated() {
        // 이 공고는 대상·준비물을 "홈페이지 확인"이라고만 적었다. 사실로 단정하면 안 된다.
        TimelineDraft draft = generate("warm-house-2026-11", List.of());

        assertThat(draft.unknowns()).contains("준비물", "참여 대상", "비용");
        assertThat(draft.steps().get(0).label()).isEqualTo(Label.CONFIRMED);
        assertThat(draft.steps().get(1).label()).isEqualTo(Label.SIMULATED);
        assertThat(draft.steps().get(1).description()).startsWith("보통은").contains("공고에서 확인되지 않았어요");
        assertThat(draft.steps().get(3).label()).isEqualTo(Label.SIMULATED);
    }
}
