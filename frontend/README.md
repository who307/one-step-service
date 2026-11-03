# 한걸음 프론트엔드

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
| `npm run build` | 빌드 |
| `NEXT_DIST_DIR=.next-check npm run build` | 개발 서버를 켜 둔 채 빌드만 확인 |

## 환경 변수

| 이름 | 기본값 | 설명 |
|---|---|---|
| `NEXT_PUBLIC_USE_MOCK` | `true` | `true`면 백엔드 없이 `src/lib/mock`으로 전체 흐름이 동작. `false`면 백엔드 호출 |
| `NEXT_PUBLIC_API_BASE` | `http://localhost:8080/api/v1` | 백엔드 주소 |

외부 API 키는 프론트에 두지 않는다. `USE_MOCK=false`일 때 백엔드가 실패하면 화면에서 "예시로 보기"를 골라 Mock으로 이어갈 수 있고, 그 사실을 화면에 표시한다.

## 로컬 아바타 영상 연습

`backend/.env`에 `LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`, `SYNTHESIA_API_KEY`, `SYNTHESIA_AVATAR_ID`를 설정한다. 프론트 개발 서버와 별도 터미널에서 `npm run avatar:worker`를 실행한 뒤 연습 방식에서 아바타 영상을 선택한다. 환경 변수를 바꿨으면 두 프로세스를 다시 시작한다. 토큰 발급은 개발 모드에서만 가능하며, 운영 배포에는 인증과 사용량 제한이 필요하다.

Synthesia 영상과 LiveKit Inference 음성 합성은 각 서비스의 사용량을 소모한다. 상대방 응답 텍스트가 LiveKit과 음성 합성 제공자에게 전송되며, 생성된 음성은 Synthesia의 영상 생성에 사용된다. 영상 연결이 끊기면 채팅 연습을 이용할 수 있다.

## 사용자 데이터

모든 사용자 데이터(공고 선택, 걱정, 타임라인, 대화, 마음 점수, 체크 상태)는 `features/flow/FlowProvider.tsx`의 React 메모리에만 있다. `localStorage`·`sessionStorage`·쿠키를 쓰지 않는다. 새로고침하면 사라지고, 앞 단계 데이터가 없는 화면은 `useRequire`가 시작 화면으로 돌려보낸다.

## 폴더 구조

```text
src/
├── app/                        화면(주소별)
│   ├── page.tsx                S0 시작
│   ├── programs/               공고 목록(필터·검색) · [id] 상세
│   ├── notice/                 S1 공고문 입력 (E1·E2)
│   ├── concerns/               S2 걱정 선택
│   ├── timeline/               S3 참여 타임라인 (E3·E6)
│   ├── check/before, after/    S4·S7 마음 체크
│   ├── practice/               S5 장면·난이도 · session/ S6 롤플레이 (E3·E4·E5)
│   ├── result/                 S8 결과
│   ├── journey/                나의 노선 (현재 이용 중에만)
│   ├── inquiry/                문의 문장
│   ├── help/                   S-C 위기 안내
│   └── about/                  이용 안내
├── components/                 layout(AppShell·TopBar·FlowProgress·HelpSheet·ThemeToggle), ui(Button·Chip·States)
├── features/                   flow(메모리 상태), program, timeline, simulation(아바타·음성), emotion
├── lib/                        api(백엔드 호출·Mock 전환), mock(예시 데이터·규칙), safety(입력 검증·위기 신호), labels
└── types/api.ts                API DTO (docs/API.md와 1:1)
```
