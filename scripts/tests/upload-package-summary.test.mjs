import test from 'node:test';
import assert from 'node:assert/strict';
import {attachShortsPackages, packageStatusSource, selectPackageVideo, shortsPackageEpisode} from '../upload-package-summary.mjs';

test('검색어로 지은 영상 파일을 video.mp4보다 먼저 고른다', () => {
  assert.equal(selectPackageVideo(['video.mp4', 'Sheep_vs_Ship_Shorts.mp4', 'title.txt']), 'Sheep_vs_Ship_Shorts.mp4');
});

test('검색어 이름 파일이 없으면 video.mp4를 고른다', () => {
  assert.equal(selectPackageVideo(['title.txt', 'video.mp4']), 'video.mp4');
});

test('확장자 대소문자와 관계없이 영상 파일을 찾는다', () => {
  assert.equal(selectPackageVideo(['CLIP.MP4']), 'CLIP.MP4');
});

test('영상 파일이 없으면 null', () => {
  assert.equal(selectPackageVideo(['title.txt', 'thumbnail.jpg']), null);
});

test('쇼츠 패키지 폴더 이름에서 에피소드 번호를 읽는다', () => {
  assert.equal(shortsPackageEpisode('ep24-shorts-sheep-ship'), 'EP24');
  assert.equal(shortsPackageEpisode('ep05-shorts-x'), 'EP05');
});

test('롱폼 폴더나 번호 없는 쇼츠 폴더는 쇼츠 에피소드로 보지 않는다', () => {
  assert.equal(shortsPackageEpisode('ep24-long-short-i'), null);
  assert.equal(shortsPackageEpisode('ep26-r-vs-l'), null);
  assert.equal(shortsPackageEpisode('channel-shorts-c-schwa'), null);
});

const longformEntry = (episode) => ({season: '단편', episode, tracks: {longform: {contentId: `${episode.toLowerCase()}-long`}}});

test('쇼츠를 같은 번호 롱폼 카드에 쇼츠 탭으로 붙인다', () => {
  const episodes = [longformEntry('EP24'), longformEntry('EP25')];
  attachShortsPackages(episodes, [{episode: 'EP24', track: {contentId: 'ep24-shorts-sheep-ship'}}]);
  assert.equal(episodes.length, 2);
  assert.equal(episodes[0].tracks['shorts-a'].contentId, 'ep24-shorts-sheep-ship');
  assert.equal(episodes[1].tracks['shorts-a'], undefined);
});

test('같은 롱폼에 쇼츠가 두 편이면 두 번째는 쇼츠 B 탭이 된다', () => {
  const episodes = [longformEntry('EP24')];
  attachShortsPackages(episodes, [
    {episode: 'EP24', track: {contentId: 'ep24-shorts-a'}},
    {episode: 'EP24', track: {contentId: 'ep24-shorts-b'}},
  ]);
  assert.equal(episodes[0].tracks['shorts-a'].contentId, 'ep24-shorts-a');
  assert.equal(episodes[0].tracks['shorts-b'].contentId, 'ep24-shorts-b');
});

test('붙일 롱폼 카드가 없으면 번호 옆에 쇼츠라고 적은 카드를 따로 만든다', () => {
  const episodes = [longformEntry('EP25')];
  attachShortsPackages(episodes, [{episode: 'EP31', track: {contentId: 'ep31-shorts-x'}}]);
  assert.equal(episodes.length, 2);
  assert.equal(episodes[1].episode, 'EP31 쇼츠');
  assert.equal(episodes[1].tracks.longform.contentId, 'ep31-shorts-x');
});

test('쇼츠 패키지는 대시보드 전용 상태 파일을 쓰고, 처음에는 제목으로 찾아보도록 packaged로 시작한다', () => {
  assert.deepEqual(packageStatusSource('ep24-shorts-sheep-ship'), {file: 'shorts-status.json', fallback: {status: 'packaged'}});
});

test('롱폼 패키지는 지금처럼 status.json을 쓰고, 없으면 동기화하지 않는다', () => {
  assert.deepEqual(packageStatusSource('ep24-long-short-i'), {file: 'status.json', fallback: {}});
  assert.deepEqual(packageStatusSource('channel-shorts-c-schwa'), {file: 'status.json', fallback: {}});
});
