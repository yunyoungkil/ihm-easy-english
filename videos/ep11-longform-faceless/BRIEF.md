---
workflow: faceless-explainer
flow: automation
storyboard: yes
message: "GOING TO는 문장 속에서 원어민이 항상 GONNA로 압축해 발음한다 — 왜 그런지 원리로 이해한다"
destination: youtube-longform
aspect: 1920x1080
language: ko
audience: "영어 철자와 발음 규칙이 낯선 40~60대 왕초보 학습자"
length: ~5min
angle: narrative
---

## Intent

단편 EP11(아이디어 보드 데이터 기반 선정 — 시즌 기획 아님, 상세:
[단편/시즌 분류 정리](../../knowledge/decisions/2026-09-03-standalone-vs-season-episodes.md)).
시즌1은 -TION/-SION/-TURE/-CIAL 등 **단어 자체의 발음 규칙**을 다뤘고, 이 편은 시즌1 종료 이후
가장 유명하고 인지도 높은 축약(GOING TO → GONNA)을 다룬 첫 문장 단위 소재다.

**이 저장소의 첫 HyperFrames 롱폼 프로젝트다.** 기존 롱폼(EP6~EP10)은 전부 Remotion `CardScene`으로
만들었고, HyperFrames 쪽엔 롱폼용 카드 템플릿이 아직 없다
([HyperFrames 전면 전환 결정](../../knowledge/decisions/2026-08-26-hyperframes-full-migration.md) 참고).
이 프로젝트에서 롱폼용 비주얼 템플릿을 새로 설계한다 — Remotion `CardScene`의 3단 구조(상단
진행 점, 중앙 카드, 하단 자막)를 그대로 옮기지 않고, HyperFrames의 frame preset 시스템으로 새로 설계.

## 제작 순서 (실제로 이 순서로 진행함 — knowledge/VIDEO_WORKFLOW.md 1~3단계)

1. **아이디어 추천**: 유튜브 리서치(SayWaader "미국인들이 매일 쓰는 17가지 연음 규칙" — 왕초보는
   gonna·wanna·gotta부터 시작 권장) + 채널 자체 성과 데이터(`npm run content-opportunity`)를 근거로
   5개 후보 중 GONNA 선택(가장 인지도 높은 축약, 시즌 오프너로 적합).
2. **썸네일 확정** (대본보다 먼저): 좌측 고정 템플릿 + 우측 가변 장면 5안 중 선택.
3. **대본**: 확정된 썸네일 훅에 맞춰 작성(`SCRIPT.md`).

## 확정된 제목·썸네일

- **제목**: `GOING TO를 원어민처럼 읽으면 GONNA가 됩니다 — 그럼 WANT TO는요?`

### 좌측 — 고정 템플릿 (앞으로 이 시즌 다른 편에도 재사용 가능한 베이스)

상단 2단 헤드라인(줄1 흰색 "GOING TO", 줄2 노랑(#F5C518) 박스+검정 "GONNA") + 좌하단 원형 실사
입모양 사진(파랑(#008EFF) 글로우 링) + 부드러운 곡선 연결선 + 캡션 "사실 한 소리로 들린다"(다크
네이비 플레이트, 헤드라인과 동일 굵기). 폰트: 검은고딕(Black Han Sans) 스타일, 다크 네이비
(#0A1526) 배경.

### 우측 — 가변 장면 (이 편에서 선택한 것)

**노래 듣다 발음이 헷갈리는 장면.** 헤드폰 낀 20~30대 남성, 손을 귀 뒤로 얹고 집중하는 표정(진짜
궁금해하는 표정 — 충격도 미소도 아님). 가사 캡션 버블 스타일 오답 표시(둥근 알약 모양 + 음표 아이콘)에
정확히 "고나야?" 텍스트 + 빨간 X.

**중요**: 텍스트를 AI에 직접 지정할 때는 "Render EXACTLY this text and nothing else — do not
invent or modify the characters"를 항상 명시할 것 — 안 그러면 한글이 깨진다(실제 발생 사례 있음).

## Assets

- public/thumbnail-reference.jpeg — 확정된 썸네일(위 좌측 고정 템플릿 + 우측 헤드폰 장면), 사용자가
  Google Flow(Nano Banana)로 직접 생성해서 확정. 실제 유튜브 썸네일 이미지 용도이지, 영상 내 비주얼
  에셋으로 쓰지 않는다 — Step 4/5의 프레임 디자인은 이 레퍼런스의 색상·타이포·톤만 참고한다.
- 나레이션은 신규 TTS 생성 필요(Charon 계열 톤, ko-KR, 시즌1과 유사한 차분한 선생님 톤).

## Customizations

- 영어 철자 강조는 `#FF0000`, 대응 한글 발음은 `#008EFF`(제작 규칙 색상 기준) — frame.md 매핑 시 참고.
- Head Fake 대사("정답, GONNA")와 Rehook 대사("그럼 WANT TO는요?")는 확정된 제목·썸네일 문구와
  표현을 동일하게 맞췄다.
- **WANT TO·GOT TO/GOTTA는 이 편에서 다루지 않는다** — 다음 편들의 Rehook 소재로 남겨둔다.

## Notes

- **VO_MODE: verbatim.** 대본은 `user_script.txt`에 원고 그대로 저장 — addiction-loop 구조·톤·길이를
  20턴 넘게 검증한 확정 원고라, Step 3 스토리보드에서 문장을 재구성하지 않고 이 원고를 그대로 씬에
  배분한다. 씬 경계·시각 연출만 새로 설계한다.
- 대본은 `SCRIPT.md`에 확정(13씬, 원고 그대로 사용). 길이는 EP10 실측 TTS
  속도(초당 약 6.8자)로 역산한 추정치이며, 다른 편 길이를 참고한 게 아니라 이 편의 훅이 요구하는
  깊이(예외/예측 퀴즈/격식 구분/리스닝 트레이닝)로 정했다 — 실제 길이는 TTS 생성 후 확정.
- 렌더링은 최종 미리보기 승인 후 진행한다.
- 다음 편(WANT TO→WANNA) 제작 시 이 편의 Rehook을 그대로 회수해야 한다.
