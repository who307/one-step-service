import type { ErrorCode } from "@/types/api";

// 백엔드(Spring) 호출 공통부. 프론트는 DB나 외부 AI에 직접 닿지 않고 여기만 거친다.

export const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8080/api/v1";
/** true면 백엔드 없이 lib/mock 으로 전체 흐름이 돈다. 화면에 "예시 응답"을 항상 표시한다. */
export const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK !== "false";

const TIMEOUT_MS = 15_000;

const FALLBACK_MESSAGE: Record<ErrorCode, string> = {
  INVALID_LENGTH: "입력 길이를 확인해 주세요.",
  INVALID_REQUEST: "요청을 처리하지 못했어요. 다시 시도해 주세요.",
  NOT_A_NOTICE: "공고문이 아닌 것 같아요. 지원 프로그램 안내 글을 확인해 주세요.",
  NOT_FOUND: "공고를 찾지 못했어요.",
  INVALID_STATE: "연습 단계가 맞지 않아요. 처음부터 다시 시작해 주세요.",
  RATE_LIMITED: "요청이 많아 잠시 쉬어야 해요. 조금 뒤에 다시 시도해 주세요.",
  LLM_ERROR: "잠시 연결이 어려워요. 다시 시도해 주세요.",
  LLM_TIMEOUT: "응답이 지연되고 있어요. 다시 시도해 주세요.",
  INTERNAL_ERROR: "일시적인 문제가 생겼어요. 다시 시도해 주세요.",
  NETWORK_ERROR: "인터넷 연결을 확인해 주세요.",
};

export class ApiError extends Error {
  constructor(
    public code: ErrorCode,
    message?: string,
  ) {
    super(message ?? FALLBACK_MESSAGE[code]);
  }
}

/** 사용자가 취소한 요청. 오류 화면을 띄우지 않는다. */
export function isAbort(e: unknown) {
  return e instanceof DOMException && e.name === "AbortError";
}

export async function http<T>(path: string, init?: RequestInit & { signal?: AbortSignal }): Promise<T> {
  const timeout = AbortSignal.timeout(TIMEOUT_MS);
  const signal = init?.signal ? AbortSignal.any([init.signal, timeout]) : timeout;

  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      ...init,
      signal,
      headers: { "Content-Type": "application/json", ...init?.headers },
    });
  } catch (e) {
    if (init?.signal?.aborted) throw e;
    if (timeout.aborted) throw new ApiError("LLM_TIMEOUT");
    throw new ApiError("NETWORK_ERROR");
  }

  if (!res.ok) {
    let body: { code?: ErrorCode; message?: string } = {};
    try {
      body = await res.json();
    } catch {}
    throw new ApiError(body.code ?? (res.status >= 500 ? "LLM_ERROR" : "INVALID_REQUEST"), body.message);
  }
  return (await res.json()) as T;
}

export const post = <T>(path: string, body: unknown, signal?: AbortSignal) =>
  http<T>(path, { method: "POST", body: JSON.stringify(body), signal });
