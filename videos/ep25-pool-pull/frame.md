---
version: alpha
name: Understand-English EP25 — Frame System (Warm Cream Neo-Brutalism)
description: >
  EP25 [30분 집중 반복 듣기: Pool vs Pull 장단음 짝단어 20쌍 대조 훈련] 전용 디자인 시스템.
  옵션 1 [웜크림 네오브루탈리즘 — 채널 시그니처 표준]을 적용한다.
  단단한 2.5px 블랙 외곽선 + 4px 하드 오프셋 그림자의 네오 카드 위에
  좌측 [uː] 긴장음 (초록 테마) vs 우측 [ʊ] 이완음 (골드 테마) 1:1 대조 레이아웃을 구현한다.
unit: the frame — 1920×1080 (16:9 longform)

colors:
  bg: "#F4EFE6"              # 채널 시그니처 웜크림 베이지
  bg-warm: "#FAF7F2"         # 연한 크림 카드 배경
  card-bg: "#FFFFFF"         # 순백 카드 배경
  ink: "#111111"             # 딥 잉크 블랙
  text: "#111111"            # 기본 본문 텍스트
  text-muted: "#7A7365"      # 보조 텍스트 (올리브 그레이)

  # EP25 전용 대비 강조 색상
  tense-green: "#10B981"     # [uː] 긴장음 (입술 모으기) 강조 그린
  lax-gold: "#F59E0B"        # [ʊ] 이완음 (턱 힘 뺌) 강조 골드
  caution-red: "#EF4444"     # 주의 단어 (fool vs full) 경고 레드
  border-black: "#111111"    # 네오브루탈리즘 외곽선

typography:
  body:        { fontFamily: "Noto Sans KR", cqw: 1.8, weight: 700, lineHeight: 1.5, color: "text" }
  body-lg:     { fontFamily: "Noto Sans KR", cqw: 2.4, weight: 800, lineHeight: 1.4, color: "text" }
  label:       { fontFamily: "Noto Sans KR", cqw: 1.1, weight: 700, tracking: "0.02em", color: "text-muted" }
  eyebrow:     { fontFamily: "Noto Sans KR", cqw: 1.2, weight: 900, tracking: "0.04em", upper: true, color: "ink" }
  hero-word:   { fontFamily: "Archivo Black", cqw: 6.0, weight: 400, lineHeight: 1.0, color: "ink" }
  sentence-en: { fontFamily: "Archivo Black", cqw: 3.2, weight: 400, lineHeight: 1.3, color: "ink" }
  sound-badge: { fontFamily: "Noto Sans KR", cqw: 2.4, weight: 900, lineHeight: 1.0 }

spacing:
  pad-x: "6cqw"
  pad-y: "6cqw"
  gap-cards: "2.4cqw"
  card-border: "2.5px solid #111111"
  card-shadow: "4px 4px 0px #111111"
  caption-keep-out-bottom: "12cqh"

assets:
  f02_vocal_tract:
    path: "assets/images/f02_vocal_tract_comparison.jpg"
    description: "F02 조음 비교 단면도 ([uː] 텐션 vs [ʊ] 이완)"
  f07_dialogue_ambience:
    path: "assets/videos/f07_dialogue_ambience.mp4"
    description: "F07 실전 문장 대화용 앰비언스 배경 루프 비디오"
