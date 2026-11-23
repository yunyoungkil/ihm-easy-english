// Flow / Gemini 앱 생성 미디어의 워터마크 사전 여백 프롬프트·자동 크롭·4방 모서리 검수 공용 모듈(2026-11-23).
// 실측 근거(2026-11-23, 20px 격자 실측):
//   - Flow(Omni 1.2 Flash 720x1280)와 Gemini 앱(Omni 720x1280) 모두 우하단 4각 별 로고 위치가 픽셀 단위로 동일.
//   - 중심: 우측에서 120px, 하단에서 120px / 크기: 48x48px → 경계: 끝에서 144px(세로 1280px 기준 11.25%).
//   - 세로(9:16)는 하단 12.5%(160px)만 자르고 가로를 정중앙 정렬(630x1120, x=45, y=0)하면
//     16px 안전 여유를 두고 별 로고가 화면 밖으로 완전히 빠지면서 중앙 구도(87.5%)를 보존한다.
//   - 가로(16:9)는 우측 12.5%만 자르고 세로를 정중앙 정렬(1120x630, x=0, y=45)한다.
//   - 정사각(1:1)은 우하단을 비우기 위해 좌상단 기준 12.5% 축소 크롭(x=0, y=0)한다.
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import { dirname, extname, resolve } from 'node:path';

export const DEFAULT_TRIM_RATIO = 0.125; // 실측 11.25% + 안전 여유 1.25%
const IMAGE_EXTS = new Set(['.png', '.jpg', '.jpeg', '.webp']);

function runBin(bin, args, opts = {}) {
  const res = spawnSync(bin, args, { maxBuffer: 64 * 1024 * 1024, ...opts });
  if (res.error) throw new Error(`${bin} 실행 실패: ${res.error.message}`);
  if (res.status !== 0) {
    const err = Buffer.isBuffer(res.stderr) ? res.stderr.toString('utf8') : String(res.stderr || '');
    throw new Error(`${bin} 실패(종료 ${res.status}): ${err.trim().slice(0, 400)}`);
  }
  return res;
}

function evenFloor(n) {
  const v = Math.floor(n);
  return Math.max(2, v - (v % 2));
}

function ensureDir(filePath) {
  const d = dirname(resolve(filePath));
  if (!existsSync(d)) mkdirSync(d, { recursive: true });
}

/** 워터마크 크롭을 미리 계산한 안전 여백 구도 지시를 프롬프트 끝에 덧붙인다(순수 함수). */
export function appendSafeMarginPrompt(prompt, { aspect = '9:16', enabled = true } = {}) {
  const base = String(prompt || '').trim();
  if (!enabled || !base) return base;
  const a = String(aspect || '9:16').trim();
  let guide;
  if (a === '9:16' || a === '3:4' || a === '2:3' || a === '4:5') {
    guide = 'Framing safety margin: compose the main subject comfortably inside the upper-center 82% of the frame, leaving a clean 15% bottom margin and completely plain empty bottom-right corner so bottom-edge cropping keeps the subject intact.';
  } else if (a === '16:9' || a === '4:3' || a === '3:2' || a === '21:9') {
    guide = 'Framing safety margin: compose the main subject comfortably inside the left-center 82% of the frame, leaving a clean 15% right margin and completely plain empty bottom-right corner so right-edge cropping keeps the subject intact.';
  } else {
    guide = 'Framing safety margin: compose the main subject slightly toward the upper-left center with generous plain negative space along the right and bottom 15% edges and an empty bottom-right corner.';
  }
  if (base.includes('Framing safety margin:')) return base;
  return `${base}\n\n${guide}`;
}

/** 입력 해상도와 비율에 맞춰 워터마크를 화면 밖으로 빼는 무왜곡 크롭 좌표를 계산한다(순수 함수). */
export function computeWatermarkCrop({
  width,
  height,
  trimRatio = DEFAULT_TRIM_RATIO,
  targetWidth = null,
  targetHeight = null,
} = {}) {
  const w = Number(width);
  const h = Number(height);
  const trim = Number(trimRatio);
  if (!Number.isFinite(w) || w < 64 || !Number.isFinite(h) || h < 64) {
    throw new Error(`유효하지 않은 해상도입니다: ${width}x${height}`);
  }
  if (!Number.isFinite(trim) || trim <= 0 || trim >= 0.45) {
    throw new Error(`trimRatio는 0 초과 0.45 미만이어야 합니다: ${trimRatio}`);
  }

  let cropW;
  let cropH;
  let x;
  let y;
  let strategy;

  if (h > w) {
    // 세로(9:16 등): 하단 trimRatio 제거 + 가로 정중앙 정렬
    strategy = 'bottom-trim-center-x';
    cropH = evenFloor(h * (1 - trim));
    cropW = evenFloor(cropH * (w / h));
    if (cropW > w) cropW = evenFloor(w);
    x = evenFloor((w - cropW) / 2);
    y = 0;
  } else if (w > h) {
    // 가로(16:9 등): 우측 trimRatio 제거 + 세로 정중앙 정렬
    strategy = 'right-trim-center-y';
    cropW = evenFloor(w * (1 - trim));
    cropH = evenFloor(cropW * (h / w));
    if (cropH > h) cropH = evenFloor(h);
    x = 0;
    y = evenFloor((h - cropH) / 2);
  } else {
    // 정사각(1:1): 우하단 제거를 위해 좌상단 기준 축소
    strategy = 'bottom-right-trim';
    cropW = evenFloor(w * (1 - trim));
    cropH = cropW;
    x = 0;
    y = 0;
  }

  let outW = targetWidth ? evenFloor(Number(targetWidth)) : null;
  let outH = targetHeight ? evenFloor(Number(targetHeight)) : null;
  if (!outW && !outH) {
    // 기본 출력 해상도: 9:16 720p→1080x1920, 16:9 720p→1920x1080, 그 외 원본 크기 복원
    if (w === 720 && h === 1280) {
      outW = 1080;
      outH = 1920;
    } else if (w === 1280 && h === 720) {
      outW = 1920;
      outH = 1080;
    } else {
      outW = evenFloor(w);
      outH = evenFloor(h);
    }
  } else if (outW && !outH) {
    outH = evenFloor(outW * (cropH / cropW));
  } else if (!outW && outH) {
    outW = evenFloor(outH * (cropW / cropH));
  }

  return {
    strategy,
    inputWidth: w,
    inputHeight: h,
    trimRatio: trim,
    cropW,
    cropH,
    x,
    y,
    outW,
    outH,
    retainedPercent: Math.round((cropW / w) * 1000) / 10,
    upscaleFactor: Math.round((outW / cropW) * 100) / 100,
    vf: `crop=${cropW}:${cropH}:${x}:${y},scale=${outW}:${outH}:flags=lanczos`,
  };
}

/** ffprobe로 실제 해상도·오디오 유무를 읽는다. */
export function probeDimensions(input, runner = runBin) {
  const abs = resolve(input);
  if (!existsSync(abs)) throw new Error(`입력 파일을 찾지 못했습니다: ${input}`);
  const res = runner(
    'ffprobe',
    ['-v', 'error', '-print_format', 'json', '-show_format', '-show_streams', abs],
    { encoding: 'utf8' },
  );
  const data = JSON.parse(res.stdout || '{}');
  const streams = Array.isArray(data.streams) ? data.streams : [];
  const v = streams.find((s) => s.codec_type === 'video');
  const a = streams.find((s) => s.codec_type === 'audio');
  if (!v || !v.width || !v.height) throw new Error(`영상/이미지 크기를 읽지 못했습니다: ${input}`);
  const dur = Number(data?.format?.duration ?? v?.duration);
  return {
    width: Number(v.width),
    height: Number(v.height),
    hasAudio: Boolean(a),
    durationSeconds: Number.isFinite(dur) ? Math.round(dur * 1000) / 1000 : null,
  };
}

/** 영상 또는 이미지의 우하단 워터마크 영역을 무왜곡 크롭·고화질 스케일한다. */
export function cropWatermarkMedia(
  { input, output, trimRatio = DEFAULT_TRIM_RATIO, targetWidth = null, targetHeight = null, mute = false },
  runner = runBin,
) {
  const absIn = resolve(input);
  if (!output) throw new Error('--output이 필요합니다');
  const absOut = resolve(output);
  ensureDir(absOut);

  const meta = probeDimensions(absIn, runner);
  const plan = computeWatermarkCrop({
    width: meta.width,
    height: meta.height,
    trimRatio,
    targetWidth,
    targetHeight,
  });
  const isImage = IMAGE_EXTS.has(extname(absIn).toLowerCase());

  const args = ['-y', '-v', 'error', '-i', absIn, '-vf', plan.vf];
  if (isImage) {
    args.push('-frames:v', '1', absOut);
  } else {
    args.push('-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '18', '-movflags', '+faststart');
    if (mute || !meta.hasAudio) args.push('-an');
    else args.push('-c:a', 'copy');
    args.push(absOut);
  }
  runner('ffmpeg', args, { encoding: 'utf8' });

  return {
    input: absIn,
    output: absOut,
    isImage,
    muted: Boolean(mute || !meta.hasAudio),
    durationSeconds: meta.durationSeconds,
    ...plan,
  };
}

/** 4방 모서리(좌상·우상·좌하·우하) 확대 검수 타일(2x2)을 만들어 워터마크 잔상 0px를 눈으로 확인한다. */
export function makeCornerCheckSheet(
  { input, output, time = 1.5, cornerSize = 240 },
  runner = runBin,
) {
  const absIn = resolve(input);
  if (!output) throw new Error('--output이 필요합니다');
  const absOut = resolve(output);
  ensureDir(absOut);

  const meta = probeDimensions(absIn, runner);
  const size = Math.min(Number(cornerSize) || 240, Math.floor(meta.width / 2), Math.floor(meta.height / 2));
  const isImage = IMAGE_EXTS.has(extname(absIn).toLowerCase());
  const seekSec = meta.durationSeconds ? Math.min(Number(time) || 0, Math.max(0, meta.durationSeconds - 0.2)) : 0;

  const fc = `[0:v]crop=${size}:${size}:0:0[tl];`
    + `[0:v]crop=${size}:${size}:iw-${size}:0[tr];`
    + `[0:v]crop=${size}:${size}:0:ih-${size}[bl];`
    + `[0:v]crop=${size}:${size}:iw-${size}:ih-${size}[br];`
    + `[tl][tr]hstack[top];[bl][br]hstack[bot];[top][bot]vstack[out]`;

  const args = ['-y', '-v', 'error'];
  if (!isImage && seekSec > 0) args.push('-ss', String(seekSec));
  args.push('-i', absIn, '-filter_complex', fc, '-map', '[out]', '-frames:v', '1', absOut);
  runner('ffmpeg', args, { encoding: 'utf8' });

  return {
    input: absIn,
    output: absOut,
    cornerSize: size,
    sampledAtSeconds: isImage ? null : Math.round(seekSec * 100) / 100,
  };
}
