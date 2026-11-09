// 새 대화가 시작될 때 Claude Code가 실행하는 훅(.claude/settings.json의 SessionStart).
// 첫 답변을 시작 브리핑으로 열라는 안내와 막힌 곳 점검 결과, knowledge/now.md의 다음 할 일을 넘겨준다.
// 점검이 실패해도 대화 시작을 막으면 안 되므로 항상 정상 종료한다.

import {execFile} from 'node:child_process';
import {readFile} from 'node:fs/promises';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {syncIfStale} from './briefing-sync.mjs';
import {buildBriefingContext, extractNextActions, renderSessionStartOutput} from './growth-rules.mjs';
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

// 마지막 동기화가 12시간보다 오래됐으면 먼저 동기화한다. 실패해도 대화 시작은 막지 않는다.
const syncNote = await syncIfStale().catch((err) => `동기화 확인 실패(${err.message})`);
const [check, nextActions, chromeStatus] = await Promise.all([
  runGrowthCheck(),
  readNextActions(),
  setupAutomationChrome().catch(() => null)
]);

if (chromeStatus && !chromeStatus.isLoggedIn) {
  nextActions.unshift('Gemini 자동화: 바탕화면 Gemini-Automation 아이콘에서 1회 로그인 필요 (차차)');
}

if (check?.briefing?.data) check.briefing.data.sync = syncNote;
process.stdout.write(`${renderSessionStartOutput(buildBriefingContext(check, nextActions))}\n`);
