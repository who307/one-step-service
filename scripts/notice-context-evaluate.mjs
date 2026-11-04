#!/usr/bin/env node
// 연습 대화에 공고 원문을 넣었을 때(programId 있음)와 넣지 않았을 때(없음)를 같은 질문으로 비교한다.
// 실행 중인 백엔드의 연습 API 를 부르며 API 키를 읽지 않는다. 실제 AI·온통청년 호출이라 사용량이 든다.
// 질문은 고정된 예시이며 실제 사용자 대화를 넣지 않는다. 결과 원문은 Git 에서 제외된 backend/build/ 에 쓴다.
//
//   node scripts/notice-context-evaluate.mjs --base-url http://localhost:8081 --repeats 2

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "backend/build/notice-context/report.json");

// 원문은 2026-11-04 온통청년 API 기준. 공고가 바뀌면 기대값을 다시 확인한다.
const PROGRAMS = {
  dining: { id: "ontong-20261023005400214282", title: "2026 청년1인가구 소셜다이닝 건강한 밥상" },
  rent: { id: "ontong-20261021005400214208", title: "2026 청년 월세 지원" },
};
const OPENING = "안녕하세요, 문의 창구예요. 어떤 점이 궁금하세요?";
// known: 원문에 답이 있다(expect 가 하나라도 보여야 맞음). unknown: 원문에 없다(확인되지 않았다고 해야 맞음).
const CASES = [
  { id: "dining-apply", program: "dining", kind: "known", q: "신청은 어떻게 해요?", expect: /씽글벙글|1인가구 포털|1in\.seoul/ },
  { id: "dining-deadline", program: "dining", kind: "known", q: "신청 언제까지 할 수 있어요?", expect: /11월\s?30|11\.\s?30|1130/ },
  { id: "dining-selection", program: "dining", kind: "known", q: "선정되면 어떻게 알 수 있어요?", expect: /자치구/ },
  { id: "dining-age", program: "dining", kind: "known", q: "나이 제한이 있나요?", expect: /19.{0,4}39/ },
  { id: "dining-cost", program: "dining", kind: "known", q: "재료비는 제가 내야 하나요?", expect: /식재료비|필수\s?경비/ },
  { id: "dining-endtime", program: "dining", kind: "unknown", q: "몇 시에 끝나요?" },
  { id: "dining-place", program: "dining", kind: "unknown", q: "장소가 어디예요?" },
  { id: "rent-amount", program: "rent", kind: "known", q: "월세 얼마까지 지원돼요?", expect: /20\s?만/ },
  { id: "rent-deposit", program: "rent", kind: "known", q: "보증금 기준이 있나요?", expect: /8,?000\s?만|8천\s?만/ },
  { id: "rent-income-followup", program: "rent", kind: "known", q: "그럼 소득 기준은요?", expect: /150/,
    history: [{ role: "USER", text: "보증금 기준이 있나요?" }, { role: "AI", text: "네, 보증금과 월세에 기준이 있어요. 다른 조건도 궁금하세요?" }] },
  { id: "rent-car", program: "rent", kind: "known", q: "자동차가 있어도 신청할 수 있나요?", expect: /2,?500\s?만/ },
  { id: "rent-payday", program: "rent", kind: "unknown", q: "선정되면 매달 며칠에 입금돼요?" },
];
const HEDGE = /확인되지|확인이 어렵|나와 있지|안내되어 있지|적혀 있지|알 수 없|확인해 보|확인이 필요/;

async function ask(baseUrl, c, withNotice) {
  const program = PROGRAMS[c.program];
  const body = {
    sceneId: "FIRST_INQUIRY", level: "L3", programTitle: program.title,
    ...(withNotice ? { programId: program.id } : {}),
    history: [{ role: "AI", text: OPENING }, ...(c.history ?? [])], userText: c.q,
  };
  const started = performance.now();
  try {
    const r = await fetch(`${baseUrl}/api/v1/simulations/eval/messages`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), signal: AbortSignal.timeout(30000),
    });
    const ms = Math.round(performance.now() - started);
    const json = await r.json().catch(() => null);
    return r.ok ? { ok: true, ms, text: json.reply?.text ?? "" } : { ok: false, ms, error: json?.code ?? `HTTP_${r.status}` };
  } catch (e) {
    return { ok: false, ms: Math.round(performance.now() - started), error: e.name };
  }
}

/** known 은 기대 사실이 보이면 맞음. unknown 은 확인되지 않았다고 하면 맞음. 사람이 원문을 다시 읽어 확인한다. */
function judge(c, text) {
  if (c.kind === "known") return { correct: c.expect.test(text), hedged: HEDGE.test(text) };
  return { correct: HEDGE.test(text), hedged: HEDGE.test(text) };
}

const pct = (v, p) => (v.length ? [...v].sort((a, b) => a - b)[Math.max(0, Math.ceil(v.length * p) - 1)] : null);

const { values } = parseArgs({ options: {
  "base-url": { type: "string", default: "http://localhost:8081" },
  repeats: { type: "string", default: "2" },
} });

const rows = [];
for (let r = 0; r < Number(values.repeats); r++) {
  for (const c of CASES) {
    for (const withNotice of [false, true]) {
      const res = await ask(values["base-url"], c, withNotice);
      const row = { case: c.id, kind: c.kind, mode: withNotice ? "notice" : "none", repeat: r, ...res, ...(res.ok ? judge(c, res.text) : {}) };
      rows.push(row);
      process.stderr.write(`${row.mode.padEnd(6)} ${c.id.padEnd(22)} ${res.ok ? (row.correct ? "맞음" : "틀림") : res.error} ${res.ms}ms\n`);
    }
  }
}

const summary = ["none", "notice"].map((mode) => {
  const m = rows.filter((x) => x.mode === mode && x.ok);
  const known = m.filter((x) => x.kind === "known");
  const unknown = m.filter((x) => x.kind === "unknown");
  return {
    mode: mode === "none" ? "원문 없음" : "원문 전체",
    errors: rows.filter((x) => x.mode === mode && !x.ok).length,
    p50: pct(m.map((x) => x.ms), 0.5),
    p95: pct(m.map((x) => x.ms), 0.95),
    knownCorrect: `${known.filter((x) => x.correct).length}/${known.length}`,
    unknownHedged: `${unknown.filter((x) => x.correct).length}/${unknown.length}`,
  };
});
mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify({ finishedAt: new Date().toISOString(), summary, rows }, null, 2));
console.table(summary);
console.log(OUT);
