// 백엔드 DTO와 1:1로 맞춘다. (backend/.../dto 참고)

/** 공식 근거가 있는 항목인지, 아직 확인하지 못한 항목인지 */
export type FactStatus = "confirmed" | "unconfirmed";

export interface ProgramFact {
  key: "applyPeriod" | "activityDate" | "place" | "target" | "selection" | "cost" | "supplies" | "schedule";
  label: string;
  value: string | null; // unconfirmed면 null
  status: FactStatus;
  note?: string;
}

export type ParticipationMode = "offline" | "online" | "solo" | "group";
export type Interest = "daily" | "cooking" | "work" | "art" | "exercise" | "talk";
export type Worry = "route" | "firstWords" | "crowd" | "supplies" | "schedule" | "askHelp";

export interface Program {
  id: string;
  /** 화면 확인용으로 지어낸 공고. 화면에 "예시"로 표시한다. */
  sample?: boolean;
  title: string;
  organization: string;
  summary: string;
  interests: Interest[];
  modes: ParticipationMode[];
  /** 공식적으로 확인된 부담 요소. 모르는 항목은 넣지 않는다(‘부담 없음’으로 계산하지 않기 위해). */
  knownBurdens: ("selection" | "documents" | "cost" | "preTask")[];
  facts: ProgramFact[];
  location: { name: string; address: string; lat: number; lng: number } | null;
  sourceUrl: string;
  sourceCheckedAt: string; // YYYY-MM-DD
  applyUrl: string | null;
  /** 데이터 출처. 온통청년 API 연동 후 "youthcenter"가 추가된다. */
  source: "manual" | "youthcenter";
}

export interface UserPreference {
  interests: Interest[];
  modes: ParticipationMode[];
  worries: Worry[];
}

export interface Recommendation {
  program: Program;
  score: number;
  reasons: string[];
}

export interface Scene {
  id: string;
  title: string;
  description: string;
  starterLine: string; // 막힐 때 보여줄 예시 한 문장
  worry: Worry;
}

// ── 전후 자기 응답 ─────────────────────────────

export type CheckItemKey = "anxiety" | "lethargy" | "depression" | "isolation" | "selfEsteem";

export interface CheckItem {
  key: CheckItemKey;
  label: string;
  question: string;
  /** higherIsHeavier: 높을수록 부담이 큰 방향. 자존감만 반대. */
  direction: "higherIsHeavier" | "higherIsLighter";
}

/** 응답하지 않은 문항은 null. 0점으로 바꾸지 않는다. */
export type CheckScores = Record<CheckItemKey, number | null>;

// ── 나의 노선 ─────────────────────────────

/**
 * 노선 위의 역 하나. 작은 행동도 한 걸음으로 남긴다.
 * read: 공고 읽음 / route: 길 확인 / inquiry: 문의 문장 준비 / practice: 말 연습
 * visited: 다녀옴 / rested: 이번엔 쉬어감(실패로 그리지 않는다)
 */
export type StopType = "read" | "route" | "inquiry" | "practice" | "visited" | "rested";

export interface JourneyStop {
  id: string;
  type: StopType;
  createdAt: string;
  programId: string;
  programTitle: string;
  sceneTitle?: string;
}

export interface PracticeRecord {
  id: string;
  createdAt: string;
  programId: string;
  programTitle: string;
  sceneId: string;
  sceneTitle: string;
  before: CheckScores | null;
  after: CheckScores | null;
  endedBy: "user" | "completed";
}
