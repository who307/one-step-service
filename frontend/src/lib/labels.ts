import type { Category, Level, Mode, Phase, SceneId } from "@/types/api";

export const CATEGORY_LABEL: Record<Category, string> = {
  DAILY: "일상 회복",
  COOKING: "요리·살림",
  WORK: "일경험",
  ART: "만들기·예술",
  EXERCISE: "걷기·운동",
  TALK: "대화·모임",
};

export const MODE_LABEL: Record<Mode, string> = {
  OFFLINE: "직접 방문",
  ONLINE: "온라인",
  GROUP: "여럿이 함께",
  SOLO: "혼자 하기",
};

export const PHASE_LABEL: Record<Phase, string> = {
  ARRIVE: "도착",
  CHECKIN: "접수",
  ACTIVITY: "활동",
  LEAVE: "귀가",
};

export const CONCERN_OPTIONS = [
  "처음 가는 장소라 긴장돼요",
  "다른 사람과 대화하기가 어려워요",
  "신청·접수 절차가 헷갈려요",
  "활동을 잘 해낼 수 있을지 걱정돼요",
];
export const MAX_CONCERNS = 3;

export const SCENES: { id: SceneId; title: string; description: string }[] = [
  { id: "CHECKIN", title: "접수할 때", description: "처음 인사하고 안내받기" },
  { id: "GREETING", title: "활동할 때", description: "처음 만난 참여자와 인사하기" },
  { id: "CLOSING", title: "마무리할 때", description: "소감 한마디 말하기" },
  { id: "FIRST_INQUIRY", title: "신청 전 문의할 때", description: "담당자에게 궁금한 점 묻기" },
];

export const LEVELS: { id: Level; title: string; description: string; maxTurns: number }[] = [
  { id: "L1", title: "지켜보기", description: "예시 대화를 보기만 해요", maxTurns: 6 },
  { id: "L2", title: "짧게 답하기", description: "선택지나 짧은 말로 답해요", maxTurns: 5 },
  { id: "L3", title: "자유 대화", description: "하고 싶은 말을 직접 입력해요", maxTurns: 8 },
];

export const sceneTitle = (id: SceneId) => SCENES.find((s) => s.id === id)?.title ?? "";
export const levelInfo = (id: Level) => LEVELS.find((l) => l.id === id)!;
