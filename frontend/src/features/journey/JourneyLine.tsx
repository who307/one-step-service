"use client";

import { useState } from "react";
import { House } from "lucide-react";
import { Button, ButtonLink } from "@/components/ui/Button";
import { useFlow } from "@/features/flow/FlowProvider";
import { heatAt, heatColor, pendingVisit, stopLabel, stopWeight } from "@/lib/journey";

// 홈의 나의 노선. 지나온 걸음(공고 읽기·연습·문의·다녀옴)이 역으로 쌓인다.
// 메모리에만 있어서 새로고침하면 "집에서 출발"부터 다시 시작한다.

const SHOW_RECENT = 5;
const fmtDay = new Intl.DateTimeFormat("ko-KR", { month: "long", day: "numeric" });

/** 역. 지하철 노선도처럼 흰 속에 그 지점의 노선 색 테두리. 다녀온 역은 노선 색으로 꽉 채우고 빛 고리를 두른다. */
function Dot({ weight, color }: { weight: "big" | "mid" | "small"; color: string }) {
  const size = weight === "big" ? "size-6 border-[3px]" : weight === "mid" ? "size-5 border-[4px]" : "size-4 border-[3px]";
  return (
    <span className="dot relative z-1 block shrink-0 self-start">
      {weight === "big" && <span aria-hidden className="ring absolute inset-0 rounded-full" style={{ background: color, opacity: 0 }} />}
      <span
        aria-hidden
        className={`relative block rounded-full ${size}`}
        style={
          weight === "big"
            ? { background: color, borderColor: color, boxShadow: "0 0 0 4px var(--glow-soft)" }
            : { background: "var(--surface)", borderColor: color }
        }
      />
    </span>
  );
}

/** 세로 노선의 한 줄: 왼쪽 칸에 역, 오른쪽에 내용 */
function Row({
  marker,
  children,
  color = "var(--route)",
  fromColor = color,
  dashedAbove,
  lit,
}: {
  marker: React.ReactNode;
  children: React.ReactNode;
  /** 이 구간 노선 색(온기). 위쪽 역의 색(fromColor)에서 이 색으로 이어진다 */
  color?: string;
  fromColor?: string;
  dashedAbove?: boolean;
  /** 방금 생긴 다녀온 역: 불 켜지는 연출 */
  lit?: boolean;
}) {
  return (
    <li className={`relative grid grid-cols-[24px_1fr] gap-x-3 ${lit ? "stop-lit" : ""}`}>
      {/* 연결선: 지나온 역은 굵은 그라데이션 실선으로 끝까지, 다음 역은 위쪽만 점선 */}
      <span
        aria-hidden
        className={`seg absolute left-[9px] top-0 w-1.5 ${dashedAbove ? "h-4" : "bottom-0"}`}
        style={{
          background: dashedAbove
            ? `repeating-linear-gradient(${color} 0 5px, transparent 5px 9px)`
            : `linear-gradient(${fromColor}, ${color} 1.25rem)`,
        }}
      />
      <span className="relative flex justify-center pt-2">{marker}</span>
      <div className="label min-w-0 pb-4 pt-1">{children}</div>
    </li>
  );
}

export function JourneyLine() {
  const { stops, addStop } = useFlow();
  const [showAll, setShowAll] = useState(false);
  const [justAnswered, setJustAnswered] = useState<"visited" | "rested" | null>(null);
  const [litId, setLitId] = useState<number | null>(null);

  const pending = pendingVisit(stops);
  const visitedCount = stops.filter((s) => s.type === "visited").length;
  const hidden = showAll ? 0 : Math.max(0, stops.length - SHOW_RECENT);
  const visible = stops.slice(hidden);
  const lastId = stops.at(-1)?.id ?? 0;

  const answer = (type: "visited" | "rested") => {
    if (!pending) return;
    addStop({ type, programKey: pending.programKey, programTitle: pending.programTitle });
    setJustAnswered(type);
    if (type === "visited") setLitId(lastId + 1);
  };

  return (
    <section aria-labelledby="journey-title">
      <h2 id="journey-title" className="text-[20px] font-bold">
        나의 노선
      </h2>
      <p className="mt-1 text-[15px] text-ink-2">
        {stops.length === 0 ? "아직 출발 전이에요. 공고 하나 읽어보는 것도 한 걸음이에요." : `지금까지 ${stops.length}개의 역을 지나왔어요.`}
      </p>

      <ol className="relative mt-4">
        {/* 출발역: 집 */}
        <li className="relative grid grid-cols-[24px_1fr] gap-x-3">
          <span aria-hidden className="absolute bottom-0 left-[9px] top-3 w-1.5 bg-route" />
          <span className="flex justify-center">
            <span className="relative z-1 grid size-6 place-items-center rounded-full bg-route text-ink">
              <House size={14} aria-hidden />
            </span>
          </span>
          <div className="pb-4 pt-0.5 font-semibold">집에서 출발</div>
        </li>

        {hidden > 0 && (
          <Row marker={<span aria-hidden className="block h-3 w-1" />}>
            <button type="button" onClick={() => setShowAll(true)} className="min-h-11 text-[14px] text-ink-2 underline underline-offset-2 hover:text-ink">
              지나온 역 {hidden}개 더 보기
            </button>
          </Row>
        )}

        {visible.map((s, i) => {
          const color = heatColor(heatAt(stops, hidden + i));
          const fromColor = hidden + i > 0 ? heatColor(heatAt(stops, hidden + i - 1)) : "var(--route)";
          return (
            <Row key={s.id} color={color} fromColor={fromColor} lit={s.id === litId} marker={<Dot weight={stopWeight(s.type)} color={color} />}>
              <p className={stopWeight(s.type) === "big" ? "text-[17px] font-bold" : s.type === "rested" ? "text-ink-2" : "font-medium"}>
                {stopLabel(s)}
              </p>
              <time dateTime={s.at.toISOString()} className="text-[13px] text-ink-3">
                {fmtDay.format(s.at)}
              </time>
            </Row>
          );
        })}

        {/* 다음 역: 다녀왔는지 묻기 → 답한 뒤 한마디 → 그 밖에는 안내 한 줄 */}
        <Row
          dashedAbove
          color={heatColor(heatAt(stops, stops.length - 1))}
          marker={<span aria-hidden className="block size-5 rounded-full border-[3px] border-dashed border-ink-3 bg-paper" />}
        >
          {pending ? (
            <div className="rounded-md border-2 border-route bg-surface px-4 py-4">
              <p className="font-semibold">{pending.programTitle}에 다녀왔나요?</p>
              <p className="mt-1 text-[15px] text-ink-2">어느 쪽이든 괜찮아요. 노선은 그대로 이어져요.</p>
              <div className="mt-3 grid gap-2">
                <Button onClick={() => answer("visited")}>다녀왔어요</Button>
                <Button variant="secondary" onClick={() => answer("rested")}>
                  이번엔 못 갔어요
                </Button>
              </div>
            </div>
          ) : justAnswered === "rested" ? (
            <div key="after-rest" className="enter rounded-md bg-surface px-4 py-4">
              <p className="font-semibold">괜찮아요. 쉬어가는 것도 노선의 일부예요.</p>
              <p className="mt-1 text-[15px] text-ink-2">마음이 생기면 다시 이어가요.</p>
              <ButtonLink href="/programs" variant="secondary" className="mt-3 w-full">
                다른 공고도 둘러보기
              </ButtonLink>
            </div>
          ) : justAnswered === "visited" ? (
            // 역에 불이 켜진 다음(약 0.6초 뒤)에 축하 문구가 이어지도록 지연
            <div key="after-visit" className="enter" style={{ transitionDelay: "600ms" }}>
              <div className="rounded-md border-2 border-glow bg-glow-soft px-4 py-3">
                <p className="text-[17px] font-bold">{visitedCount === 1 ? "첫단추를 끼웠어요. 정말 수고했어요." : "또 한 역을 지났어요. 수고했어요."}</p>
                <p className="mt-0.5 text-[15px] text-ink-2">
                  {visitedCount === 1 ? "집에서 출발한 노선이 처음으로 바깥에 닿았어요." : `지금까지 ${visitedCount}곳에 다녀왔어요.`}
                </p>
              </div>
            </div>
          ) : (
            <p className="pt-0.5 text-ink-3">{stops.length === 0 ? "첫 역을 기다리고 있어요" : "다음 역은 내가 정해요"}</p>
          )}
        </Row>
      </ol>
    </section>
  );
}
