#!/usr/bin/env node
// 자율 브리핑 원샷 커맨드 (2026-11-20, 하루 1회 자동 브리핑·수집 개정).
// 훅이 없는 에이전트(Gemini 등)나 터미널에서 `npm run briefing` 한 번으로
// 오늘 첫 새 채팅이면 동기화 확인 + 필요시 사후 관리 + 성장 점검 + 인수인계를 일괄 출력하고,
// 같은 날 이미 브리핑을 마쳤으면 수집·점검 없이 `[작업 이어가기]` 안내만 즉시 돌려준다.
// 수동 최신화가 필요할 때는 `--force`를 넘긴다.
// 단일 원본: knowledge/playbooks/briefing/00-autonomous-briefing.md

import {execFile} from 'node:child_process';
import {existsSync, readFileSync} from 'node:fs';
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
import {buildBriefingContext, buildContinuationContext, extractNextActions} from './growth-rules.mjs';
import {handoffLine, latestHandoff} from './handoff.mjs';
import {auditGovernance, wikiHealthLine} from './lint-knowledge.mjs';
import {startBackgroundSync} from './pc-sync.mjs';
import {describeResult, safePull} from './safe-pull.mjs';

const projectDir = dirname(dirname(fileURLToPath(import.meta.url)));
const args = process.argv.slice(2);
const noSync = args.includes('--no-sync');
const force = args.includes('--force');
const asJson = args.includes('--json');
const statePath = process.env.BRIEFING_STATE_FILE || DEFAULT_BRIEFING_STATE_PATH;

// 1. 커밋 전 자동 검사 보장
ensureGitHooks();

// 1.1. 안전한 받기(2026-11-27): 담당 PC가 올린 자동 데이터 파일과 부딪히는 이 PC의 미커밋 변경을 백업 후 원격 것으로 맞추고 받는다.
// 실패해도 브리핑은 계속한다. 알릴 만한 일이 있을 때만 결과 앞에 한 줄 붙인다(--no-sync·BRIEFING_NO_SYNC=1에서는 부르지 않는다).
let pullNote = '';
if (!noSync && process.env.BRIEFING_NO_SYNC !== '1') {
  try {
    const pulled = await safePull({projectDir});
    if (pulled.ok === false || pulled.skipped === undefined && (pulled.restored.length > 0 || pulled.conflictsNonData.length > 0)) pullNote = `[git 받기] ${describeResult(pulled)}`;
  } catch (err) {
    pullNote = `[git 받기] 받기 실패: ${err.message}`;
  }
  if (pullNote) process.stderr.write(`${pullNote}
`);
}

// 1.2. PC 2대 자료·대화 공유(2026-11-24): 구글 드라이브에서 다른 PC가 만든 재료·대화 사본을 받고 이 PC 것을 올린다(뒤에서 실행).
if (!noSync) startBackgroundSync(projectDir);

// 1.5. 하루 1회 브리핑 가드: 같은 날 이미 브리핑을 마쳤으면 수집·성장 점검을 건너뛰고 바로 작업 이어가기 안내만 출력한다.
// (--no-sync는 테스트/드라이런 용도로 상태 기록을 읽거나 덮어쓰지 않고 전체 컨텍스트를 확인한다.)
const checkDaily = !force && (!noSync || Boolean(process.env.BRIEFING_STATE_FILE));
if (checkDaily) {
  const state = await readBriefingState(statePath);
  if (await hasBriefedToday({state})) {
    const handoffNote = handoffLine(latestHandoff(projectDir));
    const context = buildContinuationContext({lastBriefingAt: state?.lastBriefingAt, handoffNote});
    if (asJson) {
      console.log(JSON.stringify({skipped: true, reason: 'already_briefed_today', state, context}, null, 2));
    } else {
      console.log(context);
    }
    process.exit(0);
  }
}

// 2. 필요시 대시보드 동기화 + 스튜디오 지표(계속 시청함·노출·CTR) 최신화 + 사후 관리
let syncNote = '동기화 생략(--no-sync)';
let studioSyncNote = '스튜디오 수집 생략(--no-sync)';
if (!noSync) {
  [syncNote, studioSyncNote] = await Promise.all([
    syncIfStale({timeoutMs: 60000, force}).catch((err) => `동기화 실패(${err.message})`),
    syncStudioMetricsIfStale({timeoutMs: 120000, force}).catch((err) => `스튜디오 지표 수집 실패(${err.message})`),
  ]);
  if (syncNote === '방금 동기화함') {
    try {
      const {runPostPublishPipeline} = await import('./post-publish-pipeline.mjs');
      await runPostPublishPipeline().catch((err) => console.warn('[Briefing] 사후 관리 파이프라인 경고:', err.message));
    } catch (err) {
      console.warn('[Briefing] 사후 관리 불러오기 경고:', err.message);
    }
  }
}

// 3. 성장 점검 실행
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

const [check, nextActions] = await Promise.all([
  runGrowthCheck(),
  readFile(join(projectDir, 'knowledge', 'now.md'), 'utf8').then(extractNextActions).catch(() => []),
]);

if (check?.briefing?.data) {
  check.briefing.data.sync = syncNote;
  check.briefing.data.studioSync = studioSyncNote;
}
if (check?.briefing) {
  const wh = wikiHealthLine(await auditGovernance(projectDir).catch(() => null));
  if (wh) check.briefing.wikiHealth = wh;
}

const handoff = latestHandoff(projectDir);
const handoffNote = handoffLine(handoff);
const context = buildBriefingContext(check, nextActions, handoffNote);

if (!noSync || Boolean(process.env.BRIEFING_STATE_FILE)) {
  await recordBriefingDone({statePath});
}

let latestSummary = null;
const latestSummaryPath = join(projectDir, 'knowledge', 'handoff', 'LATEST.md');
if (existsSync(latestSummaryPath)) {
  try {
    const lines = readFileSync(latestSummaryPath, 'utf8').split(/\r?\n/);
    latestSummary = lines.slice(0, 35).join('\n'); // allow-literal: 상위 35줄 요약
  } catch {}
}

if (asJson) {
  console.log(JSON.stringify({syncNote, studioSyncNote, context, check, nextActions, latestSummary}, null, 2));
} else {
  console.log(context);
}
