---
workflow: general-video
flow: automation
storyboard: yes
message: "-sion으로 끝나는 긴 영단어는 앞에서부터 파닉스로 하나씩 읽는 게 아니라, 끝소리(-sion = 션/전) 원리 하나만 알면 그 순간 수십 개 단어가 한꺼번에 읽힌다"
destination: youtube-longform
aspect: 1920x1080
language: ko
audience: "비슷하게 생긴 긴 영어 단어만 보면 읽기가 두려워 말문이 막히는 왕초보 리딩 입문자"
length: 미확정 (대본 작성 전)
angle: narrative
---

## Intent

단편 EP15(EP11 GOING TO→GONNA, EP12 Want vs Won't, EP13 알파벳 소리 지름길, EP14 연음/linking에
이은 다음 편). 지금까지 EP13·EP14가 "발음"·"듣기"를 다뤘다면 EP15는 **읽기(리딩)** 로 축을 옮긴다 —
비슷하게 생긴 긴 영단어(DECISION, TELEVISION, EXPANSION…)만 보면 지레 겁먹고 읽기를 포기하는
왕초보에게, 끝소리 하나(-sion)만 알면 그 규칙이 붙는 수십 개 단어가 동시에 읽힌다는 "1초 확장"
카타르시스를 준다.

**주의 — season1 EP07과 소재가 겹친다.** 이 채널의 초기 Remotion 시즌(`CLAUDE.md` "시즌 상태" 참고)
EP07이 이미 "-SION"을 다뤘지만, 그건 **강세(stress) 위치** 중심이었다. 이번 EP15는 강세가 아니라
**"끝소리 하나가 단어 전체를 읽게 해준다"는 리딩(읽기 자신감) 각도**로, 접근 자체가 다르다 —
대본 목차 단계에서 이 차이를 시청자에게도 체감되게(과거 시즌 언급 없이) 명확히 분리할 것.

**데이터 근거** (`data/youtube/idea-board-history.json`, 2026-09-10 선택):
- `content-opportunity.json`의 `byRule` 중 `-SION`이 **fitScore 45.39로 채널 보유 규칙 전체 1위**,
  `avgRetention 51.03`(`avgRetentionRatio` 0.908) — 이미 검증된 채널 내 최고 유지율 포맷이다
  (표본은 2건뿐이라 과신은 금물, 그래도 방향성 근거로는 충분).
- `audience-dna.json`에 "언어팩"·"체득" 어휘가 실제 아웃라이어 댓글(엄마의 브랜딩 채널, 각 2회
  등장)에서 확인됨 — 썸네일 뱃지 "1초 확장 언어팩" 문구의 근거.
- **⚠️ 확인 필요**: `audience`에 적은 "긴 단어를 보면 두려워 말문이 막힌다"는 구체적 공포 상황은
  `audience-dna.json`의 실제 `painPoint` 항목에서 직접 나온 문장이 아니라, A/B 시뮬레이터의 AI가
  위 두 데이터를 조합해 추론한 프레이밍이다. 대본 목차 작성 시 이 장면이 실제 왕초보 학습자가
  겪는 현실적인 순간인지(예: 단어장 넘기다가, 뉴스 자막 읽다가 등) 웹 검색·상식으로 한 번 더
  검증할 것(`VIDEO_WORKFLOW.md` 3단계 규칙, "구체적 예시 상황은 audience가 실제로 겪는 상황인지
  확인").

**HyperFrames 롱폼 카드 템플릿은 새로 설계하지 않는다** — EP11~14와 동일한 프레임 preset 시스템
재사용.

## 확정된 제목·썸네일 (대본보다 먼저 확정 — `VIDEO_WORKFLOW.md` 2단계 규칙)

대시보드 A/B 시뮬레이터에서 3개 시안(A/B/C) 생성 후 Gemini AI CTR 진단으로 비교:

| 시안 | 등급 | 예상 CTR | 한 줄 평 |
|---|---|---|---|
| **A (채택)** | A | 8.8% ~ 11.5% | 손에 쥔 '-sion' 소품 + 강한 아이컨택, 좌우 2분할 밸런스 우수 |
| B | B+ | 7.2% ~ 9.0% | 배경 네온 그래픽이 텍스트와 겹쳐 시각 노이즈 유발 |
| C | B | 5.8% ~ 7.5% | 상단 텍스트가 전체를 가로질러 답답, 인물이 하단에 눌림 |

AI 리포트가 A안에 지적한 유일한 약점: "좌측 카피가 4줄로 다소 길어 모바일 피드 축소본에서 순간
인지 속도가 약간 저하될 수 있음" — 재작업 여부는 확정하지 않고, 실제 업로드 전 모바일 축소
미리보기로 재확인한다(강제 조건 아님).

- **제목(시안 A)**: 끝소리 '-sion' 하나만 제대로 알면 영단어 100개가 저절로 읽힙니다
- **썸네일 카피**: 평생 써먹는 소리 연결 공식
- **포인트 뱃지**: 📐 1초 확장 언어팩
- **썸네일 파일 저장 위치**: `videos/ep15-sion-words/thumbnail-a.jpg`(채택본)·`thumbnail-b.jpg`·
  `thumbnail-c.jpg`(3종 전부 보존, EP13·EP14와 동일 관례). `data/youtube/ab-simulator-state.json`의
  `imageUrl` 3개 모두 `/api/video-project-asset/ep15-sion-words/...` 라우트로 갱신 완료(2026-09-10) —
  임시 폴더(`output/temp-thumbnails/`, gitignore 대상)만 가리키면 다른 PC에서 안 보이는 문제를
  EP13에서 겪었던 전례를 반복하지 않기 위함.
- Head Fake·요약 대사는 위 문구와 표현을 동일하게 맞춘다(`VIDEO_WORKFLOW.md` 3단계 규칙, 대본
  작성 시 적용).

## Assets

- 나레이션은 신규 생성 필요 — EP11~14와 동일하게 **남성 음성**(`scripts/tts-config.mjs`의 `VOICE`,
  Gemini Charon) 사용.
- **EP12에서 검증되어 기본 적용 항목**(`CLAUDE.md`/`AGENTS.md` 공통 규칙): 나레이션·BGM 실제 합성
  시 `hyperframes-audio` 더킹(voiceover 그룹 + carve) 반드시 적용, `inline-highlight` 약 3곳,
  카드/리스트형 장면엔 네온 테두리 강조(`lt-neon-border` 카탈로그 버그로 설치 불가 — CSS 직접
  구현 방식 재사용).
- 이 소재는 "-sion 규칙 하나로 여러 단어를 한꺼번에 읽는다"는 **패턴 확장**이 핵심이라, 단어를
  여러 개 나열해서 보여주는 리스트/카드형 장면 비중이 다른 편보다 높을 가능성이 큼(EP12 Frame 4
  네온 테두리 카드 방식이 특히 잘 맞을 수 있음) — 구체적 장면 구성은 대본 목차 단계에서 확정,
  지금 단계에서 추측하지 않음.
- **웹 검색 검증 완료(2026-09-10)** — `-sion` 발음 규칙은 "앞 글자가 모음 또는 R이면 전,
  그 밖의 자음이면 션"이고, S가 두 번 겹치는 -SSION은 앞 글자 무관 항상 션(Rachel's English·
  Learn English Sounds·Wiktionary 대조). 초안엔 R을 "예외"로 잘못 분류했던 걸 정정함 — 상세는
  `SCRIPT.md` 상단 "정정 사항" 참고.

## Customizations

- (해당 없음 — 캡처/특수 효과 없이 표준 자막·모션 구성. 대본 단계에서 필요 시 갱신)

## Notes

- **VIDEO_WORKFLOW.md 3단계 규칙 전부 적용 예정**: 중독 루프(Stakes→Big Question→Head Fake),
  씬별 종결어미 다양화, 왕초보 기준 한 문장 하나의 정보.
- **단편 방침에 따라 마지막 씬에 다음 편 소재를 구체적으로 예고하지 않는다.**
- 브랜드 페르소나(`knowledge/brand-persona.md`) 100% 준수 — 훈계조·자극적 낚시성 과장·어려운
  음성학 용어 금지.
- **진행 상태(2026-09-10)**: 아이디어 보드에서 소재 선정 → A/B 시뮬레이터로 썸네일 3안 생성 →
  Gemini AI CTR 진단 → 시안 A 확정 → 프로젝트 폴더·`BRIEF.md` 생성 → 목차 제시(구두 승인) →
  `SCRIPT.md` 12씬 전체 대본 작성 → 파일 코멘트 다수 라운드 반영(발음 규칙 웹 검색 정정 포함,
  Frame 1 호기심·이득 체크리스트 규칙 신설, Frame 11 신규 단어 3연타 확장 등) → **`frame.md`·
  `STORYBOARD.md` 작성 완료**(EP11~14 디자인 토큰 재사용 + 이 편 신규 컴포넌트 `sion-card`/
  `sound-tag`/`sion-cluster`/`syllable-buildup`) → **HyperFrames 프로젝트 스캐폴딩, TTS 나레이션
  12개 전부 생성, whisper 실측 타임스탬프 추출 완료** → Frame 8·11 "정답 누설" 버그 발견·수정·
  재생성(₩442) → 정답 공개 문장의 영어 단어 중복 발화도 지적받아 처음엔 `scripts/trim-word.mjs`로
  오디오만 트림했으나, 들어보니 어색해서 최종적으로 재생성(₩61 추가, `TASKS.md` 참고). **실측
  총 길이 401.21초** → **12프레임 HTML 컴포지션 전체 제작 완료**(`hyperframes check` 0 errors,
  스냅샷 검증 완료, `TASKS.md` 참고). **다음 단계**: 사용자 프리뷰 검수 → BGM 더킹(carve.mjs)·
  inline-highlight 적용 → 최종 렌더.
- **업로드 패키지 만들 때 잊지 말 것**: 엔딩 화면 연결 영상은 **EP14(연음/linking sounds)**로
  설정할 것(production-rules.md "공개 일정과 엔딩 화면 연결 규칙" — 항상 직전 편). 업로드
  체크리스트에는 처음부터 이 항목을 넣는다(EP13에서 누락됐다가 뒤늦게 추가한 전례 있음).
