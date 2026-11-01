"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Mic, MicOff, RotateCcw, SendHorizontal, Volume2, VolumeX } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Button, IconButton } from "@/components/ui/Button";
import { ConfirmDialog, ErrorPanel, Loading, MockNote } from "@/components/ui/States";
import { GENERAL_PRACTICE, useFlow, useRequire } from "@/features/flow/FlowProvider";
import { Avatar, StateLabel, type AvatarState } from "@/features/simulation/Avatar";
import { SimulationProgress } from "@/features/simulation/SimulationProgress";
import { useSpeechInput, useSpeechOutput } from "@/features/simulation/useSpeech";
import { api, isAbort, USE_MOCK } from "@/lib/api";
import { levelInfo, sceneTitle } from "@/lib/labels";
import { hasCrisisSignal, MESSAGE_MAX } from "@/lib/safety";
import type { ChatLine, Level, SceneId, SimulationStart } from "@/types/api";

// S6 AI 롤플레이. 대화는 이 화면 메모리에만 있고, 서버는 매 요청에 받은 history로만 답한다(무상태).
export default function SessionPage() {
  const { state } = useFlow();
  // 공고를 고르지 않고 "말 연습" 탭에서 바로 온 경우에도 일반적인 청년 프로그램 상황으로 연습한다
  const ready = useRequire(state.sceneId !== null && state.level !== null, "/practice");
  if (!ready) return null;
  return <Session sceneId={state.sceneId!} level={state.level!} programTitle={state.program?.title ?? GENERAL_TITLE} general={state.program === null} concerns={state.concerns} />;
}

const GENERAL_TITLE = "청년 프로그램";

type Busy = "starting" | "sending" | "completing" | null;

function Session({
  sceneId,
  level,
  programTitle,
  general,
  concerns,
}: {
  sceneId: SceneId;
  level: Level;
  programTitle: string;
  /** 공고 없이 하는 연습. 흐름 단계 표시를 하지 않고, 노선에서 다녀왔는지 묻지 않는다. */
  general: boolean;
  concerns: string[];
}) {
  const step = general ? undefined : 4;
  const router = useRouter();
  const { state, update, addStop } = useFlow();
  const [sim, setSim] = useState<SimulationStart | null>(null);
  const [lines, setLines] = useState<ChatLine[]>([]);
  const [scriptAt, setScriptAt] = useState(0);
  const [choices, setChoices] = useState<string[] | null>(null);
  const [alternatives, setAlternatives] = useState<string[]>([]);
  const [turn, setTurn] = useState(0);
  const [finished, setFinished] = useState(false);
  const [busy, setBusy] = useState<Busy>("starting");
  const [error, setError] = useState<{ err: unknown; retry: () => void; mockLabel: string } | null>(null);
  const [mock, setMock] = useState(false);
  const [input, setInput] = useState("");
  const [avatar, setAvatar] = useState<AvatarState>("thinking");
  const [confirm, setConfirm] = useState(false);
  // 한걸음 버튼·아래 탭으로 다른 곳에 가려 할 때의 목적지. 확인을 받고 연습을 접은 뒤 이동한다.
  const [leaveTo, setLeaveTo] = useState<string | null>(null);
  const ac = useRef<AbortController | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const leaving = useRef(false);

  const info = levelInfo(level);
  const isMock = USE_MOCK || mock || sim?.source === "MOCK";

  const tts = useSpeechOutput(
    useCallback(() => setAvatar("speaking"), []),
    useCallback(() => setAvatar((a) => (a === "speaking" ? "idle" : a)), []),
  );
  const stt = useSpeechInput(
    useCallback((text: string) => {
      setInput(text.slice(0, MESSAGE_MAX));
      inputRef.current?.focus();
    }, []),
  );

  const say = useCallback(
    (text: string) => {
      setAvatar(tts.enabled ? "speaking" : "idle");
      tts.speak(text);
    },
    [tts],
  );

  // E5: 위기 신호. 일반 연습을 바로 멈추고 도움 안내로. 대화 내용은 어디에도 남기지 않는다.
  const toCrisis = useCallback(() => {
    leaving.current = true;
    ac.current?.abort();
    tts.cancel();
    update({ practice: null });
    router.replace("/help?from=practice");
  }, [router, tts, update]);

  const begin = useCallback(
    (useMockNow: boolean) => {
      ac.current?.abort();
      const c = new AbortController();
      ac.current = c;
      setBusy("starting");
      setError(null);
      setLines([]);
      setChoices(null);
      setAlternatives([]);
      setTurn(0);
      setFinished(false);
      setInput("");
      setAvatar("thinking");
      api
        .startSimulation({ sceneId, level, programTitle, concerns }, { signal: c.signal, mock: useMockNow })
        .then((s) => {
          setSim(s);
          if (s.script) {
            setLines([s.script[0]]);
            setScriptAt(1);
            say(s.script[0].text);
          } else {
            setLines([{ role: "AI", text: s.opening.text }]);
            setChoices(s.opening.choices);
            say(s.opening.text);
          }
          setBusy(null);
        })
        .catch((e) => {
          if (isAbort(e)) return;
          setBusy(null);
          setError({ err: e, retry: () => begin(useMockNow), mockLabel: "예시 상대와 연습하기" });
        });
    },
    [sceneId, level, programTitle, concerns, say],
  );

  useEffect(() => {
    begin(false);
    return () => ac.current?.abort();
    // 처음 한 번만 시작한다. 다시 시작은 버튼으로.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // E4: 브라우저 뒤로가기도 연습 중단 확인을 거친다
  useEffect(() => {
    history.pushState({ practice: true }, "", location.href);
    const onPop = () => {
      if (leaving.current) return;
      history.pushState({ practice: true }, "", location.href);
      setConfirm(true);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  // 새 대사·답하는 중 표시·다른 표현 제안이 생기면 맨 아래로 내린다.
  // 하단 고정 입력창이 마지막 말풍선을 가리지 않도록 요소가 아니라 문서 끝까지 스크롤한다.
  useEffect(() => {
    if (!sim) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: document.documentElement.scrollHeight, behavior: reduce ? "auto" : "smooth" });
  }, [sim, lines, busy, alternatives, choices, error, finished]);

  const send = (raw: string, useMockNow = mock) => {
    const text = raw.trim().slice(0, MESSAGE_MAX);
    if (!text || !sim || busy || finished) return;
    if (hasCrisisSignal(text)) return toCrisis();
    stt.stop();
    tts.cancel();

    const history = lines;
    setLines([...history, { role: "USER", text }]);
    setInput("");
    setChoices(null);
    setBusy("sending");
    setAvatar("thinking");
    setError(null);

    const c = new AbortController();
    ac.current = c;
    api
      .sendMessage(sim.simulationId, { sceneId, level, programTitle, history, userText: text }, { signal: c.signal, mock: useMockNow })
      .then((res) => {
        setBusy(null);
        if (res.crisis || !res.reply) return toCrisis();
        setLines((l) => [...l, { role: "AI", text: res.reply!.text }]);
        setChoices(res.reply.choices);
        setAlternatives(res.alternatives);
        setTurn(res.turn);
        setFinished(res.finished);
        say(res.reply.text);
        if (res.finished) setAvatar("ended");
      })
      .catch((e) => {
        if (isAbort(e)) return;
        setBusy(null);
        setAvatar("idle");
        // 보낸 말은 지우고 입력창에 되돌려 둔다. 다시 보내면 같은 요청이 된다.
        setLines(history);
        setInput(text);
        setError({
          err: e,
          retry: () => {
            setError(null);
            send(text, useMockNow);
          },
          mockLabel: "예시 응답으로 계속하기",
        });
      });
  };

  const nextScriptLine = () => {
    if (!sim?.script) return;
    const line = sim.script[scriptAt];
    setLines((l) => [...l, line]);
    setScriptAt(scriptAt + 1);
    setTurn(Math.ceil((scriptAt + 1) / 2));
    if (line.role === "AI") say(line.text);
    else tts.speak(line.text);
    if (scriptAt + 1 >= sim.script.length) {
      setFinished(true);
      setAvatar("ended");
    }
  };

  const complete = (endedEarly: boolean, useMockNow = mock) => {
    if (!sim) return;
    leaving.current = true;
    tts.cancel();
    stt.stop();
    setBusy("completing");
    setError(null);
    api
      .completeSimulation(sim.simulationId, { sceneId, level, programTitle, history: lines }, { mock: useMockNow })
      .then((result) => {
        update({
          practice: { sceneId, level, history: lines, result, endedEarly },
          practiceCount: state.practiceCount + 1,
          usedMock: state.usedMock || isMock || useMockNow,
        });
        addStop({
          type: "practice",
          programKey: general ? GENERAL_PRACTICE : (state.program?.id ?? programTitle),
          programTitle,
          sceneTitle: sceneTitle(sceneId),
        });
        router.push("/check/after");
      })
      .catch((e) => {
        leaving.current = false;
        setBusy(null);
        setError({ err: e, retry: () => complete(endedEarly, useMockNow), mockLabel: "예시 요약으로 마치기" });
      });
  };

  const said = lines.some((l) => l.role === "USER");
  const stop = () => {
    setConfirm(false);
    if (said) complete(true);
    else {
      leaving.current = true;
      ac.current?.abort();
      tts.cancel();
      router.push("/practice");
    }
  };

  const header = (
    <div className="flex items-center gap-2 border-b border-line pb-3">
      <div className="min-w-0 flex-1">
        <p className="truncate text-[16px] font-semibold">
          {sceneTitle(sceneId)} <span className="font-normal text-ink-3">({level} {info.title})</span>
        </p>
      </div>
      {tts.supported && (
        <IconButton
          label={tts.enabled ? "소리 끄기" : "소리로 듣기"}
          aria-pressed={tts.enabled}
          onClick={() => {
            if (tts.enabled) tts.cancel();
            tts.setEnabled(!tts.enabled);
          }}
        >
          {tts.enabled ? <Volume2 size={20} aria-hidden /> : <VolumeX size={20} aria-hidden />}
        </IconButton>
      )}
      <Button variant="secondary" size="sm" onClick={() => begin(mock)} disabled={busy !== null}>
        <RotateCcw size={15} aria-hidden />
        다시 시작
      </Button>
    </div>
  );

  if (busy === "completing")
    return (
      <AppShell step={step}>
        <Loading label="오늘 연습을 정리하는 중…" />
      </AppShell>
    );

  if (error && !sim)
    return (
      <AppShell back="/practice" step={step}>
        <ErrorPanel
          error={error.err}
          actions={
            <>
              <Button onClick={error.retry}>다시 시도하기</Button>
              <Button
                variant="secondary"
                onClick={() => {
                  setMock(true);
                  begin(true);
                }}
              >
                {error.mockLabel}
              </Button>
            </>
          }
        />
      </AppShell>
    );

  const footer = !sim ? null : finished ? (
    <Button className="w-full" onClick={() => complete(false)}>
      연습 마치기
    </Button>
  ) : level === "L1" ? (
    <div className="grid grid-cols-[auto_1fr] gap-2">
      <Button variant="quiet" onClick={() => setConfirm(true)}>
        멈추기
      </Button>
      <Button onClick={nextScriptLine}>다음 대사 보기</Button>
    </div>
  ) : (
    <div>
      {level === "L2" && choices && !busy && (
        <ul className="mb-2 grid gap-1.5" aria-label="답할 문장 고르기">
          {choices.map((c) => (
            <li key={c}>
              <button
                type="button"
                onClick={() => send(c)}
                className="press min-h-11 w-full rounded-md border-2 border-route bg-route-soft px-3 py-2 text-left text-[15px] hover:border-ink"
              >
                {c}
              </button>
            </li>
          ))}
        </ul>
      )}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="flex items-center gap-1.5"
      >
        <label htmlFor="msg" className="sr-only">
          할 말
        </label>
        <input
          id="msg"
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          maxLength={level === "L2" ? 60 : MESSAGE_MAX}
          placeholder={level === "L2" ? "또는 짧게 직접 입력…" : "메시지를 입력하세요…"}
          autoComplete="off"
          enterKeyHint="send"
          className="min-h-12 min-w-0 flex-1 rounded-md border-2 border-line bg-surface px-3 placeholder:text-ink-3 focus-visible:border-ink focus-visible:outline-none"
        />
        {stt.supported && (
          <IconButton
            label={stt.listening ? "음성 입력 멈추기" : "말로 입력하기"}
            aria-pressed={stt.listening}
            tone="strong"
            onClick={() => (stt.listening ? stt.stop() : (tts.cancel(), stt.start()))}
            className={stt.listening ? "bg-route-soft" : ""}
          >
            {stt.listening ? <MicOff size={20} aria-hidden /> : <Mic size={20} aria-hidden />}
          </IconButton>
        )}
        <button
          type="submit"
          aria-label="보내기"
          disabled={!input.trim() || busy !== null}
          className="press grid size-12 shrink-0 place-items-center rounded-md bg-action text-on-action disabled:bg-surface-2 disabled:text-ink-3"
        >
          <SendHorizontal size={20} aria-hidden />
        </button>
      </form>
      <div className="mt-1 flex items-center justify-between gap-2">
        <Button variant="quiet" size="sm" className="-ml-3" onClick={() => setConfirm(true)}>
          멈추기
        </Button>
        <p aria-live="polite" className="text-right text-[13px] text-ink-3">
          {stt.listening
            ? "듣는 중… 말을 마치면 입력창에 채워져요"
            : stt.error === "denied"
              ? "마이크 권한이 없어요. 글자로 입력해 주세요"
              : stt.error
                ? "음성 인식이 안 됐어요. 글자로 입력해 주세요"
                : ""}
        </p>
      </div>
    </div>
  );

  return (
    <AppShell back={() => setConfirm(true)} step={step} footer={footer} onLeave={setLeaveTo}>
      {header}

      {!sim ? (
        <Loading label="연습 상대를 준비하는 중…" />
      ) : (
        <>
          <div className="pt-4">
            <Avatar state={stt.listening ? "listening" : busy === "sending" ? "thinking" : avatar} size="sm" />
            <StateLabel state={stt.listening ? "listening" : busy === "sending" ? "thinking" : avatar} />
            <p className="mt-2 text-center text-[13px] text-ink-3">{sim.disclaimer}</p>
            <div className="mt-3">
              <SimulationProgress turn={turn} max={sim.maxTurns} label={level === "L1" ? "대화" : "말한 횟수"} />
            </div>
            {isMock && (
              <div className="mt-3">
                <MockNote>예시 상대예요. 정해진 대본으로 답해요.</MockNote>
              </div>
            )}
          </div>

          {/* 자막: 화면 읽기 프로그램이 새 대사를 읽도록 log 역할 */}
          <ol role="log" aria-label="대화" aria-live="polite" className="mt-5 grid gap-3">
            {lines.map((l, i) => (
              <li key={i} className={`enter flex ${l.role === "USER" ? "justify-end" : "justify-start"}`}>
                <p
                  className={`max-w-[85%] rounded-[16px] px-4 py-2.5 text-[16px] ${
                    l.role === "USER" ? "rounded-br-sm bg-ink text-paper" : "rounded-bl-sm border border-line bg-surface"
                  }`}
                >
                  <span className="sr-only">{l.role === "USER" ? (level === "L1" ? "예시 답변: " : "나: ") : "연습 상대: "}</span>
                  {l.text}
                </p>
              </li>
            ))}
            {busy === "sending" && (
              <li className="flex justify-start" aria-label="연습 상대가 답하는 중">
                <span className="flex gap-1 rounded-[16px] rounded-bl-sm border border-line bg-surface px-4 py-3.5" aria-hidden>
                  {[0, 1, 2].map((i) => (
                    <span key={i} className="size-2 animate-pulse rounded-full bg-ink-3" style={{ animationDelay: `${i * 150}ms` }} />
                  ))}
                </span>
              </li>
            )}
          </ol>

          {error && (
            <div role="alert" className="enter mt-4 rounded-md border border-line bg-surface p-4">
              <p className="text-[15px] font-semibold">답을 받지 못했어요</p>
              <p className="text-[14px] text-ink-2">{error.err instanceof Error ? error.err.message : "다시 시도해 주세요."}</p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <Button size="sm" onClick={error.retry}>
                  다시 시도하기
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    setMock(true);
                    if (error.mockLabel.startsWith("예시 응답")) {
                      setError(null);
                      send(input, true);
                    } else error.retry();
                  }}
                >
                  {error.mockLabel}
                </Button>
              </div>
            </div>
          )}

          {alternatives.length > 0 && !busy && (
            <section aria-labelledby="alt" className="enter mt-5 rounded-md bg-surface-2 p-4">
              <h2 id="alt" className="text-[15px] font-semibold">
                이렇게 말해볼 수도 있어요
              </h2>
              <p className="text-[13px] text-ink-3">정답이 아니에요. 누르면 입력창에 넣어 고칠 수 있어요.</p>
              <ul className="mt-2 grid gap-1.5">
                {alternatives.map((a) => (
                  <li key={a}>
                    <button
                      type="button"
                      disabled={finished}
                      onClick={() => {
                        setInput(a);
                        inputRef.current?.focus();
                      }}
                      className="press min-h-11 w-full rounded-md border border-line bg-surface px-3 py-2 text-left text-[15px] hover:border-ink-3 disabled:cursor-default disabled:hover:border-line"
                    >
                      {a}
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}

      <ConfirmDialog
        open={confirm}
        title="연습을 멈출까요?"
        body={said ? "지금까지 한 연습을 정리하고 마음 체크로 넘어가요." : "연습을 종료하고 장면 선택으로 돌아가요."}
        cancelLabel="계속 연습하기"
        confirmLabel="연습 종료하기"
        onCancel={() => setConfirm(false)}
        onConfirm={stop}
      />
      <ConfirmDialog
        open={leaveTo !== null}
        title="연습을 그만두고 이동할까요?"
        body="이번 대화는 저장되지 않아요. 정리까지 하려면 ‘계속 연습하기’를 누른 뒤 멈추기를 눌러요."
        cancelLabel="계속 연습하기"
        confirmLabel="그만두고 이동하기"
        onCancel={() => setLeaveTo(null)}
        onConfirm={() => {
          const to = leaveTo!;
          setLeaveTo(null);
          leaving.current = true;
          ac.current?.abort();
          tts.cancel();
          stt.stop();
          router.push(to);
        }}
      />
    </AppShell>
  );
}
