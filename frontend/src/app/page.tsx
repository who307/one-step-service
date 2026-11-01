"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BookOpen, ChevronRight, MessageCircle, Search } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/Button";
import { useFlow } from "@/features/flow/FlowProvider";
import { hasSeenGuide } from "@/features/guide/seen";
import { ProgramProgressBar, useResume } from "@/features/journey/ProgramProgressBar";
import { VisitAsk } from "@/features/journey/VisitAsk";
import { PROGRESS_GROUPS, pendingVisit, programProgress } from "@/lib/journey";

// S0 시작(오늘).
// 위에서부터: 다녀왔나요?(답할 공고가 있을 때) → 이어서 하기(준비 중인 공고가 있을 때) → 새로 시작하기 입구 → 안내서 다시 보기.
// 처음 온 사람은 안내서(/guide)로 먼저 보낸다. 위쪽 "도움"은 상담 전화 안내이고 안내서와 따로다.
export default function StartPage() {
  const router = useRouter();
  const { state, reset, stops, records, snapshots, hydrated } = useFlow();
  const resumeProgram = useResume();
  const [guideChecked, setGuideChecked] = useState(false);

  useEffect(() => {
    if (hasSeenGuide()) setGuideChecked(true);
    else router.replace("/guide");
  }, [router]);

  // 안내서로 보내는 동안, 저장된 기록을 불러오는 동안 홈이 잠깐 다른 모습으로 보이지 않게
  if (!guideChecked || !hydrated) return null;

  const inProgress = state.program !== null || state.noticeText !== "";
  const returning = stops.length > 0 || records.length > 0;
  // 위에서 다녀왔는지 묻는 공고는 이어서 하기에 또 띄우지 않는다
  const asking = pendingVisit(stops)?.programKey;
  const current = programProgress(stops, snapshots).find((p) => !p.done && p.programKey !== asking) ?? null;

  return (
    <AppShell>
      {returning ? (
        <h1 className="pt-6 text-[24px] font-bold leading-tight">다시 왔네요, 반가워요</h1>
      ) : (
        <>
          <h1 className="pt-6 text-[28px] font-bold leading-tight">처음 가는 곳, 미리 한 번 가봐요</h1>
          <p className="mt-2 text-[16px] text-ink-2">내 속도로 준비하고, 언제든 멈춰도 괜찮아요.</p>
        </>
      )}

      <div className="mt-5 grid gap-3">
        <VisitAsk />

        {current && (
          <section aria-labelledby="resume-title" className="rounded-md bg-ink px-4 py-4 text-paper">
            <p className="text-[13px] text-surface-2">준비 중인 공고</p>
            <h2 id="resume-title" className="mt-0.5 text-[18px] font-bold">
              {current.programTitle}
            </h2>
            <div className="mt-3">
              <ProgramProgressBar step={current.step} tone="dark" />
            </div>
            <Button className="mt-4 w-full" onClick={() => resumeProgram(current)}>
              {PROGRESS_GROUPS[current.step]}부터 이어서 하기
            </Button>
          </section>
        )}
      </div>

      <h2 className="mt-8 text-[17px] font-bold">새로 시작하기</h2>
      <div className="mt-3 grid gap-2">
        <Entry href="/programs" icon={<Search size={20} aria-hidden />} title="프로그램 찾아보기" desc="공고 고르고 처음부터 준비" onClick={inProgress ? reset : undefined} />
        {/* 공고 없는 연습이 되도록, 준비 중인 공고는 비운다(이어서 하기로 다시 돌아올 수 있다) */}
        <Entry href="/practice" icon={<MessageCircle size={20} aria-hidden />} title="말 연습만 하기" desc="공고 없이 첫마디만 연습" onClick={reset} />
      </div>

      <Link href="/guide" className="press mt-8 flex min-h-12 items-center gap-2 rounded-md bg-surface px-4 text-[15px] font-semibold hover:bg-surface-2">
        <BookOpen size={18} aria-hidden className="shrink-0" />
        <span className="flex-1">한걸음 사용법 다시 보기</span>
        <ChevronRight size={18} aria-hidden className="shrink-0 text-ink-3" />
      </Link>
    </AppShell>
  );
}

/** 새로 시작하기 입구 하나: 무엇을 하는지 한 줄로 */
function Entry({ href, icon, title, desc, onClick }: { href: string; icon: ReactNode; title: string; desc: string; onClick?: () => void }) {
  return (
    <Link href={href} onClick={onClick} className="press flex min-h-16 items-center gap-3 rounded-md border border-line bg-surface px-3 py-3 hover:border-ink-3">
      <span className="grid size-10 shrink-0 place-items-center rounded-md bg-route-soft text-ink">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-[16px] font-semibold">{title}</span>
        <span className="block text-[14px] text-ink-2">{desc}</span>
      </span>
      <ChevronRight size={18} aria-hidden className="shrink-0 text-ink-3" />
    </Link>
  );
}
