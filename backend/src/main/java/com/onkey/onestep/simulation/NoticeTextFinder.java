package com.onkey.onestep.simulation;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import com.onkey.onestep.integration.OntongYouthProgramProvider;
import com.onkey.onestep.rag.RagSourceDocument;
import com.onkey.onestep.simulation.SimulationDtos.NoticeEvidence;

import lombok.extern.slf4j.Slf4j;

/**
 * 연습 대화의 답에 쓸 공고 원문 전체를 가져온다. 서울시 공고는 길어야 4천 자 안팎이라
 * 문단을 검색하지 않고 원문을 통째로 넘긴다(검색 단계의 지연과 놓침이 없다).
 * 원문은 RAG 수집과 같은 {@link OntongYouthProgramProvider#fetchRagDocument}(API 제공 항목만, 추정값 없음)를 쓰고,
 * 매 턴 API 를 부르지 않도록 공개 공고 원문만 잠깐 메모리에 둔다.
 * 온통청년 연동이 꺼졌거나, 공고가 아니거나, 가져오기 실패·시간 초과면 빈 목록을 돌려주고 대화는 그대로 이어진다.
 */
@Slf4j
@Component
public class NoticeTextFinder {

    static final Duration TIMEOUT = Duration.ofSeconds(4);
    static final Duration CACHE_TTL = Duration.ofMinutes(30);
    static final int CACHE_MAX = 300;
    /** 지금 가장 긴 서울시 공고(약 3.6천 자)의 두 배. 넘으면 뒤를 자르고 로그만 남긴다. */
    static final int MAX_CHARS = 8000;
    static final String SECTION = "공고 원문";
    private static final String ONTONG_ID = "ontong-[0-9]{1,30}";

    private record Cached(String text, Instant at) {}

    private final Optional<OntongYouthProgramProvider> source;
    private final Clock clock;
    private final Map<String, Cached> cache = new ConcurrentHashMap<>();

    @Autowired
    public NoticeTextFinder(Optional<OntongYouthProgramProvider> source) {
        this(source, Clock.systemUTC());
    }

    NoticeTextFinder(Optional<OntongYouthProgramProvider> source, Clock clock) {
        this.source = source;
        this.clock = clock;
    }

    public List<NoticeEvidence> find(String programId) {
        if (source.isEmpty() || programId == null || !programId.matches(ONTONG_ID)) {
            return List.of();
        }
        Cached cached = cache.get(programId);
        if (cached != null && clock.instant().isBefore(cached.at().plus(CACHE_TTL))) {
            return List.of(new NoticeEvidence(SECTION, cached.text()));
        }
        try {
            Optional<RagSourceDocument> doc = CompletableFuture.supplyAsync(() -> source.get().fetchRagDocument(programId))
                    .get(TIMEOUT.toMillis(), TimeUnit.MILLISECONDS);
            if (doc.isEmpty() || doc.get().content() == null || doc.get().content().isBlank()) {
                log.info("notice text none programId={}", programId);
                return List.of();
            }
            String text = doc.get().content().strip();
            if (text.length() > MAX_CHARS) {
                log.warn("notice text truncated programId={} chars={}", programId, text.length());
                text = text.substring(0, MAX_CHARS);
            }
            if (cache.size() >= CACHE_MAX) {
                cache.clear();
            }
            cache.put(programId, new Cached(text, clock.instant()));
            return List.of(new NoticeEvidence(SECTION, text));
        } catch (TimeoutException e) {
            log.warn("notice text timeout programId={}", programId);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        } catch (ExecutionException | RuntimeException e) {
            log.warn("notice text failed programId={} reason={}", programId, e.getClass().getSimpleName());
        }
        return List.of();
    }
}
