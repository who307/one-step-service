"use client";

import { useRouter } from "next/navigation";
import { Bot, ChevronRight, MessageCircle, Video } from "lucide-react";
import { AppShell, ScreenTitle } from "@/components/layout/AppShell";
import { useFlow, useRequire } from "@/features/flow/FlowProvider";

export default function PracticeAvatarPage() {
  const router = useRouter();
  const { state } = useFlow();
  const ready = useRequire(state.sceneId !== null && state.level !== null, "/practice");
  const videoAvailable = process.env.NODE_ENV === "development";
  if (!ready) return null;
  return (
    <AppShell back="/practice" step={state.program ? 3 : undefined}>
      <ScreenTitle sub="편한 방식으로 천천히 말해 봐요.">어떻게 연습할까요?</ScreenTitle>
      <div className="rounded-2xl bg-gradient-to-br from-[#e7e9ff] to-[#f7f2fb] p-8 text-center text-[#252841]">
        <div className="mx-auto grid size-24 place-items-center rounded-full bg-white text-[#514ef5] shadow-sm"><Bot size={48} aria-hidden /></div>
        <p className="mt-4 text-lg font-bold">함께 연습할 상대</p>
        <p className="mt-1 text-sm text-[#656b83]">{state.program?.title ?? "일반적인 청년 프로그램"}</p>
      </div>
      <div className="mt-6 grid gap-3">
        <button type="button" onClick={() => router.push("/practice/session")} className="flex min-h-20 items-center gap-4 rounded-2xl border border-line bg-surface p-4 text-left">
          <span className="rounded-xl bg-[#eeedff] p-3 text-[#514ef5]"><MessageCircle size={22} aria-hidden /></span>
          <span className="flex-1"><strong className="block">채팅으로 연습하기</strong><span className="text-sm text-ink-3">글자와 음성 입력으로 연습해요</span></span><ChevronRight size={20} aria-hidden />
        </button>
        <button type="button" disabled={!videoAvailable} onClick={() => router.push("/practice/session?avatar=1")} className="flex min-h-20 items-center gap-4 rounded-2xl border border-line bg-surface p-4 text-left disabled:opacity-60">
          <span className="rounded-xl bg-surface-2 p-3 text-ink-3"><Video size={22} aria-hidden /></span>
          <span className="flex-1"><strong className="block">아바타 영상으로 연습하기</strong><span className="text-sm text-ink-3">{videoAvailable ? "실시간 영상으로 연습해요" : "영상 연결 준비 중"}</span></span><ChevronRight size={20} aria-hidden />
        </button>
      </div>
      <p className="mt-4 text-sm text-ink-3">영상 연습의 상대방 대사는 음성과 영상을 만들기 위해 LiveKit과 음성 합성 제공자에게 전송되고, 음성은 Synthesia로 전달돼요.</p>
    </AppShell>
  );
}
