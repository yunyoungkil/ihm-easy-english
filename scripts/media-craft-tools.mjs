// AI 크래프트 제작 실행 도구 모음 (2026-11-22, 로컬 ffmpeg/ffprobe만 사용, 유료 API 없음).
// 창작 규칙을 고정하지 않고, 필요할 때 한 줄로 꺼내 쓸 수 있는 손발(분할·프레임 추출·레퍼런스 클립·톤 통일·비트 추출·수치 대조·노드 계보)을 제공한다.
//
// 사용:
//   npm run craft -- split-grid --input grid.jpg --out-dir panels/ [--rows 3] [--cols 3] [--trim-px 0]
//   npm run craft -- extract-frame --input clip.mp4 --time 2.35 --output frame.png
//   npm run craft -- extract-ref-clip --input ref.mp4 --start 1.0 --duration 4 --output ref-clip.mp4 [--mute]
//   npm run craft -- unify-tone --input clip.mp4 --output clean.mp4 [--brightness 0] [--contrast 1] [--saturation 1] [--grain 0] [--speed 1]
//   npm run craft -- detect-beats --input track.mp3 [--output beats.json] [--threshold 0.35] [--min-gap 0.22]
//   npm run craft -- compare-visual-metrics --ref ref.mp4 --ours out.mp4 [--fps 2] [--scene-threshold 0.3]
//   npm run craft -- lineage --dir videos/<프로젝트>/assets
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readLineageTree } from './aistudio-attachments.mjs';
import { DEFAULT_TRIM_RATIO, cropWatermarkMedia, makeCornerCheckSheet } from './watermark-crop.mjs';

function runBin(bin, args, opts = {}) {
  const res = spawnSync(bin, args, { maxBuffer: 64 * 1024 * 1024, ...opts });
  if (res.error) throw new Error(`${bin} 실행 실패: ${res.error.message}`);
  if (res.status !== 0) {
    const err = Buffer.isBuffer(res.stderr) ? res.stderr.toString('utf8') : String(res.stderr || '');
    throw new Error(`${bin} 실패(종료 ${res.status}): ${err.trim().slice(0, 400)}`);
  }
  return res;
}

function ensureInput(path, flag = '--input') {
  if (!path || !existsSync(resolve(path))) throw new Error(`${flag} 파일을 찾지 못했습니다: ${path}`);
  return resolve(path);
}

function ensureOutDir(filePath) {
  const d = dirname(resolve(filePath));
  if (!existsSync(d)) mkdirSync(d, { recursive: true });
}

function parseFrameRate(raw) {
  const s = String(raw || '').trim();
  if (!s || s === '0/0') return null;
  if (s.includes('/')) {
    const [a, b] = s.split('/').map(Number);
    return b ? Math.round((a / b) * 100) / 100 : null;
  }
  const n = Number(s);
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) / 100 : null;
}

/** ffprobe로 실제 해상도·길이·오디오 유무·프레임률을 잰다. */
export function probeMedia(input, runner = runBin) {
  const abs = ensureInput(input);
  const res = runner('ffprobe', ['-v', 'error', '-print_format', 'json', '-show_format', '-show_streams', abs], { encoding: 'utf8' });
  const data = JSON.parse(res.stdout || '{}');
  const streams = Array.isArray(data.streams) ? data.streams : [];
  const v = streams.find((s) => s.codec_type === 'video') || null;
  const a = streams.find((s) => s.codec_type === 'audio') || null;
  const dur = Number(data?.format?.duration ?? v?.duration ?? a?.duration);
  return {
    file: abs,
    width: v ? Number(v.width) || null : null,
    height: v ? Number(v.height) || null : null,
    durationSeconds: Number.isFinite(dur) && dur >= 0 ? Math.round(dur * 1000) / 1000 : null,
    fps: v ? parseFrameRate(v.avg_frame_rate || v.r_frame_rate) : null,
    hasAudio: Boolean(a),
  };
}

/** 1. 3x3 등 연속 스토리보드 그리드 이미지 1장을 컷별 이미지로 자동 분할한다. */
export function splitGrid({ input, outDir, rows = 3, cols = 3, trimPx = 0 }, runner = runBin) {
  const abs = ensureInput(input);
  if (!outDir) throw new Error('--out-dir가 필요합니다');
  const rCount = Number(rows);
  const cCount = Number(cols);
  const trim = Number(trimPx);
  if (!Number.isInteger(rCount) || rCount < 1 || rCount > 10) throw new Error('--rows는 1~10 정수여야 합니다');
  if (!Number.isInteger(cCount) || cCount < 1 || cCount > 10) throw new Error('--cols는 1~10 정수여야 합니다');
  if (!Number.isInteger(trim) || trim < 0) throw new Error('--trim-px는 0 이상 정수여야 합니다');

  const meta = probeMedia(abs, runner);
  if (!meta.width || !meta.height) throw new Error(`이미지 크기를 읽지 못했습니다: ${input}`);
  const cellW = Math.floor(meta.width / cCount);
  const cellH = Math.floor(meta.height / rCount);
  const cropW = cellW - trim * 2;
  const cropH = cellH - trim * 2;
  if (cropW < 16 || cropH < 16) throw new Error(`분할 후 셀 크기가 너무 작습니다(${cropW}x${cropH})`);

  const targetDir = resolve(outDir);
  if (!existsSync(targetDir)) mkdirSync(targetDir, { recursive: true });
  const files = [];
  let idx = 1;
  for (let r = 0; r < rCount; r += 1) {
    for (let c = 0; c < cCount; c += 1) {
      const x = c * cellW + trim;
      const y = r * cellH + trim;
      const outFile = join(targetDir, `panel-${String(idx).padStart(2, '0')}.png`);
      runner('ffmpeg', ['-y', '-v', 'error', '-i', abs, '-vf', `crop=${cropW}:${cropH}:${x}:${y}`, '-frames:v', '1', outFile], { encoding: 'utf8' });
      files.push(outFile);
      idx += 1;
    }
  }
  return { input: abs, outDir: targetDir, rows: rCount, cols: cCount, cellWidth: cropW, cellHeight: cropH, files };
}

/** 2. 영상에서 문제 프레임 또는 베스트 앵글 프레임 1장을 추출한다(3대 부분 수정용). */
export function extractFrame({ input, time, output }, runner = runBin) {
  const abs = ensureInput(input);
  const sec = Number(time);
  if (!Number.isFinite(sec) || sec < 0) throw new Error('--time은 0 이상 숫자(초)여야 합니다');
  if (!output) throw new Error('--output이 필요합니다');
  const outAbs = resolve(output);
  ensureOutDir(outAbs);
  runner('ffmpeg', ['-y', '-v', 'error', '-ss', String(sec), '-i', abs, '-frames:v', '1', outAbs], { encoding: 'utf8' });
  return { input: abs, time: sec, output: outAbs };
}

/** 3. 명작 레퍼런스 영상에서 3~15초 모션 참조 클립을 잘라낸다(Omni --ref 직결용). */
export function extractRefClip({ input, start = 0, duration = 4, output, mute = false }, runner = runBin) {
  const abs = ensureInput(input);
  const s = Number(start);
  const d = Number(duration);
  if (!Number.isFinite(s) || s < 0) throw new Error('--start는 0 이상 숫자(초)여야 합니다');
  if (!Number.isFinite(d) || d <= 0 || d > 15) throw new Error('--duration은 0 초과 15 이하 숫자(초)여야 합니다');
  if (!output) throw new Error('--output이 필요합니다');
  const outAbs = resolve(output);
  ensureOutDir(outAbs);
  const args = ['-y', '-v', 'error', '-ss', String(s), '-i', abs, '-t', String(d), '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '20'];
  if (mute) args.push('-an');
  else args.push('-c:a', 'aac', '-b:a', '128k');
  args.push(outAbs);
  runner('ffmpeg', args, { encoding: 'utf8' });
  return { input: abs, start: s, duration: d, mute: Boolean(mute), output: outAbs };
}

/** 4. 서로 다른 8bit AI 클립의 색감·대비·미세 그레인·속도(타임 리매핑)를 통일한다. */
export function unifyTone({ input, output, brightness = 0, contrast = 1, saturation = 1, grain = 0, speed = 1 }, runner = runBin) {
  const abs = ensureInput(input);
  if (!output) throw new Error('--output이 필요합니다');
  const br = Number(brightness);
  const ct = Number(contrast);
  const sat = Number(saturation);
  const gr = Number(grain);
  const sp = Number(speed);
  if (!Number.isFinite(br) || br < -1 || br > 1) throw new Error('--brightness는 -1~1 사이여야 합니다');
  if (!Number.isFinite(ct) || ct < 0.2 || ct > 3) throw new Error('--contrast는 0.2~3 사이여야 합니다');
  if (!Number.isFinite(sat) || sat < 0 || sat > 3) throw new Error('--saturation은 0~3 사이여야 합니다');
  if (!Number.isFinite(gr) || gr < 0 || gr > 30) throw new Error('--grain은 0~30 사이여야 합니다');
  if (!Number.isFinite(sp) || sp < 0.5 || sp > 2) throw new Error('--speed는 0.5~2 사이여야 합니다');

  const meta = probeMedia(abs, runner);
  const vf = [`eq=brightness=${br}:contrast=${ct}:saturation=${sat}`];
  if (gr > 0) vf.push(`noise=alls=${gr}:allf=t+u`);
  if (sp !== 1) vf.push(`setpts=PTS/${sp}`);

  const outAbs = resolve(output);
  ensureOutDir(outAbs);
  const args = ['-y', '-v', 'error', '-i', abs, '-vf', vf.join(','), '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '18'];
  if (meta.hasAudio) {
    if (sp !== 1) args.push('-af', `atempo=${sp}`, '-c:a', 'aac', '-b:a', '192k');
    else args.push('-c:a', 'copy');
  } else {
    args.push('-an');
  }
  args.push(outAbs);
  runner('ffmpeg', args, { encoding: 'utf8' });
  return { input: abs, output: outAbs, brightness: br, contrast: ct, saturation: sat, grain: gr, speed: sp, hasAudio: meta.hasAudio };
}

/** 순수 함수: 16bit LE 모노 PCM 버퍼에서 에너지 급증 지점(강조 비트)과 추정 BPM을 잰다. */
export function detectBeatsFromPcm(pcmBuffer, sampleRate = 16000, { threshold = 0.35, minGapSec = 0.22 } = {}) {
  const totalSamples = Math.floor(pcmBuffer.length / 2);
  const durationSeconds = Math.round((totalSamples / sampleRate) * 1000) / 1000;
  const hop = Math.max(1, Math.round(sampleRate * 0.02)); // 20ms
  const win = Math.max(hop, Math.round(sampleRate * 0.04)); // 40ms
  if (totalSamples < win * 2) return { bpm: null, durationSeconds, beats: [] };

  const energies = [];
  for (let i = 0; i + win <= totalSamples; i += hop) {
    let sumSq = 0;
    for (let j = 0; j < win; j += 1) {
      const sample = pcmBuffer.readInt16LE((i + j) * 2) / 32768;
      sumSq += sample * sample;
    }
    energies.push(Math.sqrt(sumSq / win));
  }

  const flux = [0];
  let maxFlux = 0;
  for (let i = 1; i < energies.length; i += 1) {
    const diff = Math.max(0, energies[i] - energies[i - 1]);
    flux.push(diff);
    if (diff > maxFlux) maxFlux = diff;
  }
  if (maxFlux <= 1e-6) return { bpm: null, durationSeconds, beats: [] };

  const norm = flux.map((v) => v / maxFlux);
  const beats = [];
  let lastBeat = -Infinity;
  for (let i = 1; i < norm.length - 1; i += 1) {
    if (norm[i] < threshold) continue;
    if (norm[i] < norm[i - 1] || norm[i] < norm[i + 1]) continue;
    const t = Math.round(((i * hop) / sampleRate) * 1000) / 1000;
    if (t - lastBeat < minGapSec) continue;
    beats.push(t);
    lastBeat = t;
  }

  let bpm = null;
  if (beats.length >= 2) {
    const gaps = [];
    for (let i = 1; i < beats.length; i += 1) gaps.push(beats[i] - beats[i - 1]);
    gaps.sort((a, b) => a - b);
    const centerGap = gaps[Math.floor(gaps.length / 2)];
    if (centerGap > 0) bpm = Math.round((60 / centerGap) * 10) / 10;
  }
  return { bpm, durationSeconds, beats };
}

/** 5. BGM/오디오 파일에서 강조 비트 시각과 추정 BPM을 추출한다(HyperFrames 싱크용). */
export function detectBeats({ input, output = '', threshold = 0.35, minGapSec = 0.22 }, runner = runBin) {
  const abs = ensureInput(input);
  const th = Number(threshold);
  const gap = Number(minGapSec);
  if (!Number.isFinite(th) || th <= 0 || th > 1) throw new Error('--threshold는 0 초과 1 이하 숫자여야 합니다');
  if (!Number.isFinite(gap) || gap <= 0) throw new Error('--min-gap은 0 초과 숫자(초)여야 합니다');

  const res = runner('ffmpeg', ['-v', 'error', '-i', abs, '-ac', '1', '-ar', '16000', '-f', 's16le', 'pipe:1']);
  const result = { input: abs, ...detectBeatsFromPcm(res.stdout, 16000, { threshold: th, minGapSec: gap }) };
  if (output) {
    const outAbs = resolve(output);
    ensureOutDir(outAbs);
    writeFileSync(outAbs, JSON.stringify(result, null, 2) + '\n', 'utf8');
    result.output = outAbs;
  }
  return result;
}

const avg = (arr) => (arr.length ? Math.round((arr.reduce((s, n) => s + n, 0) / arr.length) * 100) / 100 : null);

/** ffmpeg signalstats metadata 출력에서 평균 밝기(YAVG)·채도(SATAVG)·프레임당 변화(YDIF)를 파싱한다. */
export function parseSignalStats(text) {
  const yavg = [];
  const satavg = [];
  const ydif = [];
  for (const line of String(text || '').split(/\r?\n/)) {
    let m;
    if ((m = line.match(/lavfi\.signalstats\.YAVG=([0-9.]+)/))) yavg.push(Number(m[1]));
    else if ((m = line.match(/lavfi\.signalstats\.SATAVG=([0-9.]+)/))) satavg.push(Number(m[1]));
    else if ((m = line.match(/lavfi\.signalstats\.YDIF=([0-9.]+)/))) ydif.push(Number(m[1]));
  }
  return {
    sampledFrames: yavg.length,
    avgBrightness: avg(yavg),
    avgSaturation: avg(satavg),
    avgMotionDiff: avg(ydif),
  };
}

/** 6. 영상 한 편의 실제 시각 수치(밝기·채도·프레임당 변화·장면 전환 수)를 측정한다. */
export function measureVisualMetrics({ input, fps = 2, sceneThreshold = 0.3 }, runner = runBin) {
  const abs = ensureInput(input);
  const sampleFps = Number(fps);
  const scTh = Number(sceneThreshold);
  if (!Number.isFinite(sampleFps) || sampleFps <= 0 || sampleFps > 30) throw new Error('--fps는 0 초과 30 이하 숫자여야 합니다');
  if (!Number.isFinite(scTh) || scTh <= 0 || scTh >= 1) throw new Error('--scene-threshold는 0과 1 사이여야 합니다');

  const meta = probeMedia(abs, runner);
  const statRes = runner('ffmpeg', ['-v', 'error', '-i', abs, '-vf', `fps=${sampleFps},signalstats,metadata=print:file=-`, '-f', 'null', '-'], { encoding: 'utf8' });
  const stats = parseSignalStats(statRes.stdout);

  const cutRes = runner('ffmpeg', ['-v', 'info', '-i', abs, '-vf', `select='gt(scene,${scTh})',showinfo`, '-f', 'null', '-'], { encoding: 'utf8' });
  const cutTimes = [];
  for (const line of String(cutRes.stderr || '').split(/\r?\n/)) {
    const m = line.match(/pts_time:([0-9.]+)/);
    if (m) cutTimes.push(Math.round(Number(m[1]) * 100) / 100);
  }
  const cutsPerMin = meta.durationSeconds && meta.durationSeconds > 0
    ? Math.round((cutTimes.length / (meta.durationSeconds / 60)) * 10) / 10
    : null;

  return {
    file: abs,
    width: meta.width,
    height: meta.height,
    durationSeconds: meta.durationSeconds,
    fps: meta.fps,
    ...stats,
    sceneCuts: cutTimes.length,
    cutsPerMin,
    cutTimes,
  };
}

/** 레퍼런스 영상과 우리 완성 영상에 동일한 측정 코드를 돌려 객관 수치를 나란히 대조한다. */
export function compareVisualMetrics({ ref, ours, fps = 2, sceneThreshold = 0.3 }, runner = runBin) {
  const mRef = measureVisualMetrics({ input: ref, fps, sceneThreshold }, runner);
  const mOurs = measureVisualMetrics({ input: ours, fps, sceneThreshold }, runner);
  const sub = (a, b) => (a !== null && b !== null ? Math.round((b - a) * 100) / 100 : null);
  return {
    ref: mRef,
    ours: mOurs,
    diff: {
      avgBrightness: sub(mRef.avgBrightness, mOurs.avgBrightness),
      avgSaturation: sub(mRef.avgSaturation, mOurs.avgSaturation),
      avgMotionDiff: sub(mRef.avgMotionDiff, mOurs.avgMotionDiff),
      cutsPerMin: sub(mRef.cutsPerMin, mOurs.cutsPerMin),
    },
  };
}

export function parseCliArgs(argv) {
  const [cmd, ...rest] = argv;
  const opts = { _: [] };
  for (let i = 0; i < rest.length; i += 1) {
    const k = rest[i];
    if (!k.startsWith('--')) { opts._.push(k); continue; }
    const name = k.slice(2).replace(/-([a-z])/g, (_, c) => c.toUpperCase());
    if (k === '--mute') { opts.mute = true; continue; }
    opts[name] = rest[i + 1];
    i += 1;
  }
  return { cmd, opts };
}

const isCli = process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));
if (isCli) {
  try {
    const { cmd, opts } = parseCliArgs(process.argv.slice(2));
    let out;
    if (cmd === 'split-grid') out = splitGrid(opts);
    else if (cmd === 'extract-frame') out = extractFrame(opts);
    else if (cmd === 'extract-ref-clip') out = extractRefClip(opts);
    else if (cmd === 'unify-tone') out = unifyTone(opts);
    else if (cmd === 'detect-beats') out = detectBeats({ ...opts, minGapSec: opts.minGap ?? 0.22 });
    else if (cmd === 'compare-visual-metrics') out = compareVisualMetrics(opts);
    else if (cmd === 'crop-watermark') {
      out = cropWatermarkMedia({
        input: opts.input,
        output: opts.output,
        trimRatio: opts.trimRatio ?? DEFAULT_TRIM_RATIO,
        targetWidth: opts.targetWidth ?? null,
        targetHeight: opts.targetHeight ?? null,
        mute: Boolean(opts.mute),
      });
    } else if (cmd === 'check-corners') {
      out = makeCornerCheckSheet({
        input: opts.input,
        output: opts.output,
        time: opts.time ?? 1.5,
        cornerSize: opts.cornerSize ?? 240,
      });
    } else if (cmd === 'lineage') {
      const dir = opts.dir || opts._[0];
      if (!dir) throw new Error('--dir <폴더>가 필요합니다');
      out = readLineageTree(dir);
    } else {
      throw new Error('지원 명령: split-grid | extract-frame | extract-ref-clip | unify-tone | detect-beats | compare-visual-metrics | crop-watermark | check-corners | lineage');
    }
    console.log(JSON.stringify(out, null, 2));
  } catch (err) {
    console.error(`실패: ${err.message}`);
    process.exitCode = 1;
  }
}
