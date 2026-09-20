#!/usr/bin/env node

/**
 * Local AI Image Generator Bridge for Antigravity & Easy English Channel
 * Connects directly to local ComfyUI instance (http://127.0.0.1:8188)
 * Supports both Txt2Img and Img2Img (Character/Style Consistency)
 * 
 * Usage:
 *   node scripts/local-image-gen.mjs --prompt "..." --output "path/to/save.jpg" [--image "path/to/ref.jpg"] [--denoise 0.55]
 */

import http from 'http';
import fs from 'fs';
import path from 'path';

const COMFY_HOST = '127.0.0.1';
const COMFY_PORT = 8188;
const COMFY_INPUT_DIR = 'C:\\ai-tools\\ComfyUI_windows_portable\\ComfyUI\\input';

function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    prompt: '',
    negative: 'ugly, blurry, bad anatomy, deformed, disfigured, poor details, low quality, dark background, text, watermark, signature, different character, different person, realistic photo',
    output: '',
    image: '',
    denoise: 0.58,
    aspect: '1:1',
    steps: 25,
    cfg: 7.0,
    seed: Math.floor(Math.random() * 1000000000)
  };

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--prompt' && args[i + 1]) {
      options.prompt = args[++i];
    } else if (args[i] === '--negative' && args[i + 1]) {
      options.negative = args[++i];
    } else if (args[i] === '--output' && args[i + 1]) {
      options.output = args[++i];
    } else if (args[i] === '--image' && args[i + 1]) {
      options.image = args[++i];
    } else if (args[i] === '--denoise' && args[i + 1]) {
      options.denoise = parseFloat(args[++i]);
    } else if (args[i] === '--aspect' && args[i + 1]) {
      options.aspect = args[++i];
    } else if (args[i] === '--steps' && args[i + 1]) {
      options.steps = parseInt(args[++i], 10);
    }
  }

  return options;
}

function getDimensions(aspect) {
  switch (aspect) {
    case '16:9': return { width: 912, height: 512 };
    case '4:3':  return { width: 768, height: 576 };
    case '3:4':  return { width: 576, height: 768 };
    case '1:1':
    default:     return { width: 640, height: 640 };
  }
}

function makeTxt2ImgWorkflow(prompt, negative, width, height, seed, steps, cfg) {
  return {
    "3": {
      "inputs": {
        "seed": seed,
        "steps": steps,
        "cfg": cfg,
        "sampler_name": "dpmpp_2m",
        "scheduler": "karras",
        "denoise": 1,
        "model": ["4", 0],
        "positive": ["6", 0],
        "negative": ["7", 0],
        "latent_image": ["5", 0]
      },
      "class_type": "KSampler"
    },
    "4": {
      "inputs": { "ckpt_name": "dreamshaper_8.safetensors" },
      "class_type": "CheckpointLoaderSimple"
    },
    "5": {
      "inputs": { "width": width, "height": height, "batch_size": 1 },
      "class_type": "EmptyLatentImage"
    },
    "6": {
      "inputs": {
        "text": `${prompt}, 2D comic art, thick clean black ink outlines, flat colors, cartoon illustration, warm cream background #F4EFE6`,
        "clip": ["4", 1]
      },
      "class_type": "CLIPTextEncode"
    },
    "7": {
      "inputs": { "text": negative, "clip": ["4", 1] },
      "class_type": "CLIPTextEncode"
    },
    "8": {
      "inputs": { "samples": ["3", 0], "vae": ["4", 2] },
      "class_type": "VAEDecode"
    },
    "9": {
      "inputs": { "filename_prefix": "EasyEnglishLocal", "images": ["8", 0] },
      "class_type": "SaveImage"
    }
  };
}

function makeImg2ImgWorkflow(prompt, negative, inputImageFilename, seed, steps, cfg, denoise) {
  return {
    "3": {
      "inputs": {
        "seed": seed,
        "steps": steps,
        "cfg": cfg,
        "sampler_name": "dpmpp_2m",
        "scheduler": "karras",
        "denoise": denoise,
        "model": ["4", 0],
        "positive": ["6", 0],
        "negative": ["7", 0],
        "latent_image": ["11", 0]
      },
      "class_type": "KSampler"
    },
    "4": {
      "inputs": { "ckpt_name": "dreamshaper_8.safetensors" },
      "class_type": "CheckpointLoaderSimple"
    },
    "6": {
      "inputs": {
        "text": `${prompt}, 2D comic art, thick clean black ink outlines, flat colors, cartoon illustration, warm cream background #F4EFE6`,
        "clip": ["4", 1]
      },
      "class_type": "CLIPTextEncode"
    },
    "7": {
      "inputs": { "text": negative, "clip": ["4", 1] },
      "class_type": "CLIPTextEncode"
    },
    "8": {
      "inputs": { "samples": ["3", 0], "vae": ["4", 2] },
      "class_type": "VAEDecode"
    },
    "9": {
      "inputs": { "filename_prefix": "EasyEnglishImg2Img", "images": ["8", 0] },
      "class_type": "SaveImage"
    },
    "10": {
      "inputs": { "image": inputImageFilename, "upload": "image" },
      "class_type": "LoadImage"
    },
    "12": {
      "inputs": {
        "image": ["10", 0],
        "upscale_method": "bilinear",
        "width": 640,
        "height": 640,
        "crop": "center"
      },
      "class_type": "ImageScale"
    },
    "11": {
      "inputs": { "pixels": ["12", 0], "vae": ["4", 2] },
      "class_type": "VAEEncode"
    }
  };
}

async function request(method, pathName, body) {
  return new Promise((resolve, reject) => {
    const dataString = body ? JSON.stringify(body) : null;
    const req = http.request({
      host: COMFY_HOST,
      port: COMFY_PORT,
      path: pathName,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        ...(dataString ? { 'Content-Length': Buffer.byteLength(dataString) } : {})
      }
    }, res => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => {
        const buffer = Buffer.concat(chunks);
        if (res.headers['content-type'] && res.headers['content-type'].includes('application/json')) {
          try {
            resolve(JSON.parse(buffer.toString('utf8')));
          } catch(e) {
            resolve(buffer.toString('utf8'));
          }
        } else {
          resolve(buffer);
        }
      });
    });

    req.on('error', reject);
    if (dataString) req.write(dataString);
    req.end();
  });
}

async function main() {
  const opts = parseArgs();
  if (!opts.prompt) {
    console.error("Error: --prompt is required.");
    process.exit(1);
  }
  if (!opts.output) {
    console.error("Error: --output is required.");
    process.exit(1);
  }

  let workflow;
  if (opts.image) {
    if (!fs.existsSync(opts.image)) {
      console.error(`Error: Reference image not found at ${opts.image}`);
      process.exit(1);
    }
    if (!fs.existsSync(COMFY_INPUT_DIR)) {
      fs.mkdirSync(COMFY_INPUT_DIR, { recursive: true });
    }
    const inputExt = path.extname(opts.image);
    const inputFilename = `ref_${Date.now()}${inputExt}`;
    const destPath = path.join(COMFY_INPUT_DIR, inputFilename);
    fs.copyFileSync(opts.image, destPath);

    console.log(`[Local AI - Img2Img] Reference image loaded: ${opts.image} -> ${inputFilename} (Denoise: ${opts.denoise})`);
    console.log(`[Local AI] Prompt: "${opts.prompt}"...`);
    workflow = makeImg2ImgWorkflow(opts.prompt, opts.negative, inputFilename, opts.seed, opts.steps, opts.cfg, opts.denoise);
  } else {
    const { width, height } = getDimensions(opts.aspect);
    console.log(`[Local AI - Txt2Img] Generating: "${opts.prompt}" (${width}x${height})...`);
    workflow = makeTxt2ImgWorkflow(opts.prompt, opts.negative, width, height, opts.seed, opts.steps, opts.cfg);
  }
  
  try {
    const queueRes = await request('POST', '/prompt', { prompt: workflow });
    const promptId = queueRes.prompt_id;
    if (!promptId) {
      throw new Error(`Failed to queue prompt: ${JSON.stringify(queueRes)}`);
    }

    console.log(`[Local AI] Queued with ID: ${promptId}. Waiting for completion...`);

    // Poll for completion (up to 180 seconds)
    let filename = null;
    let subfolder = '';
    let type = 'output';

    for (let i = 0; i < 180; i++) {
      await new Promise(r => setTimeout(r, 1000));
      const historyRes = await request('GET', `/history/${promptId}`);
      if (historyRes && historyRes[promptId] && historyRes[promptId].outputs && historyRes[promptId].outputs['9']) {
        const images = historyRes[promptId].outputs['9'].images;
        if (images && images.length > 0) {
          filename = images[0].filename;
          subfolder = images[0].subfolder || '';
          type = images[0].type || 'output';
          break;
        }
      }
    }

    if (!filename) {
      throw new Error("Generation timed out after 60 seconds.");
    }

    console.log(`[Local AI] Image generated: ${filename}. Downloading...`);
    const imgBuffer = await request('GET', `/view?filename=${encodeURIComponent(filename)}&subfolder=${encodeURIComponent(subfolder)}&type=${encodeURIComponent(type)}`);

    const outDir = path.dirname(path.resolve(opts.output));
    if (!fs.existsSync(outDir)) {
      fs.mkdirSync(outDir, { recursive: true });
    }

    fs.writeFileSync(opts.output, imgBuffer);
    console.log(`[Local AI] Successfully saved image to: ${opts.output} (${imgBuffer.length} bytes)`);
  } catch (err) {
    console.error("[Local AI] Generation failed:", err.message);
    process.exit(1);
  }
}

main();
