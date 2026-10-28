package com.onkey.onestep.program;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.onkey.onestep.program.ProgramDtos.ProgramListResponse;
import com.onkey.onestep.program.ProgramDtos.RecommendationRequest;
import com.onkey.onestep.program.ProgramDtos.RecommendationResponse;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
public class ProgramController {

    private final ProgramService programService;

    @GetMapping("/programs")
    public ProgramListResponse list(@RequestParam(required = false) Category category,
                                    @RequestParam(required = false) Mode mode,
                                    @RequestParam(required = false) String q) {
        return programService.list(category, mode, q);
    }

    @GetMapping("/programs/{id}")
    public ProgramDetail get(@PathVariable String id) {
        return programService.get(id);
    }

    @PostMapping("/recommendations")
    public RecommendationResponse recommend(@Valid @RequestBody(required = false) RecommendationRequest request) {
        return programService.recommend(request);
    }
}
