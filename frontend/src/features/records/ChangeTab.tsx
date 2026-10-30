"use client";

import { useFlow } from "@/features/flow/FlowProvider";
import { programProgress } from "@/lib/journey";

// 내 기록 › 나의 변화. "한걸음이 만든 변화" 하나.
// 불안도 평균은 연습 전후를 모두 적은 연습만으로 낸다. 오르내림에 좋고 나쁨의 색을 입히지 않는다.

const round1 = (n: number) => Math.round(n * 10) / 10;

export function ChangeTab() {
  const { records, stops, snapshots } = useFlow();
  const pairs = records.filter((r) => r.before?.anxiety != null && r.after?.anxiety != null);
  const avg = (pick: (i: number) => number) => (pairs.length ? round1(pairs.reduce((n, _, i) => n + pick(i), 0) / pairs.length) : null);
  const before = avg((i) => pairs[i].before!.anxiety!);
  const after = avg((i) => pairs[i].after!.anxiety!);
  const diff = before !== null && after !== null ? round1(after - before) : null;

  const programs = programProgress(stops, snapshots);
  const visited = programs.filter((p) => p.answer === "visited").length;

  return (
    <section aria-labelledby="change-title" className="rounded-md bg-ink px-4 py-4 text-paper">
      <h2 id="change-title" className="text-[13px] font-normal text-surface-2">
        한걸음이 만든 변화
      </h2>
      {diff === null ? (
        <p className="mt-1 text-[17px] font-bold leading-snug">연습 전후 불안도를 모두 적은 연습이 생기면 여기에 보여 드려요.</p>
      ) : (
        <>
          <p className="mt-1 text-[19px] font-bold leading-snug">
            연습하고 나면 불안이
            <br />
            {diff === 0 ? "평균적으로 그대로였어요" : `평균 ${Math.abs(diff)} ${diff < 0 ? "낮아졌어요" : "높아졌어요"}`}
          </p>
          <dl className="mt-3 grid gap-1.5 text-[13px]">
            <Bar label="연습 전" value={before!} color="var(--series-before)" />
            <Bar label="연습 후" value={after!} color="var(--series-after)" />
          </dl>
          <p className="mt-2 text-[12px] text-surface-2">연습 {pairs.length}번의 평균 · 스스로 적은 0~10점이에요</p>
        </>
      )}
      {programs.length > 0 && (
        <p className="mt-3 text-[14px] text-surface-2">
          준비한 {programs.length}곳 중 <strong className="font-bold text-paper">{visited}곳에 다녀왔어요</strong>
        </p>
      )}
    </section>
  );
}

function Bar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="grid grid-cols-[3.5rem_1fr_2rem] items-center gap-2">
      <dt>{label}</dt>
      <dd aria-hidden className="h-2 overflow-hidden rounded-full bg-ink-2">
        <span className="block h-full rounded-full" style={{ width: `${value * 10}%`, background: color }} />
      </dd>
      <dd className="text-right font-semibold tabular-nums">{value}</dd>
    </div>
  );
}
