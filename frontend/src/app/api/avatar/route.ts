import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import path from "node:path";
import { AccessToken, RoomAgentDispatch, RoomConfiguration } from "livekit-server-sdk";
import { NextResponse } from "next/server";
import { AVATARS, configuredAvatars, DEFAULT_AVATAR_KEY } from "@/features/simulation/avatar-catalog.mjs";

// 개발용 시연에만 노출한다. 운영 환경에는 인증과 사용량 제한이 필요하다.

const IMAGE_TYPES = ["webp", "jpg", "png"];

function connection() {
  const { LIVEKIT_URL: url, LIVEKIT_API_KEY: key, LIVEKIT_API_SECRET: secret, SYNTHESIA_API_KEY } = process.env;
  return url && key && secret && SYNTHESIA_API_KEY ? { url, key, secret } : null;
}

/** 고를 수 있는 아바타 key와 미리보기 사진 경로. 아바타 ID 자체는 브라우저에 보내지 않는다. */
export async function GET() {
  if (process.env.NODE_ENV !== "development") return new Response(null, { status: 404 });
  const ready = connection() !== null;
  const configured = configuredAvatars(process.env);
  const avatars = AVATARS.map(({ key }) => {
    const type = IMAGE_TYPES.find((ext) => existsSync(path.join(process.cwd(), "public", "avatars", `${key}.${ext}`)));
    return { key, available: ready && configured.has(key), image: type ? `/avatars/${key}.${type}` : null };
  });
  return NextResponse.json({ avatars }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  if (process.env.NODE_ENV !== "development") return new Response(null, { status: 404 });
  const origin = request.headers.get("origin");
  if (!origin || new URL(origin).host !== request.headers.get("host")) return new Response(null, { status: 403 });
  const conn = connection();
  const configured = configuredAvatars(process.env);
  if (!conn || configured.size === 0) {
    return NextResponse.json({ message: "아바타 연결 설정을 확인해 주세요." }, { status: 503 });
  }
  const body = (await request.json().catch(() => ({}))) as { avatar?: unknown };
  const requested = typeof body.avatar === "string" ? body.avatar : DEFAULT_AVATAR_KEY;
  if (!configured.has(requested)) {
    return NextResponse.json({ message: "고른 아바타를 아직 쓸 수 없어요." }, { status: 400 });
  }
  const room = `onestep-${randomUUID()}`;
  const token = new AccessToken(conn.key, conn.secret, { identity: `user-${randomUUID()}`, ttl: "5m" });
  token.addGrant({ roomJoin: true, room, canPublish: false, canSubscribe: true, canPublishData: true });
  // 워커는 key만 받아 자기 환경 변수에서 아바타·음성 ID를 다시 찾는다.
  token.roomConfig = new RoomConfiguration({
    agents: [new RoomAgentDispatch({ agentName: "onestep-avatar", metadata: JSON.stringify({ avatar: requested }) })],
    emptyTimeout: 30,
  });
  return NextResponse.json({ url: conn.url, token: await token.toJwt() }, { headers: { "Cache-Control": "no-store" } });
}
