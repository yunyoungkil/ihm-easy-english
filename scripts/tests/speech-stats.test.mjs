// 한국어 말투 측정(scripts/speech-stats.mjs) 시험. 2026-11-15.
// 예문은 실제 경쟁 영상 받아쓰기 글(whisper small)과 우리 쇼츠 대본에서 짧게 뽑았다. 네트워크·yt-dlp·whisper는 부르지 않는다.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  splitSentences, endingKey, measureSpeech, assessSpeechQuality, buildSpeechField, speechRates, buildSpeechPatterns,
  SPEECH_QUALITY, SPEECH_LOW_SAMPLE_VIDEOS, ENDING_KEYS, FILLER_KEYS,
} from '../speech-stats.mjs';

// 실제 받아쓰기(tpveKY5pnis, 롱폼 하니티처)에서 뽑은 문장들
const REAL_LONG = '오늘은 영어의 기본 부터 시작해서 차근차근 읽고 말하고 쓸 수 있을 때까지 영어를 배워보기로 할 건데요. 그 첫 시간으로 오늘은 알파벳을 배워볼 거예요. 자 그럼 시작하겠습니다. 자 영어에는 총 26가지의 문자가 있어요. 당연히 말의 가장 기본은 문자를 먼저 아는 것이겠죠. 그래서 말의 속도가 빨라질수록 이러한 현상이 좀 더 많이 생기죠. 여러분, 이거 왜 리스트니 아닐까요? 궁금한 적 없으세요?';
// 우리 쇼츠 대본(OURS)에서 뽑은 "사전 풀이 모양"이 든 줄
const OURS_DICT = '다르다는 뜻의 디퍼런트도 마찬가지예요. 기억이라는 뜻의 메모리는요? 매일 쓰는 단어인데, 소리는 달랐어요.';

test('문장 나누기: 문장 부호와 어미 뒤 공백, 대괄호 표시는 버린다', () => {
  assert.equal(splitSentences('첫째예요. 둘째인가요? 셋째! [음악]').length, 3);
  // 부호 없는 자막도 어미 뒤 공백에서 나눈다
  assert.deepEqual(splitSentences('그 첫 시간으로 알파벳을 배워볼 거예요 자 그럼 시작하겠습니다'), ['그 첫 시간으로 알파벳을 배워볼 거예요', '자 그럼 시작하겠습니다']);
  assert.deepEqual(splitSentences(''), []);
  assert.deepEqual(splitSentences(null), []);
});

test('끝맺음 분류: 위에서부터 처음 맞는 하나', () => {
  const cases = [
    ['궁금한 적 없으세요?', 'question'],
    ['이거 왜 리스트니 아닐까요', 'question'], // 부호가 없는 자막
    ['한번 따라 해 보세요.', 'command'],
    ['소리가 달라지거든요.', 'geodeunyo'],
    ['우리말도 줄여 말하잖아요.', 'janhayo'],
    ['생각보다 많네요.', 'neyo'],
    ['알파벳을 배워볼 건데요.', 'ndeyo'],
    ['이러한 현상이 좀 더 많이 생기죠.', 'jyo'],
    ['자 그럼 시작하겠습니다.', 'hapsyo'],
    ['알파벳을 배워볼 거예요.', 'haeyo'],
    ['그냥 스티!', 'other'],
  ];
  for (const [s, key] of cases) assert.equal(endingKey(s), key, s);
});

test('measureSpeech: 실제 받아쓰기 문장의 횟수', () => {
  const m = measureSpeech(REAL_LONG);
  assert.equal(m.sentences, 8);
  assert.equal(m.endings.ndeyo, 1);
  assert.equal(m.endings.hapsyo, 1);
  assert.equal(m.endings.jyo, 2);
  assert.equal(m.endings.question, 2);
  assert.equal(m.endings.haeyo, 2);
  assert.equal(m.jointEnd, 1); // "건데요"
  assert.equal(m.fillers['자'], 2);
  assert.equal(m.fillers['여러분'], 1);
  assert.equal(m.fillers['그래서'], 1);
  assert.equal(m.dictFrameSentences, 0);
  assert.equal(m.questionSentences, 2);
  assert.equal(Object.values(m.endings).reduce((a, b) => a + b, 0), m.sentences);
  assert.deepEqual(Object.keys(m.endings), ENDING_KEYS);
  assert.deepEqual(Object.keys(m.fillers), FILLER_KEYS);
});

test('사전 풀이 모양과 뜻을 뒤에 붙이는 모양을 따로 센다, 과거형 결론도 센다', () => {
  const m = measureSpeech(`${OURS_DICT} 경우라는 뜻이죠.`);
  assert.equal(m.sentences, 4);
  assert.equal(m.dictFrameSentences, 2); // "~는 뜻의", "~라는 뜻의"
  assert.equal(m.meaningAfterSentences, 1); // "뜻이죠"
  assert.equal(m.pastConclusionSentences, 1); // "달랐어요"
  assert.equal(m.jointMid, 1); // "단어인데, 소리는"
});

test('값 없음: 빈 글은 측정하지 않고 null', () => {
  assert.equal(measureSpeech(''), null);
  assert.equal(measureSpeech(undefined), null);
  assert.equal(speechRates(null), null);
  assert.equal(speechRates({sentences: 0}), null);
});

// ---- 품질 문턱 ----
// 서로 다른 한국어 문장 10개(고유 어절·문장 비율이 문턱을 넘도록)
const POOL = [
  '오늘은 영어의 기본 부터 시작해서 차근차근 읽고 말하고 쓸 수 있을 때까지 영어를 배워볼 건데요.', '그 첫 시간으로 오늘은 알파벳을 배워볼 거예요.', '자 영어에는 총 26가지의 문자가 있어요.',
  '이 문자들을 서로 조합해서 단어를 만들게 되고 그 단어를 모아서 문장을 만들게 되는 거예요.', '당연히 말의 가장 기본은 문자를 먼저 아는 것이겠죠.', '그래서 말의 속도가 빨라질수록 이러한 현상이 좀 더 많이 생기죠.',
  '여러분, 이거 왜 리스트니 아닐까요?', '궁금한 적 없으세요?', '혀 움직임이나 입 모양이나 턱의 움직임이 크면 소리가 생략되기도 해요.', '마지막으로 한번 같이 읽어 보겠습니다.',
];
const manySentences = (n) => POOL.slice(0, n).join(' ');

test('품질 문턱 경계: 문장 수', () => {
  const n = SPEECH_QUALITY.MIN_SENTENCES;
  assert.equal(assessSpeechQuality(manySentences(n)).quality, 'ok');
  const low = assessSpeechQuality(manySentences(n - 1));
  assert.equal(low.quality, 'low');
  assert.match(low.reasons.join(' '), /문장/);
});

test('품질 문턱: 영어 예문만 낭독한 글(한국어 글자 비율)과 같은 말 반복(고유 어절·문장 비율)은 low', () => {
  const english = Array.from({length: 12}, (_, i) => `This is the sentence number ${i} and it is read aloud. 편하게 발음할 수 있어요.`).join(' ');
  const q = assessSpeechQuality(english);
  assert.equal(q.quality, 'low');
  assert.ok(q.metrics.hangulRatio < SPEECH_QUALITY.HANGUL_RATIO_MIN);
  // 랩처럼 같은 단어가 반복(AAjB95YXQxc의 받아쓰기 모양)
  const rap = Array.from({length: 20}, () => '"안녕" "안녕" "안녕" "안녕" "안녕" "안녕" 안녕하세요 안녕하세요.').join(' ');
  const r = assessSpeechQuality(rap);
  assert.equal(r.quality, 'low');
  assert.ok(r.metrics.uniqueWordRatio < SPEECH_QUALITY.UNIQUE_WORD_MIN || r.metrics.uniqueSentenceRatio < SPEECH_QUALITY.UNIQUE_SENTENCE_MIN);
});

test('품질 문턱: 한글이 너무 적은 글, 음악 표시뿐인 글은 low', () => {
  assert.equal(assessSpeechQuality('[음악] [음악]').quality, 'low');
  assert.equal(assessSpeechQuality('').quality, 'low');
  assert.equal(assessSpeechQuality('바로만 해보세요 여러분. 여러분 원어미 만들어 드릴게요.').quality, 'low'); // SbQVBQoRciA 실제 받아쓰기 모양
});

test('품질 문턱: 실제 롱폼 받아쓰기 모양(문장 8개 이상, 한글 충분)은 ok', () => {
  assert.equal(assessSpeechQuality(`${REAL_LONG} ${REAL_LONG}`).quality, 'low'); // 같은 글을 두 번 붙이면 고유 문장 비율이 0.5라 low
  assert.equal(assessSpeechQuality(REAL_LONG).quality, 'ok');
});

test('buildSpeechField: 칸 모양과 low 이유, 못 잰 경우', () => {
  const now = new Date('2026-11-15T01:00:00Z');
  const ok = buildSpeechField({text: REAL_LONG, source: 'transcript-api', kind: 'long', now});
  assert.equal(ok.source, 'transcript-api');
  assert.equal(ok.quality, 'ok');
  assert.equal(ok.sentences, 8);
  assert.equal(ok.stats.sentences, 8);
  assert.equal(ok.computedAt, now.toISOString());
  assert.equal(ok.note, null);
  const low = buildSpeechField({text: '[음악] 바로만 해보세요 여러분.', source: 'whisper-small', kind: 'short', now});
  assert.equal(low.quality, 'low');
  assert.match(low.note, /품질 낮음/);
  const none = buildSpeechField({kind: 'short', now, note: '자막을 못 받음', extra: {fallbackTried: true}});
  assert.equal(none.source, null);
  assert.equal(none.stats, null);
  assert.equal(none.quality, null);
  assert.equal(none.note, '자막을 못 받음');
  assert.equal(none.fallbackTried, true);
});

// ---- 합계 ----
const reportWith = (videoId, channelTitle, speech) => ({videoId, meta: {videoId, channelTitle}, speech});
const okField = (text, kind, source = 'transcript-api') => buildSpeechField({text, source, kind, now: new Date('2026-11-15T01:00:00Z')});

test('합계: ok인 영상만 롱폼·쇼츠로 나눠 더하고, low와 못 잰 영상은 센다', () => {
  const reports = [
    reportWith('aaaaaaaaaaa', '채널A', okField(REAL_LONG, 'long')),
    reportWith('bbbbbbbbbbb', '채널B', okField(REAL_LONG, 'long', 'whisper-small')),
    reportWith('ccccccccccc', '채널C', okField(REAL_LONG, 'short')),
    reportWith('ddddddddddd', '채널D', buildSpeechField({text: '바로만 해보세요 여러분. 여러분 원어미 만들어 드릴게요.', source: 'whisper-small', kind: 'long'})),
    reportWith('eeeeeeeeeee', '채널E', buildSpeechField({kind: 'long', note: '자막을 못 받음'})),
    {videoId: 'fffffffffff', meta: {channelTitle: '채널F'}}, // 옛 리포트: speech 칸 없음
  ];
  const p = buildSpeechPatterns(reports, new Date('2026-11-15T02:00:00Z'));
  assert.equal(p.confidence, '가설');
  assert.equal(p.long.videoCount, 2);
  assert.equal(p.long.totals.sentences, 16);
  assert.equal(p.long.lowSample, true); // 5편 미만
  assert.equal(p.short.videoCount, 1);
  assert.equal(p.excludedLowQuality, 1);
  assert.equal(p.unmeasured, 2);
  assert.deepEqual(p.long.bySource, {'transcript-api': 1, 'whisper-small': 1});
  assert.deepEqual(p.long.videos.map((v) => [v.videoId, v.channelTitle]), [['aaaaaaaaaaa', '채널A'], ['bbbbbbbbbbb', '채널B']]);
  assert.equal(p.long.totals.endings.jyo, 4);
  assert.equal(p.long.rates.endingsPct.jyo, 25); // 4/16
  assert.equal(p.long.rates.fillersPer100.자, 25); // 4/16문장
  // 원문은 어디에도 없다
  assert.ok(!JSON.stringify(p).includes('알파벳'));
});

test('합계: 영상 수가 기준 이상이면 lowSample이 꺼지고, 리포트가 없으면 rates는 null', () => {
  const many = Array.from({length: SPEECH_LOW_SAMPLE_VIDEOS}, (_, i) => reportWith(`v${String(i).padStart(10, '0')}`, '채널', okField(REAL_LONG, 'long')));
  assert.equal(buildSpeechPatterns(many).long.lowSample, false);
  const empty = buildSpeechPatterns([]);
  assert.equal(empty.long.videoCount, 0);
  assert.equal(empty.long.rates, null);
  assert.equal(empty.long.lowSample, true);
});

test('합계 함수는 입력을 바꾸지 않는다', () => {
  const reports = [reportWith('aaaaaaaaaaa', '채널A', okField(REAL_LONG, 'long'))];
  const before = JSON.stringify(reports);
  buildSpeechPatterns(reports);
  assert.equal(JSON.stringify(reports), before);
});
