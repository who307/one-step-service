# RAG API 계약

기본 경로: `/api/v1/rag`. JSON. `RAG_ENABLED=true`일 때 활성화한다. 기존 공고 조회 API와 별개다.

## 색인 — `POST /index`

관리 호출이다. `X-RAG-Admin-Token` 헤더에 서버의 `RAG_ADMIN_TOKEN`과 일치하는 값을 전달한다. 프론트에 관리 토큰을 넣지 않는다.

```json
{"programId":"ontong-20261021005400214208"}
```

```json
{
  "programId":"ontong-20261021005400214208",
  "status":"READY",
  "documentVersion":"버전 식별자",
  "chunkCount":8
}
```

`UNCHANGED`는 같은 원문과 파이프라인 설정이 이미 색인되어 재임베딩하지 않았다는 뜻이다. 위 개수와 버전은 예시다.

## 상태 — `GET /status/{programId}`

`programId`, `status`, `documentVersion`, `model`, `dimensions`, `lastError`를 확인한다. 미색인·진행 중·정상·실패를 구분한다. `lastError`는 안전한 오류 식별 정보이며 외부 응답 본문을 반환하지 않는다.

## 검색 — `POST /search`

```json
{
  "programId":"ontong-20261021005400214208",
  "query":"보증금과 월세 기준은 어떻게 되나요?",
  "topK":3
}
```

`topK`는 선택이며 1~8개다. 검색은 서버에서 해당 공고의 활성 버전으로 제한한다.

```json
{
  "programId":"ontong-20261021005400214208",
  "status":"OK",
  "documentVersion":"버전 식별자",
  "evidence":[
    {
      "chunkId":"청크 식별자",
      "section":"참여 대상",
      "text":"공고: ...\n항목: 참여 대상\n...",
      "sourceUrl":"https://www.youthcenter.go.kr/youthPolicy/ythPlcyTotalSearch/ythPlcyDetail/20261021005400214208",
      "score":0.7
    }
  ],
  "embeddingMs":100,
  "searchMs":5
}
```

점수·시간은 형태를 설명하기 위한 예시다. `score`는 유사도이며 정답 확률이 아니다. `embeddingMs`는 질문 벡터 생성, `searchMs`는 검색 단계 시간이다. 네트워크를 포함한 사용자 관점 전체 시간은 클라이언트에서도 측정한다.

| 검색 status | 팀원 쪽 처리 |
|---|---|
| `OK` | 근거와 출처를 LLM에 전달하되, 실제 답이 있는지 확인 |
| `NO_EVIDENCE` | 반환 기준을 만족한 근거가 없음. 공고 전체에 답이 없다는 증명은 아님 |
| `NOT_INDEXED` | 관리 색인이 필요한 공고 |
| `INDEXING` | 아직 사용할 버전이 준비되지 않음 |
| `FAILED` | 사용할 버전 없이 색인 실패 |
| `REINDEX_REQUIRED` | 현재 모델·차원과 활성 버전이 달라 재색인 필요 |

HTTP 오류는 공통 `{code,message}` 형식이다. 외부 API 실패와 빈 검색 결과를 구분한다. 실패 세부 HTTP 코드와 입력 제한은 구현 DTO/예외 처리 및 테스트를 함께 확인한다.

## 대화 담당 기능의 책임

- 선택한 `programId`를 세션과 연결한다.
- 후속 질문은 이전 대화를 반영해 독립적으로 검색 가능한 문장으로 정리한다.
- 검색 응답의 `documentVersion`과 `chunkId`를 근거 추적에 사용한다.
- 근거에 없는 숫자·자격·서류는 추정하지 않는다.
- 질문·대화를 RAG DB에 저장하도록 요청하지 않는다.
