"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Tag } from "@/components/ui/Chip";
import { getPrograms } from "@/lib/api/programs";
import { SHOW_SAMPLE_TAG } from "@/lib/labels";
import type { Program } from "@/lib/types";

// 말 연습 바로가기. 어떤 공고를 준비하는지만 고르면 장면 선택으로 간다.
export default function PracticeEntryPage() {
  const [programs, setPrograms] = useState<Program[] | null>(null);

  useEffect(() => {
    getPrograms().then(setPrograms);
  }, []);

  return (
    <AppShell title="말 연습">
      <h2 className="pt-2 text-[22px] font-bold">어디에 갈 준비를 할까요?</h2>
      <p className="mt-1 text-[15px] text-ink-2">공고를 고르면 걱정되는 장면을 골라 연습 상대와 대화해요.</p>

      <ul className="mt-5 divide-y divide-line rounded-md bg-surface" aria-busy={programs === null}>
        {programs === null
          ? [0, 1].map((i) => <li key={i} aria-hidden className="h-16 animate-pulse" />)
          : programs.map((p) => (
              <li key={p.id}>
                <Link href={`/practice/${p.id}`} className="flex min-h-16 items-center gap-3 px-4 py-3 hover:bg-surface-2">
                  <span className="min-w-0 flex-1">
                    <span className="flex min-w-0 items-center gap-2">
                      <span className="truncate font-semibold">{p.title}</span>
                      {SHOW_SAMPLE_TAG && p.sample && <Tag>예시</Tag>}
                    </span>
                    <span className="block text-[14px] text-ink-3">{p.organization}</span>
                  </span>
                  <ChevronRight size={20} aria-hidden className="shrink-0 text-ink-3" />
                </Link>
              </li>
            ))}
      </ul>
    </AppShell>
  );
}
