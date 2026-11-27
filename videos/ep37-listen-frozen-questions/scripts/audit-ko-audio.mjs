// EP37 한국어 음성 161덩어리(Gero) 전수 정제(무음 정리 + -16 LUFS 정규화) + 고속 배치 Whisper(ko) 전수 받아쓰기 검수
// 161개마다 487MB 모델을 다시 로드하지 않고, 정제된 파일을 1.5초 무음 간격으로 20개씩 묶어 Whisper 1회 추론 후 타임스탬프로 매핑한다.
// 사용: node videos/ep37-listen-frozen-questions/scripts/audit-ko-audio.mjs [--concurrency 4]
import {execFile, execFileSync} from 'node:child_process';
import {existsSync, mkdirSync, readFileSync, rmSync, writeFileSync} from 'node:fs';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {promisify} from 'node:util';

const execFileAsync = promisify(execFile);

const HERE = dirname(fileURLToPath(import.meta.url));
const EP_DIR = resolve(HERE, '..');
const REPO_ROOT = resolve(EP_DIR, '..', '..');
const ASSETS = join(EP_DIR, 'assets');
const RAW_DIR = join(ASSETS, 'voice-ko');
const CLEAN_DIR = join(ASSETS, 'voice-ko-clean');
const WHISPER_BIN = join(REPO_ROOT, '.whisper', 'main.exe');
const WHISPER_MODEL = join(REPO_ROOT, '.whisper', 'ggml-small.bin');
const SCRATCH = join(EP_DIR, '.whisper-scratch-ko');

// 끝음 보호: 뒤쪽 무음 제거 임계값을 보수적(-52dB)으로 두고 0.06초 안전 꼬리를 남긴다.
const CLEAN_FILTER =
  'silenceremove=start_periods=1:start_threshold=-45dB:detection=peak,' +
  'areverse,' +
  'silenceremove=start_periods=1:start_threshold=-52dB:detection=peak,' +
  'areverse,' +
  'apad=pad_dur=0.06,' +
  'loudnorm=I=-16:TP=-1.5:LRA=11';

function normalizeKo(s) {
  return String(s || '').replace(/[^가-힣0-9a-zA-Z]/g, '').toLowerCase();
}

function hanCount(s) {
  return (String(s || '').match(/[가-힣]/g) || []).length;
}

function similarity(a, b) {
  const s1 = normalizeKo(a);
  const s2 = normalizeKo(b);
  if (!s1 && !s2) return 1;
  if (s1.length < 2 || s2.length < 2) return s1 === s2 ? 1 : 0;
  const map = new Map();
  for (let i = 0; i < s1.length - 1; i += 1) {
    const bg = s1.slice(i, i + 2);
    map.set(bg, (map.get(bg) || 0) + 1);
  }
  let inter = 0;
  for (let i = 0; i < s2.length - 1; i += 1) {
    const bg = s2.slice(i, i + 2);
    const n = map.get(bg) || 0;
    if (n > 0) {
      inter += 1;
      map.set(bg, n - 1);
    }
  }
  return +((2 * inter) / (s1.length - 1 + s2.length - 1)).toFixed(3);
}

async function probe(file) {
  const {stdout} = await execFileAsync('ffprobe', [
    '-v', 'error',
    '-show_entries', 'stream=sample_rate,channels,codec_name',
    '-show_entries', 'format=duration',
    '-of', 'json',
    file,
  ]);
  const data = JSON.parse(stdout);
  const st = data.streams?.[0] ?? {};
  return {
    duration: +Number(data.format.duration).toFixed(3),
    sampleRate: Number(st.sample_rate),
    channels: Number(st.channels),
    codec: st.codec_name,
  };
}

async function measureVolume(file) {
  const {stdout, stderr} = await execFileAsync('ffmpeg', ['-i', file, '-af', 'volumedetect', '-f', 'null', '-']).catch((e) => e);
  const txt = `${stdout || ''}\n${stderr || ''}`;
  const mean = txt.match(/mean_volume:\s*([-\d.]+)\s*dB/)?.[1];
  const max = txt.match(/max_volume:\s*([-\d.]+)\s*dB/)?.[1];
  return {
    meanDb: mean !== undefined ? Number(mean) : null,
    maxDb: max !== undefined ? Number(max) : null,
  };
}

async function cleanWav(src, dst) {
  mkdirSync(dirname(dst), {recursive: true});
  await execFileAsync('ffmpeg', ['-y', '-v', 'error', '-i', src, '-af', CLEAN_FILTER, '-ar', '24000', '-ac', '1', '-c:a', 'pcm_s16le', dst]);
}

function makeSilence16k(pathOut, sec) {
  execFileSync('ffmpeg', ['-y', '-v', 'error', '-f', 'lavfi', '-i', `anullsrc=r=16000:cl=mono`, '-t', String(sec), '-c:a', 'pcm_s16le', pathOut]);
}

async function main() {
  const manifestPath = join(ASSETS, 'ko-manifest.json');
  if (!existsSync(manifestPath)) throw new Error('ko-manifest.json이 없습니다.');
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  const chunks = manifest.chunks;

  mkdirSync(CLEAN_DIR, {recursive: true});
  mkdirSync(SCRATCH, {recursive: true});

  // 1단계: 161개 병렬 정제(무음 정리 + -16 LUFS) + 길이·음량 계측
  const items = new Array(chunks.length);
  let cursor = 0;
  const worker = async () => {
    while (true) {
      const idx = cursor;
      cursor += 1;
      if (idx >= chunks.length) break;
      const c = chunks[idx];
      const rawPath = join(RAW_DIR, `${c.id}.wav`);
      const cleanPath = join(CLEAN_DIR, `${c.id}.wav`);
      if (!existsSync(rawPath)) {
        items[idx] = {id: c.id, kind: c.kind, section: c.section, expected: c.text, missing: true, flags: ['missing']};
        continue;
      }
      await cleanWav(rawPath, cleanPath);
      const info = await probe(cleanPath);
      const vol = await measureVolume(cleanPath);
      items[idx] = {
        id: c.id,
        kind: c.kind,
        section: c.section,
        expected: c.text,
        heard: '',
        similarity: 0,
        hanCount: hanCount(c.text),
        duration: info.duration,
        hanPerSec: info.duration > 0 ? +(hanCount(c.text) / info.duration).toFixed(2) : 0,
        sampleRate: info.sampleRate,
        meanDb: vol.meanDb,
        maxDb: vol.maxDb,
        flags: [],
      };
    }
  };
  await Promise.all(Array.from({length: 4}, () => worker()));
  console.log(`1단계 정제 완료: ${items.filter((x) => !x.missing).length}/${chunks.length}개`);

  // 2단계: 20개씩 1.5초 무음 간격으로 묶어 Whisper(ko, -t 8) 9회 일괄 추론
  const GAP = 1.5;
  const silWav = join(SCRATCH, 'gap15.wav');
  makeSilence16k(silWav, GAP);
  const GROUP_SIZE = 20;
  const validItems = items.filter((x) => !x.missing);
  const totalGroups = Math.ceil(validItems.length / GROUP_SIZE);

  for (let g = 0; g < totalGroups; g += 1) {
    const slice = validItems.slice(g * GROUP_SIZE, (g + 1) * GROUP_SIZE);
    const listLines = [`file '${silWav.replace(/\\/g, '/')}'`];
    const spans = [];
    let t = GAP;
    for (const it of slice) {
      const wav16 = join(SCRATCH, `${it.id}.16k.wav`);
      execFileSync('ffmpeg', ['-y', '-v', 'error', '-i', join(CLEAN_DIR, `${it.id}.wav`), '-ar', '16000', '-ac', '1', '-c:a', 'pcm_s16le', wav16]);
      listLines.push(`file '${wav16.replace(/\\/g, '/')}'`);
      listLines.push(`file '${silWav.replace(/\\/g, '/')}'`);
      spans.push({item: it, start: t, end: t + it.duration, texts: []});
      t += it.duration + GAP;
    }
    const listFile = join(SCRATCH, `grp-${g}.txt`);
    const grpWav = join(SCRATCH, `grp-${g}.wav`);
    const outBase = join(SCRATCH, `grp-${g}`);
    writeFileSync(listFile, listLines.join('\n'), 'utf8');
    execFileSync('ffmpeg', ['-y', '-v', 'error', '-f', 'concat', '-safe', '0', '-i', listFile, '-ar', '16000', '-ac', '1', '-c:a', 'pcm_s16le', grpWav]);
    execFileSync(WHISPER_BIN, ['-m', WHISPER_MODEL, '-f', grpWav, '-l', 'ko', '-t', '8', '-oj', '-of', outBase], {stdio: 'pipe'});
    const j = JSON.parse(readFileSync(`${outBase}.json`, 'utf8'));
    for (const seg of j.transcription || []) {
      const txt = String(seg.text || '').trim();
      if (!txt || /^\[.*\]$/.test(txt)) continue;
      const s = seg.offsets.from / 1000;
      const e = seg.offsets.to / 1000;
      const mid = (s + e) / 2;
      // 가장 겹침이 큰 구간 또는 mid가 속한 구간에 배정
      let best = null;
      let bestScore = -1e9;
      for (const sp of spans) {
        const overlap = Math.max(0, Math.min(e, sp.end + 0.25) - Math.max(s, sp.start - 0.25));
        const dist = mid >= sp.start && mid <= sp.end ? 0 : Math.min(Math.abs(mid - sp.start), Math.abs(mid - sp.end));
        const score = overlap > 0 ? 100 + overlap : -dist;
        if (score > bestScore) { bestScore = score; best = sp; }
      }
      if (best) best.texts.push(txt);
    }
    for (const sp of spans) {
      sp.item.heard = sp.texts.join(' ').replace(/\s+/g, ' ').trim();
    }
    console.log(`2단계 Whisper 완료: 그룹 ${g + 1}/${totalGroups} (${slice[0].id}~${slice.at(-1).id})`);
  }

  // 3단계: 유사도·속도·음량 최종 판정 (배치에서 애매하게 나온 극소수만 단건 재확인)
  for (const it of validItems) {
    it.similarity = similarity(it.expected, it.heard);
    if (it.hanCount >= 8 && it.similarity < 0.65) {
      // 단건 패딩 Whisper 재확인으로 배치 경계 오차 배제
      const wav16 = join(SCRATCH, `${it.id}.single.wav`);
      const outBase = join(SCRATCH, `${it.id}.single`);
      execFileSync('ffmpeg', ['-y', '-v', 'error', '-i', join(CLEAN_DIR, `${it.id}.wav`), '-af', 'adelay=350|350,apad=pad_dur=0.35', '-ar', '16000', '-ac', '1', '-c:a', 'pcm_s16le', wav16]);
      execFileSync(WHISPER_BIN, ['-m', WHISPER_MODEL, '-f', wav16, '-l', 'ko', '-t', '8', '-oj', '-of', outBase], {stdio: 'pipe'});
      const j = JSON.parse(readFileSync(`${outBase}.json`, 'utf8'));
      const singleHeard = (j.transcription || []).map((x) => String(x.text || '').trim()).filter((x) => x && !/^\[.*\]$/.test(x)).join(' ').replace(/\s+/g, ' ').trim();
      const singleSim = similarity(it.expected, singleHeard);
      if (singleSim > it.similarity) {
        it.heard = singleHeard;
        it.similarity = singleSim;
      }
    }
    const flags = [];
    if (it.duration < 0.35) flags.push('too-short');
    if (it.hanCount >= 6 && it.hanPerSec > 8.5) flags.push(`too-fast(${it.hanPerSec})`);
    if (it.hanCount >= 6 && it.hanPerSec < 2.0) flags.push(`too-slow(${it.hanPerSec})`);
    if (it.hanCount >= 8 && it.similarity < 0.68) flags.push(`low-sim(${it.similarity})`);
    else if (it.hanCount < 8 && it.similarity < 0.40) flags.push(`low-sim-short(${it.similarity})`);
    if (it.meanDb !== null && (it.meanDb < -26 || it.meanDb > -10)) flags.push(`vol(${it.meanDb}dB)`);
    it.flags = flags;
  }

  rmSync(SCRATCH, {recursive: true, force: true});

  const missing = items.filter((x) => x.missing).length;
  const flagged = items.filter((x) => (x.flags || []).length > 0);
  const totalSec = +validItems.reduce((a, x) => a + x.duration, 0).toFixed(2);

  const outPath = join(ASSETS, 'ko-audit-data.json');
  writeFileSync(
    outPath,
    JSON.stringify({
      generatedAt: new Date().toISOString(),
      voice: manifest.voice,
      total: chunks.length,
      audited: validItems.length,
      missing,
      flaggedCount: flagged.length,
      totalDurationSec: totalSec,
      items,
    }, null, 2) + '\n',
    'utf8',
  );

  console.log(`\nDONE: ${validItems.length}/${chunks.length} audited, missing=${missing}, flagged=${flagged.length}, totalDuration=${totalSec}s (${(totalSec / 60).toFixed(1)}분)`);
  if (flagged.length) {
    console.log('--- FLAGGED ITEMS ---');
    for (const f of flagged) {
      console.log(`  ${f.id} (${f.duration}s, sim=${f.similarity}) [${f.flags.join(', ')}] exp="${f.expected}" || got="${f.heard || ''}"`);
    }
  }
  console.log(`SAVED: ${outPath}`);
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
