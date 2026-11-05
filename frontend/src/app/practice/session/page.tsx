"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Captions, Check, Keyboard, MessageCircle, Mic, MicOff, PhoneOff, RotateCcw, SendHorizontal, Volume2, VolumeX, X } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Button, IconButton } from "@/components/ui/Button";
import { ConfirmDialog, ErrorPanel, Loading, MockNote } from "@/components/ui/States";
import { GENERAL_PRACTICE, useFlow, useRequire } from "@/features/flow/FlowProvider";
import { Avatar, StateLabel, type AvatarState } from "@/features/simulation/Avatar";
import { SimulationProgress } from "@/features/simulation/SimulationProgress";
import { useSpeechInput, useSpeechOutput } from "@/features/simulation/useSpeech";
import { useVideoAvatar } from "@/features/simulation/useVideoAvatar";
import { AVATARS, DEFAULT_AVATAR_KEY } from "@/features/simulation/avatar-catalog.mjs";
import { api, isAbort, USE_MOCK } from "@/lib/api";
import { levelInfo, sceneTitle } from "@/lib/labels";
import { hasCrisisSignal, MESSAGE_MAX } from "@/lib/safety";
import type { ChatLine, Level, SceneId, SimulationStart } from "@/types/api";

// S6 AI 롤플레이. 대화는 이 화면 메모리에만 있고, 서버는 매 요청에 받은 history로만 답한다(무상태).
export default function SessionPage() {
  const { state } = useFlow();
  // undefined: 주소를 아직 읽지 않음, null: 채팅 연습, 문자열: 고른 영상 아바타 key
  const [avatarKey, setAvatarKey] = useState<string | null | undefined>(undefined);
  useEffect(() => { setAvatarKey(avatarFromQuery(new URLSearchParams(window.location.search).get("avatar"))); }, []);
  // 공고를 고르지 않고 "말 연습" 탭에서 바로 온 경우에도 일반적인 청년 프로그램 상황으로 연습한다
  const ready = useRequire(state.sceneId !== null && state.level !== null, "/practice");
  if (!ready || avatarKey === undefined) return null;
  return (
    <Session
      sceneId={state.sceneId!}
      level={state.level!}
      programTitle={state.program?.title ?? GENERAL_TITLE}
      general={state.program === null}
      concerns={state.concerns}
      avatarKey={avatarKey}
      // 영상 연결이 안 되면 같은 대화를 채팅 화면에서 이어 간다. 새로고침해도 채팅으로 열리게 주소도 바꾼다.
      onSwitchToChat={() => {
        history.replaceState(history.state, "", "/practice/session");
        setAvatarKey(null);
      }}
    />
  );
}

/** 예전 주소(?avatar=1)는 기본 아바타로 연다. 목록에 없는 값이면 채팅 연습. */
function avatarFromQuery(value: string | null) {
  if (value === "1") return DEFAULT_AVATAR_KEY;
  return AVATARS.some((a) => a.key === value) ? value : null;
}

const GENERAL_TITLE = "청년 프로그램";

/** 영상 연결 실패 이유를 다음 행동과 함께 말한다. 개발 시연용이라 설정 이름도 적는다. */
function videoFailureText(failure: string | null) {
  switch (failure) {
    case "worker":
      return "아바타 워커가 응답하지 않아요. frontend에서 npm run avatar:worker 를 실행해 주세요.";
    case "not_configured":
      return "LiveKit·Synthesia 설정이 비어 있어요. backend/.env 를 확인해 주세요.";
    case "unknown_avatar":
      return "이 아바타의 ID가 올바른지, 이 계정에서 쓸 수 있는지 확인해 주세요.";
    case "concurrency_limit":
      return "다른 영상 연습이 진행 중이에요. 기존 연습을 종료하고 다시 시도해 주세요.";
    case "quota_exceeded":
      return "아바타 사용 한도에 도달했어요.";
    case "auth":
      return "아바타 서비스 인증을 확인해 주세요.";
    case "timeout":
      return "아바타가 제시간에 들어오지 않았어요. 잠시 뒤 다시 시도해 주세요.";
    default:
      return "채팅으로 이어서 하거나 다른 아바타를 골라 주세요.";
  }
}

type Busy = "starting" | "sending" | "completing" | null;

function Session({
  sceneId,
  level,
  programTitle,
  general,
  concerns,
  avatarKey,
  onSwitchToChat,
}: {
  sceneId: SceneId;
  level: Level;
  programTitle: string;
  /** 공고 없이 하는 연습. 흐름 단계 표시를 하지 않고, 노선에서 다녀왔는지 묻지 않는다. */
  general: boolean;
  concerns: string[];
  /** 영상 아바타 key. null이면 채팅 연습 */
  avatarKey: string | null;
  onSwitchToChat: () => void;
}) {
  const videoMode = avatarKey !== null;
  const avatarName = AVATARS.find((a) => a.key === avatarKey)?.name;
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
  const [showVideoInput, setShowVideoInput] = useState(false);
  const [showCaptions, setShowCaptions] = useState(true);
  const [showTranscript, setShowTranscript] = useState(false);
  const [muted, setMuted] = useState(false);
  // 한걸음 버튼·아래 탭으로 다른 곳에 가려 할 때의 목적지. 확인을 받고 연습을 접은 뒤 이동한다.
  const [leaveTo, setLeaveTo] = useState<string | null>(null);
  const ac = useRef<AbortController | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const leaving = useRef(false);

  const info = levelInfo(level);
  const isMock = USE_MOCK || mock || sim?.source === "MOCK";
  const video = useVideoAvatar(avatarKey);
  const videoSpeak = video.speak;

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
      setAvatar(tts.enabled || videoMode ? "speaking" : "idle");
      if (videoMode) videoSpeak(text);
      else tts.speak(text);
    },
    [tts, videoMode, videoSpeak],
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
    if (!sim || videoMode) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: document.documentElement.scrollHeight, behavior: reduce ? "auto" : "smooth" });
  }, [sim, lines, busy, alternatives, choices, error, finished, videoMode]);

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
      .sendMessage(sim.simulationId, { sceneId, level, programTitle, programId: general ? undefined : state.program?.id, history, userText: text }, { signal: c.signal, mock: useMockNow })
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
      {tts.supported && !videoMode && (
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

  if (videoMode) {
    const latestLine = lines[lines.length - 1];
    return (
      <main className="mx-auto flex h-dvh max-w-120 flex-col overflow-hidden bg-[#10141b] text-white">
        <div className="relative min-h-0 flex-1 overflow-hidden bg-[#555e69]">
          <video ref={video.setVideoElement} autoPlay playsInline className="absolute inset-0 h-full w-full object-cover object-center" />
          <audio ref={video.setAudioElement} autoPlay />
          <div aria-hidden className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/65 via-transparent via-35% to-black/75" />

          <header className="absolute inset-x-0 top-0 z-10 flex items-center gap-3 px-4 pb-5 pt-[max(1rem,env(safe-area-inset-top))]">
            <button type="button" aria-label="연습 나가기" onClick={() => setConfirm(true)} className="grid size-10 shrink-0 place-items-center rounded-full bg-black/25 text-white"><ArrowLeft size={21} aria-hidden /></button>
            <div className="min-w-0 flex-1 text-center">
              <h1 className="truncate text-[15px] font-semibold">{sceneTitle(sceneId)}</h1>
              <p className="mt-0.5 text-xs text-white/75">{avatarName && `${avatarName} · `}{level} · {info.title}</p>
            </div>
            <button type="button" aria-label={muted ? "상대방 소리 켜기" : "상대방 소리 끄기"} aria-pressed={muted} onClick={() => { video.setMuted(!muted); setMuted(!muted); if (muted) video.playAudio(); }} className="grid size-10 shrink-0 place-items-center rounded-full bg-black/25 text-white">{muted ? <VolumeX size={20} aria-hidden /> : <Volume2 size={20} aria-hidden />}</button>
          </header>

          {video.status !== "ready" && (
            <div role="status" className="absolute inset-0 grid place-items-center px-8 text-center">
              <div className="rounded-2xl bg-black/55 px-6 py-5 backdrop-blur-sm">
                <p className="font-semibold">{video.status === "failed" ? "영상 연결이 원활하지 않아요" : `${avatarName ?? "연습 상대"}${avatarName ? "님을" : "를"} 연결하고 있어요`}</p>
                <p className="mt-2 text-sm text-white/80">{video.status !== "failed" ? "처음 연결은 30초쯤 걸릴 수 있어요." : videoFailureText(video.failure)}</p>
                {video.status === "failed" && (
                  <div className="mt-4 flex flex-wrap justify-center gap-2">
                    <button type="button" onClick={onSwitchToChat} className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-[#20232d]">채팅으로 이어서 하기</button>
                    <button type="button" onClick={() => router.push("/practice/avatar/select")} className="rounded-full border border-white/40 px-4 py-2 text-sm font-semibold text-white">다른 아바타 고르기</button>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="absolute inset-x-0 bottom-0 z-10 px-4 pb-4">
            {error && <div role="alert" className="mb-3 rounded-2xl bg-black/75 p-3 text-sm"><p>답을 받지 못했어요. 다시 시도해 주세요.</p><div className="mt-2 flex gap-4"><button type="button" onClick={error.retry} className="font-bold underline">다시 시도하기</button>{error.mockLabel.startsWith("예시 응답") && <button type="button" onClick={() => { setMock(true); setError(null); send(input, true); }} className="font-bold underline">예시 응답으로 계속하기</button>}</div></div>}
            {showTranscript && <div role="log" aria-label="대화 내역" aria-live="polite" className="mb-3 max-h-48 space-y-2 overflow-y-auto rounded-2xl bg-black/75 p-4 text-sm">{lines.map((line, i) => <p key={i}><span className="font-semibold text-white/65">{line.role === "AI" ? "연습 상대" : "나"} · </span>{line.text}</p>)}</div>}
            {showCaptions && !showTranscript && latestLine && <div role="status" aria-live="polite" className="rounded-2xl bg-black/65 px-4 py-3 text-[15px] leading-relaxed backdrop-blur-sm"><span className="mb-1 block text-xs font-semibold text-white/65">{latestLine.role === "AI" ? "연습 상대" : level === "L1" ? "예시 답변" : "나"}</span>{latestLine.text}</div>}
            {busy === "sending" && <p role="status" className="mt-2 text-center text-sm text-white/80">연습 상대가 답하고 있어요…</p>}
            {sim && <p className="mt-2 text-center text-xs text-white/75">{sim.disclaimer} {isMock && "예시 상대예요."}</p>}
          </div>
        </div>

        <div className="shrink-0 bg-[#20242c] px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
          {/* 영상 화면은 칸이 좁아 한 줄만 보여 준다. L2는 지금 질문에 답할 선택지, L3는 방금 한 말의 다른 표현. 둘 다 띄우면 이전 질문의 선택지가 함께 보여 중복처럼 읽힌다. */}
          {level === "L2" && choices && !busy && !finished && <div className="mb-3"><p className="mb-1.5 text-xs font-semibold text-white/65">이렇게 답해 볼 수 있어요</p><div className="flex gap-2 overflow-x-auto pb-1" aria-label="답할 문장 고르기">{choices.map((choice) => <button key={choice} type="button" onClick={() => send(choice)} className="shrink-0 rounded-full bg-white/10 px-4 py-2 text-sm text-white">{choice}</button>)}</div></div>}
          {level === "L3" && alternatives.length > 0 && !busy && !finished && <div className="mb-3"><p className="mb-1.5 text-xs font-semibold text-white/65">방금 한 말, 이렇게도 말할 수 있어요</p><div className="flex gap-2 overflow-x-auto pb-1" aria-label="다른 표현 고르기">{alternatives.map((alternative) => <button key={alternative} type="button" onClick={() => { setInput(alternative); setShowVideoInput(true); }} className="shrink-0 rounded-full border border-white/25 px-4 py-2 text-sm text-white">{alternative}</button>)}</div></div>}
          {showVideoInput && level !== "L1" && !finished && <form onSubmit={(event) => { event.preventDefault(); send(input); }} className="mb-3 flex gap-2"><label htmlFor="video-msg" className="sr-only">할 말</label><input id="video-msg" ref={inputRef} value={input} onChange={(event) => setInput(event.target.value)} maxLength={level === "L2" ? 60 : MESSAGE_MAX} placeholder="할 말을 입력해 주세요" autoComplete="off" className="min-h-11 min-w-0 flex-1 rounded-full bg-white/10 px-4 text-white placeholder:text-white/50 focus-visible:outline-2 focus-visible:outline-white" /><button type="submit" aria-label="보내기" disabled={!input.trim() || busy !== null} className="grid size-11 place-items-center rounded-full bg-[#514ef5] disabled:opacity-40"><SendHorizontal size={19} aria-hidden /></button></form>}
          {stt.listening && <p role="status" className="mb-2 text-center text-xs text-white/75">듣고 있어요. 말을 마치면 입력창에 채워져요.</p>}
          {stt.error && <p role="status" className="mb-2 text-center text-xs text-white/75">음성 입력을 사용할 수 없어요. 글자로 입력해 주세요.</p>}
          {finished ? <button type="button" onClick={() => complete(false)} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-[#514ef5] font-semibold"><Check size={20} aria-hidden />연습 마치기</button> : level === "L1" ? <div className="flex gap-2"><button type="button" onClick={() => setConfirm(true)} className="min-h-12 flex-1 rounded-full bg-white/10">멈추기</button><button type="button" onClick={nextScriptLine} disabled={!sim} className="min-h-12 flex-1 rounded-full bg-[#514ef5] font-semibold disabled:opacity-40">다음 대사 보기</button></div> : (
            <div className="flex items-start justify-around gap-1 text-center text-[11px] text-white/75">
              <button type="button" disabled={!stt.supported || !sim} onClick={() => { setShowVideoInput(true); if (stt.listening) stt.stop(); else { video.playAudio(); stt.start(); } }} className="flex w-14 flex-col items-center gap-1 disabled:opacity-40"><span className={`grid size-11 place-items-center rounded-full ${stt.listening ? "bg-[#514ef5]" : "bg-white/10"}`}>{stt.listening ? <MicOff size={19} aria-hidden /> : <Mic size={19} aria-hidden />}</span>{stt.listening ? "입력 중지" : "음성 입력"}</button>
              <button type="button" aria-pressed={showVideoInput} onClick={() => setShowVideoInput(!showVideoInput)} className="flex w-14 flex-col items-center gap-1"><span className={`grid size-11 place-items-center rounded-full ${showVideoInput ? "bg-[#514ef5]" : "bg-white/10"}`}><Keyboard size={19} aria-hidden /></span>글자 입력</button>
              <button type="button" onClick={() => setConfirm(true)} className="flex w-14 flex-col items-center gap-1"><span className="grid size-12 place-items-center rounded-full bg-[#ee454d]"><PhoneOff size={21} aria-hidden /></span>연습 종료</button>
              <button type="button" aria-pressed={showCaptions} onClick={() => { setShowCaptions(!showCaptions); setShowTranscript(false); }} className="flex w-14 flex-col items-center gap-1"><span className={`grid size-11 place-items-center rounded-full ${showCaptions ? "bg-[#514ef5]" : "bg-white/10"}`}><Captions size={19} aria-hidden /></span>자막</button>
              <button type="button" aria-pressed={showTranscript} onClick={() => setShowTranscript(!showTranscript)} className="flex w-14 flex-col items-center gap-1"><span className={`grid size-11 place-items-center rounded-full ${showTranscript ? "bg-[#514ef5]" : "bg-white/10"}`}>{showTranscript ? <X size={19} aria-hidden /> : <MessageCircle size={19} aria-hidden />}</span>대화 내역</button>
            </div>
          )}
        </div>
        <ConfirmDialog open={confirm} title="연습을 멈출까요?" body={said ? "지금까지 한 연습을 정리하고 마음 체크로 넘어가요." : "연습을 종료하고 장면 선택으로 돌아가요."} cancelLabel="계속 연습하기" confirmLabel="연습 종료하기" onCancel={() => setConfirm(false)} onConfirm={stop} />
      </main>
    );
  }

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
