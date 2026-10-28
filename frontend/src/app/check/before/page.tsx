"use client";

import { useRouter } from "next/navigation";
import { AppShell, ScreenTitle } from "@/components/layout/AppShell";
import { MoodCheck } from "@/features/emotion/MoodCheck";
import { useFlow, useRequire } from "@/features/flow/FlowProvider";

// S4 연습 전 마음 체크. 건너뛸 수 있다. 점수는 이 화면 메모리에만 있고 서버로 보내지 않는다.
// 공고 흐름에서는 타임라인 다음에, "말 연습" 탭에서 바로 연습할 때는 장면을 고른 다음에 온다.
export default function BeforeCheckPage() {
  const router = useRouter();
  const { state, update } = useFlow();
  const general = state.timeline === null;
  const ready = useRequire(!general || state.sceneId !== null, "/practice");
  if (!ready) return null;
  const next = general ? "/practice/session" : "/practice";

  return (
    <AppShell back={general ? "/practice" : "/timeline"} step={general ? undefined : 3}>
      <ScreenTitle sub="진단이 아니에요. 지금 느낌을 숫자로 적어 보는 거예요.">지금, 어떤 상태인가요?</ScreenTitle>
      <MoodCheck
        initial={state.before}
        onSubmit={(before) => {
          update({ before });
          router.push(next);
        }}
        onSkip={() => {
          update({ before: null });
          router.push(next);
        }}
      />
    </AppShell>
  );
}
