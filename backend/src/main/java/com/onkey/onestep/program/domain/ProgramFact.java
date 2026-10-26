package com.onkey.onestep.program.domain;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

/** 공고의 사실 항목 한 줄 (접수 기간, 장소, 준비물 …) */
@Entity
@Table(name = "program_fact")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class ProgramFact {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "program_id")
    private Program program;

    /** applyPeriod, activityDate, place, target, selection, cost, supplies, schedule */
    @Column(name = "fact_key", nullable = false, length = 30)
    private String key;

    @Column(nullable = false, length = 30)
    private String label;

    /** UNCONFIRMED 이면 null */
    private String value;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private FactStatus status;

    private String note;

    private int sortOrder;

    public ProgramFact(String key, String label, String value, FactStatus status, String note, int sortOrder) {
        this.key = key;
        this.label = label;
        this.value = value;
        this.status = status;
        this.note = note;
        this.sortOrder = sortOrder;
    }

    void attachTo(Program program) {
        this.program = program;
    }
}
