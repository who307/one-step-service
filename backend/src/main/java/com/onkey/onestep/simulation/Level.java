package com.onkey.onestep.simulation;

/** L1 지켜보기(최대 6턴) · L2 짧게 답하기(최대 5턴) · L3 자유 대화(최대 8턴) */
public enum Level {
    L1(6),
    L2(5),
    L3(8);

    private final int maxTurns;

    Level(int maxTurns) {
        this.maxTurns = maxTurns;
    }

    public int maxTurns() {
        return maxTurns;
    }
}
