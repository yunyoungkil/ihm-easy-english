# SCRIPT — ep23-double-consonant (같은 자음 두 개는 한 번만 소리 난다)

> **콘텐츠 정보**
> - 방식: **듣기 (30분 집중 반복 듣기)**
> - 형식: 롱폼 (목표 러닝타임: 약 28분~30분)
> - 제목: `[30분 듣기] hello·class·happy, 같은 자음 두 개는 한 번만 소리 난다`
> - 썸네일: 앵커 `COFFEE` + 알약 `자음 둘, 소리 하나`
> - 예문 맥락: **카페에서 친구와 나누는 대화** (하나의 일관된 실전 장면)

---

# 🎙️ GEMINI 3.8 FLASH TTS 제작 가이드

Google AI Studio 또는 Gemini API를 통해 음성을 직접 제작할 때 아래 설정을 사용합니다.
모든 오디오 파일은 `videos/ep23-double-consonant/assets/voice/` 폴더에 저장합니다.

### 1. 채널 시그니처 음성 설정 (Voice Profiles)
| 역할 | 성별 | 언어코드 | 추천 보이스 | 시그니처 스타일 & 톤 지시문 (Directive) |
|---|---|---|---|---|
| **한국어 진행자 (Host)** | 남/여 | `ko-KR` | `Charon` (남) 또는 `Aoede` (여) | **심야 팟캐스트 진행자 (Warm & Sophisticated)**<br>`Say only the narration after the colon in a warm, sophisticated, and captivating podcast host tone, speaking naturally with nuanced cadence and engaging rhythm:` |
| **영어 원어민 남성 (Native Male)** | **남성** | `en-US` | `Puck` (또는 `Fenrir`) | **또렷하고 단단한 표준 미국식 (Crisp & Steady)**<br>`Pronounce clearly with crystal-clear standard American diction and a steady, crisp downward pitch:` |
| **영어 원어민 여성 (Native Female)** | **여성** | `en-US` | `Kore` (또는 `Aoede`) | **맑고 안정적인 표준 미국식 (Clear & Calm)**<br>`Pronounce clearly with crystal-clear standard American diction and a steady, crisp downward pitch:` |

### 2. 초간단 제작 방법 (14회 다운로드로 전체 완성!)
단어 30개를 일일이 다운받으실 필요 없이, **단 14개의 파일만 생성**하시면 됩니다:
1. **한국어 진행자 (나레이션)**: PART 1에서 프레임별 **12개 파일** 생성 (`01_f01_hook.wav` ~ `12_f12_intro_encore.wav`)
2. **영어 원어민 (단어 & 문장)**: PART 2에서 **딱 2개의 묶음 파일**만 생성!
   - 👦 **남성 묶음**: `male_all.wav` (단어 16개 + 문장 3개 / 보이스: `Puck`)
   - 👧 **여성 묶음**: `female_all.wav` (단어 14개 + 문장 4개 / 보이스: `Kore`)
3. **자동 분할 (1초 완성)**:
   - 두 파일을 `videos/ep23-double-consonant/assets/voice/`에 넣으신 뒤, 터미널에서 다음 명령어를 실행하면 끝납니다:
   ```bash
   node videos/ep23-double-consonant/scripts/split-batch-voice.mjs
   ```
   *(무음 구간을 자동으로 분석하여 `en_coffee.wav`, `en_hoping.wav` 등 37개 파일로 1초 만에 깔끔하게 분할 및 타임스탬프 기록 완료)*

### 3. 듣기 롱폼 오디오 제작 및 재사용 규칙
- F3~F8의 단어들은 영상 편집 툴(HyperFrames)이 타임라인에서 3초 간격으로 6회 반복 재생합니다.
- **F10(섞어 듣기)과 F12(한 번 더 복습)**는 별도 생성 없이, 앞서 분할된 단어 파일들을 타임라인에서 재배열하여 재사용합니다.

---

## 📋 TTS 제작 체크리스트 (총 14개 파일 생성)

### [A] 한국어 진행자 나레이션 (12개 파일 / Charon)
- [ ] `01_f01_hook.wav` — F1 훅 (약 18초)
- [ ] `02_f02_principle.wav` — F2 원리 설명 (약 28초)
- [ ] `03_f03_intro_ff.wav` — F3 ff 안내 (약 6초)
- [ ] `04_f04_intro_ll.wav` — F4 ll 안내 (약 6초)
- [ ] `05_f05_intro_ss.wav` — F5 ss 안내 (약 6초)
- [ ] `06_f06_intro_pp.wav` — F6 pp 안내 (약 6초)
- [ ] `07_f07_exception_boundary.wav` — F7 예외 ① 단어 경계 (약 16초)
- [ ] `08_f08_exception_flap_tt.wav` — F8 예외 ② 모음 사이 tt (약 16초)
- [ ] `09_f09_intro_scene.wav` — F9 실전 대화 안내 (약 6초)
- [ ] `10_f10_intro_shuffle.wav` — F10 섞어 듣기 안내 (약 7초)
- [ ] `11_f11_summary.wav` — F11 정리 및 댓글 질문 (약 18초)
- [ ] `12_f12_intro_encore.wav` — F12 한 번 더 안내 (약 5초)

### [B] 영어 원어민 묶음 오디오 (단 2개 파일만 생성!)
- [ ] `male_all.wav` `[남성 - Puck]` — 단어 16개 + 문장 3개 전체 묶음
- [ ] `female_all.wav` `[여성 - Kore]` — 단어 14개 + 문장 4개 전체 묶음
  *(생성 후 `node scripts/split-batch-voice.mjs` 실행 시 37개 파일로 자동 분할)*

---

# PART 1. 한국어 진행자 나레이션 (복사용)

> 아래 각 코드 블록을 그대로 복사하여 Gemini 3.8 Flash TTS 입력창에 넣으시면 됩니다.

### `01_f01_hook.wav`
- **화자**: 한국어 진행자 (`ko-KR`)
- **톤**: 심야 팟캐스트 진행자 톤 (세련되고 따뜻한 몰입감)
```text
Say only the narration after the colon in a warm, sophisticated, and captivating podcast host tone, speaking naturally with nuanced cadence and engaging rhythm:

coffee나 hello처럼 같은 자음이 두 개씩 적힌 단어들, 소리도 두 번 내야 할까요? 아닙니다. 철자가 몇 개든 원어민은 딱 한 번만 소리 냅니다. 오늘 영상은 이 규칙을 귀에 완전히 새겨 넣는 30분 반복 듣기 영상입니다. 틀어두고 편안하게 귀로 익혀보세요.
```

---

### `02_f02_principle.wav`
- **화자**: 한국어 진행자 (`ko-KR`)
- **톤**: 지적 힐링을 주는 명쾌한 설명
```text
Say only the narration after the colon in a warm, sophisticated, and captivating podcast host tone, speaking naturally with nuanced cadence and engaging rhythm:

자음은 입술이나 혀가 공기를 한 번 막았다가 여는 소리입니다. 같은 자음이 두 개 적혀 있어도, 입이 두 번 움직일 필요 없이 한 번만 툭 소리 내면 끝납니다. 그럼 두 번째 자음은 왜 적었을까요? 바로 앞 모음을 짧게 읽으라는 신호입니다. hoping과 hopping. 철자 p가 하나 더 붙으면서 앞 모음 소리가 어떻게 달라지는지, 소리로 직접 비교해 보세요.
```

---

### `03_f03_intro_ff.wav`
- **화자**: 한국어 진행자 (`ko-KR`)
- **톤**: 나직하고 친절한 원포인트 가이드
```text
Say only the narration after the colon in a warm, sophisticated, and captivating podcast host tone, speaking naturally with nuanced cadence and engaging rhythm:

먼저 f가 두 개 들어간 단어들입니다. 아랫입술을 두 번 물 필요 없이, 바람을 한 번만 빼주세요.
```

---

### `04_f04_intro_ll.wav`
- **화자**: 한국어 진행자 (`ko-KR`)
- **톤**: 나직하고 친절한 원포인트 가이드
```text
Say only the narration after the colon in a warm, sophisticated, and captivating podcast host tone, speaking naturally with nuanced cadence and engaging rhythm:

다음은 l이 두 개 겹친 단어들입니다. 혀끝을 딱 한 번만 위 앞니 뒤에 대고 소리 냅니다.
```

---

### `05_f05_intro_ss.wav`
- **화자**: 한국어 진행자 (`ko-KR`)
- **톤**: 나직하고 친절한 원포인트 가이드
```text
Say only the narration after the colon in a warm, sophisticated, and captivating podcast host tone, speaking naturally with nuanced cadence and engaging rhythm:

이번엔 s가 두 개인 단어들입니다. 소리를 길게 끌지 않고, 한 번에 시원하게 뱉어냅니다.
```

---

### `06_f06_intro_pp.wav`
- **화자**: 한국어 진행자 (`ko-KR`)
- **톤**: 나직하고 친절한 원포인트 가이드
```text
Say only the narration after the colon in a warm, sophisticated, and captivating podcast host tone, speaking naturally with nuanced cadence and engaging rhythm:

p가 나란히 적힌 단어들입니다. 입술을 두 번 터뜨리지 말고 가볍게 한 번만 닫았다 엽니다.
```

---

### `07_f07_exception_boundary.wav`
- **화자**: 한국어 진행자 (`ko-KR`)
- **톤**: 비밀을 속삭이듯 흥미진진한 팁
```text
Say only the narration after the colon in a warm, sophisticated, and captivating podcast host tone, speaking naturally with nuanced cadence and engaging rhythm:

그런데 자음 소리가 살짝 길어지는 예외가 있습니다. un과 named처럼 원래 따로 있던 두 단어가 합쳐질 때입니다. 앞 단어의 끝소리와 뒷단어의 첫소리가 그대로 맞물리면서 소리가 길게 이어집니다. unnamed, 그리고 midday. 차이를 귀로 느껴보세요.
```

---

### `08_f08_exception_flap_tt.wav`
- **화자**: 한국어 진행자 (`ko-KR`)
- **톤**: 흥미롭고 유용한 반전 팁
```text
Say only the narration after the colon in a warm, sophisticated, and captivating podcast host tone, speaking naturally with nuanced cadence and engaging rhythm:

두 번째 예외는 t가 두 개 겹치는 단어들입니다. 모음 사이에 tt가 오면, 미국 영어에서는 '트'가 아니라 부드러운 'ㄹ' 소리로 바뀝니다. letter, butter. 혀가 편안하게 굴러가는 소리를 들어보세요.
```

---

### `09_f09_intro_scene.wav`
- **화자**: 한국어 진행자 (`ko-KR`)
- **톤**: 실전 대화로의 자연스러운 초대
```text
Say only the narration after the colon in a warm, sophisticated, and captivating podcast host tone, speaking naturally with nuanced cadence and engaging rhythm:

이번엔 실제 카페 대화입니다. 배운 단어들이 문장 속에서 어떻게 자연스럽게 흘러가는지 들어보세요.
```

---

### `10_f10_intro_shuffle.wav`
- **화자**: 한국어 진행자 (`ko-KR`)
- **톤**: 편안한 집중 유도
```text
Say only the narration after the colon in a warm, sophisticated, and captivating podcast host tone, speaking naturally with nuanced cadence and engaging rhythm:

이제 지금까지 익힌 단어들을 무작위로 섞어서 들려드립니다. 자음이 두 개라도 한 번에 소리 나는지 귀로 확인해 보세요.
```

---

### `11_f11_summary.wav`
- **화자**: 한국어 진행자 (`ko-KR`)
- **톤**: 다정하고 따뜻한 여운의 클로징
```text
Say only the narration after the colon in a warm, sophisticated, and captivating podcast host tone, speaking naturally with nuanced cadence and engaging rhythm:

오늘 함께 연습한 소리들을 정리해 보겠습니다. 영어에서 나란히 겹친 자음은 대부분 딱 한 번만 소리 납니다. 단어가 합쳐지는 경우와 모음 사이의 tt만 기억해 두시면 됩니다. 오늘 들었던 단어 중 가장 의외였던 발음은 무엇이었나요? 댓글로 편하게 남겨주세요.
```

---

### `12_f12_intro_encore.wav`
- **화자**: 한국어 진행자 (`ko-KR`)
- **톤**: 편안한 힐링 복습 권유
```text
Say only the narration after the colon in a warm, sophisticated, and captivating podcast host tone, speaking naturally with nuanced cadence and engaging rhythm:

마지막으로 처음부터 끝까지 한 번 더 반복합니다. 틀어두고 편안하게 귀에 익혀보세요.
```

---

# PART 2. 영어 원어민 묶음 생성 (복사용)

> 💡 **초간단 2회 생성 안내**:
> 1. 아래 **[1] 남성 묶음** 전체를 복사하여 Google AI Studio에서 언어 `English (US)`, 보이스 **`Puck`**으로 설정하고 생성 ➔ **`assets/voice/male_all.wav`**로 저장합니다.
> 2. 아래 **[2] 여성 묶음** 전체를 복사하여 Google AI Studio에서 언어 `English (US)`, 보이스 **`Kore`**로 설정하고 생성 ➔ **`assets/voice/female_all.wav`**로 저장합니다.
> 3. 두 파일을 저장하신 뒤 터미널에서 아래 분할 스크립트를 실행하시면, **1초 만에 37개 단어/문장 개별 파일로 자동 분할**됩니다!
>    ```bash
>    node videos/ep23-double-consonant/scripts/split-batch-voice.mjs
>    ```

---

### [1] 남성 원어민 전체 묶음 (`male_all.wav`)
- **언어 설정**: `English (US)`
- **추천 보이스**: **`Puck`** (또는 `Fenrir`)
- **저장 파일명**: `assets/voice/male_all.wav`
- **구성**: 단어 16개 + 문장 3개 (총 19개 항목)

```text
Pronounce each item clearly with crystal-clear standard American diction and a steady, crisp downward pitch.
Do not say any numbers or introductory words. Say only the target words and sentences below.
IMPORTANT: Pause for 2 seconds of complete silence between each item:

Coffee.

Hoping.

Offer.

Different.

Staff.

Yellow.

Really.

All.

Class.

Glass.

Lesson.

Apple.

Supply.

Unnamed.

Letter.

Better.

I have class at ten.

The office is close to the cafe.

Let's get coffee after class.
```

---

### [2] 여성 원어민 전체 묶음 (`female_all.wav`)
- **언어 설정**: `English (US)`
- **추천 보이스**: **`Kore`** (또는 `Aoede`)
- **저장 파일명**: `assets/voice/female_all.wav`
- **구성**: 단어 14개 + 문장 4개 (총 18개 항목)

```text
Pronounce each item clearly with crystal-clear standard American diction and relaxed, steady intonation.
Do not say any numbers or introductory words. Say only the target words and sentences below.
IMPORTANT: Pause for 2 seconds of complete silence between each item:

Hopping.

Office.

Effort.

Hello.

Call.

Tall.

Dress.

Press.

Miss.

Happy.

Happen.

Midday.

Butter.

Little.

Two coffees, please.

Hello, how's it going?

Happy birthday!

Do you want a coffee?
```

---

### 💡 [선택 사항] 단어와 문장을 따로 묶어 생성하고 싶을 경우
혹시 단어와 문장을 분리해서 생성하고 싶으시다면, 아래 4개 파일명으로 나누어 저장하셔도 스크립트가 자동 분할합니다:
- `male_words.wav`: 위 남성 단어 16개
- `male_sentences.wav`: 위 남성 문장 3개
- `female_words.wav`: 위 여성 단어 14개
- `female_sentences.wav`: 위 여성 문장 4개

---

### 📋 [참조용] 자동 분할 대상 37개 단어/문장 명세표
분할 스크립트 실행 시 아래 파일명으로 `assets/voice/`에 자동 추출됩니다:

| 분할 파일명 | 프레임 | 보이스 | 대사 / 단어 | 비고 |
|---|---|---|---|---|
| `en_coffee.wav` | F1, F3 | 남성 (Puck) | Coffee. | F1 훅 & F3 ff 단어 |
| `en_hoping.wav` | F2 | 남성 (Puck) | Hoping. | F2 원리 대조 1 (장모음) |
| `en_hopping.wav` | F2, F6 | 여성 (Kore) | Hopping. | F2 원리 대조 2 (단모음) |
| `en_offer.wav` | F3 | 남성 (Puck) | Offer. | ff 단어 |
| `en_office.wav` | F3 | 여성 (Kore) | Office. | ff 단어 |
| `en_different.wav` | F3 | 남성 (Puck) | Different. | ff 단어 |
| `en_effort.wav` | F3 | 여성 (Kore) | Effort. | ff 단어 |
| `en_staff.wav` | F3 | 남성 (Puck) | Staff. | ff 단어 |
| `en_s01_two_coffees.wav` | F3, F9 | 여성 (Kore) | Two coffees, please. | F3 실전 문장 & F9 대화 |
| `en_hello.wav` | F4 | 여성 (Kore) | Hello. | ll 단어 |
| `en_yellow.wav` | F4 | 남성 (Puck) | Yellow. | ll 단어 |
| `en_call.wav` | F4 | 여성 (Kore) | Call. | ll 단어 |
| `en_really.wav` | F4 | 남성 (Puck) | Really. | ll 단어 |
| `en_tall.wav` | F4 | 여성 (Kore) | Tall. | ll 단어 |
| `en_all.wav` | F4 | 남성 (Puck) | All. | ll 단어 |
| `en_s02_hows_it_going.wav` | F4, F9 | 여성 (Kore) | Hello, how's it going? | F4 실전 문장 & F9 대화 |
| `en_class.wav` | F5 | 남성 (Puck) | Class. | ss 단어 |
| `en_dress.wav` | F5 | 여성 (Kore) | Dress. | ss 단어 |
| `en_glass.wav` | F5 | 남성 (Puck) | Glass. | ss 단어 |
| `en_press.wav` | F5 | 여성 (Kore) | Press. | ss 단어 |
| `en_lesson.wav` | F5 | 남성 (Puck) | Lesson. | ss 단어 |
| `en_miss.wav` | F5 | 여성 (Kore) | Miss. | ss 단어 |
| `en_s03_class_at_ten.wav` | F5, F9 | 남성 (Puck) | I have class at ten. | F5 실전 문장 & F9 대화 |
| `en_happy.wav` | F6 | 여성 (Kore) | Happy. | pp 단어 |
| `en_apple.wav` | F6 | 남성 (Puck) | Apple. | pp 단어 |
| `en_happen.wav` | F6 | 여성 (Kore) | Happen. | pp 단어 |
| `en_supply.wav` | F6 | 남성 (Puck) | Supply. | pp 단어 |
| `en_s04_happy_birthday.wav` | F6, F9 | 여성 (Kore) | Happy birthday! | F6 실전 문장 & F9 대화 |
| `en_unnamed.wav` | F7 | 남성 (Puck) | Unnamed. | 예외 ① 단어 경계 (자음 연장) |
| `en_midday.wav` | F7 | 여성 (Kore) | Midday. | 예외 ① 단어 경계 (자음 연장) |
| `en_letter.wav` | F8 | 남성 (Puck) | Letter. | 예외 ② Flap T (ㄹ 발음) |
| `en_butter.wav` | F8 | 여성 (Kore) | Butter. | 예외 ② Flap T (ㄹ 발음) |
| `en_better.wav` | F8 | 남성 (Puck) | Better. | 예외 ② Flap T (ㄹ 발음) |
| `en_little.wav` | F8 | 여성 (Kore) | Little. | 예외 ② Flap T (ㄹ 발음) |
| `en_s05_want_coffee.wav` | F9 | 여성 (Kore) | Do you want a coffee? | F9 카페 대화 |
| `en_s06_office_close.wav` | F9 | 남성 (Puck) | The office is close to the cafe. | F9 카페 대화 |
| `en_s07_coffee_after_class.wav` | F9 | 남성 (Puck) | Let's get coffee after class. | F9 카페 대화 |

---

# PART 3. 프레임별 영상 타임라인 및 화면 연출 명세

### F1 훅 (0:00~0:50)
- **음성 순서**: `01_f01_hook.wav` (진행자) ➔ `en_coffee.wav` (남성 Puck, 1회, 쉼 3초)
- **화면 카드** (순서대로 4~5초 간격 전환):
  1. `같은 자음 두 개`
  2. `소리는 한 번`
  3. `30분 반복 듣기`

---

### F2 원리 (0:50~3:10)
- **음성 순서**: `02_f02_principle.wav` (진행자) ➔ `en_hoping.wav` (남성 Puck, 6회 반복, 쉼 3초) ➔ `en_hopping.wav` (여성 Kore, 6회 반복, 쉼 3초)
- **화면 카드**:
  1. `자음 = 입이나 혀가 한 번 막았다 여는 동작`
  2. `두 번째 자음 = 앞 모음을 짧게`
- **모션 그래픽**: hoping과 hopping 철자가 나란히 비교되면서 hopping의 앞 모음 o 카드 폭이 시각적으로 짧게 줄어드는 연출. 남/여 음성 대비로 모음 길이 차이가 즉각 인지됨.

---

### F3 ff (3:10~6:00)
- **음성 순서**: `03_f03_intro_ff.wav` ➔ 단어 6개 남/여 교차 재생(항목당 6회 반복, 쉼 3초) ➔ `en_s01_two_coffees.wav` (여성 Kore, 4회 반복, 쉼 3초)
- **대상 단어 (남/여 교차)**: coffee(남) ➔ offer(남) ➔ office(여) ➔ different(남) ➔ effort(여) ➔ staff(남)
- **화면 카드**: `f가 두 개 = 소리 한 번`

---

### F4 ll (6:00~8:50)
- **음성 순서**: `04_f04_intro_ll.wav` ➔ 단어 6개 여/남 교차 재생(항목당 6회 반복, 쉼 3초) ➔ `en_s02_hows_it_going.wav` (여성 Kore, 4회 반복, 쉼 3초)
- **대상 단어 (여/남 교차)**: hello(여) ➔ yellow(남) ➔ call(여) ➔ really(남) ➔ tall(여) ➔ all(남)
- **화면 카드**: `l이 두 개 = 소리 한 번`

---

### F5 ss (8:50~11:40)
- **음성 순서**: `05_f05_intro_ss.wav` ➔ 단어 6개 남/여 교차 재생(항목당 6회 반복, 쉼 3초) ➔ `en_s03_class_at_ten.wav` (남성 Puck, 4회 반복, 쉼 3초)
- **대상 단어 (남/여 교차)**: class(남) ➔ dress(여) ➔ glass(남) ➔ press(여) ➔ lesson(남) ➔ miss(여)
- **화면 카드**: `s가 두 개 = 소리 한 번`

---

### F6 pp (11:40~13:50)
- **음성 순서**: `06_f06_intro_pp.wav` ➔ 단어 5개 여/남 교차 재생(항목당 6회 반복, 쉼 3초) ➔ `en_s04_happy_birthday.wav` (여성 Kore, 4회 반복, 쉼 3초)
- **대상 단어 (여/남 교차)**: happy(여) ➔ apple(남) ➔ happen(여) ➔ supply(남) ➔ hopping(여)
- **화면 카드**: `p가 두 개 = 소리 한 번`

---

### F7 예외 ① 단어 경계 (13:50~15:50)
- **음성 순서**: `07_f07_exception_boundary.wav` ➔ `en_unnamed.wav` (남성 Puck, 6회 반복, 쉼 3초) ➔ `en_midday.wav` (여성 Kore, 6회 반복, 쉼 3초)
- **화면 카드**: `예외 ① 단어 경계 / 앞뒤 단어가 만나면 소리가 이어져 살짝 길다`

---

### F8 예외 ② 모음 사이 tt (15:50~17:50)
- **음성 순서**: `08_f08_exception_flap_tt.wav` ➔ 단어 4개 남/여 교차 재생(항목당 6회 반복, 쉼 3초)
- **대상 단어 (남/여 교차)**: letter(남) ➔ butter(여) ➔ better(남) ➔ little(여)
- **화면 카드**: `예외 ② tt / 모음 사이의 tt = 가벼운 ㄹ 한 번 (Flap T)`

---

### F9 실전 대화 듣기 — 카페 남녀 2인 대화 (17:50~20:10)
- **음성 순서**: `09_f09_intro_scene.wav` ➔ 남/여 번갈아 가며 대화하는 7문장 (문장당 4회 반복, 쉼 3초)
- **화면 카드**: `카페 장면 / 친구와 카페에서 (2인 실전 대화)`
- **문장 목록 (남녀 핑퐁 구조)**:
  1. `Hello, how's it going?` (여성 Kore, `en_s02_hows_it_going.wav`)
  2. `Two coffees, please.` (여성 Kore, `en_s01_two_coffees.wav`)
  3. `Do you want a coffee?` (여성 Kore, `en_s05_want_coffee.wav`)
  4. `The office is close to the cafe.` (남성 Puck, `en_s06_office_close.wav`)
  5. `I have class at ten.` (남성 Puck, `en_s03_class_at_ten.wav`)
  6. `Let's get coffee after class.` (남성 Puck, `en_s07_coffee_after_class.wav`)
  7. `Happy birthday!` (여성 Kore, `en_s04_happy_birthday.wav`)

---

### F10 섞어 듣기 (20:10~23:30)
- **음성 순서**: `10_f10_intro_shuffle.wav` ➔ F3~F8 단어 29개를 무작위 셔플하여 순차 재생 (항목당 2회 반복, 쉼 3초)
- **화면 카드**: `섞어 듣기`
- **단어 재사용**: 앞서 생성한 단어 파일 29개를 타임라인에서 재배열 재생. (summer·hammer·dinner·funny는 음성 생성 목록에 없으므로 이번 편에서는 쓰지 않는다.)

---

### F11 정리 (23:30~24:45)
- **음성 순서**: `11_f11_summary.wav` (원어민 음성 없음)
- **화면 카드** (순서대로 15초씩 전환):
  1. `자음 두 개 = 소리 한 번 (대부분)`
  2. `예외 ① 단어 경계 / 예외 ② 모음 사이 tt`
  3. `댓글 질문: 오늘 듣고 가장 놀란 단어는?`
- **엔드스크린 주의**: 마지막 5초는 화면 중앙을 비워 둡니다 (`production-rules.md` 규칙 준수).

---

### F12 처음부터 한 번 더 (24:45~28:40)
- **음성 순서**: `12_f12_intro_encore.wav` ➔ F3~F8 전체 단어 순차 재생 (항목당 2회 반복, 쉼 3초)
- **화면 카드**: `처음부터 한 번 더`
- **단어 재사용**: 앞서 생성한 단어 파일들을 순서대로 루프 재생.
