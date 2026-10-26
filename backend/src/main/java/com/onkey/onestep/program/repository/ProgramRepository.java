package com.onkey.onestep.program.repository;

import com.onkey.onestep.program.domain.Program;
import java.util.Optional;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ProgramRepository extends JpaRepository<Program, String> {

    @EntityGraph(attributePaths = "facts")
    Optional<Program> findWithFactsById(String id);

    Optional<Program> findByExternalId(String externalId);
}
