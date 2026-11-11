import test from 'node:test';
import assert from 'node:assert/strict';
import {decideDailySteps, pickCommentTargets, COMPETITOR_REFRESH_DAYS, AUDIENCE_REFRESH_DAYS} from '../daily-loop.mjs';

const now = new Date('2026-11-20T20:00:00Z');
const ago = (d) => new Date(now.getTime() - d * 86400000).toISOString();

test('동기화는 매일 한다', () => {
  assert.equal(decideDailySteps({now, competitorsAnalyzedAt: ago(1), audienceDnaUpdatedAt: ago(1)}).sync, true);
});

test(`경쟁 채널은 ${COMPETITOR_REFRESH_DAYS}일이 지났거나 기록이 없을 때만 새로 받는다`, () => {
  assert.equal(decideDailySteps({now, competitorsAnalyzedAt: ago(COMPETITOR_REFRESH_DAYS - 1)}).competitors, false);
  assert.equal(decideDailySteps({now, competitorsAnalyzedAt: ago(COMPETITOR_REFRESH_DAYS + 0.1)}).competitors, true);
  assert.equal(decideDailySteps({now, competitorsAnalyzedAt: null}).competitors, true);
});

test(`시청자 고민은 ${AUDIENCE_REFRESH_DAYS}일이 지났거나 기록이 없을 때만 분석한다`, () => {
  assert.equal(decideDailySteps({now, audienceDnaUpdatedAt: ago(AUDIENCE_REFRESH_DAYS - 1)}).audience, false);
  assert.equal(decideDailySteps({now, audienceDnaUpdatedAt: ago(59)}).audience, true);
  assert.equal(decideDailySteps({now, audienceDnaUpdatedAt: null}).audience, true);
});

const ch = (id, status, outliers) => ({channelId: id, status, topOutliers: outliers});
const o = (videoId, outlierRatio) => ({videoId, outlierRatio});

test('댓글 분석 대상: 차단·졸업 채널은 빼고, 이미 분석한 영상은 빼고, 배수 큰 순으로 n개', () => {
  const md = {trackedChannels: [
    ch('A', 'candidate', [o('a1', 5), o('a2', 50)]),
    ch('B', 'gold_mine', [o('b1', 20)]),
    ch('C', 'blocked', [o('c1', 999)]),
    ch('D', 'graduated', [o('d1', 888)]),
  ]};
  assert.deepEqual(pickCommentTargets(md, new Set(['a2']), 3), ['b1', 'a1']);
});

test('같은 영상이 여러 채널·키워드에 있어도 한 번만 고른다', () => {
  const md = {trackedChannels: [ch('A', 'candidate', [o('x', 9)]), ch('B', 'candidate', [o('x', 9), o('y', 3)])]};
  assert.deepEqual(pickCommentTargets(md, new Set(), 3), ['x', 'y']);
});
