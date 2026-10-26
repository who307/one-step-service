import type { CheckItem, Interest, ParticipationMode, Worry } from "@/lib/types";

/** 지어낸 예시 공고에 "예시" 태그를 붙일지. 발표·시연에서는 켜 둔다. */
export const SHOW_SAMPLE_TAG = true;

export const INTEREST_LABEL: Record<Interest, string> = {
  daily: "일상 회복",
  cooking: "요리·살림",
  work: "일경험",
  art: "만들기·예술",
  exercise: "걷기·운동",
  talk: "대화·모임",
};

export const MODE_LABEL: Record<ParticipationMode, string> = {
  offline: "직접 방문",
  online: "온라인",
  solo: "혼자 하기",
  group: "여럿이 함께",
};

export const WORRY_LABEL: Record<Worry, string> = {
  route: "가는 길",
  firstWords: "첫마디",
  crowd: "사람 많은 곳",
  supplies: "준비물",
  schedule: "당일 흐름",
  askHelp: "도움 요청",
};

export const CHECK_ITEMS: CheckItem[] = [
  { key: "anxiety", label: "불안", question: "지금 얼마나 불안하게 느껴지나요?", direction: "higherIsHeavier" },
  { key: "lethargy", label: "무기력", question: "지금 얼마나 기운이 없게 느껴지나요?", direction: "higherIsHeavier" },
  { key: "depression", label: "우울감", question: "지금 마음이 얼마나 가라앉아 있나요?", direction: "higherIsHeavier" },
  { key: "isolation", label: "고립감", question: "지금 얼마나 혼자라고 느껴지나요?", direction: "higherIsHeavier" },
  { key: "selfEsteem", label: "자존감", question: "지금 나 자신을 얼마나 괜찮게 느끼나요?", direction: "higherIsLighter" },
];
