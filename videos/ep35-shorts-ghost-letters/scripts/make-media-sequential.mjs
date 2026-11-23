import {execFileSync} from 'node:child_process';
import {existsSync, mkdirSync, writeFileSync} from 'node:fs';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const EP_DIR = resolve(HERE, '..');
const ROOT = resolve(EP_DIR, '..', '..');
const ASSETS = join(EP_DIR, 'assets');
const PROMPTS_DIR = join(ASSETS, 'prompts');
mkdirSync(PROMPTS_DIR, {recursive: true});

const BGM_ONLY = process.argv.includes('--bgm-only');
const CLIPS_ONLY = process.argv.includes('--clips-only');

function runNode(scriptRel, args) {
  const full = join(ROOT, scriptRel);
  execFileSync(process.execPath, [full, ...args], {cwd: ROOT, stdio: 'inherit'});
}

// 1. Lyria 3.5 BGM (Composer mode, purely instrumental tactile editorial acoustic groove - zero vocal/humming tokens)
const bgmOut = join(ASSETS, 'bgm', 'track.mp3');
if (!CLIPS_ONLY) {
  if (!existsSync(bgmOut)) {
    console.log('=== [BGM] Generating Lyria 3.5 BGM ===');
    runNode('scripts/generate-aistudio-music.mjs', [
      '--mode', 'composer',
      '--sections', 'Intro:0:00-0:09,Verse:0:09-0:40,Outro:0:40-0:52',
      '--prompt', 'Warm witty editorial documentary acoustic groove, 108 BPM, crisp pizzicato strings, dry muted upright bass, playful wooden marimba ticks, light brushed snare and subtle tactile paper percussion, curious storytelling rhythm, purely instrumental chamber-funk mix',
      '--output', 'videos/ep35-shorts-ghost-letters/assets/bgm/track.mp3',
    ]);
  } else {
    console.log('SKIP BGM (exists)');
  }
}

if (BGM_ONLY) {
  console.log('BGM-ONLY MODE COMPLETE.');
  process.exit(0);
}

// 2. Omni 1.2 Flash 3 Real-Action Tactile Clips (1080p, 9:16, anchored to watermark-free --first keyframes)
// NOTE: Run after EP34's 3 clips or when Omni daily quota has room.
const CLIPS = [
  {
    id: 'c00-salmon-peel',
    first: 'videos/ep35-shorts-ghost-letters/assets/images/hero-salmon-peel.jpg',
    out: 'videos/ep35-shorts-ghost-letters/assets/clips/c00-salmon-peel.mp4',
    duration: '4',
    prompt:
      '0-0.6s: crisp overhead tabletop editorial macro of the fresh salmon fillet package resting on warm cream uncoated kraft paper in soft morning daylight, a crimson red masking-tape strip resting cleanly on the kraft label.\n' +
      '0.6-2.0s: human fingertips enter neatly from the right edge, pinch the lifted corner of the crimson masking-tape strip, and peel it diagonally upward off the paper with crisp tactile tension.\n' +
      '2.0-4.0s: the fingers lift the peeled crimson tape cleanly away out of frame, leaving subtle matte paper fiber texture behind under steady bright studio daylight; locked tripod overhead macro. Sound: crisp realistic masking tape peeling off kraft paper foley. Zero speech, zero text, zero watermark.',
  },
  {
    id: 'c04-receipt-roll',
    first: 'videos/ep35-shorts-ghost-letters/assets/images/hero-receipt-desk.jpg',
    out: 'videos/ep35-shorts-ghost-letters/assets/clips/c04-receipt-roll.mp4',
    duration: '4',
    prompt:
      '0-0.8s: warm bright editorial overhead macro of a clean blank cream thermal paper receipt resting on a wooden desk beside a matte red colored pencil in crisp natural daylight.\n' +
      '0.8-2.4s: fingertips smoothly slide the receipt curl flat across the desk while the red colored pencil rolls slightly and taps lightly beside the paper edge, realistic matte paper motion and clean shadows.\n' +
      '2.4-4.0s: the receipt settles flat and crisp on the warm tabletop under soft directional morning light; locked tripod overhead macro. Sound: dry crinkle of thermal receipt paper flattening on wood desk. Zero speech, zero text, zero watermark.',
  },
  {
    id: 'c08-island-peel',
    first: 'videos/ep35-shorts-ghost-letters/assets/images/hero-island-collage.jpg',
    out: 'videos/ep35-shorts-ghost-letters/assets/clips/c08-island-peel.mp4',
    duration: '5',
    prompt:
      '0-0.9s: bright studio editorial overhead macro of a handcrafted layered paper-cut green island diorama resting on textured cream risograph ocean paper with a small crimson masking-tape tab stuck at its edge.\n' +
      '0.9-2.8s: human fingertips reach in cleanly, catch the corner of the crimson masking-tape tab, and peel it cleanly off the textured paper island in one crisp tactile tug.\n' +
      '2.8-5.0s: the handmade paper island sits cleanly unveiled with delicate layered paper shadows in soft studio light; locked tripod overhead macro. Sound: crisp dry paper masking tape peel foley. Zero speech, zero text, zero watermark.',
  },
];

for (let i = 0; i < CLIPS.length; i++) {
  const c = CLIPS[i];
  const absOut = join(ROOT, c.out);
  const promptFile = join(PROMPTS_DIR, `${c.id}.txt`);
  writeFileSync(promptFile, c.prompt + '\n', 'utf8');
  if (existsSync(absOut)) {
    console.log(`SKIP CLIP (exists): ${c.id}`);
    continue;
  }
  console.log(`=== [CLIP ${i + 1}/${CLIPS.length}] Generating Omni 1080p clip: ${c.id} ===`);
  runNode('scripts/generate-aistudio-video.mjs', [
    '--first', c.first,
    '--prompt-file', `videos/ep35-shorts-ghost-letters/assets/prompts/${c.id}.txt`,
    '--aspect', '9:16',
    '--duration', c.duration,
    '--resolution', '1080p',
    '--output', c.out,
    '--status', 'chosen',
  ]);
  await new Promise((r) => setTimeout(r, 4000));
}
console.log('MEDIA BATCH FINISHED.');
