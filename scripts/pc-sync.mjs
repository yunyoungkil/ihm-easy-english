#!/usr/bin/env node
// PC 2대가 그림·영상·음성 재료와 에이전트 대화 기록을 구글 드라이브로 나눈다(2026-11-24 사용자 결정).
// 문제: 한 PC에서 만든 재료가 그 PC에만 있어 다른 PC에서 이어서 못 만들었고(EP32~35),
//       인수인계 요약은 대화의 일부만 전해 다른 PC에서 자료와 맥락을 처음부터 다시 찾아야 했다.
// 원칙:
//  - git이 나르는 파일(추적 파일)은 건드리지 않는다. 글은 git, 그림·영상·음성은 드라이브.
//  - 지우기는 옮기지 않는다. 같은 파일은 늦게 고친 쪽이 이긴다.
//  - 프로젝트 폴더와 대화 프로그램 폴더를 드라이브에 직접 넣지 않고 사본만 오간다(동기화 폴더 안의 .git·대화 기록이 깨지는 사례).
// 쓰는 법: npm run pc-sync (받기+올리기+대화 사본), node scripts/pc-sync.mjs status
// 10분마다 자동 실행(작업 스케줄러)과 대화 시작 때 실행(시작 훅·npm run briefing)은 이 파일이 스스로 맞춘다.

import {execFileSync, spawn} from 'node:child_process';
import {createReadStream, existsSync, mkdirSync, readFileSync, statfsSync, writeFileSync} from 'node:fs';
import {copyFile, mkdir, readdir, readFile, rename, stat, unlink, utimes, writeFile} from 'node:fs/promises';
import {homedir, hostname, tmpdir} from 'node:os';
import {basename, dirname, extname, join} from 'node:path';
import {createInterface} from 'node:readline';
import {fileURLToPath, pathToFileURL} from 'node:url';

const projectDir = dirname(dirname(fileURLToPath(import.meta.url)));

export const SYNC_FOLDER = 'ihm-easy-english-sync';
export const TASK_NAME = 'ihm-easy-english PC sync';
const TMP_SUFFIX = '.pcsync-tmp';
const MTIME_TOLERANCE_MS = 2000; // allow-literal: 파일 시스템마다 수정 시각 정밀도가 달라 2초 안 차이는 같은 파일로 본다
const MIN_FREE_BYTES = 10 * 1024 ** 3; // allow-literal: 받기 때문에 이 PC 하드디스크가 10GB 아래로 내려가면 멈춘다(221GB 노트북, 2026-11-24)
const LOCK_STALE_MS = 30 * 60 * 1000; // allow-literal: 30분 넘은 잠금은 죽은 실행이 남긴 것으로 본다

export const MEDIA_EXTS = new Set([
  '.png', '.jpg', '.jpeg', '.webp', '.gif', '.avif', '.bmp', '.tif', '.tiff', '.heic', '.psd', '.pdf',
  '.mp4', '.mov', '.webm', '.mkv', '.m4v', '.avi',
  '.mp3', '.wav', '.m4a', '.aac', '.ogg', '.oga', '.flac', '.opus',
]);
// 생성 도구가 재료 옆에 남기는 기록(프롬프트, 실측 발화 시각). 재료와 같이 다닌다.
const SIDECAR_SUFFIXES = ['.prompt.json', '.words.json'];
const SKIP_DIRS = new Set(['node_modules', '.git', '.hyperframes', '.thumbnails', '.waveform-cache', '.whisper-scratch', '.media', 'scratch', 'tmp']);

// 나르는 곳. mediaOnly면 그림·영상·음성과 생성 기록만, 아니면 폴더 안 전부(참고 자료·음악 모음).
export const SYNC_ROOTS = [
  {rel: 'videos', mediaOnly: true},
  {rel: 'output/upload-packages', mediaOnly: true},
  {rel: 'public/reference', mediaOnly: false},
  {rel: 'public/audio/BGM 35', mediaOnly: false},
  {rel: 'public/fonts/google', mediaOnly: false},
  {rel: 'output/blog/images', mediaOnly: false}, // 블로그 대표 그림과 hero.json(2026-11-27)
  {rel: 'output/blog/logs', mediaOnly: false}, // 블로그 글쓰기 과정 기록, 다른 PC에서 실패 원인을 보려고(2026-11-27)
];

export function isMediaFile(name) {
  const lower = name.toLowerCase();
  return MEDIA_EXTS.has(extname(lower)) || SIDECAR_SUFFIXES.some((s) => lower.endsWith(s));
}

/** relPath는 프로젝트 기준 '/' 경로. tracked는 git이 나르는 파일 집합. */
export function shouldSyncFile(relPath, {mediaOnly, tracked}) {
  if (tracked?.has(relPath)) return false;
  const parts = relPath.split('/');
  const name = parts[parts.length - 1];
  if (name.endsWith(TMP_SUFFIX) || name === 'desktop.ini' || name.startsWith('~$')) return false;
  if (parts.slice(0, -1).some((p) => SKIP_DIRS.has(p))) return false;
  return mediaOnly ? isMediaFile(name) : true;
}

/** 한 방향 복사 계획. src·dst는 rel → {size, mtimeMs}. 없거나 src가 2초 넘게 새로우면 복사. */
export function planCopies(src, dst) {
  const plan = [];
  for (const [rel, s] of src) {
    const d = dst.get(rel);
    if (!d) plan.push({rel, reason: 'new'});
    else if (s.mtimeMs - d.mtimeMs > MTIME_TOLERANCE_MS) plan.push({rel, reason: 'newer'});
  }
  return plan;
}

/** 구글 드라이브 '내 드라이브' 폴더를 찾는다. 스트리밍(가상 드라이브)과 미러링(사용자 폴더) 둘 다. */
export function findMyDrive({env = process.env, exists = existsSync, home = homedir(), configPath = defaultConfigPath()} = {}) {
  if (env.IHM_PC_SYNC_DRIVE && exists(env.IHM_PC_SYNC_DRIVE)) return env.IHM_PC_SYNC_DRIVE;
  try {
    const cfg = JSON.parse(readFileSync(configPath, 'utf8'));
    if (cfg.myDrive && exists(cfg.myDrive)) return cfg.myDrive;
  } catch { /* 설정 파일은 없어도 된다 */ }
  const names = ['내 드라이브', 'My Drive'];
  const letters = 'GHIJKLMNOPQRSTUVWXYZDEF'.split('');
  for (const l of letters) for (const n of names) {
    const p = `${l}:\\${n}`;
    if (exists(p)) return p;
  }
  for (const n of names) for (const base of [home, join(home, 'Google Drive')]) {
    const p = join(base, n);
    if (exists(p)) return p;
  }
  return null;
}

function defaultConfigPath() {
  return join(stateDir(), 'config.json');
}

function stateDir() {
  return join(process.env.LOCALAPPDATA || join(homedir(), '.local', 'state'), 'ihm-pc-sync');
}

function trackedFiles(dir) {
  try {
    const out = execFileSync('git', ['ls-files', '-z'], {cwd: dir, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, windowsHide: true});
    return new Set(out.split('\0').filter(Boolean));
  } catch {
    return null; // git이 없으면 아무것도 나르지 않는다(추적 파일을 덮어쓸 위험)
  }
}

async function walk(rootAbs, relBase, filter, out = new Map()) {
  let entries;
  try {
    entries = await readdir(rootAbs, {withFileTypes: true});
  } catch {
    return out;
  }
  for (const e of entries) {
    if (e.isSymbolicLink()) continue;
    const rel = relBase ? `${relBase}/${e.name}` : e.name;
    const abs = join(rootAbs, e.name);
    if (e.isDirectory()) {
      if (SKIP_DIRS.has(e.name)) continue;
      await walk(abs, rel, filter, out);
    } else if (e.isFile() && filter(rel)) {
      try {
        const s = await stat(abs);
        out.set(rel, {size: s.size, mtimeMs: s.mtimeMs});
      } catch { /* 사이에 지워진 파일 */ }
    }
  }
  return out;
}

async function copyPreservingTime(from, to, mtimeMs) {
  await mkdir(dirname(to), {recursive: true});
  const tmp = to + TMP_SUFFIX;
  await copyFile(from, tmp);
  await rename(tmp, to);
  const t = new Date(mtimeMs);
  await utimes(to, t, t);
}

function freeBytes(dir) {
  try {
    const s = statfsSync(dir);
    return s.bavail * s.bsize;
  } catch {
    return Infinity;
  }
}

/** 프로젝트 재료를 드라이브와 맞춘다. direction: 'push' | 'pull' */
export async function syncFiles({direction, project = projectDir, remoteRoot, tracked, minFree = MIN_FREE_BYTES, log = () => {}}) {
  const result = {copied: 0, bytes: 0, skippedForSpace: 0, errors: []};
  for (const root of SYNC_ROOTS) {
    const local = join(project, ...root.rel.split('/'));
    const remote = join(remoteRoot, 'files', ...root.rel.split('/'));
    const filter = (rel) => shouldSyncFile(`${root.rel}/${rel}`, {mediaOnly: root.mediaOnly, tracked});
    const [localFiles, remoteFiles] = await Promise.all([walk(local, '', filter), walk(remote, '', filter)]);
    const [from, to, fromMap, toMap] = direction === 'push' ? [local, remote, localFiles, remoteFiles] : [remote, local, remoteFiles, localFiles];
    for (const {rel} of planCopies(fromMap, toMap)) {
      const meta = fromMap.get(rel);
      if (direction === 'pull' && freeBytes(project) - meta.size < minFree) {
        result.skippedForSpace++;
        continue;
      }
      try {
        await copyPreservingTime(join(from, ...rel.split('/')), join(to, ...rel.split('/')), meta.mtimeMs);
        result.copied++;
        result.bytes += meta.size;
        log(`${direction} ${root.rel}/${rel}`);
      } catch (err) {
        result.errors.push(`${root.rel}/${rel}: ${err.message}`);
      }
    }
  }
  return result;
}

// ---------- 비밀 파일 공유 (2026-11-27 사용자: 모든 데이터는 드라이브에 있어야 어느 PC에서든 작업된다) ----------
// git에도 미디어 폴더에도 안 실리는 파일이 한 PC에만 있어 다른 PC에서 블로그 무인 실행이 안 됐다.
// 값은 로그·출력·오류 문구에 절대 쓰지 않는다(파일 이름·키 이름·개수만).

export const SECRET_FILES = ['.env', '.blogger-oauth-token.json', '.youtube-oauth-token.json'];
const SECRET_BACKUP_KEEP = 5; // allow-literal: 덮어쓰기 전 백업은 파일마다 최근 5개만 남긴다
const ENV_LINE = /^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_.-]*)\s*=(.*)$/;

function parseEnvLine(line) {
  const raw = line.replace(/\r$/, '');
  const m = ENV_LINE.exec(raw);
  return m ? {key: m[1], value: m[2].trim(), raw} : null;
}

/** .env 텍스트의 KEY 목록(값은 돌려주지 않는다). */
export function envKeys(text) {
  const keys = new Set();
  for (const line of String(text).split(/\r?\n/)) {
    const p = parseEnvLine(line);
    if (p) keys.add(p.key);
  }
  return [...keys];
}

/**
 * 로컬 .env 텍스트를 바탕으로 드라이브 쪽 KEY=VALUE 줄을 합친다(키 합집합).
 * 같은 키에 값이 다르면 localNewer가 true일 때 로컬 값, 아니면 드라이브 값. 한쪽에만 있는 키는 살린다.
 * 주석·빈 줄·순서는 로컬 텍스트 그대로, 로컬에 없던 키는 끝에 붙인다.
 * receivedKeys: 로컬에 새로 들어온 키(없던 키 + 값을 드라이브 것으로 바꾼 키), sentKeys: 드라이브에 없거나 값이 다른데 로컬이 이긴 키.
 */
export function mergeEnvText(localText, remoteText, {localNewer = true} = {}) {
  const eol = String(localText).includes('\r\n') ? '\r\n' : '\n';
  const lines = String(localText).split(/\r?\n/);
  const localIdx = new Map();
  const localVal = new Map();
  lines.forEach((l, i) => {
    const p = parseEnvLine(l);
    if (p) {
      localIdx.set(p.key, i);
      localVal.set(p.key, p.value);
    }
  });
  const remoteLine = new Map();
  const remoteVal = new Map();
  for (const l of String(remoteText).split(/\r?\n/)) {
    const p = parseEnvLine(l);
    if (p) {
      remoteLine.set(p.key, p.raw);
      remoteVal.set(p.key, p.value);
    }
  }
  const receivedKeys = [];
  const sentKeys = [];
  const appended = [];
  for (const [key, rv] of remoteVal) {
    if (!localVal.has(key)) {
      receivedKeys.push(key);
      appended.push(remoteLine.get(key));
    } else if (localVal.get(key) !== rv) {
      if (localNewer) sentKeys.push(key);
      else {
        receivedKeys.push(key);
        lines[localIdx.get(key)] = remoteLine.get(key);
      }
    }
  }
  for (const key of localVal.keys()) if (!remoteVal.has(key)) sentKeys.push(key);
  if (appended.length) {
    if (lines.length && lines[lines.length - 1] === '') lines.splice(lines.length - 1, 0, ...appended);
    else lines.push(...appended);
  }
  return {text: lines.join(eol), receivedKeys, sentKeys};
}

function isValidJson(text) {
  try {
    JSON.parse(text);
    return true;
  } catch {
    return false;
  }
}

async function statOrNull(p) {
  try {
    return await stat(p);
  } catch {
    return null;
  }
}

/** 로컬 파일을 덮어쓰기 전에 프로젝트 밖에 백업하고 파일마다 최근 SECRET_BACKUP_KEEP개만 남긴다. */
async function backupSecret(localPath, name, backupDir) {
  await mkdir(backupDir, {recursive: true});
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  await copyFile(localPath, join(backupDir, `${name}.${stamp}`));
  const mine = (await readdir(backupDir)).filter((f) => f.startsWith(`${name}.`)).sort();
  for (const old of mine.slice(0, Math.max(0, mine.length - SECRET_BACKUP_KEEP))) {
    try {
      await unlink(join(backupDir, old));
    } catch { /* 이미 지워진 백업 */ }
  }
}

const errCode = (err) => (err && err.code ? String(err.code) : '실패'); // 오류 문구에 파일 내용이 섞이지 않게 코드만 쓴다

/**
 * .env와 OAuth 토큰을 드라이브 secrets/ 폴더와 맞춘다. 반환값에도 값은 없다.
 * received/sent: 파일 단위로 받은·올린 파일 이름, envReceivedKeys/envSentKeys: .env 키 이름.
 */
export async function syncSecrets({project = projectDir, remoteRoot, backupDir = join(stateDir(), 'secrets-backup'), log = () => {}}) {
  const result = {received: [], sent: [], envReceivedKeys: [], envSentKeys: [], skippedInvalid: [], errors: []};
  for (const name of SECRET_FILES) {
    const localPath = join(project, name);
    const remotePath = join(remoteRoot, 'secrets', name);
    try {
      const [l, r] = await Promise.all([statOrNull(localPath), statOrNull(remotePath)]);
      if (!l && !r) continue;
      const isEnv = name === '.env';
      if (!l || !r) {
        const [srcPath, dstPath, srcStat, toLocal] = l ? [localPath, remotePath, l, false] : [remotePath, localPath, r, true];
        if (!isEnv && !isValidJson(await readFile(srcPath, 'utf8'))) {
          result.skippedInvalid.push(name);
          log(`${name}: JSON이 깨져 있어 복사하지 않음`);
          continue;
        }
        await copyPreservingTime(srcPath, dstPath, srcStat.mtimeMs);
        (toLocal ? result.received : result.sent).push(name);
        log(`${name}: ${toLocal ? '드라이브에서 받음' : '드라이브로 올림'}(파일 통째)`);
        continue;
      }
      const [localText, remoteText] = await Promise.all([readFile(localPath, 'utf8'), readFile(remotePath, 'utf8')]);
      if (localText === remoteText) continue;
      if (isEnv) {
        const localNewer = l.mtimeMs >= r.mtimeMs;
        const m = mergeEnvText(localText, remoteText, {localNewer});
        if (m.receivedKeys.length) {
          await backupSecret(localPath, name, backupDir);
          await writeFile(localPath, m.text);
          result.envReceivedKeys.push(...m.receivedKeys);
          log(`${name} 키 ${m.receivedKeys.length}개 받음(${m.receivedKeys.join(', ')})`);
        }
        if (m.sentKeys.length) {
          await writeFile(remotePath, mergeEnvText(remoteText, localText, {localNewer: !localNewer}).text);
          result.envSentKeys.push(...m.sentKeys);
          log(`${name} 키 ${m.sentKeys.length}개 올림(${m.sentKeys.join(', ')})`);
        }
        continue;
      }
      const diff = l.mtimeMs - r.mtimeMs;
      if (Math.abs(diff) <= MTIME_TOLERANCE_MS) continue;
      const fromLocal = diff > 0;
      if (!isValidJson(fromLocal ? localText : remoteText)) {
        result.skippedInvalid.push(name);
        log(`${name}: ${fromLocal ? '이 PC' : '드라이브'} 쪽 JSON이 깨져 있어 복사하지 않음`);
        continue;
      }
      if (fromLocal) {
        await copyPreservingTime(localPath, remotePath, l.mtimeMs);
        result.sent.push(name);
        log(`${name}: 드라이브로 올림(이 PC가 더 새로움)`);
      } else {
        await backupSecret(localPath, name, backupDir);
        await copyPreservingTime(remotePath, localPath, r.mtimeMs);
        result.received.push(name);
        log(`${name}: 드라이브에서 받음(드라이브가 더 새로움)`);
      }
    } catch (err) {
      result.errors.push(`${name}: ${errCode(err)}`);
    }
  }
  return result;
}

/** status용 한 줄: 파일 이름·개수만. */
async function secretsStatusLine(project, remoteRoot) {
  const describe = async (dir) => {
    let keys = null;
    let tokens = 0;
    for (const name of SECRET_FILES) {
      try {
        if (name === '.env') keys = envKeys(await readFile(join(dir, name), 'utf8')).length;
        else if (await statOrNull(join(dir, name))) tokens++;
      } catch { /* 없는 파일 */ }
    }
    const tokenTotal = SECRET_FILES.length - 1;
    return `.env(${keys === null ? '없음' : `키 ${keys}개`}) · 토큰 ${tokens === tokenTotal ? `${tokenTotal}개 있음` : tokens === 0 ? '없음' : `${tokens}/${tokenTotal}개`}`;
  };
  return `비밀 파일: 드라이브 ${await describe(join(remoteRoot, 'secrets'))} / 이 PC ${await describe(project)}`;
}

// ---------- 대화 기록 사본 ----------

const KST = 9 * 60 * 60 * 1000; // allow-literal: 한국 시간(UTC+9)
function kst(iso) {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return '';
  return new Date(t + KST).toISOString().slice(0, 16).replace('T', ' ');
}

function oneLine(s, n) {
  const t = String(s ?? '').replace(/\s+/g, ' ').trim();
  return t.length > n ? `${t.slice(0, n)}…` : t;
}

function stripReminders(text) {
  return String(text).replace(/<system-reminder>[\s\S]*?<\/system-reminder>/g, '').trim();
}

function toolLine(name, input = {}) {
  if (name === 'AskUserQuestion' && Array.isArray(input.questions)) {
    return input.questions.map((q) => `- (질문 창) ${q.question} — 보기: ${(q.options || []).map((o) => o.label).join(' / ')}`).join('\n');
  }
  const hint = input.description || input.command || input.file_path || input.pattern || input.query || input.prompt || input.url || input.skill || input.action || '';
  return `- (도구) ${name}${hint ? `: ${oneLine(hint, 160)}` : ''}`;
}

/** 도구 한 줄마다 "AI" 제목이 반복되지 않게, 바로 앞이 AI 절이면 그 아래에 잇는다. */
function pushAi(lines, out) {
  if (!out.length) return;
  const last = lines.length - 1;
  if (last >= 0 && lines[last].startsWith('### AI\n')) lines[last] += `\n${out.join('\n')}`;
  else lines.push(`### AI\n${out.join('\n')}`);
}

function textOf(content) {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) return content.filter((p) => p && p.type === 'text').map((p) => p.text).join('\n');
  return '';
}

/**
 * 클로드 코드 대화(jsonl 줄 단위)를 사람 말과 AI 답만 남긴 글로 바꾼다.
 * 사용자 글·붙여 넣은 자료·질문 창 답은 그대로, AI 글은 그대로, 도구 사용은 한 줄씩. 생각 과정과 도구 출력은 뺀다.
 * 대용량 jsonl(512MB 초과)에서도 V8 문자열 길이 제한에 걸리지 않도록 줄 단위로 처리한다.
 */
function createClaudeSlimmer({id = '', pc = ''} = {}) {
  const toolNames = new Map();
  const lines = [];
  const images = [];
  let firstRequest = '';
  let lastRequest = '';
  let start = '';
  let end = '';
  let userTurns = 0;
  return {
    push(e) {
      if (!e || e.isSidechain || !e.message) return;
      const content = e.message.content;
      if (e.timestamp) {
        start ||= e.timestamp;
        end = e.timestamp;
      }
      if (e.type === 'assistant' && Array.isArray(content)) {
        const out = [];
        for (const p of content) {
          if (p.type === 'text' && p.text?.trim()) out.push(p.text.trim());
          else if (p.type === 'tool_use') {
            toolNames.set(p.id, p.name);
            out.push(toolLine(p.name, p.input));
          }
        }
        pushAi(lines, out);
      } else if (e.type === 'user') {
        if (Array.isArray(content) && content.some((p) => p.type === 'tool_result')) {
          for (const p of content) {
            if (p.type !== 'tool_result' || toolNames.get(p.tool_use_id) !== 'AskUserQuestion') continue;
            const ans = stripReminders(textOf(p.content));
            if (ans) lines.push(`### 사용자 답 (질문 창) · ${kst(e.timestamp)}\n${ans}`);
          }
          return;
        }
        const text = stripReminders(textOf(content));
        const pics = [];
        if (Array.isArray(content)) {
          for (const p of content) {
            if (p.type === 'image' && p.source?.type === 'base64' && p.source.data) {
              const ext = (p.source.media_type || 'image/png').split('/')[1].replace('jpeg', 'jpg');
              const name = `img-${images.length + 1}.${ext}`;
              images.push({name, data: p.source.data});
              pics.push(name);
            }
          }
        }
        if (!text && !pics.length) return;
        userTurns++;
        firstRequest ||= text;
        if (text) lastRequest = text;
        const picLine = pics.length ? `\n(붙인 그림: ${pics.map((n) => `${id}-files/${n}`).join(', ')})` : '';
        lines.push(`### 사용자 · ${kst(e.timestamp)}\n${text}${picLine}`);
      }
    },
    finish() {
      const header = [
        `# 클로드 코드 대화 ${id}`,
        `- PC: ${pc} · 시작 ${kst(start)} · 끝 ${kst(end)} (한국 시간) · 사용자 말 ${userTurns}번`,
        `- 첫 요청: ${oneLine(firstRequest, 200)}`,
        '',
      ].join('\n');
      return {markdown: `${header}\n${lines.join('\n\n')}\n`, firstRequest, lastRequest, start, end, userTurns, images};
    },
  };
}

export function slimClaudeTranscript(entries, opts = {}) {
  const slimmer = createClaudeSlimmer(opts);
  for (const e of entries) slimmer.push(e);
  return slimmer.finish();
}

function userRequestText(content) {
  const s = String(content ?? '');
  const m = s.match(/<USER_REQUEST>([\s\S]*?)<\/USER_REQUEST>/);
  const body = m ? m[1] : s;
  return body.replace(/<ADDITIONAL_METADATA>[\s\S]*?<\/ADDITIONAL_METADATA>/g, '').replace(/<USER_SETTINGS_CHANGE>[\s\S]*?<\/USER_SETTINGS_CHANGE>/g, '').trim();
}

function unquote(v) {
  const s = String(v ?? '');
  return s.length > 1 && s.startsWith('"') && s.endsWith('"') ? s.slice(1, -1) : s;
}

/**
 * 안티그래비티 대화(brain/<id>/.system_generated/logs/transcript.jsonl 줄 단위)를 글로 바꾼다.
 * USER_INPUT은 그대로, PLANNER_RESPONSE의 content는 AI 글, tool_calls는 한 줄씩. 도구 출력(GENERIC)·시스템은 뺀다.
 */
function createAntigravitySlimmer({id = '', pc = ''} = {}) {
  const lines = [];
  const media = [];
  let firstRequest = '';
  let lastRequest = '';
  let start = '';
  let end = '';
  let userTurns = 0;
  return {
    push(e) {
      if (!e) return;
      if (e.created_at) {
        start ||= e.created_at;
        end = e.created_at;
      }
      if (e.type === 'USER_INPUT') {
        const text = userRequestText(e.content);
        const pics = (e.media || []).map((m) => m.uri).filter(Boolean);
        media.push(...pics);
        if (!text && !pics.length) return;
        userTurns++;
        firstRequest ||= text;
        if (text) lastRequest = text;
        const picLine = pics.length ? `\n(붙인 파일: ${pics.map((u) => `${id}-files/${basename(decodeURIComponent(u))}`).join(', ')})` : '';
        lines.push(`### 사용자 · ${kst(e.created_at)}\n${text}${picLine}`);
      } else if (e.type === 'PLANNER_RESPONSE') {
        const out = [];
        if (e.content?.trim()) out.push(e.content.trim());
        for (const c of e.tool_calls || []) {
          const a = c.args || {};
          const hint = unquote(a.toolSummary) || unquote(a.CommandLine) || unquote(Object.values(a).find((v) => typeof v === 'string'));
          out.push(`- (도구) ${c.name}${hint ? `: ${oneLine(hint, 160)}` : ''}`);
        }
        pushAi(lines, out);
      }
    },
    finish() {
      const header = [
        `# 안티그래비티 대화 ${id}`,
        `- PC: ${pc} · 시작 ${kst(start)} · 끝 ${kst(end)} (한국 시간) · 사용자 말 ${userTurns}번`,
        `- 첫 요청: ${oneLine(firstRequest, 200)}`,
        '',
      ].join('\n');
      return {markdown: `${header}\n${lines.join('\n\n')}\n`, firstRequest, lastRequest, start, end, userTurns, media};
    },
  };
}

export function slimAntigravityTranscript(entries, opts = {}) {
  const slimmer = createAntigravitySlimmer(opts);
  for (const e of entries) slimmer.push(e);
  return slimmer.finish();
}

/** jsonl 파일을 한 줄씩 스트리밍해 읽는다(512MB 이상 대용량 파일의 V8 문자열 길이 초과 방지). */
async function readJsonlStream(filePath, onEntry, onRawLine) {
  const rl = createInterface({input: createReadStream(filePath, {encoding: 'utf8'}), crlfDelay: Infinity});
  for await (const line of rl) {
    if (!line.trim()) continue;
    if (onRawLine) onRawLine(line);
    try {
      onEntry(JSON.parse(line));
    } catch { /* 쓰다 만 마지막 줄이나 비정상 줄 */ }
  }
}

async function isUpToDate(outPath, srcMtimeMs) {
  try {
    return (await stat(outPath)).mtimeMs >= srcMtimeMs;
  } catch {
    return false;
  }
}

export function claudeProjectKey(dir) {
  return dir.replace(/[:\\/.]/g, '-');
}

async function exportClaude({chatsRoot, pc, project, claudeHome}) {
  const base = join(claudeHome, 'projects');
  let dirs = [];
  try {
    dirs = await readdir(base);
  } catch {
    return [];
  }
  const key = claudeProjectKey(project).toLowerCase();
  const dir = dirs.find((d) => d.toLowerCase() === key);
  if (!dir) return [];
  const outDir = join(chatsRoot, 'claude', pc);
  const rows = [];
  for (const f of (await readdir(join(base, dir))).filter((n) => n.endsWith('.jsonl'))) {
    const src = join(base, dir, f);
    const id = f.replace(/\.jsonl$/, '');
    const s = await stat(src);
    const metaPath = join(outDir, 'meta', `${id}.json`);
    if (await isUpToDate(metaPath, s.mtimeMs)) {
      try {
        rows.push(JSON.parse(await readFile(metaPath, 'utf8')));
        continue;
      } catch { /* 다시 만든다 */ }
    }
    const slimmer = createClaudeSlimmer({id, pc});
    await readJsonlStream(src, (e) => slimmer.push(e));
    const slim = slimmer.finish();
    if (!slim.userTurns) continue;
    const day = kst(slim.start).slice(0, 10);
    const mdName = `${day}-${id}.md`;
    await mkdir(join(outDir, 'raw'), {recursive: true});
    await mkdir(join(outDir, 'meta'), {recursive: true});
    await writeFile(join(outDir, mdName), slim.markdown);
    for (const img of slim.images) {
      await mkdir(join(outDir, `${id}-files`), {recursive: true});
      await writeFile(join(outDir, `${id}-files`, img.name), Buffer.from(img.data, 'base64'));
    }
    await copyFile(src, join(outDir, 'raw', f));
    const row = {ai: '클로드 코드', pc, id, start: slim.start, end: slim.end, userTurns: slim.userTurns, first: oneLine(slim.firstRequest, 90), last: oneLine(slim.lastRequest, 90), file: `claude/${pc}/${mdName}`};
    await writeFile(metaPath, JSON.stringify(row));
    rows.push(row);
  }
  return rows;
}

async function exportAntigravity({chatsRoot, pc, geminiHome, projectMarker}) {
  const brain = join(geminiHome, 'antigravity', 'brain');
  let ids = [];
  try {
    ids = await readdir(brain);
  } catch {
    return [];
  }
  const outDir = join(chatsRoot, 'antigravity', pc);
  const rows = [];
  for (const id of ids) {
    const convDir = join(brain, id);
    const src = join(convDir, '.system_generated', 'logs', 'transcript.jsonl');
    if (!existsSync(src)) continue;
    const s = await stat(src);
    const metaPath = join(outDir, 'meta', `${id}.json`);
    if (await isUpToDate(metaPath, s.mtimeMs)) {
      try {
        rows.push(JSON.parse(await readFile(metaPath, 'utf8')));
        continue;
      } catch { /* 다시 만든다 */ }
    }
    let matched = false;
    const slimmer = createAntigravitySlimmer({id, pc});
    await readJsonlStream(src, (e) => slimmer.push(e), (line) => {
      if (!matched && line.includes(projectMarker)) matched = true;
    });
    if (!matched) continue; // 다른 작업 공간의 대화는 나르지 않는다
    const slim = slimmer.finish();
    if (!slim.userTurns) continue;
    const day = kst(slim.start).slice(0, 10);
    const mdName = `${day}-${id}.md`;
    const filesDir = join(outDir, `${id}-files`);
    await mkdir(join(outDir, 'raw'), {recursive: true});
    await mkdir(join(outDir, 'meta'), {recursive: true});
    await writeFile(join(outDir, mdName), slim.markdown);
    // 대화에 붙인 파일, 사용자가 올린 파일, 대화 중 만든 그림
    const extra = [];
    for (const uri of slim.media) {
      try {
        extra.push(fileURLToPath(uri));
      } catch { /* file: 주소가 아니면 건너뛴다 */ }
    }
    for (const sub of ['.user_uploaded', '']) {
      try {
        for (const n of await readdir(join(convDir, sub))) if (isMediaFile(n)) extra.push(join(convDir, sub, n));
      } catch { /* 없으면 건너뛴다 */ }
    }
    for (const p of extra) {
      if (!existsSync(p)) continue;
      await mkdir(filesDir, {recursive: true});
      const to = join(filesDir, basename(p));
      if (!existsSync(to)) await copyFile(p, to);
    }
    const full = join(convDir, '.system_generated', 'logs', 'transcript_full.jsonl');
    await copyFile(existsSync(full) ? full : src, join(outDir, 'raw', `${id}.jsonl`));
    const row = {ai: '안티그래비티', pc, id, start: slim.start, end: slim.end, userTurns: slim.userTurns, first: oneLine(slim.firstRequest, 90), last: oneLine(slim.lastRequest, 90), file: `antigravity/${pc}/${mdName}`};
    await writeFile(metaPath, JSON.stringify(row));
    rows.push(row);
  }
  return rows;
}

export function renderChatIndex(rows, pc) {
  const sorted = [...rows].sort((a, b) => String(b.start).localeCompare(String(a.start)));
  const esc = (s) => String(s).replace(/\|/g, '\\|');
  return [
    `# ${pc} 대화 목록 (새것부터)`,
    '',
    '다른 PC에서 시작한 주제를 이어 갈 때: 이 목록에서 대화를 찾고, 대화 파일에서 필요한 절만 grep으로 읽는다(통째로 읽지 않는다).',
    '',
    '| 시작 (한국 시간) | AI | 사용자 말 | 첫 요청 | 마지막 요청 | 대화 파일 |',
    '|---|---|---|---|---|---|',
    ...sorted.map((r) => `| ${kst(r.start)} | ${r.ai} | ${r.userTurns} | ${esc(r.first)} | ${esc(r.last)} | ${r.file} |`),
    '',
  ].join('\n');
}

export async function exportChats({remoteRoot, pc = hostname(), project = projectDir, claudeHome = join(homedir(), '.claude'), geminiHome = join(homedir(), '.gemini')}) {
  const chatsRoot = join(remoteRoot, 'chats');
  await mkdir(chatsRoot, {recursive: true});
  const projectMarker = basename(project);
  const rows = [
    ...(await exportClaude({chatsRoot, pc, project, claudeHome})),
    ...(await exportAntigravity({chatsRoot, pc, geminiHome, projectMarker})),
  ];
  await writeFile(join(chatsRoot, `INDEX-${pc}.md`), renderChatIndex(rows, pc));
  return rows.length;
}

// ---------- 실행 관리 ----------

function acquireLock() {
  const lock = join(tmpdir(), 'ihm-pc-sync.lock');
  try {
    const cur = JSON.parse(readFileSync(lock, 'utf8'));
    let alive = false;
    try {
      process.kill(cur.pid, 0);
      alive = true;
    } catch { /* 끝난 실행 */ }
    if (alive && Date.now() - cur.at < LOCK_STALE_MS) return null;
  } catch { /* 잠금 없음 */ }
  writeFileSync(lock, JSON.stringify({pid: process.pid, at: Date.now()}));
  return () => unlink(lock).catch(() => {});
}

function scheduleInstalled() {
  try {
    execFileSync('schtasks', ['/Query', '/TN', TASK_NAME], {stdio: 'ignore', windowsHide: true});
    return true;
  } catch {
    return false;
  }
}

/** 10분마다 창 없이 도는 작업을 이 PC에 만든다(관리자 권한 필요 없음). */
export function ensureSchedule({project = projectDir} = {}) {
  if (process.platform !== 'win32') return 'Windows가 아니라 자동 실행을 만들지 않음';
  if (scheduleInstalled()) return '자동 실행 있음';
  const dir = stateDir();
  mkdirSync(dir, {recursive: true});
  const vbs = join(dir, 'run-hidden.vbs');
  const q = (s) => s.replace(/"/g, '""');
  writeFileSync(vbs, [
    'Set sh = CreateObject("WScript.Shell")',
    `sh.CurrentDirectory = "${q(project)}"`,
    `sh.Run """${q(process.execPath)}"" ""${q(join(project, 'scripts', 'pc-sync.mjs'))}"" sync --quiet", 0, False`,
    '',
  ].join('\r\n'), 'utf8');
  execFileSync('schtasks', ['/Create', '/F', '/TN', TASK_NAME, '/SC', 'MINUTE', '/MO', '10', '/TR', `wscript.exe "${vbs}"`], {stdio: 'ignore', windowsHide: true});
  // schtasks로 만든 작업은 기본이 '전원 연결 중에만 실행'이라 노트북 배터리에서는 멈춘다(2026-11-24 이 PC에서 확인).
  // 배터리에서도 돌고, 잠자기에서 깨면 놓친 실행을 하고, 30분 넘게 걸리면 끊는다.
  try {
    execFileSync('powershell', ['-NoProfile', '-NonInteractive', '-Command',
      `$s = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable -MultipleInstances IgnoreNew -ExecutionTimeLimit (New-TimeSpan -Minutes 30); Set-ScheduledTask -TaskName '${TASK_NAME}' -Settings $s | Out-Null`,
    ], {stdio: 'ignore', windowsHide: true});
  } catch { /* 설정을 못 바꿔도 전원 연결 중에는 돈다 */ }
  return scheduleInstalled() ? '자동 실행 만듦(10분마다)' : '자동 실행 만들기 실패';
}

/** 시작 훅·브리핑이 부른다: 대화를 막지 않도록 뒤에서 받기·올리기를 한 번 돌린다. */
export function startBackgroundSync(project = projectDir) {
  try {
    spawn(process.execPath, [join(project, 'scripts', 'pc-sync.mjs'), 'sync', '--quiet', '--ensure-schedule'], {cwd: project, detached: true, stdio: 'ignore', windowsHide: true}).unref();
  } catch { /* 대화 시작은 막지 않는다 */ }
}

async function writeStatus(remoteRoot, pc, summary) {
  const dir = join(remoteRoot, 'status');
  await mkdir(dir, {recursive: true});
  await writeFile(join(dir, `${pc}.json`), JSON.stringify(summary, null, 2));
  const local = stateDir();
  await mkdir(local, {recursive: true});
  await writeFile(join(local, 'last-run.json'), JSON.stringify(summary, null, 2));
}

async function readStatuses(remoteRoot) {
  const dir = join(remoteRoot, 'status');
  const out = [];
  try {
    for (const f of await readdir(dir)) {
      if (!f.endsWith('.json')) continue;
      try {
        out.push(JSON.parse(await readFile(join(dir, f), 'utf8')));
      } catch { /* 올리는 중인 파일 */ }
    }
  } catch { /* 아직 없음 */ }
  return out;
}

const fmtBytes = (b) => (b >= 1024 ** 3 ? `${(b / 1024 ** 3).toFixed(2)}GB` : `${(b / 1024 ** 2).toFixed(1)}MB`);

async function main(argv) {
  const cmd = argv.find((a) => !a.startsWith('--')) || 'sync';
  const quiet = argv.includes('--quiet');
  const say = (m) => {
    if (!quiet) console.log(m);
  };
  const myDrive = findMyDrive();
  if (!myDrive) {
    say('구글 드라이브의 "내 드라이브" 폴더를 찾지 못했습니다. 드라이브 프로그램이 켜져 있는지 확인하거나 IHM_PC_SYNC_DRIVE로 경로를 알려 주세요.');
    process.exitCode = quiet ? 0 : 1;
    return;
  }
  const remoteRoot = join(myDrive, SYNC_FOLDER);
  const pc = hostname();

  if (cmd === 'status') {
    const all = await readStatuses(remoteRoot);
    say(`보관함: ${remoteRoot}`);
    for (const s of all) say(`- ${s.pc}: 마지막 실행 ${kst(s.at)} · 받기 ${s.pulled}개 · 올리기 ${s.pushed}개 · 대화 ${s.chats}개${s.errors ? ` · 오류 ${s.errors}개` : ''}`);
    say(`자동 실행(이 PC): ${scheduleInstalled() ? '있음' : '없음'}`);
    say(await secretsStatusLine(projectDir, remoteRoot));
    return;
  }
  if (cmd === 'install-schedule') {
    say(ensureSchedule());
    return;
  }
  if (cmd !== 'sync' && cmd !== 'pull' && cmd !== 'push' && cmd !== 'chats') {
    say('쓰는 법: node scripts/pc-sync.mjs [sync|pull|push|chats|status|install-schedule] [--quiet]');
    return;
  }

  const release = acquireLock();
  if (!release) {
    say('다른 받기·올리기가 이미 돌고 있어 이번에는 건너뜁니다.');
    return;
  }
  try {
    if (argv.includes('--ensure-schedule')) ensureSchedule();
    const tracked = trackedFiles(projectDir);
    if (!tracked) {
      say('git 추적 목록을 못 읽어 재료는 나르지 않습니다(추적 파일 보호).');
    }
    const log = quiet ? () => {} : (m) => console.log(`  ${m}`);
    const summary = {pc, at: new Date().toISOString(), pulled: 0, pushed: 0, chats: 0, skippedForSpace: 0, errors: 0, errorSamples: []};
    if (cmd === 'sync' || cmd === 'pull' || cmd === 'push') {
      // 비밀 단계가 실패해도 미디어 동기화는 막지 않는다. 값은 출력하지 않고 이름·개수만 남긴다.
      try {
        const s = await syncSecrets({remoteRoot, log});
        const parts = [];
        if (s.received.length) parts.push(`받음 ${s.received.join(', ')}`);
        if (s.sent.length) parts.push(`올림 ${s.sent.join(', ')}`);
        if (s.envReceivedKeys.length) parts.push(`.env 키 ${s.envReceivedKeys.length}개 받음`);
        if (s.envSentKeys.length) parts.push(`.env 키 ${s.envSentKeys.length}개 올림`);
        if (s.skippedInvalid.length) parts.push(`깨진 JSON이라 복사 안 함 ${s.skippedInvalid.join(', ')}`);
        say(`비밀 파일: ${parts.length ? parts.join(' · ') : '변화 없음'}`);
        summary.errors += s.errors.length;
        summary.errorSamples.push(...s.errors.slice(0, 5));
      } catch (err) {
        summary.errors++;
        summary.errorSamples.push(`비밀 파일 단계: ${err && err.code ? err.code : '실패'}`);
      }
    }
    if (tracked && (cmd === 'sync' || cmd === 'pull')) {
      const r = await syncFiles({direction: 'pull', remoteRoot, tracked, log});
      Object.assign(summary, {pulled: r.copied, skippedForSpace: r.skippedForSpace});
      summary.errors += r.errors.length;
      summary.errorSamples.push(...r.errors.slice(0, 5));
      say(`받기: ${r.copied}개 (${fmtBytes(r.bytes)})${r.skippedForSpace ? ` · 하드디스크 공간이 모자라 ${r.skippedForSpace}개 못 받음` : ''}`);
    }
    if (tracked && (cmd === 'sync' || cmd === 'push')) {
      const r = await syncFiles({direction: 'push', remoteRoot, tracked, log});
      summary.pushed = r.copied;
      summary.errors += r.errors.length;
      summary.errorSamples.push(...r.errors.slice(0, 5));
      say(`올리기: ${r.copied}개 (${fmtBytes(r.bytes)})`);
    }
    if (cmd === 'sync' || cmd === 'push' || cmd === 'chats') {
      summary.chats = await exportChats({remoteRoot, pc});
      say(`대화 사본: ${summary.chats}개 (목록: ${join(remoteRoot, 'chats', `INDEX-${pc}.md`)})`);
    }
    await writeStatus(remoteRoot, pc, summary);
    if (summary.errors) say(`오류 ${summary.errors}개: ${summary.errorSamples.join(' / ')}`);
  } finally {
    await release();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main(process.argv.slice(2));
}
