// 태그 후보를 유튜브 검색(한국어·한국)에 넣고 상위 영상 제목 8개를 뽑는다. 격리 크롬, 로그인 없음.
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
const repo = 'c:/Users/yunyo/.gemini/antigravity-ide/scratch/ihm-easy-english';
const require = createRequire(path.join(repo, 'package.json'));
const { chromium } = require('playwright');
const tags = process.argv.slice(3);
const ctx = await chromium.launchPersistentContext(path.join(process.env.TEMP || '.', 'ep38-yt-profile'), { channel: 'chrome', headless: true, locale: 'ko-KR' });
const page = ctx.pages()[0] || await ctx.newPage();
const out = {};
for (const t of tags) {
  await page.goto('https://www.youtube.com/results?search_query=' + encodeURIComponent(t) + '&hl=ko&gl=KR', { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.waitForTimeout(4000);
  const titles = await page.evaluate(() => { const r = []; const walk = (o) => { if (!o || typeof o !== 'object' || r.length >= 8) return; if (o.videoRenderer) { const t = o.videoRenderer.title?.runs?.map((x) => x.text).join(''); if (t) r.push(t); } if (o.lockupViewModel) { const t = o.lockupViewModel.metadata?.lockupMetadataViewModel?.title?.content; if (t) r.push(t); } for (const k in o) walk(o[k]); }; walk(window.ytInitialData); return r; });
  out[t] = titles;
  console.log('==', t); titles.forEach((x) => console.log('  -', x.slice(0, 90)));
}
fs.writeFileSync(process.argv[2], JSON.stringify(out, null, 1));
await ctx.close();
