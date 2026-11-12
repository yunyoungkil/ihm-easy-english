// 합친 아웃라이어 리포트(scripts/outlier-report.mjs) 시험. 2026-11-12.
// 원칙(AGENTS.md): AI 분석 프롬프트에 검증 안 된 우리 철학·미리 정한 분류 목록·내용 예시를 넣지 않는다.
// AI는 관찰한 것을 원문 인용과 함께 쓰고, 인용은 코드가 실제 자막·댓글·제목과 대조한다.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildReportPrompt, verifyQuotes, computePacing, pickFrameMoments, analysisWindowSeconds, buildVisualLibrary,
  MAX_FRAMES_PER_VIDEO, unwrapAnalysis, parseSceneTimes, searchVisualLibrary,
} from '../outlier-report.mjs';
import {renderReportPage, renderReportIndex} from '../outlier-report-view.mjs';

const meta = {videoId: 'SbQVBQoRciA', title: '한국인이 자주 틀리는 영어 발음 5개', channelTitle: '채널', viewCount: 42628, publishedAt: '2026-11-01T00:00:00Z', durationSeconds: 53};

test('프롬프트에는 우리 철학·미리 정한 분류 목록·채널 이름이 없다', () => {
  const prompt = buildReportPrompt({meta, subscriberCount: 1000, outlierRatio: 570, transcriptLines: [{start: 0, text: '발음 한번 해보세요'}], comments: [{text: '충격임', likeCount: 3}], windowSeconds: 53});
  for (const banned of ['도파민', '게으른 혀', '상식 파괴형', '공감 유발형', '손실 회피형', '직관 퀴즈형', '이해하면 쉬운영어', '3단계 공식', 'Epiphany']) {
    assert.ok(!prompt.includes(banned), `프롬프트에 "${banned}"가 들어 있다`);
  }
  assert.match(prompt, /원문/);
  assert.match(prompt, /확인 불가/);
  assert.match(prompt, /\[00:00\] 발음 한번 해보세요/);
});

test('인용 검사: 자막·댓글·제목에 실제로 있는 글자만 확인됨으로 표시한다(띄어쓰기·문장부호 차이는 무시)', () => {
  const analysis = {
    click: {titleQuote: '자주 틀리는 영어 발음'},
    opening: {quote: '발음 한번 해보세요!'},
    flow: [{start: 0, end: 10, what: 'x', quote: '지어낸 문장'}],
    ending: {quote: ''},
    viewerReaction: {resonated: [{point: 'p', quote: '좀 충격임'}], unanswered: [{question: 'q', quote: '없는 댓글'}], vocabulary: []},
    links: [{cause: 'c', reaction: 'r', quote: '충격임'}],
  };
  const got = verifyQuotes(analysis, {title: meta.title, transcriptText: '발음 한번 해보세요 하나 둘 셋', commentTexts: ['와... 좀 충격임...😲']});
  assert.equal(got.analysis.click.titleQuoteVerified, true);
  assert.equal(got.analysis.opening.quoteVerified, true);
  assert.equal(got.analysis.flow[0].quoteVerified, false);
  assert.equal(got.analysis.viewerReaction.resonated[0].quoteVerified, true);
  assert.equal(got.analysis.viewerReaction.unanswered[0].quoteVerified, false);
  assert.equal(got.analysis.links[0].quoteVerified, true);
  assert.deepEqual(got.summary, {checked: 6, verified: 4, unverified: 2});
});

test('자막이 없으면 자막 인용은 확인할 수 없음(null)으로 두고 확인됨으로 세지 않는다', () => {
  const got = verifyQuotes({opening: {quote: '아무 말'}}, {title: '', transcriptText: null, commentTexts: []});
  assert.equal(got.analysis.opening.quoteVerified, null);
  assert.equal(got.summary.verified, 0);
});

test('장면 전환 간격은 AI가 아니라 코드가 화면 변화 시각으로 계산한다', () => {
  const pacing = computePacing([{t: 0}, {t: 2}, {t: 3}, {t: 7}, {t: 999}], 60);
  assert.equal(pacing.count, 4, '분석 구간(60초) 밖 시각은 뺀다');
  assert.equal(pacing.medianGapSeconds, 2);
  assert.equal(pacing.perMinute, 4);
  assert.deepEqual(computePacing([], 60), {count: 0, medianGapSeconds: null, perMinute: 0});
});

test('캡처할 순간은 첫 15초를 먼저 담고 나머지는 고르게, 최대 개수까지만 고른다', () => {
  const moments = Array.from({length: 40}, (_, i) => ({t: i * 3, what: `m${i}`}));
  const picked = pickFrameMoments(moments, 200);
  assert.equal(picked.length, MAX_FRAMES_PER_VIDEO);
  assert.deepEqual(picked.slice(0, 5).map((m) => m.t), [0, 3, 6, 9, 12]);
  assert.ok(picked.at(-1).t >= 100, '뒤쪽 순간도 들어간다');
  assert.deepEqual(picked.map((m) => m.t), [...picked.map((m) => m.t)].sort((a, b) => a - b));
});

test('분석 구간: 쇼츠·짧은 영상은 전체, 긴 영상은 앞 5분', () => {
  assert.equal(analysisWindowSeconds(53), 53);
  assert.equal(analysisWindowSeconds(943), 300);
  assert.equal(analysisWindowSeconds(null), 300);
});

test('연출 자료집: 리포트의 화면 변화를 성과 배수 큰 영상부터 펼치고, 캡처가 있는 순간만 이미지 경로를 붙인다', () => {
  const reports = [
    {videoId: 'a', meta: {title: 'A', channelTitle: 'ca'}, outlierRatio: 10, analysis: {visualMoments: [{t: 1, what: 'x', purpose: 'p'}]}, frames: [{t: 1, file: '1.jpg'}]},
    {videoId: 'b', meta: {title: 'B', channelTitle: 'cb'}, outlierRatio: 99, analysis: {visualMoments: [{t: 5, what: 'y', purpose: 'q'}]}, frames: []},
  ];
  const lib = buildVisualLibrary(reports);
  assert.deepEqual(lib.map((e) => [e.videoId, e.t, e.frame]), [['b', 5, null], ['a', 1, 'data/youtube/outlier-frames/a/1.jpg']]);
});

test('리포트 화면은 댓글·자막 같은 외부 글자를 HTML로 실행하지 않고 그대로 보여 준다', () => {
  const report = {
    videoId: 'SbQVBQoRciA', analyzedAt: '2026-11-12T00:00:00Z', outlierRatio: 570, subscriberCount: 1000,
    meta: {...meta, title: '<script>alert(1)</script>'},
    analysis: {viewerReaction: {resonated: [{point: '<img src=x onerror=alert(1)>', quote: '"q"', quoteVerified: true}], unanswered: [], vocabulary: []}, visualMoments: [], flow: []},
    quoteCheck: {checked: 1, verified: 1, unverified: 0}, pacing: {count: 0, medianGapSeconds: null, perMinute: 0}, frames: [], windowSeconds: 53,
  };
  const html = renderReportPage(report);
  assert.ok(!html.includes('<script>alert(1)</script>'));
  assert.ok(!html.includes('<img src=x onerror'));
  assert.ok(html.includes('&lt;script&gt;'));
  const index = renderReportIndex([report]);
  assert.ok(!index.includes('<script>alert(1)</script>'));
  assert.ok(index.includes('/outlier-report/SbQVBQoRciA'));
});

test('Gemini가 결과를 배열 하나로 감싸 보내도 풀어서 읽는다', () => {
  assert.deepEqual(unwrapAnalysis([{click: {titleDevice: 'x'}}]), {click: {titleDevice: 'x'}});
  assert.deepEqual(unwrapAnalysis({click: {}}), {click: {}});
  assert.throws(() => unwrapAnalysis([1, 2]), /형식/);
  assert.throws(() => unwrapAnalysis('문자열'), /형식/);
});

test('컷 간격은 ffmpeg 장면 전환 감지 출력에서 코드가 직접 읽는다', () => {
  const stderr = [
    '[Parsed_showinfo_1 @ 0000] config in time_base: 1/15360',
    '[Parsed_showinfo_1 @ 0000] n:   0 pts:  46080 pts_time:3       duration:512 fmt:yuv420p',
    '[Parsed_showinfo_1 @ 0000] n:   1 pts: 153600 pts_time:10.5    duration:512',
    '[Parsed_showinfo_1 @ 0000] n:   2 pts: 261120 pts_time:17.0333 duration:512',
    'frame=    3 fps=0.0 q=-0.0 Lsize=N/A time=00:00:31.00',
  ].join(String.fromCharCode(10));
  assert.deepEqual(parseSceneTimes(stderr), [3, 10.5, 17]);
  assert.deepEqual(parseSceneTimes(''), []);
});

test('연출 자료집 검색: 화면 변화 설명·목적·제목에 검색어가 있는 것만, 검색어가 없으면 전부', () => {
  const lib = buildVisualLibrary([
    {videoId: 'a', meta: {title: '발음 5개', channelTitle: 'c'}, outlierRatio: 5, analysis: {visualMoments: [{t: 1, what: '빨간 X 표시', purpose: '틀린 발음 지적'}, {t: 2, what: '영화 장면', purpose: '실제 쓰임'}]}, frames: []},
  ]);
  assert.deepEqual(searchVisualLibrary(lib, 'X 표시').map((e) => e.t), [1]);
  assert.deepEqual(searchVisualLibrary(lib, '실제').map((e) => e.t), [2]);
  assert.equal(searchVisualLibrary(lib, '').length, 2);
});
