package com.onkey.onestep.common;

import lombok.Getter;

/** 계약된 오류 코드로 응답하는 예외. 메시지에는 사용자 입력을 넣지 않는다. */
@Getter
public class ApiException extends RuntimeException {

    private final ErrorCode errorCode;

    public ApiException(ErrorCode errorCode) {
        this(errorCode, errorCode.getMessage());
    }

    public ApiException(ErrorCode errorCode, String message) {
        super(message);
        this.errorCode = errorCode;
    }
}
