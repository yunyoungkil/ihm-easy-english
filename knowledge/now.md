# 지금 할 일

마지막 확인: 2026-08-31

## 최근 완료 (2026-08-31)
- **신규 대시보드 탭 "💡 아이디어→썸네일 기획 보드" 추가**: `VIDEO_WORKFLOW.md` 1단계("제작 우선순위
  결정" — market-demand + content-opportunity 데이터로 소재 5안을 표로 제시)가 지금까지 대시보드에
  전혀 구현돼 있지 않아 매번 Claude와의 대화로만 처리되던 문제를 발견. Overview 바로 다음(네비게이션
  맨 앞)에 새 탭을 추가해, 기존 4개 데이터 자산(market-demand.json/content-opportunity.json/
  audience-dna.json/success-patterns.json)을 근거로 Gemini가 소재 후보 5개를 순위·근거(어느 데이터
  에서 나왔는지 태그 칩으로 표시)와 함께 생성(`scripts/idea-board.mjs`의 `generateTopicCandidates`,
  기존 `evaluateThumbnailTitleVariants`/`diagnoseVideoWithGemini` 패턴 재사용) → 사용자가 하나를
  고르면 A/B 시뮬레이터로 원클릭 핸드오프(이미지 URL은 명시적으로 비워 이전 세션 썸네일이 새 소재에
  눌러붙는 버그를 피함, 기존 Matrix Action Hub 핸드오프 방식과 동일). `content-opportunity.json`을
  대시보드에 처음으로 노출(`GET/POST /api/content-opportunity[/run]`, 기존엔 서버에 전혀 안 쓰이던
  파일이었음). 히스토리 저장은 v1에서 의도적으로 미룸(기존 `gAbAiReport`처럼 "최신 1개만" 보관).
  Playwright로 빈 상태·후보 카드·선택·핸드오프(A/B 시뮬레이터의 topic/format/variants가 정확히
  세팅되고 이미지가 비어 있는지) 전 구간 스틸 검증 완료. 실제 Gemini 호출로도 검증 완료 — 5개 후보
  전부 4개 데이터를 실제로 인용하며 나왔고 채널 톤도 잘 반영됨. 상세 계획:
  `C:\Users\yunyo\.claude\plans\abstract-honking-sundae.md`.
- **A/B 시뮬레이터 진단(`evaluateThumbnailTitleVariants`)의 데이터 활용 갭 3건 수정**: 기획 보드
  작업 중 사용자와 데이터 흐름을 검토하다가 발견.
  (1) **타겟 시청자층 하드코딩** — 드롭다운에서 뭘 고르든 프롬프트 인트로 문장과 `aiTitleSuggestions`의
  "🤝 공감형" 타입이 "3060 시니어"로 고정돼 있던 문제. 인트로를 `[타겟 시청자]` 필드 기준으로 판단
  하도록 명시하고, 스키마 필드명도 `seniorLegibilityScore` → `legibilityScore`로 audience-neutral하게
  변경.
  (2) **audience-dna/success-patterns가 topic 연관성 없이 항상 occurrence/CTR 상위 8개만 주입** — DB가
  쌓일수록 무관한 항목이 섞여 들어갈 수 있어서, topic 토큰과의 텍스트 매칭 점수를 1차 정렬 기준으로
  삼는 `rankByTopicRelevance()` 추가(topic이 없거나 매칭이 전무하면 기존 occurrence/CTR 순서 그대로
  유지 — 안정 정렬 활용).
  (3) **market-demand.json의 titlePatterns(검증된 후킹 단어)가 아이디어 선정 단계에서만 쓰이고 문구
  작성 단계로 안 넘어가던 문제** — `evaluateThumbnailTitleVariants`에 `marketDemand` 파라미터를 추가해
  topic과 겹치는 키워드의 titlePatterns를 프롬프트에 주입.
  세 항목 모두 `scripts/ab-simulator.mjs` + `scripts/youtube-analytics-server.mjs`(`/api/ab-simulator/
  evaluate` 라우트). 실제 Gemini 호출(타겟층을 "알파벳/파닉스 입문자"로 지정)로 legibilityScore 필드명
  교체·타겟 맞춤 문구 생성·market-demand 키워드 매칭 로직을 각각 확인 완료.
- **`aiTitleSuggestions`(제목 5종)에 "정답 노출 금지" · "소재 구체성" 가드레일 추가**: 위 검증 중
  실제 응답을 `thumbnail-strategy.md` 체크리스트와 대조해보니, "💥 반전형"이 핵심 발음 메커니즘까지
  제목에 그대로 공개하고("목소리 빼고 바람만 퉤- 뱉는 원리" 등), "🤝 공감형"이 이 영상의 소재 언급
  없이 브랜드 슬로건 문장만 거의 그대로 재사용하는 문제를 발견. 이건 데이터 배관 문제가 아니라 —
  topic·audienceDna·successPatterns·market-demand가 이미 전부 프롬프트에 들어가 있었음 — **그 데이터로
  제목을 쓸 때 지켜야 할 규칙이 프롬프트에 없던 것**이라, `evaluateThumbnailTitleVariants`의 스키마
  직전에 지침 두 줄(정답/메커니즘 노출 금지, 5개 전부 소재 키워드 반영)만 추가해 해결. 같은 topic·
  targetAudience로 재호출해 반전형이 "왜 틀리는지"만 예고하고 메커니즘은 안 밝히는지, 공감형이 소재를
  실제로 언급하는지 확인 완료.
- **"제목 5종에서 시안 B/C에 적용" 시 이미지가 안 채워져 CTR 진단이 항상 시안 A만 최우수로 뽑던
  근본 원인 수정**: "시안 X에 적용" 버튼이 `.title`만 바꾸고 이미지·카피는 그대로 둬서, B/C를 적용해도
  텍스트만 있고 시각 자료가 없는 반쪽 시안이 되던 문제. `aiTitleSuggestions`와 별도였던
  `aiImagePrompts`(대표 시안 1개용 이미지 프롬프트만 존재)를 하나로 합쳐 **5개 제목 각각에 고유
  thumbnailCopy·designConcept·midjourneyPrompt**를 갖게 스키마 확장. UI도 "텍스트 적용"(제목+카피만,
  무료·즉시)과 "🎨 이미지도 생성"(그 제목 전용 프롬프트로 실제 썸네일까지, 기존 승인 게이트를 우회하지
  않음 — 이 버튼은 진단이 이미 끝난 뒤에만 보임)을 명확히 분리된 두 버튼 줄로 재배치. 프롬프트에
  "title=호기심 훅 vs thumbnailCopy=시청 후 보상, 내용 겹치지 않기" 규칙도 추가(`thumbnail-strategy.md`
  원칙 반영). Playwright로 (1) 5개 전부 4개 필드 보유·프롬프트 5개 전부 서로 다름, (2) "텍스트 적용"
  클릭 시 이미지 URL 불변, (3) "🎨 생성" 클릭 시 실제 base64 SVG 이미지가 생성돼 적용됨(8026자)을
  각각 확인 완료.
- **A/B 시뮬레이터 리포트 섹션 순서 변경**: "GEMINI CTR INTELLIGENCE VERDICT"(스코어카드) → "⚡ 제목+
  비주얼 5종" 순서였던 걸 반대로 — 바로 쓸 수 있는 추천이 스코어 분석보다 실행 우선순위가 높다는 사용자
  피드백 반영. Playwright로 `#ab-report-section` 내 `.card-title` 순서 확인 완료. 부수적으로 발견:
  `report.overallVerdict`(AI가 만드는 종합 선정 이유 요약)가 스키마엔 있는데 UI에 전혀 렌더링 안 됨 —
  아직 미해결.
- **제목+비주얼 5종의 "📋 프롬프트 복사" 버튼이 실패해도 항상 성공 토스트를 띄우던 버그 수정**:
  `navigator.clipboard.writeText()`가 클립보드 쓰기 권한 거부(`NotAllowedError`) 등으로 실패해도
  `.catch()`가 없어서 무조건 "복사되었습니다!"가 떴음 — 실제로는 아무것도 복사 안 됨(사용자가
  붙여넣기했을 때 아무것도 안 나온다고 보고). Playwright로 클립보드 쓰기 권한을 거부한 상태를 그대로
  재현해 버그를 먼저 확인(`PAGE ERROR: Write permission denied`)한 뒤, 실패 시 `execCommand('copy')`
  수동 폴백으로 넘어가도록 수정 — 같은 거부 상황에서 폴백이 실제로 클립보드에 올바른 텍스트를 넣는지
  재검증 완료(클립보드 읽기로 내용 대조).
- **AI 썸네일 생성기 제작 프로세스 이탈 확인 및 승인 게이트 추가**: 대시보드 AB 시뮬레이터의 이미지
  자동 생성 버튼 3곳(워크벤치 "AI 1-Click 생성", "3개 시안 동시 AI 생성", 갤러리 카드별 "생성")이
  `VIDEO_WORKFLOW.md` 2단계("문구 5안 제시 → 사용자 선택 → 이미지는 사용자가 직접 생성, Claude/API가
  대신 생성하지 않음") 규칙을 건너뛰던 문제를 발견. "🚀 Gemini AI CTR 정밀 진단"(문구 5안이 나오는
  응답)을 최소 한 번 실행하기 전엔 세 버튼을 잠그는 승인 게이트로 해결(`scripts/youtube-analytics-server.mjs`).
  Playwright로 로컬 대시보드를 띄워 잠금·해제 양쪽 상태를 스틸로 검증 완료
  ([결정 기록](decisions/2026-08-31-ai-thumbnail-generator-process-gap.md)).

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

- **시즌1 EP10 전체 완료** — 롱폼·쇼츠A·쇼츠B 제작·썸네일·업로드·예약까지 전부 끝남. 3개 전부
  videoId 발급받아 API로 실측 확인(롱폼 `3PkSwrFIcRE` 8/29 공개, 쇼츠A `LdiZKCzKf0c` 8/31 공개,
  쇼츠B `nVrCk8IZFGA` 9/2 공개). 시즌1 자체가 이걸로 마무리. 상세: [시즌1 EP10](episodes/season1-ep10.md).
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
