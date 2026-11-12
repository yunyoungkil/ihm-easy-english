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

// ---- 브라우저(화면) 코드도 같은 판정 함수를 쓴다 [2026-11-12] ----
// 서버 파일 안에는 <script>…</script>로 브라우저에서 도는 화면 코드가 함께 들어 있다. 판정 함수를 서버 쪽에서만 불러오면
// 화면 코드가 `resolveVideoFormat is not defined`로 터진다(정리 중에 실제로 겪음). 화면 코드에 규칙을 따로 복사해 두면 같은 규칙이
// 두 곳이 되므로, 서버가 판정 함수 본문을 화면 코드에 한 번만 끼워 넣는다. 그 결과 화면에서 돌려도 서버와 같은 값이 나와야 한다.
import vm from 'node:vm';
import {fileURLToPath as toPath} from 'node:url';

test('서버가 보내는 화면 코드 안의 판정 함수는 서버의 판정 함수와 같은 값을 낸다', async () => {
  const base = process.env.DASHBOARD_URL || 'http://localhost:3001';
  let html;
  try { html = await (await fetch(`${base}/`, {signal: AbortSignal.timeout(20000)})).text(); } catch { return; /* 서버가 꺼져 있으면 건너뜀 */ }
  const start = html.indexOf('<script>');
  const end = html.lastIndexOf('</script>');
  assert.ok(start >= 0 && end > start, '화면 코드를 찾지 못함');
  const client = html.slice(start + '<script>'.length, end);
  assert.match(client, /resolveVideoFormat/, '화면 코드에 판정 함수가 없다');
  // 화면 코드 중 판정 함수 정의 한 줄만 뽑아 따로 실행한다(나머지 화면 코드는 브라우저가 필요해서 돌리지 않는다)
  const def = client.match(/const resolveVideoFormat = [\s\S]*?\n\};?/);
  assert.ok(def, '화면 코드에서 판정 함수 정의를 찾지 못함');
  const sandbox = {};
  vm.runInNewContext(`${def[0]}\nthis.fn = resolveVideoFormat;`, sandbox);
  const {resolveVideoFormat: serverFn} = await import('../video-format.mjs');
  const cases = [
    [{videoId: 'a', privacyStatus: 'public', durationSeconds: 64}, new Set(['a'])],
    [{videoId: 'a', privacyStatus: 'public', durationSeconds: 30}, new Set(['b'])],
    [{videoId: 'a', privacyStatus: 'public', durationSeconds: 45}, null],
    [{videoId: 'a', privacyStatus: 'public', durationSeconds: 120}, null],
    [{videoId: 'a', privacyStatus: 'private', durationSeconds: 50}, new Set(['a'])],
    [{videoId: 'a', privacyStatus: 'private', durationSeconds: 120}, new Set(['a'])],
    [{videoId: 'a', privacyStatus: 'public'}, new Set()],
    [{videoId: 'a'}, null],
  ];
  for (const [video, ids] of cases) {
    const fromClient = sandbox.fn(video, ids ? new Set(ids) : ids);
    assert.equal(fromClient, serverFn(video, ids), `화면 코드와 서버의 판정이 다름: ${JSON.stringify(video)}`);
  }
});
