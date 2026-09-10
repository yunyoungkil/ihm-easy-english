---
format: 1920x1080
duration: ~6:58 (418.1초 — SCRIPT.md 최종 확정 원문 글자 수 기준 역산 추정치. TTS 실제 생성 후
  whisper 실측으로 재계산 필요. 아래 각 프레임 duration은 전부 추정값이다.)
message: "-sion으로 끝나는 긴 영단어는 앞에서부터 파닉스로 하나씩 읽는 게 아니라, 끝소리 바로
  앞 글자 하나(모음/R=전, 그 밖의 자음=션, SSION 예외=항상 션)만 알면 그 순간 수십 개 단어가
  한꺼번에 읽힌다"
arc: concept-explainer with practice
audience: "비슷하게 생긴 긴 영어 단어만 보면 읽기가 두려워 말문이 막히는 왕초보 리딩 입문자"
mode: collaborative
music: 약간 빠른 템포·집중력을 높이는 느낌의 BGM, SFX는 고급스럽고 절제된 톤(채널 기본 규칙,
  `CLAUDE.md` "HyperFrames 영상 제작 시 기본 적용 요소")
---

## Video direction

**Palette·모션 문법·리듬 배분 원칙은 EP11~14(`frame.md`)와 100% 동일** — 다크 네이비 그라운드,
power3 롱테일 감속 진입, 나레이션 발화 시점에만 등장, subtle jitter 외 정지 시 생동감 없음.

**이 편의 차이점**: 신규 컴포넌트 `sion-card`(+ `sound-tag`, `sion-cluster`, `syllable-buildup`)가
이 편의 시각적 척추다 — EP14의 `linking-diagram`이 "두 단어 경계에서 소리가 붙는" 걸 보여줬다면,
이 편은 **"한 단어 끝의 소리 패턴이 앞 글자 하나로 갈린다"**를 보여준다. 색은 결과(전=파랑,
션=주황) 하나로 통일하고, SSION 예외만 별도의 "확인 절차 생략" 모션(bounce, sound-tag 없음)으로
분리한다 — 검수 과정에서 실제로 두 번 사실관계가 잡혔기 때문에(R을 "예외"로 잘못 분류했던 것,
SSION 앞 글자를 굳이 설명하려 했던 것), 정확한 규칙 경계를 시각 문법으로도 흐트러뜨리지 않는다
(`frame.md`의 "언어학적 정확성 우선" 절 참고).

**Rhythm / held-frame allocation**: 2곳이 의도적 홀드 — Frame 5(원리 최초 공개), Frame 11의
SUPERVISION 첫 해소 순간. Frame 11 후반(DIVISION·PENSION)은 반대로 **가속 몽타주**로 리듬을
바꾼다 — 이 편에서 유일하게 "느렸다가 빨라지는" 구간.

**Negative list**: EP11~14와 동일(그림자 없음, 빨강 배경 채우기 금지, Black Han Sans는 헤드라인
전용, `repeat`/`yoyo`/`Math.random`/`Date.now` 금지) + 같은 프레이밍 연속 두 번 금지: 1
reveal-blur → 2 wordmark → 3 spelling-overlap → 4 hero-word-block → 5 sion-card(신규, 홀드) →
6 sion-cluster(신규, 8장) → 7 sion-cluster(신규, bounce) → 8 quiz-reveal(축소판 반복) →
9 sentence-stack → 10 syllable-buildup(신규, 반복) → 11 reveal-blur(몽타주 가속) →
12 sion-card 스택(17장).

## Frame 1 — 도입 (Stakes)

- scene: 딥 다크 캔버스에 DECISION·TELEVISION·EXPANSION 세 단어가 하나씩 떠올랐다가, 마지막
  글자 -SION 부분만 흐릿하게 뭉개지는 모션(뜻은 알아도 소리를 확신 못 하는 느낌을 시각화).
- voiceover: "DECISION, TELEVISION, EXPANSION… 이렇게 좀 긴 영단어 보면, 나도 모르게 눈부터 피하신 적 있으시죠? 뜻은 대충 아는 단어인데, 막상 소리 내서 읽으려고 하면, 대충 이렇게 읽었는데 이게 진짜 맞게 읽은 건지 확신이 안 서는 경우 많으실 거예요. 이게 여러분이 영어를 못해서가 아닙니다. 그 단어 끝에 숨어 있는 소리 패턴을, 아직 모르셨을 뿐이에요. 오늘 그 패턴 하나만 알려드릴게요. 그럼 처음 보는 긴 단어도, 이제 망설임 없이 바로 읽으실 수 있게 되실 거예요."
- duration: 42.6s (추정)
- transition_in: cut
- status: outline
- src: compositions/frames/01-stakes.html
- type: hook
- persuasion: 공감(Rhetorical empathy) + 구체적 이득 제시
- beat: 공감 + (약한) 호기심 + 시청자 이득
- blueprint: reveal-blur (frame.md, EP15 신규)
- focal: DECISION·TELEVISION·EXPANSION의 -SION 부분이 흐릿하게 뭉개지는 순간
- roles: 세 단어 카드 = foreground subject · -SION 뭉개짐 = focal thread · center glow = background
- sfx: soft-whoosh on -SION 뭉개짐 시작

narrativeRole: "뜻은 아는데 읽기는 확신 못 한다"는 리딩 왕초보의 실제 좌절을 구체적 단어 3개로
즉시 보여주고 공감시킨 뒤, "패턴 하나만 알면 된다"는 구체적 이득까지 이 프레임 안에서 약속한다
(`VIDEO_WORKFLOW.md` 3단계, 2026-09-10 확정 "Frame 1 호기심·이득 체크리스트" 규칙 최초 적용).
Frame 11에서 같은 -SION 뭉개짐이 선명하게 풀리며 대칭으로 회수된다.
keyMessage: 긴 단어를 못 읽는 건 실력 부족이 아니라 끝소리 패턴을 아직 몰랐을 뿐이고, 오늘 그
패턴 하나면 망설임 없이 읽을 수 있게 된다.

Scene 1 (0.0–12.0s): "DECISION, TELEVISION, EXPANSION… 눈부터 피하신 적 있으시죠?" — 세 단어
카드가 하나씩 등장.
Scene 2 (12.0–24.0s): "뜻은 대충 아는 단어인데… 확신이 안 서는 경우 많으실 거예요" — 카드 끝의
-SION 부분만 흐릿하게 뭉개지기 시작.
Scene 3 (24.0–33.0s): "이게 여러분이 영어를 못해서가 아닙니다. 그 단어 끝에 숨어 있는 소리
패턴을, 아직 모르셨을 뿐이에요" — 뭉개짐 완전히 진행, 정지.
Scene 4 (33.0–42.6s): "오늘 그 패턴 하나만 알려드릴게요. 그럼… 읽으실 수 있게 되실 거예요" —
톤 살짝 밝아지며 다음 프레임 예고.

## Frame 2 — 채널 인트로

- scene: 씬1의 뭉개진 -SION 부분이 걷히며 채널 워드마크 짧게 노출. 시즌 표기 없음(단편 방침).
- voiceover: "안녕하세요, 「이해하면 쉬운영어」입니다. 오늘은 긴 단어 끝에 자주 붙는 '-sion', 그 소리 규칙 하나로 여러분이 왜 그렇게 많은 단어를 읽기 어려워했는지 짚어드리겠습니다."
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

narrativeRole: 짧고 밝게 채널 정체성만 확인시키고 바로 본론(Big Question)으로 넘어갈 준비를 한다.
keyMessage: 오늘 다룰 범위는 "-sion 끝소리 규칙"이다.

Scene 1 (0.0–6.0s): "안녕하세요, 「이해하면 쉬운영어」입니다" — 워드마크 등장.
Scene 2 (6.0–15.0s): "오늘은… 짚어드리겠습니다" — 소개 문장, 정착.

## Frame 3 — 질문 던지기 (Big Question)

- scene: DECISION·TELEVISION·EXPANSION 세 단어가 나열되며 끝부분 "-SION" 철자가 완전히 동일한
  모양으로 겹쳐 보이도록 강조 표시(철자는 같다는 시각적 확인) → 그 위에 물음표 아이콘이 뜨며
  긴장감 조성.
- voiceover: "근데 궁금하지 않으세요? DECISION, TELEVISION, EXPANSION… 이렇게 철자는 다 똑같이 '-sion'으로 끝나는데, 왜 발음은 다 다르게 날까요? 혹시 이것도 하나하나 발음 기호를 외워야 아는 걸까요? 아니면 단어를 통째로 외워야 하는 걸까요?"
- duration: 22.7s (추정)
- transition_in: cut
- status: outline
- src: compositions/frames/03-question.html
- type: hook
- persuasion: Rhetorical question
- beat: 호기심 → 긴장
- blueprint: spelling-overlap (frame.md §hero-word-block 응용, EP15 신규 연출)
- focal: "-SION" 철자가 세 단어에서 완전히 겹쳐 보이는 순간
- roles: 세 단어의 -SION 철자 = foreground subject · 물음표 아이콘 = supporting
- sfx: 없음

narrativeRole: "철자는 똑같은데 발음은 다르다"는 정확한 미스터리를 세우고, 두려워할 만한
선택지(발음기호 암기 / 단어 통째로 암기)를 두 개 제시해서 다음 프레임의 반전이 두 걱정을 한
번에 해소하는 카타르시스로 느껴지게 만든다.
keyMessage: 철자가 똑같은 -sion인데 발음이 다른 이유가 무엇인지, 그걸 알려면 발음기호나 단어를
통째로 외워야 하는 건 아닌지 의문을 던진다.

Scene 1 (0.0–8.0s): "근데 궁금하지 않으세요?… 왜 발음은 다 다르게 날까요?" — 세 단어 카드
나열, -SION 부분 겹쳐 보이는 강조.
Scene 2 (8.0–15.0s): "혹시 이것도 하나하나 발음 기호를 외워야 아는 걸까요?" — 물음표 아이콘 1.
Scene 3 (15.0–22.7s): "아니면 단어를 통째로 외워야 하는 걸까요?" — 물음표 아이콘 2, 화면 살짝
어두워지며 긴장감 조성, 정지.

## Frame 4 — 반전 공개 (Head Fake)

- scene: 어두운 톤 → 밝은 앰버 톤으로 전환, "끝소리 하나로, 단어가 읽힙니다" 텍스트가 중앙에
  부드럽게 떠오름(확정 제목·뱃지 "1초 확장 언어팩"의 약속에 대한 실제 답변).
- voiceover: "결론부터 말씀드릴게요. 발음 기호, 하나도 안 외우셔도 됩니다. -sion으로 끝나는 단어는요, 사실 규칙이 딱 하나예요. 이 끝소리 바로 앞 글자 하나만 보면, 그 단어를 어떻게 읽어야 할지 저절로 알 수 있습니다. 저도 예전엔 이런 단어들을 볼 때마다 하나씩 따로 외웠었는데, 알고 보니까 그럴 필요가 전혀 없었더라고요."
- duration: 27.9s (추정)
- transition_in: cut
- status: outline
- src: compositions/frames/04-headfake.html
- type: reveal
- persuasion: Reversal + personal anecdote
- beat: 반전 착지
- blueprint: hero-word-block (frame.md, 채널 공통)
- focal: "끝소리 하나로, 단어가 읽힙니다"
- roles: "발음 기호 안 외워도 됩니다" = foreground subject · 개인 경험담 = supporting
- sfx: soft-chime on 반전 착지

narrativeRole: Frame 3에서 던진 두 걱정(발음기호 암기·단어 통째 암기) 모두를 정면으로 부정하고,
확정 제목("끝소리 하나만 제대로 알면 영단어 100개가 저절로 읽힙니다")의 답을 여기서 직접 준다.
keyMessage: 발음기호도, 단어를 통째로 외우는 것도 필요 없다 — 끝소리 바로 앞 글자 하나만 보면
된다.

Scene 1 (0.0–6.0s): "결론부터 말씀드릴게요. 발음 기호, 하나도 안 외우셔도 됩니다" — 앰버 톤
전환 시작.
Scene 2 (6.0–14.0s): "-sion으로 끝나는 단어는요… 저절로 알 수 있습니다" — "끝소리 하나로,
단어가 읽힙니다" 텍스트 페이드인.
Scene 3 (14.0–27.9s): "저도 예전엔… 그럴 필요가 전혀 없었더라고요" — 개인 경험담 supporting
톤, 정지.

## Frame 5 — 원리 설명 (메커니즘)

- scene: TELEVISION 카드가 먼저 뜨고 VISION 부분만 확대, 바로 앞 글자 I에 sound-tag(모음)와
  강조색(파랑) 하이라이트, 결과 "전"이 파랑으로 조립. 이어서 EXPANSION 카드, 앞 글자 N에
  sound-tag(자음)와 강조색(주황) 하이라이트, 결과 "션"이 주황으로 조립.
- voiceover: "원리는 이렇습니다. -sion 바로 앞 글자가 모음이거나, 또는 R이면, 목이 울리듯 부드럽게 '전' 소리가 나고요. 그 밖의 자음이면, 바람 빠지듯 가볍게 '션' 소리가 납니다. 사실 여러분은 이 소리, 이미 알고 계세요. TELEVISION, 우리가 '텔레비전'이라고 하잖아요. VISION 앞 글자가 모음 I죠? 그래서 '전'으로 울리는 거예요. 근데 EXPANSION은 다릅니다. 앞에 자음 N이 오니까, '익스팬션'처럼 바람 빠지는 '션' 소리가 나는 거죠."
- duration: 40.1s (추정)
- transition_in: crossfade
- status: outline
- src: compositions/frames/05-mechanism.html
- type: reveal
- persuasion: Visual demonstration + familiar-loanword catharsis
- beat: 발견의 "아하" — 이 영상의 클라이맥스
- blueprint: sion-card + sound-tag + syllable-buildup (frame.md, EP15 신규)
- focal: TELEVISION 안 VISION의 I가 강조되며 "전"이 조립되는 순간
- roles: TELEVISION/VISION sion-card = foreground subject · sound-tag = supporting · EXPANSION
  sion-card = foreground subject(교대)
- sfx: pron-caption 조립 완료 시 soft chime

**⚠️ 근거**: `SCRIPT.md` Line 5 각주 — -sion의 전/션 갈림은 "모음 또는 R" vs "그 밖의 자음"으로
정해짐(2026-09-10 웹 검색 검증 완료, Rachel's English). "유성음/무성음" 용어 대신 "목이
울리듯"/"바람 빠지듯" 감각적 표현으로 순화.

narrativeRole: 이 영상 전체가 파는 단 하나의 원리를 "여러분은 이미 알고 있었다"(텔레비전·비전)
는 카타르시스로 열어서, 설명이 아니라 "느껴서 아는" 학습 경험을 만든다.
keyMessage: -sion 바로 앞 글자가 모음 또는 R이면 전, 그 밖의 자음이면 션이다.

Scene 1 (0.0–10.0s): "원리는 이렇습니다… '션' 소리가 납니다" — 빈 화면에 원리 문구만 추상적으로
소개.
Scene 2 (10.0–22.0s): "사실 여러분은 이 소리… '전'으로 울리는 거예요" — TELEVISION 카드 등장,
VISION 확대, I에 sound-tag+파랑 하이라이트, "전" 조립(이 프레임의 홀드 포인트).
Scene 3 (22.0–40.1s): "근데 EXPANSION은 다릅니다… '션' 소리가 나는 거죠" — EXPANSION 카드로
전환, N에 sound-tag+주황 하이라이트, "션" 조립, 정지.

## Frame 6 — 패턴 확장

- scene: sion-card 8장이 두 그룹(전=파랑 5장: DECISION·EXPLOSION·OCCASION·VERSION·CONVERSION
  / 션=주황 3장: TENSION·MANSION·EXTENSION)으로 순차 등장, sion-cluster 레이아웃에 네온 테두리
  강조(채널 기본 적용 요소). VERSION·CONVERSION은 sound-tag가 자음(R)인데도 결과색은 파랑.
- voiceover: "이 규칙, 다른 단어에도 그대로 통합니다. 볼까요? DECISION은 CI 다음이 모음 I니까 '디시전'. EXPLOSION도 O 다음이니까 '익스플로전'. OCCASION도 A 다음이라 '오케이전'이고요. R 뒤에 오는 단어도 똑같이 '전'이에요. VERSION, 우리가 이미 '버전'이라고 하시죠? CONVERSION도 마찬가지로 '컨버전'입니다. 반대로 그 밖의 자음 뒤에 오는 단어들도 봅시다. TENSION은 N 다음이라 '텐션'. MANSION도 N 다음이라 '맨션'. EXTENSION도 마찬가지로 '익스텐션'이죠. 이렇게 앞 글자 하나만 확인하면, 처음 보는 단어도 바로 읽을 수 있는 거예요."
- duration: 52.3s (추정)
- transition_in: crossfade
- status: outline
- src: compositions/frames/06-pattern.html
- type: proof
- persuasion: Repeated pattern demonstration
- beat: 패턴 확장 카타르시스("이것도 되네?")
- blueprint: sion-cluster (frame.md, EP15 신규, 8장)
- focal: VERSION·CONVERSION이 자음(R)인데도 파랑(전) 그룹으로 배치되는 순간
- roles: 전 그룹 카드 5장 = foreground subject(순차) · 션 그룹 카드 3장 = foreground subject(순차,
  교대) · sion-cluster 배경 네온 테두리 = chrome
- sfx: 카드 등장마다 soft tick(8회, 볼륨 낮게)

**⚠️ 근거**: `SCRIPT.md` Line 6 각주 — VERSION·CONVERSION은 "모음 또는 R" 그룹 정규 예시(2026-
09-10 정정, 초안엔 Frame 7 "예외"로 잘못 분류돼 있었음). TENSION·MANSION·VERSION·CONVERSION
전부 한국어 외래어로 이미 쓰이고 있어 신뢰도를 뒷받침.

narrativeRole: Frame 5에서 배운 원리가 다른 단어에도 그대로 통한다는 걸 8개 단어로 증명하되,
R 그룹(자음인데도 전)을 여기서 정규 예시로 자연스럽게 녹여서 다음 프레임의 SSION 예외가 더
선명하게 대비되도록 준비한다.
keyMessage: 앞 글자 하나만 확인하면(모음·R=전, 그 밖의 자음=션) 처음 보는 단어도 바로 읽을 수
있다.

Scene 1 (0.0–15.0s): "이 규칙, 다른 단어에도… '오케이전'이고요" — DECISION·EXPLOSION·OCCASION
sion-card 순차 등장(파랑).
Scene 2 (15.0–28.0s): "R 뒤에 오는 단어도… '컨버전'입니다" — VERSION·CONVERSION sion-card
등장, sound-tag는 자음(R)이지만 결과색 파랑 유지(핵심 시각 포인트).
Scene 3 (28.0–44.0s): "반대로 그 밖의 자음 뒤에 오는… '익스텐션'이죠" — TENSION·MANSION·
EXTENSION sion-card 등장(주황).
Scene 4 (44.0–52.3s): "이렇게 앞 글자 하나만 확인하면… 바로 읽을 수 있는 거예요" — 8장 전체
정지, 두 그룹 색 대비 강조.

## Frame 7 — 반전 꿀팁 (예외)

- scene: MISSION·PASSION·DISCUSSION sion-card 3장이 sion-cluster로 등장(주황, sound-tag 없음,
  SSION 부분만 이중 S가 살짝 겹쳐 보이는 강조 표시). Frame 5~6과 다른 진입 모션(카드가 아래에서
  톡 튀어 오르는 bounce).
- voiceover: "그럼 예외는 없을까요? 딱 한 가지만 조심하면 됩니다. S가 두 번 겹치는 단어예요. MISSION, PASSION, DISCUSSION처럼 SSION으로 끝나면, 앞 글자를 확인할 필요도 없이 무조건 '션'입니다. 이 경우만큼은 앞 글자를 보지 않고, S가 두 개 겹치는 순간 바로 '션'이라고 기억해 두시면 됩니다."
- duration: 27.4s (추정)
- transition_in: cut
- status: outline
- src: compositions/frames/07-exception.html
- type: twist
- persuasion: Counter-expectation reveal → simpler shortcut
- beat: 반전 꿀팁("근데 왜 이건 다르지?")
- blueprint: sion-cluster--bounce, sound-tag 미적용 (frame.md, EP15 신규)
- focal: SSION 두 글자가 겹쳐 보이며 "앞 글자 확인 불필요" 신호를 주는 순간
- roles: MISSION/PASSION/DISCUSSION sion-card = foreground subject · SSION 겹침 강조 = focal
  thread
- sfx: 카드 등장 시 soft "boing"(bounce 모션과 동기화)

**⚠️ 근거**: `SCRIPT.md` Line 7 각주 — -SSION(이중 S)은 앞 글자와 무관하게 항상 무성음 "션"
(2026-09-10 웹 검색 검증, Learn English Sounds). **⚠️ 시각 문법 주의**: 이 프레임엔 sound-tag를
붙이지 않는다 — "앞 글자를 볼 필요조차 없다"는 게 대본의 핵심 포인트라, 라벨을 붙이면 오히려
Frame 5~6의 "앞 글자 확인" 절차를 다시 불러들여 모순된 신호를 준다(2026-09-10 스크립트 수정
과정에서 두 차례 검토 후 확정 — `SCRIPT.md` Line 7 코멘트 참고).

narrativeRole: "그럼 예외는 없을까요?"로 도파민 3단계 공식의 3단계를 열되, 이 예외는 규칙을
복잡하게 만드는 게 아니라 오히려 **확인 절차 자체가 생략되는 지름길**이라는 걸 강조한다.
keyMessage: SSION(이중 S)으로 끝나면 앞 글자를 확인할 필요도 없이 무조건 션이다.

Scene 1 (0.0–6.0s): "그럼 예외는 없을까요? 딱 한 가지만 조심하면 됩니다" — 짧은 정적.
Scene 2 (6.0–14.0s): "S가 두 번 겹치는 단어예요. MISSION, PASSION, DISCUSSION처럼" — 3장
sion-card가 bounce 모션으로 튀어 오르며 등장, SSION 겹침 강조.
Scene 3 (14.0–27.4s): "SSION으로 끝나면… S가 두 개 겹치는 순간 바로 '션'" — 정답 "션" 3장 모두
동시에 밝아짐(sound-tag 없이), 정지.

## Frame 8 — 미니 퀴즈

- scene: quiz-reveal 3문항 — 질문 문구 → 짧은 정지(무음) → sion-card 축소판으로 정답 공개. 앞
  2문항은 Frame 5~6 색 규칙(CONFUSION=파랑, DIMENSION=주황), 마지막 1문항(EXPRESSION)은 Frame
  7의 SSION 표시 방식으로 정답 공개.
- voiceover: "그럼 직접 맞혀보세요. 첫 번째 단어, 어떻게 읽을까요? 잠깐 생각해 보세요. S 앞이 모음 U니까, '컨퓨전'입니다. 두 번째 단어는요? N 다음이니까, '디멘션'이죠. 마지막 문제, 이번엔 좀 다를 수 있어요. 세 번째 단어는요? 정답은, '익스프레션'입니다. S가 두 번 겹치는 예외였죠." (2026-09-10 수정 — 목표 단어를 화면에만
  보이는 상태로 두고 나레이션에서는 소리 내어 말하지 않음, 정답 발음 누설 방지 + 화면 중복 제거.
  기존 오디오에서 `scripts/trim-word.mjs`로 해당 구간만 잘라내는 방식으로 처리, 재생성 없음.)
- duration: 27.0s (추정)
- transition_in: crossfade
- status: outline
- src: compositions/frames/08-quiz.html
- type: interactive_pause
- persuasion: Self-test engagement
- beat: 참여 유도 → 정답 확인 안도감(3회 반복)
- blueprint: quiz-reveal (frame.md, 채널 공통 골격 + sion-card)
- focal: EXPRESSION 정답 공개 순간(단어 안 R에 낚이지 않는지 테스트)
- roles: 질문 문구 = supporting · sion-card 축소판 정답 = foreground subject
- sfx: 매 정답 공개 시 soft chime(3회)

narrativeRole: Frame 5·6·7에서 배운 규칙을 시청자가 직접 새 단어(CONFUSION·DIMENSION·
EXPRESSION, 대본 전체에서 처음 등장)에 적용해보게 해서 "진짜 내 것이 됐는지" 확인한다. 마지막
문항은 단어 안에 R(EXP**R**ESSION)이 있어 Frame 6의 "R=전" 규칙을 떠올리게 낚되, SSION이
앞서므로 정답은 션 — 두 규칙을 정확히 구분했는지 시험한다.
keyMessage: 배운 원리를 처음 보는 단어에 스스로 적용해봐야 진짜 내 것이 된다.

Scene 1 (0.0–7.0s): "그럼 직접 맞혀보세요. 첫 번째 단어, 어떻게 읽을까요? 잠깐 생각해 보세요" —
질문 카드, 짧은 정지.
Scene 2 (7.0–10.0s): "S 앞이 모음 U니까, '컨퓨전'입니다" — sion-card 축소판 정답(파랑).
Scene 3 (10.0–14.0s): "하나 더요. DIMENSION은요?… '디멘션'이죠" — 동일 방식 빠르게 반복(주황).
Scene 4 (14.0–20.0s): "마지막 문제, 이번엔 좀 다를 수 있어요. EXPRESSION은요?" — 질문 카드,
단어 안 R이 살짝 보이도록 배치(낚시 포인트).
Scene 5 (20.0–27.0s): "정답은 '익스프레션'입니다. S가 두 번 겹치는 예외였죠" — Frame 7 방식
정답 공개.

## Frame 9 — 실제 문장에서 읽기

- scene: sentence-card 4개가 세로로 하나씩 등장, 재생과 동시에 -sion 단어만 결과색(파랑/주황)
  으로 인라인 하이라이트되는 자막. 재생 끝나면 한글 발음이 짧게 표시.
- voiceover: "이제 진짜 문장 속에서 확인해 볼까요? 첫 번째. I need to make a big decision. 두 번째. There was a huge explosion in the news. 세 번째. Can I get an extension on this? 네 번째. He gave a great first impression. 어떠세요? 이제 낯선 단어가 나와도, 끝소리만 보면 자신 있게 읽으실 수 있을 거예요."
- duration: 35.6s (추정)

**⚠️ EP11~14와 동일한 이유로 이 프레임만 단일 TTS 호출이 아니다.** 영어 문장 4개는 한글 발음
표기가 아니라 진짜 영어 텍스트를 같은 보이스 엔진에 보내 원어민 발음으로 따로 생성한 뒤
`ffmpeg concat`으로 이어붙인다. 한국어 조각(오프닝+서수+마무리 확인 문장)은 이 씬의 남성 보이스
그대로, 영어 문장 4개만 순수 영어 텍스트로 생성.

- transition_in: crossfade
- status: outline
- src: compositions/frames/09-listening.html
- type: proof
- persuasion: Real-sentence application
- beat: 리딩 실전 적용
- blueprint: sentence-card (frame.md, 채널 공통)
- focal: 4개 문장이 하나씩 등장하는 리듬, -sion 단어만 인라인 하이라이트
- roles: sentence-card 4개 = foreground subject · -sion 단어 인라인 색칠 = focal thread
- sfx: 없음(실제 영어 음성 자체가 콘텐츠라 효과음으로 방해하지 않음)

**⚠️ 근거**: `SCRIPT.md` Line 9 각주 — 네 문장에 전 그룹(decision·explosion)·션 그룹
(extension)·SSION 그룹(impression)을 고르게 섞어 세 카테고리가 실제 문장에서도 통한다는 걸
확인시킨다.

narrativeRole: 단어 카드가 아니라 진짜 문장 속에서 원리를 시험해서, 규칙이 고립된 단어 암기가
아니라 실제 읽기에 그대로 적용된다는 걸 체감시킨다.
keyMessage: 오늘 배운 -sion 소리 규칙은 실제 문장 속에서도 똑같이 적용된다.

Scene 1 (0.0–3.0s): "이제 진짜 문장 속에서 확인해 볼까요?" 인트로.
Scene 2 (3.0–28.0s): "첫 번째… 네 번째…" — sentence-card 4개가 하나씩 등장, -sion 단어만
인라인 하이라이트(decision·explosion=파랑, extension=주황, impression=주황+SSION 표시).
Scene 3 (28.0–35.6s): "어떠세요? 이제 낯선 단어가 나와도… 읽으실 수 있을 거예요" — 전체 정지.

## Frame 10 — 소리 내어 읽기 연습

- scene: sion-card 3장(TELEVISION·EXPANSION·CONVERSION)이 syllable-buildup 모션으로 등장,
  매 단어 2회 조립(느리게→빠르게). TELEVISION·CONVERSION은 파랑(전), EXPANSION은 주황(션).
- voiceover: "자, 이제 직접 소리 내서 읽어보세요. 따라 읽다 보면 저절로 자신감이 붙으실 거예요. TELEVISION, 천천히. 텔, 레, 비, 전 — 이어서, 텔레비전! 다시 한 번, 좀 더 빠르게. 텔레비전, 텔레비전. 이번엔 EXPANSION이에요. 익스, 팬, 션 — 이어서, 익스팬션! 다시 한 번, 좀 더 빠르게. 익스팬션, 익스팬션. 마지막으로 R로 끝나는 경우도 같이 볼까요. CONVERSION이에요. 컨, 버, 전 — 이어서, 컨버전! 다시 한 번, 좀 더 빠르게. 컨버전, 컨버전."
- duration: 42.1s (추정)
- transition_in: cut
- status: outline
- src: compositions/frames/10-practice.html
- type: cta_practice
- persuasion: Direct instruction + encouragement
- beat: 신체 참여 유도(복습·자신감 굳히기)
- blueprint: syllable-buildup (frame.md, EP15 신규, Frame 5 모션 재사용)
- focal: 각 단어 조립 후 2회 반복
- roles: 프롬프트 문장 = supporting · sion-card 음절 조립 = foreground subject
- sfx: 각 조립 완료 시 soft pulse tick

narrativeRole: 이미 배운 세 단어(TELEVISION·EXPANSION·CONVERSION — 앞서 전부 정답을 확인한
단어들)를 입으로 직접 내뱉게 해서, 채널의 "반복 낭독" 시그니처를 이 편의 방식으로 실현하고
전/션/R(전) 세 유형을 몸으로 복습시킨다. 새 단어 테스트는 Frame 8(퀴즈)과 Frame 11(페이오프)이
전담하므로, 이 프레임은 의도적으로 전부 복습 단어로만 구성해 "자신감 굳히기"에 집중한다
(2026-09-10 사용자 논의로 확정 — Frame 8·10 역할 분담 유지, 신규 단어 증명은 Frame 11에 집중).
keyMessage: 소리 내서 말해봐야 입이 기억한다 — 전/션/R(전) 세 유형 모두.

Scene 1 (0.0–13.0s): "자, 이제 직접 소리 내서 읽어보세요… 텔레비전, 텔레비전" — TELEVISION
syllable-buildup(파랑) → 2회 반복.
Scene 2 (13.0–24.0s): "이번엔 EXPANSION이에요… 익스팬션, 익스팬션" — EXPANSION
syllable-buildup(주황) → 2회 반복.
Scene 3 (24.0–42.1s): "마지막으로 R로 끝나는 경우도… 컨버전, 컨버전" — CONVERSION
syllable-buildup(파랑, R 강조) → 2회 반복.

## Frame 11 — 실전 재확인 (페이오프)

- scene: SUPERVISION이 낯선 단어처럼 흐릿하게 등장했다가(reveal-blur), 앞 글자 I(모음)
  sound-tag가 강조되며 또렷하게 "수퍼비전"으로 밝아지는 모션(홀드). 이어서 DIVISION·PENSION이
  같은 모션을 더 빠른 속도로 반복(몽타주). Frame 1의 뭉개졌던 -SION이 이번엔 선명하게 읽히는
  대칭 구조로 마무리.
- voiceover: "이제 정말 이 규칙 하나로, 처음 보는 단어도 바로 읽으실 수 있어요. 예를 들어 이 단어, 오늘 처음 보셨죠? 그래도 한번 볼까요. I 다음이니까, 모음이죠. 그럼 정답은, '수퍼비전'입니다. 하나 더 볼까요. 이것도 모음 뒤니까, '디비전'이에요. 하나만 더요. 이번엔 N 뒤니까, '펜션'이죠. 어떠세요, 낯선 단어들인데도 계속 바로 읽히시죠? 이게 바로 끝소리 하나로 단어 백 개가 저절로 읽히는 이유예요." (2026-09-10 수정 —
  Frame 8과 동일한 이유로 영어 단어를 나레이션에서 말하지 않음, `scripts/trim-word.mjs`로 기존
  오디오만 트림.)
- duration: 40.0s (추정)
- transition_in: crossfade
- status: outline
- src: compositions/frames/11-payoff.html
- type: benefit_highlight
- persuasion: Real-time generalization proof (montage)
- beat: 발견의 즐거움 재확인(Frame 1의 Stakes 회수) + "100단어" 제목 약속 이행
- blueprint: reveal-blur ×3, 뒤로 갈수록 가속 (frame.md, EP15 신규)
- focal: SUPERVISION이 처음 보는 단어인데도 즉시 풀리는 순간 → DIVISION·PENSION 몽타주 가속
- roles: SUPERVISION sion-card = foreground subject(홀드) · DIVISION/PENSION sion-card =
  foreground subject(가속, 교대) · Frame 1 회수 = callback
- sfx: SUPERVISION 해소 시 soft chime(홀드감 있게), DIVISION·PENSION은 더 빠른 double-tick

narrativeRole: Frame 1에서 던진 "확신 못 하는 경험"을 여기서 직접 회수하되, SUPERVISION 하나가
아니라 DIVISION·PENSION까지 연달아 통하는 걸 보여줘서 "정말 아무 단어에나 통한다"는 증거를
하나가 아니라 세 번 겹쳐 제시한다(2026-09-10 사용자 확정 — 새 단어 증명은 이 프레임에 집중,
Frame 8·10은 각자 역할 유지). 확정 제목("영단어 100개가 저절로 읽힙니다")의 약속을 마지막
문장이 그대로 이행한다.
keyMessage: 이 규칙 하나로 처음 보는 단어도 계속 바로 읽힌다 — 그래서 끝소리 하나로 단어 백
개가 저절로 읽히는 것이다.

Scene 1 (0.0–8.0s): "이제 정말 이 규칙 하나로… 이 단어 오늘 처음 보셨죠?" — SUPERVISION
reveal-blur 시작(흐릿하게).
Scene 2 (8.0–18.0s): "그래도 한번 볼까요. I 다음이니까, 모음이죠. 그럼 정답은, '수퍼비전'
입니다" — I에 sound-tag+파랑 하이라이트, 완전히 선명하게 해소(홀드 포인트).
Scene 3 (18.0–26.0s): "하나 더 볼까요. DIVISION… '디비전'이에요" — 같은 모션 더 빠르게(파랑).
Scene 4 (26.0–33.0s): "하나만 더요. PENSION… '펜션'이죠" — 같은 모션 한층 더 빠르게(주황),
몽타주 절정.
Scene 5 (33.0–40.0s): "어떠세요, 낯선 단어들인데도… 저절로 읽히는 이유예요" — 세 단어 카드
나란히 정착, Frame 1의 -SION 뭉개짐과 대칭으로 완전히 선명한 상태.

## Frame 12 — 요약 + 마무리

- scene: 오늘 다룬 17개 단어가 sion-card로 하나씩 쌓이며 등장해 전부 화면에 함께 남는다(전=
  파랑, 션=주황, SSION 예외=주황+표시 세 그룹으로 묶어서). 이후 중앙에 "끝소리 하나로, 단어가
  읽힙니다" 문구가 떠오름. 특정 다음 소재를 암시하는 시각 요소 없이(단편 방침) 채널 로고로
  페이드아웃.
- voiceover: "오늘은 -sion으로 끝나는 단어, 바로 앞 글자가 모음이거나 R이면 전, 그 밖의 자음이면 션으로 정해진다는 원리, 그리고 S가 두 번 겹치면 무조건 션이 되는 예외까지 함께 봤습니다. 이제 뒤에 -sion이 붙은 패턴의 낯선 긴 단어를 봐도, 예전처럼 눈부터 피하지 않고 망설임 없이 바로 읽으실 수 있을 거예요. 다음에도 여러분이 자주 막막해하시는 부분, 또 풀어드릴게요. 저와 같이 하나씩 차근차근 익혀 나가시면, 어느새 훨씬 자신 있게 읽고 계실 거예요."
- duration: 39.9s (추정)
- transition_in: crossfade
- status: outline
- src: compositions/frames/12-summary.html
- type: branding
- persuasion: Recap + warm close, symmetric callback to Frame 1
- beat: 정리 + 따뜻한 다음 기약(특정 예고 없음)
- blueprint: sion-card 스택(17장) (frame.md, 채널 공통 summary-cards 응용)
- focal: "저와 같이 하나씩 차근차근 익혀 나가시면" — 따뜻하게 닫히는 문장
- roles: 요약 카드 스택 = supporting · 마무리 문장 = foreground subject, 완전히 정착
- sfx: 없음(차분하게 완결)

**⚠️ 엔드스크린 구간**(`production-rules.md` "렌더 마지막 3초는 유튜브 엔드스크린 자리를
비워둔다" 참고): 마지막 3초(36.9~39.9s 추정 구간)는 카드 스택 애니메이션이 끝난 뒤 채널 로고
워드마크만 남기고, 우측 하단(x 1620~1920, y 910~1080)·중앙 상단(x 810~1110, y 0~170) 두 영역을
비운다.

narrativeRole: 이 편의 배움(모음·R=전, 그 밖의 자음=션, SSION 예외)을 요약해서 완결감을 주고,
Frame 1의 "눈부터 피하신 적 있으시죠?"·"망설임 없이 읽으실 수 있게"를 그대로 가져와 도입-마무리
대칭 구조로 닫는다. 단편 방침에 따라 특정 다음 소재는 예고하지 않는다.
keyMessage: 오늘의 배움은 여기서 완결된다. 함께 하나씩 익혀나가면 된다는 믿음만 남긴다.

Scene 1 (0.0–14.0s): "오늘은… 함께 봤습니다" — 17개 단어 카드가 세 그룹으로 나뉘어 하나씩
쌓이며 등장, progress-rail 100% 채워짐.
Scene 2 (14.0–24.0s): "이제 뒤에 -sion이 붙은… 읽으실 수 있을 거예요" — "끝소리 하나로,
단어가 읽힙니다" 문구 중앙 정착.
Scene 3 (24.0–36.9s): "다음에도… 훨씬 자신 있게 읽고 계실 거예요" — 가장 따뜻한 웜 앰버 톤으로
전환, 채널 로고 준비.
Scene 4 (36.9–39.9s): 엔드스크린 키프아웃 구간 — 로고 워드마크만 남기고 정리, 우측 하단·중앙
상단 비움.
