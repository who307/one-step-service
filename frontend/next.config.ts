import type { NextConfig } from "next";
import { config } from "dotenv";

// 로컬 백엔드와 비밀 설정을 공유한다. NEXT_PUBLIC 변수로 내보내지 않는다.
config({ path: "../backend/.env", quiet: true });

const nextConfig: NextConfig = {
  // 개발 서버(npm run dev)와 검사용 빌드가 같은 .next 폴더를 덮어쓰지 않도록 분리할 수 있게 한다.
  // 예: NEXT_DIST_DIR=.next-check npm run build
  distDir: process.env.NEXT_DIST_DIR ?? ".next",
};

export default nextConfig;
