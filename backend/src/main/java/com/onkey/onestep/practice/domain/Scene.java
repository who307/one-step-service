package com.onkey.onestep.practice.domain;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;

/** 범용 가상 연습 장면. 특정 기관의 실제 절차를 재현하지 않는다. */
@Entity
@Table(name = "scene")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
public class Scene {

    @Id
    @Column(length = 64)
    private String id;

    @Column(nullable = false)
    private String title;

    private String description;

    /** 막힐 때 보여줄 예시 한 문장 */
    private String starterLine;

    /** route, firstWords, crowd, supplies, schedule, askHelp */
    @Column(length = 20)
    private String worry;

    /** AI 상대역에게 줄 장면 지시문. 평가·진단 금지 규칙은 AvatarGateway 공통 프롬프트에 둔다. */
    @Column(length = 2000)
    private String rolePrompt;

    private int sortOrder;
}
