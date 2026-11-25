// 무료 GEMINI_API_KEY 보조 한도(하루 10회, POST /v1beta/interactions)로 여러 문장을 한 번에 묶어 생성하고 무음 구간으로 자동 분할한다.
// 사용: node videos/ep37-listen-frozen-questions/scripts/generate-en-batch-api.mjs [--mode remaining|single] [--only x04,x05]
import {execFileSync, spawnSync} from 'node:child_process';
import {existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync} from 'node:fs';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {AUDIO_FORMAT, loadApiKey, pcmToWav, sampleRateFromMime} from '../../../scripts/tts-config.mjs';
import {checkVoiceGate} from '../../../scripts/production-gate.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const EP_DIR = resolve(HERE, '..');
const OUT_DIR = join(EP_DIR, 'assets', 'voice-en');
const TMP_DIR = join(EP_DIR, '.api-batch-tmp');

async function callInteractionsTts({apiKey, voice, text, style, model = 'gemini-3.8-flash-tts'}) {
  const url = 'https://generativelanguage.googleapis.com/v1beta/interactions';
  const payload = {
    model,
    input: [
      {
        type: 'user_input',
        content: [
          {
            type: 'text',
            text,
            annotations: style ? [{type: 'speech_metadata', style}] : [],
          },
        ],
      },
    ],
    response_format: {type: 'audio'},
    generation_config: {
      speech_config: [{voice}],
    },
  };
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'x-goog-api-key': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  const body = await res.text();
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} ${res.statusText}: ${body.slice(0, 600)}`);
  }
  const json = JSON.parse(body);
  // Recursively search response for audio base64 data (handles output_audio, outputs[], steps[], inlineData, etc.)
  function findAudio(node) {
    if (!node || typeof node !== 'object') return null;
    if (Array.isArray(node)) {
      for (const x of node) { const r = findAudio(x); if (r) return r; }
      return null;
    }
    if (typeof node.data === 'string' && node.data.length > 500) {
      return {data: node.data, mime: node.mime_type || node.mimeType || ''};
    }
    for (const v of Object.values(node)) {
      const r = findAudio(v);
      if (r) return r;
    }
    return null;
  }
  const found = findAudio(json);
  if (!found) {
    throw new Error(`No audio in response (keys=${Object.keys(json).join(',')}): ${JSON.stringify(json).slice(0, 800)}`);
  }
  return {buf: Buffer.from(found.data, 'base64'), mime: found.mime};
}

function probeDuration(file) {
  const s = execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=nw=1:nk=1', file], {encoding: 'utf8'}).trim();
  return Number(s);
}

// Detect speech segments separated by silence >= minSilDur
function detectSpeechSegments(wavPath, noiseDb = -36, minSilDur = 0.55) {
  const total = probeDuration(wavPath);
  const r = spawnSync('ffmpeg', ['-i', wavPath, '-af', `silencedetect=noise=${noiseDb}dB:d=${minSilDur}`, '-f', 'null', '-'], {encoding: 'utf8'});
  const log = `${r.stdout || ''}\n${r.stderr || ''}`;
  const silences = [];
  let curStart = null;
  for (const line of log.split(/\r?\n/)) {
    const m1 = line.match(/silence_start:\s*([\d.]+)/);
    const m2 = line.match(/silence_end:\s*([\d.]+)/);
    if (m1) curStart = Number(m1[1]);
    if (m2) {
      silences.push({start: curStart ?? 0, end: Number(m2[1])});
      curStart = null;
    }
  }
  if (curStart !== null) silences.push({start: curStart, end: total});

  const segs = [];
  let pos = 0;
  for (const s of silences) {
    if (s.start - pos > 0.18) {
      segs.push({start: Math.max(0, pos - 0.04), end: Math.min(total, s.start + 0.06)});
    }
    pos = s.end;
  }
  if (total - pos > 0.18) {
    segs.push({start: Math.max(0, pos - 0.04), end: total});
  }
  return segs;
}

function splitIntoExactCount(wavPath, expectedCount) {
  // Try a grid of minSilDur / noiseDb thresholds to find exact segment count cleanly
  const trials = [
    [-36, 0.75], [-36, 0.60], [-36, 0.50], [-36, 0.42],
    [-32, 0.70], [-32, 0.55], [-32, 0.45], [-40, 0.65], [-40, 0.50],
  ];
  let best = null;
  for (const [db, d] of trials) {
    const segs = detectSpeechSegments(wavPath, db, d);
    if (segs.length === expectedCount) return {segs, db, d};
    if (!best || Math.abs(segs.length - expectedCount) < Math.abs(best.segs.length - expectedCount)) {
      best = {segs, db, d};
    }
  }
  return best;
}

function sliceWav(src, dst, start, end) {
  mkdirSync(dirname(dst), {recursive: true});
  execFileSync('ffmpeg', [
    '-y', '-v', 'error', '-i', src,
    '-ss', start.toFixed(3), '-to', end.toFixed(3),
    '-ar', '24000', '-ac', '1', '-c:a', 'pcm_s16le', dst,
  ]);
}

async function runBatch(apiKey, batch) {
  mkdirSync(TMP_DIR, {recursive: true});
  const combinedText = batch.items.map((x) => x.text).join(' <long pause> <long pause> ');
  console.log(`\n[BATCH ${batch.name}] ${batch.voice}, ${batch.items.length} items...`);
  const {buf: rawBuf, mime} = await callInteractionsTts({
    apiKey,
    voice: batch.voice,
    text: combinedText,
    style: batch.style,
  });
  const tmpRaw = join(TMP_DIR, `${batch.name}.raw.wav`);
  const tmpWav = join(TMP_DIR, `${batch.name}.wav`);
  const isRiff = rawBuf.length >= 4 && rawBuf.toString('ascii', 0, 4) === 'RIFF';
  if (!isRiff && (/L16|pcm/i.test(mime) || !mime)) {
    const sr = sampleRateFromMime(mime);
    writeFileSync(tmpRaw, pcmToWav(rawBuf, {...AUDIO_FORMAT, sampleRate: sr}));
  } else {
    writeFileSync(tmpRaw, rawBuf);
  }
  // Convert to guaranteed clean 24kHz 16-bit mono WAV (strips any C2PA tail or format wrapper)
  execFileSync('ffmpeg', ['-y', '-v', 'error', '-i', tmpRaw, '-ar', '24000', '-ac', '1', '-c:a', 'pcm_s16le', tmpWav]);

  if (batch.items.length === 1) {
    const outPath = join(OUT_DIR, `${batch.items[0].id}.wav`);
    writeFileSync(outPath, readFileSync(tmpWav));
    console.log(`  OK single ${batch.items[0].id} (${probeDuration(outPath).toFixed(2)}s)`);
    return {ok: true, count: 1};
  }

  const found = splitIntoExactCount(tmpWav, batch.items.length);
  console.log(`  split: found ${found.segs.length}/${batch.items.length} segments (noise=${found.db}dB, minSil=${found.d}s)`);
  if (found.segs.length !== batch.items.length) {
    console.error(`  WARN segment count mismatch! Raw file kept at ${tmpWav}`);
    return {ok: false, found: found.segs.length, expected: batch.items.length, tmpWav};
  }
  for (let i = 0; i < batch.items.length; i += 1) {
    const item = batch.items[i];
    const seg = found.segs[i];
    const outPath = join(OUT_DIR, `${item.id}.wav`);
    sliceWav(tmpWav, outPath, seg.start, seg.end);
    console.log(`  OK ${item.id} (${(seg.end - seg.start).toFixed(2)}s) — "${item.text}"`);
  }
  return {ok: true, count: batch.items.length};
}

async function main() {
  const gate = checkVoiceGate({projectDir: EP_DIR});
  if (!gate.ok) throw new Error(`음성 안전 관문 차단: ${gate.blockers.join(' / ')}`);

  const {key: apiKey} = loadApiKey();
  const manifest = JSON.parse(readFileSync(join(EP_DIR, 'assets', 'en-manifest.json'), 'utf8'));
  const byId = Object.fromEntries(manifest.jobs.map((j) => [j.id, j]));

  const onlyArg = process.argv.includes('--only') ? new Set(process.argv[process.argv.indexOf('--only') + 1].split(',')) : null;
  const force = process.argv.includes('--force');

  // Group remaining missing items into clean batches sharing voice & compatible style (total <= 6 API calls!)
  const batches = [
    {
      name: 'x04-x05',
      voice: byId.x04.voice,
      style: `${byId.x04.style} Pause clearly for two full seconds between each separate phrase.`,
      items: [byId.x04, byId.x05],
    },
    {
      name: 'x06',
      voice: byId.x06.voice,
      style: byId.x06.style,
      items: [byId.x06],
    },
    {
      name: 'x07',
      voice: byId.x07.voice,
      style: byId.x07.style,
      items: [byId.x07],
    },
    {
      name: 'a01-a10',
      voice: byId.a01.voice,
      style: `${byId.a01.style} Read each short sentence separately as an independent reply with a clear two-second silent pause between each sentence.`,
      items: ['a01','a02','a03','a04','a05','a06','a07','a08','a09','a10'].map((id) => byId[id]),
    },
    {
      name: 'a11-a20',
      voice: byId.a11.voice,
      style: `${byId.a11.style} Read each short sentence separately as an independent reply with a clear two-second silent pause between each sentence.`,
      items: ['a11','a12','a13','a14','a15','a16','a17','a18','a19','a20'].map((id) => byId[id]),
    },
    {
      name: 'a21-a30',
      voice: byId.a21.voice,
      style: `${byId.a21.style} Read each short sentence separately as an independent reply with a clear two-second silent pause between each sentence.`,
      items: ['a21','a22','a23','a24','a25','a26','a27','a28','a29','a30'].map((id) => byId[id]),
    },
  ];

  let calls = 0;
  for (const b of batches) {
    const needed = b.items.filter((it) => {
      if (onlyArg && !onlyArg.has(it.id)) return false;
      if (!force && existsSync(join(OUT_DIR, `${it.id}.wav`))) return false;
      return true;
    });
    if (!needed.length) {
      console.log(`[SKIP ${b.name}] all items already exist`);
      continue;
    }
    const res = await runBatch(apiKey, {...b, items: needed});
    calls += 1;
    if (!res.ok) console.log(`  (Manual split needed for ${b.name})`);
    await new Promise((r) => setTimeout(r, 1500));
  }
  console.log(`\nALL DONE. API calls used: ${calls}`);
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
