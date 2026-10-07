# EP24 음성 생성 가이드 (Google AI Studio / Gemini TTS)

> **주의**: 텍스트 입력창에 영문 지시문(`Say only the narration...`)을 함께 넣으면 TTS 엔진이 지시문까지 그대로 읽어버립니다. 아래 코드 블록에는 **읽어야 할 순수 텍스트만** 제공되므로, 블록 전체를 복사해서 바로 붙여넣으시면 됩니다.

---

## 1. 한국어 호스트 나레이션 (3개)
- **보이스 권장**: `Charon` 또는 `Aoede` (한국어)
- **출력 경로**: `assets/voice/`

### `01_f01_hook.wav` (복사 후 바로 입력)
```text
솔직히 쉬잎이랑 쉽, 둘 다 그냥 똑같이 '쉽'으로 읽고 계셨죠? 학교 다닐 때 장모음은 길게 끌고, 단모음은 짧게 끊으라고 배웠잖아요. 근데 막상 미드나 영화를 보면, 원어민들은 길게 끄는 것 같지도 않은데 기가 막히게 구분해서 말하거든요. 이게 왜 그러냐면, 소리의 길이가 아니라 입술을 쓰는 방법이 아예 달라서 그렇습니다. 오늘 딱 스무 쌍만 귀로 확인해 보시면, 아 이래서 다르게 들렸구나 바로 감이 오실 거예요.
```

### `02_f02_principle.wav` (복사 후 바로 입력)
```text
원리는 정말 간단합니다. 첫 번째 쉬잎은 웃듯이 입꼬리를 옆으로 싹 당기면서 내는 소리예요. 그래서 소리가 팽팽하게 나옵니다. 반면에 두 번째 쉽은 그냥 멍때리듯이 입에 힘을 툭 빼고 내는 소리예요. 살짝 에 소리가 섞인 느낌이죠. 그럼 남녀 원어민 목소리로 세 번씩 들려드릴 테니까, 편하게 귀로 한번 따라가 보세요.
```

### `03_f09_summary.wav` (복사 후 바로 입력)
```text
오늘 배운 내용, 딱 이것만 챙겨가시면 됩니다. 웃듯이 입꼬리를 당기면 쉬잎, 힘 툭 빼고 편하게 소리 내면 쉽입니다. 지금 이 화면 딱 캡처해 두시고, 나중에 헷갈릴 때 한 번씩 꺼내보세요.
```

---

## 2. 영어 짝단어 일괄 배치 음성 (남성 & 여성)
- 40개 단어를 1.5초 간격으로 연속 생성 후, `split-batch-voice.mjs`로 자동 분할합니다.

### 남성 보이스 (`male_words_all.wav` / `Puck` 또는 `Fenrir`)
```text
sheep, ship, feet, fit, seat, sit, heel, hill, peel, pill,
meat, mitt, peach, pitch, beat, bit, heat, hit, cheap, chip,
sleep, slip, feel, fill, reach, rich, leave, live, seek, sick,
lead, lid, teen, tin, deed, did, steel, still, beach, bitch.
```

### 여성 보이스 (`female_words_all.wav` / `Aoede` 또는 `Kore`)
```text
sheep, ship, feet, fit, seat, sit, heel, hill, peel, pill,
meat, mitt, peach, pitch, beat, bit, heat, hit, cheap, chip,
sleep, slip, feel, fill, reach, rich, leave, live, seek, sick,
lead, lid, teen, tin, deed, did, steel, still, beach, bitch.
```

---

## 3. 실전 대화 문장 7개 (`en_dialogue_all.wav`)
- 2초 간격으로 연속 생성
```text
Please take a seat and sit down.
I feel like I should fill the cup.
Did you sleep well, or did you slip?
We can reach that rich neighborhood.
Don't leave the house where you live.
I ate some meat with a baseball mitt.
Let's walk along the beach together.
```
