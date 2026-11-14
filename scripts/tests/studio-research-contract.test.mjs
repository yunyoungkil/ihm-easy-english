import assert from 'node:assert/strict';
import {existsSync, readdirSync, readFileSync} from 'node:fs';
import {dirname, join} from 'node:path';
import test from 'node:test';
import {fileURLToPath} from 'node:url';

// 실제 data/youtube/studio-research.json의 칸 이름을 다시 확인한다(설계 2026-11-14 2절 "저장"). 수집 전인 PC에서는 파일이 없으니 건너뛴다.
const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const file = join(root, 'data', 'youtube', 'studio-research.json');

test('실제 studio-research.json: runs와 candidates의 칸 이름이 설계와 같다', {skip: !existsSync(file) && '아직 수집 전(npm run studio-research)'}, () => {
  const store = JSON.parse(readFileSync(file, 'utf8').replace(/^﻿/, ''));
  assert.equal(store.schemaVersion, 1);
  assert.ok(Array.isArray(store.runs));
  for (const r of store.runs) {
    for (const k of ['date', 'format', 'listed', 'endReason', 'passed']) assert.ok(k in r, `runs 항목에 ${k}가 없다`);
    assert.ok(['LONGFORM', 'SHORTS'].includes(r.format), `format ${r.format}`);
  }
  const entries = Object.entries(store.candidates || {});
  for (const [id, c] of entries) {
    for (const k of ['videoId', 'format', 'title', 'channelId', 'studioFolds', 'firstSeenAt', 'lastSeenAt']) assert.ok(k in c, `${id}에 ${k}가 없다`);
    assert.equal(c.videoId, id);
  }
});

// 설계 7절 3번: 유튜브 배수(studioFolds)와 우리 배수(outlierRatio)를 한 정렬에 섞지 않는다.
test('같은 줄에서 outlierRatio와 studioFolds를 한 정렬에 섞는 코드가 scripts/에 없다', () => {
  const dir = join(root, 'scripts');
  const bad = [];
  for (const name of readdirSync(dir).filter((n) => n.endsWith('.mjs'))) {
    readFileSync(join(dir, name), 'utf8').split('\n').forEach((line, i) => {
      if (/outlierRatio/.test(line) && /studioFolds/.test(line) && /sort|localeCompare|Math\.(max|min)/.test(line)) bad.push(`${name}:${i + 1}`);
    });
  }
  assert.deepEqual(bad, []);
});
