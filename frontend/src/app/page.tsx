"use client";

import Link from "next/link";
import { ChevronDown, ChevronRight, LockKeyhole } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { ButtonLink } from "@/components/ui/Button";
import { useFlow } from "@/features/flow/FlowProvider";
import { JourneyLine } from "@/features/journey/JourneyLine";
import { heatColor, pendingVisit } from "@/lib/journey";

// 한걸음으로 준비하는 순서. 첫 역만 바로 갈 수 있고, 나머지는 공고를 고르면 차례로 열린다.
const STEPS = [
  { label: "공고 고르기", desc: "청년 프로그램 공고를 보거나, 가진 공고문을 붙여넣어요", href: "/programs" },
  { label: "참여 미리보기", desc: "도착부터 귀가까지, 참여하는 날을 미리 걸어봐요" },
  { label: "말 연습", desc: "AI 연습 상대에게 첫마디를 말해봐요" },
  { label: "다녀오기", desc: "연습 전후 마음을 비교하고, 실제 참여는 직접 체크해요" },
] as const;

/** 세로 노선도: 처음 온 사람에게 전체 순서를 한눈에 */
function RouteMap() {
  return (
    <ol className="relative" aria-label="준비 단계">
      <span aria-hidden className="absolute bottom-6 left-[7px] top-6 w-1.5 rounded-full" style={{ background: "linear-gradient(var(--route), var(--glow))" }} />
      {STEPS.map((s, i) => {
        const body = (
          <>
            <span className="pt-[3px]">
              <span
                aria-hidden
                className="relative z-[1] block size-5 shrink-0 rounded-full border-[4px] bg-surface"
                style={{ borderColor: heatColor(i / (STEPS.length - 1)) }}
              />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[17px] font-semibold">{s.label}</span>
              <span className="block text-[15px] text-ink-2">{s.desc}</span>
            </span>
          </>
        );
        return (
          <li key={s.label} className="relative">
            {"href" in s ? (
              <Link href={s.href} className="flex items-start gap-4 rounded-md py-3 pr-2 hover:bg-surface-2">
                {body}
                <ChevronRight size={20} aria-hidden className="mt-1 shrink-0 text-ink-3" />
              </Link>
            ) : (
              <div className="flex items-start gap-4 py-3 pr-2">{body}</div>
            )}
          </li>
        );
      })}
    </ol>
  );
}

// S0 시작. 나의 노선과 시작 버튼.
export default function StartPage() {
  const { state, reset, stops } = useFlow();
  const inProgress = state.program !== null || state.noticeText !== "";
  // 노선에서 "다녀왔나요?"를 묻는 중이면 그 버튼이 이 화면의 주요 행동이다
  const askingVisit = pendingVisit(stops) !== null;

  return (
    <AppShell>
      <h1 className="pt-6 text-[28px] font-bold leading-tight">처음 가는 곳, 미리 한 번 가봐요</h1>
      <p className="mt-2 text-[16px] text-ink-2">내 속도로 준비하고, 언제든 멈춰도 괜찮아요.</p>

      {/* 안심 문구: 처음 여는 순간에 바로 보이도록 맨 위에 */}
      <p className="mt-4 flex items-start gap-2 rounded-md bg-surface px-3 py-3 text-[14px] text-ink-2">
        <LockKeyhole size={18} aria-hidden className="mt-0.5 shrink-0 text-ink" />
        <span>
          로그인 없이 써요. 입력한 내용은 <strong className="font-semibold text-ink">어디에도 저장하지 않고</strong>, 새로고침하면 모두 지워져요.
        </span>
      </p>

      <div className="mt-8">
        <JourneyLine />
      </div>

      <div className="mt-6 grid gap-2">
        <ButtonLink href="/programs" variant={askingVisit ? "secondary" : "primary"} onClick={inProgress ? reset : undefined}>
          시작하기
        </ButtonLink>
        <ButtonLink href="/notice" variant="secondary" onClick={inProgress ? reset : undefined}>
          가진 공고문 붙여넣기
        </ButtonLink>
      </div>

      <details className="group mt-10 rounded-md bg-surface px-4" open={stops.length === 0}>
        <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between font-semibold [&::-webkit-details-marker]:hidden">
          한걸음은 이렇게 써요
          <ChevronDown size={18} aria-hidden className="text-ink-3 transition-transform duration-200 group-open:rotate-180" />
        </summary>
        <div className="pb-2">
          <RouteMap />
          <Link href="/about" className="inline-flex min-h-11 items-center text-[15px] text-ink-2 underline underline-offset-4 hover:text-ink">
            이용 안내 더 보기
          </Link>
        </div>
      </details>
    </AppShell>
  );
}
