"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { CircleAlert, CloudOff, FlaskConical, LoaderCircle, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ApiError } from "@/lib/api";

// 로딩·실패·예시 응답 표시. 모든 화면이 같은 모양과 같은 말투를 쓴다.

export function Loading({ label, onCancel }: { label: string; onCancel?: () => void }) {
  return (
    <div role="status" className="flex flex-col items-center gap-3 py-16 text-center">
      <LoaderCircle size={32} aria-hidden className="animate-spin text-ink-3 [animation-duration:700ms]" />
      <p className="text-[16px] text-ink-2">{label}</p>
      {onCancel && (
        <Button variant="quiet" size="sm" onClick={onCancel}>
          그만 기다리기
        </Button>
      )}
    </div>
  );
}

/** E2·E3·E6 공통 안내. 무엇이 잘못됐는지와 다음 행동만 말한다. */
export function ErrorPanel({ error, actions }: { error: unknown; actions: ReactNode }) {
  const code = error instanceof ApiError ? error.code : "LLM_ERROR";
  const message = error instanceof ApiError ? error.message : "잠시 연결이 어려워요. 다시 시도해 주세요.";
  const Icon = code === "NETWORK_ERROR" ? WifiOff : code === "NOT_A_NOTICE" ? CircleAlert : CloudOff;
  const title =
    code === "NETWORK_ERROR"
      ? "인터넷 연결을 확인해 주세요"
      : code === "NOT_A_NOTICE"
        ? "공고문이 아닌 것 같아요"
        : code === "LLM_TIMEOUT"
          ? "응답이 늦어지고 있어요"
          : "잠시 연결이 어려워요";
  return (
    <div role="alert" className="flex flex-col items-center px-2 py-12 text-center">
      <Icon size={36} aria-hidden className="text-ink-2" />
      <h2 className="mt-3 text-[19px] font-bold">{title}</h2>
      <p className="mt-1 text-[15px] text-ink-2">{message}</p>
      <div className="mt-6 grid w-full gap-2">{actions}</div>
    </div>
  );
}

/** 예시 응답(Mock) 표시. 실제 공고·실제 담당자 답변으로 오해하지 않게 한다. */
export function MockNote({ children }: { children?: ReactNode }) {
  return (
    <p className="flex items-start gap-2 rounded-md bg-surface-2 px-3 py-2.5 text-[14px] text-ink-2">
      <FlaskConical size={16} aria-hidden className="mt-0.5 shrink-0" />
      <span>{children ?? "예시 응답이에요. 실제 AI나 담당자 답변이 아니라 미리 준비한 시연용 내용이에요."}</span>
    </p>
  );
}

/** 확인 모달(E4 연습 중단 등). 가운데 뜨고, 바깥을 눌러도 닫히지 않는다(실수로 종료 방지). */
export function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  body: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby="confirm-title"
      onCancel={(e) => {
        e.preventDefault();
        onCancel();
      }}
      className="m-auto w-[calc(100%-32px)] max-w-90 rounded-[16px] bg-surface p-6 text-ink backdrop:bg-[var(--scrim)]"
    >
      <h2 id="confirm-title" className="text-[19px] font-bold">
        {title}
      </h2>
      <p className="mt-2 text-[15px] text-ink-2">{body}</p>
      <div className="mt-6 grid gap-2">
        {/* 계속하기가 기본 행동: 노란 버튼과 첫 포커스를 받는다 */}
        <Button autoFocus onClick={onCancel}>
          {cancelLabel}
        </Button>
        <Button variant="secondary" onClick={onConfirm}>
          {confirmLabel}
        </Button>
      </div>
    </dialog>
  );
}
