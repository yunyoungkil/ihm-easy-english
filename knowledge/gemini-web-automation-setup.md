# Chrome Web Gemini 자동화 설정 및 다중 PC 동기화 가이드

이 문서는 구글 Gemini 웹(Imagen 3)을 크롬 원격 제어(CDP)로 연동하여, **API 비용 및 쿼터 제한 없이 무제한으로 고품질 이미지를 100% 무인 자동 생성**하기 위한 설정 가이드입니다.

---

## 1. 아키텍처 및 분리 원칙

1. **개인 브라우저와 100% 격리**:
   - 개인 크롬: `%LOCALAPPDATA%\Google\Chrome\User Data\Default` (개인 북마크, 비밀번호, 결제정보)
   - 자동화 크롬: `%LOCALAPPDATA%\Google\Chrome\AutomationProfile` (완전 격리된 독립 프로필)
   - 평소 개인 크롬으로 웹서핑 중이어도 에이전트의 자동화 크롬과 서로 탭, 쿠키, 세션 간섭이 일절 없습니다.
2. **원격 디버깅 확인 팝업 원천 차단**:
   - 크롬은 기본 프로필(`Default`)에서만 "원격 디버깅을 허용하시겠습니까?" 보안 팝업을 강제합니다.
   - 전용 프로필(`AutomationProfile`)을 사용하므로 **팝업 허용 클릭 없이 100% 무인으로 즉시 연결**됩니다.

---

## 2. 다른 PC에서의 자동 설정 동작 (세션 시작 시 자동 연동)

새로운 PC에서 이 프로젝트를 클론(`git clone`)하거나 `git pull` 한 뒤 작업을 시작하면:

1. **세션 시작 훅 자동 실행**:
   - 세션 시작 브리핑(`scripts/session-briefing-hook.mjs`) 및 이미지 생성 스크립트 실행 시 `scripts/setup-automation-chrome.mjs`가 자동 호출됩니다.
2. **자동 구성 항목**:
   - 해당 PC의 `%LOCALAPPDATA%\Google\Chrome\AutomationProfile` 폴더 자동 생성
   - 해당 PC 바탕화면에 **`Gemini-Automation`** 크롬 바로가기 아이콘 자동 생성
   - 크롬 원격 디버깅(`--remote-debugging-port=9222`, `--remote-allow-origins=*`) 백그라운드 자동 구동
3. **로그인 상태 자동 점검**:
   - 아직 구글 로그인이 안 되어 있다면, 세션 시작 브리핑 할 일 목록에 `바탕화면 Gemini-Automation 아이콘에서 1회 로그인 필요 (차차)` 안내가 자동으로 표시됩니다.

---

## 3. 다른 PC 사용자가 해줄 일 (최초 1회만 필요)

새 PC에서 최초 세팅 시 사람이 해야 할 일은 **단 1가지**뿐입니다:

1. 바탕화면에 자동 생성된 **`Gemini-Automation`** 아이콘을 더블클릭합니다.
2. 열린 크롬 창(`https://gemini.google.com/app`)에서 **평소 쓰시던 구글 계정(Gemini Pro)으로 1회 로그인**합니다.
3. 끝입니다! 세션 쿠키가 `AutomationProfile`에 영구 저장되므로, 이후부터는 브라우저를 닫아도 에이전트가 알아서 백그라운드에서 무인으로 가동합니다.

---

## 4. CLI 도구 및 스크립트 사용법

### 1) 자동화 환경 점검 및 수동 실행
```bash
# 크롬 자동화 프로필 및 바로가기 생성, 실행 상태 점검
node scripts/setup-automation-chrome.mjs
```

### 2) 이미지 자동 생성 및 추출 CLI
```bash
# 원하는 프롬프트로 이미지를 생성하고 지정 폴더에 고화질(1024x572 등) 자동 저장
node scripts/generate-web-gemini-image.mjs \
  --prompt "A cute smiling cat wearing blue headphones, hand-drawn sketchnote style on pure white background #FFFFFF" \
  --output "examples/test_cat.png"
```
- 크롬이 꺼져 있으면 스크립트가 스스로 크롬을 백그라운드로 띄운 뒤 작업을 수행합니다.
- DOM의 `canvas.toDataURL`을 이용해 CSP(보안 정책) 우회 없이 무손실 원본 PNG로 바로 추출·저장합니다.

---

## 5. 트러블슈팅

1. **포트 9222가 다른 프로세스에 의해 점유되어 있을 때**:
   ```powershell
   netstat -ano | findstr ":9222"
   # 필요 시 기존 프로세스 종료
   Stop-Process -Id <PID> -Force
   ```
2. **로그인이 풀렸거나 세션이 만료되었을 때**:
   - 바탕화면의 **`Gemini-Automation`** 아이콘을 다시 더블클릭하여 구글 계정으로 재로그인합니다.

---

## 6. 무료 생성 도구 확장 (2026-11-11 사용자 알림)

같은 `Gemini-Automation` 크롬 프로필(구글 로그인 1회)로 아래 사이트도 자동화한다. 상세 우선순위 표는 `AGENTS.md` "이미지 생성 2단계 원칙".

| 사이트 | 쓸 곳 | 워터마크 | 상태 |
|---|---|---|---|
| https://aistudio.google.com | 이미지(워터마크 없음), 영상(`Omni 1.2 Flash`) | **이미지(`Nano Banana 2.1`): 눈에 보이는 워터마크 없음 — 확인됨 (2026-11-12)** (16:9 `1376×768`, 네 모서리 240×240 확대 확인. 글자 정확: 한글 `컴포터블`+영어 `Comfortable` 시험) · **영상(`Omni 1.2 Flash`): 눈에 보이는 워터마크 없음 — 확인됨 (2026-11-12)** (`720×1280` 9:16 5초 네 모서리 240×240 확대 확인, 비가시 SynthID 별도) | 이미지는 **`scripts/generate-aistudio-image.mjs`로 자동화 완료(2026-11-12)** — 항상 여기서 만든다. 영상은 1차 시험 완료(EP24 두 번째 쇼츠), 자동화 스크립트 아직 없음. 비율 `Auto`/`16:9`/`9:16`(`1:1` 없음), 3~15초, 24fps, 무음 지시에도 오디오 트랙을 붙이므로 `<video muted>`/`-an` 필수 |
| https://aistudio.google.com/new_music?model=lyria-3.5 | **배경음악(BGM 1순위)** (`Lyria 3.5`) | **오디오 워터마크 없음 — 확인됨 (2026-11-12)** (`44.1kHz` 스테레오 `192 kbps` MP3 `62.25초`, `0~33초` 평균 `-14.1 dB`, ID3 C2PA 메타데이터는 `ffmpeg -map_metadata -1`로 제거) | 1차 BGM 시험 및 EP24 두 번째 쇼츠 적용 완료(2026-11-12). API 키 미선택(`key_off`) 상태에서 완전 무료. 자동화 스크립트 아직 없음. **`Composer` 모드 + 긍정문만 작성**해야 후반 허밍 유입 방지 |
| https://gemini.google.com/app | 이미지·영상 | **첫 장 이후 찍힘** — 2026-11-11 실제 확인(EP24 두 번째 쇼츠 썸네일 오른쪽 아래 별) | `scripts/generate-web-gemini-image.mjs` |
| https://www.flowmusic.app | 배경음악(2순위)·효과음·음악 비디오 | **오디오 워터마크 없음 — 확인됨 (2026-11-12)** (`Clear Speech Study Beat.mp3` `48kHz` `167.4초`, `... → Download → MP3`) · 영상은 미시험 | 1차 BGM 시험 완료(EP24 두 번째 쇼츠에서는 `Lyria 3.5`로 교체). 자동화 스크립트 아직 없음. **크레딧 안에서만 무료**(2026-11-12 사용자 정정). 실제 크레딧은 왼쪽 아래 `💎` 점수(데뷔 XP)가 아니라 설정 메뉴(`Settings menu`) 안 `... credits`(시험 시 `10575 credits`). 커뮤니티 피드의 인기 음악·음악 비디오와 프롬프트를 참고 자료로 쓴다 |

- 참고: https://flow.google.com 은 `PRO` 계정(1,050 크레딧) 팝업에서 **"거주 중인 지역에서는 워터마크 표시가 필수입니다"**가 명시적으로 확인됨(2026-11-12) → 영상 생성은 AI Studio `Omni 1.2 Flash`를 1순위로 둔다.
- AI Studio·flowmusic 자동화 스크립트를 만들면 이 표의 상태 칸을 고친다.
  - AI Studio `Lyria 3.5` UI 주의(2026-11-12 확인): 초기 빈 화면에서는 `button[data-testid="text-input"]`을 먼저 눌러 에디터를 열고, 생성 버튼은 `button.ctrl-enter-submit`을 사용한다. `Composer` 모드의 시간 입력칸은 `.fill()` 대신 `boundingBox()` 클릭 후 `Ctrl+A` → `insertText`가 안정적이다.
  - AI Studio 이미지(`Nano Banana 2.1`) UI 주의(2026-11-12 직접 확인): 주소 `https://aistudio.google.com/prompts/new_chat?model=gemini-nano-banana-2.1`. 처음 화면에 **"Google AI 요금제가 필요하다"+`Upgrade`가 잠깐 떠도 계정 정보(`PRO` 표시)가 불러와지기 전 화면이라 14초 기다리면 사라지고 무료로 생성된다**(결제 버튼은 절대 누르지 않는다). 브라우저 창이 좁으면 설정 패널이 입력칸을 가려 `1600×1000`으로 연다. 설정 패널이 닫혀 있으면 `button:has-text("tune")`로 연다. 비율은 `Aspect ratio` 아래 `mat-select` → `role=option`(`Auto`,`1:1`,`9:16`,`16:9`,`3:4`,`4:3`,`3:2`,`2:3`,`5:4`,`4:5`,`21:9`,`4:1`,`1:4`,`8:1`,`1:8`), 입력칸 `textarea[aria-label="Enter a prompt"]`, 실행 `Ctrl+Enter`, 결과는 `blob:` 주소의 큰 `<img>`(첫 화면 예시 그림은 gstatic 주소라 섞이지 않게 blob만 센다). 해상도 `1K`(16:9 `1376×768`, 1:1 `1024×1024`), 형식은 JPEG라 확장자를 맞춰 저장한다. 사용: `node scripts/generate-aistudio-image.mjs --prompt "…" --output "…" [--aspect 16:9]`.
  - flowmusic UI 주의(2026-11-12 확인): Radix UI 드롭다운(`... → Download → MP3`)은 일반 `.click()`이 멈출 수 있어 `boundingBox()` 기반 `page.mouse.click`이나 DOM `el.click()`을 쓰고, `/__api/download/audio/<id>` 직접 `fetch`는 세션 인증 없이 403이 나므로 응답 가로채기·CDP 다운로드를 사용한다.
- 처음 쓸 때 실제로 워터마크가 없는지, 무료가 맞는지 확인해 "확인됨"과 날짜를 적는다.
- flowmusic 자동화는 생성 전에 설정 메뉴 안 남은 크레딧을 읽어, 모자라면 만들지 않고 다음 날로 넘긴다(유료 결제 버튼은 누르지 않는다).

## AI Studio 이미지는 "고치기"가 기본이다 (2026-11-12 사용자 가르침)
- 이미 만든 이미지에서 일부만 틀리면(예: 썸네일 알약 글자 "초클릿"→"초콜릿") **처음부터 다시 만들지 않는다.** 같은 대화에 그 이미지를 붙여 넣고 "이 부분만 이렇게 고쳐 줘"라고 요청한다. 다시 만들면 AI가 같은 글자를 계속 틀리고, 나머지 그림도 바뀐다.
- **크롬 창이나 새 대화를 매번 열었다 닫지 않는다.** 열려 있는 같은 채팅에서 계속 이어서 만든다.
- 현재 `scripts/generate-aistudio-image.mjs`는 호출마다 새 대화(`new_chat`)를 열어 한 장씩 만든다. 이미지 붙여 넣기와 같은 채팅 이어가기는 아직 구현되지 않았다(클릭 지점도 미기록). 구현할 때 붙여 넣기 방법과 클릭 지점을 이 문서에 적는다.
- 구현 전에는 사용자에게 "이 부분 수정이 필요하다"고 알리거나, 글자만 틀린 경우 코드로 그 부분만 덮어 고친다(EP 시트 시안 E 사례).

## 실패한 이미지도 지우지 않는다 (2026-11-12 사용자 가르침)
- 틀렸거나 마음에 안 들어 보이는 이미지는 **덮어쓰거나 지우지 않는다.** 고치기 전에 기존 파일을 새 이름(`-v1` 등)으로 남기고, 무엇이 왜 틀렸는지 한 줄 적는다. 실패도 데이터이고, 내 눈에 실패인 것이 사용자에게는 더 나은 시안일 수 있다.
- 사례: 시안 E의 중간 버전을 덮어써서 복구하지 못했다. 관찰한 AI 실패 하나: 한 이미지에 "초콜릿"(알약)과 "초클릿"(큰 글자) 두 글자가 같이 들어가면, 알약에 "초콜릿"을 쓰라고 해도 3번 모두 알약이 "초클릿"으로 나왔다. 원인은 확인하지 않았다(비슷한 두 글자를 한 그림에서 같게 그리는 버릇일 수 있다). 글자를 구분 못 한다고 단정하지 않는다. 대비되는 두 글자를 한 장에 넣을 때는 결과 글자를 눈으로 확인한다.

## 유튜브 스튜디오용 별도 프로필 `Studio-Automation` (2026-11-13)

제미나이 계정과 유튜브 채널 소유 계정이 달라서, `Gemini-Automation`(포트 9222)에서 계정을 바꾸면 AI Studio 자동화가 깨진다. 그래서 프로필과 포트를 따로 둔다.
- 만드는 법: `npm run studio-chrome`(`scripts/setup-studio-chrome.mjs`). 프로필 `%LOCALAPPDATA%\Google\Chrome\StudioAutomationProfile`, 바탕화면 `Studio-Automation.lnk`, 디버깅 포트 **9223**.
- 최초 1회: 바탕화면 `Studio-Automation` 아이콘으로 열어 **채널 소유 계정**으로 로그인한다(비밀번호는 에이전트가 입력하지 않는다). 로그인 여부는 `npm run studio-chrome` 출력의 `login`(`logged-in` / `login-needed` / `unknown`)으로 본다.
- 용도는 스튜디오 화면을 읽는 것뿐이다(읽기 전용, 값을 바꾸거나 올리지 않는다). 다른 PC는 `git pull` 뒤 같은 명령과 1회 로그인.

## AI Studio 음성(TTS) 화면 (2026-11-16 직접 확인, `scripts/generate-aistudio-speech.mjs`)

**음성은 이 화면 방식이 기본이다**(2026-11-16 EP30 쇼츠 14줄을 이 방식으로 만들었고 화면에 한도·요금·오류 안내는 뜨지 않았다, 줄당 약 33초). API(무료 `GEMINI_API_KEY`)는 `gemini-3.8-flash-tts` 모델당 하루 10회 한도라서(429 본문은 `knowledge/free-generation-tools.md`) 하루 10줄 안에서의 보조다. 한 줄씩 새 탭으로 만들고 줄 사이 15~20초 쉰다: `node videos/ep30-shorts-chocolate/scripts/make-voice-browser.mjs`가 사용 예다.
- 주소 `https://aistudio.google.com/generate-speech`(`1600×1000`으로 열고 12초 기다린다). 처음에는 예시 카드 화면이라 **"Create new dialog" 카드**를 눌러야 입력 블록이 생긴다. 모델은 `gemini-3.8-flash-tts`가 기본.
- 목소리: 블록 위 `Speaker 1 - <이름>` 버튼(기본 `Fola`) → 오른쪽 목록에서 이름을 누른다 → `Escape`. `Gero`는 "Digital Assistant" 묶음에 있다(`Clear and friendly. · Low pitch`).
- 스타일: 블록 위 `Style` 버튼 → 작은 창의 입력칸("Describe the voice style.")에 **영어**로 쓴다 → `Escape`. 블록마다 따로이고 대본에 섞이지 않는다. 시험 문구: `calm, warm and trustworthy Korean language coach, natural conversational pacing, clear articulation, not exaggerated`.
- 대본 입력칸 `textarea[aria-label="Speech block text"]`, 실행 `Ctrl+Enter`. `+ Expression` 버튼에서 고르는 태그 40개(`short pause`, `long pause`, `breath`, `sigh` 등)가 `ALLOWED_TAGS`다.
- 결과: 아래 재생줄에 `<audio src="data:audio/wav;base64,...">`가 붙는다. **처음 1~2초는 0.08초짜리 자리표시 오디오가 먼저 붙고 곧 진짜 소리(예: 4.8~5.2초)로 바뀐다** — `duration > 0.5`인 것만 센다. `Download` 버튼(`aria-label="Download"`)으로도 받을 수 있고 같은 크기였다.
- 오른쪽 위 `No API key selected`는 키 없이 계정 한도로 도는 표시다. `Unlock Gemini 4 Carbon`·업그레이드 안내는 누르지 않는다. 14줄 연속 생성 중 화면에서 한도 안내는 보지 못했다(하루 몇 번까지 되는지는 확인하지 못했다).
- 목소리 오른쪽 `Temperature`는 `Model settings`를 펼치면 나온다(기본 1). 스크립트는 건드리지 않는다.
