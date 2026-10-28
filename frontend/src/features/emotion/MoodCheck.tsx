"use client";

import { useId, useState } from "react";
import { Button } from "@/components/ui/Button";
import type { Mood } from "@/features/flow/FlowProvider";

// S4·S7 마음 체크. 진단이 아니라 지금 상태를 스스로 적어 보는 것.
// 움직이지 않은 슬라이더는 "응답 안 함"(null)으로 남기고 0점으로 바꾸지 않는다.

const QUESTIONS: { key: keyof Mood; question: string; low: string; high: string }[] = [
  { key: "anxiety", question: "지금 얼마나 불안한가요?", low: "전혀 불안하지 않음", high: "매우 불안함" },
  { key: "intent", question: "프로그램에 참여하고 싶은 마음은 얼마나 있나요?", low: "전혀 참여하고 싶지 않음", high: "매우 참여하고 싶음" },
];

export function MoodCheck({ initial, onSubmit, onSkip }: { initial: Mood | null; onSubmit: (m: Mood) => void; onSkip: () => void }) {
  const [mood, setMood] = useState<Mood>(initial ?? { anxiety: null, intent: null });
  const answered = mood.anxiety !== null || mood.intent !== null;

  return (
    <>
      <div className="grid gap-8">
        {QUESTIONS.map((q) => (
          <ScoreSlider key={q.key} question={q.question} low={q.low} high={q.high} value={mood[q.key]} onChange={(v) => setMood((m) => ({ ...m, [q.key]: v }))} />
        ))}
      </div>
      <div className="mt-10 grid grid-cols-[auto_1fr] gap-2">
        <Button variant="quiet" onClick={onSkip}>
          건너뛰기
        </Button>
        <Button disabled={!answered} onClick={() => onSubmit(mood)}>
          다음
        </Button>
      </div>
      {!answered && <p className="mt-2 text-right text-[14px] text-ink-3">하나만 답해도 괜찮아요.</p>}
    </>
  );
}

function ScoreSlider({
  question,
  low,
  high,
  value,
  onChange,
}: {
  question: string;
  low: string;
  high: string;
  value: number | null;
  onChange: (v: number | null) => void;
}) {
  const id = useId();
  return (
    <fieldset>
      <legend className="flex w-full items-baseline justify-between gap-3 text-[17px] font-semibold">
        <span>{question}</span>
      </legend>
      <div className="mt-2 flex items-center gap-3">
        <input
          id={id}
          type="range"
          min={0}
          max={10}
          step={1}
          value={value ?? 5}
          data-empty={value === null}
          aria-valuetext={value === null ? "아직 고르지 않음" : `10점 중 ${value}점`}
          onChange={(e) => onChange(Number(e.target.value))}
          // 처음 누른 자리가 5여도 응답으로 인정한다
          onPointerDown={() => value === null && onChange(5)}
          onKeyDown={() => value === null && onChange(5)}
          className="scale flex-1"
        />
        <output htmlFor={id} className="w-8 text-right text-[22px] font-bold tabular-nums">
          {value ?? "–"}
        </output>
      </div>
      <div className="flex justify-between text-[13px] text-ink-3">
        <span>0 {low}</span>
        <span>{high} 10</span>
      </div>
      {value !== null && (
        <button type="button" onClick={() => onChange(null)} className="mt-1 min-h-9 text-[13px] text-ink-3 underline underline-offset-2 hover:text-ink">
          이 질문은 답하지 않을래요
        </button>
      )}
    </fieldset>
  );
}
