"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CircleAlert } from "lucide-react";
import { AppShell, ScreenTitle } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/Button";
import { useFlow } from "@/features/flow/FlowProvider";
import { NOTICE_MAX, looksLikeNotice, noticeLengthError } from "@/lib/safety";
import raw from "@/lib/mock/programs.json";

const SAMPLES = (raw as { id: string; title: string; organization: string; noticeText: string }[]).filter((p) =>
  ["sample-thursday-table", "sample-slow-walk", "sample-talk-circle"].includes(p.id),
);

// S1 공고문 입력. E1(길이)은 입력창 바로 아래, E2(공고문 아님)는 다음 버튼을 누른 뒤 안내한다.
export default function NoticePage() {
  const router = useRouter();
  const { state, update } = useFlow();
  const [tab, setTab] = useState<"paste" | "sample">("paste");
  const [text, setText] = useState(state.program ? "" : state.noticeText);
  const [notNotice, setNotNotice] = useState(false);
  const [touched, setTouched] = useState(false);
  const area = useRef<HTMLTextAreaElement>(null);

  const len = text.trim().length;
  const lengthError = noticeLengthError(text);
  const canNext = len > 0 && !lengthError;

  const next = () => {
    if (!looksLikeNotice(text)) {
      setNotNotice(true);
      return;
    }
    update({ program: null, noticeText: text.trim(), concerns: [], timeline: null });
    router.push("/concerns");
  };

  const pickSample = (noticeText: string) => {
    setText(noticeText);
    setNotNotice(false);
    setTab("paste");
  };

  if (notNotice)
    return (
      <AppShell back="/" step={0}>
        <div role="alert" className="flex flex-col items-center px-2 py-12 text-center">
          <CircleAlert size={36} aria-hidden className="text-ink-2" />
          <h1 className="mt-3 text-[20px] font-bold">공고문이 아닌 것 같아요</h1>
          <p className="mt-1 text-[15px] text-ink-2">지원 프로그램 안내 글인지 확인해 주세요. 모집, 일시, 장소 같은 내용이 있으면 좋아요.</p>
          <div className="mt-6 grid w-full gap-2">
            <Button
              onClick={() => {
                setNotNotice(false);
                requestAnimationFrame(() => area.current?.focus());
              }}
            >
              다시 입력하기
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                setNotNotice(false);
                setTab("sample");
              }}
            >
              샘플로 해보기
            </Button>
          </div>
        </div>
      </AppShell>
    );

  return (
    <AppShell
      back="/"
      step={0}
      footer={
        <Button className="w-full" disabled={!canNext || tab !== "paste"} onClick={next}>
          다음
        </Button>
      }
    >
      <ScreenTitle sub="참여하려는 프로그램의 안내 글을 그대로 붙여넣어요.">공고문 입력</ScreenTitle>

      <div role="tablist" aria-label="입력 방법" className="grid grid-cols-2 gap-1 rounded-md bg-surface-2 p-1">
        {(
          [
            ["paste", "공고문 붙여넣기"],
            ["sample", "샘플 선택"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            role="tab"
            type="button"
            aria-selected={tab === key}
            aria-controls={`panel-${key}`}
            onClick={() => setTab(key)}
            className={`press min-h-11 rounded-sm text-[15px] ${tab === key ? "bg-surface font-semibold text-ink" : "text-ink-2 hover:text-ink"}`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "paste" ? (
        <div id="panel-paste" role="tabpanel" className="mt-4">
          <label htmlFor="notice" className="sr-only">
            공고문
          </label>
          <textarea
            id="notice"
            ref={area}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onBlur={() => setTouched(true)}
            rows={12}
            aria-invalid={touched && !!lengthError}
            aria-describedby="notice-help"
            placeholder={"공고문을 붙여넣어 주세요\n(100 ~ 4,000자)"}
            className={`w-full rounded-md border-2 bg-surface px-4 py-3 text-[15px] leading-relaxed placeholder:text-ink-3 focus-visible:outline-none ${
              touched && lengthError ? "border-station" : "border-line focus-visible:border-ink"
            }`}
          />
          <div id="notice-help" className="mt-1 flex items-start justify-between gap-3 text-[14px]">
            <p className={touched && lengthError ? "flex items-start gap-1 text-station" : "text-ink-3"} aria-live="polite">
              {touched && lengthError ? (
                <>
                  <CircleAlert size={15} aria-hidden className="mt-0.5 shrink-0" />
                  {lengthError}
                </>
              ) : (
                "입력한 공고문은 저장하지 않아요."
              )}
            </p>
            <span className={`shrink-0 tabular-nums ${len > NOTICE_MAX ? "text-station" : "text-ink-3"}`}>
              {len.toLocaleString()} / {NOTICE_MAX.toLocaleString()}
            </span>
          </div>
        </div>
      ) : (
        <div id="panel-sample" role="tabpanel" className="mt-4">
          <p className="text-[14px] text-ink-3">시연용으로 지어낸 예시 공고예요. 고르면 입력창에 채워져요.</p>
          <ul className="mt-3 grid gap-2">
            {SAMPLES.map((s) => (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => pickSample(s.noticeText)}
                  className="press w-full rounded-md border border-line bg-surface p-4 text-left hover:border-ink-3"
                >
                  <span className="block font-semibold">{s.title}</span>
                  <span className="text-[14px] text-ink-3">{s.organization}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </AppShell>
  );
}
