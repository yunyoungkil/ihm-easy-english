---
version: alpha
name: Understand-English EP16 — Frame (video / frame layer)
description: >
  2026-09-16 시각 정체성 개편 — "정돈된 틀 + 콘텐츠에만 손그림" 하이브리드 스타일로 전환
  (근거: 사용자가 공유한 스케치노트 참고 이미지 2장 + Aprilynne Alter 썸네일 분석 영상의
  Gemini 분석 결과). EP11~15의 다크 네이비 Cyber-HUD 톤을 EP16부터 벗어나 따뜻한 크림 배경 +
  깔끔한 잉크 라인 구조로 전환하되, 채널 전체 정체성(브랜드 문서)은 안 건드리고 **이 편
  하나만의 시도**로 한정한다. "색은 가르치는 역할" 원칙과 규칙/예외 2그룹 색 구분 로직은
  EP11~15와 동일하게 유지.
unit: the frame — 1920×1080 primary (this project is 16:9 longform only)
principle: 틀(카드·구조·진행바)은 깔끔하게, 콘텐츠를 보여주는 그림(일러스트·손글씨 강조)만
  손그림 느낌 — 둘을 트림패스(손으로 그리듯 실시간으로 그려지는 펜 선)가 이어준다

colors:
  bg: "#F4EFE6"
  bg-texture: "#EFE8D8"
  ink: "#2B2B2B"
  text: "#2B2B2B"
  text-muted: "#8C8577"
  text-muted-glyph: "#5C564A"
  accent-rule: "#E8A93E"
  accent-rule-glyph: "#8A5A12"
  accent-exception: "#D64545"
  accent-rule-soft: "rgba(232,169,62,0.18)"
  accent-exception-soft: "rgba(214,69,69,0.14)"
  card-bg: "#FFFFFF"
  border: "#2B2B2B"
  dormant-opacity: "0.35"

⚠️ `accent-rule`(#E8A93E)와 `text-muted`(#8C8577)는 배경·테두리·진행바 채우기 같은 **비-텍스트** 용도의
값이다. 흰색/크림 배경 위에 **글자 색(`color:`)으로 직접 쓰면 WCAG 대비를 통과하지 못한다**(실측:
#E8A93E on white ≈ 1.8~2.1:1, 필요 3:1 / #8C8577 on white ≈ 3.66:1, 필요 4.5:1 — `hyperframes check`가
2026-09-16 EP16 전체 프레임 검수에서 다수 프레임에 걸쳐 이 문제를 잡아냈다). 글자 색으로 강조를 줘야
하면 반드시 `accent-rule-glyph`(#8A5A12, white 대비 ~5.9:1)와 `text-muted-glyph`(#5C564A, white 대비
~7.3:1)를 쓸 것 — 두 색은 오직 이 용도(텍스트 글리프)로만 존재한다.

radii:
  card-lg: "22px"
  card-md: "16px"
  pill: "100px"
  circle: "50%"

typography:
  body:        { fontFamily: "Noto Sans KR", cqw: 1.6, weight: 700, lineHeight: 1.5, color: "text" }
  label:       { fontFamily: "Noto Sans KR", cqw: 1.0, weight: 700, tracking: "0.02em", color: "text-muted" }
  eyebrow:     { fontFamily: "Noto Sans KR", cqw: 1.1, weight: 900, tracking: "0.04em", upper: true, color: "accent-rule" }
  hand-h1:     { fontFamily: "Gaegu", cqw: 5.0, weight: 700, lineHeight: 1.15, color: "ink" }
  hero-word:   { fontFamily: "Archivo Black", cqw: 7.5, weight: 400, lineHeight: 1.0, color: "ink" }
  pron-sub:    { fontFamily: "Noto Sans KR", cqw: 1.8, weight: 700, color: "text" }
  sound-tag:   { fontFamily: "Noto Sans KR", cqw: 0.9, weight: 700, color: "text-muted" }

spacing:
  pad-x: "6cqw"
  pad-y: "6cqw"
  gap-cards: "2.2cqw"
  accent-line: "80px × 5px"
  caption-keep-out-bottom: "12cqh"

components:
  sketch-card:
    style: "깔끔한 구조 — 손그림 아님"
    backgroundColor: "{colors.card-bg}"
    border: "3px solid {colors.ink}"
    rounded: "{radii.card-md}(네 모서리 중 두 곳만 반지름을 살짝 다르게 줘서 완전한 기계적
      균일함은 피하되, 손떨림 느낌은 없음 — 참고 영상의 '균일한 솔리드 라인' 원칙 적용)."
    description: "이 편의 기본 단어 카드(EP11~15의 vowel-pair-card를 대체). 영어 단어
      (hero-word 축소판) + 한글 발음(pron-caption)을 담는다. 카드 틀 자체는 항상 이 깔끔한
      스타일 — 손그림 질감을 주지 않는다(사용자 지적: 전부 스케치풍이면 지저분해 보임). 단어
      안의 모음 두 글자 처리 방식이 두 그룹을 나타낸다 — **규칙 그룹**(앞 모음 =
      {colors.accent-rule} 형광펜 느낌 하이라이트 + '소리 냄' sound-tag, 뒤 모음 = opacity
      {colors.dormant-opacity} 흐리게 + Zzz 낙서 아이콘) / **예외 그룹**(EA 두 글자를 분리하지
      않고 하나의 단위로 {colors.accent-exception} 색 통일 하이라이트)."
  illustration-slot:
    style: "손그림 — 이 편에서 손그림 질감을 쓰는 유일한 자리"
    description: "**콘텐츠 자체를 보여주는 그림 전용** 슬롯. 카드 틀·진행바 같은 구조 요소에는
      안 쓰고, '이게 무슨 상황인지' 보여줘야 하는 자리에만 쓴다(입/혀 단면도, 문장 속 단어의
      실물 아이콘 — 외투·비구름·사람들·머리 등). 자산은 사용자가 직접 그려서
      `assets/illustrations/`에 SVG 또는 투명 배경 PNG로 추가 — 필요 목록은 아래 'Frame
      Treatments' 표의 '필요 일러스트' 칸 참고. 선은 살짝 불균일한 두께(손그림 특유의 필압
      느낌)를 허용하되, 잉크 색({colors.ink})과 포인트 색(규칙/예외 2색)만 쓰고 그 외 색은
      섞지 않는다(참고 영상처럼 원색을 여러 개 남발하지 않음 — 채널의 '색은 가르치는 역할'
      원칙 유지)."
  trim-path-annotation:
    style: "손그림 느낌 동작이지만 목적이 명확해서 정돈돼 보이는 접점 요소"
    description: "펜으로 실시간으로 동그라미를 치거나 밑줄을 긋는 듯한 SVG
      stroke-dasharray 애니메이션(draw-on). '여기를 보세요'가 필요한 모든 자리에 쓴다 —
      Frame 3(O/A 중 어디), Frame 4·5(앞 모음 강조), Frame 7(EA 통일 강조), Frame 8 정답
      공개. 항상 {colors.accent-exception}(빨강 펜) 색 하나로 통일해 '주목·정답' 신호로
      일관되게 읽히게 한다(Aprilynne Alter 분석 참고 — 주석 컬러를 비비드 레드로 통일하는
      원칙과 동일)."
  hand-emphasis:
    style: "손글씨 — 헤드라인/핵심 강조 단어 전용"
    typography: "{typography.hand-h1}"
    description: "한 프레임에 등장하는 여러 텍스트 중 **가장 중요한 한 문구에만** 손글씨체
      (Gaegu)를 쓴다. 본문 캡션·작은 라벨은 절대 손글씨로 안 바꾼다(전부 손글씨면 가독성이
      떨어지고 지저분해 보인다는 사용자 우려 반영) — 손글씨는 늘 예외적으로, 정돈된
      Noto Sans KR 화면 안에서 딱 하나만 튀어야 한다."
  hero-word-block:
    typography: "{typography.hero-word}"
    description: "채널 공통 컴포넌트 — 영어 단어/문구 하나를 화면 지배적으로. 폰트는 EP11~15와
      동일한 Archivo Black 유지(굵고 그래픽적인 인상은 밝은 배경에서도 그대로 통함)."
  pron-caption:
    typography: "{typography.pron-sub}"
    description: "채널 공통 컴포넌트 — hero-word-block 아래 한글 발음 표기."
  sketch-cluster:
    description: "sketch-card 여러 장을 그룹으로 묶어 보여주는 레이아웃(Frame 6·7·9·10·12).
      규칙 그룹/예외 그룹을 좌/우 또는 상/하로 분리 배치. 카드 자체는 깔끔한 구조라 네온
      테두리 대신 얇은 드롭섀도우(`0 4px 0 {colors.ink}`, 오프셋 그림자로 종이를 겹쳐 놓은
      느낌)로 카드 간 깊이감을 준다."
  hesitation-cursor:
    description: "Frame 1 전용. 단어 위 모음 두 글자 사이에서 커서(또는 옅은 밑줄)가 좌우로
      머뭇거리듯 깜빡이는 모션 — '둘 다 읽어야 하나' 망설임을 시각화. 정답을 암시하는 색·강조
      없이 중립적인 {colors.text-muted}만 사용."
  question-flicker:
    description: "Frame 3 전용. 단어의 두 모음 글자 위에서 물음표(?) 손그림 낙서가 번갈아
      반짝이는 모션 — hesitation-cursor보다 한 단계 더 명확한 '둘 중 뭘까' 질문 제스처. 역시
      정답 색 사용 금지, 잉크색 낙서만."
  lazy-tongue-reveal:
    description: "Frame 4·5(원리 최초 공개) 전용. illustration-slot에 놓인 입/혀 단면 손그림이
      먼저 나오고, 앞 모음이 밝게 부풀어 오르듯(scale pulse) {colors.accent-rule}로
      강조되는 동시에 뒤 모음이 옅어지며 Zzz 낙서가 페이드인 — '앞은 힘주고 뒤는 쉰다'는
      원리를 그림과 카드 양쪽에서 동시에 보여준다. Frame 10(소리 내어 읽기 연습)에서 음절
      조합 모션으로 재사용."
  quiz-reveal:
    description: "채널 공통 quiz-sequence 패턴 — 질문 문구(철자만 표시, 발음 언급 없음) → 짧은
      정지(무음) → sketch-card 축소판 + trim-path-annotation으로 정답 공개. Frame 8에서
      3문항 반복."
  sentence-card:
    backgroundColor: "{colors.card-bg}"
    border: "3px solid {colors.ink}"
    rounded: "{radii.card-md}"
    typography: "two lines — English sentence {typography.body} in {colors.text}, Korean phonetic transcription directly below in {typography.pron-sub} scale"
    description: "채널 공통 컴포넌트 — 예문 한 줄, 영어+한글 발음을 항상 같이. 문장 옆에
      illustration-slot 미니 아이콘(외투/비구름/사람들/머리)을 하나씩 배치해 문장 내용을 바로
      떠올리게 한다. 목표 단어만 규칙 그룹({colors.accent-rule})/예외 그룹
      ({colors.accent-exception}) 색으로 인라인 하이라이트. Frame 9(4개 문장 스택)에 쓴다."
  progress-rail:
    backgroundColor: "{colors.accent-rule-soft}"
    fill: "{colors.accent-rule}"
    rounded: "4px"
    size: "3px tall, top edge, width grows with scene index"
    description: "채널 공통 컴포넌트 — 12프레임 내내 유지되는 상단 진행 바."
  caption-pill:
    backgroundColor: "{colors.card-bg}"
    textColor: "{colors.text}"
    border: "2px solid {colors.ink}"
    rounded: "{radii.pill}"
    typography: "{typography.body}"
    description: "채널 공통 컴포넌트 — 나레이션 캡션, 발화 중인 단어만
      {colors.accent-rule-soft} 형광펜 배경으로 하이라이트(word-pop). Frame 1·2·3의 문장
      캡션에 쓴다."
---

# Understand-English EP16 — Frame (video / frame layer)

> 아래 Overview/Colors/Typography/Depth/Shapes는 이 편 전용 신규 토큰이다(EP11~15의 다크
> 네이비 톤과 다름 — 2026-09-16 시각 정체성 개편, "필요한 자산만 바로 볼 수 있게" 요청에 따른
> 씬별 상세는 `STORYBOARD.md` 참고).

## Overview — 한눈에 보는 이 편의 그림

**틀은 깔끔하게, 콘텐츠 그림만 손그림.** 화면을 보면 이렇게 느껴져야 한다 — 크림색 종이 위에
깔끔한 흰 카드들이 깔려 있고, 카드 안 텍스트는 정돈된 고딕체인데, 카드 옆이나 위에 손으로 쓱쓱
그린 듯한 그림(혀 단면, 외투, 비구름 같은)이 콕콕 박혀 있다. 뭔가를 가리킬 때만 빨간 펜이
실시간으로 동그라미를 그린다. 헤드라인 문구 중 딱 하나만 손글씨로 튄다. 그 외에는 전부 반듯하다.

- 색의 의미는 전부 "가르치는 역할"이지 무드가 아니다: 머스터드(`{colors.accent-rule}`)=규칙대로
  소리 내는 앞 모음(+ 진행바 등 채널 공통 강조 의미 유지), 흐림+Zzz=규칙대로 쉬는 뒤 모음,
  빨강(`{colors.accent-exception}`)=EA 예외(두 글자가 한 단위로 다른 소리) **겸** 트림패스
  주석의 "여기 보세요" 색.
- 카드형 레이아웃이 이 편의 척추인 건 EP11~15와 동일 — "모음 두 개 규칙 하나로 여러 단어를
  한꺼번에 읽는다"는 패턴 확장이 핵심 메시지라, 단어를 카드로 나열·그룹핑하는 장면 비중이 높다.

## 언어학적 정확성 우선

이 편의 핵심 규칙("모음 두 개가 붙으면 앞 모음은 이름 그대로, 뒤 모음은 무음")과 그 예외
("EA는 약 70%만 규칙을 따르고 나머지는 짧은 '에' 소리")는 2026-09-15 웹 검색으로 검증 완료
(All About Learning Press, Learn English Sounds — `SCRIPT.md` Frame 7 상단 근거 참고). 프레임
제작 시 **SCRIPT.md의 확정 규칙 문구를 그대로 따르고 임의로 재해석하지 않는다** — 특히 EA
단어 중 어느 것이 규칙 그룹이고 어느 것이 예외 그룹인지는 SCRIPT.md에 명시된 대로만 따른다
(MEAT·TEAM=규칙 / HEAD·BREAD·DEAD·SWEAT=예외).

## Frame Treatments (EP16 — 12프레임 배정 + 필요 일러스트)

| # | Frame | 이 씬의 그림 한눈에 | 신규/재사용 컴포넌트 | 필요 일러스트(사용자 제작) |
|---|---|---|---|---|
| 1 | 도입 (Stakes) | 크림 배경에 단어 카드 3장, 모음 위 커서가 머뭇거림 | hesitation-cursor, caption-pill | (없음 — 커서 모션은 CSS) |
| 2 | 채널 인트로 | 워드마크만 | 채널 워드마크(공통) | (없음) |
| 3 | 질문 던지기 | BOAT 확대, O/A 위 손그림 물음표 낙서 | question-flicker, hero-word-block | (없음 — 물음표는 간단한 CSS 도형 가능) |
| 4·5 | 반전 공개·원리 설명 | **입/혀 단면 손그림**이 중심, 카드가 곁들여짐 | lazy-tongue-reveal, illustration-slot, sketch-card | ✅ 입/혀 단면 일러스트(혀가 편히 눕는 모습, 손그림) |
| 6 | 패턴 확장 | 흰 카드 6장이 나란히 쌓임(그림 없이 카드·텍스트 위주) | sketch-cluster | (없음) |
| 7 | 반전 꿀팁(예외) | 카드 3장 + 살짝 놀란 느낌의 낙서(느낌표) | sketch-cluster, trim-path-annotation | ✅ 느낌표/경고 낙서(간단, 선택) |
| 8 | 미니 퀴즈 | 카드 하나가 질문→정답으로 바뀜, 빨간 펜 동그라미 | quiz-reveal, trim-path-annotation | (없음) |
| 9 | 실제 문장에서 읽기 | 문장 카드 4개, 옆에 미니 아이콘 4종 | sentence-card, illustration-slot | ✅ 외투·비구름·사람들(팀)·머리 미니 아이콘 4개 |
| 10 | 소리 내어 읽기 연습 | 4·5의 혀 그림을 다시 불러와 반복 | lazy-tongue-reveal, illustration-slot | (4·5 자산 재사용 — 내용이 같아서 자연히 겹침) |
| 11 | 실전 재확인(페이오프) | Frame 1과 대칭 — 카드가 흐림→선명 | hesitation-cursor→해소 | (없음) |
| 12 | 요약 + 마무리 | 카드 14장 스택 + 혀 그림 한 번 더 | sketch-card 스택, illustration-slot | (4·5 자산 재사용) |
