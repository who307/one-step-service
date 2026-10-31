"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MessageCircle } from "lucide-react";
import { AppShell, ScreenTitle } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/Button";
import { useFlow } from "@/features/flow/FlowProvider";
import { MockNote } from "@/components/ui/States";
import { LEVELS, SCENES } from "@/lib/labels";
import type { Level, SceneId } from "@/types/api";

// S5 장면·난이도 선택. 아래 탭의 "말 연습"으로 공고 없이 바로 와도 쓸 수 있다.
// 그때는 일반적인 청년 프로그램 상황으로 연습하고, 연습 전 마음 체크를 거쳐 시작한다.
export default function PracticeSetupPage() {
  const router = useRouter();
  const { state, update } = useFlow();
  const general = state.program === null;
  const [scene, setScene] = useState<SceneId>(state.sceneId ?? "CHECKIN");
  const [level, setLevel] = useState<Level>(state.level ?? "L2");
  return (
    <AppShell
      back={general ? "/" : "/check/before"}
      step={general ? undefined : 3}

      footer={
        <Button
          className="w-full"
          onClick={() => {
            update({ sceneId: scene, level, practice: null, after: null, ...(general ? { before: null } : {}) });
            router.push(general ? "/check/before" : "/practice/session");
          }}
        >
          연습 시작
        </Button>
      }
    >
      <ScreenTitle sub={general ? "공고를 고르지 않아도 돼요. 일반적인 청년 프로그램 상황으로 연습해요." : `${state.program!.title} 상황으로 연습해요. 언제든 멈출 수 있어요.`}>
        어떤 장면을 연습할까요?
      </ScreenTitle>
      {general && (
        <div className="-mt-2 mb-5">
          <MockNote>
            가고 싶은 공고가 있다면{" "}
            <Link href="/programs" className="underline underline-offset-2">
              공고를 먼저 골라요
            </Link>
            . 그 공고에 맞춰 연습할 수 있어요.
          </MockNote>
        </div>
      )}

      <fieldset>
        <legend className="sr-only">연습 장면</legend>
        <div className="grid gap-2">
          {SCENES.map((s) => (
            <Option key={s.id} name="scene" checked={scene === s.id} onChange={() => setScene(s.id)} title={s.title} description={s.description} icon />
          ))}
        </div>
      </fieldset>

      <fieldset className="mt-8">
        <legend className="text-[17px] font-bold">연습 난이도를 골라요</legend>
        <div className="mt-3 grid gap-2">
          {LEVELS.map((l) => (
            <Option
              key={l.id}
              name="level"
              checked={level === l.id}
              onChange={() => setLevel(l.id)}
              title={`${l.id} ${l.title}`}
              description={`${l.description} · 최대 ${l.maxTurns}턴`}
            />
          ))}
        </div>
      </fieldset>
    </AppShell>
  );
}

function Option({
  name,
  checked,
  onChange,
  title,
  description,
  icon,
}: {
  name: string;
  checked: boolean;
  onChange: () => void;
  title: string;
  description: string;
  icon?: boolean;
}) {
  return (
    <label
      className={`press flex min-h-16 cursor-pointer items-center gap-3 rounded-md border-2 px-4 py-3 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[var(--focus)] ${
        checked ? "border-ink bg-route-soft" : "border-line bg-surface hover:border-ink-3"
      }`}
    >
      <input type="radio" name={name} checked={checked} onChange={onChange} className="sr-only" />
      {icon && <MessageCircle size={22} aria-hidden className="shrink-0 text-ink-2" />}
      <span className="min-w-0 flex-1">
        <span className="block text-[16px] font-semibold">{title}</span>
        <span className="block text-[14px] text-ink-2">{description}</span>
      </span>
      <span aria-hidden className={`grid size-6 shrink-0 place-items-center rounded-full border-2 ${checked ? "border-ink" : "border-line"}`}>
        {checked && <span className="size-3 rounded-full bg-ink" />}
      </span>
    </label>
  );
}
