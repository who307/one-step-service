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
| `npm run avatar:worker` | 아바타 영상 연습용 LiveKit 워커 (별도 터미널) |
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

## 연습 방식

- 채팅: 선택지(L2) 또는 직접 입력.
- 음성(누르고 말하기): 마이크 버튼을 누르는 동안만 듣고(데스크톱은 스페이스도 가능), 떼면 들은 말을 바로 보낸다. 누르는 순간 상대역이 하던 말을 멈춘다. 브라우저 음성 인식·합성을 쓴다(`features/simulation/useSpeech.ts`).
- 아바타 영상: 아래 로컬 아바타 영상 연습 참고(`features/simulation/useVideoAvatar.ts`).

온통청년 공고를 고르고 연습하면 연습 메시지에 `programId`를 함께 보내, 백엔드가 그 공고 원문을 근거로 답한다.

## 사용자 데이터

사용자 데이터는 서버로 보내지 않고 이 브라우저의 `localStorage`에만 남겨 새로고침해도 이어진다. `sessionStorage`·쿠키는 쓰지 않는다.

| 키 | 내용 |
|---|---|
| `onestep:flow:v1` | `features/flow/FlowProvider.tsx`의 상태: 고른 공고, 걱정, 마음 점수, 체크 상태, 나의 노선, 연습 기록(장면·난이도·요약·전후 마음), 공고별 이어 하기 |
| `onestep:guide-seen` | 첫 방문 안내서를 봤는지 (`features/guide/seen.ts`) |

진행 중인 연습 대화 원문은 저장하지 않는다. 앞 단계 데이터가 없는 화면은 저장된 값을 불러온 뒤 `useRequire`가 시작 화면으로 돌려보낸다.

## 폴더 구조

```text
src/
├── app/                        화면(주소별)
│   ├── page.tsx                S0 시작 (이어 하기·나의 노선)
│   ├── guide/                  첫 방문 안내서
│   ├── programs/               공고 목록(필터·검색·정렬) · [id] 상세
│   ├── concerns/               S2 걱정 선택
│   ├── check/before, after/    S4·S7 마음 체크
│   ├── practice/               S5 장면·난이도 · session/ S6 롤플레이 (E3·E4·E5) · avatar/ 아바타 영상
│   ├── result/                 S8 결과
│   ├── records/                내 기록 (공고·연습·나의 변화)
│   ├── journey/                참여 체크 (내 기록에서만 연다)
│   ├── inquiry/                문의 문장
│   ├── help/                   S-C 위기 안내
│   ├── about/                  이용 안내
│   └── api/avatar/             아바타용 LiveKit 토큰 발급 (개발 모드만)
├── components/                 layout(AppShell·TopBar·BottomNav·FlowProgress·HelpSheet·ThemeToggle), ui(Button·Chip·States)
├── features/                   flow(상태·localStorage 저장), program, simulation(음성·아바타), emotion, journey, records, guide, timeline
├── lib/                        api(백엔드 호출·Mock 전환), mock(예시 데이터·규칙), safety(입력 검증·위기 신호), journey, labels
└── types/api.ts                API DTO (docs/API.md와 1:1)
avatar-agent.mjs                아바타 워커 (npm run avatar:worker)
```
