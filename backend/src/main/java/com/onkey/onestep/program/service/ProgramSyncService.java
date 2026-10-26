package com.onkey.onestep.program.service;

import com.onkey.onestep.program.client.YouthCenterClient;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

/**
 * 온통청년 → program 테이블 동기화 (구현 예정).
 * 규칙: API에 없는 항목(준비물·세부 순서 등)은 UNCONFIRMED 로 저장하고 추측해 채우지 않는다.
 * MANUAL 로 등록된 공고는 덮어쓰지 않는다.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ProgramSyncService {

    private final YouthCenterClient youthCenterClient;

    public int sync() {
        var items = youthCenterClient.search("고립 은둔", "서울");
        log.info("온통청년 정책 {}건 수신 (저장 로직 TODO)", items.size());
        // TODO: YouthPolicyItem -> Program 변환, externalId 기준 upsert
        return items.size();
    }
}
