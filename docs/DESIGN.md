# 디자인

방향: **따뜻한 길 안내 표지판**. 처음 가는 곳을 미리 걸어보는 서비스라서 노선도처럼 또렷하되, 햇볕 드는 바닥처럼 따뜻하게. 토큰 원본은 `frontend/src/app/globals.css`이고, 색·글꼴은 토큰으로만 쓴다(`.claude/skills/hallmark` Floor 규칙).

## 토큰

| 토큰 | 밝은 화면 | 어두운 화면 | 쓰임 |
|---|---|---|---|
| `--paper` | #faf5ef | #141d1f | 바탕 |
| `--surface` | #fffdfa | #1e2a2c | 카드·입력 |
| `--ink` / `-2` / `-3` | #2b2320 / #5b4e47 / #76675e | #e8eeec / #b7c4c2 / #93a3a1 | 글자 |
| `--route` → `--glow` | #f5b800 → #e8762c | 같음 | 노선 그라데이션(그래픽 전용) |
| `--station` | #c2410c | #f2893e | 지금 서 있는 역, 입력 오류 |
| `--action` | #f5b800 (먹색 글자 8.6:1) | #5fc2b8 | 주요 버튼. 화면당 하나 |
| `--sure` / `--unsure` | #3f6b2c / #8a4f00 | #7fccaa / #f2c14e | 공고에서 확인 / 예상·확인 필요 |

글꼴: IBM Plex Sans KR 한 가족. 본문 16px 이상, `word-break: keep-all`.

## 원칙

- **노선 하나가 서비스 전체의 은유.** 홈의 나의 노선, 진행 표시(FlowProgress), 안내서 그림, 공고별 진행바가 같은 모양을 쓴다.
- **확인됨과 예상은 색만으로 나누지 않는다.** 글자 태그 + 테두리(실선/점선)를 같이 바꾼다.
- **점수 변화에 좋고 나쁨의 색을 입히지 않는다.**
- 버튼은 `Button.tsx`의 primary / secondary / quiet 세 가지만. 44px 이상 터치 영역.
- 움직임은 `transform`·`opacity`만, `--ease-out`(cubic-bezier(0.23,1,0.32,1)), 300ms 이하(`.claude/skills/emil-design-eng`). `prefers-reduced-motion` 대응.
- 다크 모드는 상단 버튼으로만 켜고, 저장하지 않는다.
- 문구: 짧은 평서문, 재촉·평가 없음. 오류는 무엇이 잘못됐고 무엇을 하면 되는지만 말한다.
