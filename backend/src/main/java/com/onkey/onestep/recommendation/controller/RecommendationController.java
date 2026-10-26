package com.onkey.onestep.recommendation.controller;

import com.onkey.onestep.global.response.ApiResponse;
import com.onkey.onestep.recommendation.dto.PreferenceRequest;
import com.onkey.onestep.recommendation.dto.RecommendationResponse;
import com.onkey.onestep.recommendation.service.RecommendationService;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/recommendations")
@RequiredArgsConstructor
public class RecommendationController {

    private final RecommendationService recommendationService;

    @PostMapping
    public ApiResponse<List<RecommendationResponse>> recommend(@RequestBody PreferenceRequest pref) {
        return ApiResponse.ok(recommendationService.recommend(pref));
    }
}
