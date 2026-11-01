"use client";

import { useState, type KeyboardEvent } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { useFlow } from "@/features/flow/FlowProvider";
import { ChangeTab } from "@/features/records/ChangeTab";
import { PracticeTab } from "@/features/records/PracticeTab";
import { ProgramTab } from "@/features/records/ProgramTab";
import { programProgress } from "@/lib/journey";

// 내 기록(아래 탭). 공고 · 연습 · 나의 변화 세 탭으로 나눠, 기록이 쌓여도 보고 싶은 곳으로 바로 간다.
// 탭마다 따로 스크롤하고, 오래된 것은 접어 둔다. 기록은 이 브라우저에만 남는다.

const TABS = [
  { id: "program", label: "공고" },
  { id: "practice", label: "연습" },
  { id: "change", label: "나의 변화" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export default function RecordsPage() {
  const { records, stops, snapshots, hydrated } = useFlow();
  const [tab, setTab] = useState<TabId>("program");
  const counts: Partial<Record<TabId, number>> = { program: programProgress(stops, snapshots).length, practice: records.length };

  // 화살표 키로 탭 사이를 옮긴다(탭 목록 키보드 규칙)
  const onKey = (e: KeyboardEvent) => {
    const step = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    if (!step) return;
    const next = TABS[(TABS.findIndex((t) => t.id === tab) + step + TABS.length) % TABS.length].id;
    setTab(next);
    document.getElementById(`tab-${next}`)?.focus();
  };

  return (
    <AppShell>
      <h1 className="pb-3 pt-2 text-[24px] font-bold leading-snug">내 기록</h1>
      <div role="tablist" aria-label="내 기록" onKeyDown={onKey} className="sticky top-14 z-[5] -mx-4 grid grid-cols-3 border-b border-line bg-paper px-4">
        {TABS.map((t) => {
          const active = t.id === tab;
          return (
            <button
              key={t.id}
              id={`tab-${t.id}`}
              type="button"
              role="tab"
              aria-selected={active}
              aria-controls="records-panel"
              tabIndex={active ? 0 : -1}
              onClick={() => setTab(t.id)}
              className={`relative min-h-12 text-[15px] ${active ? "font-bold text-ink" : "text-ink-3 hover:text-ink"}`}
            >
              {t.label}
              {counts[t.id] !== undefined && <span className="ml-1 tabular-nums">{counts[t.id]}</span>}
              {active && <span aria-hidden className="absolute inset-x-3 bottom-0 h-[3px] rounded-t-full bg-route" />}
            </button>
          );
        })}
      </div>

      <div id="records-panel" role="tabpanel" aria-labelledby={`tab-${tab}`} className="pt-4">
        {/* 저장된 기록을 불러온 뒤에 그린다(연습 탭의 처음 펼친 카드가 맞게 잡히도록) */}
        {hydrated && (tab === "program" ? <ProgramTab /> : tab === "practice" ? <PracticeTab /> : <ChangeTab />)}
      </div>
    </AppShell>
  );
}
