import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {existsSync, readFileSync} from 'node:fs';
import {dirname, join} from 'node:path';
import test from 'node:test';
import {fileURLToPath} from 'node:url';

const projectDir = dirname(dirname(dirname(fileURLToPath(import.meta.url))));

test('00-autonomous-briefing.md 존재 및 핵심 0~6절 포함 확인', () => {
  const filePath = join(projectDir, 'knowledge', 'playbooks', 'briefing', '00-autonomous-briefing.md');
  assert.ok(existsSync(filePath), '00-autonomous-briefing.md 파일이 존재해야 합니다');
  const content = readFileSync(filePath, 'utf8');
  assert.ok(content.includes('## 0.'), '0절 포함');
  assert.ok(content.includes('## 1.'), '1절 포함');
  assert.ok(content.includes('## 2.'), '2절 포함');
  assert.ok(content.includes('## 3.'), '3절 포함');
  assert.ok(content.includes('## 4.'), '4절 포함');
  assert.ok(content.includes('## 5.'), '5절 포함');
  assert.ok(content.includes('## 6.'), '6절 포함');
});

test('AGENTS.md, .claude/ 및 .agents/ 참조 문서, growth-rules.mjs 4곳 모두 00-autonomous-briefing.md를 단일 원본으로 참조', () => {
  const agentsMd = readFileSync(join(projectDir, 'AGENTS.md'), 'utf8');
  const claudeRef = readFileSync(join(projectDir, '.claude', 'skills', 'episode-planning', 'references', '00-unblock-and-weekly.md'), 'utf8');
  const agentsRef = readFileSync(join(projectDir, '.agents', 'skills', 'episode-planning', 'references', '00-unblock-and-weekly.md'), 'utf8');
  const growthRules = readFileSync(join(projectDir, 'scripts', 'growth-rules.mjs'), 'utf8');

  assert.ok(agentsMd.includes('00-autonomous-briefing.md'), 'AGENTS.md 참조 누락');
  assert.ok(claudeRef.includes('00-autonomous-briefing.md'), '.claude/ 참조 누락');
  assert.ok(agentsRef.includes('00-autonomous-briefing.md'), '.agents/ 참조 누락');
  assert.ok(growthRules.includes('00-autonomous-briefing.md'), 'scripts/growth-rules.mjs 참조 누락');
});

test('package.json에 briefing 스크립트가 있고 node scripts/briefing.mjs --no-sync가 정상 종료하며 6,000자 미만', () => {
  const pkg = JSON.parse(readFileSync(join(projectDir, 'package.json'), 'utf8'));
  assert.ok(pkg.scripts?.briefing, 'package.json briefing 스크립트 등록 필요');

  const stdout = execFileSync(process.execPath, [join(projectDir, 'scripts', 'briefing.mjs'), '--no-sync'], {
    cwd: projectDir,
    encoding: 'utf8',
    timeout: 30000, // allow-literal: 브리핑 실행 타임아웃 30초
  });
  assert.ok(stdout.length > 0, '브리핑 출력이 비어 있지 않음');
  assert.ok(stdout.length < 6000, `브리핑 출력이 6,000자 미만이어야 함 (실제: ${stdout.length}자)`); // allow-literal: 브리핑 컨텍스트 상한선
  assert.ok(stdout.includes('업데이트를 요약해서 먼저 보고드립니다.'), '시작 문구 일치');
});

test('.agents/ 00-unblock-and-weekly.md에 구 강제 문구(Gemini 환경: 동일)가 남아 있지 않음', () => {
  const agentsRef = readFileSync(join(projectDir, '.agents', 'skills', 'episode-planning', 'references', '00-unblock-and-weekly.md'), 'utf8');
  assert.ok(!agentsRef.includes('Gemini 환경: 동일'), '구 강제 문구 남아있음');
});
