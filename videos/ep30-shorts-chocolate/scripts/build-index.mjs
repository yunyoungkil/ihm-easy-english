// EP30 쇼츠(chocolate) index.html 생성기. 이 프로젝트 전용.
// 입력: 비교 시트 SbQVBQoRciA.json의 rows[4].ours.cutPlan.cuts(화면 글자의 단일 원본),
//       assets/voice/nNN.wav + nNN.words.json(확정 음성, 실측 단어 타이밍).
// 선택 입력: assets/bgm/track.mp3, assets/voice-en/<단어>-natural.wav (있을 때만 넣는다).
// 출력: index.html, subtitles/subtitles-ko.srt
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SHEET = join(ROOT, '..', '..', 'data', 'youtube', 'transform-sheets', 'SbQVBQoRciA.json');
const sheet = JSON.parse(readFileSync(SHEET, 'utf8'));
const cuts = sheet.rows[4].ours.cutPlan.cuts;
if (cuts.length !== 14) throw new Error(`컷이 14개여야 한다: ${cuts.length}`);

// ---------- 타이밍 상수 ----------
const FIRST_VOICE = 0.3; // 첫 음성 시작
const GAP = 0.35; // 줄 사이
const LEAD = 0.1; // 화면이 음성보다 먼저 보이는 시간
const XF = 0.25; // 크로스페이드
const EN_AFTER = 0.15; // 원어민 단어 음성: 나레이션 끝 뒤
const EN_PAD = 0.1; // 원어민 음성 뒤 여유
const TAIL = 0.9; // 마지막 음성 뒤 여유
const EN_TEMPLATES = new Set(['contrast', 'vowel-drop', 'word-drop']);

const r3 = (x) => Math.round(x * 1000) / 1000;
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const wavDur = (p) =>
  r3(parseFloat(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', p]).toString().trim()));

// ---------- 음성·단어 타이밍 읽기 ----------
const nn = (i) => 'n' + String(i + 1).padStart(2, '0');
const voice = cuts.map((c, i) => {
  const wav = join(ROOT, 'assets', 'voice', nn(i) + '.wav');
  const words = JSON.parse(readFileSync(join(ROOT, 'assets', 'voice', nn(i) + '.words.json'), 'utf8'));
  const enPath = EN_TEMPLATES.has(c.template) ? join(ROOT, 'assets', 'voice-en', `${c.word}-natural.wav`) : null;
  const en = enPath && existsSync(enPath) ? { file: `assets/voice-en/${c.word}-natural.wav`, dur: wavDur(enPath) } : null;
  return { dur: wavDur(wav), words, en };
});

// 컷 i의 음성 시작 V[i], 화면 시작 S[i], 화면 끝 E[i]
const V = [];
const S = [];
const E = [];
let cursor = FIRST_VOICE;
cuts.forEach((c, i) => {
  V[i] = r3(cursor);
  S[i] = i === 0 ? 0 : r3(V[i] - LEAD);
  const extra = voice[i].en ? EN_AFTER + voice[i].en.dur + EN_PAD : 0;
  voice[i].enStart = voice[i].en ? r3(V[i] + voice[i].dur + EN_AFTER) : null;
  cursor = cursor + voice[i].dur + extra + GAP;
});
const lastEnd = V[13] + voice[13].dur;
const TOTAL = r3(lastEnd + TAIL);
cuts.forEach((c, i) => {
  E[i] = i < 13 ? r3(S[i + 1] + XF) : TOTAL;
});

// words.json에서 부분 문자열이 든 첫 단어의 시작(컷 안 상대 시각)
function cue(i, sub) {
  const w = voice[i].words.find((x) => x.word.includes(sub));
  if (!w) throw new Error(`컷 ${i}(${nn(i)})의 words.json에 '${sub}'가 없다`);
  return w.from;
}
const T = (i, rel) => r3(V[i] + rel); // 컷 i 안의 상대 시각 -> 절대 시각

// ---------- 화면 조각 ----------
const fsFor = (len, maxW, cap) => Math.min(cap, Math.floor(maxW / (len * 0.66)));

function splitPill(text) {
  if (text.length <= 12) return [text];
  const mid = text.length / 2;
  let best = -1;
  [...text].forEach((ch, k) => {
    if (ch === ' ' && (best < 0 || Math.abs(k - mid) < Math.abs(best - mid))) best = k;
  });
  return best < 0 ? [text] : [text.slice(0, best), text.slice(best + 1)];
}
const pillHtml = (id, text) =>
  `<div class="pill" id="${id}">${splitPill(text).map((l) => `<span>${esc(l)}</span>`).join('')}</div>`;

// 영어 단어. drop=[시작,끝) 글자 위치. 모든 글자는 .ch (한 글자씩 올라오게)
function wordHtml(id, word, fs, drop) {
  const chars = [...word];
  let h = `<div class="word" id="${id}" style="font-size:${fs}px">`;
  chars.forEach((ch, k) => {
    if (drop && k === drop[0]) {
      h += `<span class="ch dr" id="${id}-dr">${esc(chars.slice(drop[0], drop[1]).join(''))}<i class="slash" id="${id}-sl"></i></span>`;
    }
    if (drop && k >= drop[0] && k < drop[1]) return;
    h += `<span class="ch">${esc(ch)}</span>`;
  });
  return h + '</div>';
}

const arrowDown = (id) =>
  `<svg class="ar" id="${id}" width="90" height="120" viewBox="0 0 90 120"><path pathLength="1" d="M45 6 V104"/><path pathLength="1" d="M16 76 L45 108 L74 76"/></svg>`;
const arrowRight = (id) =>
  `<svg class="ar" id="${id}" width="84" height="56" viewBox="0 0 84 56"><path pathLength="1" d="M6 28 H76"/><path pathLength="1" d="M50 6 L78 28 L50 50"/></svg>`;
const crossX = (id) =>
  `<svg class="xx" id="${id}" width="110" height="130" viewBox="0 0 110 130"><path pathLength="1" d="M12 12 L98 118"/><path pathLength="1" d="M98 12 L12 118"/></svg>`;

// ---------- 컷별 장면 ----------
const js = []; // 타임라인 코드 줄
const add = (s) => js.push(s);
const pop = (sel, t, o = '') =>
  add(`tl.fromTo(${sel},{opacity:0,scale:0.6},{opacity:1,scale:1,duration:0.4,ease:'back.out(2.2)'${o}},${t});`);
const rise = (sel, t, y = 50) =>
  add(`tl.fromTo(${sel},{opacity:0,y:${y}},{opacity:1,y:0,duration:0.4,ease:'power3.out'},${t});`);
const draw = (sel, t, d = 0.35) =>
  add(`tl.fromTo(${sel},{strokeDashoffset:1},{strokeDashoffset:0,duration:${d},ease:'power1.inOut'},${t});`);

function dropAnim(id, tDrop) {
  add(`tl.set('#${id}-sl',{rotation:-40,transformOrigin:'0% 50%'},0);`);
  add(`tl.to('#${id}-dr',{color:'#BDBDBD',duration:0.25,ease:'none'},${tDrop});`);
  add(`tl.fromTo('#${id}-sl',{scaleX:0},{scaleX:1,duration:0.3,ease:'power2.out'},${r3(tDrop + 0.05)});`);
}

const scenes = cuts.map((c, i) => {
  const p = `c${i}`;
  let body = '';
  const sd = S[i];
  switch (c.template) {
    case 'hook': {
      const fs = fsFor(c.word.length, 860, 170);
      body = wordHtml(`${p}-w`, c.word, fs) + pillHtml(`${p}-pl`, c.pill);
      // 글자는 0초부터 보이고(첫 프레임이 썸네일) 아래에서 한 글자씩 제자리로 올라온다
      add(`tl.fromTo('#${p}-w .ch',{y:70},{y:0,duration:0.4,ease:'back.out(1.8)',stagger:0.05},${r3(sd + 0.05)});`);
      pop(`'#${p}-pl'`, T(i, cue(i, '어떻게')));
      break;
    }
    case 'contrast': {
      const fs = fsFor(c.word.length, 820, 128);
      const sound = [...c.sound];
      const written = [...c.written];
      const diff = sound.map((ch, k) => written.length === sound.length && written[k] === ch ? 0 : 1);
      const soundHtml = sound
        .map((ch, k) => (diff[k] ? `<span class="hlc"><b class="hlbg"></b><span class="hlt">${esc(ch)}</span></span>` : `<span class="hlc">${esc(ch)}</span>`))
        .join('');
      body =
        wordHtml(`${p}-w`, c.word, fs) +
        `<div class="wr" id="${p}-wr"><div class="ko red" style="font-size:130px">${esc(c.written)}</div>${crossX(p + '-x')}</div>` +
        arrowDown(`${p}-ar`) +
        `<div class="ko sd" id="${p}-sd" style="font-size:150px">${soundHtml}</div>`;
      rise(`'#${p}-w'`, r3(sd + 0.15), 30);
      const tWr = T(i, cue(i, c.written));
      pop(`'#${p}-wr'`, tWr);
      draw(`'#${p}-x path:nth-child(1)'`, r3(tWr + 0.6), 0.25);
      draw(`'#${p}-x path:nth-child(2)'`, r3(tWr + 0.85), 0.25);
      draw(`'#${p}-ar path'`, T(i, cue(i, '소리는')), 0.35);
      const tSd = T(i, cue(i, c.sound));
      rise(`'#${p}-sd'`, tSd, 50);
      add(`tl.fromTo('#${p}-sd .hlbg',{scaleX:0,transformOrigin:'0% 50%'},{scaleX:1,duration:0.3,ease:'power2.out'},${r3(tSd + 0.3)});`);
      break;
    }
    case 'vowel-drop':
    case 'word-drop': {
      const isV = c.template === 'vowel-drop';
      const fs = fsFor(c.word.length, 860, 160);
      body =
        wordHtml(`${p}-w`, c.word, fs, c.drop) +
        `<div class="ko sd" id="${p}-sd" style="font-size:${isV ? 150 : 140}px">${esc(c.sound)}</div>` +
        (isV ? pillHtml(`${p}-pl`, c.pill) : '');
      rise(`'#${p}-w'`, r3(sd + 0.15), 30);
      let tDrop;
      let tSound;
      let tPill;
      if (i === 2) { tDrop = cue(i, '거의'); tSound = cue(i, '안'); tPill = cue(i, '들려요'); }
      else if (i === 5) { tDrop = cue(i, '거의'); tSound = cue(i, '들려요'); }
      else if (i === 7) { tDrop = cue(i, '디프런트'); tSound = tDrop + 0.45; }
      // 컷 9: words.json의 '멤리'가 길이 0(0.734)으로 잘못 잡혀, ffmpeg silencedetect 실측(발화 시작 0.356초)을 쓴다
      else if (i === 9) { tDrop = 0.36; tSound = 0.85; }
      else throw new Error(`컷 ${i}의 낱말 소리 타이밍이 정해지지 않았다`);
      dropAnim(`${p}-w`, T(i, tDrop));
      rise(`'#${p}-sd'`, T(i, tSound), 50);
      if (isV) pop(`'#${p}-pl'`, T(i, tPill));
      break;
    }
    case 'analogy': {
      body =
        pillHtml(`${p}-pl`, c.pill) +
        `<div class="ko" id="${p}-a" style="font-size:140px"><span class="am">${esc(c.from[0])}</span><span class="al" id="${p}-al" style="width:1em">${esc(c.from.slice(1))}</span></div>` +
        arrowDown(`${p}-ar`) +
        `<div class="ko hl1" id="${p}-b" style="font-size:150px"><b class="hlbg" id="${p}-hb"></b><span class="hlt">${esc(c.to)}</span></div>`;
      pop(`'#${p}-pl'`, T(i, cue(i, '우리말도')));
      rise(`'#${p}-a'`, T(i, cue(i, '마음을')), 40);
      draw(`'#${p}-ar path'`, r3(T(i, cue(i, '마음을')) + 0.55), 0.35);
      const tB = T(i, cue(i, '맘'));
      rise(`'#${p}-b'`, tB, 50);
      const tSq = T(i, cue(i, '줄여'));
      add(`tl.to('#${p}-al',{width:'0.5em',scaleX:0.5,opacity:0.8,color:'#6B6B6B',transformOrigin:'0% 50%',duration:0.5,ease:'power2.inOut'},${tSq});`);
      add(`tl.fromTo('#${p}-hb',{scaleX:0,transformOrigin:'0% 50%'},{scaleX:1,duration:0.35,ease:'power2.out'},${r3(tSq + 0.1)});`);
      break;
    }
    case 'word-wrong': {
      const fs = fsFor(c.word.length, 860, 160);
      body = wordHtml(`${p}-w`, c.word, fs) + `<div class="ko red" id="${p}-wr" style="font-size:150px">${esc(c.written)}</div>`;
      rise(`'#${p}-w'`, r3(sd + 0.15), 30);
      const tWr = T(i, cue(i, c.written));
      pop(`'#${p}-wr'`, tWr);
      add(`tl.fromTo('#${p}-wr',{rotation:-3},{rotation:3,duration:0.1,yoyo:true,repeat:5,ease:'sine.inOut',immediateRender:false},${r3(tWr + 0.4)});`);
      add(`tl.to('#${p}-wr',{rotation:0,duration:0.1,ease:'sine.out'},${r3(tWr + 1.05)});`);
      break;
    }
    case 'recap': {
      const rows = c.rows
        .map(
          (r, k) =>
            `<div class="rr" id="${p}-r${k}"><div class="rw">${esc(r.word)}</div>${arrowRight(`${p}-a${k}`)}<div class="rs">${esc(r.sound)}</div></div>`,
        )
        .join('');
      body = pillHtml(`${p}-pl`, c.pill) + `<div class="rows">${rows}</div>`;
      pop(`'#${p}-pl'`, r3(sd + 0.2));
      c.rows.forEach((r, k) => {
        const t = r3(V[i] + 0.5 + k * 0.35);
        rise(`'#${p}-r${k}'`, t, -40);
        draw(`'#${p}-a${k} path'`, r3(t + 0.15), 0.25);
      });
      break;
    }
    case 'quiz': {
      const fs = fsFor(c.word.length, 860, 150);
      body =
        pillHtml(`${p}-pl`, c.pill) +
        wordHtml(`${p}-w`, c.word, fs) +
        `<div class="qm" id="${p}-q"><span>?</span></div>`;
      rise(`'#${p}-w'`, r3(sd + 0.15), 30);
      // 낱말 글자가 왼쪽부터 차례로 통통 튄다(마디 수를 암시하지 않게 글자 단위로만)
      const tSweep = T(i, cue(i, '단어는'));
      [...c.word].forEach((_, k) => {
        add(`tl.fromTo('#${p}-w .ch:nth-child(${k + 1})',{y:0},{y:-28,duration:0.12,ease:'power1.out',immediateRender:false},${r3(tSweep + k * 0.2)});`);
        add(`tl.to('#${p}-w .ch:nth-child(${k + 1})',{y:0,duration:0.12,ease:'power1.in'},${r3(tSweep + k * 0.2 + 0.12)});`);
      });
      pop(`'#${p}-pl'`, T(i, cue(i, '몇')));
      const tq = T(i, cue(i, '마디일까요'));
      pop(`'#${p}-q'`, tq);
      add(`tl.to('#${p}-q',{scale:1.14,duration:0.25,yoyo:true,repeat:3,ease:'sine.inOut',immediateRender:false},${r3(tq + 0.5)});`);
      break;
    }
    case 'cta': {
      const lines = c.text.split('\n');
      const maxLen = Math.max(...lines.map((l) => [...l].length));
      const fs = Math.min(140, Math.floor(820 / (maxLen * 0.98)));
      body =
        lines.map((l, k) => `<div class="ko" id="${p}-l${k}" style="font-size:${fs}px">${esc(l)}</div>`).join('') +
        (c.pill ? pillHtml(`${p}-pl`, c.pill) : '');
      const cues =
        i === 12 ? ['벌너러블', '벌너블'] : i === 13 ? ['몇', '댓글로'] : (() => { throw new Error('cta 큐 없음'); })();
      lines.forEach((l, k) => rise(`'#${p}-l${k}'`, T(i, cue(i, cues[k])), 50));
      if (c.pill) pop(`'#${p}-pl'`, T(i, cue(i, '사전엔')));
      break;
    }
    default:
      throw new Error('알 수 없는 template: ' + c.template);
  }
  const dur = r3(E[i] - S[i]);
  // 장면 공통 연출: 페이드인(크로스페이드), 카드 튕김 등장, 컷 내내 1->1.03 확대
  const head = [
    // 첫 컷은 0초에 카드가 이미 보여야 한다(첫 프레임이 썸네일로 쓰인다): 페이드 없이 시작
    i === 0 ? '' : `tl.fromTo('#scene-${String(i).padStart(2, '0')}',{opacity:0},{opacity:1,duration:${XF},ease:'none'},${S[i]});`,
    `tl.fromTo('#${p}-card',{scale:${i === 0 ? 0.97 : 0.92}},{scale:1,duration:0.4,ease:'back.out(1.6)'},${S[i]});`,
    `tl.fromTo('#${p}-zoom',{scale:1},{scale:1.03,duration:${dur},ease:'none'},${S[i]});`,
  ];
  js.unshift(...head);
  return `<div class="clip" id="scene-${String(i).padStart(2, '0')}" data-start="${S[i]}" data-duration="${dur}" data-track-index="${10 + (i % 2)}">
  <div class="zoom" id="${p}-zoom"><div class="card" id="${p}-card"><div class="stack">${body}</div></div></div>
</div>`;
});
// head 줄을 장면 안에서 unshift했으므로 컷 순서가 뒤집혔다. 순서는 의미가 없다(모두 절대 시각).

// ---------- 오디오 ----------
const audio = [];
cuts.forEach((c, i) => {
  audio.push(
    `<audio id="v${String(i + 1).padStart(2, '0')}" src="assets/voice/${nn(i)}.wav" data-start="${V[i]}" data-duration="${voice[i].dur}" data-track-index="1" data-volume="1" data-audio-group="voiceover"></audio>`,
  );
  if (voice[i].en) {
    audio.push(
      `<audio id="en${String(i + 1).padStart(2, '0')}" src="${voice[i].en.file}" data-start="${voice[i].enStart}" data-duration="${voice[i].en.dur}" data-track-index="2" data-volume="1" data-audio-group="voiceover"></audio>`,
    );
  }
});
// 제미나이가 만든 track.mp3는 62.98초라 영상(71초)보다 짧다. 끝과 처음을 4초 겹쳐 이은 track.loop.mp3(73초, ffmpeg acrossfade)가 있으면 그것을 쓴다.
const bgmFile = existsSync(join(ROOT, 'assets', 'bgm', 'track.loop.mp3')) ? 'track.loop.mp3' : 'track.mp3';
const hasBgm = existsSync(join(ROOT, 'assets', 'bgm', bgmFile));
if (hasBgm) {
  audio.push(
    `<audio id="bgm" src="assets/bgm/${bgmFile}" data-start="0" data-duration="${TOTAL}" data-track-index="3" data-volume="0.06" data-fade-out="1" data-fx-carve="{&quot;enabled&quot;:true,&quot;sources&quot;:[&quot;voiceover&quot;],&quot;strength&quot;:0.8}"></audio>`,
  );
}

// ---------- 자막 SRT (업로드용, words.json 실측 시각 기준) ----------
const srtTime = (t) => {
  const ms = Math.round(t * 1000);
  const h = String(Math.floor(ms / 3600000)).padStart(2, '0');
  const m = String(Math.floor((ms % 3600000) / 60000)).padStart(2, '0');
  const s = String(Math.floor((ms % 60000) / 1000)).padStart(2, '0');
  return `${h}:${m}:${s},${String(ms % 1000).padStart(3, '0')}`;
};
const srt = cuts
  .map((c, i) => {
    const w = voice[i].words;
    const a = V[i] + w[0].from;
    const b = V[i] + voice[i].dur;
    return `${i + 1}\n${srtTime(a)} --> ${srtTime(b)}\n${c.narration}\n`;
  })
  .join('\n');
mkdirSync(join(ROOT, 'subtitles'), { recursive: true });
writeFileSync(join(ROOT, 'subtitles', 'subtitles-ko.srt'), srt);

// ---------- HTML ----------
const css = `
@font-face{font-family:'Noto Sans KR';src:url('assets/fonts/NotoSansKR-subset.ttf') format('truetype');font-weight:100 900;font-display:block}
html,body{margin:0;padding:0;background:#F1ECE4}
body{font-family:'Noto Sans KR',sans-serif;color:#111}
#root{position:relative;width:100%;height:100%;overflow:hidden;background:#F1ECE4}
.clip{position:absolute;inset:0}
.scn{position:absolute;inset:0}
.zoom{position:absolute;inset:0;transform-origin:50% 50%}
.card{position:absolute;left:40px;top:240px;width:980px;height:1290px;box-sizing:border-box;border:10px solid #000;border-radius:56px;background:#fff;box-shadow:24px 24px 0 #000}
.stack{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:30px}
.word{display:flex;justify-content:center;white-space:nowrap;font-weight:900;line-height:1.5;letter-spacing:-0.01em;color:#111;-webkit-text-stroke:0.025em currentcolor}
.ch{display:block;position:relative}
.dr{display:block;position:relative}
.slash{position:absolute;left:-0.04em;top:1.06em;width:0.9em;height:0.15em;background:#E8212E;border-radius:0.1em;display:block}
.ko{font-weight:900;white-space:nowrap;line-height:1.5;text-align:center;color:#111;position:relative}
.red{color:#E8212E}
.wr{position:relative;display:block}
.xx{position:absolute;left:100%;top:50%;margin:-65px 0 0 24px;fill:none;stroke:#E8212E;stroke-width:14;stroke-linecap:round}
.xx path,.ar path{stroke-dasharray:1 1}
.ar{display:block;fill:none;stroke:#111;stroke-width:9;stroke-linecap:round;stroke-linejoin:round}
.sd{display:flex;justify-content:center}
.hlc{display:block;position:relative}
.hlbg{position:absolute;left:-0.04em;right:-0.04em;top:0.28em;bottom:0.12em;background:#F5C518;border-radius:0.12em;z-index:0;display:block}
.hlt{position:relative;z-index:1;display:block}
.hl1{display:block;position:relative;padding:0 0.18em}
.hl1 .hlbg{left:0;right:0}
.am,.al{display:inline-block;overflow:visible}
.al{white-space:nowrap}
.pill{box-sizing:border-box;background:#F5C518;border:10px solid #000;border-radius:90px;box-shadow:12px 12px 0 #000;padding:26px 56px;display:flex;flex-direction:column;align-items:center;font-weight:900;font-size:54px;line-height:1.3;color:#111}
.pill span{display:block;white-space:nowrap}
.rows{display:flex;flex-direction:column;width:880px}
.rr{display:grid;grid-template-columns:400px 90px 390px;align-items:center;height:150px;border-top:6px solid #000;box-sizing:border-box}
.rr .rw{-webkit-text-stroke:0.02em currentcolor;font-weight:900;font-size:64px;white-space:nowrap;text-align:left;color:#111}
.rr .ar{justify-self:center}
.rr .rs{font-weight:900;font-size:80px;white-space:nowrap;text-align:right;color:#111}
.qm{width:170px;height:170px;box-sizing:border-box;border:10px solid #000;border-radius:50%;background:#E8212E;box-shadow:12px 12px 0 #000;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:900;font-size:110px;line-height:1}
.qm span{display:block}
`;

const html = `<!doctype html>
<html lang="ko" data-resolution="portrait">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=1080, height=1920">
<title>EP30 chocolate 쇼츠</title>
<script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
<style>${css}</style>
</head>
<body>
<div id="root" data-composition-id="main" data-start="0" data-duration="${TOTAL}" data-width="1080" data-height="1920">
${scenes.join('\n')}
${audio.join('\n')}
</div>
<script>
const tl = gsap.timeline({ paused: true });
${js.join('\n')}
window.__timelines['main'] = tl;
</script>
</body>
</html>
`;
writeFileSync(join(ROOT, 'index.html'), html);

// ---------- 요약 출력 ----------
console.log(`전체 길이 ${TOTAL}초 / BGM ${hasBgm ? '있음' : '없음(BGM 대기)'} / 원어민 단어 음성 ${voice.filter((v) => v.en).length}개`);
console.log('컷\ttemplate\t화면시작\t음성시작\t화면끝\t음성길이');
cuts.forEach((c, i) => console.log(`${i}\t${c.template}\t${S[i]}\t${V[i]}\t${E[i]}\t${voice[i].dur}`));
