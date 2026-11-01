"use client";

import { Check } from "lucide-react";
import type { ReactNode } from "react";

export function ToggleChip({
  label,
  selected,
  onToggle,
  count,
}: {
  label: string;
  selected: boolean;
  onToggle: () => void;
  /** 고르면 맞는 공고 수 등. 0이면 흐리게 보이지만 고를 수는 있다 */
  count?: number;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onToggle}
      className={`press inline-flex min-h-11 items-center gap-1.5 rounded-full border-2 px-4 text-[15px] ${
        selected ? "border-ink bg-ink font-semibold text-paper" : "border-line bg-surface text-ink-2 hover:border-ink-3"
      }`}
    >
      {selected && <Check size={16} aria-hidden strokeWidth={2.6} />}
      {label}
      {count !== undefined && (
        <span className={`tabular-nums text-[13px] ${selected ? "text-surface-2" : count === 0 ? "text-ink-3/60" : "text-ink-3"}`}>
          {count}
          <span className="sr-only">개</span>
        </span>
      )}
    </button>
  );
}

export function Tag({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "sure" | "unsure" }) {
  const tones = {
    neutral: "bg-surface-2 text-ink-2",
    sure: "bg-sure-soft text-sure",
    unsure: "bg-unsure-soft text-unsure",
  };
  return <span className={`inline-flex items-center gap-1 rounded-sm px-2 py-0.5 text-[13px] font-medium ${tones[tone]}`}>{children}</span>;
}
