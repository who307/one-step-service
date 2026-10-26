"use client";

import { Check } from "lucide-react";
import type { ReactNode } from "react";

export function ToggleChip({
  label,
  selected,
  onToggle,
}: {
  label: string;
  selected: boolean;
  onToggle: () => void;
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
