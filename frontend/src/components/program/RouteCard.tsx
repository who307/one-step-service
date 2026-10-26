import { Navigation } from "lucide-react";
import { ButtonLink } from "@/components/ui/Button";
import type { Program } from "@/lib/types";

// 지도 API 연동 전 자리. 연동 후에는 MapView(카카오 지도 SDK)가 그림 영역을 대신한다.
// 예상 이동시간(지도 API)과 기관이 확정한 활동 시간은 다른 줄에 나눠 보여준다.
export function RouteCard({ location, onOpen }: { location: NonNullable<Program["location"]>; onOpen?: () => void }) {
  const kakaoLink = `https://map.kakao.com/link/to/${encodeURIComponent(location.name)},${location.lat},${location.lng}`;

  return (
    <section aria-labelledby="route-title" className="overflow-hidden rounded-md bg-surface">
      <div className="relative h-36 bg-surface-2">
        {/* 지도 자리: 출발점에서 목적지까지 노선 한 줄 */}
        <svg viewBox="0 0 360 144" preserveAspectRatio="none" className="absolute inset-0 size-full" aria-hidden>
          <g stroke="var(--line)" strokeWidth="1">
            {Array.from({ length: 8 }, (_, i) => (
              <line key={`v${i}`} x1={i * 48 + 12} x2={i * 48 + 12} y1="0" y2="144" />
            ))}
            {Array.from({ length: 4 }, (_, i) => (
              <line key={`h${i}`} x1="0" x2="360" y1={i * 40 + 12} y2={i * 40 + 12} />
            ))}
          </g>
          <defs>
            <linearGradient id="route-card-line" gradientUnits="userSpaceOnUse" x1="40" x2="300" y1="0" y2="0">
              <stop offset="0" stopColor="var(--route)" />
              <stop offset="1" stopColor="var(--glow)" />
            </linearGradient>
          </defs>
          <path d="M40 112 L120 112 L170 62 L300 62" fill="none" stroke="url(#route-card-line)" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="40" cy="112" r="7" fill="var(--surface)" stroke="var(--route)" strokeWidth="4" />
          <circle cx="300" cy="62" r="11" fill="var(--glow-soft)" />
          <circle cx="300" cy="62" r="8" fill="var(--surface)" stroke="var(--station)" strokeWidth="5" />
        </svg>
        <span className="absolute bottom-2 right-3 rounded-sm bg-surface px-2 py-0.5 text-[12px] text-ink-3">지도 연동 예정</span>
      </div>
      <div className="px-4 py-4">
        <h3 id="route-title" className="font-semibold">
          {location.name}
        </h3>
        <p className="text-[14px] text-ink-3">{location.address}</p>
        <ButtonLink href={kakaoLink} onClick={onOpen} external variant="secondary" size="sm" className="mt-3">
          <Navigation size={16} aria-hidden />
          카카오맵에서 길찾기
        </ButtonLink>
        <p className="mt-3 text-[14px] text-ink-3">무장애 경로나 출입구 정보는 기관에 따로 확인해 주세요.</p>
      </div>
    </section>
  );
}
