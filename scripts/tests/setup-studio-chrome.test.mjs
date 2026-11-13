import test from 'node:test';
import assert from 'node:assert/strict';
import {judgeStudioLogin} from '../setup-studio-chrome.mjs';

test('구글 로그인 화면이 하나라도 열려 있으면 스튜디오 주소가 같이 보여도 로그인 필요', () => {
  // 실제 관찰(2026-11-13): 새 프로필은 스튜디오 주소에서 로그인 화면으로 넘어가는 중간에 두 주소가 함께 보였다.
  assert.equal(judgeStudioLogin(['https://studio.youtube.com/', 'https://accounts.google.com/v3/signin/identifier?continue=x']), 'login-needed');
  assert.equal(judgeStudioLogin(['https://accounts.google.com/v3/signin/identifier']), 'login-needed');
});

test('스튜디오 탭만 있으면 로그인됨, 아무것도 없으면 알 수 없음', () => {
  assert.equal(judgeStudioLogin(['https://studio.youtube.com/channel/UCxxxx']), 'logged-in');
  assert.equal(judgeStudioLogin([]), 'unknown');
  assert.equal(judgeStudioLogin(['about:blank']), 'unknown');
});
