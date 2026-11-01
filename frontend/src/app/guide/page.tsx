"use client";

import { useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { LockKeyhole, MessageCircle, Search } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { markGuideSeen } from "@/features/guide/seen";

// 첫 방문 안내서. 처음 홈에 오면 저절로 열리고, 홈의 "한걸음 사용법 다시 보기"로 다시 연다.
// 무엇인지 → 어떻게 쓰는지 → 안심. 장마다 한 문장. 1·2장의 건너뛰기는 마지막 장으로 보낸다.
// 상단 바·아래 탭 없이 화면 전체를 쓴다. 옆으로 밀거나 "다음"으로 넘긴다.

const SLIDES: { title: ReactNode; body: string; art: ReactNode }[] = [
  {
    title: (
      <>
        처음 가는 곳,
        <br />
        미리 한 번 가봐요
      </>
    ),
    body: "청년 프로그램에 가기 전, 그날을 미리 걸어 보고 첫마디를 연습하는 곳이에요.",
    art: <RouteArt />,
  },
  {
    title: (
      <>
        필요한 것만
        <br />
        골라서 써요
      </>
    ),
    body: "처음부터 끝까지 다 하지 않아도 돼요. 멈춘 곳에서 언제든 이어 할 수 있어요.",
    art: (
      <div className="grid w-4/5 gap-2">
        <EntryArt icon={<Search size={18} aria-hidden />}>프로그램 찾아보기</EntryArt>
        <EntryArt icon={<MessageCircle size={18} aria-hidden />}>말 연습만 하기</EntryArt>
      </div>
    ),
  },
  {
    title: (
      <>
        내 이야기는
        <br />
        암호화해서 지켜요
      </>
    ),
    body: "이름·전화번호 없이 아이디만 있으면 돼요. 대화는 요약만 남기고, 언제든 지울 수 있어요.",
    art: (
      <span className="grid size-28 place-items-center rounded-full bg-surface">
        <LockKeyhole size={48} aria-hidden strokeWidth={1.8} />
      </span>
    ),
  },
];

export default function GuidePage() {
  const router = useRouter();
  const track = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const last = SLIDES.length - 1;

  const go = (i: number) => {
    const el = track.current;
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollTo({ left: i * el.clientWidth, behavior: reduce ? "auto" : "smooth" });
  };

  const finish = () => {
    markGuideSeen();
    router.replace("/");
  };

  return (
    <div className="mx-auto flex min-h-dvh max-w-120 flex-col bg-paper">
      <div className="flex h-14 items-center justify-end px-3">
        {/* 마지막 장에서는 자리만 남겨 제목 위치가 흔들리지 않게 한다 */}
        <Button variant="quiet" size="sm" onClick={() => go(last)} className={index === last ? "invisible" : "underline"}>
          건너뛰기
        </Button>
      </div>

      <div
        ref={track}
        aria-roledescription="안내서"
        onScroll={(e) => setIndex(Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth))}
        className="flex flex-1 snap-x snap-mandatory overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {SLIDES.map((s, i) => (
          <section
            key={i}
            role="group"
            aria-roledescription="장"
            aria-label={`${SLIDES.length}장 중 ${i + 1}장`}
            aria-hidden={i !== index}
            className="w-full shrink-0 snap-center px-5"
          >
            <div className="relative flex h-60 items-center justify-center overflow-hidden rounded-[20px] bg-route-soft">{s.art}</div>
            <h1 className="mt-6 text-[26px] font-bold leading-snug">{s.title}</h1>
            <p className="mt-3 text-[16px] text-ink-2">{s.body}</p>
          </section>
        ))}
      </div>

      <div className="px-5 pb-[max(env(safe-area-inset-bottom),20px)] pt-4">
        <div aria-hidden className="mb-4 flex justify-center gap-1.5">
          {SLIDES.map((_, i) => (
            <span key={i} className={`h-2 rounded-full transition-[width] duration-200 ${i === index ? "w-6 bg-ink" : "w-2 bg-line"}`} />
          ))}
        </div>
        {index < last ? (
          <Button className="w-full" onClick={() => go(index + 1)}>
            다음
          </Button>
        ) : (
          <div className="grid gap-1">
            <Button className="w-full" onClick={finish}>
              시작하기
            </Button>
            {/* 로그인은 아직 없어서 시작하기와 같이 홈으로 간다 */}
            <Button variant="quiet" onClick={finish} className="underline">
              이미 아이디가 있어요 · 로그인
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

/** 1장 그림: 노란 노선 위의 네 역. 갈수록 주황으로 데워진다. */
function RouteArt() {
  const stations = ["var(--route)", "var(--route)", "color-mix(in oklab, var(--route), var(--glow) 60%)", "var(--glow)"];
  return (
    <div aria-hidden className="relative h-7 w-[calc(100%-80px)]">
      <span className="absolute inset-x-0 top-1/2 h-2 -translate-y-1/2 rounded-full" style={{ background: "linear-gradient(90deg, var(--route), var(--glow))" }} />
      {stations.map((c, i) => (
        <span
          key={i}
          className="absolute top-1/2 size-7 -translate-x-1/2 -translate-y-1/2 rounded-full border-[5px] bg-surface"
          style={{ left: `${(i / (stations.length - 1)) * 100}%`, borderColor: c }}
        />
      ))}
    </div>
  );
}

/** 2장 그림: 홈의 입구 카드 */
function EntryArt({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <div aria-hidden className="flex items-center gap-2 rounded-md bg-surface px-3 py-2.5 text-[15px] font-semibold">
      {icon}
      {children}
    </div>
  );
}
