package com.onkey.onestep.inquiry;

import java.util.List;

import com.onkey.onestep.inquiry.InquiryDtos.InquiryDraftRequest;

/** AI 없이 만드는 정중한 문의 문장 템플릿. Gemini 실패 시에도 이 결과를 돌려준다. */
public final class InquiryTemplate {

    private InquiryTemplate() {}

    public static String build(InquiryDraftRequest request) {
        String title = blank(request.programTitle()) ? null : request.programTitle().trim();
        String org = blank(request.organization()) ? null : request.organization().trim();
        List<String> questions = request.questions() == null ? List.of()
                : request.questions().stream().filter(q -> !blank(q)).map(String::trim).toList();

        StringBuilder sb = new StringBuilder();
        sb.append("안녕하세요");
        if (org != null) {
            sb.append(", ").append(org).append(" 담당자님");
        }
        sb.append(". ");
        if (title != null) {
            sb.append("‘").append(title).append("’ 프로그램에 관심이 있어 문의드립니다.");
        } else {
            sb.append("공고를 보고 프로그램에 관심이 있어 문의드립니다.");
        }
        if (!blank(request.userNote())) {
            String note = request.userNote().trim();
            sb.append("\n").append(note);
            if (!note.matches(".*[.!?。…]$")) {
                sb.append('.');
            }
        }
        if (!questions.isEmpty()) {
            sb.append("\n\n아래 내용이 궁금합니다.");
            for (String q : questions) {
                sb.append("\n- ").append(q);
            }
        }
        sb.append("\n\n바쁘시겠지만 확인 부탁드립니다. 감사합니다.");
        return sb.toString();
    }

    private static boolean blank(String s) {
        return s == null || s.isBlank();
    }
}
