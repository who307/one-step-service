"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import type { ChatLine, CompleteResponse, Level, ProgramDetail, SceneId, Timeline } from "@/types/api";

// 사용자 데이터. 서버로 보내지 않고 이 브라우저의 localStorage에만 남겨, 새로고침해도 이어진다.
// 연습 대화 원문(practice)은 저장하지 않는다. 내 기록에는 요약만 남는다.

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

/** 나의 노선의 역 하나. 지나온 걸음을 남긴다. */
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

/** 내 기록의 연습 한 번. 연습 후 마음까지 마치면 남는다. */
export interface PracticeRecord {
  id: number;
  at: Date;
  sceneId: SceneId;
  level: Level;
  /** 공고 없이 연습했으면 null */
  programTitle: string | null;
  /** 연습한 공고의 키(역의 programKey와 같다). 공고 없이 연습했거나 예전 기록이면 없다. */
  programKey?: string;
  before: Mood | null;
  after: Mood | null;
  summary: string | null;
  endedEarly: boolean;
}

/** 준비하던 공고 하나를 다시 이어 갈 수 있도록 남겨 두는 값. 공고마다 마지막 상태 하나. */
export interface ProgramSnapshot {
  programKey: string;
  programTitle: string;
  program: ProgramDetail | null;
  noticeText: string;
  concerns: string[];
  timeline: Timeline | null;
  checked: Record<string, boolean>;
  updatedAt: Date;
}

/** 역·내 기록·이어 하기를 묶는 공고 키. 공고 id, 붙여넣은 공고문이면 타임라인 제목. */
export function programKeyOf(state: FlowState): string | null {
  return state.program?.id ?? state.timeline?.program.title ?? null;
}

const STORAGE_KEY = "onestep:flow:v1";

interface Saved {
  state: Omit<FlowState, "practice">;
  stops: (Omit<JourneyStop, "at"> & { at: string })[];
  records: (Omit<PracticeRecord, "at"> & { at: string })[];
  snapshots: (Omit<ProgramSnapshot, "updatedAt"> & { updatedAt: string })[];
}

function load(): Saved | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Saved) : null;
  } catch {
    return null;
  }
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
  /** 역 하나를 남긴다. 같은 공고·같은 종류(·같은 장면)의 역은 한 번만 남긴다(다녀옴·쉬어감은 매번, 연습은 답한 뒤 다시). */
  addStop: (stop: Omit<JourneyStop, "id" | "at">) => void;
  /** 내 기록. 나의 노선처럼 새 공고로 시작해도 이어진다. */
  records: PracticeRecord[];
  addRecord: (record: Omit<PracticeRecord, "id" | "at" | "programKey">) => void;
  /** 준비하던 공고들의 마지막 상태(이어서 하기). */
  snapshots: ProgramSnapshot[];
  /** 준비하던 공고 하나를 다시 지금 공고로 되살린다. 없으면 false. */
  resume: (programKey: string) => boolean;
  /** localStorage에서 불러오기를 마쳤는지. 그 전에는 앞 단계 데이터가 없다고 판단하지 않는다. */
  hydrated: boolean;
}

const FlowContext = createContext<FlowApi | null>(null);

export function FlowProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<FlowState>(initial);
  const [stops, setStops] = useState<JourneyStop[]>([]);
  const [snapshots, setSnapshots] = useState<ProgramSnapshot[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const update = useCallback((patch: Partial<FlowState>) => setState((s) => ({ ...s, ...patch })), []);
  const toggleCheck = useCallback((key: string) => setState((s) => ({ ...s, checked: { ...s.checked, [key]: !s.checked[key] } })), []);
  const reset = useCallback(() => setState(initial), []);
  const addStop = useCallback(
    (stop: Omit<JourneyStop, "id" | "at">) =>
      setStops((list) => {
        const repeatable = stop.type === "visited" || stop.type === "rested";
        // 쉬어감·다녀옴 답 뒤에 같은 공고를 다시 연습하면 새 역으로 남겨 다녀왔는지 다시 묻는다
        const lastAnswer = list.findLastIndex((s) => s.programKey === stop.programKey && (s.type === "visited" || s.type === "rested"));
        const since = stop.type === "practice" ? lastAnswer + 1 : 0;
        const dup = list.slice(since).some((s) => s.type === stop.type && s.programKey === stop.programKey && s.sceneTitle === stop.sceneTitle);
        if (dup && !repeatable) return list;
        return [...list, { ...stop, id: (list.at(-1)?.id ?? 0) + 1, at: new Date() }];
      }),
    [],
  );
  const [records, setRecords] = useState<PracticeRecord[]>([]);
  const currentKey = programKeyOf(state);
  const addRecord = useCallback(
    (record: Omit<PracticeRecord, "id" | "at" | "programKey">) =>
      setRecords((list) => [
        ...list,
        { ...record, ...(record.programTitle !== null && currentKey ? { programKey: currentKey } : {}), id: (list.at(-1)?.id ?? 0) + 1, at: new Date() },
      ]),
    [currentKey],
  );

  const resume = useCallback(
    (programKey: string) => {
      const snap = snapshots.find((s) => s.programKey === programKey);
      if (!snap) return false;
      setState({ ...initial, program: snap.program, noticeText: snap.noticeText, concerns: snap.concerns, timeline: snap.timeline, checked: snap.checked });
      return true;
    },
    [snapshots],
  );

  // 처음 한 번 저장된 기록을 불러온다. 서버 렌더와 맞추려고 마운트 뒤에 읽는다.
  useEffect(() => {
    const saved = load();
    if (saved) {
      setState({ ...initial, ...saved.state });
      setStops(saved.stops.map((s) => ({ ...s, at: new Date(s.at) })));
      setRecords(saved.records.map((r) => ({ ...r, at: new Date(r.at) })));
      setSnapshots(saved.snapshots.map((s) => ({ ...s, updatedAt: new Date(s.updatedAt) })));
    }
    setHydrated(true);
  }, []);

  // 지금 준비하는 공고의 마지막 상태를 남긴다(공고를 고른 뒤부터)
  const { program, noticeText, concerns, timeline, checked } = state;
  useEffect(() => {
    if (!hydrated || !currentKey) return;
    const body = { program, noticeText, concerns, timeline, checked };
    const sig = JSON.stringify(body);
    const snap: ProgramSnapshot = {
      programKey: currentKey,
      programTitle: program?.title ?? timeline?.program.title ?? currentKey,
      program,
      noticeText,
      concerns,
      timeline,
      checked,
      updatedAt: new Date(),
    };
    setSnapshots((list) => {
      // 불러오기 직후처럼 내용이 그대로면 고친 시각을 바꾸지 않는다(최근 순서가 흔들리지 않게)
      const prev = list.find((s) => s.programKey === currentKey);
      if (prev && JSON.stringify({ program: prev.program, noticeText: prev.noticeText, concerns: prev.concerns, timeline: prev.timeline, checked: prev.checked }) === sig) return list;
      return [...list.filter((s) => s.programKey !== currentKey), snap];
    });
  }, [hydrated, currentKey, program, noticeText, concerns, timeline, checked]);

  useEffect(() => {
    if (!hydrated) return;
    // 연습 대화 원문(practice)은 남기지 않는다
    const { practice: _practice, ...rest } = state;
    void _practice;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ state: rest, stops, records, snapshots }));
    } catch {
      // 저장소를 쓸 수 없으면(사생활 보호 창 등) 이번 이용 동안 메모리로만 쓴다
    }
  }, [hydrated, state, stops, records, snapshots]);

  const value = useMemo(
    () => ({ state, update, toggleCheck, reset, stops, addStop, records, addRecord, snapshots, resume, hydrated }),
    [state, update, toggleCheck, reset, stops, addStop, records, addRecord, snapshots, resume, hydrated],
  );
  return <FlowContext.Provider value={value}>{children}</FlowContext.Provider>;
}

export function useFlow() {
  const ctx = useContext(FlowContext);
  if (!ctx) throw new Error("useFlow must be used inside FlowProvider");
  return ctx;
}

/**
 * 앞 단계 데이터가 없으면(주소로 바로 들어왔거나 연습 중 새로고침) 시작 화면으로 돌려보낸다.
 * 저장된 기록을 불러오기 전에는 돌려보내지 않는다.
 * 돌려보내는 동안에는 false를 돌려줘 빈 화면이 잠깐 그려지지 않게 한다.
 */
export function useRequire(ok: boolean, to = "/") {
  const router = useRouter();
  const { hydrated } = useFlow();
  useEffect(() => {
    if (hydrated && !ok) router.replace(to);
  }, [hydrated, ok, router, to]);
  return hydrated && ok;
}
