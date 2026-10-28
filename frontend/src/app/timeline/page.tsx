"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CircleHelp, Lightbulb, MessageSquareText } from "lucide-react";
import { AppShell, ScreenTitle } from "@/components/layout/AppShell";
import { Button, ButtonLink } from "@/components/ui/Button";
import { ErrorPanel, Loading, MockNote } from "@/components/ui/States";
import { useFlow, useRequire } from "@/features/flow/FlowProvider";
import { Checklist } from "@/features/timeline/Checklist";
import { TimelineView } from "@/features/timeline/TimelineView";
import { api, ApiError, isAbort, USE_MOCK } from "@/lib/api";

// S3 참여 타임라인. 공고문 + 걱정 → 서버에서 생성·원문 인용 검증 → 도착·접수·활동·귀가.
export default function TimelinePage() {
  const router = useRouter();
  const { state, update, addStop } = useFlow();
  const ready = useRequire(state.noticeText !== "");
  const [error, setError] = useState<unknown>(null);
  const [loading, setLoading] = useState(false);
  const ac = useRef<AbortController | null>(null);

  const generate = useCallback(
    (mock = false) => {
      ac.current?.abort();
      const c = new AbortController();
      ac.current = c;
      setError(null);
      setLoading(true);
      api
        .createTimeline({ noticeText: state.noticeText, concerns: state.concerns, programId: state.program?.id }, state.program?.title, {
          signal: c.signal,
          mock,
        })
        .then((timeline) => {
          update({ timeline, usedMock: state.usedMock || mock || timeline.source === "MOCK" });
          addStop({ type: "read", programKey: state.program?.id ?? timeline.program.title, programTitle: timeline.program.title });
        })
        .catch((e) => !isAbort(e) && setError(e))
        .finally(() => !c.signal.aborted && setLoading(false));
    },
    [state.noticeText, state.concerns, state.program, state.usedMock, update, addStop],
  );

  useEffect(() => {
    // 개발 모드의 두 번 마운트에서 취소된 요청이 남아 있으면 다시 요청한다
    if (ready && !state.timeline && (!ac.current || ac.current.signal.aborted)) generate();
  }, [ready, state.timeline, generate]);

  useEffect(() => () => ac.current?.abort(), []);

  if (!ready) return null;
  const t = state.timeline;
  const back = "/concerns";

  if (error) {
    const notNotice = error instanceof ApiError && error.code === "NOT_A_NOTICE";
    return (
      <AppShell back={back} step={2}>
        <ErrorPanel
          error={error}
          actions={
            notNotice ? (
              <>
                <ButtonLink href="/notice">다시 입력하기</ButtonLink>
                <ButtonLink href="/notice" variant="secondary">
                  샘플로 해보기
                </ButtonLink>
              </>
            ) : (
              <>
                <Button onClick={() => generate()}>다시 시도하기</Button>
                <Button variant="secondary" onClick={() => generate(true)}>
                  예시 타임라인으로 보기
                </Button>
              </>
            )
          }
        />
      </AppShell>
    );
  }

  if (loading || !t)
    return (
      <AppShell back={back} step={2}>
        <Loading
          label="공고를 읽고 참여 순서를 정리하는 중…"
          onCancel={() => {
            ac.current?.abort();
            router.push(back);
          }}
        />
      </AppShell>
    );

  const confirmed = t.steps.filter((s) => s.label === "CONFIRMED").length;

  return (
    <AppShell
      back={back}
      step={2}
      footer={
        <Button className="w-full" onClick={() => router.push("/check/before")}>
          다음
        </Button>
      }
    >
      <ScreenTitle sub={`${t.program.title}에 가는 날을 미리 걸어봐요.`}>참여 타임라인</ScreenTitle>

      {(USE_MOCK || t.source === "MOCK") && (
        <div className="mb-4">
          <MockNote>예시 규칙으로 만든 타임라인이에요. AI가 만든 결과가 아니에요.</MockNote>
        </div>
      )}
      <p className="mb-4 text-[14px] text-ink-2">
        4단계 중 {confirmed}단계는 공고 원문에서 확인했어요. ‘예상’은 일반적인 흐름일 뿐, 실제와 다를 수 있어요.
      </p>

      <TimelineView steps={t.steps} />

      <section aria-labelledby="supplies" className="mt-8">
        <h2 id="supplies" className="text-[17px] font-bold">
          준비물 체크리스트
        </h2>
        <div className="mt-2">
          <Checklist items={t.checklist} />
        </div>
      </section>

      {t.unknowns.length > 0 && (
        <section aria-labelledby="unknowns" className="mt-8">
          <h2 id="unknowns" className="flex items-center gap-2 text-[17px] font-bold">
            <CircleHelp size={18} aria-hidden className="text-unsure" />
            공고에서 확인되지 않았어요
          </h2>
          <ul className="mt-2 flex flex-wrap gap-1.5">
            {t.unknowns.map((u) => (
              <li key={u} className="rounded-sm bg-unsure-soft px-2 py-1 text-[14px] text-unsure">
                {u}
              </li>
            ))}
          </ul>
          <ButtonLink href="/inquiry" variant="secondary" className="mt-3 w-full">
            <MessageSquareText size={18} aria-hidden />
            물어볼 문장 만들기
          </ButtonLink>
        </section>
      )}

      {t.tips.length > 0 && (
        <section aria-labelledby="tips" className="mt-8 rounded-md bg-route-soft px-4 py-4">
          <h2 id="tips" className="flex items-center gap-2 text-[16px] font-bold">
            <Lightbulb size={18} aria-hidden />
            걱정에 맞춘 준비 팁
          </h2>
          <ul className="mt-2 grid gap-1.5 text-[15px]">
            {t.tips.map((tip) => (
              <li key={tip}>{tip}</li>
            ))}
          </ul>
        </section>
      )}
    </AppShell>
  );
}
