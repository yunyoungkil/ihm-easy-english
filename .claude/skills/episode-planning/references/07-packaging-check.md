# Phase 13: 업로드 전 패키징 점검

영상은 다 만들었는데 제목·썸네일·설명 때문에 손해 보는 일을 막는다. 대상은 `output/upload-packages/<project>/`.

먼저 `knowledge/thumbnail-strategy.md`와 `02-title-and-thumbnail.md`를 읽는다.

---

## 1. 자동 검사부터

1. `npm run check-terms -- videos/<프로젝트>`: 화면 글자, 대본 낭독문, 그림 프롬프트의 금지어.
2. `npm run upload-page -- output/upload-packages/<패키지>`: 업로드 페이지를 다시 만들면서 금지어·제목 길이·자리표시자 링크를 검사한다.
3. 대시보드 자동 업로드를 쓸 경우, 대기 큐에서 메인 썸네일 승인이 필요하다는 것을 사용자에게 알린다. 에이전트가 승인하지 않는다.

---

## 2. 스킬로 점검

**작은 표본이면 필수 2개만 돌린다 (2026-11-06)**: SKILL.md "작은 표본 규칙"에 해당하면 `korean-skills:grammar-checker`와 `design:design-critique`가 필수이고, 나머지는 사용자가 요청할 때 돌린다. 1절 자동 검사와 3절 체크리스트는 항상 한다.

| 점검 항목 | 쓰는 스킬 | 기준 |
|---|---|---|
| 제목·설명·태그 검색 노출 | `marketing:seo-audit` (유튜브 검색에 맞게 적용) | 시청자가 실제로 치는 검색어가 제목 앞쪽에 있는가. 근거는 대시보드 검색어 데이터, `market-demand.json` 제목 패턴, 웹 검색 |
| AI 말투 | `korean-skills:humanizer` | 설명란·고정 댓글이 사람이 쓴 말처럼 읽히는가 |
| 표기 일관성 | `korean-skills:style-guide` | 이전 편들과 용어·숫자·괄호 표기가 같은가 (`[반복 듣기]` 등) |
| 맞춤법·띄어쓰기 | `korean-skills:grammar-checker` | 제목, 설명, 고정 댓글, 챕터 이름 전부 (마지막에 실행) |
| 브랜드 톤 | `marketing:brand-review` | `knowledge/brand-persona.md` 기준, 금지어·과장 표현·가짜 해외 일화 없음 |
| 썸네일 가독성 | `design:design-critique` | 5단어 이하, 칩 2단어 이하, 채널명 없음, 인물 없음, 시안 A/B/C가 서로 다른 훅인가 |
| 40~60대 가독성 | `design:accessibility-review` | 글자 대비(WCAG AA), 모바일 피드 크기에서 읽히는가. 최종 확인은 대시보드 "🔍 검색 피드 & 잘된 썸네일" 탭(실제 한국 유튜브 검색 결과 사이에 우리 썸네일 + 흐림·흑백 보기)(사용자가 직접 본다) |
| 짧은 문구 | `design:ux-copy` | 썸네일 카피·고정 댓글 첫 줄·CTA 문장 |

## 3. 체크리스트로 점검

| 항목 | 기준 |
|---|---|
| 같은 틀 반복 | 직전 3편과 제목 문장 틀, 프레임 구성이 같은가, 이 영상에만 있는 코너가 있는가 (2026-11-06 이후 기획한 영상부터, EP24~29 제외) |
| 쇼츠 → 롱폼 연결 | 쇼츠라면 설명·고정 댓글에 관련 롱폼 링크가 있는가 (Phase 12 2절) |
| 다음 영상 연결 | 엔드스크린 2칸, 재생목록이 `BRIEF.md`에 정해져 있고 체크리스트에 스튜디오 작업으로 적혀 있는가 (Phase 12 3절) |
| 영상 파일명 | 검색 키워드 파일명인가 (`04-visual-and-assets.md` 4절) |

---

## 4. 산출물

- `output/upload-packages/<패키지>/packaging-review.md`: "통과 / 고칠 것(원문 → 수정안)" 표. 스킬마다 따로 적는다.
- 고칠 것은 제안만 하고, 패키지 파일은 사용자 승인 뒤에 고친다. 고치면 `knowledge/production-rules.md` "업로드 패키지 변경 완료 조건"을 따른다.
- 예약이 확인되면(패키지 `status.json`이 `scheduled`) 소재 이력을 `status: "scheduled"`로 묻지 않고 등록한다(`01-topic-and-data.md` "소재 이력 등록", 2026-11-11).

**멈춤 지점 (공개 게이트)**: 점검 결과를 보고하고, 수정 승인과 공개 진행 여부를 사용자에게 받는다.
