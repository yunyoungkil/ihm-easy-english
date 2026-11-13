// 기준선 계산(scripts/baseline.mjs). 가짜 데이터도 실제 파일의 칸 이름을 그대로 쓴다
// (catalog videos[].videoId/format/statistics.viewCount, views-7d videos[id].views7d, analytics videoPerformance[].video).
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {dirname, join} from 'node:path';
import test from 'node:test';
import {fileURLToPath} from 'node:url';
import {computeBaselines, judgeAgainstBaseline, quantile} from '../baseline.mjs';

const dataDir = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'data', 'youtube');
const video = (id, format, views) => ({videoId: id, title: `t-${id}`, publishedAt: '2026-01-01T00:00:00Z', format, statistics: {viewCount: String(views)}});

function fixture() {
  const catalog = [100, 200, 300, 400, 1000].map((n, i) => video(`s${i}`, 'SHORTS', n)).concat([video('l0', 'LONGFORM', 5), video('l1', 'LONGFORM', 9)]);
  const views7d = {s0: {views7d: 100}, s1: {views7d: 200}, s2: {views7d: 300}, s3: {views7d: 400}, s4: {views7d: 1000}, l0: {views7d: 4}, l1: {views7d: 8}};
  const performance = [
    {video: 's0', views: 100, averageViewPercentage: 50, subscribersPerThousandViews: 1},
    {video: 's1', views: 200, averageViewPercentage: 60, subscribersPerThousandViews: 2},
    {video: 's2', views: 300, averageViewPercentage: 70, subscribersPerThousandViews: 3},
    {video: 's3', views: 400, averageViewPercentage: 80, subscribersPerThousandViews: 4},
    {video: 's4', views: 1000, averageViewPercentage: 90, subscribersPerThousandViews: 5},
  ];
  return {catalog, views7d, performance, range: {startDate: '2026-01-01', endDate: '2026-12-31'}};
}

test('quantile: 정렬 뒤 floor(p*n)번째, 빈 배열은 null', () => {
  assert.equal(quantile([5, 1, 3], 0.5), 3); // allow-literal: 시험용 분위수
  assert.equal(quantile([], 0.5), null); // allow-literal: 시험용 분위수
});

test('기준선: 형식·지표별 최고가 기준선이고, 갱신 기준은 우리 편차(상위 25%÷중앙값)만큼 위다', () => {
  const b = computeBaselines(fixture());
  const m = b.formats.SHORTS.metrics.views7d;
  assert.equal(m.champion.videoId, 's4');
  assert.equal(m.champion.value, 1000);
  assert.equal(m.median, 300);
  assert.equal(m.upper, 400);
  assert.equal(m.promoteAbove, 1000 * (400 / 300));
  assert.equal(m.confidence, '가설');
});

test('비율 지표는 조회수가 형식 중앙값 이상인 영상만 본다(적은 조회수의 비율은 흔들린다)', () => {
  const f = fixture();
  f.performance[0] = {video: 's0', views: 100, averageViewPercentage: 999, subscribersPerThousandViews: 999}; // 조회수가 가장 적은 영상의 튄 값
  const m = computeBaselines(f).formats.SHORTS.metrics.averageViewPercentage;
  assert.equal(m.champion.videoId, 's4');
  assert.ok(m.n < 5, `중앙값 미만 영상이 빠져야 한다: n=${m.n}`);
});

test('range 시작 전에 올린 영상은 시청률·구독 전환에서 뺀다(기간 안 조회수만 잡혀 비율이 튄다, 실제 354% 사례)', () => {
  const f = fixture();
  f.catalog.push({...video('old', 'SHORTS', 5000), publishedAt: '2025-06-01T00:00:00Z'});
  f.performance.push({video: 'old', views: 7, averageViewPercentage: 354, subscribersPerThousandViews: 100});
  const m = computeBaselines(f).formats.SHORTS.metrics.averageViewPercentage;
  assert.notEqual(m.champion.videoId, 'old');
  assert.equal(m.champion.value, 90);
});

test('챔피언이 바뀌면 이전 챔피언은 history에 더해지고 지워지지 않는다', () => {
  const f = fixture();
  const first = computeBaselines(f);
  f.catalog.push(video('s9', 'SHORTS', 5000));
  f.views7d.s9 = {views7d: 5000};
  const second = computeBaselines({...f, previous: first});
  assert.equal(second.formats.SHORTS.metrics.views7d.champion.videoId, 's9');
  const old = second.history.find((h) => h.metric === 'views7d' && h.videoId === 's4');
  assert.ok(old && old.replacedBy === 's9', '이전 챔피언 s4가 history에 있어야 한다');
});

test('판정 말: 갱신 기준 초과 / 편차 안 / 기준선 이하 / 기준선 없음, "성공"은 어디에도 쓰지 않는다', () => {
  const b = computeBaselines(fixture());
  const j = (value) => judgeAgainstBaseline({format: 'SHORTS', metric: 'views7d', value}, b).status;
  assert.equal(j(1400), '갱신 기준 초과');
  assert.equal(j(1100), '기준선 위, 편차 안(갱신 아님)');
  assert.equal(j(900), '기준선 이하');
  assert.equal(judgeAgainstBaseline({format: 'LONGFORM', metric: 'averageViewPercentage', value: 1}, b).status, '기준선 없음');
  assert.ok(!/성공/.test(JSON.stringify(b)), '결과에 "성공"이라는 말이 들어가면 안 된다');
});

test('실제 데이터: 기준선이 계산되고 실제 파일의 최고값과 일치한다', () => {
  const catalog = JSON.parse(readFileSync(join(dataDir, 'catalog.json'), 'utf8')).videos;
  const views7d = JSON.parse(readFileSync(join(dataDir, 'views-7d.json'), 'utf8')).videos;
  const performance = JSON.parse(readFileSync(join(dataDir, 'analytics-latest.json'), 'utf8')).videoPerformance;
  assert.ok(performance[0].video, '실제 videoPerformance는 영상 ID 칸이 video다');
  const analytics = JSON.parse(readFileSync(join(dataDir, 'analytics-latest.json'), 'utf8'));
  assert.ok(analytics.range?.startDate, '실제 analytics에 range.startDate가 있어야 한다');
  const b = computeBaselines({catalog, views7d, performance, range: analytics.range});
  const shorts = b.formats.SHORTS.metrics.views7d;
  const realMax = Math.max(...catalog.filter((v) => v.format === 'SHORTS').map((v) => views7d[v.videoId]?.views7d).filter(Number.isFinite));
  assert.equal(shorts.champion.value, realMax);
  assert.ok(shorts.promoteAbove > shorts.champion.value, '갱신 기준은 기준선보다 위여야 한다');
  for (const f of ['SHORTS', 'LONGFORM']) {
    for (const metric of ['averageViewPercentage', 'subscribersPerThousandViews']) {
      const c = b.formats[f].metrics[metric].champion;
      if (!c) continue;
      const perf = performance.find((p) => p.video === c.videoId);
      assert.ok(c.publishedAt.slice(0, 10) >= analytics.range.startDate, `${f} ${metric} 기준선이 기간 시작 전 영상이다`);
      assert.ok(Number(perf.views) >= 2, `${f} ${metric} 기준선의 기간 안 조회수가 ${perf.views}회뿐이다`); // allow-literal: 한 명 차이로 비율이 뒤집히는 영상 배제 확인
    }
  }
  assert.ok(shorts.n >= catalog.filter((v) => v.format === 'SHORTS' && views7d[v.videoId]).length, '7일 조회가 있는 쇼츠를 빠뜨리면 안 된다');
});

test('영상별 전체 기간 수치(lifetime)가 있으면 그것으로 시청률·구독 전환을 계산한다(기간 밖 영상도 포함, 조회수 중앙값 미만은 제외)', () => {
  const f = fixture();
  f.catalog.push({...video('old', 'SHORTS', 5000), publishedAt: '2025-06-01T00:00:00Z'}); // range 시작 전에 올린 영상
  const lifetime = {
    s0: {views: 100, averageViewPercentage: 50, subscribersGained: 0}, s1: {views: 200, averageViewPercentage: 60, subscribersGained: 0},
    s2: {views: 300, averageViewPercentage: 70, subscribersGained: 3}, s3: {views: 400, averageViewPercentage: 80, subscribersGained: 0},
    s4: {views: 1000, averageViewPercentage: 90, subscribersGained: 5}, old: {views: 5000, averageViewPercentage: 120, subscribersGained: 25},
  };
  const m = computeBaselines({...f, lifetime}).formats.SHORTS.metrics;
  assert.equal(m.averageViewPercentage.champion.videoId, 'old', 'range 밖 영상도 전체 기간 수치로 들어온다');
  assert.equal(m.averageViewPercentage.champion.value, 120);
  assert.equal(m.subscribersPerThousandViews.champion.value, 5); // 25구독 / 5000회 × 1000
  assert.equal(m.averageViewPercentage.n, 3, '중앙값(400) 이상 조회 영상 s3,s4,old만 본다');
});

test('실제 데이터: 영상별 전체 기간 수치가 있으면 시청률·구독 전환 기준선 표본이 늘어나고, 기준선 영상의 조회수는 형식 중앙값 이상이다', () => {
  const life = JSON.parse(readFileSync(join(dataDir, 'video-lifetime.json'), 'utf8')).videos;
  const catalog = JSON.parse(readFileSync(join(dataDir, 'catalog.json'), 'utf8')).videos;
  const views7d = JSON.parse(readFileSync(join(dataDir, 'views-7d.json'), 'utf8')).videos;
  const sample = Object.values(life).find((x) => !x.empty);
  assert.ok(sample && 'views' in sample && 'averageViewPercentage' in sample && 'subscribersGained' in sample, '실제 video-lifetime.json의 칸 이름이 다르다');
  const b = computeBaselines({catalog, views7d, performance: [], lifetime: life});
  const shorts = b.formats.SHORTS.metrics.averageViewPercentage;
  assert.ok(shorts.n > 3, `쇼츠 시청률 표본이 ${shorts.n}편뿐이다(기간 안 수치만 쓰던 때는 3편)`); // allow-literal: 이전 방식의 표본 수와 비교
  const c = shorts.champion;
  const viewsOf = (id) => Number(life[id].views);
  const formatViews = catalog.filter((v) => v.format === 'SHORTS' && life[v.videoId] && !life[v.videoId].empty).map((v) => viewsOf(v.videoId)).sort((x, y) => x - y);
  assert.ok(viewsOf(c.videoId) >= formatViews[Math.floor(formatViews.length / 2)], '기준선 영상 조회수가 형식 중앙값 미만이다'); // allow-literal: 중앙값 위치
});
