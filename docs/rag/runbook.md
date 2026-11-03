# 로컬 실행과 복구

## 준비

Java 21, PostgreSQL + pgvector, OpenAI API 키, 기존 온통청년 API 키가 필요하다. Docker Compose를 쓰거나 pgvector가 설치된 로컬 PostgreSQL을 연결할 수 있다.

`backend/.env`에 설정한다. 실제 키는 커밋하지 않는다.

```dotenv
YOUTHCENTER_ENABLED=true
YOUTHCENTER_API_KEY=기존_키
RAG_ENABLED=true
OPENAI_API_KEY=발급받은_키
RAG_EMBEDDING_MODEL=text-embedding-3-small
RAG_EMBEDDING_DIMENSIONS=1536
RAG_DB_URL=jdbc:postgresql://localhost:5433/onestep_rag
RAG_DB_USER=onestep
RAG_DB_PASSWORD=로컬_DB_비밀번호
RAG_ADMIN_TOKEN=충분히_긴_임의의_관리_토큰
RAG_SYNC_ENABLED=false
```

DB 계정·비밀번호는 실제 DB 생성 설정과 맞춘다. 관리 토큰은 직접 정하는 값이며 외부 서비스에서 발급받는 API 키가 아니다. `.env`에 키만 넣어도 RAG가 자동 활성화되지는 않는다.

## 실행

DB를 먼저 실행한 뒤 `backend`에서 실행한다.

Docker Compose를 사용할 경우 프로젝트 루트에서 실행한다.

```bash
docker compose --env-file backend/.env -f compose.rag.yml up -d
```

`backend/.env`의 `RAG_DB_PASSWORD`는 빈 값이 아니어야 한다. Docker 없이 기존 PostgreSQL을 사용할 수도 있다.

```bash
./gradlew bootRun --console=plain
```

기존 8080 서버를 유지하려면 이 실행의 `SERVER_PORT`와 아래 명령의 주소를 다른 포트로 맞춘다. RAG 초기화 시 DB migration이 실행된다.

## 색인

관리 토큰을 터미널 환경변수 `RAG_ADMIN_TOKEN`에 설정한 뒤 프로젝트 루트에서 실행한다. 실제 공고 텍스트를 OpenAI 임베딩 API에 전달하며 사용 비용이 발생한다.

```bash
curl --fail-with-body http://localhost:8080/api/v1/rag/index \
  -H 'Content-Type: application/json' \
  -H "X-RAG-Admin-Token: $RAG_ADMIN_TOKEN" \
  -d '{"programId":"ontong-20261021005400214208"}'
```

나머지 표본 ID는 [README](README.md)에 있다. 같은 설정·본문으로 다시 색인하면 `UNCHANGED`인지 확인한다.

## 검색·상태

```bash
curl --fail-with-body http://localhost:8080/api/v1/rag/search \
  -H 'Content-Type: application/json' \
  -d '{"programId":"ontong-20261021005400214208","query":"보증금과 월세 기준은?","topK":3}'
```

```bash
curl --fail-with-body http://localhost:8080/api/v1/rag/status/ontong-20261021005400214208
```

검색 문단에 질문의 답이 실제로 있는지 읽어본다. 점수만으로 답변 정확도를 판정하지 않는다.

## 평가

```bash
python3 scripts/rag-evaluate.py --dry-run
python3 scripts/rag-evaluate.py --base-url http://localhost:8080 --repeats 3
```

기본 보고서: `backend/build/rag/evaluation.json`, `evaluation.md`. 자동 평가에는 고정된 개발용 질문만 쓴다. 실제 사용자 대화를 fixture로 복사하지 않는다.

## 복구

| 현상 | 확인·조치 |
|---|---|
| RAG 경로가 없음 | `RAG_ENABLED`, 실행 중인 브랜치·서버 재시작 확인 |
| DB 연결 실패 | DB 실행 상태, 포트·계정·비밀번호 확인 |
| vector 확장 없음 | 연결한 PostgreSQL에 pgvector 설치 여부 확인 |
| 색인 인증 실패 | 서버와 호출 측 관리 토큰 일치 확인 |
| 임베딩 실패 | 키 존재, API 사용 가능 여부, 제한·차원 설정 확인. 키는 로그에 출력하지 않음 |
| `REINDEX_REQUIRED` | 현재 모델·차원으로 대상 공고 재색인 |
| 자료가 오래됨 | 상태와 수집 시각 확인 후 관리 색인 호출 |
| 갱신 실패 | 이전 성공 버전 보존 여부 확인 후 재시도 |

large 비교 시 모델을 바꾼 뒤 재색인한다. 비교 결과에는 사용 모델·차원·문서 버전을 남긴다. 비용·속도·정확도가 개선됐는지는 실제 보고서로 판단한다.
