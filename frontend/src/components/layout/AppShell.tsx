import type { ReactNode } from "react";
import { TopBar } from "./TopBar";
import { BottomNav } from "./BottomNav";

// 모바일 우선 단일 컬럼. 데스크톱에서는 가운데 폰 폭 컬럼으로 보인다.
export function AppShell({
  title,
  back,
  children,
  footer,
  hideNav,
}: {
  title?: string;
  back?: string;
  children: ReactNode;
  /** 화면 하단에 고정되는 주요 행동 영역 */
  footer?: ReactNode;
  hideNav?: boolean;
}) {
  return (
    <div className="mx-auto flex min-h-dvh max-w-120 flex-col">
      <TopBar title={title} back={back} />
      <main id="main" className="min-w-0 flex-1 px-4 pb-8 pt-2">
        {children}
      </main>
      {footer && (
        <div className="sticky bottom-0 z-10 border-t border-line bg-paper px-4 pb-[max(env(safe-area-inset-bottom),16px)] pt-3">
          {footer}
        </div>
      )}
      {!hideNav && !footer && <BottomNav />}
    </div>
  );
}
