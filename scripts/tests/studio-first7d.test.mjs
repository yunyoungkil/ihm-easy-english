import test from 'node:test';
import assert from 'node:assert/strict';
import {buildRecord, buildStudioDayUrl, checkWindowAgainstApi, first7dFromDays, parseStudioDayTable, recomputeStore, selectTargets, usabilityOf} from '../studio-first7d.mjs';
import {isStudioZipName} from '../studio-export.mjs';

// 2026-11-13에 스튜디오 영상별 고급 모드 날짜 표(ROks87qezuU, 2026-09-24 공개)에서 실제로 받은 표 데이터.csv의 머리글과 앞 줄.
// API 첫 7일(video-lifetime.json first7d): 2026-09-24~2026-09-30, 조회 46.
const REAL = ['날짜,썸네일 노출수,썸네일 클릭률 (%),조회수', '합계,1846,4.71,175', '2026-09-24,11,0,3', '2026-09-25,14,0,1', '2026-09-26,8,0,5',
  '2026-09-27,31,3.23,6', '2026-09-28,28,7.14,12', '2026-09-29,46,13.04,19', '2026-09-30,2,0,', '2026-10-01,2,0,'].join('\r\n');
const WINDOW = {startDate: '2026-09-24', endDate: '2026-09-30'};

test('날짜 표: 합계 줄과 날짜 줄을 나누고, 빈 조회는 null로 둔다', () => {
  const {total, days} = parseStudioDayTable(REAL);
  assert.equal(total.impressions, 1846);
  assert.equal(days.length, 8);
  assert.deepEqual(days[6], {date: '2026-09-30', impressions: 2, ctrPercent: 0, views: null});
});

test('날짜 표 칸이 바뀌면 조용히 넘어가지 않는다', () => {
  assert.throws(() => parseStudioDayTable(REAL.replace('썸네일 클릭률 (%)', '클릭률')), /날짜 표 칸이 다름/);
  assert.throws(() => parseStudioDayTable(`${REAL}\r\n합계가 아닌 줄,1,1,1`), /날짜가 아닌 줄/);
});

test('첫 7일: 클릭 수를 정수로 되살려 더하고 7일 클릭률을 클릭 합 나누기 노출 합으로 낸다', () => {
  const {days} = parseStudioDayTable(REAL);
  const r = first7dFromDays(days, WINDOW);
  assert.equal(r.impressions, 140);
  assert.equal(r.clicks, 9); // 0+0+0+1+2+6+0
  assert.equal(r.ctrPercent, 6.43); // 노출 가중 평균(6.40)이 아니라 클릭 수 기준
  assert.equal(r.ctrMethod, 'exact-clicks');
  assert.equal(r.viewsSum, 46);
  assert.deepEqual(r.missingDays, []);
});

test('반올림 허용 범위를 벗어나는 날이 있으면 approx로 표시한다', () => {
  const days = [{date: '2026-09-24', impressions: 100, ctrPercent: 33.4, views: 1}]; // 33.4 -> 33.4 클릭: 정수에 안 맞음
  const r = first7dFromDays(days, WINDOW);
  assert.equal(r.ctrMethod, 'approx');
});

test('표에 없는 날은 missingDays에 적고, 날짜 표 조회수 합이 API와 같을 때만 노출 0인 날로 보고 쓴다', () => {
  // 실제 관찰(2026-11-13): 스튜디오 날짜 표는 활동 없는 날을 줄째로 생략한다. 빠진 날이 있는 54편 모두 조회수 합이 API와 같았다.
  const noActivityDay = parseStudioDayTable(REAL.replace('2026-09-30,2,0,\r\n', ''));
  const r = first7dFromDays(noActivityDay.days, WINDOW);
  assert.deepEqual(r.missingDays, ['2026-09-30']);
  assert.equal(r.viewsSum, 46);
  assert.equal(usabilityOf({status: 'match'}, r, {viewsSum: r.viewsSum, apiViews: 46}).usable, true);
  assert.equal(usabilityOf({status: 'match'}, r, {viewsSum: r.viewsSum, apiViews: 46}).missingTreatedAsZero, true);
  // 조회가 있던 날(9/27, 조회 6)이 빠지면 조회수 합이 API와 달라서 0으로 볼 수 없다
  const lostViews = first7dFromDays(parseStudioDayTable(REAL.replace('2026-09-27,31,3.23,6\r\n', '')).days, WINDOW);
  assert.deepEqual(lostViews.missingDays, ['2026-09-27']);
  const bad = usabilityOf({status: 'match'}, lostViews, {viewsSum: lostViews.viewsSum, apiViews: 46});
  assert.equal(bad.usable, false);
  assert.match(bad.reason, /조회수 합\(40\)이 API\(46\)와 다름/);
  // API 조회수를 모르면 확인할 수 없으니 쓰지 않는다
  assert.equal(usabilityOf({status: 'no-api'}, r, {viewsSum: r.viewsSum, apiViews: null}).usable, false);
  // 빠진 날이 없으면 그대로 쓴다
  const full = first7dFromDays(parseStudioDayTable(REAL).days, WINDOW);
  assert.equal(usabilityOf({status: 'match'}, full, {viewsSum: 46, apiViews: 46}).missingTreatedAsZero, false);
});

test('저장된 기록을 다시 계산한다: 옛 규칙(빠진 날이 있으면 제외)으로 저장된 기록이 새 규칙으로 쓸 수 있게 바뀐다', () => {
  const days = parseStudioDayTable(REAL.replace('2026-09-30,2,0,\r\n', '')).days;
  const old = {...buildRecord({days, window: WINDOW, apiViews: 46, now: new Date('2026-11-13T00:00:00Z')}), usable: false, unusableReason: '창 안에 빠진 날 1일'};
  const store = {videos: {ROks87qezuU: old}};
  assert.equal(recomputeStore(store), 1);
  assert.equal(store.videos.ROks87qezuU.usable, true);
  assert.equal(recomputeStore(store), 0, '다시 계산해도 같으면 바꾸지 않는다');
});

test('노출이 있는데 클릭률이 비면 계산 못 한 날로 센다(0으로 두지 않는다)', () => {
  const r = first7dFromDays([{date: '2026-09-24', impressions: 50, ctrPercent: null, views: 2}], WINDOW);
  assert.deepEqual(r.uncomputableDays, ['2026-09-24']);
  assert.equal(usabilityOf({status: 'match'}, r, {viewsSum: 2, apiViews: 2}).usable, false);
});

test('시간대 확인: 조회수 합이 API와 같은 창을 데이터로 고른다', () => {
  const {days} = parseStudioDayTable(REAL);
  // 실제 표는 9/23이 없고 9/30 조회가 비어 있어 0일 창과 -1일 창이 모두 46으로 같다 → 구분 안 됨(쓸 수는 있다)
  const real = checkWindowAgainstApi(days, WINDOW, 46);
  assert.equal(real.status, 'ambiguous');
  assert.equal(real.best, 0);
  // 하루 뒤 창이 API와 정확히 맞으면 shifted로 표시하고 기준선에서 뺀다
  const shifted = [{date: '2026-09-25', views: 10}, {date: '2026-09-26', views: 20}, {date: '2026-10-01', views: 5}];
  const c = checkWindowAgainstApi(shifted, WINDOW, 35);
  assert.equal(c.status, 'shifted');
  assert.equal(c.best, 1);
  assert.equal(usabilityOf(c, {missingDays: []}).usable, false);
  assert.equal(checkWindowAgainstApi(days, WINDOW, null).status, 'no-api');
});

test('기록: 창 앞뒤 하루씩 원본을 남기고 쓸 수 있음 여부를 적는다', () => {
  const {days} = parseStudioDayTable(REAL);
  const rec = buildRecord({days, window: WINDOW, apiViews: 46, now: new Date('2026-11-13T00:00:00Z')});
  assert.equal(rec.usable, true);
  assert.equal(rec.impressions, 140);
  assert.equal(rec.apiViews7d, 46);
  assert.ok(rec.days.some((d) => d.date === '2026-10-01'), '창 뒤 하루');
  assert.equal(rec.source, 'studio-video-day-table');
});

test('수집 대상: 공개, API 첫 7일 있음, 아직 값 없음, 3번 실패한 영상은 제외, 새 영상부터', () => {
  const catalog = [
    {videoId: 'newer', privacyStatus: 'public', publishedAt: '2026-11-01T00:00:00Z'},
    {videoId: 'older', privacyStatus: 'public', publishedAt: '2026-10-01T00:00:00Z'},
    {videoId: 'done', privacyStatus: 'public', publishedAt: '2026-10-02T00:00:00Z'},
    {videoId: 'failed3', privacyStatus: 'public', publishedAt: '2026-10-03T00:00:00Z'},
    {videoId: 'noapi', privacyStatus: 'public', publishedAt: '2026-10-04T00:00:00Z'},
    {videoId: 'private', privacyStatus: 'private', publishedAt: '2026-10-05T00:00:00Z'},
  ];
  const first7d = {startDate: '2026-10-01', endDate: '2026-10-07', views: 5};
  const lifetime = {newer: {first7d}, older: {first7d}, done: {first7d}, failed3: {first7d}, private: {first7d}};
  const store = {videos: {done: {}}, failures: {failed3: {attempts: 3}}};
  assert.deepEqual(selectTargets({catalog, lifetime, store}).map((v) => v.videoId), ['newer', 'older']);
});

test('주소는 hub_overview 형식이고 파일 이름은 "날짜 ..." 형식도 받는다', () => {
  const url = new URL(buildStudioDayUrl('ROks87qezuU'));
  assert.ok(url.pathname.endsWith('/analytics/hub_overview/explore'));
  assert.equal(url.searchParams.get('dimension'), 'DAY');
  assert.equal(url.searchParams.get('entity_id'), 'ROks87qezuU');
  assert.equal(isStudioZipName('날짜 2026-09-18_2026-11-13 여태 스펠링 다 읽으셨나요_ K, B, W 소리 안 나는 진짜 이유 _ 묵음 파닉스.zip'), true);
});
