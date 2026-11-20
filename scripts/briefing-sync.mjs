#!/usr/bin/env node
// 시작 브리핑 전에, 오늘(KST) 아직 동기화하지 않았으면 하루 1회만 대시보드·스튜디오 지표를 최신화한다(2026-11-20 사용자 확정: 하루 1회 자동 브리핑·수집).
// 세션 시작 훅(session-briefing-hook.mjs)과 npm run briefing이 함께 쓰며,
// 사용자가 명시적으로 요청할 때만 --force로 같은 날 재수집한다.
// 대시보드 서버(request-guard)는 Origin이 없는 터미널 요청을 허용한다.

import {execFile} from 'node:child_process';
import {mkdir, readFile, writeFile} from 'node:fs/promises';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {kstDateOf, needsDailyRun} from './growth-rules.mjs';

const projectDir = dirname(dirname(fileURLToPath(import.meta.url)));
export const DEFAULT_BRIEFING_STATE_PATH = join(projectDir, 'data', 'youtube', 'briefing-state.json');

export async function readBriefingState(statePath = DEFAULT_BRIEFING_STATE_PATH) {
  try {
    const raw = await readFile(statePath, 'utf8');
    const parsed = JSON.parse(raw.replace(/^\uFEFF/, ''));
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

export async function hasBriefedToday({
  now = new Date(),
  statePath = DEFAULT_BRIEFING_STATE_PATH,
  state = undefined,
} = {}) {
  const current = state !== undefined ? state : await readBriefingState(statePath);
  const today = kstDateOf(now);
  if (!current || !today) return false;
  const lastDay = current.lastBriefingDate || kstDateOf(current.lastBriefingAt);
  return Boolean(lastDay && lastDay === today);
}

export async function recordBriefingDone({
  now = new Date(),
  statePath = DEFAULT_BRIEFING_STATE_PATH,
} = {}) {
  const payload = {
    lastBriefingDate: kstDateOf(now),
    lastBriefingAt: now.toISOString(),
  };
  try {
    await mkdir(dirname(statePath), {recursive: true});
    await writeFile(statePath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  } catch {
    // 상태 파일 저장 실패가 브리핑을 막지 않게 둔다.
  }
  return payload;
}

const readLatestSyncedAt = () =>
  readFile(join(projectDir, 'data', 'youtube', 'analytics-latest.json'), 'utf8')
    .then((text) => JSON.parse(text.replace(/^﻿/, '')).syncedAt || null)
    .catch(() => null);

const readLatestStudioFetchedAt = () =>
  readFile(join(projectDir, 'data', 'youtube', 'studio-metrics.json'), 'utf8')
    .then((text) => JSON.parse(text.replace(/^﻿/, '')).fetchedAt || null)
    .catch(() => null);

const runStudioExportChild = (timeoutMs) =>
  new Promise((resolve, reject) => {
    execFile(
      process.execPath,
      [join(projectDir, 'scripts', 'studio-export.mjs')],
      {cwd: projectDir, timeout: timeoutMs, maxBuffer: 5 * 1024 * 1024, encoding: 'utf8', windowsHide: true},
      (error, _stdout, stderr) => {
        if (!error) return resolve();
        if (error.killed) {
          const timeoutErr = new Error('timed out');
          timeoutErr.name = 'TimeoutError';
          return reject(timeoutErr);
        }
        const msg = String(stderr || error.message || '실패').trim().split(/\r?\n/)[0].slice(0, 120);
        reject(new Error(msg));
      },
    );
  });

export async function syncIfStale({
  now = new Date(),
  port = 3001,
  timeoutMs = 25000,
  force = false,
  readSyncedAt = readLatestSyncedAt,
  fetch = globalThis.fetch,
} = {}) {
  if (!force && !needsDailyRun(await readSyncedAt(), now)) return '오늘 이미 동기화돼 있어 생략';
  const base = `http://localhost:${port}`;
  try {
    const ping = await fetch(`${base}/`, {signal: AbortSignal.timeout(2000)});
    if (!ping.ok) return `대시보드가 응답하지 않아(${ping.status}) 동기화 못 함 — 마지막 동기화 값`;
  } catch {
    return '대시보드가 꺼져 있어 동기화 못 함 — 대시보드를 켠 뒤 npm run briefing:sync';
  }
  try {
    const res = await fetch(`${base}/api/sync`, {method: 'POST', signal: AbortSignal.timeout(timeoutMs)});
    return res.ok ? '방금 동기화함' : `동기화 실패(${res.status}) — 마지막 동기화 값`;
  } catch (err) {
    return err?.name === 'TimeoutError' || err?.name === 'AbortError'
      ? '동기화가 오래 걸려 기다리지 않음 — 대시보드에서 계속 진행 중, 브리핑은 마지막 동기화 값'
      : `동기화 실패(${err?.message || '알 수 없음'}) — 마지막 동기화 값`;
  }
}

/**
 * 스튜디오 지표(계속 시청함·노출·CTR)가 오늘(KST) 아직 수집되지 않았으면 studio-export.mjs로 하루 1회 자동 최신화한다(2026-11-20).
 * 실패·타임아웃 시 브리핑을 막지 않고 마지막 수집본으로 폴백한다.
 */
export async function syncStudioMetricsIfStale({
  now = new Date(),
  force = false,
  timeoutMs = 120000, // allow-literal: 스튜디오 CSV 2기간 내려받기 상한(120초)
  readFetchedAt = readLatestStudioFetchedAt,
  collect = null,
} = {}) {
  if (!force && !needsDailyRun(await readFetchedAt(), now)) return '오늘 이미 스튜디오 지표 수집됨 — 생략';
  try {
    if (collect) {
      let timer;
      try {
        await Promise.race([
          collect(),
          new Promise((_, reject) => {
            timer = setTimeout(() => {
              const err = new Error('timed out');
              err.name = 'TimeoutError';
              reject(err);
            }, timeoutMs);
            timer.unref?.();
          }),
        ]);
      } finally {
        clearTimeout(timer);
      }
    } else {
      await runStudioExportChild(timeoutMs);
    }
    return '방금 스튜디오 지표 수집함';
  } catch (err) {
    if (err?.name === 'TimeoutError' || err?.name === 'AbortError') {
      return '스튜디오 지표 수집 시간 초과 — 마지막 수집본 사용';
    }
    const shortMsg = String(err?.message || '알 수 없음').split(/\r?\n/)[0].slice(0, 100);
    return `스튜디오 지표 수집 건너뜀(${shortMsg}) — 마지막 수집본 사용`;
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const force = process.argv.slice(2).includes('--force');
  // 훅이 없는 에이전트(Gemini 등)는 이 명령으로 브리핑을 시작하므로, 여기서 커밋 전 자동 검사도 켜 둔다(2026-11-12).
  const {ensureGitHooks} = await import('./ensure-git-hooks.mjs');
  if (ensureGitHooks() === 'set') console.log('커밋 전 자동 검사를 켰습니다(.githooks)');
  const [apiSync, studioSync] = await Promise.all([
    syncIfStale({timeoutMs: 120000, force}),
    syncStudioMetricsIfStale({timeoutMs: 120000, force}),
  ]);
  console.log(apiSync);
  console.log(studioSync);
  // 공개 후 자동 사후 관리(2026-11-20): 새로 동기화했거나 강제 실행일 때만 수행
  if (apiSync === '방금 동기화함' || force) {
    const {runPostPublishPipeline} = await import('./post-publish-pipeline.mjs');
    await runPostPublishPipeline().catch((err) => console.warn('[BriefingSync] 사후 관리 파이프라인 경고:', err.message));
  }
}
