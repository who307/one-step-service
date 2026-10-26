# 설계 메모

## 1. 핵심 기능과 코드 위치

| 기능 | 화면 | 프론트 | 백엔드 | 현재 |
| --- | --- | --- | --- | --- |
| ① 온통청년 공고 | `/programs/[id]` | `lib/api/programs.ts` | `program/client/YouthCenterClient` | Mock (수동 등록 1건) |
| ② AI 아바타 대화 | `/practice/[id]/session` | `lib/practice/session.ts` | `practice/gateway/AvatarGateway`, `/ws/practice` | Mock (고정 대사) |
| ③ 전후 상태 비교 (필수) | `before`, `after`, `/records` | `lib/storage`, `BeforeAfterChart` | 없음 (기기 저장) | 동작 |
| ③-1 공고 추천 | `/onboarding`, `/programs` | `mocks/recommend.ts`(예시 모드) | `recommendation/` | 동작 (규칙 기반) |
| 나의 노선 | 홈 | `components/journey/JourneyLine`, `lib/journey.ts`, `journeyStore` | 없음 (기기 저장) | 동작 |
| 문의 문장 만들기 | `/programs/[id]` | `components/program/InquiryComposer` | 없음 | 동작 (복사만, 발송은 사용자) |

## 2. 외부 연동을 붙이는 방법

두 연동 모두 **포트(인터페이스) + Mock 구현** 구조로 잡아 두었다. 실제 구현은 같은 인터페이스를 구현한 클래스를 하나 추가하고 설정값을 켜면 된다. 화면 코드는 바꾸지 않는다.

### 온통청년 API
1. `program/client/YouthCenterApiClient implements YouthCenterClient` 작성, `@ConditionalOnProperty(name="onestep.youth-center.enabled", havingValue="true")`
2. `ProgramSyncService.sync()`에서 `YouthPolicyItem → Program` 변환, `externalId` 기준 upsert
3. API에 없는 항목(준비물·세부 순서·시각)은 `UNCONFIRMED`로 저장. 추측해 채우지 않는다
4. `MANUAL` 공고는 덮어쓰지 않는다
5. 브라우저에서 직접 호출하지 않는다(키 노출·CORS)

### AI 아바타 (Gemini Live)
1. `practice/gateway/GeminiAvatarGateway implements AvatarGateway`, `onestep.gemini.enabled=true`일 때 활성
2. 프론트 `LivePracticeSession`을 만들어 `/ws/practice?sceneId=&programId=`에 연결
   - 올리는 것: 마이크 PCM(바이너리), `pause` / `resume` / `end` / `text:…`(텍스트)
   - 받는 것: `{type:"caption"}`, `{type:"state"}` JSON과 아바타 음성(바이너리)
3. `createPracticeSession()`에서 `USE_MOCK`에 따라 Mock / Live 선택
4. 시스템 프롬프트 공통 규칙: 평가·진단 금지, 목소리로 감정 추정 금지, 정책 질문은 `program_fact` 근거로만 답하고 없으면 "확인 필요"

## 3. 지켜야 할 원칙 (기획서에서 온 것)

- **모르는 정보는 만들지 않는다.** `FactStatus.UNCONFIRMED`는 화면에서 "확인 필요"로 따로 묶는다. 추천에서 감점도 가점도 하지 않는다.
- **전후 자기 응답은 필수다.** 연습 전 5문항을 모두 답해야 연습이 시작되고, 연습 후 5문항을 모두 답해야 기록이 저장된다. 연습 중 앱을 떠나면 홈에서 연습 후 기록을 이어서 할 수 있다. 슬라이더는 직접 움직이기 전까지 빈 상태로 두어 기본값에 끌려가지 않게 한다.
- **전후 자기 응답은 기기에만 둔다.** 서버·AI로 보내지 않는다. 자존감은 다른 항목과 점수 방향이 반대다.
- **멈출 권한.** 연습 화면에는 항상 "잠깐 쉬기", "오늘은 여기까지"가 있다. 재개는 사용자가 직접 누른다. 연습을 일찍 끝내도 괜찮고, 끝낸 뒤 연습 후 기록으로 이어진다.
- **도움 연락처.** 모든 화면 상단 "도움"에서 109 / 1577-0199로 연결한다.
- **나의 노선은 재촉하지 않는다.** 공고 읽기·길 확인·문의 준비 같은 작은 행동도 역으로 남긴다. 못 간 것은 "쉬어감"으로 남기고 노선을 끊지 않는다. 연속 기록, 순위, "며칠째" 알림은 만들지 않는다. 다음 역은 다녀온 곳과 같거나 한 칸 넓은 활동만 제안한다(`breadth`: 혼자·온라인 1 → 여럿이 또는 방문 2 → 방문+여럿이 3 → 일경험 4).
- **사용자를 꼬리표로 부르지 않는다.** 화면 문구에 "고립", "은둔"을 쓰지 않는다.
- **관리자 화면·기관 공유는 이번 MVP에서 만들지 않는다.**

## 4. 디자인 시스템

설치한 디자인 스킬(`.claude/skills/`)을 기준으로 다시 잡았다.

| 항목 | 값 |
| --- | --- |
| 방향 | 따뜻한 길 안내 표지판. 노선도처럼 또렷하되 햇볕 드는 바닥처럼 따뜻하게. 노란색은 앞으로 나아가는 길(노선·주요 버튼), 주황 온기는 걸음을 내디딘 순간에만 |
| 글꼴 | IBM Plex Sans KR 한 가족 (400·500·600·700) |
| 색 | `paper #FAF5EF` · `surface #FFFDFA` · `ink #2B2320`(따뜻한 먹색) · `route #F5B800` → `glow #E8762C`(노선: 노랑에서 주황으로 이어지는 6px 그라데이션, 남은 구간은 연한 점선) · `station #C2410C`(지하철 노선도형 역: 지나온 역은 노선 색으로 채움, 작은 역은 흰 속 + 노선 색 테두리, 현재 역은 흰 속 + 굵은 진주황 테두리 + 빛 고리, 다녀온 역은 온기 색 채움 + 빛 고리) · 주요 버튼 = 노랑 `#F5B800` + 먹색 글자(대비 8.6:1, 다크 모드는 청록 `#5FC2B8`), 테두리·그림자 없이 색면만 · 보조 버튼 = 흰 바탕 + 1px 연한 선 · `sure #3F6B2C` / `unsure #8A4F00`. 글자 대비 모두 4.5:1 이상. 기본은 항상 밝은 화면(기기 다크 모드를 따라가지 않음). 어두운 화면은 길 안내 표지판 디자인(v2)의 다크 팔레트(바탕 `#141D1F`, 글자 `#E8EEEC`, 버튼 청록 `#5FC2B8`, 노선 노랑 `#F5B800`, 온기 주황 `#F2893E`, 차트 전 `#6B7EE0`/후 `#B8830A`)이고, 상단의 화면 모드 버튼(`ThemeToggle`, 해·달 아이콘)으로 켤 때만 쓴다. 고른 값은 이 기기에 저장되고, 첫 페인트 전 인라인 스크립트로 적용해 깜빡임을 막는다. 크림+세리프+테라코타 조합은 쓰지 않음(산세리프 유지, 테라코타 없음) |
| 모서리 | 8px(태그) / 12px(버튼·면) / 원형(선택 칩). 그림자 없음 |
| 노선 장치 | 홈 세로 노선도, 안쪽 화면 가로 노선(현재 역), 하단 메뉴 현재 위치 막대, 지도 자리의 경로선, 슬라이더 손잡이 |
| 온기 색 | `glow #E8762C`(다크 `#F2893E`, 다크 역 테두리도 같은 색), `glow-soft`. **걸음을 내디딘 순간에만** 쓴다: 다녀온 역, 첫단추 축하, 연습 완료 알림. 노선은 쌓인 걸음만큼 노랑에서 주황으로 데워진다(`heatAt`: 작은 걸음 1, 연습 2, 다녀옴 6점, 18점이 최대, 쉬어감은 0점이고 온기를 빼지 않음) |
| 버튼 | `components/ui/Button.tsx`의 세 모양(primary 노랑(다크: 청록) / secondary 흰 바탕+연한 선 / quiet 글자만) × 두 크기(md 48px / sm 44px)와 `IconButton`(44px, label 필수)만 쓴다. 주요 버튼은 한 화면에 하나(이어서 할 일이 있으면 다른 주요 버튼은 secondary로 양보). 비활성은 회색 판 + 남은 조건을 글자로("2문항 남았어요"), 누름 움직임 없음 |
| 상태 표시 | 확인됨=초록+체크, 확인 필요=호박색+물음표+점선. 색만으로 구분하지 않음 |
| 움직임 | 누름 140ms `scale(0.97)`, 자막 등장 200ms `@starting-style`, 도움 시트 320ms 드로어 곡선(닫힘 180ms). 화면 진입 애니메이션 없음. `prefers-reduced-motion`이면 위치 이동 제거 | 앱 전체의 단 하나의 큰 움직임은 '다녀왔어요' 순간(노선이 그어짐 → 역에 불이 켜짐 → 온기가 퍼짐 → 축하 문구, 약 1초)이다.
| 차트 색 | 전 `#5B8DEF` / 후 `#E89B0C` (다크 `#6B7EE0` / `#B8830A`). 색각이상 검증 통과. 빈 원·채운 원으로도 구분 |
| 접근성 | 터치 44px 이상, `:focus-visible`, 본문 건너뛰기, 자막 `aria-live`, 차트 표 보기, `color-scheme`, `touch-action: manipulation`, `overflow-x: clip` |
| 금지 | 크림+세리프+테라코타 조합, 제목 위 작은 라벨, 가운뎃점(·)으로 이은 메타 문구, 버튼 글자 뒤 화살표, 카드 안의 카드, 페이지마다 페이드업 |
