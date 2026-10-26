package com.onkey.onestep.recommendation.dto;

import java.util.List;

/** 사용자가 고른 관심·참여 방식·걱정. 저장하지 않고 정렬에만 쓴다. */
public record PreferenceRequest(List<String> interests, List<String> modes, List<String> worries) {

    public PreferenceRequest {
        interests = interests == null ? List.of() : interests;
        modes = modes == null ? List.of() : modes;
        worries = worries == null ? List.of() : worries;
    }
}
