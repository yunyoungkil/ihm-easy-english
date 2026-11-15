import {test} from 'node:test';
import assert from 'node:assert/strict';
import {
  LIFECYCLE_STATUS,
  isTopicAlreadyCovered,
  calculateTopicExhaustion,
  evaluateChannelLifecycle,
  runD7AutonomousCycle,
  computeGenericKeywords,
  registerBriefSourceChannels,
} from '../competitor-lifecycle.mjs';

// ---- 졸업 판정 오판 (2026-11-15 감사 D): "단어", "읽는" 같은 장르 말투가 겹쳤다고 "이미 다룬 소재"로 치면 안 된다 ----
// 아래 제목은 전부 실제 data/youtube/catalog.json(우리 영상)과 market-demand.json(본즈 기초 영어 topOutliers)에서 그대로 옮겼다.
const OUR_REAL_TITLES = [
  "이 네 단어, 한글로 쓰면 전부 '풀'입니다 #영어발음 #shorts",
  "외국인이 왜 못 알아듣나 했더니... World 할 때마다 '올드'로 굳는 이유 | 영어 단어 발음법",
  '저도 이제 안 막힙니다, 모음 뒤에 R 붙은 단어 1초 만에 읽는 법 | 영어공부 혼자하기',
  '여태 두 글자 다 읽었네요... 모음 2개 겹친 단어 소리 원리 | 파닉스 기초',
  '영어 강세 규칙, 이것만 알면 끝 | -TION 단어 읽는 법 (영어기초배우기 EP6)',
  '왜 HEROIC은 히로익일까? 영어 읽는 법 30초 테스트 #영어기초 #영어읽는법',
  '영어 읽는 법 | HEROIC은 왜 히로익일까? -IC만 알면 끝! (영어기초배우기 EP5)',
  '영어 읽기 실력, 연습 01 - 6개 단어 스피드 테스트 ⏱️ #영어공부 #챌린지 #쇼츠 #파닉스',
  '왜 영어 단어는 마지막 E를 무음으로 만들까? (영어 읽는 법, 성인 파닉스) #파닉스규칙,#영어단어읽는법,#영어공부법,#영어기초발음,#영어발음,#영어공부',
  '왜 C도 K도 크 소리일까요? #영어기초 #영어기초배우기 #영어읽는법 #파닉스 #영어공부 #성인영어 #기초영어 #영어발음',
];
const BONZ_REAL_OUTLIERS = [
  '왕초보 영단어 수업 / 기초 영어 읽는 법 / 필수 영어 단어 / 파닉스',
  '영어 까막눈 탈출 / 기초 영어 읽는 법 / 여행 영어 단어',
  '왕초보 필수 영어 단어 / 쉽게 읽는 법 / 기초 파닉스',
  '생활 필수 영어 단어 배우기 / 영어 단어 읽는 법 / 기초 파닉스',
  '왕초보 영어 단어 / 영단어 읽는 법 / 필수 영단어 읽기 ~~',
].map((title) => ({title}));

test('computeGenericKeywords: 우리 영상 제목에 여러 편 나오는 말은 소재가 아니라 장르 말투로 본다', () => {
  const generic = computeGenericKeywords(OUR_REAL_TITLES);
  assert.ok(generic.has('단어'), '단어는 우리 제목 6편에 나온다');
  assert.ok(generic.has('읽는'), '읽는은 우리 제목 5편에 나온다');
  assert.ok(!generic.has('r'), '소리 타겟 알파벳 한 글자는 장르 말투로 치지 않는다');
  // 카탈로그가 작으면(테스트처럼 2편) 아무것도 흔한 말로 치지 않는다.
  assert.equal(computeGenericKeywords(['F vs P 24쌍', 'F vs P 소리']).size, 0);
});

test('calculateTopicExhaustion: 본즈 기초 영어의 실제 아웃라이어 5편은 "단어·읽는" 겹침만으로 소진 처리되지 않는다', () => {
  const r = calculateTopicExhaustion({topOutliers: BONZ_REAL_OUTLIERS}, OUR_REAL_TITLES);
  assert.equal(r.coveredCount, 0); // 고치기 전에는 3편이 "이미 다룬 소재"로 잘못 잡혔다
  assert.equal(r.uncoveredCount, 5);
});

test('isTopicAlreadyCovered: 핵심 소재 단어가 실제로 겹치는 제목은 계속 "이미 다룬 소재"로 잡는다', () => {
  assert.equal(isTopicAlreadyCovered('모음 뒤에 R 붙은 단어 읽는 법', OUR_REAL_TITLES), true);
  assert.equal(isTopicAlreadyCovered('HEROIC 히로익 -IC 읽는 법', OUR_REAL_TITLES), true);
  assert.equal(isTopicAlreadyCovered('영어 단어 읽는 법', OUR_REAL_TITLES), false);
});

test('evaluateChannelLifecycle: 일반 단어만 겹치는 채널은 명예 졸업하지 않는다', () => {
  const channel = {status: LIFECYCLE_STATUS.CANDIDATE, topOutliers: BONZ_REAL_OUTLIERS};
  const r = evaluateChannelLifecycle({channel, ourCatalogTitles: OUR_REAL_TITLES, now: new Date('2026-11-15T00:00:00Z')});
  assert.notEqual(r.status, LIFECYCLE_STATUS.GRADUATED);
  assert.equal(r.exhaustion.coveredCount, 0);
});

// ---- BRIEF "기획 근거"가 인용한 경쟁 채널을 판정 대상에 연결 (2026-11-15 감사 D) ----
// 칸 이름은 실제 data/youtube/outlier-reports/SbQVBQoRciA.json 의 meta.channelId, meta.channelTitle, subscriberCount 와 같다.
const ch = (id, over = {}) => ({channelId: id, channelTitle: id, status: LIFECYCLE_STATUS.CANDIDATE, topOutliers: [{title: '아직 안 다룬 소재 ' + id}], ...over});
const brief = (over = {}) => ({
  label: 'EP30 쇼츠', slug: 'ep30-shorts-chocolate',
  sources: {competitors: [{channelTitle: '조밥잉글리쉬', channelId: 'UCV10iJPWgMrwnbyImNftcAA', videoId: 'SbQVBQoRciA', sourceRatio: 570}]},
  ...over,
});
const report = (over = {}) => ({
  videoId: 'SbQVBQoRciA', subscriberCount: 4730,
  meta: {videoId: 'SbQVBQoRciA', channelId: 'UCV10iJPWgMrwnbyImNftcAA', channelTitle: '조밥잉글리쉬 '},
  ...over,
});
const NOW_REG = new Date('2026-11-15T00:00:00Z');

test('registerBriefSourceChannels: 판정 대상에 없는 인용 채널을 리포트의 채널 정보로 candidate 등록한다', () => {
  const r = registerBriefSourceChannels({trackedChannels: [ch('UC_other')], plannedSources: [brief()], outlierReports: [report()], now: NOW_REG});
  assert.equal(r.trackedChannels.length, 2);
  const added = r.trackedChannels.find((c) => c.channelId === 'UCV10iJPWgMrwnbyImNftcAA');
  assert.equal(added.status, LIFECYCLE_STATUS.CANDIDATE);
  assert.equal(added.channelTitle, '조밥잉글리쉬'); // 리포트 값의 앞뒤 공백은 지운다
  assert.equal(added.subscriberCount, 4730);
  assert.equal(added.channelUrl, 'https://www.youtube.com/channel/UCV10iJPWgMrwnbyImNftcAA');
  assert.equal(added.consecutiveFailures, 0);
  assert.equal(added.blockedUntil, null);
  assert.deepEqual(added.topOutliers, []); // 아웃라이어는 다음 채널 수집이 채운다. 지어내지 않는다.
  assert.match(added.statusReason, /EP30 쇼츠/);
  assert.deepEqual(r.registered, ['UCV10iJPWgMrwnbyImNftcAA']);
  assert.deepEqual(r.unregistered, []);
});

test('registerBriefSourceChannels: 이미 있는 채널은 다시 넣지 않고(중복 방지), 같은 채널을 두 편이 인용해도 한 번만 넣는다', () => {
  const existing = [ch('UCV10iJPWgMrwnbyImNftcAA', {status: LIFECYCLE_STATUS.GOLD_MINE})];
  const again = registerBriefSourceChannels({trackedChannels: existing, plannedSources: [brief()], outlierReports: [report()], now: NOW_REG});
  assert.equal(again.trackedChannels.length, 1);
  assert.equal(again.trackedChannels[0].status, LIFECYCLE_STATUS.GOLD_MINE); // 기존 상태를 건드리지 않는다
  assert.deepEqual(again.registered, []);

  const twice = registerBriefSourceChannels({
    trackedChannels: [], plannedSources: [brief(), brief({label: 'EP31 쇼츠', slug: 'ep31'})], outlierReports: [report()], now: NOW_REG,
  });
  assert.equal(twice.trackedChannels.length, 1);
  assert.deepEqual(twice.registered, ['UCV10iJPWgMrwnbyImNftcAA']);
});

test('registerBriefSourceChannels: 채널 정보를 리포트에서 못 찾으면 등록하지 않고 이유를 남긴다', () => {
  const r = registerBriefSourceChannels({trackedChannels: [], plannedSources: [brief()], outlierReports: [], now: NOW_REG});
  assert.equal(r.trackedChannels.length, 0);
  assert.deepEqual(r.registered, []);
  assert.equal(r.unregistered.length, 1);
  assert.equal(r.unregistered[0].channelId, 'UCV10iJPWgMrwnbyImNftcAA');
  assert.match(r.unregistered[0].reason, /리포트/);
});

test('registerBriefSourceChannels: 기획 근거가 없거나(null) 경쟁 영상 줄이 없는 편은 건너뛴다', () => {
  const r = registerBriefSourceChannels({
    trackedChannels: [], plannedSources: [{label: 'EP1', slug: 'ep1', sources: null}, {label: 'EP2', slug: 'ep2', sources: {competitors: []}}, null],
    outlierReports: [report()], now: NOW_REG,
  });
  assert.equal(r.trackedChannels.length, 0);
  assert.deepEqual(r.registered, []);
  assert.deepEqual(r.unregistered, []);
});

test('runD7AutonomousCycle: 기획 근거 채널을 등록하고 결과(registeredChannels, unregisteredChannels)를 남긴다', () => {
  const r = runD7AutonomousCycle({
    marketDemandData: {trackedChannels: [ch('UC_A')], byKeyword: []},
    episodeOutcomes: [], catalogVideos: [], now: NOW_REG,
    plannedSources: [
      brief(),
      brief({label: 'EP31 쇼츠', slug: 'ep31', sources: {competitors: [{channelTitle: '정보 없는 채널', channelId: 'UC_missing_info_000000', videoId: 'zzzzzzzzzzz', sourceRatio: 9}]}}),
    ],
    outlierReports: [report()],
  });
  assert.deepEqual(r.registeredChannels, ['UCV10iJPWgMrwnbyImNftcAA']);
  assert.equal(r.unregisteredChannels.length, 1);
  assert.equal(r.unregisteredChannels[0].channelId, 'UC_missing_info_000000');
  assert.ok(r.marketDemandData.trackedChannels.some((c) => c.channelId === 'UCV10iJPWgMrwnbyImNftcAA' && c.status === LIFECYCLE_STATUS.CANDIDATE));
  assert.deepEqual(r.marketDemandData.d7AutonomousCycle.registeredChannels, ['UCV10iJPWgMrwnbyImNftcAA']);
  assert.equal(r.marketDemandData.d7AutonomousCycle.unregisteredChannels[0].channelId, 'UC_missing_info_000000');
  // 두 번째 순환에서는 중복 등록하지 않는다.
  const again = runD7AutonomousCycle({
    marketDemandData: r.marketDemandData, episodeOutcomes: [], catalogVideos: [], now: NOW_REG,
    plannedSources: [brief()], outlierReports: [report()],
  });
  assert.equal(again.marketDemandData.trackedChannels.filter((c) => c.channelId === 'UCV10iJPWgMrwnbyImNftcAA').length, 1);
  assert.deepEqual(again.registeredChannels, []);
});

test('runD7AutonomousCycle: 이미 공개된 편의 근거 채널도 판정 전에 등록되어 그 판정이 반영된다', () => {
  const published = {
    label: 'EP30', videoId: 'v30', verdict: 'worked', ratio: 1.8, ageDays: 8, reason: '같은 형식 중앙값 대비 1.8배',
    sources: {topic: 't', competitors: [{channelTitle: '조밥잉글리쉬', channelId: 'UCV10iJPWgMrwnbyImNftcAA', videoId: 'SbQVBQoRciA', sourceRatio: 570}], audience: null},
  };
  const r = runD7AutonomousCycle({
    marketDemandData: {trackedChannels: [], byKeyword: []},
    episodeOutcomes: [published], catalogVideos: [], now: NOW_REG, outlierReports: [report()],
  });
  const c = r.marketDemandData.trackedChannels[0];
  assert.equal(c.channelId, 'UCV10iJPWgMrwnbyImNftcAA');
  assert.equal(c.consecutiveSuccesses, 1);
});

// 실제 파일로 확인: BRIEF가 인용한 채널은 판정 대상에 들어가거나, 못 들어갔다면 이유가 남는다(조용히 빠지지 않는다).
test('실제 BRIEF·리포트·market-demand.json: 인용된 모든 경쟁 채널이 등록되거나 이유가 남는다', async () => {
  const {readFileSync} = await import('node:fs');
  const {fileURLToPath} = await import('node:url');
  const {dirname, join} = await import('node:path');
  const {loadPlannedSources, loadOutlierReportChannels} = await import('../competitor-lifecycle.mjs');
  const projectDir = dirname(dirname(dirname(fileURLToPath(import.meta.url))));
  const planned = loadPlannedSources(projectDir);
  const reports = loadOutlierReportChannels(projectDir);
  const md = JSON.parse(readFileSync(join(projectDir, 'data', 'youtube', 'market-demand.json'), 'utf8'));
  assert.ok(planned.length > 0, 'BRIEF 기획 근거에 경쟁 영상 줄이 있는 편이 한 편 이상 있어야 한다');
  assert.ok(reports.length > 0);
  const r = registerBriefSourceChannels({trackedChannels: md.trackedChannels, plannedSources: planned, outlierReports: reports, now: new Date('2026-11-15T00:00:00Z')});
  const cited = new Set(planned.flatMap((p) => p.sources.competitors.map((c) => c.channelId)));
  const tracked = new Set(r.trackedChannels.map((c) => c.channelId));
  const unreg = new Set(r.unregistered.map((u) => u.channelId));
  for (const id of cited) assert.ok(tracked.has(id) || unreg.has(id), `${id} 가 등록도 이유 기록도 안 됐다`);
  // 다시 돌려도 중복 등록이 없다.
  const again = registerBriefSourceChannels({trackedChannels: r.trackedChannels, plannedSources: planned, outlierReports: reports, now: new Date('2026-11-15T00:00:00Z')});
  assert.deepEqual(again.registered, []);
  assert.equal(again.trackedChannels.length, r.trackedChannels.length);
});
