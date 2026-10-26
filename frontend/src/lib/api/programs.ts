import { mockPrograms } from "@/mocks/programs";
import type { Program, Recommendation, UserPreference } from "@/lib/types";
import { http, USE_MOCK } from "./client";
import { recommendLocally } from "@/mocks/recommend";

// 온통청년 API는 브라우저에서 직접 부르지 않는다(키 노출·CORS).
// 백엔드 YouthCenterClient가 받아 정규화한 뒤 /api/programs 로 내려준다.

export async function getPrograms(): Promise<Program[]> {
  if (USE_MOCK) return mockPrograms;
  return http<Program[]>("/programs");
}

export async function getProgram(id: string): Promise<Program | null> {
  if (USE_MOCK) return mockPrograms.find((p) => p.id === id) ?? null;
  return http<Program>(`/programs/${encodeURIComponent(id)}`);
}

export async function getRecommendations(pref: UserPreference | null): Promise<Recommendation[]> {
  if (USE_MOCK) return recommendLocally(mockPrograms, pref);
  return http<Recommendation[]>("/recommendations", {
    method: "POST",
    body: JSON.stringify(pref ?? { interests: [], modes: [], worries: [] }),
  });
}
