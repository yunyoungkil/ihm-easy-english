import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, mkdir, readFile, writeFile} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {collectSearchConsole, indexedCount, rangeFor, summarizePages, toQueryRows} from '../blog/search-console.mjs';

test('rangeFor: 한국 날짜로 오늘 포함 28일', () => {
  assert.deepEqual(rangeFor(Date.parse('2026-11-27T16:30:00Z')), {startDate: '2026-11-01', endDate: '2026-11-28'});
});

test('toQueryRows·summarizePages: 서치 콘솔 숫자만 쓰고, 실적 없는 글은 0과 색인 상태', () => {
  const q = toQueryRows([{keys: ['삼성페이 교통카드', 'https://tech.d40m.com/a.html'], clicks: 1, impressions: 30, position: 8.2}]);
  assert.deepEqual(q, [{query: '삼성페이 교통카드', page: 'https://tech.d40m.com/a.html', clicks: 1, impressions: 30, position: 8.2}]);
  const pages = summarizePages(
    [{url: 'https://tech.d40m.com/a.html', topicId: 'a', cluster: 'A'}, {url: 'https://tech.d40m.com/b.html', topicId: 'b'}],
    [{keys: ['https://tech.d40m.com/a.html'], clicks: 1, impressions: 30, position: 8.2}],
    new Map([['https://tech.d40m.com/a.html', {verdict: 'PASS'}]]),
  );
  assert.equal(pages[0].impressions, 30);
  assert.equal(pages[1].impressions, 0);
  assert.equal(pages[1].position, null);
  assert.equal(indexedCount({pages}), 1);
});

test('collectSearchConsole: tech 주소만 걸러 묻고, 결과를 search-console.json에 쓴다', async () => {
  const projectDir = await mkdtemp(path.join(os.tmpdir(), 'sc-'));
  const blogDir = path.join(projectDir, 'data', 'blog');
  await mkdir(blogDir, {recursive: true});
  await writeFile(path.join(blogDir, 'tech-posts.json'), JSON.stringify([{url: 'https://tech.d40m.com/a.html', topicId: 'a'}]));
  const bodies = [];
  const fetchImpl = async (url, opts) => {
    const body = JSON.parse(opts.body);
    bodies.push({url, body});
    if (url.includes('urlInspection')) return {status: 200, json: async () => ({inspectionResult: {indexStatusResult: {verdict: 'NEUTRAL', coverageState: '발견됨 - 현재 색인이 생성되지 않음'}}})};
    const rows = body.dimensions.length === 2
      ? [{keys: ['q1', 'https://tech.d40m.com/a.html'], clicks: 0, impressions: 3, position: 20}]
      : [{keys: ['https://tech.d40m.com/a.html'], clicks: 0, impressions: 3, position: 20}];
    return {status: 200, json: async () => ({rows})};
  };
  const sc = await collectSearchConsole({projectDir, now: Date.parse('2026-11-27T13:00:00Z'), fetchImpl, getToken: async () => 'tok'});
  const queryCall = bodies.find((b) => b.body.dimensions?.length === 2);
  assert.equal(queryCall.body.dimensionFilterGroups[0].filters[0].expression, 'tech.d40m.com');
  assert.equal(queryCall.body.dataState, 'all');
  assert.equal(sc.totals.impressions, 3);
  assert.equal(sc.pages[0].index.coverageState, '발견됨 - 현재 색인이 생성되지 않음');
  const saved = JSON.parse(await readFile(path.join(blogDir, 'search-console.json'), 'utf8'));
  assert.equal(saved.queries[0].query, 'q1');
});

test('collectSearchConsole: 실적 조회가 403이면 오류로 멈춘다(빈 숫자를 쓰지 않음)', async () => {
  const projectDir = await mkdtemp(path.join(os.tmpdir(), 'sc-'));
  await mkdir(path.join(projectDir, 'data', 'blog'), {recursive: true});
  const fetchImpl = async () => ({status: 403, json: async () => ({error: {message: 'User does not have sufficient permission'}})});
  await assert.rejects(() => collectSearchConsole({projectDir, fetchImpl, getToken: async () => 'tok'}), /403/);
});
