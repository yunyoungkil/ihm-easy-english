// EP37 실측 타임라인(assets/timeline.json)과 단어별 소리 세기(assets/en-audit-data.json)로
// HyperFrames 1920×1080 30fps 컴포지션(index.html)을 자동 생성한다.
// v3: q07 타이밍 버그 수정 · 14개 긴 정지 화면 동적 분할 · A(상황 안내 카드) · B(귀 시험 카운트다운) · C(Whisper 정밀 자막) · D(2부 2회차 지연 자막)
// 사용: node videos/ep37-listen-frozen-questions/scripts/build-composition.mjs
import {readFileSync, writeFileSync} from 'node:fs';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const EP_DIR = resolve(HERE, '..');
const ASSETS = join(EP_DIR, 'assets');

const tl = JSON.parse(readFileSync(join(ASSETS, 'timeline.json'), 'utf8'));
const enAudit = JSON.parse(readFileSync(join(ASSETS, 'en-audit-data.json'), 'utf8'));
const enById = Object.fromEntries(enAudit.items.map((x) => [x.id, x]));

const CH = {
  1: {name: '길에서', full: '길·지하철', rule: '작은 말은 원래 작다 — 크게 들리는 두 군데만', shortRule: '작은 말은 원래 작다', color: '#4C8DF6'},
  2: {name: '가게에서', full: '우리 가게', rule: '앞 단어 끝소리가 다음 모음에 붙는다', shortRule: '끝소리가 다음 모음에 붙는다', color: '#2EB872'},
  3: {name: '처음 만난 사람', full: '처음 만난 사람', rule: "드·트 뒤의 '유'가 쥬·츄로 섞인다", shortRule: '드·트 뒤의 유가 섞인다', color: '#F28C28'},
  4: {name: '여행지에서', full: '여행지', rule: "모음 사이의 '트'가 리을처럼 구른다", shortRule: '모음 사이의 트가 구른다', color: '#3BB4E5'},
  5: {name: '친한 사이', full: '친한 사이', rule: '질문 앞머리가 통째로 빠진다', shortRule: '질문 앞머리가 사라진다', color: '#A97BE8'},
};

// 문항별 핵심 강조 단어 & 칩 표기
const Q_SPEC = {
  q01: {ch: 1, n: 1, big: ['get', 'seoul', 'station'], chip: '겟 / 서울 스테이션 — 두 군데만 크게'},
  q02: {ch: 1, n: 2, big: ['line', 'gangnam'], chip: '라인 / 강남 — 두 군데만 크게'},
  q03: {ch: 1, n: 3, big: ['right', 'way', 'myeongdong'], chip: '라잇 웨이 / 명동 — 두 군데만 크게'},
  q04: {ch: 1, n: 4, big: ['buy', 'ticket'], chip: 'can I → 크나이 (작게) · 바이 / 티켓 크게'},
  q05: {ch: 1, n: 5, big: ['train', 'airport'], chip: '트레인 / 에어포트 — 두 군데만 크게', earTest: true},
  q06: {ch: 1, n: 6, big: ['how', 'long', 'take'], chip: '하우 롱 / 테익 — 두 군데만 크게'},
  q07: {ch: 2, n: 1, hl: ['much', 'is', 'it'], chip: 'much is it → 하우 머치짓 (한 덩어리)', earTest: true},
  q08: {ch: 2, n: 2, hl: ['can', 'i'], big: ['pay', 'card'], chip: 'Can I → 캐나이 (끝소리가 뒤에 붙음)'},
  q09: {ch: 2, n: 3, hl: ['is', 'it'], big: ['spicy'], chip: 'Is it → 이짓 · [스파이시] 크게'},
  q10: {ch: 2, n: 4, hl: ['this', 'in'], big: ['black'], chip: 'this in → 디씬 블랙'},
  q11: {ch: 2, n: 5, hl: ['can', 'i', 'take', 'a'], big: ['look'], chip: '붙는 곳 두 군데: 캐나이 · 테이커'},
  q12: {ch: 2, n: 6, hl: ['this', 'on'], big: ['sale'], chip: 'this on → 디쏜 세일'},
  q13: {ch: 3, n: 1, hl: ['did', 'you'], big: ['move', 'in'], chip: 'Did you → 디쥬 (드 + 유 → 쥬)'},
  q14: {ch: 3, n: 2, hl: ['would', 'you'], big: ['coffee'], chip: 'Would you → 우쥬 (드 + 유 → 쥬)'},
  q15: {ch: 3, n: 3, hl: ['that', 'your'], big: ['dog'], chip: 'that your → 대츄어 (트 + 유 → 츄)'},
  q16: {ch: 3, n: 4, hl: ['could', 'you'], big: ['help'], chip: 'Could you → 쿠쥬 (드 + 유 → 쥬)'},
  q17: {ch: 3, n: 5, hl: ['get', 'you'], big: ['anything'], chip: 'get you → 게츄 (트 + 유 → 츄)', earTest: true},
  q18: {ch: 3, n: 6, hl: ['did', 'you'], big: ['where', 'get'], chip: 'did you → 웨어 디쥬 겟'},
  q19: {ch: 4, n: 1, hl: ['what', 'are', 'you'], big: ['looking'], chip: 'What are you → 워러유 (트 구름)'},
  q20: {ch: 4, n: 2, hl: ['put', 'it', 'in', 'a'], big: ['bag'], chip: 'put it in a → 푸리리너 (트 두 번 구름)', earTest: true},
  q21: {ch: 4, n: 3, hl: ['waiting'], big: ['taxi'], chip: 'waiting → 웨이링 (트 구름)'},
  q22: {ch: 4, n: 4, hl: ['that', 'it'], chip: "that it → 이즈 대릿 (뜻: '이게 다예요?')"},
  q23: {ch: 4, n: 5, hl: ['what', 'about'], big: ['this'], chip: 'What about → 워러바웃 (트 구름)'},
  q24: {ch: 4, n: 6, hl: ['it', 'a', 'little'], big: ['big'], chip: 'it a little → 이지러 리를 (트 두 곳 구름)'},
  q25: {ch: 5, n: 1, dropped: 'Do you', big: ['want', 'some'], chip: 'Do you 빠짐 · 끝을 올려 질문'},
  q26: {ch: 5, n: 2, dropped: 'Are you', big: ['ready'], chip: 'Are you 빠짐 · 한 단어만 남음'},
  q27: {ch: 5, n: 3, dropped: 'Have you', hl: ['got', 'a'], big: ['minute'], chip: 'Have you 빠짐 + got a → 가러', earTest: true},
  q28: {ch: 5, n: 4, dropped: 'Do you', hl: ['need', 'a'], big: ['hand'], chip: 'Do you 빠짐 + need a → 니더 (뜻: 도와줄까?)'},
  q29: {ch: 5, n: 5, dropped: 'Are you', big: ['hungry'], chip: 'Are you 빠짐 · 한 단어만 남음'},
  q30: {ch: 5, n: 6, dropped: 'Have you', big: ['seen', 'this'], chip: 'Have you 빠짐 · 이거 봤어?'},
};

// A: 영어 재생 전 상황 안내 카드 (띵 소리 전까지 보여 주는 맥락·들을 포인트)
const Q_SETUP = {
  q01: {scene: '서울역 개찰구 앞', focus: "'get' 앞쪽 세 단어가 어떻게 지나가는지 들어 보세요"},
  q02: {scene: '지하철 노선도 앞', focus: '강남 가는 노선을 묻는 질문 · 크게 들리는 두 군데'},
  q03: {scene: '명동 가는 길에서', focus: '지도를 보며 걷던 사람이 멈춰 서서 건네는 질문'},
  q04: {scene: '지하철 매표소 앞', focus: "'can(할 수 있다)'이 질문 안에서 어떻게 들릴까요?"},
  q05: {scene: '귀 시험 · 1장', focus: '힌트 없이 바로 갑니다 · 귀로만 집중해 보세요'},
  q06: {scene: '1장 마지막 질문', focus: '거기까지 얼마나 걸리는지 묻는 질문'},
  q07: {scene: '2장 귀 시험 · 가게에서', focus: '단어가 몇 개로 들리는지 귀로만 세어 보세요'},
  q08: {scene: '가게 계산대에서', focus: "'Can'과 'I' 두 단어가 어떻게 붙는지 들어 보세요"},
  q09: {scene: '식당 테이블에서', focus: '메뉴를 고르던 손님이 확인하는 질문'},
  q10: {scene: '옷 가게에서', focus: '옷을 들어 보이며 건네는 질문'},
  q11: {scene: '소품·옷 가게에서', focus: '소리가 붙는 곳 두 군데를 세면서 들어 보세요'},
  q12: {scene: '2장 마지막 질문', focus: '가격표를 보던 손님의 질문'},
  q13: {scene: '아파트 엘리베이터', focus: "두 번째 단어 'you'가 어떻게 들리는지 챙겨 보세요"},
  q14: {scene: '이웃집에 초대받았을 때', focus: '자리에 앉으면 자주 듣게 되는 질문'},
  q15: {scene: '동네 산책길에서', focus: "여기선 '쥬'가 아니라 '츄'로 섞여 들립니다"},
  q16: {scene: '짐을 든 이웃 앞에서', focus: '도움을 부탁할 때 건네는 질문'},
  q17: {scene: '귀 시험 · 3장', focus: '힌트 없이 듣기 · 손님을 맞는 쪽에서 건네는 말'},
  q18: {scene: '3장 마지막 질문', focus: '새로 산 물건을 보고 건네는 질문'},
  q19: {scene: '여행지 가게에서', focus: "첫 단어 'What'의 끝소리가 어떻게 바뀌는지 들어 보세요"},
  q20: {scene: '귀 시험 · 4장', focus: '힌트 없이 듣기 · 계산할 때 자주 듣는 말'},
  q21: {scene: '호텔 정문 앞에서', focus: '직원이 다가와 건네는 질문'},
  q22: {scene: '가게 계산대에서', focus: '세 단어짜리 짧은 질문 · 뜻에 집중해 들어 보세요'},
  q23: {scene: '여행지 상점에서', focus: '직원이 물건 하나를 집어 들며 건네는 질문'},
  q24: {scene: '피팅룸 앞에서', focus: '옷을 입어 보고 나왔을 때 직원의 확인 질문'},
  q25: {scene: '친한 사이 · 간식 시간', focus: '과자 봉지를 내밀며 건네는 짧은 질문'},
  q26: {scene: '친한 사이 · 외출 직전', focus: '나갈 채비를 하는 친구에게 건네는 한마디'},
  q27: {scene: '마지막 귀 시험 · 5장', focus: '힌트 없이 가는 마지막 질문 · 귀로만 집중해 보세요'},
  q28: {scene: '친한 사이 · 무거운 짐', focus: '빠진 앞머리가 뭔지 떠올리며 들어 보세요'},
  q29: {scene: '친한 사이 · 저녁 무렵', focus: '냉장고 문을 연 친구의 한마디'},
  q30: {scene: '5장 마지막 질문', focus: '휴대폰 화면을 내밀어 보이며 건네는 질문'},
};

const EXTEND_ITEMS = {
  x01: {ch: 2, text: 'Come on.', ko: '어서, 이리 와', chip: 'Come on → 커몬 (끝소리가 온에 붙음)'},
  x02: {ch: 2, text: 'Hold on.', ko: '잠깐만 기다려 주세요', chip: 'Hold on → 홀돈 (끝소리가 온에 붙음)'},
  x03: {ch: 3, text: 'Nice to meet you.', ko: '만나서 반가워요', chip: 'meet you → 나이스 투 미츄 (트 + 유 → 츄)'},
  x04: {ch: 4, text: 'A lot of people.', ko: '많은 사람들', chip: 'lot of → 얼라러브 피플 (트 구름)'},
  x05: {ch: 4, text: 'Get out.', ko: '나가!', chip: 'Get out → 게라웃 (트 구름)'},
  x06: {ch: 5, text: 'Got it. ↓', ko: '알겠어 (대답)', chip: '말끝을 내리면 대답'},
  x07: {ch: 5, text: 'Got it? ↑', ko: '알겠어? (질문)', chip: '말끝을 올리면 질문'},
};

const esc = (s) => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// 결정론적 SVG 파형 (Math.random 미사용)
function waveSvg(w, h, color, bars = 68, seed = 7) {
  let s = seed;
  const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
  const bw = w / bars;
  let rects = '';
  for (let i = 0; i < bars; i += 1) {
    const env = Math.sin((i / bars) * Math.PI) ** 0.6;
    const bh = Math.max(8, h * env * (0.24 + 0.76 * rnd()));
    rects += `<rect x="${(i * bw + bw * 0.2).toFixed(1)}" y="${((h - bh) / 2).toFixed(1)}" width="${(bw * 0.58).toFixed(1)}" height="${bh.toFixed(1)}" rx="${(bw * 0.29).toFixed(1)}" fill="${color}"/>`;
  }
  return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" aria-hidden="true">${rects}</svg>`;
}

// 원어민 원래 속도: 단어별 크기·색상 대비 HTML
function renderStyledQuestion(qId, chColor) {
  const qText = enById[qId]?.expected || '';
  const spec = Q_SPEC[qId] || {};
  const words = qText.split(/\s+/);
  const longQ = qText.length > 26;
  const parts = [];
  if (spec.dropped) {
    parts.push(`<span class="w-dropped">${esc(spec.dropped)}</span>`);
  }
  for (const raw of words) {
    const clean = raw.toLowerCase().replace(/[^a-z']/g, '');
    const isHl = (spec.hl || []).includes(clean);
    const isBig = (spec.big || []).includes(clean);
    if (isHl) {
      parts.push(`<span class="w-hl${longQ ? ' w-long' : ''}" style="color:${chColor}">${esc(raw)}</span>`);
    } else if (isBig) {
      parts.push(`<span class="w-big${longQ ? ' w-long' : ''}" style="color:${spec.ch === 1 ? '#FFD21A' : '#F8FAFC'}">${esc(raw)}</span>`);
    } else {
      parts.push(`<span class="w-sm${longQ ? ' w-long' : ''}">${esc(raw)}</span>`);
    }
  }
  return parts.join('');
}

// 끊어 읽기 시연(천천히): 단어를 균등 크기·넓은 간격으로 펼쳐 보여 주는 대비 HTML
function renderSlowQuestion(qId, demoId) {
  const rawDemo = enById[demoId]?.expected || enById[qId]?.expected || '';
  const cleaned = rawDemo.replace(/<short pause>/gi, ' ').replace(/\./g, ' ').replace(/\s+/g, ' ').trim();
  const words = cleaned.split(/\s+/).filter(Boolean);
  const longQ = cleaned.length > 26;
  return words.map((w, idx) =>
    `<span class="w-slow${longQ ? ' w-long' : ''}">${esc(w)}</span>${idx < words.length - 1 ? '<span class="w-sep">·</span>' : ''}`
  ).join('');
}

// 타임라인에서 마크 범위별 이벤트·자막 추출
const marks = tl.marks;
const events = tl.events;
const koCaps = tl.koCaptions || [];
const totalDur = tl.totalSeconds;

const markSpan = (idx) => {
  const start = marks[idx].t;
  const end = idx + 1 < marks.length ? marks[idx + 1].t : tl.endScreenStart;
  return {start, end, dur: Math.max(0.1, +(end - start).toFixed(3))};
};
const eventsIn = (s, e) => events.filter((ev) => ev.t >= s - 0.01 && ev.t < e - 0.01);
const findCap = (s, e, substr) => koCaps.find((c) => c.start >= s - 0.05 && c.end <= e + 0.05 && c.text.includes(substr));

const clips = [];
let clipSeq = 0;
const addClip = ({start, end, track = 1, html, cls = '', anim = null}) => {
  const dur = +(end - start).toFixed(3);
  if (dur <= 0.05) return;
  clipSeq += 1;
  const id = `c${String(clipSeq).padStart(3, '0')}`;
  clips.push({id, start: +start.toFixed(3), dur, track, html, cls, anim});
};

const progHtml = (ch, n, part = '1부') =>
  `<div class="prog-pill"><span class="prog-part">${esc(part)}</span><span class="prog-ch" style="background:${CH[ch].color}">${ch}장 ${esc(CH[ch].name)}</span><span class="prog-num">${typeof n === 'number' ? `${n}/6` : esc(n)}</span></div>`;

// 공유 배경 레이어 (트랙 0): heavy_overlay 0 유지
const markT = (pred) => marks.find((x) => pred(x.title))?.t;
const bgSpans = [
  {start: 0, end: markT((t) => t.startsWith('00-B')), html: `<img class="bg-img" src="assets/images/scene-ch1-dim.jpg" alt="">`},
  {start: markT((t) => t.startsWith('00-B')), end: markT((t) => t.startsWith('1장')), html: `<div class="bg-grad-signals"></div>`},
  {start: markT((t) => t.startsWith('1장')), end: markT((t) => t.startsWith('q01')), html: `<img class="bg-img bg-kb" src="assets/images/scene-ch1-title.jpg" alt=""><div class="ch-scrim"></div>`, anim: 'kenburns'},
  {start: markT((t) => t.startsWith('q01')), end: markT((t) => t.startsWith('2장')), html: `<img class="bg-img" src="assets/images/scene-ch1-dim.jpg" alt="">`},
  {start: markT((t) => t.startsWith('2장')), end: markT((t) => t.startsWith('q07')), html: `<img class="bg-img bg-kb" src="assets/images/scene-ch2-title.jpg" alt=""><div class="ch-scrim"></div>`, anim: 'kenburns'},
  {start: markT((t) => t.startsWith('q07')), end: markT((t) => t.startsWith('3장')), html: `<img class="bg-img" src="assets/images/scene-ch2-dim.jpg" alt="">`},
  {start: markT((t) => t.startsWith('3장')), end: markT((t) => t.startsWith('q13')), html: `<img class="bg-img bg-kb" src="assets/images/scene-ch3-title.jpg" alt=""><div class="ch-scrim"></div>`, anim: 'kenburns'},
  {start: markT((t) => t.startsWith('q13')), end: markT((t) => t.startsWith('4장')), html: `<img class="bg-img" src="assets/images/scene-ch3-dim.jpg" alt="">`},
  {start: markT((t) => t.startsWith('4장')), end: markT((t) => t.startsWith('q19')), html: `<img class="bg-img bg-kb" src="assets/images/scene-ch4-title.jpg" alt=""><div class="ch-scrim"></div>`, anim: 'kenburns'},
  {start: markT((t) => t.startsWith('q19')), end: markT((t) => t.startsWith('5장')), html: `<img class="bg-img" src="assets/images/scene-ch4-dim.jpg" alt="">`},
  {start: markT((t) => t.startsWith('5장')), end: markT((t) => t.startsWith('q25')), html: `<img class="bg-img bg-kb" src="assets/images/scene-ch5-title.jpg" alt=""><div class="ch-scrim"></div>`, anim: 'kenburns'},
  {start: markT((t) => t.startsWith('q25')), end: markT((t) => t === '1부 정리'), html: `<img class="bg-img" src="assets/images/scene-ch5-dim.jpg" alt="">`},
  {start: markT((t) => t === '1부 정리'), end: markT((t) => t === '2부 몰아 듣기'), html: `<div class="bg-grad-sum"></div>`},
  {start: markT((t) => t === '2부 몰아 듣기'), end: markT((t) => t.startsWith('2부 2회차')), html: `<div class="bg-lounge"></div>`},
  {start: markT((t) => t.startsWith('2부 2회차')), end: markT((t) => t === '끝'), html: `<div class="bg-lounge bg-lounge-deep"></div>`},
  {start: markT((t) => t === '끝'), end: totalDur, html: `<div class="bg-end"></div>`},
];
for (const b of bgSpans) addClip({start: b.start, end: b.end, track: 0, html: b.html, anim: b.anim || null});

// 핵심 원리 2단 비교 카드 헬퍼 (긴 설명 구간 분할용)
function compareCardHtml(ch, n, badgeText, leftTitle, leftMain, leftSub, rightTitle, rightMain, rightSub, accent) {
  return `${progHtml(ch, n)}
<div class="stage-card anim-in" style="border-top-color:${accent}">
  <div class="corner-badge" style="background:${accent}">${esc(badgeText)}</div>
  <div class="cmp-grid">
    <div class="cmp-box cmp-left">
      <div class="cmp-label">${esc(leftTitle)}</div>
      <div class="cmp-main">${leftMain}</div>
      <div class="cmp-sub">${esc(leftSub)}</div>
    </div>
    <div class="cmp-arrow" style="color:${accent}">→</div>
    <div class="cmp-box cmp-right" style="border-color:${accent}">
      <div class="cmp-label" style="color:${accent}">${esc(rightTitle)}</div>
      <div class="cmp-main" style="color:${accent}">${rightMain}</div>
      <div class="cmp-sub">${esc(rightSub)}</div>
    </div>
  </div>
</div>`;
}

// 각 마크를 순회하며 모든 전경 구간 클립 조립 (트랙 1)
let curCh = 1;
for (let mi = 0; mi < marks.length; mi += 1) {
  const m = marks[mi];
  const T = m.title;
  const {start, end} = markSpan(mi);
  const evs = eventsIn(start, end);

  if (m.level === 2 && T === '여는 장') continue;

  // 00-A 첫 35초 — 3단계 시각 전환
  if (T.startsWith('00-A')) {
    const k1Ev = evs.find((e) => e.id === 'k001');
    const k1Start = k1Ev ? k1Ev.t : start + 2.9;
    const whereCap = findCap(start, end, '어디로 갔을까요');
    const promiseAt = whereCap ? whereCap.end : +(k1Start + (end - k1Start) * 0.55).toFixed(2);

    addClip({
      start, end: k1Start, track: 1,
      html: `<div class="center-stack anim-in">
  <div class="ear-badge"><span class="rec-dot"></span><span>EAR ONLY · 첫 듣기</span></div>
  <div class="wave-wrap">${waveSvg(1440, 340, '#FFD21A', 80, 5)}</div>
  <div class="ear-caption">화면을 보지 말고, 귀로만 들어 보세요</div>
</div>`,
      anim: 'wave',
    });

    addClip({
      start: k1Start, end: promiseAt, track: 1,
      html: `<div class="stage-card anim-in" style="border-top-color:#FFD21A">
  <div class="corner-badge">다 아는 단어 7개인데, 귀엔 딱 두 덩어리?</div>
  <div class="q-words">${renderStyledQuestion('q01', '#FFD21A')}</div>
  <div class="q-chip" style="border-color:#FFD21A;color:#FFD21A">겟 / 서울 스테이션 — 두 군데만 크고 길게</div>
</div>`,
      anim: 'card',
    });

    addClip({
      start: promiseAt, end, track: 1,
      html: `<div class="center-stack anim-in">
  <div class="corner-badge" style="background:#FFD21A">오늘 들을 내용</div>
  <div class="p2-intro-title">생활 질문 30개 · 소리 규칙 5가지</div>
  <div class="end-chips">${[
    [1, '작아지고'], [2, '붙고'], [3, '섞이고'], [4, '구르고'], [5, '빠진다'],
  ].map(([n, w]) => `<span class="end-chip" style="border-color:${CH[n].color};color:${CH[n].color}">${n}. ${w}</span>`).join('')}</div>
</div>`,
      anim: 'card',
    });
    continue;
  }

  // 00-B 신호음 세 가지 (35.7초 → 스포트라이트 25.8초 + 1부·2부 로드맵 10.0초 2단 분할)
  if (T.startsWith('00-B')) {
    const dingT = evs.find((e) => e.kind === 'sfx' && e.id === '띵')?.t ?? start + 3;
    const popT = evs.find((e) => e.kind === 'sfx' && e.id === '뽁')?.t ?? start + 15.5;
    const gongT = evs.find((e) => e.kind === 'sfx' && e.id === '종')?.t ?? start + 23.8;
    const k5Ev = evs.find((e) => e.id === 'k005');
    const splitAt = k5Ev ? k5Ev.t : end - 9.5;

    addClip({
      start, end: splitAt, track: 1,
      html: `<div class="sig-wrap anim-in">
  <div class="sig-title">소리 신호 세 가지</div>
  <div class="sig-sub">화면을 안 보셔도, 이 소리만 따라오시면 됩니다</div>
  <div class="sig-cards">
    <div class="sig-card sig-c1" style="border-left-color:#FFD21A"><div class="sig-ic" style="background:#FFD21A">띵</div><div class="sig-txt"><span class="sig-main">영어가 나옵니다</span><span class="sig-hint">처음 들을 땐 일부러 글자를 숨겨 둡니다</span></div></div>
    <div class="sig-card sig-c2" style="border-left-color:#F8FAFC"><div class="sig-ic" style="background:#F8FAFC">뽁</div><div class="sig-txt"><span class="sig-main">따라 말할 차례</span><span class="sig-hint">지하철에서는 입속으로만 따라 하셔도 OK</span></div></div>
    <div class="sig-card sig-c3" style="border-left-color:#4C8DF6"><div class="sig-ic" style="background:#4C8DF6">종</div><div class="sig-txt"><span class="sig-main">장이 바뀝니다</span><span class="sig-hint">길 · 가게 · 처음 만난 사람 · 여행지 · 친한 사이</span></div></div>
  </div>
</div>`,
      anim: {
        type: 'signalsSpotlight',
        dingOff: Math.max(0.2, +(dingT - start).toFixed(2)),
        popOff: Math.max(0.5, +(popT - start - 1.5).toFixed(2)),
        gongOff: Math.max(1.0, +(gongT - start - 2.0).toFixed(2)),
      },
    });

    addClip({
      start: splitAt, end, track: 1,
      html: `<div class="stage-card anim-in" style="border-top-color:#FFD21A">
  <div class="corner-badge" style="background:#FFD21A">오늘 30분 구성</div>
  <div class="cmp-grid">
    <div class="cmp-box cmp-right" style="border-color:#4C8DF6">
      <div class="cmp-label" style="color:#4C8DF6">1부 · 하나씩 귀로 풀기 (23분)</div>
      <div class="cmp-main" style="color:#F8FAFC">질문 30개 · 규칙 5가지</div>
      <div class="cmp-sub">왜 안 들리는지 귀로 확인하고 다시 듣기</div>
    </div>
    <div class="cmp-arrow" style="color:#FFD21A">→</div>
    <div class="cmp-box cmp-right" style="border-color:#2EB872">
      <div class="cmp-label" style="color:#2EB872">2부 · 쭉 틀어 두기 (7분)</div>
      <div class="cmp-main" style="color:#2EB872">1회차 뜻 포함 · 2회차 영어만</div>
      <div class="cmp-sub">집안일·출퇴근길에 편하게 틀어 두세요</div>
    </div>
  </div>
</div>`,
      anim: 'card',
    });
    continue;
  }

  // 1~5장 표지 (1장은 35.5초 → 표지 12초 + 작은 말/큰 말 원리 비교 카드 23초로 분할!)
  const chM = m.level === 2 ? T.match(/^(\d)장/) : null;
  if (chM) {
    curCh = Number(chM[1]);
    const c = CH[curCh];
    if (curCh === 1) {
      const ruleCap = findCap(start, end, '영어 질문에선');
      const ruleSplit = ruleCap ? ruleCap.start : start + 12.8;
      addClip({
        start, end: ruleSplit, track: 1,
        html: `<div class="ch-ghost" style="color:${c.color}">01</div>
<div class="ch-content anim-in">
  <div class="ch-chip" style="background:${c.color}">CHAPTER 01</div>
  <div class="ch-name">${esc(c.name)}</div>
  <div class="ch-bar" style="background:${c.color}"></div>
  <div class="ch-rule">${esc(c.rule)}</div>
</div>`,
        anim: 'card',
      });
      addClip({
        start: ruleSplit, end, track: 1,
        html: `<div class="stage-card anim-in" style="border-top-color:${c.color}">
  <div class="corner-badge" style="background:${c.color}">1장 핵심 원리 · 다 들으려 하지 마세요</div>
  <div class="cmp-grid">
    <div class="cmp-box cmp-right" style="border-color:#FFD21A">
      <div class="cmp-label" style="color:#FFD21A">뜻을 담은 말 · 크고 길게 ↑</div>
      <div class="cmp-main" style="color:#FFD21A">get · station · ticket</div>
      <div class="cmp-sub">귀에 또렷하게 남는 핵심 두 군데</div>
    </div>
    <div class="cmp-arrow" style="color:#94A3B8">vs</div>
    <div class="cmp-box cmp-left">
      <div class="cmp-label">작은 말 · 작고 짧게 ↓</div>
      <div class="cmp-main" style="color:#CBD5E1;font-size:52px">to · the · can</div>
      <div class="cmp-sub">원래 거의 '어' 소리로 스쳐 지나갑니다</div>
    </div>
  </div>
</div>`,
        anim: 'card',
      });
      continue;
    }

    addClip({
      start, end, track: 1,
      html: `<div class="ch-ghost" style="color:${c.color}">0${curCh}</div>
<div class="ch-content anim-in">
  <div class="ch-chip" style="background:${c.color}">CHAPTER 0${curCh}</div>
  <div class="ch-name">${esc(c.name)}</div>
  <div class="ch-bar" style="background:${c.color}"></div>
  <div class="ch-rule">${esc(c.rule)}</div>
</div>`,
      anim: 'card',
    });
    continue;
  }

  // 개별 문항 q01~q30
  const qM = m.level === 3 ? T.match(/^(q\d\d)\b/) : null;
  if (qM) {
    const qId = qM[1];
    const aId = `a${qId.slice(1)}`;
    const spec = Q_SPEC[qId];
    const setup = Q_SETUP[qId] || {scene: CH[spec.ch].name, focus: '귀로 먼저 들어 보세요'};
    const ch = spec.ch;
    const c = CH[ch];
    const qData = tl.qInfo[qId] || {};

    const firstEn = evs.find((e) => e.kind === 'en' && e.id === qId && e.hiddenEn);
    const dingEv = evs.find((e) => e.kind === 'sfx' && e.id === '띵' && e.t <= (firstEn?.t ?? end));
    const kosAfter = evs.filter((e) => e.kind === 'ko' && e.t >= (firstEn?.end ?? start));
    const isQuizWithPause = ['q05', 'q17', 'q20', 'q27'].includes(qId);

    // [버그 수정 #1] q07은 k031 첫 문장("단어가 몇 개로 들리셨어요?") 직후 정답이 나오므로 바로 카드 공개!
    let revealAt;
    if (qId === 'q07') {
      const q7RevealCap = findCap(start, end, '원래는 네 개인데');
      revealAt = q7RevealCap ? q7RevealCap.start : (kosAfter[0] ? kosAfter[0].t + 2.0 : start + 6.5);
    } else if (isQuizWithPause) {
      revealAt = kosAfter[1] ? kosAfter[1].t : Math.min(end - 1, (firstEn?.end ?? start) + 4.5);
    } else {
      revealAt = kosAfter[0] ? kosAfter[0].t : Math.min(end - 1, (firstEn?.end ?? start) + 1.5);
    }

    // [개선 A] 띵 소리 전 상황 설명 구간(>= 1.8초)은 '상황 안내 카드' → 띵 소리와 동시에 '첫 듣기 파형' 전환!
    const waveStart = dingEv && (dingEv.t - start) >= 1.8 ? dingEv.t : start;
    if (waveStart > start + 0.1) {
      addClip({
        start, end: waveStart, track: 1,
        html: `${progHtml(ch, spec.n)}
<div class="stage-card setup-card anim-in" style="border-top-color:${c.color}">
  <div class="setup-tag" style="border-color:${c.color};color:${c.color}">${esc(setup.scene)}</div>
  <div class="setup-focus">${esc(setup.focus)}</div>
  <div class="setup-ready">잠시 뒤 <span style="color:#FFD21A">띵</span> 소리와 함께 영어가 나옵니다</div>
</div>`,
        anim: 'card',
      });
    }

    // [개선 B] 귀 시험 4문항(q05·q17·q20·q27)은 "무슨 뜻이었을까요?" 시점부터 2.3초 생각 카운트다운 진행 바!
    if (isQuizWithPause && kosAfter[0] && kosAfter[0].t > waveStart + 0.3 && revealAt > kosAfter[0].t + 0.8) {
      const askT = kosAfter[0].t;
      addClip({
        start: waveStart, end: askT, track: 1,
        html: `${progHtml(ch, spec.n)}
<div class="center-stack anim-in">
  <div class="ear-badge" style="border-color:${c.color};color:${c.color}"><span class="rec-dot" style="background:${c.color}"></span><span>귀 시험 · 힌트 없이 듣기</span></div>
  <div class="wave-wrap">${waveSvg(1320, 340, c.color, 72, 10 + Number(qId.slice(1)))}</div>
  <div class="ear-caption">귀로만 먼저 들어 보세요</div>
</div>`,
        anim: 'wave',
      });
      addClip({
        start: askT, end: revealAt, track: 1,
        html: `${progHtml(ch, spec.n)}
<div class="stage-card anim-in" style="border-top-color:#FFD21A">
  <div class="corner-badge" style="background:#FFD21A">귀 시험 · 생각 시간</div>
  <div class="think-title">무슨 뜻이었을까요?</div>
  <div class="think-bar-wrap"><div class="think-bar-fill" style="background:linear-gradient(90deg,#FFD21A,${c.color})"></div></div>
  <div class="setup-ready">잠시 뒤 정답과 뜻이 열립니다</div>
</div>`,
        anim: {type: 'countdown', dur: +(revealAt - askT).toFixed(2)},
      });
    } else {
      addClip({
        start: waveStart, end: revealAt, track: 1,
        html: `${progHtml(ch, spec.n)}
<div class="center-stack anim-in">
  <div class="ear-badge" style="border-color:${c.color};color:${c.color}"><span class="rec-dot" style="background:${c.color}"></span><span>${qId === 'q07' ? '2장 귀 시험 · 몇 단어로 들릴까요?' : '첫 듣기 · 글자 숨김'}</span></div>
  <div class="wave-wrap">${waveSvg(1320, 340, c.color, 72, 10 + Number(qId.slice(1)))}</div>
  <div class="ear-caption">${qId === 'q07' ? '단어가 몇 개로 들리는지 귀로만 세어 보세요' : '귀로만 먼저 들어 보세요'}</div>
</div>`,
        anim: 'wave',
      });
    }

    // 고유 코너 (q01의 d01 구간 분리)
    const d01Ev = qId === 'q01' ? evs.find((e) => e.kind === 'en' && e.id === 'd01') : null;
    if (d01Ev) {
      const nextQ = evs.find((e) => e.kind === 'en' && e.id === 'q01' && e.t > d01Ev.t);
      const cornerStart = d01Ev.t - 0.3;
      const cornerEnd = nextQ ? nextQ.t : end;
      if (cornerStart > revealAt + 0.5) {
        addClip({
          start: revealAt, end: cornerStart, track: 1,
          html: `${progHtml(1, 1)}
<div class="stage-card anim-in" style="border-top-color:${c.color}">
  <div class="q-words">${renderStyledQuestion('q01', c.color)}</div>
  <div class="q-ko">${esc(qData.ko)}</div>
  <div class="q-chip" style="border-color:${c.color};color:#FFD21A">${esc(spec.chip)}</div>
</div>`,
          anim: 'card',
        });
      }
      addClip({
        start: cornerStart, end: cornerEnd, track: 1,
        html: `${progHtml(1, 1)}
<div class="stage-card anim-in" style="border-top-color:#FFD21A">
  <div class="corner-badge">고유 코너 · 두 단어만 남기기</div>
  <div class="q-words"><span class="w-gone">how do I</span><span class="w-big" style="color:#FFD21A">get</span><span class="w-gone">to</span><span class="w-big">Seoul Station?</span></div>
  <div class="q-ko">이것만 들어도 뜻이 바로 통합니다</div>
</div>`,
        anim: 'card',
      });
      const aEv = evs.find((e) => e.kind === 'en' && e.id === 'a01');
      addClip({
        start: cornerEnd, end, track: 1,
        html: `${progHtml(1, 1)}
<div class="stage-card anim-in" style="border-top-color:${c.color}">
  <div class="q-words">${renderStyledQuestion('q01', c.color)}</div>
  <div class="q-ko">${esc(qData.ko)}</div>
  <div class="q-chip" style="border-color:${c.color};color:#FFD21A">${esc(spec.chip)}</div>
  <div class="ans-box"><span class="ans-tag">대답</span><span class="ans-en">${esc(qData.a)}</span></div>
</div>`,
        anim: aEv ? {type: 'revealAns', ansOff: Math.max(0.1, +(aEv.t - cornerEnd).toFixed(2))} : 'card',
      });
      continue;
    }

    // [확정 수정] 긴 정지 화면(29~45초) 동적 분할 — 깊게 다루는 문항 10곳
    const aEv = evs.find((e) => e.kind === 'en' && e.id === aId);
    const demoEv = evs.find((e) => e.kind === 'en' && /^d(0[2-9]|10)$/.test(e.id));
    const normalAfter = demoEv ? evs.find((e) => e.kind === 'en' && e.id === qId && e.t >= demoEv.end) : null;

    // 1) q07 특수 5단 흐름 (정답+대답 → 연음 도식 → 우리말 비유 '먹어요'→'머거요' → 끊어 읽기 시연 → 원어민 속도 합체)
    if (qId === 'q07' && demoEv) {
      const k33Ev = evs.find((e) => e.id === 'k033');
      const whyStart = k33Ev ? k33Ev.t : revealAt + 10;
      const analogyCap = findCap(whyStart, demoEv.t, '우리말도 똑같아요') || findCap(whyStart, demoEv.t, '먹어요');
      const analogyStart = analogyCap ? analogyCap.start : whyStart + 18;
      const demoStart = demoEv.t - 0.15;
      const nativeStart = normalAfter ? normalAfter.t - 0.1 : demoEv.end + 0.35;

      // Stage 1: 정답 공개 + 대답 팝인 (a07 @ 373.1s)
      addClip({
        start: revealAt, end: whyStart, track: 1,
        html: `${progHtml(2, 1)}
<div class="stage-card anim-in" style="border-top-color:${c.color}">
  <div class="q-words">${renderStyledQuestion('q07', c.color)}</div>
  <div class="q-ko">${esc(qData.ko)}</div>
  <div class="q-chip" style="border-color:${c.color};color:${c.color}">${esc(spec.chip)}</div>
  <div class="ans-box"><span class="ans-tag">대답</span><span class="ans-en">${esc(qData.a)}</span></div>
</div>`,
        anim: aEv && aEv.t > revealAt ? {type: 'revealAns', ansOff: +(aEv.t - revealAt).toFixed(2)} : 'card',
      });

      // Stage 2: 연음 원리 해부 도식
      addClip({
        start: whyStart, end: analogyStart, track: 1,
        html: compareCardHtml(
          2, 1, '2장 원리 · 끝소리가 뒤 모음에 붙음',
          '눈에 보이는 3단어', 'much + is + it', '받침 끝소리 + 뒤 모음 시작',
          '귀에 들리는 한 덩어리', '머 · 치 · 짓', '사이를 끊지 않고 넘겨 붙입니다', c.color
        ),
        anim: 'card',
      });

      // Stage 3: 우리말 비유 2단 비교 카드 ('먹어요' → '머거요')
      addClip({
        start: analogyStart, end: demoStart, track: 1,
        html: compareCardHtml(
          2, 1, '우리말 비유로 바로 이해하기',
          '글자 그대로 끊어 읽으면', "'먹, 어요'", '이렇게 끊어 읽는 사람은 없죠',
          '자연스럽게 넘겨 붙이면', '[머거요]', '영어도 단어 사이에서 똑같이 일어납니다', '#FFD21A'
        ),
        anim: 'card',
      });

      // Stage 4: 끊어 읽기 시연 (단어 간격 넓게 펼침)
      addClip({
        start: demoStart, end: nativeStart, track: 1,
        html: `${progHtml(2, 1)}
<div class="stage-card anim-in" style="border-top-color:#F59E0B">
  <div class="corner-badge" style="background:#F59E0B">끊어 읽기 시연 (천천히)</div>
  <div class="q-words">${renderSlowQuestion('q07', demoEv.id)}</div>
  <div class="q-ko">${esc(qData.ko)}</div>
</div>`,
        anim: 'card',
      });

      // Stage 5: 원어민 원래 속도 합체
      addClip({
        start: nativeStart, end, track: 1,
        html: `${progHtml(2, 1)}
<div class="stage-card anim-in" style="border-top-color:${c.color}">
  <div class="corner-badge" style="background:${c.color}">원어민 원래 속도</div>
  <div class="q-words">${renderStyledQuestion('q07', c.color)}</div>
  <div class="q-ko">${esc(qData.ko)}</div>
  <div class="q-chip" style="border-color:${c.color};color:${c.color}">${esc(spec.chip)}</div>
</div>`,
        anim: 'card',
      });
      continue;
    }

    // 2) q28 (dXX 없음, 35.6초 → 소리 해부 + 뜻 반전 비교 + 다시 듣기 & 대답 3단 분할)
    if (qId === 'q28') {
      const twistCap = findCap(revealAt, end, '소리보다 뜻에서');
      const relistenQ = evs.find((e) => e.kind === 'en' && e.id === 'q28' && e.t > revealAt);
      const twistStart = twistCap ? twistCap.start : revealAt + 10.5;
      const relistenStart = relistenQ ? relistenQ.t - 0.15 : end - 5.0;

      addClip({
        start: revealAt, end: twistStart, track: 1,
        html: `${progHtml(5, 4)}
<div class="stage-card anim-in" style="border-top-color:${c.color}">
  <div class="q-words">${renderStyledQuestion('q28', c.color)}</div>
  <div class="q-ko">${esc(qData.ko)}</div>
  <div class="q-chip" style="border-color:${c.color};color:${c.color}">${esc(spec.chip)}</div>
</div>`,
        anim: 'card',
      });

      addClip({
        start: twistStart, end: relistenStart, track: 1,
        html: compareCardHtml(
          5, 4, '소리 + 뜻 한 번에 잡기',
          '글자 그대로 직역하면', 'Need a hand?', '"손이 필요해?" → 순간 멈칫',
          '실제 생활 뜻', '도와줄까?', '일손이 필요할 때 건네는 친한 말', c.color
        ),
        anim: 'card',
      });

      addClip({
        start: relistenStart, end, track: 1,
        html: `${progHtml(5, 4)}
<div class="stage-card anim-in" style="border-top-color:${c.color}">
  <div class="corner-badge" style="background:${c.color}">다시 듣기 · 한 번에 또렷하게</div>
  <div class="q-words">${renderStyledQuestion('q28', c.color)}</div>
  <div class="q-ko">${esc(qData.ko)}</div>
  <div class="ans-box"><span class="ans-tag">대답</span><span class="ans-en">${esc(qData.a)}</span></div>
</div>`,
        anim: aEv && aEv.t > relistenStart ? {type: 'revealAns', ansOff: +(aEv.t - relistenStart).toFixed(2)} : 'card',
      });
      continue;
    }

    // 3) 끊어 읽기 시연(d02~d10)이 있는 깊게 다루는 문항 8곳 (q04·q08·q11·q13·q15·q19·q22·q25)
    // → [확인(+핵심 비교 분할)] → [끊어 읽기 시연(균등 펼침)] → [원어민 원래 속도 합체 + 대답]
    if (demoEv) {
      const demoStart = Math.max(revealAt + 0.5, demoEv.t - 0.15);
      const nativeStart = normalAfter ? normalAfter.t - 0.1 : Math.min(end - 0.5, demoEv.end + 0.4);

      // 중간 핵심 비교 카드가 있는 3문항(q04·q15·q19)은 앞구간도 2단으로 쪼갬!
      let midSplit = null;
      let midHtml = null;
      if (qId === 'q04') {
        const hit = findCap(revealAt, demoStart, '캔트는');
        if (hit && hit.start > revealAt + 2 && demoStart - hit.start > 2) {
          midSplit = hit.start;
          midHtml = compareCardHtml(
            1, 4, '긍정 can vs 부정 can\'t 소리 차이',
            '질문 안의 can (할 수 있다)', 'can I → [크나이]', '힘이 빠져 작고 짧게 지나감',
            "부정 can't (못 한다)", "can't → [캔트]", "'캔' 소리가 그대로 살아 있음", '#FFD21A'
          );
        }
      } else if (qId === 'q15') {
        const hit = findCap(revealAt, demoStart, '정리하면');
        if (hit && hit.start > revealAt + 2 && demoStart - hit.start > 2) {
          midSplit = hit.start;
          midHtml = compareCardHtml(
            3, 3, '3장 핵심 공식 한눈에 정리',
            '드(d) + 유(you)', '→ [쥬]', 'Did you [디쥬] · Would you [우쥬]',
            '트(t) + 유(you)', '→ [츄]', 'that your [대츄어] · get you [게츄]', c.color
          );
        }
      } else if (qId === 'q19') {
        const hit = findCap(revealAt, demoStart, '워터');
        if (hit && hit.start > revealAt + 2 && demoStart - hit.start > 2) {
          midSplit = hit.start;
          midHtml = compareCardHtml(
            4, 1, '익숙한 단어로 바로 연결하기',
            '이미 들어 보신 단어', 'water → [워러]', '모음 사이 t가 리을처럼 구름',
            '문장 안에서도 같은 소리', 'What are you → [워러유]', '단어와 단어 사이에서도 굴러감', c.color
          );
        }
      }

      if (midSplit && midHtml) {
        addClip({
          start: revealAt, end: midSplit, track: 1,
          html: `${progHtml(ch, spec.n)}
<div class="stage-card anim-in" style="border-top-color:${c.color}">
  <div class="q-words">${renderStyledQuestion(qId, c.color)}</div>
  <div class="q-ko">${esc(qData.ko)}</div>
  <div class="q-chip" style="border-color:${c.color};color:${ch === 1 ? '#FFD21A' : c.color}">${esc(spec.chip)}</div>
</div>`,
          anim: 'card',
        });
        addClip({start: midSplit, end: demoStart, track: 1, html: midHtml, anim: 'card'});
      } else {
        addClip({
          start: revealAt, end: demoStart, track: 1,
          html: `${progHtml(ch, spec.n)}
<div class="stage-card anim-in" style="border-top-color:${c.color}">
  <div class="q-words">${renderStyledQuestion(qId, c.color)}</div>
  <div class="q-ko">${esc(qData.ko)}</div>
  <div class="q-chip" style="border-color:${c.color};color:${ch === 1 ? '#FFD21A' : c.color}">${esc(spec.chip)}</div>
</div>`,
          anim: 'card',
        });
      }

      // 끊어 읽기 시연 카드 (단어를 균등 크기·간격으로 펼침)
      addClip({
        start: demoStart, end: nativeStart, track: 1,
        html: `${progHtml(ch, spec.n)}
<div class="stage-card anim-in" style="border-top-color:#F59E0B">
  <div class="corner-badge" style="background:#F59E0B">${qId === 'q25' ? '앞머리 붙여서 말하면' : '끊어 읽기 시연 (천천히)'}</div>
  <div class="q-words">${renderSlowQuestion(qId, demoEv.id)}</div>
  <div class="q-ko">${esc(qData.ko)}</div>
</div>`,
        anim: 'card',
      });

      // 원어민 원래 속도 합체 + 대답 등장 카드
      addClip({
        start: nativeStart, end, track: 1,
        html: `${progHtml(ch, spec.n)}
<div class="stage-card anim-in" style="border-top-color:${c.color}">
  <div class="corner-badge" style="background:#2EB872">원어민 원래 속도</div>
  <div class="q-words">${renderStyledQuestion(qId, c.color)}</div>
  <div class="q-ko">${esc(qData.ko)}</div>
  <div class="q-chip" style="border-color:${c.color};color:${ch === 1 ? '#FFD21A' : c.color}">${esc(spec.chip)}</div>
  <div class="ans-box"><span class="ans-tag">대답</span><span class="ans-en">${esc(qData.a)}</span></div>
</div>`,
        anim: aEv && aEv.t > nativeStart ? {type: 'revealAns', ansOff: +(aEv.t - nativeStart).toFixed(2)} : 'card',
      });
      continue;
    }

    // 4) 일반(빠르게/귀 시험) 문항 Phase B (10~18초 — 간결하게 유지)
    addClip({
      start: revealAt, end, track: 1,
      html: `${progHtml(ch, spec.n)}
<div class="stage-card anim-in" style="border-top-color:${c.color}">
  <div class="q-words">${renderStyledQuestion(qId, c.color)}</div>
  <div class="q-ko">${esc(qData.ko)}</div>
  <div class="q-chip" style="border-color:${c.color};color:${ch === 1 ? '#FFD21A' : c.color}">${esc(spec.chip)}</div>
  <div class="ans-box"><span class="ans-tag">대답</span><span class="ans-en">${esc(qData.a)}</span></div>
</div>`,
      anim: aEv && aEv.t > revealAt ? {type: 'revealAns', ansOff: +(aEv.t - revealAt).toFixed(2)} : 'card',
    });
    continue;
  }

  // 장 끝 넓히기 (x01~x07)
  if (m.level === 3 && T.includes('넓히기')) {
    const xEvs = evs.filter((e) => e.kind === 'en' && e.id.startsWith('x'));
    if (!xEvs.length) continue;
    const c = CH[curCh];
    for (let xi = 0; xi < xEvs.length; xi += 1) {
      const s = xi === 0 ? start : xEvs[xi].t - 0.15;
      const e = xi + 1 < xEvs.length ? xEvs[xi + 1].t - 0.15 : end;
      const info = EXTEND_ITEMS[xEvs[xi].id];
      addClip({
        start: s, end: e, track: 1,
        html: `${progHtml(curCh, '넓히기')}
<div class="stage-card anim-in" style="border-top-color:${c.color}">
  <div class="corner-badge" style="background:${c.color}">이미 알던 말에도 같은 소리</div>
  <div class="q-words"><span class="w-big" style="color:#F8FAFC">${esc(info.text)}</span></div>
  <div class="q-ko">${esc(info.ko)}</div>
  <div class="q-chip" style="border-color:${c.color};color:${c.color}">${esc(info.chip)}</div>
</div>`,
        anim: 'card',
      });
    }
    continue;
  }

  // 장 끝 이어 듣기 (질문 → 뽁 따라 말하기 → 대답)
  if (m.level === 3 && T.includes('이어 듣기')) {
    const qEvs = evs.filter((e) => e.kind === 'en' && e.id.startsWith('q'));
    const c = CH[curCh];
    if (qEvs.length && qEvs[0].t > start + 0.3) {
      addClip({
        start, end: qEvs[0].t, track: 1,
        html: `${progHtml(curCh, '이어 듣기')}
<div class="center-stack anim-in">
  <div class="corner-badge" style="background:${c.color}">${curCh}장 질문 여섯 개 이어 듣기</div>
  <div class="ear-caption">뽁 소리가 나면 입속으로라도 따라 말해 보세요</div>
</div>`,
        anim: 'card',
      });
    }
    for (let qi = 0; qi < qEvs.length; qi += 1) {
      const qEv = qEvs[qi];
      const s = qEv.t;
      const e = qi + 1 < qEvs.length ? qEvs[qi + 1].t : end;
      const qId = qEv.id;
      const aId = `a${qId.slice(1)}`;
      const qData = tl.qInfo[qId] || {};
      const aEv = evs.find((x) => x.kind === 'en' && x.id === aId && x.t >= s && x.t < e);
      const popEv = evs.find((x) => x.kind === 'sfx' && x.id === '뽁' && x.t >= s && x.t < e);
      addClip({
        start: s, end: e, track: 1,
        html: `${progHtml(curCh, qi + 1, '이어 듣기')}
<div class="stage-card anim-in" style="border-top-color:${c.color}">
  <div class="q-words">${renderStyledQuestion(qId, c.color)}</div>
  <div class="q-ko">${esc(qData.ko)}</div>
  <div class="repeat-pill">뽁 · 따라 말할 차례 (입속 OK)</div>
  <div class="ans-box"><span class="ans-tag">대답</span><span class="ans-en">${esc(qData.a)}</span></div>
</div>`,
        anim: {type: 'chain', popOff: popEv ? +(popEv.t - s).toFixed(2) : 1.0, ansOff: aEv ? +(aEv.t - s).toFixed(2) : 3.0},
      });
    }
    continue;
  }

  // 1부 정리 (38.9초 → 5개 장 나레이션에 맞춰 1줄씩 순차 스포트라이트 후 전체 캡처용 점등!)
  if (m.level === 2 && T === '1부 정리') {
    const keys = [
      [1, '작아지고', '길에서는'],
      [2, '붙고', '가게에서는'],
      [3, '섞이고', '처음 만난'],
      [4, '구르고', '여행지에서는'],
      [5, '빠진다', '친한 사이에서는'],
    ];
    const rowOffs = keys.map(([, , kw], idx) => {
      const hit = findCap(start, end, kw);
      return hit ? +(hit.start - start).toFixed(2) : +(11 + idx * 5.2).toFixed(2);
    });
    const rowsHtml = [1, 2, 3, 4, 5].map((n) =>
      `<div class="sum-row sum-r${n}" style="border-left-color:${CH[n].color}"><div class="sum-dot" style="background:${CH[n].color}">${n}장</div><span class="sum-name">${esc(CH[n].name)}</span><span class="sum-rule">${esc(CH[n].shortRule)}</span><span class="sum-kw" style="color:${CH[n].color}">${keys[n - 1][1]}</span></div>`
    ).join('');
    addClip({
      start, end, track: 1,
      html: `<div class="sum-wrap anim-in">
  <div class="sum-head"><div class="sum-title">다섯 장, 다섯 가지 소리</div><div class="sum-badge">캡처용 요약</div></div>
  <div class="sum-list">${rowsHtml}</div>
</div>`,
      anim: {type: 'summarySpotlight', offs: rowOffs, allOnOff: +(end - start - 2.2).toFixed(2)},
    });
    continue;
  }

  // 2부 안내
  if (m.level === 2 && T === '2부 몰아 듣기') {
    addClip({
      start, end, track: 1,
      html: `<div class="center-stack anim-in">
  <div class="corner-badge" style="background:#FFD21A">PART 2 · 몰아 듣기</div>
  <div class="p2-intro-title">질문 서른 개와 대답, 두 번 이어 듣기</div>
  <div class="ear-caption">1회차 우리말 뜻과 함께 · 2회차 귀로 먼저 확인 → 영어 확인</div>
</div>`,
      anim: 'card',
    });
    continue;
  }

  // 2부 1회차 (뜻 + 소리 힌트 칩) & 2부 2회차 ([개선 D] 지연 자막: 귀로 먼저 확인 → 영어 질문·대답 공개!)
  if (m.level === 3 && (T.startsWith('2부 1회차') || T.startsWith('2부 2회차'))) {
    const isRound1 = T.startsWith('2부 1회차');
    const qEvs = evs.filter((e) => e.kind === 'en' && e.id.startsWith('q'));
    for (let qi = 0; qi < qEvs.length; qi += 1) {
      const qEv = qEvs[qi];
      const s = qEv.t;
      const e = qi + 1 < qEvs.length ? qEvs[qi + 1].t : end;
      const num = qi + 1;
      const qId = qEv.id;
      const aId = `a${qId.slice(1)}`;
      const qData = tl.qInfo[qId] || {};
      const ch = Q_SPEC[qId].ch;
      const c = CH[ch];
      const mEv = isRound1 ? evs.find((x) => x.kind === 'ko' && x.t >= s && x.t < e) : null;
      const aEv = evs.find((x) => x.kind === 'en' && x.id === aId && x.t >= s && x.t < e);
      const pct = ((num / 30) * 100).toFixed(1);
      const qRevealOff = +Math.min((aEv ? aEv.t - s - 0.15 : 1.5), (qEv.end - s) + 0.28).toFixed(2);

      if (isRound1) {
        addClip({
          start: s, end: e, track: 1,
          html: `<div class="prog-pill"><span class="prog-part">2부 1회차</span><span class="prog-ch" style="background:${c.color}">${ch}장 ${esc(c.name)}</span><span class="prog-num">${num} / 30</span></div>
<div class="lounge-stage anim-in" style="border-top-color:${c.color}">
  <div class="lounge-q">${esc(qData.q)}</div>
  <div class="lounge-ko">${esc(qData.ko)}</div>
  <div class="lounge-chip" style="border-color:${c.color};color:${ch === 1 ? '#FFD21A' : c.color}">${esc(Q_SPEC[qId].chip)}</div>
  <div class="lounge-a" style="color:${c.color}">${esc(qData.a)}</div>
</div>
<div class="lounge-bar-wrap"><div class="lounge-bar-fill" style="width:${pct}%;background:linear-gradient(90deg,#FFD21A,${c.color})"></div></div>`,
          anim: {
            type: 'part2',
            koOff: mEv ? +(mEv.t - s).toFixed(2) : null,
            ansOff: aEv ? +(aEv.t - s).toFixed(2) : 1.2,
          },
        });
      } else {
        // [개선 D] 2부 2회차 지연 자막: 질문 재생 중엔 '귀로 먼저 확인' → 질문 끝 직후 영어 질문 공개 → 대답 시 대답 공개
        addClip({
          start: s, end: e, track: 1,
          html: `<div class="prog-pill"><span class="prog-part">2부 2회차 · 귀로 확인</span><span class="prog-ch" style="background:${c.color}">${ch}장 ${esc(c.name)}</span><span class="prog-num">${num} / 30</span></div>
<div class="lounge-stage anim-in" style="border-top-color:${c.color}">
  <div class="r2-listen" style="border-color:${c.color};color:${c.color}">귀로 먼저 들어 보세요 · 잠시 뒤 영어 공개</div>
  <div class="lounge-q r2-q">${esc(qData.q)}</div>
  <div class="lounge-a r2-a" style="color:${c.color}">${esc(qData.a)}</div>
</div>
<div class="lounge-bar-wrap"><div class="lounge-bar-fill" style="width:${pct}%;background:linear-gradient(90deg,#FFD21A,${c.color})"></div></div>`,
          anim: {
            type: 'part2Delayed',
            qOff: Math.max(0.4, qRevealOff),
            ansOff: aEv ? +(aEv.t - s).toFixed(2) : Math.max(1.2, qRevealOff + 0.8),
          },
        });
      }
    }
    continue;
  }

  // 끝 (25.4초 → 고정 댓글 안내 9초 + 5장 댓글 질문 16초 2단 분할)
  if (m.level === 2 && T === '끝') {
    const askCap = findCap(start, tl.endScreenStart, '하나만 여쭤볼게요');
    const splitEnd = askCap ? askCap.start : start + 9.0;
    addClip({
      start, end: splitEnd, track: 1,
      html: `<div class="center-stack anim-in">
  <div class="corner-badge" style="background:#FFD21A">고정 댓글 전체 정리</div>
  <div class="p2-intro-title">질문 30개 · 대답 · 영어 · 뜻 · 소리</div>
  <div class="ear-caption">고정 댓글에 한 번에 모아 두었습니다</div>
</div>`,
      anim: 'card',
    });
    addClip({
      start: splitEnd, end: tl.endScreenStart, track: 1,
      html: `<div class="center-stack anim-in">
  <div class="corner-badge" style="background:#FFD21A">다음 편 제작에 반영합니다</div>
  <div class="p2-intro-title">어느 장이 제일 안 들리셨나요?</div>
  <div class="end-chips">${[1, 2, 3, 4, 5].map((n) => `<span class="end-chip" style="border-color:${CH[n].color};color:${CH[n].color}">${n}장 ${esc(CH[n].name)}</span>`).join('')}</div>
  <div class="ear-caption">댓글에 장 이름 하나만 남겨 주세요</div>
</div>`,
      anim: 'card',
    });
    continue;
  }
}

// 트랙 2: 1부·여닫기 실시간 한국어 해설 자막 (Whisper 정밀 정렬 적용, <span> 단일 자식으로 경량 유지)
for (const cap of koCaps) {
  addClip({
    start: cap.start,
    end: cap.end,
    track: 2,
    cls: 'sub-clip',
    html: `<span class="sub-box">${esc(cap.text)}</span>`,
  });
}

const clipsHtml = clips.map((cl) =>
  `<div class="clip${cl.cls ? ' ' + cl.cls : ''}" id="${cl.id}" data-start="${cl.start}" data-duration="${cl.dur}" data-track-index="${cl.track}">${cl.html}</div>`
).join('\n');

const animList = clips.filter((c) => c.anim).map((c) => ({id: c.id, start: c.start, dur: c.dur, anim: c.anim}));

const html = `<!doctype html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=1920, height=1080">
<title>EP37 - 외국인이 영어로 말 걸면 머리가 하얘지는 이유 (틀어 두고 듣는 질문 30개)</title>
<script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
<style>
@font-face { font-family: 'Noto Sans KR'; src: url('assets/fonts/NotoSansKR-VF.ttf') format('truetype'); font-weight: 100 900; font-display: block; }
@font-face { font-family: 'BlackHan'; src: url('assets/fonts/BlackHanSans-Regular.ttf') format('truetype'); font-weight: 400; font-display: block; }
@font-face { font-family: 'GothicA1'; src: url('assets/fonts/GothicA1-Black.ttf') format('truetype'); font-weight: 900; font-display: block; }
@font-face { font-family: 'DoHyeon'; src: url('assets/fonts/DoHyeon-Regular.ttf') format('truetype'); font-weight: 400; font-display: block; }
@font-face { font-family: 'IBMBold'; src: url('assets/fonts/IBMPlexSansKR-Bold.ttf') format('truetype'); font-weight: 700; font-display: block; }
@font-face { font-family: 'ArchivoBlack'; src: url('assets/fonts/ArchivoBlack-Regular.ttf') format('truetype'); font-weight: 400; font-display: block; }
@font-face { font-family: 'Outfit'; src: url('assets/fonts/Outfit-VF.ttf') format('truetype'); font-weight: 100 900; font-display: block; }

* { box-sizing: border-box; margin: 0; padding: 0; }
html, body {
  width: 100%; height: 100%; overflow: hidden;
  background: #0A101E; color: #F4F1EA;
  font-family: 'Noto Sans KR', sans-serif;
  word-break: keep-all;
  -webkit-font-smoothing: antialiased;
}
#root { position: relative; width: 100%; height: 100%; overflow: hidden; background: #0A101E; }
.clip { position: absolute; inset: 0; overflow: hidden; }

.brand-mark {
  position: absolute; left: 64px; top: 44px; z-index: 40;
  font-family: 'DoHyeon', sans-serif; font-size: 34px; letter-spacing: -0.5px;
  color: #F4F1EA; opacity: 0.92; display: flex; align-items: center; gap: 10px;
}
.brand-dot { width: 10px; height: 10px; border-radius: 50%; background: #FFD21A; display: inline-block; }
.brand-hl { color: #FFD21A; }

.prog-pill {
  position: absolute; right: 64px; top: 38px; z-index: 30;
  display: flex; gap: 14px; align-items: center;
  background: rgba(9, 14, 26, 0.78); border: 1.5px solid rgba(255, 255, 255, 0.16);
  border-radius: 999px; padding: 8px 22px 8px 18px;
  font-family: 'IBMBold', sans-serif; font-size: 34px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35); white-space: nowrap;
}
.prog-part { color: #CBD5E1; }
.prog-ch { color: #080D18; font-family: 'DoHyeon', sans-serif; border-radius: 999px; padding: 3px 18px; font-size: 34px; }
.prog-num { font-family: 'Outfit', sans-serif; font-weight: 700; color: #F8FAFC; }

.bg-img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
.ch-scrim { position: absolute; inset: 0; background: linear-gradient(90deg, rgba(7, 11, 20, 0.88) 0%, rgba(7, 11, 20, 0.52) 56%, rgba(7, 11, 20, 0.14) 100%); }
.bg-grad-signals { position: absolute; inset: 0; background: linear-gradient(145deg, #0B1120 0%, #12203A 52%, #0E172A 100%); }
.bg-grad-sum { position: absolute; inset: 0; background: linear-gradient(145deg, #0A101E 0%, #14213B 50%, #101A2E 100%); }
.bg-lounge { position: absolute; inset: 0; background: linear-gradient(180deg, #09131F 0%, #0E2229 52%, #0D1729 100%); }
.bg-lounge-deep { background: linear-gradient(180deg, #070C18 0%, #0E1832 52%, #0C1426 100%); }
.bg-end { position: absolute; inset: 0; background: linear-gradient(160deg, #09101E 0%, #101E36 55%, #0A101E 100%); }

.center-stack {
  position: absolute; inset: 0; z-index: 10;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 36px; padding: 110px 100px 185px 100px;
}
.ear-badge {
  display: inline-flex; align-items: center; gap: 14px;
  background: rgba(10, 16, 28, 0.86); border: 2px solid rgba(255, 210, 26, 0.65);
  border-radius: 999px; padding: 12px 32px;
  font-family: 'DoHyeon', sans-serif; font-size: 38px; color: #FFD21A;
}
.rec-dot { width: 14px; height: 14px; border-radius: 50%; background: #EF4444; box-shadow: 0 0 0 6px rgba(239, 68, 68, 0.28); display: inline-block; }
.wave-wrap { display: flex; align-items: center; justify-content: center; filter: drop-shadow(0 0 18px rgba(255, 210, 26, 0.28)); }
.ear-caption { font-family: 'IBMBold', sans-serif; font-size: 50px; color: #F8FAFC; text-align: center; letter-spacing: -1px; text-shadow: 0 4px 18px rgba(0, 0, 0, 0.65); }

/* 신호음 3종 */
.sig-wrap { position: absolute; inset: 0; z-index: 10; padding: 98px 170px 180px 170px; display: flex; flex-direction: column; gap: 16px; }
.sig-title { font-family: 'BlackHan', sans-serif; font-size: 74px; color: #F8FAFC; letter-spacing: -2px; }
.sig-sub { font-family: 'IBMBold', sans-serif; font-size: 36px; color: #CBD5E1; margin-bottom: 10px; }
.sig-cards { display: flex; flex-direction: column; gap: 20px; }
.sig-card {
  height: 152px; display: flex; align-items: center; gap: 38px; padding: 0 38px;
  background: rgba(15, 23, 42, 0.82); border: 1.5px solid rgba(255, 255, 255, 0.14);
  border-left-width: 8px; border-radius: 24px; box-shadow: 0 14px 36px rgba(0, 0, 0, 0.35);
}
.sig-ic { width: 102px; height: 102px; border-radius: 22px; display: flex; align-items: center; justify-content: center; font-family: 'BlackHan', sans-serif; font-size: 50px; color: #0A0F1C; flex: none; }
.sig-txt { display: flex; flex-direction: column; gap: 6px; }
.sig-main { font-family: 'GothicA1', sans-serif; font-size: 48px; font-weight: 900; color: #F8FAFC; letter-spacing: -1.5px; }
.sig-hint { font-family: 'IBMBold', sans-serif; font-size: 34px; color: #CBD5E1; }

/* 장 표지 */
.ch-ghost { position: absolute; right: 86px; bottom: 130px; z-index: 5; font-family: 'ArchivoBlack', sans-serif; font-size: 360px; line-height: 1; opacity: 0.16; }
.ch-content { position: absolute; left: 130px; top: 195px; right: 180px; z-index: 10; display: flex; flex-direction: column; align-items: flex-start; gap: 24px; }
.ch-chip { color: #080D18; font-family: 'DoHyeon', sans-serif; font-size: 46px; padding: 8px 28px; border-radius: 14px; }
.ch-name { font-family: 'BlackHan', sans-serif; font-size: 156px; color: #F8FAFC; letter-spacing: -5px; line-height: 1.04; text-shadow: 0 12px 30px rgba(0, 0, 0, 0.55); }
.ch-bar { width: 180px; height: 10px; border-radius: 5px; }
.ch-rule { font-family: 'IBMBold', sans-serif; font-size: 54px; color: #E2E8F0; letter-spacing: -1.5px; }

/* 사운드 스테이지 문항 카드 */
.stage-card {
  position: absolute; left: 110px; right: 110px; top: 134px; bottom: 184px; z-index: 10;
  background: rgba(9, 14, 26, 0.84); border: 1.5px solid rgba(255, 255, 255, 0.15);
  border-top-width: 7px; border-radius: 30px; box-shadow: 0 24px 60px rgba(0, 0, 0, 0.55);
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 26px; padding: 42px 58px; text-align: center;
}
.corner-badge { background: #FFD21A; color: #080D18; font-family: 'DoHyeon', sans-serif; font-size: 40px; padding: 8px 28px; border-radius: 999px; white-space: nowrap; }
.q-words { display: flex; flex-wrap: wrap; justify-content: center; align-items: baseline; gap: 16px 22px; max-width: 1560px; }
.w-sm { font-family: 'Outfit', sans-serif; font-size: 54px; font-weight: 600; color: #CBD5E1; line-height: 1.1; }
.w-big, .w-hl { font-family: 'ArchivoBlack', sans-serif; font-size: 104px; letter-spacing: -2.5px; line-height: 1.06; color: #F8FAFC; }
.w-sm.w-long { font-size: 44px; }
.w-big.w-long, .w-hl.w-long { font-size: 82px; }
.w-slow { font-family: 'Outfit', sans-serif; font-size: 76px; font-weight: 800; color: #FDE68A; letter-spacing: 0.5px; line-height: 1.1; }
.w-slow.w-long { font-size: 62px; }
.w-sep { font-family: 'Outfit', sans-serif; font-size: 56px; font-weight: 700; color: #F59E0B; opacity: 0.75; padding: 0 4px; }
.w-dropped { font-family: 'Outfit', sans-serif; font-size: 50px; font-weight: 600; color: #94A3B8; text-decoration: line-through; text-decoration-color: #EF4444; text-decoration-thickness: 5px; opacity: 0.78; }
.w-gone { font-family: 'Outfit', sans-serif; font-size: 54px; font-weight: 600; color: #94A3B8; text-decoration: line-through; text-decoration-color: #EF4444; text-decoration-thickness: 6px; }
.q-ko { font-family: 'GothicA1', sans-serif; font-size: 62px; font-weight: 900; color: #F8FAFC; letter-spacing: -2px; }
.q-chip {
  font-family: 'IBMBold', sans-serif; font-size: 40px;
  background: rgba(255, 255, 255, 0.06); border: 1.5px solid rgba(255, 210, 26, 0.45);
  padding: 9px 28px; border-radius: 999px;
}
.repeat-pill {
  font-family: 'DoHyeon', sans-serif; font-size: 36px; color: #080D18;
  background: #F8FAFC; padding: 8px 26px; border-radius: 999px;
}
.ans-box {
  display: inline-flex; align-items: center; gap: 18px; margin-top: 4px;
  background: rgba(46, 184, 114, 0.14); border: 1.5px solid rgba(46, 184, 114, 0.55);
  border-radius: 20px; padding: 12px 28px;
}
.ans-tag { font-family: 'DoHyeon', sans-serif; font-size: 34px; background: #2EB872; color: #080D18; padding: 4px 14px; border-radius: 10px; }
.ans-en { font-family: 'Outfit', sans-serif; font-size: 50px; font-weight: 800; color: #E2F8EC; letter-spacing: -0.5px; }

/* A: 상황 안내 카드 */
.setup-card { gap: 34px; }
.setup-tag {
  font-family: 'DoHyeon', sans-serif; font-size: 42px; padding: 10px 32px;
  border-radius: 999px; border: 2px solid #4C8DF6; background: rgba(15, 23, 42, 0.85);
}
.setup-focus { font-family: 'GothicA1', sans-serif; font-size: 64px; font-weight: 900; color: #F8FAFC; letter-spacing: -2px; line-height: 1.25; max-width: 1420px; }
.setup-ready { font-family: 'IBMBold', sans-serif; font-size: 36px; color: #94A3B8; }

/* B: 귀 시험 생각 카운트다운 */
.think-title { font-family: 'BlackHan', sans-serif; font-size: 86px; color: #F8FAFC; letter-spacing: -2px; }
.think-bar-wrap { width: 920px; height: 26px; border-radius: 999px; background: rgba(255, 255, 255, 0.14); overflow: hidden; border: 1.5px solid rgba(255, 255, 255, 0.18); }
.think-bar-fill { width: 100%; height: 100%; border-radius: 999px; transform-origin: left center; }

/* 2단 비교 원리 카드 (긴 설명 분할용) */
.cmp-grid { display: flex; align-items: center; justify-content: center; gap: 32px; width: 100%; max-width: 1540px; }
.cmp-box {
  flex: 1; min-height: 360px; padding: 34px 36px; border-radius: 26px;
  background: rgba(15, 23, 42, 0.82); border: 2px solid rgba(255, 255, 255, 0.16);
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 18px;
}
.cmp-left { opacity: 0.88; }
.cmp-label { font-family: 'DoHyeon', sans-serif; font-size: 36px; color: #CBD5E1; }
.cmp-main { font-family: 'ArchivoBlack', 'BlackHan', sans-serif; font-size: 62px; color: #F8FAFC; letter-spacing: -1.5px; line-height: 1.15; }
.cmp-sub { font-family: 'IBMBold', sans-serif; font-size: 34px; color: #CBD5E1; line-height: 1.3; }
.cmp-arrow { font-family: 'ArchivoBlack', sans-serif; font-size: 68px; flex: none; }

/* 1부 정리 5단 캡처 카드 */
.sum-wrap { position: absolute; inset: 0; z-index: 10; padding: 92px 150px 176px 150px; display: flex; flex-direction: column; gap: 20px; }
.sum-head { display: flex; align-items: center; justify-content: space-between; }
.sum-title { font-family: 'BlackHan', sans-serif; font-size: 68px; color: #F8FAFC; letter-spacing: -2px; }
.sum-badge { font-family: 'DoHyeon', sans-serif; font-size: 36px; color: #FFD21A; background: rgba(255, 210, 26, 0.12); border: 1.5px solid rgba(255, 210, 26, 0.45); padding: 6px 22px; border-radius: 999px; }
.sum-list { display: flex; flex-direction: column; gap: 16px; }
.sum-row {
  height: 112px; display: flex; align-items: center; gap: 28px; padding: 0 30px;
  background: rgba(15, 23, 42, 0.82); border: 1.5px solid rgba(255, 255, 255, 0.14);
  border-left-width: 8px; border-radius: 18px;
}
.sum-dot { width: 110px; border-radius: 12px; padding: 6px 0; text-align: center; font-family: 'DoHyeon', sans-serif; font-size: 40px; color: #080D18; flex: none; }
.sum-name { font-family: 'GothicA1', sans-serif; font-size: 42px; font-weight: 900; color: #F8FAFC; min-width: 290px; }
.sum-rule { font-family: 'IBMBold', sans-serif; font-size: 40px; color: #CBD5E1; flex: 1; }
.sum-kw { font-family: 'DoHyeon', sans-serif; font-size: 38px; white-space: nowrap; }

/* 2부 오디오 라운지 */
.p2-intro-title { font-family: 'BlackHan', sans-serif; font-size: 82px; color: #F8FAFC; letter-spacing: -2px; text-align: center; }
.lounge-stage {
  position: absolute; left: 130px; right: 130px; top: 164px; bottom: 130px; z-index: 10;
  background: rgba(15, 23, 42, 0.72); border: 1.5px solid rgba(255, 255, 255, 0.14);
  border-top-width: 6px; border-radius: 32px; box-shadow: 0 24px 60px rgba(0, 0, 0, 0.48);
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 28px; padding: 44px 70px; text-align: center;
}
.lounge-q { font-family: 'ArchivoBlack', sans-serif; font-size: 88px; color: #F8FAFC; letter-spacing: -2px; line-height: 1.1; }
.lounge-ko { font-family: 'IBMBold', sans-serif; font-size: 58px; color: #E2E8F0; letter-spacing: -1.5px; }
.lounge-chip {
  font-family: 'IBMBold', sans-serif; font-size: 38px;
  background: rgba(255, 255, 255, 0.06); border: 1.5px solid rgba(255, 210, 26, 0.45);
  padding: 8px 28px; border-radius: 999px;
}
.lounge-a { font-family: 'Outfit', sans-serif; font-size: 72px; font-weight: 800; letter-spacing: -1px; }
.r2-listen {
  font-family: 'DoHyeon', sans-serif; font-size: 40px; padding: 12px 34px;
  border-radius: 999px; border: 2px solid #4C8DF6; background: rgba(10, 16, 28, 0.85);
}
.lounge-bar-wrap { position: absolute; left: 130px; right: 130px; bottom: 64px; height: 14px; border-radius: 7px; background: rgba(255, 255, 255, 0.14); overflow: hidden; z-index: 15; }
.lounge-bar-fill { height: 100%; border-radius: 7px; }

.end-chips { display: flex; flex-wrap: wrap; justify-content: center; gap: 18px; }
.end-chip { font-family: 'DoHyeon', sans-serif; font-size: 40px; padding: 10px 28px; border-radius: 999px; border: 2px solid #FFD21A; background: rgba(15, 23, 42, 0.78); }

/* 트랙 2: 하단 실시간 한국어 해설 자막 바 */
.sub-clip {
  position: absolute; inset: 0; pointer-events: none; z-index: 35;
  display: flex; align-items: flex-end; justify-content: center;
  padding: 0 96px 34px 96px;
}
.sub-box {
  display: inline-block; max-width: 1680px; text-align: center;
  background: rgba(7, 11, 20, 0.92); border: 1.5px solid rgba(255, 255, 255, 0.18);
  border-radius: 20px; padding: 16px 36px;
  font-family: 'IBMBold', sans-serif; font-size: 46px; line-height: 1.32;
  color: #F8FAFC; letter-spacing: -1px;
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.55);
}
</style>
</head>
<body>
<div id="root" data-composition-id="ep37-listen-frozen-questions" data-width="1920" data-height="1080" data-fps="30" data-duration="${totalDur}">
  <div class="brand-mark"><span class="brand-dot"></span><span>이해하면 <span class="brand-hl">쉬운영어</span></span></div>
  <audio id="master-audio" src="${tl.masterAudio}" data-start="0" data-duration="${totalDur}"></audio>
${clipsHtml}
</div>
<script>
(function () {
  var tl = gsap.timeline({ paused: true });
  var anims = ${JSON.stringify(animList)};
  for (var i = 0; i < anims.length; i += 1) {
    var a = anims[i];
    var host = document.getElementById(a.id);
    if (!host) continue;
    var inner = host.querySelector('.anim-in');
    if (inner) {
      tl.fromTo(inner, { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.3, ease: 'power2.out' }, a.start);
    }
    if (a.anim === 'kenburns') {
      var bg = host.querySelector('.bg-kb');
      if (bg) tl.fromTo(bg, { scale: 1.02 }, { scale: 1.09, duration: Math.max(1, a.dur), ease: 'none' }, a.start);
    } else if (a.anim === 'wave') {
      var ww = host.querySelector('.wave-wrap');
      if (ww) {
        var pulses = Math.max(1, Math.min(24, Math.floor(a.dur / 1.4)));
        tl.fromTo(ww, { scaleY: 0.92 }, { scaleY: 1.06, duration: 0.7, yoyo: true, repeat: pulses, ease: 'sine.inOut' }, a.start);
      }
    } else if (a.anim && a.anim.type === 'countdown') {
      var bf = host.querySelector('.think-bar-fill');
      if (bf) tl.fromTo(bf, { scaleX: 0 }, { scaleX: 1, duration: Math.max(0.5, a.anim.dur), ease: 'none' }, a.start);
    } else if (a.anim && a.anim.type === 'signalsSpotlight') {
      var sc1 = host.querySelector('.sig-c1');
      var sc2 = host.querySelector('.sig-c2');
      var sc3 = host.querySelector('.sig-c3');
      if (sc1 && sc2 && sc3) {
        tl.to([sc2, sc3], { opacity: 0.38, scale: 0.985, duration: 0.35 }, a.start + a.anim.dingOff);
        tl.to(sc1, { opacity: 1, scale: 1.02, duration: 0.35 }, a.start + a.anim.dingOff);
        tl.to([sc1, sc3], { opacity: 0.38, scale: 0.985, duration: 0.35 }, a.start + a.anim.popOff);
        tl.to(sc2, { opacity: 1, scale: 1.02, duration: 0.35 }, a.start + a.anim.popOff);
        tl.to([sc1, sc2], { opacity: 0.38, scale: 0.985, duration: 0.35 }, a.start + a.anim.gongOff);
        tl.to(sc3, { opacity: 1, scale: 1.02, duration: 0.35 }, a.start + a.anim.gongOff);
      }
    } else if (a.anim && a.anim.type === 'summarySpotlight') {
      var rows = [1, 2, 3, 4, 5].map(function (n) { return host.querySelector('.sum-r' + n); });
      var offs = a.anim.offs || [];
      for (var r = 0; r < rows.length; r += 1) {
        if (!rows[r] || offs[r] == null) continue;
        var others = rows.filter(function (_, idx) { return idx !== r; }).filter(Boolean);
        tl.to(others, { opacity: 0.38, scale: 0.985, duration: 0.35 }, a.start + offs[r]);
        tl.to(rows[r], { opacity: 1, scale: 1.02, duration: 0.35 }, a.start + offs[r]);
      }
      if (a.anim.allOnOff > 0) {
        tl.to(rows.filter(Boolean), { opacity: 1, scale: 1, duration: 0.4 }, a.start + a.anim.allOnOff);
      }
    } else if (a.anim && a.anim.type === 'revealAns') {
      var ans = host.querySelector('.ans-box');
      if (ans) tl.fromTo(ans, { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.3, ease: 'power2.out' }, a.start + a.anim.ansOff);
    } else if (a.anim && a.anim.type === 'chain') {
      var rp = host.querySelector('.repeat-pill');
      var an = host.querySelector('.ans-box');
      if (rp) tl.fromTo(rp, { opacity: 0.25, scale: 0.96 }, { opacity: 1, scale: 1.04, duration: 0.25, ease: 'power2.out' }, a.start + a.anim.popOff);
      if (an) tl.fromTo(an, { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.25, ease: 'power2.out' }, a.start + a.anim.ansOff);
    } else if (a.anim && a.anim.type === 'part2') {
      var ko = host.querySelector('.lounge-ko');
      var lc = host.querySelector('.lounge-chip');
      var la = host.querySelector('.lounge-a');
      if (ko && a.anim.koOff !== null) tl.fromTo(ko, { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.25, ease: 'power2.out' }, a.start + a.anim.koOff);
      if (lc && a.anim.koOff !== null) tl.fromTo(lc, { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.25, ease: 'power2.out' }, a.start + a.anim.koOff);
      if (la) tl.fromTo(la, { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.25, ease: 'power2.out' }, a.start + a.anim.ansOff);
    } else if (a.anim && a.anim.type === 'part2Delayed') {
      var rl = host.querySelector('.r2-listen');
      var rq = host.querySelector('.r2-q');
      var ra = host.querySelector('.r2-a');
      if (rq) tl.set(rq, { opacity: 0, y: 12 }, a.start);
      if (ra) tl.set(ra, { opacity: 0, y: 12 }, a.start);
      if (rl) tl.to(rl, { opacity: 0.22, duration: 0.2 }, a.start + a.anim.qOff);
      if (rq) tl.to(rq, { opacity: 1, y: 0, duration: 0.25, ease: 'power2.out' }, a.start + a.anim.qOff);
      if (ra) tl.to(ra, { opacity: 1, y: 0, duration: 0.25, ease: 'power2.out' }, a.start + a.anim.ansOff);
    }
  }
  window.__timelines['ep37-listen-frozen-questions'] = tl;
})();
</script>
</body>
</html>
`;

const outPath = join(EP_DIR, 'index.html');
writeFileSync(outPath, html, 'utf8');
console.log(`HyperFrames 컴포지션(v3) 생성 완료: ${outPath} (클립 ${clips.length}개, 길이 ${totalDur}초 / ${Math.floor(totalDur / 60)}분 ${Math.round(totalDur % 60)}초)`);
