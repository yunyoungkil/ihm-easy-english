// 영상별 수치 수집(scripts/video-lifetime.mjs): 전체 기간(lifetime)과 공개 첫 7일(first7d). API 응답은 실제와 같은 모양(columnHeaders + rows).
import assert from 'node:assert/strict';
import {mkdtempSync, readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import test from 'node:test';
import {collectLifetime, fetchLifetime, selectLifetimeTargets} from '../video-lifetime.mjs';

const DAY = 86400000; // allow-literal: 하루(ms), 시험용
const now = new Date('2026-11-13T00:00:00Z');
const v = (id, daysOld, privacyStatus = 'public') => ({videoId: id, privacyStatus, publishedAt: new Date(now - daysOld * DAY).toISOString()});
const respond = (names, row) => async () => ({ok: true, status: 200, json: async () => ({columnHeaders: names.map((name) => ({name})), rows: row ? [row] : []})});
const LIFE = ['views', 'averageViewPercentage', 'averageViewDuration', 'subscribersGained'];
const SEVEN = ['views', 'averageViewDuration', 'subscribersGained', 'estimatedMinutesWatched'];

test('fetchLifetime: 시작일은 넘겨준 값(채널 첫날), 영상 필터와 네 지표로 요청하고 칸 이름으로 묶는다', async () => {
  let url = '';
  const out = await fetchLifetime({videoId: 'V', startDate: '2026-06-01', endDate: '2026-11-12', accessToken: 'T', fetchImpl: async (u) => { url = u; return respond(LIFE, [1809, 58.19, 30, 4])(); }});
  assert.deepEqual(out, {views: 1809, averageViewPercentage: 58.19, averageViewDuration: 30, subscribersGained: 4});
  const q = new URL(url).searchParams;
  assert.equal(q.get('startDate'), '2026-06-01');
  assert.equal(q.get('filters'), 'video==V');
  assert.ok(!q.has('dimensions'), '차원 없이 합계 한 줄을 받는다');
  assert.equal(await fetchLifetime({videoId: 'V', startDate: 'a', endDate: 'b', accessToken: 'T', fetchImpl: respond(LIFE, null)}), null);
});

test('selectLifetimeTargets: 비공개·공개 1일 안은 빼고, 최근에 받았고 첫 7일도 있으면 빼며, 공개 10일 넘었는데 첫 7일이 없으면 다시 고른다', () => {
  const fresh = new Date(now - 2 * DAY).toISOString();
  const stale = new Date(now - 20 * DAY).toISOString();
  const catalog = [v('a', 30), v('b', 30), v('c', 30), v('d', 30), v('young', 5), v('new', 0.5), v('priv', 30, 'private')];
  const existing = {
    a: {fetchedAt: fresh, first7d: {views: 1}}, // 최근에 받았고 첫 7일도 있다 → 제외
    b: {fetchedAt: stale, first7d: {views: 1}}, // 14일 지남 → 포함
    d: {fetchedAt: fresh}, // 첫 7일이 없고 공개 30일 → 포함
    young: {fetchedAt: fresh}, // 공개 5일이라 첫 7일 수치는 아직 → 제외
  };
  const ids = selectLifetimeTargets({catalog, existing, now, cap: 10}).map((x) => x.videoId);
  assert.deepEqual([...ids].sort(), ['b', 'c', 'd']);
  assert.equal(selectLifetimeTargets({catalog, existing, now, cap: 1}).length, 1);
});

test('collectLifetime: 전체 기간은 채널 첫 영상 공개일부터, 첫 7일은 공개일 포함 7일 창으로 받아 저장하고 점이 없으면 empty로 남긴다', async () => {
  const path = join(mkdtempSync(join(tmpdir(), 'lifetime-')), 'video-lifetime.json');
  const catalog = [v('a', 100), v('b', 30), v('c', 3)];
  const calls = [];
  const fetchImpl = async (u) => {
    const q = new URL(u).searchParams;
    calls.push({id: q.get('filters'), start: q.get('startDate'), end: q.get('endDate'), metrics: q.get('metrics')});
    if (q.get('filters') === 'video==b' && !q.get('metrics').includes('estimatedMinutesWatched')) return respond(LIFE, null)(); // b는 전체 기간 점 없음
    return q.get('metrics').includes('estimatedMinutesWatched') ? respond(SEVEN, [100, 20, 1, 30])() : respond(LIFE, [100, 50, 20, 1])();
  };
  const r = await collectLifetime({now, accessToken: 'T', fetchImpl, path, catalog});
  assert.equal(r.saved, 2, 'a와 c의 전체 기간');
  assert.equal(r.empty, 1, 'b는 점 없음');
  assert.equal(r.first7d, 1, '공개 10일 넘은 a만 첫 7일을 받는다(b는 empty로 건너뛰고, c는 공개 3일)');
  const first = calls.find((c) => c.id === 'video==a' && c.metrics.includes('estimatedMinutesWatched'));
  assert.equal(new Date(first.end) - new Date(first.start), 6 * DAY, '첫 7일 창은 공개일 포함 7일(시작일+6일)'); // allow-literal: 7일 창 = 시작일 + 6일
  const lifeCalls = calls.filter((c) => !c.metrics.includes('estimatedMinutesWatched'));
  assert.ok(lifeCalls.every((c) => c.start === catalog[0].publishedAt.slice(0, 10) && c.end === '2026-11-12'));
  const saved = JSON.parse(readFileSync(path, 'utf8')).videos;
  assert.equal(saved.a.views, 100);
  assert.equal(saved.a.first7d.subscribersGained, 1);
  assert.equal(saved.b.empty, true);
  assert.ok(!saved.c.first7d);
  const again = await collectLifetime({now, accessToken: 'T', fetchImpl, path, catalog});
  assert.equal(again.first7d, 1, '전체 기간이 비어 건너뛰었던 b는 두 번째 실행에서 첫 7일을 받는다');
  const third = await collectLifetime({now, accessToken: 'T', fetchImpl, path, catalog});
  assert.equal(third.first7d, 0, '이미 받은 첫 7일은 다시 받지 않는다');
});

// ─── 2026-11-13 사용자 승인: 롱폼은 7일에 조회의 46%만 들어오므로 첫 28일 값도 같이 모아 둔다(판정은 7일 기준 그대로, 28일은 기록만) ───
test('selectLifetimeTargets: 공개 31일(28일+집계 지연)이 지났는데 첫 28일이 없으면 다시 고르고, 이미 있거나 아직 이르면 고르지 않는다', () => {
  const fresh = new Date(now - 2 * DAY).toISOString();
  const catalog = [v('old', 40), v('done', 40), v('young', 20)];
  const existing = {
    old: {fetchedAt: fresh, first7d: {views: 1}}, // 첫 7일은 있고 첫 28일이 없다 → 포함
    done: {fetchedAt: fresh, first7d: {views: 1}, first28d: {views: 5}}, // 둘 다 있다 → 제외
    young: {fetchedAt: fresh, first7d: {views: 1}}, // 공개 20일이라 28일 수치는 아직 → 제외
  };
  assert.deepEqual(selectLifetimeTargets({catalog, existing, now, cap: 10}).map((x) => x.videoId), ['old']);
});

test('collectLifetime: 첫 28일은 공개일 포함 28일 창(시작일+27일)으로 한 번만 받아 first28d에 저장한다', async () => {
  const path = join(mkdtempSync(join(tmpdir(), 'lifetime28-')), 'video-lifetime.json');
  const catalog = [v('a', 100), v('b', 20)];
  const calls = [];
  const fetchImpl = async (u) => {
    const q = new URL(u).searchParams;
    calls.push({id: q.get('filters'), start: q.get('startDate'), end: q.get('endDate'), metrics: q.get('metrics')});
    return q.get('metrics').includes('estimatedMinutesWatched') ? respond(SEVEN, [100, 20, 1, 30])() : respond(LIFE, [100, 50, 20, 1])();
  };
  const r = await collectLifetime({now, accessToken: 'T', fetchImpl, path, catalog});
  assert.equal(r.first28d, 1, '공개 31일이 넘은 a만');
  const windows = calls.filter((c) => c.id === 'video==a' && c.metrics.includes('estimatedMinutesWatched'));
  const spans = windows.map((c) => (new Date(c.end) - new Date(c.start)) / DAY).sort((x, y) => x - y);
  assert.deepEqual(spans, [6, 27], '7일 창(+6일)과 28일 창(+27일)'); // allow-literal: 창 길이 = 시작일 + (일수-1)
  const saved = JSON.parse(readFileSync(path, 'utf8')).videos;
  assert.equal(saved.a.first28d.views, 100);
  assert.ok(saved.a.first28d.fetchedAt && saved.a.first28d.startDate && saved.a.first28d.endDate);
  assert.ok(!saved.b.first28d, '공개 20일인 b는 아직');
  const again = await collectLifetime({now, accessToken: 'T', fetchImpl, path, catalog});
  assert.equal(again.first28d, 0, '이미 받은 첫 28일은 다시 받지 않는다');
});
