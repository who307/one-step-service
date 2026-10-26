package com.onkey.onestep.program.controller;

import com.onkey.onestep.global.response.ApiResponse;
import com.onkey.onestep.program.dto.ProgramResponse;
import com.onkey.onestep.program.service.ProgramService;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/programs")
@RequiredArgsConstructor
public class ProgramController {

    private final ProgramService programService;

    @GetMapping
    public ApiResponse<List<ProgramResponse>> list() {
        return ApiResponse.ok(programService.findAll());
    }

    @GetMapping("/{id}")
    public ApiResponse<ProgramResponse> detail(@PathVariable String id) {
        return ApiResponse.ok(programService.findById(id));
    }
}
