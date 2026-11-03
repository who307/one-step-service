# ADR 001: PostgreSQL/pgvector와 OpenAI 임베딩

상태: 첫 구현 선택. 기록일: 2026-11-01.

## 결정

- 기존 Java/Spring 백엔드에 RAG 검색 기능을 추가한다.
- PostgreSQL과 pgvector로 일반 데이터·임베딩을 같은 DB에 저장한다.
- 기본 모델은 `text-embedding-3-small`, 출력 차원은 1,536이다.
- `text-embedding-3-large` 비교 시 모델 설정을 바꾸고 대상 자료를 재색인한다. 모델별 데이터가 섞이지 않게 한다.
- 초기 검색은 작은 공고 집합의 정확한 벡터 거리 검색으로 시작한다. 근사 검색 인덱스는 규모와 지연 측정 결과로 판단한다.

## 이유와 한계

기존 백엔드 언어를 유지하면 팀원 연결이 단순하다. PostgreSQL은 버전 전환을 트랜잭션으로 처리할 수 있다. small은 비교 기준을 만들기 좋은 낮은 비용의 모델이다. 이 선택이 한국어 공고에서 최상의 검색 품질을 보장하지는 않는다.

large의 기본 차원은 3,072지만 `dimensions`로 줄일 수 있다. DB 설정과 동일한 차원으로 문서·질문을 임베딩한다. 향후 근사 검색 인덱스를 도입할 때에는 pgvector 인덱스 종류별 차원 제한을 다시 확인한다.

## 공식 근거

- [OpenAI 임베딩 안내](https://developers.openai.com/api/docs/guides/embeddings)
- [OpenAI 임베딩 API](https://developers.openai.com/api/reference/resources/embeddings/methods/create)
- [pgvector](https://github.com/pgvector/pgvector)

## 재검토 조건

고정 질문에서 근거 검색이 부족하거나 자료가 커져 지연이 문제가 되면 large, 키워드 결합, 재정렬을 각각 비교한다. 여러 변수를 동시에 바꾸지 않는다.
