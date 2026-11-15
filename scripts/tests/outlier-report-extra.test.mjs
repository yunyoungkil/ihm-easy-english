// 경쟁 영상 리포트의 새 관찰 칸 5개(first3s, infoCount, captionStyle, audio, storytelling) 시험. 2026-11-15.
// 가짜 응답을 쓰며 Gemini·네트워크를 부르지 않는다. 기존 칸(opening, flow ...)의 이름은 실제 리포트 JSON과 같다.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {buildReportPrompt, verifyQuotes, normalizeExtraObservations, storytellingItems} from '../outlier-report.mjs';
import {renderReportPage, extraObservationsHtml} from '../outlier-report-view.mjs';

const meta = {videoId: 'SbQVBQoRciA', title: '한국인이 자주 틀리는 영어 발음 5개', channelTitle: '채널', viewCount: 42628, publishedAt: '2026-11-01T00:00:00Z', durationSeconds: 53};
const NEW_FIELDS = ['first3s', 'infoCount', 'captionStyle', 'audio', 'storytelling'];

const fullFake = () => ({
  opening: {first15s: 'x', quote: '발음 한번 해보세요', reasonToKeepWatching: 'y'},
  first3s: {what: '진행자가 단어를 보여 준다', quote: '발음 한번 해보세요'},
  infoCount: {count: '7', description: '단어 7개를 한 개씩 보여 준다'},
  captionStyle: {position: '화면 아래 가운데', size: '큼', highlightColor: '하늘색', highlightMethod: '박스', textAmount: '한 줄', changeTiming: '말에 맞춰'},
  audio: {hasMusic: true, mood: '밝음', tempo: '빠름', hasSoundEffects: true, soundEffectUse: '정답 때 딩동', voiceVsMusic: '말이 중심'},
  storytelling: {
    hook: {type: '시키기', what: '발음해 보라고 시킨다', t: 0, quote: '발음 한번 해보세요'},
    curiosity: {opened: {t: 0, what: '잘못 읽는 이유를 묻는다', quote: '지어낸 문장'}, resolved: {t: 11, what: '이유를 알려 준다', quote: ''}},
    causality: {connected: true, summary: '앞 단어의 규칙이 다음 단어에 이어진다', examples: [{t: 11, what: '같은 규칙 적용', quote: '하나 둘 셋'}]},
    openLoops: [],
    patternBreaks: [{t: 40, what: '마지막 단어만 규칙이 다르다', quote: ''}],
    viewerActions: [{t: 1, what: '따라 말하기', quote: '하나 둘 셋'}],
    evidence: [{t: 15, what: '영화 클립', quote: ''}],
    payoff: {t: 50, what: '없음', quote: ''},
  },
});

test('새 칸 정규화: 정상 응답은 모양대로 정리되고 정보 개수는 항상 추정으로 표시된다', () => {
  const a = normalizeExtraObservations(fullFake());
  assert.deepEqual(a.first3s, {what: '진행자가 단어를 보여 준다', quote: '발음 한번 해보세요'});
  assert.deepEqual(a.infoCount, {count: 7, description: '단어 7개를 한 개씩 보여 준다', estimated: true});
  assert.equal(a.captionStyle.size, '큼');
  assert.equal(a.audio.tempo, '빠름');
  assert.equal(a.audio.hasMusic, true);
  assert.equal(a.storytelling.hook.type, '시키기');
  assert.deepEqual(a.storytelling.openLoops, [], '빈 배열은 "없다고 봤다"로 남긴다');
  assert.equal(a.storytelling.payoff.what, '없음');
  assert.equal(a.storytelling.payoff.t, null, '"없음" 항목의 시각은 버린다');
});

test('새 칸 정규화: 칸이 없거나 모양이 틀리면 죽지 않고 null로 비운다(대신값을 넣지 않는다)', () => {
  for (const bad of [{}, null, undefined]) {
    const a = normalizeExtraObservations(bad);
    for (const k of NEW_FIELDS) assert.equal(a[k], null, `${k}`);
  }
  const weird = normalizeExtraObservations({first3s: '문자열', infoCount: {count: -3, description: ''}, captionStyle: [1], audio: {hasMusic: '네', tempo: '엄청빠름'}, storytelling: {hook: 5, openLoops: '목록 아님', viewerActions: [null, {what: ''}, {what: '댓글 달기', t: 'abc', quote: 7}]}});
  assert.equal(weird.first3s, null);
  assert.equal(weird.infoCount, null, '음수 개수와 빈 설명이면 칸 전체가 null');
  assert.equal(weird.captionStyle, null);
  assert.equal(weird.audio, null, 'boolean이 아닌 값과 목록에 없는 빠르기는 null로 떨어져 칸도 null');
  assert.equal(weird.storytelling.hook, null);
  assert.equal(weird.storytelling.openLoops, null, '배열이 아니면 null(확인 불가)');
  assert.deepEqual(weird.storytelling.viewerActions, [{t: null, what: '댓글 달기', quote: ''}]);
  const sizeBad = normalizeExtraObservations({captionStyle: {position: '아래', size: '아주 큼'}});
  assert.equal(sizeBad.captionStyle.size, null);
  assert.equal(sizeBad.captionStyle.position, '아래');
  assert.equal(normalizeExtraObservations({infoCount: {count: 3.5, description: '3개쯤'}}).infoCount.count, null, '정수가 아니면 개수는 null');
});

test('인용 검증: first3s와 스토리텔링의 quote도 자막과 대조해 quoteVerified를 붙이고 합계에 센다', () => {
  const norm = normalizeExtraObservations(fullFake());
  const got = verifyQuotes(norm, {title: meta.title, transcriptText: '발음 한번 해보세요 하나 둘 셋', commentTexts: []});
  assert.equal(got.analysis.first3s.quoteVerified, true);
  assert.equal(got.analysis.storytelling.hook.quoteVerified, true);
  assert.equal(got.analysis.storytelling.curiosity.opened.quoteVerified, false, '자막에 없는 인용은 false');
  assert.equal(got.analysis.storytelling.curiosity.resolved.quoteVerified, undefined, '빈 인용은 검사하지 않는다');
  assert.equal(got.analysis.storytelling.causality.examples[0].quoteVerified, true);
  assert.equal(got.analysis.storytelling.viewerActions[0].quoteVerified, true);
  // opening.quote(1) + first3s(1) + hook(1) + opened(1, false) + causality 예시(1) + viewerActions(1) = 6
  assert.deepEqual(got.summary, {checked: 6, verified: 5, unverified: 1});
  const noTranscript = verifyQuotes(norm, {title: '', transcriptText: null, commentTexts: []});
  assert.equal(noTranscript.analysis.first3s.quoteVerified, null, '자막이 없으면 확인 불가(null)');
  assert.equal(noTranscript.summary.verified, 0);
});

test('인용 검증은 새 칸이 없거나 모양이 틀린 입력에도 죽지 않는다', () => {
  assert.doesNotThrow(() => verifyQuotes({opening: {quote: 'a'}}, {transcriptText: 'a'}));
  assert.doesNotThrow(() => verifyQuotes({first3s: '글자', storytelling: {hook: '글자', openLoops: '글자', causality: {examples: 3}}}, {transcriptText: 'a'}));
  assert.deepEqual(storytellingItems({openLoops: 'x', hook: 3}), []);
  assert.deepEqual(storytellingItems(null), []);
});

test('옛 리포트(새 칸 없음)는 "새 항목 도입 전"이라고 표시하고, 새 칸이 null이면 "확인 불가"로 표시한다', () => {
  const real = JSON.parse(readFileSync(new URL('../../data/youtube/outlier-reports/SbQVBQoRciA.json', import.meta.url), 'utf8'));
  for (const k of NEW_FIELDS) assert.equal(real.analysis[k], undefined, `실제 옛 리포트에 ${k}가 이미 있다 — 이 시험의 전제가 틀림`);
  const oldHtml = renderReportPage(real);
  assert.match(oldHtml, /새 항목 도입 전/);
  assert.doesNotMatch(oldHtml, /처음 3초/);
  const nullFields = {...real, analysis: normalizeExtraObservations(real.analysis)};
  const nullHtml = renderReportPage(nullFields);
  assert.doesNotMatch(nullHtml, /새 항목 도입 전/);
  assert.match(nullHtml, /확인 불가/);
});

test('새 칸 보기: 값이 보이고 외부 글자는 이스케이프된다', () => {
  const norm = normalizeExtraObservations(fullFake());
  norm.captionStyle.position = '<script>alert(1)</script>';
  const {analysis} = verifyQuotes(norm, {transcriptText: '발음 한번 해보세요 하나 둘 셋'});
  const html = extraObservationsHtml(analysis);
  assert.ok(!html.includes('<script>alert'), '이스케이프 안 됨');
  assert.match(html, /정보 개수\(AI 추정\)<\/b>: 7개/);
  assert.match(html, /배경음악: 있음/);
  assert.match(html, /원문에 없음/);
  assert.match(html, /시키기/);
});

test('프롬프트: 새 칸 요청이 들어 있고, 우리 철학·작법 이름과 고정 훅 목록은 들어 있지 않다', () => {
  const prompt = buildReportPrompt({meta, subscriberCount: 1000, outlierRatio: 3, transcriptLines: [{start: 0, text: '발음 한번 해보세요'}], comments: [{text: '충격임', likeCount: 3}], windowSeconds: 53});
  for (const k of NEW_FIELDS) assert.ok(prompt.includes(`"${k}"`), `프롬프트에 ${k} 칸이 없다`);
  assert.match(prompt, /한두 문장으로 짧게/);
  assert.match(prompt, /"없음"/);
  const BANNED = ['도파민', '핑퐁', 'Callaway', '6대 작법', '작법', '게으른 혀', '3단계 공식', '상식 파괴형', '공감 유발형', '손실 회피형', '직관 퀴즈형', '이해하면 쉬운영어', 'Epiphany', 'But/Therefore', '독점 스토리', 'Show, Don', 'Dead Air', 'Jagged'];
  for (const w of BANNED) assert.ok(!prompt.includes(w), `프롬프트에 "${w}"가 들어 있다`);
  // 훅 종류를 고정 목록에서 고르게 하지 않는다: 질문/반전/도발/약속이 한 줄에 나열된 목록이 없어야 한다.
  assert.ok(!/질문[,/·]\s*반전/.test(prompt) && !/반전[,/·]\s*도발/.test(prompt), '훅 종류 고정 목록이 들어 있다');
});
