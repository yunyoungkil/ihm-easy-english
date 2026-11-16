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
