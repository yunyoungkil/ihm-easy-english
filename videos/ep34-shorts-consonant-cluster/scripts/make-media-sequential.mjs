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

function runNode(scriptRel, args) {
  const full = join(ROOT, scriptRel);
  execFileSync(process.execPath, [full, ...args], {cwd: ROOT, stdio: 'inherit'});
}

// 1. Lyria 3.5 BGM (Composer mode, positive instrumental prompt ONLY - zero vocal/humming tokens)
const bgmOut = join(ASSETS, 'bgm', 'track.mp3');
if (!existsSync(bgmOut)) {
  console.log('=== [1/5] Generating Lyria 3.5 BGM ===');
  try {
    runNode('scripts/generate-aistudio-music.mjs', [
      '--mode', 'composer',
      '--sections', 'Intro:0:00-0:08,Verse:0:08-0:36,Outro:0:36-0:46',
      '--prompt', 'Modern Swiss editorial minimalist groove, 110 BPM, crisp marimba, clean plucked Rhodes, tight light brushed snare and muted bassline, bright curious rhythmic pulse, purely instrumental acoustic-electronic mix',
      '--output', 'videos/ep34-shorts-consonant-cluster/assets/bgm/track.mp3',
    ]);
  } catch (e) {
    console.error('BGM FAILED:', e.message);
  }
} else {
  console.log('SKIP BGM (exists)');
}

// 2. Omni 1.2 Flash 4 Real-Action Macro Clips (1080p, 9:16, anchored to watermark-free --first keyframes)
const CLIPS = [
  {
    id: 'c00-press',
    first: 'videos/ep34-shorts-consonant-cluster/assets/images/bg-hook-press.jpg',
    out: 'videos/ep34-shorts-consonant-cluster/assets/clips/c00-press.mp4',
    duration: '4',
    prompt:
      '0-0.8s: static studio macro of the matte cobalt blue and orange stacked cubes under the brushed steel hydraulic press head, subtle clean studio light.\n' +
      '0.8-2.0s: the brushed steel press descends smoothly and presses down firmly on the 4 matte blocks, compressing them tightly with crisp tactile mechanical weight and a subtle contact shadow shift.\n' +
      '2.0-4.0s: the press holds the tight compression steadily with gentle studio lighting sheen; ultra-clean Swiss commercial product cinematography, locked tripod macro. Sound: crisp pneumatic hydraulic hiss and solid mechanical thud. Purely physical studio foley, zero speech, zero text, zero watermark.',
  },
  {
    id: 'c02-stressball',
    first: 'videos/ep34-shorts-consonant-cluster/assets/images/bg-stressball.jpg',
    out: 'videos/ep34-shorts-consonant-cluster/assets/clips/c02-stressball.mp4',
    duration: '4',
    prompt:
      '0-0.7s: clean studio macro, fingertips resting gently on the matte electric cobalt blue stress ball against the warm off-white tabletop.\n' +
      '0.7-2.2s: fingertips squeeze the matte cobalt stress ball firmly inward in crisp slow-motion, showing realistic soft matte rubber deformation and crisp studio shadows.\n' +
      '2.2-4.0s: fingertips smoothly ease pressure as the ball rebounds neatly into shape; steady commercial macro camera. Sound: soft tactile rubber squeeze foley in a quiet studio. Zero speech, zero text, zero watermark.',
  },
  {
    id: 'c06-spray',
    first: 'videos/ep34-shorts-consonant-cluster/assets/images/bg-spray.jpg',
    out: 'videos/ep34-shorts-consonant-cluster/assets/clips/c06-spray.mp4',
    duration: '4',
    prompt:
      '0-0.8s: crisp minimalist studio macro of the cobalt blue glass spray bottle nozzle held steady on warm off-white background.\n' +
      '0.8-1.5s: fingertip presses the nozzle down sharply once, releasing one crisp burst of fine backlit water mist particles shooting cleanly into the air.\n' +
      '1.5-4.0s: fine mist droplets drift and shimmer slowly in clean directional studio light before fading; sharp commercial macro camera. Sound: one crisp sharp spray mist burst psst sound. Zero speech, zero text, zero watermark.',
  },
  {
    id: 'c09-strike',
    first: 'videos/ep34-shorts-consonant-cluster/assets/images/bg-strike.jpg',
    out: 'videos/ep34-shorts-consonant-cluster/assets/clips/c09-strike.mp4',
    duration: '5',
    prompt:
      '0-5.0s: smooth steady forward dolly camera glide down the sleek matte cobalt blue bowling lane toward the glowing orange neon arch and crisp white bowling pins at the end; subtle architectural light reflections sliding along the walls and lane floor; ultra-clean Swiss minimalist 3D commercial aesthetic. Sound: smooth low subtle bowling lane ambience and soft distant air hum. Zero speech, zero text, zero watermark.',
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
  console.log(`=== [${i + 2}/5] Generating Omni 1080p clip: ${c.id} ===`);
  try {
    runNode('scripts/generate-aistudio-video.mjs', [
      '--first', c.first,
      '--prompt-file', `videos/ep34-shorts-consonant-cluster/assets/prompts/${c.id}.txt`,
      '--aspect', '9:16',
      '--duration', c.duration,
      '--resolution', '1080p',
      '--output', c.out,
      '--status', 'chosen',
    ]);
  } catch (e) {
    console.error(`CLIP FAILED (${c.id}):`, e.message);
  }
  await new Promise((r) => setTimeout(r, 4000));
}
console.log('MEDIA BATCH FINISHED.');
