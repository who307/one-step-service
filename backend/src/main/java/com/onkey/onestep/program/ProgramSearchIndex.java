package com.onkey.onestep.program;

import java.util.Arrays;
import java.util.List;
import java.util.Locale;
import java.util.regex.Pattern;

/**
 * 공고 검색용 문자열을 공고마다 미리 만들어 둔다. 요청마다 공고 수천 건을 소문자로 바꾸지 않으려고.
 * 공백을 지우고 비교해서 "청년공간"으로 "청년 공간"을 찾을 수 있다. 검색어를 띄어 쓰면 모든 단어가 들어 있어야 한다(AND).
 */
final class ProgramSearchIndex {

    private static final Pattern SPACES = Pattern.compile("\\s+");

    record Entry(Program program, String key) {}

    private final List<Program> source;
    private final List<Entry> entries;

    private ProgramSearchIndex(List<Program> source) {
        this.source = source;
        this.entries = source.stream().map(p -> new Entry(p, keyOf(p))).toList();
    }

    /** provider가 같은 목록(같은 인스턴스)을 돌려주는 동안은 기존 색인을 그대로 쓴다. */
    static ProgramSearchIndex of(List<Program> programs, ProgramSearchIndex previous) {
        return previous != null && previous.source == programs ? previous : new ProgramSearchIndex(programs);
    }

    List<Entry> entries() {
        return entries;
    }

    /** 검색어를 공백으로 나눈 단어들. 비어 있으면 빈 배열(= 모두 통과). */
    static String[] tokens(String q) {
        if (q == null || q.isBlank()) return new String[0];
        return Arrays.stream(SPACES.split(q.trim())).map(ProgramSearchIndex::normalize).filter(s -> !s.isEmpty()).toArray(String[]::new);
    }

    static boolean matches(Entry e, String[] tokens) {
        for (String t : tokens) {
            if (!e.key().contains(t)) return false;
        }
        return true;
    }

    private static String keyOf(Program p) {
        StringBuilder sb = new StringBuilder();
        for (String s : new String[] {p.title(), p.organization(), p.summary(), p.location(), p.eligibility()}) {
            if (s != null) sb.append(s).append('\u0000');
        }
        return normalize(sb.toString());
    }

    private static String normalize(String s) {
        return SPACES.matcher(s.toLowerCase(Locale.ROOT)).replaceAll("");
    }
}
