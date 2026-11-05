"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell, ScreenTitle } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/Button";
import { useFlow, useRequire } from "@/features/flow/FlowProvider";
import { AVATARS } from "@/features/simulation/avatar-catalog.mjs";

// S5-1 영상 연습 상대 고르기. 쓸 수 있는 아바타(서버에 ID가 설정된 것)만 고를 수 있다.

type Availability = { key: string; available: boolean; image: string | null };

export default function AvatarSelectPage() {
  const router = useRouter();
  const { state } = useFlow();
  const ready = useRequire(state.sceneId !== null && state.level !== null, "/practice");
  const [status, setStatus] = useState<Record<string, Availability> | null>(null);
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    const c = new AbortController();
    fetch("/api/avatar", { signal: c.signal, cache: "no-store" })
      .then((r) => (r.ok ? (r.json() as Promise<{ avatars: Availability[] }>) : { avatars: [] }))
      .then(({ avatars }) => {
        const map = Object.fromEntries(avatars.map((a) => [a.key, a]));
        setStatus(map);
        setSelected((s) => s ?? AVATARS.find((a) => map[a.key]?.available)?.key ?? null);
      })
      .catch(() => { if (!c.signal.aborted) setStatus({}); });
    return () => c.abort();
  }, []);

  const chosen = AVATARS.find((a) => a.key === selected);
  const noneAvailable = status !== null && !AVATARS.some((a) => status[a.key]?.available);

  if (!ready) return null;
  return (
    <AppShell
      back="/practice/avatar"
      step={state.program ? 3 : undefined}
      footer={
        <Button className="w-full" disabled={!chosen} onClick={() => chosen && router.push(`/practice/session?avatar=${chosen.key}`)}>
          {chosen ? `${chosen.name}님과 연습 시작하기` : "아바타를 골라 주세요"}
        </Button>
      }
    >
      <ScreenTitle sub="영상으로 함께 연습할 상대를 골라 주세요.">아바타 선택</ScreenTitle>

      {noneAvailable && (
        <p role="status" className="mb-4 rounded-md bg-surface-2 px-3 py-2.5 text-[14px] text-ink-2">
          아직 연결된 아바타가 없어요. 채팅으로 연습하거나, 개발 환경이라면 backend/.env 의 SYNTHESIA_AVATARS 를 설정해 주세요.
        </p>
      )}

      <ul className="grid grid-cols-2 gap-3" aria-label="아바타 목록">
        {AVATARS.map((a, i) => {
          const info = status?.[a.key];
          const available = info?.available === true;
          const isSelected = selected === a.key;
          return (
            <li key={a.key}>
              <button
                type="button"
                aria-pressed={isSelected}
                disabled={!available}
                onClick={() => setSelected(a.key)}
                className={`press relative flex h-full w-full flex-col overflow-hidden rounded-md border-2 text-left transition-colors duration-200 disabled:cursor-not-allowed ${
                  isSelected ? "border-ink bg-route-soft" : "border-line bg-surface hover:border-ink-3 disabled:hover:border-line"
                }`}
              >
                <span className={`block aspect-[4/5] w-full ${available || status === null ? "" : "opacity-50 grayscale"}`}>
                  {status === null ? (
                    <span className="block h-full w-full animate-pulse bg-surface-2" />
                  ) : info?.image ? (
                    // eslint-disable-next-line @next/next/no-img-element -- 로컬 미리보기 사진. 최적화 서버를 거치지 않는다.
                    <img src={info.image} alt="" className="h-full w-full object-cover object-top" />
                  ) : (
                    <Portrait tone={i} />
                  )}
                </span>
                {status !== null && !available && (
                  <span className="absolute right-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-[12px] font-medium text-white">준비 중</span>
                )}
                <span className="flex flex-1 items-start gap-2 px-3 pb-3 pt-2.5">
                  <span className="min-w-0 flex-1">
                    <strong className="block text-[16px] font-semibold">{a.name}</strong>
                    <span className="mt-0.5 block break-keep text-[14px] leading-snug text-ink-2">{a.description}</span>
                  </span>
                  {/* 다른 선택 화면(연습 장면·난이도)과 같은 원형 표시 */}
                  <span aria-hidden className={`mt-0.5 grid size-6 shrink-0 place-items-center rounded-full border-2 ${isSelected ? "border-ink" : "border-line"}`}>
                    {isSelected && <span className="size-3 rounded-full bg-ink" />}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      <p className="mt-4 text-[13px] text-ink-3">아바타는 연습 상대 역할만 해요. 실제 담당자가 아니에요.</p>
    </AppShell>
  );
}

const TONES = [
  ["#e7e9ff", "#c9ccf7"],
  ["#e3eef5", "#bcd3e3"],
];

/** 미리보기 사진(public/avatars/<key>.jpg)이 없을 때의 자리 그림. 실제 얼굴처럼 보이지 않게 단순한 실루엣만 그린다. */
function Portrait({ tone }: { tone: number }) {
  const [bg, fg] = TONES[tone % TONES.length];
  return (
    <svg viewBox="0 0 120 150" className="h-full w-full" aria-hidden>
      <rect width="120" height="150" fill={bg} />
      <circle cx="60" cy="60" r="24" fill={fg} />
      <path d="M18 150c2-30 20-48 42-48s40 18 42 48z" fill={fg} />
    </svg>
  );
}
