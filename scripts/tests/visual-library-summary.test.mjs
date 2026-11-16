import test from 'node:test';
import assert from 'node:assert/strict';
import {summarizeLibrary} from '../visual-library-summary.mjs';

test('연출 자료집 요약: 종류별 장면 수와 영상 수를 센다', () => {
  const lib = [
    {videoId: 'a', what: '노란색 하이라이트 박스가 등장', purpose: ''},
    {videoId: 'a', what: '캐릭터 일러스트가 등장', purpose: ''},
    {videoId: 'b', what: '진행자가 손가락으로 하나 둘 셋 카운트', purpose: ''},
  ];
  const s = summarizeLibrary(lib);
  assert.deepEqual(s['글자 표·목록·하이라이트'], {entries: 1, videos: 1});
  assert.deepEqual(s['그림·일러스트·캐릭터'], {entries: 1, videos: 1});
  assert.deepEqual(s['사람(진행자·출연자)이 나옴'], {entries: 1, videos: 1});
  assert.deepEqual(s['시청자가 말할 시간(카운트다운)'], {entries: 1, videos: 1});
  assert.deepEqual(s['실사 사진·실제 사물'], {entries: 0, videos: 0});
});
