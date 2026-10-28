package com.onkey.onestep.common;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class NoticeValidatorTest {

    private final NoticeValidator validator = new NoticeValidator();

    @Test
    void recognisesNotice() {
        String notice = "[다온청년공간] 같이 밥 먹는 목요일 참여자 모집\n모집 대상: 청년\n접수 기간: 2026.10.20 ~ 2026.11.09\n"
                + "활동 일시: 매주 목요일 18:30\n장소: 2층 공유주방";
        assertThat(validator.isNotice(notice)).isTrue();
    }

    @Test
    void rejectsSmallTalk() {
        String text = "안녕하세요 반갑습니다 ".repeat(12);
        assertThat(validator.isNotice(text)).isFalse();
    }
}
