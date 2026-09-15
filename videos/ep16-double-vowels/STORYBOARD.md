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
