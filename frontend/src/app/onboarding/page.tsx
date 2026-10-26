"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/Button";
import { ToggleChip } from "@/components/ui/Chip";
import { INTEREST_LABEL, MODE_LABEL, WORRY_LABEL } from "@/lib/labels";
import { preferenceStore } from "@/lib/storage";
import type { Interest, ParticipationMode, UserPreference, Worry } from "@/lib/types";

function toggle<T>(list: T[], v: T) {
  return list.includes(v) ? list.filter((x) => x !== v) : [...list, v];
}

export default function OnboardingPage() {
  const router = useRouter();
  const [pref, setPref] = useState<UserPreference>({ interests: [], modes: [], worries: [] });

  useEffect(() => {
    const saved = preferenceStore.get();
    if (saved) setPref(saved);
  }, []);

  const save = () => {
    preferenceStore.set(pref);
    router.push("/programs");
  };

  const groups = [
    { key: "interests", title: "관심 가는 활동", hint: "끌리는 게 없으면 비워둬도 돼요", labels: INTEREST_LABEL },
    { key: "modes", title: "편한 참여 방식", hint: "여러 개 골라도 돼요", labels: MODE_LABEL },
    { key: "worries", title: "가장 걱정되는 것", hint: "연습 장면을 고를 때 참고해요", labels: WORRY_LABEL },
  ] as const;

  return (
    <AppShell
      back="/"
      title="나에 대해 조금만"
      footer={
        <div className="grid grid-cols-[auto_1fr] gap-2">
          <Button variant="quiet" onClick={() => router.push("/programs")}>
            건너뛰기
          </Button>
          <Button onClick={save}>이대로 추천받기</Button>
        </div>
      }
    >
      <p className="pt-2 text-ink-2">답한 내용은 이 기기에만 저장돼요. 모두 선택 사항이에요.</p>
      <div className="mt-6 space-y-8">
        {groups.map((g) => (
          <fieldset key={g.key}>
            <legend className="text-[17px] font-semibold">{g.title}</legend>
            <p className="text-[14px] text-ink-3">{g.hint}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {Object.entries(g.labels).map(([value, label]) => (
                <ToggleChip
                  key={value}
                  label={label}
                  selected={(pref[g.key] as string[]).includes(value)}
                  onToggle={() =>
                    setPref((p) => ({ ...p, [g.key]: toggle(p[g.key] as string[], value) as Interest[] & ParticipationMode[] & Worry[] }))
                  }
                />
              ))}
            </div>
          </fieldset>
        ))}
      </div>
    </AppShell>
  );
}
