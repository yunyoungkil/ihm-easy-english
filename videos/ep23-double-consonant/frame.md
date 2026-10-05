---
version: alpha
name: Understand-English EP23 — Frame System (Warm Cream Neo-Brutalism)
description: >
  EP23 [30분 집중 반복 듣기: 같은 자음 두 개는 한 번만 소리 난다] 전용 디자인 시스템.
  옵션 1 [웜크림 네오브루탈리즘 — 채널 시그니처 표준]을 완벽히 계승한다.
  틀(네오브루탈리즘 카드)은 단정하고 튼튼하게(2.5px 블랙 외곽선 + 4px 하드 오프셋 그림자),
  내부 콘텐츠는 직관적인 타이포그래피와 알약 뱃지로 구성한다.
  HyperFrames(HTML/CSS/GSAP) 코드로 100% 구현 가능한 텍스트 카드, 뱃지, 비교 다이어그램을 기본으로 하며,
  인체 해부학적 구강 조음 단면도(F02)와 카페 실전 영상(F09) 2종의 엄선된 미디어 자산을 슬롯에 완벽 배치한다.
unit: the frame — 1920×1080 (16:9 longform)

colors:
  bg: "#F4EFE6"              # 채널 시그니처 웜크림 베이지
  bg-warm: "#FAF7F2"         # 연한 크림 카드 배경
  card-bg: "#FFFFFF"         # 순백 카드 배경
  ink: "#111111"             # 딥 잉크 블랙
  text: "#111111"            # 기본 본문 텍스트
  text-muted: "#7A7365"      # 보조 텍스트 (다크 베이지/올리브 그레이)

  # EP23 전용 강조 색상 체계
  double-red: "#EF4444"      # 겹자음 철자 강조 (FF, LL, SS, PP 등 겹친 글자)
  one-sound-gold: "#F59E0B"  # '소리는 딱 한 번' 알약 뱃지 및 정답 발음 강조 골드
  one-sound-gold-glyph: "#8A6D00" # 골드 텍스트용 고대비 색상
  success-green: "#10B981"   # 정답 및 규칙 적용 확인 그린
  strike-gray: "#B7AFA0"     # 취소선 (두 번 발음하려는 오독 표기)
  border-black: "#111111"    # 네오브루탈리즘 외곽선

typography:
  body:        { fontFamily: "Noto Sans KR", cqw: 1.8, weight: 700, lineHeight: 1.5, color: "text" }
  body-lg:     { fontFamily: "Noto Sans KR", cqw: 2.4, weight: 800, lineHeight: 1.4, color: "text" }
  label:       { fontFamily: "Noto Sans KR", cqw: 1.1, weight: 700, tracking: "0.02em", color: "text-muted" }
  eyebrow:     { fontFamily: "Noto Sans KR", cqw: 1.2, weight: 900, tracking: "0.04em", upper: true, color: "ink" }
  hand-note:   { fontFamily: "Gaegu", cqw: 2.4, weight: 700, lineHeight: 1.2, color: "one-sound-gold-glyph" }
  hero-word:   { fontFamily: "Archivo Black", cqw: 7.2, weight: 400, lineHeight: 1.0, color: "ink" }
  hero-word-sm:{ fontFamily: "Archivo Black", cqw: 4.8, weight: 400, lineHeight: 1.0, color: "ink" }
  sentence-en: { fontFamily: "Archivo Black", cqw: 3.2, weight: 400, lineHeight: 1.3, color: "ink" }
  sound-badge: { fontFamily: "Noto Sans KR", cqw: 3.0, weight: 900, lineHeight: 1.0 }

spacing:
  pad-x: "6cqw"
  pad-y: "6cqw"
  gap-cards: "2.4cqw"
  card-border: "2.5px solid #111111"
  card-shadow: "4px 4px 0px #111111"
  caption-keep-out-bottom: "12cqh"

assets:
  f02_vocal_tract:
    path: "assets/images/f02_vocal_tract.jpg"
    description: >
      F02 전용 — 인체 해부학적 구강 조음 단면도 (입술·혀의 공기 차단 및 개방 원리).
      웜크림 네오브루탈리즘 스타일 인포그래픽.
  f09_cafe_scene:
    path: "assets/videos/f09_cafe_scene.mp4"
    description: >
      F09 전용 — 뉴욕 에스프레소 바 카운터와 테이크아웃 커피잔 2개, 영수증 8초 모션 영상.
      따뜻한 웜크림 네오브루탈리즘 감성.

components:
  neo-card:
    style: "웜크림 네오브루탈리즘 카드"
    backgroundColor: "{colors.card-bg}"
    border: "{spacing.card-border}"
    boxShadow: "{spacing.card-shadow}"
    borderRadius: "16px"

  pill-badge:
    style: "강조 알약 뱃지 (DOUBLE LETTER, ONE SOUND 등)"
    backgroundColor: "{colors.one-sound-gold}"
    border: "2px solid #111111"
    boxShadow: "2px 2px 0px #111111"
    borderRadius: "999px"
    padding: "0.6cqh 1.8cqw"
    color: "#111111"
    fontWeight: "900"

  repeat-dot-indicator:
    style: "6회 반복 듣기 점 인디케이터 (●●●●●●)"
    description: "각 발화마다 점이 채워지며 진행 상태를 직관적으로 전달"

  caption-pill:
    style: "화면 하단 자막 알약 바 (Whisper 칼싱크)"
    backgroundColor: "rgba(255, 255, 255, 0.97)"
    border: "{spacing.card-border}"
    boxShadow: "{spacing.card-shadow}"
    borderRadius: "36px"
    padding: "1.1cqh 2.6cqw"
    fontFamily: "Noto Sans KR"
    fontWeight: "800"
    fontSize: "1.5cqw"
    color: "#111111"
---
