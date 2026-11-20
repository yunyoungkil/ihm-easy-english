#!/usr/bin/env node
// 시작 브리핑 전에, 마지막 동기화가 30분보다 오래됐으면(2026-11-20 개정, 예약 작업 없이 브리핑 때 최신화) 대시보드에 동기화를 요청한다(2026-11-09 사용자 결정).
// 세션 시작 훅(session-briefing-hook.mjs)이 먼저 부르고, 그때 대시보드가 꺼져 있었으면
// 대시보드를 켠 뒤 `npm run briefing:sync`로 다시 부른다. 유튜브 사용량을 조금 쓰지만 돈은 들지 않는다.
// 대시보드 서버(request-guard)는 Origin이 없는 터미널 요청을 허용한다.

import {execFile} from 'node:child_process';
import {readFile} from 'node:fs/promises';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {needsSync} from './growth-rules.mjs';

const projectDir = dirname(dirname(fileURLToPath(import.meta.url)));
const STUDIO_SYNC_HOURS = 6; // allow-literal: 스튜디오 지표(계속 시청함·노출·CTR) 자동 갱신 주기(6시간)

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
  readSyncedAt = readLatestSyncedAt,
  fetch = globalThis.fetch,
} = {}) {
  if (!needsSync(await readSyncedAt(), now, 0.5)) return '30분 안에 동기화돼 있어 생략';
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
 * 스튜디오 지표(계속 시청함·노출·CTR)가 hours시간보다 오래됐으면 studio-export.mjs로 자동 최신화한다(2026-11-20).
 * 실패·타임아웃 시 브리핑을 막지 않고 마지막 수집본으로 폴백한다.
 */
export async function syncStudioMetricsIfStale({
  now = new Date(),
  hours = STUDIO_SYNC_HOURS,
  timeoutMs = 120000, // allow-literal: 스튜디오 CSV 2기간 내려받기 상한(120초)
  readFetchedAt = readLatestStudioFetchedAt,
  collect = null,
} = {}) {
  if (!needsSync(await readFetchedAt(), now, hours)) return `${hours}시간 안에 스튜디오 지표 수집됨 — 생략`;
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
  // 훅이 없는 에이전트(Gemini 등)는 이 명령으로 브리핑을 시작하므로, 여기서 커밋 전 자동 검사도 켜 둔다(2026-11-12).
  const {ensureGitHooks} = await import('./ensure-git-hooks.mjs');
  if (ensureGitHooks() === 'set') console.log('커밋 전 자동 검사를 켰습니다(.githooks)');
  const [apiSync, studioSync] = await Promise.all([
    syncIfStale({timeoutMs: 120000}),
    syncStudioMetricsIfStale({timeoutMs: 120000}),
  ]);
  console.log(apiSync);
  console.log(studioSync);
  // 공개 후 자동 사후 관리(2026-11-20): 재생목록 교정 + 고정 댓글 + 쇼츠 관련 동영상 자동 연결
  const {runPostPublishPipeline} = await import('./post-publish-pipeline.mjs');
  await runPostPublishPipeline().catch((err) => console.warn('[BriefingSync] 사후 관리 파이프라인 경고:', err.message));
}
