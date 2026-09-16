---
format: 1920x1080
duration: ~5:00 (300초 — SCRIPT.md 최종 확정 원문 글자 수 기준 역산 추정치. TTS 실제 생성 후
  whisper 실측으로 재계산 필요. 아래 각 프레임 duration은 전부 추정값이다.)
message: "영어 단어에 모음이 두 개 나란히 나오면 뒤 모음은 침묵하고 앞 모음 이름만 소리 낸다는
  규칙 하나로 Boat, Rain, Meat 같은 단어들을 무작정 외우지 않고 한꺼번에 읽을 수 있다. 단,
  EA만큼은 예외가 있다."
arc: concept-explainer with practice
audience: "단어에 모음이 두 개 이상 연속으로 나오면 어떻게 소리 내야 할지 막막한 알파벳 파닉스
  직후 입문자"
mode: collaborative
music: 약간 빠른 템포·집중력을 높이는 느낌의 BGM, SFX는 고급스럽고 절제된 톤(채널 기본 규칙,
  `CLAUDE.md` "HyperFrames 영상 제작 시 기본 적용 요소")
---

## Video direction

**Palette·모션 문법·리듬 배분 원칙은 EP11~15(`frame.md`)와 100% 동일** — 다크 네이비 그라운드,
power3 롱테일 감속 진입, 나레이션 발화 시점에만 등장, subtle jitter 외 정지 시 생동감 없음.

**이 편의 차이점**: 신규 컴포넌트 `vowel-pair-card`(+ `vowel-pair-cluster`, `hesitation-cursor`,
`question-flicker`, `lazy-tongue-reveal`)가 이 편의 시각적 척추다 — EP15의 `sion-card`가 "단어
끝 하나의 소리 패턴이 앞 글자로 갈린다"를 보여줬다면, 이 편은 **"단어 안 모음 두 글자 중 하나는
소리 내고 하나는 쉰다"**를 보여준다. 색은 두 역할로 통일한다: 규칙 그룹은 앞 모음=노랑
(`{colors.accent-stress}`, "소리 냄") + 뒤 모음=반투명+Zzz("쉬는 중"), 예외 그룹은 두 글자를
분리하지 않고 EA 전체를 빨강(`{colors.accent-exception}`)으로 통일 강조한다 — "이 둘은 따로
안 갈리고 통째로 다른 소리"라는 구조적 차이를 색 처리 방식 자체로 구분한다.

**Rhythm / held-frame allocation**: 2곳이 의도적 홀드 — Frame 4~5(원리 최초 공개, 두 프레임에
걸쳐 서서히 확립), Frame 11의 GRAIN 첫 해소 순간. Frame 11 후반(FOAM·REACH)은 반대로 **가속
몽타주**로 리듬을 바꾼다 — 이 편에서 유일하게 "느렸다가 빨라지는" 구간(EP15와 동일 기법).

**Negative list**: EP11~15와 동일(그림자 없음, 빨강 배경 채우기 금지, Black Han Sans는 헤드라인
전용, `repeat`/`yoyo`/`Math.random`/`Date.now` 금지) + 같은 프레이밍 연속 두 번 금지: 1
hesitation-cursor → 2 wordmark → 3 question-flicker → 4 lazy-tongue-reveal(신규, 홀드) →
5 vowel-pair-card(신규, 홀드) → 6 vowel-pair-cluster(신규, 6장) → 7 vowel-pair-cluster(신규,
예외색 3장) → 8 quiz-reveal(축소판 반복) → 9 sentence-card(4개 스택) → 10 lazy-tongue-reveal
(반복) → 11 hesitation-cursor→해소(몽타주 가속) → 12 vowel-pair-card 스택(14장).

## Frame 1 — 도입 (Stakes)

- scene: 딥 다크 캔버스에 BOAT, RAIN, MEAT 세 단어가 하나씩 떠오르다가, 모음 두 글자(OA·AI·EA)
  위에서 커서가 머뭇거리듯 깜빡이는 모션(둘 다 읽어야 할지 망설이는 느낌 — 정답 색 없이 중립
  {colors.text-muted}만 사용).
- voiceover: "BOAT, RAIN, MEAT... 저도 이런 쉬운 단어 앞에서 순간 멈칫했던 적이 있어요. 모음이 두 개 나란히 붙어 있으면, 이걸 다 읽어야 하는 건지, 하나만 읽어야 하는 건지, 그런 기준이 있는지조차 몰랐거든요. 오늘 그 기준 하나만 알면, 이런 단어들 더 이상 멈추지 않고 바로 읽으실 수 있어요."
- duration: 18.0s (추정)
- transition_in: cut
- status: outline
- src: compositions/frames/01-stakes.html
- type: hook
- persuasion: 공감(Rhetorical empathy) + 구체적 이득 제시
- beat: 공감 + 호기심 + 시청자 이득
- blueprint: hesitation-cursor (frame.md, EP16 신규)
- focal: BOAT·RAIN·MEAT의 모음 두 글자 위에서 커서가 망설이는 순간
- roles: 세 단어 카드 = foreground subject · 머뭇거리는 커서 = focal thread · center glow =
  background
- sfx: soft-tick on 커서 깜빡임(낮은 볼륨, 3회)

**한눈에 보이는 장면**: 크림색 종이 배경에 단어 3개가 세로로 얌전히 나열돼 있다. 각 단어의
모음 두 글자 사이에서 연필 커서 같은 게 좌우로 왔다 갔다 머뭇거린다. 색은 전부 무채색 — 아직
아무것도 강조되지 않은, "고민 중"인 화면.

**레이아웃·배치·컬러·모션**:
- Zone: 최상단 3px `progress-rail`(0→8.3% 채움) 고정. 중앙 세로 스택(`position: absolute;
  top:50%; transform:translateY(-50%); flex-direction:column; gap:3.2cqh`)에 BOAT·RAIN·MEAT
  3단어. 배경은 `{colors.bg}` 단색 크림(글로우·그라디언트 없음 — 종이 질감이라 광원 효과가
  어울리지 않음).
- 배치: 각 단어는 `hero-word` 축소판(Archivo Black), 모음 두 글자(OA·AI·EA)만 별도 `<span>`
  으로 분리해 `hesitation-cursor` 타깃으로 지정. 3단어 전부 가로 중앙 정렬. 카드 틀은 없음 —
  이 프레임은 sketch-card 없이 배경 위에 텍스트만 얹는다(카드는 Frame 5부터 등장).
- 컬러: 배경 `{colors.bg}`, 단어 기본색 `{colors.ink}`(진한 잉크색). 모음 두 글자는 규칙/예외
  어느 색도 쓰지 않고 `{colors.text-muted}`만 — 이 프레임에서 정답 색이 먼저 나오면 Frame
  3~4의 반전이 죽는다.
- 모션: 세 단어가 각자의 실제 발화 시작 시각에 맞춰 순차 등장(`opacity 0→1, y:14→0, duration
  0.4, ease power2.out`). "이걸 다 읽어야 하는지..." 구간(대략 7~14s)에서 모음 두 글자 위에
  `hesitation-cursor`가 좌우로 3~4회 깜빡임(`opacity 0.4↔0.85, duration 0.35 반복 — 무한
  루프 금지, 정확히 4회에서 정지`). 마지막 문장에서 단어들 주변에 아주 옅은 종이 질감 텍스처가
  살짝 밝아지며(`opacity 0→0.06, duration 1.0`) 희망적 톤으로 마무리.

narrativeRole: "쉬운 단어인데도 모음 두 개 앞에서 멈칫한다"는 왕초보의 실제 상황을 구체적 단어
3개로 즉시 보여주고 공감시킨 뒤, "기준 하나만 알면 된다"는 구체적 이득까지 이 프레임 안에서
약속한다(`VIDEO_WORKFLOW.md` 3단계, "Frame 1 호기심·이득 체크리스트" 규칙 적용). **"당신 탓이
아니에요" 류 반전 reassurance 문구는 의도적으로 넣지 않는다**(2026-09-15 확정 — 시청자가 이미
스스로 못한다는 전제로 클릭한 상태라 그 전제를 부정하는 문장이 뻔하게 들린다는 지적,
`knowledge/brand-persona.md` 참고). Frame 11에서 같은 문장("이걸 다 읽어야 하는지, 하나만
읽어야 하는지, 그런 기준이 있는지조차 몰랐던 게")이 그대로 다시 불려와 대칭으로 회수된다.
keyMessage: 모음 두 개 앞에서 멈칫하는 건 실력 부족이 아니라 기준이 있다는 것 자체를 몰랐을
뿐이고, 오늘 그 기준 하나로 해결된다.

Scene 1 (0.0–7.0s): "BOAT, RAIN, MEAT... 저도 이런 쉬운 단어 앞에서 순간 멈칫했던 적이 있어요" —
세 단어 순차 등장.
Scene 2 (7.0–14.0s): "모음이 두 개 나란히 붙어 있으면… 몰랐거든요" — 각 단어의 모음 두 글자
위에서 hesitation-cursor 깜빡임.
Scene 3 (14.0–18.0s): "오늘 그 기준 하나만 알면… 바로 읽으실 수 있어요" — 커서 정지, 다음
프레임으로 크로스페이드 준비.

## Frame 2 — 채널 인트로

- scene: Frame 1의 머뭇거리던 커서 애니메이션이 걷히며 채널 워드마크 짧게 노출. 시즌 표기 없음
  (단편 방침).
- voiceover: "안녕하세요, 「이해하면 쉬운영어」입니다. 오늘은 모음 두 개가 나란히 붙어 있을 때, 어느 쪽을 읽고 어느 쪽은 넘기는지, 그 기준 하나를 짚어드리겠습니다."
- duration: 15.0s (추정)
- transition_in: crossfade
- status: outline
- src: compositions/frames/02-intro.html
- type: branding
- persuasion: —
- beat: 신뢰 형성
- blueprint: 채널 워드마크(공통)
- focal: 채널 워드마크
- roles: 채널명 = foreground subject · 소개 문장 = supporting
- sfx: 없음(차분한 브랜딩 톤)

**한눈에 보이는 장면**: 화면 중앙에 채널 이름만 조용히 나타난다. "쉬운영어" 네 글자 뒤에
형광펜으로 쓱 칠한 듯한 머스터드색 띠가 깔려 있다.

**레이아웃·배치·컬러·모션**:
- Zone: 배경·progress-rail 유지, 중앙에 채널 워드마크 하나만.
- 배치: 워드마크는 화면 정중앙, 소개 문장은 워드마크 바로 아래 캡션 라인(`{typography.body}`).
- 컬러: "이해하면"은 `{colors.ink}`(진한 잉크색), "쉬운영어"도 글자 자체는 `{colors.ink}`이되
  뒤에 `{colors.accent-rule}` 형광펜 하이라이트 띠가 깔린다(**⚠️ 배경이 밝아졌으니 EP11~15
  방식대로 글자 자체를 노랑으로 칠하면 크림 배경 위에서 대비가 약해 안 보인다** — 대신
  썸네일 타이포 규칙에서 이미 검증된 "어두운 글자 + 밝은 칩 배경" 방식을 재사용).
- 모션: Frame 1의 `hesitation-cursor`가 fade-out(`opacity 1→0, duration 0.3`)되며 동시에
  워드마크가 `opacity 0→1, scale 0.96→1, duration 0.5, ease power2.out`으로 페이드인, 하이라이트
  띠는 왼쪽에서 오른쪽으로 쓱 칠해지듯(`scaleX 0→1, transform-origin left, duration 0.35`)
  뒤늦게 등장.

narrativeRole: 짧고 밝게 채널 정체성만 확인시키고 바로 본론(Big Question)으로 넘어갈 준비를
한다.
keyMessage: 오늘 다룰 범위는 "모음 두 개가 붙었을 때의 읽기 기준"이다.

Scene 1 (0.0–15.0s): 커서 걷힘 → 워드마크 노출 → 소개 문장 전체 재생, 단일 비트.

## Frame 3 — 질문 던지기 (Big Question)

- scene: BOAT 단어가 화면 중앙에 확대되고, O와 A 글자 위에 각각 물음표가 번갈아 반짝이는
  모션(question-flicker, 정답 암시 없이 중립색).
- voiceover: "BOAT, 이 단어를 보면 모음이 O랑 A, 이렇게 두 개가 붙어 있습니다. 이 둘 중에 어떤 걸 소리를 내야 할까요? O만 내야 할까요, 아님 A만 내야 할까요, 그것도 아니면 둘 다 내야 할까요?"
- duration: 15.0s (추정)
- transition_in: cut
- status: outline
- src: compositions/frames/03-question.html
- type: hook
- persuasion: Rhetorical question
- beat: 호기심 → 긴장
- blueprint: question-flicker (frame.md, EP16 신규)
- focal: O와 A 위에서 물음표가 번갈아 반짝이는 순간
- roles: BOAT 확대 = foreground subject · O/A 물음표 = focal thread
- sfx: 없음

**한눈에 보이는 장면**: 크림 배경 한가운데 BOAT라는 글자만 크게 떠 있고, O와 A 위에 손으로
낙서하듯 그린 작은 물음표가 번갈아 깜빡인다. 여전히 색은 무채색.

**레이아웃·배치·컬러·모션**:
- Zone: 화면 중앙 단일 `hero-word`(BOAT), 그 위 소형 캡션 영역에 세 선택지 텍스트가 순차 표시.
- 배치: BOAT를 `{typography.hero-word}`로 화면 중앙 확대, O·A 두 글자 바로 위에
  `question-flicker` 손그림 물음표(각 글자 폭의 40% 크기) 배치.
- 컬러: BOAT 전체 `{colors.ink}`, 물음표 낙서도 중립 `{colors.text-muted}` — 여전히 정답 색
  없음(규칙/예외 어느 쪽도 아직 안 씀).
- 모션: BOAT 등장(`opacity 0→1, scale 0.9→1, duration 0.4`) 후 "이 둘 중에 어떤 걸..." 구간에서
  O 위 물음표가 먼저 반짝(`opacity 0↔1, duration 0.3`), 이어서 A 위 물음표가 교대로 반짝 —
  "O만/A만/둘 다"가 언급될 때마다 해당 글자가 짧게 확대(`scale 1→1.08→1, duration 0.25`)되는
  마이크로 인터랙션으로 세 선택지를 카운트.

narrativeRole: "둘 중 뭘 읽어야 하는가"라는 구체적 미스터리를 세우고, 세 가지 선택지(O만/A만/
둘 다)를 명시적으로 나열해 다음 프레임의 반전이 더 선명하게 착지하도록 준비한다.
keyMessage: 모음 두 개 중 어느 쪽을 소리 내야 하는지 궁금증을 구체적으로 세운다.

Scene 1 (0.0–6.0s): "BOAT, 이 단어를 보면… 붙어 있습니다" — BOAT 확대, O/A 강조 없이 표시.
Scene 2 (6.0–15.0s): "이 둘 중에 어떤 걸… 둘 다 내야 할까요?" — question-flicker 시작, 세
선택지가 언급될 때마다 짧게 시각적으로 카운트.

## Frame 4 — 반전 공개 (Head Fake)

- scene: 어두운 톤에서 밝은 톤으로 전환되며 BOAT의 O는 밝게 강조, A는 옅게 사라지듯 처리.
  "앞 모음만, 소리 냅니다" 문구가 중앙에 부드럽게 떠오름.
- voiceover: "결론부터 말씀드릴게요. 모음 두 개가 나란히 있으면, 둘 다 읽는 게 아니라 앞에 있는 모음 이름만 소리 내고, 뒤에 있는 모음은 그냥 무음으로 소리를 내지 않습니다. BOAT는 O 이름 그대로 '오'라고만 읽고, A는 소리를 안 내는 거예요. 저도 공부하기 전엔 모음 2개를 다 읽는 줄 알았습니다. 그러다 막상 실제 발음을 들어보면 제가 생각했던 거랑 다르니까, '아... 왜 이렇지' 하고 그냥 넘기기만 했죠. 근데 공부를 하다 보니, 앞 글자 하나만 신경 쓰면 된다는 걸 알게 됐어요."
- duration: 20.0s (추정)
- transition_in: cut
- status: outline
- src: compositions/frames/04-headfake.html
- type: reveal
- persuasion: Reversal + personal anecdote
- beat: 반전 착지
- blueprint: lazy-tongue-reveal (frame.md, EP16 신규)
- focal: "앞 모음만, 소리 냅니다" 문구 정착
- roles: BOAT O/A 강조 대비 = foreground subject · personal anecdote = supporting
- sfx: soft-chime on 반전 착지

**한눈에 보이는 장면**: 화면 왼쪽엔 입을 옆에서 자른 손그림(혀가 앞쪽에서 힘주다가 뒤쪽은
편히 눕는 모습)이 등장하고, 오른쪽엔 BOAT의 O가 형광펜처럼 노랗게 칠해지고 A는 흐려지며 그
위에 작은 "Zzz" 낙서가 뜬다. 이 편에서 손그림이 처음 등장하는 순간.

**레이아웃·배치·컬러·모션**:
- Zone: 화면을 좌우로 나눠, 왼쪽 40%는 `illustration-slot`(입/혀 단면 손그림), 오른쪽 60%는
  BOAT `hero-word` + "앞 모음만, 소리 냅니다" 문구, 그 아래 personal anecdote 캡션.
- 배치: O는 그대로 중앙 위치 유지, A는 자리는 유지한 채 스타일만 변화(레이아웃 시프트 없음 —
  글자가 사라지듯 opacity/blur만 바뀌어야 "그 자리에서 조용해진다"는 느낌이 남).
- 컬러: O → `{colors.accent-rule}`(형광펜 하이라이트)로 전환, A → `{colors.text-muted}` +
  `opacity:{colors.dormant-opacity}` + 옆에 Zzz 낙서. "앞 모음만, 소리 냅니다" 문구는
  `{colors.ink}`. 손그림도 잉크색 선 + 앞쪽(힘주는 부분)만 `{colors.accent-rule}`로 살짝
  칠함(카드 쪽 색 논리와 통일).
- 모션: 배경은 시종일관 `{colors.bg}` 고정(밝기 전환 없음 — 종이는 조명이 안 바뀜). 손그림이
  먼저 `opacity 0→1, x:-20→0, duration 0.5`로 슥 들어오고, 그 다음 O가 `scale 1→1.15→1 pulse
  + color 전환(duration 0.5, ease power2.out)`, 동시에 A가 `opacity 1→{dormant-opacity},
  duration 0.5` + Zzz 낙서 페이드인. 문구는 0.3초 뒤 딜레이로 `opacity 0→1, y:10→0` 페이드인해
  홀드.

**필요 일러스트 프롬프트** (이 자산은 Frame 4에서 처음 쓰이고, Frame 5·10·12에서 그대로
재등장 — 같은 "혀 역학" 내용을 다루는 장면들이라 자연히 겹치는 것뿐, 재사용을 노리고 미리
설계한 게 아님):

- **저장 위치**: `videos/ep16-double-vowels/assets/illustrations/tongue-mouth-diagram.png`
  (배경은 **투명이 아니라 화면 배경색 `{colors.bg}`(#F4EFE6)과 동일한 단색으로 꽉 채워서** 제작 —
  ⚠️ 2026-09-16 수정: 원래 "투명 배경"으로 요청했으나 실제 생성 결과를 픽셀 단위로 확인해보니
  알파 채널 값이 전부 255(완전 불투명)였고 배경이 흰색/회백색으로 칠해져 있었음. 생성 도구가
  진짜 투명 PNG를 만들지 못하는 문제를 프롬프트 단계에서 피하기 위해, 처음부터 화면과 같은
  크림색을 단색으로 채워 달라고 명시)
- **🇰🇷 한글 요약**: 입을 옆에서 자른 단면도. 손그림 느낌의 검은 잉크 선(필압이 살짝
  불균일한, 진짜 펜으로 그린 듯한 느낌), 색은 안 칠하고 순수 라인 아트로. 혀가 입 안에
  그려져 있는데, **앞쪽(치아/입술 쪽)과 뒤쪽(목 쪽)이 자연스럽게 구분되는 형태**로 그려서,
  나중에 CSS로 앞쪽만 색칠하고 뒤쪽만 흐리게 처리할 수 있게 해야 함. 너무 의학 교과서처럼
  정밀하지 않고, 친근하고 단순한 느낌으로. 글자·라벨 없음, **배경은 투명이 아니라 화면
  배경색과 똑같은 크림색(#F4EFE6) 단색으로 캔버스 전체를 채울 것**(흰색·회색·그라디언트·
  그림자 없이).
- **영문 프롬프트**:
  ```
  A simple, friendly hand-drawn side-profile cross-section illustration of a human mouth
  and tongue, sketchnote style. Bold, slightly uneven black ink outlines (varying line
  weight like a real pen stroke, not perfectly uniform ruler-straight lines). The tongue
  is drawn as one continuous shape but with a clear natural division between a front
  section (near the teeth and lips) and a back section (toward the throat), so each half
  can be colored independently afterward. Pure black ink line art, no color fill, no
  shading. The background must be a solid, flat, opaque cream color — exact hex #F4EFE6 —
  filling the entire canvas edge to edge with no gradient, no vignette, no drop shadow,
  and no transparency (do not use an alpha channel; render the background as a real
  painted color, not "no background"). Minimal and approachable, not clinical or overly
  anatomical — think classroom whiteboard sketch, not a medical textbook diagram. No
  text, no labels, no arrows. Square-ish composition with generous padding around the
  subject.
  ```
- **시도 기록**:
  - ✅ 2026-09-16 (1차) 사용자가 직접 제작해 `assets/illustrations/tongue-mouth-diagram.png`에
    추가 완료 — 입을 옆에서 연 단면, 손그림 선 스타일 확인. **⚠️ 빌드 시 참고**: 이 PNG는
    앞/뒤 혀 영역이 SVG처럼 분리된 경로가 아니라 한 장짜리 평면 이미지라서, "앞쪽만 색이
    들어오고 뒤쪽은 흐려지는" 효과는 이미지 자체를 재작업하지 않고 **이미지 위에 CSS
    clip-path로 대략적인 좌표 영역을 잡아 반투명 색 오버레이를 씌우는 방식**으로 구현한다 —
    정확한 좌표는 실제 컴포지션 HTML을 만들 때 화면에 띄워보면서 잡을 것(지금 단계에서 추측
    좌표를 박아두지 않는다).
  - ⚠️ 2026-09-16 (재작업 필요) `hyperframes` Studio 프리뷰에서 확인해보니 배경이 투명하지
    않고 흰색/회백색 사각형으로 도드라져 보임 — 파이썬으로 알파 채널을 직접 재보니 전
    픽셀이 alpha=255(완전 불투명)였고 모서리 색은 (255,255,255)~(205,207,206) 근방. 위
    프롬프트를 "배경 투명" → "화면 배경색과 동일한 크림색(#F4EFE6) 단색"으로 수정했으니,
    이 프롬프트로 재생성해서 같은 파일 경로에 덮어씌울 것.
  - ✅ 2026-09-16 (2차, 최종) 새 프롬프트로도 도구가 여전히 흰 배경을 뱉어내서, 사용자가
    직접 배경을 크림색으로 채운 최종본을 만들어 덮어씀 — 확인 결과 배경이 정확히 크림색
    근방(픽셀 실측 (237~245, 233~239, 222~230))으로 맞아떨어짐. **일반화된 교훈**은
    `knowledge/google-ai-studio-prompting.md`의 "손그림 일러스트 프롬프트의 배경·사이즈
    지침"에 기록해 다음 편부터 프롬프트 작성 단계에서부터 반영한다.

narrativeRole: Frame 3에서 던진 세 선택지 중 정답("앞 모음만")을 확신 있게 공개하고, 곧바로
사용자가 직접 재구성한 3단계 personal anecdote(예전엔 둘 다 읽는 줄 알았다 → 실제 발음이
예상과 달라 의문만 품고 넘겼다 → 공부하며 앞 글자만 신경 쓰면 된다는 걸 알게 됐다)로 동반자
톤을 확립한다.
keyMessage: 모음 두 개 중 앞은 이름 그대로 소리 내고, 뒤는 무음이다.

Scene 1 (0.0–8.0s): "결론부터 말씀드릴게요… A는 소리를 안 내는 거예요" — BOAT의 O 강조/A
페이드, 문구 정착(홀드 포인트).
Scene 2 (8.0–20.0s): "저도 공부하기 전엔… 알게 됐어요" — personal anecdote, 화면은 차분하게
유지(텍스트 요소 최소화, 목소리에 집중).

## Frame 5 — 원리 설명 (메커니즘)

- scene: COAT 카드 등장, O 글자에 강조색 라벨과 밝은 하이라이트("소리 냄" 표시), A 글자는
  반투명 처리 + 작은 Zzz 아이콘으로 "쉬는 중" 시각화.
- voiceover: "원리는 간단해요. 모음 두 개가 붙으면, 혀 입장에서는 두 개를 다 다른 소리로 내는 것보다 앞 모음은 자기 이름 그대로 시원하게 말하고, 뒤에 있는 모음은 그냥 쉬는 게 훨씬 편하거든요. 그래서 뒤 모음은 소리를 안 내는 거예요. COAT도 마찬가지예요. O랑 A가 붙어 있는데, O는 자기 이름 그대로 '오'라고 소리 내고, A는 조용히 쉬어요. 그래서 '코트'라고 읽는 거죠 — 사실 여러분 이미 이 단어, 알고 계셨잖아요."
- duration: 24.0s (추정)
- transition_in: crossfade
- status: outline
- src: compositions/frames/05-mechanism.html
- type: reveal
- persuasion: Visual demonstration + familiar-loanword catharsis
- beat: 발견의 "아하" — 이 영상의 클라이맥스
- blueprint: vowel-pair-card + lazy-tongue-reveal (frame.md, EP16 신규)
- focal: COAT의 O가 밝아지고 A에 Zzz 아이콘이 뜨는 순간
- roles: COAT vowel-pair-card = foreground subject · "게으른 혀" 비유 = supporting
- sfx: pron-caption 조립 완료 시 soft chime

**한눈에 보이는 장면**: Frame 4의 입/혀 손그림이 왼쪽에 계속 남아있고, 오른쪽에 흰 카드 하나가
톡 놓인다(종이를 책상에 내려놓는 느낌). 카드 안엔 COAT라는 글자, O는 노랗게, A는 흐리게+Zzz.
카드 아래 "코트"라는 한글 발음이 한 글자씩 조립되며 완성된다.

**레이아웃·배치·컬러·모션**:
- Zone: 왼쪽 40%는 Frame 4의 입/혀 손그림이 계속 유지(장면이 이어지는 느낌), 오른쪽 60%에
  `sketch-card`(`{radii.card-lg}`, `{colors.card-bg}` 배경 + `3px solid {colors.ink}`), 카드
  안에 hero-word 축소판(COAT) + 바로 아래 `pron-caption`("코트").
- 배치: 카드는 오른쪽 영역 중앙, 고정폭(약 32cqw), 드롭섀도우로 종이가 살짝 떠 있는 느낌
  (`0 4px 0 {colors.ink}`). O 글자 위엔 작은 "소리 냄" `sound-tag` 라벨, A 글자 위엔 Zzz
  낙서(글자 폭의 30% 크기, 우측 상단에 살짝 겹쳐 배치).
- 컬러: O = `{colors.accent-rule}` 형광펜 하이라이트, A = `{colors.text-muted}` +
  `opacity:{colors.dormant-opacity}`. 카드 테두리는 아직 규칙/예외 그룹 색을 정하지 않은
  중립 `{colors.ink}`(다음 프레임부터 그룹 색이 테두리에도 반영됨).
- 모션: 원리 설명 문장이 나오는 동안(0~10s)은 손그림만 있고 카드는 없음. "COAT도 마찬가지예요"
  부터 카드가 `opacity 0→1, y:20→0, duration 0.5, ease power2.out`으로 톡 놓이듯 등장, O가
  먼저 `scale 1→1.12→1 + 형광펜 칠해지는 듯한 하이라이트(duration 0.4)`, 0.2초 뒤 A가
  `opacity 1→0.35 fade + Zzz 낙서 opacity 0→1(duration 0.4)`. pron-caption은 두 모션이 끝난
  뒤 글자 단위로 조립(`{typography.pron-sub}`, syllable-buildup 스타일) — 이 프레임의 홀드
  포인트.

**참고**: `SCRIPT.md` Line 5 각주 — "혀가 편한 쪽을 택한다"는 설명은 채널 도파민 3단계 공식
①"게으른 혀의 소리 지름길" 컨셉을 재사용(EP14 연음에서도 동일 프레임). 음성학 용어 없이 감각적
비유로 순화.

narrativeRole: 이 영상이 파는 단 하나의 원리("앞은 소리, 뒤는 쉼")의 이유를 "혀가 편한 쪽을
택한다"는 감각적 비유로 설명하고, COAT라는 이미 아는 외래어로 "여러분은 이미 알고 있었다"는
카타르시스를 준다.
keyMessage: 혀 입장에서 앞 모음은 이름 그대로 말하고 뒤 모음은 쉬는 게 더 편해서 이렇게 읽힌다.

Scene 1 (0.0–10.0s): "원리는 간단해요… 소리를 안 내는 거예요" — 빈 화면에 원리 문구만 추상적
소개.
Scene 2 (10.0–24.0s): "COAT도 마찬가지예요… 알고 계셨잖아요" — COAT vowel-pair-card 등장, O
강조·A 반투명+Zzz, "코트" 조립(이 프레임의 홀드 포인트).

## Frame 6 — 패턴 확장

- scene: vowel-pair-card 6장(RAIN·MEAT·PAINT·TOAST·TEAM·PIE)이 순차 등장, 각 카드마다 앞
  모음 강조/뒤 모음 반투명+Zzz — vowel-pair-cluster 레이아웃에 네온 테두리 강조(채널 기본
  적용 요소).
- voiceover: "우리가 이미 자주 쓰고 있는 단어로 이 규칙이 어떻게 통하는지 한 번 볼까요. 아까 봤던 RAIN, A 이름 그대로 '레인'이고요. MEAT도 E 이름 그대로 '미트'예요. PAINT도 마찬가지로 '페인트', TOAST도 '토스트'죠 — 그리고 다른 단어들도 한 번 더 보시죠. TEAM도 E 이름 그대로 '팀'이고, PIE도 I 이름 그대로 '파이'예요. 이렇게 앞 모음 이름만 기억하면, 이 규칙을 사용해 새 단어를 봐도 망설이지 않고 바로 읽으실 수 있을 거예요."
- duration: 38.0s (추정)
- transition_in: crossfade
- status: outline
- src: compositions/frames/06-pattern.html
- type: proof
- persuasion: Repeated pattern demonstration
- beat: 패턴 확장 카타르시스("이것도 되네?")
- blueprint: vowel-pair-cluster (frame.md, EP16 신규, 6장)
- focal: RAIN·MEAT가 Frame 1의 "멈칫했던" 그 단어와 동일하다는 콜백 순간
- roles: 6장 카드 = foreground subject(순차) · vowel-pair-cluster 배경 네온 테두리 = chrome
- sfx: 카드 등장마다 soft tick(6회, 볼륨 낮게)

**한눈에 보이는 장면**: 크림 배경 위에 흰 카드 6장이 책상 위에 카드를 늘어놓듯 3×2로 깔린다.
전부 같은 구조(단어+O강조+A흐림) — 그림 없이 순수하게 카드·텍스트만으로 "이만큼 통한다"는
양을 보여주는 장면.

**레이아웃·배치·컬러·모션**:
- Zone: `sketch-cluster` — 화면을 가로 3열×세로 2행 그리드로 나눠 6장의 축소판
  `sketch-card`를 배치(각 카드 `{radii.card-md}`, `{colors.card-bg}`, 얇은 오프셋
  드롭섀도우로 카드가 살짝 겹쳐 쌓인 느낌). gap은 `{spacing.gap-cards}`.
- 배치: 1행(RAIN·MEAT·PAINT), 2행(TOAST·TEAM·PIE) 순서로 왼쪽부터 순차 등장. 각 카드 안
  구조는 Frame 5의 COAT 카드와 동일(hero-word 축소판 + O/A 강조·반투명 + pron-caption). 이
  프레임엔 illustration-slot 없음 — 카드 개수 자체가 "많이 통한다"는 걸 보여주는 역할.
- 컬러: 6장 전부 규칙 그룹 — 앞 모음 `{colors.accent-rule}`, 뒤 모음 `{colors.text-muted}`
  + dormant opacity. 카드 테두리는 전부 공통 `{colors.ink}`(구조 요소는 항상 깔끔한 잉크색
  유지, 그룹 구분은 카드 안 텍스트 색으로만).
- 모션: 카드가 행 단위로 두 번에 나눠 등장(1행 3장 먼저, 2행 3장 나중) — `opacity 0→1,
  y:16→0, duration 0.35, stagger 0.12, ease power2.out`. 마지막 문장에서 6장 전체가 살짝
  확대되며(`scale 1→1.02→1, duration 0.6`) 정지, cluster 전체를 한눈에 조망시킴.

**참고**: Frame 1(Stakes)에서 봤던 RAIN·MEAT를 여기서 다시 불러와 콜백 카타르시스를 줌.
PAINT·TOAST·TEAM·PIE는 전부 한국어에 이미 정착된 외래어라 Frame 5의 COAT와 같은 "이미 알던
소리" 신뢰도 보강 기법 재사용.

narrativeRole: Frame 5에서 배운 원리가 다른 단어에도 그대로 통한다는 걸 6개 단어로 증명하고,
특히 Frame 1에서 이미 봤던 RAIN·MEAT를 다시 불러와 "그때 그 단어, 별거 아니었죠" 콜백 구조로
카타르시스를 강화한다.
keyMessage: 앞 모음 이름만 기억하면 이 규칙을 사용해 새 단어도 바로 읽을 수 있다.

Scene 1 (0.0–13.0s): "우리가 이미 자주 쓰고 있는… 페인트', TOAST도 '토스트'죠" — RAIN·MEAT·
PAINT·TOAST vowel-pair-card 순차 등장.
Scene 2 (13.0–26.0s): "그리고 다른 단어들도… '파이'예요" — TEAM·PIE 추가 등장.
Scene 3 (26.0–38.0s): "이렇게 앞 모음 이름만 기억하면… 바로 읽으실 수 있을 거예요" — 6장
전체 정지, cluster 전체 조망.

## Frame 7 — 반전 꿀팁 (예외)

- scene: HEAD·BREAD·DEAD 카드 등장, EA 부분을 분리하지 않고 전체를 {colors.accent-exception}
  (빨강)으로 통일 강조해 "이건 다른 소리"라는 걸 시각적으로 구분. 규칙이 통했던 카드들(RAIN·
  MEAT 등)이 화면 한쪽에 흐리게 남아 "대부분은 통한다"는 비율감을 함께 전달.
- voiceover: "딱 하나만 알아두실 게 있습니다. 오늘 배운 규칙, 대부분 잘 통하는데 EA만큼은 가끔 다르게 읽힐 때가 있어요. HEAD는 E랑 A가 붙어 있지만 '히드'가 아니라 '헤드'라고 읽고, BREAD도 '브레드', DEAD도 '데드'예요. 이런 단어는 그때그때 소리 내면서 익숙해지는 수밖에 없어요 — 오늘 배운 규칙이 대부분의 단어를 뚫어주는 시작점이지, 예외 없는 절대 규칙은 아니라는 것만 기억해두시면 됩니다."
- duration: 20.0s (추정)
- transition_in: cut
- status: outline
- src: compositions/frames/07-exception.html
- type: twist
- persuasion: Honest scoping — no overclaim
- beat: 반전 꿀팁("근데 늘 그런 건 아니네?")
- blueprint: vowel-pair-cluster--exception, EA 통일 강조 (frame.md, EP16 신규, 3장)
- focal: HEAD·BREAD·DEAD의 EA가 규칙 그룹과 다른 색으로 통일 강조되는 순간
- roles: HEAD/BREAD/DEAD vowel-pair-card = foreground subject · 흐린 규칙 카드들 = background
  비율감
- sfx: 카드 등장 시 낮은 경고 톤 soft chime(과장 없이 절제)

**한눈에 보이는 장면**: Frame 6의 카드 6장이 뒤로 물러나 흐려지고, 그 앞으로 HEAD·BREAD·DEAD
3장이 통통 튀어 오르듯 등장한다. 이번엔 카드 안 글자 색이 빨강 — "어, 이건 다르네"가 색만
봐도 느껴짐. 살짝 놀란 느낌표 낙서가 옆에 곁들여질 수 있음.

**레이아웃·배치·컬러·모션**:
- Zone: 전경 중앙에 `sketch-cluster--exception` 3장(HEAD·BREAD·DEAD) 가로 배열, 배경 뒤쪽
  (살짝 축소 + blur)에 Frame 6에서 쓴 규칙 카드 몇 장이 흐리게 남아 있는 2-depth 구성.
- 배치: 3장 카드는 화면 중앙 가로 1열, Frame 5·6과 달리 O/A를 분리하지 않고 EA 두 글자를
  하나의 붙은 하이라이트 블록으로 강조. 카드 한쪽 모서리에 작은 느낌표 낙서(선택 — 있으면
  "어?" 느낌을 더 살려줌).
- 컬러: EA 전체 `{colors.accent-exception}`(빨강)로 통일(분리 강조 없음 — "따로 안 갈리고
  통째로 다른 소리"라는 구조 차이를 색 처리 방식 자체로 표현). 카드 테두리는 여전히
  `{colors.ink}` 유지(구조는 안 바뀜, 안의 텍스트 색만 다름). 배경의 규칙 카드들은
  `opacity 0.25 + blur(4px)`로 비율감만 남김.
- 모션: 규칙 카드들이 먼저 뒤로 물러나며 흐려지고(`scale 1→0.92, opacity 1→0.25, blur 0→4px,
  duration 0.5`), 그 뒤 HEAD·BREAD·DEAD 3장이 **bounce 진입**(`y:-30→0, ease "back.out(1.7)",
  duration 0.45, stagger 0.1` — Frame 5·6의 매끄러운 등장과 의도적으로 다른 모션으로 "이건
  다르다"를 체감시킴).

**⚠️ 웹 검색 언어학적 검증 완료(2026-09-15)** — `SCRIPT.md` Line 7 상단 근거 참고. 이 규칙은
모음쌍마다 신뢰도가 다르다(AI~90%·OA~95%·EE~99%·AY~95% 매우 높음, **EA는 약 70%만** 규칙을
따름 — head·bread·dead·spread·thread·sweat·weather·heavy·breakfast 등 예외). OI/OW/OU/AU는
별개의 이중모음 규칙이라 이번 영상 범위 밖. `BRIEF.md`의 과장 금지 주의사항을 그대로 준수해,
"대부분 통하지만 예외 없는 절대 규칙은 아니다"로 정직하게 스코프를 좁힌다.

narrativeRole: "그럼 이 규칙에 예외는 없을까요?"로 도파민 3단계 공식의 3단계를 열되, 겁주지
않고 "이런 것도 있다" 정도의 가벼운 톤으로 정직하게 스코프를 밝혀 채널 페르소나(가식 없는
솔직 담백함)를 지킨다.
keyMessage: EA는 약 70%만 규칙을 따르고, HEAD·BREAD·DEAD처럼 짧은 '에' 소리로 읽히는 예외가
있다 — 오늘 배운 규칙은 시작점이지 절대 규칙은 아니다.

Scene 1 (0.0–6.0s): "딱 하나만 알아두실 게 있습니다. 오늘 배운 규칙, 대부분 잘 통하는데" — 짧은
전환, 규칙 카드들이 흐리게 배경으로 물러남.
Scene 2 (6.0–14.0s): "EA만큼은… '데드'예요" — HEAD·BREAD·DEAD 카드 등장, EA 전체 빨강 통일
강조.
Scene 3 (14.0–20.0s): "이런 단어는… 기억해두시면 됩니다" — 정지, 규칙/예외 두 그룹 색 대비로
마무리.

## Frame 8 — 미니 퀴즈

- scene: quiz-reveal 3문항 — 화면엔 SEAT·GOAL·SWEAT 철자만 순서대로 표시(나레이션은 영어
  발음을 말하지 않음). SEAT·GOAL은 규칙 그룹 색으로 정답 공개, SWEAT는 Frame 7의 예외색으로
  공개.
- voiceover: "그럼 직접 맞혀보세요. 첫 번째 단어, 어떻게 읽을까요? 잠깐 생각해 보세요. 앞 모음 이름 그대로, '시트'입니다. 두 번째 단어는요? 이것도 앞 모음 이름 그대로, '골'이죠. 마지막 문제, 이번엔 좀 다를 수 있어요. 세 번째 단어는요? 정답은, '스웻'입니다. EA인데, 아까 배운 예외였죠."
- duration: 22.0s (추정)
- transition_in: crossfade
- status: outline
- src: compositions/frames/08-quiz.html
- type: interactive_pause
- persuasion: Self-test engagement
- beat: 참여 유도 → 정답 확인 안도감(3회 반복)
- blueprint: quiz-reveal (frame.md, 채널 공통 골격 + vowel-pair-card)
- focal: SWEAT 정답 공개 순간(EA를 보고 방심하지 않았는지 테스트)
- roles: 질문 문구 = supporting · vowel-pair-card 축소판 정답 = foreground subject
- sfx: 매 정답 공개 시 soft chime(3회, SWEAT만 톤 살짝 다르게)

**한눈에 보이는 장면**: 화면 중앙에 철자만 큰 글씨로 떴다가(SEAT), 잠깐 멈춘 뒤 빨간 펜이 쓱
동그라미를 그리며 카드로 바뀌면서 정답이 드러난다. 3번 반복, 마지막(SWEAT)만 카드 색이 빨강.

**레이아웃·배치·컬러·모션**:
- Zone: 화면 중앙 단일 카드 슬롯 — `quiz-reveal` 골격 그대로(질문 문구 → 정지 → `sketch-card`
  축소판 정답으로 in-place 교체, 3회 반복).
- 배치: 문제 단계엔 철자만 큼직하게(hero-word 축소판) 중앙 표시, 정답 단계엔 같은 자리에서
  sketch-card로 크로스페이드(레이아웃 시프트 없이 같은 슬롯에서 교체), 동시에
  `trim-path-annotation`이 정답 단어 전체를 빨간 펜으로 한 번 동그라미 친다.
- 컬러: SEAT·GOAL 정답 카드는 규칙색(`{colors.accent-rule}`/`{colors.text-muted}`), SWEAT
  정답 카드는 Frame 7과 동일한 `{colors.accent-exception}` 통일 강조. 트림패스 동그라미는
  매번 `{colors.accent-exception}`(정답 표시 = 항상 이 색 하나로 통일).
- 모션: 질문 카드 fade-in → "잠깐 생각해 보세요" 구간 무음 정지(0.6~0.8s) → 정답 카드로
  crossfade(`duration 0.3`) + 트림패스 원이 `stroke-dashoffset` 애니메이션으로 손그림처럼
  그려짐(`duration 0.4`). SWEAT 차례만 전환 전 살짝 무게감 있는 딜레이(0.2s 추가)를 둬서
  "이번엔 다를 수 있다"는 긴장을 시각적으로도 표현.

**⚠️ 정답 누설 방지 원칙 적용(EP15 Frame 8 교훈, `VIDEO_WORKFLOW.md` 3단계 규칙)** — "이 단어를
소리 내어 말하면 그 자체로 정답이 드러나는가?"를 판별해, 문제 단계에서는 "첫/두/세 번째 단어"로만
화면 철자를 가리키고 영어 단어 자체를 소리 내지 않는다. 정답 공개 시에만 한글 발음을 준다.

narrativeRole: Frame 5·6·7에서 배운 규칙을 시청자가 직접 새 단어(SEAT·GOAL·SWEAT, 대본 전체에서
처음 등장)에 적용해보게 해서 "진짜 내 것이 됐는지" 확인한다. 마지막 문항(SWEAT)은 R처럼 눈에
띄는 함정 글자는 없지만, EA를 보고 습관적으로 "규칙대로 읽으면 되겠지"라고 방심하지 않았는지
시험한다.
keyMessage: 배운 원리를 처음 보는 단어에 스스로 적용해봐야 진짜 내 것이 된다 — EA는 특히
방심하지 않는다.

Scene 1 (0.0–7.0s): "그럼 직접 맞혀보세요. 첫 번째 단어, 어떻게 읽을까요? 잠깐 생각해 보세요" —
SEAT 철자 카드, 짧은 정지.
Scene 2 (7.0–10.0s): "앞 모음 이름 그대로, '시트'입니다" — vowel-pair-card 축소판 정답(규칙색).
Scene 3 (10.0–14.0s): "두 번째 단어는요?… '골'이죠" — GOAL 동일 방식 빠르게 반복.
Scene 4 (14.0–18.0s): "마지막 문제, 이번엔 좀 다를 수 있어요. 세 번째 단어는요?" — SWEAT 철자
카드, 살짝 무게감 있는 전환.
Scene 5 (18.0–22.0s): "정답은, '스웻'입니다. EA인데, 아까 배운 예외였죠" — Frame 7 예외색으로
정답 공개.

## Frame 9 — 실제 문장에서 읽기

- scene: sentence-card 4개가 세로로 하나씩 등장, 재생과 동시에 목표 단어만 인라인 하이라이트
  (coat·rain·team=규칙색, head=예외색). 문장 재생 끝나면 한글 발음이 짧게 표시.
- voiceover: "이제 진짜 문장 속에서 확인해 볼까요? 첫 번째. I need a new coat for winter. 두 번째. It might rain tomorrow. 세 번째. We had a team meeting today. 네 번째. My head hurts a little. 어떠세요? 이제 낯선 단어가 나와도, 앞 모음 이름만 떠올리면 자신 있게 읽으실 수 있을 거예요."
- duration: 28.0s (추정)
- transition_in: crossfade
- status: outline
- src: compositions/frames/09-listening.html
- type: proof
- persuasion: Real-sentence application
- beat: 리딩 실전 적용
- blueprint: sentence-card (frame.md, 채널 공통)
- focal: team(규칙)과 head(예외)가 같은 EA인데도 문장 속에서 다르게 읽히는 대비
- roles: sentence-card 4개 = foreground subject · 목표 단어 인라인 색칠 = focal thread
- sfx: 없음(실제 영어 음성 자체가 콘텐츠라 효과음으로 방해하지 않음)

**한눈에 보이는 장면**: 문장 카드 4개가 왼쪽에 세로로 쌓인다. 각 카드 옆에 그 문장 내용을
바로 떠올리게 하는 작은 손그림 아이콘(외투·비구름·사람들·머리)이 붙어 있다. coat·rain·team
글자는 노랗게, head만 빨갛게.

**레이아웃·배치·컬러·모션**:
- Zone: 화면 좌측 정렬 세로 스택(`sentence-card` 4개), 카드 폭은 화면의 약 62cqw, 각 카드
  오른쪽 옆(바깥)에 `illustration-slot` 미니 아이콘(약 6cqw 정사각형)을 하나씩 배치.
- 배치: 각 `sentence-card`는 2줄 구조 — 1줄 영어 문장(`{typography.body}`), 2줄 한글 발음
  (`{typography.pron-sub}`, 문장 재생 종료 후에만 표시). 목표 단어(coat/rain/team/head)만
  문장 안에서 인라인 색 처리. 옆 아이콘은 손그림 외투(coat)·비구름(rain)·사람 여럿(team)·
  머리 옆모습(head) — 4개 다 서로 다른 그림이라 자동으로 재사용이 안 되는 자리.
- 컬러: coat·rain·team = `{colors.accent-rule}`, head = `{colors.accent-exception}` — 카드
  배경·테두리는 4장 전부 중립(`{colors.card-bg}`/`{colors.ink}`), 색 차이는 목표 단어와 옆
  아이콘 한 부분(head 아이콘만 빨간 테두리)에만.
- 모션: 4개 카드가 세로로 하나씩 순차 등장(`opacity 0→1, y:14→0, duration 0.35`)과 동시에
  옆 아이콘이 `x:8→0, opacity 0→1`로 따라 들어옴. 각 카드의 영어 문장 재생이 끝나는 시점에
  한글 발음 라인이 뒤이어 페이드인. 카드 간 전환은 이전 카드를 흐리게(`opacity 1→0.4`)
  남겨두고 다음 카드를 강조해 "지금 몇 번째인지" 시각적으로 유지.

**필요 일러스트 프롬프트**:

- **저장 위치**: `videos/ep16-double-vowels/assets/illustrations/sentence-icons.png`(4개를
  한 세트로 생성한 뒤 각각 잘라서 개별 파일로 저장 — `coat.png`/`rain.png`/`team.png`/
  `head.png`) — 배경은 **투명이 아니라 화면 배경색 `{colors.bg}`(#F4EFE6)과 동일한 단색**으로
  꽉 채워서 제작(⚠️ 2026-09-16 수정, 이유는 tongue-mouth-diagram.png와 동일 — 아래 시도 기록
  참고). 이 스프라이트는 Frame 9에서 카드 옆, 즉 흰 카드 위가 아니라 화면의 크림 배경 위에
  바로 놓이므로 배경색이 카드색(흰색)이 아니라 반드시 화면 배경색과 같아야 함.
- **🇰🇷 한글 요약**: 외투, 비구름, 사람 여럿(팀), 머리 옆모습 — 4개를 2x2 격자로 한 번에
  생성해서 서로 선 스타일이 통일되게 만드는 프롬프트. Frame 4의 입/혀 그림과 같은 손그림
  잉크 라인 스타일을 유지해야 함. 색은 안 칠하고 순수 검은 선으로만, **배경은 투명이 아니라
  화면 배경색과 똑같은 크림색(#F4EFE6) 단색으로 캔버스 전체를 채울 것**(흰색·회색·그라디언트
  없이).
- **영문 프롬프트**:
  ```
  A set of four simple hand-drawn sketchnote-style icons arranged in a clean 2x2 grid
  with even spacing, each centered in its own quadrant: (top-left) a simple winter coat
  hanging on a hook, (top-right) a small rain cloud with a few raindrops falling below
  it, (bottom-left) three simple stick-figure-style people standing together
  representing a team, (bottom-right) a side-profile silhouette of a human head and
  shoulders. All four icons share the exact same visual style: bold, slightly uneven
  black ink outlines like a real pen stroke, no color fill, no shading. The background
  must be a solid, flat, opaque cream color — exact hex #F4EFE6 — filling the entire
  canvas edge to edge behind all four icons, with no gradient, no vignette, no drop
  shadow, and no transparency (do not use an alpha channel; render the background as a
  real painted color, not "no background"). Minimal and friendly, no text, no labels.
  Each icon simple enough to read clearly at a small sticker-like scale.
  ```
- **시도 기록**:
  - ✅ 2026-09-16 (1차) 사용자가 직접 제작해 `assets/illustrations/sentence-icons.png`에
    추가 완료 — 2x2 격자로 외투·비구름·사람들·머리 4개 전부 확인, 선 스타일 통일감 좋음. 4개로
    잘라 개별 파일을 만들 필요 없이, 한 장짜리 스프라이트를 CSS `background-position`으로 각
    분면만 잘라 보여주는 방식으로 컴포지션에서 사용한다(사용자가 직접 자를 필요 없음).
  - ⚠️ 2026-09-16 (재작업 필요) tongue-mouth-diagram.png와 같은 문제 — 배경이 실제로는
    불투명(alpha=255)한 흰색/회백색이었음. 위 프롬프트를 "배경 투명" → "화면 배경색과
    동일한 크림색(#F4EFE6) 단색"으로 수정했으니, 이 프롬프트로 재생성해서 같은 파일
    경로에 덮어씌울 것.
  - ✅ 2026-09-16 (2차, 최종) 사용자가 배경을 크림색으로 직접 채운 최종본으로 교체 완료.
    **⚠️ 빌드 시 참고**: 이 과정에서 파일이 2816×1536(직사각형) → 2048×2048(정사각형)로
    바뀌면서 **2x2 격자 안 아이콘 순서도 바뀌었다** — 새 배치는 좌상단=team(사람들),
    우상단=rain(비구름), 좌하단=head(머리), 우하단=coat(외투)(원래는 좌상단=coat였음).
    `09-listening.html`의 `.f09-icon` 4개 `background-position` 값을 이 새 순서에 맞게
    다시 매핑함(coat/team은 100%/0% 값이 서로 바뀌고, head/team도 마찬가지) — 스프라이트를
    다시 교체할 때마다 실제 격자 배치를 눈으로 확인하고 이 값들을 다시 맞출 것.

**⚠️ EP11~15와 동일한 이유로 이 프레임만 단일 TTS 호출이 아니다.** 영어 문장 4개는 진짜 영어
텍스트를 같은 보이스 엔진에 보내 원어민 발음으로 따로 생성한 뒤 `ffmpeg concat`으로 이어붙인다.
한국어 조각(오프닝+서수+마무리 확인 문장)은 이 씬의 남성 보이스 그대로, 영어 문장 4개만 순수
영어 텍스트로 생성.

**⚠️ 근거**: `SCRIPT.md` Line 9 각주 — 네 문장에 규칙이 통하는 단어(coat·rain·team)와 Frame 7의
예외(head)를 섞어, EA가 단어마다 다르게 읽힐 수 있다는 걸(team=규칙대로, head=예외) 실제
문장에서도 다시 확인시킨다.

narrativeRole: 단어 카드가 아니라 진짜 문장 속에서 원리를 시험해서, 규칙이 고립된 단어 암기가
아니라 실제 읽기에 그대로 적용된다는 걸 체감시키고, team/head 대비로 Frame 7의 교훈을 다시
각인시킨다.
keyMessage: 오늘 배운 규칙과 예외는 실제 문장 속에서도 똑같이 적용된다.

Scene 1 (0.0–3.0s): "이제 진짜 문장 속에서 확인해 볼까요?" 인트로.
Scene 2 (3.0–22.0s): "첫 번째… 네 번째…" — sentence-card 4개가 하나씩 등장, coat·rain·team은
규칙색, head는 예외색 인라인 하이라이트.
Scene 3 (22.0–28.0s): "어떠세요? 이제 낯선 단어가 나와도… 읽으실 수 있을 거예요" — 전체 정지.

## Frame 10 — 소리 내어 읽기 연습

- scene: vowel-pair-card 3장(BOAT·MEAT·HEAD)이 lazy-tongue-reveal 모션으로 등장, 매 단어 2회
  조립(느리게→빠르게). BOAT·MEAT는 규칙색, HEAD는 예외색.
- voiceover: "자, 이제 직접 소리 내서 읽어보세요. 따라 읽다 보면 저절로 자신감이 붙으실 거예요. BOAT, 천천히. 보, 트 — 이어서, 보트! 다시 한 번, 좀 더 빠르게. 보트, 보트. 이번엔 MEAT예요. 미, 트 — 이어서, 미트! 다시 한 번, 좀 더 빠르게. 미트, 미트. 마지막으로 예외였던 단어도 같이 볼까요. HEAD예요. 헤, 드 — 이어서, 헤드! 다시 한 번, 좀 더 빠르게. 헤드, 헤드."
- duration: 40.0s (추정)
- transition_in: cut
- status: outline
- src: compositions/frames/10-practice.html
- type: cta_practice
- persuasion: Direct instruction + encouragement
- beat: 신체 참여 유도(복습·자신감 굳히기)
- blueprint: lazy-tongue-reveal (frame.md, EP16 신규, Frame 5 모션 재사용)
- focal: 각 단어 조립 후 2회 반복, 마지막 HEAD에서 "여기서는 다르게"
- roles: 프롬프트 문장 = supporting · vowel-pair-card 조립 = foreground subject
- sfx: 각 조립 완료 시 soft pulse tick(HEAD만 톤 살짝 다르게)

**한눈에 보이는 장면**: Frame 4·5에서 봤던 입/혀 손그림이 다시 등장해서, BOAT·MEAT·HEAD를
차례로 소리 내는 걸 보여준다. 같은 그림을 다시 쓰는 건 "재사용 전략"이 아니라 이 장면도
똑같이 "혀가 어떻게 움직이는가"를 다루니까 자연히 같은 그림이 맞는 것뿐.

**레이아웃·배치·컬러·모션**:
- Zone: 화면 중앙 `illustration-slot`(Frame 4·5의 입/혀 손그림 재등장) + 그 옆 `sketch-card`
  슬롯 하나, 상단에 프롬프트 캡션("천천히"/"다시 한 번, 좀 더 빠르게" 등)이 작게 표시.
- 배치: 한 단어씩 화면 중앙에서 음절 단위로 분해 표시(예: "보, 트" 두 음절이 갈라져 보였다가
  합쳐짐), 조립 완료 시 전체 단어가 하나로 붙어 확대. 손그림 속 혀가 음절에 맞춰 살짝 움직임
  (앞소리=혀가 앞으로, 침묵=혀가 편히 누움).
- 컬러: BOAT·MEAT = 규칙색(`{colors.accent-rule}`), HEAD = `{colors.accent-exception}`
  (마지막 단어에서 색이 바뀌는 것 자체가 "여기서는 다르게" 신호).
- 모션: `lazy-tongue-reveal` 음절 조립 모션을 단어당 2회 반복 — 1회차는 느리게(`duration
  0.8, ease power1.inOut`, 음절 사이 0.3s 간격), 2회차는 빠르게(`duration 0.35`, 음절
  동시 조립). 세 단어 사이는 crossfade(`duration 0.3`)로 전환, 카드·그림 위치는 고정해 시선
  이동을 최소화.

narrativeRole: 이미 배운 세 단어(BOAT·MEAT·HEAD — 전부 정답을 확인한 단어들)를 입으로 직접
내뱉게 해서 채널의 "반복 낭독" 시그니처를 실현하고, 규칙/예외 두 유형을 몸으로 복습시킨다. 새
단어 테스트는 Frame 8(퀴즈)과 Frame 11(페이오프)이 전담하므로, 이 프레임은 의도적으로 전부
복습 단어로만 구성해 "자신감 굳히기"에 집중한다(EP15와 동일한 역할 분담).
keyMessage: 소리 내서 말해봐야 입이 기억한다 — 규칙 유형과 예외 유형 모두.

Scene 1 (0.0–13.0s): "자, 이제 직접 소리 내서 읽어보세요… 보트, 보트" — BOAT lazy-tongue-reveal
(규칙색) → 2회 반복.
Scene 2 (13.0–26.0s): "이번엔 MEAT예요… 미트, 미트" — MEAT lazy-tongue-reveal(규칙색) → 2회
반복.
Scene 3 (26.0–40.0s): "마지막으로 예외였던 단어도… 헤드, 헤드" — HEAD lazy-tongue-reveal
(예외색) → 2회 반복.

## Frame 11 — 실전 재확인 (페이오프)

- scene: GRAIN이 Frame 1처럼 흐릿하게 등장했다가(hesitation-cursor 역방향), 앞 모음 A 라벨이
  강조되며 또렷하게 '그레인'으로 밝아지는 모션(홀드). 이어서 FOAM·REACH가 같은 모션을 더 빠른
  속도로 반복(몽타주). Frame 1의 머뭇거리던 커서가 이번엔 망설임 없이 선명하게 읽히는 대칭
  구조로 마무리.
- voiceover: "이제 정말 이 규칙 하나로, 처음 보는 단어도 바로 읽으실 수 있어요. 예를 들어 이 단어, 오늘 처음 보셨죠? 그래도 한번 볼까요. 앞 모음 이름 그대로, 정답은 '그레인'입니다. 하나 더 볼까요. 이것도 앞 모음 이름 그대로, '포움'이에요. 하나만 더요. 이번에도 똑같이, '리치'죠. 어떠세요, 낯선 단어들인데도 계속 바로 읽히시죠? 여태 이걸 다 읽어야 하는지, 하나만 읽어야 하는지, 그런 기준이 있는지조차 몰랐던 게, 사실 이 기준 하나만 알면 끝나는 일이었던 거예요."
- duration: 30.0s (추정)
- transition_in: crossfade
- status: outline
- src: compositions/frames/11-payoff.html
- type: benefit_highlight
- persuasion: Real-time generalization proof (montage)
- beat: 발견의 즐거움 재확인(Frame 1의 Stakes 회수)
- blueprint: hesitation-cursor→해소 ×3, 뒤로 갈수록 가속 (frame.md, EP16 신규)
- focal: GRAIN이 처음 보는 단어인데도 즉시 풀리는 순간 → FOAM·REACH 몽타주 가속
- roles: GRAIN vowel-pair-card = foreground subject(홀드) · FOAM/REACH vowel-pair-card =
  foreground subject(가속, 교대) · Frame 1 회수 = callback
- sfx: GRAIN 해소 시 soft chime(홀드감 있게), FOAM·REACH는 더 빠른 double-tick

**한눈에 보이는 장면**: Frame 1과 똑같은 자리에, 이번엔 GRAIN이라는 새 단어가 흐릿하게 나왔다가
또렷해진다(Frame 1의 "머뭇거림"과 정확히 대칭). 이어서 FOAM·REACH가 점점 빠르게 같은 자리에서
휙휙 바뀐다 — 배경은 시종일관 크림색 그대로, 카드도 없이 순수하게 글자만으로 승부.

**레이아웃·배치·컬러·모션**:
- Zone: 화면 중앙 단일 슬롯, Frame 1과 동일한 자리(대칭 회수를 위해 위치를 의도적으로
  맞춘다) — GRAIN이 먼저 자세히, 이후 FOAM·REACH가 같은 자리에서 교체. 카드 틀 없이 Frame 1과
  똑같이 배경 위에 텍스트만(대칭을 시각적으로도 강하게 느끼게).
- 배치: GRAIN은 hero-word 크기로 화면 중앙, 해소 후 pron-caption("그레인")이 아래 조립.
  FOAM·REACH는 같은 레이아웃을 재사용하되 애니메이션 속도만 가속.
- 컬러: 3단어 전부 규칙 그룹(`{colors.accent-rule}`/`{colors.text-muted}`) — 이 프레임은
  "규칙이 통한다"는 걸 증명하는 자리라 예외색을 쓰지 않는다.
- 모션: GRAIN이 Frame 1의 `hesitation-cursor`처럼 흐릿하게(`blur(6px), opacity 0.5`)
  등장했다가, 앞 모음 A가 형광펜으로 칠해지듯 강조되며 `blur 6px→0, opacity 0.5→1, duration
  0.6, ease power2.out`으로 해소(홀드 포인트, 0.5s 유지). FOAM은 같은 모션을 `duration
  0.35`로, REACH는 `duration 0.25`로 더 가속 — 몽타주 리듬을 만든다.

**⚠️ 정답 누설 방지 원칙 재적용(EP15 Frame 11 교훈)** — 새 단어 3개(GRAIN·FOAM·REACH)를 영어로
먼저 소리 내지 않고 "이 단어"로만 지칭, 정답 공개 문장에서만 한글 발음을 준다.

**⚠️ 근거**: `SCRIPT.md` Line 11 코멘트 — 처음엔 MAIL·ROAD·PEACH를 썼으나 사용자 지적("메일은
너무 흔한 단어 아님, 로드도 그렇고")으로 GRAIN·FOAM·REACH로 교체. MAIL·ROAD는 이미 한국어에
정착된 외래어라 "오늘 처음 보는 단어"라는 이 프레임의 설정 자체가 안 먹혔음 — 검증된 신뢰도
높은 모음쌍(AI·OA·EA)을 따르되 일상 외래어로 굳어지지 않은 단어로 교체해 "진짜 낯선 단어"
설정을 유지.

narrativeRole: Frame 1에서 던진 "기준을 몰라서 멈칫했던" 경험을 여기서 직접 회수하되, GRAIN
하나가 아니라 FOAM·REACH까지 연달아 통하는 걸 보여줘서 "정말 아무 단어에나 통한다"는 증거를
하나가 아니라 세 번 겹쳐 제시한다. 마지막 문장은 Frame 1의 실제 문장을 그대로 재사용하는
콜백으로, 대칭 구조를 말바꿈 없이 정확하게 만든다(2026-09-15 사용자 지적 반영).
keyMessage: 이 규칙 하나로 처음 보는 단어도 계속 바로 읽힌다 — 여태 몰랐던 기준이 이제 끝났다.

Scene 1 (0.0–8.0s): "이제 정말 이 규칙 하나로… 이 단어 오늘 처음 보셨죠?" — GRAIN
hesitation-cursor 역방향 시작(흐릿하게).
Scene 2 (8.0–16.0s): "그래도 한번 볼까요. 앞 모음 이름 그대로, 정답은 '그레인'입니다" — A에
강조 라벨, 완전히 선명하게 해소(홀드 포인트).
Scene 3 (16.0–22.0s): "하나 더 볼까요. FOAM… '포움'이에요" — 같은 모션 더 빠르게.
Scene 4 (22.0–26.0s): "하나만 더요. REACH… '리치'죠" — 같은 모션 한층 더 빠르게, 몽타주 절정.
Scene 5 (26.0–30.0s): "어떠세요, 낯선 단어들인데도… 끝나는 일이었던 거예요" — 세 단어 카드
나란히 정착, Frame 1의 hesitation-cursor와 대칭으로 완전히 선명한 상태.

## Frame 12 — 요약 + 마무리

- scene: 오늘 다룬 14개 단어(규칙 그룹 10개: BOAT·RAIN·MEAT·COAT·PAINT·TOAST·TEAM·PIE·SEAT·
  GOAL·GRAIN·FOAM·REACH / 예외 그룹 4개: HEAD·BREAD·DEAD·SWEAT)가 두 그룹 색으로 묶여
  vowel-pair-card로 하나씩 쌓이며 등장해 전부 화면에 함께 남는다. 이후 중앙에 "앞 모음만,
  소리 냅니다" 문구가 떠오름. 특정 다음 소재를 암시하는 시각 요소 없이(단편 방침) 채널 로고로
  페이드아웃.
- voiceover: "오늘은 모음 두 개가 나란히 붙으면, 앞 모음은 이름 그대로 소리 내고 뒤 모음은 무음이 된다는 원리, 그리고 EA는 가끔 다르게 읽히는 예외까지 함께 봤습니다. 이제 모음 두 개가 붙은 낯선 단어를 봐도, 예전처럼 멈칫하지 않고 망설임 없이 바로 읽으실 수 있을 거예요. 다음에도 여러분이 자주 막막해하시는 부분, 또 풀어드릴게요. 저와 같이 하나씩 차근차근 익혀 나가시면, 어느새 훨씬 자신 있게 읽고 계실 거예요."
- duration: 30.0s (추정)
- transition_in: crossfade
- status: outline
- src: compositions/frames/12-summary.html
- type: branding
- persuasion: Recap + warm close, symmetric callback to Frame 1
- beat: 정리 + 따뜻한 다음 기약(특정 예고 없음)
- blueprint: vowel-pair-card 스택(14장) (frame.md, 채널 공통 summary-cards 응용)
- focal: "저와 같이 하나씩 차근차근 익혀 나가시면" — 따뜻하게 닫히는 문장
- roles: 요약 카드 스택 = supporting · 마무리 문장 = foreground subject, 완전히 정착
- sfx: 없음(차분하게 완결)

**한눈에 보이는 장면**: 책상 위에 오늘 쓴 카드 14장이 좌르륵 늘어놓인다(규칙 10장 왼쪽,
예외 4장 오른쪽 — 테두리 색으로 바로 구분됨). 그 위로 오늘의 핵심 문구가 손글씨로 한 번
더 강조되고, 마지막엔 Frame 4·5의 입/혀 그림이 살짝 다시 스치듯 지나간 뒤 전부 사라지고
워드마크만 남는다.

**레이아웃·배치·컬러·모션**:
- Zone: 화면 전체를 카드 그리드로 채우는 요약 스택(14장, 규칙 그룹 10장 좌측/상단·예외 그룹
  4장 우측/하단으로 공간 분리) → 중앙 문구(손글씨 강조) → 좌상단 워드마크만 남는 3단계 전환.
- 배치: 카드는 축소판(각 카드 폭 화면의 약 10cqw)으로 그리드 배열, 쌓이는 순서는 대본 등장
  순서(BOAT→...→REACH)를 그대로 따른다. 문구("앞 모음만, 소리 냅니다")는 카드 스택 위에
  겹쳐 화면 중앙에 `hand-emphasis`(손글씨)로 표시 — 이 편 마지막을 장식하는 유일한 대형
  손글씨 텍스트.
- 컬러: 규칙 그룹 10장은 `{colors.accent-rule}` 계열 테두리, 예외 그룹 4장은
  `{colors.accent-exception}` 계열 테두리로 두 그룹이 색으로 한눈에 구분되게. 배경은 시종일관
  `{colors.bg}` 유지.
- 모션: 14장이 그룹별로 순차 등장(`opacity 0→1, scale 0.8→1, stagger 0.08`), progress-rail이
  동시에 100%까지 채워짐. 이후 중앙 손글씨 문구 페이드인(`duration 0.5`) → 마지막 5초는
  카드·문구 전부 페이드아웃(`opacity 1→0, duration 1.2`)하고 워드마크만 좌상단(`left:6cqw;
  top:8cqh`)에 축소 배치.

**⚠️ 엔드스크린 구간**(`production-rules.md` "렌더 마지막 5초는 유튜브 엔드스크린을 위해 화면
중앙을 통째로 비워둔다" 규칙, EP14부터 표준·3초→5초 확장): 마지막 5초는 카드 스택 애니메이션
까지 전부 페이드아웃시켜 화면 중앙을 통째로 비운다. 채널 로고 워드마크는 가운데가 아니라
좌상단 작은 태그로만 남긴다. 실제 타이밍은 TTS 실측 후 확정.

narrativeRole: 이 편의 배움(앞 모음=소리, 뒤 모음=무음, EA 예외)을 요약해서 완결감을 주고,
Frame 1의 "저도 이런 쉬운 단어 앞에서 순간 멈칫했던 적이 있어요"·"더 이상 멈추지 않고 바로
읽으실 수 있어요"를 "멈칫하지 않고 망설임 없이 바로 읽으실 수 있을 거예요"로 다시 가져와
도입-마무리 대칭 구조로 닫는다. 단편 방침에 따라 특정 다음 소재는 예고하지 않는다.
keyMessage: 오늘의 배움은 여기서 완결된다. 함께 하나씩 익혀나가면 된다는 믿음만 남긴다.

Scene 1 (0.0–12.0s): "오늘은… 함께 봤습니다" — 14개 단어 카드가 두 그룹으로 나뉘어 하나씩
쌓이며 등장, progress-rail 100% 채워짐.
Scene 2 (12.0–20.0s): "이제 모음 두 개가 붙은… 읽으실 수 있을 거예요" — "앞 모음만, 소리
냅니다" 문구 중앙 정착.
Scene 3 (20.0–25.0s): "다음에도… 훨씬 자신 있게 읽고 계실 거예요" — 가장 따뜻한 웜 톤으로 전환,
채널 로고 준비.
Scene 4 (25.0–30.0s): 엔드스크린 키프아웃 구간 — 로고 워드마크만 좌상단에 남기고 정리, 화면
중앙 완전히 비움.
