#!/usr/bin/env node
// 커밋 직전 자동 검사 (2026-11-12). 어느 AI가 커밋하든, 사람이 커밋하든 같은 검사를 통과해야 저장된다.
// 연결: .githooks/pre-commit → `--pre-commit`, .githooks/commit-msg → `--commit-msg <파일>`.
// git이 .githooks를 쓰게 하는 설정은 scripts/ensure-git-hooks.mjs가 맞춘다(브리핑·매일 루프·npm install 때 자동).
//
// 왜 만들었나 (knowledge/logs/2026-11.md 2026-11-12 "커밋 전 자동 검사" 절):
//   - 화면 코드와 데이터 파일에 성과 숫자를 손으로 적었다(벤치마킹 탭 '1.8x', 경쟁 채널 "7일 성과 1.8배").
//   - 값이 없을 때 그럴듯한 숫자로 대신했다(medianViews || 100 → 조회수가 늘 0인데 배수가 나옴).
//   - 필수 검사 대신 더 약한 검사를 돌리고 "통과"라고 적었다. 테스트를 0개로 읽고도 통과로 처리했다.
//   - 다른 모델이 만든 커밋에 `Claude <noreply@anthropic.com>`으로 서명했다.
// 규칙 글(AGENTS.md)만으로는 막지 못해서, 커밋 자체를 막는다.

import {execFileSync, execFile, spawn} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {auditGovernance} from './lint-knowledge.mjs';

const projectDir = dirname(dirname(fileURLToPath(import.meta.url)));

// ---- 1) 성과 숫자를 손으로 적었는지 -------------------------------------------------------

const UNIT_WORDS = new Set(['days', 'day', 'hours', 'hour', 'seconds', 'second', 'sec', 'minutes', 'ms', 'px',
  'threshold', 'min', 'max', 'limit', 'count', 'index', 'width', 'height']);

/** camelCase·snake_case 이름을 소문자 단어로 나눈다. */
export const nameWords = (name) => String(name)
  .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
  .replace(/[_$]+/g, ' ')
  .toLowerCase()
  .split(/\s+/)
  .filter(Boolean);

/** 조회수·배수·CTR·시청률·중앙값을 담는 이름인가. 대문자 상수(기준값)와 단위로 끝나는 이름(views7dDays)은 뺀다. */
export function isMetricName(name) {
  if (/^[A-Z0-9_]+$/.test(name)) return false;
  const words = nameWords(name);
  if (!words.length || UNIT_WORDS.has(words.at(-1))) return false;
  return words.some((w) => /^(ratio|ctr|retention|median)$/.test(w) || /^views?(\d+\w*)?$/.test(w));
}

const RATIO_STRING = /['"`]\s*\d+(?:\.\d+)?\s*(?:x|X|배)\s*['"`]/;
const NAME_COLON_NUMBER = /(?<![\w$-])([A-Za-z_$][\w$]*)\s*:\s*['"`]?(-?\d+(?:\.\d+)?)/g;
const FALLBACK_NUMBER = /(?<![\w$-])([A-Za-z_$][\w$]*(?:\??\.[A-Za-z_$][\w$]*)*)\s*(?:\|\||\?\?)\s*([1-9]\d*(?:\.\d+)?)\b/g;

/**
 * 추가된 코드 한 줄에서 "손으로 적은 성과 숫자"를 찾는다. 줄에 `allow-literal:`(이유 포함)이 있으면 넘어간다.
 * @returns {string[]} 걸린 이유(없으면 빈 배열)
 */
export function findHardcodedMetrics(line) {
  const text = String(line);
  if (/allow-literal:\s*\S/.test(text)) return [];
  const code = text.replace(/\/\/.*$/, ''); // 줄 끝 주석은 설명이라 뺀다
  const hits = [];
  if (RATIO_STRING.test(code)) hits.push(`배수를 글자로 직접 적음: ${code.match(RATIO_STRING)[0]}`);
  for (const m of code.matchAll(NAME_COLON_NUMBER)) {
    if (isMetricName(m[1]) && Number(m[2]) !== 0) hits.push(`성과 칸에 숫자를 직접 넣음: ${m[1]}: ${m[2]}`);
  }
  for (const m of code.matchAll(FALLBACK_NUMBER)) {
    const last = m[1].split(/\??\./).at(-1);
    if (isMetricName(last)) hits.push(`값이 없을 때 숫자로 대신함: ${m[1]} || ${m[2]}`);
  }
  return hits;
}

/** 실제 동작 코드만 본다. 테스트·테스트용 가짜 데이터 파일은 예시 숫자가 있어야 하므로 뺀다. */
export const isCheckedCodeFile = (path) => /^scripts\/.+\.m?js$/.test(path)
  && !/^scripts\/tests\//.test(path) && !/^scripts\/test-[^/]+\.m?js$/.test(path);

// ---- 2) 근거 없는 완료 표현 -------------------------------------------------------------

const CLAIM_WORDS = /완벽|무결점|박멸|100\s*%\s*(?:통과|완료|성공|정상|검증|무결|해결|달성)/;

/** 기록 문서에서 숫자 대신 쓰인 완료 표현을 찾는다. `백틱` 안(예시로 인용한 말)은 뺀다. */
export function findClaimWords(line) {
  const text = String(line).replace(/`[^`]*`/g, '');
  const m = text.match(CLAIM_WORDS);
  return m ? [`근거 없는 완료 표현: "${m[0]}" — 실행한 명령과 결과 숫자로 쓴다`] : [];
}

/** 작업 기록·규칙 문서. 대본(SCRIPT.md 등)은 내용이라 뺀다. */
export const isRecordFile = (path) => /^(AGENTS|CLAUDE)\.md$/.test(path)
  // knowledge/legacy/는 옛 문서를 그대로 보관하는 곳이라 원문의 표현을 검사하지 않는다(2026-11-13)
  || (/^knowledge\/.+\.md$/.test(path) && !/^knowledge\/legacy\//.test(path))
  || /^videos\/[^/]+\/(TASKS|REVIEW)\.md$/.test(path);

// ---- 3) 커밋 메시지 -------------------------------------------------------------------

/** 커밋 메시지 검사: 이름만 빌린 서명, 근거 없는 완료 표현. */
export function checkCommitMessage(message) {
  const body = String(message).split(/\r?\n/).filter((l) => !l.startsWith('#')).join('\n');
  const problems = [];
  if (/^Co-Authored-By:\s*Claude\s*<noreply@anthropic\.com>\s*$/mi.test(body)) {
    problems.push('서명이 `Claude <noreply@anthropic.com>`이다. 실제로 만든 모델 이름을 쓴다(예: `Claude Opus 5.5 <noreply@anthropic.com>`, `<지금 쓰는 Gemini 모델 이름> (Antigravity) <noreply@google.com>`).');
  }
  for (const line of body.split(/\r?\n/)) problems.push(...findClaimWords(line));
  return problems;
}

// ---- 4) 바뀐 줄 읽기 --------------------------------------------------------------------

/** `git diff --cached -U0` 출력에서 파일별로 추가된 줄만 뽑는다. */
export function addedLinesByFile(diffText) {
  const result = new Map();
  let file = null;
  let inHeader = false; // "diff --git" 뒤 첫 "@@"까지는 머리줄(---/+++)이라 내용으로 세지 않는다
  let lineNo = 0;
  for (const line of String(diffText).split(/\r?\n/)) {
    const start = line.match(/^diff --git a\/(.+) b\/(.+)$/);
    if (start) { file = start[2]; inHeader = true; if (!result.has(file)) result.set(file, []); continue; }
    const hunk = line.match(/^@@ -\d+(?:,\d+)? \+(\d+)/);
    if (hunk) { inHeader = false; lineNo = Number(hunk[1]); continue; }
    if (!file || inHeader) continue;
    if (line.startsWith('+')) { result.get(file).push({lineNo, text: line.slice(1)}); lineNo += 1; }
  }
  return result;
}

/** node --test 출력에서 통과·실패 수를 읽는다. 화면이 있으면 "ℹ pass 3", 없으면 "# pass 3". */
export function parseTestCounts(output) {
  const read = (word) => Number((String(output).match(new RegExp(`^[ℹ#] ${word} (\\d+)`, 'm')) || [])[1] || 0);
  return {pass: read('pass'), fail: read('fail')};
}

// ---- 실행 ------------------------------------------------------------------------------

// core.quotePath=false: 한글 파일 이름을 "\355\225..."처럼 바꾸지 않고 그대로 받는다
const git = (args) => execFileSync('git', ['-c', 'core.quotePath=false', ...args], {cwd: projectDir, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024});

const runNode = (args, env = {}, timeoutMs = 5 * 60 * 1000) => new Promise((resolve) => {
  execFile(process.execPath, args, {cwd: projectDir, env: {...process.env, ...env}, timeout: timeoutMs, maxBuffer: 64 * 1024 * 1024},
    (err, stdout, stderr) => resolve({code: err ? (err.code ?? 1) : 0, out: `${stdout || ''}${stderr || ''}`}));
});

const GUARD_PORT = 3091; // 사용자 대시보드(3001)는 건드리지 않고, 지금 고친 코드로 검사용 서버를 따로 띄운다

async function runUnitTests() {
  const testScript = JSON.parse(readFileSync(join(projectDir, 'package.json'), 'utf8')).scripts?.test || '';
  const files = testScript.split(/\s+/).filter((t) => t.endsWith('.test.mjs'));
  const res = await runNode(['--test', ...files]);
  const {pass, fail} = parseTestCounts(res.out);
  if (res.code !== 0 || fail > 0 || pass === 0) {
    const failed = (res.out.match(/^(?:not ok|✖) .+$/gm) || []).slice(0, 5).join('\n    ');
    return [`단위 테스트: 통과 ${pass}, 실패 ${fail}${pass === 0 && fail === 0 ? ' (결과를 읽지 못함)' : ''}${failed ? `\n    ${failed}` : ''}`];
  }
  console.log(`  단위 테스트: # pass ${pass}, # fail ${fail}`);
  return [];
}

async function runClientCheck() {
  // 이미 떠 있는 3001 서버는 고치기 전 코드일 수 있다. 지금 파일로 서버를 새로 띄워 검사한다.
  const child = spawn(process.execPath, ['scripts/youtube-analytics-server.mjs'], {
    cwd: projectDir, env: {...process.env, YOUTUBE_ANALYTICS_PORT: String(GUARD_PORT)}, stdio: 'ignore', windowsHide: true,
  });
  try {
    let up = false;
    for (let i = 0; i < 40 && !up; i += 1) {
      await new Promise((r) => setTimeout(r, 500));
      up = await fetch(`http://localhost:${GUARD_PORT}/`, {signal: AbortSignal.timeout(2000)}).then((r) => r.ok, () => false);
    }
    if (!up) return [`검사용 대시보드 서버(포트 ${GUARD_PORT})가 20초 안에 켜지지 않음 — 서버 코드가 시작부터 실패하는지 확인`];
    const res = await runNode(['scripts/test-client-syntax.mjs'], {DASHBOARD_URL: `http://localhost:${GUARD_PORT}/`}, 3 * 60 * 1000);
    if (res.code !== 0 || !res.out.includes('ALL CLIENT TABS AND FUNCTIONS VERIFIED')) {
      const lines = res.out.split(/\r?\n/).filter((l) => /❌|✗|Error|error/.test(l)).slice(0, 6).join('\n    ');
      return [`대시보드 화면 검사(test-client-syntax) 실패${lines ? `\n    ${lines}` : ''}`];
    }
    console.log('  대시보드 화면 검사: ALL CLIENT TABS AND FUNCTIONS VERIFIED');
    return [];
  } finally {
    child.kill();
  }
}

async function preCommit() {
  const staged = git(['diff', '--cached', '--name-only', '--diff-filter=ACMR']).split(/\r?\n/).filter(Boolean);
  if (!staged.length) return [];
  const added = addedLinesByFile(git(['diff', '--cached', '-U0', '--no-color', '--diff-filter=ACMR']));
  const problems = [];

  for (const [file, lines] of added) {
    if (isCheckedCodeFile(file)) {
      for (const {lineNo, text} of lines) for (const why of findHardcodedMetrics(text)) problems.push(`${file}:${lineNo} ${why}`);
    }
    if (isRecordFile(file)) {
      for (const {lineNo, text} of lines) for (const why of findClaimWords(text)) problems.push(`${file}:${lineNo} ${why}`);
    }
  }

  const governanceChanged = staged.some((f) => /^(AGENTS|CLAUDE)\.md$/.test(f)
    || /^knowledge\/.+\.md$/.test(f)
    || /^\.(agents|claude)\/skills\//.test(f));
  if (governanceChanged) {
    const gov = await auditGovernance(projectDir);
    if (!gov.ok) {
      for (const msg of gov.blocking) problems.push(`[거버넌스 잠금] ${msg}`);
    } else {
      console.log(`  거버넌스 검사: AGENTS.md ${gov.agents.lines}/${gov.agents.maxLines}줄, 깨진 링크 0, 고아 핵심 문서 0, 스킬 일치`);
    }
  }

  const codeChanged = staged.some((f) => /^scripts\/.+\.m?js$/.test(f) || f === 'package.json' || f.startsWith('.githooks/'));
  if (codeChanged) {
    console.log('commit-guard: 코드가 바뀌어 테스트를 돌립니다 (1분 안팎)');
    problems.push(...await runUnitTests());
    problems.push(...await runClientCheck());
  }
  return problems;
}

const report = (title, problems) => {
  if (!problems.length) return 0;
  console.error(`\n❌ ${title} — 커밋하지 않았습니다.\n`);
  for (const p of problems) console.error(`  - ${p}`);
  console.error('\n원인을 고친 뒤 다시 커밋하세요. 검사를 건너뛰는 --no-verify는 쓰지 않습니다(AGENTS.md 맨 위 "작업 확인 규칙").');
  console.error('숫자가 정말 기준값이라면 그 줄에 `// allow-literal: <이유>`를 붙입니다.\n');
  return 1;
};

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  // 훅 파일이 CRLF로 꺼내져도 동작하게 인자 끝의 CR을 지운다(.gitattributes가 막지만 한 번 더).
  const [mode, msgFile] = process.argv.slice(2).map((a) => String(a).replace(/\r$/, ''));
  if (mode === '--pre-commit') {
    process.exit(report('커밋 전 검사', await preCommit()));
  } else if (mode === '--commit-msg') {
    process.exit(report('커밋 메시지 검사', checkCommitMessage(readFileSync(msgFile, 'utf8'))));
  } else {
    console.error('사용법: node scripts/commit-guard.mjs --pre-commit | --commit-msg <파일>');
    process.exit(2);
  }
}
