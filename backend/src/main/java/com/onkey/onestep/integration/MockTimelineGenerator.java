package com.onkey.onestep.integration;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import com.onkey.onestep.timeline.Label;
import com.onkey.onestep.timeline.Phase;
import com.onkey.onestep.timeline.TimelineDtos.ChecklistItem;
import com.onkey.onestep.timeline.TimelineDtos.ProgramRef;
import com.onkey.onestep.timeline.TimelineDtos.TimelineDraft;
import com.onkey.onestep.timeline.TimelineDtos.TimelineStep;

/**
 * 키 없이 공고문 텍스트에서 직접 타임라인을 뽑는 규칙 기반 생성기.
 * "항목명: 값" 형태의 줄을 찾으면 그 줄 전체를 sourceQuote 로 하는 CONFIRMED 항목을 만들고,
 * 찾지 못하면 "보통은 …" 식의 SIMULATED 항목과 unknowns 를 만든다.
 * ("※ 준비물 등은 홈페이지를 확인" 같은 안내 문장을 사실로 오인하지 않도록 콜론 형태만 인정한다.)
 */
final class MockTimelineGenerator {

    private MockTimelineGenerator() {}

    private static final Pattern PLACE = label("장소|모이는 곳");
    private static final Pattern SCHEDULE = label("활동 일시|활동 일자|활동 기간|일시|일정");
    private static final Pattern SUPPLIES = label("준비물");
    private static final Pattern PROGRESS = label("진행 순서|활동 내용|참여 방법");
    private static final Pattern TARGET = label("대상");
    private static final Pattern COST = label("참가비|재료비|비용|활동비");
    private static final Pattern CONTACT = label("문의");
    private static final Pattern PROGRAM_NAME = label("프로그램명");
    private static final Pattern TIME = Pattern.compile("\\d{1,2}:\\d{2}");
    private static final Pattern HEADER = Pattern.compile("^\\[(.+?)]\\s*(.+)$");
    private static final Pattern CHECKIN_WORDS = Pattern.compile("이름 확인|접수|출석|안내데스크|체크인|명단");

    private static Pattern label(String alternatives) {
        return Pattern.compile("(" + alternatives + ")\\s*[:：]");
    }

    /** 찾은 줄과 콜론 뒤 값. */
    private record Found(String line, String value) {}

    static TimelineDraft generate(String notice, List<String> concerns, ProgramRef program) {
        List<String> lines = notice.lines().map(String::trim).filter(l -> !l.isEmpty()).toList();
        Set<String> unknowns = new LinkedHashSet<>();

        Optional<Found> place = find(lines, PLACE);
        Optional<Found> schedule = find(lines, SCHEDULE);
        Optional<Found> progress = find(lines, PROGRESS);
        Optional<Found> supplies = find(lines, SUPPLIES);
        Optional<Found> cost = find(lines, COST);
        Optional<Found> target = find(lines, TARGET);
        Optional<Found> contact = find(lines, CONTACT);

        List<String> times = schedule.map(f -> allTimes(f.line())).orElse(List.of());
        String start = times.isEmpty() ? null : times.get(0);
        String end = times.size() >= 2 ? times.get(times.size() - 1) : null;
        boolean online = place.map(f -> f.value().contains("온라인")).orElse(false);

        if (schedule.isEmpty()) {
            unknowns.add("활동 일시");
        } else if (start == null) {
            unknowns.add("시작 시간");
        }

        List<TimelineStep> steps = new ArrayList<>();

        // ARRIVE
        if (place.isPresent()) {
            String shortPlace = stripParens(place.get().value());
            String verb = online ? shortPlace + "에 접속해요." : shortPlace + direction(shortPlace) + " 가요.";
            String desc = (start != null ? start + "까지 " : "") + verb;
            steps.add(new TimelineStep(Phase.ARRIVE, Phase.ARRIVE.title(), desc, start, place.get().value(),
                    Label.CONFIRMED, place.get().line()));
        } else {
            unknowns.add("장소");
            steps.add(new TimelineStep(Phase.ARRIVE, Phase.ARRIVE.title(),
                    "보통은 안내받은 장소로 시작 10분쯤 전에 가요. 장소는 공고에서 확인되지 않았어요.",
                    start, null, Label.SIMULATED, null));
        }

        // CHECKIN
        Optional<String> checkinSegment = progress.flatMap(f -> segmentMatching(f.value(), CHECKIN_WORDS));
        if (checkinSegment.isPresent()) {
            steps.add(new TimelineStep(Phase.CHECKIN, Phase.CHECKIN.title(),
                    "공고에 따르면 '" + checkinSegment.get() + "' 순서로 시작해요.",
                    null, null, Label.CONFIRMED, progress.get().line()));
        } else {
            unknowns.add(online ? "접속 후 확인 방법" : "도착 후 접수 방법");
            steps.add(new TimelineStep(Phase.CHECKIN, Phase.CHECKIN.title(), online
                    ? "보통은 접속하면 진행자가 이름이나 닉네임을 확인해요. 공고에서 확인되지 않았어요."
                    : "보통은 도착하면 접수처나 담당자에게 이름을 말해요. 공고에서 확인되지 않았어요.",
                    null, null, Label.SIMULATED, null));
        }

        // ACTIVITY
        if (progress.isPresent()) {
            String flow = progress.get().value();
            if (checkinSegment.isPresent()) {
                // 접수 단계에서 이미 보여준 첫 부분은 빼고 이어지는 진행만 적는다.
                String rest = flow.substring(flow.indexOf(checkinSegment.get()) + checkinSegment.get().length())
                        .replaceFirst("^\\s*(→|->)\\s*", "").trim();
                if (!rest.isEmpty()) {
                    flow = rest;
                }
            }
            steps.add(new TimelineStep(Phase.ACTIVITY, Phase.ACTIVITY.title(),
                    "공고에 적힌 진행: " + flow, start, null, Label.CONFIRMED, progress.get().line()));
        } else if (schedule.isPresent()) {
            unknowns.add("세부 활동 내용");
            steps.add(new TimelineStep(Phase.ACTIVITY, Phase.ACTIVITY.title(),
                    "활동 일정은 '" + schedule.get().value() + "'(으)로 안내돼 있어요. 세부 활동 내용은 공고에서 확인되지 않았어요.",
                    start, null, Label.CONFIRMED, schedule.get().line()));
        } else {
            unknowns.add("세부 활동 내용");
            steps.add(new TimelineStep(Phase.ACTIVITY, Phase.ACTIVITY.title(),
                    "보통은 간단한 소개 뒤에 활동을 시작해요. 공고에서 확인되지 않았어요.",
                    null, null, Label.SIMULATED, null));
        }

        // LEAVE
        if (end != null) {
            unknowns.add("마치고 나가는 방법");
            steps.add(new TimelineStep(Phase.LEAVE, Phase.LEAVE.title(),
                    end + "에 마치는 일정이에요. 끝난 뒤 나가는 방법은 공고에서 확인되지 않았어요.",
                    end, null, Label.CONFIRMED, schedule.get().line()));
        } else {
            unknowns.add("마치는 시간");
            steps.add(new TimelineStep(Phase.LEAVE, Phase.LEAVE.title(),
                    "보통은 활동이 끝나면 담당자에게 인사하고 나가요. 마치는 시간은 공고에서 확인되지 않았어요.",
                    null, null, Label.SIMULATED, null));
        }

        // CHECKLIST
        List<ChecklistItem> checklist = new ArrayList<>();
        if (supplies.isPresent()) {
            String value = supplies.get().value();
            if (value.startsWith("없음")) {
                checklist.add(new ChecklistItem("준비물 " + value, Label.CONFIRMED, supplies.get().line()));
            } else {
                for (String part : value.split("[,，、]")) {
                    if (!part.isBlank()) {
                        checklist.add(new ChecklistItem(part.trim(), Label.CONFIRMED, supplies.get().line()));
                    }
                }
            }
        } else {
            unknowns.add("준비물");
        }
        cost.ifPresentOrElse(
                f -> checklist.add(new ChecklistItem("비용: " + f.value(), Label.CONFIRMED, f.line())),
                () -> unknowns.add("비용"));
        target.ifPresentOrElse(
                f -> checklist.add(new ChecklistItem("참여 대상 확인: " + f.value(), Label.CONFIRMED, f.line())),
                () -> unknowns.add("참여 대상"));
        contact.ifPresentOrElse(
                f -> checklist.add(new ChecklistItem("문의처: " + f.value(), Label.CONFIRMED, f.line())),
                () -> unknowns.add("문의처"));
        checklist.add(new ChecklistItem(online ? "이어폰과 충전된 기기" : "충전된 휴대폰과 교통카드", Label.SIMULATED, null));

        ProgramRef ref = program != null ? program : programFromNotice(lines);
        return new TimelineDraft(ref, steps, checklist, List.copyOf(unknowns), MockTips.forConcerns(concerns));
    }

    private static Optional<Found> find(List<String> lines, Pattern pattern) {
        for (String line : lines) {
            Matcher m = pattern.matcher(line);
            if (m.find()) {
                String value = line.substring(m.end()).trim();
                if (!value.isEmpty()) {
                    return Optional.of(new Found(line, value));
                }
            }
        }
        return Optional.empty();
    }

    private static List<String> allTimes(String line) {
        List<String> result = new ArrayList<>();
        Matcher m = TIME.matcher(line);
        while (m.find()) {
            result.add(m.group());
        }
        return result;
    }

    private static Optional<String> segmentMatching(String value, Pattern words) {
        for (String segment : value.split("→|->")) {
            if (words.matcher(segment).find()) {
                return Optional.of(segment.trim());
            }
        }
        return Optional.empty();
    }

    private static ProgramRef programFromNotice(List<String> lines) {
        String title = find(lines, PROGRAM_NAME).map(Found::value).orElse(null);
        String org = null;
        if (!lines.isEmpty()) {
            Matcher m = HEADER.matcher(lines.get(0));
            if (m.matches()) {
                org = m.group(1).trim();
                if (title == null) {
                    title = m.group(2).replaceAll("\\s*(참여자|참가자)?\\s*모집$", "").trim();
                }
            }
        }
        return new ProgramRef(title, org);
    }

    private static String stripParens(String text) {
        String stripped = text.replaceAll("\\s*\\([^)]*\\)", "").trim();
        return stripped.isEmpty() ? text : stripped;
    }

    /** 받침 여부에 따라 "로"/"으로" (ㄹ 받침은 "로"). */
    static String direction(String noun) {
        char last = noun.charAt(noun.length() - 1);
        if (last < 0xAC00 || last > 0xD7A3) {
            return "(으)로";
        }
        int jong = (last - 0xAC00) % 28;
        return jong == 0 || jong == 8 ? "로" : "으로";
    }
}
