---
version: alpha
name: Understand-English EP20 — Frame System (World R & L Lazy Tongue)
description: >
  EP17~EP19에서 검증된 채널 공식 '비주얼 씽킹 / 스케치노트 인포그래픽' 시스템을 계승하고,
  EP20의 핵심 메커니즘("R 뒤의 L은 혀끝을 대지 않고 목구멍으로 울린다")을 시각화하기 위해
  4대 소리 컬러 코딩([우] 네온 옐로우, [어] 웜 코랄, [을] 딥 스카이블루, [드] 에메랄드 민트)과
  12fps 종이 컷아웃 레고 조립감, 물리적 촉각 피직스(화면 진동 셰이크, 화이트 플래시 스파크)를 정의한다.
unit: the frame — 1920×1080 (16:9 longform)
principle: >
  틀(네오브루탈리즘 카드)은 단정하고 튼튼하게, 내부 콘텐츠는 찰진 아날로그 종이 컷아웃 손맛.
  캐릭터는 검증된 3대 에셋(char_confused, char_celebrate, char_closing)으로 원포인트 절제하고,
  스톱모션의 에너지는 4개 소리 종이 블록의 레고 조립과 물리적 도장 타격감에 100% 집중한다.

colors:
  # 배경 시스템 (채널 시그니처 웜크림 캔버스)
  bg: "#F4EFE6"              # 채널 시그니처 웜크림 베이지
  bg-texture: "#EFE8D8"      # 은은한 재생종이 톤
  card-bg: "#FFFFFF"         # 순백 카드 배경
  card-bg-warm: "#FAF7F2"    # 은은한 웜화이트 카드 배경

  # 잉크 & 텍스트 (WCAG AA 통과 기준 10:1 이상)
  ink: "#2B2B2B"             # 두툼한 펜선 잉크 외곽선
  text: "#2B2B2B"            # 본문 텍스트
  text-muted: "#7A7365"      # 보조 설명 텍스트
  text-muted-glyph: "#524C40"# 작은 기호용 딥 차콜

  # EP20 전용 4대 소리 컬러 시스템 ("소리의 역할과 물리적 조음 위치 전달")
  # 1. [우] 입술 모으기
  sound-woo: "#FFE500"       # 네온 옐로우 (입술을 붕어처럼 모으는 신호)
  sound-woo-soft: "rgba(255, 229, 0, 0.2)"

  # 2. [어] 턱 힘 툭 빼기 (합치면 '워~')
  sound-eo: "#FF9F43"        # 웜 코랄 (하품하듯 아래턱 힘 빼기)
  sound-eo-soft: "rgba(255, 159, 67, 0.2)"

  # 3. [을] 목구멍 침 삼키듯 게으른 울림 (dark L 핵심)
  sound-eul: "#2E86AB"       # 딥 스카이블루 (목구멍 안쪽 묵직한 공명)
  sound-eul-glyph: "#165069" # 텍스트 글리프 전용
  sound-eul-soft: "rgba(46, 134, 171, 0.2)"

  # 4. [드] 가벼운 끝소리 마무리
  sound-deu: "#00E5A3"       # 에메랄드 민트 (가볍게 닫아주는 소리)
  sound-deu-soft: "rgba(0, 229, 163, 0.2)"

  # 브랜드 & 포인트
  brand-yellow: "#F5C518"    # 채널 시그니처 골드 옐로우
  accent-pass: "#00E5A3"     # 합격/성공 그린
  accent-reject: "#FF4757"   # 불합격/충돌/금지 레드
  accent-gold: "#FFD700"     # 100점/황금 카드 골드

typography:
  # 모바일 가독성 기준 (Mobile-First: 120px 스마트폰 화면에서도 한눈에 식별)
  body:        { fontFamily: "Noto Sans KR", cqw: 1.8, weight: 700, lineHeight: 1.5, color: "text" }
  body-lg:     { fontFamily: "Noto Sans KR", cqw: 2.4, weight: 800, lineHeight: 1.4, color: "text" }
  label:       { fontFamily: "Noto Sans KR", cqw: 1.1, weight: 700, tracking: "0.02em", color: "text-muted" }
  eyebrow:     { fontFamily: "Noto Sans KR", cqw: 1.2, weight: 900, tracking: "0.04em", upper: true, color: "ink" }
  hand-h1:     { fontFamily: "Gaegu", cqw: 5.0, weight: 700, lineHeight: 1.15, color: "ink" }
  hand-note:   { fontFamily: "Gaegu", cqw: 2.6, weight: 700, lineHeight: 1.2, color: "sound-eul-glyph" }
  hero-word:   { fontFamily: "Archivo Black", cqw: 6.8, weight: 400, lineHeight: 1.0, color: "ink" }
  sound-block: { fontFamily: "Pretendard ExtraBold", cqw: 4.2, weight: 900, lineHeight: 1.0 }

spacing:
  pad-x: "6cqw"
  pad-y: "6cqw"
  gap-cards: "2.4cqw"
  card-border: "3.5px solid #2B2B2B"
  card-shadow: "5px 5px 0px #2B2B2B"
  caption-keep-out-bottom: "12cqh"

components:
  sketchnote-card:
    style: "네오브루탈리즘 + 아날로그 종이 컷아웃 카드"
    backgroundColor: "{colors.card-bg}"
    border: "{spacing.card-border}"
    boxShadow: "{spacing.card-shadow}"
    rounded: "18px 22px 16px 20px"
    description: "화면 중심 카드. 3.5px 잉크 외곽선 + 5px 솔리드 블랙 드롭섀도."

  sound-lego-block:
    style: "4대 소리 컬러 코딩 종이 블록 (12fps 스톱모션 조립 전용)"
    description: >
      [ 우 ](노랑), [ 어 ](주황), [ 을 ](파랑), [ 드 ](초록) 각각 16cqw x 18cqh 크기의 두꺼운 종이 카드.
      GSAP ease: 'steps(4)' 또는 'back.out(2)' 마그네틱 스냅으로 화면에 찰지게 날아와 결합된다.

  vocal-crash-diagram:
    style: "구강 단면도 + 충돌 화살표 인포그래픽 — Frame 3 전용"
    description: >
      입안 단면도 위에서 파란색 R 화살표(뒤로 후퇴)와 빨간색 L 화살표(앞으로 돌진)가 마주보고 질주하다
      중앙에서 쾅 충돌. 0.05초 화이트 플래시 섬광 + 3px 화면 진동(Screen Shake) 유발.

  rubber-stamp:
    style: "위에서 쾅! 떨어지는 아날로그 고무도장 — Frame 2, 4, 10 전용"
    description: >
      거대한 도장이 스케일 1.8에서 1.0으로 급격히 낙하하며 화면 전체 2px 쿵 충격 진동 발생.
      - Frame 2: [ 혀 굴리면 끝장! ] (빨간 불합격)
      - Frame 4: [ 혀끝 닿지 마세요 ] (민트색 합격)
      - Frame 10: 카드 A 위에 [ ❌ 불합격 ] 낙하.

  quiz-neon-gauge:
    style: "실시간 긴장감 네온 프로그레스 게이지 바 — Frame 9, 10 전용"
    description: >
      화면 상단 가로 80cqw 바. 3초 카운트다운 동안 노랑(100%) ➔ 주황(50%) ➔ 긴급 빨강(15%)으로
      빛을 내뿜으며 줄어든다. 3초 종료 시 오답 카드는 Grayscale 50%로 채도가 빠지고 정답 카드는 1.1배 펀치 줌.

  cheatsheet-poster:
    style: "1장 요약 인포그래픽 포스터 — Frame 11 전용"
    description: >
      화면 전체를 채우는 3대 공식 요약판. 0.1초 카메라 셔터 플래시와 함께
      우측 상단 [ 📸 지금 캡처해 두세요! ] 점멸 뱃지가 1초 간격 펄스 작동.

  caption-pill:
    style: "전 프레임 하단 나레이션 캡션바"
    backgroundColor: "rgba(255, 255, 255, 0.95)"
    border: "2.5px solid #2B2B2B"
    boxShadow: "3px 3px 0px #2B2B2B"
    rounded: "100px"
    description: "Whisper 실측 타임스탬프와 동기화되어 발화 중인 단어만 {colors.sound-woo} 형광펜 하이라이트."

  visual-illustration-card:
    style: "로컬 ComfyUI AI 생성 2D 카툰 일러스트 카드 (EP20 24종 전용)"
    border: "{spacing.card-border}"
    boxShadow: "{spacing.card-shadow}"
    rounded: "16px"
    description: >
      상황 설명 일러스트, 물리적 비유 컷(교통사고, 소파 휴식), 실물 오브젝트(서류, 지구본, 진주, 파마머리),
      호스트의 3단계 감정/동작 변화(멘붕, 턱 마비, 고통, 환호, 작별). 12fps 스텝 전환으로 손맛 극대화.

---

## Visual Assets (ComfyUI AI 24종 에셋 매핑)

| Asset Name | 용도 / 설명 | 생성 방식 & 참조 |
| :--- | :--- | :--- |
| `f01_phone_speaking.jpg` | 스마트폰에 입 대고 말하는 호스트 | Img2Img (`char_confused`, denoise 0.38) |
| `f01_phone_error.jpg` | 스마트폰 화면 빨간 OLD ❌ 에러 창 | Txt2Img (2D comic art, #F4EFE6) |
| `f01_char_shocked.jpg` | 머리 싸매고 땀 흘리며 멘붕 온 호스트 | Img2Img (`char_confused`, denoise 0.40) |
| `f02_singing_headphones.jpg`| 헤드폰 끼고 신나게 노래하는 호스트 | Img2Img (`char_confused`, denoise 0.38) |
| `f02_jaw_freeze.jpg` | 턱에 번개 찌릿 튀며 굳어버린 호스트 | Img2Img (`char_confused`, denoise 0.40) |
| `f02_jaw_pain.jpg` | 양손으로 턱 부여잡고 고통스러워하는 호스트 | Img2Img (`char_confused`, denoise 0.38) |
| `f03_car_crash.jpg` | 파란차(R 후퇴) vs 빨간차(L 돌진) 정면충돌 카툰 | Txt2Img (2D comic art, #F4EFE6) |
| `f04_lazy_sofa.jpg` | 게으르게 소파에 누워 뒹구는 캐릭터 비유 | Txt2Img (2D comic art, #F4EFE6) |
| `f04_tongue_relax.jpg` | 혀끝이 바닥에 편안히 누워 릴랙스하는 카툰 | Txt2Img (2D comic art, #F4EFE6) |
| `f05_mouth_oo.jpg` | 입술을 붕어처럼 둥글게 모은 [우] 입모양 | Txt2Img (2D comic art, #F4EFE6) |
| `f05_mouth_uh.jpg` | 하품하듯 턱 힘을 툭 뺀 [어] 입모양 | Txt2Img (2D comic art, #F4EFE6) |
| `f06_throat_dark_l.jpg` | 목구멍 안쪽에서 푸른 음파 울리는 단면도 | Txt2Img (2D comic art, #F4EFE6) |
| `f06_char_confident.jpg` | 엄지 척 올리며 미소 짓는 자신감 호스트 | Img2Img (`char_confused`, denoise 0.38) |
| `f07_phone_success.jpg` | 스마트폰 화면 초록색 100점 WORLD 통과 | Txt2Img (2D comic art, #F4EFE6) |
| `f07_char_success.jpg` | 양손 번쩍 들고 환호하는 승리의 호스트 | Img2Img (`char_confused`, denoise 0.42) |
| `f08_girl_skater.jpg` | 당당하고 스타일리시한 스케이트보드 소녀 | Txt2Img (2D comic art, #F4EFE6) |
| `f08_char_cool.jpg` | 선글라스 끼고 힙한 포즈 취하는 호스트 | Img2Img (`char_confused`, denoise 0.40) |
| `f09_obj_word.jpg` | 텍스트 서류 봉투와 종이 문서 오브젝트 | Txt2Img (2D comic art, #F4EFE6) |
| `f09_obj_world.jpg` | 푸른 바다와 대륙이 빛나는 회전 지구본 | Txt2Img (2D comic art, #F4EFE6) |
| `f09_char_listening.jpg` | 귀에 손을 대고 집중해서 소리 듣는 호스트 | Img2Img (`char_confused`, denoise 0.38) |
| `f10_obj_pearl.jpg` | 조개껍질 속에서 영롱하게 빛나는 진주 | Txt2Img (2D comic art, #F4EFE6) |
| `f10_obj_curl.jpg` | 탱글탱글하게 말린 웨이브 파마머리 | Txt2Img (2D comic art, #F4EFE6) |
| `f11_char_teacher.jpg` | 안경 쓰고 지휘봉으로 칠판 가리키는 선생님 | Img2Img (`char_confused`, denoise 0.40) |
| `f12_char_goodbye.jpg` | 손을 흔들며 환하게 인사하는 작별 호스트 | Img2Img (`char_confused`, denoise 0.38) |

---

## Frame Treatments (12프레임 연출 매핑)

| Frame | 제목 / 아크 | 주요 컴포넌트 & 일러스트 | 배경 / 컬러 테마 | 핵심 모션 & 피직스 |
| :--- | :--- | :--- | :--- | :--- |
| **01** | 망신의 순간 (Cold Open) | `f01_phone_speaking`, `f01_phone_error`, `f01_char_shocked` | 웜크림 + 앱 레드 에러 테마 | 10.0s 오답창 팝업 ➔ 화면 2px 진동 + 14.5s 머리 싸매는 스톱모션 ➔ 치트키 뱃지 점등 |
| **02** | 상식의 붕괴 (Big Question) | `f02_singing_headphones`, `f02_jaw_freeze`, `f02_jaw_pain`, CAUTION 테이프 | 웜크림 + 주의/경고 옐로우 | 팝송 가사 급브레이크 + 노란 테이프 촥! ➔ 턱 마비 번개 스파크 ➔ [혀 굴리면 끝장] 도장 쾅 |
| **03** | 물리적 원인 (Pain Analysis) | `f03_car_crash`, R vs L 2분할 비교 카드 | 웜크림 + R(파랑) vs L(빨강) 대립 | 파란차 vs 빨간차 정면충돌 카툰 ➔ 0.05s 화이트 플래시 + 3px 화면 진동 |
| **04** | 반전 공개 (Head Fake) | `f04_lazy_sofa`, `f04_tongue_relax`, `rubber-stamp` | 웜크림 + 릴랙스 민트 그린 | 소파 뒹굴기 비유 ➔ 혀 릴랙스 카툰 + [혀끝 닿지 마세요] 민트 도장 쾅(2px 셰이크) |
| **05** | 1단계 치트키 [우-어] | `f05_mouth_oo`, `f05_mouth_uh`, `sound-lego-block` ([우], [어~]) | 웜크림 + 노랑/주황 테마 | [우] 입모양 + [어] 입모양 컷 ➔ 두 종이 블록 마그네틱 결합 오버슈트 바운스 |
| **06** | 2단계 치트키 [을] | `f06_throat_dark_l`, `f06_char_confident`, ⛔ 정지 표지판 | 웜크림 + 딥 스카이블루 | 정지 표지판 쿵 ➔ 목구멍 3겹 푸른빛 공명 링 확산 ➔ 엄지척 스톱모션 |
| **07** | 4글자의 기적 (Payoff) | `sound-lego-block` 4종, `f07_phone_success`, `f07_char_success` | 웜크림 ➔ 골드 옐로우 대변신 | 4색 블록 12fps 착-착-착-착 스냅 ➔ 앱 100점 초록 카드 + 양손 만세 환호 스톱모션 |
| **08** | 실전 확장 (Girl) | `f08_girl_skater`, `f08_char_cool`, 나이프 컷 분해 카드 | 웜크림 + 코랄/스카이블루 | GIRL 단어 슥 잘리며 [거~] + [을] 조립 ➔ 선글라스 힙스터 스톱모션 전환 |
| **09** | 도파민 퀴즈 1R | `f09_obj_word`, `f09_obj_world`, `f09_char_listening`, `quiz-neon-gauge` | 웜크림 + 네온 카운트다운 테마 | 3초 네온 게이지 감소 ➔ A 흑백 탈락, B 초록 네온 1.1배 펀치 줌 + 귀 쫑긋 스톱모션 |
| **10** | 도파민 퀴즈 2R | `f10_obj_pearl`, `f10_obj_curl`, `quiz-neon-gauge` | 웜크림 + 밸런스 대립 테마 | 3초 네온 게이지 ➔ 오답 A 빨간 X 도장 쾅 ➔ 정답 B 황금 트로피 팡파레 |
| **11** | 한 장 요약 (Summary) | `cheatsheet-poster`, `f11_char_teacher`, 📸 캡처 뱃지 | 웜크림 + 1장 인포그래픽 | 0.1초 화이트 셔터 플래시 + 캡처 뱃지 점멸 + 선생님 캐릭터 지휘봉 안내 |
| **12** | 엔딩 & 채널 락인 | `f12_char_goodbye`, 추천 썸네일(EP19), 구독 버튼 | 웜크림 + 신뢰감 엔딩 | 손 흔드는 작별 스톱모션 + **중앙 600px x 350px 100% 비움 (엔드스크린 킵아웃)** |
