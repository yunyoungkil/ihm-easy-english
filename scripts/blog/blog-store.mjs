// 쿠팡 블로그 데이터 저장소. 모든 함수는 비동기(async)이고 dir(=<프로젝트>/data/blog)을 첫 인자로 받는다.
import {mkdir, readFile, writeFile} from 'node:fs/promises';
import path from 'node:path';

const FILES = {
  queue: 'tech-queue.json',
  posts: 'tech-posts.json',
  runs: 'tech-runs.json',
  pause: 'tech-paused.json',
};

const WEEKDAYS = {Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6};

/** 한국 시각 기준 'YYYY-MM-DD'. */
export function kstDate(now) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(now);
}

/** 한국 시각 기준 요일. 0=일요일 .. 6=토요일. */
export function kstWeekday(now) {
  const name = new Intl.DateTimeFormat('en-US', {timeZone: 'Asia/Seoul', weekday: 'short'}).format(now);
  return WEEKDAYS[name];
}

async function readJson(dir, file, fallback) {
  try {
    return JSON.parse(await readFile(path.join(dir, file), 'utf8'));
  } catch (err) {
    if (err.code === 'ENOENT') return fallback;
    throw err;
  }
}

async function writeJson(dir, file, value) {
  await mkdir(dir, {recursive: true});
  await writeFile(path.join(dir, file), JSON.stringify(value, null, 2) + '\n');
}

export async function readQueue(dir) {
  return readJson(dir, FILES.queue, []);
}

/** topicId가 같은 주제를 큐에서 뺀다. 없는 id면 파일을 건드리지 않는다. */
export async function shiftQueue(dir, topicId) {
  const queue = await readQueue(dir);
  const next = queue.filter((t) => t.topicId !== topicId);
  if (next.length === queue.length) return;
  await writeJson(dir, FILES.queue, next);
}

export async function readPosts(dir) {
  return readJson(dir, FILES.posts, []);
}

export async function appendPost(dir, record) {
  const posts = await readPosts(dir);
  posts.push(record);
  await writeJson(dir, FILES.posts, posts);
}

export async function readRuns(dir) {
  return readJson(dir, FILES.runs, []);
}

export async function appendRun(dir, record) {
  const runs = await readRuns(dir);
  runs.push(record);
  await writeJson(dir, FILES.runs, runs);
}

export async function readPause(dir) {
  return readJson(dir, FILES.pause, {paused: false});
}

export async function writePause(dir, reason, now) {
  await writeJson(dir, FILES.pause, {paused: true, since: now.toISOString(), reason});
}
