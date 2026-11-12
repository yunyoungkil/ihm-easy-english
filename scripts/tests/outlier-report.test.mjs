// 합친 아웃라이어 리포트(scripts/outlier-report.mjs) 시험. 2026-11-12.
// 원칙(AGENTS.md): AI 분석 프롬프트에 검증 안 된 우리 철학·미리 정한 분류 목록·내용 예시를 넣지 않는다.
// AI는 관찰한 것을 원문 인용과 함께 쓰고, 인용은 코드가 실제 자막·댓글·제목과 대조한다.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildReportPrompt, verifyQuotes, computePacing, pickFrameMoments, analysisWindowSeconds, buildVisualLibrary,
  MAX_FRAMES_PER_VIDEO, unwrapAnalysis, parseSceneTimes, searchVisualLibrary, pickReportTargets, missingFrames, audienceDnaEntriesFromReport, reportsPerDay, needsCutTimes, cutFrameName, missingCutFrames, CUT_FRAME_HEIGHT,
} from '../outlier-report.mjs';
import {renderReportPage, renderReportIndex, renderMarkdownPage, renderVisualLibraryPage} from '../outlier-report-view.mjs';

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

test('매일 루프 대상: 차단·졸업 채널, 이미 있는 리포트, 7일 안 실패, 영어 학습과 무관한 제목은 빼고 배수 큰 순으로 하루 몫만', () => {
  const now = new Date('2026-11-20T00:00:00Z');
  const o = (videoId, outlierRatio, title) => ({videoId, outlierRatio, title});
  const marketDemand = {
    byKeyword: [{keyword: '영어 발음', topOutliers: [o('kw000000001', 50, '영어 발음 5개'), o('kw000000002', 900, '고양이 브이로그'), o('kw000000003', 30, '원어민 회화')]}],
    trackedChannels: [
      {status: 'candidate', topOutliers: [o('ch000000001', 80, '파닉스 1편'), o('kw000000001', 70, '영어 발음 5개')]},
      {status: 'blocked', topOutliers: [o('bl000000001', 999, '영어 발음 비밀')]},
    ],
  };
  const got = pickReportTargets({
    marketDemand,
    existingIds: new Set(['ch000000001']),
    failures: {kw000000003: '2026-11-18T00:00:00Z'},
    now,
    limit: 2,
  });
  assert.deepEqual(got, ['kw000000001']);
  const later = pickReportTargets({marketDemand, existingIds: new Set(['ch000000001']), failures: {kw000000003: '2026-11-01T00:00:00Z'}, now, limit: 2});
  assert.deepEqual(later, ['kw000000001', 'kw000000003'], '7일 지난 실패는 다시 시도');
});

test('다른 PC에서 빠진 캡처만 다시 만든다: 리포트에 적힌 캡처 중 디스크에 없는 것, 목록이 비었으면 화면 변화에서 고른다', () => {
  const report = {videoId: 'abcdefghijk', windowSeconds: 60, frames: [{t: 1, file: '1.jpg'}, {t: 5.5, file: '5.jpg'}], analysis: {visualMoments: [{t: 1}, {t: 5.5}]}};
  const onDisk = new Set(['data/youtube/outlier-frames/abcdefghijk/1.jpg']);
  const exists = (rel) => onDisk.has(rel);
  assert.deepEqual(missingFrames(report, exists).map((m) => m.t), [5.5]);
  onDisk.add('data/youtube/outlier-frames/abcdefghijk/5.jpg');
  assert.deepEqual(missingFrames(report, exists), []);
  const noList = {...report, frames: []};
  assert.deepEqual(missingFrames(noList, () => false).map((m) => m.t), [1, 5.5]);
  assert.deepEqual(missingFrames({...noList, analysis: {visualMoments: []}}, () => false), []);
});

test('캡처를 만드는 중이면 리포트 화면에 안내를 띄우고 잠시 뒤 스스로 새로고침한다', () => {
  const report = {videoId: 'abcdefghijk', meta: {title: 't'}, analysis: {}, frames: [], pacing: {}, quoteCheck: {}, windowSeconds: 60};
  const pending = renderReportPage(report, {framesPending: 4});
  assert.match(pending, /캡처 4장을 이 PC에서 만드는 중/);
  assert.match(pending, /http-equiv="refresh"/);
  assert.doesNotMatch(renderReportPage(report), /http-equiv="refresh"/);
});

test('다음 기획 입력 페이지: 마크다운 표·목록·굵은 글씨를 그리고 글자는 이스케이프한다', () => {
  const md = '# 제목\n\n본문 **굵게** `코드` http://localhost:3001/outlier-report/abcdefghijk\n\n| 가 | 나 |\n|---|---|\n| <b>x</b> | 2 |\n\n- 항목 <script>\n';
  const html = renderMarkdownPage('다음 기획 입력', md);
  assert.match(html, /<h1>제목<\/h1>/);
  assert.match(html, /<strong>굵게<\/strong>/);
  assert.match(html, /<table>/);
  assert.match(html, /<li>항목 &lt;script&gt;<\/li>/);
  assert.match(html, /&lt;b&gt;x&lt;\/b&gt;/);
  assert.match(html, /<a href="\/outlier-report\/abcdefghijk">/);
  assert.doesNotMatch(html, /<script>/);
});

test('연출 자료집 페이지: 검색어로 거르고, 캡처가 있으면 이미지·없으면 만드는 중 안내, 글자는 이스케이프', () => {
  const entries = [
    {videoId: 'abcdefghijk', title: 't', channelTitle: '<i>채널</i>', outlierRatio: 570, t: 3, what: '빨간 X 표시', purpose: '틀린 발음', frame: 'data/youtube/outlier-frames/abcdefghijk/3.jpg', frameReady: true},
    {videoId: 'abcdefghijk', title: 't', channelTitle: 'c', outlierRatio: 570, t: 9, what: '영화 장면 <b>', purpose: '실제 쓰임', frame: 'data/youtube/outlier-frames/abcdefghijk/9.jpg', frameReady: false},
  ];
  const all = renderVisualLibraryPage(entries, {reports: 1, pendingReports: 1});
  assert.match(all, /src="\/outlier-frames\/abcdefghijk\/3\.jpg"/);
  assert.match(all, /이 PC에서 캡처 만드는 중/);
  assert.match(all, /&lt;i&gt;채널&lt;\/i&gt;/);
  assert.doesNotMatch(all, /<b>'/);
  assert.match(all, /http-equiv="refresh"/, '만드는 중이면 스스로 새로고침');
  const filtered = renderVisualLibraryPage(entries, {query: 'X 표시', reports: 1, pendingReports: 0});
  assert.match(filtered, /빨간 X 표시/);
  assert.doesNotMatch(filtered, /영화 장면/);
  assert.match(filtered, /value="X 표시"/);
});

test('시청자 고민으로 넘기는 것은 댓글 원문 인용이 확인된 항목뿐이다(어려움·질문·표현)', () => {
  const report = {
    videoId: 'abcdefghijk', meta: {channelTitle: '경쟁 채널'},
    analysis: {viewerReaction: {
      painPoints: [{pain: '혀가 꼬여요', quote: 'q', quoteVerified: true}, {pain: '지어낸 고민', quote: 'x', quoteVerified: false}],
      unanswered: [{question: '영국식도 같나요?', quote: 'q', quoteVerified: true}],
      vocabulary: [{expression: '버터 발음', quote: 'q', quoteVerified: true}, {expression: '인용 없음', quote: '', quoteVerified: undefined}],
      resonated: [{point: '공감', quote: 'q', quoteVerified: true}],
    }},
  };
  assert.deepEqual(audienceDnaEntriesFromReport(report).map((e) => [e.type, e.text, e.sourceType]), [
    ['painPoint', '혀가 꼬여요', 'outlierComment'],
    ['question', '영국식도 같나요?', 'outlierComment'],
    ['vocabulary', '버터 발음', 'outlierComment'],
  ]);
  assert.deepEqual(audienceDnaEntriesFromReport({...report, meta: {channelTitle: '이해하면 쉬운영어'}}), [], '우리 채널 영상은 경쟁 시청자 고민이 아니다');
});

test('프롬프트가 시청자가 털어놓은 어려움 칸을 요구하고, 인용 검사가 그 칸도 본다', () => {
  assert.match(buildReportPrompt({meta, windowSeconds: 30}), /"painPoints"/);
  const got = verifyQuotes({viewerReaction: {painPoints: [{pain: 'p', quote: '좀 충격임'}]}}, {title: '', transcriptText: null, commentTexts: ['와 좀 충격임']});
  assert.equal(got.analysis.viewerReaction.painPoints[0].quoteVerified, true);
});

test('따라잡기: 아직 합친 리포트가 없는 예전 리포트 영상이 매일 루프 대상 안에 있으면 하루 6편, 없으면 2편', () => {
  assert.equal(reportsPerDay({eligibleIds: ['a', 'b'], oldReportIds: new Set(['b'])}), 6);
  assert.equal(reportsPerDay({eligibleIds: ['a'], oldReportIds: new Set(['z'])}), 2);
  assert.equal(reportsPerDay({eligibleIds: [], oldReportIds: new Set(['z'])}), 2);
});

test('컷 시각이 저장 안 된 예전 리포트만 컷 시각을 다시 잰다(영상에서 잰 값일 때만, 값이 있으면 안 잰다)', () => {
  assert.equal(needsCutTimes({pacing: {source: 'ffmpeg 장면 전환 감지(코드)', count: 15}}), true);
  assert.equal(needsCutTimes({pacing: {source: 'ffmpeg 장면 전환 감지(코드)', count: 15, times: [1, 2]}}), false);
  assert.equal(needsCutTimes({pacing: {source: 'AI가 적은 화면 변화(영상을 못 받아 대신 씀)', count: 4}}), false);
  assert.equal(needsCutTimes({}), false);
});

test('컷마다 프레임 한 장: 빠진 컷 번호만 골라내고, 파일 이름은 cut-번호(두 자리)로 정한다', () => {
  assert.equal(cutFrameName(0), 'cut-00.jpg');
  assert.equal(cutFrameName(12), 'cut-12.jpg');
  const report = {videoId: 'abcdefghijk', pacing: {times: [3, 9, 15]}};
  const exists = new Set(['data/youtube/outlier-frames/abcdefghijk/cut-00.jpg', 'data/youtube/outlier-frames/abcdefghijk/cut-02.jpg']);
  assert.deepEqual(missingCutFrames(report, (rel) => exists.has(rel)), [1]);
  assert.deepEqual(missingCutFrames({videoId: 'abcdefghijk', pacing: {}}, () => false), []);
  assert.deepEqual(missingCutFrames({videoId: 'abcdefghijk', pacing: {times: [1, 2]}}, () => false), [0, 1]);
});

test('컷 프레임은 읽을 수 있게 480px 높이로 뽑는다', () => {
  assert.equal(CUT_FRAME_HEIGHT, 480);
});

test('리포트 meta는 videos.list의 설명글·태그를 그대로 저장하고, 태그가 없으면 빈 목록이다 (실제 API 칸 이름)', async () => {
  const {buildMeta} = await import('../outlier-report.mjs');
  const item = {
    snippet: {title: '제목', channelId: 'UCx', channelTitle: '채널', publishedAt: '2026-11-10T11:00:02Z', description: '첫 줄\n둘째 줄', tags: ['태그1', '태그2'], thumbnails: {high: {url: 'https://i.ytimg.com/h.jpg'}}},
    statistics: {viewCount: '47699', likeCount: '1028', commentCount: '29'},
    contentDetails: {duration: 'PT53S'},
  };
  const meta = buildMeta('SbQVBQoRciA', item);
  assert.equal(meta.description, '첫 줄\n둘째 줄');
  assert.deepEqual(meta.tags, ['태그1', '태그2']);
  assert.equal(meta.viewCount, 47699);
  assert.equal(meta.durationSeconds, 53);
  const noTags = buildMeta('SbQVBQoRciA', {...item, snippet: {...item.snippet, tags: undefined, description: undefined}});
  assert.deepEqual(noTags.tags, []);
  assert.equal(noTags.description, '');
});

test('저장된 이 영상 리포트의 설명글·태그는 유튜브 영상 페이지에서 직접 본 값과 같다 (2026-11-13 크롬으로 확인)', async () => {
  const {readFileSync} = await import('node:fs');
  const meta = JSON.parse(readFileSync(new URL('../../data/youtube/outlier-reports/SbQVBQoRciA.json', import.meta.url), 'utf8')).meta;
  assert.match(meta.description, /^오늘은 한국인이 자주 틀리는 영어 발음을 알려드립니다\./);
  assert.match(meta.description, /Comfortable, Interest, Temperature, Favorite, Family$/);
  assert.deepEqual(meta.tags, []);
});
