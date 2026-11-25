// EP37 비교 시트용 썸네일 3안(1280×720)과 화면 시안 컷(1920×1080)을 코드로 찍는다.
// 배경 사진은 AI 스튜디오(Nano Banana 2.1)로 만든 raw/*.jpg, 글자는 전부 여기서 얹는다(그림 속 글자 금지).
// 사용: node videos/ep37-listen-frozen-questions/scripts/render-sheet-images.mjs
import {execFileSync} from 'node:child_process';
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
const gfont = (f) => readFileSync(join(ROOT, 'public', 'fonts', 'google', f)).toString('base64');
const GF = {
  blackHan: gfont('BlackHanSans-Regular.ttf'),
  gothicA1: gfont('GothicA1-Black.ttf'),
  doHyeon: gfont('DoHyeon-Regular.ttf'),
  ibmBold: gfont('IBMPlexSansKR-Bold.ttf'),
  archivoBlack: gfont('ArchivoBlack-Regular.ttf'),
  barlowCond: gfont('BarlowCondensed-ExtraBold.ttf'),
  outfit: gfont('Outfit-VF.ttf'),
};
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
@font-face{font-family:'BlackHan';src:url(data:font/ttf;base64,${GF.blackHan}) format('truetype');font-weight:400}
@font-face{font-family:'GothicA1';src:url(data:font/ttf;base64,${GF.gothicA1}) format('truetype');font-weight:900}
@font-face{font-family:'DoHyeon';src:url(data:font/ttf;base64,${GF.doHyeon}) format('truetype');font-weight:400}
@font-face{font-family:'IBMBold';src:url(data:font/ttf;base64,${GF.ibmBold}) format('truetype');font-weight:700}
@font-face{font-family:'ArchivoBlack';src:url(data:font/ttf;base64,${GF.archivoBlack}) format('truetype');font-weight:400}
@font-face{font-family:'BarlowCond';src:url(data:font/ttf;base64,${GF.barlowCond}) format('truetype');font-weight:800}
@font-face{font-family:'Outfit';src:url(data:font/ttf;base64,${GF.outfit}) format('truetype');font-weight:100 900}
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

// ── 썸네일 3안 (1280×720) — v4(2026-11-25 밤 검수 개편: 그래픽 층·구글 폰트 역할 분리·200px 대비·제목 시너지 정렬) ───────────
// 사례집(data/youtube/packaging-cases.json) + 제작 자료(AI 티 빼기·영상 효과 14·15번) + 구글 폰트 서랍(public/fonts/google/).
// 이전 판: raw/thumb-?-v2-ai-average.jpg, raw/thumb-?-v3.jpg, raw/thumb-v3-review.txt.
const TL = JSON.parse(execFileSync(process.execPath, [join(HERE, 'estimate-timeline.mjs'), '--json'], {encoding: 'utf8'}));
const MINUTES = Math.round(TL.totalSeconds / 60); // 추정 길이(음성 실측 뒤 다시 찍으면 실제 값으로 바뀐다)
const stroke = (px, c = '#070B14') => `-webkit-text-stroke:${px}px ${c};paint-order:stroke fill`;
const THUMBS = {
  // A 장면·대결: 외국인 어깨 너머 하이 앵글(12°) 당황 클로즈업 + 날아오는 오디오 강조 띠(평면 말풍선 탈피) + 구글 폰트 3종 역할 분리.
  A: page(1280, 720, `
.low{position:absolute;left:0;right:0;bottom:0;height:330px;background:linear-gradient(0deg,rgba(6,10,18,.94) 0%,rgba(6,10,18,.68) 54%,rgba(6,10,18,0) 100%)}
.tl{position:absolute;left:0;top:0;width:740px;height:210px;background:radial-gradient(ellipse at 24% 20%,rgba(6,10,18,.78) 0%,rgba(6,10,18,0) 72%)}
.voice-bar{position:absolute;left:38px;top:40px;display:inline-flex;align-items:center;gap:14px;background:rgba(10,15,26,.92);border:3px solid #FFD21A;border-radius:18px;padding:12px 24px;box-shadow:0 12px 28px rgba(0,0,0,.55);transform:rotate(-1.8deg)}
.voice-txt{font-family:'BarlowCond',sans-serif;font-size:48px;font-weight:800;letter-spacing:.3px;line-height:1;display:flex;align-items:baseline;gap:10px}
.voice-txt .dim{color:#94A3B8;font-size:36px}
.voice-txt .hl{color:#FFD21A;text-decoration:underline;text-decoration-color:rgba(255,210,26,.55);text-underline-offset:5px;text-decoration-thickness:4px}
.arrow-wrap{position:absolute;left:674px;top:64px;pointer-events:none;filter:drop-shadow(0 4px 10px rgba(0,0,0,.6))}
.h1{position:absolute;left:44px;bottom:178px;font-family:'GothicA1',sans-serif;font-size:66px;font-weight:900;color:#F8FAFC;letter-spacing:-2px;${stroke(11)};text-shadow:0 6px 18px rgba(0,0,0,.6)}
.h2{position:absolute;left:38px;bottom:34px;font-family:'BlackHan',sans-serif;font-size:126px;font-weight:400;color:#FFD21A;letter-spacing:-3px;line-height:1;transform:rotate(-1deg);${stroke(14)};text-shadow:0 10px 26px rgba(0,0,0,.72)}`,
  `<img class="bg" src="${img('thumb-a-v4-bg.jpg')}" style="object-position:56% 32%"><div class="tl"></div><div class="low"></div>
<div class="voice-bar"><svg width="34" height="34" viewBox="0 0 34 34" fill="none"><rect x="2" y="13" width="5" height="8" rx="2.5" fill="#FFD21A"/><rect x="10" y="6" width="5" height="22" rx="2.5" fill="#FFD21A"/><rect x="18" y="2" width="5" height="30" rx="2.5" fill="#FFD21A"/><rect x="26" y="10" width="5" height="14" rx="2.5" fill="#FFD21A"/></svg><div class="voice-txt nw"><span class="dim">How do I</span><span class="hl">GET</span><span class="dim">to</span><span class="hl">SEOUL STATION</span><span class="dim">?</span></div></div>
<svg class="arrow-wrap" width="96" height="82" viewBox="0 0 96 82" fill="none"><path d="M8 14 C38 14, 62 28, 82 56" stroke="#FFD21A" stroke-width="7" stroke-linecap="round" stroke-dasharray="10 10"/><path d="M63 56 L84 60 L82 38" stroke="#FFD21A" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/></svg>
<div class="h1 nw">아는 단어 7개인데</div><div class="h2 nw">들린 건 두 덩어리</div>`),

  // B 소리 그림: 밤 지하철 옆모습·이어폰 + Archivo Black/Outfit 영문 강약 극대화(200px 명도·여백 확보) + 36분 듣기 정체성 칩.
  B: page(1280, 720, `
.scrim{position:absolute;left:0;top:0;bottom:0;width:860px;background:linear-gradient(90deg,rgba(7,12,24,.82) 0%,rgba(7,12,24,.55) 72%,rgba(7,12,24,0) 100%)}
.w{position:absolute;left:28px;top:220px;opacity:.24}
.q{position:absolute;left:50px;top:46px;font-family:'GothicA1',sans-serif;font-size:74px;font-weight:900;color:#F8FAFC;letter-spacing:-2.5px;${stroke(9)}}
.l1{position:absolute;left:52px;top:186px;display:flex;align-items:baseline;gap:20px}
.l2{position:absolute;left:52px;top:384px;display:flex;align-items:baseline;gap:14px}
.sm{font-family:'Outfit',sans-serif;font-size:48px;font-weight:700;color:#CBD5E1;letter-spacing:-.5px;${stroke(6)}}
.get{font-family:'ArchivoBlack',sans-serif;font-size:178px;font-weight:400;color:#FFD21A;letter-spacing:-4px;line-height:.95;${stroke(12)};text-shadow:0 10px 26px rgba(0,0,0,.6)}
.ss{font-family:'ArchivoBlack',sans-serif;font-size:80px;font-weight:400;color:#F8FAFC;letter-spacing:-2px;line-height:1;${stroke(10)};text-shadow:0 8px 20px rgba(0,0,0,.55)}
.beam{position:absolute;left:1084px;top:292px;pointer-events:none;filter:drop-shadow(0 0 10px rgba(255,210,26,.55))}
.dur{position:absolute;left:52px;bottom:48px;display:inline-flex;align-items:center;gap:12px;background:rgba(10,16,30,.88);border:2.5px solid rgba(255,210,26,.78);border-radius:999px;padding:10px 24px;font-family:'DoHyeon',sans-serif;font-size:38px;color:#FFD21A;letter-spacing:-.5px;box-shadow:0 8px 20px rgba(0,0,0,.45)}
.dot{width:14px;height:14px;border-radius:50%;background:#EF4444;box-shadow:0 0 0 4px rgba(239,68,68,.28)}`,
  `<img class="bg" src="${img('thumb-b-v4-bg.jpg')}" style="object-position:60% 50%"><div class="scrim"></div>
<div class="w">${wave(790, 290, '#60A5FA', 58, 11)}</div>
<div class="q nw">몇 단어 들리세요?</div>
<div class="l1"><span class="sm nw">how do I</span><span class="get nw">GET</span><span class="sm nw">to</span></div>
<div class="l2"><span class="ss nw">SEOUL STATION</span><span class="sm nw">?</span></div>
<svg class="beam" width="92" height="110" viewBox="0 0 92 110" fill="none"><path d="M30 28 C12 42, 12 68, 30 82" stroke="#FFD21A" stroke-width="5" stroke-linecap="round" opacity=".9"/><path d="M16 14 C-6 36, -6 74, 16 96" stroke="#FFD21A" stroke-width="4" stroke-linecap="round" opacity=".55"/></svg>
<div class="dur nw"><span class="dot"></span>${MINUTES}분 틀어 두고 듣기</div>`),

  // C 에디토리얼 콜라주: 따뜻한 머스터드 종이 + 서울 일상 인화 사진 3장 + 호기심 빈칸("그냥 틀면 안 들려요 / 딱 5가지만 알고 듣기").
  C: page(1280, 720, `
.chip{position:absolute;left:48px;top:52px;background:#C81E37;color:#FFFDF8;font-family:'DoHyeon',sans-serif;font-size:48px;padding:10px 26px;border-radius:12px;letter-spacing:-.5px;transform:rotate(-1.5deg);box-shadow:5px 7px 0 #141B2D}
.prob-wrap{position:absolute;left:50px;top:174px;display:inline-block}
.prob{font-family:'GothicA1',sans-serif;font-size:52px;font-weight:900;color:#141B2D;letter-spacing:-2px}
.strike{position:absolute;left:-4px;top:24px;width:206px;height:14px;pointer-events:none}
.h1{position:absolute;left:46px;top:262px;font-family:'BlackHan',sans-serif;font-size:122px;color:#0E1422;letter-spacing:-4px;line-height:1}
.hl-mark{display:inline-block;background:#FFFDF5;padding:0 12px 2px;border-radius:10px;box-shadow:5px 6px 0 #141B2D;color:#C81E37}
.h2{position:absolute;left:46px;top:404px;font-family:'BlackHan',sans-serif;font-size:114px;color:#0E1422;letter-spacing:-4px;line-height:1}
.sub{position:absolute;left:50px;bottom:50px;background:#141B2D;color:#FFFDF5;font-family:'IBMBold',sans-serif;font-size:36px;font-weight:700;padding:12px 24px;border-radius:12px;letter-spacing:-1px;box-shadow:0 8px 18px rgba(20,27,45,.24)}
.ed-arrow{position:absolute;left:500px;top:444px;pointer-events:none}`,
  `<img class="bg" src="${img('thumb-c-v4-bg.jpg')}" style="object-position:54% 50%">
<div class="chip nw">${MINUTES}분 틀어 두기</div>
<div class="prob-wrap"><span class="prob nw">그냥 틀면 안 들려요</span><svg class="strike" viewBox="0 0 236 14" fill="none"><path d="M4 10 C70 4, 160 11, 232 5" stroke="#C81E37" stroke-width="8" stroke-linecap="round"/></svg></div>
<div class="h1 nw">딱 <span class="hl-mark">5가지</span>만</div>
<div class="h2 nw">알고 듣기</div>
<svg class="ed-arrow" width="124" height="62" viewBox="0 0 124 62" fill="none"><path d="M8 46 C42 54, 80 42, 112 16" stroke="#141B2D" stroke-width="6" stroke-linecap="round"/><path d="M94 14 L115 14 L111 35" stroke="#141B2D" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/></svg>
<div class="sub nw">화면 안 봐도 OK · 질문 30개</div>`),
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
