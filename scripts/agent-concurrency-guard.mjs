// PreToolUse 훅(matcher: Agent): 서브에이전트를 동시에 3명 이상 돌리지 못하게 막는다.
// 근거: 2026-11-15 Opus 점검 4명이 약 100만 토큰, Opus 구현 3명 동시 실행이 5시간 한도에 걸려 멈췄다.
// 문서 규칙("동시 2명 이하", CLAUDE.md)만으로는 지켜지지 않아 코드로 막는다.
// 센 방법: 대화 기록(transcript)에서 아직 결과(tool_result)가 안 온 Agent 호출 수.
// 한계: 백그라운드로 띄운 에이전트는 시작 직후 결과가 와서 세지 못한다.
import { readFileSync } from 'node:fs';

export const MAX_CONCURRENT_AGENTS = 2;

/** transcript 줄들에서 결과가 아직 없는 Agent 호출 id 목록을 돌려준다. */
export function pendingAgentCalls(lines) {
  const started = new Set();
  const done = new Set();
  for (const line of lines) {
    let o;
    try { o = JSON.parse(line); } catch { continue; }
    const c = o?.message?.content;
    if (!Array.isArray(c)) continue;
    for (const b of c) {
      if (b.type === 'tool_use' && b.name === 'Agent') started.add(b.id);
      if (b.type === 'tool_result' && b.tool_use_id) done.add(b.tool_use_id);
    }
  }
  return [...started].filter((id) => !done.has(id));
}

/** 이 호출을 막아야 하면 이유 문장을, 아니면 null을 돌려준다. */
export function checkAgentLimit(lines, selfId, max = MAX_CONCURRENT_AGENTS) {
  const others = pendingAgentCalls(lines).filter((id) => id !== selfId);
  if (others.length >= max) {
    return `서브에이전트가 이미 ${others.length}명 실행 중이다(동시 ${max}명 이하 규칙, CLAUDE.md). 앞 에이전트가 끝난 결과를 보고 다음을 정하거나, 사용자에게 예상 토큰을 알리고 허락을 받은 뒤 진행한다.`;
  }
  return null;
}

async function main() {
  let raw = '';
  for await (const chunk of process.stdin) raw += chunk;
  let input;
  try { input = JSON.parse(raw); } catch { return; }
  if (input.tool_name !== 'Agent' || !input.transcript_path) return;
  let lines;
  try { lines = readFileSync(input.transcript_path, 'utf8').split('\n').filter(Boolean); } catch { return; }
  const reason = checkAgentLimit(lines, input.tool_use_id);
  if (reason) {
    process.stderr.write(reason + '\n');
    process.exit(2);
  }
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/').split('/').pop())) {
  main();
}
