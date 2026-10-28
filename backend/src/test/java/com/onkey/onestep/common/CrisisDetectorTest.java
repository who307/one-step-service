package com.onkey.onestep.common;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

class CrisisDetectorTest {

    private final CrisisDetector detector = new CrisisDetector();

    @ParameterizedTest
    @ValueSource(strings = {
            "죽고 싶어요",
            "요즘 그냥 죽고싶다는 생각만 들어요",
            "자살 생각이 나요",
            "자해를 했어요",
            "사라지고 싶어요",
            "살기 싫어요",
            "다 끝내고 싶어요",
            "인생을 끝내고 싶다",
            "목숨을 끊고 싶어요",
            "그만 살고 싶어요"
    })
    void detectsCrisisExpressions(String text) {
        assertThat(detector.isCrisis(text)).isTrue();
    }

    @ParameterizedTest
    @ValueSource(strings = {
            "너무 긴장돼요",
            "불안해요",
            "떨려요",
            "손이 떨려요, 처음이라 무서워요",
            "말 걸기가 어려워요",
            "빨리 끝내고 싶어요",
            "오늘 일 끝내고 갈게요",
            "네, 신청한 김하늘입니다",
            "죽을 만큼 긴장했어요는 아니고 그냥 좀 떨려요"
    })
    void ignoresOrdinaryNervousness(String text) {
        assertThat(detector.isCrisis(text)).isFalse();
    }
}
