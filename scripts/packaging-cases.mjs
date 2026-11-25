// 썸네일·문구·제목 사례집(data/youtube/packaging-cases.json) 읽기·검사·목록 보기 (2026-11-25 사용자 결정).
// 여러 분야에서 잘된 썸네일과 제목을 분석해 쌓고, 비교 시트가 그 사례를 근거(craft의 case:<id>)로 든다.
// AI는 두 단계로 읽는다: ① 활성 사례 전부의 한 줄 목록(숨기는 것 없음, 정렬만) → ② 고른 3~5개의 원본과 그림 파일.
// 사용: npm run packaging-cases                (목록 전체)
//       npm run packaging-cases -- --show a,b   (고른 사례 원본 + 그림 경로)
//       npm run packaging-cases -- --check      (파일 검사)
import {existsSync, readFileSync, readdirSync} from 'node:fs';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const projectDir = dirname(dirname(fileURLToPath(import.meta.url)));
export const casesPath = join(projectDir, 'data', 'youtube', 'packaging-cases.json');
export const casesImageBase = join(projectDir, 'data', 'youtube', 'transform-sheets');
const sheetsFolder = join(projectDir, 'data', 'youtube', 'transform-sheets');

export const STATUSES = Object.freeze(['active', 'archived']);
export const SOURCES = Object.freeze(['user-feed', 'click-ref', 'competitor', 'trend', 'own']);
export const FORMATS = Object.freeze(['LONGFORM', 'SHORTS']);
export const CREDITS = Object.freeze(['thumbnail', 'mixed', 'cast-topic', 'unknown']);
export const CREDIT_KO = Object.freeze({thumbnail: '썸네일 덕', mixed: '섞임', 'cast-topic': '출연자·소재 덕', unknown: '모름'});
export const ID_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;
export const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
export const MAKE_WITH_PREFIXES = Object.freeze(['knowledge/', 'data/research/']);

// 사람이 읽을 수 있게 길이를 막는다(2026-11-25). 넘으면 검사가 실패한다.
export const MAX_ANALYSIS_CHARS = 400;
export const MAX_TRANSFER_CHARS = 150;
export const MAX_TITLE_CHARS = 200;
export const MAX_INDEX_LINE_CHARS = 320;

export const ANALYSIS_LABELS = Object.freeze({
  synergy: '시너지·역할',
  curiosity: '호기심',
  clickDesire: '클릭 욕구',
  camera: '카메라·관계',
  graphics: '그래픽·글자',
  emotion: '감정',
  promise: '약속',
  aiLook: 'AI 티·작은 화면',
});
export const EYE_LABELS = Object.freeze({first: '눈이 처음 가는 곳', second: '두 번째로 가는 곳', shrink: '일부러 줄이거나 뺀 것'});
export const TAG_LABELS = Object.freeze({emotion: '감정', device: '장치', situation: '상황'});

const filled = (v) => typeof v === 'string' && v.trim().length > 0;
const isNum = (v) => typeof v === 'number' && Number.isFinite(v);
const stringList = (v) => Array.isArray(v) && v.length > 0 && v.every(filled);

export function loadCases(path = casesPath) {
  if (!existsSync(path)) return {schemaVersion: 1, cases: []};
  let raw;
  try { raw = JSON.parse(readFileSync(path, 'utf8').replace(/^﻿/, '')); } catch (e) {
    throw new Error(`사례집 파일(${path})을 읽을 수 없다 — JSON 모양이 깨졌다: ${e.message}`);
  }
  return {...raw, schemaVersion: raw?.schemaVersion ?? 1, cases: Array.isArray(raw?.cases) ? raw.cases : []};
}

const defaultImageExists = (rel) => existsSync(join(casesImageBase, rel));

export function validateCases(lib, {imageExists = defaultImageExists} = {}) {
  const out = [];
  if (!lib || typeof lib !== 'object') return ['사례집이 객체가 아니다'];
  if (lib.schemaVersion !== 1) out.push('사례집: schemaVersion이 1이 아니다');
  if (!DATE_RE.test(String(lib.updatedAt || ''))) out.push('사례집: updatedAt이 YYYY-MM-DD 날짜가 아니다');
  if (!Array.isArray(lib.cases)) return [...out, '사례집: cases가 목록이 아니다'];
  const seen = new Set();
  lib.cases.forEach((c, n) => {
    const name = `사례 ${n + 1}번(${filled(c?.id) ? c.id : 'id 없음'})`;
    const need = (cond, msg) => { if (!cond) out.push(`${name}: ${msg}`); };
    if (!c || typeof c !== 'object') { out.push(`${name}: 사례가 객체가 아니다`); return; }
    if (!filled(c.id) || !ID_RE.test(c.id) || c.id.length > 40) out.push(`${name}: id는 영문 소문자·숫자·하이픈 40자 이하여야 한다`);
    else if (seen.has(c.id)) out.push(`${name}: id가 다른 사례와 겹친다`);
    else seen.add(c.id);
    need(STATUSES.includes(c.status), `status가 ${STATUSES.join('/')} 중 하나가 아니다`);
    need(DATE_RE.test(String(c.addedAt || '')), 'addedAt이 YYYY-MM-DD 날짜가 아니다');
    need(filled(c.addedBy), 'addedBy(누가 넣었나)가 비어 있다');
    need(SOURCES.includes(c.source), `source가 ${SOURCES.join('/')} 중 하나가 아니다`);
    need(filled(c.videoId), 'videoId가 비어 있다');
    need(filled(c.channel), 'channel이 비어 있다');
    need(filled(c.genre), 'genre(분야)가 비어 있다');
    need(FORMATS.includes(c.format), `format이 ${FORMATS.join('/')} 중 하나가 아니다`);

    if (!Array.isArray(c.images) || !c.images.length) out.push(`${name}: images(그림 경로)가 1개 이상 있어야 한다`);
    else c.images.forEach((img) => {
      if (!filled(img)) out.push(`${name}: images에 빈 경로가 있다`);
      else if (!imageExists(img)) out.push(`${name}: 그림 파일이 없다(${img})`);
    });

    need(filled(c.title), 'title(제목 그대로)이 비어 있다');
    need(filled(c.thumbText), 'thumbText(썸네일 글자 그대로)가 비어 있다');
    if (filled(c.title)) need(c.title.length <= MAX_TITLE_CHARS, `title이 ${MAX_TITLE_CHARS}자를 넘는다`);
    if (filled(c.thumbText)) need(c.thumbText.length <= MAX_TITLE_CHARS, `thumbText가 ${MAX_TITLE_CHARS}자를 넘는다`);
    need(typeof c.variants === 'string', 'variants는 글자여야 한다(없으면 빈 문자열)');

    const nm = c.numbers;
    if (!nm || typeof nm !== 'object') out.push(`${name}: numbers가 없다`);
    else {
      need(isNum(nm.views) && nm.views >= 0, 'numbers.views(조회수)가 숫자가 아니다');
      need(DATE_RE.test(String(nm.checkedAt || '')), 'numbers.checkedAt이 YYYY-MM-DD 날짜가 아니다');
      for (const f of ['subs', 'channelMedian', 'xMedian']) need(nm[f] == null || isNum(nm[f]), `numbers.${f}는 숫자이거나 비워 두어야 한다`);
      need(nm.note == null || typeof nm.note === 'string', 'numbers.note는 글자여야 한다');
    }

    need(CREDITS.includes(c.credit), `credit이 ${CREDITS.join('/')} 중 하나가 아니다`);
    need(filled(c.creditWhy), 'creditWhy(그렇게 본 이유)가 비어 있다');

    const a = c.analysis;
    if (!a || typeof a !== 'object') out.push(`${name}: analysis가 없다`);
    else {
      for (const [f, ko] of Object.entries(ANALYSIS_LABELS)) {
        if (!filled(a[f])) out.push(`${name}: analysis.${f}(${ko})가 비어 있다`);
        else need(a[f].length <= MAX_ANALYSIS_CHARS, `analysis.${f}(${ko})가 ${MAX_ANALYSIS_CHARS}자를 넘는다`);
      }
      if (!a.eyeOrder || typeof a.eyeOrder !== 'object') out.push(`${name}: analysis.eyeOrder(눈이 가는 순서)가 없다`);
      else for (const [f, ko] of Object.entries(EYE_LABELS)) {
        if (!filled(a.eyeOrder[f])) out.push(`${name}: analysis.eyeOrder.${f}(${ko})가 비어 있다`);
        else need(a.eyeOrder[f].length <= MAX_ANALYSIS_CHARS, `analysis.eyeOrder.${f}(${ko})가 ${MAX_ANALYSIS_CHARS}자를 넘는다`);
      }
    }
    need(filled(c.transfer), 'transfer(우리에게 옮길 원리)가 비어 있다');
    if (filled(c.transfer)) need(c.transfer.length <= MAX_TRANSFER_CHARS, `transfer가 ${MAX_TRANSFER_CHARS}자를 넘는다`);
    need(filled(c.notTransferable), 'notTransferable(옮기지 못하는 것)이 비어 있다');

    if (!Array.isArray(c.makeWith) || !c.makeWith.length) out.push(`${name}: makeWith(만드는 데 쓸 제작 자료)가 1개 이상 있어야 한다`);
    else c.makeWith.forEach((m) => need(filled(m) && MAKE_WITH_PREFIXES.some((p) => m.startsWith(p)), `makeWith "${m}"는 ${MAKE_WITH_PREFIXES.join(' 또는 ')}로 시작해야 한다`));

    const tags = c.tags;
    if (!tags || typeof tags !== 'object') out.push(`${name}: tags가 없다`);
    else for (const [f, ko] of Object.entries(TAG_LABELS)) need(stringList(tags[f]), `tags.${f}(${ko})에 낱말이 1개 이상 있어야 한다`);

    if (c.contrast != null) {
      const k = c.contrast;
      if (typeof k !== 'object') out.push(`${name}: contrast가 객체가 아니다`);
      else {
        need(filled(k.videoId), 'contrast.videoId가 비어 있다');
        need(filled(k.title), 'contrast.title이 비어 있다');
        need(isNum(k.views) && k.views >= 0, 'contrast.views가 숫자가 아니다');
        need(k.xMedian == null || isNum(k.xMedian), 'contrast.xMedian은 숫자이거나 비워 두어야 한다');
        need(filled(k.diff), 'contrast.diff(평소 썸네일과 다른 점)가 비어 있다');
        if (!filled(k.image)) out.push(`${name}: contrast.image가 비어 있다`);
        else if (!imageExists(k.image)) out.push(`${name}: contrast 그림 파일이 없다(${k.image})`);
      }
    }
    if (c.usedIn != null) {
      need(Array.isArray(c.usedIn) && c.usedIn.every((u) => u && filled(u.episodeId) && filled(u.appliedTo)), 'usedIn은 {episodeId, appliedTo} 목록이어야 한다');
    }

    if (c.status === 'active' || c.status === 'archived') {
      try {
        const line = indexLine(c);
        need(line.length <= MAX_INDEX_LINE_CHARS, `목록 한 줄이 ${MAX_INDEX_LINE_CHARS}자를 넘는다(${line.length}자) — transfer와 태그를 줄인다`);
      } catch { /* 칸이 모자라 줄을 못 만들면 위에서 이미 문제로 잡혔다 */ }
    }
  });
  return out;
}

const fmtMultiple = (x) => (isNum(x) ? `배수 x${Number(x.toFixed(1))}` : '배수 측정 전');
const tagList = (c, f) => (Array.isArray(c?.tags?.[f]) ? c.tags[f].join(',') : '');

/** 목록 한 줄. 사례 칸에서 만들어 낸다(손으로 쓰지 않는다). */
export function indexLine(c, {recentIds = new Set()} = {}) {
  const parts = [
    c.id,
    c.genre,
    c.format,
    fmtMultiple(c.numbers?.xMedian),
    CREDIT_KO[c.credit] || c.credit,
    `감정: ${tagList(c, 'emotion')}`,
    `장치: ${tagList(c, 'device')}`,
    `상황: ${tagList(c, 'situation')}`,
    `옮길 것: ${c.transfer}`,
  ];
  return parts.join(' | ') + (recentIds.has(c.id) ? ' ★최근 사용' : '');
}

const xKey = (c) => (isNum(c.numbers?.xMedian) ? c.numbers.xMedian : -Infinity);
export function sortedActive(lib) {
  return (lib?.cases || []).filter((c) => c.status === 'active')
    .sort((a, b) => String(a.genre).localeCompare(String(b.genre), 'ko') || xKey(b) - xKey(a) || String(a.id).localeCompare(String(b.id)));
}

export function renderIndex(lib, {recentIds = new Set()} = {}) {
  const active = sortedActive(lib);
  const archived = (lib?.cases || []).filter((c) => c.status === 'archived').length;
  const head = `사례집: 활성 ${active.length}개 (보관 ${archived}개는 목록에서 뺌) — 전부 보여 줍니다. 고른 3~5개는 --show로 원본과 그림을 직접 여세요.`;
  return [head, ...active.map((c) => indexLine(c, {recentIds}))].join('\n');
}

const absImage = (rel, base = casesImageBase) => resolve(base, rel);

export function renderShow(lib, ids, {baseDir = casesImageBase} = {}) {
  const byId = new Map((lib?.cases || []).map((c) => [c.id, c]));
  const blocks = [];
  for (const id of ids) {
    const c = byId.get(id);
    if (!c) { blocks.push(`[없는 사례] ${id} — npm run packaging-cases로 목록의 id를 다시 확인한다`); continue; }
    const a = c.analysis || {};
    const nm = c.numbers || {};
    const lines = [
      `=== ${c.id} (${c.status}) ===`,
      `분야: ${c.genre} / 형식: ${c.format} / 채널: ${c.channel} / 영상 ID: ${c.videoId}`,
      `넣은 사람·날짜: ${c.addedBy}, ${c.addedAt} / 출처: ${c.source}`,
      `제목: ${c.title}`,
      `썸네일 글자: ${c.thumbText}`,
      `기본 등록본과 다른 점: ${c.variants || '없음'}`,
      `숫자: 조회수 ${nm.views ?? '측정 전'} / 구독자 ${nm.subs ?? '측정 전'} / 채널 중앙값 ${nm.channelMedian ?? '측정 전'} / 배수 ${isNum(nm.xMedian) ? `x${nm.xMedian}` : '측정 전'} / 확인일 ${nm.checkedAt} / ${nm.note || ''}`,
      `누구 덕: ${CREDIT_KO[c.credit] || c.credit} — ${c.creditWhy}`,
      ...Object.entries(ANALYSIS_LABELS).map(([f, ko]) => `${ko}: ${a[f]}`),
      ...Object.entries(EYE_LABELS).map(([f, ko]) => `눈이 가는 순서 · ${ko}: ${a.eyeOrder?.[f]}`),
      `우리에게 옮길 원리: ${c.transfer}`,
      `옮기지 못하는 것: ${c.notTransferable}`,
      `만들 때 볼 자료: ${(c.makeWith || []).join(', ')}`,
      `태그: ${Object.entries(TAG_LABELS).map(([f, ko]) => `${ko}(${tagList(c, f)})`).join(' ')}`,
      ...(c.usedIn?.length ? [`쓴 곳: ${c.usedIn.map((u) => `${u.episodeId}(${u.appliedTo})`).join(', ')}`] : []),
      ...(c.images || []).map((img) => `그림 파일: ${absImage(img, baseDir)}`),
    ];
    if (c.contrast) {
      lines.push(`대조(같은 채널 평소): ${c.contrast.title} / 조회수 ${c.contrast.views} / 배수 ${isNum(c.contrast.xMedian) ? `x${c.contrast.xMedian}` : '측정 전'} / 다른 점: ${c.contrast.diff}`);
      lines.push(`대조 그림 파일: ${absImage(c.contrast.image, baseDir)}`);
    }
    blocks.push(lines.join('\n'));
  }
  blocks.push('그림 파일을 직접 열어 보세요(글 설명만으로 쓰지 않는다).');
  return blocks.join('\n\n');
}

/** 최근 시트 n장이 인용한 사례 id(`case:<id>`). 시트 폴더를 직접 읽어 transform-sheet.mjs와 서로 불러오지 않게 했다. */
export function recentlyUsedCaseIds(sheets, n = 3) {
  const list = (sheets || []).filter((s) => s && typeof s === 'object')
    .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || ''))).slice(0, n);
  const ids = new Set();
  for (const s of list) for (const r of s.rows || []) for (const e of r?.craft || []) {
    const m = String(e?.source || '').match(/^case:(.+)$/);
    if (m) ids.add(m[1]);
  }
  return ids;
}

export function readSheetsFolder(dir = sheetsFolder) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter((f) => f.endsWith('.json')).map((f) => {
    try { return JSON.parse(readFileSync(join(dir, f), 'utf8').replace(/^﻿/, '')); } catch { return null; }
  }).filter(Boolean);
}

export const loadRecentCaseIds = (n = 3) => recentlyUsedCaseIds(readSheetsFolder(), n);

if (process.argv[1] && process.argv[1].endsWith('packaging-cases.mjs')) {
  const args = process.argv.slice(2);
  try {
    const lib = loadCases();
    if (args.includes('--check')) {
      if (!existsSync(casesPath)) { console.log('사례집 검사 문제 0건 (사례집 파일이 아직 없음)'); process.exit(0); }
      const problems = validateCases(lib);
      if (problems.length) { console.log(problems.join('\n')); console.log(`사례집 검사 문제 ${problems.length}건`); process.exit(1); }
      console.log('사례집 검사 문제 0건');
    } else if (args.includes('--show')) {
      const raw = args[args.indexOf('--show') + 1] || '';
      const ids = raw.split(',').map((s) => s.trim()).filter(Boolean);
      if (!ids.length) { console.log('--show 뒤에 사례 id를 쉼표로 적는다(예: --show a,b)'); process.exit(1); }
      console.log(renderShow(lib, ids));
    } else {
      console.log(renderIndex(lib, {recentIds: loadRecentCaseIds()}));
    }
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
}
