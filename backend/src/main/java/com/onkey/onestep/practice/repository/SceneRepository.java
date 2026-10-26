package com.onkey.onestep.practice.repository;

import com.onkey.onestep.practice.domain.Scene;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SceneRepository extends JpaRepository<Scene, String> {
    List<Scene> findAllByOrderBySortOrderAsc();
}
