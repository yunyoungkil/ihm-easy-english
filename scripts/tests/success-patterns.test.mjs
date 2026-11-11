import test from 'node:test';
import assert from 'node:assert/strict';
import {recordSuccessPatterns, factorKeysOf} from '../success-patterns.mjs';

const now = new Date('2026-12-01T00:00:00Z');
const out = (videoId, verdict, over = {}) => ({
  label: videoId, slug: 'ep' + videoId, videoId, title: 'T' + videoId, format: 'SHORTS', verdict, ratio: verdict === 'worked' ? 2 : 0.3,
  views7d: 2000, baselineViews7d: 1000, sampleMedianViews7d: 1200, publishedAt: '2026-11-0' + (over.day || 1) + 'T00:00:00Z',
  sources: {topic: 't', competitors: [{channelTitle: 'C', channelId: 'UCchan', videoId: 'x', sourceRatio: 5}], audience: null, track: 'Track A 퀴즈형'},
  ...over,
});

test('근거에서 요인 열쇠를 만든다(형식·경쟁 채널·시청자 고민)', () => {
  assert.deepEqual(factorKeysOf(out('a', 'worked').sources), ['track:Track A 퀴즈형', 'channel:UCchan']);
  assert.deepEqual(factorKeysOf(null), []);
});

test('"통함" 편만 기록하고, 처음에는 가설이다', () => {
  const {store, added} = recordSuccessPatterns({entries: []}, [out('a', 'worked'), out('b', 'hold'), out('c', 'neutral')], now);
  assert.deepEqual(added, ['a']);
  const e = store.entries[0];
  assert.equal(e.id, 'a');
  assert.equal(e.status, '가설');
  assert.equal(e.format, '쇼츠');
  assert.equal(e.ratio, 2);
  assert.equal(e.source, 'auto');
  assert.match(e.coreSuccessFactor, /퀴즈형/);
});

test('같은 형식에서 같은 요인으로 2편이 통하면 둘 다 확정', () => {
  const {store} = recordSuccessPatterns({entries: []}, [out('a', 'worked', {day: 1}), out('b', 'worked', {day: 2})], now);
  assert.deepEqual(store.entries.map((e) => e.status), ['확정', '확정']);
});

test('그 요인으로 만든 가장 최근 편이 안 통했으면 다시 가설로 내리고 이유를 적는다', () => {
  const {store} = recordSuccessPatterns({entries: []}, [out('a', 'worked', {day: 1}), out('b', 'worked', {day: 2}), out('c', 'failed', {day: 3})], now);
  assert.deepEqual(store.entries.map((e) => e.status), ['가설', '가설']);
  assert.match(store.entries[0].note, /c/);
});

test('형식이 다르면 같은 요인이어도 확정으로 묶지 않는다', () => {
  const {store} = recordSuccessPatterns({entries: []}, [out('a', 'worked'), out('b', 'worked', {format: 'LONGFORM', day: 2})], now);
  assert.deepEqual(store.entries.map((e) => e.status), ['가설', '가설']);
});

test('사람·Claude가 적은 훅·비유는 지우지 않고, 손으로 넣은 다른 항목도 그대로 둔다', () => {
  const prev = {entries: [
    {id: 'a', videoId: 'a', reusableHook: '내 훅', reusableAnalogy: '내 비유', source: 'auto'},
    {id: 'manual', videoId: 'manual', title: '수동', status: '확정'},
  ]};
  const {store} = recordSuccessPatterns(prev, [out('a', 'worked')], now);
  const a = store.entries.find((e) => e.id === 'a');
  assert.equal(a.reusableHook, '내 훅');
  assert.equal(a.reusableAnalogy, '내 비유');
  assert.ok(store.entries.find((e) => e.id === 'manual'));
});

test('기획 근거가 없으면 요인 없이 가설로만 기록한다', () => {
  const {store} = recordSuccessPatterns({entries: []}, [out('a', 'worked', {sources: null}), out('b', 'worked', {sources: null, day: 2})], now);
  assert.deepEqual(store.entries.map((e) => e.status), ['가설', '가설']);
  assert.match(store.entries[0].coreSuccessFactor, /기획 근거 기록 없음/);
});
