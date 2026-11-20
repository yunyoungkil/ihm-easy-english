import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parsePlanningSources, judgeOutcome, buildEpisodeOutcomes, sevenDayWindow, videosNeedingViews7d,
  MIN_VIEWS_7D, SMALL_SAMPLE_VIEWS_7D,
} from '../planning-outcome.mjs';

// ---- parsePlanningSources: BRIEF.md "기획 근거" 칸만 읽고, 없으면 짐작하지 않는다 ----

const brief = (body) => `# BRIEF\n\n## 주제\n- 무언가\n\n## 기획 근거\n${body}\n\n## 다음 절\n- 경쟁 영상: 여기는 다른 절이라 읽으면 안 됨 (UCzzzzzzzzzzzzzzzzzzzzzz) · zzzzzzzzzzz · "x" · 평소 대비 9배\n`;

test('기획 근거 칸이 없으면 null을 돌려준다', () => {
  assert.equal(parsePlanningSources('# BRIEF\n\n## 주제\n- 무언가\n'), null);
});

test('경쟁 영상 줄에서 채널 이름·채널 ID·영상 ID·배율을 읽는다', () => {
  const got = parsePlanningSources(brief([
    '- 소재 이력 topic: "R vs L 첫소리 구분 (right·light)"',
    '- 경쟁 영상: 봄날영어학교 (UCabcdefghijklmnopqrstuv) · AbCdEfGhIjK · "긴 단어를 쉽고 빠르게" · 평소 대비 30.8배',
    '- 시청자 고민: "r이랑 l이 똑같이 들려요" (4회)',
  ].join('\n')));
  assert.equal(got.topic, 'R vs L 첫소리 구분 (right·light)');
  assert.deepEqual(got.competitors, [
    {channelTitle: '봄날영어학교', channelId: 'UCabcdefghijklmnopqrstuv', videoId: 'AbCdEfGhIjK', sourceRatio: 30.8},
  ]);
  assert.equal(got.audience, 'r이랑 l이 똑같이 들려요');
});

test('"경쟁 근거 없음"이면 경쟁 채널 목록이 비어 있다', () => {
  const got = parsePlanningSources(brief('- 경쟁 영상: 경쟁 근거 없음\n- 시청자 고민: 없음'));
  assert.deepEqual(got.competitors, []);
  assert.equal(got.audience, null);
});

test('다른 절에 있는 경쟁 영상 줄은 읽지 않는다', () => {
  const got = parsePlanningSources(brief('- 경쟁 영상: 경쟁 근거 없음'));
  assert.equal(got.competitors.length, 0);
});

test('경쟁 영상 줄이 여러 개면 모두 읽는다', () => {
  const got = parsePlanningSources(brief([
    '- 경쟁 영상: 가 (UCaaaaaaaaaaaaaaaaaaaaaa) · aaaaaaaaaaa · "가" · 평소 대비 3배',
    '- 경쟁 영상: 나 (UCbbbbbbbbbbbbbbbbbbbbbb) · bbbbbbbbbbb · "나" · 평소 대비 5.5배',
  ].join('\n')));
  assert.deepEqual(got.competitors.map((c) => c.channelId), ['UCaaaaaaaaaaaaaaaaaaaaaa', 'UCbbbbbbbbbbbbbbbbbbbbbb']);
});

// ---- judgeOutcome: "공개 후 첫 7일 조회수"로 비교하고, 표본이 작으면 판정하지 않는다 ----

const base = {views7d: 600, sampleMedianViews7d: 500, baselineViews7d: 400};

test('7일 조회수가 아직 없으면 대기', () => {
  assert.equal(judgeOutcome({...base, views7d: null}).verdict, 'pending');
});

test(`그 영상의 7일 조회가 ${MIN_VIEWS_7D}회 미만이면 보류`, () => {
  const got = judgeOutcome({...base, views7d: MIN_VIEWS_7D - 1});
  assert.equal(got.verdict, 'hold');
  assert.match(got.reason, /7일 조회/);
});

test(`같은 형식 최근 3편 7일 조회 중앙값이 ${SMALL_SAMPLE_VIEWS_7D}회 미만이면 작은 표본으로 보류하되 배수는 참고로 남긴다`, () => {
  const got = judgeOutcome({views7d: 200, sampleMedianViews7d: 8, baselineViews7d: 100});
  assert.equal(got.verdict, 'hold');
  assert.equal(got.ratio, 2);
  assert.match(got.reason, /작은 표본/);
});

test('비교할 같은 형식 기준이 없으면 보류', () => {
  assert.equal(judgeOutcome({...base, baselineViews7d: null}).verdict, 'hold');
  assert.equal(judgeOutcome({...base, baselineViews7d: 0}).verdict, 'hold');
});

test('1.5배 이상이면 통함, 0.5배 미만이면 안 통함, 그 사이는 보통 (반올림 전 값으로 판정)', () => {
  assert.equal(judgeOutcome({...base, views7d: 600}).verdict, 'worked');
  assert.equal(judgeOutcome({...base, views7d: 196}).verdict, 'failed'); // 0.49배 — 반올림하면 0.5배지만 안 통함
  assert.equal(judgeOutcome({...base, views7d: 400}).verdict, 'neutral');
});

// ---- sevenDayWindow / videosNeedingViews7d: 7일 조회수를 언제, 어느 영상에 물어볼지 ----

test('7일 구간은 공개일(유튜브 분석 기준 태평양 시간)부터 7일', () => {
  // 한국 11/9 23:00 = UTC 14:00 = 태평양 11/9 06:00
  assert.deepEqual(sevenDayWindow('2026-11-09T14:00:32Z'), {startDate: '2026-11-09', endDate: '2026-11-15'});
});

const now = new Date('2026-12-01T00:00:00Z');
const daysAgo = (d) => new Date(now.getTime() - d * 86400000).toISOString();
const vid = (id, d, format = 'LONGFORM', privacyStatus = 'public') => ({videoId: id, title: id, publishedAt: daysAgo(d), format, privacyStatus, statistics: {viewCount: '0'}});

test('공개 10일이 지났고 아직 7일 조회가 없는 공개 영상만 물어본다', () => {
  const catalog = [vid('NEW', 9), vid('OLD', 11), vid('DONE', 20), vid('PRIV', 30, 'LONGFORM', 'private')];
  const got = videosNeedingViews7d(catalog, {DONE: {views7d: 5}}, now).map((v) => v.videoId);
  assert.deepEqual(got, ['OLD']);
});

// ---- buildEpisodeOutcomes ----

test('같은 형식끼리만 7일 조회를 비교한다', () => {
  const catalogVideos = [vid('A', 15), vid('B', 20), vid('C', 30), vid('D', 40), vid('S', 15, 'SHORTS')];
  const views7d = {A: {views7d: 900}, B: {views7d: 400}, C: {views7d: 500}, D: {views7d: 300}, S: {views7d: 99999}};
  const episodes = [{slug: 'ep30-x', label: 'EP30', videoId: 'A', format: 'LONGFORM', sources: null}];
  const [got] = buildEpisodeOutcomes({episodes, catalogVideos, views7d, now});
  assert.equal(got.views7d, 900);
  assert.equal(got.baselineViews7d, 400); // B·C·D 중앙값
  assert.equal(got.sampleMedianViews7d, 500); // 최근 3편 A·B·C
  assert.equal(got.ratio, 2.3);
  assert.equal(got.verdict, 'worked');
});

test('카탈로그에 없는 영상(아직 공개 전)은 대기로 둔다', () => {
  const episodes = [{slug: 'ep31-y', label: 'EP31', videoId: 'ZZZ', format: 'LONGFORM', sources: null}];
  const [got] = buildEpisodeOutcomes({episodes, catalogVideos: [], views7d: {}, now});
  assert.equal(got.verdict, 'pending');
});

test('예약만 걸린 비공개 영상은 판정·기준·표본 어디에도 넣지 않는다', () => {
  const catalogVideos = [vid('SCHED', 12, 'LONGFORM', 'private'), vid('A', 15), vid('B', 20), vid('C', 30), vid('D', 40)];
  const views7d = {SCHED: {views7d: 0}, A: {views7d: 900}, B: {views7d: 400}, C: {views7d: 500}, D: {views7d: 300}};
  const episodes = [
    {slug: 'ep31-s', label: 'EP31', videoId: 'SCHED', format: 'LONGFORM', sources: null},
    {slug: 'ep30-x', label: 'EP30', videoId: 'A', format: 'LONGFORM', sources: null},
  ];
  const [sched, a] = buildEpisodeOutcomes({episodes, catalogVideos, views7d, now});
  assert.equal(sched.verdict, 'pending');
  assert.equal(a.sampleMedianViews7d, 500);
  assert.equal(a.verdict, 'worked');
});

test('기획 근거의 "형식" 줄(쇼츠 Track A/B/C)을 읽는다', () => {
  const got = parsePlanningSources(brief('- 경쟁 영상: 경쟁 근거 없음\n- 형식: Track A 퀴즈형'));
  assert.equal(got.track, 'Track A 퀴즈형');
  assert.equal(parsePlanningSources(brief('- 경쟁 영상: 경쟁 근거 없음')).track, null);
});

test('기획 근거의 "다음 기획 입력" 줄(인용한 입력 파일의 만든 때)을 읽고, 없으면 null', () => {
  const got = parsePlanningSources(brief('- 다음 기획 입력: 2026-11-20T05:10:00.000Z · 쓴 항목: 2절 롱폼 상위 물음표 제목, 5절 질문 1'));
  assert.equal(got.inputRef, '2026-11-20T05:10:00.000Z · 쓴 항목: 2절 롱폼 상위 물음표 제목, 5절 질문 1');
  assert.equal(parsePlanningSources(brief('- 경쟁 영상: 경쟁 근거 없음')).inputRef, null);
});

test('parsePlanningSources: 조사 출처 영상의 "평소 대비 측정 전"·"판정 보류" 줄도 경쟁 근거로 읽는다', () => {
  const md = `## 기획 근거\n- 경쟁 영상: 테스트채널 (UC1234567890123456789012) · abcdefghijk · 평소 대비 측정 전\n- 경쟁 영상: 보류채널 (UC2234567890123456789012) · bbbbbbbbbbb · 평소 대비 판정 보류\n`;
  const got = parsePlanningSources(md);
  assert.equal(got.competitors.length, 2);
  assert.deepEqual(got.competitors[0], {channelTitle: '테스트채널', channelId: 'UC1234567890123456789012', videoId: 'abcdefghijk', sourceRatio: null});
  assert.deepEqual(got.competitors[1], {channelTitle: '보류채널', channelId: 'UC2234567890123456789012', videoId: 'bbbbbbbbbbb', sourceRatio: null});
});
