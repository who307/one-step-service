"use client";

import { ChevronRight } from "lucide-react";
import { AppShell, ScreenTitle } from "@/components/layout/AppShell";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Tag } from "@/components/ui/Chip";
import { useFlow, type JourneyStop, type Mood, type PracticeRecord } from "@/features/flow/FlowProvider";
import { pendingVisits } from "@/lib/journey";
import { levelInfo, sceneTitle } from "@/lib/labels";

// 내 기록(아래 탭). 이번 이용 동안의 말 연습과 걸음을 모아 본다. 메모리에만 있고 새로고침하면 지워진다.
// 점수 변화는 좋고 나쁨으로 해석하지 않고, 적은 숫자를 나란히 보여주기만 한다.
// 다녀왔는지 아직 답하지 않은 공고를 모두 모아 여기서 답한다(홈은 한 번에 하나만 묻는다).

const fmtTime = new Intl.DateTimeFormat("ko-KR", { month: "long", day: "numeric", hour: "numeric", minute: "2-digit" });
const fmtDay = new Intl.DateTimeFormat("ko-KR", { month: "long", day: "numeric" });

type Answer = "visited" | "rested";

/** 답한 공고: 지금 묻는 중인 공고는 빼고, 한 번이라도 다녀왔으면 다녀옴. 최근에 답한 순서. */
function answeredVisits(stops: JourneyStop[], pendingKeys: Set<string>) {
  const byKey = new Map<string, { programKey: string; programTitle: string; answer: Answer }>();
  for (let i = stops.length - 1; i >= 0; i--) {
    const s = stops[i];
    if ((s.type !== "visited" && s.type !== "rested") || pendingKeys.has(s.programKey)) continue;
    const prev = byKey.get(s.programKey);
    if (!prev) byKey.set(s.programKey, { programKey: s.programKey, programTitle: s.programTitle, answer: s.type });
    else if (s.type === "visited") prev.answer = "visited";
  }
  return [...byKey.values()];
}

export default function RecordsPage() {
  const { state, records, stops, addStop } = useFlow();
  const visited = stops.filter((s) => s.type === "visited").length;
  const list = [...records].reverse();
  const pending = pendingVisits(stops);
  const answered = answeredVisits(stops, new Set(pending.map((s) => s.programKey)));
  const answer = (s: { programKey: string; programTitle: string }, type: Answer) =>
    addStop({ type, programKey: s.programKey, programTitle: s.programTitle });

  return (
    <AppShell>
      <ScreenTitle sub="이번에 연습한 것과 지나온 걸음이에요. 새로고침하면 지워져요.">내 기록</ScreenTitle>

      <dl className="grid grid-cols-3 gap-2 text-center">
        <Stat label="말 연습" value={`${records.length}번`} />
        <Stat label="지나온 역" value={`${stops.length}개`} />
        <Stat label="다녀온 곳" value={`${visited}곳`} />
      </dl>

      {state.timeline && (
        <ButtonLink href="/journey" variant="secondary" className="mt-4 w-full justify-between">
          <span className="min-w-0 truncate">준비 중: {state.timeline.program.title}</span>
          <ChevronRight size={18} aria-hidden className="shrink-0" />
        </ButtonLink>
      )}

      {pending.length > 0 && (
        <section aria-labelledby="pending-visits" className="mt-8">
          <h2 id="pending-visits" className="text-[17px] font-bold">
            다녀왔는지 알려주세요 <span className="tabular-nums text-ink-2">{pending.length}</span>
          </h2>
          <p className="mt-1 text-[15px] text-ink-2">미리 연습한 공고예요. 다녀온 뒤에 답해도 괜찮아요.</p>
          <ul className="mt-3 grid gap-3">
            {pending.map((s) => (
              <li key={s.programKey} className="rounded-md border-2 border-route bg-surface p-4">
                <h3 className="text-[16px] font-semibold">{s.programTitle}</h3>
                <p className="mt-0.5 text-[13px] text-ink-3">
                  <time dateTime={s.at.toISOString()}>{fmtDay.format(s.at)}</time>에 연습했어요
                </p>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <Button size="sm" onClick={() => answer(s, "visited")}>
                    다녀왔어요
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => answer(s, "rested")}>
                    이번엔 못 갔어요
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {answered.length > 0 && (
        <section aria-labelledby="visit-records" className="mt-8">
          <h2 id="visit-records" className="text-[17px] font-bold">
            참여 기록
          </h2>
          <ul className="mt-3 divide-y divide-line border-y border-line">
            {answered.map((v) => (
              <li key={v.programKey} className="flex min-h-13 flex-wrap items-center gap-x-2 gap-y-1 py-2">
                <span className="min-w-0 flex-1 text-[16px]">{v.programTitle}</span>
                {v.answer === "visited" ? (
                  <Tag tone="sure">다녀왔어요</Tag>
                ) : (
                  <>
                    <Tag>쉬어갔어요</Tag>
                    {/* 미리 연습하고 나중에 다녀오는 경우가 많아서, 쉬어감은 다녀옴으로 바꿀 수 있다 */}
                    <Button size="sm" variant="quiet" onClick={() => answer(v, "visited")}>
                      다녀왔어요로 바꾸기
                    </Button>
                  </>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="practice-records" className="mt-8">
        <h2 id="practice-records" className="text-[17px] font-bold">
          연습 기록
        </h2>
        {list.length === 0 ? (
          <div className="mt-3 rounded-md bg-surface px-4 py-6 text-center">
            <p className="text-[15px] text-ink-2">아직 연습 기록이 없어요. 짧은 연습 한 번도 기록이 돼요.</p>
            <ButtonLink href="/practice" className="mt-4 w-full">
              말 연습 하러 가기
            </ButtonLink>
          </div>
        ) : (
          <ul className="mt-3 grid gap-3">
            {list.map((r) => (
              <RecordCard key={r.id} r={r} />
            ))}
          </ul>
        )}
      </section>
    </AppShell>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-surface px-2 py-3">
      <dt className="text-[13px] text-ink-3">{label}</dt>
      <dd className="mt-0.5 text-[20px] font-bold tabular-nums">{value}</dd>
    </div>
  );
}

function RecordCard({ r }: { r: PracticeRecord }) {
  return (
    <li className="rounded-md border border-line bg-surface p-4">
      <div className="flex flex-wrap items-center gap-1.5">
        <h3 className="mr-1 text-[16px] font-semibold">{sceneTitle(r.sceneId)}</h3>
        <Tag>
          {r.level} {levelInfo(r.level).title}
        </Tag>
        {r.endedEarly && <Tag>중간에 멈춤</Tag>}
      </div>
      <p className="mt-0.5 text-[13px] text-ink-3">
        {r.programTitle ?? "공고 없이 일반 상황"} · <time dateTime={r.at.toISOString()}>{fmtTime.format(r.at)}</time>
      </p>
      {r.summary && <p className="mt-2 text-[15px] text-ink-2">{r.summary}</p>}
      <dl className="mt-3 grid grid-cols-2 gap-2">
        <Change label="불안도" k="anxiety" before={r.before} after={r.after} />
        <Change label="참여 의향" k="intent" before={r.before} after={r.after} />
      </dl>
    </li>
  );
}

function Change({ label, k, before, after }: { label: string; k: keyof Mood; before: Mood | null; after: Mood | null }) {
  const b = before?.[k] ?? null;
  const a = after?.[k] ?? null;
  return (
    <div className="rounded-sm bg-surface-2 px-3 py-2">
      <dt className="text-[13px] text-ink-3">{label}</dt>
      <dd className="text-[17px] font-semibold tabular-nums">
        {b ?? "–"} <span className="text-ink-3">→</span> {a ?? "–"}
        {b === null && a === null && <span className="ml-1 text-[13px] font-normal text-ink-3">기록 안 함</span>}
      </dd>
    </div>
  );
}
