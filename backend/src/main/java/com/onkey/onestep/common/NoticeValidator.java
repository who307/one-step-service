package com.onkey.onestep.common;

import java.util.List;
import java.util.regex.Pattern;

import org.springframework.stereotype.Component;

/**
 * 공고문 여부를 가볍게 판단하는 휴리스틱.
 * 공고에 흔한 신호(모집·신청·접수·기간·일시·장소·대상·참가·프로그램·문의 등, 날짜·시간 표기)가
 * {@value #THRESHOLD}개 이상이면 공고로 본다.
 */
@Component
public class NoticeValidator {

    static final int THRESHOLD = 3;

    private static final List<String> KEYWORDS = List.of(
            "모집", "신청", "접수", "기간", "일시", "장소", "대상", "참가", "프로그램", "문의", "준비물", "인원", "일정");

    private static final Pattern DATE = Pattern.compile(
            "\\d{4}\\s*[.\\-/년]\\s*\\d{1,2}|\\d{1,2}\\s*월\\s*\\d{1,2}\\s*일|\\d{1,2}\\.\\d{1,2}");
    private static final Pattern TIME = Pattern.compile("\\d{1,2}:\\d{2}|\\d{1,2}\\s*시(?![간작])");

    public boolean isNotice(String text) {
        return countSignals(text) >= THRESHOLD;
    }

    int countSignals(String text) {
        if (text == null || text.isBlank()) {
            return 0;
        }
        int signals = (int) KEYWORDS.stream().filter(text::contains).count();
        if (DATE.matcher(text).find()) {
            signals++;
        }
        if (TIME.matcher(text).find()) {
            signals++;
        }
        return signals;
    }
}
