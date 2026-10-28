import type {
  CompleteRequest,
  CompleteResponse,
  InquiryRequest,
  InquiryResponse,
  MessageRequest,
  MessageResponse,
  ProgramDetail,
  ProgramList,
  RecommendationList,
  RecommendationRequest,
  SimulationStart,
  SimulationStartRequest,
  Timeline,
  TimelineRequest,
} from "@/types/api";
import { mockGetProgram, mockListPrograms, mockRecommend } from "@/lib/mock/programs";
import { mockTimeline } from "@/lib/mock/timeline";
import { mockComplete, mockMessage, mockStart } from "@/lib/mock/simulation";
import { josa } from "@/lib/josa";
import { looksLikeNotice } from "@/lib/safety";
import { ApiError, USE_MOCK, http, post } from "./client";

// 화면은 이 함수들만 부른다. USE_MOCK이거나 사용자가 "예시로 보기"를 고르면(mock: true) 백엔드 대신 lib/mock을 쓴다.

export { ApiError, USE_MOCK, isAbort } from "./client";

type Opts = { signal?: AbortSignal; mock?: boolean };

/** 예시 응답도 실제 요청처럼 잠깐 기다리게 해서 로딩·취소 화면을 똑같이 확인할 수 있게 한다. */
function fake<T>(make: () => T, ms: number, signal?: AbortSignal): Promise<T> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(new DOMException("aborted", "AbortError"));
    const t = setTimeout(() => {
      try {
        resolve(make());
      } catch (e) {
        reject(e);
      }
    }, ms);
    signal?.addEventListener("abort", () => {
      clearTimeout(t);
      reject(new DOMException("aborted", "AbortError"));
    });
  });
}

const mockOn = (o?: Opts) => USE_MOCK || o?.mock === true;
const qs = (r: RecommendationRequest) =>
  new URLSearchParams(Object.entries(r).filter(([, v]) => v) as [string, string][]).toString();

export const api = {
  listPrograms: (r: RecommendationRequest, o?: Opts) =>
    mockOn(o) ? fake(() => mockListPrograms(r), 250, o?.signal) : http<ProgramList>(`/programs?${qs(r)}`, { signal: o?.signal }),

  recommend: (r: RecommendationRequest, o?: Opts) =>
    mockOn(o) ? fake(() => mockRecommend(r), 250, o?.signal) : post<RecommendationList>("/recommendations", r, o?.signal),

  getProgram: (id: string, o?: Opts) =>
    mockOn(o)
      ? fake(
          () => {
            const p = mockGetProgram(id);
            if (!p) throw new ApiError("NOT_FOUND");
            return p;
          },
          200,
          o?.signal,
        )
      : http<ProgramDetail>(`/programs/${encodeURIComponent(id)}`, { signal: o?.signal }),

  createTimeline: (r: TimelineRequest, programTitle: string | undefined, o?: Opts) =>
    mockOn(o)
      ? fake(
          () => {
            if (!looksLikeNotice(r.noticeText)) throw new ApiError("NOT_A_NOTICE");
            return mockTimeline(r, programTitle);
          },
          1200,
          o?.signal,
        )
      : post<Timeline>("/timelines", r, o?.signal),

  startSimulation: (r: SimulationStartRequest, o?: Opts) =>
    mockOn(o) ? fake(() => mockStart(r), 500, o?.signal) : post<SimulationStart>("/simulations", r, o?.signal),

  sendMessage: (id: string, r: MessageRequest, o?: Opts) =>
    mockOn(o) ? fake(() => mockMessage(r), 700, o?.signal) : post<MessageResponse>(`/simulations/${id}/messages`, r, o?.signal),

  completeSimulation: (id: string, r: CompleteRequest, o?: Opts) =>
    mockOn(o) ? fake(() => mockComplete(r), 500, o?.signal) : post<CompleteResponse>(`/simulations/${id}/complete`, r, o?.signal),

  draftInquiry: (r: InquiryRequest, o?: Opts) =>
    mockOn(o) ? fake(() => ({ text: composeInquiry(r) }), 400, o?.signal) : post<InquiryResponse>("/inquiries/draft", r, o?.signal),
};

function composeInquiry(r: InquiryRequest) {
  const to = r.organization ? `${r.organization} 담당자님, ` : "";
  return [
    `안녕하세요. ${to}‘${r.programTitle}’ 프로그램에 관심이 있어 문의드립니다.`,
    r.userNote?.trim() ? `${r.userNote.trim()}` : null,
    "",
    `${josa(r.questions.length > 1 ? "아래 내용" : r.questions[0], "을/를")} 알 수 있을까요?`,
    ...(r.questions.length > 1 ? r.questions.map((q) => `- ${q}`) : []),
    "",
    "답변 주시면 참여를 준비하는 데 도움이 될 것 같아요. 감사합니다.",
  ]
    .filter((l) => l !== null)
    .join("\n");
}
