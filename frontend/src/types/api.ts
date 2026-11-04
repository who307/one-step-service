// docs/API.md 와 1:1로 맞춘다. 계약을 바꾸면 두 곳을 같이 고친다.

export type Category = "DAILY" | "COOKING" | "WORK" | "ART" | "EXERCISE" | "TALK";
export type Mode = "OFFLINE" | "ONLINE" | "GROUP" | "SOLO";
export type Phase = "ARRIVE" | "CHECKIN" | "ACTIVITY" | "LEAVE";
export type Label = "CONFIRMED" | "SIMULATED";
export type SceneId = "FIRST_INQUIRY" | "CHECKIN" | "GREETING" | "CLOSING";
export type Level = "L1" | "L2" | "L3";
export type Source = "MOCK" | "ONTONG" | "OPENAI";

export type ErrorCode =
  | "INVALID_LENGTH"
  | "INVALID_REQUEST"
  | "NOT_A_NOTICE"
  | "NOT_FOUND"
  | "INVALID_STATE"
  | "RATE_LIMITED"
  | "LLM_ERROR"
  | "LLM_TIMEOUT"
  | "INTERNAL_ERROR"
  | "NETWORK_ERROR";

export interface ProgramSummary {
  id: string;
  title: string;
  organization: string;
  category: Category;
  modes: Mode[];
  summary: string;
  applicationStart: string | null;
  applicationEnd: string | null;
  location: string | null;
  isSample: boolean;
  /** NOTICE: 공고 원문에서 찾음 · ESTIMATED: 원문에 없어 추정(화면에 "추정") */
  locationSource: FactSource | null;
  /** 신청·사업 기간이 끝나 지금은 신청할 수 없음 */
  closed: boolean;
}

export type FactSource = "NOTICE" | "ESTIMATED";

export interface ProgramDetail extends ProgramSummary {
  eligibility: string | null;
  activitySchedule: string | null;
  supplies: string | null;
  contact: string | null;
  applicationUrl: string | null;
  sourceUrl: string | null;
  noticeText: string;
  unknowns: string[];
  suppliesSource: FactSource | null;
}

export interface ProgramList {
  source: Source;
  items: ProgramSummary[];
}

export type ProgramSort = "RECOMMENDED" | "DEADLINE" | "LATEST";

export interface RecommendationRequest {
  /** 예전 단일 선택. categories에 더해진다 */
  category?: Category;
  /** 예전 단일 선택. modes에 더해진다 */
  mode?: Mode;
  /** 같은 묶음 안은 하나만 맞아도 되고(OR), 묶음끼리는 모두 맞아야 한다(AND) */
  categories?: Category[];
  modes?: Mode[];
  /** 띄어 쓴 단어가 모두 들어 있어야 한다. 공백은 무시하고 비교한다 */
  q?: string;
  /** true면 신청이 끝난 공고를 뺀다 */
  openOnly?: boolean;
  sort?: ProgramSort;
  offset?: number;
  /** 비우면 전체 */
  limit?: number;
}

export interface RecommendationList {
  source: Source;
  items: { program: ProgramSummary; reasons: string[] }[];
  /** 조건에 맞는 전체 수(items는 그중 offset~limit) */
  total: number;
  /** 칩 옆 숫자: 그 묶음의 선택만 빼고 나머지 조건을 적용했을 때 그 칩에 맞는 공고 수 */
  categoryCounts: Record<Category, number>;
  modeCounts: Record<Mode, number>;
}

export interface TimelineRequest {
  noticeText: string;
  concerns: string[];
  programId?: string;
}

export interface TimelineStep {
  phase: Phase;
  title: string;
  description: string;
  time: string | null;
  place: string | null;
  label: Label;
  sourceQuote: string | null;
}

export interface ChecklistItem {
  item: string;
  label: Label;
  sourceQuote: string | null;
}

export interface Timeline {
  isNotice: boolean;
  source: Source;
  program: { title: string; organization: string | null };
  steps: TimelineStep[];
  checklist: ChecklistItem[];
  unknowns: string[];
  tips: string[];
}

export interface ChatLine {
  role: "AI" | "USER";
  text: string;
}

export interface AiTurn {
  text: string;
  choices: string[] | null;
}

export interface SimulationStartRequest {
  sceneId: SceneId;
  level: Level;
  programTitle: string;
  concerns: string[];
}

export interface SimulationStart {
  simulationId: string;
  source: Source;
  maxTurns: number;
  disclaimer: string;
  opening: AiTurn;
  script: ChatLine[] | null;
}

export interface MessageRequest {
  sceneId: SceneId;
  level: Level;
  programTitle: string;
  history: ChatLine[];
  userText: string;
}

export interface MessageResponse {
  crisis: boolean;
  reply: AiTurn | null;
  alternatives: string[];
  turn: number;
  finished: boolean;
}

export interface CompleteRequest {
  sceneId: SceneId;
  level: Level;
  programTitle: string;
  history: ChatLine[];
}

export interface CompleteResponse {
  summary: string;
  nextPhrases: string[];
}

export interface InquiryRequest {
  programTitle: string;
  organization?: string | null;
  questions: string[];
  userNote?: string;
}

export interface InquiryResponse {
  text: string;
}
/** 로컬 개발용 아바타 방 접속 정보. 토큰은 짧게 유효하며 화면에 표시하지 않는다. */
export type AvatarConnection = { url: string; token: string };
