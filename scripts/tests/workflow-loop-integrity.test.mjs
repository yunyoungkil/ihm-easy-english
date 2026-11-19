// 워크플로우 루프 무결성·분기 검증 테스트 (2026-11-19).
// 출처·배율 분리 → 적합성 격리 → 사분면 기준선 무결성 → 비교 시트 정산·다음 기획 입력 환류까지 검증한다.
import assert from 'node:assert/strict';
import test from 'node:test';
import {buildVisualLibrary, pickReportTargets} from '../outlier-report.mjs';
import {formatRatioLabel, RATIO_METHOD} from '../peer-ratio.mjs';
import {renderNextEpisodeInput, summarizeOutlierReports} from '../next-episode-input.mjs';
import {buildMatrixDataset} from '../matrix-diagnosis.mjs';
import {computeBaselines} from '../baseline.mjs';
import {groupResultsByVariable, settleSheet} from '../sheet-outcomes.mjs';
import {sheetStage} from '../transform-sheet.mjs';
import {renderVisualLibraryPage} from '../outlier-report-view.mjs';

test('buildVisualLibrary: 새 방식 배수(v2)를 옛 방식·보류보다 앞에 두고 ratioMethod/ratioStatus를 보존한다', () => {
  const reports = [
    {
      videoId: 'legacy11111',
      meta: {title: '옛 영상', channelTitle: '구채널'},
      outlierRatio: 2380,
      analysis: {visualMoments: [{t: 1, what: '옛 화면', purpose: '비교'}]},
      frames: [],
    },
    {
      videoId: 'hold1111111',
      meta: {title: '보류 영상', channelTitle: '보류채널'},
      outlierRatio: null,
      ratioMethod: RATIO_METHOD,
      ratioStatus: 'hold',
      ratioReason: '표본 부족',
      analysis: {visualMoments: [{t: 2, what: '보류 화면', purpose: '비교'}]},
      frames: [],
    },
    {
      videoId: 'newv2111111',
      meta: {title: '새 방식 영상', channelTitle: '신채널'},
      outlierRatio: 12.5,
      ratioMethod: RATIO_METHOD,
      ratioStatus: 'ok',
      analysis: {teachesAdultEnglishSounds: true, visualMoments: [{t: 3, what: '새 화면', purpose: '전환'}]},
      frames: [],
    },
  ];
  const lib = buildVisualLibrary(reports);
  assert.deepEqual(lib.map((e) => e.videoId), ['newv2111111', 'legacy11111', 'hold1111111']);
  assert.equal(formatRatioLabel(lib[0]), '12.5배');
  assert.equal(formatRatioLabel(lib[1]), '옛 방식 2380배(참고용)');
  assert.equal(formatRatioLabel(lib[2]), '판정 보류');

  const html = renderVisualLibraryPage(lib);
  assert.ok(html.includes('평소의 12.5배'), '연출 자료집 화면이 v2 배수를 옛 방식으로 오표시하지 않는다');
  assert.ok(html.includes('옛 방식 2380배(참고용)'));
  assert.ok(html.includes('판정 보류'));
});

test('pickReportTargets: v2 배수를 옛 방식보다 먼저 고르고 중복 영상에서 옛 방식이 v2를 덮어쓰지 않는다', () => {
  const marketDemand = {
    byKeyword: [{
      keyword: '영어 발음',
      topOutliers: [
        {videoId: 'legacyBig11', title: '영어 발음 옛날', outlierRatio: 547.3},
        {videoId: 'sameVid1111', title: '영어 발음 중복', outlierRatio: 999},
        {videoId: 'holdVid1111', title: '영어 발음 보류', outlierRatio: null, ratioMethod: RATIO_METHOD, ratioStatus: 'hold'},
      ],
    }],
    trackedChannels: [{
      status: 'candidate',
      topOutliers: [
        {videoId: 'sameVid1111', title: '영어 발음 중복', outlierRatio: 15.2, ratioMethod: RATIO_METHOD, ratioStatus: 'ok'},
        {videoId: 'v2Top111111', title: '영어 발음 v2 1위', outlierRatio: 32.8, ratioMethod: RATIO_METHOD, ratioStatus: 'ok'},
      ],
    }],
  };
  const targets = pickReportTargets({marketDemand, limit: 10});
  assert.deepEqual(targets, ['v2Top111111', 'sameVid1111', 'legacyBig11', 'holdVid1111']);
});

test('summarizeOutlierReports: 성인 영어 소리 아님(false)은 제외하고 true·미판정(null/없음)만 남긴다', () => {
  const reports = [
    {videoId: 'nonAdult111', meta: {title: '무관 단어장', channelTitle: 'A'}, outlierRatio: 366.5, ratioMethod: RATIO_METHOD, ratioStatus: 'ok', analysis: {teachesAdultEnglishSounds: false}},
    {videoId: 'adultOk1111', meta: {title: '발음 원리', channelTitle: 'B'}, outlierRatio: 155.1, ratioMethod: RATIO_METHOD, ratioStatus: 'ok', analysis: {teachesAdultEnglishSounds: true}},
    {videoId: 'legacyNull1', meta: {title: '옛 리포트', channelTitle: 'C'}, outlierRatio: 50, analysis: {}},
  ];
  const got = summarizeOutlierReports(reports, 5);
  assert.deepEqual(got.map((r) => r.videoId), ['adultOk1111', 'legacyNull1']);
});

test('matrix-diagnosis: 빈 데이터에서 임의 대신값(5.5·42·70·50)을 만들지 않고 null을 돌려준다', () => {
  const empty = buildMatrixDataset({recentVideos: [], videoPerformance: [], videoReachManual: {videos: {}}, trafficSources: []});
  assert.equal(empty.thresholds.ctrThreshold, null);
  assert.equal(empty.thresholds.ctrThresholdLong, null);
  assert.equal(empty.thresholds.ctrThresholdShorts, null);
  assert.equal(empty.thresholds.retentionThresholdLong, null);
  assert.equal(empty.thresholds.retentionThresholdShorts, null);
  assert.equal(empty.averages.avgCtrLong, null);
  assert.equal(empty.averages.avgCtrShorts, null);
  assert.equal(empty.averages.avgRetLong, null);
  assert.equal(empty.averages.avgRetShorts, null);
  assert.equal(empty.trafficHealth.browseAndSuggestedRatio, null);
});

test('matrix-diagnosis: 쇼츠 CTR은 롱폼 평균이 아니라 쇼츠 자체 평균으로 판정한다', () => {
  const pubOld = '2026-10-01T00:00:00Z';
  const res = buildMatrixDataset({
    recentVideos: [
      {videoId: 'L1', title: '롱폼 1', format: 'LONGFORM', durationSeconds: 300, publishedAt: pubOld},
      {videoId: 'S1', title: '쇼츠 1', format: 'SHORTS', durationSeconds: 45, publishedAt: pubOld},
      {videoId: 'S2', title: '쇼츠 2', format: 'SHORTS', durationSeconds: 45, publishedAt: pubOld},
    ],
    videoPerformance: [
      {video: 'L1', views: 200, averageViewPercentage: 30},
      {video: 'S1', views: 500, averageViewPercentage: 80},
      {video: 'S2', views: 500, averageViewPercentage: 80},
    ],
    videoReachManual: {
      videos: {
        L1: {windows: {'28d': {ctr: 2.0, impressions: 1000}}},
        S1: {windows: {'28d': {ctr: 6.0, impressions: 1000}}},
        S2: {windows: {'28d': {ctr: 3.0, impressions: 1000}}},
      },
    },
  });
  assert.equal(res.thresholds.ctrThresholdLong, 2.0);
  assert.equal(res.thresholds.ctrThresholdShorts, 4.5);
  const s2 = res.videos.find((v) => v.videoId === 'S2');
  assert.equal(s2.quadrant, 'Q3', '쇼츠 S2(CTR 3.0%)는 롱폼 기준(2.0%)이 아닌 쇼츠 기준(4.5%) 미만이라 Q3여야 한다');
  assert.equal(s2.isVerified, true);
});

test('루프 환류: approved 시트가 정산되면 published·outcome·measured로 전환되고 다음 기획 입력에 반영된다', () => {
  const video = (id) => ({videoId: id, title: `t-${id}`, publishedAt: '2026-01-01T00:00:00Z', format: 'SHORTS', durationSeconds: 50});
  const ids = ['s0', 's1', 's2', 's3', 's4'];
  const baselines = computeBaselines({
    catalog: ids.map(video),
    views7d: Object.fromEntries(ids.map((id, i) => [id, {views7d: [100, 200, 300, 400, 1000][i]}])),
    lifetime: Object.fromEntries(ids.map((id, i) => [id, {first7d: {views: [100, 200, 300, 400, 1000][i], averageViewDuration: 15, subscribersGained: 1}}])),
  });
  const approvedSheet = {
    sourceVideoId: 'SbQVBQoRciA',
    topic: '초콜릿 발음',
    status: 'approved',
    format: 'SHORTS',
    testVariables: [{variable: '장면 안 움직임', hypothesis: 'h', measure: '조회수'}],
    borrowed: [{fromVideoId: 'BBBBBBBBBBB', what: '3초 훅', reason: 'r', evidence: 'e'}],
    rejected: [],
  };
  const {sheet: settled, changed} = settleSheet({
    sheet: approvedSheet,
    videoId: 'Ng6amm9qFrI',
    format: 'SHORTS',
    metrics: {views7d: 1400, watchSeconds7d: 25, subs7d: 3},
    baselines,
    video: {publishedAt: '2026-11-18T11:00:00Z', durationSeconds: 72},
    now: new Date('2026-11-26T00:00:00Z'),
  });
  assert.equal(changed, true);
  assert.equal(settled.status, 'published');
  assert.equal(settled.publishedVideoId, 'Ng6amm9qFrI');
  assert.equal(settled.outcome.views7d, 1400);
  assert.equal(sheetStage(settled), 'measured');

  const variableGroups = groupResultsByVariable([settled]);
  assert.equal(variableGroups.length, 1);
  assert.equal(variableGroups[0].variable, '장면 안 움직임');

  const md = renderNextEpisodeInput({
    generatedAt: '2026-11-26T00:00:00Z',
    baselines,
    variableGroups,
    transformSheets: [{
      sourceVideoId: settled.sourceVideoId,
      topic: settled.topic,
      status: settled.status,
      stage: sheetStage(settled),
      resultsCount: settled.results.length,
      format: settled.format,
      borrowedCount: settled.borrowed.length,
      rejectedCount: settled.rejected.length,
    }],
  });
  assert.ok(md.includes('성적 측정(1편)'), '다음 기획 입력 8절에 정산된 시트 상태가 표시된다');
  assert.ok(md.includes('장면 안 움직임'), '다음 기획 입력 9절에 시험 변수 묶음이 환류된다');
});
