# EP30 쇼츠(chocolate) 재료 만들기 — Gemini(Antigravity)용 지시서

> 이 파일은 **사용자가 Antigravity의 Gemini 새 대화에 통째로 붙여 넣어 쓴다.** 처음에 `AGENTS.md`의 "0. 작업 확인 규칙"과 "이미지 생성 2단계 원칙"을 읽고, 이 파일의 일만 한다. 다른 파일은 고치지 않는다. 영상 조립·렌더는 하지 않는다(Claude가 한다).

## 먼저
1. `git pull`. 아래 "만들 것" 파일이 이미 있으면 덮어쓰지 말고 `-v2`처럼 새 이름으로 만든다(실패한 시도도 지우지 않는다).
2. 자동화용 크롬(`Gemini-Automation` 프로필, 포트 9222)이 떠 있고 구글 로그인이 돼 있는지 확인한다. 없으면 `knowledge/gemini-web-automation-setup.md`대로 켠다. 로그인이 안 돼 있으면 멈추고 사용자에게 알린다.
3. 결제·"Unlock"·"Upgrade" 안내가 뜨면 누르지 않는다. 한도 오류(429, quota)가 나오면 멈추고 어디까지 했는지 적는다.

## 일 1. 원어민 영어 단어 음성 5개 (총 10파일)
단어: `chocolate`, `vegetable`, `different`, `memory`, `vulnerable`.
각 단어마다 두 가지를 만든다. 영상에서 "글자로는 이렇게 읽는데 실제 소리는 이렇다"를 대조하는 재료다.
- `<단어>-natural.wav`: 미국 원어민이 **평소 속도로 편하게** 말한 소리(가운데 소리를 일부러 살리지도 줄이지도 않는다).
- `<단어>-careful.wav`: 같은 사람이 **천천히 또렷하게** 모든 소리를 살려 말한 소리.

저장 위치: `videos/ep30-shorts-chocolate/assets/voice-en/`. 명령은 단어마다 이렇게 쓴다(`scripts/generate-aistudio-speech.mjs`, 사용법은 파일 맨 위 주석):
```
node scripts/generate-aistudio-speech.mjs --text "chocolate" --voice Gero --style "A native American English speaker casually saying a single word at normal conversational speed. Relaxed, natural, not over-pronounced." --output "videos/ep30-shorts-chocolate/assets/voice-en/chocolate-natural.wav"
node scripts/generate-aistudio-speech.mjs --text "chocolate" --voice Gero --style "A native American English speaker saying a single word slowly and clearly, giving every sound its full value, as in a pronunciation lesson." --output "videos/ep30-shorts-chocolate/assets/voice-en/chocolate-careful.wav"
```
- `--text`에는 **그 단어 하나만** 넣는다(설명·지시·따옴표·마침표를 넣지 않는다. 지시는 `--style`에만).
- 스크립트가 화면 조작에 실패하면 원인(어느 버튼이 없었나)을 적고 멈춘다. 같은 오류로 5번 넘게 다시 시도하지 않는다.

## 일 2. 배경음악 1곡
- 도구: AI Studio **Lyria 3.5** 화면(`https://aistudio.google.com/new_music?model=lyria-3.5`). API 키는 쓰지 않는다(유료). 화면 조작 요령은 `knowledge/gemini-web-automation-setup.md`의 Lyria 3.5 UI 주의(Composer 모드, 생성 버튼 `button.ctrl-enter-submit`)를 따른다.
- 길이: **62초 안팎**(60초 이상). 영상 음성 합계가 58.84초라 이보다 짧으면 안 된다.
- 프롬프트(긍정문만 쓴다. "~하지 마라" 식 문장을 넣으면 그 요소가 나오기 쉽다):
```
Instrumental background music for a short educational video. Warm, friendly and curious mood. A gentle steady pulse around 100 BPM, soft electric piano, light plucked bass and quiet brushed percussion. Even energy from start to finish with smooth transitions, mixed softly so a narrator's voice sits clearly on top. About 62 seconds, ends with a short natural fade.
```
- 저장: `videos/ep30-shorts-chocolate/assets/bgm/track.mp3`. 이미 있으면 `track-v2.mp3`.
- 저장 뒤 `ffmpeg -i <파일> -map_metadata -1 -c copy <정리된 파일>`로 메타데이터(C2PA)를 정리해 같은 이름으로 둔다(`knowledge/free-generation-tools.md`).

## 확인 (끝나기 전에 모두 하고 결과를 적는다)
1. 파일마다 `ffprobe`로 길이·채널·샘플 레이트를 적는다. 음성은 단어 하나당 대략 0.4~3초가 정상이다. **5초가 넘거나 0.2초 미만이면 실패로 보고 다시 만든다.**
2. 파일마다 `ffmpeg -i <파일> -af volumedetect -f null -` 의 `mean_volume`, `max_volume`을 적는다. 평균이 -45 dB보다 작으면(무음) 실패, 최대가 0 dB면(깨짐) 실패.
3. 배경음악은 길이 60초 이상인지, 첫 3초와 마지막 3초의 `mean_volume` 차이가 극단적이지 않은지 적는다.
4. **들을 수는 없으니** "소리가 맞다"고 쓰지 않는다. "길이·음량 검사 통과, 소리 내용은 Claude가 받아쓰기로 확인 필요"라고 쓴다.

## 끝내기
- 결과를 `videos/ep30-shorts-chocolate/assets/GEMINI-RESULT.md`에 적는다: 만든 파일 목록(경로), 위 확인 숫자, 실패·재시도한 것과 이유, 실행한 명령 그대로, **확인하지 못한 것**(없으면 "없음").
- 이 폴더의 새 파일(`voice-en/`, `bgm/`, `GEMINI-RESULT.md`)만 이름으로 담아 커밋하고 푸시한다. `git add -A`·`git add .` 금지. 서명은 실제 모델 이름으로(`Co-Authored-By: <지금 쓰는 Gemini 모델 이름> (Antigravity) <noreply@google.com>`). 푸시가 거부되면 force 하지 말고 사용자에게 알린다.
- **하지 않는 것**: `SCRIPT.md`·`BRIEF.md`·시트·`assets/voice/n01~n14` 수정, 렌더, 영상 조립, 다른 에피소드 파일.
