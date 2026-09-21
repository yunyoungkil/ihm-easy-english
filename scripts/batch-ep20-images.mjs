#!/usr/bin/env node

/**
 * Batch Image Generator for EP20
 * Generates all 24 required visual assets (scene illustrations, analogies, objects, character expressions)
 * using local ComfyUI instance (http://127.0.0.1:8188).
 */

import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const BASE_DIR = 'videos/ep20-world-rl/assets/images';
const REF_CONFUSED = `${BASE_DIR}/char_confused.jpg`;
const REF_CELEBRATE = `${BASE_DIR}/char_celebrate.jpg`;
const REF_CLOSING = `${BASE_DIR}/char_closing.jpg`;

const TASKS = [
  // Frame 1: Cold Open (3-step phone reaction)
  {
    output: `${BASE_DIR}/f01_phone_speaking.jpg`,
    prompt: "man in blue hoodie and baseball cap holding smartphone close to mouth speaking carefully, 2D comic art",
    image: REF_CONFUSED,
    denoise: 0.38
  },
  {
    output: `${BASE_DIR}/f01_phone_error.jpg`,
    prompt: "smartphone screen displaying big red error card with text OLD ❌ and warning frame, 2D comic art, warm cream background #F4EFE6"
  },
  {
    output: `${BASE_DIR}/f01_char_shocked.jpg`,
    prompt: "man in blue hoodie and baseball cap holding head in disbelief with sweat drops and shocked open mouth expression, 2D comic art",
    image: REF_CONFUSED,
    denoise: 0.40
  },

  // Frame 2: Big Question (3-step singing to jaw freeze)
  {
    output: `${BASE_DIR}/f02_singing_headphones.jpg`,
    prompt: "man wearing over-ear headphones singing happily with musical notes floating, 2D comic art",
    image: REF_CONFUSED,
    denoise: 0.38
  },
  {
    output: `${BASE_DIR}/f02_jaw_freeze.jpg`,
    prompt: "man with electric lightning spark at jawline, jaw frozen stiff, stunned wide eyes, 2D comic art",
    image: REF_CONFUSED,
    denoise: 0.40
  },
  {
    output: `${BASE_DIR}/f02_jaw_pain.jpg`,
    prompt: "man clutching his aching sore jaw with both hands, cartoon dizzy pain expression, 2D comic art",
    image: REF_CONFUSED,
    denoise: 0.38
  },

  // Frame 3: Physical Cause (Car crash analogy)
  {
    output: `${BASE_DIR}/f03_car_crash.jpg`,
    prompt: "red sports car and blue heavy truck colliding head-on in a narrow tunnel with comic collision spark and smoke explosion, 2D comic art, warm cream background #F4EFE6"
  },

  // Frame 4: Head Fake (Lazy tongue solution)
  {
    output: `${BASE_DIR}/f04_lazy_sofa.jpg`,
    prompt: "relaxed man resting comfortably lying down on cozy sofa eating popcorn, completely peaceful lazy smile, 2D comic art, warm cream background #F4EFE6"
  },
  {
    output: `${BASE_DIR}/f04_tongue_relax.jpg`,
    prompt: "diagram of human mouth profile with tongue resting relaxed comfortably at the bottom, glowing cyan contour, 2D clean comic art, warm cream background #F4EFE6"
  },

  // Frame 5: Step 1 Drill (OO - UH mouth expressions)
  {
    output: `${BASE_DIR}/f05_mouth_oo.jpg`,
    prompt: "man making round puckered lips whistling expression with OO shape, 2D comic art",
    image: REF_CONFUSED,
    denoise: 0.38
  },
  {
    output: `${BASE_DIR}/f05_mouth_uh.jpg`,
    prompt: "man dropping jaw down relaxed with soft open mouth yawning expression, 2D comic art",
    image: REF_CONFUSED,
    denoise: 0.38
  },

  // Frame 6: Step 2 Drill (Throat resonance & confident host)
  {
    output: `${BASE_DIR}/f06_throat_dark_l.jpg`,
    prompt: "cross section of human throat with acoustic deep sound vibration waves glowing deep blue, 2D comic art, warm cream background #F4EFE6"
  },
  {
    output: `${BASE_DIR}/f06_char_confident.jpg`,
    prompt: "man in blue hoodie and baseball cap pointing finger gun with proud confident smile and sparkle, 2D comic art",
    image: REF_CELEBRATE,
    denoise: 0.35
  },

  // Frame 7: Payoff (WORLD perfect recognition & celebration)
  {
    output: `${BASE_DIR}/f07_phone_success.jpg`,
    prompt: "smartphone screen displaying bright green success card with text WORLD 100% PERFECT ✔ and gold stars, 2D comic art, warm cream background #F4EFE6"
  },
  {
    output: `${BASE_DIR}/f07_char_success.jpg`,
    prompt: "man in blue hoodie and baseball cap pumping both fists in the air with joyful victory celebration, 2D comic art",
    image: REF_CELEBRATE,
    denoise: 0.35
  },

  // Frame 8: Transfer Learning (Girl & cool host)
  {
    output: `${BASE_DIR}/f08_girl_skater.jpg`,
    prompt: "trendy cool teenage girl riding skateboard wearing oversized hoodie, friendly cheerful pose, 2D comic art, warm cream background #F4EFE6"
  },
  {
    output: `${BASE_DIR}/f08_char_cool.jpg`,
    prompt: "man in blue hoodie and baseball cap giving double thumbs up with cool relaxed smile, 2D comic art",
    image: REF_CELEBRATE,
    denoise: 0.38
  },

  // Frame 9: Quiz 1 (Word vs World objects & listening host)
  {
    output: `${BASE_DIR}/f09_obj_word.jpg`,
    prompt: "stack of printed paper documents and open dictionary book with alphabet letters, 2D comic art object cutout, warm cream background #F4EFE6"
  },
  {
    output: `${BASE_DIR}/f09_obj_world.jpg`,
    prompt: "beautiful glowing blue and green globe of planet Earth on a wooden desk stand, 2D comic art object cutout, warm cream background #F4EFE6"
  },
  {
    output: `${BASE_DIR}/f09_char_listening.jpg`,
    prompt: "man in blue hoodie and baseball cap cupping hand behind ear listening intently with curious questioning expression, 2D comic art",
    image: REF_CONFUSED,
    denoise: 0.38
  },

  // Frame 10: Quiz 2 (Pearl & Curl objects & celebration)
  {
    output: `${BASE_DIR}/f10_obj_pearl.jpg`,
    prompt: "sparkling white pearl necklace jewelry in open gift box, 2D comic art cutout, warm cream background #F4EFE6"
  },
  {
    output: `${BASE_DIR}/f10_obj_curl.jpg`,
    prompt: "bouncy glossy curly hair strand lock with sparkles, 2D comic art cutout, warm cream background #F4EFE6"
  },

  // Frame 11: Summary (Teacher instructor)
  {
    output: `${BASE_DIR}/f11_char_teacher.jpg`,
    prompt: "man in blue hoodie holding a wooden pointing stick indicating forward, friendly teacher instructor expression, 2D comic art",
    image: REF_CELEBRATE,
    denoise: 0.38
  },

  // Frame 12: Closing (Goodbye wave)
  {
    output: `${BASE_DIR}/f12_char_goodbye.jpg`,
    prompt: "man in blue hoodie waving hand goodbye with warm friendly smile, 2D comic art",
    image: REF_CLOSING,
    denoise: 0.35
  }
];

function runCommand(args) {
  return new Promise((resolve, reject) => {
    const proc = spawn('node', ['scripts/local-image-gen.mjs', ...args], { stdio: 'inherit' });
    proc.on('close', code => {
      if (code === 0) resolve();
      else reject(new Error(`Process exited with code ${code}`));
    });
    proc.on('error', reject);
  });
}

async function main() {
  console.log(`[Batch Image Gen] Total assets to check/generate: ${TASKS.length}`);
  let count = 0;

  for (const task of TASKS) {
    count++;
    if (fs.existsSync(task.output)) {
      console.log(`[${count}/${TASKS.length}] Skipping existing: ${task.output}`);
      continue;
    }

    console.log(`\n========================================`);
    console.log(`[${count}/${TASKS.length}] Generating: ${task.output}`);
    console.log(`Prompt: ${task.prompt}`);
    if (task.image) {
      console.log(`Img2Img Reference: ${task.image} (Denoise: ${task.denoise})`);
    }
    console.log(`========================================`);

    const args = ['--prompt', task.prompt, '--output', task.output];
    if (task.image) {
      args.push('--image', task.image, '--denoise', String(task.denoise));
    }

    try {
      await runCommand(args);
      console.log(`[${count}/${TASKS.length}] ✅ Successfully created: ${task.output}`);
    } catch (err) {
      console.error(`[${count}/${TASKS.length}] ❌ Failed to generate ${task.output}:`, err.message);
    }
  }

  console.log(`\n🎉 All batch image generations completed!`);
}

main();
