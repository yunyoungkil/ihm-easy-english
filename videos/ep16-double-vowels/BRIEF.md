---
workflow: general-video
flow: automation
storyboard: yes
message: "영어 단어에 모음이 두 개 나란히 나오면 뒤 모음은 침묵하고 앞 모음 이름만 소리 낸다는 규칙 하나로 Boat, Rain, Meat 같은 단어들을 무작정 외우지 않고 한꺼번에 읽을 수 있다"
destination: youtube-longform
aspect: 1920x1080
language: ko
audience: "단어에 모음이 두 개 이상 연속으로 나오면 어떻게 소리 내야 할지 막막한 알파벳 파닉스 직후 입문자"
length: 미확정 (대본 작성 전)
angle: narrative
---

## Intent

단편 EP16(EP11 GOING TO→GONNA, EP12 Want vs Won't, EP13 알파벳 소리 지름길, EP14 연음/linking,
EP15 -sion 리딩에 이은 다음 편). EP15가 "긴 단어의 끝소리 하나로 통째로 읽는다"는 각도였다면
EP16은 **모음 2개가 나란히 붙을 때 어느 쪽을 읽고 어느 쪽을 버릴지** — 파닉스를 막 뗀 입문자가
Boat, Rain, Meat 같은 흔한 단어 앞에서 처음 부딪히는 바로 그 지점을 다룬다.

**데이터 근거** (`data/youtube/idea-board-history.json`, 2026-09-13 선택, rank 2 / score 88):
- `marketDemand`: 집중 키워드 "영어 발음 규칙"(marketDemandScore 88.1)의 반복 훅 단어 "모음",
  "읽는", "쉽다고"와 직접 맞물림. 아웃라이어 "영어 읽는법 1편 - 자음과 모음"(50.42배)도 같은
  수요를 뒷받침.
- `contentOpportunity`: 기존 레거시 단일 모음(A/E/I/O/U) 시리즈의 후속 확장, LEGACY 포맷
  (fitScore 57) 적용.
- `audienceDna`: 시청자 언어 "언어팩" 구축·"체득" 니즈 반영.

**⚠️ 대본 작성 시 웹 검색으로 재검증 필요** — "모음 2개가 나란히 오면 앞 모음만 소리 나고 뒤
모음은 침묵한다"는 규칙은 영어권에서 "When two vowels go walking, the first one does the
talking"으로 잘 알려진 파닉스 휴리스틱이지만, 완전한 규칙이 아니라 예외가 상당히 많다
(예: each/said/build 등, OI/OY·OU/OW 같은 이중모음은 이 패턴을 따르지 않음). `VIDEO_WORKFLOW.md`
3단계 규칙에 따라 SCRIPT.md 작성 시 (1) 이 규칙이 실제로 잘 통하는 대표 단어들만 예시로 쓰고
(Boat/Rain/Meat류), (2) "모든 경우에 100% 통한다"처럼 과장하지 않고 "이런 흔한 패턴에서는"
정도로 정직하게 스코프를 좁히며, (3) 진짜 예외(이중모음 등)를 다룰지는 이 영상 범위 밖으로
명확히 뺄지 결정할 것 — EP15가 -sion 규칙의 진짜 예외(SSION)를 웹 검색으로 확인하고 정확히
반영했던 것과 동일한 기준 적용.

**HyperFrames 롱폼 카드 템플릿은 새로 설계하지 않는다** — EP11~15와 동일한 프레임 preset 시스템
재사용.

## 확정된 제목·썸네일 (대본보다 먼저 확정 — `VIDEO_WORKFLOW.md` 2단계 규칙)

대시보드 A/B 시뮬레이터에서 3개 시안(A/B/C) 생성 후 Gemini AI CTR 진단으로 비교(2026-09-15,
사용자가 직접 생성·진단):

| 시안 | 등급 | 예상 CTR | 한 줄 평 |
|---|---|---|---|
| **A (채택)** | A | 8.8% ~ 11.5% | 1인칭 동반자 톤 훅 + 3단어 압축 헤드라인이 정답 누설 없이 강한 인지부조화를 일으킴 |
| B | B+ | 6.8% ~ 8.4% | 타겟 저격은 좋으나 "단번에 읽힘" 카피가 경쟁 채널에 흔해 호기심 강도가 약함 |
| C | B | 6.2% ~ 7.9% | "1초 해결" 즉각 효능감은 있으나 curiosityGap이 A보다 낮음 |

- **제목(시안 A)**: 여태 두 글자 다 읽었네요... 모음 2개 겹친 단어 소리 원리 | 파닉스 기초
- **썸네일 헤드라인**: 모음 두 개, 여태 헛고생
- **⚠️ 썸네일 이미지 미생성**: `ab-simulator-state.json`의 세 시안 모두 `imageUrl`이 비어있음 —
  사용자가 "시간 날 때" 직접 생성하기로 함(2026-09-15). 대본·프레임 제작은 이미지 없이도 진행
  가능하나, 업로드 패키지 작성 전에는 반드시 이미지 3종을 생성해 `thumbnail-a/b/c.jpg`로
  저장할 것(EP13~15와 동일 관례).
- Head Fake·요약 대사는 위 문구와 표현을 동일하게 맞춘다(`VIDEO_WORKFLOW.md` 3단계 규칙, 대본
  작성 시 적용).

## Assets

- 나레이션은 신규 생성 필요 — EP11~15와 동일하게 **남성 음성**(`scripts/tts-config.mjs`의 `VOICE`,
  Gemini Charon) 사용.
- **EP12에서 검증되어 기본 적용 항목**(`CLAUDE.md`/`AGENTS.md` 공통 규칙): 나레이션·BGM 실제 합성
  시 `hyperframes-audio` 더킹(voiceover 그룹 + carve) 반드시 적용(EP15에서 확정된 "루트에 BGM
  1개 + 임시 그룹핑으로 carve 1회 실행" 방식 그대로 재사용, 프레임별 개별 carve 금지),
  `inline-highlight` 약 3곳, 카드/리스트형 장면엔 네온 테두리 강조(`lt-neon-border` 카탈로그
  버그로 설치 불가 — CSS 직접 구현 방식 재사용).
- 이 소재는 "규칙 하나로 여러 단어를 한꺼번에 읽는다"는 **패턴 확장**이 핵심이라, 대표 단어
  (Boat/Rain/Meat 등)를 여러 개 나열하는 리스트/카드형 장면 비중이 높을 가능성이 큼(EP15의
  `sion-card`/`sion-cluster` 컴포넌트를 이 소재에 맞게 재사용하거나 변형할 수 있음) — 구체적
  장면 구성은 대본 목차 단계에서 확정.

## Customizations

- (해당 없음 — 캡처/특수 효과 없이 표준 자막·모션 구성. 대본 단계에서 필요 시 갱신)

## Notes

- **VIDEO_WORKFLOW.md 3단계 규칙 전부 적용 예정**: 중독 루프(Stakes→Big Question→Head Fake),
  씬별 종결어미 다양화, 왕초보 기준 한 문장 하나의 정보.
- **단편 방침에 따라 마지막 씬에 다음 편 소재를 구체적으로 예고하지 않는다.**
- 브랜드 페르소나(`knowledge/brand-persona.md`) 100% 준수 — 훈계조·자극적 낚시성 과장·어려운
  음성학 용어 금지, **title/나레이션은 전문가 톤이 아니라 동반자 톤을 기본값으로**(2026-09-14
  확정 규칙, EP15까지는 소급 적용 안 됐으나 EP16부터는 처음부터 적용).
- **엔딩 화면 연결 영상은 EP15(-sion 리딩)로 설정할 것**(`production-rules.md` "공개 일정과
  엔딩 화면 연결 규칙" — 항상 직전 편). 업로드 체크리스트에는 처음부터 이 항목을 넣는다.
- **진행 상태(2026-09-15)**: 아이디어 보드에서 소재 선정(2026-09-13) → A/B 시뮬레이터로 썸네일
  3안 생성·Gemini AI CTR 진단(사용자 직접 진행) → 시안 A 확정 → 프로젝트 폴더·`BRIEF.md` 생성 →
  12프레임 목차 제시(구두 승인) → **`SCRIPT.md` 12프레임 전체 작성 완료**(씬 단위로 하나씩
  검수·승인, 다수 코멘트 반영 — Frame 7 예외 규칙 웹 검색 재검증 포함) → **`frame.md`·
  `STORYBOARD.md` 작성 완료**(EP11~15 채널 공통 토큰 재사용 + 이 편 신규 컴포넌트
  `vowel-pair-card`/`vowel-pair-cluster`/`hesitation-cursor`/`question-flicker`/
  `lazy-tongue-reveal`). **다음 단계**: 사용자가 SCRIPT.md·STORYBOARD.md 재검토 → TTS 나레이션
  생성(남성 음성, Gemini Charon) → whisper 실측 타임스탬프 추출 → 12프레임 HTML 컴포지션 제작.
