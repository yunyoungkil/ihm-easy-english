---
version: alpha
name: Understand-English EP16 — Frame (video / frame layer)
description: >
  EP11~15가 검증한 frame.md를 그대로 재사용 — 채널 브랜드 토큰(다크 네이비 그라운드, Black Han
  Sans 디스플레이)을 바꾸지 않는다. 팔레트·타이포·기존 채널 공통 컴포넌트는 100% 동일. 이 편의
  핵심 메커니즘("모음 두 개가 붙으면 앞 모음은 이름 그대로 소리 내고 뒤 모음은 무음, EA만 예외적으로
  가끔 다른 소리")에 맞춰 신규 컴포넌트 `vowel-pair-card`/`vowel-pair-cluster`/`hesitation-cursor`/
  `question-flicker`를 추가하고, "Frame Treatments"의 씬 매핑을 이 편(12프레임)에 맞게 새로 배정했다.
unit: the frame — 1920×1080 primary (this project is 16:9 longform only)
principle: atoms are sacred · composition is free · every color has a teaching meaning, not a mood

colors:
  bg: "#0A1526"
  bg-glow-center: "#12203A"
  surface: "#12203A"
  text: "#FFFFFF"
  text-muted: "#A9B4C4"
  accent-stress: "#F5C518"
  accent-exception: "#E84545"
  accent-highlight: "rgba(245,197,24,0.4)"
  border: "rgba(245,197,24,0.25)"
  card-bg: "rgba(18,32,58,0.85)"
  dormant-opacity: "0.35"

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
  hero-word: { fontFamily: "Black Han Sans", cqw: 8.0, weight: 400, lineHeight: 1.0, color: "text" }
  pron-sub:  { fontFamily: "Noto Sans KR", cqw: 1.8, weight: 700, color: "text" }
  sound-tag: { fontFamily: "Noto Sans KR", cqw: 0.9, weight: 700, color: "text-muted" }

spacing:
  pad-x: "6cqw"
  pad-y: "6cqw"
  gap-cards: "2cqw"
  accent-line: "80px × 5px"
  caption-keep-out-bottom: "12cqh"

components:
  hero-word-block:
    typography: "{typography.hero-word}"
    description: "채널 공통 컴포넌트(EP11~15와 동일) — 영어 단어/문구 하나를 화면 지배적으로."
  pron-caption:
    typography: "{typography.pron-sub}"
    description: "채널 공통 컴포넌트(EP11~15와 동일) — hero-word-block 아래 한글 발음 표기."
  vowel-pair-card:
    backgroundColor: "{colors.card-bg}"
    border: "2px solid {colors.border}"
    rounded: "{radii.card-md}"
    description: "이 편의 기본 단어 카드. 영어 단어(hero-word 축소판) + 한글 발음(pron-caption)을
      한 카드에 담는다. 단어 안의 모음 두 글자 처리 방식이 두 그룹을 나타낸다 —
      **규칙 그룹**(앞 모음 = {colors.accent-stress} 밝은 하이라이트 + '소리 냄' sound-tag, 뒤
      모음 = opacity {colors.dormant-opacity} 반투명 + 작은 Zzz 아이콘) / **예외 그룹**(EA 두
      글자를 분리하지 않고 하나의 단위로 {colors.accent-exception} 색 통일 하이라이트 — '이 둘이
      같이 다른 소리를 낸다'는 것을 시각적으로 구분, 앞/뒤 분리 표시를 아예 하지 않는다)."
  vowel-pair-cluster:
    description: "vowel-pair-card 여러 장을 그룹으로 묶어 보여주는 레이아웃(Frame 6·7·9·10·12).
      규칙 그룹/예외 그룹을 좌/우 또는 상/하로 분리 배치하고, 카드/리스트형 장면 채널 기본
      규칙에 따라 네온 테두리 강조를 적용한다(lt-neon-border 카탈로그 버그로 설치 불가 — EP12
      Frame 4/EP13 Frame 9의 CSS 직접 구현 방식 재사용, `production-rules.md` 참고)."
  hesitation-cursor:
    description: "Frame 1 전용. 단어 위 모음 두 글자 사이에서 커서(또는 옅은 밑줄)가 좌우로
      머뭇거리듯 깜빡이는 모션 — '둘 다 읽어야 하나' 망설임을 시각화. 정답을 암시하는 색·강조
      없이 중립적인 {colors.text-muted}만 사용."
  question-flicker:
    description: "Frame 3 전용. 단어의 두 모음 글자 위에서 물음표(?)가 번갈아 반짝이는 모션 —
      hesitation-cursor보다 한 단계 더 명확한 '둘 중 뭘까' 질문 제스처. 역시 정답 색 사용 금지,
      중립색만."
  lazy-tongue-reveal:
    description: "Frame 4·5(원리 최초 공개) 전용. 단어가 중립 상태로 있다가, 앞 모음이 밝게
      부풀어 오르듯(scale pulse) {colors.accent-stress}로 강조되는 동시에 뒤 모음이 옅어지며
      Zzz 아이콘이 페이드인 — '앞은 힘주고 뒤는 쉰다'는 원리를 한 번의 동작으로 보여준다.
      Frame 10(소리 내어 읽기 연습)에서 음절 조합 모션으로 재사용."
  quiz-reveal:
    description: "채널 공통 quiz-sequence 패턴(EP12~15와 동일 골격) — 질문 문구(철자만 표시,
      발음 언급 없음) → 짧은 정지(무음) → vowel-pair-card 축소판으로 정답 공개. Frame 8에서
      3문항 반복."
  sentence-card:
    backgroundColor: "{colors.card-bg}"
    border: "2px solid {colors.border}"
    rounded: "{radii.card-md}"
    typography: "two lines — English sentence {typography.body} in {colors.text}, Korean phonetic transcription directly below in {typography.pron-sub} scale"
    description: "채널 공통 컴포넌트(EP11~15와 동일) — 예문 한 줄, 영어+한글 발음을 항상 같이.
      목표 단어만 규칙 그룹({colors.accent-stress})/예외 그룹({colors.accent-exception}) 색으로
      인라인 하이라이트. Frame 9(4개 문장 스택)에 쓴다."
  progress-rail:
    backgroundColor: "rgba(245,197,24,0.15)"
    fill: "{colors.accent-stress}"
    rounded: "4px"
    size: "3px tall, top edge, width grows with scene index"
    description: "채널 공통 컴포넌트(EP11~15와 동일) — 12프레임 내내 유지되는 상단 진행 바."
  caption-pill:
    backgroundColor: "rgba(10,21,38,0.92)"
    textColor: "{colors.text}"
    rounded: "{radii.pill}"
    typography: "{typography.body}"
    description: "채널 공통 컴포넌트(EP11~15와 동일) — 나레이션 캡션, 발화 중인 단어만 노랑
      하이라이트(word-pop). Frame 1·2·3의 문장 캡션에 쓴다."
---

# Understand-English EP16 — Frame (video / frame layer)

> 아래 Overview/Colors/Typography/Depth/Shapes는 EP11~15가 검증한 토큰을 그대로 물려받은 배경
> 설명이다. **이 편의 실제 씬별 적용은 `STORYBOARD.md`를 참고할 것** — 거기는 EP16의 12씬으로
> 새로 배정했다.

## Overview

- 배경: 다크 네이비(`{colors.bg}`), 중앙 글로우(`{colors.bg-glow-center}`)로 은은한 깊이감.
- 카드형 레이아웃이 이 편의 척추다 — "모음 두 개 규칙 하나로 여러 단어를 한꺼번에 읽는다"는
  패턴 확장이 핵심 메시지라, 단어를 카드로 나열·그룹핑하는 장면 비중이 높다.
- 색의 의미는 전부 "가르치는 역할"이지 무드가 아니다: 노랑(`{colors.accent-stress}`)=규칙대로
  소리 내는 앞 모음(+ 진행바 등 채널 공통 강조 의미 유지), 반투명+Zzz=규칙대로 쉬는 뒤 모음,
  빨강(`{colors.accent-exception}`)=EA 예외(두 글자가 한 단위로 다른 소리).

## 언어학적 정확성 우선

이 편의 핵심 규칙("모음 두 개가 붙으면 앞 모음은 이름 그대로, 뒤 모음은 무음")과 그 예외
("EA는 약 70%만 규칙을 따르고 나머지는 짧은 '에' 소리")는 2026-09-15 웹 검색으로 검증 완료
(All About Learning Press, Learn English Sounds — `SCRIPT.md` Frame 7 상단 근거 참고). 프레임
제작 시 **SCRIPT.md의 확정 규칙 문구를 그대로 따르고 임의로 재해석하지 않는다** — 특히 EA
단어 중 어느 것이 규칙 그룹이고 어느 것이 예외 그룹인지는 SCRIPT.md에 명시된 대로만 따른다
(MEAT·TEAM=규칙 / HEAD·BREAD·DEAD·SWEAT=예외).

## Frame Treatments (EP16 — 12프레임 배정)

| # | Frame | 신규/재사용 컴포넌트 |
|---|---|---|
| 1 | 도입 (Stakes) | hesitation-cursor, caption-pill |
| 2 | 채널 인트로 | 채널 워드마크(공통) |
| 3 | 질문 던지기 | question-flicker, hero-word-block |
| 4 | 반전 공개 | lazy-tongue-reveal, hero-word-block |
| 5 | 원리 설명 | vowel-pair-card, lazy-tongue-reveal |
| 6 | 패턴 확장 | vowel-pair-cluster(6장, 네온 테두리) |
| 7 | 반전 꿀팁(예외) | vowel-pair-cluster(3장, 예외색 통일 강조) |
| 8 | 미니 퀴즈 | quiz-reveal(3문항) |
| 9 | 실제 문장에서 읽기 | sentence-card(4개 스택) |
| 10 | 소리 내어 읽기 연습 | lazy-tongue-reveal(3단어, 2회 반복) |
| 11 | 실전 재확인(페이오프) | hesitation-cursor→선명 해소(3단어 몽타주) |
| 12 | 요약 + 마무리 | vowel-pair-card 스택(14장), 엔드스크린 키프아웃 |
