import test from 'node:test';
import assert from 'node:assert/strict';
import {PERMALINK_MAX_CHARS, SEARCH_DESCRIPTION_MAX_BYTES, toPermalinkSlug, utf8Bytes} from '../blog/blogger-post-settings.mjs';

test('toPermalinkSlug: topicId를 블로거 주소 모양으로 바꾸고 길면 낱말 단위로 자른다', () => {
  assert.equal(toPermalinkSlug('iphone-samsung-tv-mirroring-not-working'), 'iphone-samsung-tv-mirroring-not-working');
  assert.equal(toPermalinkSlug('LG TV  Model_Name!'), 'lg-tv-model-name');
  assert.equal(toPermalinkSlug('한글만'), '');
  const long = toPermalinkSlug('a-very-long-topic-id-that-keeps-going-and-going-past-the-limit-of-sixty-chars');
  assert.ok(long.length <= PERMALINK_MAX_CHARS);
  assert.equal(long.endsWith('-'), false);
  assert.ok('a-very-long-topic-id-that-keeps-going-and-going-past-the-limit-of-sixty-chars'.startsWith(long));
});

test('utf8Bytes: 블로거 검색 설명 한도는 글자 수가 아니라 UTF-8 바이트(한글 3바이트)', () => {
  assert.equal(SEARCH_DESCRIPTION_MAX_BYTES, 150);
  assert.equal(utf8Bytes('가'), 3);
  assert.equal(utf8Bytes('abc'), 3);
  // 11/27 블로거가 [150,154]로 거절한 64글자 문구
  assert.equal(utf8Bytes('가전 디지털 기기가 갑자기 안 될 때 제조사 공식 안내로 확인한 점검 순서와 사기 전에 맞춰 볼 규격을 정리합니다.'), 154);
});
