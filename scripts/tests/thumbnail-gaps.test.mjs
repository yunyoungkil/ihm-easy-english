import test from 'node:test';
import assert from 'node:assert/strict';
import {thumbnailGaps} from '../growth-rules.mjs';

const pkg = (over = {}) => ({name: 'ep27-shorts-dogs-cats', status: 'packaged', hasThumbnail: false, ...over});

test('썸네일이 없는 패키지 이름을 돌려준다', () => {
  assert.deepEqual(thumbnailGaps([pkg()]), ['ep27-shorts-dogs-cats']);
});

test('썸네일이 있으면 돌려주지 않는다', () => {
  assert.deepEqual(thumbnailGaps([pkg({hasThumbnail: true})]), []);
});

test('이미 공개된 패키지는 썸네일이 없어도 돌려주지 않는다', () => {
  assert.deepEqual(thumbnailGaps([pkg({status: 'published'})]), []);
});

test('예약·업로드 대기 상태도 썸네일이 없으면 돌려준다', () => {
  const names = thumbnailGaps([pkg({name: 'a', status: 'scheduled'}), pkg({name: 'b', status: 'ready_to_upload'}), pkg({name: 'c', status: 'packaged'})]);
  assert.deepEqual(names, ['a', 'b', 'c']);
});

test('여러 패키지 중 없는 것만 돌려준다', () => {
  const names = thumbnailGaps([pkg({name: 'a', hasThumbnail: true}), pkg({name: 'b'}), pkg({name: 'c', status: 'published'})]);
  assert.deepEqual(names, ['b']);
});

test('목록이 비었거나 없으면 빈 배열', () => {
  assert.deepEqual(thumbnailGaps([]), []);
  assert.deepEqual(thumbnailGaps(undefined), []);
});
