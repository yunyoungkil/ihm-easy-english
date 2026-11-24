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

// 1. Lyria 3.5 BGM (Composer mode, calm warm editorial acoustic lo-fi documentary bed, zero vocal/humming tokens)
const bgmOut = join(ASSETS, 'bgm', 'track.mp3');
if (!CLIPS_ONLY) {
  if (!existsSync(bgmOut)) {
    console.log('=== [BGM] Generating Lyria 3.5 Longform Editorial BGM ===');
    runNode('scripts/generate-aistudio-music.mjs', [
      '--mode', 'composer',
      '--sections', 'Intro:0:00-0:10,Verse:0:10-0:46,Bridge:0:46-1:06,Outro:1:06-1:20',
      '--prompt', 'Warm calm editorial documentary instrumental groove, 96 BPM, soft felt piano chords, gentle muted nylon acoustic guitar plucks, warm upright bass pulse, delicate brushed snare rhythm, cozy coffeehouse study atmosphere, purely instrumental clean mix',
      '--output', 'videos/ep36-everyday-words-unheard/assets/bgm/track.mp3',
    ]);
  } else {
    console.log('SKIP BGM (exists)');
  }
}

if (BGM_ONLY) {
  console.log('BGM-ONLY MODE COMPLETE.');
  process.exit(0);
}

// 2. Omni 1.2 Flash 4 Real-Action 16:9 1080p Clips (anchored to existing watermark-free Nano Banana keyframes)
const CLIPS = [
  {
    id: 'c00-chocolate-snap',
    first: 'videos/ep36-everyday-words-unheard/assets/images/thumb-a-bg.jpg',
    out: 'videos/ep36-everyday-words-unheard/assets/clips/c00-chocolate-snap.mp4',
    duration: '5',
    prompt:
      '0-1.2s: dark moody editorial tabletop macro of glossy dark chocolate squares beside a vintage silver camera lens on matte charcoal slate, soft warm side studio light, subtle slow dolly-in.\n' +
      '1.2-3.0s: human fingertips enter neatly from the bottom-left and cleanly snap one dark chocolate square off the bar with crisp tactile tension, tiny cocoa crumbs settling on the dark slate.\n' +
      '3.0-5.0s: smooth slow settle on the broken glossy chocolate edge and silver camera lens in rich cinematic depth of field. Sound: crisp realistic dark chocolate snap foley on stone tabletop. Zero speech, zero text, zero watermark.',
  },
  {
    id: 'c01-cafe-blind',
    first: 'videos/ep36-everyday-words-unheard/assets/images/thumb-c-bg.jpg',
    out: 'videos/ep36-everyday-words-unheard/assets/clips/c01-cafe-blind.mp4',
    duration: '6',
    prompt:
      '0-2.0s: warm moody cafe tabletop close-up with gentle steam curling upward from a ceramic coffee cup, golden amber bokeh lights twinkling softly in the out-of-focus background.\n' +
      '2.0-4.5s: ultra-subtle cinematic handheld push-in as delicate wisps of warm steam drift slowly across soft morning window light, cozy hotel cafe ambiance.\n' +
      '4.5-6.0s: calm steady framing over the dark wooden table and warm glowing background bokeh. Sound: soft quiet cafe room tone with gentle distant ceramic cup clink. Zero speech, zero text, zero watermark.',
  },
  {
    id: 'c05-steak-sizzle',
    first: 'videos/ep36-everyday-words-unheard/assets/images/panel-02.png',
    out: 'videos/ep36-everyday-words-unheard/assets/clips/c05-steak-sizzle.mp4',
    duration: '5',
    prompt:
      '0-1.5s: crisp studio editorial tabletop view of a freshly seared medium-rare steak resting in a matte black cast-iron skillet on warm ivory paper, faint wisps of aromatic steam rising gently.\n' +
      '1.5-3.5s: melted herb butter glistens and softly bubbles along the seared steak crust as warm steam curls upward in soft directional daylight, gentle slow camera glide.\n' +
      '3.5-5.0s: calm editorial settle showcasing rich seared texture and clean shadows. Sound: gentle realistic cast-iron steak sizzle foley. Zero speech, zero text, zero watermark.',
  },
  {
    id: 'c07-hotel-buffet',
    first: 'videos/ep36-everyday-words-unheard/assets/images/panel-04.png',
    out: 'videos/ep36-everyday-words-unheard/assets/clips/c07-hotel-buffet.mp4',
    duration: '5',
    prompt:
      '0-1.8s: sunlit boutique hotel breakfast table with golden flaky croissants, fresh berries, and two ceramic coffee cups on warm natural wood in crisp morning window light.\n' +
      '1.8-4.0s: smooth gentle horizontal dolly glide across the sunlit breakfast spread as soft steam rises lightly from the coffee cups and morning sunlight shimmers across the tableware.\n' +
      '4.0-5.0s: steady bright editorial settle on the clean sunlit table. Sound: gentle quiet morning hotel dining room ambiance with soft porcelain clink. Zero speech, zero text, zero watermark.',
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
  console.log(`=== [CLIP ${i + 1}/${CLIPS.length}] Generating Omni 16:9 1080p clip: ${c.id} ===`);
  try {
    runNode('scripts/generate-aistudio-video.mjs', [
      '--first', c.first,
      '--prompt-file', `videos/ep36-everyday-words-unheard/assets/prompts/${c.id}.txt`,
      '--aspect', '16:9',
      '--duration', c.duration,
      '--resolution', '1080p',
      '--output', c.out,
      '--status', 'chosen',
    ]);
  } catch (err) {
    console.error(`WARN: Omni clip ${c.id} failed (${err.message}); continuing remaining media.`);
  }
  await new Promise((r) => setTimeout(r, 3500));
}
console.log('MEDIA BATCH FINISHED.');
