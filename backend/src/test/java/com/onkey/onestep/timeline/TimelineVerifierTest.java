package com.onkey.onestep.timeline;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;

import org.junit.jupiter.api.Test;

import com.onkey.onestep.timeline.TimelineDtos.ChecklistItem;
import com.onkey.onestep.timeline.TimelineDtos.TimelineDraft;
import com.onkey.onestep.timeline.TimelineDtos.TimelineStep;

class TimelineVerifierTest {

    private static final String NOTICE = "모집 대상: 청년\n장소:   다온청년공간 2층 공유주방\n활동 일시: 매주 목요일 18:30 ~ 20:30\n준비물: 없음";

    private final TimelineVerifier verifier = new TimelineVerifier();

    @Test
    void fakeQuoteIsDowngradedToSimulated() {
        TimelineDraft draft = new TimelineDraft(null, List.of(
                new TimelineStep(Phase.ARRIVE, "도착", "강남역 3번 출구로 가요.", "19:00", "강남역 3번 출구",
                        Label.CONFIRMED, "장소: 강남역 3번 출구")),
                List.of(new ChecklistItem("신분증", Label.CONFIRMED, "준비물: 신분증")), List.of(), List.of());

        TimelineDraft verified = verifier.verify(draft, NOTICE);

        TimelineStep arrive = verified.steps().get(0);
        assertThat(arrive.label()).isEqualTo(Label.SIMULATED);
        assertThat(arrive.sourceQuote()).isNull();
        assertThat(arrive.place()).isNull();
        assertThat(arrive.time()).isNull();
        assertThat(verified.checklist().get(0).label()).isEqualTo(Label.SIMULATED);
        assertThat(verified.checklist().get(0).sourceQuote()).isNull();
    }

    @Test
    void realQuoteSurvivesWhitespaceNormalisation() {
        TimelineDraft draft = new TimelineDraft(null, List.of(
                new TimelineStep(Phase.ARRIVE, "도착", "공유주방으로 가요.", "18:30", "다온청년공간 2층 공유주방",
                        Label.CONFIRMED, "장소: 다온청년공간 2층 공유주방")),
                List.of(), List.of(), List.of());

        TimelineStep arrive = verifier.verify(draft, NOTICE).steps().get(0);

        assertThat(arrive.label()).isEqualTo(Label.CONFIRMED);
        assertThat(arrive.sourceQuote()).isEqualTo("장소: 다온청년공간 2층 공유주방");
        assertThat(arrive.place()).isEqualTo("다온청년공간 2층 공유주방");
        assertThat(arrive.time()).isEqualTo("18:30");
    }

    @Test
    void alwaysFourStepsInOrderWithPlaceholders() {
        TimelineDraft draft = new TimelineDraft(null, List.of(
                new TimelineStep(Phase.LEAVE, "귀가", "끝나면 나가요.", null, null, Label.SIMULATED, null),
                new TimelineStep(Phase.ARRIVE, "도착", "가요.", null, null, Label.SIMULATED, null),
                new TimelineStep(Phase.ARRIVE, "중복", "무시돼요.", null, null, Label.SIMULATED, null)),
                List.of(), List.of(), List.of());

        TimelineDraft verified = verifier.verify(draft, NOTICE);

        assertThat(verified.steps()).extracting(TimelineStep::phase)
                .containsExactly(Phase.ARRIVE, Phase.CHECKIN, Phase.ACTIVITY, Phase.LEAVE);
        assertThat(verified.steps().get(0).title()).isEqualTo("도착");
        assertThat(verified.steps().get(1).label()).isEqualTo(Label.SIMULATED);
        assertThat(verified.tips()).hasSize(1);
        assertThat(verified.unknowns()).isNotEmpty();
    }
}
