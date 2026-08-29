# 지금 할 일

마지막 확인: 2026-08-29

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
