"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { AppShell, ScreenTitle } from "@/components/layout/AppShell";
import { ButtonLink } from "@/components/ui/Button";
import { MockNote } from "@/components/ui/States";
import { useFlow, useRequire, type Mood } from "@/features/flow/FlowProvider";

// S8 결과. 점수 변화는 성공·실패나 효과로 해석하지 않고, 적은 숫자를 나란히 보여주기만 한다.
export default function ResultPage() {
  const { state } = useFlow();
  const ready = useRequire(state.practice !== null, "/practice");
  if (!ready) return null;
  const { practice, program, before, after } = state;
  const result = practice!.result;

  return (
    <AppShell
      back="/check/after"
      step={program ? 6 : undefined}
      footer={
        <div className="grid grid-cols-2 gap-2">
          <ButtonLink href="/practice" variant="secondary">
            다시 연습하기
          </ButtonLink>
          {/* 공고 흐름이면 실제 참여 체크(나의 노선)로, 공고 없이 한 연습이면 내 기록으로 */}
          <ButtonLink href={program ? "/journey" : "/records"}>마무리하기</ButtonLink>
        </div>
      }
    >
      <ScreenTitle sub={result?.summary}>오늘의 연습 결과</ScreenTitle>

      <section aria-labelledby="mood">
        <h2 id="mood" className="sr-only">
          연습 전후 마음
        </h2>
        <div className="grid grid-cols-2 gap-2">
          <Compare label="불안도" k="anxiety" before={before} after={after} />
          <Compare label="참여 의향" k="intent" before={before} after={after} />
        </div>
        <p className="mt-2 text-[13px] text-ink-3">스스로 적은 숫자예요. 진단이나 잘하고 못한 것을 뜻하지 않아요.</p>
      </section>

      {result && result.nextPhrases.length > 0 && (
        <section aria-labelledby="phrases" className="mt-8">
          <h2 id="phrases" className="text-[17px] font-bold">
            이런 말을 다음에 해볼 수 있어요
          </h2>
          <ul className="mt-2 grid gap-1.5">
            {result.nextPhrases.map((p) => (
              <Phrase key={p} text={p} />
            ))}
          </ul>
        </section>
      )}

      {state.usedMock && (
        <div className="mt-6">
          <MockNote>이번 이용에는 예시 응답이 포함되어 있어요.</MockNote>
        </div>
      )}
    </AppShell>
  );
}

function Compare({ label, k, before, after }: { label: string; k: keyof Mood; before: Mood | null; after: Mood | null }) {
  const b = before?.[k] ?? null;
  const a = after?.[k] ?? null;
  const both = b !== null && a !== null;
  const diff = both ? a! - b! : null;
  return (
    <div className="rounded-md border border-line bg-surface px-3 py-4 text-center">
      <p className="text-[14px] text-ink-2">{label}</p>
      <p className="mt-1 text-[26px] font-bold tabular-nums">
        {b ?? "–"} <span className="text-ink-3">→</span> {a ?? "–"}
      </p>
      {/* 차이는 양쪽 값이 모두 있을 때만. 방향에 좋고 나쁨의 색을 입히지 않는다 */}
      <p className="mt-1 text-[14px] text-ink-2 tabular-nums">
        {diff === null ? (b === null && a === null ? "기록하지 않았어요" : "한쪽만 기록했어요") : diff === 0 ? "변화 없음" : `${diff > 0 ? "+" : ""}${diff}`}
      </p>
    </div>
  );
}

function Phrase({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <li className="flex items-center gap-2 rounded-md border border-line bg-surface py-1 pl-4 pr-1">
      <span className="flex-1 text-[15px]">{text}</span>
      <button
        type="button"
        aria-label={copied ? "복사했어요" : `‘${text}’ 복사하기`}
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(text);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          } catch {}
        }}
        className="press grid size-11 shrink-0 place-items-center rounded-md text-ink-2 hover:bg-surface-2 hover:text-ink"
      >
        {copied ? <Check size={18} aria-hidden /> : <Copy size={18} aria-hidden />}
      </button>
    </li>
  );
}
