import {execFileSync} from 'node:child_process';
import {createReadStream, existsSync, mkdirSync, readFileSync, statSync, writeFileSync} from 'node:fs';
import http from 'node:http';
import {createRequire} from 'node:module';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const EP_DIR = join(HERE, '..');
const ROOT = resolve(EP_DIR, '..', '..');
const require = createRequire(join(ROOT, 'package.json'));
const {chromium} = require('playwright');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.ttf': 'font/ttf',
  '.woff2': 'font/woff2',
  '.wav': 'audio/wav',
  '.mp3': 'audio/mpeg',
  '.mp4': 'video/mp4',
  '.svg': 'image/svg+xml',
  '.json': 'application/json',
};

function startStatic(dir) {
  return new Promise((res) => {
    const srv = http.createServer((req, resp) => {
      const cleanPath = decodeURIComponent((req.url || '/').split('?')[0]);
      const target = join(dir, cleanPath === '/' ? 'index.html' : cleanPath);
      if (!existsSync(target) || statSync(target).isDirectory()) {
        resp.writeHead(404);
        resp.end('Not found');
        return;
      }
      const ext = target.slice(target.lastIndexOf('.')).toLowerCase();
      resp.writeHead(200, {'Content-Type': MIME[ext] || 'application/octet-stream'});
      createReadStream(target).pipe(resp);
    });
    srv.listen(0, '127.0.0.1', () => res({srv, port: srv.address().port}));
  });
}

const timings = JSON.parse(readFileSync(join(EP_DIR, 'assets', 'audio-timings.json'), 'utf8'));
const snapDir = join(EP_DIR, 'snapshots');
mkdirSync(snapDir, {recursive: true});

const {srv, port} = await startStatic(EP_DIR);
const browser = await chromium.launch({headless: true});
const page = await browser.newPage({viewport: {width: 1080, height: 1920}, deviceScaleFactor: 1});

const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(m.text());
});

await page.goto(`http://127.0.0.1:${port}/index.html`, {waitUntil: 'load'});
await page.evaluate(() => document.fonts.ready);

// Verify forward-then-rewind scrub safety (fromTo rule)
const totalDur = timings.totalSuggestedDuration;
await page.evaluate((d) => {
  const tl = window.__timelines.main;
  tl.time(d - 0.05);
  tl.time(0);
}, totalDur);

const report = [];
for (const cut of timings.cuts) {
  let ratio = 0.62;
  if (cut.cut === 0) ratio = 0.68;
  if (cut.cut === 3 || cut.cut === 5 || cut.cut === 7) ratio = 0.84;
  if (cut.cut === 8) ratio = 0.82;
  if (cut.cut === 9) ratio = 0.72;
  if (cut.cut === 10) ratio = 0.68;
  if (cut.cut === 11) ratio = 0.82;
  const t = +(cut.t + cut.duration * ratio).toFixed(3);

  await page.evaluate((sec) => {
    window.__timelines.main.time(sec, false);
  }, t);
  await page.waitForTimeout(120);

  const metrics = await page.evaluate((cutIdx) => {
    const scene = document.querySelector(`#scene-${String(cutIdx).padStart(2, '0')}`);
    if (!scene) return {missing: true};
    const hook = scene.querySelector('.top-hook');
    const cap = scene.querySelector('.safe-caption');
    const hRect = hook ? hook.getBoundingClientRect() : null;
    const cRect = cap ? cap.getBoundingClientRect() : null;
    const imgs = [...scene.querySelectorAll('img')].map((im) => ({
      src: im.getAttribute('src'),
      ok: im.complete && im.naturalWidth > 0,
    }));
    const texts = [...scene.querySelectorAll('*')].filter((el) => {
      const st = getComputedStyle(el);
      return st.display !== 'none' && Number(st.opacity) > 0.1 && [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
    });
    let minFont = 999;
    let overflowCount = 0;
    for (const el of texts) {
      const st = getComputedStyle(el);
      const fs = parseFloat(st.fontSize);
      if (fs < minFont) minFont = fs;
      const r = el.getBoundingClientRect();
      if (r.left < 40 || r.right > 1040) overflowCount++;
    }
    return {
      sceneOpacity: Number(getComputedStyle(scene).opacity),
      hookTop: hRect ? Math.round(hRect.top) : null,
      hookCenterOffset: hRect ? Math.round((hRect.left + hRect.right) / 2 - 540) : null,
      capBottom: cRect ? Math.round(cRect.bottom) : null,
      capCenterOffset: cRect ? Math.round((cRect.left + cRect.right) / 2 - 540) : null,
      minFont: Math.round(minFont),
      overflowCount,
      imgs,
    };
  }, cut.cut);

  const file = join(snapDir, `cut-${String(cut.cut).padStart(2, '0')}.png`);
  await page.screenshot({path: file});
  report.push({cut: cut.cut, t, ...metrics});
}

await browser.close();
srv.close();

const contactPath = join(EP_DIR, 'assets', 'preview-contact-sheet.jpg');
execFileSync('ffmpeg', [
  '-y',
  '-v',
  'error',
  '-pattern_type',
  'sequence',
  '-i',
  join(snapDir, 'cut-%02d.png'),
  '-vf',
  'scale=360:640,tile=4x3:padding=12:margin=12:color=#111216',
  '-q:v',
  '3',
  contactPath,
]);

writeFileSync(join(snapDir, 'dom-audit.json'), JSON.stringify({errors, report}, null, 2) + '\n');
console.log('ERRORS:', errors.length);
for (const r of report) {
  console.log(
    `cut ${String(r.cut).padStart(2, '0')} @${r.t.toFixed(2)}s | op=${r.sceneOpacity} | hookTop=${r.hookTop} (cx=${r.hookCenterOffset}) | capBot=${r.capBottom} (cx=${r.capCenterOffset}) | minFont=${r.minFont}px | overflow=${r.overflowCount}`,
  );
}
console.log('CONTACT SHEET:', contactPath);
