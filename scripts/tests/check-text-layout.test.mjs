import test from 'node:test';
import assert from 'node:assert/strict';
import {judgeBlock, dedupeIssues, pickSampleTimes, formatReport} from '../check-text-layout.mjs';

// 칸 이름은 collectBlocksInPage가 실제로 내는 것과 같다: selector, classes, text, lines[{text,left,right,top,bottom}], rect, parentRect
const line = (text, left, right, top = 0) => ({text, left, right, top, bottom: top + 40});
const block = (lines, extra = {}) => ({
  selector: '#scene-10-encore .end-box-title', classes: ['end-box-title'],
  text: lines.map((l) => l.text).join(' '), lines,
  rect: {left: 100, right: 700, top: 0, bottom: lines.length * 40}, parentRect: {left: 90, right: 710, top: -5, bottom: 500},
  ...extra,
});

test('404.5초 사례: [f] vs / [p]는 외톨이와 vs 끊김으로 잡힌다', () => {
  const b = block([line('EP28: F vs P 0.1초 조음 물리법칙 [f] vs', 100, 700), line('[p]', 100, 150, 40)]);
  const kinds = judgeBlock(b).map((i) => i.kind);
  assert.ok(kinds.includes('orphan-last-line'));
  assert.ok(kinds.includes('bracket-split'));
});

test('404.5초 사례: 마지막 줄이 "하기" 두 글자면 외톨이', () => {
  const b = block([line('이해하면 쉬운영어 채널 구독하고 실력 완성', 100, 700), line('하기', 100, 160, 40)]);
  const issues = judgeBlock(b);
  assert.equal(issues.length, 1);
  assert.equal(issues[0].kind, 'orphan-last-line');
});

test('정상: 줄 길이가 고른 두 줄과 한 줄은 0건', () => {
  assert.deepEqual(judgeBlock(block([line('Did you take the boat', 100, 600), line('to cast your vote?', 100, 520, 40)])), []);
  assert.deepEqual(judgeBlock(block([line('한 줄짜리 제목', 100, 400)])), []);
});

test('괄호 쌍이 두 줄에 걸치면 bracket-split', () => {
  const b = block([line('조음 물리법칙 [f', 100, 600), line('vs p] 입니다 정말로 그렇습니다', 100, 600, 40)]);
  assert.ok(judgeBlock(b).some((i) => i.kind === 'bracket-split' && i.value.includes('쌍')));
});

test('vs 혼자 한 줄도 잡는다', () => {
  const b = block([line('A 소리는 이렇게 낸다', 100, 600), line('vs', 100, 150, 40), line('B 소리는 이렇게 낸다', 100, 600, 80)]);
  assert.ok(judgeBlock(b).some((i) => i.kind === 'bracket-split'));
});

test('nowrap 클래스가 두 줄로 접히면 text-overflow', () => {
  const b = block([line('WAN ·', 100, 400), line('TED', 100, 380, 40)], {classes: ['word-text']});
  assert.ok(judgeBlock(b).some((i) => i.kind === 'text-overflow' && i.value.includes('word-text')));
});

test('화면 1920x1080 밖으로 나가면 text-overflow, 부모 상자 밖도 잡는다', () => {
  const out = block([line('긴 글자', 1800, 1990)], {rect: {left: 1800, right: 1990, top: 0, bottom: 40}, parentRect: null});
  assert.ok(judgeBlock(out).some((i) => i.kind === 'text-overflow' && i.value.includes('오른쪽 70px')));
  const inCard = block([line('긴 글자', 100, 760)], {rect: {left: 100, right: 760, top: 0, bottom: 40}});
  assert.ok(judgeBlock(inCard).some((i) => i.value.includes('부모 상자 밖')));
  assert.deepEqual(judgeBlock(block([line('짧음', 100, 300)])), []);
});

test('dedupeIssues: 같은 이슈는 시각만 모은다', () => {
  const it = {selector: 's', text: 't', kind: 'orphan-last-line', value: 'v'};
  const out = dedupeIssues([{...it, time: 1}, {...it, time: 2}, {...it, kind: 'text-overflow', time: 2}]);
  assert.equal(out.length, 2);
  assert.deepEqual(out[0].times, [1, 2]);
});

test('pickSampleTimes: --at와 장면 경계 뒤 0.5초 등을 합치고 --only-at이면 --at만', () => {
  const scenes = [{id: 'scene-01', start: 0, duration: 27.36}, {id: 'scene-02', start: 27.36, duration: 33.12}];
  const t = pickSampleTimes(scenes, [404.5]);
  assert.ok(t.includes(0.5) && t.includes(27.86) && t.includes(404.5));
  assert.deepEqual(pickSampleTimes(scenes, [404.5, 15], true), [15, 404.5]);
});

test('formatReport: 0건이면 "0건"', () => {
  assert.match(formatReport([], [1, 2]), /0건/);
  assert.match(formatReport([{times: [1], selector: 's', text: 't', kind: 'k', value: 'v'}], [1]), /1건/);
});
