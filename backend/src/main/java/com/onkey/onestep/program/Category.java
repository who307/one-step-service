package com.onkey.onestep.program;

public enum Category {
    DAILY("일상 회복"),
    COOKING("요리·살림"),
    WORK("일경험"),
    ART("만들기·예술"),
    EXERCISE("걷기·운동"),
    TALK("대화·모임");

    private final String label;

    Category(String label) {
        this.label = label;
    }

    public String label() {
        return label;
    }
}
