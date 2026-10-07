# TASKS — ep23-double-consonant

## 2026-10-05 — 음성 자동 분할(1단계) 및 Whisper 단어 타임스탬프 추출(2단계) 완료

### 작업 배경
- 기획: `[30분 듣기] hello·class·happy, 같은 자음 두 개는 한 번만 소리 난다` (첫 30분 집중 반복 듣기 롱폼)
- 사용자 지시:
  - 영어 음성 단어/문장은 남성(`male_all.wav`), 여성(`female_all.wav`) 일괄 배치 음성 파일로 생성 후 무음 감지 분할
  - "2까지만 진행" (1단계 오디오 자동 분할/실측 + 2단계 Whisper 단어별 타임라인 추출까지 진행하고 일시정지)

### 1단계: 일괄 음성 자동 분할 및 실측 기록 (완료)
- 스크립트: `videos/ep23-double-consonant/scripts/split-batch-voice.mjs`
  - Node.js `execSync`의 ffmpeg silencedetect stderr 유실 문제 해결 (`spawnSync`로 교체)
- 분할 결과:
  - `male_all.wav` (30.00초) ➔ 19개 분할 완료 (단어 16개 + 문장 3개)
    - `en_coffee.wav`, `en_hoping.wav`, `en_different.wav`, `en_effort.wav`, `en_offer.wav`, `en_staff.wav`, `en_class.wav`, `en_glass.wav`, `en_dress.wav`, `en_lesson.wav`, `en_miss.wav`, `en_press.wav`, `en_happy.wav`, `en_apple.wav`, `en_happen.wav`, `en_supply.wav`, `en_s01_two_coffees.wav`, `en_s03_class_at_ten.wav`, `en_s05_want_coffee.wav`
  - `female_all.wav` (22.84초) ➔ 18개 분할 완료 (단어 14개 + 문장 4개)
    - `en_hopping.wav`, `en_office.wav`, `en_hello.wav`, `en_tall.wav`, `en_call.wav`, `en_all.wav`, `en_yellow.wav`, `en_really.wav`, `en_better.wav`, `en_butter.wav`, `en_letter.wav`, `en_little.wav`, `en_midday.wav`, `en_unnamed.wav`, `en_s02_hows_it_going.wav`, `en_s04_happy_birthday.wav`, `en_s06_office_close.wav`, `en_s07_coffee_after_class.wav`
  - 한국어 호스트 나레이션 12개 실측 완료 (`01.wav` ~ `12.wav`)
  - 총 49개 파일 실측 길이 `videos/ep23-double-consonant/.tts-results.json`에 완벽 저장됨.

### 2단계: Whisper 단어별 타임스탬프 추출 (완료)
- 스크립트: `videos/ep23-double-consonant/scripts/word-timeline.mjs`
  - Whisper `small` 모델(`.whisper/ggml-small.bin`) 기반 전사 및 RMS Onset/Offset 칼리브레이션, Character LCS 정렬
- 추출 대상 및 결과: 총 19개 타임라인 파일 (`assets/voice/*.words.json`) 생성 완료
  - 한국어 호스트 나레이션 12개 전 프레임:
    - `01_f01_hook.words.json` ~ `12_f12_intro_encore.words.json`
  - 영어 실전 예문 7개 문장:
    - `en_s01_two_coffees.words.json` ~ `en_s07_coffee_after_class.words.json`
- 품질 검증: 단어 시작/끝 시각 및 텍스트 100% 매칭 확인 완료.

### 2.5단계: 시각적 디자인 스타일 선택(Phase 9) 및 프롬프트 시스템(Phase 10) 구축 (완료)
- 기준 지침: `public/ALI_AI_VAULT_VOX-STYLE_ANIMATION_MASTER_PROMPT.ko.md`
- 스킬 업데이트: `.claude/skills/episode-planning/SKILL.md`에 **Phase 9(시각적 디자인 스타일 선택)** 및 **Phase 10(영상 삽입용 일러스트 및 영상 프롬프트 시스템)** 정식 신설, **HyperFrames 구현 가능 여부 필터링 골든 룰** 추가, `knowledge/VIDEO_WORKFLOW.md` 6단계(미디어 준비)에 반영 완료.
- 프롬프트 생성 및 저장: `videos/ep23-double-consonant/prompts/visual-prompts.md`
  - 사용자 선택: **[옵션 1] 웜크림 네오브루탈리즘 (채널 시그니처 표준)**
  - **골든 룰 적용**: HyperFrames 코드로 100% 구현 가능한 텍스트 카드/알약 뱃지/다이어그램/치트시트는 프롬프트 생성 배제하고 코딩 직행.
  - HTML/CSS 구현 불가 핵심 자산 2종만 엄선하여 프롬프트 완성:
    1. **Asset 1 (F02)**: 인체 해부학적 구강 조음 단면도 이미지 프롬프트
    2. **Asset 2 (F09)**: 아늑한 뉴욕 에스프레소 바 카운터 & 커피잔 이미지 및 5초 스톱모션 비디오 프롬프트
  - Flow / Midjourney 일괄 생성용 순수 텍스트 묶음 제공

### 2.6단계: 사용자 생성 미디어 자산 반입 및 검증 (완료)
- 다운로드 폴더에서 프로젝트 폴더로 반입 완료:
  - `assets/images/f02_vocal_tract.jpg`: F02 구강 조음 기관 단면도 (2752x1536, 192KB, 웜크림 네오브루탈리즘 스타일)
  - `assets/videos/f09_cafe_scene.mp4`: F09 카페 에스프레소 바 카운터 & 커피잔 모션 영상 (1920x1080, 24fps, 8.0s, 1.66MB)
- 임시 프리뷰 파일 정리 완료.

### 3단계: HyperFrames 컴포지션 스캐폴딩 및 12개 프레임 구현 (완료)
- 스캐폴딩 파일: `package.json`, `hyperframes.json`, `meta.json`, `frame.md`, `STORYBOARD.md`, `index.html`
- 디자인 시스템: [옵션 1] 웜크림 네오브루탈리즘 (`#F4EFE6`, 2.5px 블랙 보더, 4px 하드 오프셋 그림자, `#F59E0B` 골드, `#EF4444` 크림슨)
- 12개 프레임 컴포지션 (`compositions/frames/01-hook.html` ~ `12-encore.html`) 전체 구현:
  - F01: 훅 (23.04s) — COFFEE 네오 카드 + 골드 알약 뱃지 (불필요한 영어 중복 음성 제거)
  - F02: 핵심 원리 (49.97s) — `f02_vocal_tract.jpg` 구강 조음 단면도 + hoping vs hopping 모음 대조 (음절 표기 `ho · ping` vs `hop · ping`, 3회 반복)
  - F03~F06: 4대 자음(ff, ll, ss, pp) 단어 23개 3회 반복 듣기 + 실전 문장 3회 반복 (3개 골드 점 ●●● 점등, `cof · fee` 음절 분리 + 겹자음 빨간 밑줄 하이라이트, 통합 뱃지 `[커 · 피] · 커피`)
  - F07: 예외 ① 단어 경계 (47.29s) — un · named, mid · day 단어 경계 결합 3회 반복
  - F08: 예외 ② 모음 사이 tt (58.77s) — let · ter, but · ter, bet · ter, lit · tle 부드러운 'ㄹ' (Flap T) 3회 반복
  - F09: 카페 실전 대화 7문장 (99.23s) — `f09_cafe_scene.mp4` 워터마크 크롭 배경 비디오 + 2인 대화 3회 반복 + 겹자음 하이라이트
  - F10: 무작위 셔플 섞어 듣기 (220.30s) — 29개 단어 덱 셔플 모션 (음절 분리 및 통합 뱃지 반영)
  - F11: 오늘 규칙 1장 정리 (24.20s) — 4분할 치트시트 보드 + 댓글 질문 박스 (전체 구간 상시 표시)
  - F12: 처음부터 앵콜 총복습 (224.26s) — 29개 단어 앵콜 복습 후, **마지막 10.0초(214.26s~224.26s) 유튜브 전용 엔드스크린 캔버스** 구현 (좌상단 안전 워드마크, 완주 축하 배너, 16:9 추천 영상/재생목록 가이드 박스 2개, 하단 구독/좋아요 알약 뱃지)
- 타임라인 실측 총 러닝타임: **1084.80초 (18분 05초, 시청자 집중도 유지 및 유튜브 최종 화면 10초 완벽 대응)**

### 4단계: HyperFrames 자동 검수 (100% 무결점 통과)
- 실행 명령어: `npx hyperframes check`
- 검수 결과:
  - Lint: 0 errors, 0 warnings
  - Runtime: 0 errors, 0 warnings
  - Layout: 0 issues across 9 sample(s)
  - Motion: 0 errors, 0 warnings
  - Contrast: 39/39 text checks pass WCAG AA
  - Check passed 완료

### 5단계: 고화질 영상 렌더링 (진행 중)
- 실행 명령어: `npx hyperframes render .` (태스크 ID: `task-1545`)
- 작업 디렉토리: `videos/ep23-double-consonant`
- 실측 러닝타임: 1084.80초 (18분 05초)
- 12개 프레임 + 10초 전용 엔드스크린 렌더링 처리 중.

### 6단계: 썸네일 기획 및 업로드 패키지 빌드 (준비 완료)
- 썸네일 기획안 5종 (심리 공식 배분, 5단어 이하 엄격 준수, 제목 복사 금지)
- 12개 챕터 타임스탬프 산출 완료 (`.calculated-timeline.json` 기준)
- 유튜브 메타데이터(제목 5안, 설명란, 태그, 고정 댓글) 패키지 준비 완료.

### 현재 상태
- 백그라운드 렌더링 진행 중 (`task-1545`).
- 사용자 썸네일/제목 시안 선택 대기.

