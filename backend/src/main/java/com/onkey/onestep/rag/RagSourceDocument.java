package com.onkey.onestep.rag;

/** 수집한 공개 공고의 원본과 검색용 전체 본문. 화면용 4,000자 제한을 적용하지 않는다. */
public record RagSourceDocument(
        String programId,
        String title,
        String sourceUrl,
        String rawJson,
        String content) {}
