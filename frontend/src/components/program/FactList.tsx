import { CircleCheck, CircleHelp } from "lucide-react";
import type { ProgramFact } from "@/lib/types";

// 공식 확인 / 확인 필요를 색 + 아이콘 + 글자로 함께 구분한다(색만으로 구분하지 않음).
// sample: 지어낸 예시 공고는 "공식 자료로 확인" 문구를 쓰지 않는다.
export function FactList({
  facts,
  sample = false,
  askAction,
}: {
  facts: ProgramFact[];
  sample?: boolean;
  /** "기관에 물어볼 것" 목록 자리에 들어가는 행동(문의 문장 만들기) */
  askAction?: React.ReactNode;
}) {
  const confirmed = facts.filter((f) => f.status === "confirmed");
  const unconfirmed = facts.filter((f) => f.status === "unconfirmed");

  return (
    <>
      <section aria-labelledby="facts-ok" className="rounded-md bg-surface px-4 py-4">
        <h3 id="facts-ok" className="flex items-center gap-1.5 text-[15px] font-semibold text-sure">
          <CircleCheck size={18} aria-hidden />
          {sample ? "공고에 적힌 정보" : "공식 자료로 확인했어요"}
        </h3>
        <dl className="mt-2">
          {confirmed.map((f) => (
            <div key={f.key} className="grid grid-cols-[5rem_1fr] gap-3 border-t border-line py-3 first:border-t-0">
              <dt className="text-ink-3">{f.label}</dt>
              <dd className="min-w-0">
                <span className="font-semibold">{f.value}</span>
                {f.note && (
                  // "확인 필요"가 담긴 메모만 호박색, 나머지는 보조 설명
                  <span className={`mt-0.5 block text-[14px] ${f.note.includes("확인 필요") ? "text-unsure" : "text-ink-3"}`}>{f.note}</span>
                )}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      {unconfirmed.length > 0 && (
        <section aria-labelledby="facts-ask" className="rounded-md border-2 border-dashed border-unsure/60 px-4 py-4">
          <h3 id="facts-ask" className="flex items-center gap-1.5 text-[15px] font-semibold text-unsure">
            <CircleHelp size={18} aria-hidden />
            기관에 물어볼 것
          </h3>
          <p className="mt-1 text-[14px] text-ink-2">
            {sample ? "공고에 나와 있지 않아요. 추측해서 채우지 않았어요." : "아직 공식 자료에서 찾지 못했어요. 추측해서 채우지 않았어요."}
          </p>
          {/* askAction(문의 문장 만들기)이 있으면 목록 표시도 그쪽이 맡는다 */}
          {askAction ?? <AskList labels={unconfirmed.map((f) => f.label)} />}
        </section>
      )}
    </>
  );
}

export function AskList({ labels }: { labels: string[] }) {
  return (
    <ul className="mt-3 flex flex-wrap gap-1.5">
      {labels.map((l) => (
        <li key={l} className="rounded-sm bg-unsure-soft px-3 py-1.5 text-[14px] font-medium">
          {l}
        </li>
      ))}
    </ul>
  );
}
