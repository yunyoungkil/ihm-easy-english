import assert from 'node:assert/strict';
import {existsSync, readFileSync} from 'node:fs';
import {dirname, join} from 'node:path';
import test from 'node:test';
import {fileURLToPath} from 'node:url';

// 실제 data/youtube/studio-first7d.json의 칸 이름과 값 모양을 다시 확인한다(2026-11-13). 수집 전인 PC에서는 파일이 없으니 건너뛴다.
const file = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'data', 'youtube', 'studio-first7d.json');

test('실제 studio-first7d.json: 기록의 칸 이름·값 모양이 기준선 코드가 읽는 것과 같다', { skip: !existsSync(file) && '아직 수집 전(npm run studio-first7d)' }, () => {
  const store = JSON.parse(readFileSync(file, 'utf8'));
  const entries = Object.entries(store.videos || {});
  assert.ok(entries.length > 0);
  for (const [id, r] of entries) {
    assert.match(id, /^[A-Za-z0-9_-]{11}$/);
    for (const k of ['startDate', 'endDate', 'impressions', 'clicks', 'ctrPercent', 'ctrMethod', 'viewsSum', 'apiViews7d', 'windowCheck', 'missingDays', 'usable', 'days']) assert.ok(k in r, `${id}: ${k} 칸이 없다`);
    assert.equal(typeof r.usable, 'boolean');
    assert.ok(Number.isInteger(r.impressions) && r.impressions >= 0, `${id}: 노출수가 정수가 아니다`);
    assert.ok(Number.isInteger(r.clicks) && r.clicks >= 0 && r.clicks <= r.impressions, `${id}: 클릭 수가 노출보다 많거나 정수가 아니다`);
    if (r.impressions > 0 && r.ctrMethod === 'exact-clicks') assert.equal(r.ctrPercent, Number(((r.clicks / r.impressions) * 100).toFixed(2)), `${id}: 클릭률이 클릭 수 ÷ 노출과 다르다`);
    if (r.impressions === 0) assert.equal(r.ctrPercent, null, `${id}: 노출 0이면 클릭률은 null이어야 한다(0%로 적지 않는다)`);
    // 빠진 날(활동 없는 날)을 0으로 보려면 날짜 표 조회수 합이 API 첫 7일 조회수와 정확히 같아야 한다
    if (r.usable && r.missingDays.length) assert.equal(r.viewsSum, r.apiViews7d, `${id}: 빠진 날이 있는데 조회수 합이 API와 달라도 쓸 수 있음으로 표시됐다`);
    assert.ok(['match', 'ambiguous', 'shifted', 'no-api'].includes(r.windowCheck.status), `${id}: 창 확인 값이 이상하다`);
  }
});
