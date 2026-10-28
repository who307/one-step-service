import type { ReactNode } from "react";
import { BottomNav } from "./BottomNav";
import { TopBar, type Back } from "./TopBar";

// 모바일 우선 단일 컬럼. 데스크톱에서는 가운데 폰 폭 컬럼으로 보인다.
// 모든 화면에 위쪽 한걸음(홈) 버튼과 아래 탭이 있다.
export function AppShell({
  back,
  step,
  children,
  footer,
  onLeave,
}: {
  back?: Back;
  /** S1~S8 흐름 안의 화면이면 0부터 시작하는 단계 번호 */
  step?: number;
  children: ReactNode;
  /** 화면 하단(아래 탭 바로 위)에 고정되는 주요 행동 영역 */
  footer?: ReactNode;
  /** 연습 중처럼 떠나기 전에 확인해야 하는 화면: 홈 버튼·아래 탭을 누르면 이동 대신 이 함수를 부른다 */
  onLeave?: (href: string) => void;
}) {
  return (
    <div className="mx-auto flex min-h-dvh max-w-120 flex-col">
      <TopBar back={back} step={step} onLeave={onLeave} />
      <main id="main" className="min-w-0 flex-1 px-4 pb-8 pt-2">
        {children}
      </main>
      <div className="sticky bottom-0 z-10 bg-paper">
        {footer && <div className="border-t border-line px-4 pb-3 pt-3">{footer}</div>}
        <BottomNav onLeave={onLeave} />
      </div>
    </div>
  );
}

/** 화면 제목. 흐름 화면마다 같은 크기·간격을 쓴다. */
export function ScreenTitle({ children, sub }: { children: ReactNode; sub?: ReactNode }) {
  return (
    <div className="pb-5 pt-2">
      <h1 className="text-[24px] font-bold leading-snug">{children}</h1>
      {sub && <p className="mt-1.5 text-[15px] text-ink-2">{sub}</p>}
    </div>
  );
}
