# 한걸음 (one_step_service)

팀 ON:KEY(온기). 고립·은둔 청년이 지원 프로그램에 처음 참석하기 전에, 공식 정보를 확인하고 AI 상대역과 첫마디를 미리 연습하도록 돕는 서비스입니다.

## 진행 상태

해커톤 팀 협업을 시작하기 전에 만든 **초기 작업본**입니다. 이 레포를 토대로 팀 협업을 시작했고, 이후 개발은 팀 레포(비공개)에서 이어가고 있습니다.

- **프론트엔드:** 주요 화면 구현 완료 (홈·온보딩·프로그램·연습·기록·방문). 예시 데이터 모드(`NEXT_PUBLIC_USE_MOCK=true`)로 동작합니다.
- **백엔드:** Spring 프로젝트 구조만 잡아 둔 상태입니다.
- **API 연동:** 아직 하지 않았습니다.

## 폴더 구조

```text
hackathon-one-step-service/
├── frontend/                      Next.js 15 (App Router) + React 19 + TypeScript + Tailwind v4
│   └── src/                       자세한 구조는 frontend/README.md
│       ├── app/                   화면: 홈(나의 노선), onboarding, programs, practice, records, visited
│       ├── components/            journey(노선), program, practice, checkin, records, layout, ui
│       ├── lib/                   api(백엔드 전환 지점), practice/session(AI 연동 지점), storage(기기 저장), journey
│       └── mocks/                 예시 공고·장면·추천 규칙 (예시 데이터 모드)
│
├── backend/                       Spring Boot 4 + Java 21 + JPA + MySQL
│   └── src/main/java/com/onkey/onestep/
│       ├── global/
│       │   ├── config/            AppProperties, WebConfig(CORS), WebSocketConfig, DataSeeder
│       │   ├── response/          ApiResponse<T>
│       │   └── exception/         GlobalExceptionHandler, NotFoundException
│       ├── program/               ① 공고
│       │   ├── domain/            Program, ProgramFact(확인됨/확인 필요), Location
│       │   ├── client/            YouthCenterClient(포트) + MockYouthCenterClient  ← 온통청년 API 연동 지점
│       │   ├── service/           ProgramService, ProgramSyncService(동기화 TODO)
│       │   ├── controller/        GET /api/programs, /api/programs/{id}
│       │   └── repository/ dto/
│       ├── recommendation/        ③-1 POST /api/recommendations
│       └── practice/              ② 연습
│           ├── domain/            Scene(장면 + AI 지시문)
│           ├── gateway/           AvatarGateway(포트) + MockAvatarGateway + PracticeWebSocketHandler(/ws/practice)  ← Gemini Live 연동 지점
│           └── controller/        GET /api/scenes
│
├── docker-compose.yml             로컬 MySQL 8.4
└── docs/ARCHITECTURE.md           설계 원칙과 연동 계획
```

## 실행

```bash
# 1) 프론트만 (mock 데이터로 전체 흐름 확인 가능)
cd frontend
npm install
npm run dev            # http://localhost:3000

# 2) 백엔드까지 연결
docker compose up -d   # MySQL (Docker 필요)
cd backend
./gradlew bootRun      # http://localhost:8080 — 첫 기동 때 따뜻한 집 공고와 장면 4개가 들어감
# frontend/.env.local 에서 NEXT_PUBLIC_USE_MOCK=false 로 바꾸면 백엔드 데이터를 씀
```

외부 API 키는 `backend/.env.example`을 참고해 환경변수로만 넣습니다. 저장소에 커밋하지 않습니다.
