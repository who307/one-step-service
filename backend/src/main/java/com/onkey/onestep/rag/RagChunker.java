package com.onkey.onestep.rag;

import java.util.ArrayList;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/** 항목 제목을 보존하고 긴 항목만 분할한다. 모든 분할 문단은 같은 섹션을 추적한다. */
public final class RagChunker {
    public static final String PIPELINE_VERSION = "ontong-sections-v1";
    static final int MAX_SECTION_CHARS = 1600;
    static final int OVERLAP_CHARS = 160;
    private static final Pattern HEADING = Pattern.compile("(?m)^## ([^\\r\\n]+)\\r?\\n");

    public record Chunk(String section, String content) {}

    public List<Chunk> split(RagSourceDocument document) {
        if (document == null || document.content() == null || document.content().isBlank()) {
            return List.of();
        }
        List<Chunk> chunks = new ArrayList<>();
        String body = document.content().replace("\r\n", "\n").replace('\r', '\n');
        Matcher matcher = HEADING.matcher(body);
        String section = "본문";
        int start = 0;
        while (matcher.find()) {
            append(chunks, document.title(), section, body.substring(start, matcher.start()).strip());
            section = matcher.group(1).strip();
            start = matcher.end();
        }
        append(chunks, document.title(), section, body.substring(start).strip());
        return List.copyOf(chunks);
    }

    private static void append(List<Chunk> chunks, String title, String section, String body) {
        if (body.isBlank()) return;
        String prefix = "공고: " + title + "\n항목: " + section + "\n";
        for (int start = 0; start < body.length();) {
            int end = Math.min(start + MAX_SECTION_CHARS, body.length());
            if (end < body.length()) {
                // 가능한 한 문단·문장 경계를 따른다. 긴 한 문장은 겹침을 두어 분할한다.
                int boundary = end;
                while (boundary > start + MAX_SECTION_CHARS / 2) {
                    char previous = body.charAt(boundary - 1);
                    if (previous == '\n' || previous == '.' || previous == '。' || previous == ';') break;
                    boundary--;
                }
                if (boundary > start + MAX_SECTION_CHARS / 2) end = boundary;
                if (Character.isHighSurrogate(body.charAt(end - 1))) end--;
            }
            chunks.add(new Chunk(section, prefix + body.substring(start, end).strip()));
            if (end == body.length()) break;
            start = Math.max(start + 1, end - OVERLAP_CHARS);
            if (Character.isLowSurrogate(body.charAt(start))) start++;
        }
    }
}
