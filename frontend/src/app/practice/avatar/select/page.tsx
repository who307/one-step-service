"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { AppShell, ScreenTitle } from "@/components/layout/AppShell";
import { useFlow, useRequire } from "@/features/flow/FlowProvider";
import { AVATAR_STYLES, AVATARS } from "@/features/simulation/avatar-catalog.mjs";

// S5-1 영상 연습 상대 고르기. 쓸 수 있는 아바타(서버에 ID가 설정된 것)만 고를 수 있다.

type StyleFilter = (typeof AVATAR_STYLES)[number]["id"];
type Availability = { key: string; available: boolean; image: string | null };

export default function AvatarSelectPage() {
  const router = useRouter();
  const { state } = useFlow();
  const ready = useRequire(state.sceneId !== null && state.level !== null, "/practice");
  const [filter, setFilter] = useState<StyleFilter>("all");
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

  const shown = useMemo(() => AVATARS.filter((a) => filter === "all" || a.style === filter), [filter]);
  const chosen = AVATARS.find((a) => a.key === selected);
  const noneAvailable = status !== null && !AVATARS.some((a) => status[a.key]?.available);

  if (!ready) return null;
  return (
    <AppShell
      back="/practice/avatar"
      step={state.program ? 3 : undefined}
      footer={
        <button
          type="button"
          disabled={!chosen}
          onClick={() => chosen && router.push(`/practice/session?avatar=${chosen.key}`)}
          className="press flex min-h-12 w-full items-center justify-center rounded-md bg-[#514ef5] text-[16px] font-semibold text-white disabled:bg-surface-2 disabled:text-ink-3"
        >
          {chosen ? `${chosen.name}님과 연습 시작하기` : "아바타를 골라 주세요"}
        </button>
      }
    >
      <ScreenTitle sub="영상으로 함께 연습할 상대를 골라 주세요.">아바타 선택</ScreenTitle>

      <div role="group" aria-label="분위기로 거르기" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
        {AVATAR_STYLES.map((s) => (
          <button
            key={s.id}
            type="button"
            aria-pressed={filter === s.id}
            onClick={() => setFilter(s.id)}
            className="press min-h-10 shrink-0 rounded-full border border-line bg-surface px-4 text-[14px] font-medium text-ink-2 aria-pressed:border-[#514ef5] aria-pressed:bg-[#514ef5] aria-pressed:text-white"
          >
            {s.label}
          </button>
        ))}
      </div>

      {noneAvailable && (
        <p role="status" className="mt-4 rounded-md bg-surface-2 px-3 py-2.5 text-[14px] text-ink-2">
          아직 연결된 아바타가 없어요. 채팅으로 연습하거나, 개발 환경이라면 backend/.env 의 SYNTHESIA_AVATARS 를 설정해 주세요.
        </p>
      )}

      <ul className="mt-4 grid grid-cols-2 gap-3" aria-label="아바타 목록">
        {shown.map((a, i) => {
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
                className={`press relative flex w-full flex-col overflow-hidden rounded-2xl border-2 bg-surface text-left transition-[border-color,box-shadow] duration-200 disabled:cursor-not-allowed ${
                  isSelected ? "border-[#514ef5] shadow-[0_0_0_3px_rgb(81_78_245/0.15)]" : "border-line hover:border-ink-3 disabled:hover:border-line"
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
                {isSelected && (
                  <span aria-hidden className="absolute left-2 top-2 grid size-7 place-items-center rounded-full bg-[#514ef5] text-white">
                    <Check size={16} strokeWidth={3} />
                  </span>
                )}
                {status !== null && !available && (
                  <span className="absolute right-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-[12px] font-medium text-white">준비 중</span>
                )}
                <span className="block px-3 pb-3 pt-2.5">
                  <strong className="block text-[16px]">{a.name}</strong>
                  <span className="mt-0.5 block text-[13px] leading-snug text-ink-3">{a.description}</span>
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
  ["#f7e8ef", "#e6c4d3"],
  ["#e6efe3", "#c3d6bc"],
  ["#f6eee0", "#e2cfae"],
  ["#ece6f5", "#cfc2e3"],
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
