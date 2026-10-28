// 고정 캐릭터 연습 상대. 실시간 영상 생성은 쓰지 않는다(Architecture §5.3).
// 상태는 움직임으로도 보이지만, 같은 내용을 글자(StateLabel)로도 항상 함께 보여준다.

export type AvatarState = "idle" | "thinking" | "listening" | "speaking" | "ended";

export function Avatar({ state, size = "md" }: { state: AvatarState; size?: "sm" | "md" }) {
  const listening = state === "listening";
  const speaking = state === "speaking";
  const resting = state === "ended";
  const box = size === "sm" ? "size-24" : "size-36";

  return (
    <div className={`relative mx-auto grid place-items-center ${box}`} aria-hidden>
      {listening && (
        <span className="absolute inset-1 rounded-full border-4 border-route" style={{ animation: "ripple 2s var(--ease-out) infinite" }} />
      )}
      <svg viewBox="0 0 160 160" className="relative size-[85%]" style={{ opacity: resting ? 0.65 : 1, transition: "opacity 300ms ease" }}>
        <circle cx="80" cy="80" r="66" fill="var(--route-soft)" stroke="var(--ink)" strokeWidth="4" />
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
        {speaking ? (
          <ellipse cx="80" cy="102" rx="10" ry="6" fill="var(--ink)">
            <animate attributeName="ry" values="3;7;4;6;3" dur="0.9s" repeatCount="indefinite" />
          </ellipse>
        ) : state === "thinking" ? (
          <path d="M70 102h20" fill="none" stroke="var(--ink)" strokeWidth="4" strokeLinecap="round" />
        ) : (
          <path d="M68 99q12 10 24 0" fill="none" stroke="var(--ink)" strokeWidth="4" strokeLinecap="round" />
        )}
      </svg>
    </div>
  );
}

const LABEL: Record<AvatarState, string> = {
  idle: "내 차례예요. 천천히 답해도 괜찮아요",
  thinking: "연습 상대가 생각하는 중…",
  listening: "듣고 있어요. 편하게 말해 보세요",
  speaking: "연습 상대가 말하는 중",
  ended: "연습을 마쳤어요",
};

export function StateLabel({ state }: { state: AvatarState }) {
  return (
    <p role="status" className="text-center text-[14px] font-medium text-ink-2">
      {LABEL[state]}
    </p>
  );
}
