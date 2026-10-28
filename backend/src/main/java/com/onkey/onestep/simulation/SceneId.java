package com.onkey.onestep.simulation;

public enum SceneId {
    FIRST_INQUIRY("첫 문의하기"),
    CHECKIN("접수처에서 말하기"),
    GREETING("처음 만난 참여자에게 인사하기"),
    CLOSING("마무리할 때 소감 말하기");

    private final String label;

    SceneId(String label) {
        this.label = label;
    }

    public String label() {
        return label;
    }
}
