// S1~S8 진행 표시. 서비스의 노선 은유를 그대로: 지나온 구간은 노란 노선, 지금 역은 굵은 테두리.
// 색만으로 구분하지 않도록 단계 이름을 글자로도 함께 보여준다.

export const FLOW_STEPS = ["공고", "걱정", "타임라인", "연습 전 마음", "연습 설정", "연습", "연습 후 마음", "결과"];

export function FlowProgress({ step }: { step: number }) {
  const total = FLOW_STEPS.length;
  const pct = (step / (total - 1)) * 100;
  return (
    <div className="px-5 pb-3">
      <div className="relative h-3" role="img" aria-label={`${total}단계 중 ${step + 1}단계: ${FLOW_STEPS[step]}`}>
        <span aria-hidden className="absolute inset-x-0 top-1/2 h-[3px] -translate-y-1/2 rounded-full bg-line" />
        <span
          aria-hidden
          className="absolute left-0 top-1/2 h-[3px] w-full origin-left -translate-y-1/2 rounded-full bg-route transition-transform duration-300 ease-[var(--ease-out)]"
          style={{ transform: `scaleX(${pct / 100})` }}
        />
        {FLOW_STEPS.map((_, i) => (
          <span
            key={i}
            aria-hidden
            className={`absolute top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full ${
              i === step ? "size-3 border-[2.5px] border-station bg-surface" : i < step ? "size-2 bg-route" : "size-2 bg-line"
            }`}
            style={{ left: `${(i / (total - 1)) * 100}%` }}
          />
        ))}
      </div>
      <p aria-hidden className="mt-1.5 text-[13px] text-ink-3">
        {step + 1}/{total} {FLOW_STEPS[step]}
      </p>
    </div>
  );
}
