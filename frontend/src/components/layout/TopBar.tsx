"use client";

import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { IconButton } from "@/components/ui/Button";
import { HelpSheet } from "./HelpSheet";
import { ThemeToggle } from "./ThemeToggle";

export function TopBar({ title, back }: { title?: string; back?: string }) {
  return (
    <header className="sticky top-0 z-10 flex h-14 items-center gap-1 bg-paper px-2">
      {back ? (
        <IconButton href={back} label="뒤로 가기" tone="strong">
          <ChevronLeft size={24} aria-hidden />
        </IconButton>
      ) : (
        <Link href="/" className="flex min-h-11 items-center gap-2 px-2 text-[17px] font-bold">
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
      )}
      {title && <h1 className="min-w-0 flex-1 truncate text-[17px] font-semibold">{title}</h1>}
      <div className="ml-auto flex items-center">
        <ThemeToggle />
        <HelpSheet />
      </div>
    </header>
  );
}
