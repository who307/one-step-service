package com.onkey.onestep.program;

/** 공고 목록 정렬. 어느 정렬이든 신청할 수 있는 공고가 마감된 공고보다 먼저 온다. */
public enum ProgramSort {
    /** 원래 순서(온통청년은 최근 등록 순) */
    RECOMMENDED,
    /** 신청 마감일이 가까운 순. 마감일이 없으면 뒤로 */
    DEADLINE,
    /** 신청 시작일이 최근인 순. 시작일이 없으면 뒤로 */
    LATEST
}
