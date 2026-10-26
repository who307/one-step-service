"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronRight, Trash2 } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { ButtonLink } from "@/components/ui/Button";
import { getPrograms } from "@/lib/api/programs";
import { heatColor } from "@/lib/journey";
import { journeyStore } from "@/lib/storage";
import type { JourneyStop, Program } from "@/lib/types";

const fmtDate = new Intl.DateTimeFormat("ko-KR", { year: "numeric", month: "long", day: "numeric" });

// 내가 다녀온 곳. "나의 노선"의 큰 역(visited)만 모아 최근 순으로 보여준다.
export default function VisitedPage() {
  const [stops, setStops] = useState<JourneyStop[] | null>(null);
  const [programs, setPrograms] = useState<Program[]>([]);

  useEffect(() => {
    setStops(journeyStore.list());
    getPrograms().then(setPrograms);
  }, []);

  const visited = (stops ?? []).filter((s) => s.type === "visited").reverse();
  const practiceCount = (programId: string) => (stops ?? []).filter((s) => s.type === "practice" && s.programId === programId).length;

  const remove = (s: JourneyStop) => {
    if (!confirm(`‘${s.programTitle}’ 다녀온 기록을 지울까요? 잘못 눌렀을 때만 지워 주세요.`)) return;
    journeyStore.remove(s.id);
    setStops(journeyStore.list());
  };

  return (
    <AppShell title="다녀온 곳" back="/">
      {stops !== null && visited.length === 0 ? (
        <div className="pt-16 text-center">
          <h2 className="text-[20px] font-bold">아직 다녀온 곳이 없어요</h2>
          <p className="mt-2 text-ink-2">활동에 다녀온 뒤 홈의 나의 노선에서 ‘다녀왔어요’를 누르면 여기에 모여요.</p>
          <ButtonLink href="/programs" variant="secondary" className="mt-6">
            공고 둘러보기
          </ButtonLink>
        </div>
      ) : (
        <>
          <h2 className="pt-2 text-[22px] font-bold">{visited.length}곳에 다녀왔어요</h2>
          <p className="mt-1 text-[15px] text-ink-2">한 곳 한 곳이 내가 직접 내디딘 걸음이에요.</p>

          <ol className="relative mt-6" aria-label="다녀온 곳, 최근 순">
            {/* 최근(위)일수록 따뜻하게: 노선이 아래 노랑에서 위 주황으로 데워진다 */}
            {visited.length > 1 && (
              <span
                aria-hidden
                className="absolute bottom-8 left-2.75 top-8 w-1"
                style={{ background: "linear-gradient(to top, var(--route), var(--glow))" }}
              />
            )}
            {visited.map((s, idx) => {
              const p = programs.find((x) => x.id === s.programId);
              const count = practiceCount(s.programId);
              return (
                <li key={s.id} className="relative grid grid-cols-[24px_1fr] gap-x-3 pb-3">
                  <span className="flex justify-center pt-5">
                    <span
                      aria-hidden
                      className="relative z-1 block size-6 rounded-full"
                      style={{ background: heatColor((visited.length - idx) / visited.length), boxShadow: "0 0 0 4px var(--glow-soft)" }}
                    />
                  </span>
                  <div className="flex min-w-0 items-stretch rounded-md bg-surface">
                    <Link href={`/programs/${s.programId}`} className="flex min-w-0 flex-1 items-center gap-2 rounded-l-md px-4 py-3 hover:bg-surface-2">
                      <span className="min-w-0 flex-1">
                        <span className="block font-semibold">{s.programTitle}</span>
                        {p && <span className="block text-[14px] text-ink-3">{p.organization}</span>}
                        <span className="mt-1 flex flex-wrap gap-x-3 text-[13px] text-ink-3">
                          <time dateTime={s.createdAt}>{fmtDate.format(new Date(s.createdAt))}</time>
                          {count > 0 && <span>미리 연습 {count}번</span>}
                        </span>
                      </span>
                      <ChevronRight size={18} aria-hidden className="shrink-0 text-ink-3" />
                    </Link>
                    <button
                      type="button"
                      onClick={() => remove(s)}
                      aria-label={`${s.programTitle} 다녀온 기록 지우기`}
                      className="press grid w-12 shrink-0 place-items-center rounded-r-md border-l border-line text-ink-3 hover:bg-surface-2 hover:text-ink"
                    >
                      <Trash2 size={18} aria-hidden />
                    </button>
                  </div>
                </li>
              );
            })}
          </ol>

          <p className="mt-4 text-[14px] text-ink-3">이 기록은 이 휴대폰에만 있어요.</p>
        </>
      )}
    </AppShell>
  );
}
