package com.onkey.onestep.program.client;

import java.util.List;

/** 온통청년 청년정책 API 포트. 브라우저가 아닌 서버에서만 호출한다(키 보호·CORS). */
public interface YouthCenterClient {

    /** 서울 지역 고립·은둔/사회적응 관련 정책 검색 */
    List<YouthPolicyItem> search(String keyword, String region);
}
