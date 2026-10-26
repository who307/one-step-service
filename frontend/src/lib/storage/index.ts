import type { JourneyStop, PracticeRecord, UserPreference } from "@/lib/types";

// 이 기기에만 남는 저장소 모음: 연습 기록(recordStore), 관심 조건(preferenceStore), 작성 중 기록(draftStore), 나의 노선(journeyStore).
// 전후 자기 응답은 이 기기에만 저장한다. AI·서버로 보내지 않는다(기획서 7-③).
// 브라우저 저장소가 막혀 있어도 화면이 깨지지 않도록 모든 접근을 try/catch로 감싼다.

const RECORDS_KEY = "onestep.records.v1";
const PREF_KEY = "onestep.preference.v1";
const DRAFT_KEY = "onestep.draft.v1";
const JOURNEY_KEY = "onestep.journey.v1";

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* 저장 실패해도 진행은 막지 않는다 */
  }
}

export const recordStore = {
  list: (): PracticeRecord[] => read<PracticeRecord[]>(RECORDS_KEY, []),
  add(record: PracticeRecord) {
    write(RECORDS_KEY, [record, ...recordStore.list()]);
  },
  remove(id: string) {
    write(RECORDS_KEY, recordStore.list().filter((r) => r.id !== id));
  },
  clear() {
    write(RECORDS_KEY, []);
  },
};

export const preferenceStore = {
  get: (): UserPreference | null => read<UserPreference | null>(PREF_KEY, null),
  set: (pref: UserPreference) => write(PREF_KEY, pref),
};

/** 연습 한 번이 끝날 때까지 들고 다니는 임시 기록 (사전 응답 → 연습 → 사후 응답) */
export const draftStore = {
  get: (): Partial<PracticeRecord> | null => read<Partial<PracticeRecord> | null>(DRAFT_KEY, null),
  set: (d: Partial<PracticeRecord>) => write(DRAFT_KEY, d),
  merge: (d: Partial<PracticeRecord>) => write(DRAFT_KEY, { ...draftStore.get(), ...d }),
  clear: () => {
    try {
      localStorage.removeItem(DRAFT_KEY);
    } catch {}
  },
};

/** 나의 노선. 오래된 역이 앞, 새 역이 뒤. */
export const journeyStore = {
  list: (): JourneyStop[] => read<JourneyStop[]>(JOURNEY_KEY, []),
  /**
   * 같은 공고의 같은 종류 역은 한 번만 남긴다(읽음·길 확인·문의·다녀옴).
   * 말 연습과 쉬어감은 여러 번 쌓일 수 있다.
   */
  add(stop: Omit<JourneyStop, "id" | "createdAt">) {
    const list = journeyStore.list();
    const once = stop.type === "read" || stop.type === "route" || stop.type === "inquiry" || stop.type === "visited";
    if (once && list.some((s) => s.type === stop.type && s.programId === stop.programId)) return;
    write(JOURNEY_KEY, [...list, { ...stop, id: crypto.randomUUID(), createdAt: new Date().toISOString() }]);
  },
  remove(id: string) {
    write(JOURNEY_KEY, journeyStore.list().filter((s) => s.id !== id));
  },
  clear: () => write(JOURNEY_KEY, []),
};
