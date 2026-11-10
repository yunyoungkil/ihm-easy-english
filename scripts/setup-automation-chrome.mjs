import fs from 'node:fs';
import path from 'node:path';
import { spawn, execSync } from 'node:child_process';

/**
 * Automates Chrome AutomationProfile setup across any Windows PC.
 * 1. Resolves profile directory dynamically using %LOCALAPPDATA%
 * 2. Creates desktop shortcut 'Gemini-Automation.lnk' if missing
 * 3. Checks if Chrome debug port 9222 is alive; launches it if not
 * 4. Checks if Gemini Web is logged in
 */
export async function setupAutomationChrome({ launchIfDown = true } = {}) {
  if (process.platform !== 'win32') {
    return { supported: false, reason: 'Non-Windows OS' };
  }

  const localAppData = process.env.LOCALAPPDATA || path.join(process.env.USERPROFILE || 'C:\\Users\\Default', 'AppData', 'Local');
  const profileDir = path.join(localAppData, 'Google', 'Chrome', 'AutomationProfile');

  // Find Chrome executable path
  const chromeCandidates = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    path.join(localAppData, 'Google', 'Chrome', 'Application', 'chrome.exe')
  ];
  const chromePath = chromeCandidates.find(p => fs.existsSync(p));

  if (!chromePath) {
    return { supported: false, error: 'Chrome executable not found' };
  }

  // 1. Ensure profile directory exists
  if (!fs.existsSync(profileDir)) {
    fs.mkdirSync(profileDir, { recursive: true });
  }

  // 2. Ensure Desktop shortcut exists
  const userProfile = process.env.USERPROFILE || 'C:\\Users\\Default';
  let desktopDir = path.join(userProfile, 'Desktop');
  try {
    const resolved = execSync('powershell -NoProfile -Command "[Environment]::GetFolderPath(\'Desktop\')"', { encoding: 'utf8' }).trim();
    if (resolved && fs.existsSync(resolved)) {
      desktopDir = resolved;
    }
  } catch {}
  const shortcutPath = path.join(desktopDir, 'Gemini-Automation.lnk');

  let shortcutCreated = false;
  if (fs.existsSync(desktopDir) && !fs.existsSync(shortcutPath)) {
    try {
      const psCommand = `
        $wsh = New-Object -ComObject WScript.Shell;
        $s = $wsh.CreateShortcut('${shortcutPath.replace(/'/g, "''")}');
        $s.TargetPath = '${chromePath.replace(/'/g, "''")}';
        $s.Arguments = '--remote-debugging-port=9222 --remote-allow-origins=* --user-data-dir="${profileDir.replace(/'/g, "''")}" https://gemini.google.com/app';
        $s.Description = 'Chrome Automation Profile for Gemini Image Generation';
        $s.Save();
      `.replace(/\r?\n/g, ' ');
      execSync(`powershell -NoProfile -Command "${psCommand}"`, { stdio: 'ignore' });
      shortcutCreated = true;
    } catch (e) {
      // Ignore shortcut failure if permissions restrict
    }
  }

  // 3. Check if Chrome on port 9222 is running
  let isRunning = false;
  try {
    const res = await fetch('http://127.0.0.1:9222/json/version', { signal: AbortSignal.timeout(1500) });
    if (res.ok) isRunning = true;
  } catch {}

  // 4. Launch if not running
  if (!isRunning && launchIfDown) {
    try {
      const cp = spawn(chromePath, [
        '--remote-debugging-port=9222',
        '--remote-allow-origins=*',
        `--user-data-dir=${profileDir}`,
        '--no-first-run',
        '--no-default-browser-check',
        'https://gemini.google.com/app'
      ], { detached: true, stdio: 'ignore' });
      cp.unref();

      // Poll up to 3 seconds for port to open
      for (let i = 0; i < 6; i++) {
        await new Promise(r => setTimeout(r, 500));
        try {
          const res = await fetch('http://127.0.0.1:9222/json/version', { signal: AbortSignal.timeout(1000) });
          if (res.ok) {
            isRunning = true;
            break;
          }
        } catch {}
      }
    } catch (err) {
      return { supported: true, profileDir, shortcutPath, isRunning: false, error: err.message };
    }
  }

  // 5. Check login status if running
  let isLoggedIn = false;
  if (isRunning) {
    try {
      // Check /json/list for Gemini page
      const listRes = await fetch('http://127.0.0.1:9222/json/list', { signal: AbortSignal.timeout(2000) });
      const pages = await listRes.json();
      const geminiPage = pages.find(p => p.url && p.url.includes('gemini.google.com'));
      
      // If we find gemini tab or profile is active, we treat as initialized
      // Preferences / Default directory with sign-in state confirms login
      const defaultDir = path.join(profileDir, 'Default');
      if (fs.existsSync(defaultDir)) {
        const prefPath = path.join(defaultDir, 'Preferences');
        if (fs.existsSync(prefPath)) {
          const prefStr = fs.readFileSync(prefPath, 'utf8');
          // If google account email exists in preferences
          if (prefStr.includes('account_id') || prefStr.includes('google.com') || prefStr.includes('gaia_id')) {
            isLoggedIn = true;
          }
        }
      }
    } catch {}
  }

  return {
    supported: true,
    profileDir,
    shortcutPath,
    shortcutCreated,
    isRunning,
    isLoggedIn
  };
}

import { fileURLToPath } from 'node:url';

// Direct CLI execution
const currentFile = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(currentFile)) {
  setupAutomationChrome().then(res => {
    console.log(JSON.stringify(res, null, 2));
  }).catch(console.error);
}
