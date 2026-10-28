"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ChevronDown, ExternalLink, MessageSquareText } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Tag } from "@/components/ui/Chip";
import { ErrorPanel, Loading, MockNote } from "@/components/ui/States";
import { period } from "@/features/program/ProgramCard";
import { useFlow } from "@/features/flow/FlowProvider";
import { api, isAbort } from "@/lib/api";
import { CATEGORY_LABEL, MODE_LABEL } from "@/lib/labels";
import type { ProgramDetail } from "@/types/api";

// 공고 상세. 공고에 있는 사실만 보여주고, 없는 항목은 "확인 필요"로 남긴다.
export default function ProgramDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { update } = useFlow();
  const [program, setProgram] = useState<ProgramDetail | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [mock, setMock] = useState(false);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    const ac = new AbortController();
    setError(null);
    api
      .getProgram(id, { signal: ac.signal, mock })
      .then(setProgram)
      .catch((e) => !isAbort(e) && setError(e));
    return () => ac.abort();
  }, [id, mock, retry]);

  const choose = (next: string) => {
    if (!program) return;
    update({ program, noticeText: program.noticeText, concerns: [], timeline: null, usedMock: mock });
    router.push(next);
  };

  if (error)
    return (
      <AppShell back="/programs" step={0}>
        <ErrorPanel
          error={error}
          actions={
            <>
              <Button onClick={() => setRetry((r) => r + 1)}>다시 시도하기</Button>
              <Button variant="secondary" onClick={() => setMock(true)}>
                예시 공고로 보기
              </Button>
            </>
          }
        />
      </AppShell>
    );

  if (!program)
    return (
      <AppShell back="/programs" step={0}>
        <Loading label="공고를 불러오는 중…" />
      </AppShell>
    );

  const p = period(program);
  // 세 번째 값: 원문에 없어 공고 내용으로 추정한 값이면 true
  const facts: [string, string | null, boolean?][] = [
    ["신청 기간", p],
    ["활동 일정", program.activitySchedule],
    ["장소", program.location, program.locationSource === "ESTIMATED"],
    ["참여 대상", program.eligibility],
    ["준비물", program.supplies, program.suppliesSource === "ESTIMATED"],
    ["문의", program.contact],
  ];
  const anyEstimated = facts.some(([, v, est]) => v && est);

  return (
    <AppShell
      back="/programs"
      step={0}
      footer={
        <Button className="w-full" onClick={() => choose("/concerns")}>
          이 공고로 준비하기
        </Button>
      }
    >
      <div className="flex flex-wrap gap-1.5 pt-2">
        {program.isSample && <Tag>예시</Tag>}
        <Tag>{CATEGORY_LABEL[program.category]}</Tag>
        {program.modes.map((m) => (
          <Tag key={m}>{MODE_LABEL[m]}</Tag>
        ))}
      </div>
      <h1 className="mt-3 text-[24px] font-bold leading-snug">{program.title}</h1>
      <p className="text-[15px] text-ink-3">{program.organization}</p>
      <p className="mt-3 text-[16px] text-ink-2">{program.summary}</p>

      {program.isSample && (
        <div className="mt-4">
          <MockNote>시연용으로 지어낸 예시 공고예요. 기관·장소·일정은 실제가 아니에요.</MockNote>
        </div>
      )}

      <h2 className="mt-8 text-[17px] font-bold">공고에 나온 정보</h2>
      <dl className="mt-2 divide-y divide-line border-y border-line">
        {facts.map(([k, v, est]) => (
          <div key={k} className="grid grid-cols-[5.5rem_1fr] gap-3 py-3 text-[15px]">
            <dt className="text-ink-3">{k}</dt>
            <dd className="min-w-0">
              {v ? (
                est ? (
                  <span className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                    <span className="text-ink-2">{v}</span>
                    <Tag tone="unsure">추정</Tag>
                  </span>
                ) : (
                  v
                )
              ) : (
                <span className="font-medium text-unsure">확인 필요</span>
              )}
            </dd>
          </div>
        ))}
      </dl>
      {program.unknowns.length > 0 && (
        <p className="mt-3 text-[14px] text-ink-2">
          {anyEstimated
            ? "‘추정’은 공고에 적혀 있지 않아 공고 내용으로 짐작한 거예요. 실제와 다를 수 있으니 문의 문장으로 미리 확인해 보세요."
            : "‘확인 필요’는 공고에 적혀 있지 않은 내용이에요. 지어내지 않고 비워 뒀어요. 문의 문장으로 미리 물어볼 수 있어요."}
        </p>
      )}
      {program.closed && (
        <p className="mt-3 rounded-md bg-surface-2 px-3 py-2 text-[14px] text-ink-2">신청 기간이 지난 공고예요. 미리 연습해 보는 데는 쓸 수 있어요.</p>
      )}

      <div className="mt-5 grid gap-2">
        <Button variant="secondary" onClick={() => choose("/inquiry")}>
          <MessageSquareText size={18} aria-hidden />
          물어볼 문장 만들기
        </Button>
        {program.applicationUrl && (
          <ButtonLink href={program.applicationUrl} external variant="secondary">
            <ExternalLink size={18} aria-hidden />
            공식 안내에서 신청하기
          </ButtonLink>
        )}
      </div>

      <details className="group mt-8 rounded-md bg-surface px-4">
        <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between font-semibold [&::-webkit-details-marker]:hidden">
          공고 원문 보기
          <ChevronDown size={18} aria-hidden className="text-ink-3 transition-transform duration-200 group-open:rotate-180" />
        </summary>
        <pre className="whitespace-pre-wrap pb-4 font-sans text-[14px] leading-relaxed text-ink-2">{program.noticeText}</pre>
      </details>
    </AppShell>
  );
}
