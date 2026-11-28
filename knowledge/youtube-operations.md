# 유튜브 채널 운영 지도 (유튜브 전용 단일 허브)

> **역할**: [블로그 운영 지침](playbooks/blog-operations.md)과 대칭되는 **유튜브 전용 운영 지도**다. 공통 안전선·대화 규칙·모델 분업은 루트 `AGENTS.md`를 따르고, 유튜브 기획·제작·화면·업로드 세부 규칙은 이 문서에서 필요한 1장만 골라 꺼내 읽는다.

---

## 1. 제작 · 기획 핵심 지도 (필요한 1장만 열기)

| 작업 단계 | 먼저 열 문서 / 스킬 | 핵심 요약 |
|---|---|---|
| **기획 · 데이터 · 소재** | 스킬 `episode-planning` · `data/youtube/next-episode-input.md` · [데이터 소비 지도](data-consumption-map.md) · [채널 현황](channel-data-snapshot.md) | 3060 국내파 타깃, 같은 틀 반복 금지(고유 코너 1개+), 작은 표본은 "가설" 표기, vidIQ 대신 자체 YouTube OAuth(`scripts/youtube-analytics-server.mjs`) 우선 |
| **비교 시트 · 제목 · 썸네일** | [비교 시트 지침](playbooks/comparison-sheet-playbook.md) · [썸네일 전략](thumbnail-strategy.md) · [클릭 사례 모음](click-references.md) · `data/youtube/packaging-cases.json` | 행별 `origin`·`appliedTo`, 제목·썸네일 `clickWhy`, 썸네일 `craft`·`eyeOrder`, 제목 `pairing` 필수. 형식 공식(5단어 제한·1인칭 금지 등) 하드코딩 금지 |
| **대본 · 말투 · 팩트체크** | [대표님 말하기 결 카드](creator-voice-card.md) · [6개 채널 설명 도구](pedagogy-toolbox-2026-11-26.md) · [대본 규칙](script-rules.md) · [말투 실측](narration-speech-patterns.md) | 정예 예시 3~5개로 자유 초안 → `FACT-CHECK.md` 선행 → `slop-rewrite` + Korean Skills 바닥선. 학술 전문용어('드릴' 등)·지어낸 해외 일화·1인칭 날조 금지 |
| **백지 눈 검수 (승인 전 1회)** | 스킬 `blind-review` (상위 모델 권장) | 초안 대화와 분리된 백지 눈으로 일곱 기준(제목·소재 / 썸네일 1초 / 제목↔썸네일 / 초반 후킹 / 대본 귀 검사 / 중반 화면·학습 / 썸네일 그림 AI 티, 2026-11-28) 1회 점검 후 시트 `blindReview` 기록 |
| **화면 · 모션 · 미디어 생성** | 스킬 `hyperframes` · [화면 컴포지션 규칙](composition-rules.md) · [제작 규칙](production-rules.md) · [무료 생성 도구](free-generation-tools.md) · [영상 효과 50가지](video-effects-toolbox-2026-11-23.md) · [구글 AI 프롬프트](google-ai-studio-prompting.md) | 새 제작은 전부 HyperFrames(Remotion은 [보관 문서](legacy/remotion-pipeline.md)). 3중 하이브리드(Omni·Nano Banana·HyperFrames), 쇼츠 상단 0.5초 훅(형태 자율)·34px+·가로 정중앙 대칭, 롱폼 마지막 7~10초 중앙 비움, 워터마크 4모서리 0px. 제작 시 편의 성격에 맞춰 **몰입감·학습·시청 지속 시간 연출(정체 화면 분할·음성 실측 싱크·상황→듣기→퀴즈 리듬)**을 AI가 주도 설계하고 Gate 2 전 집중 자가 검수(`VIDEO_WORKFLOW.md` 7·9단계) |
| **렌더 · 업로드 · 사후 마무리** | [영상 제작 표준](VIDEO_WORKFLOW.md) · 스킬 `publish-wrapup` (경량 모델 권장) | `npx hyperframes check` + `npm run check-terms` 후 **사용자 명시 승인 뒤에만 렌더**(승인 요청 때 품질 판단은 묻지 않고 첫인상 한 단어와 진행 여부만 받는다). 금지어 검사 건너뛰기(`ALLOW_BANNED_TERMS=1`)는 사용자가 이대로 렌더하라고 명시했을 때만이고, 이 표시는 금지어 검사 하나만 건너뛴다(34px·더킹·화면 글자 검사는 그대로, 음성 관문은 건너뛰지 않는다, 2026-11-27 재검수). 렌더는 `videos/<프로젝트>/renders/`에 먼저 하고, 패키지 복사 훅(`scripts/sync-render-to-package.mjs`)은 Claude Code에서만 돌므로 **안티그래비티는 렌더 뒤 `output/upload-packages/`의 같은 이름 영상 위에 직접 복사**한다(예약·업로드·공개된 패키지는 건드리지 않고, `status.json`은 만들거나 고치지 않는다). 자동 예약은 `decideNextUpload` 단일 경로(쇼츠 단건 예외만 `studio-upload --yes`). AI 표시(`containsSyntheticMedia: true`) + 기본 재생목록 필수. **롱폼은 예약 직후 스튜디오 `A/B 테스팅`에서 비교 시트 3쌍(`제목과 썸네일`) A/B 테스트를 기본 설정한다**(2026-11-28 사용자 확정, 쇼츠는 유튜브 미지원) |
| **공개 7일·28일 성과 정산** | 스킬 `performance-settlement` (경량 모델 권장) · [스타일 실험 기록](style-experiments.md) · [규칙 세 층](rule-tiers.md) | 7일·28일 실측으로 `REVIEW.md`·`success-patterns.json`·시트 `evidenceLog` 갱신. 기준선은 `scripts/baseline.mjs`로 누적 |

---

## 2. 유튜브 전용 절대 안전선 (하드코딩 영역)

0. **쇼츠 화면 띠 (2026-11-16 사용자, 불변)**: 쇼츠 화면에는 **상단 0.5초 훅이 보이는 위 훅 띠와 아래 정보 띠가 항상 들어간다**. 형태(검은 띠·외곽선 글자 등)는 AI가 자율로 디자인하되 글자 34px 이상, 가로 정중앙 대칭. 원문 [composition-rules.md](composition-rules.md) "쇼츠 화면의 위 훅 띠·아래 정보 띠".
1. **3대 승인 관문**: ① 비교 시트 승인(기획·제목·썸네일·대본 통합, `blindReview` 포함) ② 렌더 명시 승인(자동 검사 후 정지) ③ 최종 업로드 승인. 사용자는 안전 확인과 취향 반응만 한다.
2. **전문용어·가짜 경험 차단**: 시청자 대외 접점에 `드릴(drill)`, `미니멀 페어`, `조음`, `유성음/무성음`, `긴장/이완모음` 등 학술 용어 금지(`npm run check-terms`). 해외 거주·가짜 지인 대화 날조 금지.
3. **미디어 생성 2단계**: Antigravity는 자체 이미지 모델 우선 → 한도 소진 시(Claude Code는 바로 2단계) AI Studio(`npm run image`, `npm run video`, `npm run music`) 사용. 유료 외부 MCP·`OLD_PAID_GEMINI_API_KEY` 금지. BGM은 편마다 새로 만들고 허밍 청취 확인.
4. **대시보드·자동화 경계**: 사람이 수동 관리하는 UI(수동 등록·태깅·토글) 금지. 쇼츠 판정은 `video.format`만 사용. 인라인 클라이언트 문자열은 `${JSON.stringify(변수)}`만 쓰고 수정 후 `node scripts/test-client-syntax.mjs` + `npm test` 통과 확인.

---

## 3. 브랜드 페르소나 & 규칙 층
- **페르소나**([brand-persona.md](brand-persona.md) · [creator-voice-card.md](creator-voice-card.md)): 가식 없는 담백한 실전 학습 파트너. *"당신 탓이 아니에요"* 류 뻔한 반전 위로 금지. 꾸민 문어체 대신 입에서 바로 나오는 쉬운 존댓말.
- **규칙 세 층**([rule-tiers.md](rule-tiers.md)): ① 불변(사용자만 변경) ② 기본값(시트 근거로 변경 가능) ③ 실험 변수(고정 금지, 시트 `testVariables`에 1~2개 기록해 7일 실측 비교).
