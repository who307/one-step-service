import { randomUUID } from "node:crypto";
import { AccessToken, RoomAgentDispatch, RoomConfiguration } from "livekit-server-sdk";
import { NextResponse } from "next/server";

// 개발용 시연에만 노출한다. 운영 환경에는 인증과 사용량 제한이 필요하다.
export async function POST(request: Request) {
  if (process.env.NODE_ENV !== "development") return new Response(null, { status: 404 });
  const origin = request.headers.get("origin");
  if (!origin || new URL(origin).host !== request.headers.get("host")) return new Response(null, { status: 403 });
  const { LIVEKIT_URL: url, LIVEKIT_API_KEY: key, LIVEKIT_API_SECRET: secret, SYNTHESIA_API_KEY, SYNTHESIA_AVATAR_ID } = process.env;
  if (!url || !key || !secret || !SYNTHESIA_API_KEY || !SYNTHESIA_AVATAR_ID) {
    return NextResponse.json({ message: "아바타 연결 설정을 확인해 주세요." }, { status: 503 });
  }
  const room = `onestep-${randomUUID()}`;
  const token = new AccessToken(key, secret, { identity: `user-${randomUUID()}`, ttl: "5m" });
  token.addGrant({ roomJoin: true, room, canPublish: false, canSubscribe: true, canPublishData: true });
  token.roomConfig = new RoomConfiguration({ agents: [new RoomAgentDispatch({ agentName: "onestep-avatar" })], emptyTimeout: 30 });
  return NextResponse.json({ url, token: await token.toJwt() }, { headers: { "Cache-Control": "no-store" } });
}
