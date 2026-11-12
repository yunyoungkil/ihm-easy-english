#!/usr/bin/env node
// 매일 한 번 도는 채널 성장 루프 (2026-11-11, AGENTS.md "자동화 우선 원칙").
// 사람이 대화를 열지 않아도 데이터 수집 → 7일 판정 → 경쟁 채널 상태 반영 → 시청자 고민 누적이 돌게 한다.
// 윈도우 작업 스케줄러가 매일 새벽에 부른다(등록: scripts/register-daily-loop.ps1). 손으로 돌려도 된다:
//   node scripts/daily-loop.mjs
//
// 하는 일 (모두 대시보드 서버의 기존 통로를 쓴다 — 같은 파일을 두 곳에서 동시에 쓰지 않기 위해):
//   1. 대시보드가 꺼져 있으면 켠다.
//   2. 매일: POST /api/sync (유튜브 동기화 + 7일 조회 받기 + 7일 판정 → 경쟁 채널 상태)
//   3. 경쟁 채널 데이터가 7일 넘었으면: POST /api/market-demand/run {syncAll} (채널당 약 4 unit)
//   4. 시청자 고민(audience-dna)이 14일 넘었으면: 아직 분석 안 한 경쟁 아웃라이어 3편 댓글 분석(무료 Gemini 키)
//   5. 대시보드 실제 데이터 통로 5개 점검 + 단위 테스트 + 대시보드 화면 검사(프로그램 전체 점검을 코드가 대신, 토큰 0)
//   6. 결과를 data/youtube/daily-loop.json 에 남긴다 → 시작 브리핑의 scripts/loop-health.mjs가 판정한다.

import {execFile, spawn} from 'node:child_process';
import {existsSync, readFileSync, writeFileSync, openSync} from 'node:fs';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {
  DEFAULT_BACKFILL_PER_RUN,
  executeBacklogTargets,
  hasBatchSystemFailure,
  loadExistingReportIds,
  selectOutlierReportBacklog,
} from './outlier-report-backlog.mjs';
import {
  DEFAULT_KEYWORD_REFRESH_DAYS,
  DEFAULT_KEYWORD_REFRESH_LIMIT,
  executeKeywordRefreshTargets,
  selectKeywordRefreshTargets,
  updateKeywordFailureMap,
} from './keyword-backlog.mjs';

export const COMPETITOR_REFRESH_DAYS = 7;
export const AUDIENCE_REFRESH_DAYS = 14;
export const KEYWORD_REFRESH_DAYS = DEFAULT_KEYWORD_REFRESH_DAYS;
export const KEYWORD_TARGETS_PER_RUN = DEFAULT_KEYWORD_REFRESH_LIMIT;
const COMMENT_TARGETS_PER_RUN = DEFAULT_BACKFILL_PER_RUN;
const SCRIPT_TARGETS_PER_RUN = DEFAULT_BACKFILL_PER_RUN;
const DAY_MS = 24 * 60 * 60 * 1000;

const olderThan = (iso, days, now) => !iso || !Number.isFinite(new Date(iso).getTime()) || now - new Date(iso) > days * DAY_MS;

export function decideDailySteps({now = new Date(), competitorsAnalyzedAt = null, audienceDnaUpdatedAt = null}) {
  return {
    sync: true,
    competitors: olderThan(competitorsAnalyzedAt, COMPETITOR_REFRESH_DAYS, now),
    audience: olderThan(audienceDnaUpdatedAt, AUDIENCE_REFRESH_DAYS, now),
  };
}

/** 차단·졸업 채널은 빼고, 이미 분석한 영상은 빼고, 평소 대비 배수가 큰 순으로 n개. */
export function pickCommentTargets(marketDemand = {}, analyzedIds = new Set(), n = COMMENT_TARGETS_PER_RUN) {
  return selectOutlierReportBacklog(marketDemand, {existingCommentIds: analyzedIds, limit: n}).commentTargets;
}

/** 키워드·추적 채널 양쪽에서 아직 댓글·대본 리포트가 없는 영상 대상을 고른다. */
export function decideOutlierBackfill({
  marketDemand = {},
  existingCommentIds = new Set(),
  existingScriptIds = new Set(),
  failures = {},
  now = new Date(),
  commentLimit = COMMENT_TARGETS_PER_RUN,
  scriptLimit = SCRIPT_TARGETS_PER_RUN,
} = {}) {
  const safeCommentLimit = Math.max(0, Number.isFinite(Number(commentLimit)) ? Math.floor(Number(commentLimit)) : COMMENT_TARGETS_PER_RUN);
  const safeScriptLimit = Math.max(0, Number.isFinite(Number(scriptLimit)) ? Math.floor(Number(scriptLimit)) : SCRIPT_TARGETS_PER_RUN);
  const {commentTargets, scriptTargets} = selectOutlierReportBacklog(marketDemand, {
    existingCommentIds,
    existingScriptIds,
    failures,
    limit: Math.max(safeCommentLimit, safeScriptLimit),
    now,
  });
  const pickedComments = commentTargets.slice(0, safeCommentLimit);
  const pickedScripts = scriptTargets.slice(0, safeScriptLimit);
  return {
    commentTargets: pickedComments,
    scriptTargets: pickedScripts,
    hasWork: pickedComments.length > 0 || pickedScripts.length > 0,
  };
}

/** 댓글·대본 백필 배치를 실행하고 전체 시스템 오류 시 원인을 모아 예외를 던진다. */
export async function runAudienceBackfillStep(backfill, postFn) {
  const comment = await executeBacklogTargets(
    backfill.commentTargets,
    (videoId) => postFn('/api/insights/analyze', {videoId}, 5 * 60 * 1000),
  );
  const script = await executeBacklogTargets(
    backfill.scriptTargets,
    (videoId) => postFn('/api/scripts/analyze', {videoId}, 5 * 60 * 1000),
  );
  const errors = [];
  if (hasBatchSystemFailure(comment)) errors.push(`댓글: ${comment.failed[0].error}`);
  if (hasBatchSystemFailure(script)) errors.push(`대본: ${script.failed[0].error}`);
  if (errors.length) throw new Error(`리포트 자동 분석 실패 (${errors.join(' / ')})`);
  return {
    comment,
    script,
    note: backfill.hasWork ? undefined : '분석할 새 아웃라이어 영상이 없음',
  };
}

/** 이번 일일 루프에서 분석/재분석할 키워드 대상을 고른다. */
export function decideKeywordBackfill({
  marketDemand = {},
  failedKeywords = {},
  now = new Date(),
  limit = KEYWORD_TARGETS_PER_RUN,
  refreshDays = KEYWORD_REFRESH_DAYS,
} = {}) {
  const {targets, skippedCount} = selectKeywordRefreshTargets(marketDemand, {
    limit,
    refreshDays,
    failedKeywords,
    now,
  });
  return {targets, skippedCount, hasWork: targets.length > 0};
}

/** 키워드 자동 분석·갱신 배치를 실행한다. */
export async function runKeywordRefreshStep(selection, postFn) {
  if (!selection?.targets?.length) {
    return {analyzed: [], failed: [], haltedOnQuota: false, skippedCount: selection?.skippedCount || 0, note: '분석/갱신할 키워드가 없음'};
  }
  const result = await executeKeywordRefreshTargets(
    selection.targets,
    (keyword) => postFn('/api/market-demand/run', {keyword}, 10 * 60 * 1000),
  );
  return {...result, skippedCount: selection?.skippedCount || 0};
}

// 대시보드가 실제 데이터를 제대로 내보내는지 — 화면 검사(test-client-syntax)는 연습용 데이터로 그리므로
// 실제 통로가 오류를 내도 모른다(2026-11-11 사용자 지적: "자동 루프 검사는 대시보드 내용도 포함").
// 검색(search.list)은 부르지 않아 유튜브 사용량이 들지 않는다.
export const DASHBOARD_CHECKS = Object.freeze([
  {path: '/api/dashboard', has: (b) => !!b?.channel && Array.isArray(b?.recentVideos) && b.recentVideos.length > 0},
  {path: '/api/episodes/summary', has: (b) => Array.isArray(b) && b.length > 0},
  {path: '/api/market-demand', has: (b) => Array.isArray(b?.byKeyword) && b.byKeyword.length > 0 && Array.isArray(b?.trackedChannels) && b.trackedChannels.length > 0},
  {path: '/api/knowledge-db', has: (b) => Array.isArray(b?.audienceDna?.entries) && b.audienceDna.entries.length > 0},
  {path: '/api/thumb-feed/packages', has: (b) => Array.isArray(b?.packages) && b.packages.length > 0},
  // 2026-11-12: 다음 기획 입력 카드와 따로 열리는 화면들. HTML 화면은 글자로 받아 제목이 있는지 본다.
  {path: '/api/next-input', has: (b) => Array.isArray(b?.outcomes) && !!b?.comparisons},
  {path: '/next-input', html: true, has: (t) => typeof t === 'string' && t.includes('다음 기획 입력')},
  {path: '/outlier-reports', html: true, has: (t) => typeof t === 'string' && t.includes('아웃라이어 리포트')},
  {path: '/visual-library', html: true, has: (t) => typeof t === 'string' && t.includes('연출 자료집')},
]);

/** @param {{path:string,status:number,body:any}[]} responses */
export function dashboardApiProblems(responses = []) {
  const problems = [];
  for (const check of DASHBOARD_CHECKS) {
    const r = responses.find((x) => x.path === check.path);
    if (!r) problems.push(`${check.path} 응답 없음`);
    else if (r.status !== 200) problems.push(`${check.path} 오류 ${r.status}${r.body?.error ? ' (' + String(r.body.error).slice(0, 60) + ')' : ''}`);
    else if (!check.has(r.body)) problems.push(`${check.path} 내용이 비어 있음`);
  }
  return problems;
}

// ---- 실행부 ----------------------------------------------------------------

const projectDir = dirname(dirname(fileURLToPath(import.meta.url)));
const dataDir = join(projectDir, 'data', 'youtube');
const base = 'http://localhost:3001';
const readJson = (path, fallback) => {
  try { return JSON.parse(readFileSync(path, 'utf8').replace(/^﻿/, '')); } catch { return fallback; }
};

async function serverUp() {
  try { return (await fetch(`${base}/`, {signal: AbortSignal.timeout(3000)})).ok; } catch { return false; }
}

async function ensureServer() {
  if (await serverUp()) return '이미 켜져 있음';
  const log = openSync(join(dataDir, 'daily-loop-server.log'), 'a');
  const child = spawn(process.execPath, ['scripts/youtube-analytics-server.mjs'], {
    cwd: projectDir, detached: true, stdio: ['ignore', log, log], windowsHide: true,
  });
  child.unref();
  for (let i = 0; i < 60; i += 1) {
    await new Promise((r) => setTimeout(r, 1000));
    if (await serverUp()) return '켰음';
  }
  throw new Error('대시보드를 켜지 못했습니다');
}

async function post(path, body, timeoutMs) {
  const res = await fetch(`${base}${path}`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify(body || {}),
    signal: AbortSignal.timeout(timeoutMs),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

async function run() {
  const now = new Date();
  const report = {startedAt: now.toISOString(), steps: {}};
  const step = async (name, fn) => {
    try { report.steps[name] = {ok: true, result: await fn()}; } catch (err) { report.steps[name] = {ok: false, error: err.message}; }
  };

  await step('server', ensureServer);
  await step('gitHooks', async () => {
    const {ensureGitHooks} = await import('./ensure-git-hooks.mjs');
    const result = ensureGitHooks(projectDir);
    if (result.startsWith('실패')) throw new Error(`커밋 전 자동 검사 켜기 ${result}`);
    return result;
  });

  const marketDemand = readJson(join(dataDir, 'market-demand.json'), {});
  const competitorsAnalyzedAt = (marketDemand.trackedChannels || [])
    .map((c) => c.analyzedAt).filter(Boolean).sort()[0] || null; // 가장 오래된 채널 기준
  const plan = decideDailySteps({now, competitorsAnalyzedAt, audienceDnaUpdatedAt: readJson(join(dataDir, 'audience-dna.json'), {}).updatedAt || null});
  report.plan = plan;

  await step('sync', async () => {
    const r = await post('/api/sync', {}, 10 * 60 * 1000);
    return {d7: r.d7 || null};
  });

  if (plan.competitors) {
    await step('competitors', async () => {
      const r = await post('/api/market-demand/run', {syncAll: true}, 10 * 60 * 1000);
      return {channels: (r.data?.trackedChannels || []).length};
    });
  }

  const prevLoop = readJson(join(dataDir, 'daily-loop.json'), {});
  const keywordSelection = decideKeywordBackfill({
    marketDemand: readJson(join(dataDir, 'market-demand.json'), {}),
    failedKeywords: prevLoop.keywordFailures || {},
    now,
  });
  let keywordBatchResult = {analyzed: [], failed: [], haltedOnQuota: false};
  await step('keywords', async () => {
    keywordBatchResult = await runKeywordRefreshStep(keywordSelection, post);
    if (keywordBatchResult.haltedOnQuota || (keywordBatchResult.analyzed.length === 0 && keywordBatchResult.failed.length > 0)) {
      const first = keywordBatchResult.failed[0];
      throw new Error(`키워드 자동 분석 실패 (${first.keyword}: ${first.error})`);
    }
    return keywordBatchResult;
  });
  report.keywordFailures = updateKeywordFailureMap(prevLoop.keywordFailures || {}, {
    analyzed: keywordBatchResult.analyzed,
    failed: keywordBatchResult.failed,
    now,
  });

  const latestMarketDemand = readJson(join(dataDir, 'market-demand.json'), {});
  const {existingCommentIds, existingScriptIds} = loadExistingReportIds(projectDir);
  const failures = readJson(join(dataDir, 'analysis-failures.json'), {entries: {}}).entries || {};
  const backfill = decideOutlierBackfill({
    marketDemand: latestMarketDemand,
    existingCommentIds,
    existingScriptIds,
    failures,
    now,
    // 예전 대본·댓글 리포트 자동 생성은 멈춘다(2026-11-12 사용자 결정). 대본·댓글·화면을 한 번에 보는
    // 합친 아웃라이어 리포트(아래 outlierReports 단계)가 대신하고, 시청자 고민 데이터도 그 리포트가 채운다.
    // 예전 코드는 합친 리포트가 예전 리포트 영상을 다 따라잡은 뒤 지운다(knowledge/now.md).
    scriptLimit: 0,
    commentLimit: 0,
  });

  if (backfill.hasWork) {
    await step('audience', () => runAudienceBackfillStep(backfill, post));
  }

  // 합친 아웃라이어 리포트: 배수 큰 영상부터 하루 2편. 예전 리포트만 있는 영상이 남아 있으면 따라잡는 동안 하루 6편.
  // 실패한 영상은 7일 동안 다시 하지 않는다.
  const {pickReportTargets, analyzeOutlierVideo, loadReports, reportsPerDay} = await import('./outlier-report.mjs');
  const keepSince = now.getTime() - 30 * 86400000;
  report.outlierReportFailures = Object.fromEntries(Object.entries(prevLoop.outlierReportFailures || {}).filter(([, at]) => Date.parse(at) >= keepSince));
  const reportPick = {
    marketDemand: latestMarketDemand,
    existingIds: new Set(loadReports().map((r) => r.videoId)),
    failures: report.outlierReportFailures,
    now,
  };
  const eligibleIds = pickReportTargets({...reportPick, limit: Infinity});
  const oldReportIds = new Set([...existingCommentIds, ...existingScriptIds]);
  report.outlierReportCatchUp = eligibleIds.filter((id) => oldReportIds.has(id)).length;
  const reportTargets = pickReportTargets({...reportPick, limit: reportsPerDay({eligibleIds, oldReportIds})});
  if (reportTargets.length) {
    await step('outlierReports', async () => {
      const done = [];
      const failed = [];
      for (const videoId of reportTargets) {
        try {
          await analyzeOutlierVideo(videoId);
          done.push(videoId);
        } catch (err) {
          failed.push({videoId, error: String(err.message).slice(0, 200)});
          report.outlierReportFailures[videoId] = new Date().toISOString();
        }
      }
      if (!done.length) throw new Error(`합친 아웃라이어 리포트 실패: ${failed.map((f) => `${f.videoId}(${f.error})`).join(', ')}`);
      return {done, failed};
    });
  }

  // 다른 PC가 만든 리포트의 캡처는 깃으로 오지 않으므로 이 PC에서 빠진 것을 채운다(Gemini 안 부름).
  await step('outlierFrames', async () => {
    const {ensureAllFrames} = await import('./outlier-report.mjs');
    const result = await ensureAllFrames({install: true});
    if (result.failed.length && !result.made) throw new Error(`캡처 채우기 실패: ${result.failed.map((f) => `${f.videoId}(${f.error})`).join(', ').slice(0, 200)}`);
    return result;
  });

  // 모은 데이터를 다음 기획의 출발점 한 장으로 만든다(2026-11-12, knowledge/data-consumption-map.md).
  // 동기화·시청자 고민 분석이 끝난 뒤에 만들어야 오늘 데이터가 들어간다.
  await step('nextInput', async () => {
    const {writeNextEpisodeInput} = await import('./next-episode-input.mjs');
    const markdown = writeNextEpisodeInput(projectDir, new Date());
    return {lines: markdown.split('\n').length};
  });

  await step('dashboard', async () => {
    const responses = [];
    for (const {path, html} of DASHBOARD_CHECKS) {
      try {
        const res = await fetch(`${base}${path}`, {signal: AbortSignal.timeout(60000)});
        responses.push({path, status: res.status, body: html ? await res.text().catch(() => null) : await res.json().catch(() => null)});
      } catch (err) {
        responses.push({path, status: 0, body: {error: err.message}});
      }
    }
    const problems = dashboardApiProblems(responses);
    if (problems.length) throw new Error('대시보드 데이터 통로: ' + problems.join(', '));
    return {checked: DASHBOARD_CHECKS.length};
  });

  // 프로그램 전체 점검을 코드가 대신한다: 단위 테스트 + 대시보드 화면 검사(서버가 켜져 있어야 함).
  // 결과는 이 보고서에 남고, 브리핑의 loop-health가 실패를 알린다(2026-11-11 사용자 요청).
  await step('tests', async () => {
    const run = (args, timeoutMs) => new Promise((resolve) => {
      execFile(process.execPath, args, {cwd: projectDir, timeout: timeoutMs, maxBuffer: 20 * 1024 * 1024}, (err, stdout, stderr) => {
        resolve({code: err ? (err.code ?? 1) : 0, out: String(stdout || '') + String(stderr || '')});
      });
    });
    const testScript = readJson(join(projectDir, 'package.json'), {}).scripts?.test || '';
    const files = testScript.split(/\s+/).filter((t) => t.endsWith('.test.mjs'));
    const unit = await run(['--test', ...files], 5 * 60 * 1000);
    // 화면(TTY)에서는 "ℹ pass 254", 작업 스케줄러처럼 화면이 없으면 "# pass 254"로 나온다.
    // 2026-11-12까지는 앞의 것만 찾아서 늘 0/0으로 읽고도 통과로 처리했다. 하나도 못 셌으면 실패로 본다.
    const pass = Number((unit.out.match(/^[ℹ#] pass (\d+)/m) || [])[1] || 0);
    const fail = Number((unit.out.match(/^[ℹ#] fail (\d+)/m) || [])[1] || 0);
    const client = await run(['scripts/test-client-syntax.mjs'], 3 * 60 * 1000);
    const clientOk = client.code === 0 && client.out.includes('ALL CLIENT TABS AND FUNCTIONS VERIFIED');
    const result = {unit: `${pass}/${pass + fail}`, client: clientOk ? 'pass' : 'fail'};
    if (unit.code !== 0 || fail > 0 || pass === 0 || !clientOk) {
      const failedNames = (unit.out.match(/^(?:✖|not ok) .+$/gm) || []).slice(0, 5).join(' | ');
      const what = pass === 0 && fail === 0 ? '단위 테스트 결과를 읽지 못함(0개)' : `단위 테스트 ${fail}개 실패`;
      throw new Error(`${what}${failedNames ? ' (' + failedNames + ')' : ''}${clientOk ? '' : ', 대시보드 화면 검사 실패'}`);
    }
    return result;
  });

  report.finishedAt = new Date().toISOString();
  report.ok = Object.values(report.steps).every((s) => s.ok);
  writeFileSync(join(dataDir, 'daily-loop.json'), JSON.stringify(report, null, 2), 'utf8');
  console.log(JSON.stringify(report, null, 2));
  return report;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const report = await run();
  process.exit(report.ok ? 0 : 1);
}
