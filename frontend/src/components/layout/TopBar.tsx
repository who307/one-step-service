"use client";

import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { IconButton } from "@/components/ui/Button";
import { HelpSheet } from "./HelpSheet";
import { ThemeToggle } from "./ThemeToggle";
import { FlowProgress } from "./FlowProgress";

/** back: 이동할 주소, 또는 이동 전에 확인이 필요할 때(연습 중단) 직접 처리하는 함수 */
export type Back = string | (() => void);

/**
 * 위쪽 바. 뒤로 가기(있으면) 옆에 한걸음 버튼이 모든 화면에 있고, 누르면 오늘(첫 화면)으로 간다.
 * onLeave: 연습 중처럼 떠나기 전 확인이 필요한 화면이면 이동 대신 이 함수를 부른다.
 */
export function TopBar({ back, step, onLeave }: { back?: Back; step?: number; onLeave?: (href: string) => void }) {
  return (
    <header className="sticky top-0 z-10 bg-paper">
      <div className="flex h-14 items-center gap-1 px-2">
        {typeof back === "string" ? (
          <IconButton href={back} label="뒤로 가기" tone="strong">
            <ChevronLeft size={24} aria-hidden />
          </IconButton>
        ) : back ? (
          <IconButton onClick={back} label="뒤로 가기" tone="strong">
            <ChevronLeft size={24} aria-hidden />
          </IconButton>
        ) : null}
        <Link
          href="/"
          aria-label="한걸음 첫 화면으로"
          onClick={
            onLeave
              ? (e) => {
                  e.preventDefault();
                  onLeave("/");
                }
              : undefined
          }
          className="flex min-h-11 items-center gap-2 rounded-md px-2 text-[17px] font-bold"
        >
          {/* 워드마크: 노선 위의 역 하나 */}
          <svg width="22" height="12" viewBox="0 0 22 12" aria-hidden>
            <defs>
              <linearGradient id="wordmark-route">
                <stop offset="0" stopColor="var(--route)" />
                <stop offset="1" stopColor="var(--glow)" />
              </linearGradient>
            </defs>
            <rect x="0" y="3.5" width="22" height="5" rx="2.5" fill="url(#wordmark-route)" />
            <circle cx="11" cy="6" r="5" fill="var(--surface)" stroke="var(--station)" strokeWidth="2.5" />
          </svg>
          한걸음
        </Link>
        <div className="ml-auto flex items-center">
          <ThemeToggle />
          <HelpSheet />
        </div>
      </div>
      {step !== undefined && <FlowProgress step={step} />}
    </header>
  );
}
