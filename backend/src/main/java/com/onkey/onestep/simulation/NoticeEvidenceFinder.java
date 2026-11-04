package com.onkey.onestep.simulation;

import java.time.Duration;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;

import org.springframework.stereotype.Component;

import com.onkey.onestep.rag.RagDtos.SearchRequest;
import com.onkey.onestep.rag.RagDtos.SearchResponse;
import com.onkey.onestep.rag.RagService;
import com.onkey.onestep.simulation.SimulationDtos.ChatLine;
import com.onkey.onestep.simulation.SimulationDtos.NoticeEvidence;
import com.onkey.onestep.simulation.SimulationDtos.Role;

import lombok.extern.slf4j.Slf4j;

/**
 * 연습 대화의 답에 쓸 공고 근거를 RAG 로 찾는다. 근거는 있으면 좋은 보조 자료라서,
 * RAG 가 꺼졌거나 색인 전·근거 없음·오류·시간 초과면 빈 목록을 돌려주고 대화는 그대로 이어진다.
 * 질문·대화 내용은 로그에 남기지 않는다(상태와 개수만).
 */
@Slf4j
@Component
public class NoticeEvidenceFinder {

    static final Duration TIMEOUT = Duration.ofSeconds(4);
    static final int TOP_K = 3;
    static final int QUERY_MAX = 600;
    private static final String ONTONG_ID = "ontong-[0-9]{1,30}";

    private final Optional<RagService> rag;

    public NoticeEvidenceFinder(Optional<RagService> rag) {
        this.rag = rag;
    }

    public List<NoticeEvidence> find(String programId, List<ChatLine> history, String userText) {
        if (rag.isEmpty() || programId == null || !programId.matches(ONTONG_ID)) {
            return List.of();
        }
        SearchRequest request = new SearchRequest(programId, query(history, userText), TOP_K);
        try {
            SearchResponse response = CompletableFuture.supplyAsync(() -> rag.get().search(request))
                    .get(TIMEOUT.toMillis(), TimeUnit.MILLISECONDS);
            if (!"OK".equals(response.status()) || response.evidence() == null) {
                log.info("rag evidence none programId={} status={}", programId, response.status());
                return List.of();
            }
            log.info("rag evidence found programId={} count={}", programId, response.evidence().size());
            return response.evidence().stream()
                    .map(e -> new NoticeEvidence(e.section(), e.text()))
                    .toList();
        } catch (TimeoutException e) {
            log.warn("rag evidence timeout programId={}", programId);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        } catch (ExecutionException | RuntimeException e) {
            log.warn("rag evidence failed programId={} reason={}", programId, e.getClass().getSimpleName());
        }
        return List.of();
    }

    /** "그건 언제예요?" 같은 이어지는 질문도 찾을 수 있게 바로 앞 상대역의 말을 붙인다. */
    static String query(List<ChatLine> history, String userText) {
        String lastAi = null;
        for (int i = history.size() - 1; i >= 0; i--) {
            if (history.get(i).role() == Role.AI) {
                lastAi = history.get(i).text();
                break;
            }
        }
        String query = lastAi == null ? userText.trim() : lastAi.trim() + "\n" + userText.trim();
        return query.length() > QUERY_MAX ? query.substring(query.length() - QUERY_MAX) : query;
    }
}
