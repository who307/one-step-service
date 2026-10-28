import { josa } from "@/lib/josa";
import { GENERAL_PRACTICE, type JourneyStop, type StopType } from "@/features/flow/FlowProvider";

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
