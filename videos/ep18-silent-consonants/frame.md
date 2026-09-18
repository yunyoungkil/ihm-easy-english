---
version: alpha
name: Understand-English EP18 — Frame System (Sketchnote & Visual Thinking)
description: >
  2026-09-18 시각 정체성 확립 — EP17에서 검증된 '비주얼 씽킹 / 스케치노트 인포그래픽' 시스템을
  그대로 계승한다. 웜크림 네오브루탈리즘 카드 틀 + 손그림 잉크 다이어그램 결합으로 '우등생의
  친근하고 완벽한 비밀 요약 노트' 느낌을 유지하여 채널 시각 일관성을 지킨다.
unit: the frame — 1920×1080 (16:9 longform)
principle: "틀(네오브루탈리즘 카드)은 단정하고 튼튼하게, 내부 콘텐츠와 다이어그램(소리 서랍, 화살표,
  구강 단면, 미니 픽토그램)은 손그림 잉크 스케치노트 느낌 — 둘을 부드러운 트림패스와 3대 소리
  컬러 코딩이 이어준다."

colors:
  # 배경 시스템 (EP17과 동일 — 채널 시그니처)
  bg: "#F4EFE6"              # 채널 시그니처 웜크림 베이지
  bg-texture: "#EFE8D8"      # 노트 종이 톤
  card-bg: "#FFFFFF"         # 순백 카드 배경
  card-bg-warm: "#FAF7F2"    # 은은한 웜화이트 서랍 배경

  # 잉크 & 텍스트 (WCAG AA 통과 기준)
  ink: "#2B2B2B"             # 두툼한 펜선 잉크 테두리
  text: "#2B2B2B"            # 본문 텍스트 (대비 10:1 이상)
  text-muted: "#7A7365"      # 보조 설명 텍스트
  text-muted-glyph: "#524C40"# 작은 기호용 딥 차콜

  # 3대 소리 서랍 컬러 시스템 ("색은 가르치는 역할") — EP17에서 WCAG AA 검증된 배색 재사용
  # 1번 서랍: KN- (K 탈락, N으로 출발)
  drawer-kn: "#F5A623"       # 골드 앰버 (채우기/배경용)
  drawer-kn-glyph: "#8A5A12" # 텍스트/글리프 전용 (흰 배경 대비 ≈5.5:1)
  drawer-kn-soft: "rgba(245, 166, 35, 0.15)"

  # 2번 서랍: -MB (B 탈락, M으로 마무리)
  drawer-mb: "#E67E22"       # 딥 오렌지 (채우기/배경용)
  drawer-mb-glyph: "#963E00" # 텍스트/글리프 전용 (흰 배경 대비 ≈5.8:1)
  drawer-mb-soft: "rgba(230, 126, 34, 0.15)"

  # 3번 서랍: WR- (W 탈락, R로 미끄러짐)
  drawer-wr: "#2E86AB"       # 차분하고 지적인 틸 블루 (채우기/배경용)
  drawer-wr-glyph: "#165069" # 텍스트/글리프 전용 (흰 배경 대비 ≈6.2:1)
  drawer-wr-soft: "rgba(46, 134, 171, 0.15)"

  # 포인트 & 정답 마커
  accent-spark: "#FF4757"    # 빨간 빗금 / 탈락 표시 / 정답 도장
  accent-check: "#2ED573"    # 정답 체크마크 그린
  accent-lock: "#524C40"     # 묵음 자물쇠 아이콘 딥 차콜

typography:
  body:        { fontFamily: "Noto Sans KR", cqw: 1.6, weight: 700, lineHeight: 1.5, color: "text" }
  body-lg:     { fontFamily: "Noto Sans KR", cqw: 2.2, weight: 800, lineHeight: 1.4, color: "text" }
  label:       { fontFamily: "Noto Sans KR", cqw: 1.0, weight: 700, tracking: "0.02em", color: "text-muted" }
  eyebrow:     { fontFamily: "Noto Sans KR", cqw: 1.1, weight: 900, tracking: "0.04em", upper: true, color: "ink" }
  hand-h1:     { fontFamily: "Gaegu", cqw: 4.8, weight: 700, lineHeight: 1.15, color: "ink" }
  hand-note:   { fontFamily: "Gaegu", cqw: 2.4, weight: 700, lineHeight: 1.2, color: "drawer-kn-glyph" }
  hero-word:   { fontFamily: "Archivo Black", cqw: 7.0, weight: 400, lineHeight: 1.0, color: "ink" }
  drawer-num:  { fontFamily: "Archivo Black", cqw: 2.8, weight: 400, color: "card-bg" }

spacing:
  pad-x: "6cqw"
  pad-y: "6cqw"
  gap-cards: "2.2cqw"
  card-border: "3.5px solid #2B2B2B"
  card-shadow: "5px 5px 0px #2B2B2B"
  caption-keep-out-bottom: "12cqh"

components:
  sketchnote-card:
    style: "네오브루탈리즘 + 핸드드로운 인포그래픽 융합 카드 (EP17과 동일 규격 재사용)"
    backgroundColor: "{colors.card-bg}"
    border: "{spacing.card-border}"
    boxShadow: "{spacing.card-shadow}"
    rounded: "18px 22px 16px 20px"
    description: >
      화면의 중심을 잡는 단단한 카드 틀. 외곽선 3.5px 볼드 잉크 펜선 + 우하단 5px 솔리드
      블랙 드롭섀도.

  silent-letter-wall:
    style: "사전형 무작위 예외 나열판 (Frame 3 전용, 원리 정리 없음)"
    description: >
      k[n]ife, thu[m]b, [w]rong, k[n]ock, lam[b]처럼 소리 안 나는 철자가 단어마다
      제각각 다른 위치에 흩어져 있는 밀도 높은 벽을 구성해 "이걸 다 따로 외워야 하나"
      하는 압박감을 준다. **의도적으로 silent-drawer의 3분할 정리와 섞지 않는다** —
      여기서 하나로 묶어버리면 Frame 4의 반전(무작위 예외가 아니라 하나의 원리)이
      스포일러된다. 이 컴포넌트는 "아직 안 풀린 문제"만 표현하고 끝난다
      (EP17의 phonetic-symbol-wall과 같은 역할·같은 이유).

  silent-drawer:
    style: "3대 소리 서랍 모듈 (KN, MB, WR) — Frame 4에서 처음 등장"
    description: >
      상단에 번호 원형 배지(①, ②, ③)가 박힌 3분할 서랍장 디자인. 1번 서랍은
      {colors.drawer-kn}, 2번은 {colors.drawer-mb}, 3번은 {colors.drawer-wr}로
      배경 틴트와 포인트 배색을 통일하여 학습자가 색상만으로 패턴을 직관 분별하게 한다.
      **Frame 4의 반전(무작위 예외 → 하나의 원리로 정리) 순간에 처음 등장해야 한다** —
      Frame 3의 `silent-letter-wall`에는 쓰지 않는다.

  articulation-collision-sketch:
    style: "입속 조음 충돌 직관 스케치 (Frame 5 전용)"
    description: >
      어려운 해부학 그림이 아니라 친근하고 유쾌한 구강 단면 일러스트 2컷.
      왼쪽(KN): 목구멍 쪽 K에서 앞니 뒤 N까지 혀가 먼 거리를 급하게 이동하는 궤적을
      빨간 점선으로 표시. 오른쪽(MB): 입술을 닫은 채(M) 다시 터뜨리는(B) 이중 동작에
      붉은 경고등 → 편안한 지름길(닫은 채 유지)로 녹색 전환.

  drop-letter-strike:
    style: "탈락 글자 취소선/투명화 이펙트"
    description: >
      묵음 철자(K, B, W)가 부드러운 붉은 사선(빗금) 또는 반투명 페이드로 소거되는
      공통 모션 언어. Frame 1(첫 등장)부터 Frame 14(요약)까지 전 프레임에서 동일한
      시각 문법으로 재사용해 "이 글자는 소리 안 남"을 색·모션 하나로 즉시 인지시킨다.

  id-card-homophone:
    style: "동음이의어 신분증 대비 카드 (Frame 9 전용)"
    description: >
      knight(기사) vs night(밤), knot(매듭) vs not(아니다)처럼 소리는 완전히 같지만
      철자만 다른 단어쌍을 좌우로 배치. 귀로는 구분 안 되는 소리, 눈으로는 1초 만에
      구분되는 철자를 대비시켜 "묵음 철자 = 뜻을 지켜주는 신분증"이라는 반전 꿀팁을
      시각화한다.

  quiz-countdown-card:
    style: "3초 실전 퀴즈 카드 (Frame 10·11 전용)"
    description: >
      **⚠️ 정답 스포일러 방지 필수(EP17 Frame 10·11 사고 재발 방지)**: 문제 출제 및 3초
      카운트다운 동안에는 단어를 순수 검정 기본 텍스트로만 표시하고, 어느 글자가
      묵음인지 알려주는 괄호·브래킷·색상 하이라이트를 절대 미리 주지 않는다. 카운트다운이
      끝나고 정답(몇 번 서랍인지) 발화·도장 연출과 정확히 같은 시점에만 해당 묵음
      글자에 취소선/투명화(`drop-letter-strike`)와 서랍 색이 동시 점등되도록 한다.

  caption-pill:
    style: "나레이션 100% 대응 스마트 캡션 필 (EP17과 동일 규격)"
    backgroundColor: "{colors.card-bg}"
    border: "2.5px solid {colors.ink}"
    boxShadow: "3px 3px 0px {colors.ink}"
    rounded: "100px"
    description: >
      채널 절대 규칙: 나레이션의 모든 문장을 100% 담아내는 흰색 알약 형태 자막.
      화면 하단(bottom: 5cqh)에 위치, 문장 전환 시 딥-스왑(Fade + Scale) 모션.
      (단, Frame 15 엔드스크린 끝 5초 구간은 중앙과 함께 완전 비움)

---

## Frame Treatments (15프레임별 디자인 매핑)

| 프레임 | 타이틀 & 역할 | 레이아웃 구조 | 핵심 비주얼 컴포넌트 | 손그림 픽토그램/아이콘 |
|---|---|---|---|---|
| **Frame 1** | 도입: 첫 글자·끝 글자 소멸 충격 | 3열 대비 수평 카드 | `sketchnote-card` 3개 + `drop-letter-strike` | knee, climb, write 3단어 |
| **Frame 2** | 채널 인트로 | 중앙 워드마크 리빌 | 워드마크 + `[ 혀가 편해지는 묵음 자음 공식 ]` 뱃지 | 채널 시그니처 배색(골드 옐로우) |
| **Frame 3** | 질문: 사전 속 무작위 예외의 벽 (30초 이탈방지) | 무질서 단어 나열판 | `silent-letter-wall` (그룹핑 없음, 긴장만 조성) | knife, thumb, wrong, knock, lamb |
| **Frame 4** | 반전 공개: 예외가 아니라 게으른 혀의 선택 | 타임머신 컷 → 3대 서랍 | 머지(Merge) 모션 + `silent-drawer` 3개(반전이 여기서 첫 공개) | KN/MB/WR 서랍 아이콘 |
| **Frame 5** | 원리 설명 (조음 충돌 회피) | 듀얼 인포그래픽 | `articulation-collision-sketch` (구강 단면 스케치 2컷) | 혀 궤적 화살표 + 입술 이중동작 |
| **Frame 6** | 1번 서랍 KN- (3회 낭독) | 상단 코칭 팁 + 하단 5단어 | `silent-drawer`(골드) + `drop-letter-strike` | knee🦵 know knife🔪 knock knight🛡️ |
| **Frame 7** | 2번 서랍 -MB (3회 낭독) | 상단 코칭 팁 + 하단 5단어 + 외래어 힌트 칩 | `silent-drawer`(오렌지) + 자물쇠 아이콘(`accent-lock`) | climb comb🪮 thumb👍 lamb🐑 bomb💣 |
| **Frame 8** | 3번 서랍 WR- (3회 낭독) | 상단 코칭 팁 + 하단 5단어 매트릭스 | `silent-drawer`(틸) + 슬라이딩 가속 모션 | write✍️ wrong❌ wrist wrap🎁 wreck |
| **Frame 9** | 💡 반전 꿀팁 (묵음 철자 = 신분증) | 좌우 대칭 동음이의어 카드 | `id-card-homophone` | knight🛡️ vs night🌙, knot🪢 vs not❌ |
| **Frame 10** | ⏱️ 3초 퀴즈 1라운드 (신규 단어) | 퀴즈 카드 + 3초 타이머 게이지 | `quiz-countdown-card` + 서랍 골인 스냅 | knit, crumb, wreath 미니 카드 |
| **Frame 11** | ⚡ 3초 퀴즈 2라운드 스피드 (신규 단어) | 스피드 퀴즈 쇼케이스 | `quiz-countdown-card` + 연속 정답 도장(Stamp) | numb, knob, wrench 미니 카드 |
| **Frame 12** | 🗣️ 실전 문장 1 낭독 (KN 묶음) | 문장 카드 + 단어별 묵음 태그 | 좌우 스캔 리딩 바 + 3대 단어 팝업 | `The knight with a sharp knife is kneeling...` |
| **Frame 13** | 🗣️ 실전 문장 2 낭독 (MB + WR) | 문장 카드 + 단어별 소리 태그 | 완주 축하 엠블럼 + 문장 블록 융합 | `Please comb your hair and wrap...` |
| **Frame 14** | 📌 체득 요약 족보표 | 3단 마스터 인포그래픽 표 | 3행 요약 카드 + 캡처 유도 카메라 셔터 아이콘 | KN/MB/WR 각 대표 단어 3종 |
| **Frame 15** | 🎬 클로징 & 엔드스크린 | 상반부 격려 ➔ 끝 5초 중앙 비움 | 안전 구역 좌상단 미니 워드마크 | EP17 추천 썸네일 카드 슬롯 |
