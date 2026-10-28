import type { ChatLine, CompleteRequest, CompleteResponse, MessageRequest, MessageResponse, SceneId, SimulationStart, SimulationStartRequest } from "@/types/api";
import { levelInfo, sceneTitle } from "@/lib/labels";
import { hasCrisisSignal } from "@/lib/safety";

// 예시 연습 상대. 정해진 대본을 턴 순서대로 말한다. 실제 AI가 아니라는 것을 화면에 항상 표시한다.
// 대화 규칙: 1~2문장, 질문은 하나, 비난·평가·재촉 없음. 공고에 없는 사실을 단정하지 않는다.

interface SceneScript {
  lines: string[]; // AI 대사. 0번은 첫 인사, n번은 사용자 n번째 말 뒤
  choices: string[][]; // L2 선택지. choices[i]는 lines[i]에 대한 답
  alternatives: string[][]; // 대안 문장. alternatives[i]는 lines[i]에 대한 답을 짧은 것부터
  closing: string;
}

const SCRIPTS: Record<SceneId, SceneScript> = {
  CHECKIN: {
    lines: [
      "안녕하세요! {title} 참여하러 오셨나요?",
      "반가워요. 확인을 위해 성함을 알려주시겠어요?",
      "네, 확인됐어요. 혹시 오늘 처음 오셨어요?",
      "처음이시군요. 시작 전까지 저쪽 자리에서 기다리시면 돼요. 궁금한 점 있으세요?",
      "그건 담당 선생님께 확인해 드릴게요. 또 필요한 건 없으세요?",
      "시작하면 담당 선생님이 안내해 주실 거예요. 긴장되면 편하게 말씀해 주세요.",
      "물 한 잔 드릴까요?",
      "곧 시작할게요. 와 주셔서 고마워요.",
    ],
    choices: [
      ["네, 신청한 ○○○입니다.", "네, 처음 와서요. 여기가 맞나요?", "잠시만요, 확인해 볼게요."],
      ["○○○입니다.", "○○○이에요. 신청 문자 보여드릴까요?", "이름 말고 다른 걸로 확인해도 될까요?"],
      ["네, 처음이에요.", "네, 처음이라 조금 긴장돼요.", "아니요, 전에 와 봤어요."],
      ["어디에 앉으면 될까요?", "가방은 어디에 두면 될까요?", "아니요, 괜찮아요."],
      ["괜찮아요, 감사합니다.", "시작은 몇 시예요?", "화장실은 어디예요?"],
    ],
    alternatives: [
      ["네, 신청했어요.", "안녕하세요, {title} 신청한 ○○○입니다.", "처음이라 그런데, 여기서 접수하면 될까요?"],
      ["○○○입니다.", "○○○입니다. 명단에 있는지 확인해 주실 수 있나요?"],
      ["네, 처음이에요.", "네, 처음이라 안내가 필요해요.", "처음이라 조금 긴장되는데, 어떻게 하면 될까요?"],
      ["어디서 기다리면 될까요?", "혹시 준비해야 할 것이 있을까요?"],
      ["괜찮아요, 감사합니다.", "시작 전에 화장실 다녀와도 될까요?"],
      ["감사합니다.", "네, 조금 긴장되는데 천천히 해 볼게요."],
      ["네, 감사합니다.", "괜찮아요, 고마워요."],
      ["네, 감사합니다.", "잘 부탁드려요."],
    ],
    closing: "연습은 여기까지예요. 접수처에서 할 말을 끝까지 해 봤어요.",
  },
  GREETING: {
    lines: [
      "안녕하세요! 저도 오늘 처음 왔어요. 옆에 앉아도 될까요?",
      "고마워요. 이름이 어떻게 되세요?",
      "반가워요. 이 프로그램은 어떻게 알게 됐어요?",
      "그렇구나. 오늘 활동은 기대돼요?",
      "저도 조금 긴장돼요. 이런 활동 해 본 적 있어요?",
      "그렇군요. 끝나고 같이 정리 도와줄래요?",
      "좋아요. 다음 시간에도 올 거예요?",
      "오늘 이야기 나눠서 좋았어요.",
    ],
    choices: [
      ["네, 앉으세요.", "네, 저도 처음이에요.", "(고개를 끄덕인다)"],
      ["○○○이에요.", "○○○이에요. 그쪽은요?", "이름은 나중에 말해도 될까요?"],
      ["홈페이지에서 봤어요.", "추천받아서 왔어요.", "그냥 우연히요."],
      ["네, 조금요.", "긴장돼서 잘 모르겠어요.", "처음이라 걱정돼요."],
      ["처음이에요.", "비슷한 건 해 봤어요.", "잘 기억이 안 나요."],
    ],
    alternatives: [
      ["네, 앉으세요.", "네, 저도 처음이라 반가워요."],
      ["○○○이에요.", "○○○이라고 해요. 이름 물어봐도 될까요?"],
      ["홈페이지에서 봤어요.", "공고를 보고 신청했어요. 그쪽은요?"],
      ["네, 조금요.", "기대되는데 조금 긴장도 돼요."],
      ["처음이에요.", "처음이라 잘 모르는데, 같이 하면 좋겠어요."],
      ["네, 좋아요.", "오늘은 먼저 가 봐야 해서요. 다음에 도울게요."],
      ["아마 올 것 같아요.", "아직 모르겠어요. 생각해 볼게요."],
      ["저도요. 다음에 또 봬요.", "고마워요, 덕분에 덜 긴장됐어요."],
    ],
    closing: "연습은 여기까지예요. 처음 만난 사람과 인사를 끝까지 나눠 봤어요.",
  },
  CLOSING: {
    lines: [
      "오늘 활동 어떠셨어요? 한 분씩 짧게 소감을 나눠 볼게요.",
      "고마워요. 오늘 가장 기억에 남는 순간이 있었나요?",
      "좋네요. 어렵거나 불편한 점은 없었어요?",
      "말씀해 주셔서 고마워요. 다음 시간에 해 보고 싶은 게 있나요?",
      "좋아요. 다음에 또 볼 수 있으면 좋겠어요.",
      "혹시 다른 분들께 하고 싶은 말이 있나요?",
      "네, 고마워요. 조심히 들어가세요.",
      "오늘 함께해 줘서 고마워요.",
    ],
    choices: [
      ["좋았어요.", "처음이라 긴장했는데 생각보다 괜찮았어요.", "다음에 말해도 될까요?"],
      ["처음 인사할 때요.", "다 같이 무언가 할 때요.", "딱히 없어요."],
      ["괜찮았어요.", "조금 시끄러웠어요.", "말하기는 아직 어려워요."],
      ["오늘이랑 비슷하게 하고 싶어요.", "다른 것도 해 보고 싶어요.", "아직 모르겠어요."],
      ["네, 다음에 봬요.", "올 수 있으면 올게요.", "감사합니다."],
    ],
    alternatives: [
      ["좋았어요.", "처음이라 긴장했는데 오길 잘한 것 같아요."],
      ["처음 인사할 때요.", "다 같이 무언가를 할 때가 좋았어요."],
      ["괜찮았어요.", "조금 긴장됐지만 괜찮았어요."],
      ["아직 모르겠어요.", "오늘처럼 천천히 하면 좋겠어요."],
      ["네, 다음에 봬요.", "올 수 있으면 올게요. 감사합니다."],
      ["다들 수고하셨어요.", "덕분에 편했어요. 고마워요."],
      ["네, 감사합니다.", "안녕히 계세요."],
      ["감사합니다.", "저도 고마웠어요."],
    ],
    closing: "연습은 여기까지예요. 소감 한마디를 끝까지 말해 봤어요.",
  },
  FIRST_INQUIRY: {
    lines: [
      "안녕하세요, {title} 담당자 역할의 연습 상대예요. 무엇이 궁금하세요?",
      "네, 그 부분은 공고에 적힌 안내를 함께 확인해 볼게요. 다른 궁금한 점도 있으세요?",
      "처음 오시는 분도 있으니 편하게 물어보셔도 돼요. 또 있을까요?",
      "알겠어요. 연락받을 이름을 알려 주시겠어요?",
      "확인했어요. 더 궁금한 건 없으세요?",
      "혹시 오시는 길도 같이 확인해 볼까요?",
      "도움이 됐다니 다행이에요. 또 궁금한 게 있으세요?",
      "네, 그럼 프로그램에서 뵐게요.",
    ],
    choices: [
      ["신청하고 싶어서 연락드렸어요.", "준비물이 있는지 궁금해요.", "처음인데 참여해도 되는지 궁금해요."],
      ["몇 시에 끝나나요?", "혼자 가도 되나요?", "아니요, 괜찮아요."],
      ["처음 가는 거라 조금 걱정돼요.", "비용이 있나요?", "아니요, 그게 다예요."],
      ["○○○입니다.", "이름은 신청할 때 남길게요.", "네, 잠시만요."],
      ["감사합니다.", "네, 알겠습니다.", "문자로 안내받을 수 있을까요?"],
    ],
    alternatives: [
      ["프로그램 문의드리려고요.", "안녕하세요. {title} 프로그램에 대해 몇 가지 여쭤봐도 될까요?"],
      ["준비물이 있나요?", "혹시 준비해야 할 것이 있을까요?"],
      ["혼자 가도 되나요?", "처음이라 조금 걱정되는데, 처음 오는 분도 많나요?"],
      ["○○○입니다.", "○○○입니다. 연락은 문자로 주시면 좋겠어요."],
      ["감사합니다.", "친절하게 알려 주셔서 감사합니다."],
      ["네, 알려 주세요.", "괜찮아요, 지도에서 찾아볼게요."],
      ["네, 괜찮아요.", "덕분에 궁금한 게 풀렸어요."],
      ["네, 감사합니다.", "그날 뵐게요."],
    ],
    closing: "연습은 여기까지예요. 궁금한 점을 끝까지 물어봤어요.",
  },
};

const fill = (s: string, title: string) => s.replaceAll("{title}", title);
const DISCLAIMER = "저는 실제 담당자가 아니라 연습 상대예요. 언제든 멈춰도 괜찮아요.";

export function mockStart(req: SimulationStartRequest): SimulationStart {
  const s = SCRIPTS[req.sceneId];
  const { maxTurns } = levelInfo(req.level);
  let script: ChatLine[] | null = null;
  if (req.level === "L1") {
    script = [];
    for (let i = 0; i < maxTurns / 2; i++) {
      script.push({ role: "AI", text: fill(s.lines[i], req.programTitle) });
      const alt = s.alternatives[i];
      script.push({ role: "USER", text: fill(alt[alt.length - 1], req.programTitle) });
    }
  }
  return {
    simulationId: crypto.randomUUID(),
    source: "MOCK",
    maxTurns,
    disclaimer: DISCLAIMER,
    opening: {
      text: fill(s.lines[0], req.programTitle),
      choices: req.level === "L2" ? s.choices[0].map((c) => fill(c, req.programTitle)) : null,
    },
    script,
  };
}

export function mockMessage(req: MessageRequest): MessageResponse {
  const s = SCRIPTS[req.sceneId];
  const { maxTurns } = levelInfo(req.level);
  const turn = req.history.filter((h) => h.role === "USER").length + 1;
  if (hasCrisisSignal(req.userText)) return { crisis: true, reply: null, alternatives: [], turn, finished: true };

  const finished = turn >= maxTurns;
  const alternatives = (s.alternatives[turn - 1] ?? s.alternatives[s.alternatives.length - 1]).map((a) => fill(a, req.programTitle));
  const text = finished ? s.closing : fill(s.lines[turn] ?? s.lines[s.lines.length - 1], req.programTitle);
  const choices = !finished && req.level === "L2" ? (s.choices[turn] ?? null) : null;
  return { crisis: false, reply: { text, choices }, alternatives, turn, finished };
}

export function mockComplete(req: CompleteRequest): CompleteResponse {
  const s = SCRIPTS[req.sceneId];
  const said = req.history.filter((h) => h.role === "USER").length;
  const summary =
    req.level === "L1"
      ? `${sceneTitle(req.sceneId)} 예시 대화를 끝까지 지켜봤어요.`
      : said === 0
        ? `${sceneTitle(req.sceneId)} 장면을 열어 봤어요. 다음엔 한마디만 해 봐도 충분해요.`
        : `${sceneTitle(req.sceneId)} 장면에서 ${said}번 말해 봤어요.`;
  const pick = (i: number) => {
    const a = s.alternatives[i];
    return fill(a[a.length - 1], req.programTitle);
  };
  return { summary, nextPhrases: [pick(0), pick(2)] };
}
