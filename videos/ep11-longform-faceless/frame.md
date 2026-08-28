---
version: alpha
name: Understand-English Season2 — Frame (video / frame layer)
description: >
  Bespoke frame system for 「이해하면 쉬운영어」 시즌2, built from the channel's own validated brand
  tokens (dark navy ground, three functional accent colors, Black Han Sans display) rather than a
  shipped frame-preset — no preset matched a dark ground with a 3-color pedagogical highlighting
  system. The unit is the frame (1920×1080, 16:9 longform). Atoms are sacred; composition per scene
  is free; example sentences and figures come from the script.
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
  # — reading ramp: narration captions, labels —
  body:      { fontFamily: "Noto Sans KR", cqw: 1.6, weight: 700, lineHeight: 1.5, color: "text" }
  label:     { fontFamily: "Noto Sans KR", cqw: 1.0, weight: 700, tracking: "0.02em", color: "text-muted" }
  eyebrow:   { fontFamily: "Noto Sans KR", cqw: 1.1, weight: 900, tracking: "0.04em", upper: true, color: "accent-stress" }
  # — display ramp: hero words, headlines, quiz answers —
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
    description: "The single invented visual every explainer-style video needs: one English word/phrase, huge, center or left-anchored. Per-syllable color spans use {colors.accent-stress} for the stressed syllable, {colors.accent-exception} for an exception sound, {colors.text} otherwise — never a fourth color."
  pron-caption:
    typography: "{typography.pron-sub}"
    description: "Korean pronunciation spelling directly under a hero-word-block, e.g. '거너'. Always {colors.accent-pronunciation} — this color means 'this is how it sounds', consistently, everywhere in the system."
  sentence-card:
    backgroundColor: "{colors.card-bg}"
    border: "2px solid {colors.border}"
    rounded: "{radii.card-md}"
    typography: "two lines — English sentence {typography.body} in {colors.text}, Korean phonetic transcription directly below in {typography.pron-sub} scale (smaller, {colors.accent-pronunciation})"
    description: "Every example sentence shows BOTH the real English spelling AND its Korean phonetic transcription — never Korean alone. Same pairing logic as hero-word-block/pron-caption, just at sentence scale. The target reduction word is color-coded on BOTH lines (yellow if it's the stressed/answer word, consistent with the rest of the system). Stacks vertically for Scenes with multiple examples."
  compare-pair:
    backgroundColor: "{colors.card-bg}"
    rounded: "{radii.card-lg}"
    description: "Two sentence-cards side by side (or stacked on a tight frame), one marked correct (thin {colors.accent-stress} left-rule) and one marked exception/doesn't-apply (thin {colors.accent-exception} left-rule with a small X glyph). Never a red fill — line + glyph only, text stays legible."
  step-badge:
    backgroundColor: "{colors.accent-stress}"
    textColor: "{colors.bg}"
    rounded: "{radii.circle}"
    size: "72px"
    typography: "Black Han Sans, number only"
    description: "Numbered circle (하나/둘 or 1/2) for the two-part mechanism breakdown in Scene 4."
  progress-rail:
    backgroundColor: "rgba(245,197,24,0.15)"
    fill: "{colors.accent-stress}"
    rounded: "4px"
    size: "3px tall, top edge, width grows with scene index"
    description: "Persistent thin progress strip across the full 13-scene runtime — the one piece of chrome carried over from the legacy CardScene system's progress dots, simplified to a single bar."
  caption-pill:
    backgroundColor: "rgba(10,21,38,0.92)"
    textColor: "{colors.text}"
    rounded: "{radii.pill}"
    typography: "{typography.body}"
    description: "Spoken-narration caption, bottom third, respects caption-keep-out-bottom. The word actually being spoken highlights {colors.accent-stress} for the duration it's spoken (word-level karaoke), matching the legacy useSpeechEmphasis behavior."
---

# Understand-English Season2 — Frame (video / frame layer)

## Overview

이 시스템은 프리셋에서 시작하지 않았다 — 13개 shipped 프리셋 전부가 밝은 캔버스 + 단일 강조색 원칙이라,
다크 배경 + **세 가지 기능색**(강세=노랑, 발음=파랑, 예외=빨강)을 쓰는 우리 채널의 색 체계와
근본적으로 안 맞았다. 대신 이번 세션에서 검증한 채널 브랜드 토큰(다크 네이비, 검은고딕, 색상별
교육적 의미)을 그대로 frame.md로 옮겼다.

**핵심 원칙: 색은 무드가 아니라 의미다.** 노랑은 항상 "강세/정답", 파랑은 항상 "이렇게 들린다(발음)",
빨강은 항상 "예외/주의"를 뜻한다. 이 매핑은 씬마다 바뀌지 않는다 — 시청자가 색만 보고도 지금 무엇을
배우는 중인지 알아야 한다.

**Key characteristics at frame scale:**

- **다크 네이비 그라운드**(`#0A1526`), 중앙이 살짝 밝은(`#12203A`) 라디얼 글로우 — 풀스크린 선형
  그라디언트는 H.264 압축에서 밴딩이 보이므로 쓰지 않는다.
- **검은고딕(Black Han Sans) 디스플레이** — 히어로 단어·헤드라인·퀴즈 정답 전용. 본문 캡션은
  Noto Sans KR Bold/Black.
- **세 가지 기능색만** — 노랑(강세) / 파랑(발음) / 빨강(예외). 장식용 네 번째 색을 추가하지 않는다.
- **카드는 짙은 반투명 네이비**(`rgba(18,32,58,0.85)`), 얇은 노랑 테두리 — 그림자 없음, 대신 은은한
  테두리 글로우로 부양감을 준다.
- **상단 진행 바** — 레거시 CardScene의 진행 점을 얇은 바 하나로 단순화, 13씬 내내 유지.

## The Frame

### Frame Craft Bar

- **Squint** — 씬마다 히어로 단어 또는 h1 헤드라인 하나가 화면을 지배한다(주변 요소 대비 3배 이상 큼).
- **Silence** — sentence-card가 쌓이는 씬(5, 10, 12)만 밀도가 높고, 나머지는 여백이 넉넉하다.
- **Restraint** — 세 기능색 외 색을 쓰지 않는다. 텍스트 기본색은 흰색이지 컬러가 아니다.
- **Reference** — 레거시 Remotion `CardScene`이 만들었던 신뢰형 톤을 그대로 유지하되, 카드 넘침
  방지·폰트 축소 같은 제약은 이번엔 컨테이너 쿼리(`cqw`) 기반이라 다시 겪지 않는다.

- **Primary:** 1920×1080 (16:9), 이 프로젝트는 세로형을 만들지 않는다.
- **Safe area:** `pad-x` 6cqw, 하단은 캡션 keep-out(`12cqh`)을 반드시 비운다.
- **컨테이너 법칙**: 모든 프레임 그라운드에 `container-type: size`, 모든 상대 단위는 `cqw`/`cqh` —
  `vw`를 쓰지 않는다.

## Colors

`{colors.bg}`가 유일한 그라운드고, 중앙 라디얼 글로우로만 깊이를 준다(레거시 시스템의 "20초 주기로
중심이 이동하는 radial gradient"를 그대로 계승 — 씬이 바뀌어도 배경이 끊기지 않아 크로스페이드처럼
보이는 효과가 있었다). 세 강조색은 각각 정확히 하나의 의미만 가진다:

- `{colors.accent-stress}` 노랑 — 강세 음절, 정답, 핵심 키워드, 진행 바.
- `{colors.accent-pronunciation}` 파랑 — 한글 발음 표기, "이렇게 들린다"는 신호.
- `{colors.accent-exception}` 빨강 — 예외, 오답, 주의 — 절대 장식으로 쓰지 않는다.

이 세 색을 섞어서 새 의미를 만들지 않는다(예: "강세이면서 예외"인 상황이면 순차적으로 색이 바뀌게
하지, 두 색을 동시에 칠하지 않는다).

## Typography

세 계층. **읽기 계층**(Noto Sans KR Bold, 캡션·라벨)과 **한글 디스플레이 계층**(Black Han Sans, 한글
히어로 단어·헤드라인)은 역할이 고정이다 — 캡션에 검은고딕을 쓰면 긴 문장에서 가독성이 떨어지고, 헤드라인에
Noto Sans KR을 쓰면 우리 썸네일 톤과 어긋난다.

**영어 히어로 워드 계층**(Archivo Black)이 세 번째로 추가됐다. GOING TO/GONNA처럼 짧고 독립적으로
크게 보여주는 영어 타겟 단어는 Black Han Sans의 라틴 대체 글리프 대신 Archivo Black을 쓴다 — "이건
가르치는 영어 단어다"라는 신호를 타이포그래피로 준다(한글 지원 폰트의 라틴 폴백은 이 목적으로 설계되지
않아서 존재감이 약하다). 적용 범위는 **짧고 독립된 히어로 단어에 한정**한다(예: 03-reveal의
GOING TO/GONNA 리빌, 04-mechanism/10-listening/11-practice/12-recognition/13-summary-rehook의
단독 GONNA, 09-register 카드 헤드라인). 카드 안의 **완전한 영어 문장**(05-examples 예문, 06-exception
compare-pair, 07-quiz 질문/정답 줄, 10-listening 리스닝 카드)은 범위 밖이다 — Archivo Black은 자간이
넓고 무거워서 문장 단위로 쓰면 카드 폭을 넘칠 위험이 크고, 원래 비교했던 것도 짧은 단어 형태였다.
한글에 붙어버린 토큰("GONNA는", "TO를", "TO는")도 제외한다 — Archivo Black은 한글 글리프가 없어서
같은 토큰에 섞어 쓰면 한글 부분이 브라우저 기본 폰트로 조용히 폴백된다.

**정밀 표기 계층**(IBM Plex Mono, 파랑)이 네 번째로 추가됐다 — 04-mechanism에서 "GOING의 끝소리
**NG**는", "**T**의" 처럼 문장 속에 박힌 개별 소리 단위만 모노스페이스로 바꿔 "이건 정밀한 발음 기호다"라는
신호를 준다. Archivo Black과 같은 원리(폰트로 역할을 표시)를 다른 역할에 쓴 것 — 색은 accent-pronunciation
파랑을 그대로 써서 "이게 소리에 대한 이야기"라는 기존 색 의미와 겹치게 했다. 글자 하나짜리 토큰(T)도
그대로 두 글자 폭 이상 확보되게 padding을 준다(칩 배경 있는 형태로만 쓰기 — 맨 텍스트로 노출하면
한 글자짜리 모노스페이스는 존재감이 없다).

**작은 트랙킹 캡션**(eyebrow의 무채색 변형)도 추가됐다 — 01-stakes 오프닝처럼 헤드라인 하나만 덩그러니
있는 프레임에 스케일 대비를 주는 용도. 기존 eyebrow(`accent-stress` 노랑, 뱃지처럼 시선을 끄는 역할)와
달리 이건 `text-muted` 회색+더 넓은 자간(0.14em)으로 "덜 중요한 보조 정보"라는 걸 명확히 한다 — 채널명/
시즌 같은 배경 정보에만 쓰고, 강조해야 할 라벨엔 계속 노랑 eyebrow를 쓴다.

- **Legibility floor**: 로드베어링 텍스트는 최소 1.4cqw(video-composition.md 스케일 표 기준
  28px 이상에 해당).
- **Hero word**는 9.0cqw(약 173px) — 화면 폭의 상당 부분을 차지해야 한다("Fill the frame: hero
  text 60-80% of width" 규칙).
- 음절별 색칠은 `<span>` 단위로: 강세 음절만 노랑, 나머지는 흰색, 예외가 있으면 그 부분만 빨강.

## Depth & Surface

그림자 대신 **테두리 글로우**로 부양감을 준다 — `2px solid rgba(245,197,24,0.25)` 테두리 +
카드 배경 자체가 그라운드보다 살짝 밝은 네이비(`rgba(18,32,58,0.85)`)라 배경과 자연스럽게 분리된다.
불투명한 노랑 테두리나 딱딱한 드롭섀도우는 쓰지 않는다.

## Shapes

- **20px** — 큰 카드(sentence-card, compare-pair). **14px** — 작은 카드.
- **100px** — 캡션 필. **50%** — step-badge 원, progress 관련 점.
- 각진 모서리는 쓰지 않는다(레거시 시스템도 rounded 기조를 유지했다).

## Components

- **hero-word-block / pron-caption** — 이 시스템의 핵심 짝. 영어 단어(검은고딕, 음절별 색칠) +
  그 아래 한글 발음(파랑) 세트로, Scene 3·7의 정답 공개 순간에 쓴다.
- **sentence-card** — 예문 한 줄. Scene 5·10·12처럼 예문이 여러 개 쌓이는 씬의 기본 단위.
- **compare-pair** — 맞는 경우 vs 예외/반대 경우를 나란히. Scene 6(동사 vs 장소)·8·9(캐주얼 vs
  격식)에 쓴다.
- **step-badge** — 번호 매긴 원. Scene 4의 "두 가지 이유" 같은 순차 설명에 쓴다.
- **progress-rail** — 전 씬 공통, 상단에 고정.
- **caption-pill** — 나레이션 캡션, 단어 단위로 발화 시점에 노랑으로 하이라이트(레거시
  `useSpeechEmphasis`와 동일한 발상).

## Frame Treatments

> Recipe: ground · composes · focal · chrome · accent · silence · density.

### 1 · Hook / Cover (open · move: centered question, slow glow)

**Ground** 네이비 + 중앙 라디얼 글로우, 은은하게 맥동. **Composes** eyebrow(선택), h1. **Focal**
Black Han Sans h1, 화면 중앙 또는 살짝 좌측. **Chrome** progress-rail만(아직 0%). **Accent** 텍스트
자체의 흰색/노랑 대비. **Silence** 70%+. **Density** low. → Scene 1, 2, 13(클로징 변형).

### 2 · Word Reveal (reveal · move: hero word scales in, pron-caption fades under)

**Ground** 네이비. **Composes** hero-word-block, pron-caption, 선택적으로 작은 "정답" eyebrow.
**Focal** 화면을 지배하는 영어 단어 + 그 아래 파랑 발음. **Chrome** progress-rail. **Accent** 노랑
강세 음절. **Silence** 60%. **Density** low. → Scene 3(GONNA 공개), Scene 7(퀴즈 정답).

### 3 · Mechanism Split (explain · move: step-badges enter in sequence)

**Ground** 네이비, 2단 세로 또는 좌우 배치. **Composes** 2× step-badge + 설명 텍스트 블록.
**Focal** 번호 원 + 그 옆 한 줄 설명, 두 개가 순서대로. **Chrome** progress-rail. **Accent** 노랑
번호 원. **Silence** 50%. **Density** standard. → Scene 4.

### 4 · Sentence Stack (examples · move: cards stagger up one at a time)

**Ground** 네이비, `pad-x`. **Composes** 3-5× sentence-card, 세로 스택. **Focal** 예문 카드들,
타겟 단어(거너 등)만 인라인 색칠. **Chrome** progress-rail. **Accent** 카드 테두리 글로우 + 인라인
색칠. **Silence** 카드 늘어날수록 감소(dense-exception). **Density** dense-exception. → Scene 5,
10, 12.

### 5 · Compare Pair (contrast · move: left card settles, right card settles 0.15s later)

**Ground** 네이비, 좌우 분할(또는 상하, 16:9라 좌우 기본). **Composes** 2× compare-pair 카드.
**Focal** 왼쪽 "맞는 경우"(노랑 rule), 오른쪽 "예외/반대"(빨강 rule + X). **Chrome** progress-rail.
**Accent** 좌우 rule 색 대비. **Silence** 55%. **Density** standard. → Scene 6, 8, 9.

### 6 · Practice / Closing (prompt · move: word pulses on each repeat beat)

**Ground** 네이비 + 글로우. **Composes** h2 프롬프트 + hero-word-block(작은 버전), 선택적
Rehook 텍스트. **Focal** "따라 해보세요" 같은 지시문 + 반복될 단어. **Chrome** progress-rail(마지막
씬은 100%). **Accent** 노랑 펄스. **Silence** 65%. **Density** low. → Scene 11, 13(Rehook 변형).

## Composition Rules

### Do

- 매 씬 `{colors.bg}` 네이비에서 시작하고, 세 기능색만 강조로 쓴다.
- 히어로 단어는 화면의 60-80%를 채운다 — 작게 두지 않는다.
- 카드는 테두리 글로우로 띄운다, 그림자를 쓰지 않는다.
- 두 개 이상의 초점을 만든다(예: hero word + pron-caption, 또는 좌우 compare-pair).
- 진행 바는 모든 씬에 유지한다.
- **콘텐츠가 "고정된 하나의 단어 + 그 예시 목록" 형태면 anchor+list 존 레이아웃을 쓴다** — 좌측에
  고정 앵커(단어 카드, `hero-word-block` 축소판 + 하단 발음), 우측에 목록이 흐르는 구조. 정중앙에
  카드/스택을 띄우는 건 "둥둥 뜨는 웹 레이아웃"이라 지양한다(video-composition.md). 10-listening과
  05-examples가 이 패턴 — 같은 콘텐츠 모양(단어 하나 + 예문 여러 개)은 같은 레이아웃으로 푼다.

  ```yaml
  anchor: { width: "19-27cqw", border: "2px solid accent-stress",
            word: "typography.hero-word 축소판(Archivo Black, 영어 단어일 때)",
            pron: "typography.pron-sub" }
  row: { display: "flex", gap: "2.4-3.4cqw", align-items: "flex-start" }
  ```

- **콘텐츠가 "두 요소가 합쳐진다/비교된다" 형태의 메커니즘 설명이면, 산문 대신 다이어그램을 만든다.**
  04-mechanism의 "NG + T → GONNA" 칩 스트립처럼 — 파티클 이펙트 같은 범용 장식(no-particle-effects
  메모 참고)과 달리, 이건 그 프레임의 실제 내용이 아니면 존재할 수 없는 그림이라 유효하다. 각 조각이
  해당 설명이 끝나는 시점에 하나씩 조립되고, Scene 전환에 딸린 그룹(예: `.m04mechanism-explain`)의
  자식으로 두면 별도 exit 애니메이션 없이 같이 사라진다.

### Don't

- 네 번째 강조색을 추가하지 않는다.
- 풀스크린 선형 그라디언트를 다크 배경에 쓰지 않는다(밴딩).
- 캡션에 검은고딕을 쓰지 않는다(가독성).
- 예외/오답 표시에 빨강 배경 채우기를 쓰지 않는다 — 라인+글리프로만.
- 카드가 넘치면 CSS `transform: scale()`로 줄이지 않는다 — 폰트·여백 자체를 줄인다(레거시 교훈).

## Aspect-Ratio Behavior

이 프로젝트는 1920×1080 16:9 하나만 만든다(BRIEF.md `aspect: 1920x1080`). 세로형 버전은 계획에
없다 — 필요해지면 이 표를 별도로 채운다.

## Approved Entities

실제 로고·상표 없음. 채널명 "이해하면 쉬운영어"는 텍스트 워드마크로만 등장한다(엔드스크린/클로징
씬). 실사 사진·아바타 없음 — 이 프로젝트는 faceless.

## Numerals & Claims

발음·강세 규칙은 전부 `SCRIPT.md`/`user_script.txt`의 확정 원고에서만 가져온다 — 원고에 없는
예외나 규칙을 프레임 단계에서 새로 지어내지 않는다.

## Pre-Render Self-Audit

- **Squint** — 씬마다 지배적 요소 하나(히어로 단어 또는 h1)가 있는가.
- **Color discipline** — 노랑/파랑/빨강 외 강조색이 없는가, 각 색이 정해진 의미로만 쓰였는가.
- **Legibility** — 로드베어링 텍스트가 1.4cqw 이상인가, 캡션이 keep-out 영역을 침범하지 않는가.
- **Depth** — 그림자 없이 테두리 글로우만 썼는가.
- **Progress** — progress-rail이 씬 인덱스에 맞게 채워지는가.
- **Fabrication** — 모든 발음·규칙 진술이 원고에 근거하는가.

## Known Gaps

- 이 frame.md는 프리셋 리믹스가 아니라 처음부터 새로 쓴 bespoke 스펙이다 — `build-frame.mjs`의
  자동 검증을 거치지 않았으므로, Step 4/5에서 실제 프레임을 만들며 색·타이포 매핑이 깨지는 곳이
  있으면 이 파일을 직접 고친다.
- 세로형(9:16) 대응은 아직 설계하지 않았다 — 시즌2 쇼츠를 만들 때 별도로 확장한다.
