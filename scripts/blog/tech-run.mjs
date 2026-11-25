// 쿠팡 블로그(tech.d40m.com) 1회 실행 오케스트레이터.
// CLI: node scripts/blog/tech-run.mjs [--preview|--publish-draft <파일>|--force-day]
import {existsSync} from 'node:fs';
import {mkdir, readFile, writeFile} from 'node:fs/promises';
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
import {publishToBlogger, renderPostHtml, verifyLive} from './publish-post.mjs';
import {buildWriterPrompt, resolveClaudeExe, runWriter} from './write-tech-post.mjs';
import {syncData} from '../loop-data-sync.mjs';

export const WRITING_WEEKDAYS = [1, 3, 5]; // allow-literal: 설계 6-2 처음 4주 주 3편 가설
export const MAX_CONSECUTIVE_REJECTS = 3; // allow-literal: 설계 6-7

const MODULE_DIR = path.dirname(fileURLToPath(import.meta.url));
const COUPANG_SHORT_PREFIX = 'https://link.coupang.com/';

/** query의 핵심 낱말이 모두 상품명(대소문자 무시)에 들어간 첫 후보를 고른다. 없으면 null. */
export function pickMatchingProduct(candidates, query) {
  const keywords = String(query || '')
    .trim()
    .split(/\s+/)
    .map((w) => w.replace(/^[,.'"`()[\]{}]+|[,.'"`()[\]{}]+$/g, ''))
    .filter(Boolean)
    .map((w) => w.toLowerCase());
  if (keywords.length === 0) return null;

  for (const candidate of candidates || []) {
    const name = String(candidate?.productName || '').toLowerCase();
    if (!name) continue;
    if (keywords.every((kw) => name.includes(kw))) {
      return candidate;
    }
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
    const raw = await d.searchProducts(product.query, {limit: 5}); // allow-literal: 후보 5개 검색
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
  const chosen = pickMatchingProduct(candidates, product.query);
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
    verifyLive,
    syncData,
    produceHero,
    ...deps,
  };
}

/** 쿠팡 블로그 무인/수동 1회 실행을 수행하고 실행 기록을 저장·반환한다. */
export async function runTechOnce({
  projectDir = process.cwd(),
  now = new Date(),
  mode = 'auto',
  draftPath,
  forceDay = false,
  deps = {},
} = {}) {
  const d = buildDeps(deps);
  const date = kstDate(now);
  const startedAt = now.toISOString();
  const blogDir = path.join(projectDir, 'data', 'blog');

  const recordAndReturn = async (record) => {
    await d.appendRun(blogDir, record);
    return record;
  };

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
  if (mode !== 'preview' && posts.some((p) => p?.date === date)) {
    return recordAndReturn({date, startedAt, outcome: 'already-posted-today'});
  }

  let draft;
  let topicId;
  let absDraftPath;
  let token = null;

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
    const topic = queue[0];
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
    const lastRun = priorRuns[priorRuns.length - 1];
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
      const writerRes = await d.runWriter({exe, prompt, draftPath: absDraftPath, cwd: projectDir});
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
    }
    if (draft?.topicId) topicId = draft.topicId;
  }

  // 링크 때문에 미룬 글감은 대기열에서 빼지 않고 맨 뒤로 보낸다(무인 실행에서만).
  // 맨 앞에 두면 다음 실행이 같은 글감을 다시 쓰고 또 미루기를 끝없이 되풀이한다(2026-11-26 스케줄러 시험에서 발견).
  const deferTopic = async (reasons) => {
    if (mode === 'auto') await d.rotateQueue(blogDir, topicId);
    return recordAndReturn({date, startedAt, outcome: 'deferred', topicId, reasons});
  };

  const productRes = await resolveProductLink(draft, absDraftPath, d);
  if (!productRes.ok) {
    return deferTopic([productRes.reason]);
  }
  const productLink = productRes.productLink;
  // 2026-11-25 사용자 결정: 해결·구매 전 확인 글은 쿠팡 링크 1개 이상, 정보 설명형(info) 글은 링크 없이 게시 가능
  const topicKind = (await d.readQueue(blogDir)).find((t) => t?.topicId === topicId)?.kind;
  if (!productLink && topicKind !== 'info') {
    return deferTopic(['해결·구매 전 확인 글에는 도움이 되는 쿠팡 링크가 1개 이상 필요합니다(상품을 찾지 못했거나 product가 비어 있습니다).']);
  }

  const check = await d.checkTechPost(draft, {posts});
  const textHtml = d.renderPostHtml(draft, {productLink});
  const textHtmlProblems = d.checkRenderedHtml(textHtml);
  const allProblems = [...(check?.problems || []), ...(textHtmlProblems || [])];

  if (check?.ok === false || allProblems.length > 0) {
    const reasons = allProblems.map((p) => (typeof p === 'string' ? p : p?.text || p?.id)).filter(Boolean);
    if (reasons.length === 0) reasons.push('초안 점검에 실패했습니다.');
    const priorRuns = await d.readRuns(blogDir);
    const rec = {date, startedAt, outcome: 'rejected', topicId, reasons};
    await d.appendRun(blogDir, rec);
    if (countTrailingRejects([...priorRuns, rec]) >= MAX_CONSECUTIVE_REJECTS) {
      await d.writePause(blogDir, `점검 실패 ${MAX_CONSECUTIVE_REJECTS}회 연속: ${reasons.join('; ')}`, now);
    }
    return rec;
  }

  // 글이 점검을 통과했을 때만 그림 한도를 쓴다(설계 C절). 그림이 실패한 날은 게시를 미룬다.
  const blogId = await resolveTechBlogId(projectDir, d.blogId);
  const recentHashes = posts.map((p) => p?.hero?.hash).filter(Boolean);
  const heroRes = await d.produceHero({draft, topicId, mode, projectDir, blogId, token, recentHashes});
  if (!heroRes?.ok) {
    const priorRuns = await d.readRuns(blogDir);
    const rec = {
      date,
      startedAt,
      outcome: 'image-deferred',
      topicId,
      reasons: heroRes?.reasons || ['대표 그림을 만들지 못했습니다.'],
    };
    await d.appendRun(blogDir, rec);
    if (mode !== 'preview' && countTrailingRejects([...priorRuns, rec], 'image-deferred') >= MAX_CONSECUTIVE_REJECTS) {
      await d.writePause(blogDir, `대표 그림 실패 ${MAX_CONSECUTIVE_REJECTS}회 연속: ${rec.reasons.join('; ')}`, now);
    }
    return rec;
  }
  const hero = heroRes.hero;
  const html = d.renderPostHtml(draft, {productLink, hero});
  const finalProblems = d.checkRenderedHtml(html, heroRes.local ? {} : {hero});
  if (finalProblems.length > 0) {
    const reasons = finalProblems.map((p) => (typeof p === 'string' ? p : p?.text || p?.id)).filter(Boolean);
    return recordAndReturn({date, startedAt, outcome: 'rejected', topicId, reasons});
  }

  if (mode === 'preview') {
    const previewDir = path.join(projectDir, 'output', 'blog', 'preview');
    const previewPath = path.join(previewDir, `${topicId}.html`);
    await mkdir(previewDir, {recursive: true});
    await writeFile(previewPath, html, 'utf8');
    return recordAndReturn({date, startedAt, outcome: 'preview', topicId, previewPath});
  }

  const published = await d.publishToBlogger({
    blogId,
    title: draft.title,
    html,
    labels: draft.labels || [],
    token,
  });
  const live = await d.verifyLive(published.url);
  const liveWarnings = !live?.ok
    ? (live?.problems || []).map((p) => (typeof p === 'string' ? p : p?.text || p?.id)).filter(Boolean)
    : [];

  await d.appendPost(blogDir, {
    date,
    topicId,
    title: draft.title,
    url: published.url,
    postId: published.postId,
    sources: (draft.sources || []).map((s) => s?.url).filter(Boolean),
    productUrl: productLink?.shortenUrl || null,
    hero: {url: hero.url, hash: hero.hash, brief: hero.brief},
  });
  await d.shiftQueue(blogDir, topicId);

  const rec = {
    date,
    startedAt,
    outcome: 'published',
    topicId,
    postId: published.postId,
    url: published.url,
    liveVerified: Boolean(live?.ok),
    ...(liveWarnings.length ? {reasons: liveWarnings} : {}),
  };
  await d.appendRun(blogDir, rec);
  await d.syncData({projectDir, now});
  return rec;
}

function parseCliArgs(argv) {
  let mode = 'auto';
  let draftPath;
  let forceDay = false;

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--preview') {
      mode = 'preview';
    } else if (arg === '--force-day') {
      forceDay = true;
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
  return {mode, draftPath, forceDay};
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
