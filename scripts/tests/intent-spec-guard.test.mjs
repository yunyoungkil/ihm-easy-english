// 의도 명세가 정말 실패할 수 있는지 확인하는 보강 시험 (2026-11-12).
// intent-spec.test.mjs 5번("공개 전·예약 영상은 판정하지 않는다")은 실제 데이터로만 돌아서, 지금처럼 예약 영상에
// 7일 조회 기록이 아예 없으면 공개 필터가 있든 없든 통과한다(필터를 일부러 지워 봐도 통과함 — 2026-11-12 확인).
// 그래서 예약 영상에 7일 조회가 이미 들어 있는 상황을 임시 데이터로 만들어 필터가 실제로 막는지 본다.
// 의도 명세 파일은 만든 쪽이 고치지 않는 규칙이라 이 파일로 따로 둔다.
import test from 'node:test';
import assert from 'node:assert/strict';
import {buildEpisodeOutcomes} from '../planning-outcome.mjs';

const now = new Date('2026-12-01T00:00:00Z');
const uploadedAt = '2026-11-01T00:00:00Z';
const video = (videoId, privacyStatus, views) => ({videoId, publishedAt: uploadedAt, format: 'LONGFORM', privacyStatus, statistics: {viewCount: String(views)}});
const episode = (videoId) => ({slug: `ep-${videoId}`, label: videoId, videoId, format: 'LONGFORM', sources: null});

test('예약(비공개) 영상은 7일 조회 기록이 있어도 판정하지 않는다 [의도 명세 5번 보강]', () => {
  const catalogVideos = [video('SCHED', 'private', 0), video('A', 'public', 500), video('B', 'public', 400)];
  const views7d = {SCHED: {views7d: 0}, A: {views7d: 500}, B: {views7d: 400}};
  const [scheduled] = buildEpisodeOutcomes({episodes: [episode('SCHED')], catalogVideos, views7d, now});
  assert.equal(scheduled.verdict, 'pending');
});

test('같은 상황에서 공개된 영상은 판정 대상이 된다(보류든 판정이든 pending이 아님)', () => {
  const catalogVideos = [video('SCHED', 'private', 0), video('A', 'public', 500), video('B', 'public', 400)];
  const views7d = {SCHED: {views7d: 0}, A: {views7d: 500}, B: {views7d: 400}};
  const [published] = buildEpisodeOutcomes({episodes: [episode('A')], catalogVideos, views7d, now});
  assert.notEqual(published.verdict, 'pending', '공개 영상까지 pending이면 위 시험이 항상 통과하게 된다');
});
