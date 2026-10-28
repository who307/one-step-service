package com.onkey.onestep.timeline;

public enum Phase {
    ARRIVE("도착"),
    CHECKIN("접수"),
    ACTIVITY("활동"),
    LEAVE("귀가");

    private final String title;

    Phase(String title) {
        this.title = title;
    }

    public String title() {
        return title;
    }
}
