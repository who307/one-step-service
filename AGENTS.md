# Repository working guide

- 기존 사용자 변경을 보존한다. 기능별 브랜치에서 작업한다.
- 비밀키와 실제 사용자 질문·대화를 로그, 문서, 커밋, 평가 fixture에 넣지 않는다.
- 기존 API는 `docs/API.md`, RAG는 `docs/rag/README.md`와 `docs/rag/api-contract.md`를 먼저 읽는다.
- RAG의 공개 공고 저장과 사용자 대화 저장은 별개다. 이 RAG 모듈은 사용자 대화를 저장하지 않는다.

## RAG 변경 시 지킬 계약

- 검색은 서버에서 공고 ID와 활성 문서 버전, 임베딩 모델·차원으로 제한한다.
- `noticeText`의 화면용 길이 제한이나 추정 장소·준비물을 RAG 원본에 적용하지 않는다.
- 새 버전 저장이 끝난 뒤 활성 버전을 교체한다. 실패한 갱신으로 정상 버전을 잃지 않는다.
- 임베딩 모델·차원·청크 규칙을 바꾸면 재색인과 평가가 필요하다. 결정 이유를 `docs/rag/decisions/`에 남긴다.
- 검색 점수는 정답 확률이 아니다. 검색 평가와 답변 평가 결과를 구분한다.
- 요청·응답 변경은 `docs/rag/api-contract.md`, 실행 설정 변경은 `docs/rag/runbook.md`에도 반영한다.
- 완료 보고에는 실제 실행한 검증과 실행하지 못한 검증을 구분한다.

## 검증

- 백엔드: `cd backend && ./gradlew test`
- 평가 fixture·도구 점검: `python3 scripts/rag-evaluate.py --dry-run`
- 실행 중인 RAG 검색 평가: `python3 scripts/rag-evaluate.py --base-url http://localhost:8080 --repeats 3`
  - 실제 질문 임베딩 API를 호출하므로 비용이 발생한다.
  - 결과는 기본적으로 Git에서 제외된 `backend/build/rag/`에 쓴다.
- 프론트를 수정했을 때만 프론트의 관련 lint·타입 검사를 실행한다.
