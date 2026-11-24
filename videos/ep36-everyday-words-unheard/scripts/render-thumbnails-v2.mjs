import {mkdirSync, readFileSync} from 'node:fs';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';

const HERE = dirname(fileURLToPath(import.meta.url));
const EP_DIR = join(HERE, '..');
const REPO_ROOT = resolve(EP_DIR, '..', '..');
const ASSETS_IMG = join(EP_DIR, 'assets', 'images');
const SHEET_IMG_DIR = join(REPO_ROOT, 'data', 'youtube', 'transform-sheets', 'images', 'ep36-everyday-words-unheard');
const TEMP_DIR = join(REPO_ROOT, 'output', 'temp-thumbnails', 'ep36-everyday-words-unheard-design-test');
mkdirSync(SHEET_IMG_DIR, {recursive: true});
mkdirSync(TEMP_DIR, {recursive: true});

const fontB64 = readFileSync(join(EP_DIR, 'assets', 'fonts', 'NotoSansKR-VF.ttf')).toString('base64');
const imgUrl = (file) => `data:image/jpeg;base64,${readFileSync(join(ASSETS_IMG, file)).toString('base64')}`;

const BASE_CSS = `
@font-face {
  font-family: 'Noto Sans KR';
  src: url('data:font/ttf;base64,${fontB64}') format('truetype');
  font-weight: 100 900;
  font-display: block;
}
* { box-sizing: border-box; margin: 0; padding: 0; }
html, body {
  width: 1280px;
  height: 720px;
  overflow: hidden;
  font-family: 'Noto Sans KR', sans-serif;
  -webkit-font-smoothing: antialiased;
}
.canvas {
  position: relative;
  width: 1280px;
  height: 720px;
  overflow: hidden;
}
.bg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}
`;

// ★ A안 (최종 1순위 추천): 밝은 아이보리(어두운 경쟁 피드 속 압도적 밝기 대비) + 한글 거대 타이포(200px 완벽 가독성 · 스포일러 0 · 잡소품 0)
const htmlA = `<!doctype html><html lang="ko"><head><meta charset="utf-8"><style>${BASE_CSS}
.scrim {
  position: absolute; inset: 0;
  background: linear-gradient(90deg, rgba(248,244,236,0.97) 0%, rgba(248,244,236,0.92) 52%, rgba(248,244,236,0.20) 70%, rgba(248,244,236,0.0) 100%);
}
.copy {
  position: absolute; left: 54px; top: 0; bottom: 0; width: 790px;
  display: flex; flex-direction: column; justify-content: center; gap: 26px;
}
.x-row {
  display: flex; align-items: center; gap: 18px;
}
.x-pill {
  display: inline-flex; align-items: center; gap: 12px;
  padding: 14px 24px; border-radius: 18px;
  background: #171614;
  color: #FFFFFF; font-size: 72px; font-weight: 900; letter-spacing: -0.03em;
  line-height: 1; white-space: nowrap;
}
.x-mark {
  display: inline-flex; align-items: center; justify-content: center;
  width: 64px; height: 64px; border-radius: 14px;
  background: #E0312B; color: #FFFFFF; font-size: 52px; font-weight: 900;
  line-height: 1;
}
.main-hl {
  font-size: 118px; font-weight: 900; letter-spacing: -0.045em; line-height: 1.08;
  color: #D92B22;
  white-space: nowrap;
}
.main-hl .k { color: #161513; }
.sub-chip {
  display: inline-flex; align-items: center; align-self: flex-start;
  padding: 16px 34px; border-radius: 18px;
  background: #171614; color: #FFB800;
  font-size: 60px; font-weight: 900; letter-spacing: -0.025em; white-space: nowrap;
}
</style></head><body>
<div class="canvas">
  <img class="bg" src="${imgUrl('thumb-b-v2-bg.jpg')}">
  <div class="scrim"></div>
  <div class="copy">
    <div class="x-row">
      <div class="x-pill">초콜릿 <span class="x-mark">✕</span></div>
      <div class="x-pill">비타민 <span class="x-mark">✕</span></div>
    </div>
    <div class="main-hl"><span class="k">들으면</span><br>못 맞힙니다</div>
    <div class="sub-chip">원어민 속도 · 7단어</div>
  </div>
</div>
</body></html>`;

// B안 (다크 차콜 에디토리얼 대조 버전 — 오프닝 0초와 톤 통일 · 200px 확대 가독성 · 스포일러 0 · 잡소품 0)
const htmlB = `<!doctype html><html lang="ko"><head><meta charset="utf-8"><style>${BASE_CSS}
.scrim {
  position: absolute; inset: 0;
  background: linear-gradient(90deg, rgba(14,14,13,0.95) 0%, rgba(14,14,13,0.88) 48%, rgba(14,14,13,0.34) 68%, rgba(14,14,13,0.06) 100%);
}
.copy {
  position: absolute; left: 54px; top: 0; bottom: 0; width: 790px;
  display: flex; flex-direction: column; justify-content: center; gap: 26px;
}
.x-row {
  display: flex; align-items: center; gap: 18px;
}
.x-pill {
  display: inline-flex; align-items: center; gap: 12px;
  padding: 14px 24px; border-radius: 18px;
  background: rgba(255,255,255,0.12);
  border: 3px solid rgba(255,255,255,0.30);
  color: #FFFFFF; font-size: 72px; font-weight: 900; letter-spacing: -0.03em;
  line-height: 1; white-space: nowrap;
}
.x-mark {
  display: inline-flex; align-items: center; justify-content: center;
  width: 64px; height: 64px; border-radius: 14px;
  background: #E63935; color: #FFFFFF; font-size: 52px; font-weight: 900;
  line-height: 1;
}
.main-hl {
  font-size: 118px; font-weight: 900; letter-spacing: -0.045em; line-height: 1.08;
  color: #FFB800;
  text-shadow: 0 8px 28px rgba(0,0,0,0.75);
  white-space: nowrap;
}
.main-hl .w { color: #FFFFFF; }
.sub-chip {
  display: inline-flex; align-items: center; align-self: flex-start;
  padding: 16px 34px; border-radius: 18px;
  background: #149E8F; color: #051F1C;
  font-size: 60px; font-weight: 900; letter-spacing: -0.025em; white-space: nowrap;
}
</style></head><body>
<div class="canvas">
  <img class="bg" src="${imgUrl('thumb-a-v2-bg.jpg')}">
  <div class="scrim"></div>
  <div class="copy">
    <div class="x-row">
      <div class="x-pill">초콜릿 <span class="x-mark">✕</span></div>
      <div class="x-pill">비타민 <span class="x-mark">✕</span></div>
    </div>
    <div class="main-hl"><span class="w">들으면</span><br>못 맞힙니다</div>
    <div class="sub-chip">원어민 속도 · 7단어</div>
  </div>
</div>
</body></html>`;

// C안: 자막 OFF 블라인드 귀 테스트 챌린지 (보조 글자 58px 확대)
const bars = [26, 56, 38, 86, 62, 108, 72, 98, 52, 114, 78, 92, 46, 84, 58, 42, 66, 30];
const htmlC = `<!doctype html><html lang="ko"><head><meta charset="utf-8"><style>${BASE_CSS}
.scrim {
  position: absolute; inset: 0;
  background: linear-gradient(90deg, rgba(14,13,12,0.93) 0%, rgba(14,13,12,0.80) 56%, rgba(14,13,12,0.22) 100%);
}
.copy {
  position: absolute; left: 58px; top: 0; bottom: 0; width: 820px;
  display: flex; flex-direction: column; justify-content: center; gap: 22px;
}
.badge {
  display: inline-flex; align-items: center; gap: 14px; align-self: flex-start;
  padding: 12px 28px; border-radius: 999px;
  background: #E63935; color: #FFFFFF;
  font-size: 52px; font-weight: 900; white-space: nowrap;
}
.dot { width: 18px; height: 18px; border-radius: 999px; background: #FFFFFF; }
.main-ko {
  font-size: 116px; font-weight: 900; letter-spacing: -0.04em; line-height: 1.08;
  color: #FFFFFF; white-space: nowrap;
}
.main-ko .y { color: #FFB800; }
.eq {
  display: flex; align-items: center; gap: 14px; height: 110px;
}
.bar { width: 16px; border-radius: 999px; background: #FFB800; }
.sub {
  font-size: 58px; font-weight: 900; color: #F5F2EA; letter-spacing: -0.02em; white-space: nowrap;
}
</style></head><body>
<div class="canvas">
  <img class="bg" src="${imgUrl('thumb-c-bg.jpg')}">
  <div class="scrim"></div>
  <div class="copy">
    <div class="badge"><span class="dot"></span>자막 OFF 귀 테스트</div>
    <div class="main-ko">자막 끄면<br><span class="y">몇 개 들릴까?</span></div>
    <div class="eq">${bars.map((h) => `<div class="bar" style="height:${h}px"></div>`).join('')}</div>
    <div class="sub">초콜릿 · 비타민 외 5단어</div>
  </div>
</div>
</body></html>`;

const browser = await chromium.launch();
const page = await browser.newPage({viewport: {width: 1280, height: 720}});

const outs = [
  {name: 'thumb-A.jpg', html: htmlA},
  {name: 'thumb-B.jpg', html: htmlB},
  {name: 'thumb-C.jpg', html: htmlC},
];

for (const item of outs) {
  await page.setContent(item.html, {waitUntil: 'load'});
  await page.evaluate(() => document.fonts.ready);
  const metrics = await page.evaluate(() => {
    const rects = [...document.querySelectorAll('.copy *')].map((el) => {
      const r = el.getBoundingClientRect();
      return {tag: el.className, r: Math.round(r.right), b: Math.round(r.bottom)};
    });
    const maxRight = Math.max(...rects.map((x) => x.r));
    const maxBottom = Math.max(...rects.map((x) => x.b));
    return {maxRight, maxBottom};
  });
  await page.screenshot({path: join(SHEET_IMG_DIR, item.name), type: 'jpeg', quality: 92});
  await page.screenshot({path: join(TEMP_DIR, item.name), type: 'jpeg', quality: 92});
  console.log(`RENDERED ${item.name}:`, metrics);
}

let feedItems = [];
try {
  const res = await fetch('http://127.0.0.1:3001/api/thumb-feed?query=' + encodeURIComponent('영어 발음 안 들리는 이유') + '&format=LONGFORM');
  const data = await res.json();
  feedItems = (data.feed || []).slice(0, 6);
} catch {}

const toDataUri = (p) => `data:image/jpeg;base64,${readFileSync(p).toString('base64')}`;
const compareHtml = `<!doctype html><html lang="ko"><head><meta charset="utf-8"><style>
body { background:#0F0F0F; color:#FFF; font-family:'Noto Sans KR', sans-serif; padding:28px; width:1400px; }
h2 { font-size:22px; margin:18px 0 12px; color:#FFB800; }
.row { display:flex; gap:18px; align-items:flex-start; flex-wrap:wrap; }
.card200 { width:200px; }
.card200 img { width:200px; height:112px; object-fit:cover; border-radius:8px; display:block; border:1px solid #333; }
.card200.gray img { filter: grayscale(100%); }
.card200 .cap { font-size:12px; margin-top:6px; color:#DDD; line-height:1.35; }
.feed-grid { display:grid; grid-template-columns: repeat(3, 360px); gap:20px; }
.feed-card { background:#181818; border-radius:12px; overflow:hidden; border:2px solid #2A2A2A; }
.feed-card.ours { border-color:#FFB800; }
.thumb-box { position:relative; width:360px; height:202px; }
.thumb-box img { width:100%; height:100%; object-fit:cover; display:block; }
.dur { position:absolute; right:8px; bottom:8px; background:rgba(0,0,0,0.85); color:#FFF; font-size:12px; font-weight:700; padding:2px 6px; border-radius:4px; }
.ft { padding:10px 12px; font-size:14px; font-weight:700; line-height:1.35; }
.fch { padding:0 12px 12px; font-size:12px; color:#AAA; }
</style></head><body>
<h2>1. 최종 v3 — 모바일 200px 실크기 (컬러 vs 흑백 명도 대비)</h2>
<div class="row">
  ${outs.map((o) => `<div class="card200"><img src="${toDataUri(join(SHEET_IMG_DIR, o.name))}"><div class="cap">${o.name} (200px 컬러)</div></div>`).join('')}
  ${outs.map((o) => `<div class="card200 gray"><img src="${toDataUri(join(SHEET_IMG_DIR, o.name))}"><div class="cap">${o.name} (200px 흑백)</div></div>`).join('')}
</div>
<h2>2. 실제 한국 유튜브 검색 피드('영어 발음 안 들리는 이유') 속 우리 최종 v3 배치</h2>
<div class="feed-grid">
  ${feedItems.slice(0, 2).map((f) => `<div class="feed-card"><div class="thumb-box"><img src="${f.thumbnail || f.thumb || ''}"><div class="dur">경쟁</div></div><div class="ft">${f.title || ''}</div><div class="fch">${f.channelTitle || ''}</div></div>`).join('')}
  <div class="feed-card ours"><div class="thumb-box"><img src="${toDataUri(join(SHEET_IMG_DIR, 'thumb-A.jpg'))}"><div class="dur">6:16</div></div><div class="ft">★ 최종 A안: 평생 초콜릿·비타민이라 읽었는데… 원어민 영어 발음은 아예 딴 단어</div><div class="fch">이해하면 쉬운영어 (우리 최종안)</div></div>
  ${feedItems.slice(2, 4).map((f) => `<div class="feed-card"><div class="thumb-box"><img src="${f.thumbnail || f.thumb || ''}"><div class="dur">경쟁</div></div><div class="ft">${f.title || ''}</div><div class="fch">${f.channelTitle || ''}</div></div>`).join('')}
  <div class="feed-card ours"><div class="thumb-box"><img src="${toDataUri(join(SHEET_IMG_DIR, 'thumb-B.jpg'))}"><div class="dur">6:16</div></div><div class="ft">차선 B안(다크): 초콜릿·비타민 다 아는데, 원어민 영어는 왜 딴 단어로 들릴까?</div><div class="fch">이해하면 쉬운영어 (다크 대조안)</div></div>
</div>
</body></html>`;

const p2 = await browser.newPage({viewport: {width: 1400, height: 960}});
await p2.setContent(compareHtml, {waitUntil: 'networkidle'});
await p2.evaluate(() => document.fonts.ready);
const compareOut = join(TEMP_DIR, 'feed-and-200px-compare.png');
await p2.screenshot({path: compareOut, fullPage: true});
console.log('COMPARE SHEET SAVED:', compareOut);

await browser.close();
