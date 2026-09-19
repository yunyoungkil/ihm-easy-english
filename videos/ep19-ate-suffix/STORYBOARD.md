---
format: 1920x1080
duration: 455.04s (7분 35.04초 — 12프레임 Gemini Charon TTS + whisper 실측 완료)
message: "똑같이 -ATE로 끝나는 단어라도, 동사일 땐 끝까지 에너지를 전달해 -ate에 보조 에너지(제2강세)가 실려 '에이트'로 당당하게 소리 나고, 명사·형용사일 땐 첫머리에만 힘을 주고 끝소리는 에너지를 완전히 빼버려(슈와 모음 축약) 힘 빠진 '엇/잇'으로 쪼그라든다는 끝소리 에너지 법칙 하나로 수십 개 단어를 단번에 구분할 수 있다."
arc: concept-explainer with practice & bonus tip
audience: "단어 끝 스펠링은 똑같은데 원어민 음성이 다르게 들려 헷갈렸던 4060 기초 영어 회화 도전층"
mode: collaborative
music: 약간 빠른 템포·집중력을 높이는 BGM (data-volume="0.06"), SFX는 고급스럽고 절제된 톤
---

## Video direction

**Visual Grammar (비주얼 씽킹 & 스케치노트 인포그래픽, EP17·18 시스템 계승 고도화)**:
- **캔버스 & 프레임**: 채널 시그니처 웜크림(`#F4EFE6`) + 3.5px 블랙 잉크 펜선 + 5px 솔리드 블랙 드롭섀도 + 부드러운 종이 질감.
- **2대 소리 컬러 코딩**:
  * 🔴 **동사 (행동)**: 버밀리온 코랄(`#FF5E57`) + 끝소리 골드 옐로우(`#FFD32A`) 점등
  * 🔵 **명사·형용사 (이름/상태)**: 틸 블루(`#2E86AB`) + 앞글자 볼드 & 끝소리 소프트 블루(`rgba(46, 134, 171, 0.25)`) 축약
- **5대 맞춤형 AI 일러스트 에셋 탑재**:
  * Frame 3: `assets/images/vocal_energy_flow.jpg` (발성 에너지 흐름 인체 일러스트)
  * Frame 4: `assets/images/estimate_invoice.jpg` (비즈니스 견적서 서류 클립보드)
  * Frame 5: `assets/images/restaurant_check.jpg` (해외 식당 영수증 빌지 클립)
  * Frame 6: `assets/images/gold_certificate.jpg` (금박 압인 리본 공식 증서)
  * Frame 7: `assets/images/chocolate_break.jpg` (부드럽게 쪼개지는 초콜릿 바)
- **모바일 퍼스트 가독성 (Mobile-First Legibility)**:
  * 핵심 영단어 폰트 크기 `6.8cqw` (Archivo Black), 모바일 120px 화면에서도 시원하게 판독.
  * 좌우 2열 대비 카드는 가로폭 42cqw, 높이 60cqh의 황금비 유지.
- **채널 필수 규칙 준수**:
  * 나레이션 전문 무누락 자막(`caption-pill`) 전 프레임 탑재.
  * Frame 12 끝 5초 유튜브 엔드스크린 중앙 100% 완전 비움(Keep-out Zone, 워드마크 좌상단 배치).
  * Frame 8·9 퀴즈는 3초 카운트다운 중 정답 시각적 선노출 엄격 차단.
  * Frame 4·5·6의 3회 반복 낭독(Listen & Repeat) 구간에 3회 연속 펄스 점등 비트 부여.
  * Frame 10 실전 문장 리스닝은 Whisper 타임스탬프 기반 단어별 카라오케 칼싱크 점등.

---

## Frame 1 — 0초 직격타: 귀로 듣는 충격 (Cold Open)

- scene: 웜크림 캔버스 위에 `estimate`와 `graduate` 카드가 가로 2열 대칭으로 팝업. 동사 소리 `[-에이트]`와 명사 소리 `[-멋 / -엇]`이 붉은색과 파란색의 선명한 소리 파형으로 날카롭게 갈라지며 청각적 충격과 시각적 인지 부조화 직격.
- voiceover: "동사로 움직일 때 to estimate는 '에스티메이트'인데, 명사 서류 an estimate는 왜 '에스티멋'일까요? to graduate는 '그래듀에이트'인데, a graduate는 왜 '그래듀엇'일까요? 스펠링은 분명 100% 똑같은데, 방금 끝소리가 완전히 다르게 끝나는 것 들으셨나요? 오늘 이 기준 하나만 알면, 단어마다 사전을 뒤지지 않아도 입에서 바로 구분됩니다."
- duration: 30.24s (whisper 실측 30.24s)
- transition_in: cut
- status: ready_to_implement
- src: compositions/frames/01-cold-open.html
- type: hook
- persuasion: 인지 부조화(Cognitive Dissonance) 직격 + 명시적 시청자 이득("사전 없이 한 번에 구분")
- blueprint: contrast-dual-card (2열 대칭) + kinetic sound waves
- focal: `estimate`와 `graduate`의 동일한 철자에서 소리가 완전히 둘로 쪼개지는 순간
- roles: 2개 대비 카드 = foreground subject · 분기 소리 파형 = focal thread · 웜크림 캔버스 = background
- sfx: 팝-팝 (카드 등장) ➔ 슈웅 (소리 갈라짐) ➔ 쿵 (의문 제기) ➔ 찰칵 (골드 뱃지 점등)
- **Micro-Beats (Whisper 동기화 타임라인)**:
  * **Beat 1 (0.00s ~ 5.55s)**: `to estimate는 '에스티메이트'인데` 발화에 맞춰 상단 좌측 카드 `to estimate` 등장 + 빨간색 파형 진동.
  * **Beat 2 (5.55s ~ 9.80s)**: `명사 서류 an estimate는 왜 '에스티멋'일까요?` 발화에 맞춰 상단 우측 카드 `an estimate` 팝업 + 파란색 꺾인 파형 진동.
  * **Beat 3 (9.80s ~ 15.60s)**: `to graduate는... a graduate는...` 발화와 함께 하단 2열 `graduate` 대조 카드 동일하게 슬라이드업.
  * **Beat 4 (15.60s ~ 22.40s)**: `스펠링은 분명 100% 똑같은데...` 두 카드 중앙에 거대한 붉은 물음표(`?`) 펄스.
  * **Beat 5 (22.40s ~ 30.24s)**: `오늘 이 기준 하나만 알면...` 상단에 황금 캡슐 `[ 사전 없이 한 번에 구분하는 비밀 ]` 점등.
- `caption-pill`:
  - `동사로 움직일 때 to estimate는 '에스티메이트'인데, 명사 서류 an estimate는 왜 '에스티멋'일까요?`
  - `to graduate는 '그래듀에이트'인데, a graduate는 왜 '그래듀엇'일까요?`
  - `스펠링은 분명 100% 똑같은데, 방금 끝소리가 완전히 다르게 끝나는 것 들으셨나요?`
  - `오늘 이 기준 하나만 알면, 단어마다 사전을 뒤지지 않아도 입에서 바로 구분됩니다.`

---

## Frame 2 — 3초 미니 인트로 & 황금 공식 선언 (Hook & Rule)

- scene: 채널 워드마크(`이해하면 ` 딥 차콜 + `쉬운영어` 골드 옐로우)가 3초간 중앙에 임팩트 있게 등장한 후 좌상단으로 초고속 축소 안착. 곧바로 중앙에 대형 듀얼 공식 보드 팝업 ("동사=에이트, 명사/형용사=엇/잇").
- voiceover: "안녕하세요, 「이해하면 쉬운영어」입니다. 단어마다 따로 외우지 마세요. 움직이는 행동, 즉 동사일 땐 '에이트'로 당당하게 소리 나고, 이름이나 상태, 즉 명사나 형용사일 땐 힘 빠진 '엇'으로 소리가 바뀝니다. 단어의 자리가 소리를 결정합니다."
- duration: 23.32s (whisper 실측 23.32s)
- transition_in: smooth-morph
- status: ready_to_implement
- src: compositions/frames/02-intro.html
- type: brand-hook
- persuasion: 30초 내 확실한 솔루션 선제 제시 ➔ 이탈 차단 & 락인
- blueprint: channel-wordmark-header + sketchnote-card
- focal: `[ 🔴 동사 ➔ '에이트' ]` vs `[ 🔵 명사·형용사 ➔ '엇 / 잇' ]`
- roles: 워드마크 = header · 듀얼 공식 보드 = foreground
- sfx: 맑은 크리스탈 차임 ➔ 찰칵 (공식 카드 고정)
- **Micro-Beats (Whisper 동기화 타임라인)**:
  * **Beat 1 (0.00s ~ 3.20s)**: 중앙에 채널 워드마크 스케일업(0.95 ➔ 1.0) ➔ 3.2초에 좌상단(`top: 6cqh; left: 6cqw`)으로 스무스 이동.
  * **Beat 2 (3.20s ~ 7.80s)**: `단어마다 따로 외우지 마세요.` 화면 중앙에 부드러운 붉은 X 표시 드로잉.
  * **Beat 3 (7.80s ~ 14.50s)**: `움직이는 행동, 즉 동사일 땐 '에이트'로...` 좌측 버밀리온 코랄 카드 `[ 🔴 동사 (행동) ➔ '에이트!' ]` 팝업.
  * **Beat 4 (14.50s ~ 20.20s)**: `이름이나 상태, 즉 명사나 형용사일 땐...` 우측 틸 블루 카드 `[ 🔵 명사·형용사 (이름/상태) ➔ '엇 / 잇' ]` 팝업.
  * **Beat 5 (20.20s ~ 23.32s)**: `단어의 자리가 소리를 결정합니다.` 하단에 골드 밑줄 드로잉 완성.
- `caption-pill`:
  - `안녕하세요, 「이해하면 쉬운영어」입니다.`
  - `단어마다 따로 외우지 마세요.`
  - `움직이는 행동, 즉 동사일 땐 '에이트'로 당당하게 소리 나고,`
  - `이름이나 상태, 즉 명사나 형용사일 땐 힘 빠진 '엇'으로 소리가 바뀝니다.`
  - `단어의 자리가 소리를 결정합니다.`

---

## Frame 3 — 소리의 진짜 비밀: 끝소리 에너지 법칙 (The Deep Principle)

- scene: 맞춤형 스케치노트 인체 일러스트(`assets/images/vocal_energy_flow.jpg`)가 화면 중앙에 배치. 사전 발음기호(`ˈes-`)를 보여주며 둘 다 맨 앞(1음절)에 제1강세가 있음을 확인. 나레이션에 맞춰 동사는 불꽃(🔥) 경로로 에너지가 뻗어나가고, 명사는 나뭇잎(💨) 경로로 0% 이완되는 실시간 오버레이 연출.
- voiceover: "왜 이런 차이가 생길까요? 사전을 찾아보면 두 단어 모두 맨 앞 음절에 가장 센 제1강세가 있습니다. 진짜 차이는 맨 끝의 -ate 소리에 힘을 주느냐, 완전히 빼버리느냐에 있습니다. 무언가를 행동하는 동사는 동작을 확실하게 끝맺어야 하니까, 맨 끝의 -ate 소리에도 보조 에너지를 살려서 '에이트!' 하고 또렷하게 발음합니다. 반대로 사물의 이름이나 상태는 첫머리만 들려주면 무슨 단어인지 다 알기 때문에, 끝에 있는 -ate 소리에는 아무런 힘도 주지 않고 목구멍의 힘을 툭 빼버립니다. 에너지를 0%로 완전히 빼버리니 힘 빠진 '엇' 하고 자연스럽게 쪼그라드는 것이죠."
- duration: 49.88s (whisper 실측 49.88s)
- transition_in: slide-up
- status: ready_to_implement
- src: compositions/frames/03-principle.html
- type: concept-explainer
- persuasion: 음성학적 진실(1음절 제1강세 공통) + 인체 에너지 직관 비유
- blueprint: energy-gauge-sketch + `assets/images/vocal_energy_flow.jpg`
- focal: 동사의 끝소리 보조 에너지(🔥) vs 명사의 끝소리 0% 완전 이완(💨)
- roles: 게이지 다이어그램 = foreground · 사전 발음기호 태그 = reference
- sfx: 쉭 (에너지 방출) ➔ 하아- (부드러운 이완음)
- **Micro-Beats (Whisper 동기화 타임라인)**:
  * **Beat 1 (0.00s ~ 10.20s)**: `vocal_energy_flow.jpg` 일러스트 페이드인 + 상단에 `ˈes-` 제1강세 공통 태그 점등.
  * **Beat 2 (10.20s ~ 18.50s)**: `진짜 차이는 맨 끝의 -ate 소리에 힘을 주느냐...` 일러스트 우측 상단/하단 분기 화살표 하이라이트.
  * **Beat 3 (18.50s ~ 28.60s)**: `행동하는 동사는 동작을 끝맺어야 하니까...` 상단 불꽃 경로(🔥)에 붉은 네온 오버레이 활성화.
  * **Beat 4 (28.60s ~ 41.20s)**: `사물의 이름이나 상태는 첫머리만 들려주면...` 하단 나뭇잎 경로(💨)에 소프트 블루 이완 오버레이 활성화.
  * **Beat 5 (41.20s ~ 49.88s)**: `에너지를 0%로 완전히 빼버리니...` '엇' 글자가 스르륵 쪼그라들며 안착.
- `caption-pill`:
  - `왜 이런 차이가 생길까요? 사전을 찾아보면 두 단어 모두 맨 앞 음절에 가장 센 제1강세가 있습니다.`
  - `진짜 차이는 맨 끝의 -ate 소리에 힘을 주느냐, 완전히 빼버리느냐에 있습니다.`
  - `무언가를 행동하는 동사는 동작을 확실하게 끝맺어야 하니까,`
  - `맨 끝의 -ate 소리에도 보조 에너지를 살려서 '에이트!' 하고 또렷하게 발음합니다.`
  - `반대로 사물의 이름이나 상태는 첫머리만 들려주면 무슨 단어인지 다 알기 때문에,`
  - `끝에 있는 -ate 소리에는 아무런 힘도 주지 않고 목구멍의 힘을 툭 빼버립니다.`
  - `에너지를 0%로 완전히 빼버리니 힘 빠진 '엇' 하고 자연스럽게 쪼그라드는 것이죠.`

---

## Frame 4 — 1번 실전 낭독: estimate [견적서 맥락] ⭐️ [3회 낭독]

- scene: 우측 상단에 정교한 비즈니스 견적서 일러스트(`assets/images/estimate_invoice.jpg`) 배치. 좌측엔 `to estimate` [에스티메이트], 우측엔 `an estimate` [에스티멋] 카드 배치. 하단에 `[ 👄 턱에 힘을 완전히 빼고 '멋' 하고 툭! ]` 손글씨 코칭 팁 점등. 시청자 3회 낭독 구간(28.5s~37.2s)에서 우측 카드가 3회 리드미컬하게 골드 펄스 점등.
- voiceover: "저도 예전에 해외 직구나 이메일에서 estimate를 볼 때마다 '에스티메이트'로만 읽었었는데, 원어민들은 자꾸 '에스티멋'이라고 하더라고요. 이제 이유를 아시겠죠? '견적을 내다'라는 행동일 땐 뒤를 힘차게 밀어서 to estimate. 반대로 '견적서'라는 명사 서류일 땐 첫 글자만 세게 치고 뒤는 턱의 힘을 툭 빼서 an estimate. 입술과 턱에 힘을 완전히 빼고 가볍게 3번 소리 내보실까요? an estimate, an estimate, an estimate. 턱이 툭 떨어지며 편안해지는 게 느껴지시죠?"
- duration: 43.68s (whisper 실측 43.68s)
- transition_in: cut
- status: ready_to_implement
- src: compositions/frames/04-practice-estimate.html
- type: practical-training
- persuasion: 동반자 공감("저도 예전엔...") + 신체 감각 체득
- blueprint: contrast-dual-card + `assets/images/estimate_invoice.jpg`
- focal: `an [ ES ] ti mate`의 앞글자 강타와 뒷글자 힘 빠짐
- roles: 좌우 대비 카드 = foreground · 견적서 일러스트 = real context · 손글씨 코칭 바 = supporting coach
- sfx: 띡-띡-띡 (3회 반복 비트) ➔ 띵 (성공 차임)
- **Micro-Beats (Whisper 동기화 타임라인)**:
  * **Beat 1 (0.00s ~ 9.80s)**: `estimate_invoice.jpg` 서류가 우측 상단에 슬라이드인되며 개인 경험담 공감 형성.
  * **Beat 2 (9.80s ~ 18.20s)**: `견적을 내다라는 행동일 땐...` 좌측 동사 카드 `to esti[MATE]` 점등.
  * **Beat 3 (18.20s ~ 28.50s)**: `반대로 견적서라는 명사 서류일 땐...` 우측 명사 카드 `an [ES]timate` 점등 + `[ 👄 턱 힘 툭! ]` 뱃지 팝업.
  * **Beat 4 (28.50s ~ 38.80s) ⭐️**: `an estimate, an estimate, an estimate.` 3회 반복 낭독에 맞춰 우측 카드가 골드 네온 펄스로 3회 박동!
  * **Beat 5 (38.80s ~ 43.68s)**: `턱이 툭 떨어지며 편안해지는 게 느껴지시죠?` 성공 초록 체크마크 팝업.
- `caption-pill`:
  - `저도 예전에 해외 직구나 이메일에서 estimate를 볼 때마다 '에스티메이트'로만 읽었었는데,`
  - `원어민들은 자꾸 '에스티멋'이라고 하더라고요. 이제 이유를 아시겠죠?`
  - `'견적을 내다'라는 행동일 땐 뒤를 힘차게 밀어서 to estimate.`
  - `반대로 '견적서'라는 명사 서류일 땐 첫 글자만 세게 치고 뒤는 턱의 힘을 툭 빼서 an estimate.`
  - `입술과 턱에 힘을 완전히 빼고 가볍게 3번 소리 내보실까요?`
  - `an estimate, an estimate, an estimate.`
  - `턱이 툭 떨어지며 편안해지는 게 느껴지시죠?`

---

## Frame 5 — 2번 실전 낭독: separate [식당·계산 맥락] ⭐️ [3회 낭독]

- scene: 우측 상단에 레스토랑 계산서 일러스트(`assets/images/restaurant_check.jpg`) 배치. `separate check` 카드가 등장하며 '세퍼레이트' 취소선 ➔ `[ 세퍼럿 체크 ]` 형용사 카드 강조. 반대로 동사 `to separate`는 뒤를 힘차게 밀어주는 대비 연출. 시청자 3회 낭독 구간(33.5s~43.2s)에 맞춰 `separate` 3회 펄스 점등.
- voiceover: "두 번째는 해외 식당에서 계산할 때 무조건 쓰는 separate입니다. 식당에서 "계산 따로따로 해주세요" 할 때 원어민들은 뭐라고 할까요? '따로따로의'라는 상태를 나타내니까 앞만 쾅 치고 뒤는 힘을 뺍니다. separate check! '세퍼레이트'가 아니라 '세퍼럿 체크'라고 해야 원어민 귀에 한 번에 꽂힙니다. 반대로 무언가를 '나누다'라는 행동일 땐 뒤를 살려 to separate. 자, 식당에서 주문하듯 형용사 소리를 3번 따라 해보겠습니다. separate, separate, separate. 앞글자만 치고 뒤를 버리니 입이 정말 편하죠? "
- duration: 49.96s (whisper 실측 49.96s)
- transition_in: cut
- status: ready_to_implement
- src: compositions/frames/05-practice-separate.html
- type: practical-training
- persuasion: 해외여행/식당 필수 실전 회화 맥락 결합
- blueprint: contrast-dual-card + `assets/images/restaurant_check.jpg`
- focal: `[ SE ] pa rate` 앞글자 타격과 뒤 버리기
- roles: 영수증 일러스트 = theme context · 3회 낭독 카드 = foreground
- sfx: 영수증 찌익 출력음 ➔ 띡-띡-띡 (3회 반복 비트)
- **Micro-Beats (Whisper 동기화 타임라인)**:
  * **Beat 1 (0.00s ~ 10.40s)**: `restaurant_check.jpg` 빌지가 슬라이드인되며 해외 식당 상황 제시.
  * **Beat 2 (10.40s ~ 22.80s)**: `'세퍼레이트' 취소선 ❌` ➔ `[ 세퍼럿 체크 ⭕ ]` 강조 카드 등장.
  * **Beat 3 (22.80s ~ 31.20s)**: `반대로 나누다라는 행동일 땐...` 좌측 동사 카드 `to sepa[RATE]` 점등.
  * **Beat 4 (31.20s ~ 43.50s) ⭐️**: `separate, separate, separate.` 3회 반복 낭독에 맞춰 형용사 카드가 블루 네온 펄스로 3회 박동!
  * **Beat 5 (43.50s ~ 49.96s)**: `앞글자만 치고 뒤를 버리니...` 편안한 미소 이모지 팝업.
- `caption-pill`:
  - `두 번째는 해외 식당에서 계산할 때 무조건 쓰는 separate입니다.`
  - `식당에서 "계산 따로따로 해주세요" 할 때 원어민들은 뭐라고 할까요?`
  - `'따로따로의'라는 상태를 나타내니까 앞만 쾅 치고 뒤는 힘을 뺍니다. separate check!`
  - `'세퍼레이트'가 아니라 '세퍼럿 체크'라고 해야 원어민 귀에 한 번에 꽂힙니다.`
  - `반대로 무언가를 '나누다'라는 행동일 땐 뒤를 살려 to separate.`
  - `자, 식당에서 주문하듯 형용사 소리를 3번 따라 해보겠습니다.`
  - `separate, separate, separate.`
  - `앞글자만 치고 뒤를 버리니 입이 정말 편하죠?`

---

## Frame 6 — 3번 실전 낭독: graduate & certificate [자격증 콩글리시 탈출] ⭐️ [3회 낭독]

- scene: 우측 상단에 금박 압인 리본이 달린 골드 자격증 일러스트(`assets/images/gold_certificate.jpg`) 배치. 상단에 `graduate` 동사/명사 대비. 하단에 스펠링만 보고 읽던 '서티피케이트'에 붉은 빗금 ➔ 명사 증명서이므로 `[ 서티피킷 / 서티피컷 ]` 정답 도장 쾅! 시청자 3회 낭독(`certificate × 3`, 36.2s~46.5s) 점등.
- voiceover: "세 번째는 학교와 자격증에 나오는 단어들입니다. '졸업하다'라는 행동일 땐 to graduate, 당당하게 '에이트'로 소리 냅니다. 하지만 '졸업생'이라는 명사가 되면 a graduate, '그래듀엇'으로 힘이 빠집니다. 우리가 자격증이나 호텔 예약할 때 보는 certificate도 마찬가지입니다. 스펠링만 보고 습관적으로 '서티피케이트'라고 읽으셨을 텐데요. 증명서라는 이름표니까 끝에 힘을 툭 빼서 certificate, '서티피킷' 하고 줄여 읽어야 원어민이 한 번에 알아듣습니다. 소리 내어 3번 연습해 볼까요? certificate, certificate, certificate. 이제 어려운 고급 단어들도 원리가 한 손에 잡히실 겁니다."
- duration: 53.72s (whisper 실측 53.72s)
- transition_in: cut
- status: ready_to_implement
- src: compositions/frames/06-practice-certificate.html
- type: practical-training
- persuasion: 한국인 90%가 틀리던 대표 콩글리시 교정 카타르시스
- blueprint: contrast-dual-card + `assets/images/gold_certificate.jpg`
- focal: `certificate`의 콩글리시 탈출과 `서티피킷` 각인
- roles: 자격증 증서 카드 = foreground · 4대 핵심 단어 정복 뱃지 = achievement
- sfx: 스탬프 쾅 (도장 찍힘) ➔ 띡-띡-띡 (3회 반복 비트) ➔ 팡파레
- **Micro-Beats (Whisper 동기화 타임라인)**:
  * **Beat 1 (0.00s ~ 13.50s)**: 상단에 `to graduate [그래듀에이트]` vs `a graduate [그래듀엇]` 대비 카드 점등.
  * **Beat 2 (13.50s ~ 24.80s)**: `gold_certificate.jpg` 자격증 증서 등장 + `서티피케이트` 붉은 빗금 긋기.
  * **Beat 3 (24.80s ~ 36.20s)**: `증명서라는 이름표니까...` `[ 서티피킷 ⭕ ]` 골드 스탬프 쾅!
  * **Beat 4 (36.20s ~ 47.00s) ⭐️**: `certificate, certificate, certificate.` 3회 반복 낭독 구간에서 자격증 카드가 3회 리드미컬 펄스 점등!
  * **Beat 5 (47.00s ~ 53.72s)**: 하단에 `[ 4대 핵심 단어 완벽 정복! 🏆 ]` 골드 뱃지 팝업.
- `caption-pill`:
  - `세 번째는 학교와 자격증에 나오는 단어들입니다.`
  - `'졸업하다'라는 행동일 땐 to graduate, 당당하게 '에이트'로 소리 냅니다.`
  - `하지만 '졸업생'이라는 명사가 되면 a graduate, '그래듀엇'으로 힘이 빠집니다.`
  - `우리가 자격증이나 호텔 예약할 때 보는 certificate도 마찬가지입니다.`
  - `스펠링만 보고 습관적으로 '서티피케이트'라고 읽으셨을 텐데요.`
  - `증명서라는 이름표니까 끝에 힘을 툭 빼서 certificate, '서티피킷' 하고 줄여 읽어야 원어민이 한 번에 알아듣습니다.`
  - `소리 내어 3번 연습해 볼까요?`
  - `certificate, certificate, certificate.`
  - `이제 어려운 고급 단어들도 원리가 한 손에 잡히실 겁니다.`

---

## Frame 7 — 중간 환기 & 도파민 폭발: "초콜릿이 '초콜레이트'가 아닌 진짜 이유" (Secret Tip)

- scene: 3분대 학습 피로도를 리셋하는 달콤한 반전 코너. 스케치노트 초콜릿 바 일러스트(`assets/images/chocolate_break.jpg`)가 '뚝' 부러지는 애니메이션. `choco [ LATE ]` 스펠링 노출. 동사였다면 초콜레이트? ❌ ➔ 명사니까 `[ 초콜릿 ]` ⭕. 이어 `climate [클라이멋]`, `private [프라이벗]` 카드가 경쾌하게 연속 팝업.
- voiceover: "그런데 놀랍게도, 여러분은 이미 평생 동안 이 규칙을 입으로 쓰고 계셨습니다. 우리가 매일 맛있게 먹는 초콜릿의 영어 스펠링을 볼까요? c, h, o, c, o, l, a, t, e. 끝이 분명 -ate 철자로 끝나죠. 만약 이 단어가 동사였다면 우리는 평생 '초콜레이트'라고 불렀을 겁니다. 하지만 달콤한 간식의 이름, 즉 명사이기 때문에 첫머리에만 힘을 주고 뒤는 힘이 툭 빠져서 chocolate, '초콜릿'으로 굳어진 것입니다. 기후를 뜻하는 climate도 '클라이멋', 개인적인을 뜻하는 private도 '프라이벗'인 이유가 바로 여기에 있습니다. 우리 혀는 이미 정답을 알고 있었던 것이죠."
- duration: 53.24s (whisper 실측 53.24s)
- transition_in: pop-bounce
- status: ready_to_implement
- src: compositions/frames/07-secret-tip.html
- type: bonus-revelation
- persuasion: 일상 친숙한 단어와의 연결로 "이미 알고 있었다"는 자존감 회복
- blueprint: secret-tip-showcase + `assets/images/chocolate_break.jpg`
- focal: 초콜릿 스펠링 `-ATE`와 실제 발음의 비밀
- roles: 초콜릿 일러스트 = visual anchor · 3대 일상 단어 카드 = supporting proof
- sfx: 뚝 (초콜릿 부러지는 소리) ➔ 띠링 (유레카 전구 점등)
- **Micro-Beats (Whisper 동기화 타임라인)**:
  * **Beat 1 (0.00s ~ 11.50s)**: `chocolate_break.jpg` 일러스트 등장 + `c-h-o-c-o-l-a-t-e` 글자가 하나씩 팝업.
  * **Beat 2 (11.50s ~ 21.80s)**: `초콜레이트? ❌` 취소선 긋기.
  * **Beat 3 (21.80s ~ 34.60s)**: `간식의 이름(명사)이니까...` ➔ `[ 초콜릿 ⭕ ]` 골드 옐로우 하이라이트 점등.
  * **Beat 4 (34.60s ~ 46.20s)**: `climate [클라이멋]`(기후), `private [프라이벗]`(개인적인) 카드 연쇄 팝업.
  * **Beat 5 (46.20s ~ 53.24s)**: `우리 혀는 이미 정답을 알고 있었습니다!` 전구 유레카 반짝이 점등.
- `caption-pill`:
  - `그런데 놀랍게도, 여러분은 이미 평생 동안 이 규칙을 입으로 쓰고 계셨습니다.`
  - `우리가 매일 맛있게 먹는 초콜릿의 영어 스펠링을 볼까요? c, h, o, c, o, l, a, t, e. 끝이 분명 -ate 철자로 끝나죠.`
  - `만약 이 단어가 동사였다면 우리는 평생 '초콜레이트'라고 불렀을 겁니다.`
  - `하지만 달콤한 간식의 이름, 즉 명사이기 때문에 첫머리에만 힘을 주고 뒤는 힘이 툭 빠져서 chocolate, '초콜릿'으로 굳어진 것입니다.`
  - `기후를 뜻하는 climate도 '클라이멋', 개인적인을 뜻하는 private도 '프라이벗'인 이유가 바로 여기에 있습니다.`
  - `우리 혀는 이미 정답을 알고 있었던 것이죠.`

---

## Frame 8 — 실전 훈련 1: 3초 퀴즈 1라운드 [신규 단어 moderate] ⭐️

- scene: 네오브루탈리즘 퀴즈 카드에 완전 신규 단어 `moderate` [뜻: 조절하다, 완화하다 (동사)] 제시. 3초 동안 원형 타이머 링이 긴장감 있게 회전. **3초 동안 정답 힌트 색상 일체 미노출.** 정답 발표 순간 ① `[ 모더레이트 ]`에 골드 네온 테두리와 팡파레 점등.
- voiceover: "이제 원리를 완전히 이해하셨으니 직접 맞춰보실 시간입니다. 한 번도 배운 적 없는 새로운 단어로 도전해 볼까요? 화면에 나오는 이 단어 보이시죠? '조절하다', '완화하다'라는 움직임, 즉 동사로 쓰일 땐 이 단어를 어떻게 읽어야 할까요? 잠깐 생각해 보세요. (3초 정적) 네, 행동을 나타내는 동사니까 끝까지 에너지를 밀어붙여야겠죠. 정답은 바로 '모더레이트'입니다."
- duration: 35.52s (whisper 실측 35.52s: 08a 23.08s + 침묵 3.0s + 08b 9.44s)
- transition_in: slide-up
- status: ready_to_implement
- src: compositions/frames/08-quiz-moderate.html
- type: interactive-quiz
- persuasion: 신규 단어를 스스로 맞추며 얻는 도파민 폭발
- blueprint: quiz-countdown-card
- focal: 3초 카운트다운 게이지와 정답 점등 순간
- roles: 퀴즈 카드 = foreground · 타이머 링 = tension driver
- sfx: 째깍-째깍-째깍 (3초 카운트다운) ➔ 딩동댕 (정답 차임)
- **Micro-Beats (Whisper 동기화 타임라인)**:
  * **Beat 1 (0.00s ~ 15.20s)**: 퀴즈 카드 슬라이드인 (`moderate`, 역할 힌트: '조절하다(동사)').
  * **Beat 2 (15.20s ~ 23.08s)**: 보기 ① 모더레이트 vs ② 모더럿 노출 (둘 다 중립 흰색 카드).
  * **Beat 3 (23.08s ~ 26.08s) ⭐️ [3초 무음]**: 3초 원형 타이머 링 회전 (3 ➔ 2 ➔ 1). 스포일러 일체 차단!
  * **Beat 4 (26.08s ~ 35.52s)**: 08b 나레이션과 함께 ① `[ 모더레이트 ]`에 골드 네온 테두리 점등 + 축하 파티클 폭발!
- `caption-pill`:
  - `이제 원리를 완전히 이해하셨으니 직접 맞춰보실 시간입니다.`
  - `한 번도 배운 적 없는 새로운 단어로 도전해 볼까요?`
  - `화면에 나오는 이 단어 보이시죠?`
  - `'조절하다', '완화하다'라는 움직임, 즉 동사로 쓰일 땐 이 단어를 어떻게 읽어야 할까요?`
  - `잠깐 생각해 보세요.`
  - `네, 행동을 나타내는 동사니까 끝까지 에너지를 밀어붙여야겠죠.`
  - `정답은 바로 '모더레이트'입니다.`

---

## Frame 9 — 실전 훈련 2: 3초 퀴즈 2라운드 [신규 단어 delegate] ⭐️

- scene: 연속 퀴즈로 템포 업. 신규 단어 `delegate` [뜻: 대표자, 대리인 (명사)] 제시. 3초 타이머 회전 후 ② `[ 델리것 ]`에 스카이블루 하이라이트 번쩍 점등. "2문제 연속 정답 달성! 🏆" 황금 뱃지 팝업.
- voiceover: "하나 더 도전해 보시죠. 이번에도 처음 만나는 단어입니다. 화면의 이 단어가 회사의 '대표자'나 '대리인'이라는 사람의 이름, 즉 명사로 쓰일 땐 뒤 소리가 어떻게 바뀔까요? 3초 동안 생각해 보세요. (3초 정적) 맞습니다! 이름표를 달았으니 앞머리에 힘을 주고 뒤는 툭 떨어뜨려야 하죠. 정답은 바로 '델리것'입니다. 두 문제 다 맞히셨나요?"
- duration: 32.92s (whisper 실측 32.92s: 09a 16.60s + 침묵 3.0s + 09b 13.32s)
- transition_in: cut
- status: ready_to_implement
- src: compositions/frames/09-quiz-delegate.html
- type: interactive-quiz
- persuasion: 연속 성공으로 인한 학습 확신 완성
- blueprint: quiz-countdown-card
- focal: 이름표(명사) 힌트에 따른 `델리것` 선택과 정답 팡파레
- roles: 퀴즈 카드 = foreground · 2연속 정답 뱃지 = payoff
- sfx: 째깍-째깍-째깍 ➔ 딩동댕 ➔ 팡파레
- **Micro-Beats (Whisper 동기화 타임라인)**:
  * **Beat 1 (0.00s ~ 10.50s)**: 퀴즈 카드 전환 (`delegate`, 역할 힌트: '대표자/대리인(명사)').
  * **Beat 2 (10.50s ~ 16.60s)**: 보기 ① 델리게이트 vs ② 델리것 노출 (중립 배색).
  * **Beat 3 (16.60s ~ 19.60s) ⭐️ [3초 무음]**: 3초 스피드 타이머 게이지 회전.
  * **Beat 4 (19.60s ~ 32.92s)**: 09b 발화와 함께 ② `[ 델리것 ]`에 틸 블루 네온 테두리 점등 + "2문제 연속 정답! 🏆" 트로피 뱃지 등장.
- `caption-pill`:
  - `하나 더 도전해 보시죠. 이번에도 처음 만나는 단어입니다.`
  - `화면의 이 단어가 회사의 '대표자'나 '대리인'이라는 사람의 이름, 즉 명사로 쓰일 땐 뒤 소리가 어떻게 바뀔까요?`
  - `3초 동안 생각해 보세요.`
  - `맞습니다! 이름표를 달았으니 앞머리에 힘을 주고 뒤는 툭 떨어뜨려야 하죠.`
  - `정답은 바로 '델리것'입니다.`
  - `두 문제 다 맞히셨나요?`

---

## Frame 10 — 실전 훈련 3: 미드 속 2단 콤보 실전 문장 리스닝 ⭐️

- scene: 실제 미드 대화방 느낌의 2단 문장 카드. 문장 1 (*"Can you estimate the cost?"*)과 문장 2 (*"Send me the estimate."*)가 상하로 배치되며, 나레이션 발화에 맞춰 단어별 카라오케 워드 트래킹 칼싱크 작동. `[에스티메이트]`는 골드로, `[에스티멋]`은 스카이블루로 또렷하게 분기 점등.
- voiceover: "그럼 실제 문장 속에서는 원어민 소리가 어떻게 날아올까요? 두 문장을 연달아 들어보겠습니다. 첫 번째, "Can you estimate the cost?"에서는 '추정하다'라는 동사라 estimate, '에스티메이트'가 또렷하게 꽂힙니다. 반대로 두 번째, "Send me the estimate."에서는 '견적서'라는 명사라 estimate, 힘이 쑥 빠진 '에스티멋'으로 툭 떨어집니다. 문장 속에서도 두 소리의 자리가 선명하게 갈라지죠?"
- duration: 33.40s (whisper 실측 33.40s)
- transition_in: slide-up
- status: ready_to_implement
- src: compositions/frames/10-sentence-listening.html
- type: listening-mastery
- persuasion: 단어에서 문장 단위로 확장되어 실제 미드 리스닝 귀가 뚫리는 체험
- blueprint: sentence-karaoke-card
- focal: 문장 속에서 0.5초 만에 갈라지는 `estimate`의 두 얼굴
- roles: 2단 문장 카드 = foreground · 오디오 파형 바 = visual feedback
- sfx: 띠링-띠링 (문장 하이라이트) ➔ 오디오 파형 반응음
- **Micro-Beats (Whisper 동기화 타임라인)**:
  * **Beat 1 (0.00s ~ 5.40s)**: 2단 문장 카드 등장.
  * **Beat 2 (5.40s ~ 16.80s)**: 1번 문장 *"Can you estimate the cost?"* 워드 트래킹 점등 + `[에스티메이트]` 골드 하이라이트.
  * **Beat 3 (16.80s ~ 28.20s)**: 2번 문장 *"Send me the estimate."* 워드 트래킹 점등 + `[에스티멋]` 스카이블루 하이라이트.
  * **Beat 4 (28.20s ~ 33.40s)**: 두 문장 사이의 대비 화살표가 번쩍이며 리스닝 귀 뚫림 완성.
- `caption-pill`:
  - `그럼 실제 문장 속에서는 원어민 소리가 어떻게 날아올까요?`
  - `두 문장을 연달아 들어보겠습니다.`
  - `첫 번째, "Can you estimate the cost?"에서는 '추정하다'라는 동사라 estimate, '에스티메이트'가 또렷하게 꽂힙니다.`
  - `반대로 두 번째, "Send me the estimate."에서는 '견적서'라는 명사라 estimate, 힘이 쑥 빠진 '에스티멋'으로 툭 떨어집니다.`
  - `문장 속에서도 두 소리의 자리가 선명하게 갈라지죠?`

---

## Frame 11 — 한 장 요약 공식 맵 (Summary Map) ⭐️

- scene: 화면 전체를 꽉 채우는 네오브루탈리즘 캡처용 마스터보드. 상단에 `[ 📸 지금 화면을 캡처해 두세요! ]` 뱃지. 좌측엔 동사 4대 단어(estimate, separate, graduate, moderate)와 `[-에이트]`, 우측엔 명사/형용사 5대 단어(estimate, separate, certificate, chocolate, delegate)와 `[-엇 / -잇]` 완벽 정리.
- voiceover: "오늘 배운 핵심, 딱 이 한 장만 기억하시면 됩니다. -ate 철자로 끝나는 단어를 만났을 때, 행동하는 동사라면 끝까지 힘을 살려 '에이트'! 사람이나 사물의 이름, 상태를 나타낸다면 뒤를 툭 떨어뜨려 '엇' 또는 '잇'! 이 소리 공식 하나만 마음에 품으시면 수십 개의 고급 단어가 저절로 정복됩니다."
- duration: 28.56s (whisper 실측 28.56s)
- transition_in: scale-up
- status: ready_to_implement
- src: compositions/frames/11-summary.html
- type: synthesis
- persuasion: 캡처하고 싶은 완벽한 요약으로 평생 무기 장착
- blueprint: summary-master-board
- focal: 캡처 가이드 프레임과 좌우 2대 공식 완성도
- roles: 마스터보드 = full viewport subject
- sfx: 찰칵 (카메라 셔터음) ➔ 부드러운 글리머
- **Micro-Beats (Whisper 동기화 타임라인)**:
  * **Beat 1 (0.00s ~ 4.50s)**: 마스터보드 테두리가 스케일업되며 캡처 카메라 뱃지 점등.
  * **Beat 2 (4.50s ~ 12.80s)**: 좌측 동사 4대 단어 및 `[-에이트]` 버밀리온 코랄 블록 점등.
  * **Beat 3 (12.80s ~ 21.40s)**: 우측 명사/형용사 5대 단어 및 `[-엇 / -잇]` 틸 블루 블록 점등.
  * **Beat 4 (21.40s ~ 28.56s)**: 마스터보드 외곽선에 골드 글리머가 한 바퀴 돌며 완성.
- `caption-pill`:
  - `오늘 배운 핵심, 딱 이 한 장만 기억하시면 됩니다.`
  - `-ate 철자로 끝나는 단어를 만났을 때, 행동하는 동사라면 끝까지 힘을 살려 '에이트'!`
  - `사람이나 사물의 이름, 상태를 나타낸다면 앞을 누르고 뒤를 툭 떨어뜨려 '엇' 또는 '잇'!`
  - `이 소리 공식 하나만 마음에 품으시면 수십 개의 고급 단어가 저절로 정복됩니다.`

---

## Frame 12 — 따뜻한 클로징 & 엔딩 (End Screen Keep-out)

- scene:
  * **0.00s ~ 15.60s (나레이션 구간)**: 중앙에 채널 워드마크 + `[ 외우지 않아도 소리가 들리는 쉬운 영어 ]` 격려 카드 노출.
  * **15.60s ~ 20.60s (끝 5초 엔드스크린 Keep-out)**: **중앙 격려 카드, 텍스트, 자막 완벽 페이드아웃!** 채널 워드마크만 좌상단(`left: 6cqw; top: 8cqh`)에 은은하게 남기고 **화면 중앙 전체 100% 완전 비움(유튜브 추천 영상 카드 영역 완벽 확보)**. BGM 잔잔히 흐르며 페이드아웃 마감.
- voiceover: "이제 미드나 일상에서 -ate 단어를 만나도 전혀 멈칫하실 필요가 없습니다. 소리의 원리를 이해한 여러분의 귀는 이미 한 걸음 더 앞서가고 있으니까요. 오늘 내용이 도움이 되셨다면 구독과 좋아요 부탁드립니다. 오늘도 함께해 주셔서 감사합니다."
- duration: 20.60s (whisper 실측 20.60s)
- transition_in: fade-in
- status: ready_to_implement
- src: compositions/frames/12-closing.html
- type: closing
- persuasion: 따뜻한 동반자적 격려와 채널 구독 유도
- blueprint: endscreen-keep-out-layout
- focal: 끝 5초 화면 중앙 완전 비움과 좌상단 미니 워드마크
- roles: 격려 카드 ➔ 중앙 완전 비움 공간
- sfx: 잔잔한 아웃트로 BGM 페이드아웃
- **Micro-Beats (Whisper 동기화 타임라인)**:
  * **Beat 1 (0.00s ~ 8.20s)**: 중앙에 따뜻한 응원 카드(`외우지 않아도 소리가 들리는 쉬운 영어`)와 채널 캐릭터 등장.
  * **Beat 2 (8.20s ~ 15.60s)**: 구독 & 좋아요 버튼 펄스 점등.
  * **Beat 3 (15.60s ~ 20.60s) ⭐️ [Keep-out Zone]**: **화면 중앙 모든 요소 즉시 페이드아웃! 중앙 100% 완전 비움 준수**. 좌상단 미니 워드마크만 잔잔히 유지.
- `caption-pill`:
  - `이제 미드나 일상에서 -ate 단어를 만나도 전혀 멈칫하실 필요가 없습니다.`
  - `소리의 원리를 이해한 여러분의 귀는 이미 한 걸음 더 앞서가고 있으니까요.`
  - `오늘 내용이 도움이 되셨다면 구독과 좋아요 부탁드립니다.`
  - `오늘도 함께해 주셔서 감사합니다.`
  (끝 5초 구간은 의도적 무자막)
