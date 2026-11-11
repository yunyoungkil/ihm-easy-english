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
//   5. 결과를 data/youtube/daily-loop.json 에 남긴다(시작 브리핑 연결은 knowledge/now.md "다음 할 일").

import {spawn} from 'node:child_process';
import {existsSync, readdirSync, readFileSync, writeFileSync, openSync} from 'node:fs';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';

export const COMPETITOR_REFRESH_DAYS = 7;
export const AUDIENCE_REFRESH_DAYS = 14;
const COMMENT_TARGETS_PER_RUN = 3;
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
  const seen = new Set();
  return (marketDemand.trackedChannels || [])
    .filter((c) => c.status !== 'blocked' && c.status !== 'graduated')
    .flatMap((c) => c.topOutliers || [])
    .filter((o) => o?.videoId && !analyzedIds.has(o.videoId))
    .sort((a, b) => (Number(b.outlierRatio) || 0) - (Number(a.outlierRatio) || 0))
    .filter((o) => (seen.has(o.videoId) ? false : (seen.add(o.videoId), true)))
    .slice(0, n)
    .map((o) => o.videoId);
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

  if (plan.audience) {
    await step('audience', async () => {
      const commentsDir = join(dataDir, 'outlier-comments');
      const analyzed = new Set(existsSync(commentsDir) ? readdirSync(commentsDir).map((f) => f.replace(/\.json$/, '')) : []);
      const targets = pickCommentTargets(readJson(join(dataDir, 'market-demand.json'), {}), analyzed);
      const done = [];
      const failed = [];
      for (const videoId of targets) {
        try {
          await post('/api/insights/analyze', {videoId}, 5 * 60 * 1000);
          done.push(videoId);
        } catch (err) {
          failed.push({videoId, error: err.message});
        }
      }
      if (!done.length && failed.length) throw new Error(`댓글 분석 전부 실패: ${failed[0].error}`);
      return {done, failed, note: targets.length ? undefined : '분석할 새 아웃라이어 영상이 없음'};
    });
  }

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
