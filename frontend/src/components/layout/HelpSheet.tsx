"use client";

import { useEffect, useRef } from "react";
import { LifeBuoy, Phone, X } from "lucide-react";
import { IconButton } from "@/components/ui/Button";

const LINES = [
  { name: "자살예방 상담전화", hours: "24시간", number: "109", tel: "109" },
  { name: "정신건강 위기상담", hours: "24시간", number: "1577-0199", tel: "15770199" },
];

// 어느 화면에서든 닿을 수 있는 도움 창. 연습을 평가하거나 진단하지 않고, 사람에게 연결만 한다.
export function HelpSheet() {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = ref.current;
    const close = (e: MouseEvent) => e.target === d && d?.close();
    d?.addEventListener("click", close);
    return () => d?.removeEventListener("click", close);
  }, []);

  return (
    <>
      <button
        type="button"
        onClick={() => ref.current?.showModal()}
        className="press inline-flex min-h-11 items-center gap-1.5 rounded-md px-3 text-[15px] text-ink-2 hover:bg-surface-2 hover:text-ink"
      >
        <LifeBuoy size={18} aria-hidden />
        도움
      </button>
      <dialog
        ref={ref}
        aria-labelledby="help-title"
        className="sheet mx-auto mb-0 mt-auto w-full max-w-120 overscroll-contain rounded-t-[20px] bg-surface p-0 text-ink"
      >
        <div className="px-5 pb-[max(env(safe-area-inset-bottom),24px)] pt-3">
          <div aria-hidden className="mx-auto mb-4 h-1 w-10 rounded-full bg-line" />
          <div className="flex items-start justify-between gap-4">
            <h2 id="help-title" className="text-[20px] font-bold">
              지금 많이 힘들다면
            </h2>
            <IconButton label="닫기" onClick={() => ref.current?.close()} className="-mr-2 -mt-1">
              <X size={20} aria-hidden />
            </IconButton>
          </div>
          <p className="mt-1 text-ink-2">연습은 언제든 멈춰도 괜찮아요. 이야기를 들어줄 사람이 필요하면 바로 전화할 수 있어요.</p>
          <ul className="mt-5 divide-y divide-line border-y border-line">
            {LINES.map((l) => (
              <li key={l.tel}>
                <a href={`tel:${l.tel}`} className="flex min-h-16 items-center gap-3 py-2 hover:bg-surface-2">
                  <span className="grid size-10 shrink-0 place-items-center rounded-full bg-route-soft text-ink">
                    <Phone size={18} aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold">{l.name}</span>
                    <span className="text-[14px] text-ink-3">{l.hours}</span>
                  </span>
                  <span className="text-[18px] font-bold tabular-nums">{l.number}</span>
                </a>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-[14px] text-ink-3">한걸음은 상담이나 진단 서비스가 아니에요. 위급하면 112나 119에 연락해 주세요.</p>
        </div>
      </dialog>
    </>
  );
}
