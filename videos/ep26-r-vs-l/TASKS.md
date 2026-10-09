# TASKS — ep26-r-vs-l

## 2026-10-08 — 프로젝트 기획 마스터 워크플로우 (Phase 1 ~ Phase 10) 완료

### 작업 배경
- 기획: `[30분 듣기] Right와 Light, 아직도 둘 다 '라이트'로 발음하시나요?` (R vs L 짝단어 20쌍 심화 반복 듣기 롱폼)
- 포맷: 듣기형 롱폼 (Listening Drill · 약 15~20분 심화형)
- 비주얼 스타일: [옵션 1] 웜크림 네오브루탈리즘 (채널 시그니처 표준)

### 1단계: 기획 마스터 워크플로우 (완료)
- **Phase 1 (라이브 데이터 분석)**: 채널 현황(최근 90일 26,044회, 검색 유입 2.47%) 및 성인 자음 혼동 1위 페인포인트 교차 검증 완료.
- **Phase 2 (콘텐츠 유형)**: 듣기형 롱폼 (15~20분 심화 딥러닝형) 확정.
- **Phase 3 (경쟁 채널 스캔)**: 글로벌 듣기 채널(Speak English With Class, learn english online) 라이브 스캔 현황 분석 완료 (`knowledge/competitor-channels-2026-10-08.md`).
- **Phase 4 (소재 선정)**: R vs L 20쌍(총 40단어) Minimal Pairs 확정 (`REVIEW.md` 예측 기록).
- **Phase 5 (분량/포맷)**: 10프레임 심화 15~20분 구조 확정.
- **Phase 6 (제목 & 썸네일)**: A안 메인 확정 + 썸네일 프롬프트 4종 작성 완료 (`prompts/thumbnail-prompts.md`).
- **Phase 7 (목차 아웃라인)**: 4개 그룹별 20쌍 + 7개 문장 대화 + 셔플 + 1장 요약 + 앵콜 구조 확정.
- **Phase 8 (나레이션 스크립트)**: 대본 및 Gemini TTS 복사용 순수 텍스트 블록 완성 (`SCRIPT.md`).
- **Phase 9 (시각 디자인 스타일)**: [옵션 1] 웜크림 네오브루탈리즘 확정 (`frame.md`).
- **Phase 10 (시각 자산 프롬프트)**: 핵심 자산 2종(구강 조음 단면도 이미지, 서재/카페 앰비언스 루프 비디오) 프롬프트 작성 완료 (`prompts/visual-prompts.md`).

---

### 다음 단계 (기술적 제작 워크플로우 진행 현황)
1. **[Step 1] 음성 자산 반입 (완료)**:
   - 한국어 호스트 나레이션 3개 (`01_f01_hook.wav`, `02_f02_principle.wav`, `03_f09_summary.wav`) 반입 완료.
   - 남/여 40단어 및 실전 7문장 배치 파일 반입 완료.
2. **[Step 2] 시각 미디어 2종 완비 (완료)**:
   - F02 조음 원리: Imagen 3 생성 `f02_vocal_tract_rl.jpg` 배치 완료.
   - F07 실전 대화: 서재/카페 앰비언스 루프 비디오 `f07_dialogue_ambience.mp4` 배치 완료.
3. **[Step 3] 오디오 전처리 및 Whisper 타임스탬프 추출 (완료)**:
   - `split-batch-voice.mjs`: 250ms 여운 패딩 + 50ms 페이드아웃 적용, 87개 오디오 무결점 분할 완료.
   - `measure-all-voice.mjs`: 90개 오디오 지속시간 실측 및 `.tts-results.json` 등록 완료.
   - `word-timeline.mjs`: 한국어 3종 + 영어 대화 7종 100% Whisper 단어별 타임스탬프(`*.words.json`) 추출 완료.
4. **[Step 4] HyperFrames 컴포지션 구현 및 정정 검수 완료**:
   - 2음절 단어 영어 음절 분리(`ri · ver` vs `li · ver`) + 1음절 단어 자연스러운 한글 독음(`[롸이트]`, `[라이트]`) 100% 반영.
   - F07 실전 대화 7문장 끝 쉼표(`,`) 오류 ➔ 마침표(`.`) 및 물음표(`?`) 정정 완료.
   - F07 배경 비디오(`f07_dialogue_ambience.mp4`) 우측 하단 제미나이(Gemini) 워터마크 ffmpeg 크롭/스케일 무손실 재인코딩으로 100% 제거 완료.
   - 프로젝트 전역 규칙 및 스킬에 AI 생성 미디어 워터마크 무관용 원칙(Zero Watermark Rule) 영구 명문화 완료 (`AGENTS.md`, `CLAUDE.md`, `production-rules.md`, `episode-planning/SKILL.md`).
   - `npx hyperframes check` 자동 검수 통과 (Lint 0 errors, Runtime 0 errors, Contrast 50/50 WCAG AA Pass).
5. **[Step 5] 절대적 승인 게이트 (현재 단계 · 사용자 검수 대기)**:
   - 프리뷰 스튜디오 기동 중 (`http://localhost:3002/#project/ep26-r-vs-l`).
   - 총 영상 길이: 12분 24.7초 (744.66s).
   - 사용자 명시적 렌더링 지시 대기 중.

