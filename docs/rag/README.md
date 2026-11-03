# 공고 RAG

선택한 공고에서 질문과 관련된 문단을 찾아 대화 담당 백엔드에 반환하는 모듈이다. 답변 생성·음성·아바타·대화 저장은 대화 담당 기능의 책임이다.

```text
온통청년 원본 → 정리한 본문 → 청크 → OpenAI 임베딩 → PostgreSQL/pgvector
질문 + 공고 ID → 질문 임베딩 → 해당 공고의 활성 문단 검색 → 근거·출처 반환
```

## 첫 버전의 범위

- Spring Boot / Java 21, PostgreSQL + pgvector, OpenAI `text-embedding-3-small`(1,536차원).
- 온통청년 API의 원본 JSON과 길이 제한 없는 본문을 저장한다.
- 지정 공고 수동 색인·검색, 변경 감지, 버전 교체, 선택한 공고의 주기적 갱신.
- `RAG_ENABLED=false`가 기본이다. 기존 화면은 RAG API를 자동 호출하지 않는다.
- 외부 웹페이지/PDF 수집, 전체 게시판 신규 공고 발견, 답변 생성 A/B 평가는 후속 범위다.

## 시작할 공고

| 공고 ID | 제목 | 확인할 검색 |
|---|---|---|
| `ontong-20261021005400214208` | 2026 청년 월세 지원 | 거주·재산 조건 |
| `ontong-20261023005400214281` | 2026 자립준비청년 자립수당 지원 | 지원 금액·보호 이력 |
| `ontong-20261018005400213993` | 2026 취업날개 서비스 지원 | 서비스 내용·신청 방법·정보 누락 |

위 ID는 개발용 고정 표본이다. 정책 내용은 갱신될 수 있으므로 실제 신청 자격 판정의 기준표로 사용하지 않는다.

## 문서 안내

- [실행·복구](runbook.md): DB, 환경변수, 색인, 검색 명령
- [API 계약](api-contract.md): 팀원에게 전달할 입출력
- [구조](architecture.md): 모듈과 저장 데이터
- [수집·갱신](data-pipeline.md): 원문과 버전 관리
- [평가](evaluation.md): 측정 가능한 것과 아직 측정하지 않은 것
- [구현 단계](implementation-plan.md): 완료 조건
- [기술 선택](decisions/001-storage-and-embedding.md), [출처·버전 정책](decisions/002-source-and-version-policy.md)
