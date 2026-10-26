package com.onkey.onestep.program.client;

/**
 * 온통청년 API 응답 한 건을 우리 쪽 필드로 옮겨 담은 값.
 * API 원본 필드명은 YouthCenterApiClient 안에서만 다룬다.
 */
public record YouthPolicyItem(
        String policyId,
        String title,
        String organization,
        String summary,
        String applyPeriod,   // 원문 그대로. 파싱 실패 시 UNCONFIRMED 로 둔다
        String target,
        String applyUrl,
        String region
) {}
