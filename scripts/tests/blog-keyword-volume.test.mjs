import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {
  HINTS_PER_CALL,
  annotateQueue,
  callKeywordTool,
  formatVolume,
  lookupVolumes,
  normalizeKeyword,
  parseCount,
  relatedKeywords,
  summarizeRow,
} from '../blog/keyword-volume.mjs';

const env = {NAVER_SEARCHAD_CUSTOMER_ID: 'c1', NAVER_SEARCHAD_ACCESS_LICENSE: 'lic', NAVER_SEARCHAD_SECRET_KEY: 'sec'};

function fakeFetch(rowsFor) {
  const calls = [];
  const impl = async (url, opts) => {
    calls.push({url, headers: opts.headers});
    const hints = new URL(url).searchParams.get('hintKeywords').split(',');
    return {status: 200, text: async () => JSON.stringify({keywordList: rowsFor(hints)})};
  };
  return {impl, calls};
}

test('normalizeKeyword·parseCount: 띄어쓰기 제거, "< 10"은 숫자로 바꾸지 않는다', () => {
  assert.equal(normalizeKeyword('아이폰 교통카드  인식 안됨'), '아이폰교통카드인식안됨');
  assert.equal(parseCount(310), 310);
  assert.equal(parseCount('< 10'), '<10');
  assert.equal(parseCount(undefined), null);
});

test('summarizeRow: "< 10"이 섞이면 숫자 칸만 더하고 lowerBound', () => {
  assert.deepEqual(
    summarizeRow({relKeyword: '아이폰교통카드인식안됨', monthlyPcQcCnt: '< 10', monthlyMobileQcCnt: 20, compIdx: '중간'}),
    {keyword: '아이폰교통카드인식안됨', pc: '<10', mobile: 20, total: 20, lowerBound: true, compIdx: '중간'},
  );
});

test('callKeywordTool: 띄어쓰기 없이 보내고, 서명은 "<시각>.GET./keywordstool"', async () => {
  const {impl, calls} = fakeFetch(() => []);
  await callKeywordTool(['식기세척기 설치 조건'], {env, fetchImpl: impl, now: () => 1700000000000, projectDir: '/nonexistent'});
  const u = new URL(calls[0].url);
  assert.equal(u.pathname, '/keywordstool');
  assert.equal(u.searchParams.get('hintKeywords'), '식기세척기설치조건');
  const expected = crypto.createHmac('sha256', 'sec').update('1700000000000.GET./keywordstool').digest('base64');
  assert.equal(calls[0].headers['X-Signature'], expected);
  assert.equal(calls[0].headers['X-Customer'], 'c1');
  await assert.rejects(() => callKeywordTool(['a', 'b', 'c', 'd', 'e', 'f'], {env, fetchImpl: impl, projectDir: '/nonexistent'}), /5개까지/);
});

test('callKeywordTool: 200이 아니면 오류', async () => {
  const impl = async () => ({status: 400, text: async () => JSON.stringify({code: 11001, message: 'hintKeywords 파라미터가 유효하지 않습니다.'})});
  await assert.rejects(() => callKeywordTool(['x'], {env, fetchImpl: impl, projectDir: '/nonexistent'}), /400.*hintKeywords/);
});

test('lookupVolumes: 5개씩 나눠 부르고, 응답에 없는 낱말은 found=false(숫자를 만들지 않음)', async () => {
  const words = ['가 나', '다', '라', '마', '바', '사', '없는말'];
  const {impl, calls} = fakeFetch((hints) => hints.filter((h) => h !== '없는말').map((h) => ({relKeyword: h, monthlyPcQcCnt: 10, monthlyMobileQcCnt: 90, compIdx: '낮음'})));
  const vols = await lookupVolumes(words, {env, fetchImpl: impl, projectDir: '/nonexistent'});
  assert.equal(calls.length, Math.ceil(words.length / HINTS_PER_CALL));
  assert.equal(vols.get('가나').total, 100);
  assert.deepEqual(vols.get('없는말'), {query: '없는말', found: false});
});

test('relatedKeywords: 많이 찾는 순', async () => {
  const {impl} = fakeFetch(() => [
    {relKeyword: '적음', monthlyPcQcCnt: '< 10', monthlyMobileQcCnt: 20},
    {relKeyword: '많음', monthlyPcQcCnt: 1000, monthlyMobileQcCnt: 9000},
  ]);
  const rows = await relatedKeywords('교통카드', {env, fetchImpl: impl, projectDir: '/nonexistent'});
  assert.deepEqual(rows.map((r) => r.keyword), ['많음', '적음']);
});

test('annotateQueue·formatVolume: 대기열에 searchVolume을 적고 사람이 읽는 문구로', () => {
  const vols = new Map([
    ['아이폰교통카드인식안됨', {query: '아이폰 교통카드 인식 안됨', found: true, pc: '<10', mobile: 20, total: 20, lowerBound: true, compIdx: '중간'}],
    ['없는말', {query: '없는말', found: false}],
  ]);
  const out = annotateQueue([
    {topicId: 'a', searchQuery: '아이폰 교통카드 인식 안됨'},
    {topicId: 'b', searchQuery: '없는말'},
    {topicId: 'c'},
  ], vols, '2026-11-27');
  assert.equal(out[0].searchVolume.total, 20);
  assert.equal(out[0].searchVolume.checkedAt, '2026-11-27');
  assert.equal(out[1].searchVolume.found, false);
  assert.equal(out[2].searchVolume, undefined);
  assert.equal(formatVolume(out[0].searchVolume), '월 약 20회(PC <10 · 휴대폰 20)');
  assert.equal(formatVolume(out[1].searchVolume), '조회 결과 없음');
  assert.equal(formatVolume({found: true, pc: '<10', mobile: '<10', total: 0, lowerBound: true}), '월 10회 미만(PC <10 · 휴대폰 <10)');
});

test('annotateQueue: 주 검색어(targetKeyword)가 있으면 그것으로 잰다', () => {
  const vols = new Map([['애플페이교통카드', {query: '애플페이 교통카드', found: true, pc: 900, mobile: 12700, total: 13600, lowerBound: false, compIdx: '중간'}]]);
  const [t] = annotateQueue([{topicId: 'a', searchQuery: '아이폰 교통카드 인식 안됨', targetKeyword: '애플페이 교통카드'}], vols, '2026-11-27');
  assert.equal(t.searchVolume.keyword, '애플페이 교통카드');
  assert.equal(t.searchVolume.total, 13600);
});
