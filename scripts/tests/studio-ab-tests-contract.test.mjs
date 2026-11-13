import assert from 'node:assert/strict';
import {existsSync, readFileSync} from 'node:fs';
import {dirname, join} from 'node:path';
import test from 'node:test';
import {fileURLToPath} from 'node:url';

// 실제 data/youtube/studio-ab-tests.json의 칸 이름과 값 모양을 다시 확인한다(2026-11-13). 수집 전인 PC에서는 파일이 없으니 건너뛴다.
const file = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'data', 'youtube', 'studio-ab-tests.json');

test('실제 studio-ab-tests.json: 영상 ID, 상태, 처음·마지막 본 때 모양이 기준선 코드가 읽는 것과 같다', {skip: !existsSync(file) && '아직 수집 전(node scripts/studio-ab-tests.mjs)'}, () => {
  const store = JSON.parse(readFileSync(file, 'utf8'));
  const entries = Object.entries(store.videos || {});
  assert.ok(entries.length > 0);
  for (const [id, v] of entries) {
    assert.match(id, /^[A-Za-z0-9_-]{11}$/);
    assert.ok(['running', 'completed'].includes(v.state), `${id}: 상태가 이상하다(${v.state})`);
    assert.ok(Number.isFinite(Date.parse(v.firstSeenAt)) && Number.isFinite(Date.parse(v.lastSeenAt)), `${id}: 본 때가 날짜가 아니다`);
    if (v.kind !== undefined) assert.ok(Array.isArray(v.kind) && v.kind.every((k) => ['title', 'thumbnail'].includes(k)), `${id}: 종류가 이상하다`);
  }
});
