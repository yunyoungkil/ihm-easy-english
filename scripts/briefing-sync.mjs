#!/usr/bin/env node
// 시작 브리핑 전에, 마지막 동기화가 12시간보다 오래됐으면 대시보드에 동기화를 요청한다(2026-11-09 사용자 결정).
// 세션 시작 훅(session-briefing-hook.mjs)이 먼저 부르고, 그때 대시보드가 꺼져 있었으면
// 대시보드를 켠 뒤 `npm run briefing:sync`로 다시 부른다. 유튜브 사용량을 조금 쓰지만 돈은 들지 않는다.
// 대시보드 서버(request-guard)는 Origin이 없는 터미널 요청을 허용한다.

import {readFile} from 'node:fs/promises';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {needsSync} from './growth-rules.mjs';

const projectDir = dirname(dirname(fileURLToPath(import.meta.url)));

const readLatestSyncedAt = () =>
  readFile(join(projectDir, 'data', 'youtube', 'analytics-latest.json'), 'utf8')
    .then((text) => JSON.parse(text.replace(/^﻿/, '')).syncedAt || null)
    .catch(() => null);

export async function syncIfStale({
  now = new Date(),
  port = 3001,
  timeoutMs = 25000,
  readSyncedAt = readLatestSyncedAt,
  fetch = globalThis.fetch,
} = {}) {
  if (!needsSync(await readSyncedAt(), now)) return '12시간 안에 동기화돼 있어 생략';
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

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  // 훅이 없는 에이전트(Gemini 등)는 이 명령으로 브리핑을 시작하므로, 여기서 커밋 전 자동 검사도 켜 둔다(2026-11-12).
  const {ensureGitHooks} = await import('./ensure-git-hooks.mjs');
  if (ensureGitHooks() === 'set') console.log('커밋 전 자동 검사를 켰습니다(.githooks)');
  console.log(await syncIfStale({timeoutMs: 120000}));
}
