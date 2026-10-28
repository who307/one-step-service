package com.onkey.onestep.common;

import java.util.List;
import java.util.regex.Pattern;

import org.springframework.stereotype.Component;

/**
 * 규칙 기반 위기 신호 검사(LLM 분류보다 우선한다).
 * 일반적인 긴장·불안 표현(떨려요, 긴장돼요, 불안해요)과는 구분한다. 감지 정확성을 보장하지 않으므로 테스트로 관리한다.
 * 입력은 공백을 지운 뒤 비교한다("죽고 싶" == "죽고싶").
 */
@Component
public class CrisisDetector {

    private static final List<Pattern> PATTERNS = List.of(
            Pattern.compile("죽고싶"),
            Pattern.compile("죽어버리"),
            Pattern.compile("죽을래"),
            Pattern.compile("자살"),
            Pattern.compile("자해"),
            Pattern.compile("극단적(인)?선택"),
            Pattern.compile("(사라지|없어지)고싶"),
            Pattern.compile("살기(가)?싫"),
            Pattern.compile("살고싶지않"),
            Pattern.compile("그만살"),
            // "빨리 끝내고 싶어요"(활동을 마치고 싶다)와 구분하기 위해 삶·전부를 끝낸다는 표현만 잡는다.
            Pattern.compile("(인생|삶|모든것|모든걸|다|전부|그냥다)(을|를)?끝내고싶"),
            Pattern.compile("목숨"),
            Pattern.compile("뛰어내리"),
            Pattern.compile("손목을?긋")
    );

    public boolean isCrisis(String text) {
        if (text == null || text.isBlank()) {
            return false;
        }
        String compact = text.replaceAll("\\s+", "");
        return PATTERNS.stream().anyMatch(p -> p.matcher(compact).find());
    }
}
