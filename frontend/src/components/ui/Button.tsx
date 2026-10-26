import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

// 버튼은 이 파일의 세 가지 모양 × 두 가지 크기, 그리고 IconButton만 쓴다. 화면에서 따로 만들지 않는다.
// - primary: 노란 표지판. 한 화면(한 영역)에 하나만.
// - secondary: 흰 바탕 + 연한 선. 보조 행동.
// - quiet: 글자만. 건너뛰기·외부 링크처럼 가장 약한 행동.

type Variant = "primary" | "secondary" | "quiet";
type Size = "md" | "sm";

const base = "press inline-flex items-center justify-center rounded-md font-semibold disabled:cursor-not-allowed";

const sizes: Record<Size, string> = {
  md: "min-h-12 gap-2 px-5 text-[16px]",
  sm: "min-h-11 gap-1.5 px-3 text-[14px]",
};

const variants: Record<Variant, string> = {
  // 테두리·그림자 없이 색면만. 비활성은 반투명 노랑(바랜 버튼처럼 보임) 대신 회색 판으로 바꿔 "아직 못 누름"을 분명히 한다.
  primary: "bg-action text-on-action hover:bg-action-press disabled:bg-surface-2 disabled:text-ink-3",
  secondary: "border border-line bg-surface text-ink hover:border-ink-3 disabled:text-ink-3 disabled:hover:border-line",
  quiet: "text-ink-2 underline-offset-4 hover:text-ink hover:underline disabled:text-ink-3 disabled:no-underline",
};

export function buttonClass(variant: Variant = "primary", extra = "", size: Size = "md") {
  return `${base} ${sizes[size]} ${variants[variant]} ${extra}`;
}

export function Button({
  variant = "primary",
  size = "md",
  className = "",
  ...props
}: ComponentProps<"button"> & { variant?: Variant; size?: Size }) {
  return <button type="button" className={buttonClass(variant, className, size)} {...props} />;
}

export function ButtonLink({
  href,
  variant = "primary",
  size = "md",
  className = "",
  children,
  external,
  onClick,
}: {
  href: string;
  variant?: Variant;
  size?: Size;
  className?: string;
  children: ReactNode;
  external?: boolean;
  onClick?: () => void;
}) {
  if (external) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" onClick={onClick} className={buttonClass(variant, className, size)}>
        {children}
        <span className="sr-only">(새 창에서 열림)</span>
      </a>
    );
  }
  return (
    <Link href={href} onClick={onClick} className={buttonClass(variant, className, size)}>
      {children}
    </Link>
  );
}

const iconTones = { default: "text-ink-2", strong: "text-ink", muted: "text-ink-3" };

/** 아이콘만 있는 버튼. 글자 대신 label을 꼭 받는다(스크린리더·툴팁). 44px 정사각형. */
export function IconButton({
  label,
  children,
  href,
  tone = "default",
  className = "",
  ...props
}: Omit<ComponentProps<"button">, "aria-label"> & { label: string; href?: string; tone?: keyof typeof iconTones }) {
  const cls = `press grid size-11 shrink-0 place-items-center rounded-md ${iconTones[tone]} hover:bg-surface-2 hover:text-ink ${className}`;
  if (href) {
    return (
      <Link href={href} aria-label={label} title={label} className={cls}>
        {children}
      </Link>
    );
  }
  return (
    <button type="button" aria-label={label} title={label} className={cls} {...props}>
      {children}
    </button>
  );
}
