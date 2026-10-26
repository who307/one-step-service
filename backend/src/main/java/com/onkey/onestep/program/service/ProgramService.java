package com.onkey.onestep.program.service;

import com.onkey.onestep.global.exception.NotFoundException;
import com.onkey.onestep.program.dto.ProgramResponse;
import com.onkey.onestep.program.repository.ProgramRepository;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ProgramService {

    private final ProgramRepository programRepository;

    public List<ProgramResponse> findAll() {
        return programRepository.findAll().stream().map(ProgramResponse::from).toList();
    }

    public ProgramResponse findById(String id) {
        return programRepository.findWithFactsById(id)
                .map(ProgramResponse::from)
                .orElseThrow(() -> new NotFoundException("공고를 찾지 못했어요."));
    }
}
