# Knowledge Index

마지막 갱신: 2026-09-08

## 항상 읽기

- [지금 할 일](now.md) — 현재 우선순위와 가까운 일정만 담는 짧은 문서
- [채널 데이터 현황](channel-data-snapshot.md) — 롱폼 vs 쇼츠 실측, 성장 레버 판단 근거. 콘텐츠
  방향·아이디어를 제안할 때 반드시 참고할 것 (원본 JSON을 매번 다시 뒤지지 않도록 요약해 둔 것)
- [이번 달 작업 기록](logs/2026-09.md) — 2026년 9월 변경 이력

## 운영

- [영상 제작 표준 워크플로우](VIDEO_WORKFLOW.md) — 기획부터 업로드·분석까지 10단계와 승인 게이트
- [브랜드 아이덴티티 & 페르소나 헌장](brand-persona.md) — 대표님의 실제 철학, 3단계 도파민 공식, 시그니처 멘트 및 비주얼 DNA
- [채널 전략](channel-strategy.md) — 성장·수익화 목표와 판단 기준
- [콘텐츠 포맷](content-formats.md) — 시즌 롱폼, Track A/B, 채널 쇼츠 C의 역할
- [제작 규칙](production-rules.md) — 대상 시청자, 쇼츠 화면, TTS와 검수 원칙
- [HyperFrames 프롬프트 운영 기준](hyperframes-prompting.md) — 워크플로 선택 이후의 지시 구조, 디자인·모션·자막·검수 기준
- [구글 AI(제미나이·Veo·Imagen) 프롬프트 작성 기준](google-ai-studio-prompting.md) — 영상/이미지 생성·데이터 분석 프롬프트를 구글 모델에 직접 쓸 때마다 참고. `aistudio.google.com/docs` 재조회 없이 바로 쓸 것
- [썸네일 전략](thumbnail-strategy.md) — 판단 원칙과 에피소드별 선택 맥락
- [레퍼런스 영상 비주얼 분석 기록](visual-reference-analysis.md) — `/watch` 스킬로 경쟁/레퍼런스
  영상을 분석해 뽑아낸 화면 구성·모션 기법 누적. 새 영상 만들기 전 참고 소재로 훑어볼 것
- [영상 STATUS 템플릿](templates/STATUS.template.md) — 영상별 진행 상태와 다음 행동 기록 양식
- [환경 설정 — HeyGen/WSL 브리지](environment-setup.md) — 이 컴퓨터에서 media-use(BGM/이미지/보이스 무료 카탈로그)를 쓰기 위한 WSL·heygen CLI 설치·연결 절차

## 결정

- [지속형 기억 시스템 도입](decisions/2026-08-21-local-wiki.md)
- [HyperFrames 도입 비교 실험](decisions/2026-08-23-hyperframes-pilot.md)
- [HyperFrames 전면 전환](decisions/2026-08-26-hyperframes-full-migration.md) — 새 제작(롱폼 포함) 전부 HyperFrames로, Remotion은 EP6~EP10 보존용
- [팟캐스트 형식 콘텐츠 추가 검토](decisions/2026-08-25-podcast-format-idea.md) — 초기 브레인스토밍, 미착수
- [채널 자체 적합도 점수 도입](decisions/2026-08-25-content-opportunity-score.md) — project1에서 `my_channel_fit_score` 공식만 이식, 경쟁 채널 비교는 미포함
- [경쟁 채널 비교(market_demand_score) 구현](decisions/2026-08-29-market-demand-score.md) — 소형 채널 outlier 탐지, 원 조회수 비교 버그를 하루당 조회수로 수정
- [아웃라이어 댓글 AI 분석 구축](decisions/2026-08-29-outlier-comment-analysis.md) — Gemini AI 시청자 고민/어휘 분석 파이프라인
- [Studio CTR 다운로드 폴더 자동 낚아채기](decisions/2026-08-29-studio-ctr-auto-ingest.md) — Downloads 폴더 실시간 무인 압축해제 & 대시보드 SSE 동기화
- [경쟁사 대본 역설계 & 맞춤 대본 생성](decisions/2026-08-29-competitor-script-reverse-engineering.md) — 1-Click 자막 추출 및 Gemini AI 대본 역설계 파이프라인
- [Cyber-HUD 대시보드 & 디자인 시스템 구축](decisions/2026-08-29-cyber-hud-command-center.md) — 피치블랙/네온 벤토 그리드, 시장수요 레이더 및 에피소드 인스펙터 구축
- [대시보드 AI 기능 고도화 로드맵](decisions/2026-08-30-ai-features-enhancement-plan.md) — Vision 썸네일 분석, 3060 대본 린터 & HyperFrames 연동 4단계 계획
- [클라이언트 JS 문법 에러 방지 규칙](decisions/2026-08-30-preventing-embedded-client-js-syntax-errors.md) — 문자열 JSON.stringify 주입 표준 및 가상 DOM 0에러 자동 검증
- [브랜드 & 대시보드 디자인 시스템](brand-dashboard-design-system.md) — 컬러 토큰, 폰트 스케일, Faceless Explainer 비주얼 일체화 표준 가이드
- [대시보드 1-Click AI 썸네일 생성기의 제작 프로세스 이탈](decisions/2026-08-31-ai-thumbnail-generator-process-gap.md) — `generateAiThumbnailImage`가 "이미지는 사용자가 직접 생성" 규칙을 건너뜀 → 문구 5안 진단 전엔 이미지 생성 버튼 잠그는 승인 게이트로 해결
- [채널 아바타 인트로 클립 제작 전 결정 사항](decisions/2026-09-03-avatar-intro-clip-setup.md) — 아바타·목소리·대사는 확정, 화면비/배경/해상도/고지문구는 아직 미정
- [단편/시즌 분류 정리](decisions/2026-09-03-standalone-vs-season-episodes.md) — 아이디어 보드로 고른 영상은 "시즌"이 아니라 "단편"으로 분류, EP11/EP12 라벨 정정
- [HyperFrames + Gemini TTS는 하단 단어별 자막 기본 off](decisions/2026-09-04-no-word-level-captions-with-gemini-tts.md) — Gemini TTS는 단어 타임스탬프를 안 줘서 whisper 재정렬이 필요한데, 한글 속 영어 단어(Want/Won't 등)를 잘못 인식해 EP12 10줄 중 6줄이 근사치로 대체됨. 포커스 문구(구 단위)는 계속 유지, HeyGen TTS로 돌아가면 재검토


## 에피소드

- [시즌1 EP9 — -CIAL](episodes/season1-ep09.md) — 제작 결과, YouTube 예약, 공개 후 확인
- [시즌1 EP10 — 시즌1 총정리](episodes/season1-ep10.md) — 완성된 롱폼과 미제작 쇼츠 A·B
- [단편 EP11 — GONNA](episodes/ep11-gonna.md) — 렌더·패키징 완료, 업로드 예약 2026-09-08(화) 20:00 KST
- [단편 EP12 — Want vs Won't](episodes/ep12-want-wont.md) — 렌더·패키징 완료, 업로드 예약 완료(상세: [지금 할 일](now.md))
- 단편 EP13 — 알파벳 소리 지름길 — 전용 episodes/ 문서 없음(2026-09-06부터 `TASKS.md` 패턴으로
  대체, `videos/VIDEO_WORKFLOW.md` "수정 사항 기록" 절 참고). 렌더·BGM/SFX·업로드 패키지 완료,
  업로드 예약 2026-09-11(금) 20:00 KST. 상세: `videos/ep13-tongue-shortcut/TASKS.md`, [지금 할 일](now.md)
- 단편 EP14 — 연음(linking sounds) — 대본·디자인·스토리보드·나레이션 12씬 생성 완료, 화면
  제작 착수 전. 상세: `videos/ep14-connected-speech/BRIEF.md`, [지금 할 일](now.md)

## 이전 기록

- [지난달 작업 기록](logs/2026-08.md) — 2026년 8월 변경 이력
- [이전 현재 상태](current-status.md) — `now.md` 도입 전 상세 상태 보관
- [이전 통합 로그](log.md) — 월별 로그 도입 전 기록 보관, 작업 시작 때 읽지 않음

## 원본 데이터

- `../data/youtube/analytics-latest.json` — 최신 YouTube 분석 스냅샷
- `../data/youtube/evaluations-48h.json` — 업로드 후 48시간 자동 판정
- `../data/youtube/content-opportunity.json` — 포맷·규칙별 채널 자체 적합도 점수(`npm run content-opportunity`로 재생성). `my_channel_fit_score`(project1 이식) + `marketDemand`(경쟁 채널 outlier, `market-demand.json`이 있으면 자동 포함) 표시, 둘은 축이 달라 곱하지 않고 나란히 표시
- `../data/youtube/market-demand.json` — 경쟁 채널 outlier 기반 키워드별 시장 수요 점수(`node scripts/market-demand.mjs`로 재생성, YouTube Data API 쿼터 ~632 units 소모)
- `../data/youtube/catalog.json` — 채널 영상 카탈로그
- `../scripts/ep09_shortsA_auto.json` — EP9 Track A 대본·타이밍
- `../scripts/ep09_shortsB_auto.json` — EP9 Track B 대본·타이밍
- `../raw/` — 기사·참고 문서·대화 내보내기 등 변경하지 않는 원본
