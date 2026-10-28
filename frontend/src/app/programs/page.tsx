"use client";

import { useEffect, useState } from "react";
import { Search, X } from "lucide-react";
import { AppShell, ScreenTitle } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/Button";
import { ToggleChip } from "@/components/ui/Chip";
import { ErrorPanel, Loading, MockNote } from "@/components/ui/States";
import { ProgramCard } from "@/features/program/ProgramCard";
import { api, isAbort, USE_MOCK } from "@/lib/api";
import { CATEGORY_LABEL, MODE_LABEL } from "@/lib/labels";
import { useFlow } from "@/features/flow/FlowProvider";
import type { Category, Mode, RecommendationList } from "@/types/api";

// 공고 목록. 처음엔 전체를 보여주고, 활동 종류·참여 방식·검색어로 좁힌다.
// 조건은 지금 화면에서 고른 것만 쓴다. 과거 이용 기록으로 개인화하지 않는다.
// 공고가 수천 개라 20개씩 보여주고 "더 보기"로 늘린다.

const PAGE = 20;

export default function ProgramsPage() {
  const { update } = useFlow();
  const [category, setCategory] = useState<Category | undefined>();
  const [mode, setMode] = useState<Mode | undefined>();
  const [input, setInput] = useState("");
  const [q, setQ] = useState("");
  const [data, setData] = useState<RecommendationList | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [forceMock, setForceMock] = useState(false);
  const [retry, setRetry] = useState(0);
  const [openOnly, setOpenOnly] = useState(false);
  const [shown, setShown] = useState(PAGE);

  // 입력이 멈추고 0.3초 뒤에 검색한다
  useEffect(() => {
    const t = setTimeout(() => setQ(input), 300);
    return () => clearTimeout(t);
  }, [input]);

  useEffect(() => {
    const ac = new AbortController();
    setData(null);
    setError(null);
    setShown(PAGE);
    api
      .recommend({ category, mode, q: q || undefined, openOnly: openOnly || undefined }, { signal: ac.signal, mock: forceMock })
      .then((d) => {
        setData(d);
        if (forceMock) update({ usedMock: true });
      })
      .catch((e) => !isAbort(e) && setError(e));
    return () => ac.abort();
  }, [category, mode, q, openOnly, forceMock, retry, update]);

  const filtered = category || mode || q || openOnly;

  return (
    <AppShell back="/" step={0}>
      <ScreenTitle sub="마음이 가는 공고를 하나 골라요. 신청은 공식 안내에서 직접 해요.">어떤 활동이 궁금한가요?</ScreenTitle>

      <label htmlFor="q" className="sr-only">
        공고 검색
      </label>
      <div className="relative">
        <Search size={18} aria-hidden className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-3" />
        <input
          id="q"
          type="search"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="공고 이름, 기관, 지역으로 찾기…"
          autoComplete="off"
          className="min-h-12 w-full rounded-md border-2 border-line bg-surface pl-10 pr-4 placeholder:text-ink-3 focus-visible:border-ink focus-visible:outline-none"
        />
      </div>

      <fieldset className="mt-4">
        <legend className="text-[14px] font-semibold text-ink-2">활동 종류</legend>
        <div className="-mx-4 mt-2 flex gap-2 overflow-x-auto px-4 pb-1">
          {(Object.keys(CATEGORY_LABEL) as Category[]).map((c) => (
            <ToggleChip key={c} label={CATEGORY_LABEL[c]} selected={category === c} onToggle={() => setCategory(category === c ? undefined : c)} />
          ))}
        </div>
      </fieldset>
      <fieldset className="mt-3">
        <legend className="text-[14px] font-semibold text-ink-2">참여 방식</legend>
        <div className="-mx-4 mt-2 flex gap-2 overflow-x-auto px-4 pb-1">
          {(Object.keys(MODE_LABEL) as Mode[]).map((m) => (
            <ToggleChip key={m} label={MODE_LABEL[m]} selected={mode === m} onToggle={() => setMode(mode === m ? undefined : m)} />
          ))}
        </div>
      </fieldset>
      <div className="mt-3">
        <ToggleChip label="모집 중인 공고만" selected={openOnly} onToggle={() => setOpenOnly(!openOnly)} />
      </div>

      <div className="mt-6" aria-live="polite">
        {error ? (
          <ErrorPanel
            error={error}
            actions={
              <>
                <Button onClick={() => setRetry((r) => r + 1)}>다시 시도하기</Button>
                <Button variant="secondary" onClick={() => setForceMock(true)}>
                  예시 공고로 보기
                </Button>
              </>
            }
          />
        ) : !data ? (
          <Loading label="공고를 불러오는 중…" />
        ) : (
          <>
            <p className="mb-3 text-[14px] text-ink-3">
              {filtered ? `조건에 맞는 공고 ${data.items.length}개` : `전체 공고 ${data.items.length}개`}
            </p>
            {(USE_MOCK || forceMock || data.source === "MOCK") && (
              <div className="mb-3">
                <MockNote>‘예시’가 붙은 공고는 시연용으로 지어낸 공고예요. 실제로 신청할 수 없어요.</MockNote>
              </div>
            )}
            {data.items.length === 0 ? (
              <div className="py-10 text-center">
                <p className="text-[16px] text-ink-2">조건에 맞는 공고가 없어요.</p>
                <Button
                  variant="secondary"
                  className="mt-4"
                  onClick={() => {
                    setCategory(undefined);
                    setMode(undefined);
                    setOpenOnly(false);
                    setInput("");
                  }}
                >
                  <X size={16} aria-hidden />
                  조건 모두 지우기
                </Button>
              </div>
            ) : (
              <>
                <ul className="grid gap-3">
                  {data.items.slice(0, shown).map(({ program, reasons }) => (
                    <li key={program.id}>
                      <ProgramCard program={program} reasons={reasons} />
                    </li>
                  ))}
                </ul>
                {data.items.length > shown && (
                  <Button variant="secondary" className="mt-4 w-full" onClick={() => setShown((n) => n + PAGE)}>
                    더 보기 ({data.items.length - shown}개 남음)
                  </Button>
                )}
              </>
            )}
          </>
        )}
      </div>
      <p className="mt-6 text-[13px] text-ink-3">추천은 조건이 맞는다는 뜻이고, 실제 지원 자격을 보장하지 않아요.</p>
    </AppShell>
  );
}
