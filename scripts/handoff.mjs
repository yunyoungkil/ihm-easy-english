// 인수인계 파일(knowledge/handoff/YYYY-MM-DD.md) 찾기. 2026-11-13 사용자 결정: 대화의 맥락·핵심·사용자 말의 요점을
// 다른 PC의 Claude도 바로 알 수 있게 한다. 새 대화 시작 훅(scripts/session-briefing-hook.mjs)이 최신 파일 이름을 넘긴다.
import {existsSync, readdirSync, statSync} from 'node:fs';
import {join} from 'node:path';

export const HANDOFF_DIR = join('knowledge', 'handoff');
const DATE_FILE = /^(\d{4}-\d{2}-\d{2})(?:-[\w-]+)?\.md$/;

const toSlash = (p) => p.split('\\').join('/');

/** 날짜 이름의 가장 최근 인수인계 파일(같은 날 여러 PC가 쓴 `날짜-pc2.md` 같은 파일은 모두). 없으면 null. */
export function latestHandoff(projectDir) {
  const dir = join(projectDir, HANDOFF_DIR);
  if (!existsSync(dir)) return null;
  const files = readdirSync(dir).filter((f) => DATE_FILE.test(f)).sort();
  if (!files.length) return null;
  const date = files.map((f) => f.match(DATE_FILE)[1]).sort().at(-1);
  const sameDay = files.filter((f) => f.match(DATE_FILE)[1] === date);
  const rel = (name) => toSlash(join(HANDOFF_DIR, name));
  return {file: rel(sameDay[0]), files: sameDay.map(rel), date, bytes: sameDay.reduce((n, name) => n + statSync(join(dir, name)).size, 0)};
}

/** 브리핑 맨 앞에 붙일 한 줄. 인수인계 파일이 없으면 null. */
export function handoffLine(handoff, now = new Date()) {
  if (!handoff) return null;
  const age = Math.floor((now - new Date(`${handoff.date}T00:00:00Z`)) / 86400000); // allow-literal: 하루(ms)
  const when = age <= 0 ? '오늘' : `${age}일 전`;
  return `최근 인수인계(${when}, ${handoff.date}): ${(handoff.files || [handoff.file]).join(', ')} — 브리핑 전에 이 파일을 먼저 읽어 이전 대화·다른 PC의 맥락, 사용자 말의 요점, 결정, 남은 일을 이어받는다.`;
}
