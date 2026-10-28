package com.onkey.onestep.simulation;

import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.onkey.onestep.simulation.SimulationDtos.SimulationCompleteRequest;
import com.onkey.onestep.simulation.SimulationDtos.SimulationCompleteResponse;
import com.onkey.onestep.simulation.SimulationDtos.SimulationMessageRequest;
import com.onkey.onestep.simulation.SimulationDtos.SimulationMessageResponse;
import com.onkey.onestep.simulation.SimulationDtos.SimulationStartRequest;
import com.onkey.onestep.simulation.SimulationDtos.SimulationStartResponse;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

/** simulationId 는 경로 일관성을 위한 임의 UUID 이며 서버 쪽 상태가 없다. */
@RestController
@RequestMapping("/api/v1/simulations")
@RequiredArgsConstructor
public class SimulationController {

    private final SimulationService simulationService;

    @PostMapping
    public SimulationStartResponse start(@Valid @RequestBody SimulationStartRequest request) {
        return simulationService.start(request);
    }

    @PostMapping("/{id}/messages")
    public SimulationMessageResponse message(@PathVariable String id,
                                             @Valid @RequestBody SimulationMessageRequest request) {
        return simulationService.message(request);
    }

    @PostMapping("/{id}/complete")
    public SimulationCompleteResponse complete(@PathVariable String id,
                                               @Valid @RequestBody SimulationCompleteRequest request) {
        return simulationService.complete(request);
    }
}
