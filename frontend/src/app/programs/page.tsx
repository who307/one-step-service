"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";
import { AppShell, ScreenTitle } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/Button";
import { ToggleChip } from "@/components/ui/Chip";
import { ErrorPanel, Loading, MockNote } from "@/components/ui/States";
import { ProgramCard } from "@/features/program/ProgramCard";
import { api, isAbort, USE_MOCK } from "@/lib/api";
import { CATEGORY_LABEL, MODE_LABEL } from "@/lib/labels";
import { useFlow } from "@/features/flow/FlowProvider";
import type { Category, Mode, ProgramSort, RecommendationList } from "@/types/api";

// 공고 목록. 처음엔 전체를 보여주고, 활동 종류·참여 방식·검색어로 좁힌다.
// 조건은 지금 화면에서 고른 것만 쓴다. 과거 이용 기록으로 개인화하지 않는다.
// 공고가 수천 개라 서버에서 20개씩 받아 오고 "더 보기"로 다음 20개를 붙인다.
// 고른 조건은 주소(?c=&m=&q=&open=&sort=)에 남겨, 공고 상세에서 돌아와도 그대로 이어진다.

const PAGE = 20;
const CATEGORIES = Object.keys(CATEGORY_LABEL) as Category[];
const MODES = Object.keys(MODE_LABEL) as Mode[];
const SORT_LABEL: Record<ProgramSort, string> = { RECOMMENDED: "추천순", DEADLINE: "마감 임박순", LATEST: "최근 시작순" };

interface Filters {
  categories: Category[];
  modes: Mode[];
  q: string;
  openOnly: boolean;
  sort: ProgramSort;
}

function readFilters(sp: URLSearchParams): Filters {
  const list = <T extends string>(key: string, allowed: readonly T[]) =>
    (sp.get(key)?.split(",") ?? []).filter((v): v is T => (allowed as readonly string[]).includes(v));
  const sort = sp.get("sort");
  return {
    categories: list("c", CATEGORIES),
    modes: list("m", MODES),
    q: sp.get("q") ?? "",
    openOnly: sp.get("open") === "1",
    sort: sort && sort in SORT_LABEL ? (sort as ProgramSort) : "RECOMMENDED",
  };
}

function writeFilters(f: Filters): string {
  const sp = new URLSearchParams();
  if (f.categories.length) sp.set("c", f.categories.join(","));
  if (f.modes.length) sp.set("m", f.modes.join(","));
  if (f.q) sp.set("q", f.q);
  if (f.openOnly) sp.set("open", "1");
  if (f.sort !== "RECOMMENDED") sp.set("sort", f.sort);
  return sp.toString();
}

// 받아 온 목록을 조건별로 잠깐 들고 있다가, 상세에서 돌아오면 다시 받지 않고 바로(스크롤 위치째) 보여준다.
// 공개 공고만 담기고 사용자 데이터는 없다. 새로고침하면 비워진다.
const cache = new Map<string, RecommendationList>();
const CACHE_MAX = 20;
function remember(key: string, data: RecommendationList) {
  cache.delete(key);
  cache.set(key, data);
  if (cache.size > CACHE_MAX) cache.delete(cache.keys().next().value!);
}

export default function ProgramsPage() {
  return (
    <Suspense>
      <Programs />
    </Suspense>
  );
}

function Programs() {
  const { update } = useFlow();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const query = searchParams.toString();
  const filters = useMemo(() => readFilters(new URLSearchParams(query)), [query]);
  const [forceMock, setForceMock] = useState(false);
  const key = `${forceMock ? "mock" : "live"}?${writeFilters(filters)}`;

  const [input, setInput] = useState(filters.q);
  const [data, setData] = useState<RecommendationList | null>(() => cache.get(key) ?? null);
  const [loading, setLoading] = useState(false);
  const [moreLoading, setMoreLoading] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [moreError, setMoreError] = useState(false);
  const [retry, setRetry] = useState(0);
  // 검색어 예약(0.3초)이 그사이 바뀐 칩 선택을 되돌리지 않도록 항상 최신 조건에서 고친다
  const latest = useRef(filters);
  latest.current = filters;

  const setFilters = (patch: Partial<Filters>) => {
    const qs = writeFilters({ ...latest.current, ...patch });
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };
  const toggle = <T,>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

  // 입력이 멈추고 0.3초 뒤에 검색한다
  useEffect(() => {
    if (input.trim() === filters.q) return;
    const t = setTimeout(() => setFilters({ q: input.trim() }), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 입력이 바뀔 때만 예약한다
  }, [input]);

  // 조건이 바뀌면 첫 20개를 받는다. 받는 동안 이전 목록을 흐리게 남겨 화면이 깜빡이지 않게 한다.
  useEffect(() => {
    setMoreError(false);
    const hit = cache.get(key);
    if (hit) {
      setData(hit);
      setError(null);
      return;
    }
    const ac = new AbortController();
    setLoading(true);
    setError(null);
    api
      .recommend(
        {
          categories: filters.categories,
          modes: filters.modes,
          q: filters.q || undefined,
          openOnly: filters.openOnly || undefined,
          sort: filters.sort,
          offset: 0,
          limit: PAGE,
        },
        { signal: ac.signal, mock: forceMock },
      )
      .then((d) => {
        remember(key, d);
        setData(d);
        if (forceMock) update({ usedMock: true });
      })
      .catch((e) => !isAbort(e) && setError(e))
      .finally(() => !ac.signal.aborted && setLoading(false));
    return () => ac.abort();
  }, [key, filters, forceMock, retry, update]);

  const loadMore = () => {
    if (!data || moreLoading) return;
    setMoreLoading(true);
    setMoreError(false);
    api
      .recommend(
        {
          categories: filters.categories,
          modes: filters.modes,
          q: filters.q || undefined,
          openOnly: filters.openOnly || undefined,
          sort: filters.sort,
          offset: data.items.length,
          limit: PAGE,
        },
        { mock: forceMock },
      )
      .then((d) => {
        const next = { ...d, items: [...data.items, ...d.items] };
        remember(key, next);
        setData(next);
      })
      .catch(() => setMoreError(true))
      .finally(() => setMoreLoading(false));
  };

  const filtered = filters.categories.length > 0 || filters.modes.length > 0 || filters.q !== "" || filters.openOnly;
  const clearAll = () => {
    setInput("");
    setFilters({ categories: [], modes: [], q: "", openOnly: false });
  };

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
      <p className="mt-1.5 text-[13px] text-ink-3">여러 단어를 띄어 쓰면 모두 들어간 공고만 찾아요.</p>

      <fieldset className="mt-4">
        <legend className="text-[14px] font-semibold text-ink-2">활동 종류 · 여러 개 고를 수 있어요</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {CATEGORIES.map((c) => (
            <ToggleChip
              key={c}
              label={CATEGORY_LABEL[c]}
              count={data?.categoryCounts[c]}
              selected={filters.categories.includes(c)}
              onToggle={() => setFilters({ categories: toggle(filters.categories, c) })}
            />
          ))}
        </div>
      </fieldset>
      <fieldset className="mt-3">
        <legend className="text-[14px] font-semibold text-ink-2">참여 방식 · 여러 개 고를 수 있어요</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {MODES.map((m) => (
            <ToggleChip
              key={m}
              label={MODE_LABEL[m]}
              count={data?.modeCounts[m]}
              selected={filters.modes.includes(m)}
              onToggle={() => setFilters({ modes: toggle(filters.modes, m) })}
            />
          ))}
        </div>
      </fieldset>
      <div className="mt-3">
        <ToggleChip label="모집 중인 공고만" selected={filters.openOnly} onToggle={() => setFilters({ openOnly: !filters.openOnly })} />
      </div>

      <div className="mt-6" aria-live="polite" aria-busy={loading}>
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
          <div className={`transition-opacity duration-150 ${loading ? "opacity-50" : ""}`}>
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="text-[14px] text-ink-3">
                {loading ? "찾는 중…" : filtered ? `조건에 맞는 공고 ${data.total}개` : `전체 공고 ${data.total}개`}
              </p>
              <label className="flex items-center gap-1.5 text-[14px] text-ink-2">
                <span className="sr-only">정렬</span>
                <select
                  value={filters.sort}
                  onChange={(e) => setFilters({ sort: e.target.value as ProgramSort })}
                  className="min-h-11 rounded-md border-2 border-line bg-surface px-2 text-[14px] focus-visible:border-ink focus-visible:outline-none"
                >
                  {(Object.keys(SORT_LABEL) as ProgramSort[]).map((s) => (
                    <option key={s} value={s}>
                      {SORT_LABEL[s]}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            {(USE_MOCK || forceMock || data.source === "MOCK") && (
              <div className="mb-3">
                <MockNote>‘예시’가 붙은 공고는 시연용으로 지어낸 공고예요. 실제로 신청할 수 없어요.</MockNote>
              </div>
            )}
            {data.items.length === 0 ? (
              <div className="py-10 text-center">
                <p className="text-[16px] text-ink-2">조건에 맞는 공고가 없어요.</p>
                <Button variant="secondary" className="mt-4" onClick={clearAll}>
                  <X size={16} aria-hidden />
                  조건 모두 지우기
                </Button>
              </div>
            ) : (
              <>
                <ul className="grid gap-3">
                  {data.items.map(({ program, reasons }) => (
                    <li key={program.id}>
                      <ProgramCard program={program} reasons={reasons} />
                    </li>
                  ))}
                </ul>
                {moreError && (
                  <p role="alert" className="mt-4 text-center text-[14px] text-ink-2">
                    공고를 더 불러오지 못했어요. 아래 버튼으로 다시 시도해 주세요.
                  </p>
                )}
                {data.total > data.items.length && (
                  <Button variant="secondary" className="mt-4 w-full" onClick={loadMore} disabled={moreLoading}>
                    {moreLoading ? "불러오는 중…" : `더 보기 (${data.total - data.items.length}개 남음)`}
                  </Button>
                )}
              </>
            )}
          </div>
        )}
      </div>
      <p className="mt-6 text-[13px] text-ink-3">추천은 조건이 맞는다는 뜻이고, 실제 지원 자격을 보장하지 않아요.</p>
    </AppShell>
  );
}
