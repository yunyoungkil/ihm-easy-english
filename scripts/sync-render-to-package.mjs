// 렌더링이 성공하면 최신 영상을 업로드 패키지 폴더로 복사해 대시보드에 바로 반영한다(2026-11-09 사용자 요청).
// 훅: .claude/settings.json의 PostToolUse가 Bash·PowerShell 명령 뒤에 --hook으로 실행한다. 렌더 명령이 아니면 아무것도 하지 않는다.
// 안전장치:
//   - 이미 예약·업로드·공개된 패키지는 건드리지 않는다. 유튜브에 올린 영상과 파일이 어긋나기 때문이다.
//   - 패키지에 검색어 이름 영상(video.mp4 제외)이 이미 있을 때만 같은 이름으로 덮어쓴다. 이름은 사람이 정한다.
//   - 방금 만든 렌더 파일(기본 10분 안)만 복사한다. 렌더가 실패했는데 예전 파일을 올려 보내는 일을 막는다.
//   - status.json은 만들지도 고치지도 않는다(production-rules.md "4번째 원인").
import {copyFileSync, existsSync, readFileSync, readdirSync, statSync} from 'node:fs';
import {basename, dirname, join, resolve} from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {findRenderProject, isRenderCommand} from './check-banned-terms.mjs';
import {selectPackageVideo, shortsPackageEpisode} from './upload-package-summary.mjs';

const FRESH_MS = 10 * 60 * 1000;
const LOCKED = new Set(['scheduled', 'uploaded', 'published', 'uploading']);
const here = dirname(fileURLToPath(import.meta.url));
const defaultPackagesRoot = join(here, '..', 'output', 'upload-packages');

// 영상 프로젝트 폴더에 대응하는 패키지 폴더. 이름이 같거나 `-longform`이 붙은 폴더(EP20·21)를 찾는다.
export const packageFolderFor = (projectDir, packagesRoot = defaultPackagesRoot) => {
  const name = basename(projectDir);
  for (const candidate of [name, `${name}-longform`]) {
    const dir = join(packagesRoot, candidate);
    if (existsSync(dir)) return dir;
  }
  return null;
};

const readStatus = (packageDir) => {
  const file = shortsPackageEpisode(basename(packageDir)) ? 'shorts-status.json' : 'status.json';
  const path = join(packageDir, file);
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, 'utf8')).status ?? null;
  } catch {
    return null;
  }
};

const newestRender = (projectDir) => {
  const dir = join(projectDir, 'renders');
  if (!existsSync(dir)) return null;
  return (
    readdirSync(dir)
      .filter((f) => f.toLowerCase().endsWith('.mp4'))
      .map((f) => ({path: join(dir, f), mtime: statSync(join(dir, f)).mtimeMs}))
      .sort((a, b) => b.mtime - a.mtime)[0] ?? null
  );
};

const skipped = (reason) => ({status: 'skipped', reason});

export const syncRender = ({projectDir, packagesRoot = defaultPackagesRoot, now = Date.now()}) => {
  const render = newestRender(projectDir);
  if (!render) return skipped('renders 폴더에 영상이 없습니다.');
  if (now - render.mtime > FRESH_MS) return skipped('가장 최근 렌더 파일이 10분보다 오래돼 이번 렌더가 아닌 것으로 봅니다.');
  const packageDir = packageFolderFor(projectDir, packagesRoot);
  if (!packageDir) return skipped(`대응하는 업로드 패키지 폴더가 없습니다(${basename(projectDir)}). 패키지를 만든 뒤 복사하세요.`);
  const state = readStatus(packageDir);
  if (state && LOCKED.has(state)) return skipped(`패키지가 이미 ${state} 상태라 건드리지 않았습니다. 예약·공개된 영상과 파일이 어긋나기 때문입니다.`);
  const target = selectPackageVideo(readdirSync(packageDir));
  if (!target) return skipped('패키지에 영상 파일이 없어 검색어 이름을 정할 수 없습니다. 이름을 정해 직접 복사하세요(knowledge/youtube-operations.md 1절 "렌더 · 업로드 · 사후 마무리").');
  copyFileSync(render.path, join(packageDir, target));
  return {status: 'copied', from: render.path, to: join(packageDir, target), packageDir};
};

const respond = (message) => console.log(JSON.stringify({systemMessage: message}));

export const runHook = (raw, {now = Date.now(), packagesRoot} = {}) => {
  let input;
  try {
    input = JSON.parse(raw);
  } catch {
    return 0;
  }
  const isAntigravity = Boolean(input?.hookEventName || input?.toolCall);
  const command = isAntigravity ? input?.toolCall?.args?.CommandLine : input?.tool_input?.command;
  const finish = (msg = '') => {
    if (isAntigravity) console.log('{}');
    else if (msg) respond(msg);
    return 0;
  };
  if (typeof command !== 'string' || !isRenderCommand(command)) return finish();
  const cwd = input.cwd || input.workspacePaths?.[0] || process.cwd();
  const projectDir = findRenderProject(command, cwd);
  if (!projectDir) return finish();
  const r = syncRender({projectDir: resolve(projectDir), packagesRoot, now});
  return finish(r.status === 'copied' ? `패키지에 반영: ${basename(r.to)} → ${basename(r.packageDir)}. 대시보드는 새로고침하면 보입니다.` : `패키지 반영 건너뜀: ${r.reason}`);
};

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  process.exitCode = process.argv.includes('--hook') ? runHook(readFileSync(0, 'utf8')) : 0;
}
