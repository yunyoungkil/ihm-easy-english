// 쿠팡 블로그(tech.d40m.com) 무인 글쓰기 실행기(Claude Code CLI 비대화형 호출).
//
// [Step 2 검증 기록 — 2026-11-25 이 PC(claude.exe v2.1.312) 확인 결과]
// - 확인 바이너리: C:\Users\yunyo\.vscode\extensions\anthropic.claude-code-2.1.312-win32-x64\resources\native-binary\claude.exe
// - `--help`로 확인한 비대화형·도구 제한 옵션:
//   - `-p, --print`: 비대화형 출력 후 종료
//   - `--restricted`: 명령·코드 실행 내장 도구(Bash, PowerShell 등) 제거, 작업 폴더 밖 파일 접근 제한, user/project/local settings 무시, bypassPermissions 거부
//   - `--tools "WebSearch,WebFetch,Write"`: 내장 도구를 웹 검색·웹 읽기·파일 쓰기만으로 고정(`--restricted`에서 제외되는 WebFetch를 명시해 복원)
//   - `--allowedTools "WebSearch,WebFetch,Write(data/blog/drafts/**)"`: 허용 도구 화이트리스트(초안 폴더 쓰기만 허용)
//   - `--permission-mode dontAsk`, `--permission-prompts none`: 프롬프트 없이 미허용 도구 자동 거부
//   - `--output-format json`, `--no-session-persistence`, `--strict-mcp-config`: JSON 결과, 세션 미저장, 외부 MCP 차단
// - 실제 제한 시험(`"git status를 실행해"` 프롬프트, stdin 차단, 45초 타임아웃):
//   - CLI 옵션 파싱 오류 없이 실행되었으며, 도구 실행 없이 종료 코드 1과 JSON
//     (`api_error: "usage_limit_reached"`, `"You've hit your 5-hour limit · resets 4pm (Asia/Seoul)"`)을 반환함.
//   - 즉 옵션 조합 수용·도구 차단 동작은 확인되었고, 모델 추론 응답은 한도 해제 후 실글 시험에서 추가 확인한다.

import {spawn} from 'node:child_process';
import {existsSync, readdirSync} from 'node:fs';
import {mkdir, readFile, rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {DISCLOSURE} from './check-post.mjs';

const MODULE_DIR = path.dirname(fileURLToPath(import.meta.url));
const PROMPT_TEMPLATE_PATH = path.join(MODULE_DIR, 'prompts', 'tech-post.md');
const DEFAULT_TIMEOUT_MS = 600_000; // allow-literal: 글쓰기 한 편 최대 대기 시간(10분)
const RECENT_POSTS_LIMIT = 20; // allow-literal: 프롬프트에 넣을 최근 발행 제목 최대 개수
// 2026-11-25 사용자 결정: 글 작성은 Opus로 고정(기본 모델이 바뀌어도 글 품질이 흔들리지 않게)
export const WRITER_MODEL = 'claude-opus-5-5';
const CLAUDE_EXT_RE = /^anthropic\.claude-code-(\d+(?:\.\d+)*)(?:-|$)/;

function compareVersionsDesc(a, b) {
  const pa = a.version.split('.').map(Number);
  const pb = b.version.split('.').map(Number);
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i += 1) {
    const diff = (pb[i] || 0) - (pa[i] || 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

/** VS Code 확장 폴더에서 가장 높은 버전의 claude.exe를 찾고, 없으면 PATH에서 찾는다. */
export function resolveClaudeExe({
  home = process.env.USERPROFILE || process.env.HOME || os.homedir(),
  exists = existsSync,
  readdir = readdirSync,
  pathEnv = process.env.PATH || '',
} = {}) {
  const extRoot = path.join(home, '.vscode', 'extensions');
  try {
    const entries = readdir(extRoot);
    const candidates = [];
    for (const entry of entries) {
      const m = String(entry).match(CLAUDE_EXT_RE);
      if (!m) continue;
      const exePath = path.join(extRoot, entry, 'resources', 'native-binary', 'claude.exe');
      if (exists(exePath)) candidates.push({version: m[1], exePath});
    }
    candidates.sort(compareVersionsDesc);
    if (candidates.length > 0) return candidates[0].exePath;
  } catch {
    // 확장 폴더가 없으면 PATH 검색으로 넘어간다.
  }

  const exeNames = process.platform === 'win32' ? ['claude.exe', 'claude.cmd', 'claude'] : ['claude'];
  for (const dir of String(pathEnv).split(path.delimiter).filter(Boolean)) {
    for (const name of exeNames) {
      const fullPath = path.join(dir, name);
      if (exists(fullPath)) return fullPath;
    }
  }
  return null;
}

/** 글쓰기 지침 + 주제 + 중복 방지용 기존 글 목록 + 저장 경로를 합친 프롬프트를 만든다. */
export async function buildWriterPrompt(
  topic,
  {posts = [], draftPath = `data/blog/drafts/${topic?.topicId || 'draft'}.json`} = {},
) {
  const guide = await readFile(PROMPT_TEMPLATE_PATH, 'utf8');
  const recentTitles = (posts || [])
    .slice(-RECENT_POSTS_LIMIT)
    .map((p) => `- [${p.topicId}] ${p.title}`)
    .join('\n');

  const sourceHints = Array.isArray(topic?.sourceHints) && topic.sourceHints.length
    ? topic.sourceHints.join(', ')
    : '(직접 공식 지원 페이지 검색)';

  return [
    guide.trim(),
    '',
    '---',
    '## 이번 글 작업 정보',
    `- topicId: ${topic?.topicId || ''}`,
    `- 제목 방향(title): ${topic?.title || ''}`,
    `- 글 종류(kind): ${topic?.kind || 'fix'}`,
    `- 검색어(searchQuery): ${topic?.searchQuery || ''}`,
    `- 참고 출처 힌트(sourceHints): ${sourceHints}`,
    `- 물건 힌트(productHint): ${topic?.productHint ?? '없음(글에 도움이 되는 물건을 직접 찾아 product를 채운다)'}`,
    `- 저장할 초안 파일 경로(draftPath): ${draftPath}`,
    '',
    '## 중요 주의사항',
    `- 대가 문구("${DISCLOSURE}")와 쿠팡 제휴 링크는 프로그램이 자동 삽입하므로 bodyHtml에 절대 직접 쓰지 않는다.`,
    `- 반드시 Write 도구를 사용해 정확히 "${draftPath}" 경로에 순수 JSON만 저장한다.`,
    '',
    '## 이미 올린 글 목록 (중복 주제·각도 피하기)',
    recentTitles || '(아직 올린 글 없음)',
  ].join('\n');
}

/** Claude Code CLI를 비대화형·도구 제한 모드로 실행해 draftPath 초안 JSON을 읽는다. */
export async function runWriter({
  exe,
  prompt,
  draftPath,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  spawnImpl = spawn,
  cwd = process.cwd(),
} = {}) {
  if (!exe) {
    return {ok: false, error: 'claude 실행 파일을 찾을 수 없습니다.'};
  }
  if (!draftPath) {
    return {ok: false, error: 'draftPath가 필요합니다.'};
  }

  await mkdir(path.dirname(draftPath), {recursive: true});
  await rm(draftPath, {force: true});

  const args = [
    '-p',
    '--model', WRITER_MODEL,
    '--restricted',
    '--tools', 'WebSearch,WebFetch,Write',
    '--allowedTools', 'WebSearch,WebFetch,Write(data/blog/drafts/**)',
    '--permission-mode', 'dontAsk',
    '--permission-prompts', 'none',
    '--output-format', 'json',
    '--no-session-persistence',
    '--strict-mcp-config',
    prompt,
  ];

  const execResult = await new Promise((resolve) => {
    let settled = false;
    let timedOut = false;
    let stderr = '';
    const child = spawnImpl(exe, args, {
      cwd,
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
    });

    const finish = (outcome) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(outcome);
    };

    const timer = setTimeout(() => {
      timedOut = true;
      try { child.kill('SIGTERM'); } catch { /* ignore */ }
      finish({ok: false, error: `글쓰기 제한 시간(${timeoutMs}ms)을 초과했습니다.`});
    }, timeoutMs);

    child.stderr?.on?.('data', (chunk) => { stderr += String(chunk); });
    child.on('error', (err) => {
      finish({ok: false, error: `실행 오류: ${err.message}`});
    });

    const onDone = (code) => {
      if (timedOut) return;
      if (code !== 0) {
        finish({ok: false, error: `claude 종료 코드 ${code}${stderr ? `: ${stderr.trim()}` : ''}`});
        return;
      }
      finish({ok: true});
    };

    child.on('close', onDone);
    child.on('exit', (code) => {
      queueMicrotask(() => onDone(code));
    });
  });

  if (!execResult.ok) return execResult;

  let raw;
  try {
    raw = await readFile(draftPath, 'utf8');
  } catch (err) {
    return {ok: false, error: `초안 파일을 읽지 못했습니다(${err.code || err.message}).`};
  }

  let draft;
  try {
    draft = JSON.parse(raw);
  } catch {
    return {ok: false, error: '초안 파일이 올바른 JSON 형식이 아닙니다.'};
  }

  if (!draft || typeof draft !== 'object' || Array.isArray(draft)) {
    return {ok: false, error: '초안 JSON 루트가 객체가 아닙니다.'};
  }

  return {ok: true, draft};
}
