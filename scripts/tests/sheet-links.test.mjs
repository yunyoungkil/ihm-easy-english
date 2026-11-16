// 비교 시트가 어떤 경쟁 영상 리포트에 연결돼 있는지 표시하는 규칙 시험(2026-11-16 사용자: 시트를 만들었는데 목록에서 찾기 힘들다).
import test from 'node:test';
import assert from 'node:assert/strict';
import {sheetLinksByVideo} from '../transform-sheet.mjs';
import {renderReportIndex, sheetBadgeHtml} from '../outlier-report-view.mjs';

const sheets = [
  {sourceVideoId: 'AAAAAAAAAAA', topic: '소재 가', status: 'draft', borrowed: [{fromVideoId: 'BBBBBBBBBBB'}, {fromVideoId: 'AAAAAAAAAAA'}, {fromVideoId: 'BBBBBBBBBBB'}]},
  {sourceVideoId: 'CCCCCCCCCCC', topic: '소재 나', status: 'approved', borrowed: [{fromVideoId: 'AAAAAAAAAAA'}]},
];

test('원본과 가져온 출처가 영상 ID별로 모이고, 같은 시트에서 중복되거나 원본이 출처로 또 잡히지 않는다', () => {
  const m = sheetLinksByVideo(sheets);
  assert.deepEqual(m.get('AAAAAAAAAAA').map((l) => [l.sheetId, l.role]), [['AAAAAAAAAAA', 'source'], ['CCCCCCCCCCC', 'borrowed']]);
  assert.deepEqual(m.get('BBBBBBBBBBB').map((l) => [l.sheetId, l.role]), [['AAAAAAAAAAA', 'borrowed']]);
  assert.equal(m.get('DDDDDDDDDDD'), undefined);
});

test('시트에 연결이 없으면 배지가 비어 있고, 있으면 역할과 상태가 글자로 나온다', () => {
  assert.equal(sheetBadgeHtml([]), '');
  assert.equal(sheetBadgeHtml(undefined), '');
  const html = sheetBadgeHtml(sheetLinksByVideo(sheets).get('BBBBBBBBBBB'));
  assert.ok(html.includes('비교 시트') && html.includes('가져온 출처') && html.includes('초안'));
});

test('리포트 목록은 시트에 쓰인 영상을 맨 위로 올리고 개수를 알려 준다', () => {
  const rep = (videoId, ratio) => ({videoId, outlierRatio: ratio, meta: {title: videoId, channelTitle: 'c'}, analysis: {}, frames: [], quoteCheck: {}});
  const html = renderReportIndex([rep('DDDDDDDDDDD', 500), rep('BBBBBBBBBBB', 10)], {links: sheetLinksByVideo(sheets)});
  assert.ok(html.indexOf('BBBBBBBBBBB') < html.indexOf('DDDDDDDDDDD'), '시트에 쓰인 영상이 배수가 낮아도 먼저 나온다');
  assert.ok(html.includes('비교 시트에 쓰인 영상 1편'));
});

test('비교 시트 화면 연출 행은 경쟁 영상의 저장된 캡처를 초 순서로 보여 준다(컷 감지가 실패한 영상도, 2026-11-16)', async () => {
  const {renderTransformSheetPage} = await import('../outlier-report-view.mjs');
  const sheet = {schemaVersion: 3, sourceVideoId: 'AAAAAAAAAAA', topic: '소재', status: 'draft', format: 'SHORTS', identityShare: {ours: 50, competitor: 50, reason: 'r'}, borrowed: [], rejected: [], pending: [], testVariables: [], glossary: [],
    rows: [{key: 'visual', competitor: {text: '경쟁 화면', images: []}, ours: {text: '우리 화면', images: [], cutPlan: {durationSeconds: 10, cuts: [{t: 0, template: 'hook', image: 'images/AAAAAAAAAAA/cuts/cut-00.png'}]}}, why: '이유'}]};
  const refReports = [{videoId: 'BBBBBBBBBBB', label: '채널 · 제목', frames: [{t: 0, file: '0.jpg'}, {t: 4, file: '4.jpg'}]}];
  const html = renderTransformSheetPage(sheet, {videoId: 'AAAAAAAAAAA', pacing: {count: 0, times: []}, meta: {}}, [], {refReports});
  assert.ok(html.includes('경쟁 화면 캡처 — 채널 · 제목 · 2장'));
  assert.ok(html.includes('/outlier-frames/BBBBBBBBBBB/0.jpg') && html.includes('/outlier-frames/BBBBBBBBBBB/4.jpg'));
  assert.ok(!renderTransformSheetPage(sheet, null, [], {}).includes('경쟁 화면 캡처'), '캡처가 없으면 줄을 만들지 않는다');
});

test('행 출처(origin)를 쓴 시트는 비율 칸 없이도 통과하고, 출처나 이유가 빠지면 문제로 알린다(2026-11-16)', async () => {
  const {validateSheet, sheetOrigins, sheetImageExists} = await import('../transform-sheet.mjs');
  const {readFileSync} = await import('node:fs');
  const sheet = JSON.parse(readFileSync(new URL('../../data/youtube/transform-sheets/w8g6-e9yLP4.json', import.meta.url), 'utf8'));
  assert.equal(sheet.identityShare, undefined, '사람이 정한 비율 칸은 쓰지 않는다');
  assert.deepEqual(validateSheet(sheet, {imageExists: sheetImageExists}), []);
  const o = sheetOrigins(sheet);
  assert.equal(o.total, 8);
  assert.equal(o.competitor + o.mixed + o.ours, 8);
  const noOrigin = JSON.parse(JSON.stringify(sheet)); delete noOrigin.rows[2].origin;
  assert.ok(validateSheet(noOrigin, {imageExists: sheetImageExists}).some((p) => p.includes('출처(origin)')));
  const noReason = JSON.parse(JSON.stringify(sheet)); noReason.rows[3].originReason = '';
  assert.ok(validateSheet(noReason, {imageExists: sheetImageExists}).some((p) => p.includes('originReason')));
});

test('행 출처가 없는 예전 시트는 예전 비율 칸을 그대로 검사한다', async () => {
  const {validateSheet, sheetImageExists} = await import('../transform-sheet.mjs');
  const {readFileSync} = await import('node:fs');
  const old = JSON.parse(readFileSync(new URL('../../data/youtube/transform-sheets/SbQVBQoRciA.json', import.meta.url), 'utf8'));
  assert.deepEqual(validateSheet(old, {imageExists: sheetImageExists}).filter((p) => p.includes('정체성')), []);
  delete old.identityShare;
  assert.ok(validateSheet(old, {imageExists: sheetImageExists}).some((p) => p.includes('정체성')));
});

test('가져온 것은 어디에 적용했는지(appliedTo)를 적어야 하고, 없는 컷·시안·제목을 가리키면 문제로 알린다(2026-11-16)', async () => {
  const {validateSheet, sheetImageExists} = await import('../transform-sheet.mjs');
  const {readFileSync} = await import('node:fs');
  const sheet = JSON.parse(readFileSync(new URL('../../data/youtube/transform-sheets/w8g6-e9yLP4.json', import.meta.url), 'utf8'));
  assert.deepEqual(validateSheet(sheet, {imageExists: sheetImageExists}), []);
  const none = JSON.parse(JSON.stringify(sheet)); none.borrowed[0].appliedTo = [];
  assert.ok(validateSheet(none, {imageExists: sheetImageExists}).some((p) => p.includes('appliedTo')));
  const badCut = JSON.parse(JSON.stringify(sheet)); badCut.borrowed[0].appliedTo = ['cut:99'];
  assert.ok(validateSheet(badCut, {imageExists: sheetImageExists}).some((p) => p.includes('컷 99번은 없다')));
  const badThumb = JSON.parse(JSON.stringify(sheet)); badThumb.borrowed[1].appliedTo = ['thumb:Z'];
  assert.ok(validateSheet(badThumb, {imageExists: sheetImageExists}).some((p) => p.includes('썸네일 시안 Z가 없다')));
  const badTitle = JSON.parse(JSON.stringify(sheet)); badTitle.sourceApplied[0].appliedTo = ['title:9'];
  assert.ok(validateSheet(badTitle, {imageExists: sheetImageExists}).some((p) => p.includes('제목 후보 9번은 없다')));
});

test('비교 시트는 경쟁 영상별 화면 변화 막대를 그리고, 컷 감지가 0번이어도 변화 속도와 간격 변동을 보여 준다(2026-11-16)', async () => {
  const {renderTransformSheetPage} = await import('../outlier-report-view.mjs');
  const sheet = {schemaVersion: 3, sourceVideoId: 'AAAAAAAAAAA', topic: '소재', status: 'draft', format: 'SHORTS', borrowed: [], rejected: [], pending: [], testVariables: [], glossary: [],
    rows: [{key: 'visual', competitor: {text: 'c', images: []}, ours: {text: 'o', images: [], cutPlan: {durationSeconds: 10, cuts: [{t: 0, template: 'hook', image: 'images/AAAAAAAAAAA/cuts/cut-00.png'}]}}, why: 'w'}]};
  const refReports = [{videoId: 'BBBBBBBBBBB', label: '채널 · 제목', duration: 20, cutCount: 0, moments: [0, 4, 8, 12], frames: [{t: 0, file: '0.jpg'}]}];
  const html = renderTransformSheetPage(sheet, null, [], {refReports});
  assert.ok(html.includes('경쟁 화면 변화 — 채널 · 제목: 4번 (1분에 12번'), '4번/20초 = 1분에 12번');
  assert.ok(html.includes('간격 변동 0') && html.includes('컷 감지 0번'));
  const noFrames = renderTransformSheetPage(sheet, null, [], {refReports: [{...refReports[0], frames: []}]});
  assert.ok(!noFrames.includes('경쟁 화면 변화'), '캡처가 없는(적용 안 한) 참고 영상은 막대를 만들지 않는다');
});

test('쇼츠 2안은 위 훅 띠·아래 정보 띠·움직임 메모가 있어야 하고, 낭독이 컷 길이를 넘으면 음성 예산 문제로 알린다(2026-11-16)', async () => {
  const {validateSheet, sheetImageExists, voiceBudget, plan2Problems} = await import('../transform-sheet.mjs');
  const {readFileSync} = await import('node:fs');
  const sheet = JSON.parse(readFileSync(new URL('../../data/youtube/transform-sheets/w8g6-e9yLP4.json', import.meta.url), 'utf8'));
  assert.deepEqual(plan2Problems(sheet), []);
  assert.deepEqual(validateSheet(sheet, {imageExists: sheetImageExists}), []);
  const clone = () => JSON.parse(JSON.stringify(sheet));
  const noPlan = clone(); delete noPlan.rows.find((r) => r.key === 'visual').ours.cutPlan2;
  assert.ok(plan2Problems(noPlan).some((p) => p.includes('2안(cutPlan2)이 있어야')));
  const noBottom = clone(); noBottom.rows.find((r) => r.key === 'visual').ours.cutPlan2.cuts[1].bottom = {};
  assert.ok(plan2Problems(noBottom).some((p) => p.includes('아래 정보 띠')));
  const noHook = clone(); noHook.rows.find((r) => r.key === 'visual').ours.cutPlan2.hook = [];
  assert.ok(plan2Problems(noHook).some((p) => p.includes('위 훅 띠')));
  const longHook = clone(); longHook.rows.find((r) => r.key === 'visual').ours.cutPlan2.hook = ['이 문장은 한 줄에 들어가기에는 너무 깁니다', '짧게'];
  assert.ok(plan2Problems(longHook).some((p) => p.includes('모바일에서 한 줄에')));
  const tooLong = clone(); tooLong.rows.find((r) => r.key === 'visual').ours.cutPlan2.cuts[0].narration = '스트레스 영어로는 도대체 몇 마디로 읽는 것이 맞는지 한번 같이 생각해 볼까요';
  assert.ok(plan2Problems(tooLong).some((p) => p.includes('음성 예산')));
  const noMotion = clone(); delete noMotion.rows.find((r) => r.key === 'visual').ours.cutPlan2.cuts[2].motion;
  assert.ok(plan2Problems(noMotion).some((p) => p.includes('움직임 메모')));
  // 음성 예산 계산식: 한국어 음절 ÷ 4.3 + 영어 0.9초 + 창 + 여유 0.35
  assert.equal(Math.round(voiceBudget({narration: '따라 하세요.', voiceEn: ['stress'], window: 1.0}) * 100) / 100, 3.41);
});
