---
format: 1920x1080
duration: 414.02s (6분 54.02초 — 15프레임 Gemini Charon TTS + whisper 실측 완료)
message: "KNEE의 K, CLIMB의 B, WRITE의 W처럼 철자에는 있지만 소리 나지 않는 자음들은 무작위 예외가 아니라, 혀·입술이 바로 다음 자음과 부딪히는 걸 피하려고 생략된 것이라는 '조음 충돌 회피' 원리 하나로 KN-, -MB, WR- 세 그룹을 한 번에 설명할 수 있다."
arc: concept-explainer with practice & bonus tip
audience: "스펠링 그대로 읽으려다 원어민 발음과 달라 좌절했던 파닉스 정체기 성인 학습자"
mode: collaborative
music: 약간 빠른 템포·집중력을 높이는 BGM (data-volume="0.06"), SFX는 고급스럽고 절제된 톤
---

## Video direction

**Visual Grammar (비주얼 씽킹 & 스케치노트 인포그래픽, EP17 시스템 계승)**:
- 채널 시그니처 웜크림(`#F4EFE6`) 네오브루탈리즘 카드 + 3.5px 블랙 잉크 펜선 + 3대 소리 서랍
  컬러 코딩(KN=골드 앰버, MB=딥 오렌지, WR=틸 블루) + 아기자기한 미니 손그림 픽토그램.
- 애니메이션은 power3 감속 진입, 묵음 글자 취소선/투명화(`drop-letter-strike`) 공통 모션,
  부드러운 스냅 서랍 골인 모션을 중심으로 전개.
- **채널 필수 규칙**: 나레이션 전문 무누락 자막(`caption-pill`) 전 프레임 탑재, Frame 15 끝
  5초 유튜브 엔드스크린 중앙 100% 완전 비움(Keep-out Zone), Frame 10·11 퀴즈는 카운트다운
  중 정답(묵음 글자 위치) 시각적 선노출 금지(EP17 Frame 10·11 사고 재발 방지 — `frame.md`의
  `quiz-countdown-card` 참고).

---

## Frame 1 — 도입 (Stakes) : 첫 글자·끝 글자 소멸 충격

- scene: 웜크림 베이지 배경 위에 `knee`, `climb`, `write` 3단어가 스펠링 그대로("크니",
  "클라임브", "우라이트") 떴다가, 소리 나지 않는 철자(k, b, w)가 부드러운 붉은 사선과 함께
  투명해지며 실제 발음("니", "클라임", "라이트")으로 전환되는 시각적 대비.
- voiceover: "k, n, e, e. 알파벳을 배운 대로라면 분명 '크니'여야 합니다. climb도 '클라임브', write도 '우라이트'여야 하죠. 그런데 왜 원어민들은 멀쩡하게 쓰여 있는 첫 글자와 끝 글자를 감쪽같이 지워버렸을까요? 이유는 아주 단순합니다. 오늘 이 기준 하나만 알면, 평생 헷갈리던 묵음 단어가 사전 없이도 한 번에 읽힙니다."
- duration: 29.52s (실측 29.52s)
- transition_in: cut
- status: outline
- src: compositions/frames/01-stakes.html
- type: hook
- persuasion: 호기심 자극 + 상식 뒤집기 (Cognitive Dissonance) + 명시적 시청자 이득("사전 없이도
  한 번에 읽힙니다")
- beat: 충격의 선언 + 스펠링 배신 타격
- blueprint: sketchnote-card (3열 대칭) + drop-letter-strike
- focal: `knee`, `climb`, `write`의 철자대로 읽은 소리와 실제 소리가 뒤집히는 순간
- roles: 3개 대비 카드 = foreground subject · 붉은 사선 탈락 애니메이션 = focal thread ·
  웜크림 캔버스 = background
- sfx: 팝-팝-팝 (단어 등장) ➔ 사각 (사선 그어짐) ➔ 쿵 (의문 제기)
- `caption-pill`:
  - `k, n, e, e. 알파벳을 배운 대로라면 분명 '크니'여야 합니다.`
  - `climb도 '클라임브', write도 '우라이트'여야 하죠.`
  - `그런데 왜 원어민들은 멀쩡하게 쓰여 있는 첫 글자와 끝 글자를 감쪽같이 지워버렸을까요?`
  - `이유는 아주 단순합니다. 오늘 이 기준 하나만 알면, 평생 헷갈리던 묵음 단어가 사전 없이도 한 번에 읽힙니다.`

---

## Frame 2 — 채널 인트로 (Intro) : 초고속 워드마크 리빌

- scene: 채널 워드마크가 스케일 업되며 나타난 뒤, 상단 헤더로 스무스하게 축소 이동. 하단에
  `[ 혀가 편해지는 묵음 자음 공식 ]` 토픽 뱃지 등장.
- voiceover: "안녕하세요, 「이해하면 쉬운영어」입니다. 오늘은 외우지 않고 몸으로 이해하는 소리 없는 철자의 비밀을 공개합니다."
- duration: 10.96s (실측 10.96s)
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
  - `오늘은 외우지 않고 몸으로 이해하는 소리 없는 철자의 비밀을 공개합니다.`

---

## Frame 3 — 질문 던지기: 사전 속 무작위 예외의 벽 (Big Question)

- scene: 사전 페이지처럼 `k[n]ife`, `thu[m]b`, `[w]rong`, `k[n]ock`, `lam[b]` 단어 카드가
  무질서하게 흩뿌려진 복잡한 화면. **그룹으로 묶거나 원리를 보여주지 않는다** — "이걸 다 따로
  외워야 하나" 하는 압박감만 조성하고 끝난다(정리·해답은 Frame 4에서 처음 공개).
- voiceover: "사전을 펴보면 단어마다 소리가 안 나는 철자들이 제각각 흩어져 있습니다. knee, climb, write, knock, thumb... 단어마다 예외로 다 외워야 할 것 같아서 막막하셨죠."
- duration: 16.2s (실측 16.2s)
- transition_in: slide-up
- status: outline
- src: compositions/frames/03-silent-wall.html
- type: orientation
- persuasion: 복잡성 제시로 긴장 조성 (해소는 다음 프레임에 위임)
- beat: 부담감 조성 (아직 안도감 주지 않음)
- blueprint: silent-letter-wall (무질서 나열판, 그룹핑 없음)
- focal: 5개 단어의 묵음 위치가 제각각 다른 자리에 있는 밀도감
- roles: 5개 단어 타일 = foreground · 묵음 철자 표시 = supporting detail · 흔들리는 물음표
  아이콘 = tension cue
- sfx: 5단 틱-틱-틱-틱-틱 (단어 나열) ➔ 살짝 답답한 저음 드론
- `caption-pill`:
  - `사전을 펴보면 단어마다 소리가 안 나는 철자들이 제각각 흩어져 있습니다.`
  - `knee, climb, write, knock, thumb...`
  - `단어마다 예외로 다 외워야 할 것 같아서 막막하셨죠.`

> **주의(EP17 Frame 3/4 사고 재발 방지)**: 이 프레임에서 "사실 하나의 원리로 정리된다"는 반전을
> 절대 먼저 말하지 않는다. Frame 4의 "무작위 예외가 아니다"가 이 영상의 핵심 반전이므로, 여기서
> 미리 풀어버리면 다음 프레임이 무의미해진다.

---

## Frame 4 — 반전 공개: 예외가 아니라 게으른 혀의 선택 (Head Fake)

- scene: 1단계로 타임머신 컷("옛날엔 크네, 클라임브, 우라이트라고 진짜 발음했다!"), 2단계로
  무질서했던 Frame 3의 단어들이 3개의 서랍(KN/-MB/WR-) 안으로 자석처럼 정리되는 머지 모션.
- voiceover: "사실 이 단어들, 예외가 아니라 원어민들도 혀가 너무 힘들어서 뺀 겁니다. 놀랍게도 옛날 영어에서는 이 글자들을 대부분 소리 내서 읽었습니다. 그런데 말하다 보니 너무 불편해서 저절로 탈락한 것이죠. 그 원리만 알면, 복잡해 보이던 묵음 단어들이 딱 세 개의 소리 서랍으로 깔끔하게 정리됩니다."
- duration: 27.48s (실측 27.48s)
- transition_in: cross-dissolve
- status: outline
- src: compositions/frames/04-head-fake.html
- type: reveal
- persuasion: 첫 번째 도파민 — 예상을 깨는 확신에 찬 반전(무작위 예외 ➔ 하나의 원리)
- beat: 압박감 해소 + "아싸!" 카타르시스
- blueprint: silent-drawer 3개 (숫자 반전이 여기서 첫 공개)
- focal: 무질서한 5단어가 KN/-MB/WR- 3개 서랍으로 압축되는 순간
- roles: 타임머신 컷 = cold-open beat · 3대 서랍 = foreground subject · "수백 개 단어 ➔ 3개
  서랍" 캡슐 = payoff badge
- sfx: 뿅뿅뿅 (자석 정리) ➔ 두구두구 (긴장) ➔ 짜잔 (서랍 완성)
- `caption-pill`:
  - `사실 이 단어들, 예외가 아니라 원어민들도 혀가 너무 힘들어서 뺀 겁니다.`
  - `놀랍게도 옛날 영어에서는 이 글자들을 대부분 소리 내서 읽었습니다.`
  - `그런데 말하다 보니 너무 불편해서 저절로 탈락한 것이죠.`
  - `그 원리만 알면, 복잡해 보이던 묵음 단어들이 딱 세 개의 소리 서랍으로 깔끔하게 정리됩니다.`

---

## Frame 5 — 원리 설명: 소리끼리 부딪히는 걸 피하는 지름길 (Core Principle)

- scene: 구강 단면 스케치노트 듀얼 카드. 왼쪽(KN): 목구멍 쪽 K에서 앞니 뒤 N까지 혀가 먼 거리를
  급하게 이동하는 궤적. 오른쪽(MB): 입술을 닫은 채(M) 또 터뜨리는(B) 이중 동작에 붉은 경고등
  → 편안한 지름길로 녹색 전환.
- voiceover: "원리는 아주 단순합니다. 소리끼리 서로 부딪히기 때문입니다. 목구멍 깊은 곳의 K 소리를 내자마자 앞니 쪽의 N 소리로 혀가 날아가기엔 거리가 너무 멀고, 입술을 닫아 M 소리를 내놓고 또 억지로 '브!' 하고 입술을 터뜨리는 건 두 번 일하기 귀찮기 때문입니다. 결국 우리 혀와 입술이 가장 편한 지름길을 택한 것이죠."
- duration: 30.16s (실측 30.16s)
- transition_in: slide-left
- status: outline
- src: compositions/frames/05-principle.html
- type: principle
- persuasion: 학술 용어 없이 물리적 직관으로 원리 체득
- beat: 차분한 설명 (도파민 축적 구간)
- blueprint: articulation-collision-sketch (구강 단면 스케치 2컷)
- focal: 혀가 너무 바쁘게 이동하는 궤적(KN) / 입술이 두 번 일하는 이중 동작(MB)
- roles: 왼쪽 카드 = KN 설명 · 오른쪽 카드 = MB 설명 · 붉은→초록 전환 화살표 = focal thread
- sfx: 휙 (혀 이동) ➔ 뽀뽀뽀 (입술 이중 동작) ➔ 딩 (지름길 발견)
- `caption-pill`:
  - `원리는 아주 단순합니다. 소리끼리 서로 부딪히기 때문입니다.`
  - `목구멍 깊은 곳의 K 소리를 내자마자 앞니 쪽의 N 소리로 혀가 날아가기엔 거리가 너무 멀고,`
  - `입술을 닫아 M 소리를 내놓고 또 억지로 '브!' 하고 입술을 터뜨리는 건 두 번 일하기 귀찮기 때문입니다.`
  - `결국 우리 혀와 입술이 가장 편한 지름길을 택한 것이죠.`

---

## Frame 6 — 1번 소리 서랍 KN- 실전 낭독 (Practice) ⭐️ [3회 반복 낭독 & 근육 코칭]

- scene: 상단 코칭 팁 배너 + 하단 5대 단어 쇼케이스(knee, know, knife, knock, knight). K가
  스르륵 투명해지며 N 글자에 골드 하이라이트가 3회 연속 비트 파동 점등.
- voiceover: "첫 번째 서랍은 단어 맨 앞의 KN 소리입니다. 앞의 K는 혀가 귀찮아서 완전히 버리고, 곧바로 N 소리로 출발합니다. K를 굳이 소리 내려 하지 마세요. 혀를 처음부터 앞니 뒤에 딱 붙이고 그냥 '니' 하고 출발하면 됩니다. 함께 소리 내보실까요? knee, know, knife, knock, knight. K는 깨끗이 지우고 앞니 뒤에서 N 소리만 가볍게 내주시면 됩니다."
- duration: 36.72s (실측 36.72s)
- transition_in: slide-right
- status: outline
- src: compositions/frames/06-practice-kn.html
- type: practice
- persuasion: 두 번째 도파민 — 원리가 실제로 통한다는 패턴 확장 경험
- beat: 근육 코칭 + 3회 반복 낭독 참여
- blueprint: silent-drawer(골드) + drop-letter-strike
- focal: K가 사라지고 N만 남는 5개 단어 동시 확인
- roles: 코칭 팁 배너 = instruction cue · 5단어 쇼케이스 = foreground practice set
- sfx: 혀 딱 붙는 소리 ➔ 골드 하이라이트 점등 비트 3회
- `caption-pill`:
  - `첫 번째 서랍은 단어 맨 앞의 KN 소리입니다.`
  - `앞의 K는 혀가 귀찮아서 완전히 버리고, 곧바로 N 소리로 출발합니다.`
  - `K를 굳이 소리 내려 하지 마세요. 혀를 처음부터 앞니 뒤에 딱 붙이고 그냥 '니' 하고 출발하면 됩니다.`
  - `함께 소리 내보실까요? knee, know, knife, knock, knight.`
  - `K는 깨끗이 지우고 앞니 뒤에서 N 소리만 가볍게 내주시면 됩니다.`

---

## Frame 7 — 2번 소리 서랍 -MB 실전 낭독 (Practice) ⭐️ [3회 반복 낭독 & 근육 코칭]

- scene: 상단 코칭 팁 + "허니콤·썸드라이브도 B 묵음" 힌트 칩 + 하단 5대 단어 쇼케이스(climb,
  comb, thumb, lamb, bomb). 단어 끝 B가 닫힌 자물쇠 아이콘으로 변하며 M 글자 주변 공명 링 재생.
- voiceover: "두 번째 서랍은 단어 끝의 MB 소리입니다. 우리가 매일 쓰는 '허니콤'이나 '썸드라이브'도 B 소리를 내지 않죠. 직접 입술을 닫아보세요. '클라임~' 하고 입술을 붙인 상태에서, 굳이 '브!' 하고 입술을 떼지 마세요. 그냥 입술만 편안하게 붙이고 끝내면 그게 원어민 소리입니다. 직접 소리 내보세요. climb, comb, thumb, lamb, bomb. B 소리를 터뜨리지 말고 부드러운 '음~' 소리로 마무리하시면 됩니다."
- duration: 40.24s (실측 40.24s)
- transition_in: slide-right
- status: outline
- src: compositions/frames/07-practice-mb.html
- type: practice
- persuasion: 친숙한 외래어(허니콤/썸드라이브)로 낯선 규칙을 익숙하게 연결
- beat: 근육 코칭 + 3회 반복 낭독 참여
- blueprint: silent-drawer(오렌지) + accent-lock 자물쇠 아이콘
- focal: 입술을 닫은 채로 끝내는 5개 단어 동시 확인
- roles: 힌트 칩 = familiarity bridge · 5단어 쇼케이스 = foreground practice set
- sfx: 입술 닫히는 소리 ➔ 공명 링 음파 ➔ 자물쇠 잠기는 소리
- `caption-pill`:
  - `두 번째 서랍은 단어 끝의 MB 소리입니다.`
  - `우리가 매일 쓰는 '허니콤'이나 '썸드라이브'도 B 소리를 내지 않죠.`
  - `직접 입술을 닫아보세요. '클라임~' 하고 입술을 붙인 상태에서, 굳이 '브!' 하고 입술을 떼지 마세요.`
  - `그냥 입술만 편안하게 붙이고 끝내면 그게 원어민 소리입니다.`
  - `직접 소리 내보세요. climb, comb, thumb, lamb, bomb.`
  - `B 소리를 터뜨리지 말고 부드러운 '음~' 소리로 마무리하시면 됩니다.`

---

## Frame 8 — 3번 소리 서랍 WR- 실전 낭독 (Practice) ⭐️ [3회 반복 낭독 & 근육 코칭]

- scene: 상단 코칭 팁 + 하단 5대 단어 매트릭스(write, wrong, wrist, wrap, wreck). W 글자가
  미끄러지듯 사라지며 R 글자가 앞으로 튀어나오는 슬라이딩 가속 모션.
- voiceover: "세 번째 서랍은 단어 맨 앞의 WR 소리입니다. 입술을 둥글게 모아 '우' 하느라 머뭇거리지 마세요. W는 잊어버리고, 처음부터 혀를 뒤로 당겨 시원하게 '롸이트'로 직진하시면 됩니다. 함께 읽어보실까요? write, wrong, wrist, wrap, wreck. W에서 망설이지 말고 바로 혀를 당겨 시원하게 R로 소리 내보세요."
- duration: 34.64s (실측 34.64s)
- transition_in: slide-right
- status: outline
- src: compositions/frames/08-practice-wr.html
- type: practice
- persuasion: 세 번째 서랍까지 패턴이 완전히 통한다는 확신 강화
- beat: 근육 코칭 + 3회 반복 낭독 참여
- blueprint: silent-drawer(틸) + 슬라이딩 가속 모션
- focal: W가 사라지고 R로 미끄러지는 5개 단어 동시 확인
- roles: 코칭 팁 배너 = instruction cue · 5단어 매트릭스 = foreground practice set
- sfx: 슈웅 (W 미끄러짐) ➔ 착 (R 안착) 5회 반복
- `caption-pill`:
  - `세 번째 서랍은 단어 맨 앞의 WR 소리입니다.`
  - `입술을 둥글게 모아 '우' 하느라 머뭇거리지 마세요.`
  - `W는 잊어버리고, 처음부터 혀를 뒤로 당겨 시원하게 '롸이트'로 직진하시면 됩니다.`
  - `함께 읽어보실까요? write, wrong, wrist, wrap, wreck.`
  - `W에서 망설이지 말고 바로 혀를 당겨 시원하게 R로 소리 내보세요.`

---

## Frame 9 — 💡 반전 꿀팁: 묵음 철자는 단어의 신분증 (Bonus Tip)

- scene: 좌우 대칭 동음이의어 카드. 왼쪽 `[k]night`(기사🛡️) vs `night`(밤🌙), 오른쪽
  `[k]not`(매듭🪢) vs `not`(아니다❌). 귀로 들으면 똑같은 소리지만 눈으로 보면 철자 하나로
  뜻이 1초 만에 분리되는 연출.
- voiceover: "여기서 잠깐, 소리도 안 나는 글자를 왜 굳이 남겨뒀을까요? 인쇄술이 발달하면서 철자가 굳어진 것도 있지만, 바로 뜻을 구별해 주는 고마운 신분증 역할을 하기 때문입니다. 소리는 똑같지만 knight는 기사, night는 밤, knot는 매듭, not은 아니다. 글자를 보면 뜻이 한눈에 구별되는 것이죠."
- duration: 28.72s (실측 28.72s)
- transition_in: pop-in
- status: outline
- src: compositions/frames/09-bonus-tip.html
- type: bonus-tip
- persuasion: 세 번째 도파민 — "근데 왜 철자는 안 지웠지?"라는 새로운 호기심을 명쾌하게 해소
- beat: 지적 만족 + 반전 꿀팁
- blueprint: id-card-homophone
- focal: knight/night, knot/not 두 쌍이 소리는 같고 철자만 다른 대비
- roles: 좌우 카드 = foreground contrast pair · "철자는 뜻을 지켜주는 방패" 캡슐 = payoff badge
- sfx: 딩동 (동음 확인) ➔ 팟 (철자 분리 강조)
- `caption-pill`:
  - `여기서 잠깐, 소리도 안 나는 글자를 왜 굳이 남겨뒀을까요?`
  - `인쇄술이 발달하면서 철자가 굳어진 것도 있지만, 바로 뜻을 구별해 주는 고마운 신분증 역할을 하기 때문입니다.`
  - `소리는 똑같지만 knight는 기사, night는 밤, knot는 매듭, not은 아니다.`
  - `글자를 보면 뜻이 한눈에 구별되는 것이죠.`

---

## Frame 10 — ⏱️ 실전 퀴즈 1라운드 (신규 단어) (Quiz)

- scene: 3초 카운트다운 게이지 + 퀴즈 쇼케이스 3문항(knit, crumb, wreath). **문제 출제·
  카운트다운 구간에는 단어를 순수 검정 텍스트로만 표시**(어느 글자가 묵음인지 미리 표시하지
  않음) — 카운트다운이 끝나고 정답 발화와 정확히 같은 시점에만 묵음 글자 취소선/투명화 +
  서랍 색 동시 점등.
- voiceover: "원리를 알았으니 직접 맞춰볼까요? 영상에 나오지 않은 새로운 단어들입니다. 몇 번 서랍인지 3초 안에 소리 내보세요. knit! K가 사라지는 1번 KN 서랍이죠. crumb! B가 사라지는 2번 MB 서랍입니다. wreath! W가 사라지는 3번 WR 서랍입니다. 새로운 단어도 원리로 바로 읽히죠?"
- duration: 42.46s (실측 42.46s)
- transition_in: cut
- status: outline
- src: compositions/frames/10-quiz-1.html
- type: quiz
- persuasion: 네 번째 도파민 — 배운 원리를 스스로 적용해 "나도 되네?" 확인
- beat: 실전 훈련 (완전 신규 단어로 진짜 실력 검증)
- blueprint: quiz-countdown-card ×3
- focal: 카운트다운 → 정답 서랍 골인의 타이밍 일치
- roles: 3초 게이지 = tension cue · 단어 카드 = foreground · 서랍 골인 스냅 = payoff beat
- sfx: 틱-틱-틱 (카운트다운) ➔ 골인 (정답 공개) ×3
- `caption-pill`:
  - `원리를 알았으니 직접 맞춰볼까요? 영상에 나오지 않은 새로운 단어들입니다.`
  - `몇 번 서랍인지 3초 안에 소리 내보세요.`
  - `knit! K가 사라지는 1번 KN 서랍이죠.`
  - `crumb! B가 사라지는 2번 MB 서랍입니다.`
  - `wreath! W가 사라지는 3번 WR 서랍입니다. 새로운 단어도 원리로 바로 읽히죠?`

---

## Frame 11 — ⚡ 실전 퀴즈 2라운드 스피드 (신규 단어) (Quiz Speed)

- scene: 스피드 퀴즈 쇼케이스 3문항(numb, knob, wrench). Frame 10과 동일한 스포일러 방지
  규칙 적용. 카운트다운 후 정답 도장 쾅쾅쾅 + 스파클 이펙트.
- voiceover: "이번엔 조금 더 빠른 속도로 2라운드에 도전해 볼까요? numb! B를 뺀 MB 소리죠. knob! K를 뺀 KN 소리입니다. wrench! W를 뺀 WR 소리입니다. 망설임 없이 바로 맞추셨다면 성공입니다!"
- duration: 27.4s (실측 27.4s)
- transition_in: cut
- status: outline
- src: compositions/frames/11-quiz-2.html
- type: quiz-speed
- persuasion: 도파민 가속 — 속도를 높여 자동화된 원리 적용을 체감
- beat: 실전 훈련 스피드업 + 완전 정복 확신
- blueprint: quiz-countdown-card ×3 (스피드 버전)
- focal: 정답 도장이 연속으로 찍히는 리듬감
- roles: 3문항 스피드 쇼케이스 = foreground · 정답 도장 스탬프 = payoff beat
- sfx: 틱틱 (빠른 카운트다운) ➔ 쾅쾅쾅 (도장) ➔ 스파클 챙
- `caption-pill`:
  - `이번엔 조금 더 빠른 속도로 2라운드에 도전해 볼까요?`
  - `numb! B를 뺀 MB 소리죠.`
  - `knob! K를 뺀 KN 소리입니다.`
  - `wrench! W를 뺀 WR 소리입니다.`
  - `망설임 없이 바로 맞추셨다면 성공입니다!`

---

## Frame 12 — 🗣️ 실전 문장 완성 1: KN 묶음 유연한 리딩 (Sentence Practice)

- scene: 문장 카드 `The [knight] with a sharp [knife] is [kneeling] down.` 3개 단어의 K
  글자가 연하게 투명해지며 리딩 바가 문장을 부드럽게 스캔.
- voiceover: "이제 문장으로 확인해 볼까요? 묵음 단어가 한 문장에 다 들어있습니다. The knight with a sharp knife is kneeling down. knight, knife, kneeling. K 소리를 깔끔하게 지우니 긴 문장도 물 흐르듯 읽히죠?"
- duration: 22.52s (실측 22.52s)
- transition_in: slide-up
- status: outline
- src: compositions/frames/12-sentence-1.html
- type: sentence-practice
- persuasion: 단어 단위에서 문장 단위로 자연스럽게 확장 — 실전 적용력 확인
- beat: 성취감 부여 (차분한 리딩 완성)
- blueprint: sketchnote-card + 리딩 바 스캔
- focal: 한 문장 안에 KN 단어 3개가 연속으로 등장해도 막힘없이 읽히는 흐름
- roles: 문장 카드 = foreground · 리딩 바 = focal thread · "연속 묵음도 막힘없이" 배지 = payoff
- sfx: 스윽 (리딩 바 스캔) ➔ 딩 (완주)
- `caption-pill`:
  - `이제 문장으로 확인해 볼까요? 묵음 단어가 한 문장에 다 들어있습니다.`
  - `The knight with a sharp knife is kneeling down.`
  - `knight, knife, kneeling.`
  - `K 소리를 깔끔하게 지우니 긴 문장도 물 흐르듯 읽히죠?`

---

## Frame 13 — 🗣️ 실전 문장 완성 2: MB + WR 실전 일상 리딩 (Sentence Practice)

- scene: 문장 카드 `Please [comb] your hair and [wrap] the gift before you [write].`
  단어들이 리듬감 있게 하이라이트되며 자연스러운 호흡선으로 연결.
- voiceover: "한 문장만 더 읽어보겠습니다. 이번엔 MB 소리와 WR 소리가 함께 들어있습니다. Please comb your hair and wrap the gift before you write. comb의 B 탈락, wrap과 write의 W 탈락. 소리 없는 철자를 피해 가니 발음이 훨씬 편안해집니다."
- duration: 26.2s (실측 26.2s)
- transition_in: slide-up
- status: outline
- src: compositions/frames/13-sentence-2.html
- type: sentence-practice
- persuasion: 서로 다른 두 서랍(MB+WR)이 한 문장에 섞여도 자연스럽게 적용됨을 확인
- beat: 완전 정복 확신
- blueprint: sketchnote-card + 리듬감 하이라이트
- focal: comb/wrap/write 세 단어가 한 문장 안에서 자연스럽게 이어지는 흐름
- roles: 문장 카드 = foreground · "소리 원리 완전 정복" 마스터 뱃지 = payoff badge
- sfx: 리듬 비트 3연타 ➔ 완주 차임
- `caption-pill`:
  - `한 문장만 더 읽어보겠습니다. 이번엔 MB 소리와 WR 소리가 함께 들어있습니다.`
  - `Please comb your hair and wrap the gift before you write.`
  - `comb의 B 탈락, wrap과 write의 W 탈락.`
  - `소리 없는 철자를 피해 가니 발음이 훨씬 편안해집니다.`

---

## Frame 14 — 📌 체득 요약: 한 장으로 끝내는 묵음 자음 3대 족보 (Summary)

- scene: 3행 마스터 인포그래픽 카드(KN-/-MB/WR- 각 행에 원리·대표 단어 3개). 3개 행이 순서대로
  금빛 점등되며 캡처 카메라 셔터 이펙트.
- voiceover: "오늘 배운 묵음 규칙, 이 한 장만 기억하세요. KN 소리는 K를 버리고 N, MB 소리는 B를 버리고 M, WR 소리는 W를 버리고 R. 화면을 캡처해 두고 단어를 읽을 때마다 꺼내보세요."
- duration: 19.16s (실측 19.16s)
- transition_in: cross-dissolve
- status: outline
- src: compositions/frames/14-summary.html
- type: summary
- persuasion: 다섯 번째 도파민 — 자산화(캡처해서 계속 쓸 수 있는 요약 카드)
- beat: 든든한 마스터 정리
- blueprint: 3단 요약표 + 캡처 카메라 셔터 아이콘
- focal: 3행 요약표가 순서대로 점등되며 완성되는 순간
- roles: 3단 요약표 = foreground · 카메라 셔터 뱃지 = CTA cue
- sfx: 딸깍-딸깍-딸깍 (3행 점등) ➔ 찰칵 (카메라 셔터)
- `caption-pill`:
  - `오늘 배운 묵음 규칙, 이 한 장만 기억하세요.`
  - `KN 소리는 K를 버리고 N, MB 소리는 B를 버리고 M, WR 소리는 W를 버리고 R.`
  - `화면을 캡처해 두고 단어를 읽을 때마다 꺼내보세요.`

---

## Frame 15 — 🎬 클로징 & 엔드스크린 (Closing & End Screen)

- scene: 상반부(0~14초) 중앙 격려 카드 + 추천 영상 안내 카드(EP17, 내부 번호 미노출). **끝
  5초(14~19초) 엔드스크린 Keep-Out**: 화면 중앙 완전 비움, 좌상단 미니 워드마크만 유지.
- voiceover: "영어는 무작정 외우는 게 아니라, 게으른 혀의 소리 원리를 이해하는 겁니다. 지난 모음 뒤 R 편도 함께 보시면 영어가 훨씬 쉬워집니다. 오늘도 수고 많으셨습니다. 이해하면 쉬운영어였습니다."
- duration: 16.64s 나레이션 + 5.0s 엔드스크린 keep-out = 21.64s 총 (누적 총 414.02s / 6분 54.02초)
- transition_in: cross-dissolve
- status: outline
- src: compositions/frames/15-closing.html
- type: closing-retention
- persuasion: 다음 시청(직전 편)으로의 유입 + 브랜드 애착 형성
- beat: 따뜻한 여운과 배웅
- blueprint: clean-endscreen-canvas
- focal: 끝 5초간 유튜브 추천 카드/구독 버튼이 차지할 화면 중앙의 여백
- roles: 격려 카드 = closing message · 추천 영상 카드 = 직전 편(EP17) 연결 · 좌상단 워드마크 =
  안전 구역 브랜드 유지
- sfx: 부드러운 페이드 아웃 차임
- `caption-pill` (0~14초까지만 표시, 끝 5초는 비움):
  - `영어는 무작정 외우는 게 아니라, 게으른 혀의 소리 원리를 이해하는 겁니다.`
  - `지난 모음 뒤 R 편도 함께 보시면 영어가 훨씬 쉬워집니다.`
  - `오늘도 수고 많으셨습니다. 이해하면 쉬운영어였습니다.`
