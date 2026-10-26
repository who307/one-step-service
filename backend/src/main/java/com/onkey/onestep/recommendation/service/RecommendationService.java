package com.onkey.onestep.recommendation.service;

import com.onkey.onestep.program.domain.FactStatus;
import com.onkey.onestep.program.domain.Program;
import com.onkey.onestep.program.dto.ProgramResponse;
import com.onkey.onestep.program.repository.ProgramRepository;
import com.onkey.onestep.recommendation.dto.PreferenceRequest;
import com.onkey.onestep.recommendation.dto.RecommendationResponse;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 규칙 기반 정렬 (프론트 lib/recommend.ts 와 같은 규칙).
 * - 관심·참여 방식이 겹칠 때마다 +2
 * - 공식적으로 확인된 부담마다 -1. 모르는 조건은 감점도 가점도 하지 않는다.
 * 합격·참여 가능성을 예측하지 않는다.
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class RecommendationService {

    private static final Map<String, String> INTEREST = Map.of(
            "daily", "일상 회복", "cooking", "요리·살림", "work", "일경험",
            "art", "만들기·예술", "exercise", "걷기·운동", "talk", "대화·모임");
    private static final Map<String, String> MODE = Map.of(
            "offline", "직접 방문", "online", "온라인", "solo", "혼자 하기", "group", "여럿이 함께");
    private static final Map<String, String> BURDEN = Map.of(
            "selection", "선발 있음", "documents", "서류 필요", "cost", "비용 있음", "preTask", "사전 과제");

    private final ProgramRepository programRepository;

    public List<RecommendationResponse> recommend(PreferenceRequest pref) {
        return programRepository.findAll().stream()
                .map(p -> score(p, pref))
                .sorted(Comparator.comparingInt(RecommendationResponse::score).reversed())
                .toList();
    }

    private RecommendationResponse score(Program p, PreferenceRequest pref) {
        int score = 0;
        List<String> reasons = new ArrayList<>();

        var interests = p.getInterests().stream().filter(pref.interests()::contains).toList();
        if (!interests.isEmpty()) {
            score += interests.size() * 2;
            reasons.add("관심: " + join(interests, INTEREST));
        }
        var modes = p.getModes().stream().filter(pref.modes()::contains).toList();
        if (!modes.isEmpty()) {
            score += modes.size() * 2;
            reasons.add("참여 방식: " + join(modes, MODE));
        }
        if (!p.getKnownBurdens().isEmpty()) {
            score -= p.getKnownBurdens().size();
            reasons.add("확인된 부담: " + join(List.copyOf(p.getKnownBurdens()), BURDEN));
        }
        long unknown = p.getFacts().stream().filter(f -> f.getStatus() == FactStatus.UNCONFIRMED).count();
        if (unknown > 0) reasons.add("확인 필요 항목 " + unknown + "개");

        return new RecommendationResponse(ProgramResponse.from(p), score, reasons);
    }

    private static String join(List<String> keys, Map<String, String> labels) {
        return String.join(", ", keys.stream().map(k -> labels.getOrDefault(k, k)).toList());
    }
}
