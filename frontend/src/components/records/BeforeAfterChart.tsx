"use client";

import { useState } from "react";
import { CHECK_ITEMS } from "@/lib/labels";
import type { CheckScores } from "@/lib/types";

// 문항별 전→후 덤벨 차트. 0~10 단일 축.
// 색만으로 전/후를 구분하지 않도록 범례 + 점 모양(전=빈 원, 후=채운 원) + 숫자 라벨을 함께 쓴다.
// 미응답 문항은 0점으로 그리지 않고 "응답 없음"으로 표시한다.

const ROW = 52;
const LEFT = 64;
const RIGHT = 16;
const W = 340;

export function BeforeAfterChart({ before, after }: { before: CheckScores | null; after: CheckScores | null }) {
  const [hover, setHover] = useState<string | null>(null);
  const [asTable, setAsTable] = useState(false);
  const plotW = W - LEFT - RIGHT;
  const x = (v: number) => LEFT + (v / 10) * plotW;
  const H = CHECK_ITEMS.length * ROW + 28;

  return (
    <figure>
      <div className="flex items-center justify-between">
        <ul className="flex gap-4 text-[13px] text-ink-2" aria-label="범례">
          <li className="flex items-center gap-1.5">
            <svg width="12" height="12" aria-hidden>
              <circle cx="6" cy="6" r="4.5" fill="var(--surface)" stroke="var(--series-before)" strokeWidth="2" />
            </svg>
            연습 전
          </li>
          <li className="flex items-center gap-1.5">
            <svg width="12" height="12" aria-hidden>
              <circle cx="6" cy="6" r="5" fill="var(--series-after)" />
            </svg>
            연습 후
          </li>
        </ul>
        <button
          type="button"
          onClick={() => setAsTable((t) => !t)}
          className="min-h-11 px-2 text-[13px] text-ink-2 underline underline-offset-2 hover:text-ink"
        >
          {asTable ? "그래프로 보기" : "표로 보기"}
        </button>
      </div>

      {asTable ? (
        <table className="mt-3 w-full text-[15px]">
          <thead className="text-left text-[13px] text-ink-3">
            <tr>
              <th className="py-2 font-medium">항목</th>
              <th className="py-2 text-right font-medium">전</th>
              <th className="py-2 text-right font-medium">후</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line tabular-nums">
            {CHECK_ITEMS.map((it) => (
              <tr key={it.key}>
                <th scope="row" className="py-2 text-left font-normal">
                  {it.label}
                  {it.direction === "higherIsLighter" && <span className="text-[12px] text-ink-3"> (높을수록 좋음)</span>}
                </th>
                <td className="py-2 text-right">{before?.[it.key] ?? "—"}</td>
                <td className="py-2 text-right">{after?.[it.key] ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <svg viewBox={`0 0 ${W} ${H}`} className="mt-2 w-full" role="img" aria-label="연습 전후 자기 응답 비교. 정확한 값은 표로 보기에서 확인할 수 있어요.">
          {[0, 5, 10].map((t) => (
            <g key={t}>
              <line x1={x(t)} x2={x(t)} y1={8} y2={H - 22} stroke="var(--line)" strokeDasharray={t === 5 ? "2 4" : undefined} />
              <text x={x(t)} y={H - 6} textAnchor="middle" fontSize="11" fill="var(--ink-3)">
                {t}
              </text>
            </g>
          ))}
          {CHECK_ITEMS.map((it, i) => {
            const cy = 8 + i * ROW + ROW / 2;
            const b = before?.[it.key] ?? null;
            const a = after?.[it.key] ?? null;
            const active = hover === it.key;
            return (
              <g key={it.key} onPointerEnter={() => setHover(it.key)} onPointerLeave={() => setHover(null)}>
                <rect x={0} y={cy - ROW / 2} width={W} height={ROW} fill={active ? "var(--surface-2)" : "transparent"} rx="8" />
                <text x={4} y={cy - 2} fontSize="13" fill="var(--ink)" dominantBaseline="middle">
                  {it.label}
                </text>
                {it.direction === "higherIsLighter" && (
                  <text x={4} y={cy + 13} fontSize="10" fill="var(--ink-3)">
                    높을수록 좋음
                  </text>
                )}
                {b === null && a === null ? (
                  <text x={LEFT} y={cy} fontSize="12" fill="var(--ink-3)" dominantBaseline="middle">
                    응답 없음
                  </text>
                ) : (
                  <>
                    {b !== null && a !== null && (
                      <line x1={x(b)} x2={x(a)} y1={cy} y2={cy} stroke="var(--ink-3)" strokeWidth="2" strokeLinecap="round" />
                    )}
                    {b !== null && (
                      <g>
                        <circle cx={x(b)} cy={cy} r="6" fill="var(--surface)" stroke="var(--series-before)" strokeWidth="2.5" />
                        {(active || a === null || Math.abs(a - b) >= 1) && (
                          <text x={x(b)} y={cy - 13} textAnchor="middle" fontSize="11" fill="var(--ink-2)">
                            {b}
                          </text>
                        )}
                      </g>
                    )}
                    {a !== null && (
                      <g>
                        <circle cx={x(a)} cy={cy} r="7" fill="var(--series-after)" stroke="var(--surface)" strokeWidth="2" />
                        <text x={x(a)} y={cy + 20} textAnchor="middle" fontSize="12" fontWeight="700" fill="var(--ink)">
                          {a === b ? `${a}, 그대로` : a}
                        </text>
                      </g>
                    )}
                  </>
                )}
              </g>
            );
          })}
        </svg>
      )}
      <figcaption className="mt-2 text-[12px] text-ink-3">
        직접 답한 점수예요. 진단이나 효과 측정이 아니에요. 자존감을 뺀 항목은 점수가 높을수록 부담이 큰 방향이에요.
      </figcaption>
    </figure>
  );
}
