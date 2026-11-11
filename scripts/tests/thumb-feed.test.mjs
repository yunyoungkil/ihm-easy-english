import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pickSearchQueries, rankWinners, insertOurThumbnail, fetchSearchFeed, isShortDuration} from '../thumb-feed.mjs';

test('검색어: 짝 단어(영어 두 단어)가 든 태그를 먼저, 흔한 태그와 채널 이름은 뒤로·빼기', () => {
  const tags = ['영어발음', '영어듣기', 'R발음', 'RL구분', 'Right Light', 'Pray Play', 'right light 발음', '영어 발음 꿀팁', '이해하면 쉬운영어'];
  const got = pickSearchQueries(tags);
  // 영어 단어만 있는 검색어("very berry")는 노래·애니가 섞여 나온다(2026-11-11 실측) — 학습 낱말이 붙은 태그가 먼저
  assert.deepEqual(got.slice(0, 4), ['right light 발음', 'R발음', 'RL구분', 'Right Light']);
  assert.ok(!got.includes('이해하면 쉬운영어'));
  assert.ok(got.length <= 5);
});

test('검색어: 태그가 없으면 제목 앞부분을 쓴다', () => {
  assert.deepEqual(pickSearchQueries([], 'Pool과 Pull, 둘 다 풀로 읽으셨나요? | 영어 모음'), ['Pool과 Pull, 둘 다 풀로 읽으셨나요?']);
});

test('쇼츠 길이 판정은 3분 이하', () => {
  assert.equal(isShortDuration(180), true);
  assert.equal(isShortDuration(181), false);
});

const v = (id, views, subs, durationSeconds = 600, channelId = 'UC' + id) => ({videoId: id, views, subs, durationSeconds, channelId});

test('잘된 썸네일: 구독자 대비 조회 배수가 큰 순, 같은 형식만, 우리 채널과 구독자 비공개는 뺀다', () => {
  const got = rankWinners([v('a', 1000, 1000), v('b', 50000, 1000), v('c', 90000, 1000), v('s', 99999, 1000, 40), v('ours', 999999, 1000, 600, 'OURS'), v('hidden', 5000, null)], {format: 'LONGFORM', ourChannelId: 'OURS'});
  assert.deepEqual(got.map((x) => x.videoId), ['c', 'b', 'a']);
  assert.equal(got[0].ratio, 90);
});

test('잘된 썸네일: 구독자 1,000명 미만 채널은 뺀다(자동 음악 채널이 "8,028배"처럼 나와서, 2026-11-11 실측)', () => {
  const got = rankWinners([v('tiny', 9000, 999), v('ok', 9000, 1000)], {format: 'LONGFORM'});
  assert.deepEqual(got.map((x) => x.videoId), ['ok']);
});

test('우리 썸네일은 피드의 정해진 자리에 끼워 넣는다', () => {
  const feed = [{videoId: 'x'}, {videoId: 'y'}, {videoId: 'z'}];
  const got = insertOurThumbnail(feed, {videoId: 'OURS', isOurs: true}, 2);
  assert.deepEqual(got.map((x) => x.videoId), ['x', 'y', 'OURS', 'z']);
});

// ---- 하루 캐시: 같은 검색어를 하루에 두 번 검색하지 않는다(search.list 한 번에 100 unit) ----

function fakeYouTube() {
  const calls = [];
  const fetchImpl = async (url) => {
    calls.push(url);
    const u = new URL(url);
    if (u.pathname.endsWith('/search')) {
      return {ok: true, json: async () => ({items: [{id: {videoId: 'v1'}}, {id: {videoId: 'v2'}}]})};
    }
    if (u.pathname.endsWith('/videos')) {
      return {ok: true, json: async () => ({items: [
        {id: 'v1', snippet: {title: 'T1', channelId: 'C1', channelTitle: 'A', publishedAt: '2026-11-01T00:00:00Z', thumbnails: {medium: {url: 'm1'}}}, statistics: {viewCount: '5000'}, contentDetails: {duration: 'PT8M'}},
        {id: 'v2', snippet: {title: 'T2', channelId: 'C2', channelTitle: 'B', publishedAt: '2026-11-01T00:00:00Z', thumbnails: {medium: {url: 'm2'}}}, statistics: {viewCount: '100'}, contentDetails: {duration: 'PT40S'}},
      ]})};
    }
    if (u.pathname.endsWith('/channels')) {
      return {ok: true, json: async () => ({items: [{id: 'C1', statistics: {subscriberCount: '1000'}}, {id: 'C2', statistics: {hiddenSubscriberCount: true}}]})};
    }
    throw new Error('unexpected ' + url);
  };
  return {calls, fetchImpl};
}

test('검색 결과를 받아 조회·구독자·길이를 붙이고, 24시간 안에는 캐시를 쓴다', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'thumbfeed-'));
  try {
    const cachePath = join(dir, 'cache.json');
    const yt = fakeYouTube();
    const now = new Date('2026-11-11T00:00:00Z');
    const first = await fetchSearchFeed({query: 'Right Light', apiKey: 'k', cachePath, now, fetchImpl: yt.fetchImpl});
    assert.equal(first.items.length, 2);
    assert.deepEqual(first.items[0], {
      videoId: 'v1', title: 'T1', channelId: 'C1', channelTitle: 'A', publishedAt: '2026-11-01T00:00:00Z',
      thumbnail: 'm1', views: 5000, subs: 1000, durationSeconds: 480, isShort: false,
    });
    assert.equal(first.items[1].subs, null);
    assert.equal(first.items[1].isShort, true);
    assert.equal(first.fromCache, false);
    const searchCalls = () => yt.calls.filter((c) => c.includes('/search')).length;
    assert.equal(searchCalls(), 1);

    const again = await fetchSearchFeed({query: 'Right Light', apiKey: 'k', cachePath, now: new Date('2026-11-11T20:00:00Z'), fetchImpl: yt.fetchImpl});
    assert.equal(again.fromCache, true);
    assert.equal(searchCalls(), 1);

    await fetchSearchFeed({query: 'Right Light', apiKey: 'k', cachePath, now: new Date('2026-11-12T01:00:00Z'), fetchImpl: yt.fetchImpl});
    assert.equal(searchCalls(), 2);
  } finally {
    rmSync(dir, {recursive: true, force: true});
  }
});
