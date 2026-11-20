// 2026-11-09 점검 보고서(knowledge/growth/review-2026-11-09.md)의 대시보드 문제 1·3·4·6·8번 회귀 테스트.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {pickLatestPeriod, toStoredCtr} from '../studio-reach.mjs';
import {isDiagnosable} from '../matrix-diagnosis.mjs';
import {aiAnalysisFailed} from '../analyze-outlier-comments.mjs';
import {createKeyedDebouncer} from '../studio-auto-ingest.mjs';

// 3번: Studio 내보내기에서 CTR 칸이 비면 0이 아니라 "없음"으로 남긴다.
test('빈 CTR은 0이 아니라 null로 저장한다', () => {
  assert.equal(toStoredCtr(null), null);
  assert.equal(toStoredCtr(undefined), null);
});

test('값이 있는 CTR은 숫자로 저장한다(진짜 0%도 0으로)', () => {
  assert.equal(toStoredCtr(3.4), 3.4);
  assert.equal(toStoredCtr(0), 0);
});

// 4번: 같은 날 끝나는 구간이 여럿이면 더 긴 구간(표본이 큰 쪽)을 쓴다.
test('종료일이 같으면 더 긴 구간을 고른다', () => {
  const periods = {
    week: {startDate: '2026-11-01', endDate: '2026-11-07', ctr: 9.9, impressions: 50},
    month: {startDate: '2026-10-11', endDate: '2026-11-07', ctr: 4.1, impressions: 900},
  };
  assert.equal(pickLatestPeriod(periods).ctr, 4.1);
});

test('종료일이 다르면 가장 최근 구간을 고른다', () => {
  const periods = {
    old: {startDate: '2026-09-01', endDate: '2026-10-01', ctr: 2},
    recent: {startDate: '2026-11-01', endDate: '2026-11-07', ctr: 5},
  };
  assert.equal(pickLatestPeriod(periods).ctr, 5);
});

test('CTR이 없는 구간은 고르지 않는다', () => {
  const periods = {
    empty: {startDate: '2026-10-01', endDate: '2026-11-07', ctr: null},
    ok: {startDate: '2026-10-01', endDate: '2026-11-01', ctr: 3},
  };
  assert.equal(pickLatestPeriod(periods).ctr, 3);
  assert.equal(pickLatestPeriod({}), null);
});

// 1번: 사분면이 확정된 영상만 AI 처방을 받는다.
test('확정된 Q1~Q4 영상만 AI 처방 대상이다', () => {
  assert.equal(isDiagnosable({quadrant: 'Q3', isVerified: true}), true);
  for (const quadrant of ['LOW_SAMPLE', 'WARMUP', 'PENDING_STUDIO']) {
    assert.equal(isDiagnosable({quadrant, isVerified: false}), false, quadrant);
  }
  assert.equal(isDiagnosable({quadrant: 'Q4', isVerified: false}), false);
  assert.equal(isDiagnosable(null), false);
});

// 6번: 키도 있고 댓글도 있는데 AI 결과가 없으면 실패다. 키가 없거나 댓글이 없으면 원래 AI를 부르지 않는다.
test('AI를 불렀는데 결과가 없으면 실패로 본다', () => {
  assert.equal(aiAnalysisFailed({hasGeminiKey: true, commentsCount: 40, aiInsights: null}), true);
  assert.equal(aiAnalysisFailed({hasGeminiKey: true, commentsCount: 40, aiInsights: {painPoints: []}}), false);
  assert.equal(aiAnalysisFailed({hasGeminiKey: false, commentsCount: 40, aiInsights: null}), false);
  assert.equal(aiAnalysisFailed({hasGeminiKey: true, commentsCount: 0, aiInsights: null}), false);
});

// 8번: 1초 안에 서로 다른 파일 두 개가 와도 둘 다 처리한다. 같은 파일 이벤트는 한 번만.
test('다른 파일은 따로 기다리고, 같은 파일은 한 번만 처리한다', (t) => {
  t.mock.timers.enable({apis: ['setTimeout']});
  const ran = [];
  const debounce = createKeyedDebouncer(1000);
  debounce('a.zip', () => ran.push('a'));
  debounce('b.zip', () => ran.push('b'));
  debounce('a.zip', () => ran.push('a2'));
  t.mock.timers.tick(1000);
  assert.deepEqual(ran.sort(), ['a2', 'b']);
});

test('대시보드 헤더는 400px 모바일 화면에서 버튼이 넘치지 않도록 768px 이하 반응형 줄바꿈 규칙을 가진다', () => {
  const serverPath = join(dirname(fileURLToPath(import.meta.url)), '..', 'youtube-analytics-server.mjs');
  const src = readFileSync(serverPath, 'utf8');
  assert.match(src, /@media\(max-width:\s*768px\)/);
  assert.match(src, /\.header-right\s*\{[^}]*flex-wrap:\s*wrap/s);
  assert.match(src, /\.header-right\s+\.btn\s*\{[^}]*max-width:\s*100%/s);
});
