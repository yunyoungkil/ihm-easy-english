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
