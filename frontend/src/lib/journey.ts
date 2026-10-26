import { josa } from "@/lib/josa";
import type { JourneyStop, Program } from "@/lib/types";

// 나의 노선 규칙.
// - 작은 행동(공고 읽기, 길 확인)도 역으로 남긴다.
// - 못 간 것은 "쉬어감"으로 남기고 노선을 끊지 않는다.
// - 연속 기록·순위·재촉 알림은 만들지 않는다.

export function stopLabel(s: JourneyStop): string {
  switch (s.type) {
    case "read":
      return `${s.programTitle} 공고를 읽어봤어요`;
    case "route":
      return `${s.programTitle} 가는 길을 확인했어요`;
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
export function stopWeight(type: JourneyStop["type"]): "big" | "mid" | "small" {
  if (type === "visited") return "big";
  if (type === "practice") return "mid";
  return "small";
}

/**
 * 다녀왔는지 물어볼 공고: 연습한 적이 있고, 마지막 연습 뒤에 다녀옴·쉬어감 답이 없는 공고.
 * 가장 최근에 연습한 공고 하나만 돌려준다(한 번에 하나만 묻는다).
 */
export function pendingVisit(stops: JourneyStop[]): JourneyStop | null {
  for (let i = stops.length - 1; i >= 0; i--) {
    const s = stops[i];
    if (s.type !== "practice") continue;
    const answered = stops.slice(i + 1).some((t) => t.programId === s.programId && (t.type === "visited" || t.type === "rested"));
    const visitedBefore = stops.some((t) => t.programId === s.programId && t.type === "visited");
    return answered || visitedBefore ? null : s;
  }
  return null;
}

/**
 * 활동의 "넓이". 혼자·온라인에서 여럿이·직접 방문, 일경험 순으로 넓어진다.
 * 다음 역은 다녀온 곳과 같거나 한 칸 넓은 곳만 제안한다.
 */
export function breadth(p: Program): number {
  if (p.interests.includes("work")) return 4;
  const offline = p.modes.includes("offline");
  const group = p.modes.includes("group");
  if (offline && group) return 3;
  if (offline || group) return 2;
  return 1;
}

export function suggestNext(programs: Program[], stops: JourneyStop[], limit = 2): Program[] {
  const visitedIds = new Set(stops.filter((s) => s.type === "visited").map((s) => s.programId));
  if (visitedIds.size === 0) return [];
  const base = Math.max(...programs.filter((p) => visitedIds.has(p.id)).map(breadth), 1);
  return programs
    .filter((p) => !visitedIds.has(p.id))
    .filter((p) => breadth(p) === base || breadth(p) === base + 1)
    .sort((a, b) => breadth(a) - breadth(b))
    .slice(0, limit);
}

/** 활동 날짜 문구에서 첫 날짜(YYYY.MM.DD)를 꺼낸다. 못 읽으면 null. */
export function firstActivityDate(p: Program | undefined): Date | null {
  const v = p?.facts.find((f) => f.key === "activityDate")?.value;
  const m = v?.match(/(\d{4})\.(\d{1,2})\.(\d{1,2})/);
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : null;
}

/**
 * 노선의 온기(0~1). 걸음을 내디딜수록 노란 노선이 주황으로 데워진다.
 * 작은 걸음 1, 연습 2, 다녀옴 6점. 18점이면 가장 따뜻하다. 쉬어감은 온기를 빼지 않는다.
 */
const HEAT_POINTS: Record<JourneyStop["type"], number> = { read: 1, route: 1, inquiry: 1, practice: 2, visited: 6, rested: 0 };
const HEAT_FULL = 18;

export function heatAt(stops: JourneyStop[], index: number): number {
  const sum = stops.slice(0, index + 1).reduce((n, s) => n + HEAT_POINTS[s.type], 0);
  return Math.min(1, sum / HEAT_FULL);
}

/** 온기 값에 맞는 노선 색 (CSS color-mix) */
export function heatColor(t: number): string {
  return `color-mix(in oklab, var(--route), var(--glow) ${Math.round(t * 100)}%)`;
}
