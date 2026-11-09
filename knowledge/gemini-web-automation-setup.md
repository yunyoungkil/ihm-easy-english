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

