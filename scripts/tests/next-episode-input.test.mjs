// 다음 기획 입력 파일(scripts/next-episode-input.mjs) 시험. 2026-11-12.
// 가짜 데이터의 칸 이름은 실제 파일(catalog.json, views-7d.json, video-reach-manual.json,
// analytics-latest.json, comments.json, audience-dna.json)과 같다.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  compareOurVideos, rankAudienceNeeds, recentViewerComments, extractReviewLessons, titleTraits,
  renderNextEpisodeInput, pickReviewLessons, MIN_COMPARE_VIDEOS,
} from '../next-episode-input.mjs';

const now = new Date('2026-11-12T00:00:00Z');
const video = (id, format, publishedAt, title = `제목 ${id}`) => ({videoId: id, title, format, publishedAt, privacyStatus: 'public', statistics: {viewCount: '100'}});

function fixture(n, format = 'LONGFORM') {
  const videos = [];
  const views7d = {};
  const reach = {};
  const performance = [];
  for (let i = 1; i <= n; i += 1) {
    const id = `${format[0]}${String(i).padStart(10, '0')}`;
    videos.push(video(id, format, `2026-10-${String(i).padStart(2, '0')}T11:00:00Z`));
    views7d[id] = {views7d: i * 10, format};
    reach[id] = {periods: {
      old: {startDate: '2026-08-01', endDate: '2026-08-29', impressions: 5, ctr: 99},
      new: {startDate: '2026-08-12', endDate: '2026-11-10', impressions: 100 + i, ctr: i},
    }};
    performance.push({video: id, averageViewPercentage: 30 + i});
  }
  return {videos, views7d, reach, performance};
}

test('우리 영상 비교: 같은 형식끼리 7일 조회수로 상·하위 3편을 고르고, 가장 최근 기간의 클릭률과 시청 비율을 붙인다', () => {
  const f = fixture(8);
  const got = compareOurVideos({catalogVideos: f.videos, views7d: f.views7d, reach: f.reach, performance: f.performance, format: 'LONGFORM', now});
  assert.equal(got.status, 'ok');
  assert.equal(got.count, 8);
  assert.deepEqual(got.top.map((v) => v.views7d), [80, 70, 60]);
  assert.deepEqual(got.bottom.map((v) => v.views7d), [10, 20, 30]);
  assert.equal(got.top[0].ctr, 8, '옛 기간(99)이 아니라 가장 최근 기간 클릭률');
  assert.equal(got.top[0].impressions, 108);
  assert.equal(got.top[0].averageViewPercentage, 38);
  assert.equal(got.medianViews7d, 45);
  assert.equal(got.smallSample, true, '중앙값 45회는 판정 기준(300회)보다 작아 작은 표본으로 표시');
});

test(`우리 영상 비교: 7일 조회수가 있는 영상이 ${MIN_COMPARE_VIDEOS}편 미만이면 비교하지 않고 보류한다`, () => {
  const f = fixture(MIN_COMPARE_VIDEOS - 1);
  const got = compareOurVideos({catalogVideos: f.videos, views7d: f.views7d, reach: f.reach, performance: f.performance, format: 'LONGFORM', now});
  assert.equal(got.status, 'hold');
  assert.deepEqual(got.top, []);
});

test('우리 영상 비교: 비공개·예약 영상과 다른 형식은 빼고, 값이 없는 칸은 숫자를 지어내지 않고 null로 둔다', () => {
  const f = fixture(7);
  f.videos.push({...video('Pxxxxxxxxxx', 'LONGFORM', '2026-10-20T11:00:00Z'), privacyStatus: 'private'});
  f.views7d.Pxxxxxxxxxx = {views7d: 9999};
  f.videos.push(video('Sxxxxxxxxxx', 'SHORTS', '2026-10-21T11:00:00Z'));
  f.views7d.Sxxxxxxxxxx = {views7d: 5000};
  delete f.reach[f.videos[6].videoId];
  const got = compareOurVideos({catalogVideos: f.videos, views7d: f.views7d, reach: f.reach, performance: [], format: 'LONGFORM', now});
  assert.equal(got.count, 7);
  assert.ok(!got.top.some((v) => v.videoId === 'Pxxxxxxxxxx' || v.videoId === 'Sxxxxxxxxxx'));
  assert.equal(got.top[0].ctr, null);
  assert.equal(got.top[0].averageViewPercentage, null);
});

test('제목 특징은 사실만 센다(물음표, 앞부분 영어, 숫자, 해시태그)', () => {
  assert.deepEqual(titleTraits('sheep과 ship, 30초 듣기? #shorts'), {question: true, startsWithEnglish: true, hasNumber: true, hashtags: 1, length: 28});
  assert.deepEqual(titleTraits('영어 발음 연습'), {question: false, startsWithEnglish: false, hasNumber: false, hashtags: 0, length: 8});
});

test('시청자 고민 순위: 대본 분석에서 온 AI 추측은 빼고, 시청자 댓글 출처 영상 수로 순위를 낸다', () => {
  const entries = [
    {type: 'painPoint', text: 'AI 추측', occurrences: 9, sources: [{videoId: 'a', sourceType: 'competitorScript'}, {videoId: 'b', sourceType: 'competitorScript'}]},
    {type: 'painPoint', text: '두 영상 고민', occurrences: 2, sources: [{videoId: 'a', sourceType: 'outlierComment'}, {videoId: 'b', sourceType: 'outlierComment'}]},
    {type: 'painPoint', text: '한 영상 고민', occurrences: 5, sources: [{videoId: 'c', sourceType: 'outlierComment'}]},
    {type: 'question', text: '질문', occurrences: 1, sources: [{videoId: 'd', sourceType: 'outlierComment'}, {videoId: 'e', sourceType: 'competitorScript'}]},
    {type: 'vocabulary', text: '표현', occurrences: 3, sources: [{videoId: 'f', sourceType: 'outlierComment'}]},
  ];
  const got = rankAudienceNeeds(entries, 5);
  assert.deepEqual(got.painPoint.map((e) => e.text), ['두 영상 고민', '한 영상 고민']);
  assert.equal(got.painPoint[0].videoCount, 2);
  assert.deepEqual(got.question.map((e) => [e.text, e.videoCount]), [['질문', 1]]);
  assert.equal(got.excludedAiGuesses, 1);
});

test('우리 시청자 댓글: 채널 주인 댓글은 빼고 최근 것부터, 기간 밖은 뺀다', () => {
  const commentsByVideo = {
    v1: [
      {text: '주인 댓글', isChannelOwner: true, publishedAt: '2026-11-10T00:00:00Z'},
      {text: '이건 왜 그래요?', isChannelOwner: false, publishedAt: '2026-11-09T00:00:00Z', replyCount: 0},
    ],
    v2: [
      {text: '오래된 댓글', isChannelOwner: false, publishedAt: '2026-06-01T00:00:00Z'},
      {text: '좋아요', isChannelOwner: false, publishedAt: '2026-11-11T00:00:00Z', replyCount: 1},
    ],
  };
  const titles = {v1: '영상1', v2: '영상2'};
  const got = recentViewerComments(commentsByVideo, titles, now, 60);
  assert.deepEqual(got.map((c) => c.text), ['좋아요', '이건 왜 그래요?']);
  assert.equal(got[1].question, true);
  assert.equal(got[1].title, '영상1');
});

test('리뷰 교훈: REVIEW.md의 "다음 영상에 적용할 것" 항목만 뽑는다', () => {
  const md = '# REVIEW — ep23 (공개 2026-10-28)\n\n## 판정\n- 보류\n\n## 다음 영상에 적용할 것\n- 첫째 교훈\n- 둘째 교훈\n\n## 기타\n- 아님\n';
  assert.deepEqual(extractReviewLessons(md), {publishedOn: '2026-10-28', lessons: ['첫째 교훈', '둘째 교훈']});
  assert.deepEqual(extractReviewLessons('# REVIEW\n\n## 판정\n- x\n'), {publishedOn: null, lessons: []});
});

test('입력 파일은 값이 없으면 "측정 전"으로 쓰고, 보류면 이유를 쓴다', () => {
  const f = fixture(7);
  const longform = compareOurVideos({catalogVideos: f.videos, views7d: f.views7d, reach: {}, performance: [], format: 'LONGFORM', now});
  const shorts = compareOurVideos({catalogVideos: [], views7d: {}, reach: {}, performance: [], format: 'SHORTS', now});
  const md = renderNextEpisodeInput({
    generatedAt: now.toISOString(), freshness: {catalogSyncedAt: null, analyticsRange: null, audienceDnaUpdatedAt: null},
    comparisons: {LONGFORM: longform, SHORTS: shorts}, searchTerms: [], viewerComments: [],
    audience: {painPoint: [], question: [], excludedAiGuesses: 0}, reviews: [], outcomes: [], successPatternCount: 0,
  });
  assert.match(md, /측정 전/);
  assert.match(md, /보류/);
  assert.doesNotMatch(md, /undefined|NaN/);
});

test('평균 시청 비율은 소수 한 자리로 반올림한다(6.480000000000001 → 6.5)', () => {
  const f = fixture(6);
  f.performance[5].averageViewPercentage = 6.480000000000001;
  const got = compareOurVideos({catalogVideos: f.videos, views7d: f.views7d, reach: f.reach, performance: f.performance, format: 'LONGFORM', now});
  assert.equal(got.top[0].averageViewPercentage, 6.5);
});

test('리뷰 교훈은 공개일이 적힌(실제로 리뷰한) 편만, 최근 공개 순으로 고른다', () => {
  const reviews = [
    {slug: 'ep24', publishedOn: null, lessons: ['(공개 후 작성 예정)']},
    {slug: 'ep21', publishedOn: '2026-10-02', lessons: ['a']},
    {slug: 'ep23', publishedOn: '2026-10-28', lessons: ['b']},
    {slug: 'ep22', publishedOn: '2026-10-12', lessons: []},
  ];
  assert.deepEqual(pickReviewLessons(reviews, 3).map((r) => r.slug), ['ep23', 'ep21']);
});
