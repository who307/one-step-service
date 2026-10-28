"use client";

import { Check } from "lucide-react";
import { useFlow } from "@/features/flow/FlowProvider";
import type { ChecklistItem } from "@/types/api";
import { SourceLabel } from "./TimelineView";

// 준비물 체크리스트. 체크 상태는 이번 이용 중에만 기억한다(S3에서 체크하면 S8에서도 보인다).
export function Checklist({ items, showLabel = true }: { items: ChecklistItem[]; showLabel?: boolean }) {
  const { state, toggleCheck } = useFlow();
  return (
    <ul className="divide-y divide-line border-y border-line">
      {items.map((c) => {
        const key = `supply:${c.item}`;
        const on = !!state.checked[key];
        return (
          <li key={c.item}>
            <label className="flex min-h-13 cursor-pointer items-center gap-3 py-2">
              <input type="checkbox" checked={on} onChange={() => toggleCheck(key)} className="peer sr-only" />
              <span
                aria-hidden
                className={`grid size-6 shrink-0 place-items-center rounded-sm border-2 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[var(--focus)] ${
                  on ? "border-ink bg-ink text-paper" : "border-line bg-surface"
                }`}
              >
                {on && <Check size={16} strokeWidth={3} />}
              </span>
              <span className={`flex-1 text-[15px] ${on ? "text-ink-3 line-through" : ""}`}>{c.item}</span>
              {showLabel && <SourceLabel label={c.label} />}
            </label>
          </li>
        );
      })}
    </ul>
  );
}
