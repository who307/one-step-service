import type { Category, Mode, ProgramDetail, ProgramList, ProgramSort, RecommendationList, RecommendationRequest } from "@/types/api";
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

const SPACES = /\s+/g;
const normalize = (t: string) => t.toLowerCase().replace(SPACES, "");
const tokens = (q?: string) => (q?.trim() ? q.trim().split(SPACES).map(normalize).filter(Boolean) : []);
const searchKey = (p: RawProgram) => normalize([p.title, p.organization, p.summary, p.location ?? "", p.eligibility ?? ""].join("\u0000"));

function matches(p: RawProgram, req: RecommendationRequest) {
  if (req.category && p.category !== req.category) return false;
  if (req.mode && !p.modes.includes(req.mode)) return false;
  const key = searchKey(p);
  return tokens(req.q).every((t) => key.includes(t));
}

export function mockListPrograms(req: RecommendationRequest): ProgramList {
  return { source: "MOCK", items: programs.filter((p) => matches(p, req)).map(summaryOf) };
}

// 백엔드 ProgramService.recommend 와 같은 규칙(둘을 같이 고친다)
const byDate = (a: string | null, b: string | null, dir: 1 | -1) => (a === b ? 0 : a === null ? 1 : b === null ? -1 : a < b ? -dir : dir);
const SORTS: Record<ProgramSort, (a: RawProgram, b: RawProgram) => number> = {
  RECOMMENDED: () => 0,
  DEADLINE: (a, b) => byDate(a.applicationEnd, b.applicationEnd, 1),
  LATEST: (a, b) => byDate(a.applicationStart, b.applicationStart, -1),
};

export function mockRecommend(req: RecommendationRequest): RecommendationList {
  const categories = new Set([...(req.categories ?? []), ...(req.category ? [req.category] : [])]);
  const modes = new Set([...(req.modes ?? []), ...(req.mode ? [req.mode] : [])]);
  const words = tokens(req.q);
  const base = programs.filter((p) => !(req.openOnly && p.closed) && words.every((t) => searchKey(p).includes(t)));

  const categoryCounts = Object.fromEntries(Object.keys(CATEGORY_LABEL).map((c) => [c, 0])) as Record<Category, number>;
  const modeCounts = Object.fromEntries(Object.keys(MODE_LABEL).map((m) => [m, 0])) as Record<Mode, number>;
  const matched: RawProgram[] = [];
  for (const p of base) {
    const categoryOk = categories.size === 0 || categories.has(p.category);
    const modeOk = modes.size === 0 || p.modes.some((m) => modes.has(m));
    if (modeOk) categoryCounts[p.category]++;
    if (categoryOk) p.modes.forEach((m) => modeCounts[m]++);
    if (categoryOk && modeOk) matched.push(p);
  }

  const sort = SORTS[req.sort ?? "RECOMMENDED"];
  matched.sort((a, b) => Number(a.closed) - Number(b.closed) || sort(a, b));
  const from = Math.min(req.offset ?? 0, matched.length);
  const to = req.limit == null ? matched.length : Math.min(from + req.limit, matched.length);
  const items = matched.slice(from, to).map((p) => {
    const reasons: string[] = [];
    if (categories.has(p.category)) reasons.push(`고른 활동 종류(${CATEGORY_LABEL[p.category]})예요`);
    for (const m of p.modes) if (modes.has(m)) reasons.push(`${MODE_LABEL[m]}로 참여하는 활동이에요`);
    if (words.length) reasons.push("검색어와 관련된 내용이 있어요");
    return { program: summaryOf(p), reasons };
  });
  return { source: "MOCK", items, total: matched.length, categoryCounts, modeCounts };
}

export function mockGetProgram(id: string): ProgramDetail | null {
  const p = programs.find((x) => x.id === id);
  if (!p) return null;
  return { ...p, unknowns: UNKNOWN_FIELDS.filter(([k]) => p[k] === null).map(([, label]) => label) };
}

export const SAMPLE_NOTICE = programs.find((p) => p.id === "sample-thursday-table")!.noticeText;
