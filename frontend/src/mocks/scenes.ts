import type { Scene } from "@/lib/types";

// 범용 가상 연습 장면. 특정 공고의 실제 현장 절차를 재현하지 않는다.
export const mockScenes: Scene[] = [
  {
    id: "first-greeting",
    title: "도착해서 첫 인사",
    description: "접수처에서 이름을 말하고 인사하는 장면",
    starterLine: "안녕하세요, 오늘 프로그램 신청한 ○○○입니다.",
    worry: "firstWords",
  },
  {
    id: "ask-place",
    title: "장소를 못 찾을 때 묻기",
    description: "건물 안에서 교실 위치를 물어보는 장면",
    starterLine: "혹시 3층 성장교실이 어디인지 알 수 있을까요?",
    worry: "route",
  },
  {
    id: "ask-help",
    title: "잘 모를 때 도움 요청",
    description: "활동 중 이해가 안 되는 부분을 묻는 장면",
    starterLine: "죄송한데, 방금 말씀하신 부분을 한 번만 더 알려주실 수 있나요?",
    worry: "askHelp",
  },
  {
    id: "self-intro",
    title: "짧은 자기소개",
    description: "여러 사람 앞에서 이름과 한 마디를 말하는 장면",
    starterLine: "안녕하세요, ○○○이라고 합니다. 오늘 잘 부탁드려요.",
    worry: "crowd",
  },
];
