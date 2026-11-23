import test from 'node:test';
import assert from 'node:assert/strict';
import {
  PLAYLIST_IDS,
  auditAndFixPlaylists,
  postPendingPinnedComments,
  pinnedDoneKey,
  manageCommunityPosts,
} from '../post-publish-pipeline.mjs';

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
