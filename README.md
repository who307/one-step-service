# 한걸음 (one-step-service)

팀 ON:KEY(온기). 사회적 고립이나 대인관계에 어려움을 느끼는 청년이 지원 프로그램 공고를 확인하고, AI 연습 상대와 첫마디를 연습하고, 다녀온 걸음을 기록하도록 돕는 모바일 우선 웹서비스입니다.

**사용자 데이터는 서버에 수집·저장하지 않습니다.** 로그인이 없고, 걱정·마음 점수·연습 기록(장면·난이도·요약)·나의 노선·참여 체크는 이 브라우저의 localStorage에만 남아 새로고침해도 이어집니다. 연습 대화 원문은 남기지 않습니다. 서버는 무상태이며, 실제 AI를 켜면 연습 대화가 응답 생성을 위해 OpenAI로 전송됩니다.

## 주요 기능

- **공고 찾기**: 온통청년 서울시 공고. 활동 종류·참여 방식 여러 개 선택, 검색, 정렬(추천·마감 임박·최근 시작), 마감 D-n 표시. 고른 조건은 주소에 남습니다.
- **말 연습**: 장면 4개 × 난이도 L1~L3. 채팅·음성(누르고 말하기: 마이크 버튼이나 스페이스를 누르는 동안만 듣기)·아바타 영상(로컬 전용) 중에서 고릅니다.
- **공고 원문 근거 대화**: 온통청년 공고를 골라 연습하면 서버가 그 공고 원문 전체를 프롬프트에 넣어, 원문에 있는 사실만 답하고 없는 것은 "확인되지 않았어요"라고 답합니다([AI 명세](docs/AI_SPEC.md)).
- **문의 문장 초안**: 물어볼 항목을 고르면 문장을 만들어 줍니다. 자동 발송은 하지 않습니다.
- **내 기록·나의 노선**: 연습 전후 마음, 연습 기록, 다녀왔는지 답하기, 참여 체크.
- **안전**: 위기 표현을 감지하면 바로 도움 창구(109, 1577-0199, 112·119)를 안내하고 대화를 폐기합니다.

## 흐름

`S0 시작(처음이면 안내서) → 공고 목록·상세 → S2 걱정 → S4 연습 전 마음 → S5 장면·난이도 → S6 AI 롤플레이 → S7 연습 후 마음 → S8 결과 → 내 기록`

공고 없이 말 연습만 할 수도 있습니다. 화면별 주소와 예외 E3~E6, 위기 안내(S-C)는 [docs/SCREEN_SPEC.md](docs/SCREEN_SPEC.md)에 있습니다.

## 실행 (로컬 시연)

```bash
# 1) 프론트만: 백엔드 없이 예시(Mock) 데이터로 전체 흐름이 동작
cd frontend
npm install
cp .env.example .env.local
npm run dev            # http://localhost:3000
```

```bash
# 2) 백엔드까지: Java 21, DB 필요 없음
cd backend
./gradlew bootRun      # http://localhost:8080/api/v1  (Windows: gradlew.bat bootRun)
# frontend/.env.local 에서 NEXT_PUBLIC_USE_MOCK=false 로 바꾸고 프론트를 다시 켠다
```

키는 `backend/.env.example`을 `backend/.env`로 복사해 넣습니다. `bootRun`이 이 파일을 읽고, `.env`는 커밋하지 않습니다. 키는 브라우저로 보내지 않습니다.

- 실제 공고(온통청년): `YOUTHCENTER_ENABLED=true`, `YOUTHCENTER_API_KEY=...`. 켜면 연습 대화에서 고른 공고의 원문을 근거로 씁니다(30분 메모리 캐시, 4초 넘게 걸리면 원문 없이 답함).
- 실제 AI(OpenAI): `OPENAI_ENABLED=true`, `OPENAI_API_KEY=...`. 모델은 `OPENAI_MODEL`(기본 `gpt-5.4-mini`). 키가 없으면 Mock 연습 상대가 동작하고 화면에 "예시 응답"으로 표시됩니다.
- 8080을 다른 앱이 쓰고 있으면 `.env`에 `SERVER_PORT=8081`을 넣고, `frontend/.env.local`의 `NEXT_PUBLIC_API_BASE`도 같은 포트로 맞춥니다.

### 선택 기능

- **아바타 영상 연습**: `backend/.env`에 LiveKit·Synthesia 키를 넣고, 프론트 개발 서버와 별도 터미널에서 `npm run avatar:worker`를 실행합니다. 사용량이 발생하며 개발 모드에서만 동작합니다. [frontend/README.md](frontend/README.md#로컬-아바타-영상-연습)를 참고하세요.
- **공고 RAG 검색**: 여러 공고에서 찾기나 긴 자료용 문단 검색 모듈입니다. 기본은 꺼져 있고(`RAG_ENABLED=false`), PostgreSQL(pgvector, `compose.rag.yml`)과 OpenAI 임베딩을 사용합니다. 연습 대화의 공고 근거는 RAG 없이 원문 전체를 씁니다. 시작 방법은 [RAG 실행 안내](docs/rag/runbook.md)에 있습니다.

## 구조

```text
frontend/         Next.js 15 · React 19 · Tailwind v4 · LiveKit(아바타)     자세히: frontend/README.md
backend/          Spring Boot 4 · Java 21 (com.onkey.onestep: program, simulation, inquiry, timeline, rag, integration, common)
docs/             ARCHITECTURE · API · SCREEN_SPEC · AI_SPEC · DESIGN · TEST_CASES
docs/rag/         RAG 계약·실행 안내·평가·결정 기록
scripts/          rag-evaluate.py(RAG 검색 평가) · notice-context-evaluate.mjs(공고 원문 근거 대화 평가)
compose.rag.yml   RAG용 PostgreSQL(pgvector)
AGENTS.md         작업 규칙(브랜치·비밀키·RAG 계약·검증)
.claude/skills/   디자인 참고 스킬
```

## 테스트

```bash
cd backend && ./gradlew test                  # 위기 신호, 공고 판별·필터, 원문 인용 검증, 공고 원문 근거, RAG, API 계약
cd frontend && npm run lint && npx tsc --noEmit
python3 scripts/rag-evaluate.py --dry-run     # RAG 평가 fixture·도구 점검 (API 호출 없음)
```
