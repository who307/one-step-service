"use client";

import { useRouter } from "next/navigation";
import { useFlow } from "@/features/flow/FlowProvider";
import { PROGRESS_GROUPS, RESUME_HREF, type ProgramProgress } from "@/lib/journey";

// 공고 하나가 네 묶음(공고·미리보기·연습·마무리) 중 어디까지 왔는지. 홈의 이어서 하기와 내 기록 공고 탭이 같이 쓴다.
// tone="dark": 홈의 어두운 이어서 하기 카드 위
export function ProgramProgressBar({ step, tone = "light", labels = true }: { step: number; tone?: "light" | "dark"; labels?: boolean }) {
  const off = tone === "dark" ? "bg-ink-2" : "bg-line";
  return (
    <div role="img" aria-label={`${PROGRESS_GROUPS.length}묶음 중 ${PROGRESS_GROUPS[step]} 단계`}>
      <div aria-hidden className="grid grid-cols-4 gap-1">
        {PROGRESS_GROUPS.map((g, i) => (
          <span key={g} className={`h-1.5 rounded-full ${i < step ? "bg-route" : off}`} />
        ))}
      </div>
      {labels && (
        <div aria-hidden className={`mt-1 grid grid-cols-4 text-[12px] ${tone === "dark" ? "text-surface-2" : "text-ink-3"}`}>
          {PROGRESS_GROUPS.map((g, i) => (
            <span key={g} className={i === step ? `font-bold ${tone === "dark" ? "text-paper" : "text-ink"}` : ""}>
              {g}
              {i === step && " ←"}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

/** 이어서 하기: 그 공고를 지금 공고로 되살리고 멈춘 묶음의 화면으로 간다. 되살릴 내용이 없으면 공고 고르기로. */
export function useResume() {
  const router = useRouter();
  const { resume } = useFlow();
  return (p: ProgramProgress) => router.push(resume(p.programKey) ? RESUME_HREF[p.step] : "/programs");
}

/** 참여 체크(/journey): 흐름에서는 빠졌고 내 기록에서만 연다. 그 공고를 지금 공고로 되살린 뒤 간다. */
export function useOpenJourney() {
  const router = useRouter();
  const { resume } = useFlow();
  return (p: ProgramProgress) => {
    if (resume(p.programKey)) router.push("/journey");
  };
}
