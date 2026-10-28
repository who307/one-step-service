export function SimulationProgress({ turn, max, label }: { turn: number; max: number; label: string }) {
  return (
    <div className="flex items-center gap-3 text-[13px] text-ink-3">
      <span className="shrink-0 tabular-nums">
        {label} {turn}/{max}
      </span>
      <span aria-hidden className="relative h-1 flex-1 overflow-hidden rounded-full bg-line">
        <span
          className="absolute inset-0 origin-left rounded-full bg-route transition-transform duration-300 ease-[var(--ease-out)]"
          style={{ transform: `scaleX(${Math.min(turn / max, 1)})` }}
        />
      </span>
    </div>
  );
}
