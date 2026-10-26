import type { Program, Recommendation, UserPreference } from "@/lib/types";
import { INTEREST_LABEL, MODE_LABEL } from "@/lib/labels";

// 예시 데이터 모드(NEXT_PUBLIC_USE_MOCK) 전용. 백엔드가 연결되면 /api/recommendations가 대신한다.
// 규칙 기반 정렬. 백엔드 RecommendationService와 같은 규칙을 쓴다.
// 합격·참여 가능성을 예측하지 않는다. 모르는 조건은 ‘부담 없음’으로 계산하지 않는다.

const BURDEN_LABEL: Record<Program["knownBurdens"][number], string> = {
  selection: "선발 있음",
  documents: "서류 필요",
  cost: "비용 있음",
  preTask: "사전 과제",
};

export function recommendLocally(programs: Program[], pref: UserPreference | null): Recommendation[] {
  return programs
    .map((program) => {
      let score = 0;
      const reasons: string[] = [];

      if (pref) {
        const interests = program.interests.filter((i) => pref.interests.includes(i));
        if (interests.length) {
          score += interests.length * 2;
          reasons.push(`관심: ${interests.map((i) => INTEREST_LABEL[i]).join(", ")}`);
        }
        const modes = program.modes.filter((m) => pref.modes.includes(m));
        if (modes.length) {
          score += modes.length * 2;
          reasons.push(`참여 방식: ${modes.map((m) => MODE_LABEL[m]).join(", ")}`);
        }
      }

      // 공식적으로 확인된 부담만 감점
      score -= program.knownBurdens.length;
      if (program.knownBurdens.length) {
        reasons.push(`확인된 부담: ${program.knownBurdens.map((b) => BURDEN_LABEL[b]).join(", ")}`);
      }

      const unknown = program.facts.filter((f) => f.status === "unconfirmed").length;
      if (unknown) reasons.push(`확인 필요 항목 ${unknown}개`);

      return { program, score, reasons };
    })
    .sort((a, b) => b.score - a.score);
}
