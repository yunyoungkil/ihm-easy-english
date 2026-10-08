# TASKS — ep25-pool-pull

## 2026-10-08 — 프로젝트 기획 마스터 워크플로우 (Phase 1 ~ Phase 10) 완료

### 작업 배경
- 기획: `[30분 듣기] Pool과 Pull, 둘 다 똑같이 '풀'로 발음하셨나요?` (장모음 [uː] vs 단모음 [ʊ] 짝단어 20쌍 심화 반복 듣기 롱폼)
- 포맷: 듣기형 롱폼 (Listening Drill) · 약 20~25분 심화형
- 비주얼 스타일: [옵션 1] 웜크림 네오브루탈리즘 (채널 시그니처 표준)

### 1단계: 기획 마스터 워크플로우 (완료)
- **Phase 1 (라이브 데이터 분석)**: 채널 현황(최근 90일 26,044회, 검색 유입 2.47%) 및 성인 모음 혼동 페인포인트 교차 검증 완료.
- **Phase 2 (콘텐츠 유형)**: 듣기형 롱폼 (20~25분 심화 딥러닝형) 확정.
- **Phase 3 (경쟁 채널 스캔)**: 글로벌 듣기 채널(Speak English With Class, learn english online) 라이브 스캔 및 100% 롱폼 집중 현황 분석 완료 (`knowledge/competitor-channels-2026-10-08.md`).
- **Phase 4 (소재 선정)**: 장모음 [uː] vs 단모음 [ʊ] 20쌍(총 40단어) Minimal Pairs 확정 (`REVIEW.md` 예측 기록).
- **Phase 5 (분량/포맷)**: 10프레임 심화 20~25분 구조 확정.
- **Phase 6 (제목 & 썸네일)**: A안 메인 확정 + 썸네일 프롬프트 4종 작성 완료 (`prompts/thumbnail-prompts.md`).
- **Phase 7 (목차 아웃라인)**: 4개 그룹별 20쌍 + 7개 문장 대화 + 셔플 + 1장 요약 + 앵콜 구조 확정.
- **Phase 8 (나레이션 스크립트)**: 대본 및 Gemini TTS 복사용 순수 텍스트 블록 완성 (`SCRIPT.md`).
- **Phase 9 (시각 디자인 스타일)**: [옵션 1] 웜크림 네오브루탈리즘 확정.
- **Phase 10 (시각 자산 프롬프트)**: 핵심 자산 2종(구강 조음 단면도 이미지, 서재/카페 앰비언스 루프 비디오) 프롬프트 작성 완료 (`prompts/visual-prompts.md`).

---

### 다음 단계 (기술적 제작 워크플로우)
1. **[Step 1] 음성 자산 생성 (사용자 직접 제작 또는 생성 지원)**:
   - 한국어 호스트 나레이션 3개 (`01_f01_hook.wav`, `02_f02_principle.wav`, `03_f09_summary.wav`)
   - 남/여 40단어 배치 파일 2개 (`male_words_all.wav`, `female_words_all.wav`)
   - 실전 7문장 배치 파일 1개 (`en_dialogue_all.wav`)
2. **[Step 2] 시각 미디어 2종 생성 및 반입**:
   - `f02_vocal_tract_comparison.jpg`
   - `f07_dialogue_ambience.mp4`
3. **[Step 3] 오디오 전처리 및 Whisper 타임스탬프 추출**:
   - `split-batch-voice.mjs` (250ms 여운 패딩 + 50ms 페이드아웃 적용)
   - `word-timeline.mjs`
4. **[Step 4] HyperFrames 컴포지션 구현 및 검수 (`check`)**
5. **[Step 5] 절대적 승인 게이트 및 렌더링 착수**
