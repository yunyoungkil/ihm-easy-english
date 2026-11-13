import test from 'node:test';
import assert from 'node:assert/strict';
import {buildStudioExploreUrl, parseStudioTable, periodFromZipName, STUDIO_METRICS} from '../studio-export.mjs';

// 2026-11-13에 스튜디오 고급 모드에서 실제로 받은 표 데이터.csv(지난 7일)의 머리글과 줄. 칸 이름과 값 모양을 바꾸지 않는다.
const REAL = [
  '콘텐츠,동영상 제목,동영상 게시 시간,길이,평균 시청 지속 시간,평균 조회율 (%),신규 시청자,재방문 시청자,계속 시청함 (%),조회수,시청 시간(단위: 시간),구독자,썸네일 노출수,썸네일 클릭률 (%)',
  '합계,,,,0:00:48,50.78,4,3,37.96,738,4.1651,3,1352,1.63',
  'oMrCtSBbibc,"양일까 배일까? sheep과 ship, 소리만 듣고 맞혀 보세요 #영어발음 #shorts","Nov 10, 2026",45,0:00:31,70.63,,,37.28,678,2.385,1,17,5.88',
  'ROks87qezuU,"여태 스펠링 다 읽으셨나요? K, B, W 소리 안 나는 진짜 이유 | 묵음 파닉스","Sep 24, 2026",415,0:03:08,45.42,4,1,,26,1.1522,2,313,3.51',
].join('\r\n');

test('표 데이터.csv: 합계 줄과 영상 줄을 나누고, 제목 안의 쉼표를 지킨다', () => {
  const {total, videos} = parseStudioTable(REAL);
  assert.equal(total.views, 738);
  assert.equal(total.impressions, 1352);
  assert.equal(total.ctrPercent, 1.63);
  assert.deepEqual(Object.keys(videos), ['oMrCtSBbibc', 'ROks87qezuU']);
});

test('쇼츠 줄: 빈 신규·재방문은 0이 아니라 null, 계속 시청함은 값이 있다', () => {
  const v = parseStudioTable(REAL).videos.oMrCtSBbibc;
  assert.equal(v.newViewers, null);
  assert.equal(v.returningViewers, null);
  assert.equal(v.stayedToWatchPercent, 37.28);
  assert.equal(v.avgViewDurationSec, 31);
  assert.equal(v.durationSec, 45);
  assert.equal(v.publishedAt, '2026-11-10');
  assert.equal(v.views, 678);
});

test('롱폼 줄: 계속 시청함은 비어 있어 null, 평균 시청 지속 시간 h:mm:ss는 초로 바뀐다', () => {
  const v = parseStudioTable(REAL).videos.ROks87qezuU;
  assert.equal(v.stayedToWatchPercent, null);
  assert.equal(v.avgViewDurationSec, 188);
  assert.equal(v.newViewers, 4);
  assert.equal(v.watchHours, 1.1522);
});

test('"—" 표시도 null로 읽는다', () => {
  const csv = REAL.replace('0:00:31,70.63,,,37.28', '—,—,—,—,—');
  const v = parseStudioTable(csv).videos.oMrCtSBbibc;
  assert.equal(v.avgViewDurationSec, null);
  assert.equal(v.stayedToWatchPercent, null);
});

test('칸 이름이 바뀌면 조용히 넘어가지 않고 실패한다', () => {
  assert.throws(() => parseStudioTable(REAL.replace('썸네일 클릭률 (%)', '클릭률')), /없는 칸: 썸네일 클릭률 \(%\)/);
  assert.throws(() => parseStudioTable('콘텐츠'), /내용 부족/);
});

test('주소에 채널, 기간, 측정항목 10개가 들어간다', () => {
  const url = new URL(buildStudioExploreUrl({channelId: 'UCwNrEdm2jYAtUlfHVvH3WQw', period: 'week'}));
  assert.equal(url.searchParams.get('time_period'), 'week');
  assert.equal(url.searchParams.get('entity_id'), 'UCwNrEdm2jYAtUlfHVvH3WQw');
  assert.equal(url.searchParams.get('dimension'), 'VIDEO');
  assert.deepEqual(url.searchParams.getAll('t_metrics'), [...STUDIO_METRICS]);
  assert.equal(STUDIO_METRICS.length, 10);
});

test('내려받은 파일 이름에서 기간을 읽는다', () => {
  assert.deepEqual(periodFromZipName('콘텐츠 2026-11-06_2026-11-13 이해하면 쉬운 영어.zip'), {startDate: '2026-11-06', endDate: '2026-11-13'});
  assert.equal(periodFromZipName('표 데이터.zip'), null);
});

// ---- 2026-11-13 Opus 리뷰 반영 ----
import {checkPeriodDays, isStudioZipName, lastDayOf, mergeRollingReach, ROLLING_REACH_KEY} from '../studio-export.mjs';
import {pickLatestPeriod, pickLatestPeriodWithImpressions} from '../studio-reach.mjs';

test('숫자로 못 읽는 값은 조용히 null이 되지 않고 던진다(% 기호가 붙기 시작하는 경우)', () => {
  assert.throws(() => parseStudioTable(REAL.replace(',1352,1.63', ',1352,1.63%')), /숫자로 못 읽은 칸: 썸네일 클릭률 \(%\)="1.63%"/);
  assert.throws(() => parseStudioTable(REAL.replace('0:00:48', '48초')), /시간으로 못 읽은 칸: 평균 시청 지속 시간/);
});

test('영상 ID가 아닌 줄이 영상으로 저장되지 않는다', () => {
  assert.throws(() => parseStudioTable(`${REAL}\r\nTotal,,,,0:00:01,1,1,1,1,1,1,1,1,1`), /영상 ID가 아닌 줄: "Total"/);
});

test('전체 기간 합계의 신규·재방문 0은 영상 줄이 모두 비어 있으면 null로 둔다(스튜디오가 계산하지 않은 값)', () => {
  const lifetime = REAL.replace('합계,,,,0:00:48,50.78,4,3,', '합계,,,,0:00:48,50.78,0,0,')
    .replace('0:00:31,70.63,,,', '0:00:31,70.63,,,').replace('0:03:08,45.42,4,1,', '0:03:08,45.42,,,');
  const {total} = parseStudioTable(lifetime);
  assert.equal(total.newViewers, null);
  assert.equal(total.returningViewers, null);
  // 영상 줄에 값이 하나라도 있으면 합계 0은 그대로 둔다
  assert.equal(parseStudioTable(REAL.replace('합계,,,,0:00:48,50.78,4,3,', '합계,,,,0:00:48,50.78,0,0,')).total.newViewers, 0);
});

test('zip 이름의 종료일은 마지막 날의 다음 날이므로 마지막 날을 따로 계산한다', () => {
  assert.equal(lastDayOf('2026-11-13'), '2026-11-12'); // 화면은 "~ 2026. 11. 12."
  assert.equal(lastDayOf('2026-03-01'), '2026-02-28');
});

test('기간 이름과 받은 구간 길이가 다르면 던진다', () => {
  assert.doesNotThrow(() => checkPeriodDays('week', {startDate: '2026-11-06', endDate: '2026-11-13'}));
  assert.doesNotThrow(() => checkPeriodDays('4_weeks', {startDate: '2026-10-16', endDate: '2026-11-13'}));
  assert.throws(() => checkPeriodDays('week', {startDate: '2026-10-16', endDate: '2026-11-13'}), /week인데 28일 구간/);
  assert.doesNotThrow(() => checkPeriodDays('lifetime', {startDate: '2025-06-18', endDate: '2026-11-13'}), '전체는 길이를 검사하지 않는다');
});

test('스튜디오 파일 이름 모양만 받는다(경로 조각 거부)', () => {
  assert.equal(isStudioZipName('콘텐츠 2026-11-06_2026-11-13 이해하면 쉬운 영어.zip'), true);
  assert.equal(isStudioZipName('../../x.zip'), false);
  assert.equal(isStudioZipName('콘텐츠 2026-11-06_2026-11-13 a/b.zip'), false);
});

test('고정 키로 덮어써서 날마다 키가 늘지 않고, 노출수가 없는 영상은 건너뛴다', () => {
  const reach = {videos: {oMrCtSBbibc: {videoId: 'oMrCtSBbibc', windows: {}, periods: {'2026-08-12_2026-11-10': {startDate: '2026-08-12', endDate: '2026-11-10', impressions: 100, ctr: 4}}}}};
  const videos = {oMrCtSBbibc: {impressions: 17, ctrPercent: 5.88}, ROks87qezuU: {impressions: null, ctrPercent: null}, kfVJAJTmLpU: {impressions: 144, ctrPercent: null}};
  assert.equal(mergeRollingReach(reach, videos, {startDate: '2026-08-14', endDate: '2026-11-13'}, 'T1'), 2);
  assert.equal(mergeRollingReach(reach, videos, {startDate: '2026-08-15', endDate: '2026-11-14'}, 'T2'), 2);
  const keys = Object.keys(reach.videos.oMrCtSBbibc.periods);
  assert.deepEqual(keys, ['2026-08-12_2026-11-10', ROLLING_REACH_KEY], '기존 키는 그대로, 새 키는 하나뿐');
  assert.equal(reach.videos.oMrCtSBbibc.periods[ROLLING_REACH_KEY].endDate, '2026-11-14');
  assert.equal(reach.videos.ROks87qezuU, undefined, '노출수가 없으면 항목을 만들지 않는다');
  assert.equal(reach.videos.kfVJAJTmLpU.periods[ROLLING_REACH_KEY].ctr, null, 'CTR 빈칸은 0이 아니라 null');
});

test('같은 날 끝나는 구간이 여럿이어도 어떤 곳에서나 가장 긴 구간(90일)이 이긴다', () => {
  // 실제 키 모양: 7일·28일·90일이 모두 11-13에 끝난다. 들어온 순서(7일 → 28일 → 90일, 또는 반대)가 결과를 바꾸면 안 된다.
  const a = {startDate: '2026-11-06', endDate: '2026-11-13', impressions: 10, ctr: 1};
  const b = {startDate: '2026-10-16', endDate: '2026-11-13', impressions: 30, ctr: 2};
  const c = {startDate: '2026-08-15', endDate: '2026-11-13', impressions: 90, ctr: 3};
  for (const order of [[a, b, c], [c, b, a], [b, c, a]]) {
    const periods = Object.fromEntries(order.map((p, i) => [`k${i}`, p]));
    assert.equal(pickLatestPeriod(periods).impressions, 90);
    assert.equal(pickLatestPeriodWithImpressions(periods).impressions, 90);
    assert.equal(pickLatestPeriodWithImpressions(periods, {needCtr: true}).impressions, 90);
  }
  assert.equal(pickLatestPeriodWithImpressions({x: {startDate: 'a', endDate: '2026-11-13', impressions: 5, ctr: null}}, {needCtr: true}), null);
});
