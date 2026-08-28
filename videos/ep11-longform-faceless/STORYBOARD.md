---
format: 1920x1080
duration: ~5min
message: "GOING TO는 문장 속에서 원어민이 항상 GONNA로 압축해 발음한다 — 왜 그런지 원리로 이해한다"
arc: concept-explainer with practice
audience: "영어 철자와 발음 규칙이 낯선 40~60대 왕초보 학습자"
mode: collaborative
music: calm minimal ambient underscore, very low presence — educational, never distracting
---

## Video direction

**Palette system** (from `frame.md`, never invented): 그라운드 `#0A1526` + 중앙 라디얼 글로우
`#12203A`(풀스크린 선형 그라디언트 금지 — 다크 배경 밴딩). 세 기능색만 강조로 쓴다 —
`accent-stress` 노랑(#F5C518, 강세/정답/핵심), `accent-pronunciation` 파랑(#008EFF, 발음 표기),
`accent-exception` 빨강(#FF0000, 예외/주의, 라인+글리프로만·채우기 금지). 기본 텍스트는 흰색,
보조 텍스트는 `#A9B4C4`. 네 번째 강조색을 추가하지 않는다.

**Motion grammar + reveal model**: 모든 진입은 `power3` 롱테일 감속(스무스), bounce/back.out/
elastic.out 금지. 예외 없이 나레이션이 그 조각을 말하는 시점에만 등장한다 — t=0엔 그 순간 VO가
말하는 것만, 나머지는 후반 ~50%에 걸쳐 순차 공개. 정지 구간에서 허용되는 유일한 생동감은
subtle jitter(`sine-wave-loop`, 낮은 진폭)뿐 — 카드 호흡, 느린 팬/푸시 금지.

**Rhythm / held-frame allocation**: 대부분의 프레임은 VO에 맞춰 능동적으로 공개되고, 4곳만
의도적으로 "정지해서 읽히는" 홀드다 — Frame 3(GONNA 반전 공개, 이 영상의 클라이맥스),
Frame 7(퀴즈 정답 공개), Frame 8("아닙니다" 착지), Frame 13(마무리+Rehook, 의도적으로 안 닫힌 채
정지). 이 넷 사이에 능동적 전개 프레임들을 배치해 에너지 기복을 만든다.

**Negative list**: 그림자 없음(테두리 글로우로만 부양감), 빨강 배경 채우기 금지, 검은고딕은
헤드라인/히어로 단어 전용(캡션엔 안 씀), 진부한 보라·파랑 "AI" 그라디언트나 떠다니는 보케 금지,
`repeat`/`yoyo`/`Math.random`/`Date.now` 금지, 같은 프레이밍을 연속 두 번 쓰지 않음(1 rule-of-thirds
→ 2 layered-depth → 3 centered → 4 rule-of-thirds → 5 full-width-strip → 6 split-screen →
7 centered → 8 layered-depth → 9 split-screen → 10 asymmetric-60/40 → 11 centered →
12 triptych → 13 centered).

## Frame 1 — Stakes

- scene: 다크 네이비 화면, Black Han Sans 헤드라인이 두 문장으로 순차 등장(질문에서 멈춤)
- voiceover: "시즌1 배우셨으니 단어는 이제 읽으실 겁니다. 근데 문장으로 말하면 왜 다르게 들릴까요? 오늘 그 이유, 하나 보여드리겠습니다."
- duration: 10.475s
- transition_in: cut
- status: animated
- src: compositions/frames/01-stakes.html
- type: hook
- persuasion: Rhetorical question
- beat: puzzlement + curiosity
- blueprint: kinetic-type-beats (Reproduce)
- focal: "근데 문장으로 말하면 왜 다르게 들릴까요?" (the question line)
- roles: line 1(안심 문장) = supporting · line 2(질문) = foreground subject · center glow = background
- sfx: soft-whoosh on line 2 entrance

narrativeRole: 이미 아는 것(단어는 읽는다)을 인정해서 안심시킨 뒤, 바로 그 위에 새 균열(문장은 다르게 들린다)을 낸다 — 시즌1 졸업생을 시즌2로 끌어들이는 다리.
keyMessage: 단어를 읽을 줄 아는 것과 문장을 알아듣는 것은 다른 문제다.

Layout: rule-of-thirds, 텍스트 좌측 상단부.
Scene 1 (0.0–4.0s): 짙은 네이비 필드 + 은은한 중앙 글로우. VO가 첫 문장을 말하는 동안 "시즌1 배우셨으니 단어는 이제 읽으실 겁니다"가 per-word staggered reveal(`dynamic-content-sequencing`)로 좌측 상단에 등장, 회색(`text-muted`).
Scene 2 (4.0–7.5s): VO가 질문을 던지는 순간 "근데 문장으로 말하면 왜 다르게 들릴까요?"가 line 1 아래에 per-word staggered reveal로 공개, 노랑(`accent-stress`), 더 큰 굵기 — 이 프레임의 지배 요소(hierarchy: size+weight+color).
Scene 3 (7.5–9.0s): "오늘 그 이유, 하나 보여드리겠습니다" — 두 줄 모두 정지해 읽힘, subtle jitter만. progress-rail 첫 구간이 채워짐.

## Frame 2 — 채널 인트로

- scene: Frame 1과 같은 그라운드 유지, 채널명 워드마크 + "시즌2" 라벨이 짧게 자리잡음
- voiceover: "안녕하세요, 「이해하면 쉬운영어」입니다. 오늘부터 시즌2 — 문장 속에서 소리가 어떻게 연결되고 줄어드는지, 함께 봅니다."
- duration: 9.195s
- transition_in: crossfade
- status: animated
- src: compositions/frames/02-intro.html
- type: hook
- persuasion: Direct address
- beat: orientation
- blueprint: titlecard-reveal (Adapt — 채널 워드마크가 이 프레임의 "브랜드 마크"; 단일 절제된 무브의 랜딩만 계승)
- focal: 채널 워드마크 "이해하면 쉬운영어"
- roles: 워드마크 = foreground subject · "시즌2·EP1" pill = supporting · 라디얼 글로우 = background
- sfx: soft-chime on wordmark settle

narrativeRole: 채널 정체성과 시즌2의 새 범위(문장 속 소리 연결·축약)를 한 호흡에 못박아, 이후 13씬 전체가 이 틀 안에 있다는 걸 알린다.
keyMessage: 시즌2는 단어가 아니라 문장 속 소리 연결을 다룬다.

Layout: layered-depth, 화면 중앙 (분위기 있는 오프닝).
Scene 1 (0.0–3.5s): VO가 채널명을 말하는 순간 워드마크가 spring-pop entrance(`spring-pop-entrance`, 스무스 착지)로 중앙에 등장, 배경에 ambient glow bloom(`ambient-glow-bloom`)이 뒤에서 퍼짐.
Scene 2 (3.5–8.0s): "오늘부터 시즌2 —"에서 "시즌2·EP1" pill이 워드마크 아래로 reveal, 이후 "문장 속에서... 함께 봅니다"까지 정지해 읽힘 — subtle jitter만.

## Frame 3 — Big Question + Head Fake

- scene: "GOING TO" 등장 → 질문 문구 → 짧은 정지 → hero-word-block으로 "GONNA" 컷 전환
- voiceover: "GOING TO, 미래 말할 때 쓰죠. 근데 영화에서 이렇게 말하는 거, 들어보신 적 있으세요? 거의 없으실 겁니다. 그럼 뭐라고 할까요? 정답, GONNA."
- duration: 11.703s
- transition_in: cut
- status: animated
- src: compositions/frames/03-reveal.html
- type: product_intro
- persuasion: Counterintuitive claim
- beat: surprise + recognition
- blueprint: kinetic-type-beats (Reproduce — in-place word-swap IS the Head Fake payoff)
- focal: "GONNA"
- roles: "GOING TO" = supporting(설정, 퇴장) · "GONNA" = foreground subject(반전) · "정답" eyebrow = supporting
- sfx: reveal-chime on the GONNA swap

narrativeRole: 이 영상의 실제 주인공(GONNA)을 이름 붙이는 순간 — 익숙한 표현(GOING TO)에 대한 기대를 뒤집는 Head Fake로 도입한다.
keyMessage: 문장 속 GOING TO는 실제로 거의 항상 GONNA로 들린다.

Layout: centered — 이 영상의 클라이맥스 홀드.
Scene 1 (0.0–2.5s): "GOING TO"가 per-word staggered reveal로 중앙 상단에 흰색으로 등장.
Scene 2 (2.5–7.5s): VO가 반문하는 동안 "GOING TO"에 손글씨풍 취소선(`css-marker-patterns`)이 그어지며 흐려지고(muted), "정답" eyebrow 라벨이 작게 tick-in.
Scene 3 (7.5–11.0s): "정답, GONNA"에서 hard-cut word-swap(`discrete-text-sequence`)으로 GOING TO가 사라지고 GONNA가 히어로 스케일로 슬램 — accent glow bloom이 뒤에서 확산, 이후 완전 정지(홀드). subtle jitter만.

## Frame 4 — 메커니즘

- scene: step-badge 1·2가 순서대로 등장, 각자 옆에 한 줄 설명. 마지막에 두 원이 겹쳐지며 hero-word-block "GONNA"로 합쳐짐
- voiceover: "왜 이렇게 바뀔까요? 두 가지 때문입니다. 하나, GOING의 끝소리 NG는 원래 여려서 뒤 소리랑 쉽게 붙어요. 둘, TO의 T는 문장 안에서 힘을 거의 잃습니다. 이 둘이 겹치면, GOING TO는 GONNA라는 한 소리가 됩니다."
- duration: 20.193s
- transition_in: crossfade
- status: animated
- src: compositions/frames/04-mechanism.html
- type: feature_showcase
- persuasion: Numbered enumeration + Causal chain (A → B → C)
- beat: comprehension building to "aha"
- blueprint: compose (두 단계 인과 병합 — 메뉴에 딱 맞는 블루프린트 없음)
- focal: 최종 병합된 "GONNA"
- roles: step-badge 1/2 = foreground subject(순차) · 병합된 GONNA = foreground subject(페이오프) · 설명 라벨 = supporting
- sfx: soft-tick ×2(배지 등장), reveal-chime(병합)

narrativeRole: Head Fake로 연 궁금증을 실제 음성학적 이유(비음 약화 + T 약화)로 해소한다 — 이 영상의 유일한 "왜".
keyMessage: NG의 약화와 T의 약화가 겹쳐서 GONNA라는 한 소리가 된다.

Layout: rule-of-thirds, 배지 두 개가 좌측에 세로로 쌓임.
Scene 1 (0.0–3.0s): "왜 이렇게 바뀔까요? 두 가지 때문입니다"가 중앙 상단에 per-word reveal.
Scene 2 (3.0–8.0s): "하나,"에서 step-badge 1이 cluster→outward expansion(`center-outward-expansion`)으로 좌측 상단에 착지, 옆 설명 문장이 per-word reveal.
Scene 3 (8.0–13.0s): "둘,"에서 step-badge 2가 같은 무브로 그 아래 착지, 설명 문장 reveal — 두 배지 세로 스택 완성.
Scene 4 (13.0–18.0s): "이 둘이 겹치면"에서 두 배지가 scale-swap(`scale-swap-transition`)으로 사라지며 화면 하단 중앙에 GONNA가 노랑으로 착지, glow bloom 후 홀드.

## Frame 5 — 실제 문장으로 확인

- scene: sentence-card가 한 번에 하나씩 쌓임(6개 — I'm/She's/He's/We're/부정문/의문문), 매번 영문+한글 발음 두 줄, "gonna/거너" 부분만 노랑
- voiceover: "문장으로 볼까요. \"아임 거너 고 홈.\" 아임 고잉 투 고 홈이 아니라 거너입니다. 주어를 바꿔도 마찬가지죠. \"쉬즈 거너 콜 유.\" \"히즈 거너 비 레이트.\" \"위아 거너 스타트 나우.\" 부정문도 같아요. \"아임 낫 거너 두 댓.\" 의문문도요. \"아 유 거너 컴?\" 주어가 뭐든, 형태가 뭐든 — GOING TO 자리는 항상 GONNA로 들립니다."
- duration: 26.41s
- transition_in: push-slide LEFT
- status: animated
- src: compositions/frames/05-examples.html
- type: social_proof
- persuasion: Worked example with real sentences + Rule of three (and beyond)
- beat: confidence + momentum
- blueprint: grid-card-assemble (Reproduce)
- focal: 계속 쌓이는 sentence-card 스택
- roles: 각 sentence-card = foreground subject(순차) · target-word glow = supporting emphasis
- sfx: soft-whoosh ×6(카드 착지마다)

narrativeRole: 메커니즘이 인칭·시제·문장형태와 무관하게 항상 적용된다는 걸 실제 예문 6개로 증명한다 — 이론에서 실전으로.
keyMessage: 주어와 문장 형태가 바뀌어도 GOING TO 자리는 항상 GONNA로 들린다.

Layout: full-width strip, 카드가 세로로 쌓임.
Scene 1 (0.0–5.0s): "문장으로 볼까요"에서 필드가 정착; 첫 예문을 읽는 동안 카드 1(I'm gonna go home)이 grid-card-assemble의 캐스케이드로 상단에 착지, "gonna/거너"가 발화 시점에 keyword glow(`asr-keyword-glow`).
Scene 2 (5.0–9.5s): "아임 고잉 투... 아니라 거너입니다"에서 카드 1의 강조어가 다시 한번 glow; "주어를 바꿔도"로 다음 카드 예고.
Scene 3 (9.5–17.0s): 주어가 바뀌는 각 문장을 읽을 때마다 카드 2–4(she's/he's/we're)가 한 번에 하나씩 그 발화 순간에 캐스케이드 착지, 아래로 스택.
Scene 4 (17.0–24.0s): "부정문도"/"의문문도"에서 카드 5–6(부정문/의문문)이 같은 방식으로 착지.
Scene 5 (24.0–28.0s): "GOING TO 자리는 항상 GONNA로 들립니다"에서 6장 전체의 강조어가 동시에 한 번 glow(synchronized), 이후 정지.

## Frame 6 — 예외

- scene: comparison-split — 왼쪽 "고잉 투 콜"(동사, 노랑 rule) vs 오른쪽 "고잉 투 더 스토어"(장소, 빨강 rule + X), 두 카드 높이 동일(flex stretch)
- voiceover: "근데 조심할 게 하나 있습니다. GOING TO 뒤에 항상 GONNA가 오는 건 아니에요. 동사가 올 때만 그렇습니다. \"아임 고잉 투 콜\"은 거너로 줄지만, \"아임 고잉 투 더 스토어\"처럼 장소가 오면 안 줄어요. 동사로 갈 때만 압축되는 거죠."
- duration: 16.98s
- transition_in: crossfade
- status: animated
- src: compositions/frames/06-exception.html
- type: feature_showcase
- persuasion: Counterexample (here is when it breaks)
- beat: unease (caveat) resolving to clarity
- blueprint: comparison-split (Reproduce — mirrored book-open tilts + badge 펀치가 이 블루프린트의 시그니처와 정확히 맞음)
- focal: 두 compare-pair 카드
- roles: 좌측 카드(동사) = foreground subject · 우측 카드(장소) = foreground subject · 상단 헤드라인 = supporting(설정)
- sfx: soft-tick(좌측 착지), soft-thud(우측 X 배지)

narrativeRole: 규칙을 과잉 일반화하지 않도록 정밀화한다 — "이해하면 쉬운" 채널 정체성이 대충 뭉개지 않고 정확히 짚는 지점.
keyMessage: GONNA로 줄어드는 건 뒤에 동사가 올 때뿐이다.

Layout: split-screen, 좌우 대칭 배치.
Scene 1 (0.0–5.0s): "동사가 올 때만 GONNA로 압축된다" 헤드라인이 상단 중앙에 per-word reveal(결론을 먼저 제시).
Scene 2 (5.0–10.0s): "아임 고잉 투 콜은"에서 좌측 카드가 split-tilt-cards로 좌측 날개에서 진입해 노랑 좌측 rule과 함께 착지, "거너"가 발화 순간 glow.
Scene 3 (10.0–14.0s): "아임 고잉 투 더 스토어"에서 우측 카드가 미러링된 tilt로 우측 날개에서 진입, 빨강 좌측 rule + X 배지가 spring-pop(comparison-split 시그니처 펀치).
Scene 4 (14.0–16.0s): 두 카드 동일 높이로 나란히 정지, subtle jitter만.

## Frame 7 — 미니 예측 퀴즈

- scene: 질문 문구(영문+한글) 등장 → 짧은 정지(생각할 시간) → hard-cut으로 정답 문구(영문+한글)로 전환
- voiceover: "직접 맞혀보세요. \"아이 워즈 거너 콜 유.\" 원래 뭐였을까요? 잠깐 생각해 보시고... 정답은 \"아이 워즈 고잉 투 콜 유\"입니다. 과거형도 원리는 같아요."
- duration: 12.983s
- transition_in: cut
- status: animated
- src: compositions/frames/07-quiz.html
- type: social_proof
- persuasion: Question → answer pairing
- beat: anticipation resolving to "aha"
- blueprint: kinetic-type-beats (Reproduce — Q→A pairing이 곧 in-place word-swap)
- focal: 정답 문장
- roles: 질문 문장 = supporting(설정) · 정답 문장 = foreground subject
- sfx: reveal-chime on answer swap

narrativeRole: 시청자가 직접 규칙을 적용해보게 해서 수동적 시청을 끊는다 — 과거형도 같은 원리라는 걸 스스로 확인하게 한다.
keyMessage: 과거형(was/were going to)도 같은 원리로 압축된다.

Layout: centered — 두 번째 홀드 지점(정답 착지 후).
Scene 1 (0.0–4.0s): "I was gonna call you." + 한글 발음이 per-word reveal로 중앙에 등장, "gonna/거너"는 파랑(`accent-pronunciation`).
Scene 2 (4.0–8.0s): "원래 뭐였을까요? 잠깐 생각해 보시고..."에서 물음표가 낮은 진폭 jitter로만 살아있고 새 요소는 등장하지 않음(생각할 틈, 의도적 정지).
Scene 3 (8.0–12.0s): "정답은"에서 hard-cut word-swap으로 질문이 정답 문장("I was going to call you." + 한글)으로 교체, accent glow bloom.
Scene 4 (12.0–13.0s): "과거형도 원리는 같아요" — 정답 문장 정지해 읽힘.

## Frame 8 — 흔한 오해 바로잡기

- scene: "GONNA는 틀린 영어다?" 취소선과 함께 사라지고 "아닙니다" 문구로 교체
- voiceover: "GONNA, 틀린 영어 아니냐고요? 아닙니다. 격식 있는 자리가 아니면, 원어민도 실제 대화에선 거의 항상 이렇게 말해요. 문법이 틀린 게 아니라, 발음이 자연스럽게 압축된 것뿐입니다."
- duration: 14.315s
- transition_in: crossfade
- status: animated
- src: compositions/frames/08-myth.html
- type: benefit_highlight
- persuasion: Common-belief vs reality
- beat: relief + confidence
- blueprint: titlecard-reveal (Adapt — 단일 절제된 무브의 랜딩 계승, wipe-away가 취소선+교체로 변형)
- focal: "아닙니다"
- roles: 미신 문장 = supporting(설정, 퇴장) · "아닙니다" = foreground subject · 설명 라인들 = supporting
- sfx: soft-whoosh(취소선), soft-chime("아닙니다" 착지)

narrativeRole: "이거 써도 되나?"라는 불안을 없애 시청자가 GONNA를 실제로 쓰거나 편하게 들을 수 있게 한다.
keyMessage: GONNA는 비문법이 아니라 자연스러운 발음 압축이다.

Layout: layered-depth — 세 번째 홀드 지점.
Scene 1 (0.0–2.5s): "GONNA는 틀린 영어다?"가 중앙에 회색으로 per-word reveal.
Scene 2 (2.5–3.5s): "아닙니다"에서 손글씨풍 취소선(`css-marker-patterns`)이 미신 문장을 가로지르며 그것이 흐려지고, "아닙니다"가 hard-cut으로 그 아래 히어로 스케일 노랑으로 착지.
Scene 3 (3.5–9.0s): 설명 문장 "격식 있는 자리가 아니면... 거의 항상 이렇게 말해요"가 그 아래 per-word reveal로 등장.
Scene 4 (9.0–12.0s): "문법이 틀린 게 아니라..." 마지막 문장 reveal 후 전체 정지, subtle jitter만.

## Frame 9 — 격식 vs 캐주얼

- scene: comparison-split — 왼쪽 "말할 때"(GONNA, 파랑) vs 오른쪽 "쓸 때"(GOING TO, 흰색)
- voiceover: "그럼 언제 GOING TO를 그대로 쓸까요? 이메일이나 면접처럼 격식 있는 자리에서죠. GONNA는 말할 때 자연스럽게 줄어드는 소리일 뿐, 글로 쓸 땐 여전히 GOING TO입니다."
- duration: 13.793s
- transition_in: crossfade
- status: animated
- src: compositions/frames/09-register.html
- type: benefit_highlight
- persuasion: Comparison of two options
- beat: orientation + clarity
- blueprint: comparison-split (Reproduce)
- focal: 두 카드 동등 비중(진짜 A/B)
- roles: GONNA 카드 = foreground subject · GOING TO 카드 = foreground subject
- sfx: soft-whoosh ×2(카드 착지)

narrativeRole: 8번 씬의 안심을 실용적 지침(언제 GONNA, 언제 GOING TO)으로 구체화한다.
keyMessage: 말할 땐 GONNA, 격식 있는 글에선 GOING TO.

Layout: split-screen.
Scene 1 (0.0–2.5s): "그럼 언제 GOING TO를 그대로 쓸까요?"가 상단 중앙에 per-word reveal.
Scene 2 (2.5–6.0s): "이메일이나 면접처럼"에서 질문에 먼저 답하는 우측 카드(GOING TO, 격식)가 우측 날개에서 split-tilt로 진입.
Scene 3 (6.0–9.0s): "GONNA는 말할 때"에서 좌측 카드(GONNA, 파랑)가 좌측 날개에서 진입 — 미러링된 페어 완성.
Scene 4 (9.0–12.0s): 둘 다 정지, subtle jitter만.

## Frame 10 — 리스닝 트레이닝

- scene: hero-word "gonna"가 화면 좌측에 고정(fixed-anchor), 예문 4개(영문+한글)가 우측에 하나씩 쌓임
- voiceover: "이제 실제 속도로 들어보고 GONNA를 직접 찾아보세요. 하나, \"왓 아 유 거너 두 디스 위켄드?\" 둘, \"쉬즈 프라바블리 거너 비 레이트.\" 셋, \"잇츠 거너 비 오케이.\" 넷, \"데이아 거너 미스 더 트레인.\" 다 찾으셨나요? 매번 같은 자리, 같은 소리였습니다."
- duration: 23.436s
- transition_in: push-slide LEFT
- status: animated
- src: compositions/frames/10-listening.html
- type: social_proof
- persuasion: Demonstration (show the mechanism running) + Numbered enumeration
- beat: focus building to mastery
- blueprint: fixed-anchor-cycle (Reproduce — 앵커의 정지 자체가 이 블루프린트의 주장)
- focal: 고정된 "gonna" 앵커
- roles: 앵커 = foreground subject(고정) · 예문 칩 = supporting(순차 사이클)
- sfx: soft-tick ×4(칩마다)

narrativeRole: 실제 속도의 자연스러운 문장에서 시청자가 직접 GONNA를 찾아내게 해서, 수동적 이해를 능동적 듣기 능력으로 전환한다.
keyMessage: 실제 발화 속도에서도 GONNA는 항상 같은 자리에서 같은 소리로 들린다.

Layout: asymmetric 60/40 — 앵커(좌, 고정) + 리스트(우, 가변), 두 블록은 flex로 세로 중심 정렬.
Scene 1 (0.0–3.5s): "gonna" 앵커가 spring-pop으로 좌측에 진입해 고정(다시는 움직이지 않음).
Scene 2 (3.5–7.0s): "하나,"에서 칩 1이 우측 리스트에 reveal, "gonna/거너"가 발화 순간 keyword glow.
Scene 3 (7.0–10.5s): "둘,"에서 칩 2 reveal, 같은 glow 처리.
Scene 4 (10.5–14.0s): "셋,"에서 칩 3 reveal.
Scene 5 (14.0–17.5s): "넷,"에서 칩 4 reveal — 4개 칩 스택 완성.
Scene 6 (17.5–22.0s): "다 찾으셨나요? 매번 같은 자리..."에서 4개 강조어가 동시에 한 번 glow(synchronized), 이후 정지.

## Frame 11 — 따라 말해보기

- scene: 화면 중앙 구문이 "gonna → I'm gonna → I'm gonna go"(영문, 노랑) / "거너 → 아임 거너 → 아임 거너 고"(한글, 파랑)로 3단 확장, 매번 펄스
- voiceover: "이제 직접 소리 내보세요. 거너. 아임 거너. 아임 거너 고. 세 번만 따라 하시면 입에 붙습니다."
- duration: 8.411s
- transition_in: crossfade
- status: animated
- src: compositions/frames/11-practice.html
- type: cta
- persuasion: Demonstration + Direct address
- beat: momentum toward mastery
- blueprint: compose (3박자 반복 드릴을 모델링하는 메뉴 블루프린트 없음 — in-place token cycle + press pulse로 구성)
- focal: 확장되는 "거너" 구문
- roles: 구문 = foreground subject · 안내/마무리 문장 = supporting
- sfx: soft thump ×3(반복 박자마다)

narrativeRole: 듣기에서 말하기로 마지막 한 걸음을 넘어가게 한다 — 이 영상에서 유일하게 시청자가 소리 내어 참여하는 순간.
keyMessage: 직접 소리 내어 세 번 반복하면 체화된다.

Layout: centered.
Scene 1 (0.0–1.5s): "이제 직접 소리 내보세요"가 상단에 회색으로 per-word reveal.
Scene 2 (1.5–2.5s): "거너"에서 첫 구문이 중앙에 hard-cut으로 등장, press-release-spring 펄스(탄력 있는 압축→회복, 바운스 아님).
Scene 3 (2.5–4.0s): "아임 거너"에서 in-place token cycle(`discrete-text-sequence`)로 2단어 버전으로 교체, 같은 펄스.
Scene 4 (4.0–6.0s): "아임 거너 고"에서 3단어 버전으로 교체, 같은 펄스 — 3박자 3펄스가 발화 반복과 일치.
Scene 5 (6.0–8.0s): "세 번만 따라 하시면 입에 붙습니다" — 최종 구문 정지, subtle jitter만.

## Frame 12 — 실생활 재확인

- scene: 영화(필름 스트립)·노래(음표) 아이콘 사이에 hero-word "GONNA"가 채워지는 트립틱
- voiceover: "그래서 영화에서도, 노래 가사에서도 GOING TO보다 GONNA를 훨씬 자주 듣게 되는 겁니다. 사실 이미 수없이 들으셨던 거고요."
- duration: 9.953s
- transition_in: crossfade
- status: animated
- src: compositions/frames/12-recognition.html
- type: benefit_highlight
- persuasion: Generalization (specific → principle) + Callback
- beat: recognition + satisfaction
- blueprint: compose (3분할 아이콘-단어-아이콘 제너럴라이제이션 비트 — 메뉴에 없음)
- focal: 중앙 "GONNA"
- roles: GONNA = foreground subject · 필름/음표 아이콘 = supporting · 캡션 = supporting
- sfx: soft-chime ×2(아이콘 self-draw)

narrativeRole: 오늘 배운 원리가 교실 밖 실제 세계(영화·노래)에서 이미 계속 들려온 것이었다는 걸 깨닫게 해서 배움을 일상 경험에 정박시킨다.
keyMessage: GONNA는 이미 일상 속에서 수없이 들어온 소리다.

Layout: triptych — 아이콘·단어·아이콘 3분할.
Scene 1 (0.0–3.0s): "영화에서도"에서 좌측 필름 스트립 아이콘이 SVG self-draw(`svg-path-draw`)로 그려지고, "노래 가사에서도"에서 우측 음표 아이콘이 같은 방식으로 그려짐 — 중앙은 비어있는 채로.
Scene 2 (3.0–7.0s): "GONNA를 훨씬 자주 듣게 되는 겁니다"에서 중앙 슬롯에 "GONNA"가 per-word reveal로 채워지며 트립틱 완성.
Scene 3 (7.0–10.0s): "사실 이미 수없이 들으셨던 거고요" — 캡션이 하단에 reveal, 이후 정지. 아이콘은 sanctioned live-SVG internals(`svg-icon-enrichment` — 필름에 옅은 dash-flow, 음표에 약한 pulse)만 유지, 카드 호흡 없음.

## Frame 13 — 요약 + Rehook

- scene: 오늘 배운 것 한 줄 요약이 자리잡고, 그 아래 "그럼 WANT TO는요?"가 옅은 톤으로 등장(답 없이 정지)
- voiceover: "오늘은 GOING TO가 GONNA로 압축되는 이유를 봤습니다. 그럼 WANT TO는요? 다음 영상에서 확인하세요."
- duration: 8.307s
- transition_in: crossfade
- status: animated
- src: compositions/frames/13-summary-rehook.html
- type: branding
- persuasion: Distillation (compress to one line) + Callback
- beat: resolution + a final spark of curiosity
- blueprint: titlecard-reveal (Reproduce — 차분한 2줄 가치-타이틀 랜딩 그대로; 2번째 줄이 옅은 채 안 닫히는 게 Rehook)
- focal: 요약 문장 속 "GONNA"
- roles: 요약 문장 = foreground subject · Rehook 문장 = supporting(의도적으로 옅고 안 닫힘)
- sfx: soft-chime(요약 착지), Rehook 문장엔 사운드 없음(미완결 자체가 포인트)

narrativeRole: 오늘 배운 핵심을 한 문장으로 압축해 착지시키고, 동시에 다음 편(WANT TO→WANNA)으로 문을 열어둔 채 끝낸다 — 결말을 닫지 않는다.
keyMessage: GOING TO→GONNA는 오늘로 끝. WANT TO는 다음 편의 질문으로 남는다.

Layout: centered — 마지막 홀드.
Scene 1 (0.0–3.5s): "오늘은 GOING TO가 GONNA로 압축되는 이유를 봤습니다"가 중앙에 per-word reveal, "GONNA"만 노랑.
Scene 2 (3.5–5.5s): "그럼 WANT TO는요?"에서 두 번째 줄이 hard-cut으로 그 아래 등장, opacity ~70%로 옅게 — 의도적으로 미해결.
Scene 3 (5.5–8.0s): "다음 영상에서 확인하세요" — 새 시각 요소 없이 전체 정지, subtle jitter만. 열린 질문이 화면에 남은 마지막 것.
