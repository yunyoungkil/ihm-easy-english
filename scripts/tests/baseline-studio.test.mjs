import assert from 'node:assert/strict';
import test from 'node:test';
import {computeBaselines, judgeAgainstUsual, judgeVideoMetrics, usualFor, USUAL_RESULTS} from '../baseline.mjs';

// 2026-11-13 사용자 결정: 롱폼 기준선에 공개 첫 7일 썸네일 노출수·클릭률(스튜디오 값)을 더한다.
// 칸 이름은 실제 파일 그대로다: studio-first7d.json의 videos[id] = {usable, impressions, clicks, ctrPercent}, video-lifetime.json의 first7d = {views, averageViewDuration, subscribersGained}
const studioRow = (impressions, clicks) => ({usable: true, impressions, clicks, ctrPercent: impressions ? Number(((clicks / impressions) * 100).toFixed(2)) : null});
const longVideo = (id, day) => ({videoId: id, title: `t-${id}`, publishedAt: `2026-03-${String(day).padStart(2, '0')}T00:00:00Z`, format: 'LONGFORM', durationSeconds: 400});
const f7 = (views = 10) => ({first7d: {views, averageViewDuration: 100, subscribersGained: 0}});

test('클릭률 기준선: 첫 7일 노출이 형식 중앙값 이상인 영상만 후보다(노출 10회·클릭 5번 = 50%가 기준선이 되지 않는다)', () => {
  const ids = ['a', 'b', 'c', 'd', 'e'];
  const catalog = ids.map((id, i) => longVideo(id, i + 1));
  const lifetime = Object.fromEntries(ids.map((id) => [id, f7()]));
  const studio = {a: studioRow(10, 5), b: studioRow(50, 1), c: studioRow(100, 4), d: studioRow(200, 10), e: studioRow(400, 8)};
  const b = computeBaselines({catalog, views7d: {}, lifetime, studio});
  const ctr = b.formats.LONGFORM.metrics.ctr7d;
  assert.equal(ctr.champion.videoId, 'd');
  assert.equal(ctr.champion.value, 5);
  assert.ok(ctr.sampleNote.startsWith('표본 작음: 기준 영상의 첫 7일 노출이 200회로 1000회 미만'), '조회가 아니라 노출 단위로 표본을 센다');
  assert.equal(ctr.lowSample, true);
  assert.equal(b.formats.LONGFORM.metrics.impressions7d.champion.videoId, 'e');
  assert.equal(b.formats.LONGFORM.metrics.impressions7d.coverage.eligible, 5);
});

test('쇼츠에는 노출수·클릭률 기준선을 두지 않고 참고(firstWeekReach)로만 보여 준다', () => {
  const ids = ['s1', 's2', 's3'];
  const catalog = ids.map((id, i) => ({...longVideo(id, i + 1), format: 'SHORTS', durationSeconds: 30}));
  const lifetime = Object.fromEntries(ids.map((id) => [id, f7()]));
  const b = computeBaselines({catalog, views7d: {}, lifetime, studio: {s1: studioRow(20, 1), s2: studioRow(40, 1), s3: studioRow(60, 4)}});
  assert.deepEqual(Object.keys(b.formats.SHORTS.metrics), ['views7d', 'watchSeconds7d', 'subs7d']);
  assert.deepEqual(b.formats.SHORTS.reference.firstWeekReach, {n: 3, medianImpressions: 40, pooledCtrPercent: 5, totalImpressions: 120});
  assert.equal(b.formats.LONGFORM.reference.firstWeekReach, undefined, '롱폼은 기준선 지표라 참고 칸을 따로 두지 않는다');
});

test('스튜디오 값을 아직 다 못 받았으면 기준선 이력을 쓰지 않는다(과거 영상 값이 새로 들어오는 것이 "더 높은 기록"으로 쌓이지 않게)', () => {
  const ids = ['a', 'b', 'c', 'd'];
  const catalog = ids.map((id, i) => longVideo(id, i + 1));
  const lifetime = Object.fromEntries(ids.map((id) => [id, f7()]));
  const previous = {history: [], formats: {LONGFORM: {metrics: {ctr7d: {champion: {videoId: 'old', value: 1}}}}}};
  const partial = computeBaselines({catalog, views7d: {}, lifetime, studio: {a: studioRow(100, 2), b: studioRow(100, 9)}, previous});
  assert.equal(partial.formats.LONGFORM.metrics.ctr7d.catchingUp, true);
  assert.equal(partial.history.filter((h) => h.metric === 'ctr7d').length, 0);
  assert.match(partial.formats.LONGFORM.metrics.ctr7d.catchingUpNote, /2편만 받음\(대상 4편\)/);
  // 3번 실패해 더 시도하지 않는 영상은 처리된 것으로 세어 따라잡기가 끝날 수 있다
  const done = computeBaselines({catalog, views7d: {}, lifetime, studio: {a: studioRow(100, 2), b: studioRow(100, 9), c: studioRow(100, 1)}, studioFailures: {d: {attempts: 3}}, previous});
  assert.equal(done.formats.LONGFORM.metrics.ctr7d.catchingUp, false);
  assert.equal(done.history.filter((h) => h.metric === 'ctr7d').length, 1);
});

test('창이 안 맞거나 빠진 날이 있는 스튜디오 값(usable이 아님)은 기준선에 쓰지 않는다', () => {
  const catalog = [longVideo('a', 1), longVideo('b', 2)];
  const lifetime = {a: f7(), b: f7()};
  const b = computeBaselines({catalog, views7d: {}, lifetime, studio: {a: studioRow(100, 5), b: {...studioRow(500, 40), usable: false}}});
  assert.equal(b.formats.LONGFORM.metrics.ctr7d.n, 1);
  assert.equal(b.formats.LONGFORM.metrics.ctr7d.champion.videoId, 'a');
});

test('클릭률 1단계: 클릭 한 번을 운으로 빼고도 평소의 1.5배여야 후보, 클릭 한 번을 더해도 평소의 0.5배 미만이어야 하향', () => {
  const usual = {value: 4, n: 10, pooled: true};
  const judge = (clicks, impressions) => judgeAgainstUsual({value: (clicks / impressions) * 100, usual, guard: {clicks, impressions}});
  assert.equal(judge(3, 40).status, USUAL_RESULTS[1], '7.5%는 평소 4%의 1.5배(6%)를 넘지만 클릭 한 번을 빼면 5%라서 후보가 아니다');
  assert.equal(judge(4, 40).status, USUAL_RESULTS[0], '클릭 하나 빼도 7.5%');
  assert.equal(judge(0, 100).status, USUAL_RESULTS[2], '클릭 하나 더해도 1% < 2%');
  assert.equal(judge(1, 100).status, USUAL_RESULTS[1], '클릭 하나 더하면 2%라 절반 미만이 아니다');
  assert.equal(judge(3, 40).note, '클릭 1번 = 2.5%p');
  const zero = {value: 0, n: 10, pooled: true};
  assert.equal(judgeAgainstUsual({value: 2.5, usual: zero, guard: {clicks: 1, impressions: 40}}).status, USUAL_RESULTS[1], '평소가 0%면 클릭 1번은 운으로 뺀다');
  assert.equal(judgeAgainstUsual({value: 5, usual: zero, guard: {clicks: 2, impressions: 40}}).status, USUAL_RESULTS[0]);
});

test('클릭률의 평소는 최근 10편의 중앙값이 아니라 합산 클릭률이다(중앙값이 0%가 되는 것을 막는다)', () => {
  const rows = [0, 0, 0, 0, 0, 0, 1, 2, 0, 3].map((clicks, i) => ({videoId: `v${i}`, publishedAt: `2026-02-${String(20 - i).padStart(2, '0')}T00:00:00Z`, durationSeconds: 400, value: clicks, impressions: 50, clicks}));
  const baselines = {formats: {LONGFORM: {lengthMedianSeconds: null, recent: {ctr7d: rows}}}};
  const u = usualFor({format: 'LONGFORM', metric: 'ctr7d', durationSeconds: 400, publishedAt: '2026-03-01T00:00:00Z'}, baselines);
  assert.equal(u.value, 1.2, '클릭 6 ÷ 노출 500, 중앙값이면 0%');
  assert.equal(u.pooled, true);
  assert.equal(u.n, 10);
});

test('낚시 의심: 클릭률은 평소보다 높은데 평균 시청 시간이 평소보다 낮으면 표시만 붙이고 상태는 그대로 둔다', () => {
  const recent = (value) => Array.from({length: 10}, (_, i) => ({videoId: `v${i}`, publishedAt: `2026-02-${String(20 - i).padStart(2, '0')}T00:00:00Z`, durationSeconds: 400, value, impressions: 100, clicks: 4}));
  const baselines = {formats: {LONGFORM: {lengthMedianSeconds: null, recent: {ctr7d: recent(4), watchSeconds7d: recent(100), views7d: recent(10), subs7d: recent(0)}, metrics: {}}}};
  const video = {videoId: 'new', publishedAt: '2026-03-01T00:00:00Z', durationSeconds: 400};
  const hook = judgeVideoMetrics({format: 'LONGFORM', metrics: {views7d: 10, watchSeconds7d: 20, subs7d: 0, impressions7d: 40, ctr7d: 10}, details: {ctr7d: {clicks: 4, impressions: 40}}, video}, baselines);
  assert.equal(hook.per.ctr7d.usualStatus, USUAL_RESULTS[0]);
  assert.equal(hook.per.watchSeconds7d.usualStatus, USUAL_RESULTS[2]);
  assert.equal(hook.flags.length, 1);
  assert.match(hook.flags[0], /^낚시 의심/);
  const honest = judgeVideoMetrics({format: 'LONGFORM', metrics: {views7d: 10, watchSeconds7d: 100, subs7d: 0, impressions7d: 40, ctr7d: 10}, details: {ctr7d: {clicks: 4, impressions: 40}}, video}, baselines);
  assert.deepEqual(honest.flags, []);
});

test('스튜디오 값이 아직 없으면 노출·클릭률은 판정에서 빼고(기준선 없음으로 적지 않는다), 쇼츠는 처음부터 세 지표만 본다', () => {
  const baselines = {formats: {LONGFORM: {recent: {}, metrics: {}}, SHORTS: {recent: {}, metrics: {}}}};
  const long = judgeVideoMetrics({format: 'LONGFORM', metrics: {views7d: 1, watchSeconds7d: 1, subs7d: 0}, video: {}}, baselines);
  assert.deepEqual(Object.keys(long.per), ['views7d', 'watchSeconds7d', 'subs7d']);
  const shorts = judgeVideoMetrics({format: 'SHORTS', metrics: {views7d: 1, watchSeconds7d: 1, subs7d: 0, impressions7d: 9, ctr7d: 5}, video: {}}, baselines);
  assert.deepEqual(Object.keys(shorts.per), ['views7d', 'watchSeconds7d', 'subs7d']);
});
