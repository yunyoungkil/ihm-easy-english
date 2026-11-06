// 렌더링 전에 영상 프로젝트의 금지어를 찾는다. 화면에 보이는 글자, 대본 낭독문, 그림 프롬프트를 본다.
// 금지어는 렌더링이 끝난 뒤 발견하면 고치는 데 수십 분이 든다(2026-11-06 EP24~29 점검). 그래서 렌더 명령 직전에 막는다.
// 그림 파일 안에 이미 그려진 글자는 읽지 못하므로, 그 부분은 콘택트시트를 눈으로 확인해야 한다.
//
// 사용법: npm run check-terms -- videos/<프로젝트> [다른 폴더...]
// 훅: .claude/settings.json이 렌더 명령 전에 --hook으로 실행한다. 금지어가 있으면 종료 코드 2로 막는다.
import {existsSync, readFileSync, readdirSync} from 'node:fs';
import {join, relative, resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {findBannedTerms} from './banned-terms.mjs';

const ALLOW_MARKER = 'ALLOW_BANNED_TERMS';
const MAX_REPORT_LINES = 20;
const IMAGE_NOTE = '그림 파일 안에 그려진 글자는 이 검사로 읽지 못합니다. 콘택트시트로 눈으로 확인하세요.';

const RENDER_COMMAND =
  /(?:^|[;&|\n]\s*)(?:[A-Za-z_]\w*=\S*\s+)*(?:npx\s+(?:(?:--yes|-y|--no-install)\s+)*)?hyperframes(?:@\S+)?\s+render\b([^;&|\n]*)/;

const blank = (text) => text.replace(/[^\r\n]/g, ' ');

const isStringToken = (token) => token.length >= 2 && /^["'`]/.test(token) && token.endsWith(token[0]);

const keepStrings = (code) =>
  code
    .replace(/\/\*[\s\S]*?\*\//g, blank)
    .replace(/(^|[\s;{},)])\/\/[^\r\n]*/gm, blank)
    .replace(/"(?:[^"\\\r\n]|\\.)*"|'(?:[^'\\\r\n]|\\.)*'|`(?:[^`\\]|\\.)*`|[^"'`]+|["'`]/g, (token) =>
      isStringToken(token) ? token : blank(token),
    );

// 시청자에게 보이지 않는 부분(주석, CSS, 태그 속성, 코드)을 공백으로 바꾼다. 줄 번호는 그대로 둔다.
export const maskInvisible = (html) =>
  html
    .replace(/<!--[\s\S]*?-->/g, blank)
    .replace(/<style\b[\s\S]*?<\/style>/gi, blank)
    .replace(/<title\b[\s\S]*?<\/title>/gi, blank)
    .replace(/(<script\b[^>]*>)([\s\S]*?)(<\/script>)/gi, (_, open, body, close) => blank(open) + keepStrings(body) + blank(close))
    .replace(/<[a-zA-Z/!][^>]*>/g, blank);

// 대본과 프롬프트는 코드 블록 안이 실제로 쓰이는 글이다. 코드 블록이 없으면 전체를 본다.
const keepFenced = (text) => {
  let inside = false;
  let found = false;
  const lines = text.split('\n').map((line) => {
    if (/^\s*```/.test(line)) {
      inside = !inside;
      found = true;
      return '';
    }
    return inside ? line : '';
  });
  return found ? lines.join('\n') : text;
};

const walk = (dir, keep) =>
  existsSync(dir)
    ? readdirSync(dir, {withFileTypes: true}).flatMap((entry) => {
        const path = join(dir, entry.name);
        if (entry.isDirectory()) return walk(path, keep);
        return keep(entry.name) ? [path] : [];
      })
    : [];

const contextAround = (line, index) => line.slice(Math.max(0, index - 24), index + 36).replace(/\s+/g, ' ').trim();

export const scanProject = (dir) => {
  const screens = [join(dir, 'index.html'), ...walk(join(dir, 'compositions'), (name) => name.endsWith('.html'))];
  const writing = [
    join(dir, 'SCRIPT.md'),
    ...walk(join(dir, 'prompts'), (name) => name.endsWith('.md')),
    ...walk(join(dir, 'assets', 'images'), (name) => /prompt.*\.md$/i.test(name)),
  ];
  const sources = [...screens.map((file) => [file, maskInvisible]), ...writing.map((file) => [file, keepFenced])];
  return sources
    .filter(([file]) => existsSync(file))
    .flatMap(([file, view]) =>
      view(readFileSync(file, 'utf8'))
        .split('\n')
        .flatMap((line, index) =>
          findBannedTerms(line).map((hit) => ({
            file: relative(dir, file),
            line: index + 1,
            term: hit.term,
            context: contextAround(line, hit.index),
          })),
        ),
    );
};

// Git Bash의 /c/Users/... 경로를 C:/Users/...로 바꾼다.
const toNativePath = (path) =>
  process.platform === 'win32' ? path.replace(/^\/([a-zA-Z])\//, (_, drive) => `${drive.toUpperCase()}:/`) : path;
const stripQuotes = (token) => token.replace(/^["']|["']$/g, '');
const isProject = (dir) => existsSync(join(dir, 'hyperframes.json'));

export const isRenderCommand = (command) => RENDER_COMMAND.test(command);

// 렌더 명령이 어느 프로젝트를 렌더링하는지 찾는다. 렌더 명령이 아니거나 찾지 못하면 null이다.
export const findRenderProject = (command, cwd = process.cwd()) => {
  const match = command.match(RENDER_COMMAND);
  if (!match) return null;
  const moves = [...command.slice(0, match.index).matchAll(/(?:^|[;&|\s])cd\s+("[^"]+"|'[^']+'|\S+)/g)];
  const start = resolve(toNativePath(cwd));
  const base = moves.length ? resolve(start, toNativePath(stripQuotes(moves.at(-1)[1]))) : start;
  const candidates = match[1].trim().split(/\s+/).filter(Boolean).map(stripQuotes).filter((token) => !token.startsWith('-'));
  for (const candidate of candidates) {
    const path = resolve(base, toNativePath(candidate));
    if (isProject(path)) return path;
  }
  return isProject(base) ? base : null;
};

const countByTerm = (hits) => {
  const counts = new Map();
  for (const hit of hits) counts.set(hit.term, (counts.get(hit.term) || 0) + 1);
  return [...counts].sort((a, b) => b[1] - a[1]).map(([term, count]) => `${term} ${count}곳`).join(', ');
};

const formatHits = (hits) => {
  const lines = hits.slice(0, MAX_REPORT_LINES).map((hit) => `  ${hit.file}:${hit.line}  ${hit.term}  | ${hit.context}`);
  if (hits.length > MAX_REPORT_LINES) lines.push(`  ...외 ${hits.length - MAX_REPORT_LINES}곳`);
  return [`합계: ${countByTerm(hits)}`, ...lines].join('\n');
};

const respond = (message) => console.log(JSON.stringify({systemMessage: message}));

const runHook = (raw) => {
  let input;
  try {
    input = JSON.parse(raw);
  } catch {
    return 0;
  }
  const command = input?.tool_input?.command;
  if (typeof command !== 'string' || !isRenderCommand(command)) return 0;
  if (command.includes(ALLOW_MARKER)) {
    respond('금지어 검사: 사용자 승인 표시가 있어 건너뜁니다.');
    return 0;
  }
  const project = findRenderProject(command, input.cwd || process.cwd());
  if (!project) {
    respond('금지어 검사: 렌더링할 프로젝트 폴더를 찾지 못해 건너뜁니다. npm run check-terms로 직접 확인하세요.');
    return 0;
  }
  const hits = scanProject(project);
  if (hits.length === 0) {
    respond(`금지어 검사 통과. ${IMAGE_NOTE}`);
    return 0;
  }
  console.error(
    [
      `금지어 ${hits.length}곳을 찾아 렌더링을 멈췄습니다 (${project}).`,
      formatHits(hits),
      '고친 뒤 다시 실행하세요.',
      `사용자가 이대로 렌더링하기로 명시적으로 승인한 경우에만 명령 앞에 ${ALLOW_MARKER}=1 (파워셸은 $env:${ALLOW_MARKER}='1';)을 붙입니다.`,
    ].join('\n'),
  );
  return 2;
};

const runCli = (folders) => {
  if (folders.length === 0) {
    console.error('사용법: npm run check-terms -- videos/<프로젝트> [다른 폴더...]');
    return 1;
  }
  let found = 0;
  for (const folder of folders) {
    const hits = scanProject(resolve(folder));
    found += hits.length;
    console.log(hits.length ? `${folder}: 금지어 ${hits.length}곳\n${formatHits(hits)}` : `${folder}: 금지어 없음`);
  }
  console.log(IMAGE_NOTE);
  return found ? 1 : 0;
};

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const args = process.argv.slice(2);
  process.exitCode = args.includes('--hook') ? runHook(readFileSync(0, 'utf8')) : runCli(args);
}
