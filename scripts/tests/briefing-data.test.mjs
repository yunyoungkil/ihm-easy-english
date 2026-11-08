// 시작 브리핑 개편(2026-11-09 사용자 결정)의 숫자 재료 계산을 확인한다.
// 브리핑 줄: 제목(스킬·동기화) / 최근 7일(지난주 대비) / 최근 공개 성적 / 쇼츠→롱폼 / 다음 공개(48시간·실패) / 할 일(새 댓글) / 남은 수리
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildBriefingContext,
  needsSync,
  newViewerComments,
  recentPublished,
  shortsLinkLive,
  shortsToLongform,
  upcomingPublishes,
  weeklyComparison,
} from '../growth-rules.mjs';

const NOW = new Date('2026-11-09T12:00:00+09:00');
const day = (d, views, subs = 0, lost = 0) => ({day: d, views, subscribersGained: subs, subscribersLost: lost});

test('최근 7일과 그 전 7일을 비교한다', () => {
  const daily = [];
  for (let i = 1; i <= 14; i += 1) daily.push(day(new Date(Date.UTC(2026, 9, 21 + i)).toISOString().slice(0, 10), i <= 7 ? 10 : 5, i === 14 ? 1 : 0));
  const result = weeklyComparison(daily);
  assert.equal(result.current.views, 35);
  assert.equal(result.previous.views, 70);
  assert.equal(result.deltaViews, -35);
  assert.equal(result.current.subsNet, 1);
  assert.equal(result.current.start, '2026-10-29');
  assert.equal(result.current.end, '2026-11-04');
});

test('날짜가 7일보다 적으면 비교하지 않는다', () => {
  assert.equal(weeklyComparison([day('2026-11-01', 3)]), null);
});

test('최근 7일 안에 공개된 영상만 성적과 함께 고른다', () => {
  const videos = [
    {videoId: 'a', title: '롱폼 A', format: 'LONGFORM', privacyStatus: 'public', publishedAt: '2026-11-06T14:00:00Z'},
    {videoId: 'b', title: '예전 영상', format: 'SHORTS', privacyStatus: 'public', publishedAt: '2026-10-01T14:00:00Z'},
    {videoId: 'c', title: '예약 영상', format: 'LONGFORM', privacyStatus: 'private', publishedAt: '2026-11-05T14:00:00Z'},
  ];
  const perf = [{video: 'a', views: 40, averageViewPercentage: 38.4}];
  const result = recentPublished(videos, perf, NOW);
  assert.deepEqual(result.map((v) => v.title), ['롱폼 A']);
  assert.equal(result[0].daysSince, 2);
  assert.equal(result[0].views, 40);
  assert.equal(result[0].avgViewPct, 38.4);
});

test('통계가 아직 없는 새 영상은 성적을 비워 둔다', () => {
  const videos = [{videoId: 'a', title: '새 영상', format: 'SHORTS', privacyStatus: 'public', publishedAt: '2026-11-09T01:00:00Z'}];
  assert.equal(recentPublished(videos, [], NOW)[0].views, null);
});

test('관련 동영상을 단 쇼츠가 공개되고 하루가 지나야 쇼츠→롱폼 줄을 연다', () => {
  assert.equal(shortsLinkLive([{status: 'scheduled', scheduledFor: '2026-11-10T11:00:00Z'}], NOW), false);
  assert.equal(shortsLinkLive([{status: 'scheduled', scheduledFor: '2026-11-08T11:00:00Z'}], NOW), false);
  assert.equal(shortsLinkLive([{status: 'scheduled', scheduledFor: '2026-11-07T11:00:00Z'}], NOW), true);
  assert.equal(shortsLinkLive([{status: 'published', publishedAt: '2026-11-09T02:00:00Z'}], NOW), false);
  assert.equal(shortsLinkLive([{status: 'published', publishedAt: '2026-11-07T02:00:00Z'}], NOW), true);
  assert.equal(shortsLinkLive([], NOW), false);
});

test('유입 경로에서 쇼츠 피드 조회와 쇼츠 링크로 넘어온 조회를 꺼낸다', () => {
  const rows = [
    {insightTrafficSourceType: 'SHORTS', views: 900},
    {insightTrafficSourceType: 'SHORTS_CONTENT_LINKS', views: 7},
    {insightTrafficSourceType: 'YT_SEARCH', views: 3},
  ];
  assert.deepEqual(shortsToLongform(rows), {shortsViews: 900, linkViews: 7});
  assert.deepEqual(shortsToLongform([]), {shortsViews: 0, linkViews: 0});
});

test('48시간 안에 공개될 영상과 업로드 실패만 고른다', () => {
  const items = [
    {name: 'ep24-shorts', status: 'scheduled', scheduledFor: '2026-11-10T11:00:00Z'},
    {name: 'ep26', status: 'ready_to_upload', scheduledFor: '2026-11-16T14:00:00Z'},
    {name: 'ep25', status: 'scheduled', scheduledFor: '2026-11-12T14:00:00Z'},
    {name: 'ep27', status: 'upload_failed'},
    {name: 'old', status: 'scheduled', scheduledFor: '2026-11-08T14:00:00Z'},
  ];
  const result = upcomingPublishes(items, NOW);
  assert.deepEqual(result.soon.map((x) => x.name), ['ep24-shorts']);
  assert.deepEqual(result.failed.map((x) => x.name), ['ep27']);
});

test('최근 7일 시청자 댓글만 세고, 답이 없는 것을 따로 센다', () => {
  const comments = {
    v1: [
      {publishedAt: '2026-11-08T01:00:00Z', isChannelOwner: false, replyCount: 0},
      {publishedAt: '2026-11-07T01:00:00Z', isChannelOwner: false, replyCount: 2},
      {publishedAt: '2026-11-07T01:00:00Z', isChannelOwner: true, replyCount: 0},
      {publishedAt: '2026-10-01T01:00:00Z', isChannelOwner: false, replyCount: 0},
    ],
  };
  assert.deepEqual(newViewerComments(comments, NOW), {count: 2, unanswered: 1});
});

test('답 수를 아직 모르면(옛 동기화 자료) 답 없는 댓글 수는 null', () => {
  const comments = {v1: [{publishedAt: '2026-11-08T01:00:00Z', isChannelOwner: false}]};
  assert.deepEqual(newViewerComments(comments, NOW), {count: 1, unanswered: null});
});

test('마지막 동기화가 12시간보다 오래됐거나 기록이 없으면 다시 동기화한다', () => {
  assert.equal(needsSync('2026-11-09T02:00:00+09:00', NOW), false);
  assert.equal(needsSync('2026-11-08T23:00:00+09:00', NOW), true);
  assert.equal(needsSync(null, NOW), true);
});

test('브리핑 재료가 있으면 줄마다 넣고, 조건이 맞지 않는 줄은 빼라고 안내한다', () => {
  const check = {
    generatedFor: '2026-11-09',
    backlog: [],
    cadence: {long14: 1, shorts14: 0, verdict: ''},
    reviewsDue: [],
    formatPriority: {verdict: '쇼츠부터'},
    sample: {median: 94, small: true},
    briefing: {
      data: {syncedAt: '2026-11-09T09:00:00+09:00', statsEnd: '2026-11-07', sync: '방금 동기화함'},
      weekly: {current: {start: '2026-11-01', end: '2026-11-07', views: 35, subsNet: 0}, previous: {views: 23, subsNet: 0}, deltaViews: 12},
      recent: [{title: 'EP24 롱폼', format: 'LONGFORM', daysSince: 2, views: 40, avgViewPct: 38.4}],
      shortsLink: null,
      upcoming: {soon: [{name: 'ep25-pool-pull', scheduledFor: '2026-11-12T14:00:00Z'}], failed: []},
      comments: {count: 3, unanswered: 2},
    },
  };
  const context = buildBriefingContext(check, []);
  assert.match(context, /episode-planning 0-C/);
  assert.match(context, /최근 7일: 조회 35회 \(지난주 23회, \+12\)/);
  assert.match(context, /EP24 롱폼/);
  assert.match(context, /ep25-pool-pull/);
  assert.match(context, /새 시청자 댓글 3개 \(답 없음 2개\)/);
  assert.match(context, /쇼츠→롱폼: 아직 줄을 쓰지 않는다/);
  assert.doesNotMatch(context, /형식 배분/);
});

test('쇼츠→롱폼 줄을 열 때인데 7일 유입 자료가 없으면 0 대신 자료 없음이라고 적는다', () => {
  const check = {generatedFor: '2026-11-11', backlog: [], reviewsDue: [], formatPriority: {}, sample: {}, briefing: {data: {}, weekly: null, recent: [], shortsLink: {missing: true}, upcoming: {soon: [], failed: []}}};
  const context = buildBriefingContext(check, []);
  assert.match(context, /최근 7일 유입 자료가 없다/);
  assert.doesNotMatch(context, /쇼츠 피드 조회 0회/);
});
