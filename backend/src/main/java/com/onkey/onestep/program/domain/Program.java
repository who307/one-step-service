package com.onkey.onestep.program.domain;

import jakarta.persistence.*;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "program")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Program {

    @Id
    @Column(length = 64)
    private String id;

    /** 화면 확인용으로 지어낸 공고. 프론트에서 "예시"로 표시한다. */
    private boolean sample;

    /** 온통청년 정책 ID 등 외부 식별자. MANUAL 이면 null */
    @Column(unique = true, length = 64)
    private String externalId;

    @Column(nullable = false)
    private String title;

    @Column(nullable = false)
    private String organization;

    @Column(length = 1000)
    private String summary;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "program_interest", joinColumns = @JoinColumn(name = "program_id"))
    @Column(name = "interest", length = 20)
    private Set<String> interests = new HashSet<>();

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "program_mode", joinColumns = @JoinColumn(name = "program_id"))
    @Column(name = "mode", length = 20)
    private Set<String> modes = new HashSet<>();

    /** 공식적으로 확인된 부담(selection, documents, cost, preTask)만 담는다. */
    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "program_burden", joinColumns = @JoinColumn(name = "program_id"))
    @Column(name = "burden", length = 20)
    private Set<String> knownBurdens = new HashSet<>();

    @OneToMany(mappedBy = "program", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("sortOrder ASC")
    private List<ProgramFact> facts = new ArrayList<>();

    @Embedded
    private Location location;

    @Column(nullable = false)
    private String sourceUrl;

    @Column(nullable = false)
    private LocalDate sourceCheckedAt;

    private String applyUrl;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private ProgramSource source;

    @Builder
    private Program(String id, boolean sample, String externalId, String title, String organization, String summary,
                    Set<String> interests, Set<String> modes, Set<String> knownBurdens, Location location,
                    String sourceUrl, LocalDate sourceCheckedAt, String applyUrl, ProgramSource source) {
        this.id = id;
        this.sample = sample;
        this.externalId = externalId;
        this.title = title;
        this.organization = organization;
        this.summary = summary;
        if (interests != null) this.interests = new HashSet<>(interests);
        if (modes != null) this.modes = new HashSet<>(modes);
        if (knownBurdens != null) this.knownBurdens = new HashSet<>(knownBurdens);
        this.location = location;
        this.sourceUrl = sourceUrl;
        this.sourceCheckedAt = sourceCheckedAt;
        this.applyUrl = applyUrl;
        this.source = source;
    }

    public void addFact(ProgramFact fact) {
        fact.attachTo(this);
        facts.add(fact);
    }
}
