"use client";

import { useId, useState } from "react";
import { Button } from "@/components/ui/Button";
import { CHECK_ITEMS } from "@/lib/labels";
import type { CheckItem, CheckScores } from "@/lib/types";

export const emptyScores = (): CheckScores => ({
  anxiety: null,
  lethargy: null,
  depression: null,
  isolation: null,
  selfEsteem: null,
});

/** 전후 비교를 위해 다섯 문항 모두 답해야 한다 */
export const isComplete = (s: CheckScores | null | undefined): s is Record<keyof CheckScores, number> =>
  !!s && CHECK_ITEMS.every((it) => s[it.key] !== null);

function ScaleQuestion({ item, value, onChange }: { item: CheckItem; value: number | null; onChange: (v: number) => void }) {
  const id = useId();

  return (
    <div className="border-t border-line py-4 first:border-t-0">
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="min-w-0 font-medium">
          {item.question}
        </label>
        <output htmlFor={id} className={`shrink-0 tabular-nums ${value === null ? "text-[14px] text-unsure" : "text-[22px] font-bold"}`}>
          {value === null ? "아직 안 함" : value}
        </output>
      </div>
      {/* 기본값 5에 끌려가지 않도록, 직접 움직이기 전까지는 빈 손잡이로 둔다 */}
      <input
        id={id}
        type="range"
        min={0}
        max={10}
        step={1}
        value={value ?? 5}
        data-empty={value === null}
        aria-valuetext={value === null ? "아직 답하지 않음" : `${value}점`}
        onChange={(e) => onChange(Number(e.target.value))}
        onClick={(e) => value === null && onChange(Number((e.target as HTMLInputElement).value))}
        className="scale mt-1"
      />
      <div className="flex justify-between text-[13px] text-ink-3">
        <span>0 전혀 아님</span>
        <span>매우 그럼 10</span>
      </div>
    </div>
  );
}

export function CheckinForm({ phase, onSubmit }: { phase: "before" | "after"; onSubmit: (scores: CheckScores) => void }) {
  const [scores, setScores] = useState<CheckScores>(emptyScores);
  const answered = CHECK_ITEMS.filter((it) => scores[it.key] !== null).length;
  const total = CHECK_ITEMS.length;

  return (
    <div>
      <h2 className="text-[22px] font-bold">{phase === "before" ? "연습 전, 지금 마음은 어때요?" : "연습을 마친 지금은 어때요?"}</h2>
      <p className="mt-1 text-[15px] text-ink-2">
        {phase === "before"
          ? "연습 전후를 비교하려고 다섯 문항을 모두 여쭤봐요. 정답은 없고 진단도 아니에요."
          : "연습 전과 같은 문항이에요. 다섯 개 모두 답하면 변화를 그래프로 볼 수 있어요."}{" "}
        기록은 이 기기에만 저장돼요.
      </p>
      <div className="mt-4 rounded-md bg-surface px-4">
        {CHECK_ITEMS.map((item) => (
          <ScaleQuestion key={item.key} item={item} value={scores[item.key]} onChange={(v) => setScores((s) => ({ ...s, [item.key]: v }))} />
        ))}
      </div>
      <Button className="mt-6 w-full" disabled={answered < total} onClick={() => onSubmit(scores)}>
        {answered < total
          ? `${total - answered}문항 남았어요`
          : phase === "before"
            ? "기록하고 연습 시작"
            : "기록하고 전후 비교 보기"}
      </Button>
    </div>
  );
}
