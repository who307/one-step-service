"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronRight, House } from "lucide-react";
import { Button, ButtonLink } from "@/components/ui/Button";
import { getPrograms } from "@/lib/api/programs";
import { firstActivityDate, heatAt, heatColor, pendingVisit, stopLabel, stopWeight, suggestNext } from "@/lib/journey";
import { journeyStore } from "@/lib/storage";
import type { JourneyStop, Program } from "@/lib/types";

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
  const [stops, setStops] = useState<JourneyStop[] | null>(null);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [showAll, setShowAll] = useState(false);
  const [justAnswered, setJustAnswered] = useState<"visited" | "rested" | null>(null);
  const [litId, setLitId] = useState<string | null>(null);

  useEffect(() => {
    setStops(journeyStore.list());
    getPrograms().then(setPrograms);
  }, []);

  if (stops === null) return <div aria-hidden className="h-40" />;

  const pending = pendingVisit(stops);
  const visitedCount = stops.filter((s) => s.type === "visited").length;
  const pendingProgram = programs.find((p) => p.id === pending?.programId);
  const pendingDate = firstActivityDate(pendingProgram);
  const next = suggestNext(programs, stops);
  const hidden = showAll ? 0 : Math.max(0, stops.length - SHOW_RECENT);
  const visible = stops.slice(hidden);

  const answer = (type: "visited" | "rested") => {
    if (!pending) return;
    journeyStore.add({ type, programId: pending.programId, programTitle: pending.programTitle });
    const list = journeyStore.list();
    setStops(list);
    setJustAnswered(type);
    if (type === "visited") setLitId(list[list.length - 1].id);
  };

  return (
    <section aria-labelledby="journey-title">
      <div className="flex items-center justify-between gap-3">
        <h2 id="journey-title" className="text-[20px] font-bold">
          나의 노선
        </h2>
        {visitedCount > 0 && (
          <ButtonLink href="/visited" variant="secondary" size="sm" className="shrink-0">
            다녀온 곳 {visitedCount}
            <ChevronRight size={16} aria-hidden />
          </ButtonLink>
        )}
      </div>
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
              <time dateTime={s.createdAt} className="text-[13px] text-ink-3">
                {fmtDay.format(new Date(s.createdAt))}
              </time>
            </Row>
          );
        })}

        {/* 다음 역: 다녀왔는지 묻기 → 다음 활동 제안 → 처음이면 시작 안내 */}
        <Row dashedAbove color={heatColor(heatAt(stops, stops.length - 1))} marker={<span aria-hidden className="block size-5 rounded-full border-[3px] border-dashed border-ink-3 bg-paper" />}>
          {pending ? (
            <div className="rounded-md border-2 border-route bg-surface px-4 py-4">
              <p className="font-semibold">{pending.programTitle}에 다녀왔나요?</p>
              <p className="mt-1 text-[15px] text-ink-2">
                {pendingDate && pendingDate > new Date()
                  ? `활동 날짜는 ${fmtDay.format(pendingDate)}이에요. 다녀온 뒤에 알려주세요.`
                  : "어느 쪽이든 괜찮아요. 노선은 그대로 이어져요."}
              </p>
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
              <p className="mt-1 text-[15px] text-ink-2">준비해 둔 연습과 정보는 그대로 남아 있어요. 마음이 생기면 다시 이어가요.</p>
              <ButtonLink href="/programs" variant="secondary" className="mt-3 w-full">
                다른 공고도 둘러보기
              </ButtonLink>
            </div>
          ) : next.length > 0 ? (
            // 역에 불이 켜진 다음(약 0.6초 뒤)에 축하 문구가 이어지도록 지연
            <div
              key="after-visit"
              className={justAnswered === "visited" ? "enter" : undefined}
              style={justAnswered === "visited" ? { transitionDelay: "600ms" } : undefined}
            >
              {justAnswered === "visited" && (
                // 온기가 켜지는 순간: 따뜻한 색은 이런 자리에만 쓴다
                <div className="mb-4 rounded-md border-2 border-glow bg-glow-soft px-4 py-3">
                  <p className="text-[17px] font-bold">
                    {visitedCount === 1 ? "첫단추를 끼웠어요. 정말 수고했어요." : "또 한 역을 지났어요. 수고했어요."}
                  </p>
                  <p className="mt-0.5 text-[15px] text-ink-2">
                    {visitedCount === 1 ? "집에서 출발한 노선이 처음으로 바깥에 닿았어요." : `지금까지 ${visitedCount}곳에 다녀왔어요.`}
                  </p>
                </div>
              )}
              <p className="font-semibold">다음 역 후보</p>
              <p className="text-[14px] text-ink-3">다녀온 곳과 비슷하거나 한 걸음만 더 넓은 활동이에요.</p>
              <ul className="mt-2 divide-y divide-line rounded-md bg-surface">
                {next.map((p) => (
                  <li key={p.id}>
                    <Link href={`/programs/${p.id}`} className="flex min-h-14 items-center gap-2 px-4 py-2 hover:bg-surface-2">
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium">{p.title}</span>
                        <span className="block text-[13px] text-ink-3">{p.organization}</span>
                      </span>
                      <ChevronRight size={18} aria-hidden className="shrink-0 text-ink-3" />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="pt-0.5 text-ink-3">{stops.length === 0 ? "첫 역을 기다리고 있어요" : "다음 역은 내가 정해요"}</p>
          )}
        </Row>
      </ol>
    </section>
  );
}
