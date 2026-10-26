"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Footprints, LineChart, MessageCircle, Search } from "lucide-react";

const items = [
  { href: "/", label: "오늘", icon: Footprints },
  { href: "/programs", label: "공고", icon: Search },
  { href: "/practice", label: "말 연습", icon: MessageCircle },
  { href: "/records", label: "내 기록", icon: LineChart },
];

export function BottomNav() {
  const path = usePathname();
  return (
    <nav aria-label="주요 메뉴" className="sticky bottom-0 z-10 border-t border-line bg-paper pb-[env(safe-area-inset-bottom)]">
      <ul className="grid grid-cols-4">
        {items.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? path === "/" : path.startsWith(href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
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
