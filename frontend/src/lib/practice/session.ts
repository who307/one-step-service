// AI 아바타 연습 세션 인터페이스.
// 화면(PracticeSessionView)은 이 인터페이스만 안다. 구현은 두 가지:
//   - MockPracticeSession: 지금. 미리 정한 대사로 흐름만 재현한다.
//   - LivePracticeSession: 나중. 백엔드 WebSocket(/ws/practice) ↔ Gemini Live 중계.
//     마이크 PCM 스트림을 올리고, 아바타 음성·자막을 받는다. API 키는 백엔드에만 둔다.

export type SessionState = "idle" | "connecting" | "listening" | "speaking" | "paused" | "ended";

export interface Caption {
  id: string;
  role: "avatar" | "user" | "system";
  text: string;
}

export interface PracticeSessionEvents {
  onState(state: SessionState): void;
  onCaption(caption: Caption): void;
}

export interface PracticeSession {
  start(): Promise<void>;
  pause(): void; // 듣기·음성 출력 모두 멈춤
  resume(): void; // 사용자가 직접 선택해야만 재개
  end(): void; // 오늘은 여기까지
  /** 말하기 어려울 때 글로 대신 보내기 */
  sendText(text: string): void;
  /** 화면을 떠날 때 정리. end()와 달리 상태 이벤트를 보내지 않는다. */
  dispose(): void;
}

export interface SessionOptions {
  programId: string;
  sceneId: string;
}

export function createPracticeSession(opts: SessionOptions, events: PracticeSessionEvents): PracticeSession {
  // TODO(live): USE_MOCK이 false면 LivePracticeSession을 돌려준다.
  return new MockPracticeSession(opts, events);
}

const MOCK_LINES: Record<string, string[]> = {
  "first-greeting": [
    "안녕하세요, 어서 오세요. 오늘 프로그램 참여하러 오셨어요?",
    "네, 반가워요. 성함 한 번만 말씀해 주시겠어요?",
    "고마워요. 천천히 하셔도 괜찮아요. 안쪽에 자리 있으니 편하게 앉으세요.",
  ],
  default: [
    "안녕하세요. 어떤 게 궁금하세요?",
    "네, 알려드릴게요. 천천히 말씀하셔도 돼요.",
    "잘 말씀해 주셨어요. 더 궁금한 게 있으면 언제든 물어보세요.",
  ],
};

let seq = 0;
const cid = () => `c${++seq}`;

class MockPracticeSession implements PracticeSession {
  private turn = 0;
  private state: SessionState = "idle";
  private timer: ReturnType<typeof setTimeout> | null = null;
  private lines: string[];

  constructor(opts: SessionOptions, private events: PracticeSessionEvents) {
    this.lines = MOCK_LINES[opts.sceneId] ?? MOCK_LINES.default;
  }

  private disposed = false;

  private set(state: SessionState) {
    if (this.disposed) return;
    this.state = state;
    this.events.onState(state);
  }

  private avatarSpeak() {
    const line = this.lines[Math.min(this.turn, this.lines.length - 1)];
    this.set("speaking");
    this.events.onCaption({ id: cid(), role: "avatar", text: line });
    this.timer = setTimeout(() => this.set("listening"), 1800);
  }

  async start() {
    this.set("connecting");
    this.timer = setTimeout(() => this.avatarSpeak(), 900);
  }

  pause() {
    if (this.timer) clearTimeout(this.timer);
    this.set("paused");
  }

  resume() {
    if (this.state !== "paused") return;
    this.set("listening");
  }

  end() {
    if (this.timer) clearTimeout(this.timer);
    this.set("ended");
  }

  dispose() {
    this.disposed = true;
    if (this.timer) clearTimeout(this.timer);
  }

  sendText(text: string) {
    if (this.state !== "listening") return;
    this.events.onCaption({ id: cid(), role: "user", text });
    this.turn += 1;
    this.timer = setTimeout(() => this.avatarSpeak(), 700);
  }
}
