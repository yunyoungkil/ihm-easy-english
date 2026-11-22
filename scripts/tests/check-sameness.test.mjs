import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync, readFileSync} from 'node:fs';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {
  CODE_CAUTION_MIN, CODE_WARN_MIN, SCENE_WARN_MIN,
  codeLevel, compareCandidate, effectiveDate, findConsecutiveRuns, findRecentRepeats, formatOfName,
  monthCounts, renderDateFromName, sameLineShare, sceneLevel, sceneNamesFromIndexHtml, sceneOrderShare,
  summarizeRenders, templateSimilarity, titleEntries, titleMainPart, titleTemplate,
} from '../check-sameness.mjs';

const projectDir = dirname(dirname(dirname(fileURLToPath(import.meta.url))));
const catalogPath = join(projectDir, 'data', 'youtube', 'catalog.json');

// 칸 이름은 실제 catalog.json과 같다: videoId, title, publishedAt, privacyStatus, scheduledPublishAt, format
const video = (over) => ({videoId: 'v', title: 't', publishedAt: '2026-11-01T00:00:00Z', privacyStatus: 'public', scheduledPublishAt: null, format: 'LONGFORM', ...over});

// ---- 제목 틀 ----
test('제목 틀: 영어 단어·따옴표 말·숫자는 자리표시자로 바뀐다', () => {
  assert.equal(titleTemplate("Pool과 Pull, 둘 다 '풀'로 읽으셨나요? #영어발음"), '{영어}와 {영어}, 둘 다 {말}로 읽으셨나요?');
  assert.equal(titleTemplate('원어민이 F와 P를 0.1초 만에 구별하는 법 | F vs P 24쌍 [반복 듣기]'), '원어민이 {영어}와 {영어}를 {숫자}초 만에 구별하는 법');
});

test('제목 틀 같음(미탐 방지): 단어만 바뀐 EP24·25형 제목은 같은 틀 100%', () => {
  const s = templateSimilarity("Sheep과 Ship, 둘 다 '쉽'으로 읽으셨나요?", "Right와 Light, 둘 다 '라이트'로 읽으셨나요?");
  assert.equal(s.same, true);
  assert.equal(s.level, 'same');
  assert.equal(s.share, 1);
});

test('제목 틀 다름(오탐 방지): 문장 틀이 서로 다른 제목은 다른 틀', () => {
  const s = templateSimilarity('왜 두 글자인데 한 번만 낼까?', "Pool과 Pull, 둘 다 '풀'로 읽으셨나요?");
  assert.equal(s.level, 'different');
  assert.equal(s.same, false);
  const t = templateSimilarity('영어 -S 끝소리 3가지, 이것만 알면 귀가 뚫립니다', '원어민이 F와 P를 0.1초 만에 구별하는 법');
  assert.equal(t.level, 'different');
});

test('제목 틀: 조사 과/와, 을/를이 달라도 같은 틀로 본다', () => {
  assert.equal(templateSimilarity('Sheep과 Ship 차이', 'Right와 Light 차이').same, true);
});

test('제목 틀: 빈 제목은 계산하지 않고 다른 틀로 둔다(대신값 없음)', () => {
  const s = templateSimilarity('', '');
  assert.equal(s.share, null);
  assert.equal(s.same, false);
  assert.equal(s.level, 'different');
  assert.equal(titleMainPart(null), '');
});

test('최근 5편 안 같은 틀 2번 이상이면 반복으로 잡고, 다 다르면 비어 있다', () => {
  const same = ["Pool과 Pull, 둘 다 '풀'로 읽으셨나요?", "Right와 Light, 둘 다 '라이트'로 읽으셨나요?", '영어 -S 끝소리 3가지, 이것만 알면 귀가 뚫립니다']
    .map((title, i) => ({title, date: `2026-11-0${i + 1}`}));
  assert.equal(findRecentRepeats(same).length, 1);
  const distinct = ['왜 두 글자인데 한 번만 낼까?', '영어 -S 끝소리 3가지, 이것만 알면 귀가 뚫립니다', '팬, 팬, 팬… 이 중 프라이팬은 몇 번일까요?']
    .map((title, i) => ({title, date: `2026-11-0${i + 1}`}));
  assert.equal(findRecentRepeats(distinct).length, 0);
  assert.equal(findConsecutiveRuns(same).length, 1);
  assert.equal(findConsecutiveRuns(same)[0].length, 2);
});

test('새 제목 후보 비교: 최근 5편만 나란히 놓는다', () => {
  const list = Array.from({length: 7}, (_, i) => ({title: `제목 ${i}번째 이야기`, date: `2026-11-0${i + 1}`}));
  assert.equal(compareCandidate('아무 제목', list).length, 5);
});

test('제목 목록: 비공개(예약 아님)는 빼고 예약은 예약으로, 형식별로 나눈다', () => {
  const out = titleEntries([
    video({videoId: 'a', title: '공개 롱폼', publishedAt: '2026-11-01T00:00:00Z'}),
    video({videoId: 'b', title: '예약 쇼츠', format: 'SHORTS', privacyStatus: 'private', scheduledPublishAt: '2026-11-20T00:00:00Z'}),
    video({videoId: 'c', title: '그냥 비공개', privacyStatus: 'private'}),
  ], [{name: 'ep30', title: '패키지 제목', format: 'LONGFORM', date: '2026-11-25'}]);
  assert.deepEqual(out.LONGFORM.map((e) => [e.title, e.state]), [['공개 롱폼', '공개'], ['패키지 제목', '업로드 전']]);
  assert.deepEqual(out.SHORTS.map((e) => [e.title, e.state]), [['예약 쇼츠', '예약']]);
  assert.equal(effectiveDate(video({scheduledPublishAt: '2026-11-20T00:00:00Z'})), '2026-11-20T00:00:00Z');
});

// ---- 코드 같은 줄 비율 ----
test('같은 줄 비율: 공백·빈 줄은 무시하고, 뒤 편 줄 기준으로 센다', () => {
  const prev = 'a\n  b\n\nc\nd\n';
  const next = 'a\nb   \n\nx\nc\n';
  const r = sameLineShare(prev, next);
  assert.deepEqual([r.same, r.total, r.share], [3, 4, 0.75]);
});

test('같은 줄 비율: 같은 줄이 앞 편에 한 번뿐이면 한 번만 짝짓는다', () => {
  const r = sameLineShare('x\n', 'x\nx\nx\ny\n');
  assert.deepEqual([r.same, r.total], [1, 4]);
});

test('같은 줄 비율: 뒤 편이 비어 있으면 null(0%나 100%로 대신하지 않는다)', () => {
  assert.equal(sameLineShare('a\nb', '\n  \n'), null);
  assert.equal(sameLineShare('a', null), null);
});

test('코드 문턱: 점검 사례 70~74%대는 경고, 39%대는 통과, 50%대는 주의', () => {
  assert.equal(codeLevel(0.744), '경고');
  assert.equal(codeLevel(0.708), '경고');
  assert.equal(codeLevel(0.392), '통과');
  assert.equal(codeLevel(0.538), '주의');
  assert.equal(codeLevel(CODE_WARN_MIN), '경고');
  assert.equal(codeLevel(CODE_CAUTION_MIN), '주의');
  assert.equal(codeLevel(null), null);
});

// ---- 장면 순서 ----
test('장면 이름: data-composition-src에서 앞 번호를 떼고 시작 시각 순서로 정렬한다', () => {
  const html = '<div data-composition-src="compositions/02-principle.html" data-start="10"></div>'
    + '<div data-composition-src="compositions/01-hook.html" data-start="0"></div>';
  assert.deepEqual(sceneNamesFromIndexHtml(html), ['hook', 'principle']);
  assert.deepEqual(sceneNamesFromIndexHtml('<div></div>'), []);
  assert.deepEqual(sceneNamesFromIndexHtml(null), []);
});

test('장면 순서 비교: 같은 이름·같은 순서 비율(순서가 뒤집히면 낮아진다)', () => {
  const a = ['hook', 'principle', 'drill', 'quiz', 'recap'];
  assert.equal(sceneOrderShare(a, a).share, 1);
  assert.equal(sceneLevel(1), '경고');
  const shuffled = ['recap', 'quiz', 'drill', 'principle', 'hook'];
  assert.equal(sceneOrderShare(a, shuffled).same, 1);
  assert.equal(sceneLevel(sceneOrderShare(a, shuffled).share), '통과');
  const partial = sceneOrderShare(['hook', 'a', 'drill', 'b', 'recap', 'c', 'd', 'e', 'f', 'g'], ['hook', 'x', 'drill', 'y', 'recap', 'z', 'w', 'v', 'u', 't']);
  assert.equal(partial.share, 0.3);
  assert.ok(0.7 >= SCENE_WARN_MIN);
});

test('장면 순서 비교: 한쪽에 장면이 없으면 null', () => {
  assert.equal(sceneOrderShare([], ['hook']), null);
  assert.equal(sceneOrderShare(['hook'], undefined), null);
});

// ---- 제작 속도 ----
test('렌더 파일 이름의 날짜를 읽고, 날짜 없는 이름은 null', () => {
  const d = renderDateFromName('ep26-r-vs-l_2026-10-09_18-57-49.mp4');
  assert.equal(d.getFullYear(), 2026);
  assert.equal(d.getMonth(), 9);
  assert.equal(d.getHours(), 18);
  assert.equal(renderDateFromName('video.mp4'), null);
  assert.equal(formatOfName('ep29-shorts-very-berry'), 'SHORTS');
  assert.equal(formatOfName('ep29-b-vs-v'), 'LONGFORM');
});

test('렌더 요약: 마지막 렌더 며칠 전, 최근 30일 편 수, 기준 시각 이후 파일은 무시', () => {
  const now = new Date('2026-11-15T00:00:00Z');
  const r = summarizeRenders([
    {key: 'ep26', format: 'LONGFORM', date: new Date('2026-10-09T00:00:00Z'), source: 's'},
    {key: 'ep29s', format: 'SHORTS', date: new Date('2026-11-09T00:00:00Z'), source: 's'},
    {key: 'ep29s', format: 'SHORTS', date: new Date('2026-11-10T00:00:00Z'), source: 's'},
    {key: 'ep30', format: 'SHORTS', date: new Date('2026-12-01T00:00:00Z'), source: 's'},
  ], now);
  assert.equal(r.LONGFORM.last.daysAgo, 37);
  assert.deepEqual(r.LONGFORM.recentProjects, []);
  assert.equal(r.SHORTS.last.key, 'ep29s');
  assert.equal(r.SHORTS.last.daysAgo, 5); // 11-10 00:00 → 11-15 00:00 = 정확히 5일
  assert.deepEqual(r.SHORTS.recentProjects, ['ep29s']);
});

test('렌더 요약: 렌더가 하나도 없으면 last는 null(0일 전으로 대신하지 않는다)', () => {
  const r = summarizeRenders([], new Date('2026-11-15T00:00:00Z'));
  assert.equal(r.LONGFORM.last, null);
  assert.equal(r.SHORTS.last, null);
});

test('이번 달 공개·예약 수: 한국 시간 달 기준, 비공개는 제외', () => {
  const now = new Date('2026-11-15T06:00:00Z');
  const m = monthCounts([
    video({videoId: 'a', publishedAt: '2026-11-12T00:00:00Z'}),
    video({videoId: 'b', publishedAt: '2026-10-31T16:00:00Z'}), // 한국 시간 11/1 01:00 -> 이번 달
    video({videoId: 'c', publishedAt: '2026-10-30T00:00:00Z'}), // 지난달
    video({videoId: 'd', format: 'SHORTS', privacyStatus: 'private', scheduledPublishAt: '2026-11-20T00:00:00Z'}),
    video({videoId: 'e', privacyStatus: 'private'}),
  ], now);
  assert.equal(m.month, '2026-11');
  assert.deepEqual(m.LONGFORM, {published: 2, scheduled: 0});
  assert.deepEqual(m.SHORTS, {published: 0, scheduled: 1});
});

// ---- 실제 카탈로그의 칸 이름 ----
test('실제 catalog.json에 이 검사가 읽는 칸이 있다', {skip: !existsSync(catalogPath)}, () => {
  const v = JSON.parse(readFileSync(catalogPath, 'utf8')).videos[0];
  for (const key of ['videoId', 'title', 'publishedAt', 'privacyStatus', 'scheduledPublishAt', 'format']) assert.ok(key in v, `${key} 칸이 없다`);
});

test('buildReport: 최신 비교 시트의 레퍼런스 반복 편향 경고를 비차단으로 포함한다', async () => {
  const {buildReport} = await import('../check-sameness.mjs');
  const rep = buildReport();
  assert.ok(rep.referenceBias && Array.isArray(rep.referenceBias.warnings));
});
