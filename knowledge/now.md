# 지금 할 일

마지막 확인: 2026-08-29

## 최근 완료 (2026-08-30)
- **1-Click 썸네일 엔진 ➔ '경쟁사 결핍 진단 + 레퍼런스(Brendan Jowett)급 시네마틱 아트워크 엔진'으로 전면 재구축**:
  - 단순 텍스트 삽입이나 고정 템플릿을 100% 영구 폐기.
  - **1단계 (경쟁사 결핍 & 시청자 심리 진단)**: 경쟁사의 지루한 칠판/문장 나열 썸네일의 한계를 분석하고, 시청자가 무의식적으로 겪는 오답/뒤통수 포인트를 2~3단어 마이크로 카피(`"보고 싶어요"`, `I MISS YOU? ❌`)로 추출.
  - **2단계 (3대 차별화 승부수)**: 시안 A(오답 충격 & 뒤통수형), 시안 B(1초 소리 족보 & 비밀 공식형), 시안 C(원어민 리얼 뉘앙스 & 비교 대조형)로 3종 완전 차별화.
  - **3단계 (레퍼런스급 시각 렌더링)**: 다크 시네마틱 스튜디오 배경 + 네온 림라이트 플레어(사이안/마젠타/골드) + 생생한 리액션 인물 실루엣 + 초대형 볼드 타이포 + 플로팅 네온 필 뱃지를 Gemini 3.6이 순수 코드로 드로잉.
- **1-Click 썸네일 엔진 ➔ 시안 A · B · C 3종 독립 레이아웃 & 시각 차별화 합성기 구축**:
  - 시안 A, B, C 각각에서 생성 버튼을 누를 때마다 완전히 다른 3가지 시각 후킹 전략의 썸네일이 실시간 자동 생성.
- **A/B 시뮬레이터 연동 시 원본 썸네일 복사 문제 해결 & 시안 A(원본) vs 시안 B/C(새 시안 등록 대기) 완벽 격리**:
  - **시안 A**: 선택한 영상의 **원본 썸네일 + 원본 제목**이 기준점으로 등록.
  - **시안 B / C**: **AI 추천 대체 제목만 자동 입력**된 상태에서 **`🖼️ 새 시안 드롭 / AI 생성` 대기 상태**로 분리.
- **4사분면 매트릭스 & AI 처방전(Action Hub) ➔ A/B 시뮬레이터 연동 포맷(쇼츠 vs 롱폼) 자동 전환 완벽 수정**:
  - 쇼츠 선택 시 100% 쇼츠(9:16) 규격으로, 롱폼 선택 시 100% 롱폼(16:9) 규격으로 자동 라우팅.
- **LIVE MOBILE FEED PREVIEW 시각 모드(👁️ 표준 / 🌫️ 블러 / ⚫ 흑백) 기능 연결 및 실시간 필터링 완벽 구현**:
  - `[👁️ / 🌫️ / ⚫]` 버튼 클릭 시 모바일 피드 컨테이너(`.mockup-feed-scroll`)에 `filter: blur(4.5px)` 및 `filter: grayscale(100%) contrast(1.15)` 스타일이 실시간 즉각 적용되도록 스크립트 연결 완료.
- **LIVE MOBILE FEED PREVIEW 세로형 쇼츠형 썸네일(Sorisun 9soUtbaZUVE)을 순수 16:9 가로형 롱폼 썸네일로 전면 교체**:
  - 기존 Sorisun 채널의 썸네일(`9soUtbaZUVE`)이 16:9 캔버스 중앙에 세로형 쇼츠 포스터가 배치된 형태여서 쇼츠 썸네일처럼 보였던 문제를 완벽 해결.
- **LIVE MOBILE FEED PREVIEW 드롭 시 스크롤 위치 유지 & 타겟 자동 시야 고정(Scroll Retention)**:
  - 썸네일 카드를 원하는 피드 위치에 드롭했을 때, 전체 탭 리렌더링으로 인해 스마트폰 피드 스크롤이 맨 위로 튀는 문제를 완벽 해결.
- **LIVE MOBILE FEED PREVIEW 피드 내 썸네일 카드 직접 드래그 앤 드롭(In-Place Reordering) 구현**:
  - 스마트폰 모바일 피드 내부에서 **`☰ ★ 우리 채널 시안` 카드를 마우스로 직접 잡아서 피드 상·하단의 다른 경쟁 영상 위치로 드래그 앤 드롭**하여 실시간 위치 이동 및 시안 검증 가능.
- **A/B 시뮬레이터 갤러리 내부 이미지 교차 드롭 덮어쓰기 방지 & UX 정밀 보완**:
  - 시안 카드의 이미지를 마우스로 끌었을 때 다른 시안으로 이미지가 복사/덮어써지는 브라우저 기본 드래그 동작을 원천 차단(`draggable="false"`, `pointer-events: none`).
  - 외부 OS 파일 탐색기에서 드롭하는 실제 이미지 파일(`File` 객체)만 선별적으로 수신.
- **YouTube 모바일 실사 피드(1 롱폼 ➔ 6 쇼츠 2열 ➔ 3 롱폼) 완벽 구현 & 실데이터 썸네일 전면 적용**:
  - 사용자 스크린샷 1·2·3번 기반 실전 유튜브 모바일 홈 피드 구조 100% 동일 배치 구현.
  - 시장 수요 레이더 및 채널 카탈로그의 실제 유튜브 썸네일 연동.
  - 롱폼 선택 시 16:9 가로형 미니 갤러리 및 피드 연동, 쇼츠 선택 시 9:16 세로형 미니 갤러리 및 쇼츠 선반 내 시안 하이라이트 노출 완벽 지원.
  - 가상 DOM 및 통합 검증 스크립트(`scripts/test-ab-simulator.mjs`, `scripts/test-client-syntax.mjs`)로 10개 탭 전체 0에러 검증 완료.
- **대시보드 클라이언트 스크립트 무한 초기화 방지 & A/B 시뮬레이터 UI 완전 최적화**:
  - 인라인 클라이언트 스크립트 JS 문법 에러 원인 규명 및 `${JSON.stringify(변수)}` 주입 표준화.
  - 가상 DOM 자동 검증기(`node scripts/test-client-syntax.mjs`) 도입으로 10개 탭 전체 0에러 보증.
  - A/B 시뮬레이터 좌측 3열 미니 갤러리 복원, 우측 고정 높이(560px) 스마트폰 프레임(`mockup-phone`) 격리 및 쇼츠(9:16) 세로 비율 완벽 지원 ([상세 지침](decisions/2026-08-30-preventing-embedded-client-js-syntax-errors.md)).
- **대시보드 AI 기능 고도화 & 성장·수익화 플라이휠 수립 완료**:
  - Vision 썸네일 A/B 분석, 3060 성인 대본 린터, 이탈 곡선 핀포인트, 주간 기회 브리핑 4단계 로드맵 수립 ([결정 기록](decisions/2026-08-30-ai-features-enhancement-plan.md)).
  - 경쟁사 결핍 추출 ➔ 브랜드 렌즈 ➔ HyperFrames 제작 ➔ 성공 족보 DB 자산화 ➔ 4단계 수익화(애드센스/교재/멤버십/카카오DB) 플라이휠 원칙 확립 ([채널 전략](channel-strategy.md) 및 `AGENTS.md` 영구 주입).

## 최근 완료 (2026-08-29)
- **Cyber-HUD Command Center 전면 개편 & 브랜드 디자인 시스템 수립 완료**:
  - 피치블랙(`05070c`) + 네온 마젠타(`ff2a6d`) & 사이언(`00f0ff`) 벤토 그리드 레이아웃 구축.
  - 시장 수요 레이더(`market-demand.json`) + 아웃라이어 댓글 AI 분석실 + 1-Click 에피소드 업로드 패키지 인스펙터 + 48H 판정 보드 통합.
  - [브랜드 디자인 시스템 문서](brand-dashboard-design-system.md) 및 [결정 기록](decisions/2026-08-29-cyber-hud-command-center.md) 영구 보존 완료.
- **경쟁 채널 시장 수요 점수(`scripts/market-demand.mjs`) & 아웃라이어 댓글 AI 분석(`scripts/analyze-outlier-comments.mjs`) 파이프라인 구축 완료**.
- **경쟁사 대본·자막 역설계 및 Gemini AI 맞춤 대본 생성 파이프라인(`scripts/analyze-competitor-script.mjs`) 구축 완료**: 유튜브 자막 1-Click 추출 ➔ 후킹/비유/타임라인 분해 ➔ '이해하면 쉬운영어' 맞춤 롱폼·쇼츠 대본 자동 완성.
- **Studio CTR 다운로드 폴더 자동 낚아채기(`scripts/studio-auto-ingest.mjs`) & 실시간 무인 연동 구축 완료**: 스튜디오에서 내보내기만 누르면 `Downloads` 폴더에서 자동 감지 ➔ 압축해제 ➔ 매칭 ➔ 대시보드 실시간 반영.

## 최우선

- EP9 롱폼·쇼츠A 공개 확인 완료(2026-08-25, 실제 API 재동기화로 검증: 둘 다 `public`). 고정 댓글·엔딩화면 EP8 연결도 사용자 확인 완료.
- EP9 쇼츠B는 8월 27일 20:00 예약 그대로 대기 중(정상, 아직 비공개).
- EP9 노출수·CTR은 스튜디오에서 [내보내기]를 누르면 다운로드 폴더에서 자동 낚아채어 대시보드에 즉시 반영됨 (파일 이동 불필요).

## 예약 상태

| 콘텐츠 | 공개 시각 | 상태 |
|---|---|---|
| EP9 롱폼 | 8월 23일 20:00 | 예약 완료 |
| EP9 쇼츠 A | 8월 25일 20:00 | 예약 완료 |
| EP9 쇼츠 B | 8월 27일 20:00 | 예약 완료 |

## 다음 제작

- 시즌1 EP10 롱폼은 완성됨 (`out/ep10.mp4`, `EP10-card`)
- **EP10 롱폼·쇼츠A·쇼츠B 전부 업로드 패키지 준비 완료** (`content/season1/ep10/*.json` → `output/upload-packages/s1-ep10-*`, 통합 요약 `output/upload-packages/s1-ep10-upload-summary.html`). 남은 건 사용자가 직접 하는 실제 유튜브 작업뿐: 썸네일 3개 생성, 공개 일정 확정, **EP10 롱폼 실제 업로드**(→ videoId 나오면 쇼츠 두 개의 `[EP10-videoId]` 채우고 패키지 재생성). 상세: [시즌1 EP10](episodes/season1-ep10.md).
- 쇼츠A·B는 서로 디자인을 통일하지 않기로 확정(트랙별 독립 디자인 방침). **Track B는 에피소드마다도 새 컨셉으로 만들기로 확정** — 카톡 스타일을 고정 템플릿화하지 않음([콘텐츠 포맷](content-formats.md) 참고).
- 이 세션에서 HeyGen CLI를 WSL Ubuntu에 설치·OAuth 로그인 완료, Windows→WSL 브리지용 `heygen.exe` 셰임을 `%APPDATA%\npm\heygen.exe`에 생성 — 이제 이 컴퓨터에서 BGM/이미지/보이스 무료 카탈로그(`media-use` 스킬)를 프로젝트 전반에서 계속 쓸 수 있음.
- **2026-08-26: HyperFrames 전면 전환 확정.** 새 제작(롱폼·쇼츠·썸네일 전부, 시즌2 EP11 포함)은 이제 HyperFrames로만 한다. Remotion은 EP6~EP10 재렌더용으로만 보존([결정 기록](decisions/2026-08-26-hyperframes-full-migration.md)). 시즌2 EP11 착수 전에 HyperFrames용 롱폼 카드 템플릿을 새로 설계해야 함(Remotion `CardScene`엔 있지만 HyperFrames 쪽엔 아직 없음).
- **채널 자체 적합도 점수**(`npm run content-opportunity`, [결정 기록](decisions/2026-08-25-content-opportunity-score.md)) 첫 실행 결과: 시즌1 규칙 중 **-SION(EP7)이 가장 잘 맞고 -TURE(EP8)가 가장 낮음**. 시즌2 소재 우선순위 정할 때 참고할 것 — 경쟁 채널 비교(market_demand_score)는 아직 없어 이 점수만으로 최종 결정하지 않는다.
- 팟캐스트 형식 콘텐츠 추가 아이디어 브레인스토밍함, 아직 미착수 — [결정 기록](decisions/2026-08-25-podcast-format-idea.md) 참고.
- EP8 롱폼 핵심 규칙 구간의 28초 Softboard 테스트를 검토해, 밝은 소프트 뉴모피즘 보드가 롱폼 설명 장면에 맞는지 별도로 판정
- 그다음 시즌2 EP1 개별 패스 통합

## 관련 문서

- [시즌1 EP9](episodes/season1-ep09.md)
- [시즌1 EP10](episodes/season1-ep10.md)
- [콘텐츠 포맷](content-formats.md)
- [제작 규칙](production-rules.md)
- [썸네일 전략](thumbnail-strategy.md)
