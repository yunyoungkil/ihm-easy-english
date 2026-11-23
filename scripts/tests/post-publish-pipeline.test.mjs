import test from 'node:test';
import assert from 'node:assert/strict';
import {
  PLAYLIST_IDS,
  auditAndFixPlaylists,
  postPendingPinnedComments,
  pinnedDoneKey,
  manageCommunityPosts,
  communityPostBlockReason,
  contentSnippet,
  readPackageVideoIds,
  findRelatedCandidates,
  connectStudio,
} from '../post-publish-pipeline.mjs';
import { mkdtempSync, mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

test('PLAYLIST_IDS: 4대 핵심 재생목록 상수가 정의되어 있다', () => {
  assert.equal(PLAYLIST_IDS.LONGFORM, 'PLdTWj5v6v8zE');
  assert.equal(PLAYLIST_IDS.SHORTS_QUIZ, 'PLCbnHG8SDRes');
  assert.equal(PLAYLIST_IDS.PHONICS_AZ, 'PLDd1UzqQ4j3k');
  assert.equal(PLAYLIST_IDS.SENTENCES, 'PLezeewHeB6dg');
});

test('auditAndFixPlaylists: 토큰이 없으면 ok:false를 반환한다', async () => {
  const res = await auditAndFixPlaylists({ accessToken: null, catalog: { videos: [] } });
  assert.equal(res.ok, false);
  assert.equal(res.reason, 'no-token');
});

test('auditAndFixPlaylists: 롱폼 목록에 쇼츠가 섞여 있으면 DELETE를 호출해 제거한다', async () => {
  const calls = [];
  const fakeFetch = async (url, opts = {}) => {
    calls.push({ url, method: opts.method || 'GET' });
    if (url.includes('playlistItems?part=')) {
      return {
        ok: true,
        json: async () => ({
          items: [
            { id: 'item-long-1', contentDetails: { videoId: 'vid-long-1' } },
            { id: 'item-short-1', contentDetails: { videoId: 'vid-short-1' } },
          ],
        }),
      };
    }
    if (opts.method === 'DELETE') {
      return { ok: true, status: 204 };
    }
    return { ok: true, json: async () => ({}) };
  };

  const catalog = {
    videos: [
      { videoId: 'vid-long-1', format: 'LONGFORM', title: '롱폼 1' },
      { videoId: 'vid-short-1', format: 'SHORTS', title: '쇼츠 1' },
    ],
  };

  const res = await auditAndFixPlaylists({
    accessToken: 'test-token',
    catalog,
    fetchFn: fakeFetch,
  });

  assert.equal(res.ok, true);
  assert.equal(res.actions.removed.length, 1);
  assert.equal(res.actions.removed[0].videoId, 'vid-short-1');
  const deleteCalls = calls.filter((c) => c.method === 'DELETE');
  assert.equal(deleteCalls.length, 1);
  assert.ok(deleteCalls[0].url.includes('item-short-1'));
});

test('postPendingPinnedComments: 토큰이 없으면 ok:false를 반환한다', async () => {
  const res = await postPendingPinnedComments({ accessToken: null, catalog: { videos: [] } });
  assert.equal(res.ok, false);
  assert.equal(res.reason, 'no-token');
});

// 2026-11-23: 파이프라인이 'EP27-SHORTS-DOGS-CATS:pinned'로 적어 브리핑(growth-rules afterPublishTasks)이
// 'EP27-shorts:pinned'를 못 찾고 "고정 댓글 등록"을 계속 할 일로 띄웠다. 같은 키 형식으로 적고 읽는지 본다.
test('pinnedDoneKey: 브리핑이 읽는 키 형식(EP27-shorts:pinned / EP28-long:pinned)을 만든다', () => {
  assert.equal(pinnedDoneKey('ep27-shorts-dogs-cats'), 'EP27-shorts:pinned');
  assert.equal(pinnedDoneKey('ep28-f-vs-p'), 'EP28-long:pinned');
  assert.equal(pinnedDoneKey('misc-folder'), null);
});

async function pinnedFixture({ done = {} } = {}) {
  const { mkdtempSync, mkdirSync, writeFileSync } = await import('node:fs');
  const { join } = await import('node:path');
  const { tmpdir } = await import('node:os');
  const dir = mkdtempSync(join(tmpdir(), 'pinned-'));
  const pkg = join(dir, 'output', 'upload-packages', 'ep27-shorts-dogs-cats');
  mkdirSync(pkg, { recursive: true });
  mkdirSync(join(dir, 'data', 'youtube'), { recursive: true });
  writeFileSync(join(pkg, 'shorts-status.json'), JSON.stringify({ status: 'published', videoId: 'vid27' }));
  writeFileSync(join(pkg, 'pinned-comment.txt'), '끝소리가 제일 헷갈린 단어는?');
  writeFileSync(join(dir, 'data', 'youtube', 'after-publish-done.json'), JSON.stringify(done));
  const catalog = { videos: [{ videoId: 'vid27', privacyStatus: 'public', title: 't', comments: [] }] };
  const calls = [];
  const fetchFn = async (url, opts) => {
    calls.push({ url, method: opts?.method });
    return { ok: true, json: async () => ({ id: 'c1' }) };
  };
  return { dir, catalog, calls, fetchFn };
}

test('postPendingPinnedComments: 게시 후 브리핑이 읽는 키로 끝낸 일을 기록한다', async () => {
  const { readFileSync } = await import('node:fs');
  const { join } = await import('node:path');
  const { dir, catalog, calls, fetchFn } = await pinnedFixture();
  const res = await postPendingPinnedComments({ accessToken: 't', projectDir: dir, catalog, fetchFn });
  assert.equal(res.posted.length, 1);
  assert.equal(calls.length, 1);
  const done = JSON.parse(readFileSync(join(dir, 'data', 'youtube', 'after-publish-done.json'), 'utf8'));
  assert.ok(done['EP27-shorts:pinned'], JSON.stringify(done));
});

test('postPendingPinnedComments: 이미 기록된 편은 채널 댓글이 목록에 없어도 다시 게시하지 않는다', async () => {
  const { dir, catalog, calls, fetchFn } = await pinnedFixture({ done: { 'EP27-shorts:pinned': '2026-11-21' } });
  const res = await postPendingPinnedComments({ accessToken: 't', projectDir: dir, catalog, fetchFn });
  assert.equal(res.posted.length, 0);
  assert.equal(calls.length, 0);
});

test('manageCommunityPosts: community-post.json 파일이 없으면 ok:true와 빈 목록을 반환한다', async () => {
  const res = await manageCommunityPosts({
    projectDir: 'C:\\non-existent-dir-for-test',
    dryRun: true,
  });
  assert.equal(res.ok, true);
  assert.equal(res.posted.length, 0);
  assert.equal(res.pending.length, 0);
});

test('manageCommunityPosts: dryRun 모드에서는 브라우저 없이 발행 대상을 식별한다', async () => {
  const res = await manageCommunityPosts({
    dryRun: true,
  });
  assert.equal(res.ok, true);
  assert.ok(Array.isArray(res.posted));
  assert.ok(Array.isArray(res.pending));
});

// ---- 2026-11-23: 커뮤니티 글 차단·게시 확인, 관련 동영상 짝짓기, 스튜디오 연결 ----

const NOW = new Date('2026-11-23T12:00:00Z');
const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
const okPost = (extra = {}) => ({
  episodeId: 'ep99-test',
  type: 'summary-quiz',
  targetPublishDate: new Date(NOW.getTime() - HOUR).toISOString(),
  content: '강아지들을 소리 내어 읽을 때 마지막 소리는 어떻게 날까요?',
  status: 'ready',
  ...extra,
});

test('communityPostBlockReason: 목표 시각에서 24시간 넘게 지난 글은 expired', () => {
  const p = okPost({ targetPublishDate: new Date(NOW.getTime() - 2 * DAY).toISOString() });
  assert.equal(communityPostBlockReason(p, { now: NOW }), 'expired');
});

test('communityPostBlockReason: 본 영상이 이미 나온 예습 퀴즈는 pre-quiz-after-video (예약 시각 / 카탈로그 공개)', () => {
  const byTime = okPost({ type: 'pre-quiz', companionVideoScheduledAt: new Date(NOW.getTime() - HOUR).toISOString() });
  assert.equal(communityPostBlockReason(byTime, { now: NOW }), 'pre-quiz-after-video');

  const byCatalog = okPost({ type: 'pre-quiz', companionVideoId: 'L1' });
  const catalog = { videos: [{ videoId: 'L1', privacyStatus: 'public' }] };
  assert.equal(communityPostBlockReason(byCatalog, { now: NOW, catalog }), 'pre-quiz-after-video');

  // 본 영상이 아직 비공개면 막지 않는다
  const notYet = { videos: [{ videoId: 'L1', privacyStatus: 'private' }] };
  assert.equal(communityPostBlockReason(byCatalog, { now: NOW, catalog: notYet }), null);
});

test('communityPostBlockReason: 내부 에피소드 번호, 금지어, 이미 올린 글을 막는다', () => {
  assert.equal(communityPostBlockReason(okPost({ content: '채널 최신 영상(EP27)에서 확인하세요' }), { now: NOW }), 'internal-episode-number');
  assert.equal(communityPostBlockReason(okPost({ content: '조음 원리를 알아봅니다' }), { now: NOW }), 'banned-terms');
  assert.equal(communityPostBlockReason(okPost({ status: 'posted' }), { now: NOW }), 'already-posted');
});

test('communityPostBlockReason: 목표 시각이 1시간 전인 정상 글은 null', () => {
  assert.equal(communityPostBlockReason(okPost(), { now: NOW, catalog: { videos: [] } }), null);
});

test('manageCommunityPosts: dryRun에서 기한 지난 글은 blocked(expired)에 들어가고 posted에 없으며 기록 파일을 건드리지 않는다', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'community-'));
  const pkg = join(dir, 'output', 'upload-packages', 'ep99-test');
  mkdirSync(pkg, { recursive: true });
  writeFileSync(join(pkg, 'community-post.json'), JSON.stringify(okPost({
    targetPublishDate: new Date(NOW.getTime() - 3 * DAY).toISOString(),
  })));
  const res = await manageCommunityPosts({ projectDir: dir, catalog: { videos: [] }, now: NOW, dryRun: true });
  assert.equal(res.ok, true);
  assert.deepEqual(res.blocked, [{ episodeId: 'ep99-test', reason: 'expired' }]);
  assert.equal(res.posted.length, 0);
  assert.equal(existsSync(join(dir, 'data', 'youtube', 'after-publish-done.json')), false);
});

test('manageCommunityPosts: 막힌 글만 있으면 스튜디오에 연결하지 않는다', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'community-'));
  const pkg = join(dir, 'output', 'upload-packages', 'ep99-test');
  mkdirSync(pkg, { recursive: true });
  writeFileSync(join(pkg, 'community-post.json'), JSON.stringify(okPost({ content: '최신 영상(EP27)' })));
  let connected = 0;
  const res = await manageCommunityPosts({
    projectDir: dir, catalog: { videos: [] }, now: NOW,
    connect: async () => { connected += 1; return { ok: false, reason: 'x' }; },
  });
  assert.equal(connected, 0);
  assert.equal(res.blocked[0].reason, 'internal-episode-number');
});

test('contentSnippet: 공백을 하나로 줄이고 n글자로 자른다', () => {
  assert.equal(contentSnippet('가나다\n\n  라마   바사'), '가나다 라마 바사');
  assert.equal(contentSnippet('  abcdefghij klmnopqrstuvwxyz  ', 12), 'abcdefghij k');
  assert.equal(contentSnippet('가'.repeat(30)).length, 20);
});

function relatedFixture() {
  const dir = mkdtempSync(join(tmpdir(), 'related-'));
  const root = join(dir, 'output', 'upload-packages');
  const mk = (folder, file, data) => {
    mkdirSync(join(root, folder), { recursive: true });
    writeFileSync(join(root, folder, file), JSON.stringify(data));
  };
  mk('ep28-shorts-fan-pan', 'shorts-status.json', { videoId: 'S1' });
  mk('ep28-f-vs-p', 'status.json', { videoId: 'L1' });
  mk('ep29-shorts-very-berry', 'shorts-status.json', { videoId: 'S2' }); // 짝 롱폼 패키지 없음
  mk('ep30-shorts-no-id', 'shorts-status.json', {}); // videoId 없음
  return { dir, root };
}
const relCatalog = (long = { privacyStatus: 'public', scheduledPublishAt: null }) => ({
  videos: [
    { videoId: 'S1', format: 'SHORTS', title: '쇼츠 제목', privacyStatus: 'public' },
    { videoId: 'L1', format: 'LONGFORM', title: '롱폼 제목', ...long },
    { videoId: 'S2', format: 'SHORTS', title: '다른 쇼츠', privacyStatus: 'public' },
  ],
});

test('readPackageVideoIds: 쇼츠·롱폼 폴더에서 videoId와 에피소드 번호를 읽고 videoId 없는 폴더는 뺀다', () => {
  const { dir, root } = relatedFixture();
  for (const arg of [dir, root]) {
    const got = readPackageVideoIds(arg).sort((a, b) => a.folder.localeCompare(b.folder));
    assert.deepEqual(got, [
      { folder: 'ep28-f-vs-p', videoId: 'L1', kind: 'long', ep: '28' },
      { folder: 'ep28-shorts-fan-pan', videoId: 'S1', kind: 'shorts', ep: '28' },
      { folder: 'ep29-shorts-very-berry', videoId: 'S2', kind: 'shorts', ep: '29' },
    ]);
  }
});

test('findRelatedCandidates: 같은 에피소드 롱폼이 공개된 쇼츠만 EPnn-shorts:related 키로 고른다', () => {
  const { dir } = relatedFixture();
  const packages = readPackageVideoIds(dir);
  const got = findRelatedCandidates({ catalog: relCatalog(), packages, done: {}, now: NOW });
  assert.equal(got.length, 1); // ep29 쇼츠는 짝 롱폼이 없어 빠진다
  assert.equal(got[0].key, 'EP28-shorts:related');
  assert.equal(got[0].short.videoId, 'S1');
  assert.equal(got[0].companionLong.videoId, 'L1');

  // 이미 끝낸 키
  assert.equal(findRelatedCandidates({ catalog: relCatalog(), packages, done: { 'EP28-shorts:related': '2026-11-23' }, now: NOW }).length, 0);

  // 롱폼이 비공개이고 예약이 미래
  const future = relCatalog({ privacyStatus: 'private', scheduledPublishAt: new Date(NOW.getTime() + DAY).toISOString() });
  assert.equal(findRelatedCandidates({ catalog: future, packages, done: {}, now: NOW }).length, 0);

  // 롱폼이 비공개여도 예약 시각이 지났으면 짝으로 본다
  const past = relCatalog({ privacyStatus: 'private', scheduledPublishAt: new Date(NOW.getTime() - HOUR).toISOString() });
  assert.equal(findRelatedCandidates({ catalog: past, packages, done: {}, now: NOW }).length, 1);
});

// 가짜 브라우저: 실제 크롬·네트워크 없이 connectStudio의 판정만 본다.
function fakeConnect(urlAfterGoto) {
  const state = { gotos: [], closed: false };
  const page = {
    goto: async (u) => { state.gotos.push(u); },
    url: () => urlAfterGoto,
    close: async () => { state.closed = true; },
  };
  const browser = { contexts: () => [{ newPage: async () => page }] };
  return { state, page, browser, connectFn: async () => browser };
}

test('connectStudio: 로그인 필요나 지원 안 함이면 크롬에 붙지 않고 ok:false', async () => {
  let connected = 0;
  const connectFn = async () => { connected += 1; };
  const a = await connectStudio({ setupFn: async () => ({ supported: true, login: 'login-needed' }), connectFn, probeWaitMs: 0 });
  assert.deepEqual(a, { ok: false, reason: 'studio-login-needed' });
  const b = await connectStudio({ setupFn: async () => ({ supported: false }), connectFn, probeWaitMs: 0 });
  assert.deepEqual(b, { ok: false, reason: 'studio-chrome-unsupported' });
  assert.equal(connected, 0);
});

test('connectStudio: unknown이면 스튜디오로 가 보고, 구글 로그인 화면이면 ok:false(탭 닫음)', async () => {
  const f = fakeConnect('https://accounts.google.com/v3/signin');
  const res = await connectStudio({ setupFn: async () => ({ supported: true, login: 'unknown' }), connectFn: f.connectFn, probeWaitMs: 0 });
  assert.equal(res.ok, false);
  assert.equal(res.reason, 'studio-login-login-needed');
  assert.equal(f.state.gotos.length, 1);
  assert.equal(f.state.closed, true);
});

test('connectStudio: unknown이어도 스튜디오에 그대로 남으면 ok:true와 page를 돌려준다', async () => {
  const f = fakeConnect('https://studio.youtube.com/channel/UCxxxx');
  const res = await connectStudio({ setupFn: async () => ({ supported: true, login: 'unknown' }), connectFn: f.connectFn, probeWaitMs: 0 });
  assert.equal(res.ok, true);
  assert.equal(res.page, f.page);
  assert.equal(f.state.closed, false);
});

test('connectStudio: 이미 logged-in이면 스튜디오로 다시 가지 않고 바로 연결한다', async () => {
  const f = fakeConnect('https://studio.youtube.com/');
  const res = await connectStudio({ setupFn: async () => ({ supported: true, login: 'logged-in' }), connectFn: f.connectFn, probeWaitMs: 0 });
  assert.equal(res.ok, true);
  assert.equal(f.state.gotos.length, 0);
});
