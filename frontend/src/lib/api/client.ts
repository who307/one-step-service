// 백엔드(Spring) 호출 공통부.
// NEXT_PUBLIC_USE_MOCK=false 가 되기 전까지는 각 api 모듈이 mocks/ 데이터를 돌려준다.

export const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8080/api";
export const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK !== "false";

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export async function http<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  if (!res.ok) throw new ApiError(res.status, await res.text());
  const body = await res.json();
  return body.data as T; // 백엔드 ApiResponse<T> { success, data, message }
}
