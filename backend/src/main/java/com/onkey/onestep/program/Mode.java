package com.onkey.onestep.program;

public enum Mode {
    OFFLINE("직접 방문하는 활동이에요"),
    ONLINE("온라인으로 참여하는 활동이에요"),
    GROUP("여럿이 함께하는 활동이에요"),
    SOLO("혼자서 할 수 있는 활동이에요");

    private final String reason;

    Mode(String reason) {
        this.reason = reason;
    }

    /** 추천 이유 문장. */
    public String reason() {
        return reason;
    }
}
