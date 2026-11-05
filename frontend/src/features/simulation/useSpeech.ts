"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { CSSProperties, KeyboardEvent as ReactKeyboardEvent, MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent } from "react";

// 브라우저 Web Speech API로 한국어 음성 입력(STT, 누르고 말하기)·출력(TTS).
// 제공업체 확정 전 임시 구현이며, 브라우저에 따라 음성이 외부 서버에서 처리될 수 있다(화면에 안내).
// 전사문·음성은 어디에도 저장하지 않고, 실패하면 글자 입력으로 대신한다.

/* eslint-disable @typescript-eslint/no-explicit-any */
type Recognition = any;

function getRecognition(): (new () => Recognition) | null {
  if (typeof window === "undefined") return null;
  const w = window as any;
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export type MicError = "unsupported" | "denied" | "failed" | "notHeard" | null;
/** idle → starting(마이크 켜는 중) → listening → finishing(손을 뗀 뒤 마지막 인식 결과를 기다림) → idle */
export type TalkState = "idle" | "starting" | "listening" | "finishing";

const FINISH_TIMEOUT_MS = 3000;

function joinText(parts: string[]) {
  return parts.map((p) => p.trim()).filter(Boolean).join(" ");
}

/**
 * 누르고 말하기(push-to-talk). 누르는 동안만 듣고, 떼면 들은 말을 onSubmit 으로 바로 보낸다.
 * 데스크톱(마우스·스페이스)과 모바일(터치)이 같은 방식으로 동작하게 한다.
 * 브라우저가 누르는 중에 인식을 스스로 끝내면(Android 등, 잠깐 멈춤) 다시 켜고 앞서 들은 말을 이어 붙인다.
 */
export function usePushToTalk(onSubmit: (text: string) => void, onPress?: () => void) {
  const [state, setState] = useState<TalkState>("idle");
  const [interim, setInterim] = useState("");
  const [error, setError] = useState<MicError>(null);
  const supported = typeof window !== "undefined" && getRecognition() !== null;

  const rec = useRef<Recognition | null>(null);
  const held = useRef(false);
  const cancelled = useRef(false);
  const fatal = useRef(false);
  const committed = useRef<string[]>([]);
  const sessionFinal = useRef("");
  const sessionInterim = useRef("");
  const finishTimer = useRef<number | null>(null);
  const handlers = useRef({ onSubmit, onPress });
  useEffect(() => {
    handlers.current = { onSubmit, onPress };
  });

  const finish = useCallback(() => {
    if (finishTimer.current !== null) window.clearTimeout(finishTimer.current);
    finishTimer.current = null;
    rec.current = null;
    const text = joinText(committed.current);
    committed.current = [];
    setInterim("");
    setState("idle");
    if (cancelled.current || fatal.current) return;
    if (text) handlers.current.onSubmit(text);
    else setError("notHeard");
  }, []);

  const listen = useCallback(() => {
    const Ctor = getRecognition();
    if (!Ctor) {
      setError("unsupported");
      setState("idle");
      return;
    }
    const r = new Ctor();
    r.lang = "ko-KR";
    // Android Chrome 은 continuous 에서 같은 말을 겹쳐 돌려주는 경우가 있어 끊어 듣고 다시 켠다.
    r.continuous = !/Android/i.test(navigator.userAgent);
    r.interimResults = true;
    r.maxAlternatives = 1;
    sessionFinal.current = "";
    sessionInterim.current = "";
    r.onstart = () => {
      if (rec.current === r && held.current) setState("listening");
    };
    r.onresult = (e: any) => {
      const finals: string[] = [];
      const interims: string[] = [];
      for (let i = 0; i < e.results.length; i++) {
        const res = e.results[i];
        (res.isFinal ? finals : interims).push(res[0]?.transcript ?? "");
      }
      sessionFinal.current = joinText(finals);
      sessionInterim.current = joinText(interims);
      setInterim(joinText([...committed.current, sessionFinal.current, sessionInterim.current]));
    };
    r.onerror = (e: any) => {
      if (e.error === "not-allowed" || e.error === "service-not-allowed") {
        fatal.current = true;
        setError("denied");
      } else if (e.error !== "no-speech" && e.error !== "aborted") {
        fatal.current = true;
        setError("failed");
      }
    };
    r.onend = () => {
      if (rec.current !== r) return;
      // 손을 떼면 대개 마지막 말이 final 로 온다. 브라우저에 따라 interim 으로만 남으면 그것을 쓴다.
      committed.current.push(sessionFinal.current || sessionInterim.current);
      sessionFinal.current = "";
      sessionInterim.current = "";
      if (held.current && !fatal.current && !cancelled.current) {
        listen();
        return;
      }
      finish();
    };
    rec.current = r;
    try {
      r.start();
    } catch {
      fatal.current = true;
      setError("failed");
      finish();
    }
  }, [finish]);

  const press = useCallback(() => {
    if (held.current || rec.current) return;
    if (!getRecognition()) {
      setError("unsupported");
      return;
    }
    held.current = true;
    cancelled.current = false;
    fatal.current = false;
    committed.current = [];
    setError(null);
    setInterim("");
    setState("starting");
    handlers.current.onPress?.();
    listen();
  }, [listen]);

  const release = useCallback(() => {
    if (!held.current) return;
    held.current = false;
    const r = rec.current;
    if (!r) return;
    setState("finishing");
    r.stop();
    // 브라우저가 onend 를 주지 않는 경우에 대비한다.
    finishTimer.current = window.setTimeout(() => {
      if (rec.current !== r) return;
      r.abort?.();
      committed.current.push(sessionFinal.current || sessionInterim.current);
      finish();
    }, FINISH_TIMEOUT_MS);
  }, [finish]);

  /** 보내지 않고 멈춘다(화면을 떠날 때, 시스템이 터치를 가져갔을 때). */
  const cancel = useCallback(() => {
    held.current = false;
    cancelled.current = true;
    const r = rec.current;
    if (r) {
      rec.current = null;
      r.abort?.();
    }
    if (finishTimer.current !== null) window.clearTimeout(finishTimer.current);
    finishTimer.current = null;
    committed.current = [];
    setInterim("");
    setState("idle");
  }, []);

  // 누른 채로 다른 창으로 가면 keyup·pointerup 이 오지 않는다. 창을 벗어나면 뗀 것으로 본다.
  useEffect(() => {
    const onBlur = () => release();
    const onHidden = () => {
      if (document.visibilityState === "hidden") cancel();
    };
    window.addEventListener("blur", onBlur);
    document.addEventListener("visibilitychange", onHidden);
    return () => {
      window.removeEventListener("blur", onBlur);
      document.removeEventListener("visibilitychange", onHidden);
    };
  }, [release, cancel]);

  useEffect(() => () => rec.current?.abort?.(), []);

  /** 마이크 버튼에 펼쳐 넣는 이벤트. 마우스·터치·펜은 누르는 동안, 버튼에 초점이 있으면 스페이스·엔터를 누르는 동안 듣는다. */
  const buttonProps = {
    onPointerDown: (e: ReactPointerEvent<HTMLButtonElement>) => {
      if (e.button !== 0) return;
      e.preventDefault();
      e.currentTarget.setPointerCapture?.(e.pointerId);
      press();
    },
    onPointerUp: () => release(),
    onPointerCancel: () => cancel(),
    onContextMenu: (e: ReactMouseEvent) => e.preventDefault(),
    onKeyDown: (e: ReactKeyboardEvent) => {
      if (e.key !== " " && e.key !== "Enter") return;
      e.preventDefault();
      e.stopPropagation();
      if (!e.repeat) press();
    },
    onKeyUp: (e: ReactKeyboardEvent) => {
      if (e.key !== " " && e.key !== "Enter") return;
      e.preventDefault();
      e.stopPropagation();
      release();
    },
    style: { touchAction: "none", userSelect: "none", WebkitUserSelect: "none", WebkitTouchCallout: "none" } as CSSProperties,
  };

  return { supported, state, active: state !== "idle", interim, error, press, release, cancel, buttonProps };
}

/**
 * 화면 어디서든 스페이스를 누르는 동안 듣는다. 입력창·버튼·링크에 초점이 있으면 원래 동작을 지킨다.
 */
export function useSpaceToTalk(enabled: boolean, press: () => void, release: () => void) {
  useEffect(() => {
    if (!enabled) return;
    const ignore = (t: EventTarget | null) =>
      t instanceof HTMLElement && t.closest("input, textarea, select, button, a, [contenteditable='true'], [role='dialog'], dialog") !== null;
    const down = (e: KeyboardEvent) => {
      if (e.code !== "Space" || ignore(e.target)) return;
      e.preventDefault();
      if (!e.repeat) press();
    };
    const up = (e: KeyboardEvent) => {
      if (e.code !== "Space" || ignore(e.target)) return;
      e.preventDefault();
      release();
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, [enabled, press, release]);
}

export function useSpeechOutput(onStart: () => void, onEnd: () => void) {
  const [enabled, setEnabled] = useState(false);
  const supported = typeof window !== "undefined" && "speechSynthesis" in window;

  const speak = useCallback(
    (text: string) => {
      if (!enabled || !supported) return;
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = "ko-KR";
      u.rate = 0.95;
      u.onstart = onStart;
      u.onend = onEnd;
      u.onerror = onEnd;
      window.speechSynthesis.speak(u);
    },
    [enabled, supported, onStart, onEnd],
  );

  const cancel = useCallback(() => {
    if (supported) window.speechSynthesis.cancel();
  }, [supported]);

  useEffect(() => cancel, [cancel]);

  return { supported, enabled, setEnabled, speak, cancel };
}
