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

### 2단계: 기술적 제작 및 컴포지션 빌드 (완료)
- **[Step 1 & 2] 음성 및 시각 자산 8종 반입 완료**:
  - 한국어 호스트 나레이션 3개 + 배치 오디오 3개 반입 완료.
  - `f02_vocal_tract_comparison.jpg` 및 `f07_dialogue_ambience.mp4` 반입 완료.
- **[Step 3] 오디오 전처리 및 Whisper 타임스탬프 정렬 완료**:
  - `split-batch-voice.mjs`: 250ms 여운 패딩 + 50ms 페이드아웃 적용하여 40단어 최소대립쌍 남/여 총 80개 WAV + 실전 대화 7문장 남/여 총 14개 WAV 분할 완료.
  - Whisper `small` 모델 기반 한국어 3개 + 영어 대화 14개 총 17개 오디오 단어 타임스탬프(`*.words.json`) 추출 완료.
- **[Step 4] 10개 프레임 컴포지션 완성 및 사용자 피드백 긴급 반영 (`generate-frames.mjs`)**:
  - **F07 대화 문장 단어 강조**: `<span class="hl-tense">`, `<span class="hl-lax">` 컬러/배경/밑줄 하이라이트 + 발화 시 1.18배 펄스 바운스 애니메이션 + 하단 `💡 pull [풀] · push [푸쉬]` 음절 팁 뱃지 탑재.
  - **전 프레임 20쌍 40단어 한글 음절 분리 표기 탑재**: `[푸 · 울]` vs `[풀]` 가운뎃점(`·`) 음절 표기를 F01~F10 전 프레임에 완벽 적용.
  - **영구 규칙 전역 명문화**: `.claude/skills/episode-planning/SKILL.md`, `knowledge/production-rules.md`, `AGENTS.md`, `CLAUDE.md`에 음절 표기 및 대화 단어 강조 필수 항목 반영 완료.
- **[Step 5] 자동 검수 100% 무결점 통과**:
  - `npx hyperframes check`: Lint 0 errors, Runtime 0 errors, Layout 0 issues, Contrast 54/54 WCAG AA 통과 (`Check passed`).
  - 프리뷰 스튜디오 기동 중: `http://localhost:3002/#project/ep25-pool-pull`.

---

### 3단계: 절대적 승인 게이트 통과, 고화질 렌더링 완주 및 업로드 패키지 빌드 (완료)
- **[Step 6] 사용자 프리뷰 검수 및 렌더링 명시적 승인 획득**:
  - 사용자 지시("25 다음 작업 진행해") 수령 후 렌더링 착수.
- **[Step 7] 고화질 렌더링 100% 무결점 완주**:
  - `npx --yes hyperframes render .` (총 23,408 프레임, 780.25초 / 13분 00.3초) 완주 완료.
  - 렌더 파일: `renders/ep25-pool-pull_2026-10-08_22-18-10.mp4` (40.3MB).
- **[Step 8] 썸네일 4종 제작 및 업로드 패키지 완비**:
  - `thumbnail-close-up.jpg`(모바일 1위), `thumbnail.jpg`(A안 메인), `thumbnail-b.jpg`(B안 경고), `thumbnail-c.jpg`(C안 원리) 4종 생성 및 배치.
  - SEO 파일명 복사: `English_Pronunciation_Pool_vs_Pull_Minimal_Pairs_Listening_Drill.mp4`.
  - 메타데이터 및 원클릭 대시보드 `index.html` 구축 완료.


