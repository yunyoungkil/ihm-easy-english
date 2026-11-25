// 썸네일·문구·제목 사례집(scripts/packaging-cases.mjs) 시험. 2026-11-25.
// 시험 자료만 쓰고 실제 data/youtube/packaging-cases.json에는 기대지 않는다(칸 이름만 실제 파일 모양을 따른다).
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join, isAbsolute} from 'node:path';
import {
  validateCases, indexLine, renderIndex, renderShow, recentlyUsedCaseIds, loadCases,
  MAX_ANALYSIS_CHARS, MAX_TRANSFER_CHARS, MAX_TITLE_CHARS, MAX_INDEX_LINE_CHARS,
} from '../packaging-cases.mjs';
import {renderPackagingCasesPage, renderTransformSheetPage} from '../outlier-report-view.mjs';

const mkCase = (id, extra = {}) => ({
  id,
  status: 'active',
  addedAt: '2026-11-25',
  addedBy: 'Claude Opus 5.5',
  source: 'user-feed',
  videoId: 'kgtaWrZcpKM',
  channel: '시험 채널',
  genre: 'IT·편집 도구',
  format: 'LONGFORM',
  images: [`images/packaging-cases/${id}-seen.png`],
  title: '제목 그대로',
  thumbText: '글자 한 줄 / 글자 두 줄',
  variants: '',
  numbers: {views: 32768, subs: 50500, channelMedian: 13216, xMedian: 2.5, checkedAt: '2026-11-25', note: '시험용 계산'},
  credit: 'thumbnail',
  creditWhy: '출연자 없이 그림만 보였다',
  analysis: {
    synergy: '제목은 사실, 썸네일은 장면',
    curiosity: '답을 비워 둠',
    clickDesire: '나도 저렇게 되고 싶다',
    eyeOrder: {first: '큰 글자', second: '인물 얼굴', shrink: '배경 잡동사니'},
    camera: '가슴 위 정면',
    graphics: '두 층 글자',
    emotion: '놀람',
    promise: '확인 전',
    aiLook: '작은 화면에서도 읽힘',
  },
  transfer: '답을 비운 채 장면만 보여 준다',
  notTransferable: '출연자의 유명세',
  makeWith: ['knowledge/video-effects-toolbox-2026-11-23.md#15'],
  tags: {emotion: ['놀람'], device: ['답 비우기'], situation: ['전후 비교']},
  ...extra,
});
const mkLib = (cases) => ({schemaVersion: 1, updatedAt: '2026-11-25', cases});
const allExist = () => true;

test('올바른 사례집은 문제가 0건이다', () => {
  assert.deepEqual(validateCases(mkLib([mkCase('a-one'), mkCase('b-two', {contrast: {videoId: 'x', title: '평소 제목', views: 1000, xMedian: null, image: 'images/packaging-cases/b-two-contrast.jpg', diff: '글자 층이 하나였다'}})]), {imageExists: allExist}), []);
});

test('빠진 칸·잘못된 값은 문제로 걸린다', () => {
  const cases = [
    ['id가 규칙 밖', {id: 'Bad_Id'}, /id는/],
    ['status가 보기 밖', {status: 'hidden'}, /status/],
    ['addedAt 날짜가 아님', {addedAt: '25/11/2026'}, /addedAt/],
    ['addedBy 없음', {addedBy: ''}, /addedBy/],
    ['source가 보기 밖', {source: 'blog'}, /source/],
    ['format이 보기 밖', {format: 'MID'}, /format/],
    ['images 없음', {images: []}, /images/],
    ['title 없음', {title: ''}, /title/],
    ['thumbText 없음', {thumbText: ''}, /thumbText/],
    ['numbers.views가 숫자가 아님', {numbers: {views: '많음', checkedAt: '2026-11-25'}}, /numbers\.views/],
    ['numbers.checkedAt 없음', {numbers: {views: 1}}, /checkedAt/],
    ['credit이 보기 밖', {credit: 'luck'}, /credit/],
    ['creditWhy 없음', {creditWhy: ''}, /creditWhy/],
    ['analysis 없음', {analysis: undefined}, /analysis/],
    ['transfer 없음', {transfer: ''}, /transfer/],
    ['notTransferable 없음', {notTransferable: ''}, /notTransferable/],
    ['makeWith 없음', {makeWith: []}, /makeWith/],
    ['makeWith 접두사 틀림', {makeWith: ['docs/x.md']}, /makeWith/],
    ['tags 칸이 비었음', {tags: {emotion: [], device: ['a'], situation: ['b']}}, /tags\.emotion/],
    ['contrast 칸이 모자람', {contrast: {videoId: 'x'}}, /contrast/],
  ];
  for (const [label, patch, re] of cases) {
    const problems = validateCases(mkLib([mkCase('ok-case', patch)]), {imageExists: allExist});
    assert.ok(problems.some((p) => re.test(p)), `${label}: 문제가 안 잡혔다 → ${JSON.stringify(problems)}`);
  }
  const noEye = mkCase('eye-miss');
  delete noEye.analysis.eyeOrder.shrink;
  assert.ok(validateCases(mkLib([noEye]), {imageExists: allExist}).some((p) => /eyeOrder\.shrink/.test(p)));
  const noField = mkCase('field-miss');
  delete noField.analysis.curiosity;
  assert.ok(validateCases(mkLib([noField]), {imageExists: allExist}).some((p) => /analysis\.curiosity/.test(p)));
});

test('id가 겹치면 문제다', () => {
  const problems = validateCases(mkLib([mkCase('same-id'), mkCase('same-id')]), {imageExists: allExist});
  assert.ok(problems.some((p) => /겹친다/.test(p)));
});

test('너무 긴 칸은 문제다(AI가 읽을 수 있는 길이로 막는다)', () => {
  const long = (n) => '가'.repeat(n + 1);
  const a = mkCase('long-a', {analysis: {...mkCase('x').analysis, synergy: long(MAX_ANALYSIS_CHARS)}});
  assert.ok(validateCases(mkLib([a]), {imageExists: allExist}).some((p) => /synergy/.test(p) && /넘는다/.test(p)));
  const e = mkCase('long-e'); e.analysis.eyeOrder.first = long(MAX_ANALYSIS_CHARS);
  assert.ok(validateCases(mkLib([e]), {imageExists: allExist}).some((p) => /eyeOrder\.first/.test(p)));
  assert.ok(validateCases(mkLib([mkCase('long-t', {transfer: long(MAX_TRANSFER_CHARS)})]), {imageExists: allExist}).some((p) => /transfer가/.test(p)));
  assert.ok(validateCases(mkLib([mkCase('long-ti', {title: long(MAX_TITLE_CHARS)})]), {imageExists: allExist}).some((p) => /title가|title이/.test(p)));
  assert.ok(validateCases(mkLib([mkCase('long-th', {thumbText: long(MAX_TITLE_CHARS)})]), {imageExists: allExist}).some((p) => /thumbText/.test(p)));
  // 칸마다 한도 안이어도 태그가 길어 목록 한 줄이 한도를 넘으면 막는다
  const manyTags = Array.from({length: 40}, (_, i) => `태그${i}번`);
  const tagged = mkCase('long-line', {tags: {emotion: manyTags, device: ['a'], situation: ['b']}});
  assert.ok(indexLine(tagged).length > MAX_INDEX_LINE_CHARS);
  assert.ok(validateCases(mkLib([tagged]), {imageExists: allExist}).some((p) => /목록 한 줄/.test(p)));
});

test('그림 파일이 없으면 문제다(대조 그림 포함)', () => {
  const missing = (rel) => rel !== 'images/packaging-cases/gone.png';
  const c = mkCase('img-miss', {images: ['images/packaging-cases/gone.png']});
  assert.ok(validateCases(mkLib([c]), {imageExists: missing}).some((p) => /그림 파일이 없다/.test(p)));
  const k = mkCase('img-miss2', {contrast: {videoId: 'x', title: 't', views: 1, xMedian: null, image: 'images/packaging-cases/gone.png', diff: 'd'}});
  assert.ok(validateCases(mkLib([k]), {imageExists: missing}).some((p) => /contrast 그림 파일이 없다/.test(p)));
});

test('목록 한 줄은 사례 칸에서 만든다(배수 측정 전, 최근 사용 표시)', () => {
  const c = mkCase('line-one');
  const line = indexLine(c);
  assert.equal(line, 'line-one | IT·편집 도구 | LONGFORM | 배수 x2.5 | 썸네일 덕 | 감정: 놀람 | 장치: 답 비우기 | 상황: 전후 비교 | 옮길 것: 답을 비운 채 장면만 보여 준다');
  assert.match(indexLine(mkCase('no-x', {numbers: {views: 1, checkedAt: '2026-11-25', xMedian: null}})), /배수 측정 전/);
  assert.ok(indexLine(c, {recentIds: new Set(['line-one'])}).endsWith(' ★최근 사용'));
  assert.ok(!indexLine(c, {recentIds: new Set(['other'])}).includes('★'));
  assert.match(indexLine(mkCase('cm', {credit: 'cast-topic'})), /출연자·소재 덕/);
});

test('renderIndex는 활성 사례를 전부 보여 주고 보관은 뺀 채 개수만 센다', () => {
  const lib = mkLib([
    mkCase('b-low', {genre: '요리', numbers: {views: 1, checkedAt: '2026-11-25', xMedian: 1.2}}),
    mkCase('a-high', {genre: '요리', numbers: {views: 1, checkedAt: '2026-11-25', xMedian: 9.9}}),
    mkCase('c-none', {genre: '요리', numbers: {views: 1, checkedAt: '2026-11-25', xMedian: null}}),
    mkCase('d-old', {status: 'archived'}),
    mkCase('e-other', {genre: '게임'}),
  ]);
  const text = renderIndex(lib, {recentIds: new Set(['a-high'])});
  const lines = text.split('\n');
  assert.match(lines[0], /^사례집: 활성 4개 \(보관 1개는 목록에서 뺌\)/);
  assert.match(lines[0], /--show/);
  assert.equal(lines.length, 1 + 4);
  assert.ok(!text.includes('d-old'));
  const order = lines.slice(1).map((l) => l.split(' | ')[0]);
  assert.deepEqual(order, ['e-other', 'a-high', 'b-low', 'c-none'], '분야 다음 배수 큰 순, 배수 없음은 맨 뒤(게임<요리 가나다순)');
  assert.ok(lines.find((l) => l.startsWith('a-high')).endsWith('★최근 사용'));
  assert.ok(!lines.find((l) => l.startsWith('b-low')).includes('★'));
});

test('renderShow는 모든 칸과 그림 절대 경로, 직접 열어 보라는 줄을 넣고, 없는 id는 알린다', () => {
  const lib = mkLib([mkCase('show-me', {contrast: {videoId: 'x', title: '평소 제목', views: 1000, xMedian: 0.3, image: 'images/packaging-cases/show-me-contrast.jpg', diff: '글자 층이 하나였다'}})]);
  const text = renderShow(lib, ['show-me', 'nope-id'], {baseDir: join(tmpdir(), 'pc-base')});
  const imgLines = text.split('\n').filter((l) => l.startsWith('그림 파일: ') || l.startsWith('대조 그림 파일: '));
  assert.equal(imgLines.length, 2);
  for (const l of imgLines) assert.ok(isAbsolute(l.split(': ').slice(1).join(': ')), `절대 경로가 아니다: ${l}`);
  for (const must of ['제목 그대로', '글자 한 줄 / 글자 두 줄', '답을 비운 채 장면만 보여 준다', '출연자의 유명세', '두 층 글자', '배경 잡동사니', '글자 층이 하나였다']) {
    assert.ok(text.includes(must), `${must} 빠짐`);
  }
  assert.match(text, /\[없는 사례\] nope-id/);
  assert.ok(text.trimEnd().endsWith('그림 파일을 직접 열어 보세요(글 설명만으로 쓰지 않는다).'));
});

test('최근 시트 n장이 인용한 사례 id를 모은다', () => {
  const sheet = (createdAt, ids) => ({createdAt, rows: [{key: 'thumbnail', craft: ids.map((i) => ({source: `case:${i}`}))}, {key: 'title'}]});
  const sheets = [sheet('2026-11-20', ['old']), sheet('2026-11-25', ['a']), sheet('2026-11-24', ['b', 'c']), sheet('2026-11-23', ['d']), {createdAt: '2026-11-26', rows: [{key: 'thumbnail', craft: [{source: 'knowledge/x.md'}]}]}];
  assert.deepEqual([...recentlyUsedCaseIds(sheets, 3)].sort(), ['a', 'b', 'c']);
  assert.deepEqual([...recentlyUsedCaseIds([], 3)], []);
});

test('loadCases: 파일이 없으면 0개, 깨진 JSON이면 쉬운 한국어 오류', () => {
  assert.deepEqual(loadCases(join(tmpdir(), 'no-such-packaging-cases.json')).cases, []);
  const dir = mkdtempSync(join(tmpdir(), 'pc-'));
  const bad = join(dir, 'bad.json');
  writeFileSync(bad, '{ not json');
  assert.throws(() => loadCases(bad), /사례집 파일/);
  const good = join(dir, 'good.json');
  writeFileSync(good, JSON.stringify(mkLib([mkCase('file-case')])));
  assert.equal(loadCases(good).cases[0].id, 'file-case');
});

test('renderPackagingCasesPage: 글자를 이스케이프하고 사례마다 앵커·그림·분석 칸이 있다', () => {
  const lib = mkLib([
    mkCase('page-a', {title: '<script>alert(1)</script> 제목', thumbText: 'A"B'}),
    mkCase('page-b', {status: 'archived', contrast: {videoId: 'x', title: '평소', views: 10, xMedian: 0.3, image: 'images/packaging-cases/page-b-contrast.jpg', diff: '다름'}}),
  ]);
  const html = renderPackagingCasesPage(lib, {recentIds: new Set(['page-a'])});
  assert.ok(!html.includes('<script>alert(1)</script>'));
  assert.ok(html.includes('&lt;script&gt;alert(1)&lt;/script&gt;'));
  assert.ok(html.includes('id="page-a"') && html.includes('id="page-b"'));
  assert.ok(html.includes('/transform-images/packaging-cases/page-a-seen.png'));
  assert.ok(html.includes('/transform-images/packaging-cases/page-b-contrast.jpg'));
  for (const label of ['시너지·역할', '호기심', '클릭 욕구', '눈이 가는 순서', '카메라·관계', '그래픽·글자', '감정', '약속', 'AI 티·작은 화면', '우리에게 옮길 원리', '옮기지 못하는 것']) assert.ok(html.includes(label), `${label} 빠짐`);
  assert.ok(html.includes('보관한 사례'));
  assert.ok(html.indexOf('id="page-a"') < html.indexOf('보관한 사례'), '활성이 먼저');
  assert.ok(!/<form|<button/.test(html), '읽기 전용이라 입력·버튼이 없다');
});

test('renderTransformSheetPage: 사례집 사례의 그림과 링크를 보여 주고, id만 있어도 링크는 나온다', () => {
  const sheet = {schemaVersion: 4, episodeId: 'EP-T', format: 'LONGFORM', topic: '시험', rows: [{key: 'thumbnail', competitor: {text: 'c'}, ours: {text: 'o'}, why: 'w', craft: [{source: 'case:page-a', took: '답 비우기', appliedTo: ['thumb:A']}]}]};
  const withCases = renderTransformSheetPage(sheet, null, [], {cases: [mkCase('page-a')]});
  assert.ok(withCases.includes('/transform-images/packaging-cases/page-a-seen.png'));
  assert.ok(withCases.includes('/packaging-cases#page-a'));
  const noCases = renderTransformSheetPage(sheet, null, []);
  assert.ok(noCases.includes('/packaging-cases#page-a'));
  assert.ok(!noCases.includes('/transform-images/packaging-cases/'));
});
