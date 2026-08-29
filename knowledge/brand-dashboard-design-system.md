# 브랜드 & 대시보드 디자인 시스템 (Brand & HUD Design System)

> **이해하면 쉬운영어 (IHM Easy English)**  
> Faceless Explainer Video & YouTube Analytics Command Center  
> 문서 최종 갱신: 2026-08-29

이 문서는 채널 **'이해하면 쉬운영어'**의 모든 시각 자산(YouTube 썸네일, Faceless Explainer 자막 카드, 데이터 분석 대시보드)에 일관된 브랜드 아이덴티티와 프리미엄 시각 경험을 부여하기 위한 표준 디자인 가이드입니다.

---

## 1. 🌌 디자인 철학 (Design Philosophy)

1. **Cyber-HUD & Control Cockpit (초고밀도 지능형 대시보드)**
   - 피치블랙(Pitch Black) 우주 공간을 배경으로, 데이터와 신호(Signal)가 빛나는 사이버 콕핏 인터페이스.
   - 불필요한 여백 낭비 없이 정보 밀도(Information Density)를 극대화하되, 시각적 계층 구조(Visual Hierarchy)를 엄격히 준수하여 한눈에 스캔 가능하게 구성.

2. **Intuitive Faceless Explainer (직관적 비얼굴 해설 영상)**
   - 모바일 화면에서도 1초 만에 원리가 이해되는 고대비 자막 카드.
   - 규칙을 외우게 하지 않고 "왜 그렇게 들리는지" 시각적·청각적 은유로 전달.

3. **Vibrant Signal Accents (고발광 신호 색상)**
   - 무채색 다크 배경 위에 **네온 마젠타(Neon Magenta)**, **사이버 사이언(Cyber Cyan)**, **일렉트릭 앰버(Electric Amber)**, **레이저 에메랄드(Laser Emerald)**를 신호등처럼 사용하여 사용자의 시선을 즉시 유도.

---

## 2. 🎨 컬러 팔레트 & 디자인 토큰 (Color Tokens)

### 2.1 Background & Surface Colors (배경 및 서피스)
| 토큰명 | HEX Code | CSS Variable | 용도 및 설명 |
|---|---|---|---|
| **Space Black** | `#05070c` | `--bg-space` | 최외곽 메인 배경, 우주 수준의 깊은 블랙 |
| **Cockpit Dark** | `#0a0e17` | `--bg-cockpit` | 좌측 네비게이션 레일, 모달 오버레이 배경 |
| **Card Surface** | `#0e1422` | `--bg-card` | 표준 벤토 카드 기본 서피스 |
| **Card Elevate** | `#141c2e` | `--bg-card-elevated` | 호버 상태, 활성화된 카드 배경 |
| **Line Border** | `#1c273c` | `--border-subtle` | 카드 테두리, 구분선 (1px 미세 테두리) |
| **Line Active** | `#2d3f60` | `--border-active` | 포커스 및 호버 시 테두리 |

### 2.2 Vibrant Neon Accents (핵심 강조 신호색)
| 토큰명 | HEX Code | CSS Variable | 용도 및 설명 |
|---|---|---|---|
| **Neon Magenta** | `#ff2a6d` | `--accent-magenta` | **시그니처 포인트**: 경고, 핫 이슈, 최고 성과, 핵심 알림 (레퍼런스 메인 컬러) |
| **Cyber Cyan** | `#00f0ff` | `--accent-cyan` | **주요 액션**: 버튼, 링크, 통과(Pass), 실시간 연결 상태 |
| **Electric Amber** | `#ffd166` | `--accent-amber` | **주의 & 기회**: 보류(Hold), 기회 점수, 3초 후킹 강조 |
| **Laser Emerald** | `#10b981` | `--accent-emerald` | **강한 성공**: 강한 통과(Strong Pass), 구독 전환 우수 |
| **Pulse Violet** | `#8b5cf6` | `--accent-violet` | **AI & 인텔리전스**: Gemini AI 분석, 쇼츠 Track B 아이디어 |

### 2.3 Typography Neutral Grayscale (텍스트 색상)
| 토큰명 | HEX Code | CSS Variable | 용도 및 설명 |
|---|---|---|---|
| **Text Bright** | `#f8fafc` | `--text-bright` | 1차 헤드라인, 핵심 수치, 강조 텍스트 |
| **Text Normal** | `#cbd5e1` | `--text-normal` | 본문, 카드 라벨, 기본 문장 |
| **Text Muted** | `#64748b` | `--text-muted` | 부가 설명, 타임스탬프, 비활성 라벨 |

---

## 3. 🔤 타이포그래피 규칙 (Typography Scale)

- **헤드라인 & 수치 (Display & Numbers)**: `Outfit`, `Inter`, `system-ui`, sans-serif (굵고 현대적인 기하학적 산세리프)
- **한국어 본문 (Body & Korean)**: `Pretendard`, `"Noto Sans KR"`, sans-serif (높은 가독성과 정갈함)
- **코드 & 시스템 메타데이터 (Mono & Data)**: `JetBrains Mono`, `Fira Code`, monospace

| 크기 명칭 | Font Size | Weight | Line Height | 적용 예시 |
|---|---|---|---|---|
| **Hero Greeting** | 36px ~ 48px | 800 (Bold) | 1.1 | "Good evening, IHM Creator." |
| **Metric Large** | 28px ~ 34px | 900 (Black) | 1.1 | 카드 대형 숫자 (12,450회, 74.2%) |
| **Section Title**| 18px ~ 22px | 700 (Bold) | 1.3 | 패널 섹션 헤더, 탭 제목 |
| **Card Title**   | 14px ~ 16px | 600 (Semi) | 1.4 | 벤토 카드 제목, 영상 제목 |
| **Body Regular** | 13px ~ 14px | 400 (Regular)| 1.6 | 대시보드 본문 설명, 리포트 내용 |
| **Micro Caption**| 11px ~ 12px | 500 (Medium) | 1.4 | 카테고리 태그, 날짜, 서브 뱃지 |

---

## 4. 🧩 UI 컴포넌트 규격 (Component Atoms)

### 4.1 벤토 카드 (Bento Cards)
- **기본 스타일**: `border-radius: 14px; border: 1px solid var(--border-subtle); background: var(--bg-card); padding: 18px;`
- **호버 효과**: `border-color: var(--border-active); transform: translateY(-2px); box-shadow: 0 12px 30px rgba(0,0,0,0.6); transition: all 0.25s ease;`
- **시그니처 마젠타 타일**: 배경에 마젠타 그라데이션 적용 (`background: linear-gradient(145deg, #40081d 0%, #16040b 100%); border-color: #ff2a6d;`)

### 4.2 미니 스파크라인 (Mini Sparklines)
- SVG 폴리라인 기반 초경량 꺾은선/영역 차트
- 그라데이션 필(`linear-gradient`)과 글로우 필터(`drop-shadow(0 0 6px rgba(255,42,109,0.5))`) 적용

### 4.3 펄스 인디케이터 & 뱃지 (Pill Badges)
- **연결 상태 (Live Online)**: 에메랄드 원형 펄스 점 + `LIVE CONNECTED`
- **판정 뱃지 (Decision Pills)**:
  - Strong Pass: `#10b981` (그린 글로우)
  - Pass: `#00f0ff` (사이언)
  - Hold: `#ffd166` (앰버)
  - Revise: `#ff2a6d` (마젠타)

### 4.4 1-클릭 클립보드 복사 버튼 (Copy Buttons)
- 클릭 시 버튼 내 텍스트가 `✓ 복사됨`으로 1.5초간 즉시 변환되며 토스트 알림 발송

---

## 5. 🎬 Faceless Explainer & HyperFrames 디자인 일체화 규칙

1. **자막 카드와 대시보드의 폰트 및 대비 통일**
   - Faceless 영상 내 핵심 자막 카드는 어두운 배경 + 고대비 볼드 폰트를 사용하여 대시보드의 직관성과 동일한 룩앤필을 유지합니다.
2. **발음 강조색 규칙**
   - 발음의 변화/축약/연음 규칙 설명 시 **사이언(`#00f0ff`)**은 기준/원형, **마젠타(`#ff2a6d`)**는 실제 들리는 소리/주의점에 대응하여 영상과 대시보드의 인지 모델을 일치시킵니다.
3. **3단계 시청자 심리 모델 유지**
   - **Visual Stun Gun (시각적 충격/호기심)** → **Value Hunting (원리 해결)** → **Visual Validation (실전 적용)**

---

## 6. 🚀 재사용 가이드 (How to Reuse)

새로운 UI 컴포넌트나 웹 페이지, 영상 템플릿을 제작할 때는 항상 본 문서의 CSS 변수 토큰(`--bg-space`, `--accent-magenta`, `--accent-cyan`)을 사용하십시오.
