"use client";

import { useState } from "react";
import { Check, Copy, MessageSquareText } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ToggleChip } from "@/components/ui/Chip";
import { AskList } from "@/components/program/FactList";
import { josa } from "@/lib/josa";
import { journeyStore } from "@/lib/storage";
import type { Program, ProgramFact } from "@/lib/types";

// 전화가 가장 큰 벽인 경우가 많다. 확인 못 한 항목으로 기관에 보낼 문장을 만들어 복사하게 한다.
// 기관 연락처는 공고마다 달라서 보내기는 사용자가 직접 한다(문자·메일·홈페이지 문의).

function compose(title: string, items: string[], name: string) {
  const who = name.trim() ? `${josa(name.trim(), "이라고/라고")} 합니다. ` : "";
  return [
    `안녕하세요. ${who}‘${title}’ 프로그램에 관심이 있어 문의드립니다.`,
    "",
    "아래 내용을 알 수 있을까요?",
    ...items.map((i) => `- ${i}`),
    "",
    "답변 주시면 참여를 준비하는 데 도움이 될 것 같아요. 감사합니다.",
  ].join("\n");
}

export function InquiryComposer({ program, unconfirmed }: { program: Program; unconfirmed: ProgramFact[] }) {
  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState<string[]>(() => unconfirmed.map((f) => f.label));
  const [name, setName] = useState("");
  const [edited, setEdited] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const text = edited ?? compose(program.title, picked, name);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      journeyStore.add({ type: "inquiry", programId: program.id, programTitle: program.title });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  if (!open) {
    return (
      <>
        <AskList labels={unconfirmed.map((f) => f.label)} />
        <Button variant="secondary" className="mt-4 w-full" onClick={() => setOpen(true)}>
          <MessageSquareText size={18} aria-hidden />
          물어볼 문장 만들기
        </Button>
      </>
    );
  }

  return (
    <div className="enter mt-3">
      <fieldset>
        <legend className="text-[15px] font-semibold">무엇을 물어볼지 골라요</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {unconfirmed.map((f) => (
            <ToggleChip
              key={f.key}
              label={f.label}
              selected={picked.includes(f.label)}
              onToggle={() => {
                setEdited(null);
                setPicked((p) => (p.includes(f.label) ? p.filter((x) => x !== f.label) : [...p, f.label]));
              }}
            />
          ))}
        </div>
      </fieldset>

      <label htmlFor="inq-name" className="mt-4 block text-[15px] font-semibold">
        이름 <span className="font-normal text-ink-3">(넣지 않아도 돼요)</span>
      </label>
      <input
        id="inq-name"
        value={name}
        autoComplete="name"
        onChange={(e) => {
          setEdited(null);
          setName(e.target.value);
        }}
        placeholder="예: 김온기…"
        className="mt-1 min-h-12 w-full rounded-md border-2 border-line bg-surface px-4 placeholder:text-ink-3 focus-visible:border-ink"
      />

      <label htmlFor="inq-text" className="mt-4 block text-[15px] font-semibold">
        보낼 문장 <span className="font-normal text-ink-3">(직접 고쳐도 돼요)</span>
      </label>
      <textarea
        id="inq-text"
        value={text}
        onChange={(e) => setEdited(e.target.value)}
        rows={8}
        className="mt-1 w-full rounded-md border-2 border-line bg-surface px-4 py-3 text-[15px] leading-relaxed focus-visible:border-ink"
      />

      <Button className="mt-3 w-full" disabled={picked.length === 0 && edited === null} onClick={copy}>
        {copied ? <Check size={18} aria-hidden /> : <Copy size={18} aria-hidden />}
        {copied ? "복사했어요" : "문장 복사하기"}
      </Button>
      <p aria-live="polite" className="mt-2 text-[14px] text-ink-3">
        {copied ? "기관 홈페이지 문의 게시판이나 문자, 메일에 붙여넣어 보내요." : "기관 연락처는 공식 안내에서 확인해 주세요."}
      </p>
    </div>
  );
}
