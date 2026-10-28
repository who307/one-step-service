"use client";

import { useState } from "react";
import { Moon, Sun } from "lucide-react";
import { IconButton } from "@/components/ui/Button";

const THEME_COLOR = { light: "#faf5ef", dark: "#141d1f" };

/**
 * 밝은 화면 / 어두운 화면 전환. 기본은 밝은 화면.
 * 고른 값도 기기에 저장하지 않는다(브라우저 저장소 미사용 원칙). 새로고침하면 밝은 화면으로 돌아온다.
 */
export function ThemeToggle() {
  const [dark, setDark] = useState(false);

  const toggle = () => {
    const next = !dark;
    setDark(next);
    const root = document.documentElement;
    if (next) root.dataset.theme = "dark";
    else delete root.dataset.theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", next ? THEME_COLOR.dark : THEME_COLOR.light);
  };

  return (
    <IconButton onClick={toggle} aria-pressed={dark} label={dark ? "밝은 화면으로 바꾸기" : "어두운 화면으로 바꾸기"}>
      {dark ? <Sun size={20} aria-hidden /> : <Moon size={20} aria-hidden />}
    </IconButton>
  );
}
