package com.onkey.onestep.common;

/** 공통 실패 응답: {@code {"code": "...", "message": "..."}} */
public record ErrorResponse(String code, String message) {

    public static ErrorResponse of(ErrorCode errorCode) {
        return new ErrorResponse(errorCode.code(), errorCode.getMessage());
    }
}
