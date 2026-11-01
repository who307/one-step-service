import { josa } from "@/lib/josa";
import { GENERAL_PRACTICE, type JourneyStop, type ProgramSnapshot, type StopType } from "@/features/flow/FlowProvider";

// 나의 노선 규칙.
// - 작은 행동(공고 읽기, 문의 문장 준비)도 역으로 남긴다.
// - 못 간 것은 "쉬어감"으로 남기고 노선을 끊지 않는다.
// - 연속 기록·순위·재촉 알림은 만들지 않는다.

export function stopLabel(s: JourneyStop): string {
  switch (s.type) {
    case "read":
      return `${s.programTitle} 공고를 읽어봤어요`;
    case "inquiry":
      return `${s.programTitle} 문의 문장을 준비했어요`;
    case "practice":
      return `${josa(`‘${s.sceneTitle ?? "말 연습"}’`, "을/를")} 연습했어요`;
    case "visited":
      return `${s.programTitle}에 다녀왔어요`;
    case "rested":
      return `${josa(s.programTitle, "은/는")} 이번엔 쉬어갔어요`;
  }
}

/** 역의 크기: 다녀옴 > 연습 > 나머지 작은 걸음 */
export function stopWeight(type: StopType): "big" | "mid" | "small" {
  if (type === "visited") return "big";
  if (type === "practice") return "mid";
  return "small";
}

/**
 * 다녀왔는지 물어볼 공고들: 연습한 적이 있고, 마지막 연습 뒤에 다녀옴·쉬어감 답이 없는 공고.
 * 공고마다 마지막 연습 하나씩, 최근에 연습한 순서로 돌려준다.
 * 다른 공고를 연습하고 답해도 앞서 답하지 않은 공고는 목록에 남는다.
 */
export function pendingVisits(stops: JourneyStop[]): JourneyStop[] {
  const seen = new Set<string>();
  const pending: JourneyStop[] = [];
  for (let i = stops.length - 1; i >= 0; i--) {
    const s = stops[i];
    if (s.type !== "practice" || s.programKey === GENERAL_PRACTICE || seen.has(s.programKey)) continue;
    seen.add(s.programKey);
    const answered = stops.slice(i + 1).some((t) => t.programKey === s.programKey && (t.type === "visited" || t.type === "rested"));
    const visitedBefore = stops.some((t) => t.programKey === s.programKey && t.type === "visited");
    if (!answered && !visitedBefore) pending.push(s);
  }
  return pending;
}

/** 지금 물어볼 공고 하나(한 번에 하나만 묻는다). 답하면 다음 공고를 묻는다. */
export function pendingVisit(stops: JourneyStop[]): JourneyStop | null {
  return pendingVisits(stops)[0] ?? null;
}

/** 준비 흐름의 네 묶음. 진행바와 이어서 하기가 같은 이름을 쓴다. */
export const PROGRESS_GROUPS = ["공고", "미리보기", "연습", "마무리"] as const;

/** 공고 하나의 진행. step: 지금 할 묶음(1 미리보기 · 2 연습 · 3 마무리). 공고를 고른 뒤라 0은 없다. */
export interface ProgramProgress {
  programKey: string;
  programTitle: string;
  step: 1 | 2 | 3;
  /** 다녀옴·쉬어감으로 답했으면 완료 */
  done: boolean;
  answer: "visited" | "rested" | null;
  /** 마지막으로 무언가 한 때 */
  lastAt: Date;
  /** 완료한 때(마지막 답) */
  answeredAt: Date | null;
}

/** 이어서 하기로 갈 화면. 공고 흐름의 기존 화면을 그대로 쓴다. */
export const RESUME_HREF: Record<ProgramProgress["step"], string> = { 1: "/concerns", 2: "/check/before", 3: "/journey" };

/**
 * 준비한 공고마다 어디까지 했는지. 역(공고 읽기·연습·답)과 이어 하기용 상태로 정한다.
 * - 다녀온 적이 있거나, 쉬어감 뒤에 다시 연습하지 않았으면 완료
 * - 연습했으면 마무리, 공고(타임라인)를 읽었으면 연습, 고르기만 했으면 미리보기
 * 최근에 한 순서로 돌려준다.
 */
export function programProgress(stops: JourneyStop[], snapshots: ProgramSnapshot[]): ProgramProgress[] {
  const keys = new Map<string, string>();
  for (const s of snapshots) keys.set(s.programKey, s.programTitle);
  for (const s of stops) if (s.programKey !== GENERAL_PRACTICE) keys.set(s.programKey, s.programTitle);

  const list: ProgramProgress[] = [];
  for (const [programKey, programTitle] of keys) {
    const mine = stops.filter((s) => s.programKey === programKey);
    const snap = snapshots.find((s) => s.programKey === programKey);
    const lastAnswerIdx = mine.findLastIndex((s) => s.type === "visited" || s.type === "rested");
    const visited = mine.some((s) => s.type === "visited");
    const practicedAfterAnswer = mine.slice(lastAnswerIdx + 1).some((s) => s.type === "practice");
    const done = visited || (lastAnswerIdx >= 0 && !practicedAfterAnswer);
    const step = mine.some((s) => s.type === "practice") ? 3 : mine.some((s) => s.type === "read") || snap?.timeline ? 2 : 1;
    const times = [...mine.map((s) => s.at.getTime()), ...(snap ? [snap.updatedAt.getTime()] : [])];
    const answeredAt = lastAnswerIdx >= 0 ? mine[lastAnswerIdx].at : null;
    list.push({
      programKey,
      programTitle,
      step,
      done,
      answer: done ? (visited ? "visited" : "rested") : null,
      lastAt: new Date(Math.max(...times)),
      answeredAt,
    });
  }
  return list.sort((a, b) => b.lastAt.getTime() - a.lastAt.getTime());
}

/**
 * 노선의 온기(0~1). 걸음을 내디딜수록 노란 노선이 주황으로 데워진다.
 * 작은 걸음 1, 연습 2, 다녀옴 6점. 18점이면 가장 따뜻하다. 쉬어감은 온기를 빼지 않는다.
 */
const HEAT_POINTS: Record<StopType, number> = { read: 1, inquiry: 1, practice: 2, visited: 6, rested: 0 };
const HEAT_FULL = 18;

export function heatAt(stops: JourneyStop[], index: number): number {
  const sum = stops.slice(0, index + 1).reduce((n, s) => n + HEAT_POINTS[s.type], 0);
  return Math.min(1, sum / HEAT_FULL);
}

/** 온기 값에 맞는 노선 색 (CSS color-mix) */
export function heatColor(t: number): string {
  return `color-mix(in oklab, var(--route), var(--glow) ${Math.round(t * 100)}%)`;
}
