// 안전한 받기(2026-11-27): 담당 PC가 올리는 자동 데이터 파일이 이 PC의 미커밋 변경과 부딪혀 `git pull`이 멈추는 일을 막는다.
// 배경: 담당 PC(집 PC)만 매일 루프로 data/youtube 등을 커밋·푸시한다. 다른 PC(노트북)는 브리핑·대시보드가 같은 파일을 고치지만
// 올리지 않아 미커밋으로 남고, 담당 PC가 같은 파일을 올리면 다음 pull이 "local changes would be overwritten"으로 멈춘다.
//
// 규칙:
//   - 원격에서도 바뀐 자동 데이터 파일(SYNC_INCLUDE 경로)만 백업한 뒤 원격 것으로 맞춘다. 다른 데이터 파일(사람이 정리한 것)은 건드리지 않는다.
//   - 코드·문서가 부딪히면 아무것도 건드리지 않고 받지 않은 채 {ok:false, stage:'conflict', conflictsNonData}로 알린다.
//     git이 멈추면 그 오류를 그대로 돌려준다.
//   - 던지지 않는다. 실패는 {ok:false, stage, error}로 알린다. force 동작은 없다.

import {execFile} from 'node:child_process';
import {copyFileSync, existsSync, mkdirSync, readdirSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {promisify} from 'node:util';
import {SYNC_INCLUDE} from './loop-data-sync.mjs';

const execFileAsync = promisify(execFile);

const BACKUP_KEEP = 10; // allow-literal: 백업은 최근 10회분만 남긴다(사용자 설계)
const GIT_TIMEOUT_MS = 2 * 60 * 1000; // allow-literal: 받기 한 번에 2분(멈춘 네트워크가 시작을 붙잡지 않게)
const ERROR_MAX_CHARS = 400; // allow-literal: 오류 문구 길이 제한

const toPosix = (p) => String(p).replace(/\\/g, '/');

// SYNC_INCLUDE 항목을 판정 함수로 바꾼다. `*`는 한 단계 폴더 이름 하나, 별표 없는 항목은 그 파일이거나 그 폴더 아래.
function buildMatchers(patterns) {
  return patterns.map((pattern) => {
    const clean = toPosix(pattern).replace(/\/+$/, '');
    if (clean.includes('*')) {
      const re = new RegExp(`^${clean.split('*').map((s) => s.replace(/[.+?^${}()|[\]\\]/g, '\\$&')).join('[^/]+')}$`);
      return (p) => re.test(p);
    }
    return (p) => p === clean || p.startsWith(`${clean}/`);
  });
}

/** 담당 PC가 자동으로 올리는 데이터 경로인가(SYNC_INCLUDE 기준). */
export function isDataPath(relPath, patterns = SYNC_INCLUDE) {
  const p = toPosix(relPath).replace(/^\.\//, '');
  return buildMatchers(patterns).some((match) => match(p));
}

/** 기본 백업 위치: 프로젝트 밖. */
export function defaultBackupRoot() {
  const base = process.env.LOCALAPPDATA ? join(process.env.LOCALAPPDATA, 'ihm-easy-english') : join(tmpdir(), 'ihm-easy-english');
  return join(base, 'pull-backup');
}

async function defaultGit(args, cwd) {
  try {
    const {stdout} = await execFileAsync('git', args, {cwd, maxBuffer: 50 * 1024 * 1024, timeout: GIT_TIMEOUT_MS});
    return {code: 0, out: String(stdout)};
  } catch (err) {
    return {code: typeof err.code === 'number' ? err.code : 1, out: `${err.stdout || ''}${err.stderr || ''}${err.message || ''}`};
  }
}

const splitZ = (out) => String(out).split('\0').map((s) => s.trim()).filter(Boolean);
const errText = (out) => String(out).trim().slice(0, ERROR_MAX_CHARS);

function pruneBackups(backupRoot, keep) {
  try {
    const dirs = readdirSync(backupRoot, {withFileTypes: true}).filter((d) => d.isDirectory()).map((d) => d.name).sort();
    for (const name of dirs.slice(0, Math.max(0, dirs.length - keep))) rmSync(join(backupRoot, name), {recursive: true, force: true});
  } catch { /* 백업 정리 실패는 받기를 막지 않는다 */ }
}

/**
 * 원격 최신을 받는다. 반환:
 *   {skipped:'원격 없음'} | {ok:false, stage:'fetch'|'conflict'|'pull', error, restored?, backupDir?, conflictsNonData?}
 *   | {ok:true, restored:[경로], backupDir:string|null, conflictsNonData:[경로], upToDate:boolean}
 */
export async function safePull({
  projectDir,
  git = defaultGit,
  backupRoot = defaultBackupRoot(),
  now = new Date(),
  log = () => {},
  keep = BACKUP_KEEP,
} = {}) {
  const run = (...args) => git(args, projectDir);

  const upstream = await run('rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{u}');
  if (upstream.code !== 0) return {skipped: '원격 없음'};

  const fetched = await run('fetch');
  if (fetched.code !== 0) return {ok: false, stage: 'fetch', error: errText(fetched.out)};

  // 몇 개가 새로 들어오는가(0이면 받을 것이 없다).
  const incoming = await run('rev-list', '--count', 'HEAD..@{u}');
  const upToDate = incoming.code === 0 && Number(incoming.out.trim()) === 0;

  let restored = [];
  let backupDir = null;
  let conflictsNonData = [];

  if (!upToDate) {
    const base = await run('merge-base', 'HEAD', '@{u}');
    let remoteChanged = [];
    if (base.code === 0) {
      const d = await run('-c', 'core.quotepath=false', 'diff', '--no-renames', '--name-only', '-z', base.out.trim(), '@{u}');
      if (d.code === 0) remoteChanged = splitZ(d.out);
    }
    const remoteSet = new Set(remoteChanged.map(toPosix));

    const unstaged = await run('-c', 'core.quotepath=false', 'diff', '--no-renames', '--name-only', '-z');
    const staged = await run('-c', 'core.quotepath=false', 'diff', '--no-renames', '--cached', '--name-only', '-z');
    const localChanged = [...new Set([...splitZ(unstaged.out), ...splitZ(staged.out)].map(toPosix))];

    const both = localChanged.filter((f) => remoteSet.has(f));
    const dataConflicts = both.filter((f) => isDataPath(f));
    conflictsNonData = both.filter((f) => !isDataPath(f));

    // 코드·문서가 부딪히면 받지 않고 멈춘다. 받으면 autostash가 작업 파일에 충돌 표시(<<<<<<<)를 남긴다
    // (2026-11-27 임시 저장소 실측: 종료 코드 0, 파일은 UU). 데이터 파일도 건드리지 않는다(받지 않을 거라 맞출 필요가 없다).
    if (conflictsNonData.length > 0) {
      log(`코드·문서 부딪힘 ${conflictsNonData.length}개, 받지 않음: ${conflictsNonData.join(', ')}`);
      return {
        ok: false,
        stage: 'conflict',
        error: `이 PC에서 고친 코드·문서 ${conflictsNonData.length}개(${conflictsNonData.join(', ')})를 원격도 바꿨다. 먼저 커밋하거나 정리한 뒤 다시 받는다.`,
        restored,
        backupDir,
        conflictsNonData,
      };
    }

    if (dataConflicts.length > 0) {
      backupDir = join(backupRoot, now.toISOString().replace(/[:.]/g, '-'));
      for (const rel of dataConflicts) {
        const src = join(projectDir, rel);
        if (existsSync(src)) {
          const dest = join(backupDir, rel);
          mkdirSync(dirname(dest), {recursive: true});
          copyFileSync(src, dest);
        }
        await run('reset', '-q', '--', rel);
        const inHead = await run('cat-file', '-e', `HEAD:${rel}`);
        if (inHead.code === 0) {
          const co = await run('checkout', '--', rel);
          if (co.code !== 0) return {ok: false, stage: 'pull', error: errText(co.out), restored, backupDir};
        } else {
          // 이 PC에서만 새로 만든(HEAD에 없는) 파일이 원격과 부딪히면 백업 후 치운다.
          rmSync(src, {force: true});
        }
        restored.push(rel);
      }
      pruneBackups(backupRoot, keep);
      log(`부딪힌 데이터 파일 ${restored.length}개를 원격 것으로 맞춤: ${restored.join(', ')}`);
    }
    const pulled = await run('pull', '--rebase', '--autostash');
    if (pulled.code !== 0) {
      await run('rebase', '--abort'); // 진행 중인 rebase가 없으면 실패해도 무시
      return {ok: false, stage: 'pull', error: errText(pulled.out), restored, backupDir, conflictsNonData};
    }
  }

  return {ok: true, restored, backupDir, conflictsNonData, upToDate};
}

/** 사람이 읽는 한 줄 요약. */
export function describeResult(r) {
  if (!r) return '';
  if (r.skipped) return `받기 건너뜀: ${r.skipped}`;
  if (!r.ok) {
    const restored = r.restored?.length ? ` (데이터 파일 ${r.restored.length}개는 원격 것으로 맞춤, 백업: ${r.backupDir})` : '';
    return `받기 실패(${r.stage}): ${r.error}${restored}`;
  }
  const parts = [r.upToDate ? '받기 완료(이미 최신).' : '받기 완료.'];
  if (r.restored.length > 0) parts.push(`부딪힌 데이터 파일 ${r.restored.length}개는 원격 것으로 맞추고 백업: ${r.backupDir}`);
  if (r.conflictsNonData.length > 0) parts.push(`주의: 코드·문서 ${r.conflictsNonData.length}개(${r.conflictsNonData.join(', ')})는 원격과 부딪혀 자동으로 손대지 않음. 충돌 표시가 남았는지 직접 확인 필요`);
  return parts.join(' ');
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))) {
  const projectDir = dirname(dirname(fileURLToPath(import.meta.url)));
  const result = await safePull({projectDir});
  console.log(describeResult(result));
  process.exit(result.ok === false ? 1 : 0);
}
