import { Info } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { ButtonLink } from "@/components/ui/Button";

const ITEMS = [
  ["상황 연습 도구예요", "처음 가는 프로그램을 미리 살펴보고, 할 말을 연습해요. 상담이나 치료 서비스가 아니에요."],
  ["입력한 내용은 서버에 저장하지 않아요", "공고, 걱정, 마음 점수, 나의 노선은 이 브라우저에만 남아 새로고침해도 이어져요. 연습 대화 원문은 남기지 않아요. 로그인도 없어요."],
  ["AI 처리에는 외부 서비스가 쓰일 수 있어요", "AI 연습이나 음성 인식을 쓰면 그 요청에 한해 외부 서비스로 내용이 전달될 수 있어요. 브라우저 음성 인식도 외부 서버에서 처리될 수 있어요."],
  ["‘공고에서 확인’과 ‘예상’을 나눠 보여줘요", "‘공고에서 확인’은 공고 원문에 적힌 내용이에요. ‘예상’은 일반적인 흐름일 뿐 실제와 다를 수 있어요."],
  ["‘예시’ 표시는 시연용이에요", "예시 공고와 예시 응답은 실제 기관이나 실제 담당자의 답이 아니에요."],
  ["추천은 자격을 보장하지 않아요", "신청 자격과 일정은 꼭 공식 안내에서 확인해 주세요."],
];

export default function AboutPage() {
  return (
    <AppShell back="/">
      <div className="flex items-center gap-2 pt-2">
        <Info size={22} aria-hidden />
        <h1 className="text-[24px] font-bold">이용 안내</h1>
      </div>
      <dl className="mt-6 grid gap-5">
        {ITEMS.map(([t, d]) => (
          <div key={t}>
            <dt className="text-[16px] font-semibold">{t}</dt>
            <dd className="mt-1 text-[15px] text-ink-2">{d}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-8 text-[14px] text-ink-2">힘든 마음이 들면 언제든 위쪽 ‘도움’ 버튼을 눌러 주세요.</p>
      <ButtonLink href="/" variant="secondary" className="mt-6 w-full">
        처음으로
      </ButtonLink>
    </AppShell>
  );
}
