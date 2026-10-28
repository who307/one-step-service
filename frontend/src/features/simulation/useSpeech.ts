"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// 브라우저 Web Speech API로 한국어 음성 입력(STT)·출력(TTS).
// 제공업체 확정 전 임시 구현이며, 브라우저에 따라 음성이 외부 서버에서 처리될 수 있다(화면에 안내).
// 전사문·음성은 어디에도 저장하지 않고, 실패하면 글자 입력으로 대신한다.

/* eslint-disable @typescript-eslint/no-explicit-any */
type Recognition = any;

function getRecognition(): (new () => Recognition) | null {
  if (typeof window === "undefined") return null;
  const w = window as any;
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export type MicError = "unsupported" | "denied" | "failed" | null;

export function useSpeechInput(onText: (text: string) => void) {
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<MicError>(null);
  const rec = useRef<Recognition | null>(null);
  const supported = typeof window !== "undefined" && getRecognition() !== null;

  const stop = useCallback(() => {
    rec.current?.stop();
  }, []);

  const start = useCallback(() => {
    const Ctor = getRecognition();
    if (!Ctor) {
      setError("unsupported");
      return;
    }
    setError(null);
    const r = new Ctor();
    r.lang = "ko-KR";
    r.interimResults = false;
    r.maxAlternatives = 1;
    r.onresult = (e: any) => {
      const text = e.results?.[0]?.[0]?.transcript ?? "";
      if (text.trim()) onText(text.trim());
    };
    r.onerror = (e: any) => setError(e.error === "not-allowed" || e.error === "service-not-allowed" ? "denied" : "failed");
    r.onend = () => setListening(false);
    rec.current = r;
    setListening(true);
    try {
      r.start();
    } catch {
      setListening(false);
      setError("failed");
    }
  }, [onText]);

  useEffect(() => () => rec.current?.abort?.(), []);

  return { supported, listening, error, start, stop };
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
