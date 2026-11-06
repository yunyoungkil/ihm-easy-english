// episode-planning 스킬의 판정 규칙과 새 대화 시작 브리핑 훅을 확인한다.
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {dirname, join} from 'node:path';
import test from 'node:test';
import {fileURLToPath} from 'node:url';
import {
  buildBriefingContext,
  decideFormatPriority,
  decideSampleSize,
  extractNextActions,
  latestImpressions,
  renderSessionStartOutput,
} from '../growth-rules.mjs';

const projectDir = dirname(dirname(dirname(fileURLToPath(import.meta.url))));
const views = (shorts, longform) => [
  {creatorContentType: 'shorts', views: shorts},
  {creatorContentType: 'videoOnDemand', views: longform},
];

test('한 형식이 조회수 70% 이상인데 최근 14일 공개가 없으면 그 형식을 먼저 만들라고 판정한다', () => {
  const result = decideFormatPriority({contentTypes: views(9600, 400), publishedLast14: {shorts: 0, longform: 1}});
  assert.equal(result.priority, 'shorts');
  assert.equal(result.shares.shorts, 96);
  assert.match(result.verdict, /쇼츠부터/);
});

test('이미 그 형식을 공개 중이면 우선 판정을 내지 않는다', () => {
  const result = decideFormatPriority({contentTypes: views(9600, 400), publishedLast14: {shorts: 2, longform: 1}});
  assert.equal(result.priority, null);
});

test('롱폼이 대부분이고 공개가 끊겼으면 롱폼을 먼저 만들라고 판정한다', () => {
  const result = decideFormatPriority({contentTypes: views(200, 800), publishedLast14: {shorts: 3, longform: 0}});
  assert.equal(result.priority, 'longform');
  assert.match(result.verdict, /롱폼부터/);
});

test('어느 쪽도 70%에 못 미치면 우선 판정을 내지 않는다', () => {
  const result = decideFormatPriority({contentTypes: views(600, 400), publishedLast14: {shorts: 0, longform: 0}});
  assert.equal(result.priority, null);
});

test('정확히 70%면 우선 판정을 낸다', () => {
  const result = decideFormatPriority({contentTypes: views(700, 300), publishedLast14: {shorts: 0, longform: 2}});
  assert.equal(result.priority, 'shorts');
});

test('조회수가 100회 미만이면 표본이 작아 판정을 보류한다', () => {
  const result = decideFormatPriority({contentTypes: views(95, 4), publishedLast14: {shorts: 0, longform: 0}});
  assert.equal(result.priority, null);
  assert.match(result.verdict, /보류/);
});

test('형식별 조회 데이터가 없으면 비중을 지어내지 않는다', () => {
  const result = decideFormatPriority({contentTypes: undefined, publishedLast14: {shorts: 0, longform: 0}});
  assert.equal(result.priority, null);
  assert.equal(result.shares, null);
});

test('최근 3편의 노출 중앙값이 1,000회 미만이면 작은 표본으로 본다', () => {
  const result = decideSampleSize([70, 94, 162]);
  assert.equal(result.median, 94);
  assert.equal(result.small, true);
});

test('최근 3편의 노출 중앙값이 1,000회 이상이면 작은 표본이 아니다', () => {
  const result = decideSampleSize([1500, 1200, 2000]);
  assert.equal(result.median, 1500);
  assert.equal(result.small, false);
});

test('노출 기록이 없으면 작은 표본으로 보고 값은 비워 둔다', () => {
  const result = decideSampleSize([null, undefined]);
  assert.equal(result.median, null);
  assert.equal(result.small, true);
});

test('노출은 가장 늦게 끝난 기간의 값을 쓴다', () => {
  const impressions = latestImpressions({
    periods: {
      later: {endDate: '2026-09-01', impressions: 900},
      earlier: {endDate: '2026-08-01', impressions: 10},
    },
  });
  assert.equal(impressions, 900);
});

test('노출 기록이 없는 영상은 null을 돌려준다', () => {
  assert.equal(latestImpressions(undefined), null);
  assert.equal(latestImpressions({periods: {}}), null);
});

const sampleCheck = {
  generatedFor: '2026-11-06',
  backlog: [{name: 'ep25-pool-pull'}, {name: 'ep26-r-vs-l'}],
  cadence: {long14: 1, shorts14: 0, verdict: '발행 공백'},
  reviewsDue: [{name: 'ep23-double-consonant', due: ['7일 리뷰']}],
  formatPriority: {verdict: '쇼츠가 조회수의 96%인데 최근 14일 공개가 0개 — 다음 제작은 쇼츠부터'},
  sample: {median: 94, small: true},
};

test('브리핑 안내는 절차 위치와 점검 결과를 함께 담는다', () => {
  const context = buildBriefingContext(sampleCheck);
  assert.match(context, /Phase 0-C/);
  assert.match(context, /00-unblock-and-weekly\.md/);
  assert.match(context, /업로드 대기 2개/);
  assert.match(context, /쇼츠부터/);
  assert.match(context, /ep23-double-consonant/);
  assert.match(context, /작은 표본/);
});

test('점검이 실패해도 브리핑 안내는 남고 직접 실행하라고 알린다', () => {
  const context = buildBriefingContext(null);
  assert.match(context, /Phase 0-C/);
  assert.match(context, /npm run growth-check/);
});

const nowDoc = ['# 지금 할 일', '', '## ▶ 다음 할 일', '', '끝난 항목은 지운다.', '', '- [ ] 첫째 일', '- [x] 끝난 일', '- [ ] 둘째 일', '', '## 🔜 지금 막힌 곳', '', '- 다른 절의 항목'];

test('다음 할 일 절에서 안 끝난 항목만 순서대로 뽑는다', () => {
  assert.deepEqual(extractNextActions(nowDoc.join('\n')), ['첫째 일', '둘째 일']);
});

test('윈도우 줄바꿈 문서에서도 다음 할 일을 뽑는다', () => {
  assert.deepEqual(extractNextActions(nowDoc.join('\r\n')), ['첫째 일', '둘째 일']);
});

test('다음 할 일 절이 없으면 빈 목록을 돌려준다', () => {
  assert.deepEqual(extractNextActions('# 지금 할 일\n\n## 🔜 지금 막힌 곳\n\n- 다른 절의 항목\n'), []);
  assert.deepEqual(extractNextActions(undefined), []);
});

test('브리핑 안내에 다음 할 일을 순서대로 담는다', () => {
  const context = buildBriefingContext(sampleCheck, ['쇼츠 3개 승인받기', '썸네일 만들기']);
  assert.match(context, /다음 할 일/);
  assert.ok(context.indexOf('쇼츠 3개 승인받기') < context.indexOf('썸네일 만들기'));
  assert.ok(context.indexOf('쇼츠 3개 승인받기') > -1);
});

test('점검이 실패해도 다음 할 일은 브리핑에 남는다', () => {
  assert.match(buildBriefingContext(null, ['쇼츠 3개 승인받기']), /쇼츠 3개 승인받기/);
});

test('다음 할 일이 없으면 그 줄을 넣지 않는다', () => {
  assert.doesNotMatch(buildBriefingContext(sampleCheck, []), /다음 할 일/);
});

test('훅 출력은 SessionStart 형식을 지킨다', () => {
  const output = JSON.parse(renderSessionStartOutput('안내'));
  assert.equal(output.hookSpecificOutput.hookEventName, 'SessionStart');
  assert.equal(output.hookSpecificOutput.additionalContext, '안내');
});

test('성장 점검 결과에 형식 배분과 표본 판정이 들어간다', () => {
  const stdout = execFileSync(process.execPath, [join(projectDir, 'scripts', 'growth-check.mjs'), '--json'], {cwd: projectDir, encoding: 'utf8'});
  const result = JSON.parse(stdout);
  assert.ok('priority' in result.formatPriority);
  assert.ok('small' in result.sample);
});

test('훅을 실제로 실행하면 안내가 담긴 JSON을 내보낸다', () => {
  const stdout = execFileSync(process.execPath, [join(projectDir, 'scripts', 'session-briefing-hook.mjs')], {cwd: projectDir, encoding: 'utf8', input: '{"source":"startup"}'});
  const output = JSON.parse(stdout);
  assert.equal(output.hookSpecificOutput.hookEventName, 'SessionStart');
  assert.match(output.hookSpecificOutput.additionalContext, /Phase 0-C/);
  assert.match(output.hookSpecificOutput.additionalContext, /업로드 대기/);
});

test('실제 now.md에 다음 할 일 절이 있고 훅이 그 항목을 넘겨준다', () => {
  const actions = extractNextActions(readFileSync(join(projectDir, 'knowledge', 'now.md'), 'utf8'));
  assert.ok(actions.length > 0);
  const stdout = execFileSync(process.execPath, [join(projectDir, 'scripts', 'session-briefing-hook.mjs')], {cwd: projectDir, encoding: 'utf8', input: '{"source":"startup"}'});
  assert.ok(JSON.parse(stdout).hookSpecificOutput.additionalContext.includes(actions[0]));
});
