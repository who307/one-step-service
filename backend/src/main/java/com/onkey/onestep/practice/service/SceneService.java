package com.onkey.onestep.practice.service;

import com.onkey.onestep.global.exception.NotFoundException;
import com.onkey.onestep.practice.dto.SceneResponse;
import com.onkey.onestep.practice.repository.SceneRepository;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class SceneService {

    private final SceneRepository sceneRepository;

    public List<SceneResponse> findAll() {
        return sceneRepository.findAllByOrderBySortOrderAsc().stream().map(SceneResponse::from).toList();
    }

    public SceneResponse findById(String id) {
        return sceneRepository.findById(id).map(SceneResponse::from)
                .orElseThrow(() -> new NotFoundException("장면을 찾지 못했어요."));
    }
}
