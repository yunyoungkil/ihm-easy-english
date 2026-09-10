---
version: alpha
name: Understand-English EP15 — Frame (video / frame layer)
description: >
  EP11~14가 검증한 frame.md를 그대로 재사용 — 채널 브랜드 토큰(다크 네이비 그라운드, Black Han
  Sans 디스플레이)을 바꾸지 않는다. 팔레트·타이포·기존 채널 공통 컴포넌트는 100% 동일. 이 편의
  핵심 메커니즘("-sion 바로 앞 글자가 모음 또는 R이면 전, 그 밖의 자음이면 션, SSION은 무조건
  션")에 맞춰 신규 컴포넌트 `sion-card`/`sound-tag`/`sion-cluster`를 추가하고, "Frame Treatments"의
  씬 매핑을 이 편(12프레임)에 맞게 새로 배정했다.
unit: the frame — 1920×1080 primary (this project is 16:9 longform only)
principle: atoms are sacred · composition is free · every color has a teaching meaning, not a mood

colors:
  bg: "#0A1526"
  bg-glow-center: "#12203A"
  surface: "#12203A"
  text: "#FFFFFF"
  text-muted: "#A9B4C4"
  accent-stress: "#F5C518"
  accent-voiced: "#008EFF"
  accent-unvoiced: "#FF7A3D"
  accent-highlight: "rgba(245,197,24,0.4)"
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
    description: "채널 공통 컴포넌트(EP11~14와 동일) — 영어 단어/문구 하나를 화면 지배적으로."
  pron-caption:
    typography: "{typography.pron-sub}"
    description: "채널 공통 컴포넌트(EP11~14와 동일) — hero-word-block 아래 한글 발음 표기."
  sion-card:
    backgroundColor: "{colors.card-bg}"
    border: "2px solid {colors.border}"
    rounded: "{radii.card-md}"
    description: "이 편의 기본 단어 카드. 영어 단어(hero-word 축소판) + 한글 발음(pron-caption)을
      한 카드에 담는다. 카드 테두리·결과 발음 텍스트 색이 그룹을 나타낸다 —
      {colors.accent-voiced}(전 그룹: 모음 또는 R 뒤) / {colors.accent-unvoiced}(션 그룹: 그 밖의
      자음 뒤, SSION 예외 포함). SSION 예외 카드는 추가로 이중 S 두 글자가 살짝 겹쳐 보이는
      마이크로 인터랙션(글자 두 개가 포개지듯 강조)으로 "이건 다른 이유로 션이다"를 시각적으로
      구분한다."
  sound-tag:
    typography: "{typography.sound-tag}"
    description: "sion-card 안, -sion 바로 앞 글자 밑에 붙는 아주 작은 라벨 — '모'(모음)/'R'/'자'
      (그 밖의 자음) 중 하나. 그 글자와 결과 발음 색을 같은 색으로 맞춰서(모음·R=파랑, 자음=주황)
      '이 글자 하나가 전체 발음을 정한다'는 인과관계를 시각적으로 잇는다. SSION 예외 카드에는
      sound-tag를 아예 안 붙인다(Frame 7 대본 확정 — '앞 글자를 확인할 필요도 없다'는 게 요점이라
      라벨을 붙이면 오히려 모순된 신호를 줌)."
  sion-cluster:
    description: "sion-card 여러 장을 그룹으로 묶어 보여주는 레이아웃(Frame 6·7·12). 그룹별로
      좌/우 또는 상/하로 분리 배치하고, 카드/리스트형 장면 채널 기본 규칙에 따라 네온 테두리
      강조를 적용한다(lt-neon-border 카탈로그 버그로 설치 불가 — EP12 Frame 4/EP13 Frame 9의 CSS
      직접 구현 방식 재사용, `production-rules.md` 참고)."
  syllable-buildup:
    description: "sion-card 안에서 영어 단어를 음절 단위로 하나씩 밝히다가 마지막에 전체가
      합쳐지며 한글 발음(pron-caption)이 조립되어 뜨는 모션. Frame 5(원리 최초 공개)에서 만들고,
      Frame 10(소리 내어 읽기 연습)에서 같은 모션을 2회 반복(느리게→빠르게)으로 재사용한다."
  reveal-blur:
    description: "단어가 흐릿하게(주변부보다 낮은 대비) 등장했다가 sound-tag 강조와 함께 또렷하게
      풀리는 모션. Frame 1(뭉개짐, 확신 없음을 표현)과 Frame 11(SUPERVISION 첫 공개 — Frame 1과
      반대 방향, 흐릿→선명 해소)에 쓴다. Frame 11의 DIVISION·PENSION 두 단어는 같은 모션을 더
      빠르게 반복해 몽타주 리듬을 만든다."
  quiz-reveal:
    description: "채널 공통 quiz-sequence 패턴(EP12~14와 동일 골격) — 질문 문구 → 짧은 정지(무음)
      → sion-card 축소판으로 정답 공개. Frame 8에서 3문항 반복."
  sentence-card:
    backgroundColor: "{colors.card-bg}"
    border: "2px solid {colors.border}"
    rounded: "{radii.card-md}"
    typography: "two lines — English sentence {typography.body} in {colors.text}, Korean phonetic transcription directly below in {typography.pron-sub} scale"
    description: "채널 공통 컴포넌트(EP11~14와 동일) — 예문 한 줄, 영어+한글 발음을 항상 같이.
      -sion 단어만 결과색(파랑/주황)으로 인라인 하이라이트. Frame 9(4개 문장 스택)에 쓴다."
  progress-rail:
    backgroundColor: "rgba(245,197,24,0.15)"
    fill: "{colors.accent-stress}"
    rounded: "4px"
    size: "3px tall, top edge, width grows with scene index"
    description: "채널 공통 컴포넌트(EP11~14와 동일) — 12프레임 내내 유지되는 상단 진행 바."
  caption-pill:
    backgroundColor: "rgba(10,21,38,0.92)"
    textColor: "{colors.text}"
    rounded: "{radii.pill}"
    typography: "{typography.body}"
    description: "채널 공통 컴포넌트(EP11~14와 동일) — 나레이션 캡션, 발화 중인 단어만 노랑
      하이라이트(word-pop). Frame 1·3의 문장 캡션에 쓴다."
---

# Understand-English EP15 — Frame (video / frame layer)

> 아래 Overview/Colors/Typography/Depth/Shapes는 EP11~14가 검증한 토큰을 그대로 물려받은 배경
> 설명이다. **이 편의 실제 씬별 적용은 `STORYBOARD.md`를 참고할 것** — 거기는 EP15의 12씬으로
> 새로 배정했다.

## Overview

- 배경: 다크 네이비(`{colors.bg}`), 중앙 글로우(`{colors.bg-glow-center}`)로 은은한 깊이감.
- 카드형 레이아웃이 이 편의 척추다 — "-sion 규칙 하나로 여러 단어를 한꺼번에 읽는다"는 패턴
  확장이 핵심 메시지라, 단어를 카드로 나열·그룹핑하는 장면 비중이 EP14(2단어 링킹 다이어그램
  중심)보다 높다.
- 색의 의미는 전부 "가르치는 역할"이지 무드가 아니다: 파랑=전(모음/R 뒤), 주황=션(그 밖의
  자음 뒤 또는 SSION 예외), 노랑=강조·진행바(채널 공통 의미 유지).

## 언어학적 정확성 우선

이 편의 핵심 규칙("모음 또는 R 뒤=전, 그 밖의 자음 뒤=션, SSION은 무조건 션")은 2026-09-10
웹 검색으로 검증 완료(Rachel's English, Learn English Sounds, Wiktionary — `SCRIPT.md` 상단
"정정 사항" 참고). 초안에서 R을 "예외"로 잘못 분류했던 오류를 수정한 이력이 있으니, 프레임
제작 시 **SCRIPT.md의 확정 규칙 문구를 그대로 따르고 임의로 재해석하지 않는다**.

## Frame Treatments (EP15 — 12프레임 배정)

| # | Frame | 신규/재사용 컴포넌트 |
|---|---|---|
| 1 | 도입 (Stakes) | reveal-blur(뭉개짐), caption-pill |
| 2 | 채널 인트로 | 채널 워드마크(공통) |
| 3 | 질문 던지기 | caption-pill, hero-word-block(철자 강조) |
| 4 | 반전 공개 | hero-word-block |
| 5 | 원리 설명 | sion-card, sound-tag, syllable-buildup |
| 6 | 패턴 확장 | sion-cluster(8장, 네온 테두리) |
| 7 | 반전 꿀팁(예외) | sion-cluster(3장, sound-tag 없음, bounce 진입) |
| 8 | 미니 퀴즈 | quiz-reveal(3문항) |
| 9 | 실제 문장에서 읽기 | sentence-card(4개 스택) |
| 10 | 소리 내어 읽기 연습 | syllable-buildup(3단어, 2회 반복) |
| 11 | 실전 재확인(페이오프) | reveal-blur(3단어 몽타주) |
| 12 | 요약 + 마무리 | sion-card 스택(17장), 엔드스크린 키프아웃 |
