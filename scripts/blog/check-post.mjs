// 쿠팡 블로그 초안·게시 HTML 자동 점검(Global Constraints 강제).
import {execFile} from 'node:child_process';
import {existsSync} from 'node:fs';
import {rm, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {promisify} from 'node:util';
import {findBannedTerms} from '../banned-terms.mjs';
import {EXTERNAL_SLOP_SCRIPT} from '../production-gate.mjs';
import {validateHeroBrief} from './hero-image.mjs';

const execFileAsync = promisify(execFile);

export const DISCLOSURE = '이 포스팅은 쿠팡 파트너스 활동의 일환으로, 이에 따른 일정액의 수수료를 제공받습니다.';

const BROWSER_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

export const EXPERIENCE_PATTERNS = [
  /써\s*보(?:니|면|고|았|었|겠|니까)|써\s*봤|써보니|써봤/,
  /사용해\s*보(?:니|면|고|았|었|겠|니까)|사용해\s*봤|사용해보니|사용해봤/,
  /직접\s*써(?!\s*보지\s*않)(?!\s*보진\s*않)/,
  /내돈내산/,
  /실사용/,
  /후기(?!형|버전|모델)/,
  /(?:제가|내가)\s*(?:직접\s*)?(?:써|사용해|구매해|사\s*보|만져|해\s*보)(?:니|봤|았|었)/,
];

export const RISKY_STEP_PATTERNS = [
  /(?:기기|제품|본체|뒷판|커버|케이스)\s*(?:을|를)?\s*분해|분해해|분해하/,
  /배터리\s*(?:을|를)?\s*교체/,
  /충전\s*(?:회로|단자|방식)?\s*개조/,
  /(?:전원|전기)\s*배선/,
  /배선\s*(?:을|를)?\s*(?:교체|연결|개조|수정)/,
  /펌웨어\s*강제/,
  /초기화\s*우회/,
  /보증(?:이)?\s*무효/,
];

export const RESET_PATTERNS = [
  /공장\s*초기화/,
  /(?:데이터|설정|전체|기기)\s*초기화/,
  /초기화를\s*(?:진행|실행|합|해)/,
];

const SERVICE_CENTER_RE = /서비스\s*센터/;
const BACKUP_RE = /백업/;
const COUPANG_URL_RE = /(?:^|\/\/|\.)coupang\.com(?:\/|$|\?)|(?:^|\/\/|\.)coupa\.ng(?:\/|$|\?)/i;

const normalizeWs = (s) => String(s || '').replace(/\s+/g, ' ').trim();

function decodeEntities(s) {
  return String(s || '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)));
}

function htmlToText(html) {
  return normalizeWs(
    decodeEntities(
      String(html || '')
        .replace(/<script\b[\s\S]*?<\/script>/gi, ' ')
        .replace(/<style\b[\s\S]*?<\/style>/gi, ' ')
        .replace(/<[^>]+>/g, ' '),
    ),
  );
}

function htmlToMarkdownText(html) {
  return decodeEntities(
    String(html || '')
      .replace(/<script\b[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style\b[\s\S]*?<\/style>/gi, ' ')
      .replace(/<\/(?:p|div|li|h[1-6]|blockquote|tr)>|<br\s*\/?>/gi, '\n')
      .replace(/<[^>]+>/g, ' '),
  )
    .replace(/[ \t]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

async function defaultRunSlop({title = '', bodyHtml = ''} = {}) {
  if (!existsSync(EXTERNAL_SLOP_SCRIPT)) {
    return {missing: true};
  }
  const text = `${String(title || '').trim()}\n\n${htmlToMarkdownText(bodyHtml)}`.trim();
  const tmpFile = path.join(
    tmpdir(),
    `blog-slop-${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2)}.md`,
  );
  await writeFile(tmpFile, text, 'utf8');
  try {
    const {stdout} = await execFileAsync(
      'python',
      ['-X', 'utf8', EXTERNAL_SLOP_SCRIPT, tmpFile, '--genre', '줄글', '--json', '--strict'],
      {cwd: path.dirname(EXTERNAL_SLOP_SCRIPT), encoding: 'utf8', timeout: 20000}, // allow-literal: 외부 AI 티 검사기 제한 시간(ms)
    );
    let report = null;
    try { report = JSON.parse(stdout); } catch { /* ignore */ }
    return {ok: true, report};
  } catch (err) {
    let report = null;
    try { report = JSON.parse(err.stdout || ''); } catch { /* ignore */ }
    return {ok: false, report, reason: err.message};
  } finally {
    await rm(tmpFile, {force: true});
  }
}

function findEarliestResetIndex(text) {
  let best = -1;
  for (const re of RESET_PATTERNS) {
    const m = text.match(re);
    if (m && (best === -1 || m.index < best)) best = m.index;
  }
  return best;
}

function hasRiskyStepWithoutGuidance(draft, bodyHtml) {
  const steps = Array.isArray(draft?.steps) ? draft.steps : [];
  for (const step of steps) {
    const t = normalizeWs(step?.text);
    if (t && RISKY_STEP_PATTERNS.some((re) => re.test(t)) && !SERVICE_CENTER_RE.test(t)) {
      return `위험 단계에 서비스센터 안내가 빠졌습니다: ${t}`;
    }
  }
  const chunks = htmlToMarkdownText(bodyHtml).split(/[\n.!?]+/);
  for (const raw of chunks) {
    const chunk = normalizeWs(raw);
    if (chunk && RISKY_STEP_PATTERNS.some((re) => re.test(chunk)) && !SERVICE_CENTER_RE.test(chunk)) {
      return `본문의 위험 단계에 서비스센터 안내가 빠졌습니다: ${chunk}`;
    }
  }
  return null;
}

function hasResetWithoutBackup(draft, bodyText) {
  const idx = findEarliestResetIndex(bodyText);
  if (idx !== -1) {
    if (!BACKUP_RE.test(bodyText.slice(0, idx))) {
      return '초기화 단계 앞에 백업 안내가 없습니다.';
    }
    return null;
  }
  const steps = Array.isArray(draft?.steps) ? draft.steps : [];
  let seenBackup = false;
  for (const step of steps) {
    const t = normalizeWs(step?.text);
    const sIdx = findEarliestResetIndex(t);
    if (sIdx !== -1 && !seenBackup && !BACKUP_RE.test(t.slice(0, sIdx))) {
      return '초기화 단계 앞에 백업 안내가 없습니다.';
    }
    if (BACKUP_RE.test(t)) seenBackup = true;
  }
  return null;
}

/** 쿠팡 블로그 초안을 게시 전 규칙으로 점검한다. */
export async function checkTechPost(
  draft,
  {posts = [], fetchImpl = globalThis.fetch, runSlop = defaultRunSlop} = {},
) {
  const problems = [];
  const title = normalizeWs(draft?.title);
  const bodyHtml = String(draft?.bodyHtml || '');
  const bodyText = htmlToText(bodyHtml);
  const note = normalizeWs(draft?.notUsedNote);
  const steps = Array.isArray(draft?.steps) ? draft.steps : [];
  const sources = Array.isArray(draft?.sources) ? draft.sources : [];

  if (draft?.topicId && (posts || []).some((p) => p?.topicId === draft.topicId)) {
    problems.push({id: 'duplicate-topic', text: `이미 쓴 주제입니다: ${draft.topicId}`});
  }

  if (!note || !bodyText.includes(note)) {
    problems.push({id: 'no-not-used-note', text: '직접 써 보지 않았다는 안내 문구가 없거나 본문에 빠졌습니다.'});
  }

  if (!sources.length) {
    problems.push({id: 'no-sources', text: '출처 목록(sources)이 비어 있습니다.'});
  }

  if (steps.some((s) => !normalizeWs(s?.source?.url) || !normalizeWs(s?.source?.quote))) {
    problems.push({id: 'step-without-source', text: '출처 주소나 원문 인용이 빠진 해결 단계가 있습니다.'});
  }

  if (steps.some((s) => !normalizeWs(s?.text) || !bodyText.includes(normalizeWs(s?.text)))) {
    problems.push({id: 'step-not-in-body', text: '본문에 들어 있지 않은 해결 단계가 있습니다.'});
  }

  const fullText = `${title}\n${bodyText}\n${note}`;
  const expMatch = EXPERIENCE_PATTERNS.map((re) => fullText.match(re)).find(Boolean);
  if (expMatch) {
    problems.push({id: 'experience-claim', text: `써 본 척 표현이 포함됐습니다: ${expMatch[0]}`});
  }

  const banned = findBannedTerms(fullText);
  if (banned.length) {
    problems.push({
      id: 'banned-term',
      text: `금지어 포함: ${[...new Set(banned.map((h) => h.term))].join(', ')}`,
    });
  }

  const riskyMsg = hasRiskyStepWithoutGuidance(draft, bodyHtml);
  if (riskyMsg) {
    problems.push({id: 'risky-step', text: riskyMsg});
  }

  const resetMsg = hasResetWithoutBackup(draft, bodyText);
  if (resetMsg) {
    problems.push({id: 'reset-without-backup', text: resetMsg});
  }

  const urls = [
    ...new Set(
      [...sources.map((s) => s?.url), ...steps.map((s) => s?.source?.url)]
        .map((u) => String(u || '').trim())
        .filter(Boolean),
    ),
  ];
  const badUrls = [];
  for (const url of urls) {
    try {
      const res = await fetchImpl(url, {method: 'GET', headers: {'User-Agent': BROWSER_USER_AGENT}});
      if (res?.status !== 200) { // allow-literal: HTTP 성공 코드
        badUrls.push(`${url} (${res?.status ?? 'no-status'})`);
      }
    } catch (err) {
      badUrls.push(`${url} (${err.message})`);
    }
  }
  if (badUrls.length) {
    problems.push({id: 'source-unreachable', text: `출처를 열지 못했습니다: ${badUrls.join(', ')}`});
  }

  // 모든 글은 대표 그림 설계도(heroImage)가 있어야 한다(설계 2026-11-25 D절). 값은 정하지 않고 빈칸·안전선만 본다.
  const heroCheck = validateHeroBrief(draft?.heroImage, {topic: {title: draft?.title, productHint: draft?.product?.query}});
  for (const p of heroCheck.problems) problems.push({id: `hero-${p.id}`, text: p.text});

  const slop = await runSlop({title: draft?.title || '', bodyHtml});
  if (slop?.missing) {
    problems.push({id: 'slop-checker-missing', text: '외부 AI 티 검사기(slop-rewrite)를 찾지 못했습니다.'});
  } else if (!slop?.ok) {
    problems.push({id: 'slop', text: slop?.reason || '한국어 AI 티 검사(slop-rewrite)를 통과하지 못했습니다.'});
  }

  return {ok: problems.length === 0, problems};
}

function readAttr(attrs, name) {
  const re = new RegExp(`\\b${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i');
  const m = String(attrs || '').match(re);
  return m ? (m[1] ?? m[2] ?? m[3] ?? '') : '';
}

const HERO_SRC_PREFIX = 'https://blogger.googleusercontent.com/';

/** 대표 그림 HTML 규칙(설계 D절). hero가 주어졌을 때만 부른다. */
function checkHeroImageHtml(src) {
  const problems = [];
  const img = src.match(/<img\b([^>]*)>/i);
  if (!img) {
    return [{id: 'hero-img-missing', text: '본문에 대표 그림(<img>)이 없습니다.'}];
  }
  const attrs = img[1];
  const imgSrc = decodeEntities(readAttr(attrs, 'src'));
  if (!imgSrc.startsWith(HERO_SRC_PREFIX)) {
    problems.push({id: 'hero-img-src', text: `대표 그림 주소가 ${HERO_SRC_PREFIX}로 시작하지 않습니다.`});
  }
  const missingAttrs = ['alt', 'width', 'height'].filter((name) => !normalizeWs(readAttr(attrs, name)));
  if (missingAttrs.length) {
    problems.push({id: 'hero-img-attrs', text: `대표 그림에 ${missingAttrs.join(', ')} 속성이 빠져 있습니다.`});
  }
  if (readAttr(attrs, 'loading').toLowerCase() === 'lazy') {
    problems.push({id: 'hero-img-lazy', text: '대표 그림에 loading="lazy"가 있습니다. 가장 큰 그림은 지연 로딩하지 않습니다.'});
  }
  if (readAttr(attrs, 'fetchpriority').toLowerCase() !== 'high') {
    problems.push({id: 'hero-img-priority', text: '대표 그림에 fetchpriority="high"가 없습니다.'});
  }
  if (/coupangcdn\.com/i.test(src)) {
    problems.push({id: 'hero-coupangcdn', text: '본문에 쿠팡 그림 주소(coupangcdn.com)가 있습니다.'});
  }
  return problems;
}

/**
 * 게시할 HTML 또는 라이브 HTML의 대가 문구·제휴 링크 속성을 점검한다.
 * `hero`가 주어지면 대표 그림 규칙도 본다(없으면 예전과 같다).
 */
export function checkRenderedHtml(html, {hero} = {}) {
  const problems = [];
  const src = String(html || '');
  const firstP = src.match(/<p\b[^>]*>([\s\S]*?)<\/p>/i);
  if (!firstP || htmlToText(firstP[1]) !== DISCLOSURE) {
    problems.push({id: 'disclosure-missing', text: '첫 문단이 쿠팡 파트너스 대가 문구 원문과 다릅니다.'});
  }

  let hasUnmarkedLink = false;
  for (const m of src.matchAll(/<a\b([^>]*)>/gi)) {
    const href = decodeEntities(readAttr(m[1], 'href'));
    if (!COUPANG_URL_RE.test(href)) continue;
    const relTokens = readAttr(m[1], 'rel').toLowerCase().split(/\s+/).filter(Boolean);
    if (!relTokens.includes('sponsored')) {
      hasUnmarkedLink = true;
      break;
    }
  }
  if (hasUnmarkedLink) {
    problems.push({id: 'link-not-sponsored', text: '쿠팡 링크에 rel="sponsored" 속성이 빠져 있습니다.'});
  }

  if (hero) problems.push(...checkHeroImageHtml(src));

  return problems;
}
