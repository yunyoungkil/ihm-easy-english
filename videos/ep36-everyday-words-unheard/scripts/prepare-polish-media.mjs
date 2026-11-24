import {execFileSync} from 'node:child_process';
import {existsSync, readFileSync} from 'node:fs';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const EP_DIR = resolve(HERE, '..');
const ROOT = resolve(EP_DIR, '..', '..');
const ASSETS = join(EP_DIR, 'assets');
const tl = JSON.parse(readFileSync(join(ASSETS, 'audio-timeline.json'), 'utf8'));
const S = Object.fromEntries(tl.scenes.map((sc) => [sc.id, sc]));

// 1. Generate 2 bespoke editorial studio photos for Scene 3 (comfortable) & Scene 6a (allergy)
const NEW_IMAGES = [
  {
    out: 'videos/ep36-everyday-words-unheard/assets/images/scene03-armchair.jpg',
    prompt: 'Warm minimalist editorial interior photography of a plush textured oatmeal-linen modern lounge armchair beside a sunlit wooden side table with a folded knitted throw blanket, soft morning window sunlight casting calm natural shadows against a warm ivory studio wall (#F7F4ED), high-craft magazine photography, clean composition. Strictly NO text, NO letters, NO numbers, NO logos, NO watermark, clean edges.',
  },
  {
    out: 'videos/ep36-everyday-words-unheard/assets/images/scene06-peach.jpg',
    prompt: 'Clean editorial still-life studio photography of two fresh fuzzy ripe pink-gold peaches resting on a matte handmade ceramic plate on warm ivory studio paper (#F7F4ED), crisp soft directional morning daylight and natural shadows, tactile minimalist food photography. Strictly NO text, NO letters, NO numbers, NO labels, NO logos, NO watermark, clean edges.',
  },
];

for (const img of NEW_IMAGES) {
  const abs = join(ROOT, img.out);
  if (existsSync(abs)) {
    console.log('SKIP IMAGE (exists):', img.out);
    continue;
  }
  console.log('Generating editorial image:', img.out);
  execFileSync(process.execPath, [
    join(ROOT, 'scripts', 'generate-aistudio-image.mjs'),
    '--prompt', img.prompt,
    '--aspect', '1:1',
    '--output', img.out,
  ], {cwd: ROOT, stdio: 'inherit'});
}

// 2. Build seamless ping-pong smooth loop videos (1 single clip per scene -> ZERO jump cuts!)
function makePingPongVideo(srcClip, dstClip, targetDur, extraFilter = '') {
  const src = join(ASSETS, 'clips', srcClip);
  const dst = join(ASSETS, 'clips', dstClip);
  const vfParts = [
    `[0:v]trim=0.1:4.9,setpts=PTS-STARTPTS[fwd]`,
    `[0:v]trim=0.1:4.9,reverse,setpts=PTS-STARTPTS[rev]`,
    `[fwd][rev]concat=n=2:v=1:a=0,fps=30${extraFilter ? ',' + extraFilter : ''}[pp]`,
  ];
  // Build one ping-pong cycle (9.6s), then stream_loop & trim cleanly to targetDur
  const cycleTmp = join(ASSETS, 'clips', `_cycle_${dstClip}`);
  execFileSync('ffmpeg', [
    '-y', '-v', 'error', '-i', src,
    '-filter_complex', vfParts.join(';'),
    '-map', '[pp]', '-an', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '20', '-preset', 'fast',
    cycleTmp,
  ]);
  execFileSync('ffmpeg', [
    '-y', '-v', 'error', '-stream_loop', '-1', '-i', cycleTmp,
    '-t', String(+(targetDur + 0.5).toFixed(3)),
    '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '20', '-preset', 'fast', '-movflags', '+faststart',
    dst,
  ]);
  console.log(`SMOOTH VIDEO OK: ${dstClip} (${(targetDur + 0.5).toFixed(2)}s)`);
}

// 3. Build smoothly crossfaded full-scene foley audio beds (ZERO abrupt 5s dropout!)
function makeSmoothFoley(srcWav, dstWav, targetDur) {
  const src = join(ASSETS, 'clips', srcWav);
  const dst = join(ASSETS, 'clips', dstWav);
  const durRaw = execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=nw=1:nk=1', src], {encoding: 'utf8'}).trim();
  const srcDur = Math.max(2, Number(durRaw));
  const loops = Math.max(1, Math.ceil((targetDur + 2) / Math.max(1.5, srcDur - 0.8)));
  const fadeOutSt = Math.max(0, +(targetDur - 1.0).toFixed(3));
  if (loops === 1) {
    execFileSync('ffmpeg', [
      '-y', '-v', 'error', '-i', src,
      '-af', `atrim=0:${targetDur},afade=t=in:st=0:d=0.5,afade=t=out:st=${fadeOutSt}:d=1.0`,
      '-ar', '24000', '-ac', '1', '-c:a', 'pcm_s16le', dst,
    ]);
  } else {
    const inputs = [];
    for (let i = 0; i < loops; i++) inputs.push('-i', src);
    const chains = [];
    let prev = '[0:a]';
    for (let i = 1; i < loops; i++) {
      const next = `[a${i}]`;
      chains.push(`${prev}[${i}:a]acrossfade=d=0.8:c1=tri:c2=tri${next}`);
      prev = next;
    }
    chains.push(`${prev}atrim=0:${targetDur},afade=t=in:st=0:d=0.5,afade=t=out:st=${fadeOutSt}:d=1.0[outa]`);
    execFileSync('ffmpeg', [
      '-y', '-v', 'error', ...inputs,
      '-filter_complex', chains.join(';'),
      '-map', '[outa]', '-ar', '24000', '-ac', '1', '-c:a', 'pcm_s16le', dst,
    ]);
  }
  console.log(`SMOOTH FOLEY OK: ${dstWav} (${targetDur.toFixed(2)}s)`);
}

makePingPongVideo('c01-cafe-blind.mp4', 'c01-smooth.mp4', S['scene-01'].duration);
// Differentiate Scene 8 visually from Scene 1 with a cool mint-teal cinema grade
makePingPongVideo('c01-cafe-blind.mp4', 'c08-smooth.mp4', S['scene-08'].duration, 'colorbalance=bs=0.14:gs=0.06:rm=-0.06:bm=0.10');
const s5RevealDur = +(S['scene-05'].end - (S['scene-05'].start + S['scene-05'].events.c05a.localStart)).toFixed(3);
makePingPongVideo('c05-steak-sizzle.mp4', 'c05-smooth.mp4', s5RevealDur);

makeSmoothFoley('c01-foley.wav', 'foley-s1-full.wav', S['scene-01'].duration);
makeSmoothFoley('c05-foley.wav', 'foley-s5-full.wav', s5RevealDur);
makeSmoothFoley('c01-foley.wav', 'foley-s8-full.wav', S['scene-08'].duration);
console.log('ALL POLISH MEDIA READY.');
