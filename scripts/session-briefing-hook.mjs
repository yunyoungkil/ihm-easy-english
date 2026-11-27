// 새 대화가 시작될 때 Claude Code가 실행하는 훅(.claude/settings.json의 SessionStart).
// 첫 답변을 시작 브리핑으로 열라는 안내와 막힌 곳 점검 결과, knowledge/now.md의 다음 할 일을 넘겨준다.
// 점검이 실패해도 대화 시작을 막으면 안 되므로 항상 정상 종료한다.

import {execFile, spawn} from 'node:child_process';
import {existsSync, readdirSync} from 'node:fs';
import {readFile} from 'node:fs/promises';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {
  DEFAULT_BRIEFING_STATE_PATH,
  hasBriefedToday,
  readBriefingState,
  recordBriefingDone,
  syncIfStale,
  syncStudioMetricsIfStale,
} from './briefing-sync.mjs';
import {ensureGitHooks} from './ensure-git-hooks.mjs';
import {
  buildBriefingContext,
  buildContinuationContext,
  extractNextActions,
  renderSessionStartOutput,
} from './growth-rules.mjs';
import {handoffLine, latestHandoff} from './handoff.mjs';
import {auditGovernance, wikiHealthLine} from './lint-knowledge.mjs';
import {startBackgroundSync} from './pc-sync.mjs';
import {describeResult, safePull} from './safe-pull.mjs';
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

// 대화 시작 때 원격 최신을 안전하게 받는다(2026-11-27): 담당 PC가 올린 자동 데이터 파일이 이 PC의 미커밋 변경과 부딪히면 백업 후 원격 것으로 맞춘다.
// 실패해도 대화 시작은 막지 않는다. 알릴 만한 일(실패·부딪힘)이 있을 때만 브리핑 맨 앞에 한 줄 붙인다.
let pullNote = '';
if (process.env.BRIEFING_NO_SYNC !== '1') {
  try {
    const pulled = await safePull({projectDir});
    if (pulled.ok === false || pulled.skipped === undefined && (pulled.restored.length > 0 || pulled.conflictsNonData.length > 0)) pullNote = `[git 받기] ${describeResult(pulled)}`;
  } catch (err) {
    pullNote = `[git 받기] 받기 실패: ${err.message}`;
  }
  if (pullNote) process.stderr.write(`${pullNote}
`);
}
const withPullNote = (text) => (pullNote ? `${pullNote}
${text}` : text);

// 다른 PC가 만든 그림·영상·음성과 대화 사본을 구글 드라이브에서 받고 이 PC 것을 올린다(2026-11-24 사용자).
// 같은 날 이어 가는 대화에도 매번 돈다. 뒤에서 돌아 대화 시작을 막지 않는다. 테스트(BRIEFING_NO_SYNC)에서는 끈다.
if (process.env.BRIEFING_NO_SYNC !== '1') startBackgroundSync(projectDir);

const skipSync = process.env.BRIEFING_NO_SYNC === '1';
const force = process.env.BRIEFING_FORCE === '1';
const statePath = process.env.BRIEFING_STATE_FILE || DEFAULT_BRIEFING_STATE_PATH;
const checkDaily = !force && (!skipSync || Boolean(process.env.BRIEFING_STATE_FILE));

// 하루 1회 자동 브리핑·수집(2026-11-20 사용자 확정): 오늘 이미 브리핑을 마쳤으면 수집·점검 없이 작업 이어가기 안내만 넘긴다.
if (checkDaily) {
  const state = await readBriefingState(statePath);
  if (await hasBriefedToday({state})) {
    const continuation = buildContinuationContext({
      lastBriefingAt: state?.lastBriefingAt,
      handoffNote: handoffLine(latestHandoff(projectDir)),
    });
    process.stdout.write(`${renderSessionStartOutput(withPullNote(continuation))}\n`);
    process.exit(0);
  }
}

// 아웃라이어 리포트 캡처는 깃으로 오지만 빠진 것은 PC에서 채운다(2026-11-12 사용자: 다른 PC에서도 작업한다).
// 로컬 캡처 폴더가 비어 있거나 없을 때만 백그라운드로 띄워 불필요한 중복 실행을 막는다.
const framesDir = join(projectDir, 'data', 'youtube', 'outlier-frames');
if (!existsSync(framesDir) || readdirSync(framesDir).length === 0) {
  try {
    spawn(process.execPath, [join(projectDir, 'scripts', 'outlier-report.mjs'), '--ensure-frames', '--install'], {cwd: projectDir, detached: true, stdio: 'ignore', windowsHide: true}).unref();
  } catch { /* 대화 시작은 막지 않는다 */ }
}

// 오늘(KST) 아직 동기화하지 않았으면 하루 1회 먼저 동기화한다(2026-11-20 개정). 실패해도 대화 시작은 막지 않는다.
const [syncNote, studioSyncNote] = skipSync
  ? ['동기화 생략(테스트)', '스튜디오 수집 생략(테스트)']
  : await Promise.all([
      syncIfStale({force}).catch((err) => `동기화 확인 실패(${err.message})`),
      syncStudioMetricsIfStale({timeoutMs: 42000, force}).catch((err) => `스튜디오 지표 확인 실패(${err.message})`), // allow-literal: SessionStart 훅 60초 한도 내 안전 타임아웃
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
if (check?.briefing) {
  const wh = wikiHealthLine(await auditGovernance(projectDir).catch(() => null));
  if (wh) check.briefing.wikiHealth = wh;
}
if (!skipSync || Boolean(process.env.BRIEFING_STATE_FILE)) {
  await recordBriefingDone({statePath});
}
process.stdout.write(`${renderSessionStartOutput(withPullNote(buildBriefingContext(check, nextActions, handoffLine(latestHandoff(projectDir)))))}\n`);
