// 입력 검증과 위기 신호 규칙. 백엔드(common/NoticeValidator, CrisisDetector)와 같은 기준을 쓴다.
// 프론트에서 먼저 막는 이유: 예시 응답 모드에서도 같은 안전 동작을 보장하고, 위기 표현을 외부 AI로 보내지 않기 위해서다.

export const NOTICE_MIN = 100;
export const NOTICE_MAX = 4000;
export const MESSAGE_MAX = 300;

export function noticeLengthError(text: string): string | null {
  const n = text.trim().length;
  if (n === 0) return null;
  if (n < NOTICE_MIN) return `공고문을 ${NOTICE_MIN}자 이상 입력해 주세요. 지금 ${n}자예요.`;
  if (n > NOTICE_MAX) return `공고문은 ${NOTICE_MAX.toLocaleString()}자까지 넣을 수 있어요. ${(n - NOTICE_MAX).toLocaleString()}자를 줄여 주세요.`;
  return null;
}

const NOTICE_SIGNALS = [/모집/, /신청/, /접수/, /기간/, /일시|일자|일정/, /장소|모이는 곳/, /대상/, /참가|참여/, /프로그램/, /문의/, /준비물/];
const DATE_OR_TIME = /\d{4}[.\-/]\s?\d{1,2}|\d{1,2}\s?월\s?\d{1,2}\s?일|\d{1,2}:\d{2}/;

/** 공고문처럼 보이는지 대략 판단한다. 최종 판단은 서버가 한다. */
export function looksLikeNotice(text: string) {
  const signals = NOTICE_SIGNALS.filter((r) => r.test(text)).length + (DATE_OR_TIME.test(text) ? 1 : 0);
  return signals >= 3;
}

// 일반적인 긴장·불안("떨려요", "무서워요")은 여기에 넣지 않는다. 연습을 멈추게 할 만큼의 신호만.
const CRISIS_PATTERNS = [
  /죽고\s?싶/,
  /자살/,
  /자해/,
  /사라지고\s?싶/,
  /살기\s?싫/,
  /살고\s?싶지\s?않/,
  /(삶|인생)을?\s?끝내/,
  /목숨을?\s?끊/,
  /죽어\s?버리/,
  /없어지고\s?싶/,
];

export function hasCrisisSignal(text: string) {
  return CRISIS_PATTERNS.some((r) => r.test(text));
}
