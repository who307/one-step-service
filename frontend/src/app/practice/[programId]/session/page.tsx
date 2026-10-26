"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Lightbulb, Pause, Play, Send, Square } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Avatar, StateLabel } from "@/components/practice/Avatar";
import { Button, ButtonLink, buttonClass } from "@/components/ui/Button";
import { getScene } from "@/lib/api/scenes";
import { createPracticeSession, type Caption, type PracticeSession, type SessionState } from "@/lib/practice/session";
import { draftStore } from "@/lib/storage";
import type { Scene } from "@/lib/types";

export default function PracticeSessionPage() {
  const { programId } = useParams<{ programId: string }>();
  const router = useRouter();
  const [scene, setScene] = useState<Scene | null>(null);
  const [state, setState] = useState<SessionState>("idle");
  const [captions, setCaptions] = useState<Caption[]>([]);
  const [hint, setHint] = useState(false);
  const [text, setText] = useState("");
  const session = useRef<PracticeSession | null>(null);
  const logRef = useRef<HTMLOListElement>(null);

  useEffect(() => {
    const d = draftStore.get();
    if (!d?.sceneId) {
      router.replace(`/practice/${programId}`);
      return;
    }
    // 연습 전 기록은 필수. 없으면 기록 화면으로 돌려보낸다.
    if (!d.before) {
      router.replace(`/practice/${programId}/before`);
      return;
    }
    getScene(d.sceneId).then(setScene);
    session.current = createPracticeSession(
      { programId, sceneId: d.sceneId },
      { onState: setState, onCaption: (c) => setCaptions((cs) => [...cs, c]) },
    );
    // end()를 부르면 'ended' 상태가 화면에 남는다(개발 모드에서는 effect가 두 번 돌아 바로 종료 화면이 뜸).
    return () => session.current?.dispose();
  }, [programId, router]);

  useEffect(() => {
    logRef.current?.lastElementChild?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [captions]);

  const submitText = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    session.current?.sendText(text.trim());
    setText("");
  };

  const ended = state === "ended";
  const live = state === "listening" || state === "speaking" || state === "connecting";

  return (
    <AppShell back={ended ? undefined : `/practice/${programId}`} title={scene?.title} hideNav>
      <p className="mx-auto w-fit rounded-sm bg-surface-2 px-3 py-1 text-center text-[13px] text-ink-2">가상 연습 상황이에요. 실제 기관의 말투나 절차와 다를 수 있고, 평가하지 않아요.</p>

      <div className="mt-4">
        <Avatar state={state} />
        <StateLabel state={state} />
      </div>

      {ended ? (
        <section className="enter mt-8 rounded-md bg-surface px-5 py-6 text-center">
          <h2 className="text-[22px] font-bold">오늘은 여기까지, 수고했어요</h2>
          <p className="mt-2 text-ink-2">해본 만큼으로 충분해요. 마지막으로 지금 마음을 기록하면 연습 전과 비교해 볼 수 있어요.</p>
          <div className="mt-6 grid gap-2">
            <ButtonLink href={`/practice/${programId}/after`}>연습 후 마음 기록하기</ButtonLink>
          </div>
        </section>
      ) : (
        <>
          <ol ref={logRef} aria-live="polite" aria-label="대화 자막" className="mt-6 space-y-2">
            {captions.map((c) => (
              <li
                key={c.id}
                className={`enter max-w-[85%] rounded-md px-4 py-2.5 text-[16px] ${
                  c.role === "avatar"
                    ? "bg-surface"
                    : c.role === "user"
                      ? "ml-auto bg-ink text-paper"
                      : "mx-auto bg-transparent text-center text-[14px] text-ink-3"
                }`}
              >
                {c.role !== "system" && <span className="sr-only">{c.role === "avatar" ? "연습 상대: " : "나: "}</span>}
                {c.text}
              </li>
            ))}
          </ol>

          {state !== "idle" && scene && (
            <div className="mt-3">
              <button
                type="button"
                aria-expanded={hint}
                onClick={() => setHint((h) => !h)}
                className="press inline-flex min-h-11 items-center gap-1.5 rounded-md px-2 text-[15px] text-ink-2 hover:bg-surface-2 hover:text-ink"
              >
                <Lightbulb size={16} aria-hidden />
                막히면 이렇게 말해볼까요
              </button>
              {hint && <p className="enter mt-1 rounded-md border-2 border-dashed border-route bg-route-soft px-4 py-3 text-[16px]">“{scene.starterLine}”</p>}
            </div>
          )}

          {state === "listening" && (
            <form onSubmit={submitText} className="mt-3 flex gap-2">
              <label htmlFor="say" className="sr-only">
                말하기 어려우면 글로 써서 보내기
              </label>
              <input
                id="say"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="예: 안녕하세요, 신청한 ○○○입니다…"
                autoComplete="off"
                enterKeyHint="send"
                className="min-h-12 min-w-0 flex-1 rounded-md border-2 border-line bg-surface px-4 text-[16px] placeholder:text-ink-3 focus-visible:border-ink"
              />
              <button type="submit" aria-label="보내기" className={buttonClass("primary", "size-12 shrink-0 !px-0")}>
                <Send size={18} aria-hidden />
              </button>
            </form>
          )}
        </>
      )}

      {!ended && (
        <div className="sticky bottom-0 mt-6 grid grid-cols-2 gap-2 border-t border-line bg-paper pb-[max(env(safe-area-inset-bottom),16px)] pt-3">
          {state === "idle" ? (
            <Button className="col-span-2" onClick={() => session.current?.start()}>
              <Play size={18} aria-hidden />
              연습 시작
            </Button>
          ) : state === "paused" ? (
            <Button onClick={() => session.current?.resume()}>
              <Play size={18} aria-hidden />
              다시 이어가기
            </Button>
          ) : (
            <Button variant="secondary" disabled={!live} onClick={() => session.current?.pause()}>
              <Pause size={18} aria-hidden />
              잠깐 쉬기
            </Button>
          )}
          {state !== "idle" && (
            <Button variant="secondary" onClick={() => session.current?.end()}>
              <Square size={16} aria-hidden />
              오늘은 여기까지
            </Button>
          )}
        </div>
      )}
    </AppShell>
  );
}
