import type { ProgramDetail, ProgramList, RecommendationList, RecommendationRequest } from "@/types/api";
import { CATEGORY_LABEL, MODE_LABEL } from "@/lib/labels";
import raw from "./programs.json";

// backend/src/main/resources/mock/programs.json 의 복사본. 둘을 같이 고친다.
// isSample: true 인 공고는 기관·장소·일정을 지어낸 예시다. 화면에 "예시"로 표시한다.

type RawProgram = Omit<ProgramDetail, "unknowns">;
const programs = raw as unknown as RawProgram[];

const summaryOf = (p: RawProgram) => ({
  id: p.id,
  title: p.title,
  organization: p.organization,
  category: p.category,
  modes: p.modes,
  summary: p.summary,
  applicationStart: p.applicationStart,
  applicationEnd: p.applicationEnd,
  location: p.location,
  isSample: p.isSample,
  locationSource: p.locationSource,
  closed: p.closed,
});

const UNKNOWN_FIELDS: [keyof RawProgram, string][] = [
  ["eligibility", "참여 대상"],
  ["activitySchedule", "활동 일정"],
  ["location", "장소"],
  ["supplies", "준비물"],
  ["contact", "문의처"],
];

function matches(p: RawProgram, req: RecommendationRequest) {
  if (req.category && p.category !== req.category) return false;
  if (req.mode && !p.modes.includes(req.mode)) return false;
  if (req.openOnly && p.closed) return false;
  const q = req.q?.trim().toLowerCase();
  if (q && ![p.title, p.organization, p.summary, p.location ?? ""].some((s) => s.toLowerCase().includes(q))) return false;
  return true;
}

export function mockListPrograms(req: RecommendationRequest): ProgramList {
  return { source: "MOCK", items: programs.filter((p) => matches(p, req)).map(summaryOf) };
}

export function mockRecommend(req: RecommendationRequest): RecommendationList {
  const items = programs
    .filter((p) => matches(p, req))
    .map((p) => {
      const reasons: string[] = [];
      if (req.category) reasons.push(`고른 활동 종류(${CATEGORY_LABEL[req.category]})예요`);
      if (req.mode) reasons.push(`${MODE_LABEL[req.mode]}로 참여하는 활동이에요`);
      if (req.q?.trim()) reasons.push(`‘${req.q.trim()}’ 검색어와 맞아요`);
      return { program: summaryOf(p), reasons };
    });
  return { source: "MOCK", items };
}

export function mockGetProgram(id: string): ProgramDetail | null {
  const p = programs.find((x) => x.id === id);
  if (!p) return null;
  return { ...p, unknowns: UNKNOWN_FIELDS.filter(([k]) => p[k] === null).map(([, label]) => label) };
}

export const SAMPLE_NOTICE = programs.find((p) => p.id === "sample-thursday-table")!.noticeText;
