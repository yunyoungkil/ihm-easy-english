// 새 대화가 시작될 때 Claude Code가 실행하는 훅(.claude/settings.json의 SessionStart).
// 첫 답변을 시작 브리핑으로 열라는 안내와 막힌 곳 점검 결과, knowledge/now.md의 다음 할 일을 넘겨준다.
// 점검이 실패해도 대화 시작을 막으면 안 되므로 항상 정상 종료한다.

import {execFile, spawn} from 'node:child_process';
import {existsSync, readdirSync} from 'node:fs';
import {readFile} from 'node:fs/promises';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {syncIfStale, syncStudioMetricsIfStale} from './briefing-sync.mjs';
import {ensureGitHooks} from './ensure-git-hooks.mjs';
import {buildBriefingContext, extractNextActions, renderSessionStartOutput} from './growth-rules.mjs';
import {handoffLine, latestHandoff} from './handoff.mjs';
import {setupAutomationChrome} from './setup-automation-chrome.mjs';

const projectDir = dirname(dirname(fileURLToPath(import.meta.url)));

const runGrowthCheck = () =>
  new Promise((resolve) => {
    execFile(
      process.execPath,
      [join(projectDir, 'scripts', 'growth-check.mjs'), '--json'],
      {cwd: projectDir, timeout: 20000, maxBuffer: 10 * 1024 * 1024, encoding: 'utf8'},
      (error, stdout) => {
        if (error) return resolve(null);
        try {
          resolve(JSON.parse(stdout));
        } catch {
          resolve(null);
        }
      },
    );
  });

const readNextActions = () =>
  readFile(join(projectDir, 'knowledge', 'now.md'), 'utf8')
    .then(extractNextActions)
    .catch(() => []);

// 커밋 전 자동 검사(.githooks)는 PC마다 켜야 해서 대화를 시작할 때마다 맞춘다(2026-11-12).
ensureGitHooks();

// 아웃라이어 리포트 캡처는 깃으로 오지만 빠진 것은 PC에서 채운다(2026-11-12 사용자: 다른 PC에서도 작업한다).
// 로컬 캡처 폴더가 비어 있거나 없을 때만 백그라운드로 띄워 불필요한 중복 실행을 막는다.
const framesDir = join(projectDir, 'data', 'youtube', 'outlier-frames');
if (!existsSync(framesDir) || readdirSync(framesDir).length === 0) {
  try {
    spawn(process.execPath, [join(projectDir, 'scripts', 'outlier-report.mjs'), '--ensure-frames', '--install'], {cwd: projectDir, detached: true, stdio: 'ignore', windowsHide: true}).unref();
  } catch { /* 대화 시작은 막지 않는다 */ }
}

// 마지막 동기화가 30분(스튜디오 지표 6시간)보다 오래됐으면 먼저 동기화한다(2026-11-20 개정). 실패해도 대화 시작은 막지 않는다.
const skipSync = process.env.BRIEFING_NO_SYNC === '1';
const [syncNote, studioSyncNote] = skipSync
  ? ['동기화 생략(테스트)', '스튜디오 수집 생략(테스트)']
  : await Promise.all([
      syncIfStale().catch((err) => `동기화 확인 실패(${err.message})`),
      syncStudioMetricsIfStale({timeoutMs: 42000}).catch((err) => `스튜디오 지표 확인 실패(${err.message})`), // allow-literal: SessionStart 훅 60초 한도 내 안전 타임아웃
    ]);
const [check, nextActions, chromeStatus] = await Promise.all([
  runGrowthCheck(),
  readNextActions(),
  setupAutomationChrome().catch(() => null)
]);

if (chromeStatus && !chromeStatus.isLoggedIn) {
  nextActions.unshift('Gemini 자동화: 바탕화면 Gemini-Automation 아이콘에서 1회 로그인 필요 (차차)');
}

if (check?.briefing?.data) {
  check.briefing.data.sync = syncNote;
  check.briefing.data.studioSync = studioSyncNote;
}
process.stdout.write(`${renderSessionStartOutput(buildBriefingContext(check, nextActions, handoffLine(latestHandoff(projectDir))))}\n`);
