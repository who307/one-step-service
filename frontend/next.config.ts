import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 개발 서버(npm run dev)와 검사용 빌드가 같은 .next 폴더를 덮어쓰지 않도록 분리할 수 있게 한다.
  // 예: NEXT_DIST_DIR=.next-check npm run build
  distDir: process.env.NEXT_DIST_DIR ?? ".next",
};

export default nextConfig;
