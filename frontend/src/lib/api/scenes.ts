import { mockScenes } from "@/mocks/scenes";
import type { Scene } from "@/lib/types";
import { http, USE_MOCK } from "./client";

export async function getScenes(): Promise<Scene[]> {
  if (USE_MOCK) return mockScenes;
  return http<Scene[]>("/scenes");
}

export async function getScene(id: string): Promise<Scene | null> {
  if (USE_MOCK) return mockScenes.find((s) => s.id === id) ?? null;
  return http<Scene>(`/scenes/${encodeURIComponent(id)}`);
}
