"use client";

import { useState } from "react";
import { Button, ButtonLink } from "@/components/ui/Button";
import { useFlow } from "@/features/flow/FlowProvider";
import { pendingVisits } from "@/lib/journey";

// 홈의 "다녀왔나요?" 카드. 연습한 공고 중 아직 답하지 않은 것을 한 번에 하나만 묻는다.
// 나머지는 내 기록에서 한꺼번에 답한다. 답한 뒤에는 같은 자리에 한마디를 남긴다.
export function VisitAsk() {
  const { stops, addStop } = useFlow();
  const [justAnswered, setJustAnswered] = useState<"visited" | "rested" | null>(null);

  const waiting = pendingVisits(stops);
  const pending = waiting[0] ?? null;
  const visitedCount = stops.filter((s) => s.type === "visited").length;

  const answer = (type: "visited" | "rested") => {
    if (!pending) return;
    addStop({ type, programKey: pending.programKey, programTitle: pending.programTitle });
    setJustAnswered(type);
  };

  if (pending)
    return (
      <section aria-labelledby="visit-ask" className="rounded-md border-2 border-ink bg-surface px-4 py-4">
        <h2 id="visit-ask" className="text-[17px] font-bold">
          {pending.programTitle}에 다녀왔나요?
        </h2>
        <p className="mt-1 text-[15px] text-ink-2">어느 쪽이든 괜찮아요. 노선은 그대로 이어져요.</p>
        <div className="mt-3 grid gap-2">
          <Button onClick={() => answer("visited")}>다녀왔어요</Button>
          <Button variant="secondary" onClick={() => answer("rested")}>
            이번엔 못 갔어요
          </Button>
        </div>
        {waiting.length > 1 && (
          <ButtonLink href="/records" variant="quiet" size="sm" className="mt-2 w-full">
            답하지 않은 공고 {waiting.length - 1}개 더 보기
          </ButtonLink>
        )}
      </section>
    );

  if (justAnswered === "rested")
    return (
      <div key="after-rest" className="enter rounded-md bg-surface px-4 py-4">
        <p className="font-semibold">괜찮아요. 쉬어가는 것도 노선의 일부예요.</p>
        <p className="mt-1 text-[15px] text-ink-2">마음이 생기면 다시 이어가요.</p>
        <ButtonLink href="/programs" variant="secondary" className="mt-3 w-full">
          다른 공고도 둘러보기
        </ButtonLink>
      </div>
    );

  if (justAnswered === "visited")
    return (
      <div key="after-visit" className="enter rounded-md border-2 border-glow bg-glow-soft px-4 py-3">
        <p className="text-[17px] font-bold">{visitedCount === 1 ? "첫단추를 끼웠어요. 정말 수고했어요." : "또 한 역을 지났어요. 수고했어요."}</p>
        <p className="mt-0.5 text-[15px] text-ink-2">
          {visitedCount === 1 ? "집에서 출발한 노선이 처음으로 바깥에 닿았어요." : `지금까지 ${visitedCount}곳에 다녀왔어요.`}
        </p>
      </div>
    );

  return null;
}
