package com.onkey.onestep.common;

import java.util.Set;

import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.validation.FieldError;
import org.springframework.web.HttpMediaTypeNotSupportedException;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.HandlerMethodValidationException;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.servlet.resource.NoResourceFoundException;

import lombok.extern.slf4j.Slf4j;

/**
 * 모든 실패를 {@code {code, message}} 로 바꾼다.
 * 예외 메시지에는 요청 본문 일부가 섞일 수 있으므로 로그·응답 어디에도 원래 예외 메시지를 쓰지 않는다.
 */
@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

    /** 이 필드들의 길이·개수 제약 위반은 INVALID_LENGTH, 그 밖의 검증 실패는 INVALID_REQUEST. */
    private static final Set<String> LENGTH_FIELDS = Set.of("noticeText", "concerns", "userText");
    private static final Set<String> LENGTH_CODES = Set.of("Size", "Length");

    @ExceptionHandler(ApiException.class)
    public ResponseEntity<ErrorResponse> handleApi(ApiException e) {
        ErrorCode code = e.getErrorCode();
        log.info("api error code={}", code.code());
        return ResponseEntity.status(code.getStatus()).body(new ErrorResponse(code.code(), e.getMessage()));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorResponse> handleValidation(MethodArgumentNotValidException e) {
        boolean lengthViolation = e.getBindingResult().getFieldErrors().stream().anyMatch(this::isLengthViolation);
        ErrorCode code = lengthViolation ? ErrorCode.INVALID_LENGTH : ErrorCode.INVALID_REQUEST;
        log.info("validation error code={}", code.code());
        return respond(code);
    }

    @ExceptionHandler({
            HttpMessageNotReadableException.class,
            HandlerMethodValidationException.class,
            MethodArgumentTypeMismatchException.class,
            MissingServletRequestParameterException.class,
            HttpRequestMethodNotSupportedException.class,
            HttpMediaTypeNotSupportedException.class
    })
    public ResponseEntity<ErrorResponse> handleBadRequest(Exception e) {
        log.info("bad request type={}", e.getClass().getSimpleName());
        return respond(ErrorCode.INVALID_REQUEST);
    }

    @ExceptionHandler(NoResourceFoundException.class)
    public ResponseEntity<ErrorResponse> handleNoResource(NoResourceFoundException e) {
        ErrorCode code = ErrorCode.NOT_FOUND;
        return ResponseEntity.status(code.getStatus()).body(new ErrorResponse(code.code(), "요청한 주소를 찾을 수 없어요."));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleUnexpected(Exception e) {
        StackTraceElement[] trace = e.getStackTrace();
        log.error("unexpected error type={} at={}", e.getClass().getName(), trace.length > 0 ? trace[0] : "?");
        return respond(ErrorCode.INTERNAL_ERROR);
    }

    private boolean isLengthViolation(FieldError error) {
        String field = error.getField();
        String root = field.contains("[") ? field.substring(0, field.indexOf('[')) : field;
        return LENGTH_FIELDS.contains(root) && LENGTH_CODES.contains(error.getCode());
    }

    private ResponseEntity<ErrorResponse> respond(ErrorCode code) {
        return ResponseEntity.status(code.getStatus()).body(ErrorResponse.of(code));
    }
}
