// 기준선 계산(scripts/baseline.mjs). 가짜 데이터도 실제 파일의 칸 이름을 그대로 쓴다
// (catalog videos[].videoId/format/durationSeconds, views-7d videos[id].views7d, video-lifetime videos[id].first7d.{views,averageViewDuration,subscribersGained}).
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {dirname, join} from 'node:path';
import test from 'node:test';
import {fileURLToPath} from 'node:url';
import {computeBaselines, judgeAgainstBaseline, judgeVideoMetrics, quantile} from '../baseline.mjs';

const dataDir = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'data', 'youtube');
const video = (id, format, durationSeconds = 50) => ({videoId: id, title: `t-${id}`, publishedAt: '2026-01-01T00:00:00Z', format, durationSeconds});
const f7 = (views, averageViewDuration, subscribersGained) => ({first7d: {views, averageViewDuration, subscribersGained}});

function fixture() {
  const catalog = ['s0', 's1', 's2', 's3', 's4'].map((id, i) => video(id, 'SHORTS', 20 + i * 10)).concat([video('l0', 'LONGFORM', 400), video('l1', 'LONGFORM', 500)]);
  const views7d = {s0: {views7d: 100}, s1: {views7d: 200}, s2: {views7d: 300}, s3: {views7d: 400}, s4: {views7d: 1000}, l0: {views7d: 4}, l1: {views7d: 8}};
  const lifetime = {s0: f7(100, 10, 0), s1: f7(200, 12, 0), s2: f7(300, 14, 1), s3: f7(400, 16, 0), s4: f7(1000, 18, 3), l0: f7(4, 100, 0), l1: f7(8, 150, 0)};
  return {catalog, views7d, lifetime};
}

test('quantile: 정렬 뒤 floor(p*n)번째, 빈 배열은 null', () => {
  assert.equal(quantile([5, 1, 3], 0.5), 3); // allow-literal: 시험용 분위수
  assert.equal(quantile([], 0.5), null); // allow-literal: 시험용 분위수
});

test('기준선: 형식·지표별 최고가 기준선이고, 갱신 기준은 우리 편차(상위 25%÷중앙값)만큼 위다', () => {
  const m = computeBaselines(fixture()).formats.SHORTS.metrics.views7d;
  assert.equal(m.champion.videoId, 's4');
  assert.equal(m.champion.value, 1000);
  assert.equal(m.median, 300);
  assert.equal(m.upper, 400);
  assert.equal(m.promoteAbove, 1000 * (400 / 300));
  assert.equal(m.promoteRule, '비율');
  assert.equal(m.confidence, '가설');
});

test('세 지표: 조회수, 평균 시청 시간(초), 구독 수 모두 공개 첫 7일 값으로 기준선을 만들고 챔피언 영상 길이를 함께 담는다', () => {
  const m = computeBaselines(fixture()).formats.SHORTS.metrics;
  assert.deepEqual(Object.keys(m), ['views7d', 'watchSeconds7d', 'subs7d']);
  assert.equal(m.watchSeconds7d.champion.value, 18);
  assert.equal(m.watchSeconds7d.champion.durationSeconds, 60, '길이 효과를 읽을 수 있게 챔피언 영상 길이를 남긴다');
  assert.equal(m.subs7d.champion.value, 3);
});

test('평균 시청 시간은 첫 7일 조회수가 형식 중앙값 이상인 영상만 본다(적은 조회수의 평균은 흔들린다)', () => {
  const f = fixture();
  f.lifetime.s0 = f7(100, 999, 0); // 조회수가 가장 적은 영상의 튄 값
  const m = computeBaselines(f).formats.SHORTS.metrics.watchSeconds7d;
  assert.equal(m.champion.videoId, 's4');
  assert.equal(m.n, 3, '중앙값(300) 이상 조회 영상 s2,s3,s4만 본다');
});

test('중앙값이 0인 지표(구독 수)는 상위 25%와 중앙값의 차이로 갱신 기준을 만들고, 차가 0이면 기준선보다 높기만 하면 갱신이다', () => {
  const f = fixture();
  Object.assign(f.lifetime, {s0: f7(100, 10, 0), s1: f7(200, 12, 0), s2: f7(300, 14, 0), s3: f7(400, 16, 0), s4: f7(1000, 18, 2)});
  const m = computeBaselines(f).formats.SHORTS.metrics.subs7d;
  assert.equal(m.median, 0);
  assert.equal(m.promoteRule, '차이');
  assert.equal(m.promoteAbove, 2, '챔피언 2 + (상위25% 0 − 중앙값 0)');
  const b = computeBaselines(f);
  const j = (value) => judgeAgainstBaseline({format: 'SHORTS', metric: 'subs7d', value}, b).status;
  assert.equal(j(3), '갱신 기준 초과');
  assert.equal(j(2), '기준선 이하');
});

test('챔피언이 바뀌면 이전 챔피언은 history에 더해지고 지워지지 않는다', () => {
  const f = fixture();
  const first = computeBaselines(f);
  f.catalog.push(video('s9', 'SHORTS'));
  f.views7d.s9 = {views7d: 5000};
  f.lifetime.s9 = f7(5000, 30, 5);
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
  assert.equal(judgeAgainstBaseline({format: 'LONGFORM', metric: 'watchSeconds7d', value: 1}, {formats: {}}).status, '기준선 없음');
  assert.ok(!/성공/.test(JSON.stringify(b)), '결과에 "성공"이라는 말이 들어가면 안 된다');
});

test('한 편 종합 판정: 세 지표를 각각 판정하고 넘은 지표 이름을 요약한다', () => {
  const b = computeBaselines(fixture());
  const r = judgeVideoMetrics({format: 'SHORTS', metrics: {views7d: 1400, watchSeconds7d: 10, subs7d: 0}}, b);
  assert.equal(r.per.views7d.status, '갱신 기준 초과');
  assert.equal(r.per.watchSeconds7d.status, '기준선 이하');
  assert.equal(r.summary, '갱신 기준을 넘은 지표: 공개 7일 조회수');
  assert.equal(judgeVideoMetrics({format: 'SHORTS', metrics: {views7d: 1}}, b).summary, '갱신 기준을 넘은 지표 없음');
});

test('실제 데이터: 세 지표 기준선이 계산되고, 첫 7일 조회수는 views-7d.json과 같으며, 기준선 영상은 실제로 그 값을 가졌다', () => {
  const catalog = JSON.parse(readFileSync(join(dataDir, 'catalog.json'), 'utf8')).videos;
  const views7d = JSON.parse(readFileSync(join(dataDir, 'views-7d.json'), 'utf8')).videos;
  const lifetime = JSON.parse(readFileSync(join(dataDir, 'video-lifetime.json'), 'utf8')).videos;
  const sample = Object.values(lifetime).find((x) => x.first7d);
  assert.ok(sample && 'views' in sample.first7d && 'averageViewDuration' in sample.first7d && 'subscribersGained' in sample.first7d, '실제 first7d의 칸 이름이 다르다');
  for (const [id, e] of Object.entries(lifetime)) {
    if (e.first7d && views7d[id]) assert.equal(Number(e.first7d.views), Number(views7d[id].views7d), `${id}: first7d 조회수와 views-7d.json이 다르다`);
  }
  const b = computeBaselines({catalog, views7d, lifetime});
  for (const format of ['SHORTS', 'LONGFORM']) {
    for (const [key, m] of Object.entries(b.formats[format].metrics)) {
      assert.ok(m.champion && m.n > 0, `${format} ${key}: 표본이 없다`);
      assert.ok(m.promoteAbove >= m.champion.value, `${format} ${key}: 갱신 기준이 기준선보다 낮다`);
    }
  }
  const shorts = b.formats.SHORTS.metrics.views7d;
  const realMax = Math.max(...catalog.filter((v) => v.format === 'SHORTS').map((v) => views7d[v.videoId]?.views7d).filter(Number.isFinite));
  assert.equal(shorts.champion.value, realMax);
  const watch = b.formats.SHORTS.metrics.watchSeconds7d;
  assert.equal(lifetime[watch.champion.videoId].first7d.averageViewDuration, watch.champion.value);
});
