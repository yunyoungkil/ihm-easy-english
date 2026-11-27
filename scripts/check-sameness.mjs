#!/usr/bin/env node
// 같은 틀 반복 검사 + 제작 속도 계기판 (읽기 전용, 2026-11-15 방향 점검 결정 13번).
//
// 왜: 유튜브 수익 창출 정책은 서로 바꿔 끼워도 모를 영상·대량 생산처럼 보이는 템플릿 영상을 뺀다.
// knowledge/legacy/agents-archive-2026-11-27.md "같은 틀의 영상을 찍어 내지 않는다"는 규칙은 있었지만 재는 코드가 없었다.
// 이 스크립트는 숫자만 보여 준다. 파일을 쓰지 않고, 경고가 있어도 종료 코드는 0이다(기획·브리핑 때 보는 용도).
//
//   npm run check-sameness                          전체 요약
//   npm run check-sameness -- videos/<프로젝트>       그 편을 직전 편들과 비교
//   npm run check-sameness -- --title "새 제목" [--format shorts|longform]   새 제목 후보를 최근 5편과 비교
//   --json                                           사람용 표 대신 JSON
//   --until 2026-11-15T15:14:59+09:00                기준 시각(기본: 지금). 지난 점검 숫자를 다시 셀 때 쓴다.
//
// 재는 방식(모든 문턱은 가설이다. 근거는 각 상수 옆 주석):
// 1) 제목 틀: 해시태그·[칩]·이모지를 지우고 " | " 앞 문장만 본다. 따옴표 안 말 → {말}, 영어 단어 묶음 → {영어},
//    숫자 → {숫자}로 바꾸고, 바꾼 자리 바로 뒤 조사(과/와, 을/를, 이/가, 은/는, 으로/로)는 한 가지로 맞춘다.
//    두 틀이 글자까지 같으면 "같은 틀", 글자 2개씩 묶음 겹침(다이스 계수)이 문턱 이상이거나
//    앞 2어절과 끝 2어절이 모두 같으면 "비슷한 틀"이다.
// 2) 코드 같은 줄 비율: 줄마다 앞뒤 공백을 지우고 빈 줄은 뺀다(주석 줄은 센다 — 복사의 흔적이라서).
//    뒤 편의 줄 하나하나가 앞 편에 남은 같은 줄과 짝지어지면 "같은 줄"(같은 줄이 여러 번 있으면 그 횟수까지만).
//    비율 = 같은 줄 수 ÷ 뒤 편의 (빈 줄 뺀) 줄 수.
// 3) 장면 순서: index.html의 data-composition-src 파일 이름에서 앞 번호를 떼고(01-hook → hook),
//    두 편에서 같은 이름이 같은 순서로 나오는 가장 긴 줄(최장 공통 부분열)의 길이 ÷ 두 편 중 긴 쪽 장면 수.

import {execFileSync} from 'node:child_process';
import {existsSync, readFileSync, readdirSync, statSync} from 'node:fs';
import {dirname, join, basename} from 'node:path';
import {fileURLToPath} from 'node:url';
import {resolveVideoFormat} from './video-format.mjs';
import {loadSheets, referenceBiasWarnings, sheetIdOf} from './transform-sheet.mjs';

const projectDir = join(dirname(fileURLToPath(import.meta.url)), '..');
const DAY_MS = 24 * 60 * 60 * 1000;

// ---- 문턱(가설) -----------------------------------------------------------------------------
// 제목: 최근 5편과 비교한다(knowledge/legacy/agents-archive-2026-11-27.md "같은 틀의 영상을 찍어 내지 않는다" 절 3번, 시안을 보고할 때 최근 5편의 제목과 나란히).
export const TITLE_WINDOW = 5;
// 비슷한 틀 문턱 0.8: 실제 제목에서 한 어절만 다른 틀("J는 제이가 아닙니다?" / "K는 케이가 아닙니다?")이 0.8 위,
// 서로 다른 문장(EP23 "왜 두 글자인데 한 번만 낼까?" / EP24 "둘 다 {말}로 읽으셨나요?")은 0.3 아래였다.
export const TITLE_SIMILAR_MIN = 0.8;
// 코드: 점검 사례 EP25→26, EP28→29(이 방식으로 77.5%, 74.8%)는 반드시 경고, 규칙(11/06) 직후 새로 짠 첫 쇼츠 두 편
// (40.8%, 41.9%)은 경고하지 않는다. 그 사이 50~55%(롱폼 EP25·27·28, 쇼츠 EP27·29)는 "절반 넘게 같은 줄"이라 주의로 둔다.
export const CODE_WARN_MIN = 0.6;
export const CODE_CAUTION_MIN = 0.5;
// 장면: 규칙은 "이름과 순서가 같으면 다시 짠다". 10칸 중 7칸 이상이 같은 이름·같은 순서면 경고,
// 절반 이상이면 주의(EP27→EP28처럼 이름 몇 개만 바꾸고 칸 수·뼈대가 같은 경우가 여기 걸린다).
export const SCENE_WARN_MIN = 0.7;
export const SCENE_CAUTION_MIN = 0.5;
export const SCENE_COMPARE_PREV = 3; // 직전 3편과 비교(knowledge/legacy/agents-archive-2026-11-27.md "같은 틀의 영상을 찍어 내지 않는다" 절 2번)
export const CODE_COMPARE_PREV = 3; // 바로 앞 편 + 가장 비슷한 앞 3편 중 한 편
export const SPEED_WINDOW_DAYS = 30;
// 공개 기록이 없는 프로젝트 중 최근에 생긴 것만 "만드는 중"으로 본다(옛 시험 폴더 ep8·ep10은 빼려고).
export const IN_PROGRESS_MAX_AGE_DAYS = 30;

// ---- 1) 제목 틀 -----------------------------------------------------------------------------
const PH = {E: '', Q: '', N: ''};
const PH_LABEL = {[PH.E]: '{영어}', [PH.Q]: '{말}', [PH.N]: '{숫자}'};
const PH_CLASS = `[${PH.E}${PH.Q}${PH.N}]`;
const PARTICLE_CANON = {과: '와', 와: '와', 을: '를', 를: '를', 이: '가', 가: '가', 은: '는', 는: '는', 으로: '로', 로: '로', 이라고: '라고', 라고: '라고', 이랑: '랑', 랑: '랑'};

/** 제목에서 문장 부분만 남긴다: 해시태그, " | " 뒤 꼬리(검색어·칩), [칩], 이모지를 지운다. */
export function titleMainPart(title) {
  let t = String(title ?? '').replace(/#\S+/g, ' ');
  t = t.split(/\s\|\s|\s\|$|^\|\s/)[0];
  t = t.replace(/\[[^\]]*\]/g, ' ').replace(/[\p{Extended_Pictographic}️‍]/gu, ' ');
  return t.replace(/\s+/g, ' ').trim();
}

/** 바뀌는 자리를 자리표시자로 바꾼 틀(내부용 문자 포함). */
function rawTemplate(title) {
  let t = titleMainPart(title);
  t = t.replace(/'[^']*'|"[^"]*"|‘[^’]*’|“[^”]*”/g, PH.Q);
  t = t.replace(/-?[A-Za-z][A-Za-z'’-]*(?:\s+-?[A-Za-z][A-Za-z'’-]*)*/g, PH.E);
  t = t.replace(/\d+(?:[.,]\d+)?/g, PH.N);
  t = t.replace(new RegExp(`(${PH_CLASS})(이라고|라고|이랑|랑|으로|로|과|와|을|를|은|는|이|가)(?=[\\s,.?!…:;]|$)`, 'g'),
    (_, ph, p) => ph + PARTICLE_CANON[p]);
  return t.replace(/\s+/g, ' ').trim();
}

/** 사람이 읽는 틀: "{영어}와 {영어}, 둘 다 {말}로 읽으셨나요?" */
export const titleTemplate = (title) => rawTemplate(title).replace(new RegExp(PH_CLASS, 'g'), (c) => PH_LABEL[c]);

const bigrams = (s) => {
  const out = new Map();
  for (let i = 0; i < s.length - 1; i += 1) out.set(s.slice(i, i + 2), (out.get(s.slice(i, i + 2)) || 0) + 1);
  return out;
};
const words = (t) => t.split(' ').map((w) => w.replace(/[,.?!…:;'"~·]/g, '')).filter(Boolean);

/** 두 제목의 틀이 얼마나 같은가. share는 글자 2개 묶음 다이스 계수(0~1), 계산할 글자가 없으면 null. */
export function templateSimilarity(titleA, titleB) {
  const a = rawTemplate(titleA);
  const b = rawTemplate(titleB);
  const squash = (t) => t.replace(/[\s,.?!…:;'"~·]/g, '');
  const ga = bigrams(squash(a));
  const gb = bigrams(squash(b));
  const total = [...ga.values()].reduce((s, n) => s + n, 0) + [...gb.values()].reduce((s, n) => s + n, 0);
  let overlap = 0;
  for (const [k, n] of ga) overlap += Math.min(n, gb.get(k) || 0);
  const share = total ? (2 * overlap) / total : null;
  const wa = words(a);
  const wb = words(b);
  const headTail = wa.length >= 4 && wb.length >= 4
    && wa.slice(0, 2).join(' ') === wb.slice(0, 2).join(' ') && wa.slice(-2).join(' ') === wb.slice(-2).join(' ');
  const same = a !== '' && a === b;
  const level = same ? 'same' : (headTail || (share !== null && share >= TITLE_SIMILAR_MIN)) ? 'similar' : 'different';
  return {same, share, headTail, level};
}

/** 공개(또는 예약) 시각: 예약이면 scheduledPublishAt, 아니면 publishedAt. */
export const effectiveDate = (video) => video.scheduledPublishAt || video.publishedAt || null;

/** 카탈로그 영상과 아직 올리지 않은 업로드 패키지 제목을 형식별·공개순 목록으로 만든다. 공개되지 않을 비공개 영상은 뺀다. */
export function titleEntries(catalogVideos, pendingPackages = []) {
  const out = {LONGFORM: [], SHORTS: []};
  for (const v of catalogVideos || []) {
    if (!v || !v.title) continue;
    if (v.privacyStatus === 'private' && !v.scheduledPublishAt) continue;
    const format = v.format || resolveVideoFormat(v, null);
    const date = effectiveDate(v);
    const pending = Boolean(v.scheduledPublishAt);
    if (!out[format]) continue;
    out[format].push({id: v.videoId, title: v.title, date, state: pending ? '예약' : '공개'});
  }
  for (const p of pendingPackages) out[p.format]?.push({id: p.name, title: p.title, date: p.date || null, state: '업로드 전'});
  for (const list of Object.values(out)) list.sort((x, y) => String(x.date ?? '9999').localeCompare(String(y.date ?? '9999')));
  return out;
}

/** 최근 window편 안에서 같은·비슷한 틀이 2번 이상 나온 묶음. */
export function findRecentRepeats(list, window = TITLE_WINDOW) {
  const recent = list.slice(-window);
  const warnings = [];
  for (let i = 0; i < recent.length; i += 1) {
    for (let j = i + 1; j < recent.length; j += 1) {
      const sim = templateSimilarity(recent[i].title, recent[j].title);
      if (sim.level !== 'different') warnings.push({a: recent[i], b: recent[j], ...sim});
    }
  }
  return warnings;
}

/** 공개순으로 바로 이어진 편끼리 같은·비슷한 틀이 이어진 구간(2편 이상). */
export function findConsecutiveRuns(list) {
  const runs = [];
  let start = 0;
  for (let i = 1; i <= list.length; i += 1) {
    const linked = i < list.length && templateSimilarity(list[i - 1].title, list[i].title).level !== 'different';
    if (!linked) {
      if (i - start >= 2) runs.push(list.slice(start, i));
      start = i;
    }
  }
  return runs;
}

/** 새 제목 후보를 최근 window편과 나란히 비교한다. */
export function compareCandidate(candidate, list, window = TITLE_WINDOW) {
  return list.slice(-window).map((e) => ({...e, template: titleTemplate(e.title), ...templateSimilarity(candidate, e.title)}));
}

// ---- 2) 코드 같은 줄 비율 ---------------------------------------------------------------------
export const codeLines = (text) => String(text ?? '').split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

/** 뒤 편(next) 줄 중 앞 편(prev)에도 있는 줄의 비율. 뒤 편에 줄이 없으면 null. */
export function sameLineShare(prevText, nextText) {
  const prev = codeLines(prevText);
  const next = codeLines(nextText);
  if (!next.length) return null;
  const left = new Map();
  for (const l of prev) left.set(l, (left.get(l) || 0) + 1);
  let same = 0;
  for (const l of next) {
    const n = left.get(l) || 0;
    if (n > 0) { same += 1; left.set(l, n - 1); }
  }
  return {same, total: next.length, share: same / next.length};
}

const levelOf = (share, warn, caution) => (share === null || share === undefined ? null : share >= warn ? '경고' : share >= caution ? '주의' : '통과');
export const codeLevel = (share) => levelOf(share, CODE_WARN_MIN, CODE_CAUTION_MIN);

// ---- 3) 장면 순서 -----------------------------------------------------------------------------
/** index.html에서 하위 장면 파일 이름을 시작 시각 순서로 뽑는다(앞 번호 제거). 장면이 없으면 빈 배열. */
export function sceneNamesFromIndexHtml(html) {
  const scenes = [];
  for (const m of String(html ?? '').matchAll(/<[^>]*data-composition-src="([^"]+)"[^>]*>/g)) {
    const start = Number((m[0].match(/data-start="([^"]+)"/) || [])[1]);
    const name = basename(m[1]).replace(/\.html?$/i, '').replace(/^\d+[-_.\s]*/, '');
    scenes.push({name, start: Number.isFinite(start) ? start : scenes.length});
  }
  return scenes.sort((a, b) => a.start - b.start).map((s) => s.name);
}

const lcsLength = (a, b) => {
  let prev = new Array(b.length + 1).fill(0);
  for (let i = 1; i <= a.length; i += 1) {
    const cur = new Array(b.length + 1).fill(0);
    for (let j = 1; j <= b.length; j += 1) cur[j] = a[i - 1] === b[j - 1] ? prev[j - 1] + 1 : Math.max(prev[j], cur[j - 1]);
    prev = cur;
  }
  return prev[b.length];
};

/** 같은 이름이 같은 순서로 나오는 장면 수 ÷ 긴 쪽 장면 수. 어느 한쪽에 장면이 없으면 null. */
export function sceneOrderShare(a, b) {
  if (!a?.length || !b?.length) return null;
  const same = lcsLength(a, b);
  const total = Math.max(a.length, b.length);
  return {same, total, share: same / total, sameCount: a.length === b.length};
}
export const sceneLevel = (share) => levelOf(share, SCENE_WARN_MIN, SCENE_CAUTION_MIN);

// ---- 4) 제작 속도 -----------------------------------------------------------------------------
/** 렌더 파일 이름의 날짜(hyperframes가 붙이는 렌더 시작 시각, 이 PC 시간대)를 읽는다. 없으면 null. */
export function renderDateFromName(fileName) {
  const m = String(fileName).match(/(\d{4}-\d{2}-\d{2})_(\d{2})-(\d{2})-(\d{2})\.mp4$/i);
  if (!m) return null;
  const d = new Date(`${m[1]}T${m[2]}:${m[3]}:${m[4]}`);
  return Number.isNaN(d.getTime()) ? null : d;
}

export const formatOfName = (name) => (/shorts/i.test(name) ? 'SHORTS' : 'LONGFORM');

/** 렌더 목록(key·format·date)을 형식별로 요약한다. */
export function summarizeRenders(renders, now, windowDays = SPEED_WINDOW_DAYS) {
  const out = {};
  for (const format of ['LONGFORM', 'SHORTS']) {
    const mine = renders.filter((r) => r.format === format && r.date && r.date <= now);
    const last = mine.reduce((best, r) => (!best || r.date > best.date ? r : best), null);
    const since = new Date(now.getTime() - windowDays * DAY_MS);
    const recentKeys = [...new Set(mine.filter((r) => r.date >= since).map((r) => r.key))].sort();
    out[format] = {
      last: last ? {key: last.key, date: last.date.toISOString(), daysAgo: Math.floor((now - last.date) / DAY_MS), source: last.source} : null,
      recentProjects: recentKeys,
    };
  }
  return out;
}

const kstMonth = (d) => new Date(new Date(d).getTime() + 9 * 60 * 60 * 1000).toISOString().slice(0, 7);

/** 기준 시각이 속한 달(한국 시간)에 공개됐거나 예약된 영상 수. */
export function monthCounts(catalogVideos, now) {
  const month = kstMonth(now);
  const out = {month, LONGFORM: {published: 0, scheduled: 0}, SHORTS: {published: 0, scheduled: 0}};
  for (const v of catalogVideos || []) {
    if (v.privacyStatus === 'private' && !v.scheduledPublishAt) continue;
    const date = effectiveDate(v);
    if (!date || kstMonth(date) !== month) continue;
    const format = v.format || resolveVideoFormat(v, null);
    if (!out[format]) continue;
    if (new Date(date) > now) out[format].scheduled += 1;
    else out[format].published += 1;
  }
  return out;
}

// ---- 파일 읽기 --------------------------------------------------------------------------------
const readText = (p) => (existsSync(p) ? readFileSync(p, 'utf8') : null);
const readJson = (p) => { try { return JSON.parse(readFileSync(p, 'utf8')); } catch { return null; } };
const git = (args) => execFileSync('git', args, {cwd: projectDir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore']});
const listDirs = (p) => (existsSync(p) ? readdirSync(p, {withFileTypes: true}).filter((d) => d.isDirectory()).map((d) => d.name) : []);

function loadPackages(root) {
  const dir = join(root, 'output', 'upload-packages');
  return listDirs(dir).map((name) => {
    const statusFile = readJson(join(dir, name, 'status.json')) || readJson(join(dir, name, 'shorts-status.json'));
    const status = statusFile || {};
    const shorts = existsSync(join(dir, name, 'shorts-status.json')) || /shorts/i.test(name);
    const title = (readText(join(dir, name, 'title.txt')) || '').split(/\r?\n/)[0].trim() || null;
    return {name, title, format: shorts ? 'SHORTS' : 'LONGFORM', videoId: status.videoId || null, hasStatus: Boolean(statusFile),
      date: status.publishedAt || status.scheduledFor || status.plannedFor || null, dir: join(dir, name)};
  });
}

const GENERATORS = ['generate-frames.mjs', 'build-index.mjs'];

/** 영상 프로젝트 목록: 공개(예약) 날짜가 있는 편은 그 순서, 공개 기록이 없는 최근 프로젝트는 "만드는 중"으로 맨 뒤. */
function loadProjects(root, catalogVideos, packages, now) {
  const byId = new Map((catalogVideos || []).map((v) => [v.videoId, v]));
  const projects = [];
  const skippedOld = [];
  for (const name of listDirs(join(root, 'videos'))) {
    const ep = Number((name.match(/^ep(\d+)/) || [])[1]);
    if (!Number.isFinite(ep)) continue;
    const pkg = packages.find((p) => p.name === name || p.name === `${name}-longform`);
    const video = pkg?.videoId ? byId.get(pkg.videoId) : null;
    const date = (video && effectiveDate(video)) || pkg?.date || null;
    const base = join(root, 'videos', name);
    const project = {name, ep, format: formatOfName(name), date, package: pkg?.name || null, title: video?.title || pkg?.title || null,
      generator: GENERATORS.find((g) => existsSync(join(base, 'scripts', g))) || null,
      scenes: sceneNamesFromIndexHtml(readText(join(base, 'index.html')))};
    if (!date) {
      let created = null;
      try { created = git(['log', '--diff-filter=A', '--format=%cI', '--', `videos/${name}`]).trim().split(/\r?\n/).pop() || null; } catch { created = null; }
      const age = created ? (now - new Date(created)) / DAY_MS : 0; // 커밋 안 된 새 폴더는 방금 생긴 것으로 본다
      if (age > IN_PROGRESS_MAX_AGE_DAYS) { skippedOld.push(name); continue; }
      project.inProgress = true;
    }
    projects.push(project);
  }
  projects.sort((a, b) => (a.inProgress ? 1 : 0) - (b.inProgress ? 1 : 0)
    || String(a.date ?? '').localeCompare(String(b.date ?? '')) || a.ep - b.ep || a.name.localeCompare(b.name));
  return {projects, skippedOld};
}

function codeRows(root, chain) {
  const rows = [];
  chain.forEach((p, i) => {
    if (!p.generator) return;
    const earlier = chain.slice(0, i).filter((q) => q.generator === p.generator).slice(-CODE_COMPARE_PREV);
    if (!earlier.length) return;
    const text = readText(join(root, 'videos', p.name, 'scripts', p.generator));
    const results = earlier.map((q) => ({prev: q.name, ...sameLineShare(readText(join(root, 'videos', q.name, 'scripts', q.generator)), text)}));
    const neighbor = results.at(-1);
    const best = results.reduce((m, r) => (r.share > m.share ? r : m), results[0]);
    rows.push({project: p.name, file: p.generator, inProgress: Boolean(p.inProgress), neighbor, best, level: codeLevel(neighbor.share), bestLevel: codeLevel(best.share)});
  });
  return rows;
}

function sceneRows(chain) {
  const rows = [];
  chain.forEach((p, i) => {
    if (!p.scenes.length) return;
    const earlier = chain.slice(0, i).filter((q) => q.scenes.length).slice(-SCENE_COMPARE_PREV);
    if (!earlier.length) return;
    const results = earlier.map((q) => ({prev: q.name, ...sceneOrderShare(q.scenes, p.scenes)}));
    const best = results.reduce((m, r) => (r.share > m.share ? r : m), results[0]);
    rows.push({project: p.name, scenes: p.scenes, inProgress: Boolean(p.inProgress), results, best, level: sceneLevel(best.share)});
  });
  return rows;
}

function rendersOnDisk(root) {
  const renders = [];
  for (const name of listDirs(join(root, 'videos'))) {
    const dir = join(root, 'videos', name, 'renders');
    if (!existsSync(dir)) continue;
    for (const f of readdirSync(dir).filter((x) => /\.mp4$/i.test(x))) {
      const fromName = renderDateFromName(f);
      renders.push({key: name, format: formatOfName(name), date: fromName || statSync(join(dir, f)).mtime, source: fromName ? '파일 이름' : '수정 시각'});
    }
  }
  const pk = join(root, 'output', 'upload-packages');
  for (const name of listDirs(pk)) {
    for (const f of readdirSync(join(pk, name)).filter((x) => /\.mp4$/i.test(x))) {
      renders.push({key: name.replace(/-longform$/, ''), format: formatOfName(name), date: statSync(join(pk, name, f)).mtime, source: '패키지 수정 시각'});
    }
  }
  return renders;
}

function commitCounts(now, windowDays = SPEED_WINDOW_DAYS) {
  const since = new Date(now.getTime() - windowDays * DAY_MS);
  const sinceDay = new Date(since.getTime() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10); // 한국 날짜(점검 때와 같은 --since=YYYY-MM-DD 꼴)
  const count = (paths) => git(['log', `--since=${sinceDay}`, `--until=${now.toISOString()}`, '--format=%H', ...(paths.length ? ['--', ...paths] : [])])
    .split(/\r?\n/).filter(Boolean).length;
  try {
    return {since: sinceDay, total: count([]), videos: count(['videos/']), docs: count(['knowledge/', 'AGENTS.md', 'CLAUDE.md', '.claude/']), scripts: count(['scripts/'])};
  } catch (err) {
    return {since: sinceDay, error: `git log 실패: ${err.message.split('\n')[0]}`};
  }
}

export function buildReport({root = projectDir, now = new Date(), target = null, candidate = null, candidateFormat = null} = {}) {
  const catalog = readJson(join(root, 'data', 'youtube', 'catalog.json'));
  const videos = catalog?.videos || [];
  const packages = loadPackages(root);
  // 올릴 예정인 패키지 = 상태 파일은 있는데 영상 ID가 아직 없는 것. 영상 ID가 있으면 카탈로그 제목을 쓰고,
  // 상태 파일이 없는 옛 패키지(s1-ep08~10, channel-shorts-c-schwa)는 이미 손으로 올린 것이라 뺀다.
  const pending = packages.filter((p) => p.title && p.hasStatus && !p.videoId);
  const titles = titleEntries(videos, pending);
  const {projects, skippedOld} = loadProjects(root, videos, packages, now);

  const report = {now: now.toISOString(), catalogFound: Boolean(catalog), titles: {}, code: {}, scenes: {}, skippedOldProjects: skippedOld};
  for (const format of ['LONGFORM', 'SHORTS']) {
    const list = titles[format];
    report.titles[format] = {
      recent: list.slice(-TITLE_WINDOW).map((e) => ({...e, template: titleTemplate(e.title)})),
      repeats: findRecentRepeats(list).map((w) => ({a: w.a.title, b: w.b.title, level: w.level, share: w.share, headTail: w.headTail})),
      runs: findConsecutiveRuns(list).map((run) => run.map((e) => ({date: e.date, title: e.title}))),
    };
    const chain = projects.filter((p) => p.format === format);
    report.code[format] = codeRows(root, chain);
    report.scenes[format] = sceneRows(chain);
  }

  if (candidate) {
    const format = candidateFormat || (/#shorts/i.test(candidate) ? 'SHORTS' : 'LONGFORM');
    report.candidate = {title: candidate, format, template: titleTemplate(candidate), rows: compareCandidate(candidate, titles[format])};
  }

  if (target) {
    const name = basename(target.replace(/[\\/]+$/, ''));
    const p = projects.find((x) => x.name === name);
    if (!p) {
      report.target = {name, error: skippedOld.includes(name) ? '공개 기록이 없는 옛 프로젝트라 비교 순서에 넣지 않았다' : 'videos/ 아래에서 찾지 못했다'};
    } else {
      const list = titles[p.format];
      const idx = p.title ? list.findIndex((e) => e.title === p.title) : -1;
      const before = idx >= 0 ? list.slice(0, idx) : list;
      report.target = {
        name, format: p.format, title: p.title,
        titleRows: p.title ? compareCandidate(p.title, before) : null,
        code: report.code[p.format].find((r) => r.project === name) || null,
        scenes: report.scenes[p.format].find((r) => r.project === name) || null,
        generator: p.generator, sceneCount: p.scenes.length,
      };
    }
  }

  const sheets = loadSheets(join(root, 'data', 'youtube', 'transform-sheets'))
    .sort((a, b) => String(a.createdAt || '').localeCompare(String(b.createdAt || '')) || sheetIdOf(a).localeCompare(sheetIdOf(b)));
  const latestSheet = sheets.at(-1) || null;
  report.referenceBias = latestSheet ? {sheetId: sheetIdOf(latestSheet), warnings: referenceBiasWarnings(latestSheet, sheets)} : {sheetId: null, warnings: []};
  if (report.target && !report.target.error) {
    const targetSheet = sheets.find((s) => sheetIdOf(s) === report.target.name) || null;
    if (targetSheet) report.target.referenceBias = referenceBiasWarnings(targetSheet, sheets);
  }

  report.speed = {renders: summarizeRenders(rendersOnDisk(root), now), commits: commitCounts(now), month: monthCounts(videos, now)};
  return report;
}

// ---- 출력 -------------------------------------------------------------------------------------
const pct = (x) => (x === null || x === undefined ? '없음' : `${(x * 100).toFixed(1)}%`);
const LEVEL_WORD = {same: '같은 틀', similar: '비슷한 틀', different: '다른 틀'};
const short = (s, n = 60) => (String(s).length > n ? `${String(s).slice(0, n - 1)}…` : String(s));
const FORMAT_WORD = {LONGFORM: '롱폼', SHORTS: '쇼츠'};

function printTitleSection(report) {
  console.log('\n[1] 제목 틀 — 영어 단어·따옴표 말·숫자를 빈칸으로 바꾸면 같은 문장인지 봅니다');
  for (const format of ['LONGFORM', 'SHORTS']) {
    const t = report.titles[format];
    console.log(`\n  ${FORMAT_WORD[format]} 최근 ${t.recent.length}편`);
    for (const e of t.recent) console.log(`   ${String(e.date ?? '날짜 없음').slice(0, 10)} ${e.state.padEnd(5)} ${short(titleMainPart(e.title), 46)}\n${' '.repeat(20)}틀: ${e.template}`);
    if (t.repeats.length) {
      console.log(`  ⚠ 경고: 최근 ${TITLE_WINDOW}편 안에서 틀이 겹침 ${t.repeats.length}쌍`);
      for (const w of t.repeats) console.log(`    - ${LEVEL_WORD[w.level]}(겹침 ${pct(w.share)}${w.headTail ? ', 앞뒤 2어절 같음' : ''}): "${short(titleMainPart(w.a), 34)}" / "${short(titleMainPart(w.b), 34)}"`);
    } else console.log(`  통과: 최근 ${TITLE_WINDOW}편 안에 같은·비슷한 틀이 없음`);
    const runs = t.runs.slice(-3);
    if (runs.length) {
      console.log(`  지난 기록: 바로 이어서 같은·비슷한 틀이 나온 구간 ${t.runs.length}곳${t.runs.length > 3 ? ' (최근 3곳만 표시)' : ''}`);
      for (const r of runs) console.log(`    - ${r.length}편 연속 (${String(r[0].date).slice(0, 10)}~${String(r.at(-1).date).slice(0, 10)}): ${r.map((e) => `"${short(titleMainPart(e.title), 24)}"`).join(', ')}`);
    }
  }
}

function printCandidate(c) {
  console.log(`\n[새 제목 후보] "${c.title}" (${FORMAT_WORD[c.format]})\n  틀: ${c.template}`);
  for (const r of c.rows) console.log(`   ${LEVEL_WORD[r.level].padEnd(5)} 겹침 ${pct(r.share).padStart(6)}  ${String(r.date ?? '').slice(0, 10)} ${short(titleMainPart(r.title), 40)}\n${' '.repeat(10)}틀: ${r.template}`);
  const hits = c.rows.filter((r) => r.level !== 'different');
  console.log(hits.length ? `  ⚠ 경고: 최근 ${c.rows.length}편 중 ${hits.length}편과 틀이 겹칩니다. 문장 틀을 바꿔 다시 쓰세요.` : `  통과: 최근 ${c.rows.length}편과 틀이 겹치지 않습니다.`);
}

function printCodeSection(report) {
  console.log(`\n[2] 영상 생성기 코드 같은 줄 비율 — 앞 편 코드를 복사해 단어만 바꿨는지 봅니다 (경고 ${pct(CODE_WARN_MIN)} 이상, 주의 ${pct(CODE_CAUTION_MIN)} 이상)`);
  for (const format of ['LONGFORM', 'SHORTS']) {
    const rows = report.code[format];
    console.log(`\n  ${FORMAT_WORD[format]} (${rows.length ? rows[0].file : '생성기 파일 없음'})`);
    for (const r of rows) {
      const best = r.best.prev !== r.neighbor.prev ? ` | 앞 3편 중 최고 ${pct(r.best.share)} (${r.best.prev})` : '';
      console.log(`   ${(r.level === '통과' ? '  ' : '⚠ ') + r.level}  ${r.project}${r.inProgress ? ' (만드는 중)' : ''} ← ${r.neighbor.prev}: ${pct(r.neighbor.share)} (${r.neighbor.same}/${r.neighbor.total}줄)${best}`);
    }
  }
}

function printSceneSection(report) {
  console.log(`\n[3] 장면 순서 — 직전 ${SCENE_COMPARE_PREV}편과 장면 이름·순서가 얼마나 같은지 봅니다 (경고 ${pct(SCENE_WARN_MIN)} 이상, 주의 ${pct(SCENE_CAUTION_MIN)} 이상)`);
  for (const format of ['LONGFORM', 'SHORTS']) {
    const rows = report.scenes[format].slice(-8);
    console.log(`\n  ${FORMAT_WORD[format]}${report.scenes[format].length > 8 ? ' (최근 8편만 표시)' : ''}`);
    if (!rows.length) { console.log('   장면 이름이 없어 재지 않음(쇼츠는 index.html 한 장에 장면을 나누지 않음)'); continue; }
    for (const r of rows) {
      console.log(`   ${(r.level === '통과' ? '  ' : '⚠ ') + r.level}  ${r.project}${r.inProgress ? ' (만드는 중)' : ''} ${r.scenes.length}칸 — 가장 비슷한 ${r.best.prev}: ${r.best.same}/${r.best.total}칸 ${pct(r.best.share)}${r.best.sameCount ? ', 칸 수 같음' : ''}`);
    }
  }
}

function printSpeed(report) {
  const s = report.speed;
  console.log('\n[4] 제작 속도 계기판 — 시스템 일이 영상 만들기를 밀어내고 있는지 숫자로 봅니다');
  for (const format of ['LONGFORM', 'SHORTS']) {
    const r = s.renders[format];
    console.log(`   ${FORMAT_WORD[format]} 마지막 렌더: ${r.last ? `${r.last.daysAgo}일 전 (${r.last.key}, ${r.last.date.slice(0, 10)}, ${r.last.source})` : '이 PC에 렌더 파일 없음(렌더 파일은 git에 없어 PC마다 다름)'}`
      + ` | 최근 ${SPEED_WINDOW_DAYS}일 렌더한 편: ${r.recentProjects.length}편`);
  }
  const c = s.commits;
  if (c.error) console.log(`   커밋: 측정 못 함 (${c.error})`);
  else {
    const share = (n) => (c.total ? ` (${pct(n / c.total)})` : '');
    console.log(`   최근 ${SPEED_WINDOW_DAYS}일(${c.since}부터) 커밋 ${c.total}개 중 영상(videos/) ${c.videos}개${share(c.videos)}, 문서·규칙·스킬 ${c.docs}개${share(c.docs)}, scripts/ ${c.scripts}개${share(c.scripts)} — 한 커밋이 여러 곳을 건드리면 양쪽에 셉니다`);
  }
  const m = s.month;
  console.log(`   ${m.month}(한국 시간) 새로 공개·예약: 롱폼 공개 ${m.LONGFORM.published}·예약 ${m.LONGFORM.scheduled}, 쇼츠 공개 ${m.SHORTS.published}·예약 ${m.SHORTS.scheduled}`);
}

function printTarget(t) {
  console.log(`\n[편 비교] ${t.name}`);
  if (t.error) { console.log(`  ${t.error}`); return; }
  if (t.titleRows) {
    console.log(`  제목: ${t.title}\n  틀: ${titleTemplate(t.title)}`);
    for (const r of t.titleRows) console.log(`   ${LEVEL_WORD[r.level].padEnd(5)} 겹침 ${pct(r.share).padStart(6)}  ${short(titleMainPart(r.title), 44)}`);
  } else console.log('  제목: 아직 없음(카탈로그·업로드 패키지에서 찾지 못함)');
  if (t.code) console.log(`  코드(${t.code.file}): ${t.code.level} — ${t.code.neighbor.prev}와 ${pct(t.code.neighbor.share)} (${t.code.neighbor.same}/${t.code.neighbor.total}줄), 앞 3편 중 최고 ${pct(t.code.best.share)} (${t.code.best.prev})`);
  else console.log(`  코드: ${t.generator ? '비교할 앞 편 생성기 없음' : '생성기 파일 없음'}`);
  if (t.scenes) for (const r of t.scenes.results) console.log(`  장면: ${r.prev}와 ${r.same}/${r.total}칸 ${pct(r.share)} (${sceneLevel(r.share)})`);
  else console.log(`  장면: ${t.sceneCount ? '비교할 앞 편 장면 없음' : '장면 이름 없음'}`);
  if (t.referenceBias?.length) {
    for (const w of t.referenceBias) console.log(`  ⚠ ${w.message}`);
  }
}

function printReferenceBiasSection(report) {
  const rb = report.referenceBias;
  if (!rb?.sheetId) return;
  console.log(`\n[5] 비교 시트 레퍼런스 반복 편향 (비차단 참고) — 최신 시트 ${rb.sheetId} 기준`);
  if (!rb.warnings.length) { console.log('   통과: 직전 3편 중 2편 이상 반복된 레퍼런스가 없음'); return; }
  for (const w of rb.warnings) console.log(`   ⚠ ${w.message}`);
}

function printReport(report) {
  console.log(`같은 틀 반복 검사 (기준 시각 ${report.now}) — 숫자는 모두 파일·git에서 계산한 값입니다. 문턱은 가설입니다.`);
  if (!report.catalogFound) console.log('  data/youtube/catalog.json이 없어 제목·공개 날짜를 읽지 못했습니다.');
  if (report.candidate) printCandidate(report.candidate);
  if (report.target) printTarget(report.target);
  if (!report.candidate && !report.target) {
    printTitleSection(report);
    printCodeSection(report);
    printSceneSection(report);
    printReferenceBiasSection(report);
    if (report.skippedOldProjects.length) console.log(`\n  (공개 기록이 없는 옛 프로젝트 ${report.skippedOldProjects.length}개는 순서에 넣지 않음: ${report.skippedOldProjects.join(', ')})`);
  }
  printSpeed(report);
}

function parseArgs(argv) {
  const opts = {json: false, target: null, candidate: null, candidateFormat: null, now: new Date()};
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--json') opts.json = true;
    else if (a === '--title') opts.candidate = argv[++i];
    else if (a === '--format') opts.candidateFormat = /short/i.test(argv[++i] || '') ? 'SHORTS' : 'LONGFORM';
    else if (a === '--until') opts.now = new Date(argv[++i]);
    else if (!a.startsWith('--')) opts.target = a;
  }
  if (Number.isNaN(opts.now.getTime())) throw new Error('--until 날짜를 읽지 못했습니다');
  return opts;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const opts = parseArgs(process.argv.slice(2));
  const report = buildReport(opts);
  if (opts.json) console.log(JSON.stringify(report, null, 2));
  else printReport(report);
}
