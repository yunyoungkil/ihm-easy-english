---
version: alpha
name: Understand-English EP17 — Frame System (Sketchnote & Visual Thinking)
description: >
  2026-09-18 시각 정체성 확립 — 사용자가 제공한 5종의 '비주얼 씽킹 / 스케치노트 인포그래픽'
  레퍼런스를 우리 채널의 웜크림 네오브루탈리즘 카드 시스템과 완벽하게 결합한 디자인 명세.
  딱딱한 컴퓨터 그래픽이 아닌, '우등생의 친근하고 완벽한 비밀 요약 노트' 느낌을 구현하여
  성인 학습자(3060)의 심리적 부담을 완전히 낮추고 소장 욕구를 극대화한다.
unit: the frame — 1920×1080 (16:9 longform)
principle: "틀(네오브루탈리즘 카드)은 단정하고 튼튼하게, 내부 콘텐츠와 다이어그램(소리 서랍, 화살표,
  미니 픽토그램)은 손그림 잉크 스케치노트 느낌 — 둘을 부드러운 트림패스와 3대 소리 컬러 코딩이 이어준다."

colors:
  # 배경 시스템
  bg: "#F4EFE6"              # 채널 시그니처 웜크림 베이지
  bg-texture: "#EFE8D8"      # 노트 종이 톤
  card-bg: "#FFFFFF"         # 순백 카드 배경
  card-bg-warm: "#FAF7F2"    # 은은한 웜화이트 서랍 배경

  # 잉크 & 텍스트 (WCAG AA 통과 기준)
  ink: "#2B2B2B"             # 두툼한 펜선 잉크 테두리
  text: "#2B2B2B"            # 본문 텍스트 (대비 10:1 이상)
  text-muted: "#7A7365"      # 보조 설명 텍스트
  text-muted-glyph: "#524C40"# 작은 기호용 딥 차콜

  # 3대 소리 서랍 컬러 시스템 ("색은 가르치는 역할")
  # 1번 소리: AR (턱 내리는 시원한 '아~')
  drawer-ar: "#F5A623"       # 골드 앰버 (채우기/배경용)
  drawer-ar-glyph: "#8A5A12" # 텍스트/글리프 전용 (대비 5.5:1 이상)
  drawer-ar-soft: "rgba(245, 166, 35, 0.15)"

  # 2번 소리: OR (입술 모으는 깊은 '오~')
  drawer-or: "#E67E22"       # 딥 오렌지 (채우기/배경용)
  drawer-or-glyph: "#963E00" # 텍스트/글리프 전용 (대비 5.8:1 이상)
  drawer-or-soft: "rgba(230, 126, 34, 0.15)"

  # 3번 소리: ER · IR · UR (힘 뺀 편안한 '어~' — 소리 완벽 통일)
  drawer-er: "#2E86AB"       # 차분하고 지적인 틸 블루 (채우기/배경용)
  drawer-er-glyph: "#165069" # 텍스트/글리프 전용 (대비 6.2:1 이상)
  drawer-er-soft: "rgba(46, 134, 171, 0.15)"

  # 포인트 & 정답 마커
  accent-spark: "#FF4757"    # 빨간 빗금 / 강조 마커 / 정답 도장
  accent-check: "#2ED573"    # 정답 체크마크 그린

typography:
  body:        { fontFamily: "Noto Sans KR", cqw: 1.6, weight: 700, lineHeight: 1.5, color: "text" }
  body-lg:     { fontFamily: "Noto Sans KR", cqw: 2.2, weight: 800, lineHeight: 1.4, color: "text" }
  label:       { fontFamily: "Noto Sans KR", cqw: 1.0, weight: 700, tracking: "0.02em", color: "text-muted" }
  eyebrow:     { fontFamily: "Noto Sans KR", cqw: 1.1, weight: 900, tracking: "0.04em", upper: true, color: "ink" }
  hand-h1:     { fontFamily: "Gaegu", cqw: 4.8, weight: 700, lineHeight: 1.15, color: "ink" }
  hand-note:   { fontFamily: "Gaegu", cqw: 2.4, weight: 700, lineHeight: 1.2, color: "drawer-ar-glyph" }
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
    style: "네오브루탈리즘 + 핸드드로운 인포그래픽 융합 카드"
    backgroundColor: "{colors.card-bg}"
    border: "{spacing.card-border}"
    boxShadow: "{spacing.card-shadow}"
    rounded: "18px 22px 16px 20px" # 자연스러운 손맛을 주는 미세한 비대칭 곡률
    description: >
      화면의 중심을 잡는 단단한 카드 틀. 기계적으로 차갑지 않으면서도
      가독성을 해치지 않도록 외곽선에 3.5px 두께의 볼드 잉크 펜선을 두르고,
      우하단에 5px 솔리드 블랙 드롭섀도를 주어 명확한 깊이감을 부여한다.

  phonetic-symbol-wall:
    style: "사전형 다섯 철자 나열판 (Frame 3 전용, 그룹핑 없음)"
    description: >
      AR/ER/IR/OR/UR 다섯 철자를 사전 표제어처럼 나란히 배열하고, 각 철자 아래
      서로 다른 발음기호(IPA 느낌의 손글씨 태그)를 붙여 "이 다섯 개를 다 외워야
      하나" 하는 밀도감·압박감을 준다. **의도적으로 sound-drawer의 3분할 정리와
      섞지 않는다** — 여기서 답을 보여주면 Frame 4의 반전이 스포일러되므로,
      이 컴포넌트는 "아직 안 풀린 문제"만 표현하고 끝난다(2026-09-18 신설,
      기존엔 Frame 3에서 곧바로 sound-drawer로 정리해버려 Frame 4의 반전이
      무의미해지는 구조적 결함이 있었음).

  sound-drawer:
    style: "3대 소리 서랍 모듈 (AR, OR, ER/IR/UR) — Frame 4에서 처음 등장"
    description: >
      레퍼런스(image copy 4.png, image.png)의 구획화 서랍 스타일.
      상단에 번호 원형 배지(①, ②, ③)가 박혀 있고,
      내부에는 소리 공식과 단어들이 아기자기하게 수납되는 3분할 서랍장 디자인.
      1번 서랍은 {colors.drawer-ar}, 2번은 {colors.drawer-or}, 3번은 {colors.drawer-er}로
      배경 틴트와 포인트 배색을 통일하여 학습자가 색상만으로 소리를 직관 분별하게 한다.
      **Frame 4의 반전(다섯 철자 → 세 소리) 순간에 처음 등장해야 한다** — Frame 3의
      `phonetic-symbol-wall`에는 쓰지 않는다(2026-09-18 확정, 위 항목 참고).

  doodle-icon-slot:
    style: "미니 손그림 픽토그램 슬롯 (image copy 2, 3 스타일)"
    description: >
      단어 옆에 함께 배치되는 귀여운 2D 라인 드로잉 아이콘.
      car(자동차), park(나무/벤치), star(별), corn(옥수수), storm(번개구름),
      bird(새), girl(소녀), nurse(십자가 모자), turn(유턴 화살표) 등.
      검은색 잉크 라인에 은은한 파스텔 채색으로 단어의 의미를 0.5초 만에 뇌에 각인시킨다.

  tongue-mechanism-sketch:
    style: "입속 혀의 움직임 직관 스케치 (Frame 5 전용)"
    description: >
      어려운 해부학 그림이 아니라, 레퍼런스(image.png)처럼 친근하고 유쾌한
      단면 일러스트. 혀가 뒤로 쑥 당겨지며 R의 공간으로 모음이 쏙 빨려 들어가는
      모션을 빨간 점선 화살표와 '자석 흡수' 이펙트로 시각화.

  doodle-connector-arrow:
    style: "다이어그램 연결 화살표 & 점선 브라켓"
    description: >
      철자가 서랍으로 쏙 들어갈 때, 5개 철자가 3개로 압축될 때 이어주는
      손그림 느낌의 굵은 곡선 화살표와 중괄호({, }).
      SVG stroke-dashoffset 애니메이션을 통해 실시간으로 슥 그려지듯 등장.

  caption-pill:
    style: "나레이션 100% 대응 스마트 캡션 필"
    backgroundColor: "{colors.card-bg}"
    border: "2.5px solid {colors.ink}"
    boxShadow: "3px 3px 0px {colors.ink}"
    rounded: "100px"
    description: >
      채널 절대 규칙: 나레이션의 모든 문장을 100% 담아내는 흰색 알약 형태 자막.
      화면 하단(bottom: 5cqh)에 위치하며, 문장이 바뀔 때마다 부드러운
      딥-스왑(Fade + Scale) 모션으로 텍스트가 갱신된다.
      (단, Frame 15 엔드스크린 끝 5초 구간은 중앙과 함께 완전 비움)

---

## Frame Treatments (15프레임별 디자인 매핑)

| 프레임 | 타이틀 & 역할 | 레이아웃 구조 | 핵심 비주얼 컴포넌트 | 손그림 픽토그램/아이콘 |
|---|---|---|---|---|
| **Frame 1** | 도입: 모음 실종 충격 | 3열 대비 수평 카드 | `sketchnote-card` 3개 + 빨간 빗금 애니메이션 | cat➔car, sit➔sir, fox➔for |
| **Frame 2** | 채널 인트로 | 중앙 워드마크 리빌 | 워드마크 + `[ 모음5개 ➔ 소리3개 ]` 뱃지 | 채널 시그니처 배색 (골드 옐로우) |
| **Frame 3** | 질문: 다섯 개의 발음기호 (30초 이탈방지) | 사전형 5철자 나열판 | `phonetic-symbol-wall` (그룹핑 없음, 긴장만 조성) | AR/ER/IR/OR/UR 개별 발음기호 태그 |
| **Frame 4** | 반전 공개: 다섯 개가 사실 세 개 | 3열 합체 카드 → 3대 서랍 | 머지(Merge) 모션 + `sound-drawer` 3개(숫자 반전이 여기서 첫 공개) | her, bird, fur 통일 캡슐 → AR/OR/ER·IR·UR 서랍 |
| **Frame 5** | 원리 설명 (게으른 혀) | 듀얼 인포그래픽 | `tongue-mechanism-sketch` (입안 단면 스케치) | 뒤로 당겨지는 혀 + 자석 흡수 |
| **Frame 6** | 1번 서랍 AR (3회 낭독) | 상단 턱 가이드 + 하단 5단어 | `sound-drawer`(골드) + 턱 낙하 일러스트 | 차, 공원, 별, 농장, 카드 아이콘 |
| **Frame 7** | 2번 서랍 OR (3회 낭독) | 상단 입술 가이드 + 하단 5단어| `sound-drawer`(오렌지) + 둥근 입술 모션 | 옥수수, 폭풍, 포크, 말 아이콘 |
| **Frame 8** | 3번 서랍 심화 (3회 낭독) | 2x3 매트릭스 보드 | `sound-drawer`(틸) + 6대 단어 동시 점등 | 사람, 기간, 소녀, 셔츠, 간호사, 불 아이콘 |
| **Frame 9** | 💡 반전 꿀팁 (앞 R vs 뒤 R) | 좌우 대비 스케치노트 | 좌(앞 R: 발사 화살표) vs 우(뒤 R: 당김 화살표) | red(앞 화살표) vs car(뒤 화살표) |
| **Frame 10** | ⏱️ 3초 퀴즈 1라운드 | 퀴즈 카드 + 3초 타이머 게이지 | 카운트다운 타이머 바 + 서랍 골인 스냅 | smart, short, turn 미니 카드 |
| **Frame 11** | ⚡ 3초 퀴즈 2라운드 | 스피드 퀴즈 쇼케이스 | 연속 정답 도장(Stamp) 이펙트 + 파티클 | dark, fork, first 미니 카드 |
| **Frame 12** | 🗣️ 실전 문장 1 낭독 | 문장 카드 + 단어별 소리 태그 | 좌우 스캔 리딩 바 + 4대 단어 팝업 | `The girl in the car...` |
| **Frame 13** | 🗣️ 실전 문장 2 낭독 | 문장 카드 + 일상 외래어 하이라이트| 완주 축하 엠블럼 + 문장 블록 융합 | `Please order a burger and corn...` |
| **Frame 14** | 📌 체득 요약 족보표 | 3단 마스터 인포그래픽 표 | `image copy 2.png` 스타일의 완벽한 족보 카드 | 캡처 유도 카메라 셔터 아이콘 |
| **Frame 15** | 🎬 클로징 & 엔드스크린 | 상반부 격려 ➔ 끝 5초 중앙 비움 | 안전 구역 좌상단 미니 워드마크 | EP16 추천 썸네일 카드 슬롯 |
