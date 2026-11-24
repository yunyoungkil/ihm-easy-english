// 업로드 패키지 상태 파일은 유튜브 상태가 실제로 바뀔 때만 고친다(scripts/package-status-sync.mjs, 2026-11-24 사용자 "막자").
// 칸 이름은 실제 status.json(status·videoId·scheduledFor·publishedAt·publishedAtSource·lastSyncedAt)과
// videos.list 응답(status.privacyStatus·status.publishAt·snippet.publishedAt)을 그대로 쓴다.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {dirname, join} from 'node:path';
import test from 'node:test';
import {fileURLToPath} from 'node:url';
import {applyYouTubeStatus} from '../package-status-sync.mjs';

const now = new Date('2026-11-24T08:00:00.000Z');
const scheduled = {status: 'scheduled', videoId: 'GudIUEIl2TI', scheduledFor: '2026-12-12T11:00:00Z', lastSyncedAt: '2026-11-23T16:10:55.715Z'};

test('유튜브 상태가 그대로면 파일을 바꾸지 않는다(시각만 바뀐 변경을 만들지 않는다)', () => {
  const r = applyYouTubeStatus(scheduled, {videoId: 'GudIUEIl2TI', ytVideo: {status: {privacyStatus: 'private', publishAt: '2026-12-12T11:00:00Z'}}, now});
  assert.equal(r.changed, false);
  assert.equal(r.updated, scheduled, '같은 객체를 돌려준다');
  assert.equal(r.updated.lastSyncedAt, '2026-11-23T16:10:55.715Z');
});

test('예약 시각이 바뀌면 고치고 lastSyncedAt도 새로 적는다', () => {
  const r = applyYouTubeStatus(scheduled, {videoId: 'GudIUEIl2TI', ytVideo: {status: {privacyStatus: 'private', publishAt: '2026-12-13T11:00:00Z'}}, now});
  assert.equal(r.changed, true);
  assert.equal(r.updated.scheduledFor, '2026-12-13T11:00:00Z');
  assert.equal(r.updated.lastSyncedAt, now.toISOString());
});

test('공개되면 published와 유튜브 공개일을 적고, 이미 그렇게 적혀 있으면 그대로 둔다', () => {
  const yt = {status: {privacyStatus: 'public'}, snippet: {publishedAt: '2026-12-12T11:00:01Z'}};
  const first = applyYouTubeStatus(scheduled, {videoId: 'GudIUEIl2TI', ytVideo: yt, now});
  assert.equal(first.changed, true);
  assert.equal(first.updated.status, 'published');
  assert.equal(first.updated.publishedAt, '2026-12-12T11:00:01Z');
  assert.equal(first.updated.publishedAtSource, 'youtube');
  const second = applyYouTubeStatus(first.updated, {videoId: 'GudIUEIl2TI', ytVideo: yt, now: new Date('2026-12-13T00:00:00Z')});
  assert.equal(second.changed, false);
});

test('영상 ID를 처음 찾으면 적는다, 유튜브에서 못 찾으면 그대로 둔다', () => {
  const noId = {status: 'scheduled', scheduledFor: '2026-12-12T11:00:00Z'};
  assert.equal(applyYouTubeStatus(noId, {videoId: 'abc', ytVideo: null, now}).updated.videoId, 'abc');
  assert.equal(applyYouTubeStatus(noId, {videoId: null, ytVideo: null, now}).changed, false);
});

test('대시보드 서버가 이 계산을 쓰고, 확인할 때마다 시각만 적던 예전 코드가 없다', () => {
  const src = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', 'youtube-analytics-server.mjs'), 'utf8');
  assert.ok(src.includes('applyYouTubeStatus(statusData'), '서버가 applyYouTubeStatus를 쓰지 않는다');
  assert.ok(src.includes('if (changed) await saveJson'), '바뀔 때만 저장하는 조건이 없다');
  assert.ok(!src.includes('{...statusData, lastSyncedAt: new Date().toISOString()}'), '시각만 새로 적는 예전 코드가 남아 있다');
});
