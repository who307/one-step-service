package com.onkey.onestep.simulation;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import com.onkey.onestep.rag.RagDtos.Evidence;
import com.onkey.onestep.rag.RagDtos.SearchRequest;
import com.onkey.onestep.rag.RagDtos.SearchResponse;
import com.onkey.onestep.rag.RagService;
import com.onkey.onestep.simulation.SimulationDtos.ChatLine;
import com.onkey.onestep.simulation.SimulationDtos.NoticeEvidence;
import com.onkey.onestep.simulation.SimulationDtos.Role;

class NoticeEvidenceFinderTest {

    private static final String ID = "ontong-20261021005400214208";
    private static final List<ChatLine> HISTORY = List.of(
            new ChatLine(Role.AI, "어떤 점이 궁금하세요?"),
            new ChatLine(Role.USER, "신청 방법이요."),
            new ChatLine(Role.AI, "신청은 공고의 링크로 하시면 돼요."));

    private final RagService rag = mock(RagService.class);
    private final NoticeEvidenceFinder finder = new NoticeEvidenceFinder(Optional.of(rag));

    @Test
    void returnsEvidenceWhenSearchFindsIt() {
        when(rag.search(any())).thenReturn(new SearchResponse(ID, "OK", UUID.randomUUID(),
                List.of(new Evidence(UUID.randomUUID(), "참여 대상", "서울 거주 1인가구 청년", "https://example", 0.7)), 10, 2));

        assertThat(finder.find(ID, HISTORY, "혼자 가도 되나요?"))
                .containsExactly(new NoticeEvidence("참여 대상", "서울 거주 1인가구 청년"));
    }

    @Test
    void noEvidenceWhenNotIndexedOrNothingFound() {
        when(rag.search(any())).thenReturn(new SearchResponse(ID, "NOT_INDEXED", null, List.of(), 0, 0));
        assertThat(finder.find(ID, HISTORY, "참가비 있어요?")).isEmpty();

        when(rag.search(any())).thenReturn(new SearchResponse(ID, "NO_EVIDENCE", UUID.randomUUID(), List.of(), 5, 1));
        assertThat(finder.find(ID, HISTORY, "참가비 있어요?")).isEmpty();
    }

    @Test
    void searchFailureDoesNotBreakConversation() {
        when(rag.search(any())).thenThrow(new IllegalStateException("db down"));

        assertThat(finder.find(ID, HISTORY, "참가비 있어요?")).isEmpty();
    }

    @Test
    void skipsWhenRagIsOffOrProgramIsNotOntong() {
        assertThat(new NoticeEvidenceFinder(Optional.empty()).find(ID, HISTORY, "참가비 있어요?")).isEmpty();

        assertThat(finder.find(null, HISTORY, "참가비 있어요?")).isEmpty();
        assertThat(finder.find("sample-cooking-1", HISTORY, "참가비 있어요?")).isEmpty();
        verify(rag, never()).search(any());
    }

    @Test
    void queryCarriesLastPartnerLineForFollowUps() {
        when(rag.search(any())).thenReturn(new SearchResponse(ID, "NO_EVIDENCE", UUID.randomUUID(), List.of(), 0, 0));
        finder.find(ID, HISTORY, "그건 언제까지예요?");

        ArgumentCaptor<SearchRequest> captor = ArgumentCaptor.forClass(SearchRequest.class);
        verify(rag).search(captor.capture());
        assertThat(captor.getValue().programId()).isEqualTo(ID);
        assertThat(captor.getValue().query()).isEqualTo("신청은 공고의 링크로 하시면 돼요.\n그건 언제까지예요?");
        assertThat(captor.getValue().topK()).isEqualTo(NoticeEvidenceFinder.TOP_K);
    }

    @Test
    void longQueryKeepsTheEnd() {
        String query = NoticeEvidenceFinder.query(List.of(), "가".repeat(700) + "끝");

        assertThat(query).hasSize(NoticeEvidenceFinder.QUERY_MAX).endsWith("끝");
    }
}
