// 화면 글자 줄바꿈·넘침 검사기 (렌더 전 시안 점검, 렌더 안 함).
// 사용법: node scripts/check-text-layout.mjs <프로젝트 폴더> [--at 1,2,3] [--only-at] [--json]
//   기본 시각: --at 목록 + 각 장면(루트의 data-start 자식) 시작 뒤 0.5초, 가운데, 끝 앞 0.6초(전환이 끝난 순간).
//   --only-at: --at 시각만 본다. --json: JSON만 출력한다. 걸린 것이 있으면 종료 코드 1.
// 검사 3종: orphan-last-line(마지막 줄에 외톨이), bracket-split([f] vs / [p]처럼 짝이 갈라짐), text-overflow(상자 밖 넘침, nowrap 클래스가 접힘).
// 측정: hyperframes 패키지의 bundle 함수로 index.html을 하나로 묶고, headless Chrome에서 window.__player.renderSeek로 시각을 맞춘 뒤
//       글자마다 getClientRects()로 줄을 나눈다. hyperframes snapshot과 같은 시간 이동 방식이다(npx 캐시의 패키지를 찾아 쓴다).
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import {pathToFileURL, fileURLToPath} from 'node:url';

export const ORPHAN_RATIO = 0.25; // allow-literal: 마지막 줄 너비가 나머지 줄 평균의 25% 이하면 외톨이(가설, 사용자 사례 '하기'로 맞춤)
export const ORPHAN_ONE_WORD_RATIO = 0.5; // allow-literal: 한 단어만 남았고 평균의 절반 이하면 외톨이(가설)
export const ORPHAN_MAX_CHARS = 2; // allow-literal: 마지막 줄 글자 수가 2 이하면 외톨이
export const OVERFLOW_TOLERANCE_PX = 2; // allow-literal: 소수점 오차 허용
export const MIN_OPACITY = 0.5; // allow-literal: 이보다 흐리면 전환 중이라 보고 건너뛴다
export const SCENE_OFFSETS = [0.5, 'mid', -0.6]; // allow-literal: 장면 시작 뒤 0.5초, 가운데, 끝 앞 0.6초
export const SCREEN = {width: 1920, height: 1080}; // allow-literal: 컴포지션 고정 크기
export const NOWRAP_CLASSES = ['eyebrow-pill', 'tip-badge', 'card-label', 'word-text', 'syl-pill', 'status-badge'];

const countChars = (s) => [...s.replace(/\s+/g, '')].length;

// 블록 하나(줄 목록)를 판정한다. 브라우저 없이 시험하는 순수 함수.
// block = {selector, classes:[], text, lines:[{text,left,right,top,bottom}], rect:{left,top,right,bottom}, parentRect}
/** 컴포지션 루트의 data-width·data-height를 읽는다(세로 쇼츠는 1080x1920). 없으면 가로 1920x1080(2026-11-16: 세로 영상이 아래쪽 "화면 밖" 오탐을 34건 냈다). */
export function readScreenSize(html) {
  const tag = String(html).match(/<[^>]*data-composition-id="main"[^>]*>/)?.[0] || '';
  const width = Number(tag.match(/data-width="(\d+)"/)?.[1]);
  const height = Number(tag.match(/data-height="(\d+)"/)?.[1]);
  return width > 0 && height > 0 ? {width, height} : SCREEN;
}

export function judgeBlock(block, screen = SCREEN) {
  const issues = [];
  const lines = block.lines || [];
  const widths = lines.map((l) => l.right - l.left);

  if (lines.length >= 2) {
    const last = lines[lines.length - 1];
    const others = widths.slice(0, -1);
    const avg = others.reduce((a, b) => a + b, 0) / others.length;
    const lastW = widths[widths.length - 1];
    const ratio = avg > 0 ? lastW / avg : 1;
    const chars = countChars(last.text);
    const words = last.text.trim().split(/\s+/).filter(Boolean).length;
    if (chars <= ORPHAN_MAX_CHARS || ratio <= ORPHAN_RATIO || (words === 1 && ratio <= ORPHAN_ONE_WORD_RATIO)) {
      issues.push({kind: 'orphan-last-line', value: `마지막 줄 "${last.text.trim()}" (${chars}글자, 평균 줄의 ${Math.round(ratio * 100)}%)`});
    }
    // 괄호 짝이 줄 사이에서 갈라짐
    for (const [open, close] of [['[', ']'], ['(', ')']]) {
      let depth = 0;
      let startLine = -1;
      lines.forEach((l, i) => {
        for (const ch of l.text) {
          if (ch === open) { if (depth === 0) startLine = i; depth++; }
          else if (ch === close && depth > 0) {
            depth--;
            if (depth === 0 && startLine !== i) issues.push({kind: 'bracket-split', value: `${open}${close} 쌍이 ${startLine + 1}줄과 ${i + 1}줄에 걸침`});
          }
        }
      });
    }
    // vs 앞뒤에서 줄이 끊김
    for (let i = 0; i < lines.length; i++) {
      const t = lines[i].text.trim();
      const next = lines[i + 1]?.text.trim();
      if (/^vs\.?$/i.test(t)) issues.push({kind: 'bracket-split', value: `"vs" 혼자 한 줄 (${i + 1}줄)`});
      else if (next !== undefined && (/(^|\s)vs\.?$/i.test(t) || /^vs\.?(\s|$)/i.test(next))) {
        issues.push({kind: 'bracket-split', value: `"vs" 앞뒤에서 끊김: "${t}" / "${next}"`});
      }
    }
  }

  // nowrap이어야 하는 클래스가 접힘
  const nowrapHit = (block.classes || []).filter((c) => NOWRAP_CLASSES.includes(c));
  if (nowrapHit.length && lines.length >= 2) {
    issues.push({kind: 'text-overflow', value: `.${nowrapHit.join('.')} 가 ${lines.length}줄로 접힘`});
  }
  // 상자 밖으로 넘침
  if (lines.length) {
    const r = block.rect || {
      left: Math.min(...lines.map((l) => l.left)), right: Math.max(...lines.map((l) => l.right)),
      top: Math.min(...lines.map((l) => l.top)), bottom: Math.max(...lines.map((l) => l.bottom)),
    };
    const tol = OVERFLOW_TOLERANCE_PX;
    const out = [];
    if (r.left < -tol) out.push(`왼쪽 ${Math.round(-r.left)}px`);
    if (r.top < -tol) out.push(`위쪽 ${Math.round(-r.top)}px`);
    if (r.right > screen.width + tol) out.push(`오른쪽 ${Math.round(r.right - screen.width)}px`);
    if (r.bottom > screen.height + tol) out.push(`아래쪽 ${Math.round(r.bottom - screen.height)}px`);
    if (out.length) issues.push({kind: 'text-overflow', value: `화면 밖: ${out.join(', ')}`});
    const p = block.parentRect;
    if (p && p.right - p.left > 0 && !out.length) {
      const o2 = [];
      if (r.left < p.left - tol) o2.push(`왼쪽 ${Math.round(p.left - r.left)}px`);
      if (r.right > p.right + tol) o2.push(`오른쪽 ${Math.round(r.right - p.right)}px`);
      if (r.top < p.top - tol) o2.push(`위쪽 ${Math.round(p.top - r.top)}px`);
      if (r.bottom > p.bottom + tol) o2.push(`아래쪽 ${Math.round(r.bottom - p.bottom)}px`);
      if (o2.length) issues.push({kind: 'text-overflow', value: `부모 상자 밖: ${o2.join(', ')}`});
    }
  }
  return issues.map((i) => ({selector: block.selector, text: block.text, ...i}));
}

// 같은 (선택자, 글자, 종류, 값)이 여러 시각에서 나오면 한 줄로 합친다.
export function dedupeIssues(all) {
  const map = new Map();
  for (const it of all) {
    const key = [it.selector, it.text, it.kind, it.value].join('\u0000');
    if (!map.has(key)) map.set(key, {...it, times: []});
    map.get(key).times.push(it.time);
  }
  return [...map.values()].map(({time, ...rest}) => rest);
}

export function pickSampleTimes(scenes, at = [], onlyAt = false) {
  const set = new Set(at.map(Number).filter((n) => Number.isFinite(n)));
  if (!onlyAt) {
    for (const s of scenes) {
      for (const off of SCENE_OFFSETS) {
        const t = off === 'mid' ? s.start + s.duration / 2 : off >= 0 ? s.start + off : s.start + s.duration + off;
        if (t >= s.start && t <= s.start + s.duration) set.add(Math.round(t * 1000) / 1000);
      }
    }
  }
  return [...set].sort((a, b) => a - b);
}

export function formatReport(issues, times) {
  if (!issues.length) return `글자 배치 검사: 0건 (${times.length}개 시각)`;
  const lines = [`글자 배치 검사: ${issues.length}건 (${times.length}개 시각)`];
  for (const it of issues) {
    const ts = it.times.length > 3 ? `${it.times.slice(0, 3).join(',')}초 외 ${it.times.length - 3}곳` : `${it.times.join(',')}초`; // allow-literal: 표시용 개수
    lines.push(`- ${ts} | ${it.selector} | "${it.text}" | ${it.kind} | ${it.value}`);
  }
  return lines.join('\n');
}

// ---- 브라우저 쪽 ----

function findHyperframesDist() {
  if (process.env.HYPERFRAMES_DIST) return process.env.HYPERFRAMES_DIST;
  const roots = [path.join(os.homedir(), 'AppData', 'Local', 'npm-cache', '_npx'), path.join(os.homedir(), '.npm', '_npx')];
  let best = null;
  for (const root of roots) {
    if (!fs.existsSync(root)) continue;
    for (const d of fs.readdirSync(root)) {
      const pkg = path.join(root, d, 'node_modules', 'hyperframes', 'package.json');
      if (!fs.existsSync(pkg)) continue;
      const v = JSON.parse(fs.readFileSync(pkg, 'utf8')).version.split('.').map(Number);
      const dist = path.join(path.dirname(pkg), 'dist');
      if (!fs.existsSync(dist) || !fs.readdirSync(dist).some((f) => f.startsWith('bundleWithLocalizedFonts-'))) continue;
      const cmp = best ? v.reduce((acc, n, i) => acc || n - best.v[i], 0) : 1;
      if (cmp > 0) best = {v, dist};
    }
  }
  if (!best) throw new Error('hyperframes 패키지를 못 찾았다. 먼저 `npx hyperframes --version`을 한 번 실행하거나 HYPERFRAMES_DIST를 지정하라.');
  return best.dist;
}

function findChrome() {
  const base = path.join(os.homedir(), '.cache', 'hyperframes', 'chrome', 'chrome-headless-shell');
  if (fs.existsSync(base)) {
    for (const v of fs.readdirSync(base).sort().reverse()) {
      const sub = path.join(base, v);
      for (const d of fs.readdirSync(sub)) {
        for (const exe of ['chrome-headless-shell.exe', 'chrome-headless-shell']) {
          const hit = path.join(sub, d, exe);
          if (fs.existsSync(hit)) return hit;
        }
      }
    }
  }
  return undefined; // playwright 기본 브라우저
}

// 페이지 안에서 실행: 보이는 글자 블록마다 줄 정보를 모은다.
function collectBlocksInPage({minOpacity, screen}) {
  const skipTags = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEXTAREA']);
  const sel = (el) => {
    const parts = [];
    let cur = el;
    for (let n = 0; cur && cur.nodeType === 1 && n < 3; n++, cur = cur.parentElement) { // allow-literal: 선택자 길이
      let s = cur.tagName.toLowerCase();
      if (cur.id) { parts.unshift(`${s}#${cur.id}`); break; }
      const cls = [...cur.classList].slice(0, 2).join('.'); // allow-literal: 클래스 2개까지만 표시
      if (cls) s += `.${cls}`;
      parts.unshift(s);
    }
    const scene = el.closest('[id^="scene-"]');
    return (scene && !parts[0].includes(scene.id) ? `#${scene.id} ` : '') + parts.join(' > ');
  };
  const effOpacity = (el) => {
    let o = 1;
    for (let c = el; c && c.nodeType === 1; c = c.parentElement) {
      const cs = getComputedStyle(c);
      if (cs.display === 'none' || cs.visibility === 'hidden') return 0;
      o *= Number(cs.opacity);
    }
    return o;
  };
  const blockOf = (node) => {
    let el = node.parentElement;
    while (el && getComputedStyle(el).display.startsWith('inline') && el.parentElement) el = el.parentElement;
    return el;
  };
  const groups = new Map();
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    if (!n.nodeValue.trim()) continue;
    const el = n.parentElement;
    if (!el || skipTags.has(el.tagName) || el.closest('svg')) continue;
    const b = blockOf(n);
    if (!b) continue;
    if (!groups.has(b)) groups.set(b, []);
    groups.get(b).push(n);
  }
  const out = [];
  for (const [b, nodes] of groups) {
    if (effOpacity(b) < minOpacity) continue;
    const br = b.getBoundingClientRect();
    if (br.width === 0 || br.height === 0) continue;
    // 화면 밖에 통째로 있는 블록은 보이지 않으므로 건너뛴다(넘침은 일부만 걸친 블록에서 잡는다)
    if (br.right < 0 || br.left > screen.width || br.bottom < 0 || br.top > screen.height) continue;
    const lines = [];
    for (const node of nodes) {
      const v = node.nodeValue;
      for (let i = 0; i < v.length; i++) {
        const ch = v[i];
        if (/\s/.test(ch)) {
          if (lines.length) lines[lines.length - 1].text += ' ';
          continue;
        }
        const r = document.createRange();
        r.setStart(node, i);
        r.setEnd(node, i + 1);
        const rect = r.getClientRects()[0];
        if (!rect || rect.width === 0) continue;
        const cy = (rect.top + rect.bottom) / 2;
        let line = lines.find((l) => cy >= l.top && cy <= l.bottom);
        if (!line) { line = {text: '', left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom}; lines.push(line); }
        line.text += ch;
        line.left = Math.min(line.left, rect.left);
        line.right = Math.max(line.right, rect.right);
        line.top = Math.min(line.top, rect.top);
        line.bottom = Math.max(line.bottom, rect.bottom);
      }
    }
    if (!lines.length) continue;
    lines.sort((a, c) => a.top - c.top);
    const text = lines.map((l) => l.text.trim()).join(' ');
    const union = {
      left: Math.min(...lines.map((l) => l.left)), right: Math.max(...lines.map((l) => l.right)),
      top: Math.min(...lines.map((l) => l.top)), bottom: Math.max(...lines.map((l) => l.bottom)),
    };
    const pe = b.parentElement;
    const pr = pe ? pe.getBoundingClientRect() : null;
    out.push({
      selector: sel(b), classes: [...b.classList], text,
      lines: lines.map((l) => ({...l, text: l.text.replace(/\s+/g, ' ')})), rect: union,
      parentRect: pr && pe !== document.body && pe.id !== 'root' ? {left: pr.left, top: pr.top, right: pr.right, bottom: pr.bottom} : null,
    });
  }
  return out;
}

export async function checkProject(projectDir, {at = [], onlyAt = false, log = () => {}} = {}) {
  const dir = path.resolve(projectDir);
  if (!fs.existsSync(path.join(dir, 'index.html'))) throw new Error(`index.html이 없다: ${dir}`);
  const dist = findHyperframesDist();
  const bundleFile = fs.readdirSync(dist).find((f) => f.startsWith('bundleWithLocalizedFonts-'));
  const {bundleWithLocalizedFonts} = await import(pathToFileURL(path.join(dist, bundleFile)).href);
  const html = await bundleWithLocalizedFonts(dir);
  const screen = readScreenSize(html);
  const {chromium} = await import('playwright-core');
  const server = http.createServer((q, r) => {
    const u = decodeURIComponent(q.url.split('?')[0]);
    if (u === '/' || u === '/index.html') { r.setHeader('content-type', 'text/html; charset=utf-8'); return r.end(html); }
    const f = path.join(dir, u);
    if (!f.startsWith(dir)) { r.statusCode = 403; return r.end(); }
    fs.readFile(f, (e, d) => { if (e) { r.statusCode = 404; return r.end(); } r.end(d); });
  });
  await new Promise((res) => server.listen(0, '127.0.0.1', res));
  const browser = await chromium.launch({executablePath: findChrome()});
  try {
    const page = await browser.newPage({viewport: screen});
    await page.goto(`http://127.0.0.1:${server.address().port}/`);
    await page.waitForFunction(() => window.__player && typeof window.__player.renderSeek === 'function', null, {timeout: 60000}); // allow-literal: 준비 대기 한도(ms)
    await page.evaluate(() => document.fonts.ready);
    const scenes = await page.evaluate(() => {
      // 장면 = 루트 안의 data-start 칸. 길이가 없으면 다음 장면 시작이나 루트 끝까지로 본다.
      const root = document.querySelector('[data-composition-id="main"]') || document.querySelector('[data-composition-id]');
      const total = Number(root?.getAttribute('data-duration')) || 0;
      const list = [...document.querySelectorAll('[id^="scene-"][data-start]')]
        .map((e) => ({id: e.id, start: Number(e.getAttribute('data-start')), duration: Number(e.getAttribute('data-duration'))}));
      list.sort((x, y) => x.start - y.start);
      return list.map((s, i) => ({...s, duration: s.duration > 0 ? s.duration : (list[i + 1]?.start ?? total) - s.start}));
    });
    const times = pickSampleTimes(scenes, at, onlyAt);
    const found = [];
    for (const t of times) {
      await page.evaluate((x) => window.__player.renderSeek(x), t);
      await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
      const blocks = await page.evaluate(collectBlocksInPage, {minOpacity: MIN_OPACITY, screen});
      for (const b of blocks) for (const it of judgeBlock(b, screen)) found.push({...it, time: t});
      log(`  ${t}초: 글자 블록 ${blocks.length}개`);
    }
    return {times, issues: dedupeIssues(found)};
  } finally {
    await browser.close();
    server.close();
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const args = process.argv.slice(2);
  const atIdx = args.indexOf('--at');
  const dirArg = args.find((a, i) => !a.startsWith('--') && args[i - 1] !== '--at');
  const at = atIdx >= 0 ? args[atIdx + 1].split(',').map(Number) : [];
  if (!dirArg) { console.error('사용법: node scripts/check-text-layout.mjs <프로젝트 폴더> [--at 1,2,3] [--only-at] [--json]'); process.exit(2); }
  const t0 = Date.now();
  const res = await checkProject(dirArg, {at, onlyAt: args.includes('--only-at')});
  if (args.includes('--json')) console.log(JSON.stringify(res, null, 2));
  else console.log(`${formatReport(res.issues, res.times)}\n(${Math.round((Date.now() - t0) / 1000)}초)`); // allow-literal: ms를 초로
  process.exit(res.issues.length ? 1 : 0);
}
