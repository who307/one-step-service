"use client";

import { useRouter } from "next/navigation";
import { AppShell, ScreenTitle } from "@/components/layout/AppShell";
import { MoodCheck } from "@/features/emotion/MoodCheck";
import { useFlow, useRequire, type Mood } from "@/features/flow/FlowProvider";

// S7 연습 후 마음 체크. 연습 전과 같은 질문, 같은 척도. 마치면 내 기록에 이번 연습이 남는다(메모리에만).
export default function AfterCheckPage() {
  const router = useRouter();
  const { state, update, addRecord } = useFlow();
  const ready = useRequire(state.practice !== null);
  if (!ready) return null;
  const practice = state.practice!;

  const done = (after: Mood | null) => {
    update({ after });
    addRecord({
      sceneId: practice.sceneId,
      level: practice.level,
      programTitle: state.program?.title ?? null,
      before: state.before,
      after,
      summary: practice.result?.summary ?? null,
      endedEarly: practice.endedEarly,
    });
    router.push("/result");
  };

  return (
    <AppShell back="/practice" step={state.program ? 6 : undefined}>
      <ScreenTitle sub="연습 전과 같은 질문이에요. 건너뛰어도 괜찮아요.">연습하고 나니, 지금은 어떤가요?</ScreenTitle>
      <MoodCheck initial={null} onSubmit={done} onSkip={() => done(null)} />
    </AppShell>
  );
}
