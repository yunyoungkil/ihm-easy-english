// 기준선 계산(scripts/baseline.mjs). 가짜 데이터도 실제 파일의 칸 이름을 그대로 쓴다
// (catalog videos[].videoId/format/durationSeconds, views-7d videos[id].views7d, video-lifetime videos[id].first7d.{views,averageViewDuration,subscribersGained}).
import assert from 'node:assert/strict';
import {existsSync, readFileSync} from 'node:fs';
import {dirname, join} from 'node:path';
import test from 'node:test';
import {fileURLToPath} from 'node:url';
import {computeBaselines, judgeAgainstBaseline, judgeVideoMetrics, METRICS, quantile} from '../baseline.mjs';

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

test('세 지표: 조회수, 평균 시청 시간(초), 구독 수 모두 공개 첫 7일 값으로 기준선을 만들고 챔피언 영상 길이를 함께 담는다(쇼츠는 계속 시청함 칸이 하나 더 있다)', () => {
  const m = computeBaselines(fixture()).formats.SHORTS.metrics;
  assert.deepEqual(Object.keys(m), ['views7d', 'watchSeconds7d', 'subs7d', 'stayedToWatch']);
  assert.equal(m.stayedToWatch.champion, null, '스튜디오 기간 표를 넘기지 않으면 계속 시청함은 값이 없다(대신값을 넣지 않는다)');
  assert.equal(m.stayedToWatch.n, 0);
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
  // 스튜디오 첫 7일 값(노출수·클릭률)은 수집 전인 PC에서는 없을 수 있다. 값이 쓸 수 있는 영상이 있을 때만 그 지표의 표본을 요구한다.
  const studioFile = join(dataDir, 'studio-first7d.json');
  const studio = existsSync(studioFile) ? JSON.parse(readFileSync(studioFile, 'utf8')).videos || {} : {};
  // 계속 시청함은 스튜디오 기간 표(studio-metrics.json)에서 온다. 첫 7일을 온전히 포함하고 공개 10일이 지난 쇼츠가 없는 PC에서는 표본이 없을 수 있다.
  const metricsFile = join(dataDir, 'studio-metrics.json');
  const studioMetrics = existsSync(metricsFile) ? JSON.parse(readFileSync(metricsFile, 'utf8')) : null;
  const b = computeBaselines({catalog, views7d, lifetime, studio, studioMetrics});
  for (const format of ['SHORTS', 'LONGFORM']) {
    for (const [key, m] of Object.entries(b.formats[format].metrics)) {
      const hasStudio = catalog.some((v) => v.format === format && studio[v.videoId]?.usable === true);
      if (METRICS[key].studio === true && !hasStudio) continue;
      if (METRICS[key].periodApprox === true && !Object.keys(b.formats[format].stayedToWatchObserved || {}).length) continue;
      assert.ok(m.champion && m.n > 0, `${format} ${key}: 표본이 없다`);
      assert.ok(m.promoteAbove >= m.champion.value, `${format} ${key}: 갱신 기준이 기준선보다 낮다`);
    }
  }
  assert.deepEqual(Object.keys(b.formats.SHORTS.metrics), ['views7d', 'watchSeconds7d', 'subs7d', 'stayedToWatch'], '쇼츠는 노출수·클릭률을 기준선으로 두지 않는다(계속 시청함은 둔다)');
  const shorts = b.formats.SHORTS.metrics.views7d;
  const realMax = Math.max(...catalog.filter((v) => v.format === 'SHORTS').map((v) => views7d[v.videoId]?.views7d).filter(Number.isFinite));
  assert.equal(shorts.champion.value, realMax);
  const watch = b.formats.SHORTS.metrics.watchSeconds7d;
  assert.equal(lifetime[watch.champion.videoId].first7d.averageViewDuration, watch.champion.value);
});

// ─── 2026-11-13 사용자 결정: 두 단계 판정(평소의 1.5배 = 좋은 점 후보, 기준선 갱신), 롱폼 손질, 쇼츠 참고 지표 ───
import {judgeAgainstUsual, usualFor, USUAL_RESULTS, RECENT_COUNT, emptyViewSuspects} from '../baseline.mjs';
import {MIN_VIEWS_7D, WORKED_RATIO, FAILED_RATIO} from '../planning-outcome.mjs';

const dated = (id, format, day, durationSeconds) => ({videoId: id, title: `t-${id}`, publishedAt: `2026-02-${String(day).padStart(2, '0')}T00:00:00Z`, format, durationSeconds});

/** 롱폼 8편: l7이 조회 1위(203)인데 평균 시청 0초 = 빈 조회 의심. l6은 46회에 평균 124초. */
function longFixture() {
  const views = [3, 4, 5, 6, 8, 10, 46, 203];
  const avg = [20, 40, 60, 80, 100, 120, 124, 0];
  const catalog = views.map((_, i) => dated(`l${i}`, 'LONGFORM', i + 1, 400));
  const views7d = Object.fromEntries(views.map((v, i) => [`l${i}`, {views7d: v}]));
  const lifetime = Object.fromEntries(views.map((v, i) => [`l${i}`, f7(v, avg[i], i === 6 ? 1 : 0)]));
  return {catalog, views7d, lifetime};
}

test('빈 조회 의심(조회수 기준선만): 평균 시청이 형식 하위 25% 아래이고 길이 대비 비율도 하위 25% 아래면 조회수 기준선 후보에서 빼되 기록은 남긴다', () => {
  const f = longFixture();
  assert.ok(emptyViewSuspects('LONGFORM', f).has('l7'), '조회 203, 평균 0초는 의심');
  assert.ok(!emptyViewSuspects('LONGFORM', f).has('l6'), '조회 46, 평균 124초는 의심 아님');
  const m = computeBaselines(f).formats.LONGFORM.metrics.views7d;
  assert.equal(m.champion.videoId, 'l6', '기준선은 실제로 본 영상 중 최고');
  assert.equal(m.excluded[0].videoId, 'l7', '뺀 영상은 이유와 함께 기록에 남는다');
  assert.match(m.excluded[0].reason, /빈 조회 의심/);
  assert.equal(m.median, 8, '분포(중앙값)는 그대로 둔다');
  assert.equal(computeBaselines(f).formats.LONGFORM.metrics.subs7d.champion.value, 1, '구독 수 기준선은 의심 영상 제외를 적용하지 않는다');
});

test('빈 조회 의심은 길이 대비 비율이 높으면 걸리지 않는다(5초짜리 쇼츠는 평균 3초만 봐도 거의 끝까지 본 것)', () => {
  const durations = [40, 40, 40, 40, 40, 40, 40, 5];
  const avgs = [3, 5, 6, 7, 8, 9, 10, 3];
  const catalog = durations.map((d, i) => dated(`s${i}`, 'SHORTS', i + 1, d));
  const lifetime = Object.fromEntries(catalog.map((v, i) => [v.videoId, f7(100 + i, avgs[i], 0)]));
  const suspects = emptyViewSuspects('SHORTS', {catalog, lifetime});
  assert.equal(suspects.has('s7'), false, '평균은 가장 짧지만 길이 대비 60%라 걸리지 않는다');
  assert.equal(suspects.has('s0'), true, '평균 3초, 길이 대비 7.5%는 걸린다(규칙이 실제로 작동함)');
});

test('표본 작음: 기준 영상의 첫 7일 조회가 100회 미만이면 비우지 않고 "참고용" 표시를 붙인다', () => {
  const m = computeBaselines(longFixture()).formats.LONGFORM.metrics;
  assert.equal(m.views7d.lowSample, true, '기준선 46회 < 100');
  assert.match(m.views7d.sampleNote, /표본 작음/);
  assert.ok(m.watchSeconds7d.champion, '시청 시간 기준선도 비우지 않는다');
  assert.equal(m.watchSeconds7d.lowSample, true);
  const big = fixture();
  big.views7d.s4 = {views7d: 5000}; big.lifetime.s4 = f7(5000, 18, 3);
  assert.equal(computeBaselines(big).formats.SHORTS.metrics.views7d.lowSample, false);
  assert.equal(MIN_VIEWS_7D, 100, '문턱은 planning-outcome.mjs의 MIN_VIEWS_7D를 그대로 쓴다');
});

test('평소: 같은 형식에서 비슷한 길이(형식 길이 중앙값 기준 같은 쪽) 최근 10편의 중앙값이고, 기준 영상 자신과 그 뒤에 나온 영상은 뺀다', () => {
  const catalog = []; const views7d = {}; const lifetime = {};
  for (let i = 0; i < 24; i += 1) {
    const long = i % 2 === 1; // 짝수=짧은 20초, 홀수=긴 60초
    const v = dated(`s${i}`, 'SHORTS', i + 1, long ? 60 : 20);
    catalog.push(v); views7d[v.videoId] = {views7d: long ? 1000 + i : 100 + i}; lifetime[v.videoId] = f7(long ? 1000 + i : 100 + i, 10, 0);
  }
  const b = computeBaselines({catalog, views7d, lifetime});
  const u = usualFor({format: 'SHORTS', metric: 'views7d', durationSeconds: 20, publishedAt: '2026-02-24T00:00:00Z', videoId: 'new'}, b);
  assert.equal(u.lengthAdjusted, true);
  assert.equal(u.n, RECENT_COUNT, '최근 10편');
  assert.ok(u.value >= 100 && u.value < 200, `짧은 영상끼리만 비교한다: ${u.value}`);
  const uLong = usualFor({format: 'SHORTS', metric: 'views7d', durationSeconds: 60, publishedAt: '2026-02-24T00:00:00Z', videoId: 'new'}, b);
  assert.ok(uLong.value >= 1000, `긴 영상끼리만 비교한다: ${uLong.value}`);
  const early = usualFor({format: 'SHORTS', metric: 'views7d', durationSeconds: 20, publishedAt: '2026-02-03T00:00:00Z', videoId: 's2'}, b);
  assert.equal(early.lengthAdjusted, false, '앞선 영상이 부족하면 길이 보정 없이 같은 형식 전체로 본다');
  assert.ok(early.n < RECENT_COUNT);
  assert.equal(usualFor({format: 'SHORTS', metric: 'views7d', durationSeconds: 20, publishedAt: '2026-01-01T00:00:00Z', videoId: 'x'}, b), null, '앞선 영상이 하나도 없으면 평소 없음');
});

test('평소 대비 판정: 1.5배 이상이면 좋은 점 후보, 0.5배 미만이면 신뢰 하향 기록, 그 사이는 평소 수준, 평소가 없으면 평소 없음', () => {
  const usual = {value: 100, n: 10, lengthAdjusted: true};
  assert.equal(judgeAgainstUsual({value: 100 * WORKED_RATIO, usual}).status, USUAL_RESULTS[0]);
  assert.equal(judgeAgainstUsual({value: 100, usual}).status, USUAL_RESULTS[1]);
  assert.equal(judgeAgainstUsual({value: 100 * FAILED_RATIO - 1, usual}).status, USUAL_RESULTS[2]);
  assert.equal(judgeAgainstUsual({value: 5, usual: null}).status, USUAL_RESULTS[3]);
  assert.equal(judgeAgainstUsual({value: 1, usual: {value: 0, n: 5}}).status, USUAL_RESULTS[0], '평소가 0이면 0보다 큰 값은 후보(배율 계산 불가라고 적는다)');
  assert.match(judgeAgainstUsual({value: 1, usual: {value: 0, n: 5}}).note, /평소가 0/);
  assert.equal(judgeAgainstUsual({value: 0, usual: {value: 0, n: 5}}).status, USUAL_RESULTS[1]);
  assert.ok(!/성공/.test(USUAL_RESULTS.join('')), '"성공"이라는 말을 쓰지 않는다');
});

test('한 편 종합 판정에 평소 대비 결과가 기준선 판정 옆 칸으로 함께 나온다', () => {
  const f = longFixture();
  const b = computeBaselines(f);
  const r = judgeVideoMetrics({format: 'LONGFORM', metrics: {views7d: 300, watchSeconds7d: 300, subs7d: 0}, video: {videoId: 'new', publishedAt: '2026-03-01T00:00:00Z', durationSeconds: 400}}, b);
  assert.equal(r.per.views7d.status, '갱신 기준 초과', '기준선 판정은 그대로(옆 칸)');
  assert.equal(r.per.views7d.usualStatus, USUAL_RESULTS[0], '평소 대비는 따로');
  assert.ok(r.per.views7d.usual.value > 0);
  assert.match(r.summary, /좋은 점 후보/);
});

test('참고 지표: 조회 1,000회당 구독, 시청률(평균 시청÷길이)의 중앙값, 총 시청 시간(분)의 중앙값을 형식별로 담는다', () => {
  const b = computeBaselines(fixture());
  const ref = b.formats.SHORTS.reference;
  assert.equal(ref.subsPer1000Views.totalSubs, 4, 's2 1명 + s4 3명');
  assert.equal(ref.subsPer1000Views.totalViews, 100 + 200 + 300 + 400 + 1000);
  assert.equal(ref.subsPer1000Views.value, (4 / 2000) * 1000);
  assert.ok(ref.watchRatio.median > 0 && ref.watchRatio.n === 5);
  assert.ok(ref.totalWatchMinutes.median > 0);
  assert.match(ref.note, /기준선이 아니라 참고/);
});

// ─── Opus 코드 리뷰(2026-11-13) 반영: 같은 값이 몰릴 때, 평소는 거르지 않은 영상으로, 길이대별 보관, 기록의 고정 문장, 기준선 교체 사유 ───
import {usualBands, USUAL_RULE} from '../baseline.mjs';

test('리뷰 C: 평균 시청 0초가 하위 25%를 넘게 몰려도 빈 조회 의심은 꺼지지 않고, 표본이 8편 미만이면 판단하지 않는다', () => {
  const f = longFixture();
  for (let i = 0; i < 3; i += 1) { // 0초 영상 3편을 더해 0초가 11편 중 4편(25% 초과)
    const id = `z${i}`;
    f.catalog.push(dated(id, 'LONGFORM', 20 + i, 400)); f.views7d[id] = {views7d: 2}; f.lifetime[id] = f7(2, 0, 0);
  }
  const s = emptyViewSuspects('LONGFORM', f);
  assert.ok(s.has('l7') && s.has('z0') && s.has('z1') && s.has('z2'), '0초 영상은 같은 값이어도 모두 의심');
  assert.equal(computeBaselines(f).formats.LONGFORM.metrics.views7d.champion.videoId, 'l6', 'EP19 같은 영상은 계속 기준선 후보에서 빠진다');
  const few = {catalog: f.catalog.slice(0, 5), lifetime: f.lifetime};
  assert.equal(emptyViewSuspects('LONGFORM', few).size, 0, '표본이 8편 미만이면 하위 25%를 믿을 수 없어 판단하지 않는다');
});

test('리뷰 B: 평소(recent)는 조회 문턱으로 거르지 않은 영상으로 만들고, 문턱은 기준선 챔피언 후보에만 쓴다', () => {
  const b = computeBaselines(fixture());
  assert.equal(b.formats.SHORTS.metrics.watchSeconds7d.n, 3, '챔피언 후보는 조회가 형식 중앙값 이상인 3편');
  assert.equal(b.formats.SHORTS.recent.watchSeconds7d.length, 5, '평소는 수치가 있는 5편 모두');
});

test('리뷰 G: recent는 길이대별로 최대 30편씩 남겨 한쪽 길이만 연달아 만들어도 다른 길이대가 밀려나지 않고, 길이 중앙값은 수치가 있는 영상으로만 구한다', () => {
  const DAYS = 86400000; // allow-literal: 하루(ms), 시험용
  const catalog = []; const views7d = {}; const lifetime = {};
  const add = (id, dayIndex, duration) => {
    catalog.push({videoId: id, title: id, publishedAt: new Date(Date.parse('2026-01-01T00:00:00Z') + dayIndex * DAYS).toISOString(), format: 'SHORTS', durationSeconds: duration});
    views7d[id] = {views7d: 100 + dayIndex}; lifetime[id] = f7(100 + dayIndex, 10, 0);
  };
  for (let i = 0; i < 40; i += 1) add(`long${i}`, i, 60); // 오래된 긴 영상 40편
  for (let i = 0; i < 40; i += 1) add(`short${i}`, 100 + i, 20); // 최근의 짧은 영상 40편
  for (let i = 0; i < 5; i += 1) catalog.push({videoId: `sched${i}`, title: 's', publishedAt: '2026-06-01T00:00:00Z', format: 'SHORTS', durationSeconds: 3000}); // 수치 없는 예약 영상
  const b = computeBaselines({catalog, views7d, lifetime});
  const recent = b.formats.SHORTS.recent.views7d;
  assert.equal(b.formats.SHORTS.lengthMedianSeconds, 60, '수치 없는 예약 영상(3000초)은 길이 중앙값에 넣지 않는다');
  assert.equal(recent.filter((r) => r.durationSeconds === 60).length, 30, '긴 영상이 30편 남는다(전체 30편으로 자르면 0편이 된다)');
  assert.equal(recent.filter((r) => r.durationSeconds === 20).length, 30);
  const u = usualFor({format: 'SHORTS', metric: 'views7d', durationSeconds: 60, publishedAt: '2026-12-01T00:00:00Z', videoId: 'new'}, b);
  assert.equal(u.lengthAdjusted, true, '긴 영상 평소도 길이 보정이 켜져 있다');
});

test('리뷰 D: 짧은 쪽·긴 쪽 평소를 따로 구해 보여 줄 수 있다(판정에 쓰는 평소와 같은 값)', () => {
  const DAYS = 86400000; // allow-literal: 하루(ms), 시험용
  const catalog = []; const views7d = {}; const lifetime = {};
  for (let i = 0; i < 12; i += 1) {
    const long = i % 2 === 1;
    const id = `x${i}`;
    catalog.push({videoId: id, title: id, publishedAt: new Date(Date.parse('2026-01-01T00:00:00Z') + i * DAYS).toISOString(), format: 'SHORTS', durationSeconds: long ? 60 : 20});
    views7d[id] = {views7d: long ? 1000 : 100}; lifetime[id] = f7(long ? 1000 : 100, 10, 0);
  }
  const bands = usualBands('SHORTS', 'views7d', computeBaselines({catalog, views7d, lifetime}));
  assert.equal(bands.mid, 60);
  assert.equal(bands.low.value, 100);
  assert.equal(bands.high.value, 1000);
  assert.equal(usualBands('SHORTS', 'views7d', {formats: {}}), null);
});

test('리뷰 F: 영구 기록되는 판정 문장에는 바꿀 수 있는 배율 숫자를 넣지 않고, 배율은 따로 남긴다', () => {
  assert.ok(!/\d/.test(USUAL_RESULTS.join('')), `판정 문장에 숫자가 있다: ${USUAL_RESULTS.join(' / ')}`);
  assert.deepEqual(USUAL_RULE, {goodRatio: WORKED_RATIO, lowRatio: FAILED_RATIO});
});

test('리뷰 I: 빈 조회 의심으로 기준선 자리를 내준 일은 history에 그 이유가 적힌다', () => {
  const f0 = longFixture();
  f0.lifetime.l7 = f7(203, 100, 0); // 처음에는 제대로 본 영상이라 챔피언
  const first = computeBaselines(f0);
  assert.equal(first.formats.LONGFORM.metrics.views7d.champion.videoId, 'l7');
  const second = computeBaselines({...longFixture(), previous: first}); // 이제 평균 시청 0초 → 의심
  const h = second.history.find((x) => x.videoId === 'l7' && x.metric === 'views7d');
  assert.ok(h && /빈 조회 의심/.test(h.reason), JSON.stringify(h));
});

// ─── 사용자 결정(2026-11-13, Opus 리뷰 H): 빈 조회 의심은 상대 순위에 더해 "평균 시청이 영상 길이의 10% 미만"이라는 절대 조건도 필요하다 ───
import {EMPTY_VIEW_MAX_RATIO} from '../baseline.mjs';

test('빈 조회 의심은 하위 25%여도 평균 시청이 영상 길이의 10% 이상이면 걸리지 않는다(28~44%를 본 쇼츠는 본 영상이다)', () => {
  const avgs = [7, 10, 12, 14, 16, 18, 20, 22];
  const catalog = avgs.map((_, i) => dated(`p${i}`, 'SHORTS', i + 1, 25));
  const lifetime = Object.fromEntries(catalog.map((v, i) => [v.videoId, f7(100 + i, avgs[i], 0)]));
  assert.equal(emptyViewSuspects('SHORTS', {catalog, lifetime}).size, 0, '가장 낮은 7초도 길이의 28%라 의심이 아니다');
  assert.equal(EMPTY_VIEW_MAX_RATIO, 0.1, '사용자가 추천을 받아들인 값(길이의 10%)');
  lifetime.p0 = f7(100, 2, 0); // 길이 25초 중 2초(8%)
  assert.deepEqual([...emptyViewSuspects('SHORTS', {catalog, lifetime})], ['p0'], '10% 미만이면 걸린다');
});

test('실제 데이터: 빈 조회 의심으로 잡힌 영상은 모두 평균 시청이 영상 길이의 10% 미만이다', () => {
  const catalog = JSON.parse(readFileSync(join(dataDir, 'catalog.json'), 'utf8')).videos;
  const lifetime = JSON.parse(readFileSync(join(dataDir, 'video-lifetime.json'), 'utf8')).videos;
  for (const format of ['SHORTS', 'LONGFORM']) {
    for (const id of emptyViewSuspects(format, {catalog, lifetime})) {
      const v = catalog.find((x) => x.videoId === id);
      const ratio = Number(lifetime[id].first7d.averageViewDuration) / Number(v.durationSeconds);
      assert.ok(ratio < EMPTY_VIEW_MAX_RATIO, `${format} ${id}: 길이의 ${(ratio * 100).toFixed(1)}%`); // allow-literal: %로 보여 주기
    }
  }
});
