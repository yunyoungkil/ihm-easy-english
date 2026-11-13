import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn, execSync } from 'node:child_process';

/**
 * 유튜브 스튜디오 읽기 전용 자동화용 크롬 프로필 (2026-11-13).
 * Gemini-Automation(포트 9222) 프로필은 제미나이 계정이 로그인돼 있어 채널 소유 계정과 다르다.
 * 계정을 바꾸면 AI Studio 자동화가 깨지므로 프로필과 포트(9223)를 따로 둔다.
 * 1. %LOCALAPPDATA%에서 프로필 폴더를 찾는다(PC마다 같은 방식).
 * 2. 바탕화면에 Studio-Automation 바로가기가 없으면 만든다.
 * 3. 포트 9223이 꺼져 있으면 크롬을 띄운다.
 * 4. 열린 탭 주소로 로그인 여부를 판단한다(구글 로그인 화면이면 아직 로그인 전).
 */
export const STUDIO_PORT = 9223;
export const STUDIO_URL = 'https://studio.youtube.com';

/** 열린 탭 주소 목록으로 상태를 판단한다. 로그인 화면이 보이면 "로그인 필요", 스튜디오가 열려 있으면 "로그인됨". */
export function judgeStudioLogin(urls = []) {
  const list = urls.filter(Boolean).map(String);
  if (list.some((u) => u.includes('accounts.google.com'))) return 'login-needed';
  if (list.some((u) => u.includes('studio.youtube.com'))) return 'logged-in';
  return 'unknown';
}

export async function setupStudioChrome({ launchIfDown = true } = {}) {
  if (process.platform !== 'win32') return { supported: false, reason: 'Non-Windows OS' };

  const localAppData = process.env.LOCALAPPDATA || path.join(process.env.USERPROFILE || 'C:\\Users\\Default', 'AppData', 'Local');
  const profileDir = path.join(localAppData, 'Google', 'Chrome', 'StudioAutomationProfile');
  const chromePath = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    path.join(localAppData, 'Google', 'Chrome', 'Application', 'chrome.exe'),
  ].find((p) => fs.existsSync(p));
  if (!chromePath) return { supported: false, error: 'Chrome executable not found' };

  fs.mkdirSync(profileDir, { recursive: true });

  let desktopDir = path.join(process.env.USERPROFILE || 'C:\\Users\\Default', 'Desktop');
  try {
    const resolved = execSync('powershell -NoProfile -Command "[Environment]::GetFolderPath(\'Desktop\')"', { encoding: 'utf8' }).trim();
    if (resolved && fs.existsSync(resolved)) desktopDir = resolved;
  } catch {}
  const shortcutPath = path.join(desktopDir, 'Studio-Automation.lnk');
  let shortcutCreated = false;
  if (fs.existsSync(desktopDir) && !fs.existsSync(shortcutPath)) {
    try {
      const ps = `
        $wsh = New-Object -ComObject WScript.Shell;
        $s = $wsh.CreateShortcut('${shortcutPath.replace(/'/g, "''")}');
        $s.TargetPath = '${chromePath.replace(/'/g, "''")}';
        $s.Arguments = '--remote-debugging-port=${STUDIO_PORT} --remote-allow-origins=* --user-data-dir="${profileDir.replace(/'/g, "''")}" ${STUDIO_URL}';
        $s.Description = 'Chrome profile for read-only YouTube Studio automation';
        $s.Save();
      `.replace(/\r?\n/g, ' ');
      execSync(`powershell -NoProfile -Command "${ps}"`, { stdio: 'ignore' });
      shortcutCreated = true;
    } catch {}
  }

  const alive = async () => {
    try {
      return (await fetch(`http://127.0.0.1:${STUDIO_PORT}/json/version`, { signal: AbortSignal.timeout(1500) })).ok;
    } catch {
      return false;
    }
  };
  let isRunning = await alive();
  if (!isRunning && launchIfDown) {
    try {
      spawn(chromePath, [
        `--remote-debugging-port=${STUDIO_PORT}`,
        '--remote-allow-origins=*',
        `--user-data-dir=${profileDir}`,
        '--no-first-run',
        '--no-default-browser-check',
        STUDIO_URL,
      ], { detached: true, stdio: 'ignore' }).unref();
      for (let i = 0; i < 10 && !isRunning; i++) {
        await new Promise((r) => setTimeout(r, 500));
        isRunning = await alive();
      }
    } catch (err) {
      return { supported: true, profileDir, shortcutPath, isRunning: false, error: err.message };
    }
  }

  let login = 'unknown';
  if (isRunning) {
    try {
      // 새 프로필은 스튜디오 주소에서 로그인 화면으로 넘어가는 중간에 두 주소가 함께 보인다. 3초 간격으로 두 번 보고 둘 다 로그인됨일 때만 로그인됨으로 본다.
      const sample = async () => judgeStudioLogin((await (await fetch(`http://127.0.0.1:${STUDIO_PORT}/json/list`, { signal: AbortSignal.timeout(2000) })).json()).filter((p) => p.type === 'page').map((p) => p.url));
      await new Promise((r) => setTimeout(r, 3000));
      const first = await sample();
      await new Promise((r) => setTimeout(r, 3000));
      const second = await sample();
      login = first === second ? second : 'unknown';
    } catch {}
  }
  return { supported: true, profileDir, shortcutPath, shortcutCreated, port: STUDIO_PORT, isRunning, login };
}

const currentFile = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(currentFile)) {
  setupStudioChrome().then((res) => console.log(JSON.stringify(res, null, 2))).catch(console.error);
}
