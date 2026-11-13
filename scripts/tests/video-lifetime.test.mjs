// 영상별 전체 기간 수치 수집(scripts/video-lifetime.mjs). API 응답은 실제와 같은 모양(columnHeaders + rows).
import assert from 'node:assert/strict';
import {mkdtempSync, readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import test from 'node:test';
import {collectLifetime, fetchLifetime, selectLifetimeTargets} from '../video-lifetime.mjs';

const DAY = 86400000; // allow-literal: 하루(ms), 시험용
const now = new Date('2026-11-13T00:00:00Z');
const v = (id, daysOld, privacyStatus = 'public') => ({videoId: id, privacyStatus, publishedAt: new Date(now - daysOld * DAY).toISOString()});
const reply = (row) => async () => ({ok: true, status: 200, json: async () => ({columnHeaders: [{name: 'views'}, {name: 'averageViewPercentage'}, {name: 'averageViewDuration'}, {name: 'subscribersGained'}], rows: row ? [row] : []})});

test('fetchLifetime: 시작일은 넘겨준 값(채널 첫날), 영상 필터와 네 지표로 요청하고 칸 이름으로 묶는다', async () => {
  let url = '';
  const out = await fetchLifetime({videoId: 'V', startDate: '2026-06-01', endDate: '2026-11-12', accessToken: 'T', fetchImpl: async (u) => { url = u; return reply([1809, 58.19, 30, 4])(); }});
  assert.deepEqual(out, {views: 1809, averageViewPercentage: 58.19, averageViewDuration: 30, subscribersGained: 4});
  const q = new URL(url).searchParams;
  assert.equal(q.get('startDate'), '2026-06-01');
  assert.equal(q.get('filters'), 'video==V');
  assert.ok(!q.has('dimensions'), '차원 없이 합계 한 줄을 받는다');
  assert.equal(await fetchLifetime({videoId: 'V', startDate: 'a', endDate: 'b', accessToken: 'T', fetchImpl: reply(null)}), null);
});

test('selectLifetimeTargets: 비공개와 공개 1일 안 영상은 빼고, 최근에 받은 영상도 빼고, 오래 안 받은 순으로 cap만큼', () => {
  const catalog = [v('a', 30), v('b', 30), v('c', 30), v('new', 0.5), v('priv', 30, 'private')];
  const existing = {a: {fetchedAt: new Date(now - 2 * DAY).toISOString()}, b: {fetchedAt: new Date(now - 20 * DAY).toISOString()}};
  const ids = selectLifetimeTargets({catalog, existing, now, cap: 10}).map((x) => x.videoId);
  assert.deepEqual(ids, ['c', 'b'], 'a는 2일 전에 받았고 new·priv는 대상이 아니다. 한 번도 안 받은 c가 먼저');
  assert.equal(selectLifetimeTargets({catalog, existing, now, cap: 1}).length, 1);
});

test('collectLifetime: 채널 첫 영상 공개일부터 어제까지 물어 파일에 저장하고, 점이 없으면 empty로 남긴다', async () => {
  const path = join(mkdtempSync(join(tmpdir(), 'lifetime-')), 'video-lifetime.json');
  const catalog = [v('a', 100), v('b', 30)];
  const urls = [];
  const fetchImpl = async (u) => { urls.push(new URL(u).searchParams); return urls.length === 1 ? reply([100, 50, 20, 1])() : reply(null)(); };
  const r = await collectLifetime({now, accessToken: 'T', fetchImpl, path, catalog});
  assert.equal(r.saved, 1);
  assert.equal(r.empty, 1);
  assert.ok(urls.every((q) => q.get('startDate') === catalog[0].publishedAt.slice(0, 10) && q.get('endDate') === '2026-11-12'));
  const saved = JSON.parse(readFileSync(path, 'utf8')).videos;
  assert.equal(saved.a.views, 100);
  assert.equal(saved.b.empty, true);
});
