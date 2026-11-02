import Link from "next/link";
import { Tag } from "@/components/ui/Chip";
import { CATEGORY_LABEL, MODE_LABEL } from "@/lib/labels";
import type { ProgramSummary } from "@/types/api";

export const period = (p: Pick<ProgramSummary, "applicationStart" | "applicationEnd">) =>
  p.applicationStart || p.applicationEnd ? `${fmt(p.applicationStart)} ~ ${fmt(p.applicationEnd)}` : null;

const fmt = (d: string | null) => (d ? d.replaceAll("-", ".").slice(2) : "?");

/** 신청 마감까지 남은 날(오늘 마감이면 0). 마감됐거나 마감일이 없거나 7일보다 많이 남았으면 null */
export function daysLeft(p: Pick<ProgramSummary, "applicationEnd" | "closed">, today = new Date()): number | null {
  if (p.closed || !p.applicationEnd) return null;
  const [y, m, d] = p.applicationEnd.split("-").map(Number);
  const days = Math.round((Date.UTC(y, m - 1, d) - Date.UTC(today.getFullYear(), today.getMonth(), today.getDate())) / 86_400_000);
  return days >= 0 && days <= 7 ? days : null;
}

export function ProgramCard({ program, reasons }: { program: ProgramSummary; reasons: string[] }) {
  const p = period(program);
  const left = daysLeft(program);
  return (
    <Link href={`/programs/${program.id}`} className="press block rounded-md border border-line bg-surface p-4 hover:border-ink-3">
      <h2 className="flex min-w-0 items-start gap-2 text-[18px] font-bold leading-snug">
        <span className="min-w-0">{program.title}</span>
        {program.isSample && (
          <span className="mt-0.5 shrink-0">
            <Tag>예시</Tag>
          </span>
        )}
        {program.closed && (
          <span className="mt-0.5 shrink-0">
            <Tag>마감</Tag>
          </span>
        )}
        {left !== null && (
          <span className="mt-0.5 shrink-0">
            <Tag tone="unsure">{left === 0 ? "오늘 마감" : `마감 D-${left}`}</Tag>
          </span>
        )}
      </h2>
      <p className="text-[14px] text-ink-3">{program.organization}</p>
      <p className="mt-2 line-clamp-2 text-[15px] text-ink-2">{program.summary}</p>

      <dl className="mt-3 grid grid-cols-[3.5rem_1fr] gap-x-2 gap-y-1 text-[14px]">
        <dt className="text-ink-3">신청</dt>
        <dd className="min-w-0">{p ?? <span className="text-unsure">확인 필요</span>}</dd>
        <dt className="text-ink-3">장소</dt>
        <dd className="min-w-0">
          {program.location ? (
            program.locationSource === "ESTIMATED" ? (
              <span className="text-ink-2">
                {program.location} <span className="text-[13px] text-unsure">(추정)</span>
              </span>
            ) : (
              program.location
            )
          ) : (
            <span className="text-unsure">확인 필요</span>
          )}
        </dd>
      </dl>

      <ul className="mt-3 flex flex-wrap gap-1.5" aria-label="활동 정보">
        <li>
          <Tag>{CATEGORY_LABEL[program.category]}</Tag>
        </li>
        {program.modes.map((m) => (
          <li key={m}>
            <Tag>{MODE_LABEL[m]}</Tag>
          </li>
        ))}
      </ul>
      {reasons.length > 0 && (
        <ul className="mt-2 text-[14px] text-sure" aria-label="추천 이유">
          {reasons.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
      )}
    </Link>
  );
}
