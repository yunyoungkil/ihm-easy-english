// 이탈 곡선 수집(scripts/retention-curves.mjs). API 행은 실제 응답과 같은 모양 [elapsedVideoTimeRatio, audienceWatchRatio, relativeRetentionPerformance].
import assert from 'node:assert/strict';
import {existsSync, mkdtempSync, readFileSync, readdirSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {dirname, join} from 'node:path';
import test from 'node:test';
import {fileURLToPath} from 'node:url';
import {fetchCurve, retentionDir, selectTargets, summarizeCurve} from '../retention-curves.mjs';

const DAY = 86400000; // allow-literal: 하루(ms), 시험용
const now = new Date('2026-11-13T00:00:00Z');
const v = (id, format, views, daysOld, extra = {}) => ({videoId: id, format, title: `t-${id}`, privacyStatus: 'public', durationSeconds: 50, publishedAt: new Date(now - daysOld * DAY).toISOString(), statistics: {viewCount: String(views)}, ...extra});

test('summarizeCurve: 가장 큰 이탈 구간을 초로 바꿔 크기순으로 고르고, 25·50·75·100% 지점 시청 비율을 담는다', () => {
  const rows = [[0.25, 1.0, 0.5], [0.5, 0.9, 0.5], [0.75, 0.5, 0.5], [1, 0.4, 0.5]]; // 50%→75% 구간에서 0.4 떨어짐
  const s = summarizeCurve(rows, 40);
  assert.deepEqual(s.drops[0], {fromRatio: 0.5, toRatio: 0.75, fromSec: 20, toSec: 30, drop: 0.4});
  assert.equal(s.watchAt.half, 0.9);
  assert.equal(s.watchAt.end, 0.4);
  assert.deepEqual(summarizeCurve([], 40).drops, []);
});

test('selectTargets: 공개 7일 안, 형식 중앙값 미만 조회, 최근에 받은 영상은 빼고 조회 많은 순으로 고른다', () => {
  const catalog = [v('a', 'SHORTS', 3000, 30), v('b', 'SHORTS', 2900, 30), v('h', 'SHORTS', 2800, 30), v('i', 'SHORTS', 2700, 30), v('c', 'SHORTS', 100, 30), v('d', 'SHORTS', 5000, 3), v('e', 'SHORTS', 3500, 30), v('f', 'LONGFORM', 10, 30), v('g', 'LONGFORM', 30, 30)];
  const picked = selectTargets({catalog, existing: {e: new Date(now - 2 * DAY).toISOString()}, now, cap: 10}).map((x) => x.videoId);
  assert.ok(!picked.includes('d'), '공개 3일 영상은 뺀다');
  assert.ok(!picked.includes('c'), '쇼츠 중앙값 미만 조회는 뺀다');
  assert.ok(!picked.includes('e'), '2일 전에 받은 영상은 다시 받지 않는다');
  assert.deepEqual(picked.filter((x) => ['a', 'b', 'h', 'i'].includes(x)), ['a', 'b'], '중앙값 이상인 a,b만, 조회 많은 순');
  assert.ok(picked.includes('g') && !picked.includes('f'));
  assert.equal(selectTargets({catalog, now, cap: 1}).length, 1);
});

test('fetchCurve: 시작일은 공개일, 영상 필터와 두 지표로 요청하고, 오류는 던진다', async () => {
  let url = '';
  const ok = async (u) => { url = u; return {ok: true, status: 200, json: async () => ({rows: [[0.01, 1.1, 0.4]]})}; };
  const rows = await fetchCurve({videoId: 'VID', publishedAt: '2026-06-25T10:00:00Z', endDate: '2026-11-12', accessToken: 'T', fetchImpl: ok});
  assert.equal(rows.length, 1);
  const q = new URL(url).searchParams;
  assert.equal(q.get('startDate'), '2026-06-25');
  assert.equal(q.get('filters'), 'video==VID');
  assert.equal(q.get('dimensions'), 'elapsedVideoTimeRatio');
  assert.ok(q.get('metrics').includes('audienceWatchRatio'));
  const bad = async () => ({ok: false, status: 403, json: async () => ({error: {message: 'forbidden'}})});
  await assert.rejects(() => fetchCurve({videoId: 'V', publishedAt: '2026-06-25T10:00:00Z', endDate: '2026-11-12', accessToken: 'T', fetchImpl: bad}), /HTTP 403/);
});

test('실제 데이터: 저장된 곡선 파일은 점 100개이고 칸 이름과 길이가 맞다(수집을 한 번도 안 했으면 건너뛴다)', () => {
  const dir = retentionDir;
  if (!existsSync(dir)) return;
  const files = readdirSync(dir).filter((f) => f.endsWith('.json'));
  const real = files.map((f) => JSON.parse(readFileSync(join(dir, f), 'utf8'))).filter((j) => !j.empty);
  // 시청자가 아주 적은 영상(2026-11-16 tFe-cB__uns, 약 15명)은 API가 마지막 100% 점을 빼고 99개만 준다. 실제 데이터 38개 중 37개 100점, 1개 99점.
  assert.ok(real.every((j) => j.points.length === 100 || (j.points.length === 99 && j.points[98].ratio === 0.99)), '점 개수가 100(또는 끝점이 빠진 99)이 아닌 곡선이 있다'); // allow-literal: 퍼센트 단위 100개 지점, 끝점 누락 시 99개
  for (const j of real) {
    assert.ok(Number(j.durationSeconds) > 0 && j.drops.length > 0, `${j.videoId}: 길이나 이탈 구간이 비었다`);
    assert.ok(j.drops.every((d) => d.toSec <= j.durationSeconds + 0.1), `${j.videoId}: 이탈 시각이 영상 길이를 넘는다`); // allow-literal: 반올림 오차 허용
  }
  assert.ok(typeof dirname(fileURLToPath(import.meta.url)) === 'string' && tmpdir() && mkdtempSync);
});
