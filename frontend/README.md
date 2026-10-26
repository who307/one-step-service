# 한걸음 프론트엔드

고립·은둔 청년이 지원 프로그램에 처음 가기 전에 공고를 확인하고, 첫마디를 연습하고, 연습 전후 마음을 비교하는 모바일 웹입니다.

Next.js 15 (App Router) · React 19 · TypeScript · Tailwind CSS v4 · lucide-react

## 실행

```bash
npm install
cp .env.example .env.local   # 처음 한 번
npm run dev                  # http://localhost:3000
```

| 명령 | 설명 |
|---|---|
| `npm run dev` | 개발 서버 |
| `npm run lint` | 코드 검사 |
| `npm run build` | 배포용 빌드 (`.next/`) |
| `NEXT_DIST_DIR=.next-check npm run build` | 개발 서버를 켜 둔 채 빌드만 확인할 때. `.next/`를 건드리지 않음 |

## 환경 변수

| 이름 | 기본값 | 설명 |
|---|---|---|
| `NEXT_PUBLIC_USE_MOCK` | `true` | `true`면 `src/mocks/` 예시 데이터로 전체 흐름이 동작. `false`면 백엔드 호출 |
| `NEXT_PUBLIC_API_BASE` | `http://localhost:8080/api` | 백엔드 주소 |

외부 API 키(온통청년, AI)는 프론트에 두지 않습니다. 백엔드가 받아서 정리한 뒤 내려줍니다.

## 폴더 구조

```text
src/
├── app/                              화면(주소별)
│   ├── layout.tsx                    글꼴, 화면 모드(밝게·어둡게) 초기 적용
│   ├── globals.css                   색·움직임 디자인 토큰
│   ├── page.tsx                      홈: 나의 노선, 이어서 할 일
│   ├── onboarding/                   관심·참여 방식·걱정 고르기 (추천 입력)
│   ├── programs/                     추천 공고 목록
│   ├── programs/[id]/                공고 상세: 공식 정보 / 확인 필요 / 길 확인 / 문의 문장
│   ├── practice/                     말 연습 시작 (공고 고르기)
│   ├── practice/[programId]/         연습 장면 고르기
│   │   ├── before/                   연습 전 마음 기록 (필수)
│   │   ├── session/                  AI 아바타와 대화 연습
│   │   └── after/                    연습 후 마음 기록 (필수)
│   ├── records/                      전후 비교 그래프, 기록 삭제
│   └── visited/                      다녀온 곳 목록
│
├── components/
│   ├── layout/                       AppShell, TopBar, BottomNav, HelpSheet(도움 연락처), ThemeToggle
│   ├── ui/                           Button(버튼 모양 3가지), Chip
│   ├── journey/                      JourneyLine(홈 나의 노선), StepPath(단계 노선·노선도)
│   ├── program/                      ProgramCard, FactList, RouteCard, InquiryComposer
│   ├── practice/                     Avatar
│   ├── checkin/                      CheckinForm (0~10 슬라이더, 응답 안 해도 됨)
│   └── records/                      BeforeAfterChart (전후 비교 그래프 + 표 보기)
│
├── lib/
│   ├── types.ts                      백엔드 응답과 맞춘 타입
│   ├── labels.ts                     선택지·문항 문구, 예시 표시 여부(SHOW_SAMPLE_TAG)
│   ├── journey.ts                    나의 노선 규칙: 역 이름, 온기 색, 다음 역 제안
│   ├── josa.ts                       공고 이름 뒤 조사(이/가, 을/를) 고르기
│   ├── api/                          ← 백엔드 연결 지점. 예시 모드면 mocks/를 돌려줌
│   │   ├── client.ts                 fetch 공통부, 예시 모드 스위치
│   │   ├── programs.ts               공고·추천
│   │   └── scenes.ts                 연습 장면
│   ├── practice/session.ts           ← AI 아바타 연결 지점. PracticeSession 인터페이스 + 예시 구현
│   └── storage/index.ts              이 기기에만 남는 저장소 4개: 연습 기록·관심 조건·작성 중 기록·나의 노선
│
└── mocks/                            예시 데이터 모드 전용
    ├── programs.ts                   따뜻한 집(실제) + 예시 공고 7개
    ├── scenes.ts                     연습 장면 4개
    └── recommend.ts                  추천 규칙 (백엔드 RecommendationService와 같은 규칙)
```

## 지켜야 할 것

- **마음 기록은 서버로 보내지 않습니다.** 모든 기록은 `lib/storage`를 통해 브라우저 저장소에만 남습니다.
- **예시 공고에는 "예시" 표시를 붙입니다.** `lib/labels.ts`의 `SHOW_SAMPLE_TAG`로 켜고 끕니다.
- **버튼은 `components/ui/Button.tsx`만 씁니다.** 화면에서 새 버튼 모양을 만들지 않습니다.
- **색은 `globals.css`의 토큰으로만 씁니다.** 디자인 규칙은 `../docs/ARCHITECTURE.md`에 있습니다.
