# API 계약 (v1)

기본 경로: `http://localhost:8080/api/v1` · JSON · 인증 없음 · 로그인·사용자 식별자 없음.

프론트 타입: `frontend/src/types/api.ts`. 이 문서를 바꾸면 그 파일도 같이 바꾼다.

## 공통 원칙

- **서버는 사용자 데이터를 저장하지 않는다.** 걱정, 대화, 점수, 체크 상태는 요청 하나를 처리하는 동안만 메모리에 있다. 연습 대화는 클라이언트가 매 요청에 `history`를 함께 보낸다(무상태).
- 요청 본문·대화·전사문은 로그에 남기지 않는다.
- 성공 응답은 DTO를 그대로 반환한다(래퍼 없음).
- 실패 응답은 항상 아래 형식이다.

```json
{ "code": "LLM_TIMEOUT", "message": "응답이 지연되고 있어요. 다시 시도해 주세요." }
```

| code | HTTP | 언제 |
|---|---|---|
| `INVALID_LENGTH` | 400 | 공고문 100자 미만·4,000자 초과, 걱정 3개 초과, 메시지 300자 초과 |
| `INVALID_REQUEST` | 400 | 그 밖의 검증 실패 |
| `NOT_A_NOTICE` | 422 | 공고문으로 보기 어려운 입력 |
| `NOT_FOUND` | 404 | 없는 공고 |
| `INVALID_STATE` | 409 | 턴 한도를 넘긴 메시지 등 |
| `RATE_LIMITED` | 429 | 외부 AI 호출 한도 |
| `LLM_ERROR` | 502 | AI 응답 실패·형식 오류 |
| `LLM_TIMEOUT` | 504 | AI 응답 지연(타임아웃 12초) |
| `INTERNAL_ERROR` | 500 | 예상하지 못한 서버 오류(요청 내용은 응답·로그에 남기지 않음) |

## 열거형

- `Category`: `DAILY` 일상 회복 · `COOKING` 요리·살림 · `WORK` 일경험 · `ART` 만들기·예술 · `EXERCISE` 걷기·운동 · `TALK` 대화·모임
- `Mode`: `OFFLINE` 직접 방문 · `ONLINE` 온라인 · `GROUP` 여럿이 함께 · `SOLO` 혼자 하기
- `Phase`: `ARRIVE` 도착 · `CHECKIN` 접수 · `ACTIVITY` 활동 · `LEAVE` 귀가
- `Label`: `CONFIRMED` 원문에서 확인됨 · `SIMULATED` 예상(사실로 단정하지 않음)
- `SceneId`: `FIRST_INQUIRY` 첫 문의하기 · `CHECKIN` 접수처에서 말하기 · `GREETING` 처음 만난 참여자에게 인사하기 · `CLOSING` 마무리할 때 소감 말하기
- `Level`: `L1` 지켜보기(최대 6턴) · `L2` 짧게 답하기(최대 5턴) · `L3` 자유 대화(최대 8턴)
- `Source`: `MOCK` · `ONTONG` · `GEMINI`

## 공고

### `GET /programs?category=&mode=&q=`

모든 파라미터는 선택. 비우면 전체 목록.

```json
{
  "source": "MOCK",
  "items": [ProgramSummary]
}
```

`ProgramSummary`

```json
{
  "id": "sample-thursday-table",
  "title": "같이 밥 먹는 목요일",
  "organization": "다온청년공간",
  "category": "COOKING",
  "modes": ["OFFLINE", "GROUP"],
  "summary": "…",
  "applicationStart": "2026-10-20",
  "applicationEnd": "2026-11-09",
  "location": "다온청년공간 2층 공유주방",
  "isSample": true,
  "locationSource": "NOTICE",
  "closed": false
}
```

날짜·장소는 모르면 `null`. `locationSource`: `NOTICE`(원문에서 찾음) · `ESTIMATED`(원문에 없어 공고 내용으로 추정, 화면에 "추정") · 장소가 없으면 `null`. `closed`: 신청·사업 기간이 끝나 지금은 신청할 수 없음(화면에 "마감"). `isSample: true`는 화면 확인용으로 지어낸 공고이며 화면에 "예시"로 표시한다.

### `GET /programs/{id}`

`ProgramDetail` = `ProgramSummary` +

```json
{
  "eligibility": "서울에 사는 19~39세 청년",
  "activitySchedule": "…",
  "supplies": "없음 (앞치마 대여)",
  "contact": "…",
  "applicationUrl": null,
  "sourceUrl": null,
  "noticeText": "공고 원문 텍스트(타임라인 생성에 그대로 사용)",
  "unknowns": ["참여 대상", "준비물"]
}
```

`suppliesSource`: `locationSource`와 같은 규칙.

`unknowns`: 참여 대상·활동 일정·장소·준비물·문의처 중 비었거나(`null`) 추정(`ESTIMATED`)인 항목의 한국어 이름.

### `POST /recommendations`

```json
{ "category": "COOKING", "mode": "OFFLINE", "q": "요리", "openOnly": true }
```

모두 선택. `openOnly: true`면 마감된 공고를 뺀다. 과거 이용 기록은 쓰지 않는다.

```json
{
  "source": "MOCK",
  "items": [{ "program": ProgramSummary, "reasons": ["고른 활동 종류(요리·살림)예요", "직접 방문하는 활동이에요"] }]
}
```

고른 조건을 모두 만족하는 공고만 돌려주고(AND), 맞은 조건을 `reasons`에 적는다. 아무 조건도 없으면 전체를 `reasons: []`로 돌려준다. 신청할 수 있는 공고가 먼저 온다. 추천은 지원 자격 충족을 뜻하지 않는다.

## 참여 타임라인

### `POST /timelines`

```json
{
  "noticeText": "공고 원문 (100~4,000자)",
  "concerns": ["다른 사람과 대화하기가 어려워요"],
  "programId": "sample-thursday-table"
}
```

`concerns` 0~3개(각 100자 이하), `programId` 선택.

```json
{
  "isNotice": true,
  "source": "MOCK",
  "program": { "title": "같이 밥 먹는 목요일", "organization": "다온청년공간" },
  "steps": [
    {
      "phase": "ARRIVE",
      "title": "도착",
      "description": "다온청년공간 2층 공유주방으로 가요.",
      "time": "18:30",
      "place": "다온청년공간 2층 공유주방",
      "label": "CONFIRMED",
      "sourceQuote": "장소: 다온청년공간 2층 공유주방"
    }
  ],
  "checklist": [{ "item": "앞치마(대여 가능)", "label": "CONFIRMED", "sourceQuote": "준비물: 없음 (앞치마는 공간에서 빌려드려요)" }],
  "unknowns": ["마치고 나가는 방법"],
  "tips": ["처음 할 말은 '안녕하세요, ○○ 신청한 ○○○입니다' 한 문장이면 충분해요."]
}
```

- `steps`는 항상 4개, `ARRIVE → CHECKIN → ACTIVITY → LEAVE` 순서.
- **검증(서버):** `CONFIRMED`는 `sourceQuote`가 원문에 실제로 있어야 한다(공백 정규화 후 부분 문자열 비교). 없으면 `SIMULATED`로 바꾸고 `sourceQuote`를 지운다. `SIMULATED`는 화면에서 "예상"으로만 보여주고 사실처럼 쓰지 않는다.
- `time`, `place`는 원문 근거가 없으면 `null`.
- `checklist`는 원문 준비물(`CONFIRMED`)과 일반 준비 팁(`SIMULATED`)을 구분한다.
- `unknowns`: 원문에서 확인되지 않은 것(장소, 시간, 준비물, 비용, 대상 등).
- `tips`: 걱정에 맞춘 일반적인 준비 팁 1~3개.
- 공고문이 아니면 `422 NOT_A_NOTICE`.

## 상황 연습

서버는 연습 세션을 저장하지 않는다. `simulationId`는 경로 일관성을 위한 임의 UUID이며 서버 쪽 상태가 없다.

### 로컬 영상 연결: `POST /api/avatar`

이 경로는 백엔드가 아닌 프론트 개발 서버에서 제공하며 운영 모드에서는 사용할 수 없다. 요청 본문은 없고, 같은 출처의 요청에만 LiveKit 방 URL과 5분짜리 참가 토큰 `{ "url": "wss://…", "token": "…" }`을 반환한다. 응답은 캐시하지 않는다. Synthesia 키와 LiveKit 비밀키는 반환하지 않는다. 이 기능은 별도의 `npm run avatar:worker` 실행이 필요하다. 사용량과 설정은 `frontend/README.md`를 참고한다.

### `POST /simulations`

```json
{ "sceneId": "CHECKIN", "level": "L2", "programTitle": "같이 밥 먹는 목요일", "concerns": [] }
```

```json
{
  "simulationId": "uuid",
  "source": "MOCK",
  "maxTurns": 5,
  "disclaimer": "저는 실제 담당자가 아니라 연습 상대예요. 언제든 멈춰도 괜찮아요.",
  "opening": { "text": "안녕하세요! 프로그램 참여하러 오셨나요?", "choices": ["네, 신청한 ○○○입니다.", "네, 처음 와서요. 여기가 맞나요?", "잠시만요, 확인해 볼게요."] },
  "script": null
}
```

- `L2`만 `opening.choices`(3개)를 채운다. `L1`, `L3`은 `null`.
- `L1`은 `script`에 예시 대화 전체(최대 6턴)를 담는다: `[{ "role": "AI" | "USER", "text": "…" }]`. `L1`은 메시지 API를 부르지 않는다.

### `POST /simulations/{id}/messages`

```json
{
  "sceneId": "CHECKIN",
  "level": "L3",
  "programTitle": "같이 밥 먹는 목요일",
  "history": [{ "role": "AI", "text": "안녕하세요!" }, { "role": "USER", "text": "안녕하세요" }],
  "userText": "네, 처음 왔어요"
}
```

`userText` 1~300자. `history`는 이번 `userText`를 포함하지 않는다.

```json
{
  "crisis": false,
  "reply": { "text": "반가워요. 성함을 알려주시겠어요?", "choices": null },
  "alternatives": ["네, 처음이라 안내가 필요해요.", "처음 왔는데 어디서 기다리면 될까요?"],
  "turn": 2,
  "finished": false
}
```

- `turn` = `history` 안의 USER 수 + 1. `turn >= maxTurns`이면 `finished: true`이고 `reply`는 짧은 마무리 인사.
- `turn > maxTurns`이면 `409 INVALID_STATE`.
- `alternatives`: 방금 사용자 말을 대신할 수 있는 문장 2~3개, 짧은 것부터.
- 상대역 응답: 1~2문장, 질문은 하나, 비난·평가·재촉 금지.
- **위기 신호**(규칙 기반 우선): `userText`에 위기 표현이 있으면 AI를 부르지 않고 `{ "crisis": true, "reply": null, "alternatives": [], "turn": n, "finished": true }`.

### `POST /simulations/{id}/complete`

```json
{ "sceneId": "CHECKIN", "level": "L3", "programTitle": "…", "history": [/* … */] }
```

```json
{
  "summary": "접수처에서 이름을 말하고, 처음이라는 것도 알렸어요.",
  "nextPhrases": ["네, 처음이라 안내가 필요해요.", "혹시 준비해야 할 것이 있을까요?"]
}
```

점수·정답 판정 없음.

## 문의 문장

### `POST /inquiries/draft`

```json
{ "programTitle": "…", "organization": "…", "questions": ["준비물", "세부 일정"], "userNote": "처음 참여해요" }
```

`questions` 1~5개, `userNote` 200자 이하(선택).

```json
{ "text": "안녕하세요. ‘…’ 프로그램에 관심이 있어 문의드립니다.\n…" }
```

자동 발송하지 않는다. 사용자가 고치고 복사한다.

## 마음 기록 · 나의 노선

API 없음. 사전·사후 마음 점수와 노선은 브라우저 메모리에서만 처리하고 서버로 보내지 않는다(Architecture §3.2.4, §3.2.5).
