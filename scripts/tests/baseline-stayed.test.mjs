// 쇼츠 1차 지표 "계속 시청함"(stayedToWatch, 2026-11-15 사용자 결정). 칸 이름은 실제 studio-metrics.json 그대로다:
// periods[key] = {startDate, endDate, lastDay, fetchedAt, videos: {[videoId]: {stayedToWatchPercent, views, ...}}}
import assert from 'node:assert/strict';
import {existsSync, readFileSync} from 'node:fs';
import {dirname, join} from 'node:path';
import test from 'node:test';
import {fileURLToPath} from 'node:url';
import {computeBaselines, judgeAgainstUsual, judgeVideoMetrics, MIN_POINTS_POOL, stayedObservation, stayedObservedMap, USUAL_RESULTS, usualFor} from '../baseline.mjs';
import {detailsFromStudio, metricsFromFirst7d, stayedWaitState} from '../sheet-outcomes.mjs';

const dataDir = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'data', 'youtube');
const short = (id, publishedAt) => ({videoId: id, title: `t-${id}`, publishedAt, format: 'SHORTS', durationSeconds: 40});
const row = (stayedToWatchPercent, views = 1000) => ({stayedToWatchPercent, views});
// 공개 2026-09-01 11:00 UTC → 첫 7일 창 2026-09-01 ~ 2026-09-07(태평양 시간)
const VIDEO = short('a', '2026-09-01T11:00:00Z');
const period = (over = {}, videos = {a: row(36)}) => ({startDate: '2026-08-01', endDate: '2026-11-01', lastDay: '2026-10-31', fetchedAt: '2026-11-01T05:00:00Z', videos, ...over});

test('계속 시청함: 기간 창이 첫 7일을 앞뒤 하루씩 넉넉히 감싸고 공개 10일이 지난 영상만 쓴다', () => {
  const o = stayedObservation(VIDEO, {periods: {quarter: period()}});
  assert.equal(o.value, 36);
  assert.equal(o.views, 1000);
  assert.equal(o.period, 'quarter');
});

test('계속 시청함: 값이 없거나(null) 표에 영상이 없으면 null이고 대신값을 넣지 않는다', () => {
  assert.equal(stayedObservation(VIDEO, {periods: {quarter: period({}, {a: row(null)})}}), null);
  assert.equal(stayedObservation(VIDEO, {periods: {quarter: period({}, {b: row(36)})}}), null);
  assert.equal(stayedObservation(VIDEO, {periods: {}}), null);
  assert.equal(stayedObservation(VIDEO, null), null);
  assert.equal(stayedObservation({videoId: 'a'}, {periods: {quarter: period()}}), null, '공개일을 모르면 첫 7일 창을 만들 수 없다');
});

test('계속 시청함: 기간 창이 첫 7일을 일부만 포함하는 영상은 뺀다(시작이 늦거나 끝이 이르거나, 하루 여유가 없을 때)', () => {
  // 창이 첫 7일(09-01~09-07) 뒤에 시작: 시작 09-02는 여유 하루(08-31)를 넘는다
  assert.equal(stayedObservation(VIDEO, {periods: {quarter: period({startDate: '2026-09-02'})}}), null);
  // 시작 08-31은 여유 하루 안
  assert.ok(stayedObservation(VIDEO, {periods: {quarter: period({startDate: '2026-08-31'})}}));
  // 시작이 09-01이면 앞쪽 여유가 0일이라 뺀다
  assert.equal(stayedObservation(VIDEO, {periods: {quarter: period({startDate: '2026-09-01'})}}), null);
  // 끝이 첫 7일 도중(09-05)
  assert.equal(stayedObservation(VIDEO, {periods: {quarter: period({lastDay: '2026-09-05', endDate: '2026-09-06'})}}), null);
  // 끝이 09-08(여유 하루)이면 쓴다, 09-07이면 뒤쪽 여유가 0일이라 뺀다
  assert.ok(stayedObservation(VIDEO, {periods: {quarter: period({lastDay: '2026-09-08'})}}));
  assert.equal(stayedObservation(VIDEO, {periods: {quarter: period({lastDay: '2026-09-07'})}}), null);
  // lastDay가 없으면 endDate의 전날을 마지막 날로 본다(studio-export와 같은 정의)
  assert.equal(stayedObservation(VIDEO, {periods: {quarter: period({lastDay: undefined, endDate: '2026-09-08'})}}), null, 'endDate 09-08 = 마지막 날 09-07');
});

test('계속 시청함: 공개 10일이 지나지 않은 영상은 뺀다(집계 지연), 짧은 창(4_weeks)이 맞으면 그것을 먼저 쓴다', () => {
  assert.equal(stayedObservation(VIDEO, {periods: {quarter: period({fetchedAt: '2026-09-10T00:00:00Z'})}}), null, '공개 9일째');
  assert.ok(stayedObservation(VIDEO, {periods: {quarter: period({fetchedAt: '2026-09-11T12:00:00Z'})}}), '공개 10일 넘음');
  const m = {periods: {'4_weeks': period({startDate: '2026-08-25'}, {a: row(40, 500)}), quarter: period()}};
  assert.deepEqual([stayedObservation(VIDEO, m).period, stayedObservation(VIDEO, m).value], ['4_weeks', 40]);
  // 짧은 창이 첫 7일을 못 감싸면 긴 창으로 넘어간다
  const only = {periods: {'4_weeks': period({startDate: '2026-09-05'}, {a: row(40, 500)}), quarter: period()}};
  assert.equal(stayedObservation(VIDEO, only).period, 'quarter');
});

test('고정한 값은 덮어쓰지 않는다(창이 밀려 표에서 사라져도 남는다)', () => {
  const frozen = {a: {value: 36, views: 1000, period: 'quarter'}};
  const catalog = [VIDEO, short('b', '2026-09-02T11:00:00Z')];
  const studioMetrics = {periods: {quarter: period({}, {a: row(50), b: row(34)})}};
  const out = stayedObservedMap({catalog, studioMetrics, frozen});
  assert.equal(out.a.value, 36, '이미 고정한 a는 새 표의 50으로 바뀌지 않는다');
  assert.equal(out.b.value, 34);
  // 표가 아예 비어도 고정값은 남는다
  assert.equal(stayedObservedMap({catalog, studioMetrics: null, frozen}).a.value, 36);
});

test('기준선: 계속 시청함 표본은 창 조회수 100회 이상만 쓰고, 표본이 없으면 기준선을 비운다(대신값 없음)', () => {
  const ids = ['a', 'b', 'c', 'd'];
  const catalog = ids.map((id, i) => short(id, `2026-09-0${i + 1}T11:00:00Z`));
  const lifetime = Object.fromEntries(ids.map((id) => [id, {first7d: {views: 500, averageViewDuration: 20, subscribersGained: 0}}]));
  const empty = computeBaselines({catalog, views7d: {}, lifetime, studioMetrics: {periods: {}}});
  const m0 = empty.formats.SHORTS.metrics.stayedToWatch;
  assert.equal(m0.n, 0);
  assert.equal(m0.champion, null);
  assert.equal(m0.promoteAbove, null);
  const studioMetrics = {periods: {quarter: period({startDate: '2026-08-01'}, {a: row(34), b: row(36), c: row(100, 2), d: row(38, 1200)})}};
  const b = computeBaselines({catalog, views7d: {}, lifetime, studioMetrics});
  const m = b.formats.SHORTS.metrics.stayedToWatch;
  assert.equal(m.n, 3, '창 조회 2회에 100%인 c는 뺀다');
  assert.equal(m.champion.value, 38);
  assert.equal(m.confidence, '가설');
  assert.match(m.approxNote, /기간 값/);
  assert.equal(m.promoteRule, '차이(상위 25% − 하위 25%, %p)');
  assert.equal(m.promoteAbove, m.champion.value + (m.upper - m.lower), '갱신 기준 = 챔피언 + 우리 편차 폭(%p)');
  assert.deepEqual(Object.keys(b.formats.SHORTS.stayedToWatchObserved).sort(), ['a', 'b', 'c', 'd'], '고정은 조회수와 상관없이 쓸 수 있는 값 전부');
  assert.equal(b.formats.LONGFORM.metrics.stayedToWatch, undefined, '롱폼은 이 지표가 없다');
});

// ─── 판정: 평소 = 앞선 쇼츠 최근 10편 중앙값, 폭 = max(우리 편차, 우연 폭) ───
const baselinesWith = (values) => ({formats: {SHORTS: {recent: {stayedToWatch: values.map((value, i) => ({videoId: `p${i}`, publishedAt: `2026-02-${String(i + 1).padStart(2, '0')}T00:00:00Z`, durationSeconds: 40, value}))}}}});
const POOL = [40, 38, 37, 37, 36, 36, 36, 35, 35, 34]; // 오래된 순서 → baselinesWith가 날짜를 늘려서 마지막이 가장 최근. 정렬 뒤 중앙값 36, 하위 25% 35, 상위 25% 37 → 우리 편차 2
const recentFirst = (b) => ({formats: {SHORTS: {recent: {stayedToWatch: [...b.formats.SHORTS.recent.stayedToWatch].sort((x, y) => Date.parse(y.publishedAt) - Date.parse(x.publishedAt))}}}}); // computeBaselines와 같은 순서(최근 먼저)
const publishedAfter = '2026-06-01T00:00:00Z';

test('평소: 앞선 쇼츠가 5편 미만이면 없음(측정 전), 5편부터 중앙값과 우리 편차 폭을 낸다', () => {
  assert.equal(MIN_POINTS_POOL, 5);
  const four = recentFirst(baselinesWith([34, 35, 36, 37]));
  assert.equal(usualFor({format: 'SHORTS', metric: 'stayedToWatch', publishedAt: publishedAfter}, four), null);
  const u = usualFor({format: 'SHORTS', metric: 'stayedToWatch', publishedAt: publishedAfter}, recentFirst(baselinesWith(POOL)));
  assert.deepEqual([u.value, u.n, u.rule, u.lower, u.upper, u.spread, u.lengthAdjusted], [36, 10, 'points', 35, 37, 2, false]);
  // 그 영상보다 뒤에 나온 영상은 평소에 섞지 않는다
  assert.equal(usualFor({format: 'SHORTS', metric: 'stayedToWatch', publishedAt: '2026-02-04T00:00:00Z'}, recentFirst(baselinesWith(POOL))), null);
});

test('판정 경계: 폭 이상 높으면 높음, 폭 안이면 평소 수준, 폭 이상 낮으면 낮음(조회 많아 우연 폭이 작을 때는 우리 편차 2%p가 폭)', () => {
  const usual = usualFor({format: 'SHORTS', metric: 'stayedToWatch', publishedAt: publishedAfter}, recentFirst(baselinesWith(POOL)));
  const guard = {views: 1000000}; // 우연 폭 약 0.1%p
  const j = (value) => judgeAgainstUsual({value, usual, guard}).status;
  assert.equal(j(38), USUAL_RESULTS[0], '36 + 2 = 경계 포함');
  assert.equal(j(37.99), USUAL_RESULTS[1]);
  assert.equal(j(36), USUAL_RESULTS[1]);
  assert.equal(j(34.01), USUAL_RESULTS[1]);
  assert.equal(j(34), USUAL_RESULTS[2], '36 − 2 = 경계 포함');
  assert.equal(j(10.48), USUAL_RESULTS[2]);
});

test('판정: 조회수가 적으면 우연 폭이 우리 편차보다 커져서 같은 값이 높음이 아니라 평소 수준이 된다', () => {
  const usual = usualFor({format: 'SHORTS', metric: 'stayedToWatch', publishedAt: publishedAfter}, recentFirst(baselinesWith(POOL)));
  const big = judgeAgainstUsual({value: 38.5, usual, guard: {views: 1000000}});
  const small = judgeAgainstUsual({value: 38.5, usual, guard: {views: 150}});
  assert.equal(big.status, USUAL_RESULTS[0]);
  assert.equal(small.status, USUAL_RESULTS[1], '조회 150회의 표준오차는 %p 단위로 커서 2.5%p 차이는 우연 안');
  assert.ok(small.margin > 2 && big.margin >= 2);
});

test('판정: 우리 편차가 0이어도 우연 폭이 있어 평소보다 조금 높다고 후보가 되지 않고, 조회수를 모르면 판정하지 않는다', () => {
  const flat = usualFor({format: 'SHORTS', metric: 'stayedToWatch', publishedAt: publishedAfter}, recentFirst(baselinesWith([36, 36, 36, 36, 36, 36])));
  assert.equal(flat.spread, 0);
  assert.equal(judgeAgainstUsual({value: 36.5, usual: flat, guard: {views: 1000}}).status, USUAL_RESULTS[1]);
  assert.equal(judgeAgainstUsual({value: 40, usual: flat, guard: {views: 1000}}).status, USUAL_RESULTS[0], '우연 폭 약 3%p보다 크면 후보');
  assert.equal(judgeAgainstUsual({value: 40, usual: flat, guard: null}).status, USUAL_RESULTS[3]);
  assert.equal(judgeAgainstUsual({value: null, usual: flat, guard: {views: 1000}}).status, USUAL_RESULTS[3]);
});

test('한 편 판정: 값이 아직 없으면 계속 시청함은 판정에서 빼고(기록하지 않고), 있으면 기간 값 근거와 함께 평소 대비를 낸다', () => {
  const baselines = {...recentFirst(baselinesWith(POOL)), formats: {SHORTS: {...recentFirst(baselinesWith(POOL)).formats.SHORTS, metrics: {}, lengthMedianSeconds: 40}}};
  const video = {videoId: 'x', publishedAt: publishedAfter, durationSeconds: 40};
  const without = judgeVideoMetrics({format: 'SHORTS', metrics: {views7d: 500, watchSeconds7d: 20, subs7d: 0}, video}, baselines);
  assert.equal(without.per.stayedToWatch, undefined);
  const withValue = judgeVideoMetrics({format: 'SHORTS', metrics: {views7d: 500, watchSeconds7d: 20, subs7d: 0, stayedToWatch: 41}, video, details: {stayedToWatch: {views: 1000000}}}, baselines);
  assert.equal(withValue.per.stayedToWatch.usualStatus, USUAL_RESULTS[0]);
  assert.equal(withValue.per.stayedToWatch.usual.rule, 'points');
});

test('정산 입력: 계속 시청함은 쇼츠에서 값이 있을 때만 metrics·details에 들어가고, 쇼츠는 값을 기다리되 31일을 넘기면 값 없이 정산한다', () => {
  const f7 = {views: 500, averageViewDuration: 20, subscribersGained: 0};
  assert.equal(metricsFromFirst7d(f7, null, null).stayedToWatch, undefined);
  assert.equal(metricsFromFirst7d(f7, null, {value: 36.5}).stayedToWatch, 36.5);
  assert.deepEqual(detailsFromStudio(null, null), {});
  assert.deepEqual(detailsFromStudio(null, {value: 36, views: 900, period: 'quarter', windowStart: '2026-08-16', windowLastDay: '2026-11-13'}), {stayedToWatch: {views: 900, period: 'quarter', windowStart: '2026-08-16', windowLastDay: '2026-11-13'}});
  const published = '2026-11-01T00:00:00Z';
  const st = (over) => stayedWaitState({format: 'SHORTS', stayed: null, studioMetrics: {periods: {}}, publishedAt: published, now: new Date('2026-11-12T00:00:00Z'), ...over});
  assert.equal(st({}).wait, true, '공개 11일, 값 없음 → 기다린다');
  assert.equal(st({now: new Date('2026-12-02T00:00:00Z')}).wait, false, '공개 31일 → 값 없이 정산');
  assert.match(st({now: new Date('2026-12-02T00:00:00Z')}).note, /측정 못 함/);
  assert.equal(st({stayed: {value: 36}}).wait, false);
  assert.equal(st({studioMetrics: null}).wait, false, '기간 표가 아예 없으면 기다려도 오지 않는다');
  assert.equal(st({format: 'LONGFORM'}).wait, false);
});

test('실제 데이터: studio-metrics.json 칸 이름이 이 지표가 읽는 이름과 같고, 쓸 수 있는 값은 0~100 사이다', () => {
  const file = join(dataDir, 'studio-metrics.json');
  if (!existsSync(file)) return; // 스튜디오 수집 전인 PC
  const sm = JSON.parse(readFileSync(file, 'utf8'));
  const catalog = JSON.parse(readFileSync(join(dataDir, 'catalog.json'), 'utf8')).videos;
  for (const key of ['4_weeks', 'quarter']) {
    const p = sm.periods?.[key];
    if (!p) continue;
    assert.ok(p.startDate && p.fetchedAt && (p.lastDay || p.endDate), `${key}: 창 칸이 없다`);
    const sample = Object.values(p.videos || {})[0];
    assert.ok(sample && 'stayedToWatchPercent' in sample && 'views' in sample, `${key}: 영상 칸 이름이 다르다`);
  }
  const usable = catalog.filter((v) => v.format === 'SHORTS').map((v) => stayedObservation(v, sm)).filter(Boolean);
  for (const o of usable) {
    assert.ok(o.value >= 0 && o.value <= 100, `계속 시청함 ${o.value}`);
    assert.ok(o.windowStart <= shift(o.firstWeek.startDate, -1) && o.windowLastDay >= shift(o.firstWeek.endDate, 1), '쓴 값의 창이 첫 7일을 감싸지 않는다');
  }
});

function shift(date, days) { return new Date(Date.parse(`${date}T00:00:00Z`) + days * 86400000).toISOString().slice(0, 10); } // allow-literal: 하루(ms)
