"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy } from "lucide-react";
import { AppShell, ScreenTitle } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/Button";
import { ToggleChip } from "@/components/ui/Chip";
import { ErrorPanel, MockNote } from "@/components/ui/States";
import { useFlow, useRequire } from "@/features/flow/FlowProvider";
import { api, isAbort, USE_MOCK } from "@/lib/api";

const COMMON = ["세부 일정", "준비물", "혼자 참여해도 되는지", "처음 참여해도 되는지"];

// 문의 문장 초안. 보내지 않고, 사용자가 고친 뒤 복사해서 직접 보낸다.
export default function InquiryPage() {
  const router = useRouter();
  const { state, addStop } = useFlow();
  const ready = useRequire(state.program !== null || state.timeline !== null);
  const unknowns = state.timeline?.unknowns ?? state.program?.unknowns ?? [];
  const options = [...new Set([...unknowns, ...COMMON])];
  const [picked, setPicked] = useState<string[]>(unknowns.slice(0, 3));
  const [note, setNote] = useState("");
  const [text, setText] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [copied, setCopied] = useState(false);
  const [mock, setMock] = useState(false);
  const ac = useRef<AbortController | null>(null);
  if (!ready) return null;

  const title = state.program?.title ?? state.timeline!.program.title;
  const organization = state.program?.organization ?? state.timeline?.program.organization ?? null;

  const draft = (useMockNow = mock) => {
    ac.current?.abort();
    const c = new AbortController();
    ac.current = c;
    setBusy(true);
    setError(null);
    api
      .draftInquiry({ programTitle: title, organization, questions: picked, userNote: note.trim() || undefined }, { signal: c.signal, mock: useMockNow })
      .then((r) => {
        setText(r.text);
        addStop({ type: "inquiry", programKey: state.program?.id ?? title, programTitle: title });
      })
      .catch((e) => !isAbort(e) && setError(e))
      .finally(() => setBusy(false));
  };

  const copy = async () => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  return (
    <AppShell back={() => router.back()}>
      <ScreenTitle sub={title}>물어볼 문장 만들기</ScreenTitle>

      <fieldset>
        <legend className="text-[15px] font-semibold">무엇을 물어볼까요?</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {options.map((o) => (
            <ToggleChip
              key={o}
              label={o}
              selected={picked.includes(o)}
              onToggle={() => setPicked((p) => (p.includes(o) ? p.filter((x) => x !== o) : p.length >= 5 ? p : [...p, o]))}
            />
          ))}
        </div>
        <p className="mt-1.5 text-[13px] text-ink-3">최대 5개. 노란 표시가 있던 ‘확인 필요’ 항목을 먼저 골라 뒀어요.</p>
      </fieldset>

      <label htmlFor="note" className="mt-5 block text-[15px] font-semibold">
        덧붙일 말 <span className="font-normal text-ink-3">(넣지 않아도 돼요)</span>
      </label>
      <input
        id="note"
        value={note}
        maxLength={200}
        onChange={(e) => setNote(e.target.value)}
        placeholder="예: 처음 참여하는 거라 궁금한 게 있어요…"
        className="mt-1 min-h-12 w-full rounded-md border-2 border-line bg-surface px-4 placeholder:text-ink-3 focus-visible:border-ink focus-visible:outline-none"
      />

      <Button className="mt-4 w-full" variant={text ? "secondary" : "primary"} disabled={picked.length === 0 || busy} onClick={() => draft()}>
        {busy ? "문장을 만드는 중…" : text ? "다시 만들기" : "문장 만들기"}
      </Button>

      {error ? (
        <ErrorPanel
          error={error}
          actions={
            <>
              <Button onClick={() => draft()}>다시 시도하기</Button>
              <Button
                variant="secondary"
                onClick={() => {
                  setMock(true);
                  draft(true);
                }}
              >
                기본 문장으로 만들기
              </Button>
            </>
          }
        />
      ) : (
        text !== null && (
          <div className="enter mt-6">
            <label htmlFor="text" className="block text-[15px] font-semibold">
              보낼 문장 <span className="font-normal text-ink-3">(직접 고쳐도 돼요)</span>
            </label>
            <textarea
              id="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={9}
              className="mt-1 w-full rounded-md border-2 border-line bg-surface px-4 py-3 text-[15px] leading-relaxed focus-visible:border-ink focus-visible:outline-none"
            />
            <Button className="mt-3 w-full" onClick={copy}>
              {copied ? <Check size={18} aria-hidden /> : <Copy size={18} aria-hidden />}
              {copied ? "복사했어요" : "문장 복사하기"}
            </Button>
            <p aria-live="polite" className="mt-2 text-[14px] text-ink-3">
              {copied ? "기관 문의 게시판, 문자, 메일에 붙여넣어 보내요." : "한걸음은 문장을 대신 보내지 않아요. 연락처는 공식 안내에서 확인해 주세요."}
            </p>
            {(USE_MOCK || mock) && (
              <div className="mt-3">
                <MockNote>기본 문장 틀로 만들었어요. AI가 다듬은 문장이 아니에요.</MockNote>
              </div>
            )}
          </div>
        )
      )}
    </AppShell>
  );
}
