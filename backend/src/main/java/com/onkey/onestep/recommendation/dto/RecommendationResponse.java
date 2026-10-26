package com.onkey.onestep.recommendation.dto;

import com.onkey.onestep.program.dto.ProgramResponse;
import java.util.List;

public record RecommendationResponse(ProgramResponse program, int score, List<String> reasons) {}
