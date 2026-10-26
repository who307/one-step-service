"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronRight, Trash2 } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { BeforeAfterChart } from "@/components/records/BeforeAfterChart";
import { ButtonLink, IconButton } from "@/components/ui/Button";
import { journeyStore, recordStore } from "@/lib/storage";
import type { PracticeRecord } from "@/lib/types";

const fmtDate = new Intl.DateTimeFormat("ko-KR", { month: "long", day: "numeric" });
const fmtDateTime = new Intl.DateTimeFormat("ko-KR", { dateStyle: "medium", timeStyle: "short" });

export default function RecordsPage() {
  const [records, setRecords] = useState<PracticeRecord[] | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [visitedCount, setVisitedCount] = useState(0);
  const [justPracticed, setJustPracticed] = useState(false);

  useEffect(() => {
    const list = recordStore.list();
    setRecords(list);
    setSelectedId(list[0]?.id ?? null);
    setVisitedCount(journeyStore.list().filter((s) => s.type === "visited").length);
    try {
      if (sessionStorage.getItem("onestep.justPracticed")) {
        setJustPracticed(true);
        sessionStorage.removeItem("onestep.justPracticed");
      }
    } catch {}
  }, []);

  const remove = (id: string) => {
    if (!confirm("이 기록을 지울까요? 지운 기록은 되돌릴 수 없어요.")) return;
    recordStore.remove(id);
    const list = recordStore.list();
    setRecords(list);
    setSelectedId(list[0]?.id ?? null);
  };

  const selected = records?.find((r) => r.id === selectedId) ?? null;

  return (
    <AppShell title="내 기록">
      {justPracticed && (
        // 온기가 켜지는 순간: 연습 한 번을 끝까지 마쳤을 때
        <div role="status" className="enter mb-4 rounded-md border-2 border-glow bg-glow-soft px-4 py-3">
          <p className="font-bold">연습 한 번을 끝까지 마쳤어요</p>
          <p className="text-[15px] text-ink-2">나의 노선에 역이 하나 생겼어요. 아래에서 연습 전후 마음을 비교해 보세요.</p>
        </div>
      )}
      <Link
        href="/visited"
        className="mb-4 flex min-h-14 items-center gap-3 rounded-md border-2 border-route bg-surface px-4 hover:bg-surface-2"
      >
        <span aria-hidden className="block size-5 shrink-0 rounded-full bg-glow" />
        <span className="min-w-0 flex-1 font-semibold">다녀온 곳</span>
        <span className="text-[15px] text-ink-2">{visitedCount}곳</span>
        <ChevronRight size={18} aria-hidden className="text-ink-3" />
      </Link>

      {records !== null && records.length === 0 ? (
        <div className="pt-16 text-center">
          <h2 className="text-[20px] font-bold">아직 남긴 기록이 없어요</h2>
          <p className="mt-2 text-ink-2">연습 전후에 마음을 기록하면 여기서 돌아볼 수 있어요.</p>
          <ButtonLink href="/programs" variant="secondary" className="mt-6">
            공고 둘러보기
          </ButtonLink>
        </div>
      ) : (
        <>
          {selected && (
            <section className="rounded-md bg-surface px-4 py-5">
              <h2 className="text-[18px] font-bold">{selected.sceneTitle}</h2>
              <p className="flex flex-wrap gap-x-3 text-[14px] text-ink-3">
                <span>{selected.programTitle}</span>
                <time dateTime={selected.createdAt}>{fmtDateTime.format(new Date(selected.createdAt))}</time>
              </p>
              <div className="mt-4">
                <BeforeAfterChart before={selected.before} after={selected.after} />
              </div>
            </section>
          )}

          <h3 className="mt-8 text-[15px] font-semibold text-ink-2">모든 기록</h3>
          <p className="text-[14px] text-ink-3">이 기기에만 저장되고, 지우면 되돌릴 수 없어요.</p>
          <ul className="mt-2 divide-y divide-line">
            {records?.map((r) => (
              <li key={r.id} className="flex items-center gap-2">
                <button
                  type="button"
                  aria-current={r.id === selectedId}
                  onClick={() => setSelectedId(r.id)}
                  className={`flex min-h-14 flex-1 flex-col items-start justify-center py-2 text-left ${r.id === selectedId ? "font-semibold" : ""}`}
                >
                  <span>{r.sceneTitle}</span>
                  <span className="text-[13px] font-normal text-ink-3">
                    <time dateTime={r.createdAt}>{fmtDate.format(new Date(r.createdAt))}</time>
                    <span className="ml-3">{r.before && r.after ? "전후 모두" : r.before ? "연습 전만" : "연습 후만"}</span>
                  </span>
                </button>
                <IconButton label={`${r.sceneTitle} 기록 지우기`} onClick={() => remove(r.id)} tone="muted">
                  <Trash2 size={18} aria-hidden />
                </IconButton>
              </li>
            ))}
          </ul>
        </>
      )}
    </AppShell>
  );
}
