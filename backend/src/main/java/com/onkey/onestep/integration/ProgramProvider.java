package com.onkey.onestep.integration;

import java.util.List;
import java.util.Optional;

import com.onkey.onestep.program.Program;

/** 공개 공고 조회 포트. 구현: {@link MockProgramProvider}(기본) / {@link OntongYouthProgramProvider}. */
public interface ProgramProvider {

    /** 응답의 source 값: MOCK · ONTONG */
    String source();

    List<Program> findAll();

    Optional<Program> findById(String id);
}
