// 준비 여정을 노선도로 보여준다. 실제로 순서가 있는 흐름이라 노선·역 표현을 쓴다.
// 역은 순서 안내일 뿐, 꼭 다 거쳐야 하는 관문이 아니다.

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { heatColor } from "@/lib/journey";

export const STEPS = [
  { label: "알아보기", desc: "공식 정보로 날짜와 장소를 확인해요", href: "/programs" },
  { label: "길 확인", desc: "지도에서 가는 길을 미리 살펴봐요", href: "/programs" },
  { label: "말 연습", desc: "연습 상대에게 첫마디를 말해봐요", href: "/practice" },
  { label: "돌아보기", desc: "연습 전후 내 마음을 비교해봐요", href: "/records" },
] as const;

const DASH = "repeating-linear-gradient(to right, var(--line) 0 6px, transparent 6px 11px)";

/** 지하철 노선도의 역: 지나온 역은 노선 색으로 채우고, 지금 역은 흰 속에 굵은 테두리와 빛 고리, 남은 역은 연한 테두리 */
function Station({ state, color }: { state: "done" | "now" | "next"; color: string }) {
  if (state === "now") {
    return (
      <span
        aria-hidden
        className="relative z-[1] block size-6 shrink-0 rounded-full border-[5px] border-station bg-surface"
        style={{ boxShadow: "0 0 0 4px var(--glow-soft)" }}
      />
    );
  }
  return (
    <span
      aria-hidden
      className={`relative z-[1] block size-5 shrink-0 rounded-full border-[4px] ${state === "next" ? "border-line bg-surface" : ""}`}
      style={state === "done" ? { background: color, borderColor: color } : undefined}
    />
  );
}

/** 가로 노선: 안쪽 화면 상단에서 현재 위치를 알려준다 */
export function StepPath({ current }: { current: number }) {
  const last = STEPS.length - 1;
  return (
    <ol className="grid grid-cols-4" aria-label={`준비 단계 4개 중 ${current + 1}번째`}>
      {STEPS.map((s, i) => {
        const state = i < current ? "done" : i === current ? "now" : "next";
        return (
          <li key={s.label} aria-current={state === "now" ? "step" : undefined} className="relative flex flex-col items-center gap-2">
            {i > 0 && (
              // 지나온 구간은 굵은 그라데이션 실선, 남은 구간은 점선
              <span
                aria-hidden
                className="absolute right-1/2 top-[9px] h-1.5 w-full rounded-full"
                style={{ background: i <= current ? `linear-gradient(to right, ${heatColor((i - 1) / last)}, ${heatColor(i / last)})` : DASH }}
              />
            )}
            <span className="grid h-6 place-items-center">
              <Station state={state} color={heatColor(i / last)} />
            </span>
            <span className={`text-[13px] ${state === "now" ? "font-semibold text-ink" : "text-ink-3"}`}>{s.label}</span>
          </li>
        );
      })}
    </ol>
  );
}

/** 세로 노선도: 홈에서 전체 여정을 한눈에. 역을 누르면 그 단계로 바로 간다. */
export function RouteMap() {
  return (
    <ol className="relative" aria-label="준비 단계">
      <span
        aria-hidden
        className="absolute bottom-6 left-[7px] top-6 w-1.5 rounded-full"
        style={{ background: "linear-gradient(var(--route), var(--glow))" }}
      />
      {STEPS.map((s, i) => (
        <li key={s.label} className="relative">
          <Link href={s.href} className="flex items-start gap-4 rounded-md py-3 pr-2 hover:bg-surface-2">
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
            <ChevronRight size={20} aria-hidden className="mt-1 shrink-0 text-ink-3" />
          </Link>
        </li>
      ))}
    </ol>
  );
}
