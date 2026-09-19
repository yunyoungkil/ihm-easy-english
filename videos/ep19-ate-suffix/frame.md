---
version: alpha
name: Understand-English EP19 — Frame System (Sketchnote & Visual Thinking)
description: >
  2026-09-19 시각 정체성 확립 — EP17·EP18에서 검증된 '비주얼 씽킹 / 스케치노트 인포그래픽' 시스템을
  계승하고, EP19의 핵심인 '동사 [-에이트] vs 명사·형용사 [-엇/잇]'의 대비를 선명하게 보여주기 위한
  2대 소리 컬러 코딩(행동 버밀리온 코랄 vs 이름/상태 틸 블루)과 5대 맞춤형 AI 일러스트 에셋을 신설한다.
  웜크림 네오브루탈리즘 카드 틀 + 손그림 잉크 다이어그램 결합으로 '우등생의 완벽한 소리 요약 노트' 느낌을 구현한다.
unit: the frame — 1920×1080 (16:9 longform)
principle: "틀(네오브루탈리즘 카드)은 단정하고 튼튼하게, 내부 콘텐츠와 다이어그램(소리 대비 카드, 에너지 게이지,
  초콜릿 쪼개짐, 3초 퀴즈 타이머, 문장 카라오케)은 손그림 잉크 스케치노트 느낌 — 둘을 부드러운 트림패스와
  직관적인 2대 소리 컬러 코딩이 이어준다."

colors:
  # 배경 시스템 (채널 시그니처 웜크림 캔버스)
  bg: "#F4EFE6"              # 채널 시그니처 웜크림 베이지
  bg-texture: "#EFE8D8"      # 노트 종이 톤
  card-bg: "#FFFFFF"         # 순백 카드 배경
  card-bg-warm: "#FAF7F2"    # 은은한 웜화이트 카드 배경

  # 잉크 & 텍스트 (WCAG AA 통과 기준 10:1 이상)
  ink: "#2B2B2B"             # 두툼한 펜선 잉크 외곽선
  text: "#2B2B2B"            # 본문 텍스트
  text-muted: "#7A7365"      # 보조 설명 텍스트
  text-muted-glyph: "#524C40"# 작은 기호용 딥 차콜

  # EP19 전용 2대 소리 컬러 시스템 ("색은 품사와 에너지의 역할을 전달")
  # 1. 동사 (움직이는 행동 ➔ 끝소리 에너지 유지 ➔ '에이트')
  verb-coral: "#FF5E57"      # 활력 있는 버밀리온 코랄 (채우기/아이콘)
  verb-glyph: "#C0392B"      # 텍스트/글리프 전용 (흰 배경 대비 ≈5.6:1)
  verb-soft: "rgba(255, 94, 87, 0.15)"
  verb-highlight: "#FFD32A"  # [-에이트] 점등용 골드 옐로우
  verb-neon: "rgba(255, 94, 87, 0.6)" # 동사 카드 활성화 네온 글로우

  # 2. 명사·형용사 (사물의 이름/상태 ➔ 끝소리 0% 완전 이완 ➔ '엇/잇')
  noun-blue: "#2E86AB"       # 차분하고 지적인 틸 블루 (채우기/아이콘)
  noun-glyph: "#165069"      # 텍스트/글리프 전용 (흰 배경 대비 ≈6.2:1)
  noun-soft: "rgba(46, 134, 171, 0.15)"
  noun-highlight: "rgba(46, 134, 171, 0.25)" # [-엇/잇] 축약용 소프트 블루
  noun-neon: "rgba(46, 134, 171, 0.6)" # 명사/형용사 카드 활성화 네온 글로우

  # 브랜드 & 포인트
  brand-yellow: "#F5C518"    # 채널 시그니처 골드 옐로우 ("쉬운영어" 워드마크)
  accent-check: "#2ED573"    # 정답 체크마크 그린
  accent-strike: "#FF4757"   # 콩글리시 붉은 취소선

typography:
  # 모바일 가독성 기준 (Mobile-First: 최소 120px 뷰포트에서도 또렷하게 식별)
  body:        { fontFamily: "Noto Sans KR", cqw: 1.8, weight: 700, lineHeight: 1.5, color: "text" }
  body-lg:     { fontFamily: "Noto Sans KR", cqw: 2.4, weight: 800, lineHeight: 1.4, color: "text" }
  label:       { fontFamily: "Noto Sans KR", cqw: 1.1, weight: 700, tracking: "0.02em", color: "text-muted" }
  eyebrow:     { fontFamily: "Noto Sans KR", cqw: 1.2, weight: 900, tracking: "0.04em", upper: true, color: "ink" }
  hand-h1:     { fontFamily: "Gaegu", cqw: 5.0, weight: 700, lineHeight: 1.15, color: "ink" }
  hand-note:   { fontFamily: "Gaegu", cqw: 2.6, weight: 700, lineHeight: 1.2, color: "verb-glyph" }
  hero-word:   { fontFamily: "Archivo Black", cqw: 6.8, weight: 400, lineHeight: 1.0, color: "ink" }
  sound-badge: { fontFamily: "Noto Sans KR", cqw: 3.2, weight: 900, lineHeight: 1.0 }

spacing:
  pad-x: "6cqw"
  pad-y: "6cqw"
  gap-cards: "2.4cqw"
  card-border: "3.5px solid #2B2B2B"
  card-shadow: "5px 5px 0px #2B2B2B"
  caption-keep-out-bottom: "12cqh"

# 맞춤형 실사/스케치노트 시각 에셋 라이브러리
assets:
  vocal_energy_flow:
    path: "assets/images/vocal_energy_flow.jpg"
    description: "Frame 3 전용 — 1음절 제1강세 공통 속 끝소리 에너지 분기(불꽃 에너지 vs 이완 나뭇잎) 인체 일러스트"
  estimate_invoice:
    path: "assets/images/estimate_invoice.jpg"
    description: "Frame 4 전용 — 비즈니스 견적서(명사) 서류 클립보드 스케치노트"
  restaurant_check:
    path: "assets/images/restaurant_check.jpg"
    description: "Frame 5 전용 — 해외 레스토랑 계산서(SEPARATE CHECK) 영수증 스케치노트"
  gold_certificate:
    path: "assets/images/gold_certificate.jpg"
    description: "Frame 6 전용 — 금박 압인 리본 공식 수료증/자격증(CERTIFICATE) 스케치노트"
  chocolate_break:
    path: "assets/images/chocolate_break.jpg"
    description: "Frame 7 전용 — 반으로 깔끔하게 쪼개지는 초콜릿 바(CHOCOLATE) 스케치노트"

components:
  sketchnote-card:
    style: "네오브루탈리즘 + 핸드드로운 인포그래픽 융합 카드 (EP17·18 동일 규격)"
    backgroundColor: "{colors.card-bg}"
    border: "{spacing.card-border}"
    boxShadow: "{spacing.card-shadow}"
    rounded: "18px 22px 16px 20px"
    description: >
      화면의 중심을 잡는 단단한 카드 틀. 외곽선 3.5px 볼드 잉크 펜선 + 우하단 5px 솔리드 블랙 드롭섀도.

  contrast-dual-card:
    style: "좌우 1:1 즉시대조 카드 (동사 vs 명사/형용사) — Frame 1, 4, 5, 6 전용"
    description: >
      화면 좌측은 [ 🔴 동사 (행동) ], 우측은 [ 🔵 명사/형용사 (이름표) ]로 좌우 2열 대칭 분할 (가로폭 각각 42cqw, 높이 60cqh).
      좌측은 끝부분 -ATE에 {colors.verb-highlight}가 환하게 점등되고, 우측은 앞글자가 강조되며
      끝부분 -ate는 연한 회색과 취소선으로 부드럽게 축약(vowel reduction)된다.
      하단에 {colors.hand-note} 손글씨 코칭 팁("턱에 힘 빼고 툭!")이 배치된다.
      시청자 3회 낭독 구간에서 활성화 카드가 {colors.noun-neon} 또는 {colors.verb-neon}으로 3회 박동.

  energy-gauge-sketch:
    style: "끝소리 에너지 보조 장착 vs 0% 완전 이완 인체역학 게이지 (Frame 3 전용)"
    description: >
      `assets/images/vocal_energy_flow.jpg` 일러스트를 중앙에 배치하고, 나레이션에 맞춰
      동사 불꽃 경로(🔥)와 명사 이완 경로(💨)를 순차 점등 오버레이.

  secret-tip-showcase:
    style: "초콜릿 쪼개짐 & 일상 단어 쇼케이스 (Frame 7 전용)"
    description: >
      좌측에 `assets/images/chocolate_break.jpg` 일러스트가 스케일 업 진입하고,
      우측에 `choco [ LATE ]` ➔ 명사이므로 '초콜레이트' ❌ ➔ '초콜릿' ⭕ 변환 카드와
      `climate [클라이멋]`, `private [프라이벗]` 카드가 릴레이 팝업.

  quiz-countdown-card:
    style: "3초 긴장감 퀴즈 카드 (Frame 8, 9 전용) — 정답 선노출 완전 차단"
    description: >
      상단에 문제 단어와 역할 힌트가 뜨고, 중앙에 3초 원형 타이머 링이 돌아간다.
      **카운트다운(3초) 중에는 정답 글자색이나 보기 강조가 일체 노출되지 않는다**.
      카운트다운이 0이 되는 순간 정답 보기에 볼드 네온 테두리와 축하 팡파레 점등.

  sentence-karaoke-card:
    style: "미드 2단 콤보 실전 문장 리스닝 카드 (Frame 10 전용)"
    description: >
      상단: *"Can you estimate the cost?"* ➔ `estimate` [에스티메이트] 골드 하이라이트.
      하단: *"Send me the estimate."* ➔ `estimate` [에스티멋] 스카이블루 하이라이트.
      Whisper 단어 단위 타임스탬프(`10.words.json`)에 맞춰 음성 발화와 1:1로 칼싱크 카라오케 점등.

  summary-master-board:
    style: "한눈에 정리하는 -ATE 공식 지도 (Frame 11 전용 캡처 마스터보드)"
    description: >
      상단 헤더에 `[ 📸 지금 화면을 캡처해 두세요! ]` 뱃지.
      좌측: 동사 4대 단어 쇼케이스 (estimate, separate, graduate, moderate) ➔ `[-에이트]`
      우측: 명사/형용사 5대 단어 쇼케이스 (estimate, separate, certificate, chocolate, delegate) ➔ `[-엇 / -잇]`

  caption-pill:
    style: "채널 표준 100% 무누락 자막 알약 컴포넌트"
    description: >
      화면 하단 중앙(`bottom: 4cqh; left: 50%; transform: translateX(-50%)`)에 위치한 순백 캡슐 pill.
      나레이션 전문을 문장 단위로 빠짐없이 매핑하여 청각 장애인 및 무음 시청자에게 완벽한 가독성 제공.
      단, Frame 12의 엔드스크린 끝 5초 구간은 의도적으로 중앙을 비우기 위해 무자막 처리.
