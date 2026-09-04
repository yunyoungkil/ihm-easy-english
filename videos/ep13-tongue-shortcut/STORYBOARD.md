---
format: 1920x1080
duration: ~5:06 (306.4초 — SCRIPT.md 원문 글자 수 기준 역산 추정치, 씬마다 +0.5초 버퍼 포함. TTS
  실제 생성 후 재계산 필요 — 아래 각 프레임 duration은 전부 추정값이다.)
message: "알파벳은 힘을 빼고 이어 붙이면 저절로 소리가 나며, C처럼 예외로 보이는 규칙도 같은 원리로 설명된다"
arc: concept-explainer with practice
audience: "영어 공부를 다시 시작하고 싶지만 어디서부터 손대야 할지 막막한 노베이스 알파벳 입문자"
mode: collaborative
music: calm minimal ambient underscore, very low presence — educational, never distracting
---

## Video direction

**Palette·모션 문법·리듬 배분 원칙은 EP11/EP12(`frame.md`)와 100% 동일** — 다크 네이비 그라운드,
세 기능색(노랑=강세/정답, 파랑=발음, 빨강=예외), power3 롱테일 감속 진입, 나레이션 발화 시점에만
등장, subtle jitter 외 정지 시 생동감 없음.

**이 편의 차이점**: 신규 컴포넌트 `sound-blend-diagram`(Frame 5·6·10)이 이 편의 시각적 척추다 —
EP12의 mouth-shape-diagram이 "벌어짐 정도"로 반전을 보여줬다면, 이 편은 **"글자 chip이 하나씩
힘 빼고 이어 붙는" 조립 과정 자체**가 콘텐츠다. 같은 컴포넌트를 세 번(BAG→CAT/MAP→BAG/CAT/MAP/CELL)
반복 사용해 "이 원리가 계속 통한다"는 패턴 확장 카타르시스를 시각적으로도 누적시킨다.

**Rhythm / held-frame allocation**: 2곳이 의도적 홀드 — Frame 5(원리 최초 공개, 이 영상의
클라이맥스), Frame 8의 각 정답 공개 순간(4회 반복 홀드). 나머지는 능동적으로 전개된다.

**Negative list**: EP11/EP12와 동일(그림자 없음, 빨강 배경 채우기 금지, 검은고딕은 헤드라인 전용,
`repeat`/`yoyo`/`Math.random`/`Date.now` 금지) + 같은 프레이밍 연속 두 번 금지: 1 centered →
2 centered → 3 number-contrast(신규) → 4 centered → 5 sound-blend(신규) → 6 sound-blend →
7 split-screen → 8 centered(반복) → 9 anchor+list → 10 sound-blend → 11 centered →
12 centered.

## Frame 1 — 도입 (Stakes)

- scene: 다크 네이비 화면, 공감형 도입 문장 → A/B 발음 표기 등장 → 헷갈리는 단어가 물음표로 흔들림
- voiceover: "알파벳도 다 알고, 발음 규칙도 나름 공부하셨는데… 막상 처음 보는 단어 앞에서 딱 멈추신 적 있으시죠? 분명 A는 '애' 소리, B는 '브' 소리라고 배우셨는데, 단어 안에만 들어가면 완전 다르게 읽혀요. 그럴 때마다 '이건 또 왜 이렇게 읽지?' 하면서 하나씩 따로 외우다 지쳐서 포기하신 분들, 정말 많으실 거예요. 그거, 여러분이 이해력이 부족해서가 아닙니다. 지금까지 아무도 진짜 이유를 제대로 안 알려줬을 뿐이에요."
- duration: 27.4s (추정)
- transition_in: cut
- status: outline
- src: compositions/frames/01-stakes.html
- type: hook
- persuasion: 공감(Rhetorical empathy)
- beat: 공감 + 호기심
- blueprint: kinetic-type-beats (Reproduce)
- focal: "이건 또 왜 이렇게 읽지?" (공감 포인트)
- roles: 도입 문장 = supporting · 공감 문장 = foreground subject · center glow = background
- sfx: soft-whoosh on 공감 문장 entrance

narrativeRole: 파닉스를 나름 공부했는데도 여전히 못 읽는 단어가 많은 왕초보의 실제 좌절을 구체적으로
짚어 즉시 공감시킨다.
keyMessage: 못 읽는 게 이해력 부족이 아니라, 아무도 진짜 이유를 안 알려줬기 때문이다.

Scene 1 (0.0–8.0s): "알파벳도 다 알고... 딱 멈추신 적 있으시죠?" per-word staggered reveal, 흰색.
Scene 2 (8.0–14.0s): "A는 '애' 소리, B는 '브' 소리" — 알파벳 아래 발음 표기가 파랑으로 페이드인
(이름이 아니라 소리를 다룬다는 신호).
Scene 3 (14.0–22.0s): "이건 또 왜 이렇게 읽지" — 헷갈릴 법한 단어 하나가 확대되며 물음표로 흔들림.
Scene 4 (22.0–27.4s): "지금까지 아무도... 안 알려줬을 뿐이에요" — 정지, subtle jitter만.
progress-rail 첫 구간 채워짐.

## Frame 2 — 채널 인트로

- scene: 씬1 물음표 이미지 페이드아웃 → 채널 워드마크 짧게 노출
- voiceover: "안녕하세요, 「이해하면 쉬운영어」입니다. 오늘은 알파벳이 단어 안에서 왜 다르게 소리 나는지, 그 진짜 원리를 함께 봅니다."
- duration: 8.8s (추정)
- transition_in: crossfade
- status: outline
- src: compositions/frames/02-intro.html
- type: branding
- persuasion: —
- beat: 신뢰 형성
- blueprint: titlecard-reveal (Reproduce)
- focal: 채널 워드마크
- roles: 채널명 = foreground subject · 소개 문장 = supporting
- sfx: 없음(차분한 브랜딩 톤)

narrativeRole: 짧고 밝게 채널 정체성만 확인시키고 바로 본론(Big Question)으로 넘어갈 준비를 한다.
keyMessage: 오늘 다룰 범위는 "알파벳이 단어 안에서 왜 다르게 소리 나는가"다.

Scene 1 (0.0–5.0s): "안녕하세요, 「이해하면 쉬운영어」입니다" — 워드마크 등장.
Scene 2 (5.0–8.8s): "오늘은... 함께 봅니다" — 소개 문장, 정착.

## Frame 3 — 질문 던지기 (Big Question)

- scene: "21" vs "5" 숫자가 좌우로 대비되며 등장(한국어 모음 개수 vs 영어 모음 개수) → 마지막 질문에서 화면이 살짝 어두워짐
- voiceover: "그런데 궁금하지 않으세요? 왜 유독 영어는 같은 알파벳인데 단어마다 소리가 다 다를까요? 사실 이유는 간단해요. 한국어는 모음이 21개나 되는데, 영어 모음은 A, E, I, O, U 딱 5개뿐이거든요. 낼 수 있는 소리는 훨씬 많은데 글자는 훨씬 적으니까, 한 글자가 여러 소리를 돌아가면서 맡을 수밖에 없는 거예요. 그럼 결국 이 많은 경우의 수, 우리가 하나하나 다 외워야만 읽을 수 있는 걸까요?"
- duration: 26.0s (추정)
- transition_in: cut
- status: outline
- src: compositions/frames/03-question.html
- type: hook
- persuasion: Rhetorical question
- beat: 호기심 → 긴장
- blueprint: number-contrast (EP13 신규, frame.md §3)
- focal: "21" vs "5" 크기 대비
- roles: 21/5 숫자 = foreground subject(대등) · 질문 문장 = supporting
- sfx: 없음

narrativeRole: "왜 이렇게 소리가 제각각인가"에 대한 논리적 이유(모음 개수 차이)를 먼저 납득시켜서,
다음 프레임의 반전("그래도 다 외울 필요는 없다")이 헛된 낙관이 아니라 근거 있는 결론으로 느껴지게
만든다.
keyMessage: 영어는 모음 5개로 훨씬 많은 소리를 감당해야 해서, 한 글자가 여러 소리를 돌아가며 맡는다.

Scene 1 (0.0–6.0s): "그런데 궁금하지 않으세요?... 소리가 다 다를까요?" — 질문 문장 reveal.
Scene 2 (6.0–16.0s): "한국어는 모음이 21개나... 여러 소리를 돌아가면서" — "21" 좌측, "5" 우측 등장,
각각 "한국어 모음"/"영어 모음" 라벨.
Scene 3 (16.0–26.0s): "그럼 결국... 읽을 수 있는 걸까요?" — 화면이 살짝 어두워지며 긴장감 조성,
정지.

## Frame 4 — 반전 공개 (Head Fake)

- scene: 씬3의 어두운 톤 → 밝은 앰버 톤으로 전환, "힘을 빼세요" 텍스트가 중앙에 떠오름
- voiceover: "결론부터 말씀드릴게요. 다 외우실 필요 없습니다. 원어민들이 저 많은 단어를 다 규칙으로 외워서 읽는 게 아니에요. 그냥 혀에 힘을 딱 빼고, 제일 편한 대로 소리를 내다 보니까 저절로 저렇게 되는 겁니다. 저도 예전엔 '왜 얘는 저렇게 읽고 쟤는 다르게 읽지' 하면서 하나하나 외우려다 지쳤었어요. 근데 알고 보니까 외우는 게 아니라, 힘을 빼는 원리 하나면 끝나는 거였습니다."
- duration: 24.3s (추정)
- transition_in: cut
- status: outline
- src: compositions/frames/04-headfake.html
- type: reveal
- persuasion: Reversal + personal anecdote
- beat: 반전 착지
- blueprint: kinetic-type-beats (Reproduce — word-reveal, frame.md §2)
- focal: "힘을 빼는 원리 하나면 끝나는 거였습니다"
- roles: "다 외우실 필요 없습니다" = foreground subject · 개인 경험담 = supporting
- sfx: soft-chime on 반전 착지

narrativeRole: Frame 3에서 세운 "결국 다 외워야 하나"라는 걱정을 정면으로 무너뜨려, 이후 프레임의
sound-blend-diagram 원리 증명에 대한 기대를 만든다.
keyMessage: 원어민은 규칙을 암기하는 게 아니라 힘을 빼고 편하게 소리 낼 뿐이다.

Scene 1 (0.0–6.0s): "결론부터 말씀드릴게요. 다 외우실 필요 없습니다" — 노랑 hero-word-block급으로
착지.
Scene 2 (6.0–16.0s): "원어민들이... 저절로 저렇게 되는 겁니다" — 앰버 톤 전환, "힘을 빼세요" 텍스트
페이드인.
Scene 3 (16.0–24.3s): "저도 예전엔... 힘을 빼는 원리 하나면 끝나는" — 개인 경험담 supporting 톤,
정지.

## Frame 5 — 원리 설명 (메커니즘, 클라이맥스)

- scene: sound-blend-chip(B/A/G) 3개가 좌→우로 하나씩 밝아지며 등장 → 서로 붙으며 hero-word-block "BAG"으로 조립 → "제 입모양 보세요" 지점에서 실사 B롤 클로즈업 컷인
- voiceover: "원리는 이렇습니다. 혀에 힘을 딱 빼고 턱을 편하게 아래로 툭 떨어뜨리면, 자연스럽게 '애' 소리가 나요. 억지로 신경 써서 내는 소리가 아니라, 힘을 빼면 저절로 그렇게 되는 거예요. 예를 들어 BAG이라는 단어를 볼게요. B는 입술을 붙였다가 팡 떼면서 나는 소리, A는 방금 그 턱을 툭 떨어뜨리는 '애' 소리, G는 목 안쪽에서 편하게 나오는 소리예요. 이 세 개를 힘 빼고 자연스럽게 이어 붙이면 '백(BAG)'이 됩니다. 지금 제 입모양 한번 잘 보세요. 턱이 얼마나 편하게 내려가는지, 입술이 얼마나 힘 없이 움직이는지 — 이게 핵심입니다. 눈으로 직접 확인하시면 훨씬 빨리 감이 잡히실 거예요."
- duration: 37.7s (추정)
- transition_in: crossfade
- status: outline
- src: compositions/frames/05-mechanism.html
- type: reveal
- persuasion: Visual demonstration
- beat: 발견의 "아하" — 이 영상의 클라이맥스
- blueprint: sound-blend (EP13 신규, frame.md §4)
- focal: B·A·G chip이 하나로 합쳐지는 순간 + 실사 입모양 B롤
- roles: sound-blend-diagram = foreground subject · 입모양 B롤 = foreground subject(교대) · 설명 텍스트 = supporting
- sfx: chip이 합쳐지는 순간 soft "pop"

**⚠️ 실사 B롤 필요**: "제 입모양 한번 잘 보세요" 지점(약 26.0–33.0s)에서 입모양 클로즈업(얼굴
비노출)으로 전환. EP12 Frame 3와 동일 방식 — `assets/broll/` 재사용 또는 신규 촬영.

narrativeRole: 이 영상 전체가 파는 단 하나의 원리를 시각으로 직접 증명한다 — 텍스트 설명이 아니라
chip이 실제로 이어 붙는 조립 과정과 실사 입모양을 함께 보여줘서 "느껴서 아는" 채널 특유의 학습
경험을 만든다.
keyMessage: 힘을 빼고 각 글자 소리를 자연스럽게 이어 붙이면 저절로 단어 소리가 된다.

Scene 1 (0.0–10.0s): "원리는 이렇습니다... 애 소리가 나요" — 빈 화면에 "애" pron-caption 단독 등장
(원리를 먼저 추상적으로 소개).
Scene 2 (10.0–20.0s): "예를 들어 BAG... B는... A는... G는..." — sound-blend-chip 3개가 좌→우로
순차 등장(B chip → A chip → G chip), 각 chip 아래 소리 표기.
Scene 3 (20.0–26.0s): "이 세 개를 힘 빼고... 백이 됩니다" — chip 3개가 서로 붙으며 hero-word-block
"BAG"으로 조립(이 프레임의 홀드 포인트 시작).
Scene 4 (26.0–37.7s): "지금 제 입모양 한번 잘 보세요... 감이 잡히실 거예요" — 실사 B롤 컷인(턱
내려가는 A, 입술 붙었다 떨어지는 B를 슬로우로).

## Frame 6 — 실제 단어로 확인 (패턴 확장)

- scene: BAG → CAT → MAP 순서로 sound-blend-diagram이 반복되며 카드가 넘어감, 공통 'A(애)' chip만 노란색 강조
- voiceover: "그럼 이게 진짜 다른 단어에도 통하는지 볼까요? CAT, 볼게요. C는 목 안쪽에서 바람 터지듯 나는 소리, A는 아까처럼 턱 내려가는 '애' 소리, T는 혀끝으로 톡 끊어주는 소리. 이어 붙이면 '캣(CAT)'이에요. MAP도 똑같아요. M은 입술 다물고 콧소리로 흠, A는 또 '애', P는 입술 팡 터지는 소리. 이어 붙이면 '맵(MAP)'. 어때요? BAG에서 썼던 그 '애' 소리, CAT에서도 MAP에서도 똑같이 통하죠? 이거 하나하나 다른 규칙으로 외우신 거 아니에요. 힘 빼는 원리 하나가 계속 통하는 겁니다."
- duration: 31.6s (추정)
- transition_in: crossfade
- status: outline
- src: compositions/frames/06-pattern.html
- type: proof
- persuasion: Repeated pattern demonstration
- beat: 패턴 확장 카타르시스("이것도 되네?")
- blueprint: sound-blend (Reproduce — frame.md §4, 2회 반복)
- focal: BAG→CAT→MAP 세 diagram의 공통 'A(애)' chip
- roles: CAT diagram = foreground subject · MAP diagram = foreground subject(교대) · "애" 공통 강조 = focal thread
- sfx: 각 단어 조립 완료 시 soft tick

narrativeRole: Frame 5에서 배운 원리가 다른 단어에도 똑같이 적용된다는 걸 반복 증명해서, "외울
필요 없이 하나의 규칙"이라는 채널 브랜드 공식(패턴 확장)을 실현한다.
keyMessage: BAG의 '애' 소리가 CAT·MAP에서도 똑같이 통한다 — 단어마다 새로 외우는 게 아니다.

Scene 1 (0.0–12.0s): "CAT, 볼게요. C는... 캣이에요" — sound-blend-diagram(C·A·T)이 조립, 완성되면
BAG 카드는 축소되어 좌측으로 이동.
Scene 2 (12.0–22.0s): "MAP도 똑같아요... 맵" — sound-blend-diagram(M·A·P) 조립, BAG·CAT과 함께
3개 카드 나란히.
Scene 3 (22.0–31.6s): "어때요? ... 힘 빼는 원리 하나가 계속 통하는 겁니다" — 3개 diagram의 'A(애)'
chip만 동시에 노랑 펄스(공통점 강조), 정지.

## Frame 7 — 반전 꿀팁 (예외)

- scene: CAT(C=크)와 CITY(C=스)를 좌우 compare-pair로 배치, C 바로 뒤 글자(A vs I)만 색 강조, 입안 단면 아이콘으로 혀 위치 표시
- voiceover: "근데 눈치채신 분 있으실 거예요. 방금 CAT에서 C는 '크' 소리였잖아요. 근데 CITY나 CENTER 같은 단어에서는 C가 갑자기 '스' 소리로 바뀌어요. 이것도 그냥 외워야 하는 예외일까요? 아니요, 여기도 똑같이 힘 빼는 원리가 통합니다. C 바로 뒤에 E나 I처럼 입 앞쪽에서 나는 소리가 오면, 혀가 굳이 목 안쪽까지 가서 '크' 소리를 낼 필요가 없어져요. 이미 입 앞쪽에 있으니까, 그 자리에서 편하게 '스'로 끝내버리는 거죠. 그러니까 외우실 건 딱 하나예요. 뒤에 E, I, Y가 오면 혀가 귀찮아서 '스'로 바뀐다 — 이거 하나만 기억하시면 됩니다."
- duration: 35.4s (추정)
- transition_in: cut
- status: outline
- src: compositions/frames/07-exception.html
- type: twist
- persuasion: Counter-expectation reveal → mechanistic explanation
- beat: 반전 꿀팁("근데 이건 왜 다르지?")
- blueprint: comparison-split (Adapt — frame.md §5, compare-pair)
- focal: CAT(크) vs CITY(스) 대비 + 혀 위치 단면도
- roles: CAT compare-pair = foreground subject(대등) · CITY compare-pair = foreground subject(대등) · 혀 위치 단면 아이콘 = supporting diagram
- sfx: "이것도 그냥 외워야 하는 예외일까요?" 뒤 짧은 정적, "아니요" 진입 시 soft chime

narrativeRole: 경쟁 영상의 실제 맹점(C 예외를 설명 없이 암기시킴)을 정면으로 뒤집어 채널의 차별화
포인트를 만든다 — "예외조차 같은 원리로 설명된다"는 게 이 편의 두 번째 반전.
keyMessage: C 뒤에 E/I/Y가 오면 혀가 편한 쪽(스)으로 바뀐다 — 이것도 암기가 아니라 원리다.

Scene 1 (0.0–8.0s): "근데 눈치채신 분... C가 갑자기 스 소리로 바뀌어요" — CAT compare-pair(왼쪽,
노랑 rule) 등장, 이어서 CITY compare-pair(오른쪽, 빨강 rule) 등장.
Scene 2 (8.0–12.0s): "이것도 그냥 외워야 하는 예외일까요?" — 짧은 정적, 정지.
Scene 3 (12.0–26.0s): "아니요, 여기도... 그 자리에서 편하게 스로 끝내버리는 거죠" — 입안 단면
아이콘으로 혀 위치(목 쪽 vs 입 앞쪽) 애니메이션.
Scene 4 (26.0–35.4s): "그러니까 외우실 건 딱 하나예요... 이거 하나만 기억하시면 됩니다" — "E, I,
Y → 스" 규칙 요약 텍스트로 정착.

## Frame 8 — 미니 퀴즈

- scene: step-badge(1-4) + 질문 → 짧은 정지(무음) → 정답 공개, 4문항 반복
- voiceover: "직접 맞혀보세요. GAP이라는 단어, 어떻게 소리가 이어질까요? 잠깐 생각해 보시고… G, A, P를 힘 빼고 이어 붙이면 '갭'입니다. 하나 더요. PAT은요? … P, A, T 이어 붙이면 '팻'이죠. 이번엔 좀 다른 문제예요. CUP, C가 크일까요 스일까요? … 정답은 '크', 뒤에 U가 왔으니까요. 마지막으로 CELL은요? … 정답은 '스', 뒤에 E가 왔으니까요."
- duration: 23.4s (추정)
- transition_in: crossfade
- status: outline
- src: compositions/frames/08-quiz.html
- type: interactive_pause
- persuasion: Self-test engagement
- beat: 참여 유도 → 정답 확인 안도감(4회 반복)
- blueprint: quiz-sequence (EP13 신규, frame.md §6)
- focal: 매 문항 정답 공개 순간
- roles: 질문 문구 = supporting · 정답 = foreground subject · step-badge = chrome
- sfx: 매 정답 공개 시 soft chime(EP11/EP12와 동일 규칙)

narrativeRole: Frame 5·6에서 배운 B/A/G/C/T/M/P 조합과 Frame 7의 C 예외 규칙을 시청자가 직접
적용해보게 해서 능동적으로 재확인시킨다.
keyMessage: 배운 원리를 스스로 적용해봐야 진짜 내 것이 된다.

Scene 1 (0.0–6.0s): "직접 맞혀보세요. GAP이라는 단어... 잠깐 생각해 보시고" — step-badge "1" +
GAP 질문, 짧은 정지.
Scene 2 (6.0–9.0s): "G, A, P를 힘 빼고 이어 붙이면 갭입니다" — sound-blend-diagram 축소판으로
정답 조립 공개.
Scene 3 (9.0–13.0s): "하나 더요. PAT은요? ... 팻이죠" — step-badge "2", 같은 방식 빠르게 반복.
Scene 4 (13.0–18.0s): "CUP, C가 크일까요 스일까요? ... 정답은 크" — step-badge "3", 파랑 라벨.
Scene 5 (18.0–23.4s): "마지막으로 CELL은요? ... 정답은 스" — step-badge "4", 빨강 라벨, progress-rail
갱신.

## Frame 9 — 리스닝 트레이닝

- scene: anchor+list 존 — 좌측에 오늘 배운 chip 요약 앵커, 우측에 영어 문장 4개(sentence-card)가 순차 등장
- voiceover: "이제 실제 속도로 들어보세요. 첫 번째. There's a gap. 두 번째. Pat the dog. 세 번째. Give me a cup. 네 번째. Check your cell phone. 오늘 배운 소리들, 실제 문장 속에서도 다 들리시죠?"
- duration: 16.0s (추정)

**⚠️ EP11/EP12와 동일한 이유로 이 프레임만 단일 TTS 호출이 아니다.** 영어 예문 4개는 한글 발음
표기가 아니라 진짜 영어 텍스트를 같은 보이스 엔진에 보내 원어민 발음으로 따로 생성한 뒤 `ffmpeg
concat`으로 이어붙인다(EP11 Line 10 / EP12 Line 7과 동일 절차). 한국어 조각(오프닝+서수+마무리
확인 문장)은 이 씬의 남성 보이스 그대로, 영어 예문 4개만 순수 영어 텍스트로 생성.

- transition_in: crossfade
- status: outline
- src: compositions/frames/09-listening.html
- type: proof
- persuasion: Real-audio comprehension check
- beat: 리스닝 실전 적용
- blueprint: fixed-anchor-cycle (Reproduce — frame.md §7, sentence-card)
- focal: 4개 영어 문장이 하나씩 등장하는 리듬, C 부분만 강조 자막
- roles: 좌측 앵커 = 고정 background reference · 우측 문장 카드 = foreground subject
- sfx: 없음(실제 영어 음성 자체가 콘텐츠라 효과음으로 방해하지 않음)

narrativeRole: 한글 발음 표기가 아니라 진짜 원어민 소리로 직접 시험해서, 원리가 읽기뿐 아니라
듣기에도 통한다는 걸 체감시킨다.
keyMessage: 오늘 배운 소리 규칙은 실제 속도로 들어도 똑같이 적용된다.

Scene 1 (0.0–3.0s): "이제 실제 속도로 들어보세요" 인트로, 좌측 앵커 정착(고정).
Scene 2 (3.0–13.0s): "첫 번째... 네 번째..." — 문장 4개가 하나씩 우측에 등장, C 부분만 강조 자막.
Scene 3 (13.0–16.0s): "오늘 배운 소리들, 실제 문장 속에서도 다 들리시죠?" — 전체 정지.

## Frame 10 — 따라 말해보기

- scene: sound-blend-diagram이 BAG→CAT→MAP→CELL 순서로 반복, 매 단어 2회 조립(느리게→빠르게), 마지막 CELL만 예외 색(빨강/노랑)
- voiceover: "자, 이번엔 직접 해보세요. 아까처럼 소리 하나씩 힘 빼고 이어볼게요. 브, 애, 그 — 이어 붙이면, 백! 다시 한 번, 좀 더 빠르게. 백, 백. 이번엔 캣이에요. 크, 애, 트 — 이어 붙이면, 캣! 다시 한 번, 좀 더 빠르게. 캣, 캣. 이번엔 맵. 흠, 애, 프 — 이어 붙이면, 맵! 다시 한 번, 좀 더 빠르게. 맵, 맵. 마지막으로 예외도 같이 해볼까요? 셀이에요. 뒤에 E가 왔으니까 C는 스로 바뀌죠. 스, 에, 을 — 이어 붙이면, 셀! 다시 한 번, 좀 더 빠르게. 셀, 셀."
- duration: 29.9s (추정)
- transition_in: cut
- status: outline
- src: compositions/frames/10-practice.html
- type: cta_practice
- persuasion: Direct instruction
- beat: 신체 참여 유도
- blueprint: sound-blend (Reproduce — frame.md §4, practice 변형)
- focal: 각 단어 조립 후 2회 반복 pulse
- roles: 프롬프트 문장 = supporting · sound-blend-diagram = foreground subject
- sfx: 각 조립 완료 시 soft pulse tick

narrativeRole: 눈으로 보고 아는 것을 입으로 직접 내뱉게 해서 채널의 "3회 반복 낭독" 시그니처를
이 편의 방식(글자별 조립)으로 실현하고, 예외(CELL)까지 포함해 오늘 배운 전체를 몸으로 복습시킨다.
keyMessage: 소리 내서 말해봐야 입이 기억한다 — 기본 패턴과 예외 모두.

Scene 1 (0.0–7.0s): "브, 애, 그 — 이어 붙이면, 백! ... 백, 백" — BAG diagram 조립 → 2회 pulse.
Scene 2 (7.0–14.0s): "크, 애, 트 — 이어 붙이면, 캣! ... 캣, 캣" — CAT diagram, 동일 패턴.
Scene 3 (14.0–21.0s): "흠, 애, 프 — 이어 붙이면, 맵! ... 맵, 맵" — MAP diagram, 동일 패턴.
Scene 4 (21.0–29.9s): "셀이에요... 셀, 셀" — CELL diagram, chip 색이 빨강/노랑으로 전환(예외
신호), 2회 pulse.

## Frame 11 — 실생활 재확인 (페이오프)

- scene: 마트 진열대 배경 위 'JAM' 라벨이 확대되며 sound-blend-diagram으로 천천히(내레이션과 속도 일치) 조립, 씬1의 물음표 컷 재등장 후 자신감 있게 전환
- voiceover: "이제 처음 보는 단어를 만나도 예전처럼 무작정 얼어붙진 않으실 거예요. 마트에서 'JAM'이라는 글자를 보셨다고 해볼까요. 바로 술술 읽히지 않아도 괜찮아요. 배운 대로 소리 하나씩 힘 빼고 천천히 이어보면, 즈, 애, 음 — 잼! 이렇게 시간이 걸리더라도 스스로 읽어낼 수 있게 되실 거예요. 이게 오늘 배운 원리의 진짜 힘입니다."
- duration: 21.4s (추정)
- transition_in: crossfade
- status: outline
- src: compositions/frames/11-payoff.html
- type: benefit_highlight
- persuasion: Real-world payoff, honest pacing (no overclaim)
- beat: 발견의 즐거움 재확인(Frame 1의 Stakes 회수)
- blueprint: sound-blend (Reproduce — frame.md §4/§8, payoff 변형, 조립 속도를 의도적으로 늦춤)
- focal: JAM diagram이 "천천히" 조립되는 속도 자체(과장 없는 정직한 페이스)
- roles: JAM diagram = foreground subject · 씬1 회수 컷 = supporting callback
- sfx: 없음(차분한 정리 톤 유지)

narrativeRole: Frame 1에서 던진 "처음 보는 단어 앞에서 멈췄던 경험"을 여기서 직접 회수하되,
"바로 읽힌다"는 과장 없이 "시간이 걸리더라도 스스로 읽어낼 수 있다"로 정직하게 착지한다.
keyMessage: 완전히 새로운 단어도 같은 원리로, 시간이 걸리더라도 스스로 읽어낼 수 있다.

Scene 1 (0.0–5.0s): "이제 처음 보는 단어를 만나도... 마트에서 JAM이라는 글자를" — 마트 진열대
배경, JAM 라벨 등장.
Scene 2 (5.0–14.0s): "바로 술술 읽히지 않아도 괜찮아요... 잼!" — sound-blend-diagram이 다른
프레임보다 느린 속도로 조립(내레이션의 "천천히"와 일치).
Scene 3 (14.0–21.4s): "이렇게 시간이 걸리더라도... 진짜 힘입니다" — 씬1의 물음표 컷 짧게 재등장 후
자신감 있는 톤으로 정지.

## Frame 12 — 요약 + 마무리

- scene: 오늘 다룬 단어(BAG·CAT·MAP·CELL) 카드가 빠르게 스쳐 지나간 뒤 "힘을 빼면, 소리가 난다" 문구가 중앙에 정착, 채널 로고로 페이드아웃
- voiceover: "오늘은 알파벳을 힘 빼고 편하게 이어 붙이면 소리가 저절로 만들어진다는 원리, 그리고 C처럼 예외로 보이는 것도 사실 같은 원리로 설명된다는 것까지 함께 봤습니다. 처음 보는 단어 앞에서 더 이상 얼어붙지 않으셨으면 좋겠어요. 다음에도 여러분이 자주 막막해하시는 부분, 또 풀어드릴게요. 저와 같이 하나씩 차근차근 익혀 나가시면, 어느새 훨씬 편하게 읽고 계실 거예요."
- duration: 24.5s (추정)
- transition_in: crossfade
- status: outline
- src: compositions/frames/12-summary.html
- type: branding
- persuasion: Recap + warm close
- beat: 정리 + 따뜻한 다음 기약(특정 예고 없음)
- blueprint: titlecard-reveal (Reproduce — frame.md §8, Rehook 없는 변형)
- focal: "저와 같이 하나씩 차근차근 익혀 나가시면" — 따뜻하게 닫히는 문장
- roles: 요약 문장 = supporting, 정착 · 마무리 문장 = foreground subject, 완전히 정착
- sfx: 없음(차분하게 완결)

narrativeRole: 이 편의 배움(기본 패턴 + 예외)을 요약해서 완결감을 주고, 특정 다음 소재를 예고하지
않은 채(단편 방침) 채널에 대한 신뢰와 동행감만 따뜻하게 남긴다.
keyMessage: 오늘의 배움은 여기서 완결된다. 함께 하나씩 익혀나가면 된다는 믿음만 남긴다.

Scene 1 (0.0–10.0s): "오늘은... 함께 봤습니다" — BAG·CAT·MAP·CELL 카드가 빠르게 스쳐 지나감,
progress-rail 100% 채워짐.
Scene 2 (10.0–17.0s): "처음 보는 단어 앞에서... 또 풀어드릴게요" — "힘을 빼면, 소리가 난다" 문구
중앙 정착.
Scene 3 (17.0–24.5s): "저와 같이 하나씩 차근차근... 읽고 계실 거예요" — 가장 따뜻한 웜 앰버 톤으로
전환, 채널 로고 페이드아웃.
