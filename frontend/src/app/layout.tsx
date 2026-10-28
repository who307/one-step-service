import type { Metadata, Viewport } from "next";
import { FlowProvider } from "@/features/flow/FlowProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "한걸음",
  description: "청년 프로그램, 미리 연습하고 더 가볍게 참여해요",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#faf5ef",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // data-theme은 화면 모드 버튼이 붙이므로 서버 HTML과 다를 수 있다
    <html lang="ko" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+KR:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body>
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-surface focus:px-4 focus:py-2">
          본문으로 건너뛰기
        </a>
        {/* 이용 중 데이터는 이 Provider의 메모리에만 있다. 새로고침하면 사라진다. */}
        <FlowProvider>{children}</FlowProvider>
      </body>
    </html>
  );
}
