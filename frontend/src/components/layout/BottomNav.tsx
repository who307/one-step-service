"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Footprints, LineChart, MessageCircle, Search } from "lucide-react";

// 아래 탭. 모든 화면에 있고, 지금 화면이 속한 단계의 탭이 켜진다.
// 어느 탭이든 공고를 고르지 않고 바로 열 수 있다(말 연습은 일반 상황으로 연습).
const items = [
  { href: "/", label: "오늘", icon: Footprints },
  { href: "/programs", label: "공고", icon: Search },
  { href: "/practice", label: "말 연습", icon: MessageCircle },
  { href: "/records", label: "내 기록", icon: LineChart },
] as const;

type TabHref = (typeof items)[number]["href"];

/**
 * 화면 → 탭.
 * 공고: 공고 고르기·걱정·문의 문장
 * 말 연습: 연습 전 마음·연습 설정·연습·연습 후 마음
 * 내 기록: 결과·내 기록·나의 노선(실제 참여 체크)
 * 그 밖(시작·이용 안내·도움)은 오늘
 */
export function tabOf(path: string): TabHref {
  const under = (...prefixes: string[]) => prefixes.some((p) => path === p || path.startsWith(`${p}/`));
  if (under("/programs", "/concerns","/inquiry")) return "/programs";
  if (under("/practice", "/check")) return "/practice";
  if (under("/result", "/records", "/journey")) return "/records";
  return "/";
}

/** onLeave: 연습 중처럼 떠나기 전에 확인이 필요한 화면이면 이동 대신 이 함수를 부른다. */
export function BottomNav({ onLeave }: { onLeave?: (href: string) => void }) {
  const current = tabOf(usePathname());
  return (
    <nav aria-label="주요 메뉴" className="border-t border-line bg-paper pb-[env(safe-area-inset-bottom)]">
      <ul className="grid grid-cols-4">
        {items.map(({ href, label, icon: Icon }) => {
          const active = href === current;
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                onClick={
                  onLeave
                    ? (e) => {
                        e.preventDefault();
                        onLeave(href);
                      }
                    : undefined
                }
                className={`relative flex min-h-14 flex-col items-center justify-center gap-0.5 text-[13px] ${
                  active ? "font-semibold text-ink" : "text-ink-3 hover:text-ink"
                }`}
              >
                {/* 현재 위치 표시: 노선 색 막대 */}
                {active && <span aria-hidden className="absolute inset-x-5 top-0 h-[3px] rounded-b-full bg-route" />}
                <Icon size={22} aria-hidden strokeWidth={active ? 2.3 : 1.8} />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
