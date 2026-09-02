---
format: 1920x1080
duration: ~2:36 (estimate — SCRIPT.md 나레이션 길이 기준, 실제 TTS 생성 후 갱신)
message: "Want와 Won't는 단어가 아니라 턱의 움직임 하나로 구분해서 듣는다"
arc: concept-explainer with practice
audience: "원트와 우언트의 소리 차이를 구별하지 못해 듣기와 말하기에서 늘 헷갈리는 왕초보 학습자"
mode: collaborative
music: calm minimal ambient underscore, very low presence — educational, never distracting
---

## Video direction

**Palette·모션 문법·리듬 배분 원칙은 EP11(`videos/ep11-longform-faceless/STORYBOARD.md` Video
direction)과 100% 동일** — 시즌2 시각적 일관성이 이 프로젝트의 명시적 요구사항. 다크 네이비 그라운드,
세 기능색(노랑=강세/정답, 파랑=발음, 빨강=예외), power3 롱테일 감속 진입, 나레이션 발화 시점에만
등장, subtle jitter 외 정지 시 생동감 없음.

**이 편의 차이점**: 이 편은 "예외" 프레임이 하나뿐(Frame 5)이라 EP11만큼 빨강을 자주 안 쓴다.
대신 신규 컴포넌트 `mouth-shape-diagram`(Frame 3)이 이 편의 시각적 클라이맥스 — GONNA 텍스트
리빌이 아니라 **도형의 벌어짐 차이 자체**가 반전이다.

**Rhythm / held-frame allocation**: 3곳이 의도적 홀드 — Frame 3(메커니즘 반전 공개, 클라이맥스),
Frame 6(퀴즈 정답 공개), Frame 10(마무리+Rehook, 의도적으로 안 닫힌 채 정지). 나머지 프레임은
능동적으로 전개된다.

**Negative list**: EP11과 동일(그림자 없음, 빨강 배경 채우기 금지, 검은고딕은 헤드라인 전용,
`repeat`/`yoyo`/`Math.random`/`Date.now` 금지) + 같은 프레이밍 연속 두 번 금지: 1 centered →
2 centered → 3 split-screen(신규) → 4 rule-of-thirds → 5 split-screen → 6 centered →
7 rule-of-thirds → 8 centered → 9 centered → 10 centered.

## Frame 1 — Stakes

- scene: 다크 네이비 화면, 공감형 도입 문장 → "그런데" 이후 문제 제기 문장이 순차 등장
- voiceover: "미드나 영화 보다가 '아이 원트 잇'이랑 '아이 워운트 두 잇', 이 두 개가 똑같이 들려서 자막 없이는 포기하신 적 있으시죠? 오늘 그 이유를 보여드리겠습니다."
- duration: 10s
- transition_in: cut
- status: outline
- src: compositions/frames/01-stakes.html
- type: hook
- persuasion: 공감(Rhetorical empathy)
- beat: 공감 + 호기심
- blueprint: kinetic-type-beats (Reproduce)
- focal: "이 두 개가 똑같이 들려서" (공감 포인트)
- roles: 도입 문장 = supporting · 공감 문장 = foreground subject · center glow = background
- sfx: soft-whoosh on 공감 문장 entrance

narrativeRole: 시청자가 실제로 겪어본 구체적 상황(미드 자막 없이 포기)으로 즉시 공감시켜, "오늘
이걸 해결한다"는 약속으로 이어붙인다.
keyMessage: Want와 Won't가 헷갈리는 건 당신만의 문제가 아니다.

Scene 1 (0.0–4.5s): "미드나 영화 보다가... 포기하신 적 있으시죠?" — per-word staggered reveal, 흰색.
Scene 2 (4.5–8.0s): "오늘 그 이유를 보여드리겠습니다" — 노랑(accent-stress)으로 전환, 이 프레임의
지배 요소.
Scene 3 (8.0–10.0s): 정지, subtle jitter만. progress-rail 첫 구간 채워짐.

## Frame 2 — Big Question + Head Fake

- scene: "Want vs Won't" 대비 문구 등장 → 질문 → 짧은 정지 → "정답은 발음 기호가 아닙니다" 반전 착지
- voiceover: "Want랑 Won't, 스펠링도 다르고 뜻도 정반대인데 왜 소리는 비슷하게 들릴까요? 정답은 발음 기호가 아닙니다. 입을 얼마나 크게 벌리느냐, 그 차이 하나예요."
- duration: 12s
- transition_in: crossfade
- status: outline
- src: compositions/frames/02-headfake.html
- type: hook
- persuasion: Rhetorical question → reversal
- beat: 의문 → 반전 착지
- blueprint: kinetic-type-beats (Reproduce — in-place word-swap가 Head Fake 페이로드)
- focal: "정답은 발음 기호가 아닙니다"
- roles: 질문 = supporting · 반전 문장 = foreground subject · center glow = background
- sfx: soft-chime on 반전 착지

narrativeRole: "발음 기호를 몰라서 헷갈린다"는 흔한 오해를 세워놓고 곧바로 무너뜨려, 다음 프레임의
시각적 반전(mouth-shape-diagram)에 대한 기대를 만든다.
keyMessage: 구분의 열쇠는 IPA 기호가 아니라 입의 움직임이다.

Scene 1 (0.0–5.0s): "Want랑 Won't, 스펠링도 다르고... 왜 소리는 비슷하게 들릴까요?" per-word reveal.
Scene 2 (5.0–10.0s): "정답은 발음 기호가 아닙니다. 입을 얼마나 크게 벌리느냐, 그 차이 하나예요" —
노랑, 지배 요소로 착지.
Scene 3 (10.0–12.0s): 정지, progress-rail 갱신.

## Frame 3 — Mechanism Diagram (클라이맥스)

- scene: 화면 좌우 분할 — 좌측 도형이 크게 벌어지며 "Want" 텍스트 등장, 우측 도형이 오므라들며 "Won't" 텍스트 등장
- voiceover: "Want는요, 턱을 아래로 뚝 떨어뜨리면서 입을 크게 벌려요. '아.' 이 소리입니다. Won't는 반대로 입술을 동그랗게 오므리면서 짧게 냅니다. '오.' 이 소리예요. 턱이 크게 벌어지면 Want, 입술이 오므라들면 Won't. 이거 하나만 기억하시면 됩니다."
- duration: 20s
- transition_in: cut
- status: outline
- src: compositions/frames/03-mechanism.html
- type: reveal
- persuasion: Visual demonstration
- beat: 발견의 "아하" — 이 영상의 클라이맥스
- blueprint: compose (두 도형의 벌어짐 대비 자체가 메커니즘 — 메뉴에 맞는 블루프린트 없음, EP11
  Frame 4와 같은 이유)
- focal: mouth-shape-diagram 두 개의 벌어짐 정도 차이
- roles: 좌측 Want 도형 = foreground subject · 우측 Won't 도형 = foreground subject(대등) ·
  "이거 하나만 기억하시면 됩니다" = closing supporting line
- sfx: 도형이 벌어지는 순간 soft "pop", 오므라드는 순간 soft "close"

narrativeRole: 이 영상 전체가 파는 단 하나의 원리를 시각으로 직접 증명한다 — 텍스트 설명이 아니라
도형의 실제 벌어짐 차이를 보여줘서 "느껴서 아는" 채널 특유의 학습 경험을 만든다.
keyMessage: 턱이 크게 벌어지면 Want, 입술이 오므라들면 Won't.

Scene 1 (0.0–7.0s): "Want는요, 턱을 아래로 뚝..." — 좌측 타원이 위아래로 크게 벌어지며 "Want"
hero-word-block 등장(노랑 강세), 아래 "아" pron-caption(파랑).
Scene 2 (7.0–14.0s): "Won't는 반대로..." — 우측 원이 작게 오므라들며 "Won't" hero-word-block
등장, 아래 "오" pron-caption.
Scene 3 (14.0–20.0s): "턱이 크게 벌어지면 Want, 입술이 오므라들면 Won't. 이거 하나만..." — 양쪽
도형이 동시에 살짝 펄스, 정지해서 읽힘(이 프레임의 홀드 포인트).

## Frame 4 — 실제 문장으로 확인

- scene: anchor+list 존 — 좌측에 Want/Won't 미니 앵커, 우측에 예문 카드 6개가 순차 스택
- voiceover: "문장으로 볼까요. '아이 원트 잇.' 아이 원트, 턱을 벌리죠. '아이 워운트 두 잇.' 아이 워운트, 입술을 오므립니다. 주어를 바꿔도 똑같아요. '쉬 원츠 모어.' '쉬 워운트 스탑.' '데이 원트 헬프.' '데이 워운트 헬프.' 뜻은 반대인데, 입 모양만 보면 헷갈릴 이유가 없습니다."
- duration: 26s
- transition_in: crossfade
- status: outline
- src: compositions/frames/04-examples.html
- type: proof
- persuasion: Repeated pattern demonstration
- beat: 패턴 확장 카타르시스("이것도 되네?")
- blueprint: grid-card-assemble (Reproduce)
- focal: sentence-card 6개가 Want/Won't 교대로 쌓이는 리듬
- roles: 좌측 앵커 = background reference · sentence-card 스택 = foreground subject
- sfx: 각 카드 착지 시 soft tick

narrativeRole: Frame 3에서 배운 원리가 주어를 바꿔도(I/She/They) 똑같이 적용된다는 걸 반복
증명해서, "외울 필요 없이 하나의 규칙"이라는 채널 브랜드 공식(패턴 확장)을 실현한다.
keyMessage: 주어가 바뀌어도 입모양 차이는 그대로 유지된다.

Scene 1 (0.0–8.0s): "문장으로 볼까요. '아이 원트 잇.'... '아이 워운트 두 잇.'" — 첫 번째 Want/Won't
페어 카드가 순차 착지, 타겟 단어 노랑 인라인.
Scene 2 (8.0–20.0s): "주어를 바꿔도 똑같아요..." — 남은 4개 카드(She/They 페어) staggered
cascade로 쌓임.
Scene 3 (20.0–26.0s): "뜻은 반대인데, 입 모양만 보면 헷갈릴 이유가 없습니다" — 전체 카드 스택
정지해서 읽힘.

## Frame 5 — 반전 꿀팁

- scene: "Want to"가 흐릿하게 페이드되며 사라지고, "Won't"만 또렷하게 남아 확대
- voiceover: "그런데 재밌는 게 하나 있어요. Want to는 원어민이 빠르게 말할 때 워너로 훅 줄어드는데, Won't는 거의 그렇게 안 줄어듭니다. 부정의 뜻이 중요하니까, 오히려 또박또박 발음하려는 거예요. 그러니까 소리가 흐릿하게 뭉개졌다면, 그건 대부분 Want 쪽입니다."
- duration: 18s
- transition_in: cut
- status: outline
- src: compositions/frames/05-twist.html
- type: twist
- persuasion: Counter-expectation reveal
- beat: 반전 꿀팁("근데 이건 왜 다르지?")
- blueprint: comparison-split (Adapt — 두 단어의 "줄어듦 정도"를 대등하게 겨루는 구도로 변형,
  mirrored book-open tilt는 유지하되 승부 결과가 있다는 점이 다름)
- focal: Won't가 선명하게 남고 Want to가 흐려지는 대비
- roles: Want to(줄어듦) = 페이드 아웃되는 요소 · Won't(안 줄어듦) = foreground subject로 확대
- sfx: Want to 페이드 시 soft dissolve, Won't 확대 시 subtle emphasis chime

narrativeRole: "이것도 GONNA처럼 줄어들겠지"라는 예상을 깨서 몰입도를 높이고, "그러니까 뭉개진
소리=Want"라는 실전 리스닝 팁으로 바로 연결한다.
keyMessage: Won't는 부정의 의미 때문에 잘 안 줄어든다 — 뭉개진 소리는 대부분 Want다.

Scene 1 (0.0–7.0s): "그런데 재밌는 게 하나 있어요. Want to는... 워너로 훅 줄어드는데" — "Want to
→ 워너" 텍스트가 흐릿해지며 축소.
Scene 2 (7.0–13.0s): "Won't는 거의 그렇게 안 줄어듭니다. 부정의 뜻이 중요하니까" — "Won't" 텍스트가
선명하게 확대, 이번 프레임 유일하게 accent-exception 빨강 테두리로 "예상 밖의 사실" 신호.
Scene 3 (13.0–18.0s): "그러니까 소리가 흐릿하게 뭉개졌다면, 그건 대부분 Want 쪽입니다" — 정지.

## Frame 6 — 미니 예측 퀴즈

- scene: 질문 문장 등장 → 짧은 정지(생각 시간) → 정답 hero-word-block 공개
- voiceover: "직접 맞혀보세요. '아이 워운트 비 데어.' 이 문장, 입술이 오므라들었을까요 벌어졌을까요? 잠깐 생각해 보시고... 정답은 오므라든 겁니다. Won't니까요."
- duration: 14s
- transition_in: crossfade
- status: outline
- src: compositions/frames/06-quiz.html
- type: interactive_pause
- persuasion: Self-test engagement
- beat: 참여 유도 → 정답 확인 안도감
- blueprint: kinetic-type-beats (Reproduce — Q→A pairing이 in-place word-swap)
- focal: "정답은 오므라든 겁니다" 공개 순간
- roles: 질문 문장 = supporting · 정답 = foreground subject · center glow = background
- sfx: 정답 공개 시 soft chime(EP11 Frame 7과 동일 규칙)

narrativeRole: 시청자가 직접 판단해보게 해서 Frame 3의 원리를 능동적으로 재확인시킨다 — 수동
시청에서 참여로 전환하는 지점.
keyMessage: 배운 원리를 스스로 적용해봐야 진짜 내 것이 된다.

Scene 1 (0.0–6.0s): "직접 맞혀보세요. '아이 워운트 비 데어.'... 벌어졌을까요?" — 질문 문장 reveal.
Scene 2 (6.0–9.0s): "잠깐 생각해 보시고..." — 정지, 아무 텍스트 변화 없음(실제 생각 시간 확보,
TTS 뒤 무음).
Scene 3 (9.0–14.0s): "정답은 오므라든 겁니다. Won't니까요" — hero-word-block "Won't" + 축소된
mouth-shape-diagram(오므라든 쪽)이 동시 공개, 노랑 강조.

## Frame 7 — 리스닝 트레이닝

- scene: anchor+list 존(Frame 4와 동일 패턴) — 좌측 Want/Won't 앵커, 우측에 영어 문장 4개가
  순차 등장
- voiceover: "이제 실제 속도로 들어보고 Want인지 Won't인지 직접 구분해 보세요. 첫 번째. I want it so bad. 두 번째. She won't listen. 세 번째. They want more time. 네 번째. We won't give up. 입 모양이 보이시나요? 벌어지면 Want, 오므라들면 Won't입니다."
- duration: 24s
- transition_in: crossfade
- status: outline
- src: compositions/frames/07-listening.html
- type: proof
- persuasion: Real-audio comprehension check
- beat: 리스닝 실전 적용
- blueprint: fixed-anchor-cycle (Reproduce — 앵커의 정지 자체가 이 블루프린트의 주장, EP11
  Frame 10과 동일 패턴)
- focal: 4개 영어 문장이 하나씩 등장하는 리듬
- roles: 좌측 Want/Won't 앵커 = 고정 background reference · 우측 문장 카드 = foreground subject
- sfx: 없음(실제 영어 음성 자체가 콘텐츠라 효과음으로 방해하지 않음)

narrativeRole: 한글 발음 표기가 아니라 진짜 원어민 소리로 직접 시험해서, 이 영상이 약속한
"0.1초 만에 귀가 열린다"는 썸네일 카피를 실제로 체감시킨다.
keyMessage: 진짜 속도로 들어도 입모양 원리를 알면 구분된다.

**⚠️ SCRIPT.md Line 7과 동일 — 이 프레임 오디오는 2단계 조립(한국어 부분은 이 씬 나레이터,
영어 예문 4개는 순수 영어 TTS로 별도 생성 후 concat).** 캡션 타이밍도 조립된 오디오 기준으로
재추출.

Scene 1 (0.0–4.0s): "이제 실제 속도로 들어보고..." 인트로 문장, 좌측 앵커 정착(고정, 이후 안 움직임).
Scene 2 (4.0–18.0s): "첫 번째... 네 번째..." — 문장 4개가 하나씩 우측에 등장, 순서 숫자(1-4)
step-badge 스타일로 짧게 표시.
Scene 3 (18.0–24.0s): "입 모양이 보이시나요? 벌어지면 Want, 오므라들면 Won't입니다" — 전체 정지,
Frame 3의 mouth-shape-diagram 미니 버전이 앵커 옆에 재등장(회수).

## Frame 8 — 따라 말해보기

- scene: 프롬프트 텍스트 + hero-word-block(축소판)이 3회 반복 펄스
- voiceover: "이제 직접 소리 내보세요. 원트. 아이 원트. 아이 원트 잇. 세 번만 따라 하시면 입이 기억합니다."
- duration: 8s
- transition_in: cut
- status: outline
- src: compositions/frames/08-practice.html
- type: cta_practice
- persuasion: Direct instruction
- beat: 신체 참여 유도
- blueprint: compose (3박자 반복 드릴 — 메뉴에 없음, EP11 Frame 11과 동일 이유로 in-place token
  cycle + press pulse로 구성)
- focal: "원트→아이 원트→아이 원트 잇" 3단계 확장
- roles: 프롬프트 문장 = supporting · 반복되는 단어/구 = foreground subject
- sfx: 각 반복마다 soft pulse tick(3회)

narrativeRole: 눈으로 보고 아는 것을 입으로 직접 내뱉게 해서 채널의 "3회 반복 낭독" 시그니처
포맷을 실현한다.
keyMessage: 소리 내서 말해봐야 입이 기억한다.

Scene 1 (0.0–2.0s): "이제 직접 소리 내보세요" — 프롬프트 문장.
Scene 2 (2.0–7.0s): "원트. 아이 원트. 아이 원트 잇." — 매 반복마다 문구가 확장되며 pulse(노랑
강세 유지, in-place token cycle).
Scene 3 (7.0–8.0s): "세 번만 따라 하시면 입이 기억합니다" — 정지.

## Frame 9 — 실생활 재확인

- scene: h2 톤의 저밀도 홀드, "노, 아이 워운트" 예시 문구가 짧게 강조
- voiceover: "그래서 미드에서 '노, 아이 워운트'라고 할 때, 자막 없이도 이제 입 모양만 보면 딱 들리실 겁니다. 뜻이 정반대인 두 단어가, 사실 이렇게 간단한 차이였어요."
- duration: 10s
- transition_in: crossfade
- status: outline
- src: compositions/frames/09-payoff.html
- type: benefit_highlight
- persuasion: Real-world payoff
- beat: 발견의 즐거움 재확인(Frame 1의 Stakes 회수)
- blueprint: compose (일반화 비트 — EP11 Frame 12와 동일 이유로 메뉴에 없음)
- focal: "자막 없이도... 딱 들리실 겁니다"
- roles: "노, 아이 워운트" 예시 = supporting · 결론 문장 = foreground subject
- sfx: 없음(차분한 정리 톤 유지)

narrativeRole: Frame 1에서 던진 "미드 자막 없이 포기했던 경험"을 여기서 직접 회수 — 문제 제기와
해결을 수미상관으로 닫는다.
keyMessage: 오늘 배운 게 실제 시청 경험을 바꾼다.

Scene 1 (0.0–5.0s): "그래서 미드에서 '노, 아이 워운트'라고 할 때..." — 예시 문구 짧게 강조(파랑
pron-caption 스타일).
Scene 2 (5.0–10.0s): "뜻이 정반대인 두 단어가, 사실 이렇게 간단한 차이였어요" — 정지, 옅은 만족감.

## Frame 10 — 요약 + Rehook

- scene: 요약 문장 정착 → "WANT TO" 텍스트가 짧게 강조되며 등장, 화면이 완전히 닫히지 않은 채 정지
- voiceover: "오늘은 Want와 Won't를 입 모양 하나로 구분하는 법을 봤습니다. 그리고 지난 편에서 약속드렸던 WANT TO 축약, 그거 다음 영상에서 바로 보여드릴게요."
- duration: 14s
- transition_in: cut
- status: outline
- src: compositions/frames/10-summary-rehook.html
- type: branding
- persuasion: Recap + forward hook
- beat: 정리 + 다음 편 예고(안 닫힌 결말)
- blueprint: titlecard-reveal (Reproduce — 차분한 2줄 가치-타이틀 랜딩, 2번째 줄(WANT TO)이
  옅은 채 안 닫히는 게 Rehook, EP11 Frame 13과 동일 패턴)
- focal: "WANT TO" 텍스트 — 옅게, 완전히 해소되지 않은 채 유지
- roles: 요약 문장 = supporting, 정착 · "WANT TO" = 미해결로 남는 forward hook
- sfx: 없음(의도적으로 열린 결말, 효과음으로 닫아버리지 않음)

narrativeRole: 이 편의 배움을 요약해서 완결감을 주는 동시에, EP11이 예고했던 WANT TO 약속을
명시적으로 재확인해서 다음 편(EP13)으로 연속성을 잇는다 — 2026-09-03 확정(SCRIPT.md "Rehook
연속성 메모" 참고).
keyMessage: 오늘의 배움은 끝났지만, WANT TO 이야기는 아직 남아있다.

Scene 1 (0.0–7.0s): "오늘은 Want와 Won't를... 봤습니다" — 요약 문장, progress-rail 100% 채워짐.
Scene 2 (7.0–14.0s): "그리고 지난 편에서 약속드렸던 WANT TO 축약, 그거 다음 영상에서..." —
"WANT TO" 텍스트가 옅게(text-muted, 아직 안 풀린 색) 등장, 화면은 완전히 안 닫힌 채 정지.
