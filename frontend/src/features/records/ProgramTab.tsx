"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Tag } from "@/components/ui/Chip";
import { useFlow } from "@/features/flow/FlowProvider";
import { ProgramProgressBar, useOpenJourney, useResume } from "@/features/journey/ProgramProgressBar";
import { PROGRESS_GROUPS, pendingVisits, programProgress, type ProgramProgress } from "@/lib/journey";
import { fmtDay, sameDay } from "./format";

// 내 기록 › 공고. 진행 중은 최근에 한 순서로, 맨 위 하나만 크게. 완료는 달별로 접어 둔다.
// 연습까지 한 공고는 카드 안에서 다녀왔는지 묻는다(홈은 한 번에 하나만 묻는다).
// 참여 체크(/journey)는 흐름에서 빠져 여기서만 연다: 마무리 단계 공고는 이어서 하기 대신, 완료한 공고는 줄 끝에.

const SHOW_ONGOING = 3;
const fmtMonth = new Intl.DateTimeFormat("ko-KR", { year: "numeric", month: "long" });
const fmtMonthOnly = new Intl.DateTimeFormat("ko-KR", { month: "long" });

type Answer = "visited" | "rested";

export function ProgramTab() {
  const { stops, snapshots, addStop } = useFlow();
  const resume = useResume();
  const openJourney = useOpenJourney();
  const [showAll, setShowAll] = useState(false);

  const all = programProgress(stops, snapshots);
  const ongoing = all.filter((p) => !p.done);
  const done = all.filter((p) => p.done);
  const asking = new Set(pendingVisits(stops).map((s) => s.programKey));
  const answer = (p: ProgramProgress, type: Answer) => addStop({ type, programKey: p.programKey, programTitle: p.programTitle });
  const shown = showAll ? ongoing : ongoing.slice(0, SHOW_ONGOING);

  if (all.length === 0)
    return (
      <div className="rounded-md bg-surface px-4 py-6 text-center">
        <p className="text-[15px] text-ink-2">아직 준비한 공고가 없어요. 공고를 고르면 여기서 이어서 할 수 있어요.</p>
        <ButtonLink href="/programs" className="mt-4 w-full">
          공고 둘러보기
        </ButtonLink>
      </div>
    );

  return (
    <>
      <section aria-labelledby="ongoing">
        <div className="flex items-baseline justify-between">
          <h2 id="ongoing" className="text-[17px] font-bold">
            진행 중 <span className="tabular-nums">{ongoing.length}</span>
          </h2>
          <span className="text-[13px] text-ink-3">최근에 한 순서</span>
        </div>
        {ongoing.length === 0 ? (
          <p className="mt-2 text-[15px] text-ink-2">지금 준비 중인 공고는 없어요.</p>
        ) : (
          <ul className="mt-3 grid gap-2">
            {shown.map((p, i) => (
              <li key={p.programKey} className={`rounded-md bg-surface px-4 py-3 ${i === 0 ? "border-2 border-ink" : "border border-line"}`}>
                <div className="flex items-center gap-2">
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-[16px] font-semibold">{p.programTitle}</h3>
                    {i > 0 && <Meta p={p} />}
                  </div>
                  {i === 0 ? (
                    // 아래에서 다녀왔는지 묻는 중이면 그 답이 이 카드의 주요 행동이다
                    <Button
                      size="sm"
                      variant={asking.has(p.programKey) ? "secondary" : "primary"}
                      onClick={() => (p.step === 3 ? openJourney(p) : resume(p))}
                    >
                      {p.step === 3 ? "참여 체크" : "이어서 하기"}
                    </Button>
                  ) : (
                    <Button size="sm" variant="quiet" className="underline" onClick={() => (p.step === 3 ? openJourney(p) : resume(p))}>
                      {p.step === 3 ? "참여 체크" : "이어서"}
                    </Button>
                  )}
                </div>
                {i === 0 && (
                  <div className="mt-2">
                    <ProgramProgressBar step={p.step} labels={false} />
                    <Meta p={p} />
                  </div>
                )}
                {asking.has(p.programKey) && (
                  <div className="mt-3 border-t border-line pt-3">
                    <p className="text-[15px] font-semibold">다녀왔나요?</p>
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      <Button size="sm" onClick={() => answer(p, "visited")}>
                        다녀왔어요
                      </Button>
                      <Button size="sm" variant="secondary" onClick={() => answer(p, "rested")}>
                        이번엔 못 갔어요
                      </Button>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
        {!showAll && ongoing.length > SHOW_ONGOING && (
          <Button variant="secondary" className="mt-2 w-full" onClick={() => setShowAll(true)}>
            진행 중 {ongoing.length - SHOW_ONGOING}개 더 보기
          </Button>
        )}
      </section>

      {done.length > 0 && (
        <section aria-labelledby="done" className="mt-8">
          <div className="flex items-baseline justify-between">
            <h2 id="done" className="text-[17px] font-bold">
              완료 <span className="tabular-nums">{done.length}</span>
            </h2>
            <span className="text-[13px] text-ink-3">달별로 접힘</span>
          </div>
          <div className="mt-2 border-b border-line">
            {byMonth(done).map(([month, list]) => (
              <details key={month} className="group border-t border-line">
                <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-2 text-[15px] font-semibold [&::-webkit-details-marker]:hidden">
                  <span>{[month, count(list, "visited", "다녀옴"), count(list, "rested", "쉬어감")].filter(Boolean).join(" · ")}</span>
                  <ChevronDown size={18} aria-hidden className="shrink-0 text-ink-3 transition-transform duration-200 group-open:rotate-180" />
                </summary>
                <ul className="divide-y divide-line pb-2">
                  {list.map((p) => (
                    <li key={p.programKey} className="flex min-h-13 flex-wrap items-center gap-x-2 gap-y-1 py-2">
                      <span className="min-w-0 flex-1 text-[16px]">{p.programTitle}</span>
                      <Button size="sm" variant="quiet" className="order-last underline" onClick={() => openJourney(p)}>
                        참여 체크
                      </Button>
                      {p.answer === "visited" ? (
                        <Tag tone="sure">다녀왔어요</Tag>
                      ) : (
                        <>
                          <Tag>쉬어갔어요</Tag>
                          {/* 미리 연습하고 나중에 다녀오는 경우가 많아서, 쉬어감은 다녀옴으로 바꿀 수 있다 */}
                          <Button size="sm" variant="quiet" onClick={() => answer(p, "visited")}>
                            다녀왔어요로 바꾸기
                          </Button>
                        </>
                      )}
                    </li>
                  ))}
                </ul>
              </details>
            ))}
          </div>
        </section>
      )}
    </>
  );
}

/** 지금 단계 · 마지막으로 한 날 */
function Meta({ p }: { p: ProgramProgress }) {
  return (
    <p className="mt-0.5 text-[13px] text-ink-3">
      {PROGRESS_GROUPS[p.step]} 단계 · <time dateTime={p.lastAt.toISOString()}>{sameDay(p.lastAt, new Date()) ? "오늘" : fmtDay.format(p.lastAt)}</time> 함
    </p>
  );
}

/** "다녀옴 2"처럼. 없으면 빈 글자(달 제목에서 빠진다). */
function count(list: ProgramProgress[], answer: Answer, label: string) {
  const n = list.filter((p) => p.answer === answer).length;
  return n ? `${label} ${n}` : "";
}

/** 완료한 공고를 답한 달로 묶는다. 최근 달부터. 올해면 연도는 뺀다. */
function byMonth(list: ProgramProgress[]): [string, ProgramProgress[]][] {
  const groups = new Map<string, { at: number; items: ProgramProgress[] }>();
  const thisYear = new Date().getFullYear();
  for (const p of list) {
    const at = p.answeredAt ?? p.lastAt;
    const key = at.getFullYear() === thisYear ? fmtMonthOnly.format(at) : fmtMonth.format(at);
    const g = groups.get(key) ?? { at: at.getTime(), items: [] };
    g.items.push(p);
    g.at = Math.max(g.at, at.getTime());
    groups.set(key, g);
  }
  return [...groups.entries()].sort((a, b) => b[1].at - a[1].at).map(([k, g]) => [k, g.items]);
}
