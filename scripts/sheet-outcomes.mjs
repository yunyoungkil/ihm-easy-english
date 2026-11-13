// 비교 시트의 결과 기록(근거 누적). 2026-11-13 사용자 결정: 근거는 갈아 끼우지 않고 더한다.
// 영상이 공개되고 첫 7일 수치(video-lifetime.json의 first7d)가 생기면, 그 영상의 BRIEF.md "비교 시트:" 줄이 가리키는 시트에
//  - sheet.results[]: 이 영상의 세 지표와 기준선 판정(갱신 기준 초과 / 편차 안 / 기준선 이하 / 기준선 없음)
//  - borrowed[].evidenceLog[]: 가져온 것마다 같은 영상의 지표별 결과(어떤 변수를 시험했는지 함께)
// 를 덧붙인다. 한 영상은 한 번만 기록한다. 판정은 이 영상이 들어가기 전의 baselines.json으로 한다(그래서 baselines 단계보다 먼저 돈다).
// 한 요소를 한 영상에 귀속하기 어려우니 시험한 변수(testVariables)를 함께 적어, 읽는 사람이 어느 변수 때문인지 가늠하게 한다.
import {existsSync, readFileSync, writeFileSync} from 'node:fs';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {judgeVideoMetrics} from './baseline.mjs';
import {loadEpisodeOutcomes} from './planning-outcome.mjs';
import {loadSheets, sheetsDir} from './transform-sheet.mjs';

const projectDir = join(dirname(fileURLToPath(import.meta.url)), '..');
const dataDir = join(projectDir, 'data', 'youtube');

/** first7d(영상별 수치)에서 기준선 세 지표 값을 꺼낸다. 첫 7일 수치가 없으면 null. */
export function metricsFromFirst7d(first7d) {
  if (!first7d) return null;
  return {views7d: first7d.views ?? null, watchSeconds7d: first7d.averageViewDuration ?? null, subs7d: first7d.subscribersGained ?? null};
}

/** 한 시트에 한 영상의 결과를 더한다. 이미 기록한 영상이면 sheet를 그대로 돌려준다. */
export function settleSheet({sheet, videoId, format, metrics, baselines, now = new Date()}) {
  if (!sheet?.sourceVideoId || !videoId || !metrics) return {sheet, changed: false};
  if ((sheet.results || []).some((r) => r.videoId === videoId)) return {sheet, changed: false};
  const judged = judgeVideoMetrics({format, metrics}, baselines);
  const date = now.toISOString().slice(0, 10);
  const variables = (sheet.testVariables || []).map((v) => v.variable);
  const results = [...(sheet.results || []), {videoId, settledAt: now.toISOString(), format, summary: judged.summary, variables, metrics: judged.per}];
  const borrowed = (sheet.borrowed || []).map((b) => ({
    ...b,
    evidenceLog: [
      ...(b.evidenceLog || []),
      ...Object.entries(judged.per).map(([metric, p]) => ({date, videoId, metric, value: p.value, result: p.status, baseline: p.baseline, promoteAbove: p.promoteAbove, variables})),
    ],
  }));
  const next = {...sheet, results, borrowed};
  if (sheet.status === 'published') next.outcome = {...(sheet.outcome || {}), views7d: metrics.views7d, watchSeconds7d: metrics.watchSeconds7d, subs7d: metrics.subs7d};
  return {sheet: next, changed: true};
}

/** outcomes: loadEpisodeOutcomes 결과. 시트를 가리키는 편 중 첫 7일 수치가 있는 것만 기록한다. */
export function settleAll({outcomes, sheets, lifetime, baselines, now = new Date()}) {
  const byId = new Map(sheets.map((s) => [s.sourceVideoId, s]));
  const updated = [];
  for (const o of outcomes) {
    const sheetId = o.sources?.transformSheet;
    const metrics = metricsFromFirst7d(lifetime?.[o.videoId]?.first7d);
    if (!sheetId || !o.videoId || !metrics || !byId.has(sheetId)) continue;
    const r = settleSheet({sheet: byId.get(sheetId), videoId: o.videoId, format: o.format, metrics, baselines, now});
    if (r.changed) { byId.set(sheetId, r.sheet); updated.push(r.sheet); }
  }
  return {updated: [...new Map(updated.map((s) => [s.sourceVideoId, byId.get(s.sourceVideoId)])).values()], settled: updated.length};
}

const readJson = (path, fallback) => (existsSync(path) ? JSON.parse(readFileSync(path, 'utf8').replace(/^﻿/, '')) : fallback);

export function runSettle({now = new Date(), dir = sheetsDir} = {}) {
  const outcomes = loadEpisodeOutcomes(projectDir, now);
  const lifetime = readJson(join(dataDir, 'video-lifetime.json'), {videos: {}}).videos;
  const baselines = readJson(join(dataDir, 'baselines.json'), null);
  if (!baselines) return {settled: 0, note: '기준선 파일이 없어 건너뜀'};
  const {updated, settled} = settleAll({outcomes, sheets: loadSheets(dir), lifetime, baselines, now});
  for (const s of updated) writeFileSync(join(dir, `${s.sourceVideoId}.json`), `${JSON.stringify(s, null, 2)}\n`);
  return {settled, sheets: updated.map((s) => s.sourceVideoId)};
}

if (process.argv[1] && process.argv[1].endsWith('sheet-outcomes.mjs')) {
  console.log(JSON.stringify(runSettle()));
}
