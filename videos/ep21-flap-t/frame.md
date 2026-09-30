---
version: alpha
name: Understand-English EP21 — Frame System (Sketchnote & Visual Thinking)
description: >
  EP17~19에서 검증된 '비주얼 씽킹 / 스케치노트 인포그래픽' 시스템을 그대로 계승한다.
  EP21은 캐릭터 리액션이 없는 순수 타이포그래피/카드 중심 개념 설명 영상(EP19와 동일 갈래) —
  단어가 철자→플랩 발음으로 크로스페이드 전환되는 것이 화면의 주인공이다. 유일한 예외는
  Line 3의 "혀가 스치듯 지나가는" 조음 원리 설명 — 이건 말로만 설명하면 추상적이라
  구강 단면 AI 일러스트 한 쌍으로 실체를 보여준다(BRIEF.md Assets 절에서 이미 예견됨).
unit: the frame — 1920×1080 (16:9 longform)
principle: "틀(네오브루탈리즘 카드)은 단정하고 튼튼하게, 내부 콘텐츠(단어 변환 카드, 대화 말풍선,
  문장 밑줄 카드, 빈칸 뒤집기 카드, 퀴즈 그리드)는 손그림 잉크 스케치노트 느낌 — 골드/레드
  2색 강조 체계 하나로 '플랩된다/안 된다'를 시청자가 항상 즉시 구분할 수 있게 한다."

colors:
  bg: "#F4EFE6"              # 채널 시그니처 웜크림 베이지 (EP17~19와 동일)
  bg-texture: "#EFE8D8"      # 노트 종이 톤
  card-bg: "#FFFFFF"
  card-bg-warm: "#FAF7F2"

  ink: "#2B2B2B"
  text: "#2B2B2B"
  text-muted: "#7A7365"

  # EP21 전용 2색 강조 체계 ("골드=오늘 배운 지름길이 통한다 / 레드=예외, 안 통한다")
  flap-gold: "#F5C518"       # 채널 시그니처 골드 — 플랩 발생(워러/시리/베러 등)
  flap-gold-glyph: "#8A6D00" # 텍스트/글리프용 (흰 배경 대비 확보)
  no-flap-red: "#E84545"     # 예외(atomic/hotel) — Remotion 시절부터 쓰던 채널 표준 레드 재사용
  bonus-gray: "#9B9384"      # Line 8(N+T) 전용 — "오늘 규칙과 별개"임을 의도적으로 톤 다운
  strike-gray: "#B7AFA0"     # 취소선(워터/시티/베터 등 틀린 발음) 색

  # 대화 말풍선 (Line 1 / Line 11 콜백)
  bubble-friend-bg: "#EFEAE0"
  bubble-speaker-border: "{colors.flap-gold}"

typography:
  body:        { fontFamily: "Noto Sans KR", cqw: 1.8, weight: 700, lineHeight: 1.5, color: "text" }
  body-lg:     { fontFamily: "Noto Sans KR", cqw: 2.4, weight: 800, lineHeight: 1.4, color: "text" }
  label:       { fontFamily: "Noto Sans KR", cqw: 1.1, weight: 700, tracking: "0.02em", color: "text-muted" }
  eyebrow:     { fontFamily: "Noto Sans KR", cqw: 1.2, weight: 900, tracking: "0.04em", upper: true, color: "ink" }
  hand-note:   { fontFamily: "Gaegu", cqw: 2.2, weight: 700, lineHeight: 1.2, color: "flap-gold-glyph" }
  hero-word:   { fontFamily: "Archivo Black", cqw: 6.8, weight: 400, lineHeight: 1.0, color: "ink" }
  hero-word-sm:{ fontFamily: "Archivo Black", cqw: 4.2, weight: 400, lineHeight: 1.0, color: "ink" }
  sentence-en: { fontFamily: "Archivo Black", cqw: 3.0, weight: 400, lineHeight: 1.3, color: "ink" }
  sound-badge: { fontFamily: "Noto Sans KR", cqw: 3.2, weight: 900, lineHeight: 1.0 }

spacing:
  pad-x: "6cqw"
  pad-y: "6cqw"
  gap-cards: "2.4cqw"
  card-border: "3.5px solid #2B2B2B"
  card-shadow: "5px 5px 0px #2B2B2B"
  caption-keep-out-bottom: "12cqh"

# 맞춤형 AI 일러스트 — Line 3 조음 원리 전용, 전체 영상에서 유일한 일러스트 자산
assets:
  mouth_full_stop:
    path: "assets/images/mouth_full_stop.jpg"
    description: >
      Line 3 전용 — 사람 옆얼굴 스케치노트 캐리커처 단면도(EP17 Frame 5 스타일 계승).
      혀끝이 윗잇몸(치조 능선)에 딱 붙어 완전히 막은 상태 — 일반 T를 낼 때의 조음 위치.
      살구빛 피부톤, 굵은 잉크 외곽선, 혀는 핑크빛으로 강조.
  mouth_flap:
    path: "assets/images/mouth_flap.jpg"
    description: >
      Line 3 전용 — 동일 구도, 혀끝이 치조 능선을 살짝 스치듯 튕기는 순간(완전히 안 붙음).
      스치는 궤적을 짧은 모션 라인(잉크 스케치 스타일)으로 표시. mouth_full_stop과
      크로스페이드/모핑되어 "완전히 막는 것 vs 스치고 지나가는 것"의 차이를 보여준다.

components:
  sketchnote-card:
    style: "네오브루탈리즘 + 핸드드로운 인포그래픽 카드 (EP17~19 동일 규격)"
    backgroundColor: "{colors.card-bg}"
    border: "{spacing.card-border}"
    boxShadow: "{spacing.card-shadow}"
    rounded: "18px 22px 16px 20px"

  word-transform-card:
    style: "단어→취소선→플랩 발음 크로스페이드 카드 (Line 3·4·10 전용)"
    description: >
      좌측(또는 상단) `{typography.hero-word}` 영어 단어가 뜨고, 그 위에 {colors.strike-gray}
      취소선이 그어지며 한글 오독("워터"/"시티" 등)이 잠깐 표시됐다가, {colors.flap-gold}
      실제 발음("워러"/"시리")으로 크로스페이드. 단어 중앙 T(또는 D) 글자에 빨간 원이 잠깐
      찍혔다가 혀가 톡 튕기는 짧은 바운스 모션과 함께 전환된다.

  dialogue-bubble-pair:
    style: "친구↔화자 대화 말풍선 (Line 1 도입부 / Line 11 클로징 콜백 전용)"
    description: >
      친구 말풍선({colors.bubble-friend-bg} 배경, 좌측)과 화자 말풍선(흰 배경 +
      {colors.bubble-speaker-border} 골드 테두리, 우측)이 순차 등장. Line 11에서는 같은
      친구 말풍선 스타일을 재사용해 "씨티은행 잘 찾아갔어!"로 서사를 매듭짓는다(시각적 라임).

  practice-progress-card:
    style: "3회 낭독 진행 점 카드 (Line 5 전용, 3라운드 공통)"
    description: >
      단어 카드 하단에 진행 점(●●●)이 발화마다 하나씩 {colors.flap-gold}로 채워짐. 카드 자체는
      1회독마다 살짝 펄스(scale 1→1.05→1). 라운드가 바뀔 때마다 이전 라운드 카드는 옆으로
      밀려나며 축소돼 누적 학습 느낌을 준다. 3라운드(속도업)는 점 애니메이션 타이밍만 단축.

  sentence-underline-card:
    style: "실전 문장 리스닝 카드 (Line 6 전용, 1~2라운드)"
    description: >
      `{typography.sentence-en}`로 영문 문장 한 줄, 플랩 대상 단어(들)에만 {colors.flap-gold}
      밑줄. 1차 재생은 문장 전체가 흐르듯 하이라이트, 2차(천천히)는 대상 단어들이 순서대로
      펄스 강조되며 그 아래 한글 발음이 작게 페이드인.

  blank-flip-card:
    style: "빈칸 맞히기 뒤집기 카드 (Line 6 3라운드 전용, 퀴즈 Line 9와 시각적으로 구분)"
    description: >
      문장 속 빈칸 자리가 물음표 박스로 가려짐 → 정답 공개 시 박스 자체가 카드 뒤집히듯
      회전하며(flip, 세로축 180°) 뒤편에 있던 정답 단어가 {colors.flap-gold}로 드러남.
      Line 9의 "테두리 전환" 방식과 다른 모션이라 두 퀴즈 형식이 시각적으로 겹치지 않는다.

  contrast-pair-card:
    style: "좌우 대비 카드 (Line 7 예외 전용)"
    description: >
      좌측 카드는 {colors.flap-gold} 톡 튕기는 아이콘 + 플랩 발음, 우측 카드는
      {colors.no-flap-red} 테두리 + 혀가 딱 멈추는 정지 아이콘. 색 자체가 "이건 되고 이건
      안 된다"를 설명 없이도 즉시 전달한다.

  bonus-fade-card:
    style: "보너스 심화 카드 (Line 8 전용, 의도적 톤 다운)"
    description: >
      단어 카드에서 글자 하나가 서서히 투명해지며 사라지는 모션. 강조색(골드/레드) 대신
      {colors.bonus-gray} 캡슐을 써서 "오늘의 핵심 규칙이 아니라 참고 정보"임을 색으로도
      구분한다.

  quiz-grid-card:
    style: "3초 긴장감 퀴즈 그리드 (Line 9 전용) — 정답 선노출 완전 차단"
    description: >
      4개 단어 카드가 격자 배치, 카운트다운 중엔 전부 중립 회색. **카운트다운(3초) 동안 정답
      단서가 되는 색·글자는 일체 노출되지 않는다.** 0이 되는 순간 예외 카드만
      {colors.no-flap-red} 테두리로, 나머지는 {colors.flap-gold} 테두리로 동시 전환되며
      플랩 발음이 크로스페이드로 드러난다.

  cheat-sheet-board:
    style: "한눈에 정리하는 규칙 지도 (Line 10 전용)"
    description: >
      카드 한 장에 규칙 2줄(모음 사이 T+뒷모음 무강세→플랩 / T 뒤 음절 강세→그대로) +
      예시 미니 칩 6개({colors.flap-gold}) + 예외 미니 칩 2개({colors.no-flap-red}).

  caption-pill:
    style: "채널 표준 100% 무누락 자막 알약 컴포넌트"
    description: >
      화면 하단 중앙(`bottom: 4cqh; left: 50%; transform: translateX(-50%)`) 순백 캡슐 pill.
      나레이션 전문을 문장 단위로 빠짐없이 매핑. Line 11 엔드스크린 끝 5초 구간만
      규칙대로 무자막(음성 전용) 처리.
