// 커밋 전 자동 검사(scripts/commit-guard.mjs)가 잡아야 할 것과 잡으면 안 되는 것 (2026-11-12).
// "잡아야 할 것"은 실제로 이 저장소에 들어왔던 줄을 그대로 썼다(knowledge/logs/2026-11.md 2026-11-12 절).
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  findHardcodedMetrics, findClaimWords, checkCommitMessage, addedLinesByFile, parseTestCounts,
  isMetricName, isCheckedCodeFile, isRecordFile,
} from '../commit-guard.mjs';

test('실제로 들어왔던 지어낸 성과 숫자를 잡는다', () => {
  for (const line of [
    "      sevenDayRatioText: '0.9x',", // 벤치마킹 탭 (b658e55)
    "      sevenDayRatio: 1.6,",
    "    const medianViews = Number(analyticsData.summary?.medianViews || 100);", // D+7 순환 (fb56643)
    "    if (!items.length) return { weightedCtr: 5.5, weightedRet: 42.0, count: 0 };",
    "  const label = '1.8배';",
  ]) {
    assert.ok(findHardcodedMetrics(line).length > 0, `잡아야 함: ${line}`);
  }
});

test('기준값 상수, 단위로 끝나는 이름, 0, CSS는 잡지 않는다', () => {
  for (const line of [
    '  SUCCESS_RATIO_THRESHOLD: 1.5,      // 포맷 중앙값 대비 1.5배 이상',
    '  durationSeconds: 405.23,',
    'export const LIMITS = Object.freeze({loopHours: 36, views7dDays: 12});',
    '  const totals = {views: 0, likes: 0};',
    '  .thumb { aspect-ratio: 16/9; }',
    '  const views = Number(video.statistics?.viewCount) || 0;',
    "  if (ratio >= 1.5) return 'worked'; // 기준값은 위 상수와 같다",
    '  weightedCtr: 5.5, // allow-literal: 유튜브 공식 평균 범위의 기준값(출처: help 문서)',
  ]) {
    assert.deepEqual(findHardcodedMetrics(line), [], `잡으면 안 됨: ${line}`);
  }
});

test('이름 판정: 단어 단위로 본다', () => {
  assert.equal(isMetricName('durationSeconds'), false); // "duration" 안의 ratio는 다른 단어
  assert.equal(isMetricName('views7d'), true);
  assert.equal(isMetricName('averageViewPercentage'), true);
  assert.equal(isMetricName('viewport'), false);
  assert.equal(isMetricName('MIN_VIEWS_7D'), false);
});

test('검사 대상 파일: 동작 코드만, 테스트와 가짜 데이터 파일은 뺀다', () => {
  assert.equal(isCheckedCodeFile('scripts/youtube-analytics-server.mjs'), true);
  assert.equal(isCheckedCodeFile('scripts/tests/planning-outcome.test.mjs'), false);
  assert.equal(isCheckedCodeFile('scripts/test-client-syntax.mjs'), false);
  assert.equal(isRecordFile('knowledge/logs/2026-11.md'), true);
  assert.equal(isRecordFile('videos/ep24-shorts-seat-sit/SCRIPT.md'), false); // 대본은 내용이라 뺀다
  assert.equal(isRecordFile('videos/ep23-double-consonant/REVIEW.md'), true);
  assert.equal(isRecordFile('knowledge/legacy/agents-archive-2026-11-13.md'), false); // 보관 문서는 원문 그대로라 뺀다
});

test('근거 없는 완료 표현을 잡고, 백틱으로 인용한 말은 넘긴다', () => {
  assert.ok(findClaimWords('- 브라우저 V8 VM 클라이언트 스크립트 파싱 검증: 389,404자 100% 무결점 통과.').length);
  assert.ok(findClaimWords('벤치마킹 랩 가짜 문구 박멸').length);
  assert.ok(findClaimWords('npm test 199개 100% 통과').length);
  assert.deepEqual(findClaimWords('기록에 `완벽`·`무결점` 같은 말을 쓰지 않는다'), []);
  assert.deepEqual(findClaimWords('# pass 254, # fail 0'), []);
});

test('커밋 메시지: 이름만 빌린 서명과 과장 제목을 잡는다', () => {
  assert.ok(checkCommitMessage('fix: x\n\nCo-Authored-By: Claude <noreply@anthropic.com>\n').length);
  assert.ok(checkCommitMessage('fix(dashboard): 가짜 문구 박멸\n').length);
  assert.deepEqual(checkCommitMessage('fix: x\n\nCo-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>\n'), []);
  assert.deepEqual(checkCommitMessage('feat: y\n\nCo-Authored-By: Gemini 3 Pro (Antigravity) <noreply@google.com>\n'), []);
  assert.deepEqual(checkCommitMessage('feat: y\n# 완벽 — git이 넣는 주석 줄은 메시지가 아니다\n'), []);
});

test('diff에서 파일별 추가된 줄과 줄 번호를 읽는다 (머리줄, 한글 경로, ++로 시작하는 내용)', () => {
  const diff = [
    'diff --git a/scripts/a.mjs b/scripts/a.mjs',
    'index 1..2 100644',
    '--- a/scripts/a.mjs',
    '+++ b/scripts/a.mjs',
    '@@ -10,0 +11,2 @@ function x() {',
    "+  ratio: '1.8x',",
    '++ 내용이 ++로 시작하는 줄',
    'diff --git a/knowledge/한글.md b/knowledge/한글.md',
    'new file mode 100644',
    '--- /dev/null',
    '+++ b/knowledge/한글.md',
    '@@ -0,0 +1 @@',
    '+완벽하게 끝냄',
  ].join('\n');
  const added = addedLinesByFile(diff);
  assert.deepEqual(added.get('scripts/a.mjs'), [{lineNo: 11, text: "  ratio: '1.8x',"}, {lineNo: 12, text: '+ 내용이 ++로 시작하는 줄'}]);
  assert.deepEqual(added.get('knowledge/한글.md'), [{lineNo: 1, text: '완벽하게 끝냄'}]);
});

test('테스트 결과 읽기: 화면 있음(ℹ)과 없음(#) 둘 다, 못 읽으면 0', () => {
  assert.deepEqual(parseTestCounts('ℹ tests 3\nℹ pass 3\nℹ fail 0\n'), {pass: 3, fail: 0});
  assert.deepEqual(parseTestCounts('# tests 254\n# pass 254\n# fail 0\n'), {pass: 254, fail: 0});
  assert.deepEqual(parseTestCounts('something else'), {pass: 0, fail: 0});
});
