package com.onkey.onestep.simulation;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Optional;

import org.junit.jupiter.api.Test;

import com.onkey.onestep.integration.OntongYouthProgramProvider;
import com.onkey.onestep.rag.RagSourceDocument;
import com.onkey.onestep.simulation.SimulationDtos.NoticeEvidence;

class NoticeTextFinderTest {

    private static final String ID = "ontong-20261023005400214282";
    private static final String TEXT = "## 신청 방법\n씽글벙글 서울 온라인 신청\n\n## 선정 방법\n자치구에서 선정후 안내";

    private final OntongYouthProgramProvider source = mock(OntongYouthProgramProvider.class);

    private static RagSourceDocument doc(String content) {
        return new RagSourceDocument(ID, "건강한 밥상", "https://example", "{}", content);
    }

    @Test
    void returnsWholeNoticeText() {
        when(source.fetchRagDocument(ID)).thenReturn(Optional.of(doc(TEXT)));

        assertThat(new NoticeTextFinder(Optional.of(source)).find(ID))
                .containsExactly(new NoticeEvidence(NoticeTextFinder.SECTION, TEXT));
    }

    @Test
    void cachesWithinTtlAndRefetchesAfter() {
        when(source.fetchRagDocument(ID)).thenReturn(Optional.of(doc(TEXT)));
        MutableClock clock = new MutableClock(Instant.parse("2026-11-04T00:00:00Z"));
        NoticeTextFinder finder = new NoticeTextFinder(Optional.of(source), clock);

        finder.find(ID);
        clock.now = clock.now.plus(NoticeTextFinder.CACHE_TTL).minusSeconds(1);
        finder.find(ID);
        verify(source, times(1)).fetchRagDocument(ID);

        clock.now = clock.now.plusSeconds(2);
        finder.find(ID);
        verify(source, times(2)).fetchRagDocument(ID);
    }

    @Test
    void failureOrMissingNoticeDoesNotBreakConversation() {
        when(source.fetchRagDocument(ID)).thenThrow(new IllegalStateException("api down"));
        assertThat(new NoticeTextFinder(Optional.of(source)).find(ID)).isEmpty();

        when(source.fetchRagDocument("ontong-1")).thenReturn(Optional.empty());
        assertThat(new NoticeTextFinder(Optional.of(source)).find("ontong-1")).isEmpty();
    }

    @Test
    void skipsWhenOntongIsOffOrProgramIsNotOntong() {
        assertThat(new NoticeTextFinder(Optional.empty()).find(ID)).isEmpty();

        NoticeTextFinder finder = new NoticeTextFinder(Optional.of(source));
        assertThat(finder.find(null)).isEmpty();
        assertThat(finder.find("sample-thursday-table")).isEmpty();
        verify(source, never()).fetchRagDocument(any());
    }

    @Test
    void veryLongNoticeIsCut() {
        when(source.fetchRagDocument(ID)).thenReturn(Optional.of(doc("가".repeat(NoticeTextFinder.MAX_CHARS + 50))));

        assertThat(new NoticeTextFinder(Optional.of(source)).find(ID).getFirst().text())
                .hasSize(NoticeTextFinder.MAX_CHARS);
    }

    private static final class MutableClock extends Clock {
        Instant now;

        MutableClock(Instant now) {
            this.now = now;
        }

        @Override
        public ZoneOffset getZone() {
            return ZoneOffset.UTC;
        }

        @Override
        public Clock withZone(java.time.ZoneId zone) {
            return this;
        }

        @Override
        public Instant instant() {
            return now;
        }
    }
}
