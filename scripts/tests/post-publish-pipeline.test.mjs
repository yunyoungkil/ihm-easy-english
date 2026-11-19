import test from 'node:test';
import assert from 'node:assert/strict';
import {
  PLAYLIST_IDS,
  auditAndFixPlaylists,
  postPendingPinnedComments,
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
