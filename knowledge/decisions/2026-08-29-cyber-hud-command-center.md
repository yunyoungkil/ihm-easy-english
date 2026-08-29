# YouTube Channel Lab: Cyber-HUD Command Center & Design System 구축 계획 및 결정 기록

마지막 갱신: 2026-08-29

---

## 1. 개요 및 계기

기존의 기본 텍스트/테이블 중심 대시보드를 탈피하여, 레퍼런스 이미지(초고밀도 피치블랙 다크모드, 네온 마젠타/사이언 포인트, 벤토 그리드, 미니 스파크라인, 좌측 네비게이션 레일)를 완벽히 계승한 **차세대 YouTube Channel Lab Cyber-HUD Command Center**로 전면 개편하였다.

또한 채널 '이해하면 쉬운영어'의 Faceless Explainer 영상 제작, 썸네일, 대시보드 전반에 일관된 시각 언어를 부여하기 위해 **브랜드 디자인 시스템 문서(`knowledge/brand-dashboard-design-system.md`)**를 함께 구축하였다.

---

## 2. 디자인 아키텍처 및 시각 언어

### 2.1 Deep Space Black & Neon Signal System
* **Space Black (`#05070c`)**: 깊은 우주 공간을 연상시키는 피치블랙 배경
* **Neon Magenta (`#ff2a6d`)**: 시그니처 핫 포인트 (경고, 핫 이슈, 최고 성장 영상 스포트라이트)
* **Cyber Cyan (`#00f0ff`)**: 주 액션 버튼, 통과 뱃지, 실시간 연결 상태
* **Electric Amber (`#ffd166`)**: 기회 점수, 보류 상태, 3초 후킹 하이라이트
* **Laser Emerald (`#10b981`)**: 강한 통과(Strong Pass), 구독 전환 우수

### 2.2 고밀도 벤토 그리드 (Bento Grid) & 듀얼 네비게이션
* **좌측 아이콘 레일 (Left Icon Rail)**: Home, Demand, AI Lab, Episodes, 48H Eval, Studio, Design 7개 모듈 빠른 전환
* **상단 카테고리 탭 (Category Tabs)**: 주요 분석 영역 1클릭 탭 탐색
* **초경량 SVG 스파크라인 (Sparkline)**: 일별 조회수, 시청 시간, 구독 추이를 미니 차트로 직관화

---

## 3. 핵심 운영 및 분석 기능

| 기능 모듈 | 구현 내용 및 조작 방법 |
|---|---|
| **⚡ 전체 관제 (Overview)** | 4대 핵심 지표(조회수, 시청시간, 유지율, 구독순증) + 최고 성과 영상 마젠타 타일 + 성장 기여도 테이블 |
| **🎯 시장 수요 레이더 (Demand)** | `market-demand.json` 연동. 키워드별 수요 점수, 기회 점수, **제목 패턴 칩(#태그) 1클릭 복사**, UI에서 즉시 `[🚀 수요 분석 실행]` 가능 (`/api/market-demand/run`) |
| **🤖 아웃라이어 댓글 AI 분석실 (Outlier Lab)** | URL/키워드 입력 시 인기 댓글 100개 수집 + Gemini AI 심층 분석(시청자 고통점, 질문, 어휘, 3초 후킹, A/B 제목) 실시간 카드 렌더링 & 마크다운 아카이브 열람 |
| **🎬 에피소드 & 업로드 패키징 (Episodes)** | EP01~EP10 및 시즌 2 에피소드 상태 보드 + **1-Click 업로드 패키지 인스펙터**(제목, 설명문, 태그, 고정댓글 복사) + **Faceless 비디오 제작 가이드 모달** |
| **⚖️ 48H 사후 판정 (Evaluations)** | 업로드 48시간 후 시청률/유지율 기반 자동 판정(강한 통과, 통과, 보류, 수정 필요) 네온 뱃지 보드 |
| **📁 Studio CTR 트래커 (Studio)** | 30일 경과 영상 자동 감지 및 YouTube Studio CSV 연동 현황 |
| **🎨 브랜드 디자인 시스템 (Design)** | 컬러 토큰, 폰트, Faceless Explainer 자막 카드 규격 확인 |

---

## 4. 산출물 및 관련 문서

1. **대시보드 서버 스크립트**: [`scripts/youtube-analytics-server.mjs`](../../scripts/youtube-analytics-server.mjs)
2. **브랜드 디자인 시스템 문서**: [`knowledge/brand-dashboard-design-system.md`](../brand-dashboard-design-system.md)
3. **아웃라이어 댓글 분석 도구**: [`scripts/analyze-outlier-comments.mjs`](../../scripts/analyze-outlier-comments.mjs)
4. **시장 수요 점수 산출 도구**: [`scripts/market-demand.mjs`](../../scripts/market-demand.mjs)

---

## 5. 실행 방법

```powershell
npm run analytics
# http://localhost:3001 접속
```
