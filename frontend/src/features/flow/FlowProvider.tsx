"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import type { ChatLine, CompleteResponse, Level, ProgramDetail, SceneId, Timeline } from "@/types/api";

// 한 번 이용하는 동안의 모든 사용자 데이터. React 메모리에만 있고
// localStorage·sessionStorage·쿠키·서버 어디에도 남기지 않는다(Architecture §4.1).
// 새로고침하거나 탭을 닫으면 처음 상태로 돌아간다.

/** 0~10 자기 보고. 응답하지 않은 문항은 null이고 0으로 바꾸지 않는다. */
export interface Mood {
  anxiety: number | null;
  intent: number | null;
}

export interface Practice {
  sceneId: SceneId;
  level: Level;
  history: ChatLine[];
  result: CompleteResponse | null;
  endedEarly: boolean;
}

export interface FlowState {
  program: ProgramDetail | null;
  noticeText: string;
  concerns: string[];
  timeline: Timeline | null;
  before: Mood | null;
  after: Mood | null;
  sceneId: SceneId | null;
  level: Level | null;
  practice: Practice | null;
  practiceCount: number;
  /** 체크리스트·미션에서 직접 체크한 항목 */
  checked: Record<string, boolean>;
  /** 실제 서버 대신 예시 응답을 쓴 적이 있는지. 결과 화면에서 다시 알린다. */
  usedMock: boolean;
}

/** 나의 노선의 역 하나. 지나온 걸음을 남긴다. 이것도 메모리에만 있다. */
export type StopType = "read" | "practice" | "inquiry" | "visited" | "rested";

export interface JourneyStop {
  id: number;
  type: StopType;
  at: Date;
  /** 같은 공고를 묶는 키(공고 id, 붙여넣은 공고문이면 제목) */
  programKey: string;
  programTitle: string;
  sceneTitle?: string;
}

/** 공고 없이 하는 말 연습의 역 키. 다녀왔는지 묻지 않는다. */
export const GENERAL_PRACTICE = "";

/** 내 기록의 연습 한 번. 연습 후 마음까지 마치면 남는다. 메모리에만 있다. */
export interface PracticeRecord {
  id: number;
  at: Date;
  sceneId: SceneId;
  level: Level;
  /** 공고 없이 연습했으면 null */
  programTitle: string | null;
  before: Mood | null;
  after: Mood | null;
  summary: string | null;
  endedEarly: boolean;
}

const initial: FlowState = {
  program: null,
  noticeText: "",
  concerns: [],
  timeline: null,
  before: null,
  after: null,
  sceneId: null,
  level: null,
  practice: null,
  practiceCount: 0,
  checked: {},
  usedMock: false,
};

interface FlowApi {
  state: FlowState;
  update: (patch: Partial<FlowState>) => void;
  toggleCheck: (key: string) => void;
  /** 새 공고로 처음부터. 화면 모드 같은 설정과 나의 노선은 건드리지 않는다. */
  reset: () => void;
  /** 나의 노선. 새 공고로 처음부터 시작해도 이어지고, 새로고침하면 지워진다. */
  stops: JourneyStop[];
  /** 역 하나를 남긴다. 같은 공고·같은 종류(·같은 장면)의 역은 한 번만 남긴다(다녀옴·쉬어감은 매번). */
  addStop: (stop: Omit<JourneyStop, "id" | "at">) => void;
  /** 내 기록. 나의 노선처럼 새 공고로 시작해도 이어지고, 새로고침하면 지워진다. */
  records: PracticeRecord[];
  addRecord: (record: Omit<PracticeRecord, "id" | "at">) => void;
}

const FlowContext = createContext<FlowApi | null>(null);

export function FlowProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<FlowState>(initial);
  const [stops, setStops] = useState<JourneyStop[]>([]);
  const update = useCallback((patch: Partial<FlowState>) => setState((s) => ({ ...s, ...patch })), []);
  const toggleCheck = useCallback((key: string) => setState((s) => ({ ...s, checked: { ...s.checked, [key]: !s.checked[key] } })), []);
  const reset = useCallback(() => setState(initial), []);
  const addStop = useCallback(
    (stop: Omit<JourneyStop, "id" | "at">) =>
      setStops((list) => {
        const repeatable = stop.type === "visited" || stop.type === "rested";
        const dup = list.some((s) => s.type === stop.type && s.programKey === stop.programKey && s.sceneTitle === stop.sceneTitle);
        if (dup && !repeatable) return list;
        return [...list, { ...stop, id: (list.at(-1)?.id ?? 0) + 1, at: new Date() }];
      }),
    [],
  );
  const [records, setRecords] = useState<PracticeRecord[]>([]);
  const addRecord = useCallback(
    (record: Omit<PracticeRecord, "id" | "at">) =>
      setRecords((list) => [...list, { ...record, id: (list.at(-1)?.id ?? 0) + 1, at: new Date() }]),
    [],
  );
  const value = useMemo(
    () => ({ state, update, toggleCheck, reset, stops, addStop, records, addRecord }),
    [state, update, toggleCheck, reset, stops, addStop, records, addRecord],
  );
  return <FlowContext.Provider value={value}>{children}</FlowContext.Provider>;
}

export function useFlow() {
  const ctx = useContext(FlowContext);
  if (!ctx) throw new Error("useFlow must be used inside FlowProvider");
  return ctx;
}

/**
 * 앞 단계 데이터가 없으면(주소로 바로 들어왔거나 새로고침) 시작 화면으로 돌려보낸다.
 * 돌려보내는 동안에는 false를 돌려줘 빈 화면이 잠깐 그려지지 않게 한다.
 */
export function useRequire(ok: boolean, to = "/") {
  const router = useRouter();
  useEffect(() => {
    if (!ok) router.replace(to);
  }, [ok, router, to]);
  return ok;
}
