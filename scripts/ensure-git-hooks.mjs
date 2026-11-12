#!/usr/bin/env node
// git이 저장소의 .githooks 폴더(커밋 전 자동 검사)를 쓰게 맞춘다 (2026-11-12).
// 이 설정은 PC마다 따로라서 git pull만으로는 다른 PC에 전달되지 않는다. 그래서 사람이 따로 하지 않아도
// 시작 브리핑(Claude 훅, `npm run briefing:sync`), 매일 루프, `npm install`이 이 함수를 부른다.
//   손으로: node scripts/ensure-git-hooks.mjs

import {execFileSync} from 'node:child_process';
import {dirname} from 'node:path';
import {fileURLToPath} from 'node:url';

const projectDir = dirname(dirname(fileURLToPath(import.meta.url)));
export const HOOKS_PATH = '.githooks';

/** @returns {'already' | 'set' | string} 이미 맞음 / 새로 맞춤 / 실패 이유 */
export function ensureGitHooks(dir = projectDir) {
  try {
    let current = '';
    try {
      current = execFileSync('git', ['config', '--get', 'core.hooksPath'], {cwd: dir, encoding: 'utf8'}).trim();
    } catch { /* 설정 없음 */ }
    if (current === HOOKS_PATH) return 'already';
    execFileSync('git', ['config', 'core.hooksPath', HOOKS_PATH], {cwd: dir});
    return 'set';
  } catch (err) {
    return `실패: ${err.message}`;
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const result = ensureGitHooks();
  console.log(result === 'already' ? '커밋 전 자동 검사: 이미 켜져 있음' : result === 'set' ? '커밋 전 자동 검사: 켰음 (.githooks)' : result);
}
