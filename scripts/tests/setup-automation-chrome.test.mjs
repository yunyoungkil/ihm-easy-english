import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync, mkdirSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {setupAutomationChrome} from '../setup-automation-chrome.mjs';

test('setupAutomationChrome: Windows가 아니면 supported:false를 반환한다', async () => {
  const res = await setupAutomationChrome({platform: 'linux'});
  assert.deepEqual(res, {supported: false, reason: 'Non-Windows OS'});
});

test('setupAutomationChrome: Chrome 실행 파일이 없으면 오류를 반환한다', async () => {
  const res = await setupAutomationChrome({
    platform: 'win32',
    chromeCandidates: ['Z:\\non-existent-chrome-path\\chrome.exe'],
  });
  assert.deepEqual(res, {supported: false, error: 'Chrome executable not found'});
});

test('setupAutomationChrome: 9222 포트가 닫혀 있고 launchIfDown:false면 프로세스를 띄우지 않는다', async () => {
  const root = mkdtempSync(join(tmpdir(), 'auto-chrome-'));
  try {
    const fakeChrome = join(root, 'chrome.exe');
    writeFileSync(fakeChrome, '');
    const res = await setupAutomationChrome({
      platform: 'win32',
      env: {LOCALAPPDATA: root, USERPROFILE: root},
      chromeCandidates: [fakeChrome],
      launchIfDown: false,
      skipShortcut: true,
      fetchFn: async () => { throw new Error('ECONNREFUSED'); },
    });
    assert.equal(res.supported, true);
    assert.equal(res.isRunning, false);
    assert.equal(res.isLoggedIn, false);
  } finally {
    rmSync(root, {recursive: true, force: true});
  }
});

test('setupAutomationChrome: 9222 포트가 열려 있고 Preferences에 구글 계정 흔적이 있으면 isLoggedIn:true', async () => {
  const root = mkdtempSync(join(tmpdir(), 'auto-chrome-login-'));
  try {
    const fakeChrome = join(root, 'chrome.exe');
    writeFileSync(fakeChrome, '');
    const prefDir = join(root, 'Google', 'Chrome', 'AutomationProfile', 'Default');
    mkdirSync(prefDir, {recursive: true});
    writeFileSync(join(prefDir, 'Preferences'), JSON.stringify({account_info: [{gaia_id: '12345'}]}));

    const res = await setupAutomationChrome({
      platform: 'win32',
      env: {LOCALAPPDATA: root, USERPROFILE: root},
      chromeCandidates: [fakeChrome],
      launchIfDown: false,
      skipShortcut: true,
      fetchFn: async (url) => ({
        ok: true,
        json: async () => (url.includes('/json/list') ? [{url: 'https://gemini.google.com/app'}] : {Browser: 'Chrome'}),
      }),
    });
    assert.equal(res.isRunning, true);
    assert.equal(res.isLoggedIn, true);
  } finally {
    rmSync(root, {recursive: true, force: true});
  }
});

test('setupAutomationChrome: 9222 포트가 열려 있어도 Preferences에 계정 정보가 없으면 isLoggedIn:false', async () => {
  const root = mkdtempSync(join(tmpdir(), 'auto-chrome-anon-'));
  try {
    const fakeChrome = join(root, 'chrome.exe');
    writeFileSync(fakeChrome, '');
    const prefDir = join(root, 'Google', 'Chrome', 'AutomationProfile', 'Default');
    mkdirSync(prefDir, {recursive: true});
    writeFileSync(join(prefDir, 'Preferences'), JSON.stringify({browser: {has_seen_welcome_page: true}}));

    const res = await setupAutomationChrome({
      platform: 'win32',
      env: {LOCALAPPDATA: root, USERPROFILE: root},
      chromeCandidates: [fakeChrome],
      launchIfDown: false,
      skipShortcut: true,
      fetchFn: async () => ({ok: true, json: async () => []}),
    });
    assert.equal(res.isRunning, true);
    assert.equal(res.isLoggedIn, false);
  } finally {
    rmSync(root, {recursive: true, force: true});
  }
});
