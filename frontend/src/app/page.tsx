"use client";

import { useEffect, useState } from "react";
import { ChevronDown, LockKeyhole } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { RouteMap } from "@/components/journey/StepPath";
import { JourneyLine } from "@/components/journey/JourneyLine";
import { ButtonLink } from "@/components/ui/Button";
import { pendingVisit } from "@/lib/journey";
import { draftStore, journeyStore, preferenceStore } from "@/lib/storage";
import type { PracticeRecord } from "@/lib/types";

export default function HomePage() {
  const [hasPref, setHasPref] = useState(false);
  const [isNew, setIsNew] = useState(true);
  const [pending, setPending] = useState<Partial<PracticeRecord> | null>(null);
  // 노선에서 "다녀왔나요?"를 묻는 중이면 그 버튼이 이 화면의 주요 행동이다
  const [askingVisit, setAskingVisit] = useState(false);

  useEffect(() => {
    setHasPref(preferenceStore.get() !== null);
    const stops = journeyStore.list();
    setIsNew(stops.length === 0);
    setAskingVisit(pendingVisit(stops) !== null);
    // 연습 전 기록만 있고 연습 후 기록이 없는 채로 앱을 떠난 경우
    const d = draftStore.get();
    setPending(d?.before && d.programId ? d : null);
  }, []);

  return (
    <AppShell>
      {pending && (
        <section aria-labelledby="pending-title" className="mt-2 rounded-md border-2 border-route bg-route-soft px-4 py-4">
          <h2 id="pending-title" className="font-semibold">
            연습 후 기록이 남아 있어요
          </h2>
          <p className="mt-1 text-[15px] text-ink-2">{pending.sceneTitle} 연습의 연습 후 마음을 기록하면 전후 비교가 완성돼요.</p>
          <ButtonLink href={`/practice/${pending.programId}/after`} className="mt-3 w-full">
            연습 후 마음 기록하기
          </ButtonLink>
        </section>
      )}

      <h1 className="pt-6 text-[28px] font-bold leading-tight">처음 가는 곳, 미리 한 번 가봐요</h1>
      <p className="mt-2 text-[16px] text-ink-2">내 속도로 준비하고, 언제든 멈춰도 괜찮아요.</p>

      {/* 안심 문구: 처음 여는 순간에 바로 보이도록 맨 위에 */}
      <p className="mt-4 flex items-start gap-2 rounded-md bg-surface px-3 py-3 text-[14px] text-ink-2">
        <LockKeyhole size={18} aria-hidden className="mt-0.5 shrink-0 text-ink" />
        <span>
          로그인 없이 써요. 내 기록은 <strong className="font-semibold text-ink">이 휴대폰에만</strong> 남고, 기관이나 누구에게도 보내지 않아요.
        </span>
      </p>

      <div className="mt-8">
        <JourneyLine />
      </div>

      <div className="mt-6 grid gap-2">
        {/* 위에 이어서 할 일(연습 후 기록, 다녀왔나요?)이 있으면 노란 버튼은 그쪽에 양보한다 */}
        <ButtonLink href={hasPref ? "/programs" : "/onboarding"} variant={pending || askingVisit ? "secondary" : "primary"}>
          {hasPref ? "추천 공고 보기" : "나에게 맞는 공고 찾기"}
        </ButtonLink>
        <ButtonLink href="/practice" variant="secondary">
          말 연습 바로 하기
        </ButtonLink>
      </div>

      <details className="group mt-10 rounded-md bg-surface px-4" open={isNew}>
        <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between font-semibold [&::-webkit-details-marker]:hidden">
          한걸음은 이렇게 써요
          <ChevronDown size={18} aria-hidden className="text-ink-3 transition-transform duration-200 group-open:rotate-180" />
        </summary>
        <div className="pb-2">
          <RouteMap />
        </div>
      </details>
    </AppShell>
  );
}
