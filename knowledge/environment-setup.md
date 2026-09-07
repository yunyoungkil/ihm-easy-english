# 환경 설정 — HeyGen/WSL 브리지, HyperFrames 콘솔 창 숨기기

마지막 갱신: 2026-09-04

`media-use` 스킬(HyperFrames 프로젝트의 BGM/이미지/보이스 무료 카탈로그)은 `heygen` CLI를 쓴다.
HeyGen CLI는 **Windows를 아직 정식 지원하지 않아서**(공식 문서: "Windows support is coming soon —
WSL is recommended in the meantime") 이 컴퓨터에서는 WSL(Ubuntu)에 설치하고, Windows 쪽에서
호출할 수 있도록 브리지를 만들어 연결했다. 이 컴퓨터가 초기화되거나 다른 장비로 옮기면 이 과정을
다시 밟아야 한다.

## 1. WSL 확인·설치

```powershell
wsl --status        # 이미 켜져 있는지 확인
wsl -l -v           # 설치된 배포판 목록
wsl --install -d Ubuntu   # 배포판이 없으면 설치 (수 분 소요, 인터넷 다운로드 필요)
```

`wsl --install -d Ubuntu` 뒤에는 **최초 1회, 사용자 이름/비밀번호를 만드는 대화형 프롬프트**가
뜬다. 자동화 스크립트로는 이 부분을 넘길 수 없으므로, 시작 메뉴에서 "Ubuntu" 앱을 직접 실행해
완료해야 한다. (이번 설치에서는 root 셸로 바로 떨어져서 별도 사용자 생성 없이 root로 진행했다 —
개인 개발 머신이라 문제없음.)

## 2. WSL 안에서 HeyGen CLI 설치·로그인

Ubuntu 셸 안에서:

```bash
curl -fsSL https://static.heygen.ai/cli/install.sh | bash
export PATH="$HOME/.local/bin:$PATH"
echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.bashrc

heygen --version
heygen update             # 무료 사용 경로에 v0.3.0 이상 필요
heygen auth login --oauth # 브라우저 자동 실행이 안 되면 출력된 URL을 윈도우 브라우저로 직접 열기
```

`--oauth`로 로그인해야 무료 크레딧 경로가 열린다(`--api-key`는 유료 API 크레딧 사용).
WSL2는 `127.0.0.1` 포트를 자동으로 Windows와 연결해주므로, OAuth 콜백은 별도 설정 없이 된다.

## 3. Windows → WSL 브리지 (`heygen.exe`)

Windows에서 실행되는 `media-use` 스킬의 Node.js 스크립트들은 `child_process.spawnSync("heygen", ...)`을
**shell 옵션 없이** 호출한다. 이때 두 가지 함정이 있었다.

- `.cmd` 배치파일 셰임(`wsl.exe heygen %*`)을 만들었더니 Node가 `EINVAL`로 거부했다 — Node는 보안상
  `shell:true` 없이 `.cmd`/`.bat`를 직접 실행하는 걸 막아놨다(CVE-2024-27980 대응).
- `wsl.exe heygen ...`처럼 PATH에 의존하면 `heygen: command not found`가 난다 — `wsl.exe <command>`는
  비대화형 호출이라 `~/.bashrc`의 PATH 추가가 로드되지 않는다.

그래서 **진짜 `.exe`**로 만들어야 했다. `.NET Framework`에 포함된 `csc.exe`(C# 컴파일러, 별도 설치
불필요)로 절대경로를 직접 호출하는 작은 콘솔 앱을 컴파일했다:

```csharp
// heygen-shim.cs
using System;
using System.Diagnostics;
using System.Text;

class HeygenShim
{
    static int Main(string[] args)
    {
        var sb = new StringBuilder("/root/.local/bin/heygen");
        foreach (var a in args)
        {
            sb.Append(' ');
            sb.Append('"');
            sb.Append(a.Replace("\"", "\\\""));
            sb.Append('"');
        }
        var psi = new ProcessStartInfo("wsl.exe", sb.ToString()) { UseShellExecute = false };
        using (var p = Process.Start(psi)) { p.WaitForExit(); return p.ExitCode; }
    }
}
```

```powershell
& "C:\Windows\Microsoft.NET\Framework64\v4.0.30319\csc.exe" /nologo `
  /out:"C:\Users\yunyo\AppData\Roaming\npm\heygen.exe" "heygen-shim.cs"
```

`C:\Users\yunyo\AppData\Roaming\npm`은 이미 이 계정 PATH에 들어 있는 npm 전역 bin 폴더라, 여기
두면 Windows의 어떤 프로세스에서 `heygen`을 호출해도 자동으로 WSL 안의 진짜 CLI로 넘어간다.
경로가 바뀌면(WSL 배포판 재설치 등) `heygen-shim.cs`의 `/root/.local/bin/heygen` 부분만 고치고
다시 컴파일하면 된다.

## 4. 확인

```bash
node "C:/Users/yunyo/.claude/skills/media-use/scripts/resolve.mjs" --doctor
```

`heygen found on PATH` / `authenticated as ...`가 전부 ✓로 나오면 정상. 이후 `resolve.mjs --type
bgm/image/voice/...`로 무료 카탈로그를 바로 쓸 수 있다.

## 5. HyperFrames `preview --background` 실행 시 뜨는 콘솔 창 숨기기

`npx hyperframes preview --background`(각 `videos/*/CLAUDE.md`가 에이전트에게 요구하는 표준
Studio 핸드오프 방법)를 이 컴퓨터에서 그냥 실행하면 **화면에 검은 콘솔 창이 뜬다.** 원인이
하나가 아니라 **최소 두 가지**가 겹쳐 있었다(2026-09-04, EP12에서 실측) — 하나만 고치면 계속
재발한다.

### 원인 1: hyperframes 자체가 내부적으로 창 숨김 옵션을 빼먹은 재실행(자체 버그)

`preview --background`는 겉보기엔 프로세스 하나가 아니라 **두 단계**로 백그라운드 프로세스를
만든다. 바깥쪽(사용자가 친 `npx ...` 명령) 자체는 평범하지만, 그 안에서 hyperframes가
`spawnDetachedPreview()`로 **자기 자신(`node.exe`)을 다시 한 번 detached로 재실행**해서
진짜 서버를 띄운다. 그런데 이 재실행 호출에 Windows용 창 숨김 옵션(`windowsHide: true`)이
빠져 있다 — hyperframes 0.8.10~0.8.27(확인한 범위 전부)에 공통된 버그다. 그래서 바깥쪽을
아무리 숨겨도 안쪽 재실행이 새 콘솔 창을 띄운다.

**임시 해결**: 캐시된 hyperframes CLI 파일(`dist/cli.js`)의 `spawnDetachedPreview` 함수 안,
`detached: true,` 바로 뒤에 `windowsHide: true,`를 직접 추가했다. 캐시 위치:
`%LOCALAPPDATA%\npm-cache\_npx\<해시>\node_modules\hyperframes\dist\cli.js` — 프로젝트별
핀 버전(`hyperframes@X.Y.Z`)마다 해시가 다르므로, 새 버전을 처음 쓰거나 npm 캐시를 지우면
**이 패치가 사라져서 다시 나타난다.** 증상이 재발하면 그 버전의 `dist/cli.js`에서
`spawnDetachedPreview` 함수를 찾아 같은 자리에 다시 추가할 것(공식 수정 아님 — hyperframes에
버그 리포트할 만한 사안).

### 원인 2: 이 컴퓨터의 AMD GPU가 하드웨어 캡처 모드에서 진짜 에러를 냄

`windowsHide` 패치 후에도 창이 남아 있었다 — 이번엔 **hyperframes가 아니라 Chromium
(`chrome-headless-shell`) 자체**가 문제였다. 이 컴퓨터의 AMD Radeon RX 580 GPU로 하드웨어
가속 캡처(`browserGpuMode: hardware`, 로그에 `AMD VideoProcessorGetOutputExtension failed`
DirectComposition 에러로 찍힘)를 시도하다가, 그 진단 출력을 내보내려고 Chromium이 콘솔 창을
새로 만드는 것으로 추정된다(원인이 확정된 건 아니고, **하드웨어 GPU 모드를 꺼서 우회**한 것만
확인함). `preview --no-browser-gpu` **CLI 플래그는 background 서버 실행 시엔 안 먹었다**
(로그에 여전히 `browserGpuMode probe → hardware`로 찍힘) — 대신 환경변수
`PRODUCER_BROWSER_GPU_MODE=software`를 줘야 실제로 소프트웨어(SwiftShader) 모드로 뜬다.

**해결**: `scripts/run-hidden.vbs`로 감싸되, 그 안의 명령 앞에 환경변수를 같이 넣는다.

```powershell
wscript scripts\run-hidden.vbs "<프로젝트 폴더>" "set PRODUCER_BROWSER_GPU_MODE=software && npx --yes hyperframes@<버전> preview --background"
```

예: `wscript scripts\run-hidden.vbs "videos\ep12-want-wont" "set PRODUCER_BROWSER_GPU_MODE=software && npx --yes hyperframes@0.8.26 preview --background"`

두 원인을 다 해결한 뒤(cli.js 패치 + 이 환경변수) `preview --status`로 정상 기동은 확인했다.
버전 번호(`hyperframes@X.Y.Z`)는 그 프로젝트 `package.json`의 `scripts.dev`에 적힌 핀 버전과
맞출 것 — 프로젝트마다 다르다(EP11은 0.8.16, EP12는 0.8.26).

**주의**: `PRODUCER_BROWSER_GPU_MODE=software`는 미리보기(Studio)만 느려질 뿐, 정확도엔
영향 없다(SwiftShader는 결정론적 소프트웨어 렌더러로 이 프로젝트가 실제 렌더·스냅샷에서도
기본으로 기대하는 경로다). `npm run render`/`npm run check`/`npx hyperframes snapshot`처럼
매번 새로 뜨는 명령에는 이 문제가 보고되지 않았으므로 이 환경변수를 강제할 필요 없음 —
**`preview --background`(계속 켜져 있는 서버)에만 적용.**

## 6. 대시보드 "대본 역설계" 기능에 필요한 파이썬 패키지

`scripts/youtube-analytics-server.mjs`의 `/api/scripts/analyze`가 자막을 가져올 때
`scripts/extract-transcript.py`를 서브프로세스로 호출하는데, 이 스크립트는 `youtube_transcript_api`
파이썬 패키지가 있어야 동작한다. 새 PC에서 처음 이 기능(대시보드 "경쟁사 대본 역설계" 버튼,
시장 수요 레이더의 "📜 대본" 버튼)을 쓸 때 아래 에러가 나면 이게 원인이다:

```
{"ok": false, "error": "No module named 'youtube_transcript_api'", "videoId": "..."}
```

해결: `pip install -r requirements.txt` (또는 `python -m pip install youtube_transcript_api`
직접 실행). Node 쪽 `package.json`엔 안 잡히는 의존성이라 `npm install`만으로는 안 채워진다.

## 관련 문서

- [지금 할 일](now.md)
