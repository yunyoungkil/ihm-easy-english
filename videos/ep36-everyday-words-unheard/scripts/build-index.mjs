import {execFileSync} from 'node:child_process';
import {existsSync, readFileSync, writeFileSync} from 'node:fs';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const EP_DIR = join(HERE, '..');
const ASSETS = join(EP_DIR, 'assets');

const timeline = JSON.parse(readFileSync(join(ASSETS, 'audio-timeline.json'), 'utf8'));
const whisper = JSON.parse(readFileSync(join(ASSETS, 'whisper-timings.json'), 'utf8'));
const COMP_ID = 'ep36-everyday-words-unheard';
const TOTAL_DUR = timeline.totalDuration;
const S = Object.fromEntries(timeline.scenes.map((sc) => [sc.id, sc]));

const hasClip = (name) => existsSync(join(ASSETS, 'clips', name));
const hasImg = (name) => existsSync(join(ASSETS, 'images', name));
const esc = (str) => String(str ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// Syntax-aware Korean caption splitter:
// - Never breaks inside quoted spans ("..." / '...')
// - Never breaks right after a determiner/numeral (한/두/세/네/이/그/저/딱/아예/제일)
// - Never leaves a predicate like 싶었던/하면/하나요/라고 orphaned after a closing quote
const NO_BREAK_AFTER = new Set(['한', '두', '세', '네', '이', '그', '저', '딱', '아예', '제일', '다', '그냥', '바로', '거의']);
const BIND_TO_PREV = /^(싶었던|하면|하나요|라고|하는|까지|처럼|이랑|밖에)/;

function splitBalancedKoreanText(raw) {
  const sentences = [];
  let buf = '';
  let inDouble = false;
  let inSingle = false;
  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i];
    if (ch === '"') inDouble = !inDouble;
    if (ch === "'" && (i === 0 || /\s/.test(raw[i - 1]) || /[.!?\s,]$/.test(raw[i + 1] || ' '))) inSingle = !inSingle;
    buf += ch;
    const nextCh = raw[i + 1] || '';
    const afterQuote = (nextCh === '"' || nextCh === "'") ? (raw[i + 2] || '') : nextCh;
    if (!inDouble && !inSingle && /[.!?]/.test(ch)) {
      if (nextCh === '"' || nextCh === "'") {
        // Keep closing quote attached; check if followed by a bound predicate like "싶었던"
        const rest = raw.slice(i + 2).trimStart();
        if (BIND_TO_PREV.test(rest)) continue;
      }
      if (i === raw.length - 1 || /\s/.test(afterQuote)) {
        const s = buf.trim();
        if (s) sentences.push(s);
        buf = '';
      }
    }
  }
  if (buf.trim()) sentences.push(buf.trim());

  const MAX_LINE = 29;
  const rawChunks = [];
  for (const sent of sentences) {
    if (sent.length <= MAX_LINE) {
      rawChunks.push(sent);
      continue;
    }
    // Group tokens so quoted phrases ("..."), determiner+noun, and bound predicates stay atomic
    const rawTokens = sent.match(/"[^"]+"|'[^']+'|\S+/g) || sent.split(/\s+/);
    const units = [];
    for (let i = 0; i < rawTokens.length; i++) {
      let u = rawTokens[i];
      while (i + 1 < rawTokens.length && (NO_BREAK_AFTER.has(u.replace(/["'.,!?]/g, '')) || BIND_TO_PREV.test(rawTokens[i + 1]))) {
        u = `${u} ${rawTokens[++i]}`;
      }
      units.push(u);
    }
    const numLines = Math.ceil(sent.length / 24);
    const targetLen = Math.ceil(sent.length / numLines);
    let line = '';
    for (let i = 0; i < units.length; i++) {
      const u = units[i];
      const next = line ? `${line} ${u}` : u;
      const remaining = units.slice(i + 1).join(' ');
      if (line && (next.length > MAX_LINE || (next.length > targetLen && remaining.length >= 7))) {
        rawChunks.push(line);
        line = u;
      } else {
        line = next;
      }
    }
    if (line) rawChunks.push(line);
  }

  const merged = [];
  for (const ch of rawChunks) {
    const prev = merged.length ? merged[merged.length - 1] : '';
    const prevEndsSentence = /[.!?]["']?$/.test(prev);
    if (merged.length && !prevEndsSentence && ch.length < 9 && (prev.length + 1 + ch.length) <= 32) {
      merged[merged.length - 1] = `${prev} ${ch}`;
    } else {
      merged.push(ch);
    }
  }
  if (merged.length >= 2 && !/[.!?]["']?$/.test(merged[0]) && merged[0].length < 9 && (merged[0].length + 1 + merged[1].length) <= 32) {
    merged[1] = `${merged[0]} ${merged[1]}`;
    merged.shift();
  }
  return merged;
}

// Strictly monotonic cumulative Whisper timing alignment (ZERO sawtooth jump!)
function alignKoreanCaptionsWithWhisper(cue) {
  const chunks = splitBalancedKoreanText(String(cue.text || '').trim());
  const wData = whisper.ko?.[cue.key];
  const segs = Array.isArray(wData?.segments) && wData.segments.length
    ? wData.segments.filter((s) => Number.isFinite(s.start) && Number.isFinite(s.end) && s.end >= s.start)
    : null;

  const speechStart = segs ? Math.max(0, Math.min(segs[0].start, cue.duration * 0.12)) : 0;
  const speechEnd = segs ? Math.min(cue.duration, Math.max(segs[segs.length - 1].end, cue.duration * 0.88)) : cue.duration;

  while (chunks.length > 1 && (cue.duration / chunks.length) < 1.35) {
    let bestIdx = 0;
    let bestLen = Infinity;
    for (let i = 0; i < chunks.length - 1; i++) {
      const combined = chunks[i].length + 1 + chunks[i + 1].length;
      if (combined < bestLen) { bestLen = combined; bestIdx = i; }
    }
    if (bestLen > 32) break;
    chunks.splice(bestIdx, 2, `${chunks[bestIdx]} ${chunks[bestIdx + 1]}`);
  }

  // Build strictly monotonic piecewise-linear knots: (frac, time)
  const knots = [{f: 0, t: speechStart}];
  if (segs && segs.length >= 2) {
    const segW = segs.map((s) => Math.max(1, s.text.replace(/\s+/g, '').length));
    const segSum = segW.reduce((a, b) => a + b, 0);
    let acc = 0;
    let lastT = speechStart;
    for (let i = 0; i < segs.length; i++) {
      acc += segW[i];
      const clampedT = Math.max(lastT, Math.min(speechEnd, segs[i].end));
      knots.push({f: acc / segSum, t: clampedT});
      lastT = clampedT;
    }
  } else {
    knots.push({f: 1, t: speechEnd});
  }

  const timeAtFraction = (frac) => {
    const f = Math.max(0, Math.min(1, frac));
    for (let i = 1; i < knots.length; i++) {
      if (f <= knots[i].f || i === knots.length - 1) {
        const k0 = knots[i - 1];
        const k1 = knots[i];
        const span = k1.f - k0.f;
        const alpha = span > 1e-6 ? (f - k0.f) / span : 1;
        return k0.t + (k1.t - k0.t) * alpha;
      }
    }
    return speechEnd;
  };

  const weights = chunks.map((c) => Math.max(6, c.replace(/\s+/g, '').length));
  const totalW = weights.reduce((a, b) => a + b, 0);

  let cumW = 0;
  let prevLocal = speechStart;
  return chunks.map((text, idx) => {
    cumW += weights[idx];
    const minChunkDur = Math.min(1.15, (cue.duration - prevLocal) / Math.max(1, chunks.length - idx));
    const maxNext = cue.duration - minChunkDur * (chunks.length - 1 - idx);
    const rawNext = idx === chunks.length - 1 ? cue.duration : timeAtFraction(cumW / totalW);
    const nextLocal = idx === chunks.length - 1
      ? cue.duration
      : Math.max(prevLocal + minChunkDur, Math.min(maxNext, rawNext));
    const start = +(cue.start + prevLocal).toFixed(3);
    const dur = Math.max(0.95, +(nextLocal - prevLocal).toFixed(3));
    prevLocal = nextLocal;
    return {start, dur, text};
  });
}

const captionClips = [];
for (const cue of timeline.audioCues) {
  if (cue.kind !== 'ko') continue;
  for (const ch of alignKoreanCaptionsWithWhisper(cue)) captionClips.push(ch);
}
// Hold short trailing captions slightly into natural post-sentence silence (eliminates <1.5s line_unread warnings without overlapping next caption!)
for (let i = 0; i < captionClips.length; i++) {
  const c = captionClips[i];
  if (c.dur < 1.68) {
    const nextStart = i + 1 < captionClips.length ? captionClips[i + 1].start : TOTAL_DUR - 9.2;
    const maxDur = +(nextStart - c.start - 0.12).toFixed(3);
    if (maxDur > c.dur) {
      c.dur = +Math.min(1.85, maxDur).toFixed(3);
    }
  }
}

function findWhisperTime(segs, regex, fallback) {
  if (!Array.isArray(segs)) return fallback;
  const hit = segs.find((s) => regex.test(s.text));
  return hit ? hit.start : fallback;
}
const c00SubLocal = findWhisperTime(whisper.ko?.c00?.segments, /우리/, 11.48);
const c02bCamLocal = findWhisperTime(whisper.ko?.c02b?.segments, /사진/, 7.68);
const c04RightLocal = findWhisperTime(whisper.ko?.c04?.segments, /반/, 2.46);
const c04CtaLocal = findWhisperTime(whisper.ko?.c04?.segments, /보기|소리/, 6.92);
const c06bVitLocal = findWhisperTime(whisper.ko?.c06b?.segments, /약/, 7.08);
const EN_WORD_ONSETS = {
  s1_cam: findWhisperTime(whisper.en?.sent1?.segments, /camera/i, 0.62),
  s1_choc: findWhisperTime(whisper.en?.sent1?.segments, /chocolate/i, 1.75),
  s1_comf: findWhisperTime(whisper.en?.sent1?.segments, /comfortable/i, 4.85),
  s2_steak: findWhisperTime(whisper.en?.sent2?.segments, /steak/i, 0.56),
  s3_buf: findWhisperTime(whisper.en?.sent3?.segments, /buffet/i, 0.51),
  s3_allergy: findWhisperTime(whisper.en?.sent3?.segments, /allergy/i, 1.33),
  s3_vit: findWhisperTime(whisper.en?.sent3?.segments, /vitamin/i, 2.35),
};

// Track 0: 1 single seamless smooth video or Ken Burns photo per background scene (ZERO jump-cut tiling!)
const XFADE = 0.25;
const sceneDur = (idx) => +(timeline.scenes[idx].duration + (idx < timeline.scenes.length - 1 ? XFADE : 0)).toFixed(3);
const s5RevealStart = +(S['scene-05'].start + S['scene-05'].events.c05a.localStart).toFixed(3);
const s5RevealDur = +(S['scene-05'].end - s5RevealStart + XFADE).toFixed(3);

const videoTracks = [
  // Scene 00: Clean dark editorial chocolate + vitamin bottle (ZERO brass key fob, matches Thumbnail!)
  `<div id="vid-s0-fb" class="clip bg-photo-wrap" data-start="${S['scene-00'].start}" data-duration="${sceneDur(0)}" data-track-index="0"><img id="vid-s0-img" data-layout-allow-overflow class="bg-photo" src="assets/images/thumb-a-v2-bg.jpg" alt=""></div>`,
  // Scene 01: Seamless ping-pong warm cafe steam video
  hasClip('c01-smooth.mp4')
    ? `<video id="vid-s1" class="clip bg-video" src="assets/clips/c01-smooth.mp4" data-start="${S['scene-01'].start}" data-duration="${sceneDur(1)}" data-track-index="0" muted playsinline></video>`
    : `<div id="vid-s1-fb" class="clip bg-photo-wrap" data-start="${S['scene-01'].start}" data-duration="${sceneDur(1)}" data-track-index="0"><img class="bg-photo" src="assets/images/thumb-c-bg.jpg" alt=""></div>`,
  // Scene 05 reveal: Seamless ping-pong sizzling skillet video
  hasClip('c05-smooth.mp4')
    ? `<video id="vid-s5" class="clip bg-video" src="assets/clips/c05-smooth.mp4" data-start="${s5RevealStart}" data-duration="${s5RevealDur}" data-track-index="0" muted playsinline></video>`
    : `<div id="vid-s5-fb" class="clip bg-photo-wrap" data-start="${s5RevealStart}" data-duration="${s5RevealDur}" data-track-index="0"><img class="bg-photo" src="assets/images/panel-02.png" alt=""></div>`,
  // Scene 07: Sunlit boutique hotel breakfast photo with smooth slow zoom
  `<div id="vid-s7-fb" class="clip bg-photo-wrap" data-start="${S['scene-07'].start}" data-duration="${sceneDur(7)}" data-track-index="0"><img id="vid-s7-img" data-layout-allow-overflow class="bg-photo" src="assets/images/panel-04.png" alt=""></div>`,
  // Scene 08: Visually distinct cool-teal graded ping-pong cafe video
  hasClip('c08-smooth.mp4')
    ? `<video id="vid-s8" class="clip bg-video" src="assets/clips/c08-smooth.mp4" data-start="${S['scene-08'].start}" data-duration="${sceneDur(8)}" data-track-index="0" muted playsinline></video>`
    : `<div id="vid-s8-fb" class="clip bg-photo-wrap" data-start="${S['scene-08'].start}" data-duration="${sceneDur(8)}" data-track-index="0"><img class="bg-photo" src="assets/images/thumb-c-bg.jpg" alt=""></div>`,
];

// Audio tracks: 3 clean master tracks (BGM carved + Voice Master + SFX/Foley Master)
// Avoids Chromium 60+ WebMediaPlayer limit dropout in Studio live preview!
const audioTags = [];
const hasMasterMix = existsSync(join(ASSETS, 'mix-voice.wav')) && existsSync(join(ASSETS, 'mix-sfx.wav'));
if (timeline.bgm) {
  audioTags.push(`<audio id="bgm" src="${timeline.bgm.file}" data-start="0" data-duration="${TOTAL_DUR}" data-track-index="4" data-volume="0.08"></audio>`);
}
if (hasMasterMix) {
  audioTags.push(`<audio id="voice-master" data-audio-group="voiceover" src="assets/mix-voice.wav" data-start="0" data-duration="${TOTAL_DUR}" data-track-index="5" data-volume="1"></audio>`);
  audioTags.push(`<audio id="sfx-master" src="assets/mix-sfx.wav" data-start="0" data-duration="${TOTAL_DUR}" data-track-index="6" data-volume="1"></audio>`);
} else {
  for (const cue of timeline.audioCues) {
    const track = cue.kind === 'ko' ? 5 : cue.kind === 'en' ? 6 : 7;
    const vol = cue.kind === 'sfx' ? (cue.volume ?? 0.42) : 1.0;
    audioTags.push(`<audio id="${cue.id}" src="${cue.file}" data-start="${cue.start}" data-duration="${cue.duration}" data-track-index="${track}" data-volume="${vol}"></audio>`);
  }
  if (hasClip('c00-foley.wav')) {
    audioTags.push(`<audio id="foley-s0-choc" src="assets/clips/c00-foley.wav" data-start="0.05" data-duration="4.85" data-track-index="7" data-volume="0.22"></audio>`);
  }
  if (hasClip('foley-s1-full.wav')) {
    audioTags.push(`<audio id="foley-s1-cafe" src="assets/clips/foley-s1-full.wav" data-start="${S['scene-01'].start}" data-duration="${S['scene-01'].duration}" data-track-index="7" data-volume="0.09"></audio>`);
  }
  if (hasClip('foley-s5-full.wav')) {
    audioTags.push(`<audio id="foley-s5-steak" src="assets/clips/foley-s5-full.wav" data-start="${s5RevealStart}" data-duration="${+(S['scene-05'].end - s5RevealStart).toFixed(3)}" data-track-index="7" data-volume="0.13"></audio>`);
  }
  if (hasClip('foley-s8-full.wav')) {
    audioTags.push(`<audio id="foley-s8-cafe" src="assets/clips/foley-s8-full.wav" data-start="${S['scene-08'].start}" data-duration="${S['scene-08'].duration}" data-track-index="7" data-volume="0.08"></audio>`);
  }
}

const s3PhotoSrc = hasImg('scene03-armchair.jpg') ? 'assets/images/scene03-armchair.jpg' : 'assets/images/panel-04.png';
const s6PeachSrc = hasImg('scene06-peach.jpg') ? 'assets/images/scene06-peach.jpg' : 'assets/images/panel-03.png';

const eqBarsHtml = (prefix) => Array.from({length: 18}, (_, i) => {
  const baseH = 26 + Math.round(Math.sin((i + 1) * 0.62) * 18 + Math.cos(i * 1.1) * 14);
  return `<div class="eq-bar ${prefix}-bar" data-idx="${i}" style="height:${Math.max(22, Math.abs(baseH) + 22)}px"></div>`;
}).join('');

const html = `<!doctype html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=1920, height=1080">
<title>EP36 - 평생 초콜릿·비타민이라 읽었는데… 원어민 영어 발음은 아예 딴 단어</title>
<script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
<style>
@font-face {
  font-family: 'Noto Sans KR';
  src: url('assets/fonts/NotoSansKR-VF.ttf') format('truetype');
  font-weight: 100 900;
  font-display: block;
}
:root {
  --ivory: #F7F4ED;
  --ivory-card: #FFFDF8;
  --charcoal: #171614;
  --charcoal-soft: #24221F;
  --ink: #1A1917;
  --ink-muted: #5C574E;
  --vermilion: #D94235;
  --vermilion-soft: rgba(217, 66, 53, 0.13);
  --teal: #18A999;
  --teal-deep: #0F766E;
  --teal-soft: rgba(24, 169, 153, 0.14);
  --amber: #E8A838;
  --amber-soft: rgba(232, 168, 56, 0.16);
  --brand-gold: #F5C518;
  --line-dark: rgba(26, 25, 23, 0.12);
  --line-light: rgba(247, 244, 237, 0.16);
}
* { box-sizing: border-box; margin: 0; padding: 0; }
html, body {
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: var(--charcoal);
  color: var(--ink);
  font-family: 'Noto Sans KR', sans-serif;
  font-variant-ligatures: none;
  word-break: keep-all;
  -webkit-font-smoothing: antialiased;
}
#root {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: var(--charcoal);
}
.bg-video, .bg-photo-wrap {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  z-index: 1;
}
.bg-photo {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.scene {
  position: absolute;
  inset: 0;
  overflow: hidden;
  z-index: 10;
}
.scene-inner {
  position: absolute;
  inset: 0;
  overflow: hidden;
}
.bg-ivory { background: var(--ivory); color: var(--ink); }
.bg-dark { background: var(--charcoal); color: var(--ivory); }
.bg-overlay { background: transparent; color: var(--ivory); }
.paper-grain {
  position: absolute;
  inset: 0;
  pointer-events: none;
  opacity: 0.18;
  background-image:
    radial-gradient(rgba(26, 25, 23, 0.16) 1px, transparent 1px),
    radial-gradient(rgba(217, 66, 53, 0.06) 1px, transparent 1px);
  background-size: 28px 28px, 44px 44px;
  background-position: 0 0, 12px 14px;
}
.scrim-dark-full {
  position: absolute;
  inset: 0;
  background: linear-gradient(96deg, rgba(16, 15, 13, 0.90) 0%, rgba(16, 15, 13, 0.72) 56%, rgba(16, 15, 13, 0.28) 100%);
}
.scrim-dark-center {
  position: absolute;
  inset: 0;
  background: radial-gradient(ellipse at center, rgba(16, 15, 13, 0.70) 0%, rgba(16, 15, 13, 0.88) 100%);
}
.scrim-steak-left {
  position: absolute;
  inset: 0;
  background: linear-gradient(90deg, rgba(18, 17, 15, 0.92) 0%, rgba(18, 17, 15, 0.78) 54%, rgba(18, 17, 15, 0.16) 100%);
}
.stage {
  position: relative;
  z-index: 2;
  width: 100%;
  height: 100%;
  padding: 62px 92px 168px 92px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}
.top-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
}
.eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  padding: 10px 24px;
  border-radius: 999px;
  font-size: 34px;
  font-weight: 800;
  letter-spacing: -0.01em;
  white-space: nowrap;
  flex-shrink: 0;
}
.eyebrow-vermilion { background: var(--vermilion); color: #FFFFFF; }
.eyebrow-teal { background: var(--teal); color: #092421; }
.eyebrow-dark { background: var(--charcoal); color: var(--ivory); }
.eyebrow-light { background: rgba(247, 244, 237, 0.14); color: var(--ivory); border: 1.5px solid var(--line-light); }
.eyebrow-amber { background: var(--amber); color: #1A1407; }
.eyebrow-subtle { background: rgba(26, 25, 23, 0.08); color: var(--ink); border: 1.5px solid var(--line-dark); }
.chapter-tag {
  font-size: 34px;
  font-weight: 700;
  color: var(--ink-muted);
  letter-spacing: 0.01em;
  white-space: nowrap;
}
.chapter-tag.light { color: rgba(247, 244, 237, 0.80); }
.progress-track {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 7px;
  z-index: 60;
  background: rgba(247, 244, 237, 0.14);
}
.progress-fill {
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, var(--vermilion) 0%, var(--amber) 50%, var(--teal) 100%);
  transform-origin: left center;
}

/* Scene 0: Hook (visible immediately at t=0!) */
.s0-body {
  display: flex;
  flex-direction: column;
  gap: 32px;
  max-width: 1120px;
  margin-top: auto;
  margin-bottom: auto;
}
.s0-title {
  font-size: 76px;
  font-weight: 900;
  line-height: 1.22;
  letter-spacing: -0.03em;
  color: #FFFFFF;
}
.s0-accent { color: var(--amber); }
.s0-chips {
  display: flex;
  gap: 22px;
  align-items: center;
}
.word-chip {
  position: relative;
  height: 136px;
  min-width: 280px;
  border-radius: 18px;
  background: rgba(247, 244, 237, 0.10);
  border: 2px solid rgba(247, 244, 237, 0.24);
  overflow: hidden;
}
.chip-face {
  position: absolute;
  inset: 0;
  padding: 18px 28px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 6px;
}
.word-chip .en { font-size: 42px; font-weight: 900; color: #FFFFFF; letter-spacing: -0.01em; white-space: nowrap; }
.word-chip .ko { font-size: 34px; font-weight: 700; color: var(--amber); white-space: nowrap; }
.word-chip .q-label { font-size: 34px; font-weight: 800; color: rgba(247, 244, 237, 0.78); white-space: nowrap; }
.word-chip .q-mark { font-size: 46px; font-weight: 900; color: var(--amber); letter-spacing: 0.08em; }
.s0-sub {
  font-size: 40px;
  font-weight: 700;
  color: rgba(247, 244, 237, 0.92);
  line-height: 1.45;
}

/* Scene 1 & Scene 8: Blind Listening Test */
.blind-center {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 34px;
  text-align: center;
}
.blind-head-wrap {
  position: relative;
  height: 98px;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}
.blind-headline {
  font-size: 74px;
  font-weight: 900;
  color: #FFFFFF;
  letter-spacing: -0.03em;
  white-space: nowrap;
}
.blind-head-wrap .blind-headline {
  position: absolute;
}
.eq-box {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 14px;
  height: 150px;
  padding: 24px 48px;
  border-radius: 26px;
  background: rgba(16, 15, 13, 0.65);
  border: 2px solid rgba(232, 168, 56, 0.35);
}
.eq-box.teal { border-color: rgba(24, 169, 153, 0.55); }
.eq-bar {
  width: 16px;
  border-radius: 999px;
  background: var(--amber);
}
.eq-box.teal .eq-bar { background: var(--teal); }
.sent-pills {
  display: flex;
  gap: 20px;
}
.sent-pill {
  padding: 16px 34px;
  border-radius: 16px;
  font-size: 36px;
  font-weight: 800;
  background: rgba(247, 244, 237, 0.10);
  border: 2px solid rgba(247, 244, 237, 0.22);
  color: rgba(247, 244, 237, 0.72);
  white-space: nowrap;
}
.blind-note {
  font-size: 38px;
  font-weight: 700;
  color: rgba(247, 244, 237, 0.90);
}

/* Split Editorial (Scenes 2, 3, 6) */
.split-grid {
  flex: 1;
  display: grid;
  grid-template-columns: 580px 1fr;
  gap: 58px;
  align-items: center;
}
.photo-plate {
  position: relative;
  height: 640px;
  border-radius: 28px;
  overflow: hidden;
  border: 2px solid var(--line-dark);
  background: var(--ivory-card);
  box-shadow: 0 24px 56px rgba(26, 25, 23, 0.12);
}
.photo-plate img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.photo-caption {
  position: absolute;
  left: 22px;
  bottom: 22px;
  z-index: 3;
  padding: 10px 20px;
  border-radius: 12px;
  background: rgba(23, 22, 20, 0.88);
  color: var(--ivory);
  font-size: 34px;
  font-weight: 700;
  white-space: nowrap;
}
.teach-stack {
  position: relative;
  height: 640px;
  display: flex;
  flex-direction: column;
  justify-content: center;
}
.word-panel {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 28px;
}
.big-word {
  font-size: 104px;
  font-weight: 900;
  letter-spacing: -0.02em;
  color: var(--ink);
  line-height: 1.05;
  white-space: nowrap;
}
.big-word .dot { color: rgba(26, 25, 23, 0.34); margin: 0 4px; }
.big-word .drop {
  position: relative;
  display: inline-block;
  color: var(--vermilion);
}
.slash-line {
  position: absolute;
  left: -6px;
  right: -6px;
  top: 52%;
  height: 10px;
  border-radius: 999px;
  background: var(--vermilion);
  transform-origin: left center;
}
.syllable-row {
  display: flex;
  align-items: center;
  gap: 18px;
}
.syl-box {
  padding: 16px 30px;
  border-radius: 18px;
  font-size: 44px;
  font-weight: 900;
  background: var(--ivory-card);
  border: 2.5px solid var(--line-dark);
  color: var(--ink);
  white-space: nowrap;
}
.native-banner {
  display: flex;
  align-items: baseline;
  gap: 24px;
  padding: 24px 32px;
  border-radius: 24px;
  background: var(--charcoal);
  color: var(--ivory);
}
.native-banner .kr {
  font-size: 62px;
  font-weight: 900;
  color: var(--teal);
  white-space: nowrap;
}
.native-banner .ipa {
  font-size: 38px;
  font-weight: 700;
  color: rgba(247, 244, 237, 0.85);
  white-space: nowrap;
}
.native-banner .beats {
  margin-left: auto;
  padding: 10px 22px;
  border-radius: 999px;
  background: rgba(24, 169, 153, 0.22);
  color: #6EE7D8;
  font-size: 34px;
  font-weight: 800;
  white-space: nowrap;
}
.rule-tag {
  display: inline-flex;
  align-self: flex-start;
  padding: 12px 24px;
  border-radius: 14px;
  background: var(--teal-soft);
  border: 1.5px solid var(--teal);
  font-size: 34px;
  font-weight: 800;
  color: var(--teal-deep);
  white-space: nowrap;
}

/* Scene 3: Editorial Armchair + Honest Phonetic Compression (comfortable) */
.s3-grid {
  flex: 1;
  display: grid;
  grid-template-columns: 1fr 520px;
  gap: 54px;
  align-items: center;
}
.s3-left {
  display: flex;
  flex-direction: column;
  gap: 28px;
}
.s3-rails {
  display: flex;
  align-items: center;
  gap: 16px;
}
.rail-tile {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 22px 28px;
  border-radius: 20px;
  background: var(--ivory-card);
  border: 3px solid var(--line-dark);
  min-width: 196px;
}
.rail-tile .en { font-size: 52px; font-weight: 900; color: var(--ink); white-space: nowrap; }
.rail-tile .ko { font-size: 34px; font-weight: 800; color: var(--ink-muted); white-space: nowrap; }
.rail-tile.drop-tile {
  border-color: var(--vermilion);
  background: var(--vermilion-soft);
}
.rail-tile.drop-tile .en { color: var(--ink); }
.rail-tile .or-del { color: var(--vermilion); text-decoration: line-through; text-decoration-thickness: 5px; }
.rail-tile.drop-tile .ko { color: var(--vermilion); }
.s3-result {
  display: flex;
  align-items: baseline;
  gap: 24px;
  padding: 26px 36px;
  border-radius: 24px;
  background: var(--charcoal);
  color: var(--ivory);
}
.s3-result .kr { font-size: 64px; font-weight: 900; color: var(--teal); white-space: nowrap; }
.s3-result .ipa { font-size: 38px; font-weight: 700; color: rgba(247, 244, 237, 0.85); white-space: nowrap; }
.s3-result .beats { margin-left: auto; font-size: 34px; font-weight: 800; color: var(--amber); white-space: nowrap; }

/* Scene 4: Pivot Interlude (clean kinetic break without heavy top chrome) */
.pivot-center {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 44px;
}
.pivot-row {
  display: flex;
  align-items: center;
  gap: 34px;
}
.pivot-card {
  padding: 36px 46px;
  border-radius: 26px;
  min-width: 560px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.pivot-done {
  background: rgba(247, 244, 237, 0.08);
  border: 2px solid rgba(247, 244, 237, 0.22);
}
.pivot-next {
  background: rgba(232, 168, 56, 0.16);
  border: 2.5px solid var(--amber);
}
.pivot-card .num { font-size: 34px; font-weight: 800; color: var(--amber); }
.pivot-done .num { color: var(--teal); }
.pivot-card .head { font-size: 52px; font-weight: 900; color: #FFFFFF; }
.pivot-card .desc { font-size: 34px; font-weight: 700; color: rgba(247, 244, 237, 0.82); }
.pivot-arrow { font-size: 64px; font-weight: 900; color: var(--amber); }
.pivot-cta { font-size: 48px; font-weight: 800; color: #FFFFFF; }

/* Scene 5: Steak Sound-First Quiz -> Rich Dark-Split Skillet Compression */
.s5-phase {
  position: absolute;
  inset: 0;
  padding: 62px 92px 168px 92px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}
.s5-blind-bg {
  background: var(--charcoal);
  color: var(--ivory);
}
.s5-reveal-wrap {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 32px;
  max-width: 1060px;
}
.hydraulic-row {
  display: flex;
  align-items: center;
  gap: 18px;
}
.h-block {
  padding: 20px 36px;
  border-radius: 20px;
  font-size: 54px;
  font-weight: 900;
  background: rgba(247, 244, 237, 0.96);
  border: 3px solid #FFFFFF;
  color: var(--ink);
}
.h-block.ghost-eu {
  border-color: var(--vermilion);
  background: rgba(217, 66, 53, 0.22);
  color: #FF8C82;
}
.steak-final {
  display: inline-flex;
  align-items: baseline;
  gap: 28px;
  padding: 28px 42px;
  border-radius: 24px;
  background: rgba(16, 15, 13, 0.90);
  border: 2.5px solid var(--teal);
  color: var(--ivory);
  align-self: flex-start;
}
.steak-final .en { font-size: 86px; font-weight: 900; color: #FFFFFF; white-space: nowrap; }
.steak-final .kr { font-size: 66px; font-weight: 900; color: var(--teal); white-space: nowrap; }
.steak-final .ipa { font-size: 40px; font-weight: 700; color: var(--amber); white-space: nowrap; }
.airflow-box {
  display: flex;
  gap: 20px;
}
.air-pill {
  padding: 16px 28px;
  border-radius: 16px;
  background: rgba(16, 15, 13, 0.84);
  border: 2px solid rgba(247, 244, 237, 0.26);
  font-size: 34px;
  font-weight: 800;
  color: #FFFFFF;
  white-space: nowrap;
}

/* Scene 6: Origin Contrast (allergy peach -> vitamin amber bottle) */
.origin-grid {
  flex: 1;
  display: grid;
  grid-template-columns: 1fr 480px;
  gap: 54px;
  align-items: center;
}
.origin-stage {
  position: relative;
  height: 640px;
}
.origin-panel {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 28px;
}
.vs-cards {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
}
.vs-box {
  position: relative;
  min-height: 280px;
  padding: 30px 32px;
  border-radius: 24px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 12px;
}
.vs-old {
  background: var(--ivory-card);
  border: 2.5px solid var(--line-dark);
}
.vs-new {
  background: var(--charcoal);
  border: 2.5px solid var(--teal);
  color: var(--ivory);
  overflow: hidden;
}
.vs-face {
  position: absolute;
  inset: 0;
  padding: 30px 32px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 10px;
}
.vs-label { font-size: 34px; font-weight: 800; color: var(--ink-muted); white-space: nowrap; }
.vs-new .vs-label { color: var(--amber); }
.vs-word { font-size: 64px; font-weight: 900; color: var(--ink); white-space: nowrap; }
.vs-new .vs-word { color: var(--teal); }
.vs-ipa { font-size: 34px; font-weight: 700; color: rgba(247, 244, 237, 0.86); white-space: nowrap; }
.vs-old .vs-ipa { color: var(--vermilion); }
.vs-ex { font-size: 34px; font-weight: 700; color: #6EE7D8; white-space: nowrap; }

/* Scene 7: Buffet 2-Second Quiz (Centered Card + Clean Ring Refill) */
.s7-card {
  margin: auto;
  width: 100%;
  max-width: 1280px;
  padding: 46px 56px;
  border-radius: 30px;
  background: rgba(18, 17, 15, 0.88);
  border: 2px solid rgba(247, 244, 237, 0.24);
  display: flex;
  flex-direction: column;
  gap: 28px;
}
.s7-top-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 36px;
}
.s7-word { font-size: 108px; font-weight: 900; color: #FFFFFF; letter-spacing: -0.02em; white-space: nowrap; }
.s7-word .dot { color: rgba(247, 244, 237, 0.45); margin: 0 4px; }
.s7-origin { font-size: 38px; font-weight: 700; color: rgba(247, 244, 237, 0.88); }
.timer-wrap {
  position: relative;
  width: 190px;
  height: 190px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.timer-wrap svg {
  position: absolute;
  inset: 0;
  width: 190px;
  height: 190px;
}
.timer-text {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 44px;
  font-weight: 900;
  color: var(--amber);
  text-align: center;
}
.timer-text.done { color: #6EE7D8; font-size: 36px; }
.s7-reveal {
  display: flex;
  align-items: baseline;
  gap: 28px;
  padding: 24px 36px;
  border-radius: 22px;
  background: rgba(24, 169, 153, 0.18);
  border: 2.5px solid var(--teal);
}
.s7-reveal .kr { font-size: 74px; font-weight: 900; color: #6EE7D8; white-space: nowrap; }
.s7-reveal .ipa { font-size: 42px; font-weight: 700; color: #FFFFFF; white-space: nowrap; }
.s7-reveal .tip { margin-left: auto; font-size: 34px; font-weight: 800; color: var(--amber); white-space: nowrap; }

/* Scene 9: Subtitle ON 3-Sentence Proof (tight punctuation, legible inactive cards) */
.proof-list {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 24px;
}
.proof-card {
  padding: 26px 36px;
  border-radius: 24px;
  background: rgba(247, 244, 237, 0.07);
  border: 2px solid rgba(247, 244, 237, 0.22);
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.proof-en {
  font-size: 38px;
  font-weight: 800;
  color: #FFFFFF;
  line-height: 1.44;
}
.hl {
  display: inline;
  padding: 2px 8px;
  border-radius: 10px;
  background: var(--teal);
  color: #06221F;
  font-weight: 900;
  box-decoration-break: clone;
}
.proof-ko-row {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
}
.proof-chip {
  padding: 6px 22px;
  border-radius: 999px;
  background: rgba(232, 168, 56, 0.18);
  border: 1.5px solid var(--amber);
  color: var(--amber);
  font-size: 34px;
  font-weight: 800;
  white-space: nowrap;
}

/* Scene 10: Balanced 3-Column Cheat Sheet -> Clean 9s YouTube End Screen */
.s10-summary {
  position: absolute;
  inset: 0;
  padding: 58px 88px 164px 88px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}
.sheet-grid {
  flex: 1;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 22px;
  align-items: stretch;
  margin-top: 16px;
}
.sheet-col {
  padding: 18px 20px;
  border-radius: 22px;
  background: var(--ivory-card);
  border: 2.5px solid var(--line-dark);
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.sheet-col-head {
  padding: 10px 14px;
  border-radius: 12px;
  font-size: 34px;
  font-weight: 900;
  text-align: center;
  white-space: nowrap;
}
.head-v { background: var(--vermilion-soft); color: var(--vermilion); }
.head-a { background: var(--amber-soft); color: #9A6408; }
.head-t { background: var(--teal-soft); color: var(--teal-deep); }
.cheat-item {
  padding: 12px 16px;
  border-radius: 16px;
  background: var(--ivory);
  border: 1.5px solid var(--line-dark);
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.cheat-item .w { font-size: 36px; font-weight: 900; color: var(--ink); line-height: 1.15; white-space: nowrap; }
.cheat-item .pair {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 34px;
  font-weight: 800;
  line-height: 1.2;
}
.cheat-item .old { color: var(--ink-muted); text-decoration: line-through; }
.cheat-item .new { color: var(--teal-deep); }
.cheat-item .ipa { font-size: 34px; font-weight: 700; color: var(--ink-muted); line-height: 1.2; }

/* Final 9s YouTube End Screen: 100% Clear Center/Bottom/Right, Top-Left Wordmark Only */
.s10-endscreen {
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at 18% 18%, #262420 0%, #141311 72%);
  padding: 72px 96px;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: flex-start;
  gap: 14px;
}
.brand-wordmark {
  font-size: 46px;
  font-weight: 900;
  letter-spacing: -0.02em;
  white-space: nowrap;
}
.brand-wordmark .w1 { color: #FFFFFF; }
.brand-wordmark .w2 { color: var(--brand-gold); }
.endscreen-sub {
  font-size: 34px;
  font-weight: 700;
  color: rgba(247, 244, 237, 0.78);
  white-space: nowrap;
}

/* Lower-Third Korean Subtitles (track 3, 48px mobile-first) */
.caption-wrap {
  position: absolute;
  left: 72px;
  right: 72px;
  bottom: 34px;
  z-index: 40;
  display: flex;
  justify-content: center;
  pointer-events: none;
}
.caption-pill {
  max-width: 1740px;
  padding: 16px 38px;
  border-radius: 18px;
  background: rgba(16, 15, 13, 0.90);
  border: 1.5px solid rgba(247, 244, 237, 0.20);
  color: #FAF7F0;
  font-size: 48px;
  font-weight: 800;
  line-height: 1.32;
  text-align: center;
  white-space: nowrap;
}
</style>
</head>
<body>
<div id="root" data-composition-id="${COMP_ID}" data-width="1920" data-height="1080" data-fps="30" data-duration="${TOTAL_DUR}">

  <!-- Persistent top chapter progress bar (fades out cleanly before End Screen) -->
  <div id="progress-wrap" class="progress-track"><div id="progress-bar" class="progress-fill"></div></div>

  <!-- TRACK 0: Continuous Seamless Videos / Photographic Plates (ZERO tiled jump cuts!) -->
  ${videoTracks.join('\n  ')}

  <!-- TRACK 1: Scene 00 — 3-Word Real Audio Hook -->
  <section id="s0" class="clip scene" data-start="${S['scene-00'].start}" data-duration="${sceneDur(0)}" data-track-index="1">
    <div id="s0-in" class="scene-inner bg-overlay">
      <div class="scrim-dark-full"></div>
      <div class="stage">
        <div class="top-bar">
          <div class="eyebrow eyebrow-amber">원어민 실제 소리 테스트</div>
          <div class="chapter-tag light">매일 쓰는 영어 일곱 단어</div>
        </div>
        <div class="s0-body">
          <div id="s0-title" class="s0-title">다 아는 단어인데, 왜 <span class="s0-accent">못 알아들을까요?</span></div>
          <div class="s0-chips">
            <div id="s0-c1" class="word-chip">
              <div id="s0-c1-q" class="chip-face"><div class="q-label">단어 1</div><div class="q-mark">???</div></div>
              <div id="s0-c1-a" class="chip-face"><div class="en">choc·o·late</div><div class="ko">초콜릿</div></div>
            </div>
            <div id="s0-c2" class="word-chip">
              <div id="s0-c2-q" class="chip-face"><div class="q-label">단어 2</div><div class="q-mark">???</div></div>
              <div id="s0-c2-a" class="chip-face"><div class="en">cam·e·ra</div><div class="ko">카메라</div></div>
            </div>
            <div id="s0-c3" class="word-chip">
              <div id="s0-c3-q" class="chip-face"><div class="q-label">단어 3</div><div class="q-mark">???</div></div>
              <div id="s0-c3-a" class="chip-face"><div class="en">steak</div><div class="ko">스테이크</div></div>
            </div>
          </div>
          <div id="s0-sub" class="s0-sub">우리가 평소에 쓰는 발음이랑 영어 소리가 아예 다르게 생겨서 그래요</div>
        </div>
        <div></div>
      </div>
    </div>
  </section>

  <!-- TRACK 1: Scene 01 — Before Blind 3-Sentence Listening Test -->
  <section id="s1" class="clip scene" data-start="${S['scene-01'].start}" data-duration="${sceneDur(1)}" data-track-index="1">
    <div id="s1-in" class="scene-inner bg-overlay">
      <div class="scrim-dark-center"></div>
      <div class="stage">
        <div class="top-bar">
          <div class="eyebrow eyebrow-vermilion">BEFORE · 자막 OFF 귀 테스트</div>
          <div class="chapter-tag light">오늘 나올 일곱 단어 포함</div>
        </div>
        <div class="blind-center">
          <div class="blind-head-wrap">
            <div id="s1-head-a" class="blind-headline">자막 끄고 딱 세 문장만 들어 보세요</div>
            <div id="s1-head-b" class="blind-headline">지금 몇 단어쯤 들리셨나요?</div>
          </div>
          <div class="eq-box" id="s1-eq">${eqBarsHtml('s1')}</div>
          <div class="sent-pills">
            <div id="s1-p1" class="sent-pill">문장 1</div>
            <div id="s1-p2" class="sent-pill">문장 2</div>
            <div id="s1-p3" class="sent-pill">문장 3</div>
          </div>
          <div id="s1-note" class="blind-note">영상 끝무렵에 속도 그대로 다시 틀어 드릴게요</div>
        </div>
        <div></div>
      </div>
    </div>
  </section>

  <!-- TRACK 1: Scene 02 — Deep Dive 1: chocolate & camera -->
  <section id="s2" class="clip scene" data-start="${S['scene-02'].start}" data-duration="${sceneDur(2)}" data-track-index="1">
    <div id="s2-in" class="scene-inner bg-ivory">
      <div class="paper-grain"></div>
      <div class="stage">
        <div class="top-bar">
          <div class="eyebrow eyebrow-vermilion">원리 1 / 3 · 가운데 약한 글자 빠짐</div>
          <div class="chapter-tag">choc·o·late · cam·e·ra</div>
        </div>
        <div class="split-grid">
          <div class="photo-plate">
            <img id="s2-photo" data-layout-allow-overflow src="assets/images/panel-01.png" alt="초콜릿과 카메라">
            <div class="photo-caption">일상에서 매일 쓰는 두 단어</div>
          </div>
          <div class="teach-stack">
            <div id="s2-choc" class="word-panel">
              <div class="big-word">choc<span class="dot">·</span><span class="drop">o<span id="s2-choc-slash" class="slash-line"></span></span><span class="dot">·</span>late</div>
              <div class="syllable-row">
                <div class="syl-box">초</div>
                <div id="s2-choc-mid" class="syl-box">콜</div>
                <div class="syl-box">릿</div>
              </div>
              <div id="s2-choc-native" class="native-banner">
                <div class="kr">초클릿</div>
                <div class="ipa">/ˈtʃɑːk.lət/</div>
                <div class="beats">딱 두 박자</div>
              </div>
              <div class="rule-tag">앞에 힘 → 가운데 '콜' 탈락</div>
            </div>
            <div id="s2-cam" class="word-panel">
              <div class="big-word">cam<span class="dot">·</span><span class="drop">e<span id="s2-cam-slash" class="slash-line"></span></span><span class="dot">·</span>ra</div>
              <div class="syllable-row">
                <div class="syl-box">카</div>
                <div id="s2-cam-mid" class="syl-box">메</div>
                <div class="syl-box">라</div>
              </div>
              <div id="s2-cam-native" class="native-banner">
                <div class="kr">캠러</div>
                <div class="ipa">/ˈkæm.rə/</div>
                <div class="beats">딱 두 박자</div>
              </div>
              <div class="rule-tag">가운데 '메' 탈락 → 앞뒤 결합</div>
            </div>
          </div>
        </div>
        <div></div>
      </div>
    </div>
  </section>

  <!-- TRACK 1: Scene 03 — Deep Dive 2: comfortable (Editorial Armchair + Clear 3-Beat Phonetics) -->
  <section id="s3" class="clip scene" data-start="${S['scene-03'].start}" data-duration="${sceneDur(3)}" data-track-index="1">
    <div id="s3-in" class="scene-inner bg-ivory">
      <div class="paper-grain"></div>
      <div class="stage">
        <div class="top-bar">
          <div class="eyebrow eyebrow-vermilion">원리 1 / 3 · 미드 단골 단어</div>
          <div class="chapter-tag">com·for·ta·ble · 가운데 '-or-' 탈락</div>
        </div>
        <div class="s3-grid">
          <div class="s3-left">
            <div class="s3-rails">
              <div id="s3-t1" class="rail-tile"><div class="en">com</div><div class="ko">컴</div></div>
              <div id="s3-t2" class="rail-tile drop-tile"><div class="en">f<span class="or-del">or</span></div><div class="ko">ㅍ만 남음</div></div>
              <div id="s3-t3" class="rail-tile"><div class="en">ta</div><div class="ko">터</div></div>
              <div id="s3-t4" class="rail-tile"><div class="en">ble</div><div class="ko">블</div></div>
            </div>
            <div id="s3-res" class="s3-result">
              <div class="kr">컴프터블</div>
              <div class="ipa">/ˈkʌmf.tɚ.bəl/</div>
              <div class="beats">영어 3박자</div>
            </div>
            <div id="s3-rule" class="rule-tag">앞에 힘이 들어가면 바로 뒤 모음은 빠집니다</div>
          </div>
          <div class="photo-plate">
            <img id="s3-photo" data-layout-allow-overflow src="${s3PhotoSrc}" alt="편안한 의자">
            <div class="photo-caption" style="translate: 47.431px -35px">미드 단골 · 편안한 의자</div>
          </div>
        </div>
        <div></div>
      </div>
    </div>
  </section>

  <!-- TRACK 1: Scene 04 — Short Rhythmic Chapter Pivot -->
  <section id="s4" class="clip scene" data-start="${S['scene-04'].start}" data-duration="${sceneDur(4)}" data-track-index="1">
    <div id="s4-in" class="scene-inner bg-dark">
      <div class="stage">
        <div class="top-bar">
          <div class="eyebrow eyebrow-light">방향 전환</div>
          <div class="chapter-tag light">빠지는 소리 → 늘어난 소리</div>
        </div>
        <div class="pivot-center">
          <div class="pivot-row">
            <div id="s4-left" class="pivot-card pivot-done">
              <div class="num">원리 1 완료</div>
              <div class="head">가운데가 빠지는 소리</div>
              <div class="desc">초클릿 · 캠러 · 컴프터블</div>
            </div>
            <div id="s4-arrow" class="pivot-arrow">→</div>
            <div id="s4-right" class="pivot-card pivot-next">
              <div class="num">원리 2 시작</div>
              <div class="head">억지로 늘린 소리</div>
              <div class="desc">자음 뒤 '으'가 없는 한 박자</div>
            </div>
          </div>
          <div id="s4-cta" class="pivot-cta">소리 먼저 하나 들어 보실래요?</div>
        </div>
        <div></div>
      </div>
    </div>
  </section>

  <!-- TRACK 1: Scene 05 — Sound-First Quiz -> Steak Vivid Skillet Compression -->
  <section id="s5" class="clip scene" data-start="${S['scene-05'].start}" data-duration="${sceneDur(5)}" data-track-index="1">
    <div id="s5-in" class="scene-inner bg-overlay">
      <div id="s5-blind" class="s5-phase s5-blind-bg">
        <div class="top-bar">
          <div class="eyebrow eyebrow-amber">소리 먼저 퀴즈</div>
          <div class="chapter-tag light">소리로 먼저 맞혀 보세요</div>
        </div>
        <div class="blind-center">
          <div class="blind-headline">방금 들린 단어, 무슨 단어일까요?</div>
          <div class="eq-box" id="s5-eq">${eqBarsHtml('s5')}</div>
          <div class="blind-note">잠깐 떠올려 보세요</div>
        </div>
        <div></div>
      </div>
      <div id="s5-reveal" class="s5-phase">
        <div class="scrim-steak-left"></div>
        <div class="stage" style="padding:0">
          <div class="top-bar">
            <div class="eyebrow eyebrow-amber">원리 2 / 3 · 한글 '으' 빼고 한 박자</div>
            <div class="chapter-tag light">네 박자 → 한 박자 압축</div>
          </div>
          <div class="s5-reveal-wrap">
            <div class="hydraulic-row">
              <div id="s5-b1" class="h-block ghost-eu">스</div>
              <div id="s5-b2" class="h-block">테</div>
              <div id="s5-b3" class="h-block">이</div>
              <div id="s5-b4" class="h-block ghost-eu">크</div>
            </div>
            <div id="s5-final" class="steak-final">
              <div class="en">steak</div>
              <div class="kr">스테익</div>
              <div class="ipa">/steɪk/ · 딱 한 박자</div>
            </div>
            <div id="s5-air" class="airflow-box">
              <div class="air-pill">앞 S : 바람만 쓰-</div>
              <div class="air-pill">끝 K : 입안에서 툭 막고 끝</div>
            </div>
          </div>
          <div></div>
        </div>
      </div>
    </div>
  </section>

  <!-- TRACK 1: Scene 06 — Origin Contrast: allergy (peach) & vitamin (bottle) -->
  <section id="s6" class="clip scene" data-start="${S['scene-06'].start}" data-duration="${sceneDur(6)}" data-track-index="1">
    <div id="s6-in" class="scene-inner bg-ivory">
      <div class="paper-grain"></div>
      <div class="stage">
        <div class="top-bar">
          <div class="eyebrow eyebrow-teal">원리 3 / 3 · 다른 언어에서 온 발음</div>
          <div class="chapter-tag">al·ler·gy · vi·ta·min</div>
        </div>
        <div class="origin-grid">
          <div class="origin-stage">
            <div id="s6-allergy" class="origin-panel">
              <div class="big-word">al<span class="dot">·</span>ler<span class="dot">·</span>gy</div>
              <div class="vs-cards">
                <div class="vs-box vs-old">
                  <div class="vs-label">독일어 유입 발음</div>
                  <div class="vs-word">알레르기</div>
                  <div class="vs-ipa">알 · 레 · 르 · 기</div>
                </div>
                <div class="vs-box vs-new">
                  <div id="s6-allergy-q" class="vs-face">
                    <div class="vs-label">원어민 실제 소리</div>
                    <div class="vs-word" style="color:var(--amber)">???</div>
                    <div class="vs-ipa">들어 볼까요?</div>
                  </div>
                  <div id="s6-allergy-new" class="vs-face">
                    <div class="vs-label">원어민 실제 소리</div>
                    <div class="vs-word">앨러지</div>
                    <div class="vs-ipa">/ˈæl.ɚ.dʒi/</div>
                  </div>
                </div>
              </div>
            </div>
            <div id="s6-vitamin" class="origin-panel">
              <div class="big-word">vi<span class="dot">·</span>ta<span class="dot">·</span>min</div>
              <div class="vs-cards">
                <div class="vs-box vs-old">
                  <div class="vs-label">한국 · 영국식 표기</div>
                  <div class="vs-word">비타민</div>
                  <div class="vs-ipa">비 · 타 · 민</div>
                </div>
                <div class="vs-box vs-new">
                  <div id="s6-vitamin-q" class="vs-face">
                    <div class="vs-label">미국 일상 실음성</div>
                    <div class="vs-word" style="color:var(--amber)">???</div>
                    <div class="vs-ipa">첫 글자부터 바뀝니다</div>
                  </div>
                  <div id="s6-vitamin-new" class="vs-face">
                    <div class="vs-label">미국 일상 실음성</div>
                    <div class="vs-word">바이러민</div>
                    <div class="vs-ipa">/ˈvaɪ.t̬ə.mɪn/</div>
                    <div class="vs-ex">Take your vitamin</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div class="photo-plate">
            <img id="s6-photo-peach" data-layout-allow-overflow src="${s6PeachSrc}" alt="복숭아">
            <img id="s6-photo-vit" data-layout-allow-overflow src="assets/images/thumb-b-v2-bg.jpg" style="object-position: 86% center" alt="비타민 병">
            <div id="s6-cap-peach" class="photo-caption" style="translate: 40.631px -19px">복숭아 알레르기</div>
            <div id="s6-cap-vit" class="photo-caption" style="translate: 54.314px -19px">약국·일상 속 비타민</div>
          </div>
        </div>
        <div></div>
      </div>
    </div>
  </section>

  <!-- TRACK 1: Scene 07 — Surprise Quiz: buffet (Idle ? -> 2s Countdown -> Full Teal Ring!) -->
  <section id="s7" class="clip scene" data-start="${S['scene-07'].start}" data-duration="${sceneDur(7)}" data-track-index="1">
    <div id="s7-in" class="scene-inner bg-overlay">
      <div class="scrim-dark-full"></div>
      <div class="stage">
        <div class="top-bar">
          <div class="eyebrow eyebrow-amber">원리 3 / 3 · 마지막 깜짝 퀴즈</div>
          <div class="chapter-tag light">프랑스어 유입 → 미국 실음성</div>
        </div>
        <div class="s7-card">
          <div class="s7-top-row">
            <div>
              <div class="s7-word">buf<span class="dot">·</span>fet</div>
              <div class="s7-origin">프랑스어에서 온 '뷔페', 미국 원어민은 어떻게 읽을까요?</div>
            </div>
            <div id="s7-timer" class="timer-wrap">
              <svg viewBox="0 0 180 180">
                <circle cx="90" cy="90" r="78" fill="none" stroke="rgba(247,244,237,0.18)" stroke-width="12"></circle>
                <circle id="s7-ring" cx="90" cy="90" r="78" fill="none" stroke="#E8A838" stroke-width="12" stroke-linecap="round" stroke-dasharray="490" stroke-dashoffset="0" transform="rotate(-90 90 90)"></circle>
                <circle id="s7-ring-done" cx="90" cy="90" r="78" fill="none" stroke="#18A999" stroke-width="12" stroke-linecap="round" transform="rotate(-90 90 90)"></circle>
              </svg>
              <div id="s7-tq" class="timer-text">?</div>
              <div id="s7-t2" class="timer-text">2초</div>
              <div id="s7-t1" class="timer-text">1초</div>
              <div id="s7-tok" class="timer-text done">정답!</div>
            </div>
          </div>
          <div id="s7-reveal" class="s7-reveal">
            <div class="kr">버페이</div>
            <div class="ipa">/bəˈfeɪ/</div>
            <div class="tip">뒤의 '페이'에 강세</div>
          </div>
        </div>
        <div></div>
      </div>
    </div>
  </section>

  <!-- TRACK 1: Scene 08 — After Blind Re-Listening (Cool Teal Grade, Viewer-Centric Label) -->
  <section id="s8" class="clip scene" data-start="${S['scene-08'].start}" data-duration="${sceneDur(8)}" data-track-index="1">
    <div id="s8-in" class="scene-inner bg-overlay">
      <div class="scrim-dark-center"></div>
      <div class="stage">
        <div class="top-bar">
          <div class="eyebrow eyebrow-teal">AFTER · 자막 OFF 재청취</div>
          <div class="chapter-tag light">원어민 속도 그대로 다시 듣기</div>
        </div>
        <div class="blind-center">
          <div class="blind-headline">속도 그대로, 아까보다 몇 단어 더 들리세요?</div>
          <div class="eq-box teal" id="s8-eq">${eqBarsHtml('s8')}</div>
          <div class="sent-pills">
            <div id="s8-p1" class="sent-pill">문장 1</div>
            <div id="s8-p2" class="sent-pill">문장 2</div>
            <div id="s8-p3" class="sent-pill">문장 3</div>
          </div>
          <div class="blind-note">귀에 걸리는 단어를 직접 세어 보세요</div>
        </div>
        <div></div>
      </div>
    </div>
  </section>

  <!-- TRACK 1: Scene 09 — Subtitle ON 7-Word Highlight Proof -->
  <section id="s9" class="clip scene" data-start="${S['scene-09'].start}" data-duration="${sceneDur(9)}" data-track-index="1">
    <div id="s9-in" class="scene-inner bg-dark">
      <div class="stage">
        <div class="top-bar">
          <div class="eyebrow eyebrow-teal">자막 ON 정답 확인</div>
          <div class="chapter-tag light">오늘의 일곱 단어 전부 확인</div>
        </div>
        <div class="proof-list">
          <div id="s9-c1" class="proof-card">
            <div class="proof-en">1. Grab your <span id="hl-cam" class="hl">cam·e·ra</span> — this <span id="hl-choc" class="hl">choc·o·late</span> is great, and this chair is so <span id="hl-comf" class="hl">com·for·ta·ble</span>.</div>
            <div class="proof-ko-row">
              <div class="proof-chip">캠러</div>
              <div class="proof-chip">초클릿</div>
              <div class="proof-chip">컴프터블</div>
            </div>
          </div>
          <div id="s9-c2" class="proof-card">
            <div class="proof-en">2. We ordered a <span id="hl-steak" class="hl">steak</span> at the hotel.</div>
            <div class="proof-ko-row">
              <div class="proof-chip">스테익 (한 박자)</div>
            </div>
          </div>
          <div id="s9-c3" class="proof-card">
            <div class="proof-en">3. Check the <span id="hl-buf" class="hl">buf·fet</span> for your <span id="hl-allergy" class="hl">al·ler·gy</span>, and take your <span id="hl-vit" class="hl">vi·ta·min</span>.</div>
            <div class="proof-ko-row">
              <div class="proof-chip">버페이</div>
              <div class="proof-chip">앨러지</div>
              <div class="proof-chip">바이러민</div>
            </div>
          </div>
        </div>
        <div></div>
      </div>
    </div>
  </section>

  <!-- TRACK 1: Scene 10 — Balanced 7-Word Cheat Sheet -> Final 9s YouTube End Screen -->
  <section id="s10" data-hold class="clip scene" data-start="${S['scene-10'].start}" data-duration="${sceneDur(10)}" data-track-index="1">
    <div id="s10-in" class="scene-inner bg-ivory">
      <div class="paper-grain"></div>
      <div id="s10-summary" class="s10-summary">
        <div class="top-bar">
          <div class="eyebrow eyebrow-dark">오늘의 일곱 단어 한 장 요약</div>
          <div class="eyebrow eyebrow-subtle">잠깐 멈추고 캡처해 두세요</div>
        </div>
        <div class="sheet-grid">
          <div id="s10-g1" class="sheet-col">
            <div class="sheet-col-head head-v">1. 가운데 빠짐 (3)</div>
            <div class="cheat-item"><div class="w">choc·o·late</div><div class="pair"><span class="old">초콜릿</span><span>→</span><span class="new">초클릿</span></div><div class="ipa">/ˈtʃɑːk.lət/</div></div>
            <div class="cheat-item"><div class="w">cam·e·ra</div><div class="pair"><span class="old">카메라</span><span>→</span><span class="new">캠러</span></div><div class="ipa">/ˈkæm.rə/</div></div>
            <div class="cheat-item"><div class="w">com·for·ta·ble</div><div class="pair"><span class="old">컴퍼터블</span><span>→</span><span class="new">컴프터블</span></div><div class="ipa">/ˈkʌmf.tɚ.bəl/</div></div>
          </div>
          <div id="s10-g2" class="sheet-col" style="justify-content:space-between">
            <div class="sheet-col-head head-a">2. '으' 빼고 한 박자 (1)</div>
            <div class="cheat-item"><div class="w">steak</div><div class="pair"><span class="old">스테이크</span><span>→</span><span class="new">스테익</span></div><div class="ipa">/steɪk/ · 숨 한 번</div></div>
            <div class="cheat-item" style="background:var(--ivory-card);border-color:var(--amber)">
              <div class="w" style="font-size:34px;color:#9A6408">숨 한 번 포인트</div>
              <div class="ipa" style="color:var(--ink);font-size:34px;line-height:1.38">앞 S는 바람만 쓰-</div>
              <div class="ipa" style="color:var(--ink);font-size:34px;line-height:1.38">끝 K는 입안에서 툭 막음</div>
            </div>
            <div class="cheat-item" style="background:var(--amber-soft);border-color:var(--amber)">
              <div class="w" style="font-size:34px">핵심 감각</div>
              <div class="ipa" style="color:var(--ink);font-size:34px;line-height:1.35">우리말 네 글자를 영어는 숨 한 번에 묶어 말합니다</div>
            </div>
          </div>
          <div id="s10-g3" class="sheet-col">
            <div class="sheet-col-head head-t">3. 유입 경로 반전 (3)</div>
            <div class="cheat-item"><div class="w">al·ler·gy</div><div class="pair"><span class="old">알레르기</span><span>→</span><span class="new">앨러지</span></div><div class="ipa">/ˈæl.ɚ.dʒi/</div></div>
            <div class="cheat-item"><div class="w">vi·ta·min</div><div class="pair"><span class="old">비타민</span><span>→</span><span class="new">바이러민</span></div><div class="ipa">/ˈvaɪ.t̬ə.mɪn/</div></div>
            <div class="cheat-item"><div class="w">buf·fet</div><div class="pair"><span class="old">뷔페</span><span>→</span><span class="new">버페이</span></div><div class="ipa">/bəˈfeɪ/</div></div>
          </div>
        </div>
        <div></div>
      </div>
      <!-- Final 9.0s YouTube End Screen Safe Frame: Center/Bottom/Right 100% Empty -->
      <div id="s10-endscreen" data-hold class="s10-endscreen">
        <div id="es-brand" class="brand-wordmark"><span class="w1">이해하면 </span><span class="w2">쉬운영어</span></div>
        <div id="es-sub" class="endscreen-sub">다음 추천 영상에서 이어서 확인해 보세요</div>
      </div>
    </div>
  </section>

  <!-- TRACK 3: Lower-Third Korean Subtitles (Monotonic Whisper-synced 48px single-line pills) -->
  ${captionClips.map((c, i) => `<div id="cap-${i}" class="clip caption-wrap" data-start="${c.start}" data-duration="${c.dur}" data-track-index="3"><div class="caption-pill">${esc(c.text)}</div></div>`).join('\n  ')}

  <!-- TRACKS 4-7: BGM (7% carved) + KO Voice + EN Native Voice + SFX & Smooth Full-Scene Foley -->
  ${audioTags.join('\n  ')}

</div>

<script>
const T = ${JSON.stringify(S)};
const EN_ONSETS = ${JSON.stringify(EN_WORD_ONSETS)};
const XFADE = ${XFADE};
gsap.set('#s6-photo-vit', { x: 2.62, y: -4.036 });
const tl = gsap.timeline({ paused: true });
const endScreenStart = T['scene-10'].events.endscreen.globalStart;

tl.fromTo('#progress-bar', { scaleX: 0 }, { scaleX: 1, duration: endScreenStart, ease: 'none' }, 0);
tl.to('#progress-wrap', { opacity: 0, duration: 0.45, ease: 'power2.out' }, endScreenStart - 0.3);

// 0.25s smooth crossfade on ALL 10 scene boundaries (rule-tiers.md #34: no hard cuts!)
for (let idx = 0; idx < 11; idx++) {
  const sc = T['scene-' + String(idx).padStart(2, '0')];
  const inner = '#s' + idx + '-in';
  if (idx > 0) {
    tl.fromTo(inner, { opacity: 0 }, { opacity: 1, duration: XFADE, ease: 'power1.inOut' }, sc.start);
  }
  if (idx < 10) {
    tl.to(inner, { opacity: 0, duration: XFADE, ease: 'power1.inOut' }, sc.end);
  }
}

function pulseEq(selector, start, dur) {
  const bars = gsap.utils.toArray(selector);
  const steps = Math.max(4, Math.floor(dur / 0.16));
  for (let s = 0; s < steps; s++) {
    const t = start + s * 0.16;
    bars.forEach((bar, i) => {
      const wave = 0.30 + 0.70 * Math.abs(Math.sin((s + 1) * 0.85 + i * 0.55));
      tl.to(bar, { scaleY: wave, duration: 0.14, ease: 'sine.inOut' }, t);
    });
  }
  tl.to(bars, { scaleY: 0.26, duration: 0.25, ease: 'power2.out' }, start + dur);
}

function bounceWord(selector, t) {
  tl.to(selector, { backgroundColor: '#E8A838', color: '#17140A', duration: 0.16, ease: 'power2.out' }, t);
  tl.to(selector, { backgroundColor: '#18A999', color: '#06221F', duration: 0.30, ease: 'power2.out' }, t + 0.32);
}

// --- SCENE 00: 3-word Hook (Title visible at t=0, no split line, exact Whisper reveals) ---
{
  const s = T['scene-00'];
  const c00Start = s.events.c00.globalStart;
  tl.fromTo('#vid-s0-img', { scale: 1.0 }, { scale: 1.08, duration: s.duration, ease: 'none' }, s.start);
  tl.set(['#s0-c1-a', '#s0-c2-a', '#s0-c3-a'], { opacity: 0, y: 14 }, s.start);
  tl.set('#s0-sub', { opacity: 0, y: 16 }, s.start);
  tl.fromTo('#s0-c1', { opacity: 0, y: 20, scale: 0.94 }, { opacity: 1, y: 0, scale: 1, duration: 0.32, ease: 'back.out(1.6)' }, s.events['hook-choc'].globalStart);
  tl.fromTo('#s0-c2', { opacity: 0, y: 20, scale: 0.94 }, { opacity: 1, y: 0, scale: 1, duration: 0.32, ease: 'back.out(1.6)' }, s.events['hook-cam'].globalStart);
  tl.fromTo('#s0-c3', { opacity: 0, y: 20, scale: 0.94 }, { opacity: 1, y: 0, scale: 1, duration: 0.32, ease: 'back.out(1.6)' }, s.events['hook-steak'].globalStart);
  const reveals = [
    {q: '#s0-c1-q', a: '#s0-c1-a', t: c00Start + 3.16},
    {q: '#s0-c2-q', a: '#s0-c2-a', t: c00Start + 4.37},
    {q: '#s0-c3-q', a: '#s0-c3-a', t: c00Start + 5.31},
  ];
  for (const rv of reveals) {
    tl.to(rv.q, { opacity: 0, y: -14, duration: 0.22, ease: 'power2.in' }, rv.t);
    tl.to(rv.a, { opacity: 1, y: 0, duration: 0.28, ease: 'back.out(1.5)' }, rv.t + 0.08);
  }
  tl.to('#s0-sub', { opacity: 1, y: 0, duration: 0.45, ease: 'power2.out' }, c00Start + ${c00SubLocal});
}

// --- SCENE 01: Before Blind Listening (Clean idle EQ + Headline swap on c01b!) ---
{
  const s = T['scene-01'];
  tl.set('.s1-bar', { scaleY: 0.26 }, s.start);
  tl.set(['#s1-head-b', '#s1-note'], { opacity: 0 }, s.start);
  const pills = [
    {el: '#s1-p1', ev: s.events['before-s1']},
    {el: '#s1-p2', ev: s.events['before-s2']},
    {el: '#s1-p3', ev: s.events['before-s3']},
  ];
  for (const p of pills) {
    pulseEq('.s1-bar', p.ev.globalStart, p.ev.dur);
    tl.to(p.el, { backgroundColor: '#E8A838', borderColor: '#E8A838', color: '#17140A', scale: 1.06, duration: 0.2 }, p.ev.globalStart);
    tl.to(p.el, { backgroundColor: 'rgba(247,244,237,0.10)', borderColor: 'rgba(247,244,237,0.22)', color: 'rgba(247,244,237,0.72)', scale: 1.0, duration: 0.25 }, p.ev.globalStart + p.ev.dur);
  }
  tl.to('#s1-head-a', { opacity: 0, y: -12, duration: 0.3 }, s.events.c01b.globalStart);
  tl.to('#s1-head-b', { opacity: 1, y: 0, duration: 0.35 }, s.events.c01b.globalStart + 0.15);
  tl.to('#s1-note', { opacity: 1, duration: 0.45 }, s.events.c01b.globalStart + 0.3);
}

// --- SCENE 02: chocolate & camera ---
{
  const s = T['scene-02'];
  tl.fromTo('#s2-photo', { scale: 1.0 }, { scale: 1.07, duration: s.duration, ease: 'none' }, s.start);
  tl.set('#s2-cam', { opacity: 0, y: 24 }, s.start);
  tl.set('#s2-choc-slash', { scaleX: 0 }, s.start);
  tl.set('#s2-cam-slash', { scaleX: 0 }, s.start);
  tl.set('#s2-choc-native', { opacity: 0, y: 18 }, s.start);
  tl.set('#s2-cam-native', { opacity: 0, y: 18 }, s.start);

  const chocT = s.events['choc-1'].globalStart;
  tl.to('#s2-choc-slash', { scaleX: 1, rotation: -12, duration: 0.28, ease: 'power3.out' }, chocT - 0.12);
  tl.to('#s2-choc-mid', { backgroundColor: 'rgba(217,66,53,0.14)', borderColor: '#D94235', color: '#D94235', opacity: 0.52, duration: 0.28 }, chocT - 0.12);
  tl.to('#s2-choc-native', { opacity: 1, y: 0, duration: 0.42, ease: 'back.out(1.4)' }, chocT);

  const camSwitch = s.events.c02b.globalStart + ${c02bCamLocal};
  tl.to('#s2-choc', { opacity: 0, y: -20, duration: 0.35, ease: 'power2.in' }, camSwitch);
  tl.to('#s2-cam', { opacity: 1, y: 0, duration: 0.42, ease: 'power3.out' }, camSwitch + 0.18);

  const camT = s.events['cam-1'].globalStart;
  tl.to('#s2-cam-slash', { scaleX: 1, rotation: -12, duration: 0.28, ease: 'power3.out' }, camT - 0.12);
  tl.to('#s2-cam-mid', { backgroundColor: 'rgba(217,66,53,0.14)', borderColor: '#D94235', color: '#D94235', opacity: 0.52, duration: 0.28 }, camT - 0.12);
  tl.to('#s2-cam-native', { opacity: 1, y: 0, duration: 0.42, ease: 'back.out(1.4)' }, camT);
}

// --- SCENE 03: comfortable (Editorial Armchair + Clear 3-Beat Phonetics, ZERO tiny scale!) ---
{
  const s = T['scene-03'];
  tl.fromTo('#s3-photo', { scale: 1.0 }, { scale: 1.07, duration: s.duration, ease: 'none' }, s.start);
  tl.fromTo(['#s3-t1', '#s3-t2', '#s3-t3', '#s3-t4'], { opacity: 0, y: 20 }, { opacity: 1, y: 0, stagger: 0.10, duration: 0.40, ease: 'power3.out' }, s.start + 0.18);
  tl.set(['#s3-res', '#s3-rule'], { opacity: 0, y: 18 }, s.start);
  const hit = s.events['comf-1'].globalStart;
  tl.to('#s3-t2', { opacity: 0.65, y: -10, duration: 0.34, ease: 'power2.out' }, hit - 0.12);
  tl.to('#s3-res', { opacity: 1, y: 0, duration: 0.45, ease: 'back.out(1.4)' }, hit);
  tl.to('#s3-rule', { opacity: 1, y: 0, duration: 0.45, ease: 'power2.out' }, s.events.c03b.globalStart + s.events.c03b.dur * 0.42);
}

// --- SCENE 04: Chapter Pivot (Whisper-exact spoiler-free reveals!) ---
{
  const s = T['scene-04'];
  const c04Start = s.events.c04.globalStart;
  tl.set(['#s4-arrow', '#s4-right', '#s4-cta'], { opacity: 0, y: 18 }, s.start);
  tl.fromTo('#s4-left', { opacity: 0, x: -24 }, { opacity: 1, x: 0, duration: 0.42, ease: 'power3.out' }, s.start + 0.15);
  tl.to('#s4-arrow', { opacity: 1, y: 0, duration: 0.30 }, c04Start + ${c04RightLocal});
  tl.to('#s4-right', { opacity: 1, y: 0, duration: 0.42, ease: 'power3.out' }, c04Start + ${c04RightLocal} + 0.12);
  tl.to('#s4-cta', { opacity: 1, y: 0, duration: 0.42, ease: 'power2.out' }, c04Start + ${c04CtaLocal});
}

// --- SCENE 05: Steak Blind -> Vivid Dark-Split Skillet Compression ---
{
  const s = T['scene-05'];
  const blindEv = s.events['steak-blind'];
  const revT = s.events.c05a.globalStart;
  tl.set('.s5-bar', { scaleY: 0.26 }, s.start);
  tl.set('#s5-reveal', { opacity: 0 }, s.start);
  pulseEq('.s5-bar', blindEv.globalStart, blindEv.dur);
  tl.to('#s5-blind', { opacity: 0, duration: 0.35, ease: 'power2.inOut' }, revT);
  tl.to('#s5-reveal', { opacity: 1, duration: 0.4, ease: 'power2.out' }, revT + 0.1);
  tl.set(['#s5-final', '#s5-air'], { opacity: 0, y: 20 }, s.start);
  tl.fromTo(['#s5-b1', '#s5-b2', '#s5-b3', '#s5-b4'], { opacity: 0, y: 18 }, { opacity: 1, y: 0, stagger: 0.08, duration: 0.32 }, revT + 0.25);

  const hit = s.events['steak-1'].globalStart;
  tl.to(['#s5-b1', '#s5-b4'], { y: -12, opacity: 0.42, duration: 0.32, ease: 'power3.out' }, hit - 0.14);
  tl.to('#s5-final', { opacity: 1, y: 0, duration: 0.42, ease: 'back.out(1.6)' }, hit);
  tl.to('#s5-air', { opacity: 1, y: 0, duration: 0.45, ease: 'power2.out' }, s.events.c05b.globalStart + s.events.c05b.dur * 0.35);
}

// --- SCENE 06: allergy (peach photo) -> vitamin (bottle photo), Mystery ??? -> Reveal ---
{
  const s = T['scene-06'];
  tl.fromTo('#s6-photo-peach', { scale: 1.0 }, { scale: 1.06, duration: s.duration * 0.5, ease: 'none' }, s.start);
  tl.fromTo('#s6-photo-vit', { scale: 1.0 }, { scale: 1.06, duration: s.duration * 0.5, ease: 'none' }, s.events.c06b.globalStart + ${c06bVitLocal});
  tl.set(['#s6-vitamin', '#s6-photo-vit', '#s6-cap-vit', '#s6-allergy-new', '#s6-vitamin-new'], { opacity: 0 }, s.start);

  const alT = s.events['allergy-1'].globalStart;
  tl.to('#s6-allergy-q', { opacity: 0, duration: 0.22 }, alT - 0.06);
  tl.to('#s6-allergy-new', { opacity: 1, duration: 0.36, ease: 'power2.out' }, alT);

  const vitSwitch = s.events.c06b.globalStart + ${c06bVitLocal};
  tl.to(['#s6-allergy', '#s6-photo-peach', '#s6-cap-peach'], { opacity: 0, duration: 0.35 }, vitSwitch);
  tl.to(['#s6-vitamin', '#s6-photo-vit', '#s6-cap-vit'], { opacity: 1, duration: 0.42, ease: 'power2.out' }, vitSwitch + 0.18);

  const vitT = s.events['vitamin-1'].globalStart;
  tl.to('#s6-vitamin-q', { opacity: 0, duration: 0.22 }, vitT - 0.06);
  tl.to('#s6-vitamin-new', { opacity: 1, duration: 0.36, ease: 'power2.out' }, vitT);
}

// --- SCENE 07: buffet (Idle ? -> 2s -> 1s -> Full Teal Ring 정답!) ---
{
  const s = T['scene-07'];
  const win = s.events['buffet-window'];
  const hit = s.events['buffet-1'].globalStart;
  tl.fromTo('#vid-s7-img', { scale: 1.0 }, { scale: 1.08, duration: s.duration, ease: 'none' }, s.start);
  tl.set(['#s7-reveal', '#s7-t2', '#s7-t1', '#s7-tok', '#s7-ring-done'], { opacity: 0 }, s.start);
  tl.set('#s7-ring', { strokeDashoffset: 0 }, s.start);

  tl.to('#s7-tq', { opacity: 0, duration: 0.12 }, win.globalStart - 0.06);
  tl.to('#s7-t2', { opacity: 1, duration: 0.14 }, win.globalStart);
  tl.to('#s7-ring', { strokeDashoffset: 490, duration: win.dur, ease: 'none' }, win.globalStart);
  tl.to('#s7-t2', { opacity: 0, duration: 0.12 }, win.globalStart + 0.95);
  tl.to('#s7-t1', { opacity: 1, duration: 0.14 }, win.globalStart + 1.0);
  tl.to('#s7-t1', { opacity: 0, duration: 0.12 }, hit - 0.06);
  tl.to(['#s7-tok', '#s7-ring-done'], { opacity: 1, duration: 0.24, ease: 'power2.out' }, hit);
  tl.to('#s7-reveal', { opacity: 1, y: 0, duration: 0.45, ease: 'back.out(1.5)' }, hit);
}

// --- SCENE 08: After Blind Re-Listening (Clean idle EQ + Cool Teal Cafe Video) ---
{
  const s = T['scene-08'];
  tl.set('.s8-bar', { scaleY: 0.26 }, s.start);
  const pills = [
    {el: '#s8-p1', ev: s.events['after-s1']},
    {el: '#s8-p2', ev: s.events['after-s2']},
    {el: '#s8-p3', ev: s.events['after-s3']},
  ];
  for (const p of pills) {
    pulseEq('.s8-bar', p.ev.globalStart, p.ev.dur);
    tl.to(p.el, { backgroundColor: '#18A999', borderColor: '#18A999', color: '#06221F', scale: 1.06, duration: 0.2 }, p.ev.globalStart);
    tl.to(p.el, { backgroundColor: 'rgba(247,244,237,0.10)', borderColor: 'rgba(247,244,237,0.22)', color: 'rgba(247,244,237,0.72)', scale: 1.0, duration: 0.25 }, p.ev.globalStart + p.ev.dur);
  }
}

// --- SCENE 09: Subtitle ON 7-Word Highlight + Exact Whisper Word Flash ---
{
  const s = T['scene-09'];
  tl.set(['#s9-c1', '#s9-c2', '#s9-c3'], { opacity: 0.60 }, s.start);
  const s1T = s.events['check-s1'].globalStart;
  const s2T = s.events['check-s2'].globalStart;
  const s3T = s.events['check-s3'].globalStart;
  tl.to('#s9-c1', { opacity: 1, borderColor: '#18A999', backgroundColor: 'rgba(24,169,153,0.14)', duration: 0.35 }, s1T);
  bounceWord('#hl-cam', s1T + EN_ONSETS.s1_cam);
  bounceWord('#hl-choc', s1T + EN_ONSETS.s1_choc);
  bounceWord('#hl-comf', s1T + EN_ONSETS.s1_comf);

  tl.to('#s9-c2', { opacity: 1, borderColor: '#18A999', backgroundColor: 'rgba(24,169,153,0.14)', duration: 0.35 }, s2T);
  bounceWord('#hl-steak', s2T + EN_ONSETS.s2_steak);

  tl.to('#s9-c3', { opacity: 1, borderColor: '#18A999', backgroundColor: 'rgba(24,169,153,0.14)', duration: 0.35 }, s3T);
  bounceWord('#hl-buf', s3T + EN_ONSETS.s3_buf);
  bounceWord('#hl-allergy', s3T + EN_ONSETS.s3_allergy);
  bounceWord('#hl-vit', s3T + EN_ONSETS.s3_vit);
}

// --- SCENE 10: 7-Word One-Page Summary -> Clean 9s YouTube End Screen ---
{
  const s = T['scene-10'];
  const esT = s.events.endscreen.globalStart;
  tl.set('#s10-endscreen', { opacity: 0 }, s.start);
  tl.set('#es-sub', { opacity: 0, y: 10 }, s.start);
  tl.fromTo(['#s10-g1', '#s10-g2', '#s10-g3'], { opacity: 0, y: 20 }, { opacity: 1, y: 0, stagger: 0.14, duration: 0.45, ease: 'power3.out' }, s.start + 0.15);
  tl.to('#s10-summary', { opacity: 0, y: -16, duration: 0.55, ease: 'power2.inOut' }, esT - 0.35);
  tl.to('#s10-endscreen', { opacity: 1, duration: 0.55, ease: 'power2.out' }, esT - 0.1);
  tl.to('#es-sub', { opacity: 1, y: 0, duration: 0.8, ease: 'power2.out' }, esT + 0.35);
}

window.__timelines['${COMP_ID}'] = tl;
</script>
</body>
</html>
`;

const outPath = join(EP_DIR, 'index.html');
writeFileSync(outPath, html, 'utf8');
console.log(`BUILT: ${outPath} (${TOTAL_DUR}s, 11 crossfaded scenes, ${captionClips.length} monotonic Whisper captions, ${audioTags.length} audio tracks)`);
