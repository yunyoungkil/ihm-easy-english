import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {mkdtempSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pendingAgentCalls, checkAgentLimit} from '../agent-concurrency-guard.mjs';

const use = (...ids) => JSON.stringify({message: {content: ids.map((id) => ({type: 'tool_use', name: 'Agent', id}))}});
const res = (id) => JSON.stringify({message: {content: [{type: 'tool_result', tool_use_id: id}]}});

test('결과가 안 온 Agent 호출만 센다', () => {
  assert.deepEqual(pendingAgentCalls([use('a', 'b'), res('a')]), ['b']);
});

test('다른 에이전트가 2명 돌고 있으면 막는다', () => {
  assert.ok(checkAgentLimit([use('a', 'b', 'c')], 'c'));
});

test('다른 에이전트가 1명이면 통과한다', () => {
  assert.equal(checkAgentLimit([use('a', 'b')], 'b'), null);
});

test('끝난 에이전트는 세지 않는다', () => {
  assert.equal(checkAgentLimit([use('a', 'b'), res('a'), res('b'), use('c')], 'c'), null);
});

test('훅으로 실행하면 막을 때 종료 코드 2를 낸다', () => {
  const dir = mkdtempSync(join(tmpdir(), 'agent-guard-'));
  const file = join(dir, 't.jsonl');
  writeFileSync(file, [use('a', 'b', 'c')].join('\n'));
  const run = (id) => spawnSync('node', ['scripts/agent-concurrency-guard.mjs'], {
    input: JSON.stringify({tool_name: 'Agent', tool_use_id: id, transcript_path: file}), encoding: 'utf8',
  });
  assert.equal(run('c').status, 2);
  const other = spawnSync('node', ['scripts/agent-concurrency-guard.mjs'], {
    input: JSON.stringify({tool_name: 'Read', transcript_path: file}), encoding: 'utf8',
  });
  assert.equal(other.status, 0);
});
