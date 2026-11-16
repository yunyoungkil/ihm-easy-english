// 나라별 시청 비율(scripts/audience-countries.mjs) 시험. 2026-11-16.
// 가짜 응답의 칸 이름은 실제 응답(2026-11-16 확인)과 같다: columnHeaders [country, views, estimatedMinutesWatched], rows [["KR", 645, 216]].
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync, readFileSync, existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {buildPeriod, needsRefresh, periodWindow, summarizePeriod, collectAudienceCountries, fetchCountryReport, COUNTRY_PERIODS} from '../audience-countries.mjs';
import {renderAudienceCountries} from '../next-episode-input.mjs';

const headers = [
  {name: 'country', columnType: 'DIMENSION', dataType: 'STRING'},
  {name: 'views', columnType: 'METRIC', dataType: 'INTEGER'},
  {name: 'estimatedMinutesWatched', columnType: 'METRIC', dataType: 'INTEGER'},
];
const response = (rows) => ({kind: 'youtubeAnalytics#resultTable', columnHeaders: headers, rows});
const now = new Date('2026-11-16T06:00:00Z');

test('기간: 끝은 어제, 28일이면 어제 포함 28일', () => {
  assert.deepEqual(periodWindow(now, 28), {startDate: '2026-10-19', endDate: '2026-11-15'});
});

test('응답 → 저장 모양: 점유율은 코드가 계산하고 합이 1 근처, 조회 많은 순', () => {
  const p = buildPeriod({startDate: '2026-10-19', endDate: '2026-11-15', response: response([['US', 30, 10], ['KR', 70, 90]])});
  assert.deepEqual(p.rows.map((r) => r.country), ['KR', 'US']);
  assert.equal(p.totalViews, 100);
  assert.equal(p.totalMinutes, 100);
  assert.equal(p.rows[0].viewsShare, 0.7);
  assert.equal(p.rows[0].minutesShare, 0.9);
  assert.ok(Math.abs(p.rows.reduce((s, r) => s + r.viewsShare, 0) - 1) < 0.001);
});

test('데이터가 없으면 rows가 비고 이유가 남고 점유율을 지어내지 않는다', () => {
  const p = buildPeriod({startDate: 'a', endDate: 'b', response: {columnHeaders: headers}});
  assert.deepEqual(p.rows, []);
  assert.equal(p.totalViews, 0);
  assert.ok(p.emptyReason);
  assert.equal(summarizePeriod(p), null);
});

test('칸 이름이 다른 응답은 짐작하지 않고 오류', () => {
  assert.throws(() => buildPeriod({startDate: 'a', endDate: 'b', response: {columnHeaders: [{name: 'day'}], rows: [['x']]}}), /칸이 없다/);
});

test('요약: 한국 비율과 그 외 비율, 상위 3개국', () => {
  const p = buildPeriod({startDate: 's', endDate: 'e', response: response([['KR', 90, 1], ['US', 5, 1], ['JP', 3, 1], ['CA', 2, 1]])});
  const s = summarizePeriod(p);
  assert.equal(s.homeShare, 0.9);
  assert.equal(s.otherShare, 0.1);
  assert.deepEqual(s.top.map((t) => t.country), ['KR', 'US', 'JP']);
  const noKr = summarizePeriod(buildPeriod({startDate: 's', endDate: 'e', response: response([['US', 10, 1]])}));
  assert.equal(noKr.homeShare, 0);
  assert.equal(noKr.otherShare, 1);
});

test('갱신 판정: 없으면 받고, 7일 안이면 건너뛰고, 7일이 지나면 다시 받는다', () => {
  const full = (fetchedAt) => ({fetchedAt, periods: Object.fromEntries(COUNTRY_PERIODS.map((p) => [p.key, {rows: []}]))});
  assert.equal(needsRefresh(null, now), true);
  assert.equal(needsRefresh(full('2026-11-10T06:00:00Z'), now), false);
  assert.equal(needsRefresh(full('2026-11-09T06:00:00Z'), now), true);
  assert.equal(needsRefresh(full('2026-11-15T06:00:00Z'), now, {force: true}), true);
  assert.equal(needsRefresh({fetchedAt: '2026-11-15T06:00:00Z', periods: {'28d': {rows: []}}}, now), true, '90일이 없으면 다시 받는다');
});

test('요청 실패는 HTTP 번호와 이유를 담아 오류로 올린다', async () => {
  const fetchImpl = async () => ({ok: false, status: 403, json: async () => ({error: {message: 'insufficient scope'}})});
  await assert.rejects(fetchCountryReport({startDate: 'a', endDate: 'b', accessToken: 't', fetchImpl}), /HTTP 403.*insufficient scope/);
});

test('수집: 두 기간을 받아 저장하고, 7일 안에 다시 부르면 호출하지 않는다', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'countries-'));
  const path = join(dir, 'audience-countries.json');
  const urls = [];
  const fetchImpl = async (url) => { urls.push(url); return {ok: true, status: 200, json: async () => response([['KR', 8, 4], ['US', 2, 1]])}; };
  const r = await collectAudienceCountries({now, accessToken: 't', fetchImpl, path});
  assert.equal(r.refreshed, true);
  assert.equal(urls.length, 2);
  assert.ok(urls[0].includes('dimensions=country') && urls[0].includes('startDate=2026-10-19'));
  const saved = JSON.parse(readFileSync(path, 'utf8'));
  assert.deepEqual(Object.keys(saved.periods), ['28d', '90d']);
  assert.equal(saved.periods['28d'].rows[0].viewsShare, 0.8);
  const again = await collectAudienceCountries({now: new Date('2026-11-18T06:00:00Z'), accessToken: 't', fetchImpl, path});
  assert.equal(again.refreshed, false);
  assert.equal(urls.length, 2, '두 번째는 호출하지 않았다');
});

test('실패하면 파일을 만들지 않는다(반쪽 데이터 금지)', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'countries-'));
  const path = join(dir, 'audience-countries.json');
  let n = 0;
  const fetchImpl = async () => (++n === 1 ? {ok: true, status: 200, json: async () => response([['KR', 1, 1]])} : {ok: false, status: 500, json: async () => ({error: {message: 'boom'}})});
  await assert.rejects(collectAudienceCountries({now, accessToken: 't', fetchImpl, path}), /HTTP 500/);
  assert.equal(existsSync(path), false);
});

test('다음 기획 입력 12절: 측정 전이면 그렇게 쓰고, 있으면 한국·그 외·상위 나라를 쓴다', () => {
  assert.ok(renderAudienceCountries(null).join('\n').includes('측정 전'));
  const p = buildPeriod({startDate: '2026-10-19', endDate: '2026-11-15', response: response([['KR', 90, 1], ['US', 10, 1]])});
  const text = renderAudienceCountries({periods: {'28d': p}}).join('\n');
  assert.ok(text.includes('한국 90.0%, 그 외 10.0%') && text.includes('US 10.0%'), text);
});
