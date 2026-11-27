// 쿠팡 블로그 주제 고르기용 검색량 조회(네이버 검색광고 키워드 도구, 2026-11-27 사용자 결정).
//
// 2026-11-27 우리 키로 직접 확인한 응답 규칙(공식 문서에 흩어져 있어 실측으로 정함):
// - GET https://api.searchad.naver.com/keywordstool?hintKeywords=a,b&showDetail=1
//   서명은 HMAC-SHA256(비밀 키, "<타임스탬프>.GET./keywordstool")를 base64로.
// - 낱말에 띄어쓰기가 있으면 400(code 11001). 붙여서 보낸다.
// - 한 번에 5개까지. 6개를 보내면 오류 없이 빈 목록이 온다 → 5개씩 나눠 보낸다.
// - 월 검색 수가 10 미만이면 숫자 대신 문자열 "< 10"이 온다. 숫자를 지어내지 않고 '<10'으로 둔다.
// - 응답은 보낸 낱말 행 + 관련 검색어 행이 섞여 온다(5개 보내면 약 800행).
// 숫자는 네이버 검색 기준이다. 우리 블로그 유입은 구글이 크므로 '수요가 있는지' 가늠하는 데만 쓴다.

import crypto from 'node:crypto';
import {existsSync} from 'node:fs';
import {readFile, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const API_BASE = 'https://api.searchad.naver.com';
const API_PATH = '/keywordstool';
export const HINTS_PER_CALL = 5; // allow-literal: 키워드 도구가 한 번에 받는 낱말 수(6개면 빈 목록, 2026-11-27 실측)
const UNDER_TEN = '<10';
const DEFAULT_RELATED_LIMIT = 30; // allow-literal: 관련 검색어 표에 보여 줄 줄 수
const ENV_KEYS = ['NAVER_SEARCHAD_CUSTOMER_ID', 'NAVER_SEARCHAD_ACCESS_LICENSE', 'NAVER_SEARCHAD_SECRET_KEY'];

const readEnvFile = async (projectDir) => {
  const file = path.join(projectDir, '.env');
  const out = {};
  if (!existsSync(file)) return out;
  for (const line of (await readFile(file, 'utf8')).split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    let value = m[2].trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1); // allow-literal: 양끝 따옴표 제거
    out[m[1]] = value;
  }
  return out;
};

async function resolveKeys({env, projectDir = process.cwd()} = {}) {
  const fileEnv = await readEnvFile(projectDir);
  const pick = (k) => env?.[k] ?? process.env[k] ?? fileEnv[k];
  const missing = ENV_KEYS.filter((k) => !pick(k));
  if (missing.length) {
    const err = new Error(`.env에 ${missing.join(', ')}가 없습니다.`);
    err.code = 'auth';
    throw err;
  }
  return {customerId: pick(ENV_KEYS[0]), accessLicense: pick(ENV_KEYS[1]), secretKey: pick(ENV_KEYS[2])};
}

/** 키워드 도구에 보낼 형태(띄어쓰기 없음)로 바꾼다. 같은 낱말인지 견줄 때도 쓴다. */
export function normalizeKeyword(s) {
  return String(s || '').replace(/\s+/g, '').toUpperCase();
}

/** 월 검색 수 칸: 숫자면 숫자, "< 10"이면 '<10'. 그 밖은 null(값 없음). */
export function parseCount(v) {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string' && /^<\s*10$/.test(v.trim())) return UNDER_TEN;
  return null;
}

/** 응답 한 줄을 정리한다. total은 숫자 칸만 더한 값이고, '<10'이 섞이면 lowerBound=true(실제는 조금 더 많을 수 있음). */
export function summarizeRow(row) {
  const pc = parseCount(row?.monthlyPcQcCnt);
  const mobile = parseCount(row?.monthlyMobileQcCnt);
  const nums = [pc, mobile].filter((v) => typeof v === 'number');
  return {
    keyword: String(row?.relKeyword || ''),
    pc,
    mobile,
    total: nums.reduce((a, b) => a + b, 0),
    lowerBound: pc === UNDER_TEN || mobile === UNDER_TEN,
    compIdx: row?.compIdx ?? null,
  };
}

/** 낱말 1~5개로 키워드 도구를 한 번 부른다. */
export async function callKeywordTool(hints, {env, projectDir, fetchImpl = globalThis.fetch, now = Date.now} = {}) {
  const list = (hints || []).map(normalizeKeyword).filter(Boolean);
  if (!list.length) throw new Error('조회할 낱말이 없습니다.');
  if (list.length > HINTS_PER_CALL) throw new Error(`한 번에 ${HINTS_PER_CALL}개까지만 보낼 수 있습니다(${list.length}개).`);
  const keys = await resolveKeys({env, projectDir});
  const ts = String(now());
  const signature = crypto.createHmac('sha256', keys.secretKey).update(`${ts}.GET.${API_PATH}`).digest('base64');
  const qs = new URLSearchParams({hintKeywords: list.join(','), showDetail: '1'});
  const res = await fetchImpl(`${API_BASE}${API_PATH}?${qs}`, {
    headers: {'X-Timestamp': ts, 'X-API-KEY': keys.accessLicense, 'X-Customer': keys.customerId, 'X-Signature': signature},
  });
  const text = await res.text();
  let body = null;
  try { body = JSON.parse(text); } catch { /* 아래에서 오류로 처리 */ }
  if (res.status !== 200 || !Array.isArray(body?.keywordList)) { // allow-literal: HTTP 성공 코드
    const err = new Error(`키워드 도구 응답 오류(${res.status}): ${body?.message || text.slice(0, 200)}`); // allow-literal: 오류 문구 길이 제한
    err.status = res.status;
    throw err;
  }
  return body.keywordList;
}

/** 여러 낱말의 월 검색 수. 5개씩 나눠 부르고, 응답에 없는 낱말은 found=false로 둔다(숫자를 만들지 않음). */
export async function lookupVolumes(keywords, deps = {}) {
  const unique = [...new Map((keywords || []).filter(Boolean).map((k) => [normalizeKeyword(k), k])).values()];
  const out = new Map();
  for (let i = 0; i < unique.length; i += HINTS_PER_CALL) {
    const chunk = unique.slice(i, i + HINTS_PER_CALL);
    const rows = await callKeywordTool(chunk, deps);
    const byKey = new Map(rows.map((r) => [normalizeKeyword(r?.relKeyword), r]));
    for (const k of chunk) {
      const row = byKey.get(normalizeKeyword(k));
      out.set(normalizeKeyword(k), row ? {...summarizeRow(row), query: k, found: true} : {query: k, found: false});
    }
  }
  return out;
}

/** 낱말 하나의 관련 검색어를 월 검색 수 많은 순으로. */
export async function relatedKeywords(keyword, {limit = DEFAULT_RELATED_LIMIT, ...deps} = {}) {
  const rows = await callKeywordTool([keyword], deps);
  return rows.map(summarizeRow).sort((a, b) => b.total - a.total).slice(0, limit);
}

/** 검색량을 잴 낱말: 주 검색어(targetKeyword)가 있으면 그것, 없으면 searchQuery. */
export function queueKeyword(t) {
  return t?.targetKeyword || t?.searchQuery || '';
}

/** 대기열 항목마다 주 검색어의 검색량을 searchVolume 칸에 적은 새 배열을 돌려준다. */
export function annotateQueue(queue, volumes, checkedAt) {
  return (queue || []).map((t) => {
    const keyword = queueKeyword(t);
    const v = volumes.get(normalizeKeyword(keyword));
    if (!keyword || !v) return t;
    const searchVolume = v.found
      ? {keyword, pc: v.pc, mobile: v.mobile, total: v.total, lowerBound: v.lowerBound, compIdx: v.compIdx, source: 'naver-searchad', checkedAt}
      : {keyword, found: false, source: 'naver-searchad', checkedAt};
    return {...t, searchVolume};
  });
}

export function formatVolume(v) {
  if (!v || v.found === false) return '조회 결과 없음';
  const part = (x) => (x === null || x === undefined ? '?' : String(x));
  const amount = v.lowerBound && v.total === 0 ? '10회 미만' : `${v.lowerBound ? '약 ' : ''}${v.total.toLocaleString('ko-KR')}회`;
  return `월 ${amount}(PC ${part(v.pc)} · 휴대폰 ${part(v.mobile)})`;
}

async function cli(argv) {
  const projectDir = process.cwd();
  const [cmd, ...rest] = argv;
  if (cmd === 'queue') {
    const file = path.join(projectDir, 'data', 'blog', 'tech-queue.json');
    const queue = JSON.parse(await readFile(file, 'utf8'));
    const volumes = await lookupVolumes(queue.map(queueKeyword), {projectDir});
    const checkedAt = new Date().toISOString().slice(0, 10); // allow-literal: YYYY-MM-DD 길이
    const next = annotateQueue(queue, volumes, checkedAt);
    if (!rest.includes('--dry-run')) await writeFile(file, `${JSON.stringify(next, null, 2)}\n`);
    for (const t of next) console.log(`${t.cluster || '(갈래 없음)'} | ${t.topicId} | "${queueKeyword(t)}" | ${formatVolume(t.searchVolume)}`);
    return;
  }
  if (cmd === 'related') {
    const limitIdx = rest.indexOf('--limit');
    const limit = limitIdx >= 0 ? Number(rest[limitIdx + 1]) : DEFAULT_RELATED_LIMIT;
    const words = rest.filter((w, i) => w !== '--limit' && i !== limitIdx + 1);
    const rows = await relatedKeywords(words.join(' '), {limit, projectDir});
    for (const r of rows) console.log(`${r.keyword} | ${formatVolume({...r, found: true})} | 경쟁 ${r.compIdx ?? '?'}`);
    return;
  }
  if (cmd === 'check') {
    const volumes = await lookupVolumes(rest.join(' ').split(',').map((s) => s.trim()).filter(Boolean), {projectDir});
    for (const v of volumes.values()) console.log(`${v.query} | ${formatVolume(v)}`);
    return;
  }
  console.log([
    '사용법:',
    '  node scripts/blog/keyword-volume.mjs queue [--dry-run]   대기열 주 검색어마다 월 검색 수를 적는다',
    '  node scripts/blog/keyword-volume.mjs related <낱말> [--limit 30]   관련 검색어를 많이 찾는 순으로',
    '  node scripts/blog/keyword-volume.mjs check <낱말1>, <낱말2>, ...   여러 표현을 견준다',
  ].join('\n'));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    await cli(process.argv.slice(2));
  } catch (err) {
    console.error(`검색량 조회 실패: ${err.message}`);
    process.exitCode = 1;
  }
}
