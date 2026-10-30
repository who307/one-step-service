"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Tag } from "@/components/ui/Chip";
import { useFlow, type Mood, type PracticeRecord } from "@/features/flow/FlowProvider";
import { levelInfo, sceneTitle } from "@/lib/labels";
import { fmtTime } from "./format";

// 내 기록 › 연습. 공고별로 거르고, 카드는 한 줄로 접어 둔다. 누르면 요약과 마음 변화가 펼쳐진다.
// 점수 변화는 좋고 나쁨으로 해석하지 않고, 적은 숫자를 나란히 보여주기만 한다.

const PAGE = 5;
const ALL = "__all";
const GENERAL = "__general";

export function PracticeTab() {
  const router = useRouter();
  const { records, resume, reset, update } = useFlow();
  const [filter, setFilter] = useState(ALL);
  const [newest, setNewest] = useState(true);
  const [count, setCount] = useState(PAGE);
  // 처음에는 가장 최근 연습 하나를 펼쳐 둔다
  const [openId, setOpenId] = useState<number | null>(() => records.reduce<PracticeRecord | null>((m, r) => (!m || r.at > m.at ? r : m), null)?.id ?? null);

  if (records.length === 0)
    return (
      <div className="rounded-md bg-surface px-4 py-6 text-center">
        <p className="text-[15px] text-ink-2">아직 연습 기록이 없어요. 짧은 연습 한 번도 기록이 돼요.</p>
        <ButtonLink href="/practice" className="mt-4 w-full">
          말 연습 하러 가기
        </ButtonLink>
      </div>
    );

  const titles = [...new Set(records.map((r) => r.programTitle).filter((t): t is string => t !== null))];
  const hasGeneral = records.some((r) => r.programTitle === null);
  const filtered = records.filter((r) => filter === ALL || (filter === GENERAL ? r.programTitle === null : r.programTitle === filter));
  const sorted = [...filtered].sort((a, b) => (newest ? b.at.getTime() - a.at.getTime() : a.at.getTime() - b.at.getTime()));
  const shown = sorted.slice(0, count);

  // 같은 장면·난이도를 미리 골라 둔 채 연습 설정으로. 공고 연습이면 그 공고를 되살린다.
  const again = (r: PracticeRecord) => {
    if (!(r.programKey && resume(r.programKey))) reset();
    update({ sceneId: r.sceneId, level: r.level });
    router.push("/practice");
  };

  return (
    <>
      <div className="flex gap-2">
        <Select label="공고로 거르기" value={filter} onChange={(v) => {
            setFilter(v);
            setCount(PAGE);
          }} className="min-w-0 flex-1">
          <option value={ALL}>공고: 전체</option>
          {titles.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
          {hasGeneral && <option value={GENERAL}>공고 없이 연습</option>}
        </Select>
        <Select label="정렬" value={newest ? "new" : "old"} onChange={(v) => setNewest(v === "new")}>
          <option value="new">최신순</option>
          <option value="old">오래된순</option>
        </Select>
      </div>

      <ul className="mt-3 grid gap-2">
        {shown.map((r) => (
          <RecordCard key={r.id} r={r} open={openId === r.id} onToggle={() => setOpenId(openId === r.id ? null : r.id)} onAgain={() => again(r)} />
        ))}
      </ul>

      {sorted.length > count && (
        <Button variant="secondary" className="mt-2 w-full" onClick={() => setCount((c) => c + PAGE)}>
          {sorted.length - count}개 더 보기
        </Button>
      )}
    </>
  );
}

function Select({ label, value, onChange, className = "", children }: { label: string; value: string; onChange: (v: string) => void; className?: string; children: React.ReactNode }) {
  return (
    <label className={`relative ${className}`}>
      <span className="sr-only">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="min-h-11 w-full appearance-none truncate rounded-md border border-line bg-surface py-2 pl-3 pr-8 text-[14px] font-medium text-ink hover:border-ink-3"
      >
        {children}
      </select>
      <ChevronDown size={16} aria-hidden className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-3" />
    </label>
  );
}

function RecordCard({ r, open, onToggle, onAgain }: { r: PracticeRecord; open: boolean; onToggle: () => void; onAgain: () => void }) {
  const panelId = `record-${r.id}`;
  return (
    <li className={`rounded-md bg-surface ${open ? "border-2 border-ink" : "border border-line"}`}>
      <button type="button" aria-expanded={open} aria-controls={panelId} onClick={onToggle} className="flex w-full items-center gap-2 px-4 py-3 text-left">
        <span className="min-w-0 flex-1">
          <span className="block text-[15px] font-semibold">
            {sceneTitle(r.sceneId)} · {levelInfo(r.level).title}
          </span>
          <span className="block truncate text-[13px] text-ink-3">{r.programTitle ?? "연습만 하기"}</span>
        </span>
        <time dateTime={r.at.toISOString()} className="shrink-0 text-[12px] text-ink-3">
          {fmtTime.format(r.at)}
        </time>
        <ChevronDown size={18} aria-hidden className={`shrink-0 text-ink-3 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div id={panelId} className="px-4 pb-4">
          {r.endedEarly && <Tag>중간에 멈춤</Tag>}
          {r.summary && <p className="mt-1 text-[15px] text-ink-2">{r.summary}</p>}
          <dl className="mt-3 grid grid-cols-2 gap-2">
            <Change label="불안도" k="anxiety" before={r.before} after={r.after} />
            <Change label="참여 의향" k="intent" before={r.before} after={r.after} />
          </dl>
          <Button size="sm" className="mt-3" onClick={onAgain}>
            같은 장면 다시 연습
          </Button>
        </div>
      )}
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
