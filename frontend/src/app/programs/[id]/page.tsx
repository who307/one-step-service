"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { StepPath } from "@/components/journey/StepPath";
import { FactList } from "@/components/program/FactList";
import { InquiryComposer } from "@/components/program/InquiryComposer";
import { journeyStore } from "@/lib/storage";
import { RouteCard } from "@/components/program/RouteCard";
import { ButtonLink } from "@/components/ui/Button";
import { Tag } from "@/components/ui/Chip";
import { SHOW_SAMPLE_TAG } from "@/lib/labels";
import { getProgram } from "@/lib/api/programs";
import type { Program } from "@/lib/types";

export default function ProgramDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [program, setProgram] = useState<Program | null | undefined>(undefined);

  useEffect(() => {
    getProgram(id).then((p) => {
      setProgram(p);
      // 공고를 읽어본 것도 노선 위의 한 걸음
      if (p) journeyStore.add({ type: "read", programId: p.id, programTitle: p.title });
    });
  }, [id]);

  if (program === undefined) return <AppShell back="/programs">{null}</AppShell>;
  if (program === null)
    return (
      <AppShell back="/programs" title="공고">
        <p className="pt-10 text-center text-ink-2">공고를 찾지 못했어요.</p>
      </AppShell>
    );

  return (
    <AppShell
      back="/programs"
      footer={
        <div className="grid gap-2">
          <ButtonLink href={`/practice/${program.id}`}>걱정되는 장면 미리 연습하기</ButtonLink>
          {program.applyUrl && (
            <ButtonLink href={program.applyUrl} variant="quiet" external>
              공식 신청 페이지 확인
              <ExternalLink size={16} aria-hidden />
            </ButtonLink>
          )}
        </div>
      }
    >
      <div className="pb-2 pt-1">
        <StepPath current={1} />
      </div>

      <header className="mt-6">
        <h2 className="text-[26px] font-bold leading-tight">
          {program.title}
          {SHOW_SAMPLE_TAG && program.sample && (
            <span className="ml-2 align-middle">
              <Tag>예시</Tag>
            </span>
          )}
        </h2>
        <p className="text-[15px] text-ink-3">{program.organization}</p>
        <p className="mt-3 text-ink-2">{program.summary}</p>
      </header>

      <div className="mt-6 space-y-3">
        <FactList
          facts={program.facts}
          sample={program.sample}
          askAction={<InquiryComposer program={program} unconfirmed={program.facts.filter((f) => f.status === "unconfirmed")} />}
        />
        {program.location && (
          <RouteCard
            location={program.location}
            onOpen={() => journeyStore.add({ type: "route", programId: program.id, programTitle: program.title })}
          />
        )}
      </div>

      {program.sample ? (
        <p className="mt-5 text-[14px] text-ink-3">화면 확인용으로 만든 예시 공고예요. 기관과 일정은 실제가 아니에요.</p>
      ) : (
        <p className="mt-5 text-[14px] text-ink-3">
          출처:{" "}
          <a href={program.sourceUrl} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-ink">
            {program.organization} 공식 안내
            <span className="sr-only">(새 창에서 열림)</span>
          </a>
          . {program.sourceCheckedAt}에 확인했어요. 모집 상태와 일정은 바뀔 수 있어요.
        </p>
      )}
    </AppShell>
  );
}
