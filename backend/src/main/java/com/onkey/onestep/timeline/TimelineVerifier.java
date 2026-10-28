package com.onkey.onestep.timeline;

import java.util.ArrayList;
import java.util.EnumMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

import org.springframework.stereotype.Component;

import com.onkey.onestep.timeline.TimelineDtos.ChecklistItem;
import com.onkey.onestep.timeline.TimelineDtos.TimelineDraft;
import com.onkey.onestep.timeline.TimelineDtos.TimelineStep;

/**
 * 생성된 타임라인의 구조·원문 인용 검증.
 * <ul>
 *   <li>CONFIRMED 는 sourceQuote 가 원문에 실제로 있어야 한다(공백 정규화 후 부분 문자열 비교). 없으면 SIMULATED 로 바꾸고 인용을 지운다.</li>
 *   <li>원문에 없는 인용은 라벨과 상관없이 지운다. time·place 도 원문에 없으면 null.</li>
 *   <li>steps 는 항상 ARRIVE → CHECKIN → ACTIVITY → LEAVE 4개. 빠진 단계는 SIMULATED 자리표시로 채운다.</li>
 *   <li>tips 는 1~3개.</li>
 * </ul>
 */
@Component
public class TimelineVerifier {

    static final int MAX_TIPS = 3;
    static final String DEFAULT_TIP = "궁금한 점은 미리 문의해 두면 당일 마음이 한결 편해요.";

    public TimelineDraft verify(TimelineDraft draft, String noticeText) {
        String notice = normalize(noticeText);
        Set<String> unknowns = new LinkedHashSet<>(clean(draft.unknowns()));

        Map<Phase, TimelineStep> byPhase = new EnumMap<>(Phase.class);
        for (TimelineStep step : nullSafe(draft.steps())) {
            if (step != null && step.phase() != null && !byPhase.containsKey(step.phase())) {
                byPhase.put(step.phase(), verifyStep(step, notice));
            }
        }
        List<TimelineStep> steps = new ArrayList<>(4);
        for (Phase phase : Phase.values()) {
            TimelineStep step = byPhase.get(phase);
            if (step == null) {
                step = placeholder(phase);
                unknowns.add(phase.title() + " 단계 안내");
            }
            steps.add(step);
        }

        List<ChecklistItem> checklist = new ArrayList<>();
        for (ChecklistItem item : nullSafe(draft.checklist())) {
            if (item != null && item.item() != null && !item.item().isBlank()) {
                checklist.add(verifyItem(item, notice));
            }
        }

        List<String> tips = clean(draft.tips()).stream().distinct().limit(MAX_TIPS).toList();
        if (tips.isEmpty()) {
            tips = List.of(DEFAULT_TIP);
        }

        return new TimelineDraft(draft.program(), List.copyOf(steps), List.copyOf(checklist),
                List.copyOf(unknowns), tips);
    }

    static String normalize(String text) {
        return text == null ? "" : text.replaceAll("\\s+", " ").trim();
    }

    static boolean occursIn(String candidate, String normalizedNotice) {
        if (candidate == null || candidate.isBlank()) {
            return false;
        }
        return normalizedNotice.contains(normalize(candidate));
    }

    private TimelineStep verifyStep(TimelineStep step, String notice) {
        boolean quoteOk = occursIn(step.sourceQuote(), notice);
        Label label = step.label() == Label.CONFIRMED && quoteOk ? Label.CONFIRMED : Label.SIMULATED;
        String quote = quoteOk ? step.sourceQuote().trim() : null;
        String time = occursIn(step.time(), notice) ? step.time().trim() : null;
        String place = occursIn(step.place(), notice) ? step.place().trim() : null;
        String title = step.title() == null || step.title().isBlank() ? step.phase().title() : step.title();
        String description = step.description() == null || step.description().isBlank()
                ? placeholder(step.phase()).description() : step.description();
        return new TimelineStep(step.phase(), title, description, time, place, label, quote);
    }

    private ChecklistItem verifyItem(ChecklistItem item, String notice) {
        boolean quoteOk = occursIn(item.sourceQuote(), notice);
        Label label = item.label() == Label.CONFIRMED && quoteOk ? Label.CONFIRMED : Label.SIMULATED;
        return new ChecklistItem(item.item().trim(), label, quoteOk ? item.sourceQuote().trim() : null);
    }

    static TimelineStep placeholder(Phase phase) {
        String description = switch (phase) {
            case ARRIVE -> "보통은 시작 10분쯤 전에 도착해요. 공고에서 확인되지 않았어요.";
            case CHECKIN -> "보통은 도착하면 담당자에게 이름을 말해요. 공고에서 확인되지 않았어요.";
            case ACTIVITY -> "보통은 간단한 소개 뒤에 활동을 시작해요. 공고에서 확인되지 않았어요.";
            case LEAVE -> "보통은 활동이 끝나면 인사하고 나가요. 공고에서 확인되지 않았어요.";
        };
        return new TimelineStep(phase, phase.title(), description, null, null, Label.SIMULATED, null);
    }

    private static <T> List<T> nullSafe(List<T> list) {
        return list == null ? List.of() : list;
    }

    private static List<String> clean(List<String> list) {
        return nullSafe(list).stream().filter(s -> s != null && !s.isBlank()).map(String::trim).toList();
    }
}
