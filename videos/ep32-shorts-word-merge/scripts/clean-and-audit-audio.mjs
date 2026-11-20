import {execFileSync, spawnSync} from 'node:child_process';
import {existsSync, mkdirSync, writeFileSync} from 'node:fs';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const EP_DIR = join(HERE, '..');
const ASSETS = join(EP_DIR, 'assets');

const KO_FILES = [
  {id: 'c00', text: '분명 아는 단어인데, 왜 안 들릴까요?'},
  {id: 'c01', text: '입이 바쁘면 두 단어를 합칩니다.'},
  {id: 'c02', text: '첫째, 이 두 단어.'},
  {id: 'c03', text: '하나로 쏙 합쳐집니다.'},
  {id: 'c04', text: '둘째, 이 두 단어.'},
  {id: 'c05', text: '바로 녹아 붙습니다.'},
  {id: 'c06', text: '셋째, 이 표현.'},
  {id: 'c07', text: '끝이 빠져 스르르 붙죠.'},
  {id: 'c09', text: '퀴즈, 어떻게 들릴까요?'},
  {id: 'c10', text: '정답은 바로 이 두 단어!'},
  {id: 'c11', text: '다섯 개 더 고정 댓글에 있어요.'},
];

const EN_FILES = [
  {id: 'give-me', phrase: 'give me'},
  {id: 'gimme', phrase: 'gimme'},
  {id: 'let-me', phrase: 'let me'},
  {id: 'lemme', phrase: 'lemme'},
  {id: 'kind-of', phrase: 'kind of'},
  {id: 'kinda', phrase: 'kinda'},
  {id: 'outta', phrase: 'outta'},
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

const sfxPath = join(ASSETS, 'sfx', 'audio-anchor.wav');
const sfxProbe = probe(sfxPath);
const sfxVol = measureVolume(sfxPath);

const bgmPath = join(ASSETS, 'bgm', 'track.mp3');
const bgmProbe = probe(bgmPath);
const bgmVol = measureVolume(bgmPath);

// Build suggested 12-cut timeline
const dKo = (id) => voiceMap[id].duration;
const dEn = (id) => voiceEnMap[id].duration;
const dAnchor = sfxProbe.duration;

const SHEET_CUTS = [
  {cut: 0, sheetT: 0, sheetDur: 3.8, ko: 'c00', en: [], anchor: false, window: 0},
  {cut: 1, sheetT: 3.8, sheetDur: 3.5, ko: 'c01', en: [], anchor: false, window: 0},
  {cut: 2, sheetT: 7.3, sheetDur: 2.9, ko: 'c02', en: ['give-me'], anchor: false, window: 0},
  {cut: 3, sheetT: 10.2, sheetDur: 3.8, ko: 'c03', en: ['gimme'], anchor: true, window: 0},
  {cut: 4, sheetT: 14.0, sheetDur: 2.9, ko: 'c04', en: ['let-me'], anchor: false, window: 0},
  {cut: 5, sheetT: 16.9, sheetDur: 3.8, ko: 'c05', en: ['lemme'], anchor: true, window: 0},
  {cut: 6, sheetT: 20.7, sheetDur: 2.9, ko: 'c06', en: ['kind-of'], anchor: false, window: 0},
  {cut: 7, sheetT: 23.6, sheetDur: 3.8, ko: 'c07', en: ['kinda'], anchor: true, window: 0},
  {cut: 8, sheetT: 27.4, sheetDur: 3.7, ko: null, en: ['gimme', 'lemme', 'kinda'], anchor: false, window: 0},
  {cut: 9, sheetT: 31.1, sheetDur: 5.4, ko: 'c09', en: ['outta'], anchor: false, window: 1.5},
  {cut: 10, sheetT: 36.5, sheetDur: 3.7, ko: 'c10', en: ['outta'], anchor: true, window: 0},
  {cut: 11, sheetT: 40.2, sheetDur: 3.8, ko: 'c11', en: [], anchor: false, window: 0},
];

let cursor = 0;
const cuts = [];
for (const c of SHEET_CUTS) {
  const lead = 0.12;
  const tail = c.cut === 11 ? 0.5 : 0.25;
  let offset = lead;
  let koOffset = null;
  let anchorOffset = null;
  const enOffsets = [];

  if (c.cut === 10 && c.anchor) {
    // 컷 10은 0.0s 정답 스탬프 팝과 함께 0.3초 청각 시그니처 재생 후 나레이션 시작
    anchorOffset = 0.05;
    offset = 0.4;
  }

  if (c.ko) {
    koOffset = +offset.toFixed(3);
    offset += dKo(c.ko);
  }

  if (c.cut !== 10 && c.anchor) {
    // 컷 3, 5, 7은 한국어 나레이션 뒤 0.12s 여백 후 0.30초 청각 시그니처 → 직후 원어민 합체 소리
    offset += 0.12;
    anchorOffset = +offset.toFixed(3);
    offset += dAnchor + 0.05;
  } else if (c.ko && c.en.length > 0) {
    offset += 0.18;
  }

  for (let i = 0; i < c.en.length; i += 1) {
    const enId = c.en[i];
    if (i > 0) offset += 0.32;
    enOffsets.push({id: enId, offset: +offset.toFixed(3), duration: dEn(enId)});
    offset += dEn(enId);
  }

  if (c.window > 0) {
    offset += c.window;
  }

  const audioEnd = offset;
  const minDur = c.cut === 0 ? Math.max(3.2, audioEnd + tail) : c.cut === 11 ? Math.max(3.5, audioEnd + tail) : audioEnd + tail;
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
    anchor: anchorOffset !== null ? {offset: anchorOffset, duration: dAnchor} : null,
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
  sfx: {
    'audio-anchor': {
      file: 'assets/sfx/audio-anchor.wav',
      duration: sfxProbe.duration,
      sampleRate: sfxProbe.sampleRate,
      channels: sfxProbe.channels,
      ...sfxVol,
    },
  },
  bgm: {
    track: {
      file: 'assets/bgm/track.mp3',
      duration: bgmProbe.duration,
      sampleRate: bgmProbe.sampleRate,
      channels: bgmProbe.channels,
      source: 'public/audio/BGM 35/19.Morning Stroll - Josh Kirsch_Media Right Productions.mp3',
      ...bgmVol,
    },
  },
  cuts,
};

writeFileSync(join(ASSETS, 'audio-timings.json'), JSON.stringify(timings, null, 2) + '\n');

const koRows = koAudit
  .map(
    (x) =>
      `| \`voice-clean/${x.id}.wav\` | ${x.text} | ${x.rawDur.toFixed(3)} | **${x.duration.toFixed(3)}** | ${x.sampleRate} Hz | ${x.channels} | ${x.meanDb} | ${x.maxDb} |`,
  )
  .join('\n');

const enRows = enAudit
  .map(
    (x) =>
      `| \`voice-en-clean/${x.id}.wav\` | \`${x.phrase}\` | ${x.rawDur.toFixed(3)} | **${x.duration.toFixed(3)}** | ${x.sampleRate} Hz | ${x.channels} | ${x.meanDb} | ${x.maxDb} |`,
  )
  .join('\n');

const cutRows = cuts
  .map((c) => {
    const koStr = c.ko ? `${c.ko.duration.toFixed(3)}s (\`${c.ko.id}\` @+${c.ko.offset}s)` : '-';
    const enStr = c.en.length ? c.en.map((e) => `${e.duration.toFixed(3)}s (\`${e.id}\` @+${e.offset}s)`).join(' + ') : '-';
    const ancStr = c.anchor ? `${c.anchor.duration.toFixed(3)}s (@+${c.anchor.offset}s)` : '-';
    return `| ${c.cut} | ${c.sheetT.toFixed(1)}s (${c.sheetDuration.toFixed(1)}s) | **${c.t.toFixed(3)}s** | **${c.duration.toFixed(3)}s** | ${koStr} | ${ancStr} | ${enStr} | ${c.window.toFixed(1)}s | ${(c.duration - c.sheetDuration >= 0 ? '+' : '') + (c.duration - c.sheetDuration).toFixed(3)}s |`;
  })
  .join('\n');

const auditMd = `# AUDIO-AUDIT — ep32-shorts-word-merge

측정일: ${new Date().toISOString().slice(0, 10)}
클린업 기준: \`ffmpeg -af "${CLEAN_FILTER}" -ar 24000 -ac 1 -c:a pcm_s16le\` (앞뒤 무음 -45dB 트림 + -16 LUFS 라우드니스 정규화)
측정 도구: \`ffprobe\` (길이·샘플레이트·채널) + \`ffmpeg -af volumedetect\`

---

## 1. 클린 오디오 전수 실측 (한국어 11 + 원어민 7 + SFX 1 + BGM 1)

### A. 한국어 나레이션 11컷 (\`assets/voice-clean/\`, 화자: \`Gero\`)

| 파일 | 대본 | 원본 길이 (초) | 클린 길이 (초) | 샘플레이트 | 채널 | mean_volume (dB) | max_volume (dB) |
|---|---|---:|---:|---:|---:|---:|---:|
${koRows}

### B. 원어민 영어 발음 7개 (\`assets/voice-en-clean/\`, 화자: \`Olin\`)

| 파일 | 표현 | 원본 길이 (초) | 클린 길이 (초) | 샘플레이트 | 채널 | mean_volume (dB) | max_volume (dB) |
|---|---|---:|---:|---:|---:|---:|---:|
${enRows}

### C. 0.3초 청각 시그니처 SFX & BGM

| 구분 | 파일 | 길이 (초) | 샘플레이트 | 채널 | mean_volume (dB) | max_volume (dB) | 비고 |
|---|---|---:|---:|---:|---:|---:|---|
| 0.3초 청각 시그니처 | \`sfx/audio-anchor.wav\` | **${sfxProbe.duration.toFixed(3)}** | ${sfxProbe.sampleRate} Hz | ${sfxProbe.channels} | ${sfxVol.meanDb} | ${sfxVol.maxDb} | C5+G5 → E6+C6 크리스탈 자석 스냅·벨 (5ms/120ms 페이드) |
| BGM | \`bgm/track.mp3\` | **${bgmProbe.duration.toFixed(3)}** | ${bgmProbe.sampleRate} Hz | ${bgmProbe.channels} | ${bgmVol.meanDb} | ${bgmVol.maxDb} | \`public/audio/BGM 35/19.Morning Stroll - Josh Kirsch_Media Right Productions.mp3\` 복사 |

---

## 2. 컷별 실측 기반 타임라인 제안 (\`assets/audio-timings.json\`)

시트 원안 총 길이: **44.000초** → 클린 음원 실측 기준 제안 총 길이: **${totalDuration.toFixed(3)}초** (컷당 앞뒤 호흡·전환 여백 포함, 음원 겹침 없음).

| 컷 | 시트 시작 (길이) | 제안 시작(t) | 제안 길이 | 한국어 (\`Gero\`) | 청각 시그니처 (0.3초) | 원어민 (\`Olin\`) | 생각 창 | 시트 대비 차이 |
|---:|---|---:|---:|---|---|---|---:|---:|
${cutRows}
`;

writeFileSync(join(ASSETS, 'AUDIO-AUDIT.md'), auditMd);
console.log(`AUDIT COMPLETE: totalDuration=${totalDuration}s, ko=${koAudit.length}, en=${enAudit.length}`);
