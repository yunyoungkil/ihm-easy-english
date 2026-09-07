---
version: alpha
name: Understand-English EP14 — Frame (video / frame layer)
description: >
  EP11~13이 검증한 frame.md를 그대로 재사용 — 채널 브랜드 토큰(다크 네이비 그라운드, 세 기능색
  강조 시스템, Black Han Sans 디스플레이)을 바꾸지 않는다. 팔레트·타이포·기존 컴포넌트는 100%
  동일. 이 편의 핵심 메커니즘("자음+모음이 만나면 소리가 이어 붙는다" — 링킹·탄설음·약화 세 가지
  하위 현상)에 맞춰 신규 컴포넌트 `linking-diagram`/`letter-tag`를 추가하고, "Frame Treatments"의
  씬 매핑을 이 편(12프레임)에 맞게 다시 배정했다.
unit: the frame — 1920×1080 primary (this project is 16:9 longform only)
principle: atoms are sacred · composition is free · every color has a teaching meaning, not a mood

colors:
  bg: "#0A1526"
  bg-glow-center: "#12203A"
  surface: "#12203A"
  text: "#FFFFFF"
  text-muted: "#A9B4C4"
  accent-stress: "#F5C518"
  accent-pronunciation: "#008EFF"
  accent-exception: "#FF0000"
  border: "rgba(245,197,24,0.25)"
  card-bg: "rgba(18,32,58,0.85)"

radii:
  card-lg: "20px"
  card-md: "14px"
  pill: "100px"
  circle: "50%"

typography:
  body:      { fontFamily: "Noto Sans KR", cqw: 1.6, weight: 700, lineHeight: 1.5, color: "text" }
  label:     { fontFamily: "Noto Sans KR", cqw: 1.0, weight: 700, tracking: "0.02em", color: "text-muted" }
  eyebrow:   { fontFamily: "Noto Sans KR", cqw: 1.1, weight: 900, tracking: "0.04em", upper: true, color: "accent-stress" }
  h2:        { fontFamily: "Black Han Sans", cqw: 3.2, weight: 400, lineHeight: 1.15, color: "text" }
  h1:        { fontFamily: "Black Han Sans", cqw: 5.5, weight: 400, lineHeight: 1.05, color: "text" }
  hero-word: { fontFamily: "Black Han Sans", cqw: 9.0, weight: 400, lineHeight: 1.0, color: "text" }
  pron-sub:  { fontFamily: "Noto Sans KR", cqw: 1.8, weight: 700, color: "accent-pronunciation" }
  letter-tag: { fontFamily: "Noto Sans KR", cqw: 0.9, weight: 700, color: "text-muted" }

spacing:
  pad-x: "6cqw"
  pad-y: "6cqw"
  gap-cards: "2cqw"
  accent-line: "80px × 5px"
  caption-keep-out-bottom: "12cqh"

components:
  hero-word-block:
    typography: "{typography.hero-word}"
    description: "채널 공통 컴포넌트(EP11~13과 동일) — 영어 단어/문구 하나를 화면 지배적으로. 음절별 색은 {colors.accent-stress}(강세)/{colors.accent-exception}(예외)/{colors.text}(기본)만."
  pron-caption:
    typography: "{typography.pron-sub}"
    description: "채널 공통 컴포넌트(EP11~13과 동일) — hero-word-block 아래 한글 발음 표기, 항상 {colors.accent-pronunciation}."
  linking-diagram:
    backgroundColor: "transparent"
    description: "이 편의 핵심 메커니즘(두 단어가 만나는 경계에서 소리가 붙거나 바뀐다)을 보여주는 신규 컴포넌트. 단어 카드 2개를 가로로 배치하고, 각 카드 글자 밑에 letter-tag(자/모/무음)를 붙인다. 경계선(뒷 단어 시작 지점)을 얇은 세로 점선으로 표시. 이어지는 두 글자(앞 단어 끝소리 + 뒷 단어 첫소리)만 {colors.accent-stress} 배경으로 하이라이트되고, 그 두 글자가 서로를 향해 움직이며 결과 발음(pron-caption)이 아래에 조립되어 뜬다. 세 가지 모션 변형이 있다(아래 참고)."
  letter-tag:
    typography: "{typography.letter-tag}"
    description: "linking-diagram의 각 글자 바로 밑에 붙는 아주 작은 라벨 — '자'(자음)/'모'(모음)/'무음'(안 읽히는 글자, 예: MADE의 E) 중 하나. 이어지는 지점의 두 글자만 {colors.accent-stress}로, 나머지는 {colors.text-muted}로 낮춘다. 왕초보가 철자만 보고는 자음·모음을 바로 못 알아볼 수 있다는 전제로 추가됨(EP14 확정, 2026-09-07)."
  linking-diagram--slide:
    description: "모션 변형 1 — **자음이 뒤 단어 모음 쪽으로 슬라이드해서 붙는다.** 앞 단어 끝 자음 글자가 물리적으로 이동해 뒷 단어 카드 앞에 흡수되는 애니메이션. Frame 5(AN APPLE), Frame 8·10의 TURN ON/CHECK OUT/GET IT/PUT IT(기본 패턴 문항)에 쓴다."
  linking-diagram--bounce:
    description: "모션 변형 2 — **경계 글자가 통통 튕긴다(탄설음/flap).** 이동하지 않고 제자리에서 공이 튀는 듯한 모션 후 발음이 'ㄹ'로 바뀌어 뜬다. 이동이 아니라 '성질이 바뀐다'는 걸 모션으로 구분한다(슬라이드와 시각적으로 명확히 달라야 함). Frame 7(MADE IT), Frame 8·10의 GET IT/PUT IT(반전 패턴 문항)에 쓴다. 강조색은 {colors.accent-exception}(빨강, 예외 신호)."
  linking-diagram--shrink:
    description: "모션 변형 3 — **가운데 단어가 작아지며 앞뒤 사이로 스며든다(약화/weak form).** letter-tag 라벨링은 적용하지 않는다(WERE WE처럼 경계 글자가 단일 자음+모음 쌍으로 안 떨어지는 경우 전용). Frame 6(WHERE WERE WE)에만 쓴다."
  sentence-card:
    backgroundColor: "{colors.card-bg}"
    border: "2px solid {colors.border}"
    rounded: "{radii.card-md}"
    typography: "two lines — English sentence {typography.body} in {colors.text}, Korean phonetic transcription directly below in {typography.pron-sub} scale"
    description: "채널 공통 컴포넌트(EP11~13과 동일) — 예문 한 줄, 영어+한글 발음을 항상 같이. 연결되는 부분만 인라인 색칠. Frame 9(리스닝 트레이닝) 4개 문장 스택에 쓴다."
  step-badge:
    backgroundColor: "{colors.accent-stress}"
    textColor: "{colors.bg}"
    rounded: "{radii.circle}"
    size: "72px"
    typography: "Black Han Sans, number only"
    description: "채널 공통 컴포넌트(EP11~13과 동일) — 번호 원. Frame 8 퀴즈 4문항 순서 표시."
  progress-rail:
    backgroundColor: "rgba(245,197,24,0.15)"
    fill: "{colors.accent-stress}"
    rounded: "4px"
    size: "3px tall, top edge, width grows with scene index"
    description: "채널 공통 컴포넌트(EP11~13과 동일) — 12프레임 내내 유지되는 상단 진행 바."
  caption-pill:
    backgroundColor: "rgba(10,21,38,0.92)"
    textColor: "{colors.text}"
    rounded: "{radii.pill}"
    typography: "{typography.body}"
    description: "채널 공통 컴포넌트(EP11~13과 동일) — 나레이션 캡션, 발화 중인 단어만 노랑 하이라이트."
---

# Understand-English EP14 — Frame (video / frame layer)

> 아래 Overview/Colors/Typography/Depth/Shapes는 EP11~13이 검증한 토큰을 그대로 물려받은 배경
> 설명이다. **이 편의 실제 씬별 적용은 맨 아래 "Frame Treatments"만 참고할 것** — 거기는 EP14의
> 12씬으로 새로 배정했다.

## Overview

색은 무드가 아니라 의미다 — 노랑(강세/정답/기본 패턴), 파랑(발음), 빨강(예외)이 EP11부터 고정된
채널 규약이며 이 편도 그대로 따른다. 이 편의 차이점은 **`linking-diagram`** 하나다 — EP13의
`sound-blend-diagram`이 "한 단어 안에서 글자들이 이어 붙는" 걸 보여줬다면, 이 편은 **"두 단어의
경계에서 소리가 이어지거나 바뀌는"** 걸 보여줘야 해서, 단어 카드 2개 + 경계선 + letter-tag 구조로
신규 설계했다.

**언어학적 정확성 우선**: 이 편은 검수 과정에서 실제로 두 번 사실 오류가 잡혔다(MADE IT의 T→D
정정, WHERE WE가 AN APPLE과 다른 메커니즘이라는 정정 — `SCRIPT.md` Frame 7·6 코멘트 참고). 그래서
`linking-diagram`은 **세 가지 별개 모션 변형**(slide/bounce/shrink)을 갖는다 — 세 현상을 같은
모션으로 뭉뚱그리면 다시 부정확해진다. 프레임을 만들 때 SCRIPT.md의 해당 Frame이 정확히 어떤
변형인지 반드시 확인할 것.

## The Frame

### Frame Craft Bar

- **Squint** — 씬마다 히어로 단어/linking-diagram 하나가 화면을 지배한다.
- **Silence** — sentence-card가 쌓이는 Frame 9만 밀도가 높고, 나머지는 여백이 넉넉하다.
- **Restraint** — 세 기능색 외 색을 쓰지 않는다.
- **Reference** — EP11~13과 동일한 신뢰형 톤.

- **Primary:** 1920×1080 (16:9), 세로형 없음.
- **Safe area:** `pad-x` 6cqw, 하단 캡션 keep-out(`12cqh`).
- **컨테이너 법칙**: `container-type: size`, 모든 상대 단위는 `cqw`/`cqh`.

## Colors

EP11~13과 동일 — `{colors.accent-stress}` 노랑(강세/정답/기본 패턴 링킹), `{colors.accent-pronunciation}`
파랑(발음 표기), `{colors.accent-exception}` 빨강(탄설음 예외). `linking-diagram--bounce`(MADE
IT, GET IT, PUT IT)만 빨강 강조를 쓰고, `linking-diagram--slide`(AN APPLE, TURN ON, CHECK OUT)는
노랑 강조를 쓴다 — 색으로도 "이게 기본 패턴인지 예외인지" 즉시 구분되게 한다.

## Typography

EP11~13과 동일한 3계층(읽기/한글 디스플레이/영어 히어로 Archivo Black) + `letter-tag`(0.9cqw,
회색/노랑 전환)만 신규. letter-tag는 로드베어링 텍스트가 아니라 보조 라벨이므로 1.4cqw 하한 규칙
예외 — 단, 최소 20px 이상은 유지해서 1920×1080 기준으로도 읽히게 한다.

## Depth & Surface

EP11~13과 동일 — 테두리 글로우, 그림자 없음.

## Shapes

EP11~13과 동일.

## Components

- **linking-diagram / letter-tag**(EP14 신규) — 이 편의 핵심 메커니즘. Frame 5(AN APPLE, slide)·
  6(WHERE WERE WE, shrink)·7(MADE IT, bounce)·8(퀴즈 4문항, slide×2+bounce×2)·10(따라 말하기,
  Frame 8과 동일 구성 반복)에서 쓴다.
- **hero-word-block / pron-caption** — Frame 4(반전 공개 "힘을 빼면, 소리가 이어집니다") 키워드
  공개, Frame 12(요약) 카드 스택에 쓴다.
- **sentence-card** — Frame 9(리스닝 트레이닝) 영어 문장 4개 스택.
- **step-badge** — Frame 8(퀴즈 4문항) 순서 표시.
- **progress-rail** — 전 씬 공통.
- **caption-pill** — 나레이션 캡션.

## Frame Treatments

> Recipe: ground · composes · focal · chrome · accent · silence · density.
> EP14는 12개 Frame — Frame N은 `SCRIPT.md`/`STORYBOARD.md`의 Line N(Frame N)과 1:1 대응.

### 1 · Hook / Cover (open · move: 문장이 흐려지는 모션)

**Ground** 네이비 + 중앙 라디얼 글로우. **Composes** "Where were we?" 문장(흐려짐), 물음표.
**Focal** 문장이 또렷했다가 뭉개지는 순간. **Chrome** progress-rail(0%). **Accent** 텍스트 흰색.
**Silence** 65%. **Density** low. → Frame 1(Stakes — Frame 11과 대칭 페이오프 예정).

### 2 · Word Reveal (open · move: 로고 페이드인)

**Ground** 네이비. **Composes** 채널 워드마크. **Focal** 워드마크. **Chrome** progress-rail.
**Silence** 70%. **Density** low. → Frame 2(채널 인트로).

### 3 · Question Cards (explain · move: 단어 카드가 딱딱 끊어져 나열)

**Ground** 네이비. **Composes** 짧은 영어 단어 카드 여러 개(끊어진 느낌 강조), 질문 문구.
**Focal** 마지막 질문에서 화면이 어두워짐. **Chrome** progress-rail. **Silence** 55%. **Density**
low. → Frame 3(Big Question).

### 4 · Word Reveal — Head Fake (reveal · move: 앰버 톤 전환 + 문구 페이드인)

**Ground** 네이비 → 앰버 톤. **Composes** hero-word-block급 "힘을 빼면, 소리가 이어집니다" 문구.
**Focal** 톤 전환 순간. **Chrome** progress-rail. **Accent** 노랑. **Silence** 60%. **Density**
low. → Frame 4(Head Fake).

### 5 · Linking Diagram — Slide(EP14 신규, mechanism · move: 자음 글자가 슬라이드해서 뒷 모음에 흡수)

**Ground** 네이비. **Composes** 2× 단어 카드(AN / APPLE) + letter-tag 전체 + 경계 하이라이트.
**Focal** N이 APPLE 카드 앞으로 슬라이드해 합쳐지는 순간. **Chrome** progress-rail. **Accent**
노랑(경계 글자 하이라이트). **Silence** 45%. **Density** standard. → Frame 5(원리 설명, AN APPLE).

### 6 · Linking Diagram — Shrink(EP14 신규, mechanism · move: 가운데 카드가 작아지며 스며듦)

**Ground** 네이비. **Composes** 3× 단어 카드(WHERE / WERE / WE), letter-tag 없음. **Focal** WERE
카드가 작아지고 흐려지며 WHERE·WE 사이로 압축되는 순간. **Chrome** progress-rail. **Accent** 노랑
(전체 원리는 여전히 같은 색 계열 — 예외가 아니라 패턴 확장이므로). **Silence** 50%. **Density**
standard. → Frame 6(패턴 확장, WHERE WERE WE).

### 7 · Linking Diagram — Bounce(EP14 신규, twist · move: 경계 글자가 통통 튕김)

**Ground** 네이비. **Composes** 2× 단어 카드(MADE / IT) + letter-tag 전체 + 경계 하이라이트(빨강).
**Focal** D 글자가 튕기며 'ㄹ' 소리로 바뀌는 순간. **Chrome** progress-rail. **Accent** 빨강(예외
신호). **Silence** 50%. **Density** standard. → Frame 7(반전 꿀팁, MADE IT).

### 8 · Quiz Sequence(mechanism-recall · move: 문항마다 linking-diagram 축소판 반복)

**Ground** 네이비. **Composes** step-badge(1-4) + 질문 문구 → 짧은 정지 → linking-diagram 축소판
정답 공개, 4문항 반복(앞 2문항 slide/노랑, 뒤 2문항 bounce/빨강). **Focal** 매 정답 공개 순간.
**Chrome** progress-rail. **Silence** 첫 문항 55%, 이후 문항 35%. **Density** standard→dense. →
Frame 8(미니 퀴즈).

### 9 · Sentence Stack (examples · move: cards stagger up one at a time)

**Ground** 네이비, `pad-x`. **Composes** 4× sentence-card(영어+한글 발음), 세로 스택. **Focal**
연결 부분만 인라인 색칸. **Chrome** progress-rail. **Silence** dense-exception. **Density**
dense-exception. → Frame 9(리스닝 트레이닝).

### 10 · Practice Repeat (prompt · move: linking-diagram이 느리게→빠르게 2회 조립)

**Ground** 네이비. **Composes** h2 프롬프트 + Frame 8과 동일한 linking-diagram 축소판 4종, 매
표현 2회 조립(느리게→빠르게). **Focal** 조립 완료 후 pulse. **Chrome** progress-rail. **Silence**
50%. **Density** standard. → Frame 10(따라 말해보기).

### 11 · Payoff — Symmetric Close (benefit · move: Frame 1과 같은 문장이 이번엔 선명하게 맞춰짐)

**Ground** 네이비. **Composes** "Where were we?" 문장이 확대되며 단어별로 밝아지다 합쳐짐(Frame
1의 뭉개짐과 정반대 방향 모션). **Focal** 완전히 선명해지는 순간. **Chrome** progress-rail.
**Accent** 노랑. **Silence** 55%. **Density** low. → Frame 11(실생활 재확인 — Frame 1 콜백).

### 12 · Summary Cards (close · move: 오늘 다룬 표현 카드가 쌓이며 등장, 로고 페이드아웃)

**Ground** 네이비 + 웜 앰버 전환. **Composes** AN APPLE·WHERE WERE WE·MADE IT·TURN ON/CHECK
OUT/GET IT/PUT IT 카드 스택(EP13처럼 전부 화면에 남김) + "힘을 빼면, 소리가 이어집니다" 문구 +
채널 로고. **Focal** 카드 스택 전체 후 로고. **Chrome** progress-rail(100%). **Silence** 60%.
**Density** low→standard. → Frame 12(요약+마무리). **마지막 3초는 우측 하단·중앙 상단 엔드스크린
키프아웃 영역을 비운다**(`production-rules.md` 2026-09-07 규칙, SCRIPT.md Frame 12 참고).

## Composition Rules

### Do

- 매 씬 `{colors.bg}` 네이비에서 시작하고, 세 기능색만 강조로 쓴다.
- `linking-diagram`을 쓸 때 세 모션 변형(slide/bounce/shrink) 중 SCRIPT.md가 지정한 것과 정확히
  일치하는지 확인한다 — 섞어 쓰면 "T가 아니라 D가 튕긴다" 같은 오류가 다시 생길 수 있다.
- letter-tag는 경계 글자 두 개만 강조하고 나머지는 낮춘 채도로 — 화면이 라벨로 뒤덮이지 않게.
- 진행 바는 모든 씬에 유지한다.
- Frame 9(리스닝)은 EP13의 anchor+list 대신 **sentence-card 세로 스택**을 쓴다(EP14는 고정
  앵커 단어가 없고 예문 4개가 각자 다른 연결 패턴을 보여주므로 EP13 레이아웃을 그대로 가져오지
  않는다 — 콘텐츠 모양이 다르면 레이아웃도 다시 판단할 것, `production-rules.md` 원칙).

### Don't

- 네 번째 강조색을 추가하지 않는다.
- WHERE WE(Frame 6)에 letter-tag를 억지로 붙이지 않는다 — WE가 자음 W로 시작해 단일 글자 매칭이
  안 맞는다(SCRIPT.md Frame 6 언어학적 검증 참고).
- 탄설음(bounce) 예시와 링킹(slide) 예시를 같은 모션으로 그리지 않는다 — 시청자가 색·모션만
  보고도 "이건 기본 패턴", "이건 예외"를 구분해야 한다.
- 카드가 넘치면 CSS `transform: scale()`로 줄이지 않는다.

## Aspect-Ratio Behavior

1920×1080 16:9 하나만 만든다. 세로형 버전은 계획에 없다.

## Approved Entities

실제 로고·상표 없음. 채널명 "이해하면 쉬운영어"는 텍스트 워드마크로만 등장(엔드스크린/클로징
씬). 실사 없음 — faceless.

## Numerals & Claims

발음·연결 규칙은 전부 `SCRIPT.md`의 확정 원고(와 그 안의 언어학적 검증 각주)에서만 가져온다 —
원고에 없는 예외나 규칙을 프레임 단계에서 새로 지어내지 않는다.

## Pre-Render Self-Audit

- **Squint** — 씬마다 지배적 요소 하나가 있는가.
- **Color discipline** — 노랑/파랑/빨강 외 강조색이 없는가.
- **Motion discipline** — slide/bounce/shrink가 SCRIPT.md 지정과 정확히 일치하는가(특히 Frame
  6·7 — 이미 한 번 사실 오류가 났던 프레임).
- **Legibility** — 로드베어링 텍스트 1.4cqw 이상, letter-tag 최소 20px.
- **Depth** — 그림자 없이 테두리 글로우만.
- **Progress** — progress-rail이 씬 인덱스에 맞게 채워지는가.
- **Fabrication** — 모든 발음·연결 규칙 진술이 SCRIPT.md에 근거하는가.
- **Endscreen keep-out** — Frame 12 마지막 3초에 우측 하단·중앙 상단 영역이 비어 있는가(픽셀
  단위 확인, `production-rules.md` 참고).

## Known Gaps

- `linking-diagram`은 EP14에서 처음 만드는 bespoke 컴포넌트라 실제 HTML/CSS 구현 시 색·타이포
  매핑이 깨지는 곳이 있으면 이 파일을 직접 고친다.
- 세로형(9:16) 대응은 설계하지 않았다.
