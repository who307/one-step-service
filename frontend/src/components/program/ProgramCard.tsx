import Link from "next/link";
import { CircleHelp } from "lucide-react";
import { Tag } from "@/components/ui/Chip";
import { SHOW_SAMPLE_TAG } from "@/lib/labels";
import type { Recommendation } from "@/lib/types";

export function ProgramCard({ rec }: { rec: Recommendation }) {
  const { program, reasons } = rec;
  const date = program.facts.find((f) => f.key === "activityDate");
  const place = program.facts.find((f) => f.key === "place");
  const unknown = program.facts.filter((f) => f.status === "unconfirmed").length;
  const isSample = SHOW_SAMPLE_TAG && program.sample;
  const title = program.title;
  const matchReasons = reasons.filter((r) => !r.startsWith("확인 필요"));

  return (
    <Link href={`/programs/${program.id}`} className="block rounded-md border border-line bg-surface p-4 hover:border-ink-3">
      <h3 className="flex min-w-0 items-center gap-2 text-[18px] font-bold">
        <span className="truncate">{title}</span>
        {isSample && <Tag>예시</Tag>}
      </h3>
      <p className="text-[14px] text-ink-3">{program.organization}</p>

      <dl className="mt-3 grid grid-cols-[3rem_1fr] gap-x-2 gap-y-1 text-[15px]">
        <dt className="text-ink-3">날짜</dt>
        <dd className="min-w-0">{date?.value ?? <span className="text-unsure">확인 필요</span>}</dd>
        <dt className="text-ink-3">장소</dt>
        <dd className="min-w-0">{place?.value ?? <span className="text-unsure">확인 필요</span>}</dd>
      </dl>

      {(matchReasons.length > 0 || unknown > 0) && (
        <ul className="mt-3 flex flex-wrap gap-1.5" aria-label="추천 이유">
          {matchReasons.map((r) => (
            <li key={r}>
              <Tag>{r}</Tag>
            </li>
          ))}
          {unknown > 0 && (
            <li>
              <Tag tone="unsure">
                <CircleHelp size={13} aria-hidden />
                확인 필요 {unknown}개
              </Tag>
            </li>
          )}
        </ul>
      )}
    </Link>
  );
}
