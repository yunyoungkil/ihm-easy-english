// 시청자 고민 데이터(audience-dna.json) 합치기 규칙 시험(2026-11-12).
// 서버의 댓글 분석과 합친 아웃라이어 리포트가 같은 규칙(scripts/audience-dna.mjs)을 쓴다.
import test from 'node:test';
import assert from 'node:assert/strict';
import {mergeAudienceDna} from '../audience-dna.mjs';

const now = '2026-11-12T00:00:00.000Z';
const later = '2026-11-13T00:00:00.000Z';
const e = (type, text, videoId) => ({type, text, videoId, channelTitle: `ch-${videoId}`, sourceType: 'outlierComment'});

test('같은 종류·같은 문장(띄어쓰기·대소문자 무시)은 한 항목으로 합치고, 다른 영상에서 또 나오면 횟수와 출처가 는다', () => {
  let store = mergeAudienceDna({entries: []}, [e('question', 'R과 L이  똑같이 들려요', 'v1')], now);
  store = mergeAudienceDna(store, [e('question', 'r과 l이 똑같이 들려요', 'v2')], later);
  assert.equal(store.entries.length, 1);
  assert.equal(store.entries[0].occurrences, 2);
  assert.deepEqual(store.entries[0].sources.map((s) => s.videoId), ['v1', 'v2']);
  assert.equal(store.entries[0].lastSeenAt, later);
});

test('같은 영상을 다시 분석해도 횟수를 두 번 세지 않는다', () => {
  let store = mergeAudienceDna({entries: []}, [e('painPoint', '혀가 꼬여요', 'v1')], now);
  store = mergeAudienceDna(store, [e('painPoint', '혀가 꼬여요', 'v1')], later);
  assert.equal(store.entries[0].occurrences, 1);
  assert.equal(store.entries[0].sources.length, 1);
});

test('종류가 다르면 같은 문장이어도 따로 둔다', () => {
  const store = mergeAudienceDna({entries: []}, [e('painPoint', '같은 말', 'v1'), e('vocabulary', '같은 말', 'v1')], now);
  assert.equal(store.entries.length, 2);
});

test('최대 개수를 넘으면 많이 나온 것, 같으면 최근 것을 남긴다', () => {
  let store = mergeAudienceDna({entries: []}, [e('question', '하나', 'v1'), e('question', '둘', 'v1')], now, {max: 2});
  store = mergeAudienceDna(store, [e('question', '하나', 'v2')], later, {max: 2});
  store = mergeAudienceDna(store, [e('question', '셋', 'v3')], later, {max: 2});
  assert.deepEqual(store.entries.map((x) => x.text), ['하나', '셋']);
});
