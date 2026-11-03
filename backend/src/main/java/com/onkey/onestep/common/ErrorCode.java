package com.onkey.onestep.common;

import org.springframework.http.HttpStatus;

import lombok.Getter;

/** docs/API.md 오류 코드표. 메시지는 사용자에게 그대로 보여줄 수 있는 안전한 문장만 쓴다. */
@Getter
public enum ErrorCode {
    INVALID_LENGTH(HttpStatus.BAD_REQUEST, "입력 길이를 확인해 주세요."),
    INVALID_REQUEST(HttpStatus.BAD_REQUEST, "요청 내용을 확인해 주세요."),
    NOT_A_NOTICE(HttpStatus.UNPROCESSABLE_CONTENT, "공고문으로 보기 어려운 내용이에요. 공고 원문을 붙여 넣거나 예시 공고를 골라 주세요."),
    NOT_FOUND(HttpStatus.NOT_FOUND, "공고를 찾을 수 없어요."),
    INVALID_STATE(HttpStatus.CONFLICT, "연습 대화가 이미 끝났어요. 처음부터 다시 시작해 주세요."),
    RATE_LIMITED(HttpStatus.TOO_MANY_REQUESTS, "요청이 많아 잠시 쉬고 있어요. 조금 뒤에 다시 시도해 주세요."),
    RAG_FORBIDDEN(HttpStatus.FORBIDDEN, "공고 색인 권한이 필요해요."),
    RAG_INDEXING(HttpStatus.CONFLICT, "이 공고를 색인하고 있어요. 잠시 후 다시 확인해 주세요."),
    RAG_UNAVAILABLE(HttpStatus.SERVICE_UNAVAILABLE, "공고 검색 서비스를 사용할 수 없어요. 잠시 후 다시 시도해 주세요."),
    LLM_ERROR(HttpStatus.BAD_GATEWAY, "AI 응답을 만들지 못했어요. 다시 시도하거나 예시로 진행해 주세요."),
    LLM_TIMEOUT(HttpStatus.GATEWAY_TIMEOUT, "응답이 지연되고 있어요. 다시 시도해 주세요."),
    /** API.md 표에는 없는 예상 밖 서버 오류용(500). */
    INTERNAL_ERROR(HttpStatus.INTERNAL_SERVER_ERROR, "일시적인 문제가 생겼어요. 잠시 후 다시 시도해 주세요.");

    private final HttpStatus status;
    private final String message;

    ErrorCode(HttpStatus status, String message) {
        this.status = status;
        this.message = message;
    }

    public String code() {
        return name();
    }
}
