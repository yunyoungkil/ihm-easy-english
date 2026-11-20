#!/usr/bin/env node
// 자율 브리핑 원샷 커맨드 (2026-11-20).
// 훅이 없는 에이전트(Gemini 등)나 터미널에서 `npm run briefing` 한 번으로
// 동기화 확인 + 필요시 사후 관리 + 성장 점검 + 인수인계 + 브리핑 컨텍스트를 일괄 출력한다.
// 단일 원본: knowledge/playbooks/briefing/00-autonomous-briefing.md

import {execFile} from 'node:child_process';
import {existsSync, readFileSync} from 'node:fs';
import {readFile} from 'node:fs/promises';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {syncIfStale, syncStudioMetricsIfStale} from './briefing-sync.mjs';
import {ensureGitHooks} from './ensure-git-hooks.mjs';
import {buildBriefingContext, extractNextActions} from './growth-rules.mjs';
import {handoffLine, latestHandoff} from './handoff.mjs';

const projectDir = dirname(dirname(fileURLToPath(import.meta.url)));
const args = process.argv.slice(2);
const noSync = args.includes('--no-sync');
const asJson = args.includes('--json');

// 1. 커밋 전 자동 검사 보장
ensureGitHooks();

// 2. 필요시 대시보드 동기화 + 스튜디오 지표(계속 시청함·노출·CTR) 최신화 + 사후 관리
let syncNote = '동기화 생략(--no-sync)';
let studioSyncNote = '스튜디오 수집 생략(--no-sync)';
if (!noSync) {
  [syncNote, studioSyncNote] = await Promise.all([
    syncIfStale({timeoutMs: 60000}).catch((err) => `동기화 실패(${err.message})`),
    syncStudioMetricsIfStale({timeoutMs: 120000}).catch((err) => `스튜디오 지표 수집 실패(${err.message})`),
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

const handoff = latestHandoff(projectDir);
const handoffNote = handoffLine(handoff);
const context = buildBriefingContext(check, nextActions, handoffNote);

let latestSummary = null;
const latestSummaryPath = join(projectDir, 'knowledge', 'handoff', 'LATEST.md');
if (existsSync(latestSummaryPath)) {
  try {
    const lines = readFileSync(latestSummaryPath, 'utf8').split(/\r?\n/);
    latestSummary = lines.slice(0, 35).join('\n'); // allow-literal: 상위 35줄 요약
  } catch {}
}

if (asJson) {
  console.log(JSON.stringify({syncNote, context, check, nextActions, latestSummary}, null, 2));
} else {
  console.log(context);
}
