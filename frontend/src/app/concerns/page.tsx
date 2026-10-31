"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { AppShell, ScreenTitle } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/Button";
import { useFlow, useRequire } from "@/features/flow/FlowProvider";
import { CONCERN_OPTIONS, MAX_CONCERNS } from "@/lib/labels";

// S2 걱정 선택. 최대 3개, 건너뛰어도 된다. 고른 걱정은 상황 연습에 쓴다.
// 마치면 공고를 읽은 걸음을 노선에 남기고 연습 전 마음 체크로 간다.
export default function ConcernsPage() {
  const router = useRouter();
  const { state, update, addStop } = useFlow();
  const ready = useRequire(state.noticeText !== "");
  const custom0 = state.concerns.find((c) => !CONCERN_OPTIONS.includes(c)) ?? "";
  const [picked, setPicked] = useState<string[]>(state.concerns.filter((c) => CONCERN_OPTIONS.includes(c)));
  const [otherOn, setOtherOn] = useState(custom0 !== "");
  const [other, setOther] = useState(custom0);

  if (!ready) return null;

  const count = picked.length + (otherOn ? 1 : 0);
  const full = count >= MAX_CONCERNS;
  const toggle = (c: string) => setPicked((p) => (p.includes(c) ? p.filter((x) => x !== c) : full ? p : [...p, c]));

  const go = (concerns: string[]) => {
    update({ concerns });
    if (state.program) addStop({ type: "read", programKey: state.program.id, programTitle: state.program.title });
    router.push("/check/before");
  };

  return (
    <AppShell
      back={state.program ? `/programs/${state.program.id}` : "/programs"}
      step={1}
      footer={
        <div className="grid grid-cols-[auto_1fr] gap-2">
          <Button variant="quiet" onClick={() => go([])}>
            건너뛰기
          </Button>
          <Button onClick={() => go([...picked, ...(otherOn && other.trim() ? [other.trim()] : [])])}>다음</Button>
        </div>
      }
    >
      <ScreenTitle sub={`최대 ${MAX_CONCERNS}개, 건너뛰어도 괜찮아요.`}>어떤 부분이 걱정되나요?</ScreenTitle>
      {state.program && <p className="-mt-2 mb-4 text-[15px] text-ink-3">{state.program.title}</p>}

      <fieldset>
        <legend className="sr-only">걱정되는 점</legend>
        <ul className="divide-y divide-line border-y border-line">
          {CONCERN_OPTIONS.map((c) => (
            <li key={c}>
              <CheckRow label={c} checked={picked.includes(c)} disabled={full && !picked.includes(c)} onChange={() => toggle(c)} />
            </li>
          ))}
          <li>
            <CheckRow label="기타 (직접 입력)" checked={otherOn} disabled={full && !otherOn} onChange={() => setOtherOn((o) => !o)} />
            {otherOn && (
              <div className="enter pb-3 pl-10">
                <label htmlFor="other" className="sr-only">
                  기타 걱정
                </label>
                <input
                  id="other"
                  autoFocus
                  value={other}
                  maxLength={100}
                  onChange={(e) => setOther(e.target.value)}
                  placeholder="예: 혼자 가는 게 처음이에요…"
                  className="min-h-12 w-full rounded-md border-2 border-line bg-surface px-3 placeholder:text-ink-3 focus-visible:border-ink focus-visible:outline-none"
                />
              </div>
            )}
          </li>
        </ul>
      </fieldset>
      <p aria-live="polite" className="mt-3 text-[14px] text-ink-3">
        {full ? `${MAX_CONCERNS}개를 모두 골랐어요. 바꾸려면 하나를 빼 주세요.` : `${count}개 골랐어요.`}
      </p>
    </AppShell>
  );
}

function CheckRow({ label, checked, disabled, onChange }: { label: string; checked: boolean; disabled: boolean; onChange: () => void }) {
  return (
    <label className={`flex min-h-14 cursor-pointer items-center gap-3 py-2 text-[16px] ${disabled ? "cursor-not-allowed text-ink-3" : ""}`}>
      <input type="checkbox" checked={checked} disabled={disabled} onChange={onChange} className="peer sr-only" />
      <span
        aria-hidden
        className={`grid size-7 shrink-0 place-items-center rounded-sm border-2 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[var(--focus)] ${
          checked ? "border-ink bg-ink text-paper" : "border-line bg-surface"
        }`}
      >
        {checked && <Check size={18} strokeWidth={3} />}
      </span>
      {label}
    </label>
  );
}
