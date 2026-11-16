// 매일 루프가 모은 데이터를 깃에 올려 다른 PC가 같은 일을 또 하지 않게 한다(2026-11-16 사용자 "권고대로").
// 배경: 루프가 만든 합친 리포트(Gemini)·이탈 곡선(API)·말투 합계가 커밋되지 않아 다른 PC가 처음 켜면 처음부터 다시 만들었다.
//
// 규칙 (knowledge/handoff/2026-11-14.md 2026-11-16 절):
//   - 루프를 맡은 PC 한 곳만 올린다. 담당 PC 이름은 data/loop-host.json(깃에 있음)에 있고, 파일이 없으면 이 PC가 맡는다.
//     담당이 아닌 PC에서 루프를 돌리면 데이터를 만들기만 하고 올리지 않는다(두 PC가 같은 새벽에 올려 부딪히는 일을 막는다).
//   - 올리는 것은 아래 목록의 데이터뿐이다. 코드·문서·내가 모르는 파일은 건드리지 않는다.
//   - 푸시가 거부되면 pull --rebase 후 한 번만 다시 시도한다. 부딪히면 rebase를 취소하고 실패로 알린다(force push 없음).

import {execFile} from 'node:child_process';
import {existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync} from 'node:fs';
import {hostname, tmpdir} from 'node:os';
import {dirname, join} from 'node:path';
import {promisify} from 'node:util';

const execFileAsync = promisify(execFile);

/** 올릴 데이터. 은퇴 예정인 예전 댓글·대본 리포트와 PC 전용 파일(.gitignore)은 뺀다. */
export const SYNC_INCLUDE = [
  'data/youtube',
  'data/loop-host.json',
  'output/upload-packages/*/status.json',
  'output/upload-packages/*/shorts-status.json',
];
export const SYNC_EXCLUDE = [
  ':(exclude)data/youtube/outlier-comments',
  ':(exclude)data/youtube/script-insights',
];
export const SYNC_PATHSPECS = [...SYNC_INCLUDE, ...SYNC_EXCLUDE];

export const hostFilePath = (projectDir) => join(projectDir, 'data', 'loop-host.json');

/** 담당 PC 파일을 읽는다. 없거나 깨졌으면 null. */
export function readHost(projectDir) {
  const file = hostFilePath(projectDir);
  if (!existsSync(file)) return null;
  try {
    const host = JSON.parse(readFileSync(file, 'utf8')).host;
    return typeof host === 'string' && host ? host : null;
  } catch { return null; }
}

/** 이 PC가 올려도 되는가. 담당이 없으면 이 PC가 맡고 파일을 쓴다(claim). */
export function decideHost(projectDir, thisHost) {
  const host = readHost(projectDir);
  if (!host) return {allowed: true, claim: true, host: thisHost};
  return {allowed: host.toLowerCase() === thisHost.toLowerCase(), claim: false, host};
}

async function defaultGit(args, cwd) {
  try {
    const {stdout} = await execFileAsync('git', args, {cwd, maxBuffer: 50 * 1024 * 1024, timeout: 5 * 60 * 1000});
    return {code: 0, out: String(stdout)};
  } catch (err) {
    return {code: typeof err.code === 'number' ? err.code : 1, out: `${err.stdout || ''}${err.stderr || ''}${err.message || ''}`};
  }
}

/**
 * 데이터를 커밋하고 푸시한다. git 호출을 바꿔 끼울 수 있게 해 둔다(시험용).
 * 돌려주는 값: {skipped: '이유'} | {committed: 파일 수, pushed: true}
 */
export async function syncData({projectDir, now = new Date(), thisHost = hostname(), git = defaultGit} = {}) {
  const run = (args) => git(args, projectDir);
  const decision = decideHost(projectDir, thisHost);
  if (!decision.allowed) return {skipped: `루프 담당 PC가 아님(담당: ${decision.host}, 이 PC: ${thisHost})`};

  const upstream = await run(['rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{u}']);
  if (upstream.code !== 0) return {skipped: '이 가지에 올릴 원격(upstream)이 없음'};

  if (decision.claim) {
    mkdirSync(dirname(hostFilePath(projectDir)), {recursive: true});
    writeFileSync(hostFilePath(projectDir), `${JSON.stringify({host: thisHost, claimedAt: now.toISOString(), note: '매일 루프가 데이터를 깃에 올리는 PC. 바꾸려면 host를 새 PC 이름(os.hostname)으로 고친다.'}, null, 2)}\n`, 'utf8');
  }

  // 일치하는 파일이 없는 경로 하나가 add 전체를 실패시키지 않게 경로마다 따로 담는다(수정·새 파일·삭제 모두). 무시된 파일은 git이 거른다.
  for (const include of SYNC_INCLUDE) await run(['add', '-A', '--', include, ...SYNC_EXCLUDE]);
  const staged = await run(['diff', '--cached', '--name-only', '--', ...SYNC_PATHSPECS]);
  const files = staged.out.split('\n').map((s) => s.trim()).filter(Boolean);
  if (!files.length) return {skipped: '올릴 변경 없음'};

  const stamp = now.toISOString().slice(0, 10);
  const message = `chore(data): 매일 루프 데이터 자동 동기화 ${stamp} (${files.length}개, ${thisHost})`;
  // 다른 사람이 담아 둔 파일이 섞이지 않게, 방금 담은 파일 이름만 파일로 넘겨 그것만 커밋한다(경로가 많아도 명령줄이 안 넘친다).
  const listDir = mkdtempSync(join(tmpdir(), 'loop-sync-list-'));
  const listFile = join(listDir, 'files.txt');
  writeFileSync(listFile, `${files.join('\n')}\n`, 'utf8');
  let commit;
  try { commit = await run(['commit', '-m', message, '--only', '--pathspec-from-file', listFile]); } finally { rmSync(listDir, {recursive: true, force: true}); }
  if (commit.code !== 0) throw new Error(`데이터 커밋 실패: ${commit.out.trim().split('\n').slice(-3).join(' / ').slice(0, 300)}`);

  let push = await run(['push']);
  if (push.code !== 0) {
    const pull = await run(['pull', '--rebase', '--autostash']);
    if (pull.code !== 0) {
      await run(['rebase', '--abort']);
      throw new Error(`푸시 거부 뒤 pull --rebase도 실패(다른 PC가 같은 데이터를 바꿨을 수 있음): ${pull.out.trim().split('\n').slice(-2).join(' / ').slice(0, 300)}`);
    }
    push = await run(['push']);
    if (push.code !== 0) throw new Error(`푸시 실패: ${push.out.trim().split('\n').slice(-2).join(' / ').slice(0, 300)}`);
  }
  return {committed: files.length, pushed: true};
}
