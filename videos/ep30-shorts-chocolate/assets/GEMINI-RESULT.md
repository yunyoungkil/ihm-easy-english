# EP30 쇼츠(chocolate) 재료 생성 결과

판정 요약: **길이·음량 검사 통과, 소리 내용은 Claude가 받아쓰기로 확인 필요**

---

## 1. 만든 파일 목록 (총 11개)

### 일 1: 원어민 영어 단어 음성 (`videos/ep30-shorts-chocolate/assets/voice-en/`, 10개)
- `videos/ep30-shorts-chocolate/assets/voice-en/chocolate-natural.wav`
- `videos/ep30-shorts-chocolate/assets/voice-en/chocolate-careful.wav`
- `videos/ep30-shorts-chocolate/assets/voice-en/vegetable-natural.wav`
- `videos/ep30-shorts-chocolate/assets/voice-en/vegetable-careful.wav`
- `videos/ep30-shorts-chocolate/assets/voice-en/different-natural.wav`
- `videos/ep30-shorts-chocolate/assets/voice-en/different-careful.wav`
- `videos/ep30-shorts-chocolate/assets/voice-en/memory-natural.wav`
- `videos/ep30-shorts-chocolate/assets/voice-en/memory-careful.wav`
- `videos/ep30-shorts-chocolate/assets/voice-en/vulnerable-natural.wav`
- `videos/ep30-shorts-chocolate/assets/voice-en/vulnerable-careful.wav`

### 일 2: 배경음악 (`videos/ep30-shorts-chocolate/assets/bgm/`, 1개)
- `videos/ep30-shorts-chocolate/assets/bgm/track.mp3` (AI Studio Lyria 3.5 Composer 모드 생성 후 `ffmpeg -map_metadata -1 -c:a copy`로 C2PA 메타데이터 제거, `1,519,266 B → 1,512,218 B`)

---

## 2. 확인 숫자 (`ffprobe` + `ffmpeg volumedetect`)

기준:
- 음성: 길이 `0.2초 이상 ~ 5.0초 이하`(정상 `0.4~3.0초`), `mean_volume > -45 dB`, `max_volume < 0 dB`
- 배경음악: 길이 `60.0초 이상`, `mean_volume > -45 dB`, `max_volume < 0 dB`, 첫 3초/마지막 3초 음량 확인

| 파일 | 길이(초) | 채널 | 샘플 레이트 | 크기(B) | `mean_volume` | `max_volume` | 검사 |
|---|---:|---:|---:|---:|---:|---:|---|
| `voice-en/chocolate-natural.wav` | 1.120000 | 1 | 24000 Hz | 53,804 | -24.4 dB | -4.6 dB | 통과 |
| `voice-en/chocolate-careful.wav` | 2.280000 | 1 | 24000 Hz | 109,484 | -23.2 dB | -5.7 dB | 통과 |
| `voice-en/vegetable-natural.wav` | 1.160000 | 1 | 24000 Hz | 55,724 | -21.0 dB | -2.8 dB | 통과 |
| `voice-en/vegetable-careful.wav` | 2.400000 | 1 | 24000 Hz | 115,244 | -23.5 dB | -4.3 dB | 통과 |
| `voice-en/different-natural.wav` | 0.840000 | 1 | 24000 Hz | 40,364 | -19.1 dB | -2.5 dB | 통과 |
| `voice-en/different-careful.wav` | 2.320000 | 1 | 24000 Hz | 111,404 | -20.4 dB | -4.6 dB | 통과 |
| `voice-en/memory-natural.wav` | 1.000000 | 1 | 24000 Hz | 48,044 | -23.9 dB | -5.1 dB | 통과 |
| `voice-en/memory-careful.wav` | 2.520000 | 1 | 24000 Hz | 121,004 | -14.7 dB | -1.6 dB | 통과 |
| `voice-en/vulnerable-natural.wav` | 1.040000 | 1 | 24000 Hz | 49,964 | -22.9 dB | -8.1 dB | 통과 |
| `voice-en/vulnerable-careful.wav` | 2.880000 | 1 | 24000 Hz | 138,284 | -19.4 dB | -3.8 dB | 통과 |
| `bgm/track.mp3` | 62.981224 | 2 | 44100 Hz | 1,512,218 | -14.3 dB | -0.2 dB | 통과 |

### 배경음악(`bgm/track.mp3`) 구간별 확인
- 길이: `62.981224초` (`60초` 이상 조건 통과, 나레이션 합계 `58.84초`보다 김)
- 첫 3초 (`-ss 0 -t 3`): `mean_volume = -16.6 dB`, `max_volume = -0.7 dB`
- 마지막 3초 (`-sseof -3`): `mean_volume = -41.3 dB`, `max_volume = -23.6 dB` (첫 3초와 차이 `24.7 dB`)
- 후반 상세 확인: `54~57초` 구간 `mean_volume = -15.6 dB` (`max -4.2 dB`)로 첫 3초(`-16.6 dB`)와 `1.0 dB` 차이로 일정하게 유지되다가, `57~60초`(`-22.7 dB`) → `60~63초`(`-42.1 dB`)로 마지막 약 5초 동안 프롬프트 지시(`short natural fade`)대로 자연 페이드아웃됨.
- 포맷·메타데이터(`ffprobe`): `codec_name=mp3`, `bit_rate=192084`, `TAG:encoder=Lavf63.1.100` (원본 C2PA/ID3 태그 제거 완료)

---

## 3. 실패·재시도한 것과 이유

- **음성 10개 / BGM 1곡 생성 자체**: 실패·재시도 없음 (모두 1회 생성으로 길이·음량 기준 통과).
- **참고(보조 스크립트 실행 준비 중 발생)**:
  - Lyria 3.5 화면 점검 당시 `document`의 생성 버튼 클래스가 문서 기재(`button.ctrl-enter-submit`)가 아닌 `button.ctrl-enter-submits`였으므로 둘 다 매칭하도록 처리함.
  - 스크래치 디렉터리의 BGM 생성 보조 스크립트 첫 실행에서 `playwright-core` ESM 경로 해석 오류(`ERR_MODULE_NOT_FOUND`)가 1회 발생해 `createRequire`로 작업 폴더의 `package.json` 기준 로드하도록 수정 후 실행함(생성 요청 자체는 1회만 실행).

---

## 4. 실행한 명령 그대로

### 사전 확인
```powershell
git pull
Get-ChildItem -Recurse videos/ep30-shorts-chocolate/assets -ErrorAction SilentlyContinue; netstat -ano | Select-String ":9222|3001" | Select-String "LISTENING"
```

### 일 1: 원어민 단어 음성 10파일 생성 (단어 간 약 17초 간격, 목소리 `Gero`)
```powershell
node scripts/generate-aistudio-speech.mjs --text "chocolate" --voice Gero --style "A native American English speaker casually saying a single word at normal conversational speed. Relaxed, natural, not over-pronounced." --output "videos/ep30-shorts-chocolate/assets/voice-en/chocolate-natural.wav"
node scripts/generate-aistudio-speech.mjs --text "chocolate" --voice Gero --style "A native American English speaker saying a single word slowly and clearly, giving every sound its full value, as in a pronunciation lesson." --output "videos/ep30-shorts-chocolate/assets/voice-en/chocolate-careful.wav"
node scripts/generate-aistudio-speech.mjs --text "vegetable" --voice Gero --style "A native American English speaker casually saying a single word at normal conversational speed. Relaxed, natural, not over-pronounced." --output "videos/ep30-shorts-chocolate/assets/voice-en/vegetable-natural.wav"
node scripts/generate-aistudio-speech.mjs --text "vegetable" --voice Gero --style "A native American English speaker saying a single word slowly and clearly, giving every sound its full value, as in a pronunciation lesson." --output "videos/ep30-shorts-chocolate/assets/voice-en/vegetable-careful.wav"
node scripts/generate-aistudio-speech.mjs --text "different" --voice Gero --style "A native American English speaker casually saying a single word at normal conversational speed. Relaxed, natural, not over-pronounced." --output "videos/ep30-shorts-chocolate/assets/voice-en/different-natural.wav"
node scripts/generate-aistudio-speech.mjs --text "different" --voice Gero --style "A native American English speaker saying a single word slowly and clearly, giving every sound its full value, as in a pronunciation lesson." --output "videos/ep30-shorts-chocolate/assets/voice-en/different-careful.wav"
node scripts/generate-aistudio-speech.mjs --text "memory" --voice Gero --style "A native American English speaker casually saying a single word at normal conversational speed. Relaxed, natural, not over-pronounced." --output "videos/ep30-shorts-chocolate/assets/voice-en/memory-natural.wav"
node scripts/generate-aistudio-speech.mjs --text "memory" --voice Gero --style "A native American English speaker saying a single word slowly and clearly, giving every sound its full value, as in a pronunciation lesson." --output "videos/ep30-shorts-chocolate/assets/voice-en/memory-careful.wav"
node scripts/generate-aistudio-speech.mjs --text "vulnerable" --voice Gero --style "A native American English speaker casually saying a single word at normal conversational speed. Relaxed, natural, not over-pronounced." --output "videos/ep30-shorts-chocolate/assets/voice-en/vulnerable-natural.wav"
node scripts/generate-aistudio-speech.mjs --text "vulnerable" --voice Gero --style "A native American English speaker saying a single word slowly and clearly, giving every sound its full value, as in a pronunciation lesson." --output "videos/ep30-shorts-chocolate/assets/voice-en/vulnerable-careful.wav"
```
(1번 파일 후 나머지 9개는 `C:\Users\yunyo\.gemini\antigravity\brain\30f0923b-b817-4d9e-826f-ae6e7dd9ea44\scratch\run-voice-en.mjs`를 통해 위 동일 인자·명령으로 순차 실행)

### 일 2: 배경음악 1곡 생성 및 메타데이터 정리
- `https://aistudio.google.com/new_music?model=lyria-3.5` Composer 모드(`Intro 0:00~0:08`, `Verse 0:08~0:55`, `Outro 0:55~1:03`, 긍정문 프롬프트만 입력, `key_off` 무료 세션)를 `C:\Users\yunyo\.gemini\antigravity\brain\30f0923b-b817-4d9e-826f-ae6e7dd9ea44\scratch\generate-lyria-bgm.mjs`로 실행해 `track-raw.mp3` 저장.
- 메타데이터 정리:
```powershell
ffmpeg -y -i "C:\Users\yunyo\.gemini\antigravity\brain\30f0923b-b817-4d9e-826f-ae6e7dd9ea44\scratch\track-raw.mp3" -map 0:a:0 -map_metadata -1 -c:a copy "videos/ep30-shorts-chocolate/assets/bgm/track.mp3"
```

### 확인 명령
```powershell
ffprobe -v error -show_entries format=duration,size,bit_rate:format_tags -show_entries stream=codec_name,sample_rate,channels -of default=noprint_wrappers=1 "videos/ep30-shorts-chocolate/assets/bgm/track.mp3"
# 전체 11개 파일 ffprobe (duration, size, sample_rate, channels) 및 ffmpeg -i <파일> -af volumedetect -f null -
# BGM 첫 3초(-ss 0 -t 3), 마지막 3초(-sseof -3), 후반 54-57s / 57-60s / 60-63s volumedetect
```

---

## 5. 확인하지 못한 것

- **실제 오디오 청취 및 받아쓰기 내용 확인**: 에이전트는 소리를 직접 들을 수 없으므로, 10개 영어 단어 음성의 실제 발음(natural과 careful의 음절 탈락·살림 차이)과 BGM(`track.mp3`)의 악기 구성·허밍/보컬 혼입 여부는 확인하지 못했다. **Claude가 받아쓰기(whisper 등) 및 청취 점검으로 소리 내용을 확인해야 한다.**
