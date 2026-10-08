# TASKS — ep24-long-short-i

## 2026-10-07 — 프로젝트 기획 마스터 워크플로우 (Phase 1 ~ Phase 10) 완료

### 작업 배경
- 기획: `[30분 듣기] Sheep과 Ship, 둘 다 똑같이 '쉽'으로 발음하셨나요?` (장모음 [iː] vs 단모음 [ɪ] 짝단어 20쌍 반복 듣기 롱폼)
- 포맷: 듣기형 롱폼 (Listening Drill) · 약 20~25분
- 비주얼 스타일: [옵션 1] 웜크림 네오브루탈리즘 (채널 시그니처 표준)

### 1단계: 기획 마스터 워크플로우 (완료)
- **Phase 1 (라이브 데이터 분석)**: 채널 현황(최근 90일 26,044회, 검색 유입 2.47%) 및 시청자 페인포인트 교차 검증 완료.
- **Phase 2 (콘텐츠 유형)**: 듣기형 롱폼 (20~25분) 확정.
- **Phase 3 (경쟁 채널 스캔)**: 영미권 듣기 채널(Speak English With Class, learn english online 등 6~16배 아웃라이어) 분석 및 "원리 1문장 + 3회 반복 듣기 + 셔플" 독점 틈새 발굴.
- **Phase 4 (소재 선정)**: 장모음 [iː] vs 단모음 [ɪ] 20쌍(총 40단어) Minimal Pairs 확정.
- **Phase 5 (분량/포맷)**: 10프레임 구조 확정.
- **Phase 6 (제목 & 썸네일)**: A안 확정 + Test & Compare용 프롬프트 4종 작성 완료 (`prompts/thumbnail-prompts.md`).
- **Phase 7 (목차 아웃라인)**: 4개 그룹별 20쌍 + 7개 문장 대화 + 셔플 + 1장 요약 + 앵콜 구조 확정.
- **Phase 8 (나레이션 스크립트)**: 일상 구어체 대본 완성 (`SCRIPT.md`) 및 **[규칙 11] 작위적 번역투·신체 비유 배제 및 일상 구어체 적용 원칙 전역 영구 등록 완료**.
- **Phase 9 (시각 디자인 스타일)**: [옵션 1] 웜크림 네오브루탈리즘 확정.
- **Phase 10 (시각 자산 프롬프트)**: 핵심 자산 2종(조음 단면도 이미지, 카페 앰비언스 루프 비디오) 프롬프트 작성 완료 (`prompts/visual-prompts.md`).

---

### 2단계: 기술적 제작 워크플로우 (진행 중)
- **[완료] 핵심 시각 미디어 자산 반입**:
  - `assets/images/f02_vocal_tract_comparison.jpg` (구강 조음 단면도 이미지)
  - `assets/videos/f07_coffee_ambience.mp4` (카페 창가 앰비언스 비디오)
- **[완료] 음성 자산 반입 & 배치 분할 (`split-batch-voice.mjs`)**:
  - 한국어 호스트 나레이션 3개 반입 (`01_f01_hook.wav`, `02_f02_principle.wav`, `03_f09_summary.wav`)
  - 남성/여성 40개 짝단어 및 7개 대화 문장 배치 파일 자동 분할: **[규칙] 250ms 여운 패딩 + 50ms 페이드아웃** 완벽 적용하여 뚝뚝 끊기는 현상 원천 차단. 총 87개 단어/문장 개별 WAV 추출 완료.
- **[완료] 전체 93개 오디오 길이 실측 (`measure-all-voice.mjs`)**:
  - `.tts-results.json`에 전체 오디오 파일 길이 영구 기록 완료.
- **[완료] Whisper 단어별 타임스탬프 정렬 (`word-timeline.mjs`)**:
  - 한국어 3개 씬 + 영어 7개 문장 전체 Whisper `small` 모델 기반 단어 타임스탬프(`*.words.json`) 추출 100% 완료.

- **[완료] HyperFrames 10개 프레임 컴포지션 구현 & 마스터 타임라인 조립 (`generate-frames.mjs`)**:
  - `compositions/frames/01-hook.html` ~ `10-encore.html` 10개 프레임 전체 구현 완료.
  - 웜크림 네오브루탈리즘 스타일 적용: [iː] 초록 Tense vs [ɪ] 골드 Lax 테마 대조, ●●● 3회 점등 애니메이션, 구강 단면도 이미지(F02), 카페 루프 비디오(F07), 40단어 무작위 셔플(F08), 1장 요약 치트시트(F09), 20쌍 앵콜 및 10초 엔드스크린 안전영역(F10).
  - 총 러닝타임: **569.32초 (9분 29.3초)** (F08 셔플 퀴즈: 소리 후 1.8초 생각 시간 + 2.4초 정답 체화 시간으로 여유 있게 확장).
- **[완료] HyperFrames 자동 검수 (`npx hyperframes check`) 100% 무결점 통과**:
  - Lint: 0 errors, Runtime: 0 errors, Layout: 0 issues, Motion: 0 errors, Contrast: 44/44 text checks pass WCAG AA.
  - 최종 검수 통과 (`Check passed`).

---

- **[완료] 썸네일 4종 생성 및 업로드 패키지 배치**:
  - `prompts/thumbnail-prompts.md` 기반 4종 썸네일 이미지 생성 완료:
    - Variant A (메인 채택 바스트샷 와이드): `thumbnail.jpg` (537KB)
    - Variant A Close-Up (모바일 피드 1위 전용 클로즈업): `thumbnail-close-up.jpg` (524KB)
    - Variant B (손실회피/경고형 대조군): `thumbnail-b.jpg` (545KB)
    - Variant C (원리/성취형 대조군): `thumbnail-c.jpg` (493KB)
  - `output/upload-packages/ep24-long-short-i/` 및 `videos/ep24-long-short-i/assets/thumbnails/`에 양방향 동기화 완료.
  - 업로드 패키지 원클릭 HTML 대시보드(`index.html`)에 4종 썸네일 그리드 뷰 및 개별 다운로드 버튼 구축 완료.

- **[완료] 고화질 영상 렌더링 (`npx hyperframes render .`)**:
  - 사용자 명시적 승인 게이트 통과 후 렌더링 착수 (`task-2378`).
  - 총 17,080 프레임 (569.32초 / 9분 29.3초) 17분 56초 만에 100% 무결점 렌더 완주.
  - 출력: `videos/ep24-long-short-i/renders/ep24-long-short-i_2026-10-08_20-13-06.mp4` (43.8MB, Full HD 1920x1080 30fps h264/aac).

- **[완료] 업로드 패키지 최종 배치 (SEO 검색 키워드 파일명 규칙 적용)**:
  - 전역 규칙에 따라 최종 영상 파일명을 `English_Pronunciation_Sheep_vs_Ship_Minimal_Pairs_Listening_Drill.mp4`로 `output/upload-packages/ep24-long-short-i/`에 복사 배치.
  - 썸네일 4종(`thumbnail.jpg`, `thumbnail-close-up.jpg`, `thumbnail-b.jpg`, `thumbnail-c.jpg`) 및 원클릭 대시보드(`index.html`), `status.json` 시드 완료.
  - EP24 전체 제작 워크플로우 100% 완료.
