import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parseKoreanCount, parseCardText, passesA, passesB, mergeCandidates,
  decideEndReason, judgeScreen, emptyStore, appendRun, STUDIO_RESEARCH_PATH,
} from '../studio-research.mjs';

test('parseKoreanCount: 단위와 소수 오차', () => {
  assert.equal(parseKoreanCount('2.41만명'), 24100);
  assert.equal(parseKoreanCount('4.72천'), 4720);
  assert.equal(parseKoreanCount('9.6만'), 96000);
  assert.equal(parseKoreanCount('1.2억'), 120000000);
  assert.equal(parseKoreanCount('523명'), 523);
  assert.equal(parseKoreanCount('1.36만'), 13600);
  assert.equal(parseKoreanCount('없음'), null);
  assert.equal(parseKoreanCount(null), null);
});

test('parseCardText: 숫자 칸만 뽑고 못 읽으면 null', () => {
  const c = parseCardText('12:34 효율10배 올리는 영어 채널이름 • 구독자 2.41만명 12배 조회수 9.6만회 • 3일 전');
  assert.equal(c.studioFolds, 12);
  assert.equal(c.studioSubscribers, 24100);
  assert.equal(c.studioViews, 96000);
  assert.equal(c.uploadedText, '3일 전');
  assert.equal(c.durationText, '12:34');
  const recent = parseCardText('3:21 제목 채널 • 구독자 5천명 조회수 120회 • 1일 전');
  assert.equal(recent.studioFolds, null);
  assert.equal(recent.studioSubscribers, 5000);
  const e = parseCardText('아무 글자');
  assert.equal(e.studioFolds, null);
  assert.equal(e.studioSubscribers, null);
});

test('passesA: 배수 9/10, 구독자 99999/100000 경계', () => {
  assert.equal(passesA({studioFolds: 9, studioSubscribers: 500}), false);
  assert.equal(passesA({studioFolds: 10, studioSubscribers: 500}), true);
  assert.equal(passesA({studioFolds: 10, studioSubscribers: 99999}), true);
  assert.equal(passesA({studioFolds: 10, studioSubscribers: 100000}), false);
  assert.equal(passesA({studioFolds: null, studioSubscribers: 500}), false);
  assert.equal(passesA({studioFolds: 20, studioSubscribers: null}), false);
});

test('passesB: 한글, 영어 학습, 빼는 말, 우리 채널', () => {
  const ok = {title: '영어 발음 듣기 연습', channelId: 'UCx'};
  assert.deepEqual(passesB(ok, 'UCour'), {pass: true, reason: null});
  assert.equal(passesB({...ok, channelId: 'UCour'}, 'UCour').reason, 'our-channel');
  assert.equal(passesB({title: 'English listening', channelId: 'UCx'}, 'UCour').reason, 'no-hangul');
  assert.equal(passesB({title: '영어 맞춤법', channelId: 'UCx'}, 'UCour').reason, 'excluded-word');
  assert.equal(passesB({title: '수학 공식 정리', channelId: 'UCx'}, 'UCour').reason, 'not-english-learning');
  assert.equal(passesB({title: '', channelId: 'UCx'}, 'UCour').pass, false);
});

const NOW = '2026-11-14T00:00:00.000Z';
const mk = (o) => ({videoId: 'a', firstSeenAt: '2026-11-10T00:00:00.000Z', lastSeenAt: '2026-11-10T00:00:00.000Z', timesSeen: 1, ...o});

test('mergeCandidates: 두 PC 합치기는 firstSeenAt 이른 값, lastSeenAt 늦은 값, 입력 불변', () => {
  const ex = {a: mk({firstSeenAt: '2026-11-05T00:00:00.000Z', lastSeenAt: '2026-11-12T00:00:00.000Z', timesSeen: 3})};
  const inc = {a: mk({firstSeenAt: '2026-11-08T00:00:00.000Z', lastSeenAt: '2026-11-14T00:00:00.000Z'}), b: mk({videoId: 'b'})};
  const snap = JSON.stringify([ex, inc]);
  const r = mergeCandidates(ex, inc, NOW);
  assert.equal(r.a.firstSeenAt, '2026-11-05T00:00:00.000Z');
  assert.equal(r.a.lastSeenAt, '2026-11-14T00:00:00.000Z');
  assert.equal(r.a.timesSeen, 4);
  assert.equal(r.b.timesSeen, 1);
  assert.equal(JSON.stringify([ex, inc]), snap);
});

test('mergeCandidates: 30일 경계(정확히 30일은 남고 넘으면 지움)', () => {
  const edge = mk({videoId: 'e', lastSeenAt: '2026-10-15T00:00:00.000Z'});
  const old = mk({videoId: 'o', lastSeenAt: '2026-10-14T23:59:59.000Z'});
  const r = mergeCandidates({e: edge, o: old}, {}, NOW);
  assert.ok(r.e);
  assert.equal(r.o, undefined);
});

test('decideEndReason: 4번 연속, 1200줄, 150번, 1000줄 표시', () => {
  assert.deepEqual(decideEndReason({rowCount: 500, noGrowthStreak: 4, scrolls: 20}), {endReason: 'no-more', possibleCap: false});
  assert.equal(decideEndReason({rowCount: 500, noGrowthStreak: 3, scrolls: 20}).endReason, null);
  assert.equal(decideEndReason({rowCount: 1200, noGrowthStreak: 0, scrolls: 20}).endReason, 'row-cap');
  assert.equal(decideEndReason({rowCount: 500, noGrowthStreak: 0, scrolls: 150}).endReason, 'scroll-cap');
  assert.equal(decideEndReason({rowCount: 1000, noGrowthStreak: 4, scrolls: 20}).possibleCap, true);
  assert.equal(decideEndReason({rowCount: 999, noGrowthStreak: 4, scrolls: 20}).possibleCap, false);
});

test('judgeScreen: 0줄, 읽기 성공률 0.9 경계, 필터 유실', () => {
  assert.equal(judgeScreen({listed: 0, parsedRate: 1, filterKept: true, isRecent: false}).changed, true);
  assert.equal(judgeScreen({listed: 100, parsedRate: 0.89, filterKept: true, isRecent: false}).changed, true);
  assert.equal(judgeScreen({listed: 100, parsedRate: 0.9, filterKept: true, isRecent: false}).changed, false);
  assert.equal(judgeScreen({listed: 100, parsedRate: 1, filterKept: false, isRecent: true}).reason, 'filter-lost');
});

test('emptyStore와 appendRun: runs 최근 60개', () => {
  assert.equal(STUDIO_RESEARCH_PATH, 'data/youtube/studio-research.json');
  const s = emptyStore('UCour');
  assert.deepEqual(s, {schemaVersion: 1, channelId: 'UCour', updatedAt: null, filterVersion: 1, runs: [], candidates: {}});
  let cur = s;
  for (let i = 0; i < 65; i++) cur = appendRun(cur, {i});
  assert.equal(cur.runs.length, 60);
  assert.equal(cur.runs[0].i, 5);
  assert.equal(s.runs.length, 0);
});

test('mergeCandidates: 같은 날 다시 돌려도 timesSeen이 부풀지 않는다', () => {
  const a = {x: mk({firstSeenAt: '2026-11-14T01:00:00.000Z', lastSeenAt: '2026-11-14T01:00:00.000Z', timesSeen: 1})};
  const b = {x: mk({firstSeenAt: '2026-11-14T03:00:00.000Z', lastSeenAt: '2026-11-14T03:00:00.000Z', timesSeen: 1})};
  assert.equal(mergeCandidates(a, b, NOW).x.timesSeen, 1);
});

test('appendRun: 같은 날짜·형식·목록의 run은 바꿔 쓴다', () => {
  let s = emptyStore('UCour');
  s = appendRun(s, {date: '2026-11-14', format: 'SHORTS', list: 'outliers', passed: 1});
  s = appendRun(s, {date: '2026-11-14', format: 'SHORTS', list: 'outliers', passed: 2});
  assert.equal(s.runs.length, 1);
  assert.equal(s.runs[0].passed, 2);
});
