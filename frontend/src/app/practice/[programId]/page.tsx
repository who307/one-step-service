"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { StepPath } from "@/components/journey/StepPath";
import { Button } from "@/components/ui/Button";
import { Tag } from "@/components/ui/Chip";
import { getProgram } from "@/lib/api/programs";
import { getScenes } from "@/lib/api/scenes";
import { draftStore, preferenceStore } from "@/lib/storage";
import type { Program, Scene } from "@/lib/types";

export default function SceneSelectPage() {
  const { programId } = useParams<{ programId: string }>();
  const router = useRouter();
  const [program, setProgram] = useState<Program | null>(null);
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [worries, setWorries] = useState<string[]>([]);

  useEffect(() => {
    getProgram(programId).then(setProgram);
    getScenes().then(setScenes);
    setWorries(preferenceStore.get()?.worries ?? []);
  }, [programId]);

  const next = () => {
    const scene = scenes.find((s) => s.id === selected);
    if (!scene || !program) return;
    draftStore.set({
      programId: program.id,
      programTitle: program.title,
      sceneId: scene.id,
      sceneTitle: scene.title,
      before: null,
      after: null,
    });
    // 전후 비교를 위해 연습 전 기록을 먼저 받는다
    router.push(`/practice/${programId}/before`);
  };

  return (
    <AppShell
      back={`/programs/${programId}`}
      title="연습할 장면"
      footer={
        <Button className="w-full" disabled={!selected} onClick={next}>
          {selected ? "연습 전 마음 기록하고 시작" : "장면을 하나 골라 주세요"}
        </Button>
      }
    >
      <div className="pt-1">
        <StepPath current={2} />
      </div>
      <h2 className="mt-8 text-[22px] font-bold">어떤 순간이 가장 걱정돼요?</h2>
      <p className="text-[14px] text-ink-3">하나만 골라요. 다른 장면은 다음에 해도 돼요.</p>

      <div role="radiogroup" aria-label="연습 장면" className="mt-5 space-y-2.5">
        {scenes.map((s) => {
          const on = selected === s.id;
          return (
            <button
              key={s.id}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => setSelected(s.id)}
              className={`press flex w-full items-start gap-3 rounded-md border-2 p-4 text-left ${
                on ? "border-ink bg-surface" : "border-transparent bg-surface hover:border-line"
              }`}
            >
              <span
                aria-hidden
                className={`mt-0.5 size-5 shrink-0 rounded-full bg-surface ${on ? "border-[5px] border-station" : "border-[3px] border-line"}`}
              />
              <span className="min-w-0">
                <span className="flex items-center gap-2">
                  <span className="font-semibold">{s.title}</span>
                  {worries.includes(s.worry) && <Tag>내 걱정</Tag>}
                </span>
                <span className="mt-0.5 block text-[15px] text-ink-2">{s.description}</span>
              </span>
            </button>
          );
        })}
      </div>

      <p className="mt-5 text-[14px] text-ink-3">
        범용 가상 장면이에요. {program?.title ?? "이 공고"}의 실제 현장 절차를 재현하지 않아요.
      </p>
    </AppShell>
  );
}
