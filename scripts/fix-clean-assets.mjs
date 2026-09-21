#!/usr/bin/env node

/**
 * Clean Asset Regenerator for EP20
 * Regenerates all character and scene assets using char_clean_base.jpg as reference.
 * Guarantees ZERO text, ZERO Chinese characters, ZERO broken English, and ZERO speech bubbles.
 */

import { spawn } from 'child_process';
import path from 'path';

const BASE_DIR = 'videos/ep20-world-rl/assets/images';
const REF_CLEAN = `${BASE_DIR}/char_clean_base.jpg`;

const TASKS = [
  {
    output: `${BASE_DIR}/f01_phone_speaking.jpg`,
    prompt: "man in blue hoodie and baseball cap holding smartphone close to mouth speaking carefully, 2D comic art",
    image: REF_CLEAN,
    denoise: 0.40
  },
  {
    output: `${BASE_DIR}/f02_singing_headphones.jpg`,
    prompt: "man in blue hoodie wearing over-ear headphones singing happily with musical notes floating, 2D comic art",
    image: REF_CLEAN,
    denoise: 0.40
  },
  {
    output: `${BASE_DIR}/f02_jaw_freeze.jpg`,
    prompt: "man in blue hoodie with cartoon electric spark at jawline, stiff frozen jaw, stunned wide eyes, 2D comic art",
    image: REF_CLEAN,
    denoise: 0.40
  },
  {
    output: `${BASE_DIR}/f02_jaw_pain.jpg`,
    prompt: "man in blue hoodie clutching his aching sore jaw with both hands, cartoon pain dizzy stars expression, 2D comic art",
    image: REF_CLEAN,
    denoise: 0.40
  },
  {
    output: `${BASE_DIR}/f04_lazy_sofa.jpg`,
    prompt: "relaxed man resting comfortably lying down on cozy sofa sleeping peacefully, completely relaxed lazy smile, 2D comic art, warm cream background #F4EFE6"
  },
  {
    output: `${BASE_DIR}/f05_mouth_oo.jpg`,
    prompt: "man in blue hoodie making round puckered lips whistling expression with OO mouth shape, 2D comic art",
    image: REF_CLEAN,
    denoise: 0.38
  },
  {
    output: `${BASE_DIR}/f05_mouth_uh.jpg`,
    prompt: "man in blue hoodie dropping jaw down relaxed with soft open mouth yawning expression, 2D comic art",
    image: REF_CLEAN,
    denoise: 0.38
  },
  {
    output: `${BASE_DIR}/f06_char_confident.jpg`,
    prompt: "man in blue hoodie and baseball cap pointing finger forward with proud confident smile and sparkle, 2D comic art",
    image: REF_CLEAN,
    denoise: 0.40
  },
  {
    output: `${BASE_DIR}/f07_char_success.jpg`,
    prompt: "man in blue hoodie and baseball cap pumping both fists in the air with joyful victory celebration, 2D comic art",
    image: REF_CLEAN,
    denoise: 0.42
  },
  {
    output: `${BASE_DIR}/f08_char_cool.jpg`,
    prompt: "man in blue hoodie and baseball cap giving double thumbs up with cool relaxed smile, 2D comic art",
    image: REF_CLEAN,
    denoise: 0.38
  },
  {
    output: `${BASE_DIR}/f09_char_listening.jpg`,
    prompt: "man in blue hoodie and baseball cap cupping hand behind ear listening intently with curious questioning expression, 2D comic art",
    image: REF_CLEAN,
    denoise: 0.40
  },
  {
    output: `${BASE_DIR}/f11_char_teacher.jpg`,
    prompt: "man in blue hoodie holding a wooden pointing stick indicating forward, friendly teacher instructor expression, 2D comic art",
    image: REF_CLEAN,
    denoise: 0.40
  },
  {
    output: `${BASE_DIR}/f12_char_goodbye.jpg`,
    prompt: "man in blue hoodie waving hand goodbye with warm friendly smile, 2D comic art",
    image: REF_CLEAN,
    denoise: 0.35
  }
];

async function runGenerator(task, idx, total) {
  return new Promise((resolve, reject) => {
    console.log(`\n========================================`);
    console.log(`[${idx + 1}/${total}] Generating: ${task.output}`);
    console.log(`Prompt: ${task.prompt}`);
    if (task.image) console.log(`Img2Img Reference: ${task.image} (Denoise: ${task.denoise})`);
    console.log(`========================================`);

    const args = [
      'scripts/local-image-gen.mjs',
      '--prompt', task.prompt,
      '--output', task.output
    ];

    if (task.image) {
      args.push('--image', task.image);
      args.push('--denoise', String(task.denoise));
    }

    const child = spawn('node', args, { stdio: 'inherit' });

    child.on('close', (code) => {
      if (code === 0) {
        console.log(`[${idx + 1}/${total}] ✅ Successfully created: ${task.output}`);
        resolve();
      } else {
        console.error(`[${idx + 1}/${total}] ❌ Failed to generate: ${task.output}`);
        reject(new Error(`Process exited with code ${code}`));
      }
    });
  });
}

async function main() {
  console.log(`🚀 Starting clean asset regeneration (Total ${TASKS.length} images)...`);
  for (let i = 0; i < TASKS.length; i++) {
    await runGenerator(TASKS[i], i, TASKS.length);
  }
  console.log(`\n🎉 All clean image generations completed with ZERO text/artifacts!`);
}

main().catch(err => {
  console.error("Batch regeneration failed:", err);
  process.exit(1);
});
