# 한걸음 (one-step-service)

팀 ON:KEY(온기). 사회적 고립이나 대인관계에 어려움을 느끼는 청년이 지원 프로그램 공고를 확인하고, 참여하는 날을 미리 걸어보고, AI 연습 상대와 첫마디를 연습하도록 돕는 모바일 우선 웹서비스입니다.

**사용자 데이터는 서버에 수집·저장하지 않습니다.** 로그인이 없고, 걱정·마음 점수·체크 상태·나의 노선은 이 브라우저의 localStorage에만 남아 새로고침해도 이어집니다. 연습 대화 원문은 남기지 않습니다. 서버는 무상태입니다.

## 흐름

`S0 시작 → 공고 목록·상세 → S2 걱정 → S4 연습 전 마음 → S5 장면·난이도 → S6 AI 롤플레이 → S7 연습 후 마음 → S8 결과 → 내 기록`
예외 E1~E6과 위기 안내(S-C)는 [docs/SCREEN_SPEC.md](docs/SCREEN_SPEC.md).

## 실행 (로컬 시연)

```bash
# 1) 프론트만 — 백엔드 없이 예시(Mock) 데이터로 전체 흐름이 동작
cd frontend
npm install
cp .env.example .env.local
npm run dev            # http://localhost:3000
```

```bash
# 2) 백엔드까지 — Java 21, DB 필요 없음
cd backend
./gradlew bootRun      # http://localhost:8080/api/v1  (Windows: gradlew.bat bootRun)
# frontend/.env.local 에서 NEXT_PUBLIC_USE_MOCK=false 로 바꾸고 프론트를 다시 켠다
```

키는 `backend/.env.example`을 `backend/.env`로 복사해 넣습니다. `bootRun`이 이 파일을 읽고, `.env`는 커밋하지 않습니다. 키는 브라우저로 보내지 않습니다.

공고 근거 검색 RAG는 별도 설정으로 활성화하며 PostgreSQL과 OpenAI 임베딩을 사용합니다. 시작 방법은 [RAG 실행 안내](docs/rag/runbook.md)를 확인하세요.

- 실제 공고(온통청년): `YOUTHCENTER_ENABLED=true`, `YOUTHCENTER_API_KEY=...`
- 실제 AI: `GEMINI_ENABLED=true`, `GEMINI_API_KEY=...`. 키가 없으면 Mock 연습 상대가 동작하고 화면에 "예시 응답"으로 표시됩니다.
- 8080을 다른 앱이 쓰고 있으면 `.env`에 `SERVER_PORT=8081`을 넣고, `frontend/.env.local`의 `NEXT_PUBLIC_API_BASE`도 같은 포트로 맞춥니다.

## 구조

```text
frontend/   Next.js 15 · React 19 · Tailwind v4     자세히: frontend/README.md
backend/    Spring Boot 4 · Java 21 (com.onkey.onestep: program, timeline, simulation, inquiry, integration, common)
docs/       ARCHITECTURE · API · SCREEN_SPEC · AI_SPEC · DESIGN · TEST_CASES
.claude/skills/   디자인 참고 스킬
```

## 테스트

```bash
cd backend && ./gradlew test        # 38개: 위기 신호, 공고 판별, 원문 인용 검증, API 계약
cd frontend && npm run lint && npx tsc --noEmit
```
