import {execFileSync, spawnSync} from 'node:child_process';
import {existsSync, mkdirSync, writeFileSync} from 'node:fs';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const EP_DIR = join(HERE, '..');
const ASSETS = join(EP_DIR, 'assets');

const KO_FILES = [
  {id: 'c00', text: "버튼, 원어민은 '트'를 안 읽습니다."},
  {id: 'c01', text: '티 뒤에 엔이 오면 코로 넘깁니다.'},
  {id: 'c02', text: '첫째, 버튼.'},
  {id: 'c03', text: '입을 막고 코로 뺍니다.'},
  {id: 'c04', text: '둘째, 커튼.'},
  {id: 'c05', text: '트 없이 코로 넘깁니다.'},
  {id: 'c06', text: '셋째, 마운틴.'},
  {id: 'c07', text: '티가 쏙 숨어 버리죠.'},
  {id: 'c09', text: '마지막, 직접 말해 보세요!'},
  {id: 'c10', text: '임포턴트 대신 이렇게요.'},
  {id: 'c11', text: '보너스 네 단어는 고정 댓글에 있어요.'},
];

const EN_FILES = [
  {id: 'button', phrase: 'button [ˈbʌʔn̩]'},
  {id: 'curtain', phrase: 'curtain [ˈkɝːʔn̩]'},
  {id: 'mountain', phrase: 'mountain [ˈmaʊnʔn̩]'},
  {id: 'important', phrase: 'important [ɪmˈpɔːrʔn̩]'},
];

const CLEAN_FILTER =
  'silenceremove=start_periods=1:start_threshold=-45dB:detection=peak,' +
  'areverse,' +
  'silenceremove=start_periods=1:start_threshold=-45dB:detection=peak,' +
  'areverse,' +
  'loudnorm=I=-16:TP=-1.5:LRA=11';

function probe(file) {
  const raw = execFileSync(
    'ffprobe',
    ['-v', 'error', '-show_entries', 'stream=sample_rate,channels,codec_name', '-show_entries', 'format=duration', '-of', 'json', file],
    {encoding: 'utf8'},
  );
  const data = JSON.parse(raw);
  const st = data.streams?.[0] ?? {};
  return {
    duration: +Number(data.format.duration).toFixed(3),
    sampleRate: Number(st.sample_rate),
    channels: Number(st.channels),
    codec: st.codec_name,
  };
}

function measureVolume(file) {
  const r = spawnSync('ffmpeg', ['-i', file, '-af', 'volumedetect', '-f', 'null', '-'], {encoding: 'utf8'});
  const txt = `${r.stdout || ''}\n${r.stderr || ''}`;
  const mean = txt.match(/mean_volume:\s*([-\d.]+)\s*dB/)?.[1];
  const max = txt.match(/max_volume:\s*([-\d.]+)\s*dB/)?.[1];
  return {
    meanDb: mean !== undefined ? Number(mean) : null,
    maxDb: max !== undefined ? Number(max) : null,
  };
}

function cleanWav(src, dst) {
  mkdirSync(dirname(dst), {recursive: true});
  execFileSync('ffmpeg', ['-y', '-v', 'error', '-i', src, '-af', CLEAN_FILTER, '-ar', '24000', '-ac', '1', '-c:a', 'pcm_s16le', dst]);
}

mkdirSync(join(ASSETS, 'voice-clean'), {recursive: true});
mkdirSync(join(ASSETS, 'voice-en-clean'), {recursive: true});

const koAudit = [];
const voiceMap = {};
for (const item of KO_FILES) {
  const src = join(ASSETS, 'voice', `${item.id}.wav`);
  const dst = join(ASSETS, 'voice-clean', `${item.id}.wav`);
  if (!existsSync(src)) throw new Error(`Missing raw voice: ${src}`);
  cleanWav(src, dst);
  const rawProbe = probe(src);
  const cleanProbe = probe(dst);
  const vol = measureVolume(dst);
  koAudit.push({...item, rawDur: rawProbe.duration, ...cleanProbe, ...vol});
  voiceMap[item.id] = {file: `assets/voice-clean/${item.id}.wav`, duration: cleanProbe.duration};
}

const enAudit = [];
const voiceEnMap = {};
for (const item of EN_FILES) {
  const src = join(ASSETS, 'voice-en', `${item.id}.wav`);
  const dst = join(ASSETS, 'voice-en-clean', `${item.id}.wav`);
  if (!existsSync(src)) throw new Error(`Missing raw voice-en: ${src}`);
  cleanWav(src, dst);
  const rawProbe = probe(src);
  const cleanProbe = probe(dst);
  const vol = measureVolume(dst);
  enAudit.push({...item, rawDur: rawProbe.duration, ...cleanProbe, ...vol});
  voiceEnMap[item.id] = {file: `assets/voice-en-clean/${item.id}.wav`, duration: cleanProbe.duration};
}

const sfxNames = ['breath-lock', 'gate-tick', 'stamp-pass'];
const sfxMap = {};
for (const name of sfxNames) {
  const p = join(ASSETS, 'sfx', `${name}.wav`);
  sfxMap[name] = {file: `assets/sfx/${name}.wav`, ...probe(p), ...measureVolume(p)};
}

const bgmPath = join(ASSETS, 'bgm', 'track.mp3');
const bgmProbe = probe(bgmPath);
const bgmVol = measureVolume(bgmPath);

const dKo = (id) => voiceMap[id].duration;
const dEn = (id) => voiceEnMap[id].duration;

const SHEET_CUTS = [
  {cut: 0, sheetT: 0.0, sheetDur: 3.6, ko: 'c00', en: [], sfx: null, window: 0},
  {cut: 1, sheetT: 3.6, sheetDur: 3.8, ko: 'c01', en: [], sfx: null, window: 0},
  {cut: 2, sheetT: 7.4, sheetDur: 2.8, ko: 'c02', en: ['button'], sfx: null, window: 0},
  {cut: 3, sheetT: 10.2, sheetDur: 3.9, ko: 'c03', en: ['button'], sfx: 'breath-lock', window: 0},
  {cut: 4, sheetT: 14.1, sheetDur: 2.8, ko: 'c04', en: ['curtain'], sfx: null, window: 0},
  {cut: 5, sheetT: 16.9, sheetDur: 3.9, ko: 'c05', en: ['curtain'], sfx: 'breath-lock', window: 0},
  {cut: 6, sheetT: 20.8, sheetDur: 2.9, ko: 'c06', en: ['mountain'], sfx: null, window: 0},
  {cut: 7, sheetT: 23.7, sheetDur: 3.8, ko: 'c07', en: ['mountain'], sfx: 'breath-lock', window: 0},
  {cut: 8, sheetT: 27.5, sheetDur: 3.8, ko: null, en: ['button', 'curtain', 'mountain'], sfx: null, window: 0},
  {cut: 9, sheetT: 31.3, sheetDur: 5.3, ko: 'c09', en: [], sfx: 'gate-tick', window: 1.5},
  {cut: 10, sheetT: 36.6, sheetDur: 3.8, ko: 'c10', en: ['important'], sfx: 'stamp-pass', window: 0},
  {cut: 11, sheetT: 40.4, sheetDur: 3.6, ko: 'c11', en: [], sfx: null, window: 0},
];

let cursor = 0;
const cuts = [];
for (const c of SHEET_CUTS) {
  const lead = 0.12;
  const tail = c.cut === 11 ? 0.55 : 0.26;
  let offset = lead;
  let koOffset = null;
  let sfxEntry = null;
  const enOffsets = [];

  if (c.cut === 10 && c.sfx === 'stamp-pass') {
    sfxEntry = {id: c.sfx, offset: 0.05, duration: sfxMap[c.sfx].duration};
    offset = 0.36;
  }

  if (c.ko) {
    koOffset = +offset.toFixed(3);
    offset += dKo(c.ko);
  }

  if (c.sfx === 'breath-lock') {
    offset += 0.12;
    sfxEntry = {id: c.sfx, offset: +offset.toFixed(3), duration: sfxMap[c.sfx].duration};
    offset += sfxMap[c.sfx].duration + 0.05;
  } else if (c.sfx === 'gate-tick') {
    offset += 0.18;
    sfxEntry = {id: c.sfx, offset: +offset.toFixed(3), duration: sfxMap[c.sfx].duration};
  } else if (c.ko && c.en.length > 0) {
    offset += 0.18;
  }

  for (let i = 0; i < c.en.length; i += 1) {
    const enId = c.en[i];
    if (i > 0) offset += 0.36;
    enOffsets.push({id: enId, offset: +offset.toFixed(3), duration: dEn(enId)});
    offset += dEn(enId);
  }

  if (c.window > 0) {
    offset += c.window;
  }

  const audioEnd = offset;
  let minDur = audioEnd + tail;
  if (c.cut === 0) minDur = Math.max(3.2, minDur);
  if (c.cut === 1) minDur = Math.max(3.2, minDur);
  if (c.cut === 8) minDur = Math.max(2.9, minDur);
  if (c.cut === 11) minDur = Math.max(3.6, minDur);
  const duration = +minDur.toFixed(3);
  const start = +cursor.toFixed(3);
  cursor += duration;

  cuts.push({
    cut: c.cut,
    t: start,
    duration,
    sheetT: c.sheetT,
    sheetDuration: c.sheetDur,
    ko: c.ko ? {id: c.ko, offset: koOffset, duration: dKo(c.ko)} : null,
    sfx: sfxEntry,
    en: enOffsets,
    window: c.window,
    audioBudget: +audioEnd.toFixed(3),
  });
}

const totalDuration = +cursor.toFixed(3);
const timings = {
  measuredAt: new Date().toISOString(),
  totalSuggestedDuration: totalDuration,
  voice: voiceMap,
  voiceEn: voiceEnMap,
  sfx: sfxMap,
  bgm: {
    track: {
      file: 'assets/bgm/track.mp3',
      duration: bgmProbe.duration,
      sampleRate: bgmProbe.sampleRate,
      channels: bgmProbe.channels,
      source: 'public/audio/BGM 35/12.Get Outside! - Jason Farnham.mp3',
      ...bgmVol,
    },
  },
  cuts,
};

writeFileSync(join(ASSETS, 'audio-timings.json'), JSON.stringify(timings, null, 2) + '\n');

const koRows = koAudit
  .map((x) => `| \`voice-clean/${x.id}.wav\` | ${x.text} | ${x.rawDur.toFixed(3)} | **${x.duration.toFixed(3)}** | ${x.sampleRate} Hz | ${x.channels} | ${x.meanDb} | ${x.maxDb} |`)
  .join('\n');
const enRows = enAudit
  .map((x) => `| \`voice-en-clean/${x.id}.wav\` | \`${x.phrase}\` | ${x.rawDur.toFixed(3)} | **${x.duration.toFixed(3)}** | ${x.sampleRate} Hz | ${x.channels} | ${x.meanDb} | ${x.maxDb} |`)
  .join('\n');
const sfxRows = sfxNames
  .map((name) => {
    const s = sfxMap[name];
    return `| \`sfx/${name}.wav\` | **${s.duration.toFixed(3)}** | ${s.sampleRate} Hz | ${s.channels} | ${s.meanDb} | ${s.maxDb} |`;
  })
  .join('\n');
const cutRows = cuts
  .map((c) => {
    const koStr = c.ko ? `${c.ko.duration.toFixed(3)}s (\`${c.ko.id}\` @+${c.ko.offset}s)` : '-';
    const sfxStr = c.sfx ? `\`${c.sfx.id}\` ${c.sfx.duration.toFixed(3)}s (@+${c.sfx.offset}s)` : '-';
    const enStr = c.en.length ? c.en.map((e) => `${e.duration.toFixed(3)}s (\`${e.id}\` @+${e.offset}s)`).join(' + ') : '-';
    return `| ${c.cut} | ${c.sheetT.toFixed(1)}s (${c.sheetDuration.toFixed(1)}s) | **${c.t.toFixed(3)}s** | **${c.duration.toFixed(3)}s** | ${koStr} | ${sfxStr} | ${enStr} | ${c.window.toFixed(1)}s |`;
  })
  .join('\n');

const auditMd = `# AUDIO-AUDIT — ep33-shorts-swallowed-t

측정일: ${new Date().toISOString().slice(0, 10)}
클린업 기준: \`ffmpeg -af "${CLEAN_FILTER}" -ar 24000 -ac 1 -c:a pcm_s16le\` (앞뒤 무음 -45dB 트림 + -16 LUFS 라우드니스 정규화)

---

## 1. 클린 오디오 전수 실측 (한국어 11 + 원어민 4 + SFX 3 + BGM 1)

### A. 한국어 나레이션 11컷 (\`assets/voice-clean/\`, 화자: \`Gero\`)

| 파일 | 대본 | 원본 길이 (초) | 클린 길이 (초) | 샘플레이트 | 채널 | mean_volume (dB) | max_volume (dB) |
|---|---|---:|---:|---:|---:|---:|---:|
${koRows}

### B. 원어민 영어 발음 4개 (\`assets/voice-en-clean/\`, 화자: \`Olin\`)

| 파일 | 표현 | 원본 길이 (초) | 클린 길이 (초) | 샘플레이트 | 채널 | mean_volume (dB) | max_volume (dB) |
|---|---|---:|---:|---:|---:|---:|---:|
${enRows}

### C. 커스텀 SFX 3종 & BGM

| 파일 | 길이 (초) | 샘플레이트 | 채널 | mean_volume (dB) | max_volume (dB) |
|---|---:|---:|---:|---:|---:|
${sfxRows}
| \`bgm/track.mp3\` | **${bgmProbe.duration.toFixed(3)}** | ${bgmProbe.sampleRate} Hz | ${bgmProbe.channels} | ${bgmVol.meanDb} | ${bgmVol.maxDb} |

---

## 2. 컷별 실측 기반 타임라인 (\`assets/audio-timings.json\`)

시트 원안 총 길이: **44.000초** → 클린 음원 실측 기준 총 길이: **${totalDuration.toFixed(3)}초** (음원 겹침 0건).

| 컷 | 시트 시작 (길이) | 확정 시작(t) | 확정 길이 | 한국어 (\`Gero\`) | SFX | 원어민 (\`Olin\`) | 말하기 창 |
|---:|---|---:|---:|---|---|---|---:|
${cutRows}
`;

writeFileSync(join(ASSETS, 'AUDIO-AUDIT.md'), auditMd);
console.log(`AUDIT COMPLETE: totalDuration=${totalDuration}s, ko=${koAudit.length}, en=${enAudit.length}`);
