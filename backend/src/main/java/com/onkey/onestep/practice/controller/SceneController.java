package com.onkey.onestep.practice.controller;

import com.onkey.onestep.global.response.ApiResponse;
import com.onkey.onestep.practice.dto.SceneResponse;
import com.onkey.onestep.practice.service.SceneService;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/scenes")
@RequiredArgsConstructor
public class SceneController {

    private final SceneService sceneService;

    @GetMapping
    public ApiResponse<List<SceneResponse>> list() {
        return ApiResponse.ok(sceneService.findAll());
    }

    @GetMapping("/{id}")
    public ApiResponse<SceneResponse> detail(@PathVariable String id) {
        return ApiResponse.ok(sceneService.findById(id));
    }
}
