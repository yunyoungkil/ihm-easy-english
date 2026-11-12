// 데이터 소비 지도(knowledge/data-consumption-map.md)가 실제와 맞는지 확인한다(2026-11-12).
// 원칙: 모은 데이터는 기획·제작·판정 중 한 곳에 실제로 들어가야 한다. 대시보드에 보이기만 하는 것은 소비가 아니다.
// 1) data/youtube 아래 파일·폴더는 모두 지도에 한 줄씩 있어야 한다(새로 만들고 지도에 안 적으면 실패).
// 2) "쓰는 곳" 칸에 적은 파일은 실제로 있어야 하고, 등급이 "없음"이 아니면 그중 하나 이상이 그 데이터 이름을 실제로 담고 있어야 한다.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, readdirSync, existsSync} from 'node:fs';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';

const projectDir = dirname(dirname(dirname(fileURLToPath(import.meta.url))));
const mapPath = join(projectDir, 'knowledge', 'data-consumption-map.md');
const dataDir = join(projectDir, 'data', 'youtube');
const GRADES = ['자동 결정', '기획 입력(지시)', '표시만', '운영', '없음'];

export function parseMapRows(markdown) {
  const section = markdown.split(/^## 지도\s*$/m)[1]?.split(/^## /m)[0] || '';
  return section.split(/\r?\n/)
    .filter((line) => /^\|\s*`[^`]+`\s*\|/.test(line))
    .map((line) => {
      const cells = line.split('|').slice(1, -1).map((c) => c.trim());
      const name = cells[0].match(/`([^`]+)`/)[1];
      const consumers = [...cells[2].matchAll(/`([^`]+)`/g)].map((m) => m[1]).filter((p) => /[/.]/.test(p) && !p.startsWith('/api/'));
      return {name, key: name.replace(/\/$/, ''), consumers, grade: cells[3]};
    });
}

const rows = parseMapRows(readFileSync(mapPath, 'utf8'));

test('지도에서 데이터 줄을 읽어 낸다', () => {
  assert.ok(rows.length >= 20, `지도에서 읽은 줄이 ${rows.length}개뿐 — 표 형식이 바뀌었을 수 있다`);
  for (const row of rows) assert.ok(GRADES.includes(row.grade), `${row.name}의 등급 "${row.grade}"가 정한 다섯 가지가 아니다`);
});

test('data/youtube 아래 모든 파일·폴더가 데이터 소비 지도에 있다', () => {
  const listed = new Set(rows.map((r) => r.key));
  const missing = readdirSync(dataDir).filter((name) => !listed.has(name));
  assert.deepEqual(missing, [], '지도(knowledge/data-consumption-map.md)에 없는 데이터 — 어디에 쓰이는지 한 줄 적거나, 쓸 곳이 없으면 모으지 않는다');
});

test('지도의 "쓰는 곳"은 실제로 있고, 그 데이터를 실제로 읽는다', () => {
  const problems = [];
  for (const row of rows) {
    const absent = row.consumers.filter((p) => !existsSync(join(projectDir, p)));
    if (absent.length) problems.push(`${row.name}: 없는 파일 ${absent.join(', ')}`);
    if (row.grade === '없음') continue;
    if (!row.consumers.length) { problems.push(`${row.name}: 등급이 "${row.grade}"인데 쓰는 곳이 비어 있다`); continue; }
    const reads = row.consumers.some((p) => existsSync(join(projectDir, p)) && readFileSync(join(projectDir, p), 'utf8').includes(row.key));
    if (!reads) problems.push(`${row.name}: 쓰는 곳으로 적은 ${row.consumers.join(', ')} 어디에도 "${row.key}"가 없다`);
  }
  assert.deepEqual(problems, []);
});
