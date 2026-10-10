# SCRIPT — ep28-f-vs-p

- **에피소드 ID**: `ep28-f-vs-p`
- **제목**: `원어민이 F와 P를 0.1초 만에 구별하는 법 | F vs P 24쌍 반복 듣기`
- **포맷**: 심화 확장형 반복 듣기 롱폼 (약 13~14분)
- **주제**: F vs P 0.1초 조음 물리법칙 (윗니 0% 파열 vs 윗니 100% 마찰) 24쌍 집중 반복 청취

---

## 1. 음성 제작 체크리스트 (Voice Checklist)

| 번호 | 파일명 (WAV ID) | 화자 | 내용 요약 | 예상 길이 | 생성 상태 |
|:---:|:---|:---:|:---|:---:|:---:|
| 1 | `01_f01_hook.wav` | 한국어 호스트 | Coffee와 Copy, 한글로는 둘 다 '피'인데 원어민은 왜 0.1초 만에 다를까? | ~35초 | [ ] |
| 2 | `02_f02_principle.wav` | 한국어 호스트 | 입술 깨물지 않는 F 바람 소리 vs 두 입술 터지는 P 소리 원리 | ~45초 | [ ] |
| 3 | `03_f09_summary.wav` | 한국어 호스트 | 스마트폰 1장 요약 치트시트 캡처 안내 | ~25초 | [ ] |
| 4 | `male_words_all.wav` | 남성 원어민 (미국) | 24쌍(48개) 핵심 단어 일괄 생성 (단어당 1.2초 간격) | ~1분 30초 | [ ] |
| 5 | `female_words_all.wav` | 여성 원어민 (미국) | 24쌍(48개) 핵심 단어 일괄 생성 (단어당 1.2초 간격) | ~1분 30초 | [ ] |
| 6 | `en_dialogue_all.wav` | 남녀 원어민 교차 | 실전 일상 대화 7문장 일괄 생성 (문장당 1.8초 간격) | ~40초 | [ ] |

---

## 2. Gemini TTS 복사용 순수 텍스트 블록 (총 6개)

> [!IMPORTANT]
> **TTS 생성 절대 수칙**:
> 1. 아래 코드 블록 내부에는 영문 지시문(Directive)이 전혀 없습니다. 코드 블록 안의 텍스트만 100% 그대로 복사하여 AI Studio에 입력하세요.
> 2. 한국어 블록은 교포 억양 방지를 위해 첫 문장이 100% 순수 한국어로 시작하며, 영어 단어는 한글 독음(`커피`, `카피`)으로 작성되었습니다.
> 3. 국내 거주 성인 학습자 관점을 엄수하여, 안 가본 해외 카페 일화 대신 학창 시절 배운 방식과 미드/유튜브 청취 현실의 괴리를 짚습니다.
> 4. 초등학생 눈높이에 맞춰 언어학 전문 용어('마찰음', '파열음', '조음법칙')를 일절 배제하고 '바람 새는 소리', '입술 터지는 소리'로 설명합니다.
> 5. 핵심 목적격 조사(`을/를`)를 절대 생략하지 않고 명확하게 발음하도록 표기되었습니다.
> 6. 영어 단어 및 문장 끝에는 스태카토 단절(뚝뚝 끊김)을 방지하기 위해 쉼표(`,`)가 배치되어 부드러운 여운을 남깁니다.

### [블록 1] 한국어 호스트 도입부 훅 (F01)
*파일명: `01_f01_hook.wav`*  
*보이스/톤: 30대 차분하고 명료한 남성 강사, 확신에 찬 톤.*

```text
커피를 뜻하는 커피와 복사를 뜻하는 카피. 학창 시절에 배울 때나 한글로 적을 때나, 우리 둘 다 그냥 똑같은 피 소리로 읽고 살아왔잖아요. 그런데 미드나 유튜브에서 원어민 소리를 가만히 들어보면, 둘이 분명히 완전히 다르게 소리 나거든요. 원어민은 왜 에프와 피를 듣자마자 0.1초 만에 바로 구분할까요? 비밀은 윗니가 닿느냐 안 닿느냐, 딱 하나의 물리법칙에 있습니다. 오늘 스물네 쌍의 단어로 평생 똑같이 들리던 에프와 피의 소리를 듣자마자 구분되도록 귀를 완전히 뚫어 드리겠습니다.
```

---

### [블록 2] 한국어 호스트 조음 물리법칙 원리 (F02)
*파일명: `02_f02_principle.wav`*  
*보이스/톤: 초등학생도 0.1초 만에 이해하는 직관적인 원리 설명, 자신감 넘치는 톤.*

```text
혹시 에프 발음할 때 아랫입술을 꽉 깨물어야 한다고 배우셨나요? 입술을 깨물면 오히려 소리가 막혀서 틀립니다. 에프는 윗니 끝을 아랫입술 안쪽 살에 살짝 대고 바람을 쉬익 내보내는 소리입니다. 윗니가 닿는 비율 백 퍼센트입니다. 반대로 피는 윗니가 전혀 닿지 않습니다. 윗니 접촉 영 퍼센트입니다. 위아래 두 입술만 가볍게 닫았다가 바람을 팡 터뜨리는 소리입니다. 윗니 백 퍼센트의 에프, 윗니 영 퍼센트의 피. 이 단순한 규칙 하나만 기억하시고, 이제 스물네 쌍의 단어로 귀 훈련을 시작하겠습니다.
```

---

### [블록 3] 한국어 호스트 스마트폰 1장 요약 (F09)
*파일명: `03_f09_summary.wav`*  
*보이스/톤: 격려와 성취감을 주는 따뜻하고 안정된 마무리 톤.*

```text
정말 수고하셨습니다. 오늘 훈련한 스물네 쌍의 핵심 소리 규칙 요약표입니다. 에프는 윗니 백 퍼센트의 바람이 새는 소리, 피는 윗니 영 퍼센트의 입술이 터지는 소리입니다. 지금 화면을 스마트폰으로 캡처해 두시고, 헷갈릴 때마다 꺼내서 소리를 떠올려 보세요.
```

---

### [블록 4] 남성 원어민 24쌍 핵심 단어 배치 (48단어)
*파일명: `male_words_all.wav`*  
*TTS 설정: Male Native Speaker (미국 영어), 각 단어 사이 1.0~1.2초 자연스러운 호흡.*

```text
fan, pan, fat, pat, fig, pig, fin, pin, fit, pit, fog, pog, feel, peel, feet, peat, fool, pool, face, pace, fair, pair, fast, past, coffee, copy, office, option, follow, pillow, forest, protect, fourteen, portion, freedom, pressure, leaf, leap, beef, beep, cuff, cup, cliff, clip, chef, step, safe, tape,
```

---

### [블록 5] 여성 원어민 24쌍 핵심 단어 배치 (48단어)
*파일명: `female_words_all.wav`*  
*TTS 설정: Female Native Speaker (미국 영어), 각 단어 사이 1.0~1.2초 자연스러운 호흡.*

```text
fan, pan, fat, pat, fig, pig, fin, pin, fit, pit, fog, pog, feel, peel, feet, peat, fool, pool, face, pace, fair, pair, fast, past, coffee, copy, office, option, follow, pillow, forest, protect, fourteen, portion, freedom, pressure, leaf, leap, beef, beep, cuff, cup, cliff, clip, chef, step, safe, tape,
```

---

### [블록 6] 원어민 실전 일상 대화 7문장
*파일명: `en_dialogue_all.wav`*  
*TTS 설정: 남녀 원어민 대화 톤, 각 문장 사이 1.8~2.0초 간격.*

```text
I need a cup of hot coffee, not a copy.
Please turn on the fan and wash the pan.
The fast runner did not stop in the past.
Do not drink water from the pool, you fool.
I feel like I want to peel this fresh orange.
Keep the office safe and tape the box tight.
She has a real passion for high fashion.
```

---

## 3. 프레임별 화면 UI 카드 및 드릴 구성 상세

### [F01] 도입부 훅 (00:00 ~ 00:40)
- **상단 알약**: `💡 0.1초 소리 물리법칙`
- **메인 비교 카드**:
  - 좌측: `COFFEE [커피]` (윗니 접촉 100%)
  - 우측: `COPY [카피]` (두 입술 접촉 100%)
- **오디오**: `01_f01_hook.wav`

### [F02] 조음 물리법칙 원리 (00:40 ~ 01:30)
- **상단 알약**: `입술 깨물면 탈락!`
- **원리 대조 카드**:
  - `[f] 바람 새는 소리 (코랄 레드)`: 윗니 100% 아랫입술 안쪽 접촉 ➔ 바람이 쉬익 새어 나옴 (`fan`, `coffee`)
  - `[p] 입술 터지는 소리 (스카이 블루)`: 윗니 0%! 두 입술만 가볍게 닫힘 ➔ 바람이 팡 터짐 (`pan`, `copy`)
- **하단 팁**: `💡 윗니가 닿느냐(100%), 두 입술이 닿느냐(0%)의 차이!`
- **오디오**: `02_f02_principle.wav`

### [F03] 드릴 1: 단모음 기본 6쌍 (01:30 ~ 03:20)
- **상단 알약**: `Group 1 · 기본 단모음 6쌍`
- **반복 방식**: 남·여 교차 3회 반복 청취 (총 6회 발화, ●●● 점등 인디케이터)
- **단어 목록**:
  1. `fan [팬]` vs `pan [팬]`
  2. `fat [팻]` vs `pat [팻]`
  3. `fig [픽]` vs `pig [픽]`
  4. `fin [핀]` vs `pin [핀]`
  5. `fit [핏]` vs `pit [핏]`
  6. `fog [팍]` vs `pog [팍]`

### [F04] 드릴 2: 장모음 & 이중모음 6쌍 (03:20 ~ 05:10)
- **상단 알약**: `Group 2 · 장모음 & 이중모음 6쌍`
- **단어 목록**:
  1. `feel [필]` vs `peel [필]`
  2. `feet [핏]` vs `peat [핏]`
  3. `fool [풀]` vs `pool [풀]` (★ 한국인 최다 혼동 주의)
  4. `face [페이스]` vs `pace [페이스]`
  5. `fair [페어]` vs `pair [페어]`
  6. `fast [패스트]` vs `past [패스트]`

### [F05] 드릴 3: 실생활 2음절 필수 6쌍 (05:10 ~ 07:00)
- **상단 알약**: `Group 3 · 2음절 철자 음절 분리 6쌍`
- **단어 목록 (영어 철자 가운뎃점 음절 분리)**:
  1. `cof · fee [커피]` vs `co · py [카피]`
  2. `of · fice [오피스]` vs `op · tion [옵션]`
  3. `fol · low [팔로우]` vs `pil · low [필로우]`
  4. `for · est [포레스트]` vs `pro · tect [프로텍트]`
  5. `four · teen [포틴]` vs `por · tion [포션]`
  6. `free · dom [프리덤]` vs `pres · sure [프레셔]`

### [F06] 드릴 4: 받침/끝소리 6쌍 (07:00 ~ 08:50)
- **상단 알약**: `Group 4 · 단어 끝소리 6쌍`
- **단어 목록 (받침 'ㅂ' 왜곡 타파: 바람 F vs 닫힘 P)**:
  1. `leaf [리프]` vs `leap [립]`
  2. `beef [비프]` vs `beep [빕]`
  3. `cuff [커프]` vs `cup [컵]`
  4. `cliff [클리프]` vs `clip [클립]`
  5. `chef [셰프]` vs `step [스텝]`
  6. `safe [세이프]` vs `tape [테이프]`

### [F07] 실전 대화 7문장 청취 (08:50 ~ 10:40)
- **상단 알약**: `실전 대화 속 F vs P 청취 훈련`
- **문장별 타겟 단어 하이라이트 & 오디오 싱크 펄스 바운스**:
  1. `I need a cup of hot <span class="hl-f">coffee</span>, not a <span class="hl-p">copy</span>.`
     - 조음 팁: `💡 coffee (윗니 100%) vs copy (두 입술 100%)`
  2. `Please turn on the <span class="hl-f">fan</span> and wash the <span class="hl-p">pan</span>.`
  3. `The <span class="hl-f">fast</span> runner did not stop in the <span class="hl-p">past</span>.`
  4. `Do not drink water from the <span class="hl-p">pool</span>, you <span class="hl-f">fool</span>.`
  5. `I <span class="hl-f">feel</span> like I want to <span class="hl-p">peel</span> this fresh orange.`
  6. `Keep the <span class="hl-f">office</span> <span class="hl-f">safe</span> and <span class="hl-p">tape</span> the box tight.`
  7. `She has a real <span class="hl-p">passion</span> for high <span class="hl-f">fashion</span>.`

### [F08] 0.1초 직관 반응 셔플 퀴즈 8문항 (10:40 ~ 12:10)
- **방식**: 단어 1회 들려줌 ➔ 1.5초 생각 카운트다운 ➔ 정답 카드 오픈 + 발음기호 + 뜻
- **퀴즈 8문항**:
  1. `pool [풀]` (수영장 / [p] 두 입술 터지는 소리)
  2. `coffee [커피]` (커피 / [f] 윗니 바람 새는 소리)
  3. `leap [립]` (도약하다 / [p] 끝소리 닫힘)
  4. `fan [팬]` (선풍기, 부채 / [f] 윗니 바람 새는 소리)
  5. `fast [패스트]` (빠른 / [f] 윗니 바람 새는 소리)
  6. `copy [카피]` (복사 / [p] 두 입술 터지는 소리)
  7. `fool [풀]` (바보 / [f] 윗니 바람 새는 소리)
  8. `leaf [리프]` (나뭇잎 / [f] 끝소리 바람 새는 소리)

### [F09] 스마트폰 1장 요약 치트시트 (12:10 ~ 12:40)
- **상단 알약**: `📸 캡처해서 소장하는 1장 요약 치트시트`
- **핵심 소리 규칙 표 + 24쌍 4개 그룹 한눈에 보기 표**
- **오디오**: `03_f09_summary.wav`

### [F10] 24쌍 무한 앵콜 총복습 (12:40 ~ 14:10)
- **상단 알약**: `🎧 자막 없이 소리로만 각인하는 24쌍 총복습`
- **방식**: 24쌍 전체 쾌속 논스톱 청취 (F 단어 ➔ P 단어 순차 재생, 단어당 1.5초 간격)
- **자막/비주얼 최소화**: 소리 집중 피날레
