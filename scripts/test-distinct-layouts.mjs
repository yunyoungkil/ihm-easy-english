import { generateAiThumbnailImage } from './ab-simulator.mjs';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';

async function test() {
  if (existsSync('.env')) {
    const text = await readFile('.env', 'utf8');
    for (const line of text.split(/\r?\n/)) {
      const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
      if (match && !process.env[match[1]]) {
        process.env[match[1]] = match[2].trim().replace(/^['"]|['"]$/g, '');
      }
    }
  }

  const geminiKey = process.env.GEMINI_API_KEY;
  const testTitle = "영어 발음, PICTURE는 왜 '픽투어'가 아닐까? | -TURE 규칙 (영어기초배우기 EP8)";

  for (const vKey of ['A', 'B', 'C']) {
    const res = await generateAiThumbnailImage({
      topic: testTitle,
      variantKey: vKey,
      format: 'LONGFORM',
      geminiKey
    });
    const svg = Buffer.from(res.imageUrl.replace('data:image/svg+xml;base64,', ''), 'base64').toString('utf8');
    console.log(`=== Variant ${vKey} ===`);
    console.log(`Has split background:`, svg.includes('leftRedBG'));
    console.log(`Has hero formula box:`, svg.includes('heroBoxGradLB'));
    console.log(`Has yellow 2-card column:`, svg.includes('yellowCardGradLA'));
  }
}

test().catch(console.error);
