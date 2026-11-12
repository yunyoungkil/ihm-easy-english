# Gemini(Antigravity) 코딩 환경 동기화 가이드

이 문서는 **다른 PC의 Gemini(Antigravity)** 에서도 현재 PC와 동일한 코딩·디버깅·브라우저 자동화·콘텐츠 제작 환경을 설치하고 유지하기 위한 기준 문서입니다.
> API 키, OAuth 토큰, `.env` 비밀 값은 이 문서에 적지 않으며 깃에 올리지 않습니다. 새 PC에는 기존 PC에서 안전하게 직접 옮겨 주세요.

---

## 1. Antigravity & CLI 기본 런타임

| 항목 | 현재 PC 확인 값 | 새 PC 확인 명령 |
|---|---|---|
| Antigravity (`agy`) | `1.5.6` (`%USERPROFILE%\.gemini\bin\agy.exe`) | `agy --version` 또는 `agy.version.json` 확인 |
| Gemini CLI (전역 npm) | `@google/gemini-cli@0.66.0` | `npm list -g --depth=0` (`npm i -g @google/gemini-cli`) |
| Node.js / npm | `v24.7.0` / `11.6.3` | `node -v`, `npm -v` |
| Python + 패키지 | `3.10.11`, `youtube-transcript-api` `1.2.4` | `python --version`, `pip show youtube-transcript-api` |
| Git & 훅 | `2.51.0.windows.1`, `core.hooksPath=.githooks` | `node scripts/ensure-git-hooks.mjs` |
| FFmpeg / yt-dlp | `ffmpeg 9.0-full_build-www.gyan.dev` / `yt-dlp 2026.08.19` | `ffmpeg -version`, `yt-dlp --version` |
| Playwright | `1.62.1` (`package.json` 의존성) | `npm install` 후 `npx playwright --version` |
| Chrome 자동화 프로필 | `Gemini-Automation` (`%LOCALAPPDATA%\Google\Chrome\AutomationProfile`) | `node scripts/setup-automation-chrome.mjs` ([가이드](gemini-web-automation-setup.md)) |

---

## 2. 설치된 Antigravity 플러그인 (`~/.gemini/config/plugins/`, `config.json`)

Antigravity Plugins Manager(또는 Marketplace)에서 아래 3개 플러그인을 설치하고, `swarm` 기능을 켜 둡니다.

| 로컬 폴더명 | Marketplace ID | 설치 버전 | 용도 |
|---|---|---|---|
| `chrome-devtools-plugin` | `antigravity-plugins-official/plugin/chrome-devtools-plugin` | `1.10.1` | Chrome DevTools MCP, 접근성(a11y)·LCP·쿠키·메모리 누수 디버깅 스킬 |
| `coderabbit` | `antigravity-plugins-partners/plugin/coderabbit` | `1.2.0` | CodeRabbit AI 코드 리뷰·autofix·설정 스킬 및 `coderabbit-runtime` |
| `context7` | `antigravity-plugins-partners/plugin/context7` | `1.0.1` | 라이브러리 최신 공식 문서·API 레퍼런스 조회 MCP |
| *(내장 설정)* | `swarm` (`enabled: true` in `~/.gemini/config/config.json`) | — | 병렬 에이전트 스웜 실행 |

---

## 3. MCP 서버 설정 (`~/.gemini/config/mcp_config.json`, `~/.gemini/settings.json`)

| MCP 이름 | 설정 위치 | 연결 방식 / 실행 명령 | 필요한 환경변수(이름만) |
|---|---|---|---|
| `gemini` | `~/.gemini/config/mcp_config.json` (Antigravity) | `cmd.exe /c npx -y @chrischall/gemini-mcp` | `GEMINI_API_KEY`, `GEMINI_OUTPUT_DIR` |
| `gemini-media` | `~/.gemini/settings.json` (Gemini CLI) | `cmd.exe /c npx -y @chrischall/gemini-mcp` | `GEMINI_API_KEY` |
| `context7` | `context7` 플러그인 내장 (`mcp_config.json`) | Remote MCP URL: `https://mcp.context7.com/mcp` | 없음 |
| `chrome_devtools` | `chrome-devtools-plugin` 플러그인 내장 | 플러그인 자동 등록 (`~/.gemini/antigravity/mcp/chrome_devtools/`) | 없음 |

- 새 PC의 `~/.gemini/config/mcp_config.json` 예시 (키 값은 본인 키로 채움):
```json
{
  "mcpServers": {
    "gemini": {
      "command": "cmd.exe",
      "args": ["/c", "npx", "-y", "@chrischall/gemini-mcp"],
      "env": {
        "GEMINI_API_KEY": "<본인_GEMINI_API_KEY>",
        "GEMINI_OUTPUT_DIR": "<출력_폴더_경로>"
      }
    }
  }
}
```

---

## 4. 설치된 전역 스킬 (`~/.agents/skills/`, `~/.gemini/config/skills/`, `~/.gemini/skills/`)

### A. `~/.agents/.skill-lock.json` 기준 설치 출처 (39개, `npx skills add <source>`)

1. **`heygen-com/hyperframes` (12개)**:
   `hyperframes`, `hyperframes-animation`, `hyperframes-audio`, `hyperframes-cli`, `hyperframes-core`, `hyperframes-creative`, `hyperframes-keyframes`, `hyperframes-registry`, `hyperframes-studio`, `general-video`, `faceless-explainer`, `media-use`
2. **`obra/superpowers` (15개)**:
   `brainstorming`, `diagnosing-superpowers`, `dispatching-parallel-agents`, `executing-plans`, `finishing-a-development-branch`, `receiving-code-review`, `requesting-code-review`, `subagent-driven-development`, `systematic-debugging`, `test-driven-development`, `using-git-worktrees`, `using-superpowers`, `verification-before-completion`, `writing-plans`, `writing-skills`
3. **`nextlevelbuilder/ui-ux-pro-max-skill` (7개)**:
   `banner-design`, `brand`, `design`, `design-system`, `slides`, `ui-styling`, `ui-ux-pro-max`
4. **`daleseo/korean-skills` (3개)**:
   `grammar-checker`, `humanizer`, `style-guide`
5. **`multica-ai/andrej-karpathy-skills` (1개)**:
   `karpathy-guidelines`
6. **`bradautomates/claude-video` (1개)**:
   `watch`

### B. Antigravity 전역 스킬 (`~/.gemini/config/skills/` — 27개)

`banner-design`, `brainstorming`, `brand`, `design`, `design-system`, `diagnosing-superpowers`, `dispatching-parallel-agents`, `executing-plans`, `finishing-a-development-branch`, `grammar-checker`, `humanizer`, `karpathy-guidelines`, `receiving-code-review`, `requesting-code-review`, `slides`, `style-guide`, `subagent-driven-development`, `systematic-debugging`, `test-driven-development`, `ui-styling`, `ui-ux-pro-max`, `using-git-worktrees`, `using-superpowers`, `verification-before-completion`, `watch`, `writing-plans`, `writing-skills`

### C. Gemini CLI 전역 스킬 (`~/.gemini/skills/` — 13개)

`faceless-explainer`, `general-video`, `hyperframes`, `hyperframes-animation`, `hyperframes-audio`, `hyperframes-cli`, `hyperframes-core`, `hyperframes-creative`, `hyperframes-keyframes`, `hyperframes-registry`, `hyperframes-studio`, `karpathy-guidelines`, `media-use`

### D. 저장소 포함 워크스페이스 스킬 (깃 추적)

- `.agents/skills/`: `episode-planning`, `ui-ux-pro-max`
- `.agent/skills/`: `ui-ux-pro-max`

---

## 5. 새 PC 일괄 설치 및 상태 점검

### 새 PC 초기 설치 순서

```powershell
# 1. 저장소 의존성 및 Git 훅(.githooks) 활성화
npm install
node scripts/ensure-git-hooks.mjs

# 2. 전역 CLI / 파이썬 패키지
npm i -g @google/gemini-cli
pip install youtube-transcript-api yt-dlp
# ffmpeg는 OS 패키지 매니저(winget install Gyan.FFmpeg 등)로 설치

# 3. 전역 스킬 설치 (~/.agents/skills/ 및 각 에이전트 경로)
npx skills add heygen-com/hyperframes --global
npx skills add obra/superpowers --global
npx skills add nextlevelbuilder/ui-ux-pro-max-skill --global
npx skills add daleseo/korean-skills --global
npx skills add multica-ai/andrej-karpathy-skills --global
npx skills add bradautomates/claude-video --global

# 4. Antigravity Plugins Manager UI에서 플러그인 3종 설치:
#    - antigravity-plugins-official/plugin/chrome-devtools-plugin
#    - antigravity-plugins-partners/plugin/coderabbit
#    - antigravity-plugins-partners/plugin/context7
#
# 5. ~/.gemini/config/mcp_config.json 에 gemini MCP (@chrischall/gemini-mcp) 등록 및
#    바탕화면 Gemini-Automation 크롬 로그인 (node scripts/setup-automation-chrome.mjs)
```

### 빠른 환경 점검 명령 (Gemini 시작 브리핑 시 사용)

```powershell
node -e "
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execSync } = require('child_process');
const home = os.homedir();
const reqPlugins = ['chrome-devtools-plugin', 'coderabbit', 'context7'];
const pluginsDir = path.join(home, '.gemini/config/plugins');
const missPlugins = reqPlugins.filter(p => !fs.existsSync(path.join(pluginsDir, p)));
const mcpCfgPath = path.join(home, '.gemini/config/mcp_config.json');
const hasGeminiMcp = fs.existsSync(mcpCfgPath) && Boolean(JSON.parse(fs.readFileSync(mcpCfgPath, 'utf8')).mcpServers?.gemini);
const geminiSkillsCount = fs.existsSync(path.join(home, '.gemini/config/skills')) ? fs.readdirSync(path.join(home, '.gemini/config/skills')).length : 0;
const agentsSkillsCount = fs.existsSync(path.join(home, '.agents/skills')) ? fs.readdirSync(path.join(home, '.agents/skills')).length : 0;
let hooksPath = '';
try { hooksPath = execSync('git config core.hooksPath', { encoding: 'utf8' }).trim(); } catch {}
console.log(JSON.stringify({ missPlugins, hasGeminiMcp, geminiSkillsCount, agentsSkillsCount, hooksPath }));
"
```
