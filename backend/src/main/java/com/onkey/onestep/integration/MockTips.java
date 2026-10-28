package com.onkey.onestep.integration;

import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.regex.Pattern;

/** 걱정 문장을 1~3개의 일반적인 준비 팁으로 바꾼다(의료·상담 조언 아님). */
final class MockTips {

    private MockTips() {}

    private record Rule(Pattern pattern, String tip) {}

    static final String FIRST_WORDS = "처음 할 말은 '안녕하세요, ○○ 신청한 ○○○입니다' 한 문장이면 충분해요.";

    private static final List<Rule> RULES = List.of(
            new Rule(Pattern.compile("대화|말|이야기|인사"), FIRST_WORDS),
            new Rule(Pattern.compile("길|찾|위치|장소|가는|교통"),
                    "출발 전에 지도 앱으로 경로를 한 번 보고, 10분쯤 여유 있게 나서면 마음이 편해요."),
            new Rule(Pattern.compile("늦|시간|지각"),
                    "늦을 것 같으면 '조금 늦을 것 같아요' 한 줄이면 충분해요. 문의처를 미리 저장해 두세요."),
            new Rule(Pattern.compile("사람|낯|어색|혼자|모르는"),
                    "처음 온 사람이 많은 자리가 보통이에요. 처음엔 듣기만 해도 괜찮아요."),
            new Rule(Pattern.compile("준비물|챙|비용|돈|옷"),
                    "공고에서 확인되지 않은 것은 문의 문장을 만들어 미리 물어보면 편해요."),
            new Rule(Pattern.compile("중간|나가|힘들|지치|불안|긴장|떨"),
                    "힘들면 잠깐 쉬어도 괜찮아요. '잠시 바람 좀 쐬고 올게요' 한마디면 돼요.")
    );

    static List<String> forConcerns(List<String> concerns) {
        Set<String> tips = new LinkedHashSet<>();
        if (concerns != null) {
            for (String concern : concerns) {
                if (concern == null) continue;
                for (Rule rule : RULES) {
                    if (rule.pattern().matcher(concern).find()) {
                        tips.add(rule.tip());
                        break;
                    }
                }
            }
        }
        if (tips.isEmpty()) {
            tips.add(FIRST_WORDS);
        }
        return tips.stream().limit(3).toList();
    }
}
