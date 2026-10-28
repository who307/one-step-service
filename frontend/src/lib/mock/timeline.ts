import type { ChecklistItem, Timeline, TimelineRequest, TimelineStep } from "@/types/api";

// 규칙 기반 예시 타임라인. 공고문 줄을 직접 찾아 근거(sourceQuote)로 쓰고,
// 찾지 못한 내용은 "예상"으로만 쓰며 확인 필요 목록에 올린다. 지어낸 사실을 확인됨으로 쓰지 않는다.

const KEY = (words: string) => new RegExp(`^[\\s■□▶·•※\\-*]*(?:${words})\\s*[:：]\\s*(.+)$`);
const TIME = /\d{1,2}:\d{2}/g;

function findLine(lines: string[], re: RegExp) {
  for (const line of lines) {
    const m = line.match(re);
    if (m) return { line, value: m[1].trim() };
  }
  return null;
}

const confirmed = (step: Omit<TimelineStep, "label">): TimelineStep => ({ ...step, label: "CONFIRMED" });
const simulated = (step: Omit<TimelineStep, "label" | "sourceQuote">): TimelineStep => ({ ...step, label: "SIMULATED", sourceQuote: null });

const CONCERN_TIPS: [RegExp, string][] = [
  [/장소/, "미리 지도에서 건물 입구 사진을 확인해 두면 처음 가는 길이 덜 낯설어요."],
  [/대화/, "처음 할 말은 ‘안녕하세요, 신청한 ○○○입니다’ 한 문장이면 충분해요."],
  [/절차|신청|접수/, "헷갈리는 절차는 문의 문장을 만들어 미리 물어볼 수 있어요."],
  [/활동|해낼/, "모든 활동을 잘하지 않아도 괜찮아요. 오늘은 도착까지만 목표로 해도 돼요."],
];

export function mockTimeline(req: TimelineRequest, programTitle?: string): Timeline {
  const lines = req.noticeText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const unknowns: string[] = [];

  const header = lines[0]?.match(/^\[(.+?)\]\s*(.+)$/);
  const program = {
    title: programTitle ?? header?.[2] ?? findLine(lines, KEY("프로그램명"))?.value ?? "입력한 공고",
    organization: header?.[1] ?? null,
  };

  const place = findLine(lines, KEY("장소|모이는 곳|활동 장소"));
  const schedule = findLine(lines, KEY("활동 일시|활동 일자|일시|일정|활동 기간"));
  const times = schedule?.value.match(TIME) ?? [];
  const checkinLine = lines.find((l) => /안내데스크|이름 확인|출석|접수처/.test(l));
  const activity = findLine(lines, KEY("진행 순서|활동 내용|참여 방법"));
  const supplies = findLine(lines, KEY("준비물"));

  const arrive = place
    ? confirmed({ phase: "ARRIVE", title: "도착", description: `${place.value}에 도착해요.`, time: times[0] ?? null, place: place.value, sourceQuote: place.line })
    : (unknowns.push("장소"),
      simulated({ phase: "ARRIVE", title: "도착", description: "보통은 안내된 장소에 10분쯤 일찍 도착해요. 장소는 공고에서 확인되지 않았어요.", time: null, place: null }));

  const checkin = checkinLine
    ? confirmed({ phase: "CHECKIN", title: "접수", description: "도착하면 이름을 확인하고 안내를 받아요.", time: null, place: null, sourceQuote: checkinLine })
    : (unknowns.push("접수 방법"),
      simulated({ phase: "CHECKIN", title: "접수", description: "보통은 입구나 안내 데스크에서 이름을 말하고 접수해요. 공고에서 확인되지 않았어요.", time: null, place: null }));

  const activityStep = activity
    ? confirmed({ phase: "ACTIVITY", title: "활동", description: activity.value, time: times[0] ?? null, place: null, sourceQuote: activity.line })
    : schedule
      ? confirmed({ phase: "ACTIVITY", title: "활동", description: `${schedule.value}에 활동해요.`, time: times[0] ?? null, place: null, sourceQuote: schedule.line })
      : (unknowns.push("활동 일정"),
        simulated({ phase: "ACTIVITY", title: "활동", description: "프로그램 안내에 따라 활동해요. 세부 순서는 공고에서 확인되지 않았어요.", time: null, place: null }));

  const endTime = times.length > 1 ? times[times.length - 1] : null;
  const leave =
    schedule && endTime
      ? confirmed({ phase: "LEAVE", title: "귀가", description: `${endTime}쯤 활동이 끝나요. 끝나고 바로 나가도 괜찮아요.`, time: endTime, place: null, sourceQuote: schedule.line })
      : (unknowns.push("마치는 시간"),
        simulated({ phase: "LEAVE", title: "귀가", description: "활동을 마치고 돌아가요. 마치는 시간은 공고에서 확인되지 않았어요.", time: null, place: null }));

  const checklist: ChecklistItem[] = [];
  if (supplies) {
    for (const item of supplies.value.split(/,|·|\//).map((s) => s.trim()).filter(Boolean)) {
      checklist.push({ item: /^없음/.test(item) ? `따로 챙길 준비물 없음 ${item.replace(/^없음\s*/, "")}`.trim() : item, label: "CONFIRMED", sourceQuote: supplies.line });
    }
  } else {
    unknowns.push("준비물");
  }
  checklist.push(
    { item: "휴대폰 충전", label: "SIMULATED", sourceQuote: null },
    { item: "교통카드", label: "SIMULATED", sourceQuote: null },
  );

  // "※ 참여 대상은 홈페이지 확인" 같은 줄은 근거가 아니다. "항목: 값" 형태만 확인된 것으로 본다.
  if (!findLine(lines, KEY("참가비|재료비|비용|활동비"))) unknowns.push("비용");
  if (!findLine(lines, KEY("모집 대상|참여 대상|대상"))) unknowns.push("참여 대상");

  const tips = req.concerns.flatMap((c) => CONCERN_TIPS.filter(([re]) => re.test(c)).map(([, t]) => t));
  if (req.concerns.some((c) => !CONCERN_TIPS.some(([re]) => re.test(c)))) tips.push("적어 둔 걱정은 문의 문장에 넣어 미리 물어볼 수 있어요.");
  const uniqueTips = [...new Set(tips.length ? tips : CONCERN_TIPS.slice(0, 2).map(([, t]) => t))].slice(0, 3);

  return {
    isNotice: true,
    source: "MOCK",
    program,
    steps: [arrive, checkin, activityStep, leave],
    checklist,
    unknowns,
    tips: uniqueTips,
  };
}
