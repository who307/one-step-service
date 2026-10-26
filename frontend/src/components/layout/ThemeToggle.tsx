"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { IconButton } from "@/components/ui/Button";

export const THEME_KEY = "onestep.theme";
const THEME_COLOR = { light: "#faf5ef", dark: "#141d1f" };

/**
 * 밝은 화면 / 어두운 화면 전환. 기본은 밝은 화면이고, 고른 값은 이 기기에만 저장한다.
 * 첫 화면 깜빡임을 막는 초기 적용은 layout.tsx의 인라인 스크립트가 맡는다.
 */
export function ThemeToggle() {
  const [dark, setDark] = useState<boolean | null>(null);

  useEffect(() => {
    setDark(document.documentElement.dataset.theme === "dark");
  }, []);

  const toggle = () => {
    const next = !dark;
    setDark(next);
    const root = document.documentElement;
    if (next) root.dataset.theme = "dark";
    else delete root.dataset.theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", next ? THEME_COLOR.dark : THEME_COLOR.light);
    try {
      localStorage.setItem(THEME_KEY, next ? "dark" : "light");
    } catch {}
  };

  return (
    <IconButton onClick={toggle} aria-pressed={dark ?? false} label={dark ? "밝은 화면으로 바꾸기" : "어두운 화면으로 바꾸기"}>
      {/* 마운트 전에는 자리만 잡아 아이콘이 바뀌며 튀지 않게 한다 */}
      {dark === null ? <span className="size-5" /> : dark ? <Sun size={20} aria-hidden /> : <Moon size={20} aria-hidden />}
    </IconButton>
  );
}
