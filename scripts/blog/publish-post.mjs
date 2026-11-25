// 쿠팡 블로그 게시용 HTML 조립, Blogger API v3 업로드, 라이브 URL 사후 검증.
import {DISCLOSURE, checkRenderedHtml} from './check-post.mjs';

const BLOGGER_API_BASE = 'https://www.googleapis.com/blogger/v3';
const HTTP_OK = 200; // allow-literal: HTTP 성공 응답 코드
const HERO_DISPLAY_WIDTH = 1200; // allow-literal: 대표 그림 표시 가로(설계 B절)
const HERO_DISPLAY_HEIGHT = 670; // allow-literal: 16:9 그림을 가로 1200으로 보일 때 세로(설계 B절)
const BROWSER_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

function escapeHtml(text) {
  return String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function stripLeadingDisclosure(html) {
  return String(html || '')
    .trim()
    .replace(new RegExp(`^<p\\b[^>]*>\\s*${DISCLOSURE.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*</p>\\s*`, 'i'), '');
}

/** 초안과 선택된 쿠팡 링크·출처 목록으로 최종 Blogger 게시 HTML을 만든다. */
export function renderPostHtml(draft, {productLink = null, hero = null} = {}) {
  const parts = [`<p>${DISCLOSURE}</p>`];
  // 대표 그림은 대가 문구 문단 바로 다음(첫 문단은 계속 대가 문구). hero.url은 /s1600/ 같은 크기까지 붙은 주소다.
  if (hero?.url) {
    const width = escapeHtml(hero.width ?? HERO_DISPLAY_WIDTH);
    const height = escapeHtml(hero.height ?? HERO_DISPLAY_HEIGHT);
    parts.push(
      `<p><img src="${escapeHtml(hero.url)}" alt="${escapeHtml(hero.alt)}" width="${width}" height="${height}" fetchpriority="high" decoding="async"></p>`,
    );
  }
  const body = stripLeadingDisclosure(draft?.bodyHtml);
  if (body) parts.push(body);

  if (productLink?.shortenUrl) {
    const whyHtml = draft?.product?.why
      ? `<p>${escapeHtml(draft.product.why)}</p>`
      : '';
    const linkText = escapeHtml(productLink.productName || '관련 상품 확인하기');
    const href = escapeHtml(productLink.shortenUrl);
    parts.push(
      `<section class="blog-product"><h2>필요한 제품 확인</h2>${whyHtml}<p><a href="${href}" rel="sponsored nofollow" target="_blank">${linkText}</a></p></section>`,
    );
  }

  const sources = Array.isArray(draft?.sources) ? draft.sources : [];
  if (sources.length > 0) {
    const items = sources
      .filter((s) => s?.url)
      .map((s) => {
        const href = escapeHtml(s.url);
        const title = escapeHtml(s.title || s.url);
        return `<li><a href="${href}" target="_blank" rel="noopener noreferrer">${title}</a></li>`;
      })
      .join('');
    if (items) {
      parts.push(`<section class="blog-sources"><h2>참고 자료</h2><ul>${items}</ul></section>`);
    }
  }

  return parts.join('\n');
}

/** Blogger API v3로 글을 즉시 게시하고 {postId, url}을 돌려준다. */
export async function publishToBlogger({
  blogId,
  title,
  html,
  labels = [],
  token,
  fetchImpl = fetch,
} = {}) {
  if (!blogId) throw new Error('blogId가 필요합니다.');
  if (!token) throw new Error('Blogger 인증 토큰이 필요합니다.');

  const endpoint = `${BLOGGER_API_BASE}/blogs/${encodeURIComponent(blogId)}/posts/`;
  const res = await fetchImpl(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      title,
      content: html,
      labels,
    }),
  });

  if (!res?.ok) {
    let detail = '';
    try { detail = await res.text(); } catch { /* ignore */ }
    throw new Error(`Blogger 게시 실패(HTTP ${res?.status ?? 'no-status'})${detail ? `: ${detail}` : ''}`);
  }

  const data = await res.json();
  return {
    postId: String(data.id),
    url: String(data.url),
  };
}

function extractPostBodyHtml(html) {
  const src = String(html || '');
  const openMatch = src.match(/<div\b[^>]*\bclass\s*=\s*(?:"[^"]*\bpost-body\b[^"]*"|'[^']*\bpost-body\b[^']*')[^>]*>/i);
  if (!openMatch) return src;

  const contentStart = openMatch.index + openMatch[0].length;
  const tagRe = /<\/?div\b[^>]*>/gi;
  tagRe.lastIndex = contentStart;
  let depth = 1;
  for (const m of src.matchAll(tagRe)) {
    if (m.index < contentStart) continue;
    if (m[0].startsWith('</')) {
      depth -= 1;
      if (depth === 0) return src.slice(contentStart, m.index);
    } else if (!m[0].endsWith('/>')) {
      depth += 1;
    }
  }
  return src.slice(contentStart);
}

/** 게시된 URL이 200으로 열리고 대가 문구·제휴 링크 속성이 살아 있는지 확인한다. */
export async function verifyLive(url, {fetchImpl = fetch} = {}) {
  let res;
  try {
    res = await fetchImpl(url, {
      method: 'GET',
      headers: {'User-Agent': BROWSER_USER_AGENT},
    });
  } catch (err) {
    return {ok: false, problems: [{id: 'http-error', text: err.message}]};
  }

  if (res?.status !== HTTP_OK) {
    return {ok: false, problems: [{id: 'http-error', text: `HTTP ${res?.status ?? 'no-status'}`}]};
  }

  const html = await res.text();
  const problems = checkRenderedHtml(extractPostBodyHtml(html));
  return {ok: problems.length === 0, problems};
}
