# TASKS — ep27-s-ending

## 2026-10-09 — EP27 제작 및 렌더링 완료, 업로드 패키지 빌드 완료 (30분 집중 듣기 드릴형 롱폼, -S · -ES 끝소리 3가지 물리법칙)

- **소재 선정 및 유형 확정 (Phase 1~3)**:
  - 사용자 명시적 지시("1번 후보로 제작")에 따라 `-S · -ES 끝소리 3가지 물리법칙 ([s] vs [z] vs [ɪz])`로 확정.
  - EP22(-ED)의 [t]/[d]/[ɪd]와 완벽한 대칭을 이루는 자매 소재로, 한국인 90%가 '스'로 잘못 발음하는 습관 교정.
  - 포맷: 30분 집중 반복 듣기 드릴형 롱폼 (웜크림 네오브루탈리즘).
- **제목 및 썸네일 확정 및 생성 (Phase 4)**:
  - 메인 채택: C안 (`[30분 듣기] 영어 -S 끝소리 3가지 물리법칙, 이것만 알면 귀가 뚫립니다 | 기초 파닉스`)
  - 썸네일 알약 카피: `3가지 소리였습니다` (손가락 3개 펼치는 자신감 미소)
  - Imagen 3 생성 완료: `.thumbnails/`에 4종 에셋 완비 (Zero Watermark Rule 100% 검증 통과)
    - `thumbnail.jpg` (메인 C안 와이드)
    - `thumbnail-close-up.jpg` (모바일 전용 클로즈업)
    - `thumbnail-variant-a.jpg` (A안: "다 '스'로 읽으셨죠?")
    - `thumbnail-variant-b.jpg` (B안: "80%가 '즈' 소리입니다")
- **음성 에셋 반입 및 분할 완비 (Phase 6~8)**:
  - 사용자 다운로드 6개 파일(`01_f01_hook.wav`, `02_f02_principle.wav`, `03_f09_summary.wav`, `male_words_all.wav`, `female_words_all.wav`, `en_dialogue_all.wav`) 반입 완료.
  - 자동 분할 실행: 남성 24단어 + 여성 24단어 + 실전 대화 7문장 = 총 58개 오디오 에셋 완비.
  - Whisper word-level 타임스탬프 추출 (`scripts/word-timeline.mjs`) 100% 완료: 한국어 3개 + 대화 7문장 `.words.json` 생성.
- **컴포지션 구현 및 무결점 검수 통과 (Phase 9)**:
  - `scripts/generate-frames.mjs` 실행으로 10개 프레임 HTML 및 `index.html` 생성 완료.
  - 전체 영상 길이: **499.62초 (8분 19.6초)**, 엔드스크린 10초 유지.
  - 사용자 피드백 규칙 전면 준수:
    1. 어간 뉴트럴(#111111) + 타겟 접미사(-s, -es) 사운드별 컬러/밑줄 분리.
    2. UI 텍스트 자동 줄바꿈 절대 방지 (`white-space: nowrap;` 및 `flex-shrink: 0;`).
    3. 사족 메타 라벨("남·여 교차 6회 반복" 등) 제거, 그래픽 점 6개 인디케이터만 노출.
    4. 2음절 이상 단어 가운뎃점(`·`) 음절 분리 표기.
  - `npx hyperframes check videos/ep27-s-ending` 검증 결과:
    - Lint: 0 errors, 0 warnings
    - Runtime: 0 errors, 0 warnings
    - Layout: 0 issues across 9 samples
    - Motion: 0 errors, 0 warnings
    - Contrast: 50/50 text checks pass WCAG AA (100% 무결점)
- **영상 렌더링 완료 (Phase 9 Approval Gate 통과)**:
  - 사용자 명시적 렌더링 승인("렌더") 확인 후 `npx hyperframes render videos/ep27-s-ending` 실행.
  - 렌더링 결과: `renders/ep27-s-ending_2026-10-09_21-40-16.mp4` (23.1MB, 14,989 프레임, 499.62초 / 8분 19.6초, 무결점 완료).
- **업로드 패키지 빌드 완료 (Phase 10)**:
  - 저장 위치: `output/upload-packages/ep27-s-ending/`
  - 패키지 산출물:
    - 비디오: `English_Pronunciation_S_Ending_3_Rules_Listening_Drill.mp4` (23.1MB)
    - 썸네일 4종: `thumbnail-close-up.jpg` (모바일 1위), `thumbnail.jpg`, `thumbnail-variant-a.jpg`, `thumbnail-variant-b.jpg`
    - 메타데이터: `title.txt`, `title-variants.txt`, `description.txt`, `pinned-comment.txt`, `tags.txt`, `timeline.txt`, `upload-checklist.txt`, `status.json` (`ready_to_upload`)
    - 원클릭 복사 HTML 대시보드: `output/upload-packages/ep27-s-ending/index.html`
