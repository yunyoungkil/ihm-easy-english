// 경쟁 영상 리포트의 말투 칸(speech) 연결 시험. 2026-11-15.
// 자막 본문은 저장하지 않는 구조라 말투는 메모리의 자막 글로 잰다. 자막이 막힌 날의 대체 경로(소리 받기+받아쓰기)는
// 가짜 함수를 넣어 시험하고, 네트워크·yt-dlp·whisper는 부르지 않는다. transcript 모양은 scripts/extract-transcript.py 출력과 같다.
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync, rmSync, readFileSync, existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {
  resolveSpeechField, speechFallbackBudget, speechTextFromTranscript, speechKindOf, isSpeechBlockSignal, writeSpeechPatternsFile,
  SPEECH_FALLBACK_PER_DAY, SPEECH_FALLBACK_GAP_MS,
} from '../outlier-report.mjs';

const LINES = [
  {start: 0, duration: 4, text: '오늘은 영어의 기본 부터 시작해서 차근차근 읽고 말하고 쓸 수 있을 때까지 영어를 배워보기로 할 건데요.'},
  {start: 4, duration: 4, text: '그 첫 시간으로 오늘은 알파벳을 배워볼 거예요.'},
  {start: 8, duration: 4, text: '자 그럼 시작하겠습니다.'},
  {start: 12, duration: 4, text: '자 영어에는 총 26가지의 문자가 있어요.'},
  {start: 16, duration: 4, text: '당연히 말의 가장 기본은 문자를 먼저 아는 것이겠죠.'},
  {start: 20, duration: 4, text: '그래서 말의 속도가 빨라질수록 이러한 현상이 좀 더 많이 생기죠.'},
  {start: 24, duration: 4, text: '여러분, 이거 왜 리스트니 아닐까요?'},
  {start: 28, duration: 4, text: '궁금한 적 없으세요?'},
  {start: 305, duration: 4, text: '이 문장은 앞 5분 밖이라 롱폼에서는 쓰지 않는다.'},
];
const transcriptOk = {lines: LINES, fullText: LINES.map((l) => l.text).join(' '), language: 'ko'};
const transcriptBlocked = {error: 'YouTube is blocking requests from your IP (IpBlocked)'};
const WHISPER_TEXT = LINES.slice(0, 8).map((l) => l.text).join('\n');
const NOW = new Date('2026-11-15T03:00:00+09:00');
const reportToday = (videoId, speech) => ({videoId, meta: {videoId, channelTitle: '채널'}, speech});

const makeFallback = (impl) => {
  const calls = [];
  const fn = async (args) => { calls.push(args); return impl(args); };
  fn.calls = calls;
  return fn;
};
const quiet = () => ({state: {lastAt: null}, sleeps: [], sleep: async function (ms) { this.sleeps.push(ms); }});

test('자막을 받은 날: 자막 글로 재고, 대체 경로는 부르지 않는다(추가 요청 0)', async () => {
  const fallback = makeFallback(() => { throw new Error('부르면 안 됨'); });
  const speech = await resolveSpeechField({videoId: 'SbQVBQoRciA', kind: 'short', transcript: transcriptOk, now: NOW, fallback});
  assert.equal(fallback.calls.length, 0);
  assert.equal(speech.source, 'transcript-api');
  assert.equal(speech.kind, 'short');
  assert.equal(speech.quality, 'ok');
  assert.equal(speech.sentences, 9);
  assert.ok(speech.stats.endings);
  assert.equal(speech.fallbackTried, undefined);
});

test('롱폼은 자막의 앞 5분만 쓴다', () => {
  assert.equal(speechTextFromTranscript(transcriptOk, 'short').includes('앞 5분 밖'), true);
  assert.equal(speechTextFromTranscript(transcriptOk, 'long').includes('앞 5분 밖'), false);
  assert.equal(speechTextFromTranscript(transcriptBlocked, 'long'), '');
  assert.equal(speechTextFromTranscript({lines: [], fullText: ''}, 'long'), '');
});

test('쇼츠·롱폼 판정: market-demand의 isShort를 먼저, 없으면 60초 이하', () => {
  assert.equal(speechKindOf(53, null), 'short');
  assert.equal(speechKindOf(600, null), 'long');
  assert.equal(speechKindOf(53, {isShort: false}), 'long');
  assert.equal(speechKindOf(600, {isShort: true}), 'short');
  assert.equal(speechKindOf(undefined, null), 'long');
});

test('자막이 막힌 날: 대체 경로를 한 번 부르고 whisper-small로 기록한다', async () => {
  const q = quiet();
  const fallback = makeFallback(() => WHISPER_TEXT);
  const speech = await resolveSpeechField({videoId: 'SbQVBQoRciA', kind: 'short', transcript: transcriptBlocked, reports: [], now: NOW, fallback, sleep: (ms) => q.sleep(ms), state: q.state});
  assert.deepEqual(fallback.calls, [{videoId: 'SbQVBQoRciA', kind: 'short'}]);
  assert.equal(speech.source, 'whisper-small');
  assert.equal(speech.quality, 'ok');
  assert.equal(speech.fallbackTried, true);
  assert.equal(q.sleeps.length, 0); // 이 프로세스의 첫 대체 경로라 쉬지 않는다
});

test('대체 경로가 낮은 품질의 글을 주면 low로 표시하고 합계에서 빠진다', async () => {
  const q = quiet();
  const speech = await resolveSpeechField({videoId: 'SbQVBQoRciA', kind: 'short', transcript: transcriptBlocked, reports: [], now: NOW, fallback: makeFallback(() => '바로만 해보세요 여러분. [음악] [음악]'), sleep: (ms) => q.sleep(ms), state: q.state});
  assert.equal(speech.source, 'whisper-small');
  assert.equal(speech.quality, 'low');
  assert.equal(speech.fallbackTried, true);
});

test('하루 대체 경로는 최대 2편: 오늘 이미 2편 했으면 부르지 않는다', async () => {
  const today = (id) => reportToday(id, {source: 'whisper-small', quality: 'ok', fallbackTried: true, computedAt: NOW.toISOString()});
  const reports = [today('aaaaaaaaaaa'), today('bbbbbbbbbbb')];
  assert.equal(SPEECH_FALLBACK_PER_DAY, 2);
  assert.deepEqual(speechFallbackBudget(reports, NOW), {used: 2, limit: 2, remaining: 0, blocked: false});
  const fallback = makeFallback(() => WHISPER_TEXT);
  const speech = await resolveSpeechField({videoId: 'ccccccccccc', kind: 'long', transcript: transcriptBlocked, reports, now: NOW, fallback});
  assert.equal(fallback.calls.length, 0);
  assert.equal(speech.source, null);
  assert.match(speech.note, /상한/);
  assert.equal(speech.fallbackTried, undefined); // 시도하지 않았으니 오늘 몫을 더 쓰지 않는다
});

test('어제 한 대체 경로는 오늘 몫에 들어가지 않는다', () => {
  const yesterday = new Date(NOW.getTime() - 86400000).toISOString();
  const reports = [reportToday('aaaaaaaaaaa', {fallbackTried: true, computedAt: yesterday}), reportToday('bbbbbbbbbbb', {fallbackTried: true, computedAt: yesterday, blocked: true})];
  assert.deepEqual(speechFallbackBudget(reports, NOW), {used: 0, limit: 2, remaining: 2, blocked: false});
});

test('429 신호에서 즉시 멈춘다: 그 영상은 blocked로 남고, 그날 다음 영상은 대체 경로를 부르지 않는다', async () => {
  const q = quiet();
  const fallback = makeFallback(() => { throw new Error('ERROR: unable to download video data: HTTP Error 429: Too Many Requests'); });
  const first = await resolveSpeechField({videoId: 'aaaaaaaaaaa', kind: 'short', transcript: transcriptBlocked, reports: [], now: NOW, fallback, sleep: (ms) => q.sleep(ms), state: q.state});
  assert.equal(first.source, null);
  assert.equal(first.fallbackTried, true);
  assert.equal(first.blocked, true);
  assert.match(first.note, /429/);
  const reports = [reportToday('aaaaaaaaaaa', first)];
  assert.equal(speechFallbackBudget(reports, NOW).blocked, true);
  const second = await resolveSpeechField({videoId: 'bbbbbbbbbbb', kind: 'short', transcript: transcriptBlocked, reports, now: NOW, fallback, sleep: (ms) => q.sleep(ms), state: q.state});
  assert.equal(fallback.calls.length, 1); // 두 번째는 부르지 않았다
  assert.match(second.note, /차단 신호/);
  assert.equal(second.blocked, undefined);
});

test('차단이 아닌 실패(받아쓰기 오류)는 오늘 몫 하나를 쓰지만 멈추지는 않는다, 리포트 생성을 막지 않는다', async () => {
  const q = quiet();
  const speech = await resolveSpeechField({videoId: 'aaaaaaaaaaa', kind: 'long', transcript: transcriptBlocked, reports: [], now: NOW, fallback: makeFallback(() => { throw new Error('whisper 시간 초과'); }), sleep: (ms) => q.sleep(ms), state: q.state});
  assert.equal(speech.source, null);
  assert.equal(speech.fallbackTried, true);
  assert.equal(speech.blocked, undefined);
  assert.match(speech.note, /시간 초과/);
  const empty = await resolveSpeechField({videoId: 'bbbbbbbbbbb', kind: 'long', transcript: transcriptBlocked, reports: [], now: NOW, fallback: makeFallback(() => '  '), sleep: (ms) => q.sleep(ms), state: {lastAt: null}});
  assert.equal(empty.source, null);
  assert.equal(empty.fallbackTried, true);
});

test('대체 경로 영상 사이에는 9초 이상 쉰다(같은 프로세스)', async () => {
  const q = quiet();
  let clock = 1000000;
  const common = {kind: 'short', transcript: transcriptBlocked, reports: [], now: NOW, fallback: makeFallback(() => WHISPER_TEXT), sleep: (ms) => q.sleep(ms), state: q.state, nowMs: () => clock};
  await resolveSpeechField({videoId: 'aaaaaaaaaaa', ...common});
  assert.equal(q.sleeps.length, 0);
  clock += 2000; // 2초 뒤에 다음 영상
  await resolveSpeechField({videoId: 'bbbbbbbbbbb', ...common});
  assert.deepEqual(q.sleeps, [SPEECH_FALLBACK_GAP_MS - 2000]);
  assert.ok(SPEECH_FALLBACK_GAP_MS >= 9000);
  clock += SPEECH_FALLBACK_GAP_MS + 1; // 충분히 쉬었으면 안 쉰다
  await resolveSpeechField({videoId: 'ccccccccccc', ...common});
  assert.equal(q.sleeps.length, 1);
});

test('대체 경로가 없으면(주입 안 함) 못 잰 것으로 기록만 한다', async () => {
  const speech = await resolveSpeechField({videoId: 'aaaaaaaaaaa', kind: 'long', transcript: transcriptBlocked, now: NOW});
  assert.equal(speech.source, null);
  assert.match(speech.note, /대체 경로 없음/);
});

test('차단 신호 문구', () => {
  for (const m of ['HTTP Error 429: Too Many Requests', "Sign in to confirm you're not a bot", 'YouTube is blocking requests from your IP', 'IpBlocked']) assert.equal(isSpeechBlockSignal(m), true, m);
  for (const m of ['whisper 시간 초과', 'This video is not available', '', undefined]) assert.equal(isSpeechBlockSignal(m), false, String(m));
});

test('합계 파일: 저장된 리포트의 speech 칸으로 다시 계산해 쓴다(원문 없음)', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'speech-patterns-'));
  try {
    const field = await resolveSpeechField({videoId: 'aaaaaaaaaaa', kind: 'long', transcript: transcriptOk, now: NOW});
    const file = join(dir, 'speech-patterns.json');
    assert.equal(existsSync(file), false);
    writeSpeechPatternsFile({reports: [reportToday('aaaaaaaaaaa', field)], path: file, now: NOW});
    const written = JSON.parse(readFileSync(file, 'utf8'));
    assert.equal(written.long.videoCount, 1);
    assert.equal(written.long.totals.sentences, 8); // 앞 5분 안의 8문장만
    assert.equal(written.confidence, '가설');
    assert.ok(!readFileSync(file, 'utf8').includes('알파벳'));
  } finally {
    rmSync(dir, {recursive: true, force: true});
  }
});
