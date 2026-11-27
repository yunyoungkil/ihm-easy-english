// 쿠팡 블로그(tech.d40m.com) 구글 서치 콘솔 수집(2026-11-27 사용자 결정: 주제 고르기에 구글 실제 성적을 쓴다).
// - 실적: 최근 28일, 검색어×글 주소별 노출·클릭·평균 순위(dataState 'all' = 아직 확정 안 된 최근 날짜 포함).
// - 색인: 올린 글마다 URL 검사(구글이 아는지·색인했는지).
// 결과는 data/blog/search-console.json에 덮어쓴다. 무인 실행(tech-run)이 끝날 때 자동으로 부르고, 손으로는 `collect`.
// 권한: 블로그 로그인 토큰(google-auth.mjs BLOG_SCOPES에 webmasters 포함), 속성 sc-domain:d40m.com 소유자(2026-11-27 확인).

import {readFile, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {getBlogAccessToken} from './google-auth.mjs';

export const SITE = 'sc-domain:d40m.com';
export const BLOG_HOST = 'tech.d40m.com';
const OUT_FILE = 'search-console.json';
const RANGE_DAYS = 28; // allow-literal: 서치 콘솔 기본 보고 기간과 같은 28일
const ROW_LIMIT = 1000; // allow-literal: 한 번에 받을 검색어×주소 줄 수(글이 적은 지금은 충분)
const DAY_MS = 86_400_000; // allow-literal: 하루 밀리초
const QUERY_URL = `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(SITE)}/searchAnalytics/query`;
const INSPECT_URL = 'https://searchconsole.googleapis.com/v1/urlInspection/index:inspect';

const kstDay = (ms) => new Date(ms + 9 * 3_600_000).toISOString().slice(0, 10); // allow-literal: KST(+9시간), YYYY-MM-DD 길이

/** 최근 28일(오늘 포함, 한국 날짜). */
export function rangeFor(now) {
  const end = typeof now === 'number' ? now : new Date(now ?? Date.now()).getTime();
  return {startDate: kstDay(end - (RANGE_DAYS - 1) * DAY_MS), endDate: kstDay(end)};
}

async function postJson(url, body, {token, fetchImpl}) {
  const res = await fetchImpl(url, {
    method: 'POST',
    headers: {Authorization: `Bearer ${token}`, 'Content-Type': 'application/json'},
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (res.status !== 200) { // allow-literal: HTTP 성공 코드
    const err = new Error(`서치 콘솔 응답 오류(${res.status}): ${json?.error?.message || ''}`.trim());
    err.status = res.status;
    throw err;
  }
  return json;
}

const pageFilter = [{filters: [{dimension: 'page', operator: 'contains', expression: BLOG_HOST}]}];

/** 검색어×주소 실적 줄을 정리한다. 서치 콘솔이 준 숫자만 쓴다. */
export function toQueryRows(rows) {
  return (rows || []).map((r) => ({
    query: r.keys?.[0] ?? '',
    page: r.keys?.[1] ?? '',
    clicks: r.clicks ?? 0,
    impressions: r.impressions ?? 0,
    position: r.position ?? null,
  }));
}

/** 올린 글마다 실적 합계와 색인 상태를 묶는다. 실적이 없는 글은 0으로 두되 색인 상태로 이유를 본다. */
export function summarizePages(posts, pageRows, inspections) {
  const byUrl = new Map((pageRows || []).map((r) => [r.keys?.[0], r]));
  return (posts || []).filter((p) => p?.url).map((p) => {
    const r = byUrl.get(p.url);
    return {
      url: p.url,
      topicId: p.topicId ?? null,
      cluster: p.cluster ?? null,
      clicks: r?.clicks ?? 0,
      impressions: r?.impressions ?? 0,
      position: r?.position ?? null,
      index: inspections.get(p.url) ?? null,
    };
  });
}

/** URL 검사 한 건. 실패해도 전체 수집을 멈추지 않고 error만 적는다. */
async function inspect(url, deps) {
  try {
    const j = await postJson(INSPECT_URL, {inspectionUrl: url, siteUrl: SITE, languageCode: 'ko'}, deps);
    const s = j?.inspectionResult?.indexStatusResult || {};
    return {verdict: s.verdict ?? null, coverageState: s.coverageState ?? null, lastCrawlTime: s.lastCrawlTime ?? null};
  } catch (err) {
    return {error: err.message};
  }
}

/** 수집해서 data/blog/search-console.json에 쓰고 결과를 돌려준다. */
export async function collectSearchConsole({
  projectDir = process.cwd(),
  now = Date.now(),
  fetchImpl = globalThis.fetch,
  getToken = getBlogAccessToken,
} = {}) {
  const blogDir = path.join(projectDir, 'data', 'blog');
  const tok = await getToken({projectDir, fetchImpl});
  const token = typeof tok === 'string' ? tok : tok?.accessToken || tok?.access_token;
  if (!token) throw new Error('블로그 구글 토큰을 받지 못했습니다(node scripts/blog/google-auth.mjs login).');
  const deps = {token, fetchImpl};
  const range = rangeFor(now);
  const base = {...range, dataState: 'all', dimensionFilterGroups: pageFilter, rowLimit: ROW_LIMIT};

  const [queryRes, pageRes] = await Promise.all([
    postJson(QUERY_URL, {...base, dimensions: ['query', 'page']}, deps),
    postJson(QUERY_URL, {...base, dimensions: ['page']}, deps),
  ]);

  let posts = [];
  try { posts = JSON.parse(await readFile(path.join(blogDir, 'tech-posts.json'), 'utf8')); } catch { posts = []; }
  const inspections = new Map();
  for (const p of posts) if (p?.url) inspections.set(p.url, await inspect(p.url, deps));

  const queries = toQueryRows(queryRes.rows).sort((a, b) => b.impressions - a.impressions);
  const pages = summarizePages(posts, pageRes.rows, inspections);
  const result = {
    collectedAt: new Date(now).toISOString(),
    site: SITE,
    host: BLOG_HOST,
    range,
    totals: {
      clicks: pages.reduce((a, p) => a + p.clicks, 0),
      impressions: pages.reduce((a, p) => a + p.impressions, 0),
    },
    pages,
    queries,
  };
  await writeFile(path.join(blogDir, OUT_FILE), `${JSON.stringify(result, null, 2)}\n`);
  return result;
}

/** 색인된 글 수(구글 판정 PASS). */
export function indexedCount(sc) {
  return (sc?.pages || []).filter((p) => p?.index?.verdict === 'PASS').length;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    if (process.argv[2] !== 'collect') {
      console.log('사용법: node scripts/blog/search-console.mjs collect');
    } else {
      const sc = await collectSearchConsole();
      console.log(`기간 ${sc.range.startDate}~${sc.range.endDate} · 노출 ${sc.totals.impressions} · 클릭 ${sc.totals.clicks} · 색인 ${indexedCount(sc)}/${sc.pages.length}편`);
      for (const p of sc.pages) console.log(`- ${p.url} | 노출 ${p.impressions} · 클릭 ${p.clicks} | ${p.index?.coverageState || p.index?.error || '색인 상태 없음'}`);
      for (const q of sc.queries.slice(0, 20)) console.log(`  "${q.query}" → ${q.page} | 노출 ${q.impressions} · 클릭 ${q.clicks} · 순위 ${q.position?.toFixed?.(1) ?? '?'}`); // allow-literal: 보여 줄 줄 수
    }
  } catch (err) {
    console.error(`서치 콘솔 수집 실패: ${err.message}`);
    process.exitCode = 1;
  }
}
