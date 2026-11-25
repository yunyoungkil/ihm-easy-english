// EP37 영어 음성 77개 정제(무음 정리 + 음량 정규화) + Whisper 받아쓰기 + 단어별 소리 세기(RMS) 계측 스크립트
// 사용: node videos/ep37-listen-frozen-questions/scripts/audit-en-audio.mjs
import {execFileSync, spawnSync} from 'node:child_process';
import {existsSync, mkdirSync, readFileSync, rmSync, writeFileSync} from 'node:fs';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const EP_DIR = resolve(HERE, '..');
const REPO_ROOT = resolve(EP_DIR, '..', '..');
const ASSETS = join(EP_DIR, 'assets');
const RAW_DIR = join(ASSETS, 'voice-en');
const CLEAN_DIR = join(ASSETS, 'voice-en-clean');
const WHISPER_BIN = join(REPO_ROOT, '.whisper', 'main.exe');
const WHISPER_MODEL = join(REPO_ROOT, '.whisper', 'ggml-small.bin');
const SCRATCH = join(EP_DIR, '.whisper-scratch-en');

const CLEAN_FILTER =
  'silenceremove=start_periods=1:start_threshold=-45dB:detection=peak,' +
  'areverse,' +
  'silenceremove=start_periods=1:start_threshold=-50dB:detection=peak,' +
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

function runWhisper(wavPath, tag) {
  const wav16 = join(SCRATCH, `${tag}.16k.wav`);
  const outBase = join(SCRATCH, tag);
  // Pad 0.35s silence before & after so whisper.cpp never returns empty string on <1s clips
  const PAD = 0.35;
  execFileSync('ffmpeg', [
    '-y', '-v', 'error', '-i', wavPath,
    '-af', `adelay=${Math.round(PAD * 1000)}|${Math.round(PAD * 1000)},apad=pad_dur=${PAD}`,
    '-ar', '16000', '-ac', '1', '-c:a', 'pcm_s16le', wav16,
  ]);
  execFileSync(WHISPER_BIN, ['-m', WHISPER_MODEL, '-f', wav16, '-l', 'en', '-ml', '1', '-oj', '-of', outBase], {stdio: 'pipe'});
  const j = JSON.parse(readFileSync(`${outBase}.json`, 'utf8'));
  const segments = (j.transcription || []).map((t) => ({
    start: +Math.max(0, t.offsets.from / 1000 - PAD).toFixed(3),
    end: +Math.max(0, t.offsets.to / 1000 - PAD).toFixed(3),
    text: String(t.text || '').trim(),
  })).filter((s) => s.text && !/^\[.*\]$/.test(s.text));
  const fullText = segments.map((s) => s.text).join(' ').replace(/\s+/g, ' ').trim();
  return {fullText, segments};
}

// 16-bit mono PCM WAV에서 구간별 RMS(dBFS) 계산
function readPcmSamples(wavPath) {
  const buf = readFileSync(wavPath);
  let offset = 12;
  let sampleRate = 24000;
  let dataStart = 44;
  let dataSize = buf.length - 44;
  while (offset + 8 <= buf.length) {
    const id = buf.toString('ascii', offset, offset + 4);
    const sz = buf.readUInt32LE(offset + 4);
    if (id === 'fmt ') sampleRate = buf.readUInt32LE(offset + 12);
    if (id === 'data') {
      dataStart = offset + 8;
      dataSize = sz;
      break;
    }
    offset += 8 + sz + (sz % 2);
  }
  const count = Math.floor(dataSize / 2);
  const samples = new Int16Array(count);
  for (let i = 0; i < count; i += 1) {
    samples[i] = buf.readInt16LE(dataStart + i * 2);
  }
  return {samples, sampleRate};
}

function rmsDbInRange(samples, sampleRate, startSec, endSec) {
  const s0 = Math.max(0, Math.floor(startSec * sampleRate));
  const s1 = Math.min(samples.length, Math.max(s0 + 1, Math.ceil(endSec * sampleRate)));
  let sumSq = 0;
  for (let i = s0; i < s1; i += 1) {
    const v = samples[i] / 32768;
    sumSq += v * v;
  }
  const rms = Math.sqrt(sumSq / (s1 - s0));
  return rms > 0 ? +(20 * Math.log10(rms)).toFixed(1) : -90;
}

function normalizeWords(s) {
  return String(s || '')
    .replace(/<[^<>]*>/g, ' ')
    .toLowerCase()
    .replace(/[^a-z0-9'\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function main() {
  const manifestPath = join(ASSETS, 'en-manifest.json');
  if (!existsSync(manifestPath)) throw new Error('en-manifest.json이 없습니다. 먼저 generate-en-audio.mjs를 실행하세요.');
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));

  mkdirSync(CLEAN_DIR, {recursive: true});
  mkdirSync(SCRATCH, {recursive: true});

  const results = [];
  let missing = 0;
  let mismatches = 0;

  for (const job of manifest.jobs) {
    const rawPath = join(RAW_DIR, `${job.id}.wav`);
    const cleanPath = join(CLEAN_DIR, `${job.id}.wav`);
    if (!existsSync(rawPath)) {
      console.log(`MISSING: ${job.id}`);
      missing += 1;
      continue;
    }
    cleanWav(rawPath, cleanPath);
    const info = probe(cleanPath);
    const vol = measureVolume(cleanPath);
    const whisper = runWhisper(cleanPath, job.id);
    const {samples, sampleRate} = readPcmSamples(cleanPath);
    const wordMetrics = whisper.segments.map((seg) => ({
      ...seg,
      dur: +(seg.end - seg.start).toFixed(3),
      rmsDb: rmsDbInRange(samples, sampleRate, seg.start, seg.end),
    }));

    const expNorm = normalizeWords(job.text);
    const gotNorm = normalizeWords(whisper.fullText);
    const exactMatch = expNorm === gotNorm;
    if (!exactMatch) mismatches += 1;

    results.push({
      id: job.id,
      group: job.group,
      chapter: job.chapter,
      voice: job.voice,
      expected: job.text,
      heard: whisper.fullText,
      exactMatch,
      duration: info.duration,
      sampleRate: info.sampleRate,
      meanDb: vol.meanDb,
      maxDb: vol.maxDb,
      wordMetrics,
    });
    const mark = exactMatch ? 'OK ' : 'DIF';
    console.log(`[${mark}] ${job.id} (${info.duration.toFixed(2)}s, ${vol.meanDb}dB) exp="${job.text}" | got="${whisper.fullText}"`);
  }

  rmSync(SCRATCH, {recursive: true, force: true});

  const outPath = join(ASSETS, 'en-audit-data.json');
  writeFileSync(
    outPath,
    JSON.stringify({
      generatedAt: new Date().toISOString(),
      qVoice: manifest.qVoice,
      aVoice: manifest.aVoice,
      total: manifest.jobs.length,
      audited: results.length,
      missing,
      mismatches,
      items: results,
    }, null, 2) + '\n',
    'utf8',
  );
  console.log(`\nDONE: ${results.length}/${manifest.jobs.length} audited, missing=${missing}, whisper-diff=${mismatches}`);
  console.log(`SAVED: ${outPath}`);
}

main();
