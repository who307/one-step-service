
# Architecture Overview

> **한걸음 (HANGEOLUM)** — 사회적 고립이나 대인관계에 어려움을 느끼는 청년이 지원사업 참여 정보를 확인하고, AI 상황 연습을 통해 작은 행동을 준비하도록 돕는 모바일 우선 웹서비스.
>
> 이 문서는 개발자와 AI 코딩 에이전트가 코드베이스를 빠르게 이해하기 위한 **살아 있는 아키텍처 문서**다. 실제 구현 변경 시 함께 갱신한다. 아래 경로·API·클래스명은 별도 표시가 없는 한 **설계안**이며, 실제 코드와 대조해 확정한다.

## 1. Project Structure

> **구현 현황 (2026-10-28):** 아래 구조는 실제 코드와 일치한다. 마음 기록·나의 노선은 서버에 저장하지 않으므로 백엔드 `emotion/`, `journey/` 패키지는 두지 않고 프론트 `features/flow`의 상태로 처리하고 브라우저 localStorage에만 남긴다(§3.2.4, §3.2.5, §4.3). 공고문 붙여넣기(S1)와 참여 타임라인(S3) 화면은 흐름에서 뺐다(2026-10-30). 공고를 고르면 걱정(S2) 다음 바로 연습 전 마음(S4)으로 간다. 백엔드 타임라인 API는 남아 있지만 지금 화면에서는 부르지 않는다. 로컬 시연에 MySQL·JPA는 쓰지 않는다(§4.2). 디자인 작업은 `.claude/skills`(frontend-design, hallmark, emil-design-eng, ui-ux-pro-max, web-design-guidelines)를 참고했다.

```text
one-step-service/
├── frontend/
│   ├── src/
│   │   ├── app/                 # Next.js 화면과 라우팅 (S0~S8, S-C, 공고, 노선, 내 기록, 안내서, 문의)
│   │   ├── components/          # 공통 UI (layout, ui)
│   │   ├── features/            # flow(상태·localStorage 저장)·program·timeline·simulation·emotion·journey·records·guide
│   │   ├── lib/                 # api(백엔드·Mock 전환), mock, safety(검증·위기 신호), labels
│   │   └── types/               # API DTO 타입 (api.ts)
│   └── package.json
├── backend/                     # com.onkey.onestep
│   └── src/main/
│       ├── java/.../
│       │   ├── program/         # 공고 조회·필터·추천
│       │   ├── timeline/        # 참여 타임라인·원문 인용 검증(TimelineVerifier)
│       │   ├── simulation/      # AI 롤플레이 (무상태)
│       │   ├── inquiry/         # 문의 문장 초안
│       │   ├── integration/     # ProgramProvider·AiConversationProvider: Mock / 온통청년 / Gemini, Prompts
│       │   └── common/          # 설정·CORS·예외·CrisisDetector·NoticeValidator·로그 필터
│       └── resources/           # application.yml, mock/programs.json
├── docs/
│   ├── ARCHITECTURE.md         # 본 문서
│   ├── API.md                  # 요청·응답·오류 계약
│   ├── SCREEN_SPEC.md          # S0~S8 및 예외 화면
│   ├── AI_SPEC.md              # 프롬프트·역할·평가
│   ├── DESIGN.md               # 디자인 토큰·컴포넌트
│   └── TEST_CASES.md           # 수용·안전·오류 테스트
└── README.md
```

- **프론트엔드:** Next.js 15, React 19, Tailwind CSS v4. 모바일 우선 반응형 웹.
- **백엔드:** Spring Boot 4, Java 21. (Spring Data JPA·MySQL은 공개 공고 캐시가 필요해질 때만 추가)
- **개발·협업:** GitHub, Claude Code. Claude Skills 자료는 별도 첨부·관리하며, 본 문서에서 폴더 경로를 강제하지 않는다.
- 폴더 구조는 기능별 책임을 분리하며, 공통 컴포넌트와 API 계약을 재사용한다.

## 2. High-Level System Diagram

```text
[사용자: 모바일 브라우저]
            |
            v
[Next.js Frontend]
  공고 추천·상세 / 걱정 선택
  전후 마음 체크 / AI 음성 연습 / 결과 / 나의 노선·내 기록(브라우저 localStorage) / 문의 문장
            |
            | REST API / JSON  (/api/v1)
            v
[Spring Boot Backend]
  Program / Timeline / Simulation / Emotion / Journey / Inquiry
            |                 |                  |
            v                 v                  v
   [공개 공고 DB(선택)] [온통청년 API/Mock] [Gemini API/Mock]
                                               |
                                   [STT/TTS API 또는 브라우저 음성]
```

### 주요 사용자 흐름

- **통합 서비스 흐름:** 공고 추천·선택 → 상세 정보·참여 미리보기 → 연습 전 마음 기록 → AI 상황 연습 → 연습 후 마음 기록 → 결과 확인 → 내 기록(다녀왔는지 답하기, 참여 체크는 내 기록에서만 연다).
- **1차 MVP 화면 흐름:** `S0 시작 → 공고 목록·상세 → S2 걱정 선택 → S4 사전 체크 → S5 장면·난이도 선택 → S6 롤플레이 → S7 사후 체크 → S8 결과`. S1 공고문 입력과 S3 참여 타임라인은 흐름에서 뺐다(번호는 기존 문서와 맞추려고 그대로 둔다).
- **별도 화면:** `S-C 위기 안내`, 이용 안내, 첫 방문 안내서. 공고 추천·상세, 문의 문장은 통합 서비스 확장 화면으로 연결한다. 나의 노선은 홈(S0) 안에 있고, 내 기록과 참여 체크(`/journey`, 내 기록에서만 연다)는 흐름 밖에서 연다.
- **예외 흐름:** `E1 입력 길이 오류`, `E2 공고문 인식 실패`, `E3 AI 생성 실패`, `E4 연습 중단 확인`, `E5 위기 신호`, `E6 네트워크 오류`.

### 아키텍처 경계 및 화면 상태

- 프론트엔드는 MySQL 또는 외부 LLM API에 직접 접근하지 않는다.
- 화면 이동 시 필요한 데이터를 프론트엔드 상태로 전달하고, 선행 데이터가 없으면 시작 화면으로 복귀한다.
- 사전·사후 마음 체크는 건너뛸 수 있으며, 누락된 점수의 차이를 임의 계산하지 않는다.
- 뒤로가기·종료는 연습 중단 확인을 거친다.
- **확정: 사용자 개인정보·대화·마음 점수·걱정·체크리스트·활동 이력을 서버에 수집·저장하지 않는다.** 이어서 하기·나의 노선·내 기록을 위해 선택 공고, 걱정, 마음 점수, 체크 상태, 노선의 역, 연습 기록(장면·난이도·요약·전후 마음)은 사용자 브라우저의 localStorage에만 남긴다. 연습 대화 원문(턴)은 남기지 않는다. 외부 AI/STT/TTS 전송이 필요한 경우에는 해당 요청에 한정하며, 외부 제공업체의 처리·보관 정책은 별도 확인한다.

## 3. Core Components

### 3.1. Frontend

- **Name:** 한걸음 모바일 우선 웹 앱
- **Description:** 공고 탐색, 걱정 선택, AI 아바타 연습, 사전·사후 마음 체크, 결과, 나의 노선, 문의 문장 작성, 밝은/어두운 화면 전환.
- **Technologies:** Next.js 15 / React 19 / Tailwind CSS v4.
- **Execution:** 로컬 PC 시연 전용. 외부 배포·웹 호스팅·앱스토어 배포는 하지 않는다.
- **공통 컴포넌트(제안):** `ProgramCard`, `PrimaryButton`, `EmotionSelector`, `AvatarChat`, `SimulationProgress`, `JourneyTimeline`, `ThemeToggle`.
- **UI 규칙:** 모바일 우선, 로딩·빈 결과·실패 상태 표시, 입력 오류는 입력창 가까이에 표시, API 요청 중 중복 제출 방지, 다크 모드 지원.

### 3.2. Backend Services

**기술:** Spring Boot 4 / Java 21 / Spring Data JPA. Controller → Service → Repository 책임을 분리하고 Entity를 API 응답으로 직접 반환하지 않는다.

#### 3.2.1. Program & Recommendation Service

- **책임:** 온통청년 또는 Mock 공고 조회, 공고 상세, 활동 종류·참여 방식 등의 필터와 키워드 검색, 선택 조건에 따른 기본 추천 및 추천 이유 제공.
- **입력:** 활동 종류, 참여 방식, 검색어 등 현재 화면에서 선택한 필터. 과거 이용 기록을 수집하거나 개인화 학습에 활용하지 않는다.
- **출력:** 전체 공고 목록(기본), 필터·검색 결과, 추천 이유, 지원 조건, 신청 기간, 공식 링크.
- **확정 UI 흐름:** 처음에는 전체 공고를 보여주고 활동 종류·참여 방식 등으로 필터링할 수 있다. 공고 검색 기능을 제공하며, 공고를 선택한 뒤 사용자가 ‘걱정되는 점’을 선택하는 단계로 이동한다.
- **제약:** 추천과 실제 자격 충족을 구분하며 API에 없는 사실을 만들어내지 않는다.

#### 3.2.2. Timeline & Preview Service

- **책임:** 공고문 또는 선택 공고를 바탕으로 도착·접수·활동·귀가 단계, 준비물, 미확인 정보, 길찾기·문의 정보를 제공.
- **처리:** 공고문 + 걱정 선택 → LLM 생성 → 구조 검증 → 원문 인용 검증 → 타임라인 반환.
- **핵심 계약:**
  - `Timeline`: `isNotice`, `program`, `steps[]`, `checklist[]`, `unknowns[]`.
  - `TimelineStep`: `phase(ARRIVE|CHECKIN|ACTIVITY|LEAVE)`, `title`, `description`, `time?`, `place?`, `label(CONFIRMED|SIMULATED)`, `sourceQuote?`.
- **검증:** `CONFIRMED`는 원문에 존재하는 `sourceQuote`가 필수. 검증 실패 시 확인된 사실로 표시하지 않고 `SIMULATED`로 처리한다. 단, **SIMULATED도 사실로 단정하지 않는다.**
- 공고에 없는 장소·준비물·시간은 임의 확정하지 않고 확인 필요 또는 일반적인 준비 팁으로 구분한다.

#### 3.2.3. Simulation & AI Conversation Service

- **책임:** 공고·장면·난이도에 맞는 AI 상대역 대화, 연습 요약, 대안 문장 생성.
- **연습 장면:** 첫 문의하기, 접수처에서 말하기, 처음 만난 참여자에게 인사하기 등.
- **난이도:**
  - `L1 지켜보기`: 사용자 입력 없이 예시 대화 확인, 최대 6턴.
  - `L2 짧게 답하기`: 선택지 3개 또는 짧은 입력, 최대 5턴.
  - `L3 자유 대화`: 자유 입력과 맥락 기반 응답, 최대 8턴.
- **대화 규칙:** AI가 실제 담당자가 아닌 연습 상대역임을 알린다. 원칙적으로 1~2문장, 한 번에 질문 하나, 비난·평가·재촉 금지. 중단·다시 시작·난이도 변경 가능.
- **대안 문장:** 상황별 2~3개를 짧은 표현부터 상세 표현까지 제안하고, 사용자가 수정·복사할 수 있게 한다. 정답·점수로 평가하지 않는다.
- **AI 응답:** 구조화된 응답을 서버에서 검증하며 프롬프트 버전과 테스트 사례를 관리한다.

#### 3.2.4. Emotion Service

- **책임:** 사전·사후 자기 보고 마음 상태를 입력·비교한다. 브라우저 localStorage에만 남기고 서버 DB 및 분석 로그에 저장하지 않는다.
- **입력:** `phase(BEFORE|AFTER)`, `emotion?`, `anxietyScore(0~10)`, `participationIntent(0~10)`, `memo?`.
- **출력:** 불안도·참여 의향 전후 값, 차이(양쪽 값이 모두 있을 때), 사용자가 기록한 감정.
- **원칙:** 의료적 진단·치료 효과로 해석하지 않으며 점수 변화에 성공/실패 의미를 부여하지 않는다.
- **명칭 정리 제안:** 기존 `tensionScore`를 `anxietyScore`로 통일하되 실제 DB·API 계약 확정 시 함께 변경한다.

#### 3.2.5. Journey Service

- **책임:** 연습 완료와 사용자가 직접 확인한 실제 참여를 구분하여 홈의 나의 노선에 역으로 표시. 활동 이력은 브라우저 localStorage에만 남기고 서버에 수집·저장하지 않는다.
- **출력:** 홈의 나의 노선(다녀왔는지 한 번에 한 공고씩 묻기), 공고별 진행 단계와 이어서 하기, 직접 체크한 단계, 다음 행동 제안.
- **미션 진행률(확정 방향):** `준비물 챙기기 → 강연 듣기 → 집 도착` 등 구체적인 체크리스트 단계로 나누어 표시하고, 사용자가 직접 체크하여 진행률을 확인한다. **MVP 구현 여부는 시연 안정성과 일정에 따라 결정**하며, 체크 상태는 브라우저 localStorage에만 남긴다.
- **원칙:** 시뮬레이션 완료를 실제 방문으로 간주하지 않는다.

#### 3.2.6. Inquiry Draft Service

- **책임:** 공고·문의 목적·사용자 입력을 바탕으로 정중하고 간결한 문의 문장 초안 생성.
- **출력:** 사용자가 수정·복사할 수 있는 문장.
- **원칙:** 자동 발송하지 않는다.

### 3.3. API Contracts

**설계상 기본 경로:** `/api/v1` (기존 `/api` 표기는 이 경로로 통일 제안).

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/v1/programs` | 공고 목록 |
| GET | `/api/v1/programs/{id}` | 공고 상세 |
| POST | `/api/v1/recommendations` | 조건 기반 추천 |
| POST | `/api/v1/timelines` | 참여 타임라인 생성 |
| POST | `/api/v1/simulations` | 연습 세션 시작 |
| POST | `/api/v1/simulations/{id}/messages` | AI 대화 |
| POST | `/api/v1/simulations/{id}/complete` | 종료·요약 |
| POST | `/api/v1/emotions` | 현재 요청 내 마음 상태 비교용 처리(저장 금지; 필요 없다면 생략) |
| GET | `/api/v1/simulations/{id}/emotions` | 기존 저장 조회 방식은 사용하지 않음(제거 또는 세션 내 비교로 대체) |
| GET | `/api/v1/journey` | 기존 영구 기록 조회 방식은 사용하지 않음(클라이언트 세션 상태로 대체) |
| POST | `/api/v1/inquiries/draft` | 문의 문장 초안 |

**공통 오류 형식:** `{"code":"LLM_TIMEOUT","message":"응답이 지연되고 있어요. 다시 시도해 주세요."}`.

- 코드: `INVALID_LENGTH`, `NOT_A_NOTICE`, `LLM_TIMEOUT`, `LLM_ERROR`, `RATE_LIMITED`, `NETWORK_ERROR`, `INVALID_STATE`.
- API별 요청·응답 스키마, HTTP 상태코드, 인증 방식은 `docs/API.md`에서 상세 정의한다.

### 3.4. Exception Handling

| ID | Trigger | Expected behavior |
|---|---|---|
| E1 | S1 공고문 100자 미만·4,000자 초과 (S1 화면 제거로 현재 해당 없음) | 오류 안내, 다음 버튼 비활성화 |
| E2 | S1 공고문이 아닌 입력 (S1 화면 제거로 현재 해당 없음) | 재입력 또는 샘플 공고 선택 |
| E3 | S6 AI 오류·타임아웃 | 재시도 또는 명시적 Mock 샘플 제공 |
| E4 | S6 사용자 중단·뒤로가기 | 계속/종료 확인 후 이동 |
| E5 | S6 위기 신호 | 일반 연습 중단, S-C 도움 안내 |
| E6 | 공통 네트워크 실패 | 연결 안내 및 재시도 |

- **Frontend:** 입력 검증, 로딩·실패 상태, 중복 요청 방지, 확인 모달, 선행 상태 누락 복구.
- **Backend:** Spring Validation, 공통 예외 처리, 타임아웃, LLM JSON·원문 인용 검증, 안전한 오류 메시지, 민감 정보 로그 차단.
- **안전:** 위기 신호는 일반적인 긴장·불안과 구분한다. 규칙 기반 검사를 우선 적용하고 LLM 분류는 보조적으로 사용한다. 위기 시 상대역 응답을 중단하고 공식 도움 창구로 안내한다. 감지 정확성을 보장하지 않으므로 테스트가 필요하다.

## 4. Data Stores & Privacy (확정: 사용자 데이터 미수집·미저장)

### 4.1. 사용자 데이터 정책 — 확정

- **개인정보를 수집하거나 서버 DB에 저장하지 않는다.** 로그인, 회원 프로필, 사용자별 활동 기록, 감정 기록, 걱정 선택 내역, 원문 음성 파일, 대화 원문을 저장하는 기능은 MVP에서 구현하지 않는다.
- 서비스 작동에 필요한 공고 선택, 걱정, 전후 마음 점수, 체크리스트 체크 여부, 나의 노선, 연습 기록은 **사용자 브라우저의 `localStorage`**(`onestep:flow:v1`)에만 남긴다. 연습 대화 턴은 React 메모리에만 두고 남기지 않는다. 쿠키·서버 세션 저장소·서버 DB에는 사용자 데이터를 보관하지 않는다. 사생활 보호 창 등 저장소를 쓸 수 없으면 메모리로만 동작한다.
- AI 대화 또는 STT/TTS 처리를 위해 외부 API에 입력이 전송될 수 있다. **앱 내부 미저장과 외부 서비스의 데이터 처리·보관은 별개**이므로, 외부 전송 사실을 사용자에게 안내하고 공급자 정책을 확인한다.
- 음성 인식은 가능하면 브라우저 내 기능을 우선 검토하되, 브라우저의 STT가 외부 서버에서 처리될 수 있다는 점을 명시한다. 서버·브라우저 로그에 음성 전사·대화 원문을 남기지 않는다.
- 에러·성능 로그는 민감한 요청 본문을 제외한 최소한의 기술 정보만 남긴다.

### 4.2. MySQL — 공개 공고 데이터에 한정(선택)

- **용도:** 필요할 때만 공개 공고 정보 캐시 또는 샘플 공고 관리. 사용자 관련 테이블은 만들지 않는다.
- **선택적 모델:** `Program(id, externalId, title, description, eligibility, applicationStart, applicationEnd, location, applicationUrl, sourceUrl, fetchedAt)`.
- 공개 공고는 온통청년 API/Mock을 직접 조회하는 방식도 가능하다. **로컬 시연에 MySQL이 필수가 아니라면 제거해도 된다.**
- 기존 설계의 `SimulationSession`, `SimulationMessage`, `EmotionRecord`, `JourneyRecord` 영구 저장 테이블은 **이번 MVP에서 제외**한다.

### 4.3. Client-side Ephemeral State

- **Type:** React/Next.js 상태 + 브라우저 `localStorage`(대화 턴 제외).
- **Purpose:** 선택 공고, 걱정, 감정 점수, 체크리스트 진행률, 나의 노선의 역, 연습 기록, 공고별 진행 상태(이어서 하기). 연습 턴은 메모리에만.
- **Persistence:** 같은 브라우저에서 새로고침·재방문해도 유지된다. 다른 기기로 옮겨지지 않으며, 서버에 개인별 조회·복구 API를 제공하지 않는다.

## 5. External Integrations / APIs

### 5.1. 온통청년

- **Purpose:** 청년 지원사업 공고 목록·상세 정보 제공.
- **Integration Method:** 백엔드 `ProgramProvider` 포트; `OntongYouthProgramProvider` / `MockProgramProvider` 구현(제안 이름).
- **Notes:** 실제 사용 가능한 API, 필드, 신청 링크, 모집 상태, 호출 제한·이용 조건을 연동 전에 확인한다.

### 5.2. Gemini

- **Purpose:** 참여 타임라인, AI 롤플레이, 요약, 대안 문장 및 문의 문장 초안.
- **Integration Method:** 백엔드 `AiConversationProvider` 포트; `GeminiConversationProvider` / `MockConversationProvider` 구현(제안 이름).
- **Notes:** 역할·공고 맥락·난이도 프롬프트, JSON 검증, 타임아웃, 비용·호출 제한 대응.

### 5.3. STT / TTS (고정 캐릭터 음성 대화)

- **UI:** 고정 캐릭터 이미지와 한국어 음성 입력·출력, 대화 자막. 실시간 영상 생성·화상회의 API는 사용하지 않는다.
- **구현 선택:** 한국어 STT/TTS 제공업체(OpenAI, NAVER CLOVA 등) 또는 브라우저 Web Speech API를 실제 테스트 후 선택한다. **제공업체는 아직 확정되지 않았다.**
- **MVP 방식:** 사용자 발화 인식 → 텍스트 → 기존 Gemini 대화 응답 → 한국어 음성 합성·재생의 턴 기반 대화. 동시 양방향 통화는 필수 아님.
- **개인정보:** 음성·전사문·대화 원문은 저장하지 않는다. 외부 음성 API 사용 시 요청별 전송 범위와 제공업체 보관 정책을 확인한다. 마이크 권한 거부·음성 실패 시 텍스트 입력으로 대체한다.

### 5.4. Mock Integrations

- 외부 API 키 없이 전체 핵심 흐름을 시연할 수 있도록 샘플 공고·예시 대화를 제공한다.
- 실제 연동과 동일한 응답 계약을 유지한다.
- Mock 응답은 실제 공고·실제 담당자 답변으로 오인되지 않도록 표시한다.
- 장애 시 Mock 전환은 사용자에게 알린다.

## 6. Local Development & Demo Environment

- **실행 환경:** 한 대의 로컬 시연 PC. 외부 배포·클라우드 호스팅·도메인·CI/CD 구축은 범위 밖이다.
- **구성:** Next.js `localhost:3000`, Spring Boot `localhost:8080`, 공개 공고 캐시가 필요할 경우에만 로컬 MySQL.
- **시연 안정성:** Mock 공고·AI 응답·음성 실패 대체 경로를 준비한다. 외부 API 연결 실패 시 사용자에게 Mock 전환을 명확히 알린다.
- **로그:** 요청 본문, 대화, 전사문, 감정, 체크 상태, API 키는 로그에 남기지 않는다.
- **설정:** API 키는 백엔드 환경변수로 관리하고 Git에 커밋하지 않는다. 브라우저에 비밀키를 전달하지 않는다.

## 7. Security Considerations

- **Authentication:** MVP는 로그인·회원 계정·사용자 식별자를 도입하지 않는다.
- **Authorization:** 사용자별 저장 기록·조회 API가 없으므로 사용자 기록 접근 제어는 범위 밖이다. 관리자 기능이 생기면 별도 검토한다.
- **Data Encryption:** 로컬 시연은 localhost 기반으로 실행한다. 외부 API 호출은 HTTPS/TLS를 사용한다.
- **Key Practices:** 비밀키 서버 보관, 입력 검증, 프롬프트 인젝션 방어, LLM 출력 검증, 개인정보 최소화, 민감 정보 로그 차단.
- **Privacy:** 사용자 데이터 미수집·미저장 원칙을 적용한다. 외부 AI/STT/TTS에 전송되는 정보와 제공업체의 처리 정책은 별도로 안내한다. 사용자 데이터가 서버에 쌓이지 않도록 요청 본문·로그·캐시를 검증한다.
- **AI Safety:** 진단·치료가 아닌 상황 연습임을 명시한다. 위기 신호 시 일반 롤플레이를 중단하고 공식 전문 도움 정보를 안내한다. 과도한 확신·비난·점수 평가를 피한다.
- **Source Integrity:** 실제 공고 원문과 AI 생성 예상 상황을 `CONFIRMED` / `SIMULATED`로 구분하고 서버에서 인용을 검증한다.

## 8. Development & Testing Environment

### Local Setup Instructions

1. GitHub 저장소에서 프로젝트를 가져온다.
2. `frontend`에서 Node.js 및 패키지 의존성을 설치한다.
3. `backend`에서 Java 21, Spring Boot 4 실행 환경을 준비한다.
4. 환경변수를 설정한다. 공개 공고 캐시가 필요한 경우에만 MySQL을 준비한다.
5. Mock 모드로 백엔드·프론트엔드 연결을 검증한다.
6. 실제 외부 API는 키와 이용 조건 확인 후 활성화한다.

정확한 설치 명령은 `README.md`에 관리한다.

### Testing Frameworks

- 프론트엔드 테스트 프레임워크: TBD.
- 백엔드: JUnit 기반 테스트 **권장(미확정)**.
- E2E: S0~S8 정상 흐름과 E1~E6 예외 흐름 테스트.

### Acceptance / Safety Tests

- 걱정 최대 3개 선택 및 건너뛰기.
- L1/L2/L3 턴 제한, 한 번에 질문 하나, 대안 문장 2~3개.
- 사전·사후 0~10 점수 비교, 누락 시 차이 미생성 및 서버 저장 없음.
- LLM 오류·타임아웃·네트워크 실패·Mock 대체 경로.
- 연습 중단 확인, 위기 신호 감지 시 일반 대화 중단.
- 프롬프트 인젝션, 부적절한 상담 조언, 실제 공고 정보 왜곡 테스트.
- 공고 전체 표시·활동 종류/참여 방식 필터·키워드 검색 → 공고 선택 → 걱정 선택 흐름.
- 체크리스트형 미션 진행률의 체크/해제·진행률 계산, 새로고침 후에도 유지되는지 확인.
- 한국어 STT/TTS 및 마이크 거부·음성 실패 시 텍스트 대체 경로.
- 사용자 대화·음성·감정·걱정·활동 이력이 DB·서버 로그에 남지 않는지, 대화 원문이 localStorage에 남지 않는지 확인.

### Performance & Accessibility Targets

- 타임라인 생성 **15초 이내 목표**, 롤플레이 첫 응답 **3초 이내 목표**. 실제 측정으로 검증한다.
- 로딩 중 취소 가능, 모바일 너비 360px 이상, 본문 기본 16px 이상, 색상 외 상태 구분, 키보드 조작, 한국어 오류 안내.

### Code Quality & Team Rules

- 기능별 폴더 책임 유지, 공통 UI 재사용, API 호출 계층 분리.
- Controller / Service / Repository 분리, DTO 사용, 요청 검증, DB 변경 이력 관리.
- API 계약을 임의로 변경하지 않고 변경 시 `docs/API.md`와 프론트 타입을 동기화한다.
- Mock과 실제 연동 코드를 분리하고 공통 인터페이스를 따른다.
- 디자인 토큰·다크 모드·문구는 `docs/DESIGN.md`를 따른다. Claude Skills는 팀에서 별도 첨부하는 자료를 참조한다.
- AI 프롬프트 버전과 테스트 사례는 `docs/AI_SPEC.md`에 관리한다.
- ESLint 등 코드 품질 도구의 실제 설정은 TBD.

## 9. Future Considerations / Roadmap

### MVP (설계상 범위)

- 전체 공고 목록·상세, 활동 종류/참여 방식 필터, 키워드 검색, 공고 선택 후 걱정 선택
- 공고문 직접 입력·샘플 선택, 걱정 선택
- 참여 타임라인·준비 체크리스트·사실/예상 구분
- 고정 캐릭터 이미지 기반 한국어 음성/텍스트 AI 롤플레이(L1~L3), 대안 문장
- 사전·사후 마음 상태 비교(서버 수집·저장 없음, 브라우저에만)
- 결과 화면 및 나의 노선·내 기록 표시(서버 기록 없음, 브라우저에만)
- Mock 기반 전체 시연, 핵심 예외처리·위기 안내

### Future Enhancements

- 향상된 음성 대화 지연 최적화, 고도화된 조건 기반 추천
- 단계별 체크리스트 미션·진행률(이번 MVP에서는 구현 가능성 검토 후 결정)
- 상담 준비 리포트, 공식 전문 상담 연결
- 지도 기반 나의 노선 시각화

### Decisions Pending (TBD)

- 온통청년 API 추천과 공고문 붙여넣기의 연결·우선순위
- 공개 공고 캐시를 위해 MySQL을 사용할지 여부(사용자 데이터 저장은 하지 않기로 확정)
- 1차 MVP에 공고 추천·나의 노선을 어느 수준까지 구현할지
- 한국어 STT/TTS 제공업체 및 요금·음질·지연 테스트(고정 캐릭터 이미지·로컬 시연은 확정)
- 실제 API 응답 필드 및 테스트·인증 방식

## 10. Project Identification

- **Project Name:** 한걸음 (HANGEOLUM)
- **Repository URL:** TBD
- **Primary Contact/Team:** TBD
- **Date of Last Update:** 2026-10-28
- **Document Status:** 팀 결정 반영 개정안 — 사용자 데이터 미수집·미저장, 공고 필터·검색, 로컬 시연 확정

## 11. Glossary / Acronyms

| Term | Meaning |
|---|---|
| MVP | 최소 기능 제품; 해커톤에서 우선 완성할 사용자 흐름 |
| Mock | 실제 외부 서비스 대신 쓰는 시연·테스트 구현 |
| LLM | 대규모 언어 모델; 대화·타임라인·문장 생성에 활용 |
| REST API | 프론트엔드와 백엔드가 통신하는 HTTP 인터페이스 |
| DTO | API 요청·응답용 데이터 전달 객체 |
| JPA | Java 애플리케이션의 영속성 처리 표준 |
| CONFIRMED | 공고 원문에 근거하고 서버 검증을 통과한 정보 |
| SIMULATED | AI가 생성한 예상 상황 또는 검증되지 않은 연습 정보 |
| BEFORE / AFTER | 연습 전·후 마음 상태 구분(서버 저장 없음) |
| S0~S8 | MVP의 정상 사용자 화면 단계 |
| S-C | 위기 안내 화면 |
| E1~E6 | 입력·AI·중단·위기·네트워크 예외 상태 |
| L1~L3 | AI 롤플레이의 지켜보기·짧게 답하기·자유 대화 난이도 |

---

> **유지보수 원칙:** 이 문서는 시스템 구조와 책임의 단일 참조점이다. 상세 화면, API JSON, 프롬프트, 테스트 케이스는 각각 `SCREEN_SPEC.md`, `API.md`, `AI_SPEC.md`, `TEST_CASES.md`에서 관리한다.
