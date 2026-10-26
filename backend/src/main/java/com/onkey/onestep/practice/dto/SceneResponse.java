package com.onkey.onestep.practice.dto;

import com.onkey.onestep.practice.domain.Scene;

public record SceneResponse(String id, String title, String description, String starterLine, String worry) {
    public static SceneResponse from(Scene s) {
        return new SceneResponse(s.getId(), s.getTitle(), s.getDescription(), s.getStarterLine(), s.getWorry());
    }
}
