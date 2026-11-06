# TASKS — ep29-b-vs-v

## 2026-10-10 — EP29 기획, 스크립트 아키텍처 및 프롬프트 시스템 완료 (B vs V 24쌍 반복 듣기)

- **소재 선정 및 유형 확정 (Phase 1~5)**:
  - 라이브 데이터 분석(API sync 완료, 90일 53,071회) 및 경쟁 채널 6곳 실시간 스캔 완료.
  - 주제: B vs V 자음 짝단어 듣기 드릴 (EP28 F vs P에 이은 성인 학습자 영구 미해결 페인포인트 1위).
  - 포맷: 8~10분 롱폼 집중 드릴 (10개 프레임).
  - 사전 예측: `videos/ep29-b-vs-v/REVIEW.md` 기록 완료.
- **제목 및 썸네일 확정 (Phase 6)**:
  - 메인 채택: A안 (상식파괴형)
    - 유튜브 제목: `[반복 듣기] Best와 Vest를 똑같이 읽으면 미국인이 못 알아듣는 이유 | B vs V 24쌍 소리 연습`
    - 썸네일 카피: `[반복 듣기]` (칩) + `B vs V` (화이트 앵커) + `다 'ㅂ'으로 읽으셨죠?` (골드 알약).
  - 썸네일 프롬프트 4종 세트 생성 완료: `prompts/thumbnail-prompts.md`.
- **프레임 목차 및 스크립트 작성 (Phase 7~8)**:
  - 10개 프레임 구성 확정: `frame.md`.
  - 대본 및 복사용 순수 텍스트 블록 작성 완료: `SCRIPT.md`.
    - 호스트 나레이션 3블록 (`01_f01_hook.wav`, `02_f02_principle.wav`, `03_f09_summary.wav`)
    - 원어민 배치 음성 3블록 (`male_words_all.wav`, `female_words_all.wav`, `en_dialogue_all.wav`)
    - 2음절 이상 단어 가운뎃점(`·`) 음절 분리 표기 준수
- **비주얼 스타일 및 프롬프트 시스템 확정 (Phase 9~10)**:
  - 스타일: [옵션 1] 웜크림 네오브루탈리즘 (채널 시그니처 표준)
  - 핵심 에셋 프롬프트 명세 완료: `prompts/visual-prompts.md`
    1. `f01_best_vs_vest.png` (Best 메달 vs Vest 조끼 페이퍼 컷아웃 + 5초 스톱모션)
    2. `f02_articulation_b_vs_v.png` (B vs V 구강 조음 단면 인포그래픽)
    3. `f07_cafe_ambience.mp4` (실전 대화 7문장 배경 루프 비디오 — 기검증 에셋 재사용)
- **에셋 반입, 워터마크 전수 검수 및 컴포지션 자동 검수 완료**:
  - 오디오 에셋 반입 및 분할: `split-batch-voice.mjs` 실행 ➔ 호스트 3개 + 남성 48단어 + 여성 48단어 + 실전 대화 7문장 = **총 103개 클립 무결점 분할 완료**.
  - Whisper 단어 타임스탬프 추출: `word-timeline.mjs` 실행 ➔ 10개 파일 전수 `.words.json` 생성 100% 완료.
  - Zero Watermark 시각 검수 및 후처리:
    - `f01_best_vs_vest.mp4`: 우측 하단 제미나이 스파클 적발 ➔ ffmpeg 크롭/스케일(`crop=1696:954:0:0,scale=1920:1080:flags=lanczos`)로 100% 제거 완료.
    - `f02_articulation.jpg`: 우측 하단 스파클 적발 ➔ ffmpeg delogo 필터로 종이 질감 자연 보간 완전 제거 완료.
    - `f07_cafe_ambience.mp4`: EP28 기검증 에셋 정상 배치 완료.
  - 프레임 컴포지션 빌드: `generate-frames.mjs` 실행 ➔ 10개 프레임 HTML 및 `index.html` 생성 완료 (전체 영상 길이: 412.59초 / 6분 53초 / 엔드스크린 10초 탑재).
  - 자동 검수 통과: `npx hyperframes check videos/ep29-b-vs-v` 린터, 런타임(0 에러), 레이아웃(0 이슈), 모션(0 에러), WCAG AA 대비(55/55 패스) **100% 통과 완료**.
- **렌더링 완료 및 공식 아바타 썸네일 탑재, 패키지 빌드 완료 (2026-10-12)**:
  - 사용자 명시적 승인 후 HyperFrames Full HD 렌더링 착수 ➔ 12,378 프레임 100% 무결점 렌더 완료 (`English_Pronunciation_B_vs_V_Minimal_Pairs_Listening_Drill.mp4`, 30.0MB, 412.59초 / 6분 52.6초).
  - 공식 시그니처 발표자 캐릭터(`public/brand/thumbnail-presenter-reference.jpg`) 레퍼런스 주입으로 썸네일 4종 전면 생성 및 탑재 완료:
    - `thumbnail-variant-a.jpg` (A안 채택: "다 'ㅂ'으로 읽으셨죠?")
    - `thumbnail-variant-b.jpg` (B안: "터뜨리기 vs 물기")
    - `thumbnail.jpg` (C안 와이드 메인: "윗니 0% vs 100%")
    - `thumbnail-close-up.jpg` (D안 모바일 전용 클로즈업: "윗니 0% vs 100%")
  - 업로드 패키지 빌드 완료: `output/upload-packages/ep29-b-vs-v/`
    - 메타데이터 (`title.txt`, `description.txt`, `tags.txt`, `pinned-comment.txt`, `timeline.txt`, `status.json`)
    - 원클릭 복사 대시보드 (`index.html`) 완비.
- **다음 행동**:
  - 사용자가 원클릭 대시보드 열람 후 유튜브 스튜디오 업로드 및 예약 설정 진행 ➔ 차기 에피소드(EP30) 기획 착수.




## 2026-11-06 업로드 패키지 수정 (업로드 전 점검)

- 제목: 메인 제목은 그대로 두고, 시안의 `[30분 듣기]`(실제 6분 53초)와 물리법칙 표현만 뺐다.
- 설명·챕터·고정 댓글: 금지어, 해외 일화, 근거 없는 최상급, 자리표시자 링크, 실제와 다른 시각을 고쳤다. 챕터 시각은 index.html의 프레임 시작과 대조해 맞는 것을 확인했다.
- 썸네일: 아바타 없는 프롬프트 4종을 새로 썼다. 이미지는 아직 만들지 않았다.
- 남은 일 (영상 자체, 다시 렌더링해야 고쳐짐):
  - 화면: 마찰음 2곳, 끝 화면의 "EP28: F vs P 0.1초 조음 물리법칙" 1곳, 0:27 배경 그림의 Bilabial · Labiodental
  - 음성: 금지어 없음. 다만 도입부에 "원어민 앞에서 이 단어를 말하면" 문장이 있음
