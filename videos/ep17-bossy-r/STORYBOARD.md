---
format: 1920x1080
duration: 389.46s (6분 29.46초 — 15프레임 Gemini Charon TTS + whisper 실측 완료)
message: "모음 뒤에 R이 붙으면 원래 모음 소리는 완전히 사라지고 R이 소리를 지배한다. 철자는 AR, ER, IR, OR, UR 다섯 가지지만, 사실 ER, IR, UR 소리는 완전히 같으며, 전체 모음은 딱 3가지 소리 서랍으로 완벽하게 정리된다."
arc: concept-explainer with practice & bonus tip
audience: "단어마다 달라지는 모음 발음기호에 피로감을 느끼며, R이 붙은 모음을 어떻게 읽어야 할지 막막한 3060 성인 독학자"
mode: collaborative
music: 약간 빠른 템포·집중력을 높이는 BGM (data-volume="0.06"), SFX는 고급스럽고 절제된 톤
---

## Video direction

**Visual Grammar (비주얼 씽킹 & 스케치노트 인포그래픽)**:
- 사용자가 제공한 5장의 스케치노트 레퍼런스를 채널 시그니처 웜크림(`#F4EFE6`) 네오브루탈리즘 카드와 결합.
- 두툼한 3.5px 블랙 잉크 펜선, 3대 소리 서랍 컬러 코딩(AR=골드 앰버, OR=딥 오렌지, ER/IR/UR=틸 블루), 아기자기한 미니 손그림 픽토그램을 통해 '우등생의 완벽한 비밀 요약 노트' 느낌을 전달.
- 애니메이션은 power3 감속 진입, SVG 드로우온(trim-path) 화살표, 부드러운 스냅 서랍 골인 모션을 중심으로 전개.
- **채널 필수 규칙**: 나레이션 전문 무누락 자막(`caption-pill`) 전 프레임 탑재, Frame 15 끝 5초 유튜브 엔드스크린 중앙 100% 완전 비움(Keep-out Zone).

---

## Frame 1 — 도입 (Stakes) : 모음 소리 소멸 미스터리

- scene: 웜크림 베이지 배경 위에 학창시절 배운 기본 모음 단어 `cat, sit, fox`가 떴다가, 끝 자음이 R로 바뀌는 순간(`cat→car, sit→sir, fox→for`) 원래 모음 소리가 지워지는 시각적 대비.
- voiceover: "A는 '애', I는 '이', O는 '아'. 우리 분명 이렇게 배웠죠. 그런데 왜 car, sir, for에서는 그 소리가 단 하나도 안 날까요? 뒤에 붙은 R 하나가 모음 소리를 통째로 집어삼켰기 때문입니다."
- duration: 11.5s (추정)
- transition_in: cut
- status: outline
- src: compositions/frames/01-stakes.html
- type: hook
- persuasion: 호기심 자극 + 상식 뒤집기 (Cognitive Dissonance)
- beat: 충격의 선언 + 소리 배신 타격
- blueprint: sketchnote-card (3열 대칭)
- focal: `cat ➔ car`, `sit ➔ sir`, `fox ➔ for`의 모음 소리가 뒤집히는 순간 (2026-09-18: 실제
  최소 대립쌍으로 교체 — 이전 `sit➔bird`/`hot➔for`는 철자상 무관한 단어라 "단어가 R을 만나
  변신"하는 연출과 안 맞았음)
- roles: 3개 대비 카드 = foreground subject · 꿀꺽 삼키는 R 애니메이션 = focal thread · 웜크림 캔버스 = background
- sfx: 팝-팝-팝 (단어 등장) ➔ 찌릿 지직 (R 불 들어옴) ➔ 쿵 (의문 제기)
- `caption-pill`:
  - `A는 '애', I는 '이', O는 '아'. 우리 분명 이렇게 배웠죠.`
  - `그런데 왜 car, sir, for에서는 그 소리가 단 하나도 안 날까요?`
  - `뒤에 붙은 R 하나가 모음 소리를 통째로 집어삼켰기 때문입니다.`

---

## Frame 2 — 채널 인트로 (Intro) : 초고속 워드마크 리빌

- scene: 1.5초 만에 채널 워드마크가 스케일 업되며 나타난 뒤, 상단 헤더로 스무스하게 축소 이동.
- voiceover: "안녕하세요, 「이해하면 쉬운영어」입니다. 오늘은 R 뒤에서 사라진 모음의 비밀과, 딱 세 가지로 끝나는 소리 공식을 공개합니다."
- duration: 4.0s (추정)
- transition_in: smooth-morph
- status: outline
- src: compositions/frames/02-intro.html
- type: brand-hook
- persuasion: 신뢰감 및 오늘 영상의 가치 선언
- beat: 초단축 전환 (맥 끊김 방지)
- blueprint: channel-wordmark-header
- focal: `이해하면 `(딥 차콜) + `쉬운영어`(#F5C518 골드 옐로우)
- roles: 워드마크 = foreground · 토픽 뱃지 = sub-badge
- sfx: 맑은 크리스탈 차임
- `caption-pill`:
  - `안녕하세요, 「이해하면 쉬운영어」입니다.`
  - `오늘은 R 뒤에서 사라진 모음의 비밀과, 딱 세 가지로 끝나는 소리 공식을 공개합니다.`

---

## Frame 3 — 질문 던지기: 다섯 개의 발음기호 (Big Question)

- scene: 사전 페이지처럼 5개 철자(AR, ER, IR, OR, UR)와 그 아래 서로 다른 발음기호가 촘촘히
  나열되는 화면. **그룹으로 묶거나 정답을 보여주지 않는다** — "이걸 다 외워야 하나" 하는
  압박감만 조성하고 끝난다(정리·해답은 Frame 4에서 처음 공개).
- voiceover: "모음 뒤에 R이 붙은 철자는 AR, ER, IR, OR, UR, 이렇게 다섯 가지입니다. 사전을 펴보면 단어마다 발음기호가 다 다르게 표시돼 있어서, 다섯 개를 전부 외워야 할 것처럼 보이죠."
- duration: 11.0s (추정)
- transition_in: slide-up
- status: outline
- src: compositions/frames/03-five-symbols.html
- type: orientation
- persuasion: 복잡성 제시로 긴장 조성 (해소는 다음 프레임에 위임 — 30초 이탈 방어는 "곧 풀린다"는
  기대감으로 대신함)
- beat: 부담감 조성 (아직 안도감 주지 않음)
- blueprint: phonetic-symbol-wall (사전형 나열판, 그룹핑 없음)
- focal: 5개 철자와 제각각인 발음기호가 빽빽하게 채워지는 밀도감
- roles: 5개 철자 타일 = foreground · 발음기호 태그 = supporting detail · 흔들리는 물음표 아이콘 = tension cue
- sfx: 5단 틱-틱-틱-틱-틱 (철자 나열) ➔ 살짝 답답한 저음 드론
- `caption-pill`:
  - `모음 뒤에 R이 붙은 철자는 AR, ER, IR, OR, UR, 이렇게 다섯 가지입니다.`
  - `사전을 펴보면 단어마다 발음기호가 다 다르게 표시돼 있어서,`
  - `다섯 개를 전부 외워야 할 것처럼 보이죠.`

> **2026-09-18 재구성**: 기존엔 이 프레임에서 이미 "딱 세 가지 소리로 정리됩니다"라며 5→3
> 서랍 합체 연출까지 보여줬음 — 그러면 바로 다음 Frame 4의 "가장 놀라운 건 이 세 가지입니다"가
> 같은 말을 반복하는 셈이 되어 반전이 스포일러됨. `sound-drawer` 컴포넌트와 숫자 반전은
> Frame 4로 이동, 이 프레임은 순수하게 "복잡해 보인다"는 긴장만 남김.

---

## Frame 4 — 반전 공개 (Head Fake) : 다섯 개가 사실 세 개였다

- scene: 1단계 — `her, bird, fur` 세 단어가 서로 다른 파스텔 색으로 떴다가, 모음 부분이 하나로
  겹쳐지며 `[ 편안한 '어~ r' ]` 황금빛 캡슐로 합체. 2단계 — 이 합체 캡슐 + AR + OR이 3분할
  '소리 서랍' 인포그래픽으로 정리되며, Frame 3에서 봤던 5개 철자 나열판이 다시 소환되어 3개
  서랍 안으로 자석처럼 빨려 들어가는 모션으로 "5개 철자 → 3개 소리"라는 숫자가 여기서 처음
  화면에 등장.
- voiceover: "사실 이 다섯 가지, 전부 외울 필요 없습니다. 그중 ER, IR, UR 이 세 가지는 철자만 다를 뿐 소리가 완전히 똑같거든요. her, bird, fur. 철자는 E, I, U로 다르지만, 소리는 셋 다 편안한 '어~' 하나입니다. 그러니까 진짜 외워야 할 소리는 AR, OR, 그리고 이 '어~'까지, 딱 세 가지뿐입니다."
- duration: 24.0s (추정)
- transition_in: dissolve
- status: outline
- src: compositions/frames/04-head-fake.html
- type: dopamine-reveal
- persuasion: 첫 번째 반전 카타르시스 (외울 것이 다섯 개에서 세 개로 확 줄어듦 — 숫자 반전이
  여기서 처음 공개됨)
- beat: 놀라움 + 확신 + 안도감
- blueprint: 3열 카드 머지(Merge) 컴포넌트 + sound-drawer (3분할 인포그래픽 서랍, Frame 3에서 이동)
- focal: E, I, U 세 글자가 '어~' 캡슐로 합체되는 순간 → 그 캡슐이 AR·OR과 나란히 3개 서랍으로
  정리되는 순간
- roles: 3개 단어 카드 = foreground · 황금빛 융합 광채 = focal accent · 3개 서랍(골드, 오렌지, 틸) = payoff visual
- sfx: 카드 셔플 ➔ 스르륵 스윕 ➔ 락(Lock) 사운드 ➔ 3단 착-착-착 서랍 골인 사운드
- `caption-pill`:
  - `사실 이 다섯 가지, 전부 외울 필요 없습니다.`
  - `그중 ER, IR, UR 이 세 가지는 철자만 다를 뿐 소리가 완전히 똑같거든요. her, bird, fur.`
  - `철자는 E, I, U로 다르지만, 소리는 셋 다 편안한 '어~' 하나입니다.`
  - `그러니까 진짜 외워야 할 소리는 AR, OR, 그리고 이 '어~'까지, 딱 세 가지뿐입니다.`

> **2026-09-18 재구성**: `sound-drawer` 정리 비주얼과 "5→3" 숫자 반전을 Frame 3에서 이리로
> 옮겨, 이 영상의 핵심 반전이 여기서 **처음** 공개되도록 수정. 텍스트가 길어져 duration
> 16.5초→24.0초로 증가(뒤 프레임 시작 시각 전부 +5.5초 밀림, SCRIPT.md 참고).

---

## Frame 5 — 원리 설명 (Core Principle) : 게으른 혀의 움직임

- scene: 친근한 2D 플랫 입안 단면 스케치(레퍼런스 image.png 스타일). 혀가 R을 소리 내려고 먼저 뒤로 쑥 물러나면서 앞 모음 소리가 R의 공간으로 흡수되는 모션.
- voiceover: "원리는 간단합니다. 혀가 R을 발음하기 위해 너무 일찍 움직이기 때문입니다. 모음의 입 모양을 채 만들기도 전에, 혀가 R 소리를 내려고 뒤로 쑥 물러나 버립니다. 결국 모음의 원래 소리는 혀의 큰 움직임에 녹아서 R 소리로 바뀌는 겁니다."
- duration: 18.0s (추정)
- transition_in: zoom-in
- status: outline
- src: compositions/frames/05-principle.html
- type: anatomical-metaphor
- persuasion: 신체 감각을 통한 원리 납득 (게으른 혀 공식)
- beat: 이해의 순간 (Aha-moment)
- blueprint: tongue-mechanism-sketch
- focal: 혀가 뒤로 당겨지며 모음 글자가 R로 흡수되는 순간
- roles: 입안 단면 일러스트 = center subject · 빨간 점선 흡수 화살표 = dynamic guide
- sfx: 슈우욱 (흡수 사운드) ➔ 안정된 딥 베이스 톤
- `caption-pill`:
  - `원리는 간단합니다. 혀가 R을 발음하기 위해 너무 일찍 움직이기 때문입니다.`
  - `모음의 입 모양을 채 만들기도 전에, 혀가 R 소리를 내려고 뒤로 쑥 물러나 버립니다.`
  - `결국 모음의 원래 소리는 혀의 큰 움직임에 녹아서 R 소리로 바뀌는 겁니다.`

---

## Frame 6 — 1번 서랍 AR 실전 낭독 (Practice AR)

- scene: 1번 골드 서랍이 활짝 열리며 턱이 툭 떨어지는 입 모양 가이드와 5대 실전 단어(`car, park, star, farm, card`) 쇼케이스.
- voiceover: "첫 번째 AR 소리는 턱을 툭 떨어뜨리는 시원한 '아~' 소리입니다. A의 원래 소리 대신 입안을 넓게 열고 소리를 냅니다. 함께 소리 내보실까요? car, park, star, farm, card. 턱에 힘을 풀고 '아~' 하고 소리 내면 저절로 읽힙니다."
- duration: 27.0s (추정)
- transition_in: drawer-open
- status: outline
- src: compositions/frames/06-practice-ar.html
- type: repetition-training
- persuasion: 직접 발화 경험을 통한 턱의 근육 기억 형성
- beat: 시원함 + 성공 경험
- blueprint: sound-drawer (골드 앰버) + 5대 단어 그리드
- focal: 턱이 떨어지는 일러스트 + 5개 단어 순차 낭독 비트
- roles: 5대 단어 카드 = foreground · 미니 픽토그램(차, 공원, 별, 농장, 카드) = icon accent
- sfx: 딩-딩-딩-딩-딩 (단어 하이라이트) ➔ 편안한 어쿠스틱 스트럼
- `caption-pill`:
  - `첫 번째 AR 소리는 턱을 툭 떨어뜨리는 시원한 '아~' 소리입니다.`
  - `A의 원래 소리 대신 입안을 넓게 열고 소리를 냅니다.`
  - `함께 소리 내보실까요? car, park, star, farm, card.`
  - `턱에 힘을 풀고 '아~' 하고 소리 내면 저절로 읽힙니다.`

---

## Frame 7 — 2번 서랍 OR 실전 낭독 (Practice OR)

- scene: 2번 오렌지 서랍이 열리며 입술을 둥글게 모으는 가이드와 5대 단어(`for, corn, storm, fork, horse`) 쇼케이스.
- voiceover: "두 번째 OR 소리는 입술을 동그랗게 모으는 깊은 '오~' 소리입니다. O 뒤에 R이 오면 입술 끝으로 둥글게 모여 울립니다. 직접 소리 내보세요. for, corn, storm, fork, horse. 촛불을 불듯이 입술을 모으고 깊게 '오~' 하고 소리 냅니다."
- duration: 27.0s (추정)
- transition_in: drawer-open
- status: outline
- src: compositions/frames/07-practice-or.html
- type: repetition-training
- persuasion: 입술 모으기 동작을 통한 깊은 공명음 체득
- beat: 집중 + 울림
- blueprint: sound-drawer (딥 오렌지) + 5대 단어 그리드
- focal: 둥근 입술 일러스트 + 동심원 음파 링
- roles: 5대 단어 카드 = foreground · 미니 픽토그램(옥수수, 폭풍, 포크 등) = icon accent
- sfx: 공명 차임 5회 ➔ 부드러운 바람 스위시
- `caption-pill`:
  - `두 번째 OR 소리는 입술을 동그랗게 모으는 깊은 '오~' 소리입니다.`
  - `O 뒤에 R이 오면 입술 끝으로 둥글게 모여 울립니다.`
  - `직접 소리 내보세요. for, corn, storm, fork, horse.`
  - `촛불을 불듯이 입술을 모으고 깊게 '오~' 하고 소리 냅니다.`

---

## Frame 8 — 3번 서랍 ER·IR·UR 실전 낭독 (Practice ER·IR·UR)

- scene: 3번 틸 서랍이 웅장하게 열리며 6대 단어(`person, term, girl, shirt, nurse, burn`)가 2x3 매트릭스로 배열되고, 모음 부분이 동시에 황금빛으로 통일 점등.
- voiceover: "마지막 ER, IR, UR 소리는 입에 힘을 툭 뺀 중립의 '어~' 소리입니다. 철자가 E든, I든, U든 전혀 상관없습니다. person, term, girl, shirt, nurse, burn. 입꼬리에 힘을 풀고 멍하니 '어~' 소리만 내시면 됩니다."
- duration: 29.0s (추정)
- transition_in: drawer-open
- status: outline
- src: compositions/frames/08-practice-er.html
- type: repetition-training
- persuasion: 철자 공포증 완전 해소 (셋 다 같은 소리!)
- beat: 극상의 편안함과 안도감
- blueprint: sound-drawer (틸 블루) + 2x3 매트릭스
- focal: E, I, U 서로 다른 철자가 똑같은 '어~'로 동시 점등되는 순간
- roles: 6개 단어 매트릭스 = foreground · 체크마크 도장 = validation
- sfx: 하프 아르페지오 ➔ 톡-톡-톡 타건음
- `caption-pill`:
  - `마지막 ER, IR, UR 소리는 입에 힘을 툭 뺀 중립의 '어~' 소리입니다.`
  - `철자가 E든, I든, U든 전혀 상관없습니다.`
  - `person, term, girl, shirt, nurse, burn.`
  - `입꼬리에 힘을 풀고 멍하니 '어~' 소리만 내시면 됩니다.`

---

## Frame 9 — 반전 꿀팁 코너 (Bonus Tip) : 앞 R vs 뒤 R

- scene: 화면 좌우 대비 다이어그램. 왼쪽 `red`(모음 앞 R: 밖으로 뻗어나가는 '우~' 화살표) vs 오른쪽 `car`(모음 뒤 R: 안으로 쏙 당겨지는 흡수 화살표).
- voiceover: "여기서 잠깐, 정말 중요한 꿀팁 하나 짚고 갈까요? red처럼 모음 앞에 오는 R과, car처럼 모음 뒤에 오는 R은 소리가 완전히 다릅니다. 앞에 오는 R은 혀를 둥글게 '우~'로 밀어내고, 뒤에 오는 R은 모음의 꼬리를 낚아채서 뒤로 당깁니다. 이 차이만 알아도 영어 소리가 훨씬 쉬워집니다."
- duration: 28.0s (추정)
- transition_in: side-split
- status: outline
- src: compositions/frames/09-bonus-tip.html
- type: insider-insight
- persuasion: 영어 R 발음의 전체 지도 완성 (지적 포만감 제공)
- beat: 무릎을 탁 치는 지적 쾌감
- blueprint: 좌우 듀얼 대비 스케치노트 카드
- focal: 밖으로 뻗는 화살표 vs 안으로 당기는 화살표
- roles: red 카드 & car 카드 = foreground · 방향성 화살표 = focal guide
- sfx: 아이디어 전구 핑! ➔ 방향성 스위시 사운드 2회
- `caption-pill`:
  - `여기서 잠깐, 정말 중요한 꿀팁 하나 짚고 갈까요?`
  - `red처럼 모음 앞에 오는 R과, car처럼 모음 뒤에 오는 R은 소리가 완전히 다릅니다.`
  - `앞에 오는 R은 혀를 둥글게 '우~'로 밀어내고, 뒤에 오는 R은 모음의 꼬리를 낚아채서 뒤로 당깁니다.`
  - `이 차이만 알아도 영어 소리가 훨씬 쉬워집니다.`

---

## Frame 10 — 실전 훈련 1-1 (Quiz Round 1)

- scene: 상단 3대 미니 서랍. 중앙 퀴즈 카드에 `smart`, `short`, `turn`이 순차 등장하며 3초 타이머 게이지 바가 줄어들고 해당 서랍으로 골인.
- voiceover: "원리를 배웠으니 직접 맞춰보세요. 단어가 나오면 몇 번 서랍인지 3초 안에 소리 내보세요. smart! 턱을 내리는 1번 AR 소리죠. short! 입술을 모으는 2번 OR 소리입니다. turn! 힘을 뺀 3번 소리입니다. 아주 잘하셨습니다!"
- duration: 28.0s (추정)
- transition_in: scale-bounce
- status: outline
- src: compositions/frames/10-quiz-1.html
- type: interactive-test
- persuasion: 능동적 참여와 즉각적 피드백을 통한 자신감 부여
- beat: 몰입 + 긴장감 + 정답 쾌감
- blueprint: quiz-countdown-board
- focal: 3-2-1 카운트다운 게이지 축소 및 서랍 골인
- roles: 퀴즈 단어 = center card · 3대 서랍 = target slots
- sfx: 째깍-째깍-째깍 (카운트다운) ➔ 딩동댕 (정답 차임벨 3회)
- `caption-pill`:
  - `원리를 배웠으니 직접 맞춰보세요.`
  - `단어가 나오면 몇 번 서랍인지 3초 안에 소리 내보세요.`
  - `smart! 턱을 내리는 1번 AR 소리죠.`
  - `short! 입술을 모으는 2번 OR 소리입니다.`
  - `turn! 힘을 뺀 3번 소리입니다. 아주 잘하셨습니다!`

---

## Frame 11 — 실전 훈련 1-2 (Quiz Round 2 Speed)

- scene: 한 단계 빠른 템포의 스피드 퀴즈. `dark`, `fork`, `first`가 번개처럼 연속 등장하며 정답 도장이 쾅쾅쾅 찍히는 파티클 이펙트.
- voiceover: "이번엔 조금 더 빠른 속도로 2라운드에 도전해 볼까요? dark! 턱을 내리는 AR 소리죠. fork! 입술을 모으는 OR 소리입니다. first! 힘을 뺀 IR 소리입니다. 망설임 없이 바로 맞추셨다면 성공입니다!"
- duration: 28.0s (추정)
- transition_in: flash-cut
- status: outline
- src: compositions/frames/11-quiz-2.html
- type: fast-test
- persuasion: 무의식적 직관 발화 도달 (체득 완성)
- beat: 성취감 극대화
- blueprint: speed-stamp-board
- focal: 단어가 서랍으로 착착 날아들며 찍히는 빨간 합격 도장
- roles: 스피드 카드 3종 = foreground · 폭죽 스파클 = celebration
- sfx: 빠른 틱-틱-틱 ➔ 도장 쾅! 쾅! 쾅! ➔ 승리 징글
- `caption-pill`:
  - `이번엔 조금 더 빠른 속도로 2라운드에 도전해 볼까요?`
  - `dark! 턱을 내리는 AR 소리죠.`
  - `fork! 입술을 모으는 OR 소리입니다.`
  - `first! 힘을 뺀 IR 소리입니다.`
  - `망설임 없이 바로 맞추셨다면 성공입니다!`

---

## Frame 12 — 실전 훈련 2-1 (Sentence 1)

- scene: 실전 문장 `The [ girl ] in the [ car ] is waiting [ for ] her [ turn ].`이 등장하며 4개 단어의 소리 태그가 순차적으로 하이라이트.
- voiceover: "이제 문장으로 확인해 볼까요? 우리가 배운 세 가지 소리가 한 문장에 다 들어있습니다. The girl in the car is waiting for her turn. girl의 '어', car의 '아', for의 '오', turn의 '어'. 이제 단어가 저절로 구별되시죠?"
- duration: 28.0s (추정)
- transition_in: slide-left
- status: outline
- src: compositions/frames/12-sentence-1.html
- type: contextual-reading
- persuasion: 단어에서 실전 문장으로의 완벽한 확장
- beat: 연결감 + 문장 리딩 자신감
- blueprint: reading-scanner-card
- focal: 문장 위를 흐르는 리딩 스캔 바와 4대 소리 태그
- roles: 문장 카드 = center hero · 컬러 태그 = phonetic guide
- sfx: 톡-톡-톡-톡 (단어 짚기) ➔ 글로켄슈필 아르페지오
- `caption-pill`:
  - `이제 문장으로 확인해 볼까요?`
  - `우리가 배운 세 가지 소리가 한 문장에 다 들어있습니다.`
  - `The girl in the car is waiting for her turn.`
  - `girl의 '어', car의 '아', for의 '오', turn의 '어'.`
  - `이제 단어가 저절로 구별되시죠?`

---

## Frame 13 — 실전 훈련 2-2 (Sentence 2)

- scene: 일상 외래어 문장 `Please [ order ] a [ burger ] and [ corn ] for the [ party ].`가 등장하고, 매일 쓰던 외래어가 Bossy R 공식으로 자연스럽게 읽히는 애니메이션.
- voiceover: "한 문장만 더 읽어보겠습니다. 이번엔 우리가 매일 쓰는 단어들이 들어있습니다. Please order a burger and corn for the party. order와 corn의 '오', burger의 '어', party의 '아'. 이제 외래어를 보셔도 원래 소리가 한눈에 보이실 겁니다."
- duration: 28.0s (추정)
- transition_in: fade
- status: outline
- src: compositions/frames/13-sentence-2.html
- type: contextual-reading
- persuasion: 일상 외래어(버거, 파티, 주문)와 파닉스 공식의 소름 돋는 연결감
- beat: 완결된 리딩 쾌감 + 현실 적용
- blueprint: flow-reading-block
- focal: order, burger, corn, party 4대 단어의 소리 태그 하이라이트
- roles: 문장 카드 = foreground · 완성 배지 = achievement badge
- sfx: 차분하고 세련된 피아노 코드 진행 ➔ 맑은 벨 차임
- `caption-pill`:
  - `한 문장만 더 읽어보겠습니다. 이번엔 우리가 매일 쓰는 단어들이 들어있습니다.`
  - `Please order a burger and corn for the party.`
  - `order와 corn의 '오', burger의 '어', party의 '아'.`
  - `이제 외래어를 보셔도 원래 소리가 한눈에 보이실 겁니다.`

---

## Frame 14 — 체득 요약 (Summary Map) : 캡처 소장용 족보표

- scene: 레퍼런스(image copy 2, 3) 스타일의 3단 마스터 인포그래픽 표. AR, OR, ER/IR/UR의 공식과 대표 단어들이 한눈에 들어오는 핸드드로운 족보.
- voiceover: "오늘 배운 규칙, 이 한 장만 기억하세요. AR 소리는 턱 내리는 '아', OR 소리는 입술 모으는 '오', ER, IR, UR 소리는 힘 뺀 '어'. 다섯 개 철자가 단 세 개 소리로 끝납니다. 화면을 캡처해 두고 단어를 읽을 때마다 꺼내보세요."
- duration: 26.0s (추정)
- transition_in: scale-up
- status: outline
- src: compositions/frames/14-summary.html
- type: cheat-sheet-payoff
- persuasion: 평생 소장 가치 부여 (스크린샷 유도)
- beat: 완결성 + 감사한 마음
- blueprint: sketchnote-master-board
- focal: 3행 인포그래픽 표와 깜빡이는 카메라 셔터 아이콘
- roles: 족보 카드 = total screen · 캡처 안내 배지 = action trigger
- sfx: 묵직한 마스터 카드 착지 ➔ 도-미-솔 차임 ➔ 카메라 셔터 찰칵!
- `caption-pill`:
  - `오늘 배운 규칙, 이 한 장만 기억하세요.`
  - `AR 소리는 턱 내리는 '아', OR 소리는 입술 모으는 '오', ER, IR, UR 소리는 힘 뺀 '어'.`
  - `다섯 개 철자가 단 세 개 소리로 끝납니다.`
  - `화면을 캡처해 두고 단어를 읽을 때마다 꺼내보세요.`

---

## Frame 15 — 클로징 (Closing & End Screen)

- scene: 
  - 0.0s ~ 18.0s: 중앙 격려 카드("무작정 외우지 마세요")와 EP16 추천 영상 안내 카드 노출.
  - **18.0s ~ 23.0s (끝 5초 — 채널 절대 규칙)**: **화면 중앙 완전 비움(Keep-out Zone)**. 중앙의 모든 카드와 자막이 페이드아웃되어 100% 텅 빈 클린 캔버스가 되고, 좌상단(`left: 6cqw; top: 8cqh`)에 미니 워드마크만 조용히 유지.
- voiceover: "단어는 무작정 외우는 게 아니라 소리의 길을 이해하는 겁니다. 지난 모음 편도 함께 보시면 영어가 훨씬 쉬워집니다. 오늘도 수고 많으셨습니다. 이해하면 쉬운영어였습니다."
- duration: 23.0s (추정, 끝 5초 화면 중앙 비움 구간 포함)
- transition_in: fade
- status: outline
- src: compositions/frames/15-closing.html
- type: closing-retention
- persuasion: 다음 영상(EP16)으로의 유입 + 브랜드 애착 형성
- beat: 따뜻한 여운과 배웅
- blueprint: clean-endscreen-canvas
- focal: 끝 5초간 유튜브 추천 카드/구독 버튼이 차지할 화면 중앙의 여백
- roles: 좌상단 미니 워드마크 = safe anchor · 중앙 여백 = youtube UI space
- sfx: 따뜻한 피아노 엔딩 코드 ➔ BGM 자연스러운 페이드아웃
- `caption-pill` (0.0s ~ 18.0s까지만 표시, 끝 5초는 화면 비움):
  - `단어는 무작정 외우는 게 아니라 소리의 길을 이해하는 겁니다.`
  - `지난 모음 편도 함께 보시면 영어가 훨씬 쉬워집니다.`
  - `오늘도 수고 많으셨습니다. 이해하면 쉬운영어였습니다.`
