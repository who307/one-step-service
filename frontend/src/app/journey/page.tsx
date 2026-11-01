"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ExternalLink, House, MessageSquareText, RotateCcw } from "lucide-react";
import { AppShell, ScreenTitle } from "@/components/layout/AppShell";
import { Button, ButtonLink } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/States";
import { useFlow, useRequire } from "@/features/flow/FlowProvider";

// 나의 노선(현재 이용 중에만). 연습한 것과 실제로 다녀온 것을 구분한다.
// 실제 참여 단계는 사용자가 직접 체크하고, 연습 완료를 방문으로 세지 않는다.

const MISSIONS = ["준비물 챙기기", "집에서 출발하기", "도착해서 접수하기", "활동 참여하기", "집에 도착하기"];

export default function JourneyPage() {
  const router = useRouter();
  const { state, toggleCheck, reset, addStop, stops } = useFlow();
  const ready = useRequire(state.program !== null);
  const [confirm, setConfirm] = useState(false);
  if (!ready) return null;

  const t = state.program!;
  const prepared = [
    { label: "공고 확인", done: true },
    { label: state.practiceCount > 0 ? `말 연습 ${state.practiceCount}번` : "말 연습", done: state.practiceCount > 0 },
  ];
  const doneCount = MISSIONS.filter((m) => state.checked[`mission:${m}`]).length;
  const pct = Math.round((doneCount / MISSIONS.length) * 100);
  const applyUrl = state.program?.applicationUrl;

  return (
    <AppShell back="/result">
      <ScreenTitle sub={t.title}>나의 노선</ScreenTitle>

      <section aria-labelledby="prep">
        <h2 id="prep" className="text-[17px] font-bold">
          미리 해 본 것
        </h2>
        <ol className="relative mt-3 grid gap-4 pl-9">
          <span aria-hidden className="absolute bottom-2 left-[13px] top-2 w-[5px] rounded-full bg-route" />
          {prepared.map((s) => (
            <li key={s.label} className="relative flex min-h-7 items-center text-[16px]">
              <span
                aria-hidden
                className={`absolute -left-9 grid size-7 place-items-center rounded-full border-[3px] ${
                  s.done ? "border-route bg-route text-on-action" : "border-line bg-surface"
                }`}
              >
                {s.done && <Check size={14} strokeWidth={3} />}
              </span>
              <span className={s.done ? "" : "text-ink-3"}>
                {s.label}
                <span className="sr-only">{s.done ? " 완료" : " 아직"}</span>
              </span>
            </li>
          ))}
        </ol>
        <p className="mt-3 text-[13px] text-ink-3">연습은 연습이에요. 실제 참여는 아래에서 직접 체크해요.</p>
      </section>

      <section aria-labelledby="mission" className="mt-8">
        <div className="flex items-baseline justify-between">
          <h2 id="mission" className="text-[17px] font-bold">
            실제 참여하는 날
          </h2>
          <span className="text-[14px] tabular-nums text-ink-2">
            {doneCount}/{MISSIONS.length}
          </span>
        </div>
        <div
          role="progressbar"
          aria-label="실제 참여 진행률"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
          className="relative mt-2 h-2 overflow-hidden rounded-full bg-line"
        >
          <span
            className="absolute inset-0 origin-left rounded-full bg-gradient-to-r from-route to-glow transition-transform duration-300 ease-[var(--ease-out)]"
            style={{ transform: `scaleX(${pct / 100})` }}
          />
        </div>
        <ul className="mt-3 divide-y divide-line border-y border-line">
          {MISSIONS.map((m) => {
            const key = `mission:${m}`;
            const on = !!state.checked[key];
            return (
              <li key={m}>
                <label className="flex min-h-13 cursor-pointer items-center gap-3 py-2">
                  <input type="checkbox" checked={on} onChange={() => {
                      toggleCheck(key);
                      // 마지막 하나까지 체크하면 홈 노선에 "다녀왔어요" 역을 남긴다(한 공고에 한 번)
                      const willBeDone = !on && doneCount === MISSIONS.length - 1;
                      const key0 = state.program?.id ?? t.title;
                      if (willBeDone && !stops.some((s) => s.type === "visited" && s.programKey === key0))
                        addStop({ type: "visited", programKey: key0, programTitle: t.title });
                    }} className="peer sr-only" />
                  <span
                    aria-hidden
                    className={`grid size-6 shrink-0 place-items-center rounded-full border-2 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[var(--focus)] ${
                      on ? "border-glow bg-glow text-surface" : "border-line bg-surface"
                    }`}
                  >
                    {on && <Check size={14} strokeWidth={3} />}
                  </span>
                  <span className="text-[16px]">{m}</span>
                </label>
              </li>
            );
          })}
        </ul>
        {doneCount === MISSIONS.length && <p className="enter mt-3 text-[15px] font-semibold">끝까지 다녀왔어요. 오늘 한 걸음을 내디뎠어요.</p>}
      </section>

      <section aria-labelledby="next" className="mt-8">
        <h2 id="next" className="text-[17px] font-bold">
          다음에 해 볼 수 있는 것
        </h2>
        <div className="mt-3 grid gap-2">
          {t.unknowns.length > 0 && (
            <ButtonLink href="/inquiry" variant="secondary">
              <MessageSquareText size={18} aria-hidden />
              확인 안 된 것 물어보기
            </ButtonLink>
          )}
          {applyUrl && (
            <ButtonLink href={applyUrl} external variant="secondary">
              <ExternalLink size={18} aria-hidden />
              공식 안내에서 신청하기
            </ButtonLink>
          )}
          <ButtonLink href="/practice" variant="secondary">
            다른 장면 연습하기
          </ButtonLink>
          <ButtonLink href="/" variant="secondary">
            <House size={18} aria-hidden />
            홈에서 나의 노선 보기
          </ButtonLink>
          <Button variant="quiet" onClick={() => setConfirm(true)}>
            <RotateCcw size={16} aria-hidden />
            새 공고로 처음부터
          </Button>
        </div>
      </section>

      <p className="mt-8 text-[13px] text-ink-3">이 노선은 이 브라우저에만 남아요. 서버로 보내지 않고, 새로고침해도 이어져요.</p>

      <ConfirmDialog
        open={confirm}
        title="처음부터 시작할까요?"
        body="지금까지 고른 공고, 연습, 체크한 내용이 모두 지워져요."
        cancelLabel="그대로 두기"
        confirmLabel="처음부터 시작하기"
        onCancel={() => setConfirm(false)}
        onConfirm={() => {
          reset();
          router.push("/");
        }}
      />
    </AppShell>
  );
}
