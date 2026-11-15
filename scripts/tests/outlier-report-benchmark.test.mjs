// 벤치마킹 리포트 마무리 3가지 시험(2026-11-15, 방향 점검 D `knowledge/audits/2026-11-15-direction-audit/d-benchmarking.md`).
// 1) 리포트가 새 배수 필드(ratioMethod 등)를 같이 저장 2) "성인에게 영어 소리를 가르치는 영상인가" 칸 3) 컷 0개 표시.
// 가짜 응답의 칸 이름은 실제 리포트 JSON(data/youtube/outlier-reports/*.json)과 peer-ratio.mjs 출력을 따른다. API는 부르지 않는다.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ratioFieldsFromEntry, buildReportPrompt, normalizeTeachesAdultEnglishSounds, audienceDnaEntriesFromReport, findRatioEntry, RATIO_FIELD_NAMES,
} from '../outlier-report.mjs';
import {renderReportPage, renderReportIndex, cutCountLabel} from '../outlier-report-view.mjs';
import {computePeerRatio, formatRatioLabel, RATIO_METHOD} from '../peer-ratio.mjs';

const NOW = new Date('2026-11-15T00:00:00Z');
const day = (n) => new Date(NOW.getTime() - n * 86_400_000).toISOString();
const vid = (videoId, viewCount, ageDays, isShort = true) => ({videoId, viewCount, publishedAt: day(ageDays), isShort});
const peers = [vid('p1', 1000, 10), vid('p2', 2000, 12), vid('p3', 3000, 14), vid('p4', 4000, 16), vid('p5', 5000, 18)];

test('새 방식 배수 항목은 7개 칸을 그대로 리포트로 옮기고, 화면 라벨이 새 값("N배")으로 나온다', () => {
  const ok = computePeerRatio({video: vid('v0', 6000, 20), channelVideos: peers, now: NOW});
  assert.equal(ok.ratioStatus, 'ok');
  const fields = ratioFieldsFromEntry(ok);
  assert.deepEqual(Object.keys(fields).sort(), [...RATIO_FIELD_NAMES].sort());
  for (const k of RATIO_FIELD_NAMES) assert.equal(fields[k], ok[k] ?? null, k);
  assert.equal(fields.ratioMethod, RATIO_METHOD);
  assert.match(formatRatioLabel({...fields}), /^\d+(\.\d+)?배$/);
  assert.doesNotMatch(formatRatioLabel({...fields}), /옛 방식/);
});

test('측정 중·보류 항목도 상태와 사유를 옮기고, 값이 없는 칸은 null로 비운다(대신값 없음)', () => {
  const measuring = computePeerRatio({video: vid('v1', 100, 2), channelVideos: peers, now: NOW});
  const f = ratioFieldsFromEntry(measuring);
  assert.equal(f.ratioStatus, 'measuring');
  assert.equal(f.outlierRatio, null);
  assert.equal(f.ratioDenominator, null);
  assert.match(f.ratioReason, /측정 중/);
  assert.equal(formatRatioLabel(f), '측정 중');
});

test('옛 방식 항목(ratioMethod 칸 없음)은 배수 값은 옮기되 새 방식 칸은 null이라 화면이 "옛 방식(참고용)"으로 보인다', () => {
  const old = {videoId: 'klRk7F5k2TE', outlierRatio: 762.73, viewsPerDay: 745.1, channelBaselineViewsPerDay: 1}; // 실제 market-demand 항목의 칸
  const f = ratioFieldsFromEntry(old);
  assert.equal(f.outlierRatio, 762.73);
  assert.equal(f.ratioMethod, null);
  assert.equal(f.ratioStatus, null);
  assert.match(formatRatioLabel(f), /옛 방식/);
});

test('항목이 아예 없으면 전부 null(측정 전)', () => {
  const f = ratioFieldsFromEntry(undefined);
  for (const k of RATIO_FIELD_NAMES) assert.equal(f[k], null, k);
  assert.equal(formatRatioLabel(f), '측정 전');
});

test('findRatioEntry는 market-demand 구조(byKeyword·trackedChannels의 topOutliers)에서 영상 ID로 항목 전체를 찾는다', () => {
  const md = {byKeyword: [{topOutliers: [{videoId: 'a', outlierRatio: 1}]}], trackedChannels: [{topOutliers: [{videoId: 'b', outlierRatio: 2, ratioMethod: RATIO_METHOD, ratioStatus: 'ok'}]}]};
  assert.equal(findRatioEntry(md, 'b').ratioMethod, RATIO_METHOD);
  assert.equal(findRatioEntry(md, 'zzz'), null);
  assert.equal(findRatioEntry({}, 'a'), null);
});

test('프롬프트는 옛 "하루 조회수 N배" 문장을 쓰지 않는다', () => {
  const prompt = buildReportPrompt({meta: {videoId: 'x', title: 't', channelTitle: 'c', viewCount: 10, publishedAt: day(20), durationSeconds: 30}, outlierRatio: 3.2, windowSeconds: 30});
  assert.doesNotMatch(prompt, /하루 조회수/);
  assert.match(prompt, /3\.2배/);
});

test('프롬프트가 "성인에게 영어 소리를 가르치는 영상인가" 칸과 이유 칸을 요구한다', () => {
  const prompt = buildReportPrompt({meta: {videoId: 'x', title: 't', channelTitle: 'c', viewCount: 10, publishedAt: day(20), durationSeconds: 30}, windowSeconds: 30});
  assert.match(prompt, /"teachesAdultEnglishSounds"/);
  assert.match(prompt, /"teachesAdultEnglishSoundsReason"/);
});

test('판정 칸 정리: true/false만 받고, 그 밖의 값·빠진 칸은 null(미판정)로 두며 이유는 글자로만 남긴다', () => {
  assert.deepEqual(
    [normalizeTeachesAdultEnglishSounds({teachesAdultEnglishSounds: false, teachesAdultEnglishSoundsReason: ' 연예인 토크 클립 '})].map((a) => [a.teachesAdultEnglishSounds, a.teachesAdultEnglishSoundsReason]),
    [[false, '연예인 토크 클립']],
  );
  assert.equal(normalizeTeachesAdultEnglishSounds({teachesAdultEnglishSounds: true}).teachesAdultEnglishSounds, true);
  assert.equal(normalizeTeachesAdultEnglishSounds({teachesAdultEnglishSounds: 'false'}).teachesAdultEnglishSounds, null, '문자열 "false"를 거짓으로 읽지 않는다');
  assert.equal(normalizeTeachesAdultEnglishSounds({}).teachesAdultEnglishSounds, null);
  assert.equal(normalizeTeachesAdultEnglishSounds({}).teachesAdultEnglishSoundsReason, '');
  const src = {click: {titleDevice: 'x'}};
  assert.equal(normalizeTeachesAdultEnglishSounds(src).click.titleDevice, 'x');
  assert.ok(!('teachesAdultEnglishSounds' in src), '원본 객체를 바꾸지 않는다');
});

const reportWith = (flag) => ({
  videoId: 'abcdefghijk', meta: {channelTitle: '경쟁 채널'},
  analysis: {
    ...(flag === undefined ? {} : {teachesAdultEnglishSounds: flag}),
    viewerReaction: {
      painPoints: [{pain: '혀가 꼬여요', quote: 'q', quoteVerified: true}],
      unanswered: [{question: '영국식도 같나요?', quote: 'q', quoteVerified: true}],
      vocabulary: [{expression: '버터 발음', quote: 'q', quoteVerified: true}],
      resonated: [],
    },
  },
});

test('판정이 거짓이면 시청자 고민 데이터로 보내지 않는다. 참이거나 미판정(옛 리포트)이면 지금처럼 보낸다', () => {
  assert.equal(audienceDnaEntriesFromReport(reportWith(false)).length, 0);
  assert.equal(audienceDnaEntriesFromReport(reportWith(true)).length, 3);
  assert.equal(audienceDnaEntriesFromReport(reportWith(null)).length, 3, 'null=미판정');
  assert.equal(audienceDnaEntriesFromReport(reportWith(undefined)).length, 3, '칸이 없는 옛 리포트');
});

test('컷 수 라벨: 0개(또는 값 없음)는 "감지 실패 가능", 1개 이상은 그대로', () => {
  assert.match(cutCountLabel({count: 0}), /감지 실패 가능/);
  assert.match(cutCountLabel({count: 0}), /0번/);
  assert.match(cutCountLabel(undefined), /감지 실패 가능/);
  assert.equal(cutCountLabel({count: 15}), '15번');
});

const pageReport = (count, extra = {}) => ({
  videoId: 'SbQVBQoRciA', analyzedAt: '2026-11-12T00:00:00Z', subscriberCount: 1000,
  meta: {videoId: 'SbQVBQoRciA', title: 't', channelTitle: '채널', viewCount: 10, durationSeconds: 53},
  analysis: {visualMoments: [], flow: [], viewerReaction: {}},
  quoteCheck: {checked: 0, verified: 0, unverified: 0}, pacing: {count, medianGapSeconds: null, perMinute: 0, times: []},
  frames: [], windowSeconds: 53, ...extra,
});

test('리포트 화면과 목록이 컷 0개를 "감지 실패 가능"으로 표시하고, 컷이 있으면 붙이지 않는다', () => {
  assert.match(renderReportPage(pageReport(0)), /감지 실패 가능/);
  assert.match(renderReportIndex([pageReport(0)]), /감지 실패 가능/);
  assert.doesNotMatch(renderReportPage(pageReport(15)), /감지 실패 가능/);
  assert.doesNotMatch(renderReportIndex([pageReport(15)]), /감지 실패 가능/);
});

test('리포트 화면은 성인 영어 소리 학습 영상 판정(거짓·미판정)을 보여 준다', () => {
  const no = renderReportPage(pageReport(15, {analysis: {visualMoments: [], flow: [], viewerReaction: {}, teachesAdultEnglishSounds: false, teachesAdultEnglishSoundsReason: '동요 영상'}}));
  assert.match(no, /시청자 고민 데이터에서 뺌/);
  assert.match(no, /동요 영상/);
  assert.match(renderReportPage(pageReport(15)), /미판정/);
});

test('화면에 새 방식 배수 필드가 있는 리포트는 "옛 방식(참고용)"으로 보이지 않는다', () => {
  const ok = ratioFieldsFromEntry(computePeerRatio({video: vid('v0', 6000, 20), channelVideos: peers, now: NOW}));
  assert.doesNotMatch(renderReportPage(pageReport(15, ok)), /옛 방식/);
  assert.match(renderReportPage(pageReport(15, {outlierRatio: 570})), /옛 방식/);
});
