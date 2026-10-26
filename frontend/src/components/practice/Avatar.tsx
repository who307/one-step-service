import type { SessionState } from "@/lib/practice/session";

// 연습 상대 아바타 자리. 실제 아바타(Live2D·영상 등)가 들어오면 이 컴포넌트만 교체한다.
// 상태는 움직임으로도 보이지만, 같은 내용을 글자(StateLabel)로도 항상 함께 보여준다.
export function Avatar({ state }: { state: SessionState }) {
  const listening = state === "listening";
  const speaking = state === "speaking";
  const resting = state === "paused" || state === "ended";

  return (
    <div className="relative mx-auto grid size-44 place-items-center" aria-hidden>
      {listening && (
        <span className="absolute inset-3 rounded-full border-4 border-route" style={{ animation: "ripple 2s var(--ease-out) infinite" }} />
      )}
      <svg viewBox="0 0 160 160" className="relative size-36" style={{ opacity: resting ? 0.65 : 1, transition: "opacity 300ms ease" }}>
        <circle cx="80" cy="80" r="66" fill="var(--route-soft)" stroke="var(--ink)" strokeWidth="4" />
        {/* 눈: 쉬는 중엔 감은 눈 */}
        {resting ? (
          <g stroke="var(--ink)" strokeWidth="4" strokeLinecap="round" fill="none">
            <path d="M54 76q7 5 14 0" />
            <path d="M92 76q7 5 14 0" />
          </g>
        ) : (
          <g fill="var(--ink)">
            <circle cx="61" cy="74" r="6" />
            <circle cx="99" cy="74" r="6" />
          </g>
        )}
        {/* 입: 기본은 옅은 미소, 말할 때만 열고 닫힘 */}
        {speaking ? (
          <ellipse cx="80" cy="102" rx="10" ry="6" fill="var(--ink)">
            <animate attributeName="ry" values="3;7;4;6;3" dur="0.9s" repeatCount="indefinite" />
          </ellipse>
        ) : (
          <path d="M68 99q12 10 24 0" fill="none" stroke="var(--ink)" strokeWidth="4" strokeLinecap="round" />
        )}
      </svg>
    </div>
  );
}

const LABEL: Record<SessionState, string> = {
  idle: "준비되면 시작해요",
  connecting: "연결하는 중…",
  listening: "듣고 있어요. 편하게 말해보세요",
  speaking: "연습 상대가 말하는 중",
  paused: "잠깐 쉬는 중이에요. 마이크와 소리가 꺼져 있어요",
  ended: "오늘 연습을 마쳤어요",
};

export function StateLabel({ state }: { state: SessionState }) {
  return (
    <p role="status" className="mt-2 text-center text-[16px] font-medium text-ink-2">
      {LABEL[state]}
    </p>
  );
}
