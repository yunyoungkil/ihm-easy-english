import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync, readFileSync} from 'node:fs';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {resolveVideoFormat} from '../video-format.mjs';

const projectDir = dirname(dirname(dirname(fileURLToPath(import.meta.url))));
const catalogPath = join(projectDir, 'data', 'youtube', 'catalog.json');

test('공개 영상은 shortsIds에 있으면 길이가 60초를 넘거나 길이가 비어도 SHORTS다', () => {
  const shortsIds = new Set(['short45', 'short64', 'short86', 'shortNoDur']);
  assert.equal(resolveVideoFormat({videoId: 'short45', privacyStatus: 'public', durationSeconds: 45}, shortsIds), 'SHORTS');
  assert.equal(resolveVideoFormat({videoId: 'short64', privacyStatus: 'public', durationSeconds: 64}, shortsIds), 'SHORTS');
  assert.equal(resolveVideoFormat({videoId: 'short86', privacyStatus: 'public', durationSeconds: 86}, shortsIds), 'SHORTS');
  assert.equal(resolveVideoFormat({videoId: 'shortNoDur', privacyStatus: 'public', durationSeconds: 0}, shortsIds), 'SHORTS');
});

test('공개 영상은 shortsIds에 없으면 60초 이하여도 LONGFORM이다', () => {
  const shortsIds = new Set(['otherShort']);
  assert.equal(resolveVideoFormat({videoId: 'clip45', privacyStatus: 'public', durationSeconds: 45}, shortsIds), 'LONGFORM');
  assert.equal(resolveVideoFormat({videoId: 'long570', privacyStatus: 'public', durationSeconds: 570}, shortsIds), 'LONGFORM');
  assert.equal(resolveVideoFormat({videoId: 'clip30', privacyStatus: 'public', durationSeconds: 30}, new Set()), 'LONGFORM');
});

test('비공개·예약 등 공개 상태가 아니면 shortsIds가 있어도 길이 기준으로 판정한다', () => {
  const shortsIds = new Set(['listedPrivate']);
  assert.equal(resolveVideoFormat({videoId: 'privShort', privacyStatus: 'private', durationSeconds: 37}, shortsIds), 'SHORTS');
  assert.equal(resolveVideoFormat({videoId: 'listedPrivate', privacyStatus: 'private', durationSeconds: 413}, shortsIds), 'LONGFORM');
  assert.equal(resolveVideoFormat({videoId: 'unlistedShort', privacyStatus: 'unlisted', durationSeconds: 45}, shortsIds), 'SHORTS');
  assert.equal(resolveVideoFormat({videoId: 'noStatusShort', durationSeconds: 45}, shortsIds), 'SHORTS');
  assert.equal(resolveVideoFormat({videoId: 'listedPrivate', durationSeconds: 90}, shortsIds), 'LONGFORM');
});

test('shortsIds가 null이거나 undefined이면 길이 기준으로 판정한다', () => {
  assert.equal(resolveVideoFormat({videoId: 'v1', privacyStatus: 'public', durationSeconds: 45}, null), 'SHORTS');
  assert.equal(resolveVideoFormat({videoId: 'v2', privacyStatus: 'public', durationSeconds: 86}, null), 'LONGFORM');
  assert.equal(resolveVideoFormat({durationSeconds: 35}, null), 'SHORTS');
  assert.equal(resolveVideoFormat({durationSeconds: 120}, undefined), 'LONGFORM');
});

test('길이 기준 경계값(0초, 1초, 60초, 61초)과 비정상 값을 정확히 구분한다', () => {
  assert.equal(resolveVideoFormat({durationSeconds: 1}, null), 'SHORTS');
  assert.equal(resolveVideoFormat({durationSeconds: 60}, null), 'SHORTS');
  assert.equal(resolveVideoFormat({durationSeconds: 61}, null), 'LONGFORM');
  assert.equal(resolveVideoFormat({durationSeconds: 0}, null), 'LONGFORM');
  assert.equal(resolveVideoFormat({durationSeconds: -5}, null), 'LONGFORM');
  assert.equal(resolveVideoFormat({durationSeconds: undefined}, null), 'LONGFORM');
  assert.equal(resolveVideoFormat({durationSeconds: null}, null), 'LONGFORM');
  assert.equal(resolveVideoFormat({durationSeconds: 'abc'}, null), 'LONGFORM');
  assert.equal(resolveVideoFormat({durationSeconds: NaN}, null), 'LONGFORM');
  assert.equal(resolveVideoFormat({durationSeconds: '45'}, null), 'SHORTS');
  assert.equal(resolveVideoFormat({durationSeconds: '61'}, null), 'LONGFORM');
});

test('실제 catalog.json의 모든 영상이 공개 쇼츠 목록과 길이 폴백 규칙으로 같은 format을 낸다', {skip: !existsSync(catalogPath) && '카탈로그 없음'}, () => {
  const catalog = JSON.parse(readFileSync(catalogPath, 'utf8').replace(/^\uFEFF/, ''));
  const videos = Array.isArray(catalog?.videos) ? catalog.videos : [];
  assert.ok(videos.length > 0, '카탈로그에 영상이 있어야 한다');

  const publicShortsIds = new Set(
    videos.filter((v) => v.privacyStatus === 'public' && v.format === 'SHORTS').map((v) => v.videoId),
  );
  const mismatches = videos
    .filter((v) => resolveVideoFormat(v, publicShortsIds) !== v.format)
    .map((v) => `${v.videoId}(${v.privacyStatus},${v.durationSeconds}s,expected=${v.format})`);
  assert.deepEqual(mismatches, []);

  // 실제 60초 초과 공개 쇼츠는 shortsIds가 있어야 SHORTS, 없으면 LONGFORM이 된다
  const over60PublicShorts = videos.filter(
    (v) => v.privacyStatus === 'public' && v.format === 'SHORTS' && Number(v.durationSeconds) > 60,
  );
  for (const v of over60PublicShorts) {
    assert.equal(resolveVideoFormat(v, publicShortsIds), 'SHORTS');
    assert.equal(resolveVideoFormat(v, null), 'LONGFORM');
  }
});

