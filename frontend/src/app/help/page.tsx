"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { HeartHandshake, Phone } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { ButtonLink } from "@/components/ui/Button";
import { HELP_LINES } from "@/components/layout/HelpSheet";

// S-C 위기 안내. 연습을 평가하거나 진단하지 않고, 공식 도움 창구로 연결만 한다.
export default function HelpPage() {
  return (
    <Suspense>
      <Help />
    </Suspense>
  );
}

function Help() {
  const fromPractice = useSearchParams().get("from") === "practice";
  return (
    <AppShell back="/">
      <div className="flex flex-col items-center pt-8 text-center">
        <HeartHandshake size={44} aria-hidden className="text-station" />
        <h1 className="mt-4 text-[24px] font-bold">지금은 잠시 쉬어가요</h1>
        <p className="mt-2 text-[16px] text-ink-2">
          {fromPractice ? "연습을 멈췄어요. " : ""}지금은 전문적인 도움이 필요할 수 있어요. 아래 공식 도움 창구에 바로 전화할 수 있어요.
        </p>
      </div>

      <ul className="mt-8 grid gap-2">
        {HELP_LINES.map((l) => (
          <li key={l.tel}>
            <a href={`tel:${l.tel}`} className="press flex min-h-16 items-center gap-3 rounded-md border-2 border-line bg-surface px-4 py-2 hover:border-ink">
              <span className="grid size-10 shrink-0 place-items-center rounded-full bg-route-soft">
                <Phone size={18} aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold">{l.name}</span>
                <span className="text-[14px] text-ink-3">{l.hours}</span>
              </span>
              <span className="text-[19px] font-bold tabular-nums">{l.number}</span>
            </a>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-[14px] text-ink-2">위급하면 112(경찰)나 119(구급)에 바로 연락해 주세요.</p>
      <p className="mt-2 text-[14px] text-ink-3">방금 나눈 대화는 저장하지 않았어요.</p>

      <ButtonLink href="/" variant="secondary" className="mt-8 w-full">
        처음으로 돌아가기
      </ButtonLink>
    </AppShell>
  );
}
