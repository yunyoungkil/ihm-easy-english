// 인수인계 장치(scripts/handoff.mjs): 최신 파일 찾기, 브리핑 한 줄, 시작 훅 문맥에 들어가는지, 저장소에 실제 파일이 있는지.
import assert from 'node:assert/strict';
import {existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {dirname, join} from 'node:path';
import test from 'node:test';
import {fileURLToPath} from 'node:url';
import {buildBriefingContext} from '../growth-rules.mjs';
import {handoffLine, latestHandoff} from '../handoff.mjs';

const projectDir = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

test('latestHandoff: 날짜 이름 파일 중 가장 최근 것을 고르고, README나 폴더가 없으면 null', () => {
  const root = mkdtempSync(join(tmpdir(), 'handoff-'));
  assert.equal(latestHandoff(root), null);
  mkdirSync(join(root, 'knowledge', 'handoff'), {recursive: true});
  writeFileSync(join(root, 'knowledge', 'handoff', 'README.md'), 'x');
  assert.equal(latestHandoff(root), null, 'README만 있으면 인수인계 파일이 아니다');
  for (const f of ['2026-11-12.md', '2026-11-13.md', '2026-11-13-pc2.md', '2026-10-30.md']) writeFileSync(join(root, 'knowledge', 'handoff', f), 'x');
  const h = latestHandoff(root);
  assert.equal(h.date, '2026-11-13');
  assert.deepEqual([...h.files].sort(), ['knowledge/handoff/2026-11-13-pc2.md', 'knowledge/handoff/2026-11-13.md'], '같은 날 다른 PC 파일(접미사)도 모두 인식한다');
  assert.ok(handoffLine(h, new Date('2026-11-13T00:00:00Z')).includes('2026-11-13-pc2.md'), '브리핑 줄에 같은 날 파일이 모두 나온다');
});

test('handoffLine: 며칠 전인지와 파일 이름, 먼저 읽으라는 말을 담는다', () => {
  const h = {file: 'knowledge/handoff/2026-11-13.md', date: '2026-11-13', bytes: 10};
  assert.ok(handoffLine(h, new Date('2026-11-13T05:00:00Z')).includes('(오늘, 2026-11-13)'));
  const line = handoffLine(h, new Date('2026-11-16T05:00:00Z'));
  assert.ok(line.includes('3일 전') && line.includes('knowledge/handoff/2026-11-13.md') && line.includes('먼저 읽어'), line);
  assert.equal(handoffLine(null), null);
});

test('시작 브리핑 문맥: 인수인계 줄이 점검 결과가 있을 때·없을 때·briefing 재료가 있을 때 모두 안내문 바로 뒤에 들어간다', () => {
  const note = handoffLine({file: 'knowledge/handoff/2026-11-13.md', date: '2026-11-13', bytes: 1}, new Date('2026-11-13T00:00:00Z'));
  const without = buildBriefingContext(null, []);
  assert.ok(!without.includes('최근 인수인계'), '줄을 안 넘기면 안 들어간다');
  for (const check of [null, {generatedFor: '2026-11-13'}, {briefing: {data: {}}}]) {
    const lines = buildBriefingContext(check, [], note).split('\n');
    assert.equal(lines.findIndex((l) => l.includes('최근 인수인계')), 1, `안내문 바로 다음 줄이어야 한다(${JSON.stringify(check)})`);
  }
});

test('저장소: 인수인계 폴더에 README와 오늘 날짜 파일이 있고, 훅·규칙 문서가 그 폴더를 가리킨다', () => {
  assert.ok(existsSync(join(projectDir, 'knowledge', 'handoff', 'README.md')));
  const latest = latestHandoff(projectDir);
  assert.ok(latest && latest.bytes > 0, '인수인계 파일이 하나도 없다');
  assert.ok(readFileSync(join(projectDir, 'scripts', 'session-briefing-hook.mjs'), 'utf8').includes('latestHandoff'), '시작 훅이 인수인계 파일을 안 넘긴다');
  for (const doc of ['AGENTS.md', 'CLAUDE.md']) assert.ok(readFileSync(join(projectDir, doc), 'utf8').includes('knowledge/handoff/'), `${doc}에 인수인계 폴더 규칙이 없다`);
  const claude = readFileSync(join(projectDir, 'CLAUDE.md'), 'utf8');
  assert.ok(claude.includes('opus-expert') && claude.includes('먼저 묻는다'), 'CLAUDE.md에 Opus에게 먼저 묻는 규칙이 없다');
  assert.ok(readFileSync(join(projectDir, '.claude', 'agents', 'opus-expert.md'), 'utf8').includes('model:'), 'opus-expert 정의가 없다');
});

test('LATEST.md 요약이 있으면 브리핑 줄이 그것만 읽게 하고 날짜 파일은 grep으로만 읽게 한다(2026-11-16 토큰 절약)', () => {
  const root = mkdtempSync(join(tmpdir(), 'handoff-latest-'));
  mkdirSync(join(root, 'knowledge', 'handoff'), {recursive: true});
  writeFileSync(join(root, 'knowledge', 'handoff', '2026-11-14.md'), 'x');
  assert.equal(latestHandoff(root).summary, null, '요약이 없으면 null');
  writeFileSync(join(root, 'knowledge', 'handoff', 'LATEST.md'), 'y');
  const h = latestHandoff(root);
  assert.equal(h.summary, 'knowledge/handoff/LATEST.md');
  assert.equal(h.date, '2026-11-14', 'LATEST.md는 날짜 파일로 세지 않는다');
  const line = handoffLine(h, new Date('2026-11-16T00:00:00Z'));
  assert.ok(line.includes('knowledge/handoff/LATEST.md') && line.includes('grep'), line);
  assert.ok(!line.includes('먼저 읽어'), '통째로 읽으라는 말이 없다');
});
