---
workflow: general-video
flow: automation
storyboard: yes
message: "원어민이 문장을 뭉개서 말하는 게 아니라, 혀를 덜 움직이려고 소리와 소리를 편하게 이어 붙이는 것 — EP13의 '게으른 혀' 원리를 읽기가 아니라 듣기(연음)에 적용한다"
destination: youtube-longform
aspect: 1920x1080
language: ko
audience: "단어는 아는데 문장으로 이어지면 전혀 안 들려 답답함을 느끼는 4060 리스닝 정체기 학습자"
length: 미확정 (대본 작성 전)
angle: narrative
---

## Intent

단편 EP14(EP11 GOING TO→GONNA, EP12 Want vs Won't, EP13 알파벳 소리 지름길에 이은 다음 편).
단어는 다 아는데 문장으로 이어지면 안 들리는 4060 리스닝 정체기 학습자의 답답함을, EP13에서 확립한
채널 고유 원리("혀에 힘을 뺀다")를 **읽기가 아니라 듣기(연음/linking)**에 적용해서 해소한다.
EP13이 "왜 이렇게 읽지?"였다면 EP14는 "왜 이렇게 들리지?" — 같은 원리의 다른 적용이지만, 단편
방침(`knowledge/decisions/2026-09-03-standalone-vs-season-episodes.md`)에 따라 EP13을 봐야만
이해되는 구성으로는 만들지 않는다(독립적으로 완결).

**이 소재는 `💡 아이디어→썸네일 기획 보드`에서 데이터 근거로 선정된 1순위 후보였다** — 시장 수요
키워드 "영어 듣기 안 들리는 이유"(opportunityScore 45.3)와 채널 내 최고 성과 포맷 LEGACY
(fitScore 57, 41건)에 더해, **시청자 DNA에 실제로 기록된 표현**("지들 멋대로 발음", "자주 쓰는
근육")까지 3개 축을 결합해 선정됨. 근거: `data/youtube/idea-board-history.json`(2026-09-07
선택, "이 주제로 진행" 클릭 즉시 자동 기록됨 — 이번에 EP13 작업 중 처음 검증된 자동 등록 기능의
첫 실사용 사례).

**HyperFrames 롱폼 카드 템플릿은 새로 설계하지 않는다** — EP11 프로젝트
(`videos/ep11-longform-faceless/frame.md`)의 프레임 preset 시스템을 EP12·EP13과 동일하게 재사용.

## 확정된 제목·썸네일 (대본보다 먼저 확정 — `VIDEO_WORKFLOW.md` 2단계 규칙)

A/B 시뮬레이터에서 3개 시안(A/B/C) 생성 후 Gemini AI CTR 진단으로 비교, 시안 A가 최고점(S등급,
예상 CTR 9.2~12.8%)으로 채택됨. (참고: 시안 C가 예상보다 살짝 아쉬운 A-등급이었는데도 사용자가
잠시 시안 C를 보고 있었던 것으로 화면에 남아있었으나, Gemini 진단 결과를 그대로 따라 최종적으로
시안 A로 확정.)

- **제목(시안 A)**: 원어민들이 절대로 교과서처럼 똑 부러지게 말하지 않는 진짜 이유
- **썸네일 카피**: 이제 단어가 아니라 문장이 들립니다
- **포인트 뱃지**: ⚡ 소리 연결 비밀
- **썸네일 파일 저장 위치**: `videos/ep14-connected-speech/thumbnail-a.jpg`(채택본)·`thumbnail-b.jpg`·
  `thumbnail-c.jpg`(3종 전부 보존, EP11~13과 동일 관례 — 유튜브 Test & Compare용). 생성 직후
  `output/temp-thumbnails/`(gitignore 대상)에서 바로 이 경로로 옮김 — EP13에서 "임시 폴더에만
  있어서 다른 PC에서 안 보이는" 문제를 겪은 직후라, 이번엔 그 실수를 반복하지 않고 바로 처리함.
  `data/youtube/ab-simulator-state.json`의 imageUrl도 `/api/video-project-asset/` 라우트로
  맞춰 갱신 완료.
- Head Fake·요약 대사는 위 문구와 표현을 동일하게 맞춘다(`VIDEO_WORKFLOW.md` 3단계 규칙, 대본
  작성 시 적용).

## Assets

- 나레이션은 신규 생성 필요 — EP11~13과 동일하게 **남성 음성**(`scripts/tts-config.mjs`의
  `VOICE`, Gemini Charon) 사용.
- **EP12에서 검증되어 기본 적용 항목**(`CLAUDE.md`/`AGENTS.md` 공통 규칙): 나레이션·BGM 실제
  합성 시 `hyperframes-audio` 더킹(voiceover 그룹 + carve) 반드시 적용, `inline-highlight`
  약 3곳, 카드/리스트형 장면엔 네온 테두리 강조(`lt-neon-border` 카탈로그 버그로 설치 불가 —
  EP12 Frame 4/EP13 Frame 9의 CSS 직접 구현 방식 재사용).
- 이 소재는 "듣기(리스닝)"가 핵심이라 EP13의 입모양 B롤과는 다른 자산이 필요할 가능성이 높음
  (예: 연결되는 두 단어가 소리로 이어지는 걸 보여주는 시각화) — 대본·스토리보드 단계에서
  구체화할 것, 지금 단계에서 추측하지 않음.

## Customizations

- (해당 없음 — 캡처/특수 효과 없이 표준 자막·모션 구성. 대본 단계에서 필요 시 갱신)

## Notes

- **VIDEO_WORKFLOW.md 3단계 규칙 전부 적용 예정**: 중독 루프(Stakes→Big Question→Head Fake),
  씬별 종결어미 다양화, 왕초보 기준 한 문장 하나의 정보.
- **단편 방침에 따라 마지막 씬에 다음 편 소재를 구체적으로 예고하지 않는다.**
- 브랜드 페르소나(`knowledge/brand-persona.md`) 100% 준수 — 훈계조·자극적 낚시성 과장·어려운
  음성학 용어 금지.
- **진행 상태(2026-09-08)**: 목차→대본→`frame.md`/`STORYBOARD.md`→나레이션 12씬 생성→whisper
  실측 타임스탬프→**Frame 1~12 전부 제작 완료**(12개 프레임 첫 풀드래프트, 총 428.07초).
  **다음 단계**: 사용자 프리뷰 검수 → BGM/SFX/inline-highlight/네온보더 적용 → 렌더.
- **업로드 패키지 만들 때 잊지 말 것**: 엔딩 화면 연결 영상은 **EP13(알파벳 소리 지름길)**로
  설정할 것(production-rules.md "공개 일정과 엔딩 화면 연결 규칙" — 항상 직전 편, "다음 편"
  아님). EP13 업로드 체크리스트에 이 항목이 처음엔 빠져 있었던 걸 2026-09-08에 발견해서
  뒤늦게 추가한 전례가 있으니, EP14 체크리스트는 처음부터 넣을 것.
