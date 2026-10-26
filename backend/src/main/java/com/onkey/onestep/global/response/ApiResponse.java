package com.onkey.onestep.global.response;

/** 모든 REST 응답의 공통 형태. 프론트 lib/api/client.ts 가 data 필드를 꺼내 쓴다. */
public record ApiResponse<T>(boolean success, T data, String message) {

    public static <T> ApiResponse<T> ok(T data) {
        return new ApiResponse<>(true, data, null);
    }

    public static <T> ApiResponse<T> fail(String message) {
        return new ApiResponse<>(false, null, message);
    }
}
