// 영상 연습 상대 목록. 화면(이름·소개), 토큰 발급 라우트, 아바타 워커(avatar-agent.mjs)가 함께 쓴다.
// 비밀값은 없다. 실제 Synthesia 아바타 ID와 음성 ID는 서버 환경 변수에서만 읽는다.
//
//   SYNTHESIA_AVATARS=jihyun:<아바타 ID>[:<음성 ID>],minjun:<아바타 ID>[:<음성 ID>]
//   SYNTHESIA_AVATAR_ID=<아바타 ID>   (예전 설정. SYNTHESIA_AVATARS에 jihyun이 없으면 jihyun으로 쓴다)
//
// 음성 ID를 비우면 AVATAR_TTS_VOICE, 그것도 없으면 기본 음성을 쓴다.

// 미리보기 사진은 public/avatars/<key>.png 이다. Synthesia 화면의 썸네일 주소는 서명이 하루 안에 만료되므로 내려받아 둔다.

export const AVATARS = /** @type {const} */ ([
  { key: "jihyun", name: "지현", description: "친절하고 차분하게 안내하는 담당자" },
  { key: "minjun", name: "민준", description: "논리적으로 차근차근 설명하는 담당자" },
]);

export const DEFAULT_AVATAR_KEY = "jihyun";
export const DEFAULT_TTS_VOICE = "db6b0ed5-d5d3-463d-ae85-518a07d3c2b4";

const ID = /^[A-Za-z0-9_-]{1,128}$/;

/**
 * 환경 변수에서 목록 key → { avatarId, voice } 를 만든다. 목록에 없는 key, 형식이 이상한 ID는 버린다.
 * @param {Record<string, string | undefined>} env
 * @returns {Map<string, { avatarId: string, voice: string }>}
 */
export function configuredAvatars(env) {
  const known = new Set(AVATARS.map((a) => a.key));
  const fallbackVoice = env.AVATAR_TTS_VOICE && ID.test(env.AVATAR_TTS_VOICE) ? env.AVATAR_TTS_VOICE : DEFAULT_TTS_VOICE;
  /** @type {Map<string, { avatarId: string, voice: string }>} */
  const result = new Map();
  for (const entry of (env.SYNTHESIA_AVATARS ?? "").split(",")) {
    const [key, avatarId, voice] = entry.trim().split(":").map((part) => part.trim());
    if (!key || !known.has(key) || !avatarId || !ID.test(avatarId) || result.has(key)) continue;
    result.set(key, { avatarId, voice: voice && ID.test(voice) ? voice : fallbackVoice });
  }
  const legacy = env.SYNTHESIA_AVATAR_ID?.trim();
  if (!result.has(DEFAULT_AVATAR_KEY) && legacy && ID.test(legacy)) {
    result.set(DEFAULT_AVATAR_KEY, { avatarId: legacy, voice: fallbackVoice });
  }
  return result;
}
