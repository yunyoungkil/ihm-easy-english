---
format: 1920x1080
duration: 506.18s (8분 26.18초 — 11프레임, Google AI Studio(Gemini) TTS 실측 완료
  2026-10-01, `ffprobe` 직접 측정. 이전 Voicebox 실측치(446.60s)는 Voicebox 프로필
  소실 사고로 폐기된 구버전 음성 기준이라 더 이상 유효하지 않음 — SCRIPT.md의 각
  Line `**Time:**`과 100% 동일한 값으로 2026-10-01 동기화)
message: "모음 사이에 낀 T는 원래 입천장에 딱 붙였다 떼는 소리인데, 뒤에 오는 모음에 힘이 빠져
  있으면 혀가 굳이 거기서 멈추지 않고 톡 스치듯 지나간다 — 그 결과가 water/city/better를
  워러/시리/베러로 만드는 것이고, 이 하나의 '게으른 혀' 원리가 T 뒤 음절에 강세가 오는
  딱 하나의 예외까지 전부 설명한다"
arc: dialogue-hook ➔ big-question ➔ lazy-tongue-principle ➔ pattern-expansion+writer-rider-twist
  ➔ practice-drill ➔ sentence-listening-transfer ➔ stress-exception ➔ nt-cluster-bonus
  ➔ quiz ➔ cheatsheet ➔ closing-with-friend-callback
audience: "혀에 힘이 들어가 원어민처럼 부드럽게 안 굴러가는 4060 성인 학습자 — 버터발음을
  흉내 내려다 오히려 어색해지는 사람들"
mode: collaborative
music: 약간 빠른 템포·집중력을 높이는 BGM (data-volume="0.06"), SFX는 절제된 톤 — 이 에피소드는
  EP20류 충격/멘붕 리액션이 없는 차분한 개념 설명이라 impact 계열 SFX는 쓰지 않는다.
---

## Video direction

**Visual Grammar — 순수 타이포그래피/카드 시스템 (EP19 계승, 캐릭터 리액션 없음)**:
- 이 에피소드는 EP20류 캐릭터 스톱모션이 아니라 EP19류 "단어가 화면의 주인공" 개념 설명이다.
  일러스트는 Line 3(조음 원리)에만 쓴다 — `frame.md`의 `mouth_full_stop`/`mouth_flap` 한 쌍.
- **2색 강조 체계**: `{colors.flap-gold}`(플랩 발생, 오늘 배운 지름길이 통함) vs
  `{colors.no-flap-red}`(예외, 안 통함). 시청자가 색만 보고도 "이건 되고 이건 안 된다"를
  즉시 구분한다 — 별도 텍스트 라벨 없이도 통하는 걸 목표로 한다.
- **모바일 퍼스트 가독성**: 핵심 영단어 `{typography.hero-word}`(Archivo Black, 6.8cqw).
- **채널 필수 규칙 준수**:
  * 나레이션 전문 무누락 자막(`caption-pill`) 전 프레임 탑재 — Line 11 끝 5초 제외.
  * Line 9 퀴즈는 3초 카운트다운 중 정답 시각적 선노출 완전 차단.
  * Line 5 3회 반복 낭독 구간에 진행 점(●●●) 펄스 비트 부여.
  * Line 6 실전 문장은 밑줄+한글 발음 페이드인으로 표시, 빈칸 라운드는 퀴즈와 다른
    "뒤집기(flip)" 모션으로 시각적으로 구분.
  * Line 11 끝 5초 유튜브 엔드스크린 keep-out(화면 중앙 완전 비움, 워드마크 좌상단).
  * 화면 어디에도 내부 에피소드 번호(EP21 등) 노출 금지 — 직전 편은 "게으른 혀 이야기"로만 지칭.
- **GSAP 사용 요소에 CSS `transition` 병행 금지**(EP17 Frame 6~8 seek-비결정성 재발 방지).
- **영문 알파벳 강조 span**에는 `font-variant-ligatures: none`(EP17 Frame 11 "fi" 리게이처 버그).

---

## Frame 1 — 콜드 오픈: 친구의 배신감 스토리 (Cold Open / Stakes)

- scene: `dialogue-bubble-pair` — 친구 말풍선("씨티은행 어디예요?", 회색) → 화자 말풍선
  ("시, 티, 이렇게 읽었어?", 골드 테두리) → 친구 말풍선 아래 "스펠링이 C-I-T-Y인데" 재등장.
  후반 `CITY` 대형 텍스트가 중앙에 뜨고 `시티` 위에 취소선, 옆에 `시리`가 골드로 점등되며 대비.
- voiceover: "City, 사전에서 배운 대로 또박또박 "시티"라고 읽으셨다면, 사실 완벽하게 속으신 겁니다. 저도 얼마 전에 친구한테 이 얘기를 들었어요. 여행 갔다가 미국인한테 씨티은행이 어디냐고 물어봤는데, 한 번에 못 알아듣더래요. 그래서 제가 물어봤죠, 혹시 시, 티, 이렇게 또박또박 읽었냐고요. 친구는 당연하다는 듯 말하더라고요, 스펠링이 C, I, T, Y인데 그럼 어떻게 읽냐고요. 그 말을 듣고 나서 저는 원어민들이 이 단어를 실제로 말할 때 입을 어떻게 움직이는지, 슬로모션 영상만 수십 개를 뜯어봤습니다. 결과는 저도 충격이었어요. 열에 아홉은 "시티"가 아니라 "시리"에 가깝게 말하고 있더라고요."
- duration: 42.56s
- transition_in: cut
- status: script_approved
- src: compositions/frames/01-cold-open.html
- type: hook (Stakes — 공감+호기심+이득, Proof of Work 포함)
- blueprint: dialogue-bubble-pair + word-transform-card
- focal: 친구/화자 말풍선 대화와 CITY→시리 대비
- sfx: pop(말풍선 등장 x2) ➔ click-soft(CITY 텍스트 등장) ➔ chime(시리 골드 점등)
- `caption-pill`:
  - `City, 사전에서 배운 대로 또박또박 "시티"라고 읽으셨다면, 사실 완벽하게 속으신 겁니다.`
  - `저도 얼마 전에 친구한테 이 얘기를 들었어요.`
  - `여행 갔다가 미국인한테 씨티은행이 어디냐고 물어봤는데, 한 번에 못 알아듣더래요.`
  - `그래서 제가 물어봤죠, 혹시 시, 티, 이렇게 또박또박 읽었냐고요.`
  - `친구는 당연하다는 듯 말하더라고요, 스펠링이 C, I, T, Y인데 그럼 어떻게 읽냐고요.`
  - `그 말을 듣고 나서 저는 원어민들이 이 단어를 실제로 말할 때 입을 어떻게 움직이는지, 슬로모션 영상만 수십 개를 뜯어봤습니다.`
  - `결과는 저도 충격이었어요. 열에 아홉은 "시티"가 아니라 "시리"에 가깝게 말하고 있더라고요.`

---

## Frame 2 — Big Question: 대체 입 속에서 무슨 일이?

- scene: 채널 워드마크 3초 노출 후 상단 이동. 중앙에 `T` 알파벳이 크게 떠 있다가 흔들리며
  `?`로 바뀜. 하단 골드 캡슐로 이득 제시.
- voiceover: "스펠링은 분명 T인데, 왜 소리는 자꾸 리을처럼 들릴까요? 오늘 이 원리 하나만 알아두시면, water도 better도, 처음 보는 단어까지 사전 찾아볼 필요 없이 입에서 바로 자연스럽게 나오게 됩니다."
- duration: 16.08s
- transition_in: smooth-morph
- status: script_approved
- src: compositions/frames/02-big-question.html
- type: big-question
- blueprint: channel-wordmark-header + hero-word-shake
- focal: `T` → `?` 흔들림 모션
- sfx: chime(워드마크) ➔ click-soft(T→? 전환)
- `caption-pill`:
  - `스펠링은 분명 T인데, 왜 소리는 자꾸 리을처럼 들릴까요?`
  - `오늘 이 원리 하나만 알아두시면,`
  - `water도 better도, 처음 보는 단어까지 사전 찾아볼 필요 없이 입에서 바로 자연스럽게 나오게 됩니다.`

---

## Frame 3 — 원리 발견: 혀가 스치듯 지나가는 소리 지름길 (Head Fake)

- scene: 좌측(또는 상단)에 `mouth_full_stop` 일러스트 → 나레이션이 "그런데 이 T가..."에
  이르면 `mouth_flap`으로 크로스페이드/모핑(EP17 Frame 5 방식). 우측(또는 하단)에
  `word-transform-card` 3장 세로 배치: water→워러, city→시리, better→베러.
- voiceover: "원어민 혀도 원래는 T를 낼 때 입천장에 딱 붙였다가 떼면서 "탁" 하고 끊어야 합니다. 그런데 이 T가 모음과 모음 사이에 딱 끼고, 뒤에 오는 모음에 힘까지 빠져 있으면, 혀가 굳이 거기서 멈추질 않거든요. 입천장을 톡 스치듯 지나가버리는 거죠. 그 스치는 소리가 우리 귀에는 리을이나 약한 디귿처럼 들리는 겁니다. 그래서 water는 워터가 아니라 워러, city는 시티가 아니라 시리, better는 베터가 아니라 베러가 됩니다. 저도 이 원리를 알기 전에는 이 세 단어를 각각 따로 외우고 있었는데, 알고 보니까 셋 다 똑같은 이유 하나였더라고요."
- duration: 38.56s
- transition_in: cut
- status: script_approved
- src: compositions/frames/03-lazy-tongue-principle.html
- type: head-fake (원리 발견 — 제목·썸네일 약속을 여기서 지킴)
- blueprint: mouth-illustration-morph + word-transform-card x3
- focal: 혀가 붙었다 떼는 것 vs 스치는 것의 일러스트 대비, water/city/better 3단 전환
- sfx: click-soft(mouth 일러스트 전환) ➔ pop x3(카드 등장) ➔ chime x3(골드 발음 전환)
- `caption-pill`:
  - `원어민 혀도 원래는 T를 낼 때 입천장에 딱 붙였다가 떼면서 "탁" 하고 끊어야 합니다.`
  - `그런데 이 T가 모음과 모음 사이에 딱 끼고, 뒤에 오는 모음에 힘까지 빠져 있으면, 혀가 굳이 거기서 멈추질 않거든요.`
  - `입천장을 톡 스치듯 지나가버리는 거죠.`
  - `그 스치는 소리가 우리 귀에는 리을이나 약한 디귿처럼 들리는 겁니다.`
  - `그래서 water는 워터가 아니라 워러, city는 시티가 아니라 시리, better는 베터가 아니라 베러가 됩니다.`
  - `저도 이 원리를 알기 전에는 이 세 단어를 각각 따로 외우고 있었는데, 알고 보니까 셋 다 똑같은 이유 하나였더라고요.`

---

## Frame 4 — 패턴 확장: 어? 이것도 되네? + 소름 돋는 반전

- scene: `word-transform-card` 4장(matter/pretty/thirty/letter) 순서대로 팝업. 후반 화면이
  좌우로 나뉘며 `writer`/`rider`가 등장, 가운데로 모여 거의 겹치며 둘 다 골드 `-러-`로 수렴.
- voiceover: "그럼 편지 쓸 때 자주 쓰는 letter처럼, 다른 단어에도 이 지름길이 통할까요? matter는 매터가 아니라 매러, pretty는 프리티가 아니라 프리디, thirty는 써티가 아니라 써리, letter는 레터가 아니라 레러가 됩니다. 전부 같은 이유예요. 모음 사이에 낀 T 뒤에 힘 빠진 모음이 오면, 혀가 스치고 지나가는 것뿐이거든요. 그런데 여기서 진짜 놀라운 사실이 하나 있습니다. write의 T도, ride의 D도 모음 사이에서는 똑같이 이 혀 스치는 소리로 바뀌어요. 그래서 글 쓰는 사람 writer와 자전거 타는 사람 rider는, 실제 원어민 발음에서는 거의 구분이 안 될 정도로 비슷하게 들립니다."
- duration: 46.08s
- transition_in: slide-left
- status: script_approved
- src: compositions/frames/04-pattern-expansion.html
- type: pattern-expansion (2단계 도파민)
- blueprint: word-transform-card x4 + writer-rider-converge
- focal: writer/rider가 거의 겹치는 수렴 모션
- sfx: pop x4(단어 카드) ➔ whoosh(writer/rider 수렴) ➔ chime(수렴 완료)
- `caption-pill`:
  - `그럼 편지 쓸 때 자주 쓰는 letter처럼, 다른 단어에도 이 지름길이 통할까요?`
  - `matter는 매터가 아니라 매러, pretty는 프리티가 아니라 프리디, thirty는 써티가 아니라 써리, letter는 레터가 아니라 레러가 됩니다.`
  - `전부 같은 이유예요. 모음 사이에 낀 T 뒤에 힘 빠진 모음이 오면, 혀가 스치고 지나가는 것뿐이거든요.`
  - `그런데 여기서 진짜 놀라운 사실이 하나 있습니다.`
  - `write의 T도, ride의 D도 모음 사이에서는 똑같이 이 혀 스치는 소리로 바뀌어요.`
  - `그래서 글 쓰는 사람 writer와 자전거 타는 사람 rider는, 실제 원어민 발음에서는 거의 구분이 안 될 정도로 비슷하게 들립니다.`

---

## Frame 5 — 직접 소리내보기 (3라운드: 기본 → 패턴확장 → writer/rider+속도업)

- scene: `practice-progress-card` — 1라운드(water/city/better 3장) → 2라운드(matter/
  pretty/thirty/letter 4장, 1라운드는 옆으로 밀려나 축소) → 3라운드(writer/rider 카드가
  거의 겹치듯 등장, 이어서 진행 점 애니메이션 속도를 눈에 띄게 단축한 속도업 라운드).
- voiceover: "자, 이렇게 눈으로 보고 신기해하는 것만으론 입에서 안 나옵니다. 직접 소리를 내봐야 진짜 제 것이 되거든요. 자, 저랑 딱 3번만 뱉어보세요. 워러, 워러, 워러. 시리, 시리, 시리. 베러, 베러, 베러. 혀에 힘을 딱 빼고, 톡 튕기듯 가볍게요. 어떠세요, 느낌이 좀 오시나요? 아직 입에 안 붙으셨어도 전혀 괜찮습니다. 방금 배운 다른 단어들로 한 번 더 연습해볼게요. 매러, 매러, 매러. 프리디, 프리디, 프리디. 써리, 써리, 써리. 레러, 레러, 레러. 처음엔 다들 혀가 뻣뻣하게 느껴지실 거예요. 그런데 며칠만 이렇게 반복하시면, 어느새 입이 저절로 그렇게 움직이고 있을 겁니다. 자, 하나만 더 해볼게요. 아까 write랑 ride가 거의 똑같이 들린다고 말씀드렸었죠? 직접 소리 내보시면 그 이유를 몸으로 느끼실 수 있어요. 라이러, 라이러. 라이러, 라이러. 거의 차이가 안 느껴지시죠? 이번엔 속도를 조금 올려서, 실제 대화하듯 빠르게 가볼게요. 워러, 시리, 베러, 매러. 한 번 더, 더 빠르게. 워러, 시리, 베러, 매러. 처음엔 어색해도, 입에 붙을 때까지 이 구간만 몇 번이고 다시 돌려 보셔도 좋습니다."
- duration: 92.92s
- transition_in: cut
- status: script_approved
- src: compositions/frames/05-practice-aloud.html
- type: practice-drill (채널 시그니처 "3번 뱉어보기")
- blueprint: practice-progress-card (3라운드)
- focal: 진행 점(●●●) 골드 채워짐, 라운드 전환 시 카드 누적
- sfx: click-soft(발화마다 진행 점 1개씩) — 절제된 톤 유지, 라운드 전환에만 pop
- `caption-pill`:
  - `자, 이렇게 눈으로 보고 신기해하는 것만으론 입에서 안 나옵니다.`
  - `직접 소리를 내봐야 진짜 제 것이 되거든요. 자, 저랑 딱 3번만 뱉어보세요.`
  - `워러, 워러, 워러. 시리, 시리, 시리. 베러, 베러, 베러.`
  - `혀에 힘을 딱 빼고, 톡 튕기듯 가볍게요.`
  - `어떠세요, 느낌이 좀 오시나요? 아직 입에 안 붙으셨어도 전혀 괜찮습니다.`
  - `방금 배운 다른 단어들로 한 번 더 연습해볼게요.`
  - `매러, 매러, 매러. 프리디, 프리디, 프리디. 써리, 써리, 써리. 레러, 레러, 레러.`
  - `처음엔 다들 혀가 뻣뻣하게 느껴지실 거예요.`
  - `그런데 며칠만 이렇게 반복하시면, 어느새 입이 저절로 그렇게 움직이고 있을 겁니다.`
  - `자, 하나만 더 해볼게요. 아까 write랑 ride가 거의 똑같이 들린다고 말씀드렸었죠?`
  - `직접 소리 내보시면 그 이유를 몸으로 느끼실 수 있어요. 라이러, 라이러. 라이러, 라이러.`
  - `거의 차이가 안 느껴지시죠? 이번엔 속도를 조금 올려서, 실제 대화하듯 빠르게 가볼게요.`
  - `워러, 시리, 베러, 매러. 한 번 더, 더 빠르게. 워러, 시리, 베러, 매러.`
  - `처음엔 어색해도, 입에 붙을 때까지 이 구간만 몇 번이고 다시 돌려 보셔도 좋습니다.`

---

## Frame 6 — 실전 문장 속에서 들어보기 (3라운드: 기본 문장 → 확장 문장 → 빈칸 맞히기)

- scene: `sentence-underline-card` — "The water in this city gets better every year." 문장
  등장, water/city/better 밑줄+펄스. 이어서 첫 문장이 위로 밀려나며 축소, "This letter looks
  pretty good."/"It doesn't matter, we still have thirty minutes." 두 문장 카드 순차 등장.
  마지막으로 `blank-flip-card` — 첫 문장의 water 자리가 물음표 박스로 가려졌다가 뒤집기
  모션으로 공개, 이어서 두 번째 문장의 pretty 자리로 동일 패턴 반복.
- voiceover: "문제는, 실제 대화에서는 이 소리들이 단어 하나씩 따로 나오지 않는다는 거예요. 문장 속에 섞여서 순식간에 지나가버리거든요. 그래서 문장 하나로 진짜 실전 감각을 확인해보겠습니다. "The water in this city gets better every year." 이 한 문장 안에 오늘 배운 지름길이 세 번이나 숨어 있어요. water는 워러, city는 시리, better는 베러. 다시 한번 천천히, 이번엔 이 세 소리에만 집중해서 들어보세요. 문장 속에서 들으니 느낌이 또 다르시죠? 문장 하나 더 해볼까요. "This letter looks pretty good." 그리고 "It doesn't matter, we still have thirty minutes." 이 두 문장에도 레러, 프리디, 매러, 써리가 전부 자연스럽게 섞여 있습니다. 이렇게 문장 단위로 계속 듣고 따라 하시다 보면, 어느 순간 귀가 먼저 그 소리를 잡아내기 시작하실 거예요. 이번엔 거꾸로 가볼게요. 아까 그 첫 문장에서 딱 한 단어만 쏙 빼고 다시 읽어보겠습니다. 그 자리에 무슨 단어가 있었을지, 소리의 리듬만으로 맞혀보세요. "The... in this city gets better every year." 정답이 뭐였을까요? 네, water입니다. 스펠링을 몰라도 문장의 리듬과 톡 튕기는 그 느낌만 잡으시면 충분히 맞히실 수 있어요. 하나만 더요. "This letter looks... good." 이번엔 무슨 단어였을까요? 네, pretty입니다. 두 개 다 맞히셨다면, 이제 진짜 그 소리가 귀에 걸리기 시작하신 겁니다. 처음엔 단어 하나하나가 낯설게 들려도, 이렇게 문장과 리듬으로 반복해서 들으시다 보면 어느새 문장 전체가 자연스럽게 귀에 익으실 거예요. 그런데 이 지름길, 정말 모든 단어에 다 통할까요?"
- duration: 103.92s
- transition_in: cut
- status: script_approved
- src: compositions/frames/06-sentence-listening.html
- type: listening-transfer (리스닝 전이 훈련)
- blueprint: sentence-underline-card (2라운드) + blank-flip-card (2라운드)
- focal: 문장 속 플랩 단어 밑줄 강조, 빈칸 뒤집기 공개 모션
- sfx: whoosh(문장 등장) ➔ click-soft(단어별 펄스) ➔ click-soft x3(빈칸 카운트 느낌) ➔
  chime(뒤집기 공개, 2회)
- **⚠️ 오디오 처리 참고 — Line 9와 달리 "끼워 넣을 무음 구간"이 없다**: 2026-10-01 RMS
  파형으로 `06.wav` 전체를 직접 스캔한 결과, 두 빈칸("The... in this city...",
  "This letter looks... good.") 지점에 Line 9류의 눈에 띄는 다초(1초 이상) 침묵이 전혀
  없다 — 모든 간격이 0.3~0.9초로, 문장 안 다른 쉼표/숨쉬기 지점과 구별이 안 되는 수준이다
  (Gemini TTS가 "..."를 극적인 정지가 아니라 그냥 짧게 숨 고르는 정도로만 처리한 것으로
  보임). 즉 원래 계획("그 무음 구간에 beep/차임 삽입")의 전제였던 "찾아서 채울 긴 침묵"
  자체가 없다 — 프레임 구현 시 beep/차임을 끼워 넣을 생각이라면, 침묵 탐지가 아니라
  `06.words.json`에서 빈칸 앞뒤 실제 단어("in"→"this", "looks"→"good")의 타임스탬프
  사이 그 짧은 간격에 맞출 것. whisper 전체 전사로 두 빈칸 문장 모두 내용 손실 없음은
  별도로 확인 완료(Voicebox에서 겪었던 문장 소실 버그는 Gemini에서 재현 안 됨).
- `caption-pill`:
  - `문제는, 실제 대화에서는 이 소리들이 단어 하나씩 따로 나오지 않는다는 거예요.`
  - `문장 속에 섞여서 순식간에 지나가버리거든요. 그래서 문장 하나로 진짜 실전 감각을 확인해보겠습니다.`
  - `"The water in this city gets better every year."`
  - `이 한 문장 안에 오늘 배운 지름길이 세 번이나 숨어 있어요. water는 워러, city는 시리, better는 베러.`
  - `다시 한번 천천히, 이번엔 이 세 소리에만 집중해서 들어보세요.`
  - `문장 속에서 들으니 느낌이 또 다르시죠? 문장 하나 더 해볼까요.`
  - `"This letter looks pretty good." 그리고 "It doesn't matter, we still have thirty minutes."`
  - `이 두 문장에도 레러, 프리디, 매러, 써리가 전부 자연스럽게 섞여 있습니다.`
  - `이렇게 문장 단위로 계속 듣고 따라 하시다 보면, 어느 순간 귀가 먼저 그 소리를 잡아내기 시작하실 거예요.`
  - `이번엔 거꾸로 가볼게요. 아까 그 첫 문장에서 딱 한 단어만 쏙 빼고 다시 읽어보겠습니다.`
  - `그 자리에 무슨 단어가 있었을지, 소리의 리듬만으로 맞혀보세요.`
  - `"The... in this city gets better every year." 정답이 뭐였을까요? 네, water입니다.`
  - `스펠링을 몰라도 문장의 리듬과 톡 튕기는 그 느낌만 잡으시면 충분히 맞히실 수 있어요.`
  - `하나만 더요. "This letter looks... good." 이번엔 무슨 단어였을까요? 네, pretty입니다.`
  - `두 개 다 맞히셨다면, 이제 진짜 그 소리가 귀에 걸리기 시작하신 겁니다.`
  - `처음엔 단어 하나하나가 낯설게 들려도, 이렇게 문장과 리듬으로 반복해서 들으시다 보면 어느새 문장 전체가 자연스럽게 귀에 익으실 거예요.`
  - `그런데 이 지름길, 정말 모든 단어에 다 통할까요?`

---

## Frame 7 — 반전 꿀팁: 딱 하나의 예외

- scene: `contrast-pair-card` — 좌: atom→애럼(골드) / 우: atomic→어타믹(레드 테두리, 정지
  아이콘). 하단 골드 캡슐 `T 뒤 음절에 강세 O = 안 변함`.
- voiceover: "아니요, 딱 하나 안 통하는 경우가 있습니다. 원자를 뜻하는 atom은 애텀이 아니라 애럼이 되는데, "원자의"라는 뜻의 atomic은 왜 그대로 어타믹일까요? 이유는 하나예요. T 바로 뒤 음절에 강세가 오면, 혀가 절대 스치고 지나가지 않거든요. atom은 T 뒤가 힘 빠진 음절이라 스치지만, atomic은 T 바로 뒤 tom 음절에 강세가 딱 실려 있어서 혀가 거기서 제대로 멈춰야 합니다. 강세가 실린 음절은 또렷하게 힘줘서 말해야 하니까, 아무리 게으른 혀라도 거기서만큼은 지름길을 못 타는 거예요. 그러니까 기준은 딱 하나, 모음 사이인지가 아니라 T 뒤에 힘이 있는지 없는지입니다. 그런데 이 T, 아예 소리째로 사라져버리는 경우도 있다는 거 아세요?"
- duration: 49.68s
- transition_in: slide-left
- status: script_approved
- src: compositions/frames/07-exception-atomic.html
- type: exception-reveal (3단계 도파민 — 반전 꿀팁, Line 3 원리와 재연결)
- blueprint: contrast-pair-card
- focal: atom(골드) vs atomic(레드) 색 대비
- sfx: pop(카드 등장 x2) ➔ chime(애럼 공개) ➔ click-soft(어타믹 정지 아이콘)
- `caption-pill`:
  - `아니요, 딱 하나 안 통하는 경우가 있습니다.`
  - `원자를 뜻하는 atom은 애텀이 아니라 애럼이 되는데, "원자의"라는 뜻의 atomic은 왜 그대로 어타믹일까요?`
  - `이유는 하나예요. T 바로 뒤 음절에 강세가 오면, 혀가 절대 스치고 지나가지 않거든요.`
  - `atom은 T 뒤가 힘 빠진 음절이라 스치지만, atomic은 T 바로 뒤 tom 음절에 강세가 딱 실려 있어서 혀가 거기서 제대로 멈춰야 합니다.`
  - `강세가 실린 음절은 또렷하게 힘줘서 말해야 하니까, 아무리 게으른 혀라도 거기서만큼은 지름길을 못 타는 거예요.`
  - `그러니까 기준은 딱 하나, 모음 사이인지가 아니라 T 뒤에 힘이 있는지 없는지입니다.`
  - `그런데 이 T, 아예 소리째로 사라져버리는 경우도 있다는 거 아세요?`

---

## Frame 8 — 보너스 심화: winter가 위너처럼 들리는 이유

- scene: `bonus-fade-card` — `winter` 카드에서 `T` 글자가 서서히 투명해지며 사라지고
  `winner`와 거의 같은 모양이 됨. 하단 회색(톤 다운) 캡슐 `오늘 규칙과는 별개 · 선택적`.
- voiceover: "맞습니다. winter나 center처럼 T 앞에 N이 붙으면, 아예 T 소리 자체가 사라져버리기도 해요. 그래서 winter가 winner처럼 들릴 때가 있습니다. 다만 이건 오늘 배운 모음 사이 T와는 결이 다른 별개의 현상이에요. 사람마다 쓰기도 하고 안 쓰기도 하는 선택적인 습관이라, 오늘 배운 원리에 억지로 끼워 넣지는 않으셔도 됩니다."
- duration: 25.92s
- transition_in: cut
- status: script_approved
- src: compositions/frames/08-bonus-nt-cluster.html
- type: bonus-aside (별개 현상, 의도적 톤 다운)
- blueprint: bonus-fade-card
- focal: `winter`의 T가 사라지는 페이드 모션
- sfx: click-soft(T 사라짐) — 골드/레드 강조색 SFX(chime 등) 의도적으로 안 씀
- `caption-pill`:
  - `맞습니다. winter나 center처럼 T 앞에 N이 붙으면, 아예 T 소리 자체가 사라져버리기도 해요.`
  - `그래서 winter가 winner처럼 들릴 때가 있습니다.`
  - `다만 이건 오늘 배운 모음 사이 T와는 결이 다른 별개의 현상이에요.`
  - `사람마다 쓰기도 하고 안 쓰기도 하는 선택적인 습관이라,`
  - `오늘 배운 원리에 억지로 끼워 넣지는 않으셔도 됩니다.`

---

## Frame 9 — 실전 퀴즈: 예외를 직접 찾아보기

- scene: `quiz-grid-card` — meeting/daughter/computer/hotel 4개 카드 격자 배치, 3-2-1
  카운트다운(네온 게이지, EP12 CSS 방식). 정답 공개 시 hotel만 레드 테두리+`호텔` 유지,
  나머지 3장은 골드 테두리로 전환되며 `미링/도러/컴퓨러`로 크로스페이드.
- voiceover: "그럼 오늘 배운 걸 진짜 이해하셨는지, 딱 하나만 확인해보겠습니다. 방금 배운 예외를 스스로 찾아내실 수 있을까요? 다들 한 번쯤 써보셨을 단어 네 개를 보여드릴게요. meeting, daughter, computer, hotel. 이 중에 딱 하나만 오늘 배운 지름길을 안 따릅니다. 어떤 단어일까요? 3초 드릴게요. [정확히 3.000초 무음 — 2026-10-01 RMS 파형 분석으로 보정, 원본 Gemini 음성은 1.82초뿐이었음] 정답은 hotel입니다. T 바로 뒤 음절 텔에 강세가 딱 실려 있어서, 지름길을 안 타고 그대로 호텔로 남아요. 나머지 셋은 전부 뒤가 힘 빠진 음절이라 미링, 도러, 컴퓨러가 됩니다."
- duration: 41.46s
- transition_in: cut
- status: script_approved
- src: compositions/frames/09-quiz-exception.html
- type: quiz (실전 적용 — 정답 선노출 완전 차단)
- blueprint: quiz-grid-card
- focal: 카운트다운 게이지, hotel만 레드로 갈리는 정답 공개 순간
- sfx: click-soft x3(카운트다운 3-2-1) ➔ chime(정답 공개) ➔ click-soft x3(나머지 3장 전환)
- **⚠️ 오디오 참고 — `09.words.json`의 침묵 구간 타임스탬프를 믿지 말 것**: whisper+LCS
  정렬(`scripts/word-timeline.mjs`)로 뽑은 `09.words.json`에서는 "드릴게요."(to=23.6)와
  "정답은"(from=23.913) 사이 간격이 0.3초로만 잡히는데, 실제 RMS 파형을 직접 재측정하면
  침묵은 **23.000s~26.040s(약 3.04초)**다(2026-10-01 직접 검증, CLAUDE.md에 이미 문서화된
  "whisper가 무음 경계 근처 타임스탬프를 실제보다 짧게 추정하는" 알려진 현상이 이번에도
  그대로 재현됨 — 세그먼트 보간 방식이 긴 무음을 사실상 못 보고 건너뛴다). **프레임 구현
  시 3-2-1 카운트다운 게이지는 `09.words.json`이 아니라 이 23.0s~26.04s 구간을 직접 쓸 것.**
- `caption-pill`:
  - `그럼 오늘 배운 걸 진짜 이해하셨는지, 딱 하나만 확인해보겠습니다.`
  - `방금 배운 예외를 스스로 찾아내실 수 있을까요? 다들 한 번쯤 써보셨을 단어 네 개를 보여드릴게요. meeting, daughter, computer, hotel.`
  - `이 중에 딱 하나만 오늘 배운 지름길을 안 따릅니다. 어떤 단어일까요? 3초 드릴게요.`
  - `정답은 hotel입니다.`
  - `T 바로 뒤 음절 텔에 강세가 딱 실려 있어서, 지름길을 안 타고 그대로 호텔로 남아요.`
  - `나머지 셋은 전부 뒤가 힘 빠진 음절이라 미링, 도러, 컴퓨러가 됩니다.`

---

## Frame 10 — 요약 치트시트

- scene: `cheat-sheet-board` — 규칙 2줄(상단: 모음 사이 T+뒷모음 힘 빠짐→혀가 스침→리을 소리
  / 하단: T 뒤 음절에 강세 O→그대로 T) + 예시 미니 칩 6개(골드) + 예외 칩 2개(레드).
- voiceover: "오늘 배운 걸 한 장으로 정리하면 이렇습니다. 모음 사이에 낀 T는 혀가 스치듯 지나가며 리을에 가깝게 들린다. 단, T 바로 뒤 음절에 강세가 오면 그대로 남는다. 이 두 줄이면 충분해요."
- duration: 15.00s
- transition_in: fade
- status: script_approved
- src: compositions/frames/10-cheat-sheet.html
- type: summary
- blueprint: cheat-sheet-board
- focal: 규칙 2줄 + 칩 8개 한눈에
- sfx: pop(카드 등장) ➔ click-soft x8(칩 순차 점등)
- `caption-pill`:
  - `오늘 배운 걸 한 장으로 정리하면 이렇습니다.`
  - `모음 사이에 낀 T는 혀가 스치듯 지나가며 리을에 가깝게 들린다.`
  - `단, T 바로 뒤 음절에 강세가 오면 그대로 남는다.`
  - `이 두 줄이면 충분해요.`

---

## Frame 11 — 클로징 (엔드스크린 keep-out 포함)

- scene: `dialogue-bubble-pair` 재사용 — Line 1과 동일한 친구 말풍선 스타일로
  "씨티은행 잘 찾아갔어!" 등장(시각적 라임). 이어서 water/city/better 미니 카드가 흩어지며
  페이드아웃, 직전 편("게으른 혀 이야기", 내부 EP 번호 노출 금지) 추천 카드 노출. 끝 5초는
  화면 중앙 완전 비움, 워드마크만 좌상단(`left:6cqw; top:8cqh`) 유지.
- voiceover: "참, 그 친구한테는 나중에 이 얘기를 전부 해줬어요. 그랬더니 이제는 씨티은행도, water도, 자기 입으로 자연스럽게 흘려 말하더라고요. 오늘도 하루 일하시느라 고생 많으셨습니다. 이제 water도, city도, 처음 보는 단어도, 혀에 힘주지 않고 톡 튕기듯 편하게 흘려보내시면 됩니다. 혹시 아직 R이랑 L이 헷갈리신다면, 지난번에 다뤘던 그 게으른 혀 이야기도 한번 들어보세요. 오늘도 여러분 입이 한 걸음 더 편해지셨습니다. 다음에 또 뵙겠습니다."
- duration: 34.00s
- transition_in: fade
- status: script_approved
- src: compositions/frames/11-closing.html
- type: closing (친구 서사 회수, 다음 소재 예고 없는 단편식 마무리)
- blueprint: dialogue-bubble-pair(콜백) + endscreen-keep-out
- focal: 친구 말풍선 콜백 → 끝 5초 화면 중앙 완전 비움
- sfx: pop(친구 말풍선 콜백) ➔ whoosh(카드들 흩어짐) — 끝 5초 구간엔 SFX 없음(음성+BGM만)
- `caption-pill`:
  - `참, 그 친구한테는 나중에 이 얘기를 전부 해줬어요.`
  - `그랬더니 이제는 씨티은행도, water도, 자기 입으로 자연스럽게 흘려 말하더라고요.`
  - `오늘도 하루 일하시느라 고생 많으셨습니다.`
  - `이제 water도, city도, 처음 보는 단어도, 혀에 힘주지 않고 톡 튕기듯 편하게 흘려보내시면 됩니다.`
  - `혹시 아직 R이랑 L이 헷갈리신다면, 지난번에 다뤘던 그 게으른 혀 이야기도 한번 들어보세요.`
  - `오늘도 여러분 입이 한 걸음 더 편해지셨습니다. 다음에 또 뵙겠습니다.`
  - (끝 5초 구간은 규칙대로 화면 텍스트 없이 음성 전용)
