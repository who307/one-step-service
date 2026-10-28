package com.onkey.onestep.timeline;

import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.onkey.onestep.timeline.TimelineDtos.TimelineRequest;
import com.onkey.onestep.timeline.TimelineDtos.TimelineResponse;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
public class TimelineController {

    private final TimelineService timelineService;

    @PostMapping("/timelines")
    public TimelineResponse create(@Valid @RequestBody TimelineRequest request) {
        return timelineService.create(request);
    }
}
