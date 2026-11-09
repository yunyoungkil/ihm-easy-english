import test from 'node:test';
import assert from 'node:assert/strict';
import {afterPublishTasks} from '../growth-rules.mjs';

const NOW = new Date('2026-11-13T03:00:00Z'); // 11/13 12:00 KST

const long = (over = {}) => ({name: 'ep25-pool-pull', episode: 'EP25', isPublished: true, publishedAt: '2026-11-12T14:00:00Z', pinnedCommentPending: true, ...over});
const shorts = (over = {}) => ({name: 'ep25-shorts-pool-pull', episode: 'EP25', status: 'scheduled', scheduledFor: '2026-11-14T11:00:00Z', ...over});

test('롱폼이 공개되고 고정 댓글이 대기 중이면 고정 댓글 할 일을 낸다', () => {
  const tasks = afterPublishTasks({longform: [long()], shorts: [], done: {}, now: NOW});
  assert.deepEqual(tasks.map((t) => t.key), ['EP25-long:pinned']);
  assert.match(tasks[0].text, /EP25 롱폼.*고정 댓글/);
});

test('대시보드에서 등록함을 눌러 대기 표시가 없으면 롱폼 고정 댓글 할 일은 없다', () => {
  assert.deepEqual(afterPublishTasks({longform: [long({pinnedCommentPending: false})], shorts: [], done: {}, now: NOW}), []);
});

test('롱폼이 공개됐고 같은 편 쇼츠가 올라가 있으면 관련 동영상 지정 할 일을 낸다(쇼츠는 예약 상태여도)', () => {
  const tasks = afterPublishTasks({longform: [long({pinnedCommentPending: false})], shorts: [shorts()], done: {}, now: NOW});
  assert.deepEqual(tasks.map((t) => t.key), ['EP25-shorts:related']);
  assert.match(tasks[0].text, /EP25 쇼츠.*관련 동영상.*EP25 롱폼/);
});

test('롱폼이 아직 공개 전이면 관련 동영상 할 일은 내지 않는다', () => {
  const tasks = afterPublishTasks({longform: [long({isPublished: false, publishedAt: null, pinnedCommentPending: false})], shorts: [shorts()], done: {}, now: NOW});
  assert.deepEqual(tasks, []);
});

test('쇼츠가 공개되면 고정 댓글 할 일을 낸다(예약 시각이 지나면 공개로 본다)', () => {
  const at = new Date('2026-11-14T12:00:00Z');
  const tasks = afterPublishTasks({longform: [long({pinnedCommentPending: false})], shorts: [shorts()], done: {'EP25-shorts:related': '2026-11-13'}, now: at});
  assert.deepEqual(tasks.map((t) => t.key), ['EP25-shorts:pinned']);
});

test('끝낸 일로 적힌 것은 다시 내지 않는다', () => {
  const at = new Date('2026-11-14T12:00:00Z');
  const done = {'EP25-long:pinned': '2026-11-13', 'EP25-shorts:related': '2026-11-13', 'EP25-shorts:pinned': '2026-11-14'};
  assert.deepEqual(afterPublishTasks({longform: [long()], shorts: [shorts()], done, now: at}), []);
});

test('공개 14일이 지난 영상은 할 일을 내지 않는다', () => {
  const old = new Date('2026-11-30T03:00:00Z');
  assert.deepEqual(afterPublishTasks({longform: [long()], shorts: [shorts({status: 'published'})], done: {}, now: old}), []);
});

test('업로드하지 않은 쇼츠 패키지(상태 packaged)는 관련 동영상 할 일을 내지 않는다', () => {
  const tasks = afterPublishTasks({longform: [long({pinnedCommentPending: false})], shorts: [shorts({status: 'packaged', scheduledFor: null})], done: {}, now: NOW});
  assert.deepEqual(tasks, []);
});
