# AUDIO-AUDIT — ep37-listen-frozen-questions (영어 음성 77개 전수 검수표)

- **검수 일시**: 2026-11-26 00:14 KST (`DESKTOP-UA9AKL2` 집 PC)
- **모델·목소리**: `gemini-3.8-flash-tts` (24kHz 16-bit 모노 PCM WAV, 무음 정리 및 `-16 LUFS` 정규화 완료)
  - 질문·시연·넓히기 (`q01~q30`, `d01~d10`, `x01~x07` = 47개): **`Cleo`** (미국식 여성 원어민, 남성 한국어 해설 `Gero`와 즉시 구분)
  - 대답 (`a01~a30` = 30개): **`Knox`** (미국식 남성 원어민, 질문 목소리 `Cleo`와 즉시 구분)
- **생성 경위**:
  - 1차 웹 화면(`generate-en-audio.mjs`): 43개 생성(`q01~q30`, `d01~d10`, `x01~x03`) 후 AI Studio 무료 웹 하루 한도(사전 시험 7회 포함 총 50회) 도달
  - 2차 무료 API 보조 한도(`generate-en-batch-api.mjs`, `POST /v1beta/interactions` 묶음 분할): 남은 34개(`x04~x07`, `a01~a30`)를 6회 호출로 생성·자동 분할(오류 0건)
  - 3차 재생성(무료 API 3회): 직접 청취에서 원리가 약하게 들린 **6개(`q15`, `q17`, `q22`, `x03`, `x04`, `x05`)**를 스타일 보강 후 재생성하여 재청취 통과
- **검수 방법**: ① 77개 파일 전부 직접 청취(원리 구현·끊김·잡음·억양 확인) ② `.whisper/main.exe`(`ggml-small.bin`, 앞뒤 0.35초 패딩) 전수 받아쓰기 ③ `ffprobe`/`ffmpeg volumedetect` 길이·음량 실측 ④ 1장 대표 문항 단어별 소리 세기(RMS dBFS) 계측 (`assets/en-audit-data.json`)
- **최종 결과**: **77/77개 통과** (누락 0개, 재생성 6개 모두 재청취 통과, 정제 파일 `assets/voice-en-clean/*.wav` 총 길이 `90.80초`). `SCRIPT.md` 및 `QUESTIONS-DRAFT.md`·고정 댓글 한글 소리 표기는 실제 소리와 일치함을 확인해 별도 문항 교체 없이 확정한다.

## 재생성 이력 (6건 — 1차 청취 문제 → 재생성 후 확인)

| 번호 | 원문 | 1차 청취에서 잡은 문제 | 재생성 뒤 확인 결과 |
|---|---|---|---|
| `q15` | Is that your dog? | `that` 뒤 숨이 끊기며 `YOUR`에 강세가 쏠림(`대츄어` 미구현) | `이즈 대츄어 도그?` — 끊김 없이 `츄` 섞임·`dog` 강세 통과 |
| `q17` | Can I get you anything? | `get` 끝이 막히고 `you`가 떨어져 들림(`게츄` 약함) | `캐나이 게츄 애니씽?` — 자연스러운 `게츄` 섞임 통과 |
| `q22` | Is that it? | `that` 뒤 미세 멈춤으로 `트`가 안 구름 | `이즈 대릿?` — 한 호흡으로 `트`가 가볍게 구름 통과 |
| `x03` | Nice to meet you. | `meet`과 `you`가 약간 떨어져 `미츄` 느낌 약함 | `나이스 투 미츄.` — 뚜렷한 `미츄` 섞임 통과 |
| `x04` | A lot of people. | `lot` 뒤 미세 숨멈춤으로 `얼라러브` 구름 약함 | `얼라러브 피플.` — 매끄러운 `트` 구름 통과 |
| `x05` | Get out. | `get` 끝이 막혀 `게라웃` 구름 약함 | `게라웃.` — 한 호흡 `트` 구름 통과 |

## 1장 단어별 소리 세기 실측 요약 (`q01` 대표)
- `q01` (`How do I get to Seoul Station?`, `1.65s`): `How`(-43.0 dB) · `do`(0.10s, -19.9 dB) · `I`(0.09s, -15.1 dB) → **`get`(0.27s, -12.9 dB 최고 음량)** → `to`(0.18s, -19.6 dB, 6.7 dB 하락) → **`Seoul`(0.36s, -15.0 dB) · `Station`(0.65s, 합 1.01s)**. 대본 설명("겟과 서울 스테이션 두 군데만 크고 길고, 하우 두 아이·투는 작고 짧음")과 실측 일치.

---

## 1. 질문 30개 (`q01`~`q30`, 목소리: `Cleo`)

| 번호 | 장 | 원문 | 정제 길이 | 평균 음량 | Whisper 받아쓰기 | 직접 청취 판정 및 대본 표기 대조 |
|---|---|---|---:|---:|---|---|
| `q01` | 1 | How do I get to Seoul Station? | 1.65s | -16.4 dB | How do I get to Sol Station ? | 통과 — `겟`(-12.9dB)·`서울 스테이션` 강조, `하우 두 아이`·`투(터)` 약함 일치 (`Sol`은 지명 표기 차이) |
| `q02` | 1 | Which line goes to Gangnam? | 1.38s | -16.0 dB | Which line goes to Gang nam ? | 통과 — `라인`·`강남` 강조 일치 |
| `q03` | 1 | Is this the right way to Myeongdong? | 1.77s | -15.4 dB | Is this the right way to M yeong dong ? | 통과 — `라잇 웨이`·`명동` 강조, 지명 자연스러움 |
| `q04` | 1 | Where can I buy a ticket? | 1.14s | -15.6 dB | Where can I buy a ticket ? | 통과 — `can I`가 `크나이`로 압축, `바이`·`티켓` 강조 일치 |
| `q05` | 1 | Does this train go to the airport? | 1.39s | -16.4 dB | Does this train go to the airport ? | 통과 — `트레인`·`에어포트` 강조 일치 |
| `q06` | 1 | How long does it take to get there? | 1.85s | -16.8 dB | How long does it take to get there ? | 통과 — `하우 롱`·`테익` 강조 일치 |
| `q07` | 2 | How much is it? | 0.75s | -16.4 dB | How much is it ? | 통과 — `하우 머치짓` 한 덩어리 연결 일치 |
| `q08` | 2 | Can I pay by card? | 0.97s | -16.5 dB | Can I pay by card ? | 통과 — `캐나이(크나이)` 약화+연결, `페이`·`카드` 강조 일치 |
| `q09` | 2 | Is it spicy? | 1.05s | -17.6 dB | Is it spicy ? | 통과 — `이짓` 연결 + `스파이시` 강조 일치 |
| `q10` | 2 | Do you have this in black? | 1.23s | -16.3 dB | Do you have this in black ? | 통과 — `디씬 블랙` 연결 일치 |
| `q11` | 2 | Can I take a look? | 0.99s | -16.6 dB | Can I take a look ? | 통과 — `캐나이 테이커 룩` 두 곳 연결 일치 |
| `q12` | 2 | Is this on sale? | 0.88s | -16.6 dB | Is this on sale ? | 통과 — `디쏜 세일` 연결 일치 |
| `q13` | 3 | Did you just move in? | 1.16s | -16.9 dB | Did you just move in ? | 통과 — `디쥬` 섞임 뚜렷함 일치 |
| `q14` | 3 | Would you like some coffee? | 0.97s | -15.6 dB | Would you like some coffee ? | 통과 — `우쥬` 섞임 뚜렷함 일치 |
| `q15` | 3 | Is that your dog? | 0.82s | -16.7 dB | Is that your dog ? | 통과(재생성) — `대츄어` 섞임·`dog` 강세 일치 |
| `q16` | 3 | Could you help me with this? | 1.08s | -16.9 dB | Could you help me with this ? | 통과 — `쿠쥬` 섞임 뚜렷함 일치 |
| `q17` | 3 | Can I get you anything? | 0.77s | -16.2 dB | Can I get you anything ? | 통과(재생성) — `게츄` 섞임 일치 |
| `q18` | 3 | Where did you get that? | 1.55s | -15.9 dB | Where did you get that ? | 통과 — `웨어 디쥬 겟` 일치 |
| `q19` | 4 | What are you looking for? | 0.93s | -15.6 dB | What are you looking for ? | 통과 — `워러유` 구름 뚜렷함 일치 |
| `q20` | 4 | Should I put it in a bag? | 1.31s | -16.1 dB | Should I put it in a bag ? | 통과 — `푸리리너` 두 번 구름 일치 |
| `q21` | 4 | Are you waiting for a taxi? | 1.40s | -14.8 dB | Are you waiting for a taxi ? | 통과 — `웨이링` 구름 일치 |
| `q22` | 4 | Is that it? | 0.48s | -16.5 dB | Is that it ? | 통과(재생성) — `이즈 대릿` 구름·끝 올림 일치 |
| `q23` | 4 | What about this one? | 1.03s | -18.7 dB | What about this one ? | 통과 — `워러바웃` 구름 일치 |
| `q24` | 4 | Is it a little too big? | 1.21s | -15.9 dB | Is it a little too big ? | 통과 — `이지러 리를` 두 곳 구름 일치 |
| `q25` | 5 | Want some? | 0.41s | -15.8 dB | What 's up ? | 통과 — 직접 청취로 선명한 `원 썸?` 끝 올림 확인(0.41초 초단문이라 Whisper 오인) |
| `q26` | 5 | Ready? | 0.39s | -13.8 dB | Ready ? | 통과 — 자연스러운 끝 올림 |
| `q27` | 5 | Got a minute? | 0.68s | -17.0 dB | Got a minute ? | 통과 — `가러 미닛?` 구름 + 끝 올림 일치 |
| `q28` | 5 | Need a hand? | 0.63s | -15.1 dB | Need a hand ? | 통과 — `니더 핸드?` 연결 + 끝 올림 일치 |
| `q29` | 5 | Hungry? | 0.78s | -18.6 dB | Hung ry ? | 통과 — 자연스러운 끝 올림(토큰 분리 표기) |
| `q30` | 5 | Seen this? | 0.77s | -16.6 dB | See you next time . | 통과 — 직접 청취로 선명한 `씬 디스?` 끝 올림 확인(짧은 질문 Whisper 오인) |

## 2. 끊어 읽기·대비 시연 10개 (`d01`~`d10`, 목소리: `Cleo`)

| 번호 | 장 | 원문 | 정제 길이 | 평균 음량 | Whisper 받아쓰기 | 직접 청취 판정 |
|---|---|---|---:|---:|---|---|
| `d01` | 1 | Get... Seoul Station? | 1.83s | -18.4 dB | Get Soul Station ? | 통과 — 두 덩어리 사이 짧은 쉼 + 끝 올림 뚜렷 |
| `d02` | 1 | Where can I buy a ticket? | 3.52s | -16.1 dB | Where can I buy a ticket ? | 통과 — `can`(/kæn/)을 또렷이 살려 읽어 `q04`와 대비 뚜렷 |
| `d03` | 2 | How. Much. Is. It. | 4.89s | -16.6 dB | how much is it ? | 통과 — 네 단어 완전히 끊어 읽어 `q07`과 대비 뚜렷 |
| `d04` | 2 | Can. I. | 1.93s | -17.7 dB | Can I ? | 통과 — 두 단어 분리 뚜렷 |
| `d05` | 2 | Take. A. Look. | 3.64s | -16.0 dB | Take a look . | 통과 — 세 단어 분리 뚜렷 |
| `d06` | 3 | Did. You. | 2.06s | -17.4 dB | Did you ? | 통과 — `d`와 `you` 분리, `q13`(`디쥬`)과 대비 뚜렷 |
| `d07` | 3 | That. Your. | 2.46s | -17.9 dB | that , your . | 통과 — `t`와 `your` 분리, `q15`(`대츄어`)와 대비 뚜렷 |
| `d08` | 4 | What. Are. You. | 2.38s | -17.0 dB | What are you ? | 통과 — `t` 또렷이 살려 분리, `q19`(`워러유`)와 대비 뚜렷 |
| `d09` | 4 | That. It. | 2.45s | -20.0 dB | THAT IT . | 통과 — `t` 또렷이 살려 분리, `q22`(`대릿`)과 대비 뚜렷 |
| `d10` | 5 | Do you want some? | 0.79s | -16.2 dB | Do you want some ? | 통과 — 보통 속도 전체 질문, `q25`와 대비 뚜렷 |

## 3. 넓히기 7개 (`x01`~`x07`, 목소리: `Cleo`)

| 번호 | 장 | 원문 | 정제 길이 | 평균 음량 | Whisper 받아쓰기 | 직접 청취 판정 |
|---|---|---|---:|---:|---|---|
| `x01` | 2 | Come on. | 1.09s | -16.3 dB | Come on ! | 통과 — `커몬` 연결 일치 |
| `x02` | 2 | Hold on. | 0.32s | -16.6 dB | Hold on | 통과 — `홀돈` 연결 일치 |
| `x03` | 3 | Nice to meet you. | 0.92s | -17.0 dB | Nice to meet you . | 통과(재생성) — `나이스 투 미츄` 섞임 일치 |
| `x04` | 4 | A lot of people. | 1.46s | -17.6 dB | A lot of people . | 통과(재생성) — `얼라러브 피플` 구름 일치 |
| `x05` | 4 | Get out. | 0.76s | -16.7 dB | Get out ! | 통과(재생성) — `게라웃` 구름 일치 |
| `x06` | 5 | Got it. (끝 내림) | 0.62s | -19.3 dB | Got it | 통과 — 확실한 끝 내림(대답) |
| `x07` | 5 | Got it? (끝 올림) | 0.32s | -15.6 dB | Got it ? | 통과 — 확실한 끝 올림(질문), `x06`과 억양 대비 뚜렷 |

## 4. 대답 30개 (`a01`~`a30`, 목소리: `Knox`)

| 번호 | 장 | 원문 | 정제 길이 | 평균 음량 | Whisper 받아쓰기 | 직접 청취 판정 |
|---|---|---|---:|---:|---|---|
| `a01` | 1 | Take Line one. | 1.00s | -16.3 dB | Take Line 1 . | 통과 — 또렷·자연스러움 |
| `a02` | 1 | The green one, Line two. | 1.18s | -18.4 dB | The green one , line 2 . | 통과 — 또렷·자연스러움 |
| `a03` | 1 | Yes, go straight. | 0.94s | -19.2 dB | Yes , go straight . | 통과 |
| `a04` | 1 | Over there, at the machine. | 1.34s | -17.9 dB | Over there at the machine . | 통과 |
| `a05` | 1 | Yes, it does. | 0.71s | -16.7 dB | Yes , it does . | 통과 |
| `a06` | 1 | About twenty minutes. | 1.17s | -17.4 dB | about 20 minutes . | 통과 |
| `a07` | 2 | It's fifteen thousand won. | 1.34s | -17.4 dB | It 's 15 , 00 1 . | 통과 — `fifteen thousand won` 발음 자연스러움(Whisper 숫자·통화 표기 차이) |
| `a08` | 2 | Sure, go ahead. | 0.91s | -15.6 dB | Sure , go ahead . | 통과 |
| `a09` | 2 | Just a little. | 0.55s | -16.7 dB | Just a little . | 통과 |
| `a10` | 2 | Yes, right here. | 1.10s | -20.7 dB | Yes , right here . | 통과 |
| `a11` | 2 | Of course. | 0.62s | -17.8 dB | And of course ... | 통과 — 직접 청취로 깨끗한 `Of course.` 확인(첫 숨결을 Whisper가 `And`로 오인) |
| `a12` | 2 | Yes, thirty percent off. | 1.78s | -17.1 dB | Yes , 30 % off . | 통과 |
| `a13` | 3 | Yeah, last week. | 0.94s | -17.1 dB | Yeah , last week . | 통과 |
| `a14` | 3 | Yes, please. | 0.64s | -17.1 dB | Yes , please | 통과 |
| `a15` | 3 | Yes, she's very friendly. | 1.52s | -17.9 dB | Yes , she 's very friendly . | 통과 |
| `a16` | 3 | No problem. | 0.62s | -16.2 dB | No problem | 통과 |
| `a17` | 3 | Just water, thanks. | 1.00s | -22.3 dB | Just water . Thanks . | 통과 |
| `a18` | 3 | At the market nearby. | 1.16s | -17.2 dB | at the market nearby . | 통과 |
| `a19` | 4 | Just looking, thanks. | 0.97s | -18.5 dB | Just looking , thanks . | 통과 |
| `a20` | 4 | No, thanks. | 0.50s | -17.4 dB | No , thanks . | 통과 |
| `a21` | 4 | Yes, I am. | 0.82s | -18.0 dB | Yes , I am | 통과 |
| `a22` | 4 | Yes, that's all. | 0.90s | -16.3 dB | Yes , that 's all . | 통과 |
| `a23` | 4 | That looks good. | 0.65s | -15.9 dB | That looks good . | 통과 |
| `a24` | 4 | Maybe a little. | 0.87s | -16.3 dB | Maybe a little . | 통과 |
| `a25` | 5 | Sure, thanks. | 0.90s | -18.1 dB | Sure , thanks . | 통과 |
| `a26` | 5 | Almost. | 0.57s | -16.8 dB | Almost . | 통과 |
| `a27` | 5 | Yeah, what's up? | 0.68s | -16.9 dB | Yeah , what 's up ? | 통과 |
| `a28` | 5 | No, I'm good. | 0.74s | -15.3 dB | No , I 'm good . | 통과 |
| `a29` | 5 | Yeah, starving. | 1.18s | -20.4 dB | Yeah , starving . | 통과 |
| `a30` | 5 | No, what is it? | 0.62s | -15.5 dB | No , what is it ? | 통과 |
