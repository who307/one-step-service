"use client";

import { useParams, useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { CheckinForm } from "@/components/checkin/CheckinForm";
import { StepPath } from "@/components/journey/StepPath";
import { draftStore } from "@/lib/storage";

export default function BeforeCheckPage() {
  const { programId } = useParams<{ programId: string }>();
  const router = useRouter();

  return (
    <AppShell back={`/practice/${programId}`} hideNav>
      <div className="pt-1">
        <StepPath current={2} />
      </div>
      <p className="mt-6 rounded-sm bg-surface-2 px-3 py-2 text-[14px] text-ink-2">기록을 마치면 바로 연습 상대와 대화를 시작해요.</p>
      <div className="mt-4">
        <CheckinForm
          phase="before"
          onSubmit={(before) => {
            draftStore.merge({ before });
            router.push(`/practice/${programId}/session`);
          }}
        />
      </div>
    </AppShell>
  );
}
