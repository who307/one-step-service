package com.onkey.onestep.rag;

import org.springframework.scheduling.annotation.Scheduled;
import lombok.extern.slf4j.Slf4j;

@Slf4j
public class RagSync {
    private final RagService service;
    private final RagProperties properties;
    public RagSync(RagService service,RagProperties properties) { this.service=service; this.properties=properties; }

    /** 초기 범위는 지정한 공고 ID의 갱신. 새 게시물 발견/전체 공고 수집은 별도 단계다. */
    @Scheduled(fixedDelayString="${onestep.rag.sync-delay-ms:21600000}",
            initialDelayString="${onestep.rag.sync-initial-delay-ms:60000}")
    public void sync() {
        if (!properties.syncEnabled() || properties.programIds()==null) return;
        for (String id : properties.programIds()) {
            try { service.index(id); }
            catch (RuntimeException e) { log.warn("rag scheduled refresh failed type={}",e.getClass().getSimpleName()); }
        }
    }
}
