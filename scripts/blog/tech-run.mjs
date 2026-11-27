// 쿠팡 블로그(tech.d40m.com) 1회 실행 오케스트레이터.
// CLI: node scripts/blog/tech-run.mjs [--preview|--publish-draft <파일>|--force-day]
import {existsSync} from 'node:fs';
import {mkdir, readFile, writeFile} from 'node:fs/promises';
import {hostname as osHostname} from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

import {
  appendPost,
  appendRun,
  kstDate,
  kstWeekday,
  readPause,
  readPosts,
  readQueue,
  readRuns,
  rotateQueue,
  shiftQueue,
  writePause,
} from './blog-store.mjs';
import {checkRenderedHtml, checkTechPost} from './check-post.mjs';
import {produceHero} from './hero-stage.mjs';
import {deeplink, searchProducts} from './coupang-partners.mjs';
import {getBlogAccessToken} from './google-auth.mjs';
import {listTodayLivePosts, publishDraft, publishToBlogger, renderPostHtml, verifyLive} from './publish-post.mjs';
import {applyPostSettings, toPermalinkSlug} from './blogger-post-settings.mjs';
import {buildWriterPrompt, resolveClaudeExe, runWriter} from './write-tech-post.mjs';
import {collectSearchConsole} from './search-console.mjs';
import {collectCoupangReports} from './coupang-reports.mjs';
import {syncPaths} from '../loop-data-sync.mjs';
import {safePull} from '../safe-pull.mjs';

export const WRITING_WEEKDAYS = [1, 3, 5]; // allow-literal: 설계 6-2 처음 4주 주 3편 가설
export const MAX_CONSECUTIVE_REJECTS = 3; // allow-literal: 설계 6-7

const PULL_ERROR_MAX_CHARS = 300; // allow-literal: 오류 문구 길이 제한
const MODULE_DIR =path.dirname(fileURLToPath(import.meta.url));
const COUPANG_SHORT_PREFIX = 'https://link.coupang.com/';

const squash = (text) => String(text || '').toLowerCase().replace(/\s+/g, '');
const termList = (list) => (Array.isArray(list) ? list : []).map((t) => String(t || '').trim()).filter(Boolean);

/**
 * 상품명(대소문자·띄어쓰기 무시)이 조건에 맞는 첫 후보를 고른다. 없으면 null.
 * spec은 query 문자열 또는 draft.product 모양 {query, mustHave, mustNotHave}.
 * - query의 핵심 낱말이 모두 들어가야 한다.
 * - mustHave의 항목마다 하나 이상 들어가야 한다("케이블|젠더|어댑터"처럼 |로 나눈 것은 그중 하나).
 * - mustNotHave의 낱말이 하나라도 들어가면 뺀다.
 * 2026-11-27: 검색어 "HDMI 미러링"만으로 고르다 본문은 "유선"인데 무선 송신기가 붙은 사고로 추가.
 */
export function pickMatchingProduct(candidates, spec) {
  const product = typeof spec === 'string' || spec == null ? {query: spec} : spec;
  const keywords = String(product.query || '')
    .trim()
    .split(/\s+/)
    .map((w) => w.replace(/^[,.'"`()[\]{}]+|[,.'"`()[\]{}]+$/g, ''))
    .filter(Boolean)
    .map(squash);
  if (keywords.length === 0) return null;
  const mustHave = termList(product.mustHave).map((t) => t.split('|').map(squash).filter(Boolean)).filter((alts) => alts.length > 0);
  const mustNotHave = termList(product.mustNotHave).map(squash);

  for (const candidate of candidates || []) {
    const name = squash(candidate?.productName);
    if (!name) continue;
    if (!keywords.every((kw) => name.includes(kw))) continue;
    if (!mustHave.every((alts) => alts.some((t) => name.includes(t)))) continue;
    if (mustNotHave.some((t) => name.includes(t))) continue;
    return candidate;
  }
  return null;
}

function countTrailingRejects(runs, target = 'rejected') {
  let count = 0;
  for (let i = runs.length - 1; i >= 0; i -= 1) {
    const outcome = runs[i]?.outcome;
    if (outcome === target) {
      count += 1;
    } else if (outcome === 'published' || outcome === 'paused') {
      break;
    }
  }
  return count;
}

async function resolveTechBlogId(projectDir, depsBlogId) {
  if (depsBlogId) return depsBlogId;
  const candidates = [
    path.join(projectDir, 'data', 'blog', 'blogs.json'),
    path.resolve(MODULE_DIR, '../../data/blog/blogs.json'),
  ];
  for (const file of candidates) {
    if (!existsSync(file)) continue;
    try {
      const cfg = JSON.parse(await readFile(file, 'utf8'));
      if (cfg?.tech?.blogId) return String(cfg.tech.blogId);
    } catch {
      // 다음 경로 시도
    }
  }
  throw new Error('data/blog/blogs.json에서 tech.blogId를 찾을 수 없습니다.');
}

async function persistDraft(absDraftPath, draft) {
  if (!absDraftPath) return;
  await mkdir(path.dirname(absDraftPath), {recursive: true});
  await writeFile(absDraftPath, JSON.stringify(draft, null, 2) + '\n', 'utf8');
}

async function resolveProductLink(draft, absDraftPath, d) {
  const product = draft?.product;
  if (!product || !String(product.query || '').trim()) {
    return {ok: true, productLink: null};
  }

  // publish-draft에서 이미 선택된 단축 링크가 있으면 재활용
  if (product.chosenProductId && Array.isArray(product.candidates)) {
    const existing = product.candidates.find((c) => c?.productId === product.chosenProductId);
    if (existing?.productUrl?.startsWith(COUPANG_SHORT_PREFIX)) {
      return {
        ok: true,
        productLink: {shortenUrl: existing.productUrl, productName: existing.productName},
      };
    }
  }

  let candidates;
  try {
    const raw = await d.searchProducts(product.query, {limit: 10}); // allow-literal: 후보 10개 검색(조건 거르기 여유)
    candidates = (Array.isArray(raw) ? raw : []).map((c) => ({
      productId: c.productId,
      productName: c.productName,
      productUrl: c.productUrl,
    }));
  } catch (err) {
    if (product.required) {
      return {ok: false, reason: `쿠팡 상품 검색 실패: ${err.message}`};
    }
    return {ok: true, productLink: null};
  }

  product.candidates = candidates;
  const chosen = pickMatchingProduct(candidates, product);
  if (!chosen) {
    await persistDraft(absDraftPath, draft);
    if (product.required) {
      return {ok: false, reason: `규격에 맞는 쿠팡 상품을 찾지 못했습니다: ${product.query}`};
    }
    return {ok: true, productLink: null};
  }

  product.chosenProductId = chosen.productId;
  await persistDraft(absDraftPath, draft);

  if (String(chosen.productUrl || '').startsWith(COUPANG_SHORT_PREFIX)) {
    return {
      ok: true,
      productLink: {shortenUrl: chosen.productUrl, productName: chosen.productName},
    };
  }

  try {
    const links = await d.deeplink([chosen.productUrl]);
    const shortenUrl = links?.[0]?.shortenUrl;
    if (!shortenUrl) {
      throw new Error('쿠팡 딥링크 응답에 shortenUrl이 없습니다.');
    }
    return {
      ok: true,
      productLink: {shortenUrl, productName: chosen.productName},
    };
  } catch (err) {
    if (product.required) {
      return {ok: false, reason: `쿠팡 딥링크 생성 실패: ${err.message}`};
    }
    return {ok: true, productLink: null};
  }
}

/** 시작할 때 최신 기록을 받는다. 실패해도 던지지 않고 {ok:false, error}로 알린다(2026-11-27: PC 2대가 켜져 있는 쪽이 실행). */
async function defaultGitPull({projectDir}) {
  // 부딪히는 자동 데이터 파일은 백업 후 원격 것으로 맞추고 받는다(scripts/safe-pull.mjs). 던지지 않는다.
  const r = await safePull({projectDir});
  if (r.skipped) return {ok: true};
  // 코드·문서가 부딪히면 safePull이 받지 않고 ok:false(stage 'conflict')로 돌려준다.
  if (!r.ok) return {ok: false, error: String(r.error || '').slice(0, PULL_ERROR_MAX_CHARS)};
  return {ok: true};
}

/** 이번 실행 결과가 담긴 data/blog만 깃에 올린다(담당 PC 검사 없음). */
function defaultSyncBlogData({projectDir, now, outcome, host}) {
  return syncPaths({
    projectDir,
    now,
    thisHost: host,
    paths: ['data/blog'],
    label: `chore(blog): 무인 실행 기록 ${kstDate(now)} ${outcome} (${host})`,
  });
}

function buildDeps(deps = {}) {
  return {
    readQueue,
    shiftQueue,
    rotateQueue,
    readPosts,
    appendPost,
    readRuns,
    appendRun,
    readPause,
    writePause,
    getBlogAccessToken,
    resolveClaudeExe,
    buildWriterPrompt,
    runWriter,
    searchProducts,
    deeplink,
    checkTechPost,
    checkRenderedHtml,
    renderPostHtml,
    publishToBlogger,
    publishDraft,
    applyPostSettings,
    verifyLive,
    listTodayLivePosts,
    gitPull: defaultGitPull,
    syncBlogData: defaultSyncBlogData,
    collectSearchConsole,
    collectCoupangReports,
    hostname: () => osHostname(),
    produceHero,
    ...deps,
  };
}

/** 쿠팡 블로그 무인/수동 1회 실행을 수행하고 실행 기록을 저장·반환한다. */
// 글쓰기 과정 기록(output/blog/logs, 깃 제외·드라이브 공유). 시간 초과 원인을 다른 PC에서도 보게 한다(2026-11-27).
async function writerLogPath(projectDir, date, name) {
  const dir = path.join(projectDir, 'output', 'blog', 'logs');
  await mkdir(dir, {recursive: true});
  return path.join(dir, `${date}-${name}-${Date.now()}.jsonl`);
}

export async function runTechOnce({
  projectDir = process.cwd(),
  now = new Date(),
  mode = 'auto',
  draftPath,
  forceDay = false,
  // 사람이 손으로 돌릴 때만 쓰는 선택지(2026-11-27 사용자: 새 게시 순서를 실제 글로 시험). 무인 실행은 쓰지 않는다.
  allowSecondToday = false,
  topicPick = null,
  deps = {},
} = {}) {
  const d = buildDeps(deps);
  const date = kstDate(now);
  const startedAt = now.toISOString();
  const blogDir = path.join(projectDir, 'data', 'blog');

  const host = d.hostname();
  let pullFailed = false;
  let liveCheckFailed = false;

  // 모든 기록에 이 PC 이름과 실행 중 생긴 경고 표시를 붙인다.
  const annotate = (record) => ({
    ...record,
    host,
    ...(pullFailed ? {pullFailed: true} : {}),
    ...(liveCheckFailed ? {liveCheckFailed: true} : {}),
  });

  // 결과를 깃에 올린다: 무인(auto) 실행은 other-pc-ran을 뺀 모든 결과, publish-draft는 게시 성공만, preview는 올리지 않는다.
  // 올리기가 실패해도 결과는 바꾸지 않고 반환값에만 syncError를 붙인다.
  const syncAfter = async (rec) => {
    const shouldSync =
      rec.outcome !== 'other-pc-ran' &&
      (mode === 'auto' || (mode === 'publish-draft' && rec.outcome === 'published'));
    if (!shouldSync) return rec;
    // 무인 실행마다 구글 서치 콘솔 실적·색인을 새로 모아 같이 올린다(2026-11-27 사용자 결정). 실패해도 실행 결과는 그대로.
    if (mode === 'auto') {
      try {
        await d.collectSearchConsole({projectDir, now: now.getTime?.() ?? now});
      } catch (err) {
        rec.searchConsoleError = err?.message || String(err);
      }
      // 쿠팡 파트너스 실적도 같이 모은다(2026-11-27). 결과는 드라이브 공유 폴더(output/blog/private)라 git에는 안 올라간다.
      try {
        await d.collectCoupangReports({projectDir, now: now.getTime?.() ?? now});
      } catch (err) {
        rec.coupangReportsError = err?.message || String(err);
      }
    }
    try {
      await d.syncBlogData({projectDir, now, outcome: rec.outcome, host});
    } catch (err) {
      rec.syncError = err?.message || String(err);
    }
    return rec;
  };

  const recordAndReturn = async (record) => {
    const rec = annotate(record);
    await d.appendRun(blogDir, rec);
    return syncAfter(rec);
  };

  // 시작할 때 최신 기록을 받는다. 실패해도 진행하고(기록에 pullFailed), 올리기 직전 블로거 확인이 마지막 안전장치다.
  if (mode === 'auto') {
    let pullRes;
    try {
      pullRes = await d.gitPull({projectDir});
    } catch (err) {
      pullRes = {ok: false, error: err?.message};
    }
    if (!pullRes?.ok) pullFailed = true;

    // 다른 PC가 오늘 이미 돌았으면 쉰다. 이 기록은 커밋하지 않는다(host 없는 옛 기록은 무시).
    const todayRuns = (await d.readRuns(blogDir)).filter((r) => r?.date === date && r?.host);
    const otherRun = todayRuns.find((r) => String(r.host).toLowerCase() !== String(host).toLowerCase());
    if (otherRun) {
      return recordAndReturn({date, startedAt, outcome: 'other-pc-ran', otherHost: otherRun.host});
    }
  }

  const pauseState = await d.readPause(blogDir);
  if (pauseState?.paused) {
    return recordAndReturn({
      date,
      startedAt,
      outcome: 'paused',
      ...(pauseState.reason ? {reasons: [pauseState.reason]} : {}),
    });
  }

  if (mode === 'auto' && !forceDay && !WRITING_WEEKDAYS.includes(kstWeekday(now))) {
    return recordAndReturn({date, startedAt, outcome: 'not-writing-day'});
  }

  const posts = await d.readPosts(blogDir);
  if (mode !== 'preview' && !allowSecondToday && posts.some((p) => p?.date === date)) {
    return recordAndReturn({date, startedAt, outcome: 'already-posted-today'});
  }

  let draft;
  let topicId;
  let absDraftPath;
  let token = null;
  // 이번 실행에서 글쓰기 AI로 새로 쓴 초안일 때만 탈락 시 1번 고쳐 쓴다(2026-11-27 시험: 오탐·실수 한 번에 탈락 방지).
  let rewriteCtx = null;

  if (mode === 'publish-draft') {
    if (!draftPath) {
      return recordAndReturn({date, startedAt, outcome: 'rejected', reasons: ['draftPath가 필요합니다.']});
    }
    absDraftPath = path.resolve(projectDir, draftPath);
    try {
      draft = JSON.parse(await readFile(absDraftPath, 'utf8'));
    } catch (err) {
      return recordAndReturn({
        date,
        startedAt,
        outcome: 'rejected',
        reasons: [`초안 파일을 읽지 못했습니다: ${err.message}`],
      });
    }
    topicId = draft?.topicId || path.basename(absDraftPath, '.json');
    token = await d.getBlogAccessToken({projectDir});
    if (!token) {
      return recordAndReturn({
        date,
        startedAt,
        outcome: 'auth-failed',
        topicId,
        reasons: ['구글 블로그 인증 토큰이 없거나 갱신에 실패했습니다.'],
      });
    }
  } else {
    const queue = await d.readQueue(blogDir);
    if (!queue.length) {
      return recordAndReturn({date, startedAt, outcome: 'queue-empty'});
    }
    const topic = topicPick ? queue.find((t) => t?.topicId === topicPick) : queue[0];
    if (!topic) {
      return recordAndReturn({date, startedAt, outcome: 'topic-not-in-queue', reasons: [`대기열에 없는 주제입니다: ${topicPick}`]});
    }
    topicId = topic.topicId;

    if (mode === 'auto') {
      token = await d.getBlogAccessToken({projectDir});
      if (!token) {
        return recordAndReturn({
          date,
          startedAt,
          outcome: 'auth-failed',
          topicId,
          reasons: ['구글 블로그 인증 토큰이 없거나 갱신에 실패했습니다.'],
        });
      }
    }

    const relDraftPath = draftPath || path.posix.join('data/blog/drafts', `${topicId}.json`);
    absDraftPath = path.resolve(projectDir, relDraftPath);
    // 앞선 실행이 그림 단계에서 멈췄다면 글을 다시 쓰지 않고 남은 초안으로 그림부터 다시 한다(설계 C절).
    const priorRuns = await d.readRuns(blogDir);
    // 다른 PC가 쉰 날의 other-pc-ran 기록은 이어받기 판단에서 건너뛴다.
    const lastRun = priorRuns.filter((r) => r?.outcome !== 'other-pc-ran').pop();
    let resumed = null;
    if (lastRun?.outcome === 'image-deferred' && lastRun.topicId === topicId && existsSync(absDraftPath)) {
      try {
        resumed = JSON.parse(await readFile(absDraftPath, 'utf8'));
      } catch {
        resumed = null;
      }
    }
    if (resumed) {
      draft = resumed;
    } else {
      const exe = d.resolveClaudeExe();
      const recentBriefs = posts.slice(-5).map((p) => p?.hero?.brief).filter(Boolean); // allow-literal: 설계 C절 최근 설계도 5개
      const prompt = await d.buildWriterPrompt(topic, {posts, draftPath: relDraftPath, recentBriefs});
      const writerRes = await d.runWriter({exe, prompt, draftPath: absDraftPath, cwd: projectDir, logPath: await writerLogPath(projectDir, date, topicId)});
      if (!writerRes?.ok) {
        return recordAndReturn({
          date,
          startedAt,
          outcome: 'writer-failed',
          topicId,
          reasons: [writerRes?.error || '글쓰기 실행에 실패했습니다.'],
        });
      }
      draft = writerRes.draft;
      rewriteCtx = {exe, prompt};
    }
    if (draft?.topicId) topicId = draft.topicId;
  }

  // 쿠팡 링크 단계와 글 점검을 한 번 거친다. 결과: deferred | rejected | ok
  const evaluateDraft = async () => {
    const productRes = await resolveProductLink(draft, absDraftPath, d);
    if (!productRes.ok) {
      return {kind: 'deferred', reasons: [productRes.reason]};
    }
    const productLink = productRes.productLink;
    // 2026-11-25 사용자 결정: 해결·구매 전 확인 글은 쿠팡 링크 1개 이상, 정보 설명형(info) 글은 링크 없이 게시 가능
    const topicKind = (await d.readQueue(blogDir)).find((t) => t?.topicId === topicId)?.kind;
    if (!productLink && topicKind !== 'info') {
      return {
        kind: 'deferred',
        reasons: ['해결·구매 전 확인 글에는 도움이 되는 쿠팡 링크가 1개 이상 필요합니다(상품을 찾지 못했거나 product가 비어 있습니다).'],
      };
    }

    const check = await d.checkTechPost(draft, {posts});
    const textHtml = d.renderPostHtml(draft, {productLink});
    const textHtmlProblems = d.checkRenderedHtml(textHtml);
    const allProblems = [...(check?.problems || []), ...(textHtmlProblems || [])];

    if (check?.ok === false || allProblems.length > 0) {
      const reasons = allProblems.map((p) => (typeof p === 'string' ? p : p?.text || p?.id)).filter(Boolean);
      if (reasons.length === 0) reasons.push('초안 점검에 실패했습니다.');
      return {kind: 'rejected', reasons};
    }
    return {kind: 'ok', productLink};
  };

  let extra = {};
  let evalRes = await evaluateDraft();
  if (evalRes.kind === 'rejected' && rewriteCtx) {
    const firstReasons = evalRes.reasons;
    // 다시 쓰기는 조사부터 새로 하면 10분 한도를 넘는다(2026-11-27 실제 시험: writer-failed 시간 초과).
    // runWriter가 초안 파일을 지우고 시작하므로 앞 초안 전체를 프롬프트에 넣고, 걸린 부분만 고치게 한다.
    const rewritePrompt = [
      rewriteCtx.prompt,
      '',
      '앞 초안이 아래 이유로 점검에서 탈락했다. 이유를 모두 고쳐 같은 파일에 다시 써라.',
      ...firstReasons.map((r) => `- ${r}`),
      '',
      '웹 검색·새 조사는 하지 마라. 아래 앞 초안에서 위 이유에 해당하는 부분만 고치고, 나머지 내용·출처·인용문은 그대로 둔 채 같은 JSON 형식으로 같은 파일에 Write 하라.',
      '앞 초안:',
      JSON.stringify(draft, null, 2),
    ].join('\n');
    const rewriteRes = await d.runWriter({exe: rewriteCtx.exe, prompt: rewritePrompt, draftPath: absDraftPath, cwd: projectDir, logPath: await writerLogPath(projectDir, date, `${topicId}-rewrite`)});
    if (!rewriteRes?.ok) {
      return recordAndReturn({
        date,
        startedAt,
        outcome: 'writer-failed',
        topicId,
        reasons: [rewriteRes?.error || '글쓰기 실행에 실패했습니다.'],
        rewrites: 1,
        firstReasons,
      });
    }
    draft = rewriteRes.draft;
    if (draft?.topicId) topicId = draft.topicId;
    extra = {rewrites: 1, firstReasons};
    evalRes = await evaluateDraft();
  }

  // 링크 때문에 미룬 글감은 대기열에서 빼지 않고 맨 뒤로 보낸다(무인 실행에서만).
  // 맨 앞에 두면 다음 실행이 같은 글감을 다시 쓰고 또 미루기를 끝없이 되풀이한다(2026-11-26 스케줄러 시험에서 발견).
  if (evalRes.kind === 'deferred') {
    if (mode === 'auto') await d.rotateQueue(blogDir, topicId);
    return recordAndReturn({date, startedAt, outcome: 'deferred', topicId, reasons: evalRes.reasons, ...extra});
  }
  if (evalRes.kind === 'rejected') {
    const reasons = evalRes.reasons;
    const priorRuns = await d.readRuns(blogDir);
    const rec = annotate({date, startedAt, outcome: 'rejected', topicId, reasons, ...extra});
    await d.appendRun(blogDir, rec);
    if (countTrailingRejects([...priorRuns, rec]) >= MAX_CONSECUTIVE_REJECTS) {
      await d.writePause(blogDir, `점검 실패 ${MAX_CONSECUTIVE_REJECTS}회 연속: ${reasons.join('; ')}`, now);
    }
    return syncAfter(rec);
  }
  const productLink = evalRes.productLink;

  // 글이 점검을 통과했을 때만 그림 한도를 쓴다(설계 C절). 그림이 실패한 날은 게시를 미룬다.
  const blogId = await resolveTechBlogId(projectDir, d.blogId);
  const recentHashes = posts.map((p) => p?.hero?.hash).filter(Boolean);
  const heroRes = await d.produceHero({draft, topicId, mode, projectDir, blogId, token, recentHashes});
  if (!heroRes?.ok) {
    const priorRuns = await d.readRuns(blogDir);
    const rec = annotate({
      date,
      startedAt,
      outcome: 'image-deferred',
      topicId,
      reasons: heroRes?.reasons || ['대표 그림을 만들지 못했습니다.'],
      ...extra,
    });
    await d.appendRun(blogDir, rec);
    if (mode !== 'preview' && countTrailingRejects([...priorRuns, rec], 'image-deferred') >= MAX_CONSECUTIVE_REJECTS) {
      await d.writePause(blogDir, `대표 그림 실패 ${MAX_CONSECUTIVE_REJECTS}회 연속: ${rec.reasons.join('; ')}`, now);
    }
    return syncAfter(rec);
  }
  const hero = heroRes.hero;
  const html = d.renderPostHtml(draft, {productLink, hero});
  const finalProblems = d.checkRenderedHtml(html, heroRes.local ? {} : {hero});
  if (finalProblems.length > 0) {
    const reasons = finalProblems.map((p) => (typeof p === 'string' ? p : p?.text || p?.id)).filter(Boolean);
    return recordAndReturn({date, startedAt, outcome: 'rejected', topicId, reasons, ...extra});
  }

  if (mode === 'preview') {
    const previewDir = path.join(projectDir, 'output', 'blog', 'preview');
    const previewPath = path.join(previewDir, `${topicId}.html`);
    await mkdir(previewDir, {recursive: true});
    await writeFile(previewPath, html, 'utf8');
    return recordAndReturn({date, startedAt, outcome: 'preview', topicId, previewPath, ...extra});
  }

  // 올리기 직전 블로거에 오늘 올라간 글이 있는지 직접 확인한다(두 PC가 같은 날 올리는 사고 방지, 무인 실행만).
  // 확인이 실패하면 게시를 멈추지 않고 기록에 liveCheckFailed만 남긴다.
  if (mode === 'auto' && !allowSecondToday) {
    let liveToday = [];
    try {
      liveToday = (await d.listTodayLivePosts({token, blogId, date})) || [];
    } catch {
      liveCheckFailed = true;
    }
    if (liveToday.length > 0) {
      return recordAndReturn({
        date,
        startedAt,
        outcome: 'already-posted-today',
        topicId,
        reasons: [`블로거에 오늘 올라간 글이 이미 있습니다: ${liveToday[0]?.title || liveToday[0]?.url || ''}`],
        ...extra,
      });
    }
  }

  // 임시 글로 만든 뒤 글 주소(topicId)·검색 설명을 넣고 게시한다(2026-11-27: API에 두 칸이 없고 게시 뒤엔 주소를 못 바꾼다).
  // 넣기가 실패해도 게시는 하고 경고만 남긴다(자동 주소·본문 첫 줄 설명으로 나간다).
  const created = await d.publishToBlogger({
    blogId,
    title: draft.title,
    html,
    labels: draft.labels || [],
    token,
    isDraft: true,
  });
  const settingsWarnings = [];
  const slug = toPermalinkSlug(topicId);
  try {
    await d.applyPostSettings({blogId, postId: created.postId, permalink: slug, description: draft.description});
  } catch (err) {
    settingsWarnings.push(`글 주소·검색 설명을 넣지 못했습니다: ${String(err?.message || err).slice(0, PULL_ERROR_MAX_CHARS)}`);
  }
  const published = await d.publishDraft({blogId, postId: created.postId, token});
  if (slug && !String(published.url || '').includes(`/${slug}`)) {
    settingsWarnings.push(`글 주소가 정한 이름(${slug})과 다릅니다: ${published.url}`);
  }
  const live = await d.verifyLive(published.url);
  const liveWarnings = [
    ...settingsWarnings,
    ...(!live?.ok ? (live?.problems || []).map((p) => (typeof p === 'string' ? p : p?.text || p?.id)).filter(Boolean) : []),
  ];

  // 갈래는 다음 글이 같은 갈래 옛 글로 링크할 후보를 고르는 데 쓴다(2026-11-27 사용자: 새 글에서만 옛 글로 잇기).
  const cluster = (await d.readQueue(blogDir)).find((t) => t?.topicId === topicId)?.cluster || null;
  await d.appendPost(blogDir, {
    date,
    topicId,
    cluster,
    title: draft.title,
    url: published.url,
    postId: published.postId,
    sources: (draft.sources || []).map((s) => s?.url).filter(Boolean),
    productUrl: productLink?.shortenUrl || null,
    description: draft.description || null,
    hero: {url: hero.url, hash: hero.hash, brief: hero.brief},
  });
  await d.shiftQueue(blogDir, topicId);

  const rec = annotate({
    date,
    startedAt,
    outcome: 'published',
    topicId,
    postId: published.postId,
    url: published.url,
    liveVerified: Boolean(live?.ok),
    ...(liveWarnings.length ? {reasons: liveWarnings} : {}),
    ...extra,
  });
  await d.appendRun(blogDir, rec);
  return syncAfter(rec);
}

function parseCliArgs(argv) {
  let mode = 'auto';
  let draftPath;
  let forceDay = false;
  let allowSecondToday = false;
  let topicPick = null;

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--preview') {
      mode = 'preview';
    } else if (arg === '--force-day') {
      forceDay = true;
    } else if (arg === '--allow-second-today') {
      allowSecondToday = true;
    } else if (arg === '--topic') {
      topicPick = argv[i + 1];
      i += 1;
      if (!topicPick) throw new Error('--topic 뒤에 topicId가 필요합니다.');
    } else if (arg === '--publish-draft') {
      mode = 'publish-draft';
      draftPath = argv[i + 1];
      i += 1;
      if (!draftPath) throw new Error('--publish-draft 뒤에 초안 파일 경로가 필요합니다.');
    } else if (arg.startsWith('--publish-draft=')) {
      mode = 'publish-draft';
      draftPath = arg.slice('--publish-draft='.length);
      if (!draftPath) throw new Error('--publish-draft= 뒤에 초안 파일 경로가 필요합니다.');
    } else {
      throw new Error(`알 수 없는 인자입니다: ${arg}`);
    }
  }
  return {mode, draftPath, forceDay, allowSecondToday, topicPick};
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const opts = parseCliArgs(process.argv.slice(2));
    const result = await runTechOnce(opts);
    console.log(JSON.stringify(result, null, 2));
  } catch (err) {
    console.error(err.message);
    process.exitCode = 1;
  }
}
