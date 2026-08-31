import { generateAiThumbnailImage } from './ab-simulator.mjs';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';

async function debugGen() {
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
  const testTitle = '"보고 싶어요"를 영어로? 초급 영어 필수 문장 20개 EP2';
  const vKey = 'A';

  console.log('Testing generateAiThumbnailImage...');
  const res = await generateAiThumbnailImage({
    topic: testTitle,
    variantKey: vKey,
    format: 'LONGFORM',
    geminiKey
  });

  const svg = Buffer.from(res.imageUrl.replace('data:image/svg+xml;base64,', ''), 'base64').toString('utf8');
  console.log('SVG contains <image href="data:image/jpeg:', svg.includes('<image href="data:image/jpeg'));
  console.log('SVG length:', svg.length);
  if (!svg.includes('<image href="data:image/jpeg')) {
    console.log('SVG Preview:', svg.slice(0, 500));
  }
}

debugGen().catch(console.error);
