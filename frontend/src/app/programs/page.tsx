"use client";

import { useEffect, useState } from "react";
import { SlidersHorizontal } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { ProgramCard } from "@/components/program/ProgramCard";
import { ButtonLink } from "@/components/ui/Button";
import { getRecommendations } from "@/lib/api/programs";
import { preferenceStore } from "@/lib/storage";
import type { Recommendation, UserPreference } from "@/lib/types";

export default function ProgramsPage() {
  const [recs, setRecs] = useState<Recommendation[] | null>(null);
  const [pref, setPref] = useState<UserPreference | null>(null);

  useEffect(() => {
    const p = preferenceStore.get();
    setPref(p);
    getRecommendations(p).then(setRecs);
  }, []);

  return (
    <AppShell title="공고">
      <div className="flex items-start justify-between gap-3 pt-2">
        <div className="min-w-0">
          <h2 className="text-[22px] font-bold">{pref ? "고른 조건에 가까운 순서예요" : "참여할 수 있는 공고"}</h2>
          <p className="mt-1 text-[14px] text-ink-3">공고의 공식 정보와 내가 고른 조건을 비교했어요.</p>
        </div>
        <ButtonLink href="/onboarding" variant="secondary" size="sm" className="shrink-0">
          <SlidersHorizontal size={16} aria-hidden />
          조건 바꾸기
        </ButtonLink>
      </div>

      <ul className="mt-5 space-y-3" aria-busy={recs === null}>
        {recs === null
          ? [0, 1].map((i) => <li key={i} aria-hidden className="h-40 animate-pulse rounded-md bg-surface-2" />)
          : recs.map((r) => (
              <li key={r.program.id}>
                <ProgramCard rec={r} />
              </li>
            ))}
      </ul>

      <p className="mt-6 text-[14px] text-ink-3">
        추천은 참여 가능 여부나 선정 가능성을 판단하지 않아요. 확인되지 않은 조건은 ‘부담 없음’으로 계산하지 않아요.
      </p>
    </AppShell>
  );
}
