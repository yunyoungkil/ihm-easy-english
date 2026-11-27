import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdir, mkdtemp, rm, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';

import {
  QUEUE_LOW,
  SIGNAL_CHECK_DAYS,
  loadBlogStatus,
  summarizeBlogStatus,
} from '../blog/blog-status.mjs';
import {buildBriefingContext} from '../growth-rules.mjs';

async function withTempProject(fn) {
  const dir = await mkdtemp(path.join(tmpdir(), 'blog-status-'));
  const blogDir = path.join(dir, 'data', 'blog');
  await mkdir(blogDir, {recursive: true});
  try {
    await fn(dir, blogDir);
  } finally {
    await rm(dir, {recursive: true, force: true});
  }
}

test('상수 기준값이 설계와 일치한다', () => {
  assert.equal(QUEUE_LOW, 6);
  assert.equal(SIGNAL_CHECK_DAYS, 7);
});

test('운영 데이터가 전혀 없으면 summarizeBlogStatus와 loadBlogStatus 모두 null을 반환한다', async () => {
  assert.equal(summarizeBlogStatus({}), null);
  assert.equal(
    summarizeBlogStatus({runs: [], posts: [], queue: null, pause: {paused: false}, signalChecks: []}),
    null,
  );

  await withTempProject(async (dir, blogDir) => {
    // blogs.json만 있는 상태는 아직 운영 시작 전으로 취급한다.
    await writeFile(
      path.join(blogDir, 'blogs.json'),
      JSON.stringify({tech: {blogId: '6595948324958151051'}}),
      'utf8',
    );
    assert.equal(loadBlogStatus(dir, {now: new Date('2026-11-25T05:00:00Z')}), null);
  });
});

test('since 이후 published 2건·deferred 1건, 대기열 5개, 멈춤, 8일 전 점검을 요약한다', () => {
  const now = new Date('2026-11-25T05:00:00Z'); // KST 2026-11-25 14:00
  const since = '2026-11-20T00:00:00Z';
  const line = summarizeBlogStatus({
    since,
    now,
    runs: [
      {date: '2026-11-18', startedAt: '2026-11-18T17:00:00Z', outcome: 'published', topicId: 'old-1'},
      {date: '2026-11-21', startedAt: '2026-11-20T17:00:00Z', outcome: 'published', topicId: 't-1'},
      {date: '2026-11-23', startedAt: '2026-11-22T17:00:00Z', outcome: 'deferred', topicId: 't-2'},
      {date: '2026-11-25', startedAt: '2026-11-24T17:00:00Z', outcome: 'published', topicId: 't-3'},
    ],
    posts: [],
    queue: Array.from({length: 5}, (_, i) => ({topicId: `q-${i}`})),
    pause: {paused: true, since: '2026-11-25T01:00:00Z', reason: '점검 실패 3회 연속'},
    signalChecks: [
      {date: '2026-11-17', searchConsole: 'ok', adsense: 'ok', coupang: 'ok', note: '이상 없음'},
    ],
  });

  assert.equal(typeof line, 'string');
  assert.match(line, /올린 글 2편/);
  assert.match(line, /건너뜀 1번\(링크 없음\)/);
  assert.match(line, /대기열 5개/);
  assert.match(line, /주제 보충 필요/);
  assert.match(line, /검색량 미확인 5개/); // 2026-11-27: 실제 검색 수를 안 잰 주제 알림
  assert.match(line, /멈춤\(점검 실패 3회 연속\) — 다시 켜기는 사용자 승인/);
  assert.match(line, /경고 화면 점검 필요/);
});

test('대기열 6개 이상이고 최근 7일 내 정상 점검이 있으면 보충·점검 필요 경고를 넣지 않는다', () => {
  const now = new Date('2026-11-25T05:00:00Z');
  const line = summarizeBlogStatus({
    since: '2026-11-22T00:00:00Z',
    now,
    runs: [
      {date: '2026-11-24', startedAt: '2026-11-23T17:00:00Z', outcome: 'rejected', topicId: 't-1'},
      {date: '2026-11-24', startedAt: '2026-11-23T18:00:00Z', outcome: 'writer-failed', topicId: 't-2'},
      {date: '2026-11-25', startedAt: '2026-11-24T17:00:00Z', outcome: 'auth-failed', topicId: 't-3'},
      {date: '2026-11-25', startedAt: '2026-11-24T18:00:00Z', outcome: 'image-deferred', topicId: 't-3'},
    ],
    posts: [],
    queue: Array.from({length: 6}, (_, i) => ({topicId: `q-${i}`})),
    pause: {paused: false},
    signalChecks: [
      {date: '2026-11-23', searchConsole: 'ok', adsense: 'ok', coupang: 'ok', note: ''},
    ],
  });

  assert.match(line, /점검 실패 1번/);
  assert.match(line, /실행 실패 1번/);
  assert.match(line, /인증 실패 1번/);
  assert.match(line, /그림 때문에 미룸 1번/);
  assert.match(line, /대기열 6개/);
  assert.doesNotMatch(line, /주제 보충 필요/);
  assert.doesNotMatch(line, /경고 화면 점검 필요/);
  assert.doesNotMatch(line, /멈춤\(/);
});

test('주간 경고 점검에서 warning이 있으면 어느 화면인지 알린다', () => {
  const now = new Date('2026-11-25T05:00:00Z');
  const line = summarizeBlogStatus({
    now,
    runs: [],
    posts: [],
    queue: Array.from({length: 8}, (_, i) => ({topicId: `q-${i}`})),
    pause: {paused: false},
    signalChecks: [
      {date: '2026-11-24', searchConsole: 'ok', adsense: 'warning', coupang: 'ok', note: '정책 확인'},
    ],
  });

  assert.match(line, /경고/);
  assert.match(line, /애드센스/);
  assert.doesNotMatch(line, /경고 화면 점검 필요/);
});

test('loadBlogStatus는 data/blog 실제 파일들을 읽어 요약을 반환한다', async () => {
  await withTempProject(async (dir, blogDir) => {
    await writeFile(
      path.join(blogDir, 'tech-runs.json'),
      JSON.stringify([
        {date: '2026-11-24', startedAt: '2026-11-23T17:00:00Z', outcome: 'published', topicId: 'a'},
        {date: '2026-11-25', startedAt: '2026-11-24T17:00:00Z', outcome: 'deferred', topicId: 'b'},
      ]),
      'utf8',
    );
    await writeFile(
      path.join(blogDir, 'tech-queue.json'),
      JSON.stringify([{topicId: 'c'}, {topicId: 'd'}]),
      'utf8',
    );
    await writeFile(
      path.join(blogDir, 'tech-paused.json'),
      JSON.stringify({paused: false}),
      'utf8',
    );
    await writeFile(
      path.join(blogDir, 'signal-checks.json'),
      JSON.stringify([{date: '2026-11-10', searchConsole: 'ok', adsense: 'ok', coupang: 'ok', note: ''}]),
      'utf8',
    );

    const status = loadBlogStatus(dir, {
      since: '2026-11-23T00:00:00Z',
      now: new Date('2026-11-25T05:00:00Z'),
    });
    assert.match(status, /올린 글 1편/);
    assert.match(status, /건너뜀 1번\(링크 없음\)/);
    assert.match(status, /대기열 2개/);
    assert.match(status, /주제 보충 필요/);
    assert.match(status, /경고 화면 점검 필요/);
  });
});

test('buildBriefingContext는 blogStatus가 있으면 "- 쿠팡 블로그:" 줄을 넣고 null이면 생략한다', () => {
  const baseCheck = {
    generatedFor: '2026-11-25',
    backlog: [],
    reviewsDue: [],
    formatPriority: {verdict: '없음'},
    sample: {median: null, small: true},
    briefing: {
      data: {syncedAt: '2026-11-25T00:00:00Z', statsEnd: '2026-11-24'},
      weekly: null,
      recent: [],
      loopHealth: {ok: true, lastLoopAt: '2026-11-25T00:00:00Z', problems: []},
      blogStatus: '올린 글 2편, 대기열 5개(주제 보충 필요)',
    },
  };

  const withBlog = buildBriefingContext(baseCheck);
  assert.match(withBlog, /- 쿠팡 블로그: 올린 글 2편, 대기열 5개\(주제 보충 필요\)/);

  const withoutBlog = buildBriefingContext({
    ...baseCheck,
    briefing: {...baseCheck.briefing, blogStatus: null},
  });
  assert.doesNotMatch(withoutBlog, /쿠팡 블로그/);
});

test('서치 콘솔 수집본이 있으면 색인·노출·클릭을 그대로 보여 준다(2026-11-27)', () => {
  const line = summarizeBlogStatus({
    runs: [], posts: [{topicId: 'a'}], queue: Array.from({length: 6}, (_, i) => ({topicId: `q-${i}`, searchVolume: {total: 1}})),
    pause: {paused: false}, signalChecks: [],
    searchConsole: {
      collectedAt: '2026-11-27T13:07:27.570Z', range: {startDate: '2026-10-31', endDate: '2026-11-27'},
      totals: {impressions: 12, clicks: 1},
      pages: [{index: {verdict: 'PASS'}}, {index: {verdict: 'NEUTRAL'}}, {index: null}],
    },
    now: new Date('2026-11-27T14:00:00Z'),
  });
  assert.match(line, /구글 색인 1\/3편 · 28일 노출 12·클릭 1\(2026-11-27 수집\)/);
  assert.doesNotMatch(line, /검색량 미확인/);
});
