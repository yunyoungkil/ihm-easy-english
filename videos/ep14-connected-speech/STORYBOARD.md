---
format: 1920x1080
duration: ~6:20 (380.3초 — SCRIPT.md 원문 글자 수 기준 역산 추정치. EP13 실측/추정 비율(1.58배)을
  적용하면 실제로는 10분 안팎까지 늘어날 수 있음 — TTS 실제 생성 후 재계산 필요. 아래 각 프레임
  duration은 전부 추정값이다.)
message: "원어민이 문장을 뭉개서 말하는 게 아니라, 혀를 덜 움직이려고 소리와 소리를 편하게 이어
  붙이는 것 — 자음+모음이 만나면 붙고(링킹), T/D가 모음 사이에 끼면 톡 튕기며(탄설음), 중요하지
  않은 짧은 단어는 힘이 빠져 줄어든다(약화)"
arc: concept-explainer with practice
audience: "단어는 아는데 문장으로 이어지면 전혀 안 들려 답답함을 느끼는 4060 리스닝 정체기 학습자"
mode: collaborative
music: calm minimal ambient underscore, very low presence — educational, never distracting
---

## Video direction

**Palette·모션 문법·리듬 배분 원칙은 EP11~13(`frame.md`)와 100% 동일** — 다크 네이비 그라운드,
세 기능색(노랑=강세/정답/기본 패턴, 파랑=발음, 빨강=예외), power3 롱테일 감속 진입, 나레이션 발화
시점에만 등장, subtle jitter 외 정지 시 생동감 없음.

**이 편의 차이점**: 신규 컴포넌트 `linking-diagram`(+ `letter-tag`, Frame 5·6·7·8·10)이 이 편의
시각적 척추다 — EP13의 `sound-blend-diagram`이 "한 단어 안에서 글자가 이어 붙는" 걸 보여줬다면,
이 편은 **"두 단어의 경계에서 소리가 붙거나 바뀌는"** 걸 보여준다. 같은 컴포넌트를 세 가지 모션
변형(slide/shrink/bounce)으로 나눠 쓴다 — 검수 과정에서 실제로 두 번(MADE IT의 T→D, WHERE WE의
메커니즘) 사실 오류가 잡혔기 때문에, 세 현상을 뭉뚱그리지 않고 정확히 구분해서 그린다
(`frame.md`의 "언어학적 정확성 우선" 절 참고).

**Rhythm / held-frame allocation**: 2곳이 의도적 홀드 — Frame 5(원리 최초 공개), Frame 8의 각
정답 공개 순간(4회 반복 홀드). 나머지는 능동적으로 전개된다.

**Negative list**: EP11~13과 동일(그림자 없음, 빨강 배경 채우기 금지, 검은고딕은 헤드라인 전용,
`repeat`/`yoyo`/`Math.random`/`Date.now` 금지) + 같은 프레이밍 연속 두 번 금지: 1 fading-sentence →
2 wordmark → 3 question-cards → 4 word-reveal → 5 linking-slide(신규) → 6 linking-shrink(신규) →
7 linking-bounce(신규) → 8 quiz(축소판 반복) → 9 sentence-stack → 10 practice(축소판 반복) →
11 payoff-symmetric → 12 summary-cards.

## Frame 1 — 도입 (Stakes)

- scene: 딥 다크 캔버스, "Where were we?" 문장이 또렷하게 떴다가 흐릿하게 뭉개지는 모션(아는
  단어인데 안 들리는 느낌을 시각화). 빠른 속도로 읽히는 듯 흔들리다 물음표와 함께 뭉개짐.
- voiceover: "단어는 분명 다 아는 건데, 원어민이 문장으로 말하면 하나도 안 들리신 적 있으시죠? 분명 하나하나 뜯어보면 다 아는 단어인데, 막상 영화나 유튜브에서 들으면 완전히 다른 소리처럼 들려서 당황하신 적, 다들 있으실 거예요. 이거, 여러분 리스닝 실력이 부족해서가 아닙니다. 원어민이 진짜로 무슨 소리를 내고 있는지, 그 원리를 아직 안 배우셨을 뿐이에요."
- duration: 30.3s (추정)
- transition_in: cut
- status: outline
- src: compositions/frames/01-stakes.html
- type: hook
- persuasion: 공감(Rhetorical empathy)
- beat: 공감 + 호기심
- blueprint: hook-cover (frame.md §1)
- focal: "Where were we?" 문장이 선명→뭉개짐
- roles: 도입 문장 = supporting · "Where were we?" 뭉개짐 = foreground subject · center glow = background
- sfx: soft-whoosh on 문장 뭉개짐 시작

narrativeRole: "단어는 아는데 문장으로 들으면 하나도 안 들린다"는 리스닝 정체기 학습자의 실제
좌절을 구체적 문장(Where were we?)으로 즉시 보여주고 공감시킨다. Frame 11에서 같은 문장이
선명해지며 대칭으로 회수된다.
keyMessage: 안 들리는 게 리스닝 실력 부족이 아니라, 원어민이 실제로 내는 소리의 원리를 아직 안
배웠기 때문이다.

Scene 1 (0.0–8.0s): "단어는 분명 다 아는 건데... 있으시죠?" — "Where were we?" 문장 선명하게 등장.
Scene 2 (8.0–16.0s): "분명 하나하나 뜯어보면... 당황하신 적" — 문장이 흔들리며 흐릿해지기 시작.
Scene 3 (16.0–22.0s): "다들 있으실 거예요. 이거, 여러분 리스닝 실력이 부족해서가 아닙니다" — 문장
완전히 뭉개짐 + 물음표.
Scene 4 (22.0–30.3s): "원어민이 진짜로... 안 배우셨을 뿐이에요" — 정지, subtle jitter만.
progress-rail 첫 구간 채워짐.

## Frame 2 — 채널 인트로

- scene: 씬1의 뭉개진 문장이 사라지며 채널 워드마크 짧게 노출.
- voiceover: "안녕하세요, 「이해하면 쉬운영어」입니다. 오늘은 원어민 말이 왜 한 덩어리로 들리는지, 그 진짜 원리를 함께 보시죠."
- duration: 10.0s (추정)
- transition_in: crossfade
- status: outline
- src: compositions/frames/02-intro.html
- type: branding
- persuasion: —
- beat: 신뢰 형성
- blueprint: word-reveal (frame.md §2)
- focal: 채널 워드마크
- roles: 채널명 = foreground subject · 소개 문장 = supporting
- sfx: 없음(차분한 브랜딩 톤)

narrativeRole: 짧고 밝게 채널 정체성만 확인시키고 바로 본론(Big Question)으로 넘어갈 준비를 한다.
keyMessage: 오늘 다룰 범위는 "원어민 말이 왜 한 덩어리로 들리는가"다.

Scene 1 (0.0–5.5s): "안녕하세요, 「이해하면 쉬운영어」입니다" — 워드마크 등장.
Scene 2 (5.5–10.0s): "오늘은... 함께 보시죠" — 소개 문장, 정착.

## Frame 3 — 질문 던지기 (Big Question)

- scene: 단어 카드들이 딱딱 끊어져 나열되다가, 화면이 살짝 어두워지며 마지막 질문에서 긴장감 조성.
- voiceover: "그런데 궁금하지 않으세요? 왜 유독 원어민이 말할 때는 단어와 단어 사이가 딱딱 끊어지지 않고 뭉쳐서 들릴까요? 교과서에서 배운 발음이랑, 실제로 듣는 소리가 왜 이렇게 다를까요? 혹시 원어민들이 그냥 발음을 대충 하는 걸까요?"
- duration: 19.5s (추정)
- transition_in: cut
- status: outline
- src: compositions/frames/03-question.html
- type: hook
- persuasion: Rhetorical question
- beat: 호기심 → 긴장
- blueprint: question-cards (frame.md §3, EP14 신규)
- focal: "혹시 대충 하는 걸까요?" 질문에서 화면 어두워짐
- roles: 질문 문장 = foreground subject · 끊어진 단어 카드 = supporting
- sfx: 없음

narrativeRole: "왜 이렇게 뭉쳐 들리는가"에 대한 그럴듯한 오해(대충 발음)를 먼저 세워서, 다음
프레임의 반전(정반대 이유)이 진짜 반전으로 느껴지게 만든다.
keyMessage: 원어민 발음이 교과서와 다른 이유가 정말 "대충 하는 것"인지 의문을 던진다.

Scene 1 (0.0–6.0s): "그런데 궁금하지 않으세요?... 뭉쳐서 들릴까요?" — 단어 카드들이 딱딱 끊어져
나열.
Scene 2 (6.0–13.0s): "교과서에서 배운 발음이랑... 왜 이렇게 다를까요?" — 카드 배열 유지, 정적.
Scene 3 (13.0–19.5s): "혹시 원어민들이... 대충 하는 걸까요?" — 화면 살짝 어두워지며 긴장감 조성,
정지.

## Frame 4 — 반전 공개 (Head Fake)

- scene: 씬3의 어두운 톤 → 밝은 앰버 톤으로 전환, "힘을 빼면, 소리가 이어집니다" 텍스트가 중앙에
  부드럽게 떠오름.
- voiceover: "결론부터 말씀드릴게요. 대충 하는 게 아닙니다. 오히려 정반대예요. 원어민들은 혀를 최대한 편하게, 힘을 빼고 움직이려다 보니까, 자연스럽게 소리와 소리가 이어 붙는 겁니다. 그러니까 교과서처럼 한 글자씩 또박또박 끊어 말하는 게 오히려 더 힘이 드는 방식인 거예요. 저도 공부하기 전엔 이걸 몰라서 무슨 말을 하는지 하나도 몰랐는데, 알고 보니까 그냥 힘 안 들이고 편하게 말하다 보니 그렇게 되는 거였어요."
- duration: 35.4s (추정)
- transition_in: cut
- status: outline
- src: compositions/frames/04-headfake.html
- type: reveal
- persuasion: Reversal + personal anecdote
- beat: 반전 착지
- blueprint: word-reveal (frame.md §4)
- focal: "힘을 빼면, 소리가 이어집니다"(확정 제목의 "왜 이렇게 말하지 않는지"에 대한 실제 답)
- roles: "대충 하는 게 아닙니다" = foreground subject · 개인 경험담 = supporting
- sfx: soft-chime on 반전 착지

narrativeRole: Frame 3에서 세운 "대충 하는 걸까?" 오해를 정면으로 뒤집어, 확정 제목("교과서처럼
똑 부러지게 말하지 않는 진짜 이유")의 답을 여기서 직접 준다.
keyMessage: 원어민은 대충 하는 게 아니라 혀에 힘을 빼고 편하게 말하다 보니 소리가 자연스럽게
이어 붙는다.

Scene 1 (0.0–6.0s): "결론부터 말씀드릴게요. 대충 하는 게 아닙니다. 오히려 정반대예요" — 노랑
hero-word-block급으로 착지.
Scene 2 (6.0–18.0s): "원어민들은... 힘이 드는 방식인 거예요" — 앰버 톤 전환, "힘을 빼면, 소리가
이어집니다" 텍스트 페이드인.
Scene 3 (18.0–35.4s): "저도 공부하기 전엔... 그렇게 되는 거였어요" — 개인 경험담 supporting 톤,
정지.

## Frame 5 — 원리 설명 (메커니즘)

- scene: "AN" + "APPLE" 두 단어 카드가 따로 떨어져 있다가, 각 글자 밑 letter-tag(자/모/무음)가
  뜨고, N이 APPLE 카드 앞으로 슬라이드해서 붙는 애니메이션 — 경계 지점 N(자)·A(모)만 노랑
  하이라이트.
- voiceover: "원리는 이렇습니다. 앞 단어가 자음으로 끝나고 뒤 단어가 모음으로 시작하면, 혀가 그 자음 소리를 굳이 앞 단어에 남겨두지 않고 뒤 단어 쪽으로 슬쩍 넘겨서 붙여버려요. 예를 들어 AN APPLE, 볼게요. AN은 N으로 끝나고, APPLE은 A라는 모음으로 시작하죠. 이걸 따로따로 말하면 '앤, 애플'이 되는데, 혀에 힘을 빼고 자연스럽게 이어 붙이면 그 N이 APPLE 앞으로 넘어가서 '어 내플'처럼 들리게 됩니다. 억지로 붙이는 게 아니라, 힘을 빼면 저절로 이렇게 되는 거예요."
- duration: 42.0s (추정)
- transition_in: crossfade
- status: outline
- src: compositions/frames/05-mechanism.html
- type: reveal
- persuasion: Visual demonstration
- beat: 발견의 "아하" — 이 영상의 클라이맥스
- blueprint: linking-diagram-slide (frame.md §5, EP14 신규)
- focal: N이 APPLE 앞으로 슬라이드해서 흡수되는 순간
- roles: linking-diagram(AN/APPLE) = foreground subject · letter-tag = supporting · "어 내플" pron-caption = foreground subject(교대)
- sfx: N이 흡수되는 순간 soft "pop"

**⚠️ 예문 출처**: `SCRIPT.md` Line 5 각주 — 자음→모음 연결(consonant-to-vowel linking)은 웹 검색
검증 완료(2026-09-07, Rachel's English 등).

narrativeRole: 이 영상 전체가 파는 단 하나의 원리(힘을 빼면 소리가 붙는다)를 가장 단순한 예문으로
시각 증명한다 — letter-tag로 "어느 글자가 자음/모음인지" 자체를 먼저 눈으로 확인시킨 뒤 붙는
과정을 보여줘서, 설명이 아니라 "느껴서 아는" 학습 경험을 만든다.
keyMessage: 앞 단어가 자음으로 끝나고 뒤 단어가 모음으로 시작하면, 힘을 뺀 혀가 그 자음을 뒤
단어로 넘겨 붙인다.

Scene 1 (0.0–10.0s): "원리는 이렇습니다... 붙여버려요" — 빈 화면에 원리 문구만 추상적으로 소개.
Scene 2 (10.0–20.0s): "예를 들어 AN APPLE... A라는 모음으로 시작하죠" — AN/APPLE 카드 등장,
letter-tag가 카드마다 뜸([모][자] / [모][자][자][자][무음]).
Scene 3 (20.0–32.0s): "이걸 따로따로 말하면... 넘어가서" — 경계 글자 N(자)·A(모)만 노랑
하이라이트, N이 슬라이드 시작(이 프레임의 홀드 포인트).
Scene 4 (32.0–42.0s): "'어 내플'처럼... 저절로 이렇게 되는 거예요" — N 흡수 완료, pron-caption
"어 내플" 조립되어 뜸, 정지.

## Frame 6 — 패턴 확장

- scene: WHERE / WERE / WE 세 단어 카드가 순서대로 나열되다가, WERE 카드가 작아지고 흐려지면서
  WHERE의 R과 WE 사이로 압축되듯 스며들어 뭉치는 애니메이션(letter-tag 없음).
- voiceover: "그럼 이게 문장 전체에서도 통하는지 볼까요? \"Where were we?\" 이 짧은 문장, 한번 들어보세요. 하나하나 또박또박 끊어 말하면 '웨어, 워, 위'인데, 원어민이 자연스럽게 말하면 '웨어루이'처럼 들려요. WERE는 문장에서 그렇게 중요한 단어가 아니라서, 힘이 빠지면서 소리가 확 줄어들어요. 그러다 보니 WHERE의 R이랑 WE 사이에서 뭉개지듯 이어지면서 '루'처럼 들리는 거죠. 아까 AN APPLE 때랑 방식은 조금 다르지만, 힘을 빼면 소리가 자연스럽게 붙는다는 원리는 여기서도 똑같이 통하는 거예요."
- duration: 32.3s (추정)
- transition_in: crossfade
- status: outline
- src: compositions/frames/06-pattern.html
- type: proof
- persuasion: Repeated pattern demonstration (with honest caveat)
- beat: 패턴 확장 카타르시스("이것도 되네?")
- blueprint: linking-diagram-shrink (frame.md §6, EP14 신규)
- focal: WERE 카드가 작아지며 사이로 스며드는 순간
- roles: WHERE/WE 카드 = foreground subject(고정) · WERE 카드 = foreground subject(약화·소멸)
- sfx: WERE 카드 흡수 완료 시 soft tick

**⚠️ 근거**: `data/youtube/audience-dna.json` — 경쟁 채널(`G5unshk12zk`) 대본 분석 실제 맹점
("Where were we?"가 왜 "웨어루이"로 들리는지 설명 누락). **⚠️ 언어학적 검증**: WERE WE는 AN
APPLE과 똑같은 자음+모음 구조가 아니다(WE는 자음 W로 시작) — WERE의 약화(weak form) 현상에 가깝다
(`SCRIPT.md` Line 6 각주, 웹 검색 검증 완료 2026-09-07). 그래서 letter-tag를 붙이지 않고 별도
모션(shrink)으로 구분한다.

narrativeRole: Frame 5에서 배운 "힘을 빼면 붙는다"는 상위 원리가 다른 형태(약화)로도 통한다는 걸
보여주되, "완전히 같은 메커니즘"이라고 과장하지 않는다 — 정직한 패턴 확장.
keyMessage: WERE처럼 안 중요한 짧은 단어는 힘이 빠지며 앞뒤 소리에 스며든다 — AN APPLE과 방식은
다르지만 "힘을 빼면 붙는다"는 원리는 같다.

Scene 1 (0.0–8.0s): "그럼 이게 문장 전체에서도... 웨어루이처럼 들려요" — WHERE/WERE/WE 카드 순서
등장.
Scene 2 (8.0–18.0s): "WERE는 문장에서... 소리가 확 줄어들어요" — WERE 카드가 서서히 작아지고
흐려지기 시작.
Scene 3 (18.0–27.0s): "그러다 보니... '루'처럼 들리는 거죠" — WERE가 WHERE·WE 사이로 완전히
스며듦(홀드), pron-caption "웨어루이" 조립.
Scene 4 (27.0–32.3s): "아까 AN APPLE 때랑... 여기서도 똑같이 통하는 거예요" — 정지.

## Frame 7 — 반전 꿀팁 (예외)

- scene: MADE와 IT을 좌우로 배치, letter-tag 전체 표시, 씬5~6의 모션과 다르게 D 글자가 통통
  튕기는 애니메이션(공이 튀는 듯한 모션, 빨강 강조). 혀끝이 톡 스치는 간단한 아이콘.
- voiceover: "그럼 예외는 없을까요? 방금 건 소리가 그냥 옆으로 넘어가서 붙는 거였잖아요. 근데 MADE IT처럼 T나 D가 낄 때는 조금 다르게 움직여요. 한번 들어보세요. MADE IT, 이걸 원어민이 편하게 말하면 '메이릿'처럼 들립니다. MADE 끝소리 D가 바로 뒤 IT의 모음과 앞 모음 사이에 끼면, 혀가 그 D 소리를 정확하게 내는 대신, 혀끝으로 톡 튕기듯이 살짝 스치고 지나가요. 그래서 D가 우리 귀에는 마치 'ㄹ' 소리처럼 들리는 거죠. 이것도 대충 하는 게 아니라, 미국 영어에서 아주 표준적으로 쓰이는 방식이에요."
- duration: 42.5s (추정)
- transition_in: cut
- status: outline
- src: compositions/frames/07-exception.html
- type: twist
- persuasion: Counter-expectation reveal → mechanistic explanation
- beat: 반전 꿀팁("근데 왜 이건 다르지?")
- blueprint: linking-diagram-bounce (frame.md §7, EP14 신규)
- focal: D가 통통 튕기며 'ㄹ' 소리로 바뀌는 순간
- roles: linking-diagram(MADE/IT) = foreground subject · letter-tag = supporting · 혀끝 아이콘 = supporting
- sfx: D 튕기는 순간 soft "boing"

**⚠️ 근거**: `data/youtube/audience-dna.json` — 경쟁 채널(`WZFLgtzV_80`) 실제 맹점("made it"의
탄설음 미설명). **⚠️ 언어학적 검증**: 실제 탄설음화되는 건 IT의 T가 아니라 MADE 끝의 D다(웹 검색
검증 완료 2026-09-07, "Flap T/D" 표준 미국 영어 규칙 — `SCRIPT.md` Line 7 코멘트에 정정 과정
기록됨). 프레임 제작 시 D 글자에 강조를 줄 것 — T가 아니다.

narrativeRole: "그럼 예외는 없을까요?"라는 직접 질문으로 도파민 3단계 공식의 3단계를 열고, 앞서
배운 "옆으로 슬라이드" 패턴과는 다른 반전(통통 튕김)을 보여줘서 "예외조차 같은 원리(힘 빼기)로
설명된다"는 채널 차별화 포인트를 만든다.
keyMessage: T/D가 모음 사이에 끼면 힘을 뺀 혀가 정확한 소리 대신 톡 튕기는 소리('ㄹ')를 낸다 —
MADE IT에서는 IT의 T가 아니라 MADE의 D가 튕긴다.

Scene 1 (0.0–8.0s): "그럼 예외는 없을까요?... T나 D가 낄 때는 조금 다르게 움직여요" — 짧은 정적
후 MADE/IT 카드 등장.
Scene 2 (8.0–18.0s): "한번 들어보세요. MADE IT... '메이릿'처럼 들립니다" — letter-tag 전체
표시([자][모][자][무음] / [모][자]).
Scene 3 (18.0–32.0s): "MADE 끝소리 D가... 마치 'ㄹ' 소리처럼 들리는 거죠" — 경계 D(자)·I(모)만
빨강 하이라이트, D가 통통 튕기는 애니메이션(홀드 포인트).
Scene 4 (32.0–42.5s): "이것도 대충 하는 게 아니라... 표준적으로 쓰이는 방식이에요" — pron-caption
"메이릿" 정착, 정지.

## Frame 8 — 미니 퀴즈

- scene: step-badge(1-4) + 질문 → 짧은 정지(무음) → linking-diagram 축소판으로 정답 공개, 4문항
  반복. 앞 2문항은 Frame 5의 slide 모션·노랑, 뒤 2문항은 Frame 7의 bounce 모션·빨강. 정답 공개 시
  경계 글자에 letter-tag+하이라이트 동일 적용(TURN[N=자] ON[O=모], CHECK[K=자] OUT[O=모],
  GET[T=자] IT[I=모], PUT[T=자] IT[I=모]).
- voiceover: "직접 맞혀보세요. TURN ON, 어떻게 이어질까요? 잠깐 생각해 보세요. N이 ON 쪽으로 넘어가서, '터논'입니다. 하나 더요. CHECK OUT은요? … K가 OUT 쪽으로 넘어가서, '체카웃'이죠. 이번엔 좀 다른 문제예요. GET IT, T가 낄 때는 어떻게 들릴까요? … 정답은 '게릿', T가 모음 사이에서 톡 튕기니까요. 마지막으로 PUT IT은요? … 정답은 '푸릿', 역시 T가 톡 튕기니까요."
- duration: 35.4s (추정)
- transition_in: crossfade
- status: outline
- src: compositions/frames/08-quiz.html
- type: interactive_pause
- persuasion: Self-test engagement
- beat: 참여 유도 → 정답 확인 안도감(4회 반복)
- blueprint: quiz-sequence (frame.md §8)
- focal: 매 문항 정답 공개 순간
- roles: 질문 문구 = supporting · linking-diagram 축소판 정답 = foreground subject · step-badge = chrome
- sfx: 매 정답 공개 시 soft chime

narrativeRole: Frame 5(slide)·6(shrink)·7(bounce)에서 배운 걸 시청자가 직접 적용해보게 해서
능동적으로 재확인시킨다 — 기본 패턴(slide) 2문항 + 예외(bounce) 2문항으로 균형을 맞춘다.
keyMessage: 배운 원리를 스스로 적용해봐야 진짜 내 것이 된다.

Scene 1 (0.0–7.0s): "직접 맞혀보세요. TURN ON... 잠깐 생각해 보세요" — step-badge "1" + TURN ON
질문, 짧은 정지.
Scene 2 (7.0–10.5s): "N이 ON 쪽으로 넘어가서, '터논'입니다" — linking-diagram-slide 축소판, 노랑.
Scene 3 (10.5–15.0s): "하나 더요. CHECK OUT은요?... '체카웃'이죠" — step-badge "2", 동일 방식
빠르게 반복.
Scene 4 (15.0–25.0s): "이번엔 좀 다른 문제예요. GET IT... '게릿'" — step-badge "3", linking-
diagram-bounce 축소판, 빨강 전환.
Scene 5 (25.0–35.4s): "마지막으로 PUT IT은요?... '푸릿'" — step-badge "4", 동일 bounce 패턴,
progress-rail 갱신.

## Frame 9 — 리스닝 트레이닝

- scene: sentence-card 4개가 세로로 하나씩 등장(EP13의 anchor+list 대신 sentence-stack — 고정
  앵커 단어가 없고 예문마다 다른 연결 패턴을 보여주므로), 재생과 동시에 연결 부분만 강조된 자막.
- voiceover: "이제 실제 속도로 들어보세요. 첫 번째. Please turn on the light. 두 번째. Let's check out the menu. 세 번째. Can you get it for me? 네 번째. Just put it there. 오늘 배운 소리들, 실제로 들어보니 어떠셨나요? 어려우시죠?"
- duration: 25.2s (추정)

**⚠️ EP11~13과 동일한 이유로 이 프레임만 단일 TTS 호출이 아니다.** 영어 예문 4개는 한글 발음
표기가 아니라 진짜 영어 텍스트를 같은 보이스 엔진에 보내 원어민 발음으로 따로 생성한 뒤 `ffmpeg
concat`으로 이어붙인다(EP11 Line 10 / EP12 Line 7 / EP13 Line 9와 동일 절차). 한국어 조각(오프닝+
서수+마무리 확인 문장)은 이 씬의 남성 보이스 그대로, 영어 예문 4개만 순수 영어 텍스트로 생성.

- transition_in: crossfade
- status: outline
- src: compositions/frames/09-listening.html
- type: proof
- persuasion: Real-audio comprehension check
- beat: 리스닝 실전 적용
- blueprint: sentence-stack (frame.md §9)
- focal: 4개 문장이 하나씩 등장하는 리듬, 연결 부분만 강조 자막
- roles: sentence-card 4개 = foreground subject · 연결 부분 인라인 색칠 = focal thread
- sfx: 없음(실제 영어 음성 자체가 콘텐츠라 효과음으로 방해하지 않음)

narrativeRole: 한글 발음 표기가 아니라 진짜 원어민 소리로 직접 시험해서, 원리가 문장 속에서도
통한다는 걸 체감시키되 "다 들리시죠?"로 단정하지 않고 어려움을 먼저 인정한다.
keyMessage: 오늘 배운 소리 규칙은 실제 속도의 문장 안에서도 똑같이 적용된다.

Scene 1 (0.0–3.0s): "이제 실제 속도로 들어보세요" 인트로.
Scene 2 (3.0–19.0s): "첫 번째... 네 번째..." — sentence-card 4개가 하나씩 등장, 연결 부분만
강조 자막(turn on/check out/get it/put it).
Scene 3 (19.0–25.2s): "오늘 배운 소리들, 실제로 들어보니 어떠셨나요? 어려우시죠?" — 전체 정지.

## Frame 10 — 따라 말해보기

- scene: Frame 8과 동일한 linking-diagram 축소판 4종이 TURN ON→CHECK OUT→GET IT→PUT IT 순서로
  반복, 매 표현 2회 조립(느리게→빠르게). 앞 둘은 노랑(slide), 뒤 둘은 빨강(bounce).
- voiceover: "자, 이제 직접해보세요. 따라하다 보면 자연스럽게 늘어 있을 거예요. TURN ON, 천천히. 터, 논 — 이어 붙이면, 터논! 다시 한 번, 좀 더 빠르게. 터논, 터논. 이번엔 CHECK OUT이에요. 체, 카웃 — 이어 붙이면, 체카웃! 다시 한 번, 좀 더 빠르게. 체카웃, 체카웃. 이번엔 예외도 같이 해볼까요? GET IT이에요. T가 모음 사이에 있으니까 톡 튕기죠. 게, 릿 — 이어 붙이면, 게릿! 다시 한 번, 좀 더 빠르게. 게릿, 게릿. 마지막으로 PUT IT. 푸, 릿 — 이어 붙이면, 푸릿! 다시 한 번, 좀 더 빠르게. 푸릿, 푸릿."
- duration: 44.8s (추정)
- transition_in: cut
- status: outline
- src: compositions/frames/10-practice.html
- type: cta_practice
- persuasion: Direct instruction + encouragement
- beat: 신체 참여 유도
- blueprint: practice-repeat (frame.md §10, EP14 신규)
- focal: 각 조립 후 2회 반복 pulse
- roles: 프롬프트 문장 = supporting · linking-diagram 축소판 = foreground subject
- sfx: 각 조립 완료 시 soft pulse tick

narrativeRole: 눈으로 보고 아는 것을 입으로 직접 내뱉게 해서 채널의 "3회 반복 낭독" 시그니처를
이 편의 방식으로 실현하고, 기본 패턴과 예외 모두를 몸으로 복습시킨다.
keyMessage: 소리 내서 말해봐야 입이 기억한다 — 기본 패턴(slide)과 예외(bounce) 모두.

Scene 1 (0.0–9.0s): "자, 이제 직접해보세요... 터논, 터논" — TURN ON diagram 조립(slide, 노랑) →
2회 pulse.
Scene 2 (9.0–18.0s): "이번엔 CHECK OUT이에요... 체카웃, 체카웃" — CHECK OUT, 동일 패턴.
Scene 3 (18.0–31.0s): "이번엔 예외도 같이 해볼까요? GET IT... 게릿, 게릿" — GET IT diagram(bounce,
빨강 전환) → 2회 pulse.
Scene 4 (31.0–44.8s): "마지막으로 PUT IT... 푸릿, 푸릿" — PUT IT, 동일 bounce 패턴.

## Frame 11 — 실생활 재확인 (페이오프)

- scene: 일상 속 영상 시청 상황을 암시하는 미니멀한 배경 위 "Where were we?" 문장이 확대되며
  단어별로 천천히 밝아지다 합쳐짐. Frame 1의 뭉개지던 문장 모션이 이번엔 선명하게 맞춰지는 대칭
  구조로 마무리.
- voiceover: "이제 영화나 유튜브를 보다가 게으른 소리가 나와도 당황하지 않으실 거예요. 예를 들어 \"Where were we?\"라는 문장도 이렇게 들리거든요. 바로 다 안 들려도 괜찮아요. 배운 대로 소리 하나씩 힘 빼고 들어보면, 웨어, 루, 이 — 웨어루이! 이렇게 시간이 걸리더라도 스스로 알아들을 수 있게 되실 거예요. 이제 단어 하나하나가 아니라, 문장으로 들리기 시작하실 겁니다."
- duration: 30.3s (추정)
- transition_in: crossfade
- status: outline
- src: compositions/frames/11-payoff.html
- type: benefit_highlight
- persuasion: Real-world payoff, honest pacing (no overclaim)
- beat: 발견의 즐거움 재확인(Frame 1의 Stakes 회수)
- blueprint: payoff-symmetric-close (frame.md §11, EP14 신규)
- focal: "Where were we?"가 완전히 선명해지는 순간(Frame 1과 정반대 방향 모션)
- roles: "Where were we?" 문장 = foreground subject · 영상 시청 배경 = supporting · 씬1 회수 = callback
- sfx: 없음(차분한 정리 톤 유지)

narrativeRole: Frame 1에서 던진 "안 들렸던 경험"을 여기서 직접 회수하되, "다 들린다"는 과장 없이
"시간이 걸리더라도 스스로 알아들을 수 있다"로 정직하게 착지한다. 확정 썸네일 카피("이제 단어가
아니라 문장이 들립니다")의 약속을 마지막 문장이 그대로 이행한다.
keyMessage: 게으른 소리가 나와도 당황하지 않고, 배운 대로 힘 빼고 들으면 스스로 알아들을 수 있다
— 이제 단어가 아니라 문장으로 들리기 시작한다.

Scene 1 (0.0–6.0s): "이제 영화나 유튜브를 보다가... 이렇게 들리거든요" — 영상 시청 배경, "Where
were we?" 문장 등장.
Scene 2 (6.0–20.0s): "바로 다 안 들려도 괜찮아요... 웨어루이!" — 문장이 단어별로 천천히 밝아지다
합쳐짐(Frame 1과 대칭, 홀드 포인트).
Scene 3 (20.0–30.3s): "이렇게 시간이 걸리더라도... 문장으로 들리기 시작하실 겁니다" — 완전히
선명해진 문장 위로 자신감 있는 톤 정착.

## Frame 12 — 요약 + 마무리

- scene: 오늘 다룬 표현(AN APPLE·Where were we·MADE IT·TURN ON/CHECK OUT/GET IT/PUT IT)이
  카드로 하나씩 쌓이며 등장해 전부 화면에 함께 남는다(EP13과 동일 관례). 이후 중앙에 "힘을 빼면,
  소리가 이어집니다" 문구가 떠오름. 특정 다음 소재 예고 없이(단편 방침) 채널 로고로 페이드아웃.
- voiceover: "오늘은 원어민이 대충 뭉개서 말하는 게 아니라, 혀에 힘을 빼고 편하게 소리를 이어 붙인다는 원리, 그리고 T나 D가 낄 때는 톡 튕기는 소리로 바뀐다는 것까지 함께 봤습니다. 이제 문장을 들을 때 예전처럼 막막하지 않으셨으면 좋겠어요. 다음에도 여러분이 자주 답답해하시는 부분, 또 풀어드릴게요. 저와 같이 하나씩 차근차근 익혀 나가시면, 어느새 훨씬 편하게 듣고 계실 거예요."
- duration: 32.6s (추정)
- transition_in: crossfade
- status: outline
- src: compositions/frames/12-summary.html
- type: branding
- persuasion: Recap + warm close
- beat: 정리 + 따뜻한 다음 기약(특정 예고 없음)
- blueprint: summary-cards (frame.md §12)
- focal: "저와 같이 하나씩 차근차근 익혀 나가시면" — 따뜻하게 닫히는 문장
- roles: 요약 카드 스택 = supporting · 마무리 문장 = foreground subject, 완전히 정착
- sfx: 없음(차분하게 완결)

**⚠️ 엔드스크린 구간**(`production-rules.md` "렌더 마지막 3초는 유튜브 엔드스크린 자리를 비워둔다"
참고): 마지막 3초(29.6~32.6s 추정 구간)는 카드 스택 애니메이션이 끝난 뒤 채널 로고 워드마크만
남기고, 우측 하단(x 1620~1920, y 910~1080)·중앙 상단(x 810~1110, y 0~170) 두 영역을 비운다.

narrativeRole: 이 편의 배움(링킹+탄설음+약화)을 요약해서 완결감을 주고, 특정 다음 소재를 예고하지
않은 채(단편 방침) 채널에 대한 신뢰와 동행감만 따뜻하게 남긴다.
keyMessage: 오늘의 배움은 여기서 완결된다. 함께 하나씩 익혀나가면 된다는 믿음만 남긴다.

Scene 1 (0.0–12.0s): "오늘은... 함께 봤습니다" — 7개 표현 카드가 하나씩 쌓이며 등장, progress-rail
100% 채워짐.
Scene 2 (12.0–20.0s): "이제 문장을 들을 때... 또 풀어드릴게요" — "힘을 빼면, 소리가 이어집니다"
문구 중앙 정착.
Scene 3 (20.0–29.6s): "저와 같이 하나씩 차근차근... 훨씬 편하게 듣고 계실 거예요" — 가장 따뜻한
웜 앰버 톤으로 전환, 채널 로고 준비.
Scene 4 (29.6–32.6s): 엔드스크린 키프아웃 구간 — 로고 워드마크만 남기고 정리, 우측 하단·중앙
상단 비움.
