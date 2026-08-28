# 환경 설정 — HeyGen/WSL 브리지

마지막 갱신: 2026-08-25

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

## 관련 문서

- [지금 할 일](now.md)
