import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "한걸음",
  description: "첫 참석 전, 미리 알고 미리 해보는 준비 도구",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#faf5ef",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // data-theme은 아래 스크립트가 그리기 전에 붙이므로 서버 HTML과 다를 수 있다
    <html lang="ko" suppressHydrationWarning>
      <head>
        {/* 고른 화면 모드를 첫 페인트 전에 적용해 밝은 화면이 잠깐 번쩍이는 것을 막는다 */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{if(localStorage.getItem("onestep.theme")==="dark"){document.documentElement.dataset.theme="dark";var m=document.querySelector('meta[name="theme-color"]');m&&m.setAttribute("content","#141d1f")}}catch(e){}`,
          }}
        />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+KR:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body>
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-surface focus:px-4 focus:py-2">
          본문으로 건너뛰기
        </a>
        {children}
      </body>
    </html>
  );
}
