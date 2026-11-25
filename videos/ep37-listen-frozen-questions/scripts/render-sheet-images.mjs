// EP37 비교 시트용 썸네일 3안(1280×720)과 화면 시안 컷(1920×1080)을 코드로 찍는다.
// 배경 사진은 AI 스튜디오(Nano Banana 2.1)로 만든 raw/*.jpg, 글자는 전부 여기서 얹는다(그림 속 글자 금지).
// 사용: node videos/ep37-listen-frozen-questions/scripts/render-sheet-images.mjs
import {mkdirSync, readFileSync} from 'node:fs';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..', '..', '..');
const OUT = join(ROOT, 'data', 'youtube', 'transform-sheets', 'images', 'ep37-listen-frozen-questions');
const RAW = join(OUT, 'raw');
mkdirSync(join(OUT, 'cuts'), {recursive: true});

const font = readFileSync(join(ROOT, 'videos', 'ep36-everyday-words-unheard', 'assets', 'fonts', 'NotoSansKR-VF.ttf')).toString('base64');
const img = (f) => `data:image/jpeg;base64,${readFileSync(join(RAW, f)).toString('base64')}`;

// 장마다 서울 지하철 노선 색에서 따온 표지 색(어두운 바탕에서 읽히게 밝힌 값)
export const CH = {
  1: {name: '길에서', rule: '작은 말은 원래 작다', color: '#4C8DF6'},
  2: {name: '가게에서', rule: '끝소리가 다음 모음에 붙는다', color: '#2EB872'},
  3: {name: '처음 만난 사람', rule: '드·트 뒤의 유가 섞인다', color: '#F28C28'},
  4: {name: '여행지에서', rule: '모음 사이의 트가 구른다', color: '#3BB4E5'},
  5: {name: '친한 사이', rule: '질문 앞머리가 사라진다', color: '#A97BE8'},
};

const base = (w, h) => `@font-face{font-family:'K';src:url(data:font/ttf;base64,${font}) format('truetype');font-weight:100 900}
*{box-sizing:border-box;margin:0;padding:0}html,body{width:${w}px;height:${h}px;overflow:hidden}
body{position:relative;font-family:'K',sans-serif;background:#0F1521;color:#F4F1EA;-webkit-font-smoothing:antialiased}
.bg{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.nw{white-space:nowrap}`;

const page = (w, h, css, body) => `<!doctype html><html lang="ko"><head><meta charset="utf-8"><style>${base(w, h)}${css}</style></head><body>${body}</body></html>`;

// 파형(소리 덩어리 모양). 고정 값이라 매번 같은 그림이 나온다.
const wave = (w, h, color, bars = 64, seed = 7) => {
  let s = seed;
  const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
  const bw = w / bars;
  let out = '';
  for (let i = 0; i < bars; i += 1) {
    const env = Math.sin((i / bars) * Math.PI) ** 0.6;
    const bh = Math.max(6, h * env * (0.25 + 0.75 * rnd()));
    out += `<rect x="${(i * bw + bw * 0.2).toFixed(1)}" y="${((h - bh) / 2).toFixed(1)}" width="${(bw * 0.6).toFixed(1)}" height="${bh.toFixed(1)}" rx="${(bw * 0.3).toFixed(1)}" fill="${color}"/>`;
  }
  return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${out}</svg>`;
};

// ── 썸네일 3안 (1280×720) ─────────────────────────────────────────
const THUMBS = {
  // A 장면: 지하철 개찰구에서 외국인이 말을 걸어 얼어붙은 순간
  A: page(1280, 720, `
.scrim{position:absolute;inset:0;background:linear-gradient(90deg,rgba(11,15,24,.95) 0%,rgba(11,15,24,.88) 40%,rgba(11,15,24,.35) 60%,rgba(11,15,24,0) 72%)}
.top{position:absolute;left:0;right:0;top:0;height:120px;background:linear-gradient(180deg,rgba(11,15,24,.85),rgba(11,15,24,0))}
.bub{position:absolute;left:48px;top:58px;background:#fff;color:#111;border-radius:28px;padding:18px 30px;font-size:42px;font-weight:800;letter-spacing:-.5px}
.bub:after{content:'';position:absolute;left:70px;bottom:-22px;border:14px solid transparent;border-top:18px solid #fff;border-left:22px solid #fff}
.h1{position:absolute;left:52px;top:220px;font-size:86px;font-weight:900;letter-spacing:-2px;line-height:1.05}
.h2{position:absolute;left:46px;top:322px;font-size:118px;font-weight:900;color:#F5C518;letter-spacing:-4px;line-height:1.05}
.chip{position:absolute;left:54px;top:520px;background:#F5C518;color:#111;font-size:56px;font-weight:900;padding:10px 26px;border-radius:16px;letter-spacing:-1px}`,
  `<img class="bg" src="${img('thumb-a-bg.jpg')}" style="object-position:62% 50%"><div class="top"></div><div class="scrim"></div>
<div class="bub nw">How do I get to Seoul Station?</div>
<div class="h1 nw">외국인이 물으면</div><div class="h2 nw">머리가 하얘진다</div>
<div class="chip nw">생활 질문 30개</div>`),

  // B 소리 그림: 작은 말은 작고 흐리게, 힘 준 말만 크게(사진 없음)
  B: page(1280, 720, `
body{background:radial-gradient(ellipse at 50% 55%,#1B2638 0%,#0C111B 70%)}
.q{position:absolute;left:0;right:0;top:48px;text-align:center;font-size:96px;font-weight:900;letter-spacing:-3px}
.w{position:absolute;left:0;right:0;top:250px;display:flex;justify-content:center;opacity:.22}
.l1{position:absolute;left:0;right:0;top:196px;display:flex;justify-content:center;align-items:baseline;gap:26px}
.l2{position:absolute;left:0;right:0;top:372px;display:flex;justify-content:center;align-items:baseline;gap:18px}
.sm{font-size:46px;font-weight:600;color:#5E6878;letter-spacing:0}
.get{font-size:190px;font-weight:900;color:#F5C518;letter-spacing:-6px;line-height:1}
.ss{font-size:136px;font-weight:900;color:#F4F1EA;letter-spacing:-5px;line-height:1}
.foot{position:absolute;left:0;right:0;bottom:52px;text-align:center;font-size:64px;font-weight:800;color:#F4F1EA}
.foot b{color:#F5C518;font-weight:900}`,
  `<div class="q nw">몇 단어 들리세요?</div>
<div class="w">${wave(1100, 300, '#9FB4D8', 80, 11)}</div>
<div class="l1"><span class="sm nw">how do I</span><span class="get nw">GET</span><span class="sm nw">to</span></div>
<div class="l2"><span class="ss nw">SEOUL STATION</span><span class="sm nw">?</span></div>
<div class="foot nw">다 듣지 말고, <b>두 군데만</b></div>`),

  // C 틀어 두기: 출퇴근길 이어폰, 끝이 보이는 수량
  C: page(1280, 720, `
.scrim{position:absolute;inset:0;background:linear-gradient(100deg,rgba(9,12,20,.92) 0%,rgba(9,12,20,.78) 45%,rgba(9,12,20,.15) 70%,rgba(9,12,20,0) 85%)}
.tag{position:absolute;left:56px;top:60px;border:4px solid #F4F1EA;border-radius:40px;padding:6px 26px;font-size:46px;font-weight:800}
.h1{position:absolute;left:54px;top:170px;font-size:92px;font-weight:900;letter-spacing:-2px}
.h2{position:absolute;left:48px;top:276px;font-size:168px;font-weight:900;color:#F5C518;letter-spacing:-5px;line-height:1}
.sub{position:absolute;left:58px;top:478px;font-size:52px;font-weight:800;color:#F4F1EA}
.w{position:absolute;left:58px;top:580px;opacity:.8}`,
  `<img class="bg" src="${img('thumb-c-bg.jpg')}" style="object-position:70% 60%"><div class="scrim"></div>
<div class="tag nw">출퇴근길</div>
<div class="h1 nw">틀어 두고 듣는</div><div class="h2 nw">영어 질문 30</div>
<div class="sub nw">대답 30 · 소리 규칙 다섯 가지</div>
<div class="w">${wave(560, 80, '#F5C518', 40, 3)}</div>`),
};

// ── 화면 시안 컷 (1920×1080) ──────────────────────────────────────
const MARK = `<div style="position:absolute;left:56px;top:40px;font-size:34px;font-weight:800;opacity:.85" class="nw">이해하면 <span style="color:#F5C518">쉬운영어</span></div>`;
const prog = (ch, n, part = '1부') => `<div style="position:absolute;right:60px;top:38px;display:flex;gap:16px;align-items:center;font-size:40px;font-weight:800" class="nw"><span style="opacity:.7">${part}</span><span style="background:${CH[ch].color};color:#0F1521;border-radius:12px;padding:4px 18px">${ch}장 ${CH[ch].name}</span><span>${n}/6</span></div>`;
const sceneBg = (ch) => (ch === 1
  ? `<img class="bg" src="${img('scene-ch1-bg.jpg')}" style="filter:blur(3px) brightness(.45) saturate(.8);transform:scale(1.05)">`
  : `<div class="bg" style="background:linear-gradient(135deg,#141C2B,#0D121C)"></div><div style="position:absolute;right:60px;bottom:40px;font-size:30px;opacity:.5" class="nw">${ch}장 장면 그림 자리 (비교 시트 승인 뒤 생성)</div>`);

const CUTS = {
  // 0:00 첫 30초 — 글자 없이 파형만
  'cut-00-open': page(1920, 1080, `.w{position:absolute;left:0;right:0;top:330px;display:flex;justify-content:center}
.c{position:absolute;left:0;right:0;top:790px;text-align:center;font-size:58px;font-weight:700;opacity:.75}`,
  `<div class="w">${wave(1500, 420, '#9FB4D8', 96, 5)}</div><div class="c nw">(귀로만 들어 보세요)</div>`),

  // 듣는 법 — 신호음 세 가지
  'cut-01-signals': page(1920, 1080, `.t{position:absolute;left:0;right:0;top:150px;text-align:center;font-size:72px;font-weight:900}
.row{position:absolute;left:210px;right:210px;display:flex;align-items:center;gap:48px;font-size:64px;font-weight:800}
.ic{width:150px;height:150px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:56px;font-weight:900;color:#0F1521}`,
  `${MARK}<div class="t nw">이 소리가 나면</div>
<div class="row" style="top:330px"><div class="ic" style="background:#F5C518">띵</div><span class="nw">영어가 나옵니다 (처음엔 글자 없이)</span></div>
<div class="row" style="top:540px"><div class="ic" style="background:#F4F1EA">뽁</div><span class="nw">따라 말할 차례 (입속으로도 OK)</span></div>
<div class="row" style="top:750px"><div class="ic" style="background:#8FA3C4">종</div><span class="nw">장이 바뀝니다</span></div>`),

  // 장 바뀜 — 1장 표지
  'cut-02-ch1-title': page(1920, 1080, `.n{position:absolute;left:150px;top:300px;font-size:120px;font-weight:900;color:${CH[1].color}}
.h{position:absolute;left:150px;top:440px;font-size:150px;font-weight:900;letter-spacing:-4px}
.r{position:absolute;left:150px;top:700px;font-size:72px;font-weight:800;opacity:.9}
.line{position:absolute;left:150px;top:668px;width:220px;height:10px;border-radius:5px;background:${CH[1].color}}`,
  `${sceneBg(1)}${MARK}<div class="n nw">1장</div><div class="h nw">길에서</div><div class="line"></div><div class="r nw">작은 말은 원래 작다 — 크게 들리는 두 군데만</div>`),

  // 첫 듣기 — 영어 글자 숨김
  'cut-03-q-hidden': page(1920, 1080, `.w{position:absolute;left:0;right:0;top:340px;display:flex;justify-content:center}
.c{position:absolute;left:0;right:0;top:760px;text-align:center;font-size:60px;font-weight:700;opacity:.8}`,
  `${sceneBg(1)}${MARK}${prog(1, 1)}<div class="w">${wave(1300, 360, CH[1].color, 70, 13)}</div><div class="c nw">(귀로만 들어 보세요)</div>`),

  // 다시 듣기 — 글자 크기 = 소리 세기(시안: 실제 크기는 음성 세기에서 계산)
  'cut-04-q-reveal': page(1920, 1080, `.s{position:absolute;left:0;right:0;top:300px;display:flex;justify-content:center;align-items:baseline;gap:30px}
.sm{font-size:60px;font-weight:600;color:#7D8798}.big{font-size:140px;font-weight:900;letter-spacing:-4px;line-height:1}
.m{position:absolute;left:0;right:0;top:620px;text-align:center;font-size:84px;font-weight:900}
.k{position:absolute;left:0;right:0;top:760px;text-align:center;font-size:60px;font-weight:700;color:#C9D3E6}`,
  `${sceneBg(1)}${MARK}${prog(1, 1)}
<div class="s"><span class="sm nw">how do I</span><span class="big nw" style="color:#F5C518">get</span><span class="sm nw">to</span><span class="big nw">Seoul Station?</span></div>
<div class="m nw">서울역 어떻게 가요?</div><div class="k nw">[겟 · 서울 스테이션] 두 군데만 크게</div>`),

  // 고유 코너 — 두 단어만 남기기
  'cut-05-two-words': page(1920, 1080, `.s{position:absolute;left:0;right:0;top:330px;display:flex;justify-content:center;align-items:baseline;gap:30px}
.gone{font-size:56px;font-weight:600;color:#5A6476;text-decoration:line-through}.big{font-size:136px;font-weight:900;letter-spacing:-4px;line-height:1}
.t{position:absolute;left:0;right:0;top:150px;text-align:center;font-size:64px;font-weight:800;color:${CH[1].color}}
.m{position:absolute;left:0;right:0;top:700px;text-align:center;font-size:76px;font-weight:800}`,
  `${sceneBg(1)}${MARK}${prog(1, 1)}<div class="t nw">두 단어만 남기면</div>
<div class="s"><span class="gone nw">how do I</span><span class="big nw" style="color:#F5C518">get</span><span class="gone nw">to</span><span class="big nw">Seoul Station?</span></div>
<div class="m nw">이것만으로도 뜻이 통한다</div>`),

  // 3장 — 섞이는 소리(디쥬) 다시 듣기, 장 색이 바뀐다
  'cut-06-ch3-reveal': page(1920, 1080, `.s{position:absolute;left:0;right:0;top:300px;display:flex;justify-content:center;align-items:baseline;gap:34px}
.sm{font-size:64px;font-weight:600;color:#7D8798}.big{font-size:160px;font-weight:900;letter-spacing:-4px;line-height:1}
.mix{font-size:150px;font-weight:900;color:${CH[3].color};letter-spacing:-3px;line-height:1}
.m{position:absolute;left:0;right:0;top:620px;text-align:center;font-size:84px;font-weight:900}
.k{position:absolute;left:0;right:0;top:760px;text-align:center;font-size:60px;font-weight:700;color:#C9D3E6}`,
  `${sceneBg(3)}${MARK}${prog(3, 1)}
<div class="s"><span class="mix nw">Did you</span><span class="sm nw">just</span><span class="big nw">move in?</span></div>
<div class="m nw">얼마 전에 이사 오셨어요?</div><div class="k nw">[디쥬] 드 + 유 → 쥬</div>`),

  // 2부 몰아 듣기 — 영어 + 뜻 + 대답
  'cut-07-part2': page(1920, 1080, `.q{position:absolute;left:0;right:0;top:280px;text-align:center;font-size:120px;font-weight:900;letter-spacing:-3px}
.m{position:absolute;left:0;right:0;top:470px;text-align:center;font-size:76px;font-weight:800;color:#C9D3E6}
.a{position:absolute;left:0;right:0;top:640px;text-align:center;font-size:96px;font-weight:800;color:${CH[2].color}}
.bar{position:absolute;left:160px;right:160px;bottom:110px;height:14px;border-radius:7px;background:#263044}
.bar i{position:absolute;left:0;top:0;bottom:0;width:26%;border-radius:7px;background:#F5C518}`,
  `${MARK}<div style="position:absolute;right:60px;top:38px;font-size:40px;font-weight:800" class="nw">2부 1회차 · 8/30</div>
<div class="q nw">Can I pay by card?</div><div class="m nw">카드로 계산해도 돼요?</div><div class="a nw">Sure, go ahead.</div><div class="bar"><i></i></div>`),

  // 끝 — 엔드 화면 9초, 중앙 비움
  'cut-08-end': page(1920, 1080, `.n{position:absolute;left:0;right:0;top:56px;text-align:center;font-size:44px;font-weight:700;opacity:.6}`,
  `${MARK}<div class="n nw">(엔드 화면 자리 — 가운데 비움)</div>`),

  // 1부 정리 — 다섯 장 규칙 한 장(캡처용)
  'cut-09-summary': page(1920, 1080, `.t{position:absolute;left:0;right:0;top:120px;text-align:center;font-size:76px;font-weight:900}
.row{position:absolute;left:300px;right:200px;display:flex;align-items:center;gap:40px;font-size:62px;font-weight:800}
.dot{width:120px;border-radius:14px;padding:6px 0;text-align:center;font-size:48px;font-weight:900;color:#0F1521}`,
  `${MARK}<div class="t nw">다섯 장, 다섯 가지 소리</div>${[1, 2, 3, 4, 5].map((c, i) => `<div class="row" style="top:${270 + i * 150}px"><div class="dot nw" style="background:${CH[c].color}">${c}장</div><span class="nw">${CH[c].name} — ${CH[c].rule}</span></div>`).join('')}`),
};

// 2~5장 표지와 첫 듣기 화면(장 색만 바뀐다, 장면 그림은 승인 뒤)
for (const c of [2, 3, 4, 5]) {
  CUTS[`cut-1${c}-ch${c}-title`] = page(1920, 1080, `.n{position:absolute;left:150px;top:300px;font-size:120px;font-weight:900;color:${CH[c].color}}
.h{position:absolute;left:150px;top:440px;font-size:150px;font-weight:900;letter-spacing:-4px}
.line{position:absolute;left:150px;top:668px;width:220px;height:10px;border-radius:5px;background:${CH[c].color}}
.r{position:absolute;left:150px;top:700px;font-size:72px;font-weight:800;opacity:.9}`,
  `${sceneBg(c)}${MARK}<div class="n nw">${c}장</div><div class="h nw">${CH[c].name}</div><div class="line"></div><div class="r nw">${CH[c].rule}</div>`);
  CUTS[`cut-2${c}-ch${c}-hidden`] = page(1920, 1080, `.w{position:absolute;left:0;right:0;top:340px;display:flex;justify-content:center}
.c{position:absolute;left:0;right:0;top:760px;text-align:center;font-size:60px;font-weight:700;opacity:.8}`,
  `${sceneBg(c)}${MARK}${prog(c, 1)}<div class="w">${wave(1300, 360, CH[c].color, 70, 13 + c)}</div><div class="c nw">(귀로만 들어 보세요)</div>`);
}

const browser = await chromium.launch();
const shot = async (html, w, h, file, type) => {
  const p = await browser.newPage({viewport: {width: w, height: h}});
  await p.setContent(html, {waitUntil: 'load'});
  await p.evaluate(() => document.fonts.ready);
  // 글자 넘침 검사: nowrap 요소가 화면 밖으로 나가면 알린다
  const over = await p.evaluate(([W, H]) => [...document.querySelectorAll('.nw')].filter((e) => {
    const r = e.getBoundingClientRect();
    return r.left < 0 || r.right > W || r.top < 0 || r.bottom > H;
  }).map((e) => e.textContent.trim().slice(0, 30)), [w, h]);
  await p.screenshot({path: file, type, ...(type === 'jpeg' ? {quality: 88} : {})});
  await p.close();
  return over;
};
const problems = [];
for (const [k, html] of Object.entries(THUMBS)) {
  const over = await shot(html, 1280, 720, join(OUT, `thumb-${k}.jpg`), 'jpeg');
  if (over.length) problems.push(`thumb-${k}: 넘침 ${over.join(' / ')}`);
}
for (const [k, html] of Object.entries(CUTS)) {
  const over = await shot(html, 1920, 1080, join(OUT, 'cuts', `${k}.jpg`), 'jpeg');
  if (over.length) problems.push(`${k}: 넘침 ${over.join(' / ')}`);
}
// 200px 폭·흑백 미리보기(썸네일 세 장 나란히)
const strip = page(1420, 460, `body{background:#fff;color:#111}.r{display:flex;gap:24px;padding:20px}.c{text-align:center;font-size:20px;font-weight:700}`,
  `<div class="r">${['A', 'B', 'C'].map((k) => `<div class="c"><img src="data:image/jpeg;base64,${readFileSync(join(OUT, `thumb-${k}.jpg`)).toString('base64')}" width="200"><div>${k} 200px</div></div>`).join('')}
${['A', 'B', 'C'].map((k) => `<div class="c"><img src="data:image/jpeg;base64,${readFileSync(join(OUT, `thumb-${k}.jpg`)).toString('base64')}" width="200" style="filter:grayscale(1)"><div>${k} 흑백</div></div>`).join('')}</div>`);
await shot(strip, 1420, 220, join(OUT, 'raw', 'thumb-check-200px.jpg'), 'jpeg');
await browser.close();
console.log(problems.length ? `문제 ${problems.length}건\n${problems.join('\n')}` : '넘침 0건');
console.log(`썸네일 3장 + 화면 시안 ${Object.keys(CUTS).length}장 → ${OUT}`);
