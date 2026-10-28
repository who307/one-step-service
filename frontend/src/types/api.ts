// docs/API.md 와 1:1로 맞춘다. 계약을 바꾸면 두 곳을 같이 고친다.

export type Category = "DAILY" | "COOKING" | "WORK" | "ART" | "EXERCISE" | "TALK";
export type Mode = "OFFLINE" | "ONLINE" | "GROUP" | "SOLO";
export type Phase = "ARRIVE" | "CHECKIN" | "ACTIVITY" | "LEAVE";
export type Label = "CONFIRMED" | "SIMULATED";
export type SceneId = "FIRST_INQUIRY" | "CHECKIN" | "GREETING" | "CLOSING";
export type Level = "L1" | "L2" | "L3";
export type Source = "MOCK" | "ONTONG" | "GEMINI";

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

export interface RecommendationRequest {
  category?: Category;
  mode?: Mode;
  q?: string;
  /** true면 신청이 끝난 공고를 뺀다 */
  openOnly?: boolean;
}

export interface RecommendationList {
  source: Source;
  items: { program: ProgramSummary; reasons: string[] }[];
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
