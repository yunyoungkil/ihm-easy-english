---
version: alpha
name: Understand-English EP12 — Frame (video / frame layer)
description: >
  EP11(GONNA)에서 만든 frame.md를 그대로 재사용 — EP11과의 시각적 일관성을 위해 채널 브랜드 토큰
  (다크 네이비 그라운드, 세 기능색 강조 시스템, Black Han Sans 디스플레이)을 바꾸지 않는다. 팔레트·
  타이포·컴포넌트는 EP11과 100% 동일. "Frame Treatments"의 씬 매핑만 이 편(10프레임)에 맞게
  다시 배정했다.
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

spacing:
  pad-x: "6cqw"
  pad-y: "6cqw"
  gap-cards: "2cqw"
  accent-line: "80px × 5px"
  caption-keep-out-bottom: "12cqh"

components:
  hero-word-block:
    typography: "{typography.hero-word}"
    description: "한 편 안에서 반복 등장하는 영어 단어(Want / Won't)를 크게, 중앙 또는 좌측 앵커. 음절별 색칠은 {colors.accent-stress}(강세), {colors.accent-exception}(예외), {colors.text}(그 외) — 네 번째 색 금지."
  pron-caption:
    typography: "{typography.pron-sub}"
    description: "hero-word-block 바로 아래 한글 발음 표기, 항상 {colors.accent-pronunciation}."
  mouth-shape-diagram:
    backgroundColor: "#050b16"
    border: "6px solid {colors.accent-*}"
    rounded: "24px"
    description: "이 편 전용 컴포넌트 — Want(턱 벌어짐)와 Won't(입술 오므림)의 실제 입모양 차이를
      보여주는 정사각형 영상 창(둥근 테두리, Want=노랑/Won't=파랑 accent). **2026-09-03 변경**:
      처음엔 '사진/일러스트가 아니라 도형으로 추상화'로 설계했으나, 이미 이 목적으로 촬영해둔 실사
      B롤(`assets/broll/want-jaw-drop.mp4`, `wont-lip-round.mp4` — 입 클로즈업, 얼굴 비노출,
      각 10초)이 있다는 걸 뒤늦게 반영 — 실제 입모양을 직접 보여주는 게 도형 근사보다 강하다는
      판단(사용자 지적으로 발견). Frame 3에서 구현 완료(`compositions/frames/03-mechanism.html`).
      ⚠️ **화면 노출 시간(16~26초)이 원본 길이(10초)보다 길 때 주의**: 영상을 한 번만
      자연 재생(~8.6초)한 뒤, 같은 크롭·위치의 **CSS `background-image`**(정지 이미지 하나)로
      넘겨서 나머지 시간을 채운다. 시도했다가 버린 방법 둘: (1) 같은 영상을 여러 개 이어 붙여
      반복처럼 보이게 하기 — 렌더 중 디코더가 가끔 검은 화면을 냄. (2) `<img>` 태그로 정지 이미지
      전환 — 타임라인 중간에 등장하는 `<img>`가 가끔 로딩이 안 된 채로 캡처됨(둘 다 이 프로젝트의
      단일 워커 렌더 환경에서 확인, `.transcode-cache/`도 새 인코딩 후 지워야 반영됨). CSS
      배경 이미지는 8회 반복 검증 전부 안정적으로 통과. Frame 6·7의 '미니 버전 회수'도 같은 영상을
      작게 재사용하는 쪽으로 통일하는 게 자연스러움 — 아직 미반영(다음에 처리)."
  sentence-card:
    backgroundColor: "{colors.card-bg}"
    border: "2px solid {colors.border}"
    rounded: "{radii.card-md}"
    typography: "두 줄 — 영어 문장 {typography.body} {colors.text}, 그 아래 한글 발음 표기 {typography.pron-sub} 스케일(더 작게, {colors.accent-pronunciation})"
    description: "예문은 항상 영어 스펠링 + 한글 발음 표기를 같이 보여준다 — 한글만 단독 노출 금지. 타겟 단어(Want/Won't)는 노랑으로 인라인 색칠."
  compare-pair:
    backgroundColor: "{colors.card-bg}"
    rounded: "{radii.card-lg}"
    description: "Want vs Won't 좌우 대조 카드. 왼쪽(Want)은 노랑 rule, 오른쪽(Won't)은 파랑 rule — EP11의 정답/예외(노랑/빨강) 매핑과 다르다는 점 주의: 이 편은 '둘 다 정답, 다른 소리'라 빨강(예외)을 쓰지 않는다."
  progress-rail:
    backgroundColor: "rgba(245,197,24,0.15)"
    fill: "{colors.accent-stress}"
    rounded: "4px"
    size: "3px tall, top edge, width grows with scene index"
    description: "EP11과 동일 — 전 씬 공통 상단 진행 바."
  caption-pill:
    backgroundColor: "rgba(10,21,38,0.92)"
    textColor: "{colors.text}"
    rounded: "{radii.pill}"
    typography: "{typography.body}"
    description: "나레이션 캡션, 단어 단위 발화 시점 하이라이트(노랑). EP11과 동일."
---

# Understand-English Season2 — Frame (video / frame layer) — EP12 적용

## Overview — EP11과 다른 점만 기록

팔레트·타이포·기본 컴포넌트(hero-word-block, pron-caption, sentence-card, progress-rail,
caption-pill)는 EP11 `frame.md`와 **완전히 동일**하다 — EP11과의 시각적 일관성이 이 편의 명시적
요구사항(`BRIEF.md`)이기 때문이다. 아래만 이 편 고유의 확장:

1. **`mouth-shape-diagram`(신규 컴포넌트)** — 이 편의 핵심 메커니즘("턱을 얼마나 벌리는지")은
   EP11의 "NG+T→GONNA 칩 스트립"과 달리 **시각적으로 그려야 직관적인 내용**이다. 두 개의 단순
   타원/원 도형으로 "입이 크게 벌어짐"(Want) vs "입술이 오므라듦"(Won't)을 표현 — 실사 사진이나
   복잡한 일러스트 금지(faceless 원칙 유지, EP11의 "no-particle-effects" 교훈과 같은 이유로
   범용 장식이 아니라 이 내용에만 존재하는 그림이어야 함).
2. **`compare-pair`의 색 의미가 EP11과 다르다** — EP11은 "맞는 경우(노랑)/예외(빨강)"였지만,
   이 편은 Want·Won't 둘 다 정답인 대조라 **왼쪽 Want=노랑, 오른쪽 Won't=파랑**(발음색을 그대로
   가져와 "이것도 소리 얘기"라는 의미 유지)으로 재정의. 빨강(예외색)은 Line 5(반전 꿀팁: Won't는
   잘 안 줄어든다)에서만 제한적으로 사용 — "예상과 다른 예외적 사실"이라는 원래 의미를 지킨다.
3. 나머지(카드 넘침 방지, 컨테이너 쿼리, 그림자 없이 테두리 글로우, 4번째 강조색 금지 등 모든
   Composition Rules)는 EP11 `frame.md`를 그대로 따른다 — 전문은
   `videos/ep11-longform-faceless/frame.md` 참고.

## Frame Treatments — 이 편(10프레임) 매핑

### 1 · Hook (Frame 1 — Stakes)

EP11 "1 · Hook/Cover"와 동일 처리. 네이비+중앙 글로우, h1 두 줄 순차 등장(질문에서 멈춤).

### 2 · Word Reveal (Frame 2 — Big Question + Head Fake)

EP11 "2 · Word Reveal"과 동일 처리. "정답은 발음 기호가 아닙니다" eyebrow → 이 편 고유의
반전 공개는 다음 프레임(mouth-shape-diagram)이 대신하므로, 여기선 텍스트만(다이어그램은
Frame 3에서).

### 3 · Mechanism Diagram (Frame 3 — 메커니즘) — 신규 트리트먼트

**Ground** 네이비, 좌우 분할. **Composes** 2× `mouth-shape-diagram`(좌: 크게 벌어진 타원+"Want",
우: 오므라든 원+"Won't") + 짧은 설명 텍스트. **Focal** 두 도형의 벌어짐 정도 차이 그 자체.
**Chrome** progress-rail. **Accent** 좌측 도형 노랑 외곽선, 우측 도형 파랑 외곽선. **Silence** 45%
(도형이 주인공이라 텍스트는 최소). **Density** standard. → Scene 3 전용.

### 4 · Sentence Stack (Frame 4 — 실제 문장 확인)

EP11 "4 · Sentence Stack"과 동일 처리(anchor+list 존 레이아웃). sentence-card 4~6개 순차 스택.

### 5 · Exception Beat (Frame 5 — 반전 꿀팁)

EP11 "5 · Compare Pair"를 변형 — 이번엔 좌우 대조가 아니라 **Won't 하나만 남기고 강조**(Want to→
워너로 줄어드는 애니메이션이 사라지듯 페이드되고, Won't만 또렷하게 남는 연출). **Accent** 이 프레임만
예외적으로 accent-exception 빨강을 짧게 사용(예상 밖의 사실이라는 신호).

### 6 · Word Reveal — Quiz (Frame 6 — 미니 예측 퀴즈)

EP11 "2 · Word Reveal"과 동일 처리(퀴즈 정답 공개 패턴).

### 7 · Sentence Stack — Listening (Frame 7 — 리스닝 트레이닝)

EP11 "4 · Sentence Stack"과 동일 처리 + anchor 없이 4문장이 순서대로. **이 프레임만 오디오가
2단계 조립**(SCRIPT.md 참고) — 자막/타이밍도 조립된 오디오 기준으로 다시 맞출 것.

### 8 · Practice/Closing (Frame 8 — 따라 말해보기)

EP11 "6 · Practice/Closing"과 동일 처리.

### 9 · Hook 변형 (Frame 9 — 실생활 재확인)

EP11 "1 · Hook/Cover"의 저밀도 변형 — h2 톤, 정지해서 읽히는 홀드.

### 10 · Practice/Closing — Rehook (Frame 10 — 요약+Rehook)

EP11 "6 · Practice/Closing"의 Rehook 변형과 동일 처리 — 의도적으로 안 닫힌 채 정지, 마지막 문장은
"WANT TO" 텍스트가 짧게 강조(다음 편 예고).

## Numerals & Claims

발음·강세 규칙은 전부 `SCRIPT.md`의 확정 원고에서만 가져온다 — 원고에 없는 예외나 규칙을 프레임
단계에서 새로 지어내지 않는다. (핵심 주장: Want=/ɑː/ 개모음/턱 벌어짐, Won't=/oʊ/ 이중모음/입술
오므림 — 이 음성학적 차이는 `SCRIPT.md` Line 3에서 이미 검증된 설명이다.)

## Known Gaps

- `mouth-shape-diagram`은 이 프로젝트에서 처음 쓰는 신규 컴포넌트라 `build-frame.mjs` 자동
  검증을 거치지 않았다 — Step 4/5 실제 프레임 제작 중 색·비율이 깨지면 이 파일을 직접 고친다.
- 세로형(9:16)은 EP11과 마찬가지로 설계하지 않았다.
