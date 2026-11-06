# TASKS — ep28-f-vs-p

## 2026-10-10 — EP28 기획 및 프롬프트 시스템 완료 (F vs P 0.1초 조음 물리법칙 24쌍 반복 청취 드릴)

- **소재 선정 및 유형 확정 (Phase 1~5)**:
  - 라이브 데이터 분석(API sync 완료, 90일 53,070회, 롱폼 비중 2.0% 극복 타겟) 및 경쟁 채널 6곳 실시간 스캔 완료.
  - 주제: F vs P 자음 짝단어 듣기 드릴 (니치 수요 1위 및 성인 학습자 영구 미해결 페인포인트 1위).
  - 포맷: 심화 확장형 롱폼 (12~15분 대용량 드릴, 약 13분 30초~14분 설계).
- **제목 및 썸네일 확정 (Phase 6)**:
  - 4안 (물리법칙형) 확정: `원어민이 F와 P를 0.1초 만에 구별하는 법 | F vs P 24쌍 반복 듣기`
  - 썸네일 카피: `[반복 듣기]` (칩) + `F vs P` (화이트 앵커) + `윗니 0% vs 100%` (골드 알약).
  - 썸네일 프롬프트 4종 세트 생성 완료: `prompts/thumbnail-prompts.md`.
- **프레임 목차 및 스크립트 작성 (Phase 7~8)**:
  - 10개 프레임 구성 확정: `frame.md`.
  - 대본 작성 및 나레이션 린터 무결점 통과: `SCRIPT.md`.
    - 국내 거주 성인 학습자 관점 전면 개편 (해외 카페 일화 배제, 학창 시절 배운 방식과 미드 청취 현실 괴리 바인딩, 언어학 전문용어 '마찰음/파열음' 배제 및 초등학생 수준 순화 완료).
    - 호스트 나레이션 3블록 (`01_f01_hook.wav`, `02_f02_principle.wav`, `03_f09_summary.wav`)
    - 원어민 배치 음성 3블록 (`male_words_all.wav`, `female_words_all.wav`, `en_dialogue_all.wav`)
- **비주얼 스타일 및 프롬프트 시스템 확정 (Phase 9~10)**:
  - 사용자 선택: **[옵션 1] 웜크림 네오브루탈리즘 (채널 시그니처 표준)**
  - 하이퍼프레임 구현 가능성 필터링 통과 3개 핵심 에셋 프롬프트 작성 완료: `prompts/visual-prompts.md`
    1. `f01_coffee_vs_copy.png` (Coffee vs Copy 페이퍼 컷아웃 + 5초 스톱모션 프롬프트)
    2. `f02_articulation_f_vs_p.png` (F vs P 구강 조음 단면 인포그래픽 다이어그램)
    3. `f07_cafe_ambience.mp4` (실전 대화 7문장 배경 루프 비디오)
- **기술적 제작 진행 완료 (2026-10-10)**:
  - [x] 음성 에셋 생성 및 `assets/voice/` 반입 (사용자 AI Studio 직접 생성 반입 완료)
  - [x] 시각 에셋 반입 및 워터마크 무결점 검수 (Gemini 워터마크 ffmpeg 크롭 제거, EP27 비디오 재사용 완비)
  - [x] 배치 오디오 분할 (`split-batch-voice.mjs`) -> 남성 48단어, 여성 48단어, 대화 7문장 분할 100% 완료
  - [x] Whisper word-level 타임스탬프 추출 (`scripts/word-timeline.mjs`) -> 10개 파일 words.json 생성 완료
  - [x] HyperFrames 프레임 컴포지션 구현 (`scripts/generate-frames.mjs`) -> 10개 프레임 및 모듈형 index.html 완성
  - [x] 자동 무결점 검수 (`npx hyperframes check videos/ep28-f-vs-p`) -> 린터/런타임/레이아웃/모션/대비 52/52 WCAG AA 100% 통과 완료
- **현재 상태 및 후속 절차 (2026-10-10)**:
  - [x] 사용자 화면 및 타임라인 검수 완료
  - [x] 렌더링 시작 승인 확인 후 로컬 렌더링 완료 (14분 44.6초 소요, 12,469 프레임 100% 무결점 완료)
    - 결과 비디오: `output/upload-packages/ep28-f-vs-p/English_Pronunciation_F_vs_P_Minimal_Pairs_Listening_Drill.mp4` (30.1 MB, 6분 55.6초)
  - [x] 유튜브 업로드 원클릭 패키지 빌드 및 검수 100% 완료 (`output/upload-packages/ep28-f-vs-p/`)
    - `title.txt` / `title-variants.txt`: 메인 및 A/B 테스트 4종 제목
    - `timeline.txt`: 10개 프레임 + 10초 엔드스크린 타임라인 (00:00~06:45)
    - `description.txt`: 핵심 조음 물리법칙 정리, 학습 팁, 다음 추천 영상 링크, 해시태그
    - `pinned-comment.txt`: 시청자 완주 축하 및 헷갈리는 단어 반응 유도 고정 댓글
    - `tags.txt`: 19개 핵심 SEO 검색 태그 (500자 최적화)
    - `status.json` (`ready_to_upload`) / `upload-checklist.txt`: 메타데이터 및 업로드 검수 가이드
    - `index.html`: 원클릭 클립보드 복사 대시보드 페이지
  - [x] 유튜브 Studio 업로드 대기 상태 완료 (권장 예약일: 2026-10-12 23:00 KST)

