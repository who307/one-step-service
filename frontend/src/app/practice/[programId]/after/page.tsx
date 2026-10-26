"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { CheckinForm, isComplete } from "@/components/checkin/CheckinForm";
import { draftStore, journeyStore, recordStore } from "@/lib/storage";
import type { CheckScores, PracticeRecord } from "@/lib/types";

export default function AfterCheckPage() {
  const { programId } = useParams<{ programId: string }>();
  const router = useRouter();

  // 연습 전 기록 없이 들어오면 처음부터
  useEffect(() => {
    if (!isComplete(draftStore.get()?.before)) router.replace(`/practice/${programId}`);
  }, [programId, router]);

  const finish = (after: CheckScores) => {
    const d = draftStore.get();
    if (!d?.programId || !d.sceneId || !isComplete(d.before)) return;
    const record: PracticeRecord = {
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      programId: d.programId,
      programTitle: d.programTitle ?? "",
      sceneId: d.sceneId,
      sceneTitle: d.sceneTitle ?? "",
      before: d.before,
      after,
      endedBy: d.endedBy ?? "user",
    };
    recordStore.add(record);
    journeyStore.add({ type: "practice", programId: record.programId, programTitle: record.programTitle, sceneTitle: record.sceneTitle });
    draftStore.clear();
    // 기록 화면에서 "연습을 마쳤어요"를 한 번만 보여주기 위한 표시
    try {
      sessionStorage.setItem("onestep.justPracticed", "1");
    } catch {}
    router.push("/records");
  };

  return (
    <AppShell hideNav>
      <div className="pt-2">
        <CheckinForm phase="after" onSubmit={finish} />
      </div>
    </AppShell>
  );
}
