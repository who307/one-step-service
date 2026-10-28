import { DoorOpen, House, Quote, Sparkles, UserRound, type LucideIcon } from "lucide-react";
import { Tag } from "@/components/ui/Chip";
import type { Phase, TimelineStep } from "@/types/api";

const ICON: Record<Phase, LucideIcon> = { ARRIVE: DoorOpen, CHECKIN: UserRound, ACTIVITY: Sparkles, LEAVE: House };

/** 확인됨/예상 라벨. 색만으로 구분하지 않게 글자와 모양(테두리)을 같이 바꾼다. */
export function SourceLabel({ label }: { label: TimelineStep["label"] }) {
  return label === "CONFIRMED" ? <Tag tone="sure">공고에서 확인</Tag> : <Tag tone="unsure">예상</Tag>;
}

// 도착 → 접수 → 활동 → 귀가. 서비스 노선 모양 그대로 세로로 그린다.
export function TimelineView({ steps }: { steps: TimelineStep[] }) {
  return (
    <ol className="relative grid gap-3 pl-8" aria-label="참여 순서">
      <span aria-hidden className="absolute bottom-6 left-[11px] top-6 w-1 rounded-full bg-gradient-to-b from-route to-glow" />
      {steps.map((s) => {
        const Icon = ICON[s.phase];
        return (
          <li key={s.phase} className="relative">
            <span aria-hidden className="absolute -left-8 top-5 size-6 rounded-full border-[3px] border-route bg-surface" />
            <article
              className={`rounded-md border bg-surface p-4 ${s.label === "CONFIRMED" ? "border-line" : "border-dashed border-ink-3/50"}`}
            >
              <header className="flex items-center gap-2">
                <Icon size={20} aria-hidden className="shrink-0 text-ink-2" />
                <h3 className="flex-1 text-[17px] font-bold">{s.title}</h3>
                <SourceLabel label={s.label} />
              </header>
              <p className="mt-1.5 text-[15px] text-ink-2">{s.description}</p>
              {(s.time || s.place) && (
                <dl className="mt-2 grid grid-cols-[2.5rem_1fr] gap-x-2 text-[14px]">
                  {s.time && (
                    <>
                      <dt className="text-ink-3">시간</dt>
                      <dd>{s.time}</dd>
                    </>
                  )}
                  {s.place && (
                    <>
                      <dt className="text-ink-3">장소</dt>
                      <dd className="min-w-0">{s.place}</dd>
                    </>
                  )}
                </dl>
              )}
              {s.sourceQuote && (
                <blockquote className="mt-3 flex gap-2 rounded-sm bg-surface-2 px-3 py-2 text-[13px] text-ink-2">
                  <Quote size={14} aria-hidden className="mt-0.5 shrink-0" />
                  <span>
                    <span className="sr-only">공고 원문: </span>
                    {s.sourceQuote}
                  </span>
                </blockquote>
              )}
            </article>
          </li>
        );
      })}
    </ol>
  );
}
