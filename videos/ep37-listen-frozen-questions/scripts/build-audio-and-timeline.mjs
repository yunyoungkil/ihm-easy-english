// EP37 실측 오디오(영어 77개 + 한국어 161개 + 신호음 3종 + 배경음 2종)로
// 0.001초 단위 실측 타임라인(assets/timeline.json), 마스터 오디오(assets/audio/master-audio.m4a/.wav),
// 한국어 자막(subtitles-ko.srt)을 한 번에 생성한다.
// 사용: node videos/ep37-listen-frozen-questions/scripts/build-audio-and-timeline.mjs
import {execFileSync, spawnSync} from 'node:child_process';
import {existsSync, mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const EP_DIR = resolve(HERE, '..');
const ASSETS = join(EP_DIR, 'assets');
const AUDIO_OUT = join(ASSETS, 'audio');
mkdirSync(AUDIO_OUT, {recursive: true});

const SR = 24000;

function readWavPcm(filePath) {
  const buf = readFileSync(filePath);
  let off = 12;
  let sr = SR;
  let dataStart = 44;
  let dataSize = buf.length - 44;
  while (off + 8 <= buf.length) {
    const id = buf.toString('ascii', off, off + 4);
    const sz = buf.readUInt32LE(off + 4);
    if (id === 'fmt ') sr = buf.readUInt32LE(off + 12);
    if (id === 'data') { dataStart = off + 8; dataSize = sz; break; }
    off += 8 + sz + (sz % 2);
  }
  if (sr !== SR) throw new Error(`샘플레이트 불일치(${sr}Hz): ${filePath}`);
  const count = Math.floor(dataSize / 2);
  const out = new Float32Array(count);
  for (let i = 0; i < count; i += 1) {
    out[i] = buf.readInt16LE(dataStart + i * 2) / 32768;
  }
  return out;
}

function writeWavFromFloat(filePath, samples) {
  const pcm = Buffer.alloc(samples.length * 2);
  for (let i = 0; i < samples.length; i += 1) {
    const v = Math.max(-1, Math.min(1, samples[i]));
    pcm.writeInt16LE(Math.round(v * 32767), i * 2);
  }
  const header = Buffer.alloc(44);
  header.write('RIFF', 0, 'ascii');
  header.writeUInt32LE(36 + pcm.length, 4);
  header.write('WAVE', 8, 'ascii');
  header.write('fmt ', 12, 'ascii');
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22);
  header.writeUInt32LE(SR, 24);
  header.writeUInt32LE(SR * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write('data', 36, 'ascii');
  header.writeUInt32LE(pcm.length, 40);
  writeFileSync(filePath, Buffer.concat([header, pcm]));
}

function ensureMono24k(srcPath, cachePath) {
  if (!existsSync(cachePath)) {
    mkdirSync(dirname(cachePath), {recursive: true});
    execFileSync('ffmpeg', ['-y', '-v', 'error', '-i', srcPath, '-ar', String(SR), '-ac', '1', '-c:a', 'pcm_s16le', cachePath]);
  }
  return readWavPcm(cachePath);
}

// 1. 실측 오디오 파일 전부 로드
const enAudit = JSON.parse(readFileSync(join(ASSETS, 'en-audit-data.json'), 'utf8'));
const koAudit = JSON.parse(readFileSync(join(ASSETS, 'ko-audit-data.json'), 'utf8'));
const enMeta = Object.fromEntries(enAudit.items.map((x) => [x.id, x]));
const koMeta = Object.fromEntries(koAudit.items.map((x) => [x.id, x]));

const pcmCache = new Map();
const getEnPcm = (id) => {
  if (!pcmCache.has(`en:${id}`)) pcmCache.set(`en:${id}`, readWavPcm(join(ASSETS, 'voice-en-clean', `${id}.wav`)));
  return pcmCache.get(`en:${id}`);
};
const getKoPcm = (id) => {
  if (!pcmCache.has(`ko:${id}`)) pcmCache.set(`ko:${id}`, readWavPcm(join(ASSETS, 'voice-ko-clean', `${id}.wav`)));
  return pcmCache.get(`ko:${id}`);
};
const sfxMap = {
  띵: ensureMono24k(join(ASSETS, 'sfx', 'ding.wav'), join(AUDIO_OUT, '_sfx_ding_24k.wav')),
  뽁: ensureMono24k(join(ASSETS, 'sfx', 'pop.wav'), join(AUDIO_OUT, '_sfx_pop_24k.wav')),
  종: ensureMono24k(join(ASSETS, 'sfx', 'gong.wav'), join(AUDIO_OUT, '_sfx_gong_24k.wav')),
};
const bgmStinger = ensureMono24k(join(ASSETS, 'bgm', 'chapter-stinger.wav'), join(AUDIO_OUT, '_bgm_stinger_24k.wav'));
const bgmEndBed = ensureMono24k(join(ASSETS, 'bgm', 'end-screen-bed.wav'), join(AUDIO_OUT, '_bgm_end_24k.wav'));

// 2. QUESTIONS-DRAFT.md에서 문항별 들을 곳(소리 포인트) 파싱
const qDraft = readFileSync(join(EP_DIR, 'QUESTIONS-DRAFT.md'), 'utf8');
const qInfo = {};
for (const m of qDraft.matchAll(/^\| (q\d\d) \|[^|]*\| ([DQE]) \| ([^|]+)\| ([^|]+)\| ([^|]+)\|/gm)) {
  qInfo[m[1]] = {id: m[1], style: m[2].trim(), q: m[3].trim(), a: m[4].trim(), clue: m[5].trim()};
}

// 3. SCRIPT.md 파싱 → 0.001초 실측 타임라인 구축
const md = readFileSync(join(EP_DIR, 'SCRIPT.md'), 'utf8');
const qKoMeaning = {};
for (const m of md.matchAll(/^\| (\d\d) \| ([^|]+)\| ([^|]+)\| ([^|]+)\|/gm)) {
  qKoMeaning[`q${m[1]}`] = m[3].trim();
  if (qInfo[`q${m[1]}`]) qInfo[`q${m[1]}`].ko = m[3].trim();
}
const enTexts = {};
for (const it of enAudit.items) enTexts[it.id] = it.expected;

const GAP = 0.28; // 조각 사이 자연스러운 숨(초)
let t = 0;
let koIdx = 0;
let part2 = 0;
let started = false;
let inText = false;
let buf = [];
let curCh = 0;
let curSection = '';

const marks = [];   // {t, level, title}
const events = [];  // {t, end, kind: 'ko'|'en'|'sfx'|'bgm', id, text, gain, section, chapter, hiddenEn}
const items = [];   // estimate-timeline 호환용 {t, ko?, en?, text?}
const subtitles = []; // {start, end, text}

const pushBgm = (startSec, pcm, gain, fadeInSec, fadeOutSec, tag) => {
  events.push({
    t: +startSec.toFixed(3),
    end: +(startSec + pcm.length / SR).toFixed(3),
    kind: 'bgm',
    id: tag,
    pcm,
    gain,
    fadeInSec,
    fadeOutSec,
  });
};

const addKo = (id, text) => {
  const pcm = getKoPcm(id);
  const dur = pcm.length / SR;
  const start = t;
  const end = t + dur;
  events.push({t: +start.toFixed(3), end: +end.toFixed(3), kind: 'ko', id, text, pcm, gain: 1.0, section: curSection, chapter: curCh});
  items.push({t: +start.toFixed(3), ko: text});
  subtitles.push({start, end, text});
  t = end + GAP;
  return {start, end, dur};
};

const addEn = (id, {hiddenEn = false, subText = null, afterGap = GAP} = {}) => {
  const pcm = getEnPcm(id);
  const dur = pcm.length / SR;
  const start = t;
  const end = t + dur;
  const txt = enTexts[id] || id;
  events.push({t: +start.toFixed(3), end: +end.toFixed(3), kind: 'en', id, text: txt, pcm, gain: 1.0, section: curSection, chapter: curCh, hiddenEn});
  items.push({t: +start.toFixed(3), en: id, text: txt});
  if (hiddenEn) {
    subtitles.push({start, end, text: '(귀로만 들어 보세요)'});
  } else {
    subtitles.push({start, end, text: subText || txt});
  }
  t = end + afterGap;
  return {start, end, dur};
};

const addSfx = (name, afterGap = 0.25) => {
  const pcm = sfxMap[name];
  const dur = pcm.length / SR;
  const start = t;
  const end = t + dur;
  events.push({t: +start.toFixed(3), end: +end.toFixed(3), kind: 'sfx', id: name, pcm, gain: name === '종' ? 0.85 : 0.9, section: curSection, chapter: curCh});
  t = end + afterGap;
  return {start, end, dur};
};

const lines = md.split(/\r?\n/);
let qPlayCount = {}; // 문항별 q 재생 횟수 추적 (첫 듣기만 hiddenEn=true)

for (const raw of lines) {
  const line = raw.trim();
  if (!started) {
    if (line === '## 여는 장') {
      started = true;
      curSection = '여는 장';
      marks.push({t: 0, level: 2, title: '여는 장'});
    }
    continue;
  }
  if (inText) {
    if (line.startsWith('```')) {
      const text = buf.join(' ').replace(/\s+/g, ' ').trim();
      if (text) {
        koIdx += 1;
        const id = `k${String(koIdx).padStart(3, '0')}`;
        addKo(id, text);
      }
      inText = false;
      buf = [];
    } else {
      buf.push(line);
    }
    continue;
  }
  if (line.startsWith('```text')) { inText = true; continue; }

  const h = line.match(/^(##|###) (.+)$/);
  if (h) {
    const level = h[1].length;
    const title = h[2].trim();
    marks.push({t: +t.toFixed(3), level, title});
    curSection = title;
    const chM = title.match(/^(\d)장/);
    if (level === 2 && chM) curCh = Number(chM[1]);
    else if (level === 2 && title.startsWith('1부 정리')) curCh = 0;
    else if (level === 2 && title.startsWith('2부')) curCh = 0;
    else if (level === 2 && title === '끝') curCh = 0;

    if (title.startsWith('2부 1회차')) part2 = 1;
    else if (title.startsWith('2부 2회차')) part2 = 2;
    else if (level === 2 && !title.startsWith('2부')) part2 = 0;
    continue;
  }

  // 2부 1회차 표 행 (듣고 뜻을 떠올릴 여유를 위해 질문 뒤 2.2초, 대답 뒤 1.6초)
  if (part2 === 1 && /^\| \d\d \|/.test(line)) {
    const n = line.slice(2, 4);
    const ko = (line.split('|')[3] || '').trim();
    const qId = `q${n}`;
    const aId = `a${n}`;
    const mId = `m${n}`;
    addEn(qId, {hiddenEn: false, subText: `${enTexts[qId]}`, afterGap: 2.2});
    addKo(mId, ko);
    addEn(aId, {hiddenEn: false, subText: `${enTexts[aId]}`, afterGap: 1.6});
    if (['06', '12', '18', '24'].includes(n)) addSfx('종', 0.35);
    continue;
  }

  // 2부 2회차 영어만 (질문 뒤 1.45초, 대답 뒤 1.55초 — 자연스러운 몰아 듣기 호흡)
  if (part2 === 2 && line.startsWith('- [음성] q01 → a01')) {
    for (let i = 1; i <= 30; i += 1) {
      const n = String(i).padStart(2, '0');
      addEn(`q${n}`, {hiddenEn: false, afterGap: 1.45});
      addEn(`a${n}`, {hiddenEn: false, afterGap: 1.55});
      if (i % 6 === 0 && i < 30) addSfx('종', 0.35);
    }
    continue;
  }

  if (!line.startsWith('-')) continue;

  // 이어 듣기 루프
  const loop = line.match(/× q(\d\d)~q(\d\d)/);
  if (loop) {
    const withA = line.includes('[음성] a');
    for (let i = Number(loop[1]); i <= Number(loop[2]); i += 1) {
      const n = String(i).padStart(2, '0');
      const qRes = addEn(`q${n}`, {hiddenEn: false, subText: `${enTexts[`q${n}`]} (${qKoMeaning[`q${n}`] || ''})`, afterGap: 0.15});
      addSfx('뽁', qRes.dur + 1.0); // 질문 길이 + 1초 따라 말하기 틈
      if (withA) addEn(`a${n}`, {hiddenEn: false, afterGap: 0.55});
    }
    continue;
  }

  // 일반 지시 줄: 토큰을 등장 순서대로 처리 ([신호], [음성], [정적])
  const tokens = [...line.matchAll(/\[신호\] (띵|뽁|종)|\[음성\] ([qadx]\d\d)|\[정적\] (\d+(?:\.\d+)?)초/g)];
  for (let ti = 0; ti < tokens.length; ti += 1) {
    const tk = tokens[ti];
    if (tk[1]) {
      const sigName = tk[1];
      const seg = addSfx(sigName, sigName === '종' ? 0.35 : 0.22);
      // 장 바뀜(종) 직후 1~5장·1부 정리·2부 진입에는 은은한 피아노 스팅어(말소리 아래 안 깔리게 짧게 3.2초 페이드아웃)
      if (sigName === '종' && curSection !== '00-B 듣는 법 — 신호음 세 가지' && curSection !== '끝') {
        pushBgm(seg.start + 0.15, bgmStinger.slice(0, Math.round(3.6 * SR)), 0.14, 0.2, 1.8, 'chapter-stinger');
      }
    } else if (tk[2]) {
      const id = tk[2];
      // 다음 토큰이 [정적]이면 기본 afterGap 대신 그 정적 사용
      const nextIsPause = tokens[ti + 1] && tokens[ti + 1][3];
      const gap = nextIsPause ? 0.05 : GAP;
      let isFirstEar = false;
      if (id.startsWith('q')) {
        // 00-A 첫 30초의 q01과 각 문항의 첫 번째 재생만 hiddenEn=true (단, q01은 00-A + q01 첫 듣기 모두 첫 듣기 파형!)
        if (curSection.startsWith('00-A')) {
          isFirstEar = true;
        } else {
          qPlayCount[id] = (qPlayCount[id] || 0) + 1;
          if (qPlayCount[id] === 1) isFirstEar = true;
        }
      }
      addEn(id, {hiddenEn: isFirstEar, afterGap: gap});
    } else if (tk[3]) {
      t += Number(tk[3]);
    }
  }
}

// 엔드 화면 9초 + 배경음 베드
const endScreenStart = t;
const endScreenDur = 9.0;
pushBgm(endScreenStart, bgmEndBed.slice(0, Math.min(bgmEndBed.length, Math.round(endScreenDur * SR))), 0.22, 0.8, 2.0, 'end-screen-bed');
t += endScreenDur;

const totalSeconds = +t.toFixed(3);
const totalSamples = Math.ceil((totalSeconds + 0.2) * SR);
console.log(`타임라인 계산 완료: 총 ${totalSeconds.toFixed(2)}초 (${Math.floor(totalSeconds / 60)}분 ${Math.round(totalSeconds % 60)}초), 이벤트 ${events.length}개, 자막 ${subtitles.length}블록`);

// 4. 전체 마스터 오디오 24kHz 모노 PCM 믹스
const TIMELINE_ONLY = process.argv.includes('--timeline-only');
const rawMasterWav = join(AUDIO_OUT, 'master-raw.wav');
const masterWav = join(AUDIO_OUT, 'master-audio.wav');
const masterM4a = join(AUDIO_OUT, 'master-audio.m4a');
let meanDb = null;
let maxDb = null;

if (TIMELINE_ONLY && existsSync(masterM4a)) {
  const prevTlPath = join(ASSETS, 'timeline.json');
  if (existsSync(prevTlPath)) {
    const prevTl = JSON.parse(readFileSync(prevTlPath, 'utf8'));
    meanDb = prevTl.masterMeanDb != null ? String(prevTl.masterMeanDb) : null;
    maxDb = prevTl.masterMaxDb != null ? String(prevTl.masterMaxDb) : null;
  }
  console.log(`--timeline-only: 기존 마스터 오디오 재사용 (${masterM4a}, mean=${meanDb}dB, max=${maxDb}dB)`);
} else {
  const mix = new Float32Array(totalSamples);
  for (const ev of events) {
    const startIdx = Math.max(0, Math.round(ev.t * SR));
    const pcm = ev.pcm;
    const gain = ev.gain ?? 1.0;
    const fi = Math.round((ev.fadeInSec || 0) * SR);
    const fo = Math.round((ev.fadeOutSec || 0) * SR);
    const len = pcm.length;
    for (let i = 0; i < len && startIdx + i < totalSamples; i += 1) {
      let env = 1.0;
      if (fi > 0 && i < fi) env *= i / fi;
      if (fo > 0 && i > len - fo) env *= (len - i) / fo;
      mix[startIdx + i] += pcm[i] * gain * env;
    }
  }

  // 소프트 리미터(피크 클리핑 방지)
  let peak = 0;
  for (let i = 0; i < mix.length; i += 1) {
    const a = Math.abs(mix[i]);
    if (a > peak) peak = a;
  }
  if (peak > 0.96) {
    const scale = 0.95 / peak;
    for (let i = 0; i < mix.length; i += 1) mix[i] *= scale;
  }

  writeWavFromFloat(rawMasterWav, mix);

  // 최종 -16 LUFS 정규화 + AAC 192kbps M4A 인코딩
  execFileSync('ffmpeg', [
    '-y', '-v', 'error', '-i', rawMasterWav,
    '-af', 'loudnorm=I=-16:TP=-1.5:LRA=11',
    '-ar', '48000', '-ac', '2', '-c:a', 'pcm_s16le', masterWav,
  ]);
  execFileSync('ffmpeg', [
    '-y', '-v', 'error', '-i', masterWav,
    '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', masterM4a,
  ]);

  // 음량 실측 검증
  const volRes = spawnSync('ffmpeg', ['-i', masterM4a, '-af', 'volumedetect', '-f', 'null', '-'], {encoding: 'utf8'});
  const volTxt = `${volRes.stdout || ''}\n${volRes.stderr || ''}`;
  meanDb = volTxt.match(/mean_volume:\s*([-\d.]+)\s*dB/)?.[1];
  maxDb = volTxt.match(/max_volume:\s*([-\d.]+)\s*dB/)?.[1];
  console.log(`마스터 오디오 완성: ${masterM4a} (mean=${meanDb}dB, max=${maxDb}dB)`);
}

// 5. 한국어 자막 subtitles-ko.srt 생성 (긴 나레이션은 문장 단위로 38자 안팎 자동 분할)
const fmtSrt = (sec) => {
  const ms = Math.round(sec * 1000);
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  const r = ms % 1000;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')},${String(r).padStart(3, '0')}`;
};

const srtBlocks = [];
for (const sub of subtitles) {
  const txt = sub.text.trim();
  if (!txt) continue;
  // 문장 부호로 나누어 블록 길이에 비례해 시각 배분
  const parts = txt.split(/(?<=[.?!])\s+/).map((x) => x.trim()).filter(Boolean);
  if (parts.length <= 1 || txt.length <= 42) {
    srtBlocks.push({start: sub.start, end: sub.end, text: txt});
  } else {
    // 너무 짧은 조각 합치기
    const merged = [];
    for (const p of parts) {
      if (merged.length && merged.at(-1).length + p.length <= 42) merged[merged.length - 1] += ` ${p}`;
      else merged.push(p);
    }
    const totalLen = merged.reduce((a, x) => a + x.length, 0) || 1;
    let cur = sub.start;
    const span = sub.end - sub.start;
    for (const seg of merged) {
      const d = span * (seg.length / totalLen);
      srtBlocks.push({start: cur, end: cur + d, text: seg});
      cur += d;
    }
  }
}
const srtText = srtBlocks.map((b, i) => `${i + 1}\n${fmtSrt(b.start)} --> ${fmtSrt(b.end)}\n${b.text}\n`).join('\n');
writeFileSync(join(EP_DIR, 'subtitles-ko.srt'), srtText, 'utf8');
console.log(`자막 생성 완료: subtitles-ko.srt (${srtBlocks.length}블록)`);

// Whisper 실측 자막 정렬 데이터(있으면 우선 사용, 없으면 글자 수 비례 폴백)
const alignPath = join(ASSETS, 'ko-caption-align.json');
const alignChunks = existsSync(alignPath) ? (JSON.parse(readFileSync(alignPath, 'utf8')).chunks || {}) : {};
let alignedUsed = 0;

// 화면 내장용 1부·여닫기 한국어 해설 자막 블록 (2부 1회차 m01~m30은 카드에 직접 표시하므로 제외)
const koCaptions = [];
for (const ev of events) {
  if (ev.kind !== 'ko' || !ev.id.startsWith('k')) continue;
  const txt = ev.text.trim();
  if (!txt) continue;
  if (Array.isArray(alignChunks[ev.id]) && alignChunks[ev.id].length) {
    alignedUsed += 1;
    for (const seg of alignChunks[ev.id]) {
      koCaptions.push({
        start: +(ev.t + seg.start).toFixed(3),
        end: +(ev.t + seg.end).toFixed(3),
        id: ev.id,
        text: seg.text,
      });
    }
    continue;
  }
  const parts = txt.split(/(?<=[.?!])\s+/).map((x) => x.trim()).filter(Boolean);
  const segs = [];
  for (const p of parts) {
    if (p.length <= 40) {
      segs.push(p);
    } else {
      // 긴 문장은 쉼표나 중앙 공백에서 2조각으로 자연 분할
      const commaIdx = p.indexOf(',', Math.floor(p.length * 0.32));
      const cutAt = commaIdx > 0 && commaIdx < p.length * 0.72
        ? commaIdx + 1
        : p.indexOf(' ', Math.floor(p.length * 0.48));
      if (cutAt > 0) {
        segs.push(p.slice(0, cutAt).trim());
        segs.push(p.slice(cutAt).trim());
      } else {
        segs.push(p);
      }
    }
  }
  const totalLen = segs.reduce((a, x) => a + x.length, 0) || 1;
  let cur = ev.t;
  const span = ev.end - ev.t;
  for (const seg of segs) {
    const d = span * (seg.length / totalLen);
    koCaptions.push({start: +cur.toFixed(3), end: +(cur + d).toFixed(3), id: ev.id, text: seg});
    cur += d;
  }
}
console.log(`화면 내장 자막 생성: ${koCaptions.length}블록 (Whisper 정밀 정렬 ${alignedUsed}덩어리 반영)`);

// 6. timeline.json 저장 (PCM 버퍼 제외)
const timelineOut = {
  generatedAt: new Date().toISOString(),
  measured: true,
  totalSeconds,
  endScreenStart: +endScreenStart.toFixed(3),
  masterAudio: 'assets/audio/master-audio.m4a',
  masterMeanDb: meanDb ? Number(meanDb) : null,
  masterMaxDb: maxDb ? Number(maxDb) : null,
  marks,
  items,
  qInfo,
  koCaptions,
  events: events.map(({pcm, ...rest}) => rest),
};
writeFileSync(join(ASSETS, 'timeline.json'), JSON.stringify(timelineOut, null, 2) + '\n', 'utf8');
console.log(`타임라인 저장 완료: assets/timeline.json`);
