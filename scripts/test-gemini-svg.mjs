import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';

async function testGeminiSvgGeneration() {
  let geminiKey = process.env.GEMINI_API_KEY;
  if (!geminiKey && existsSync('.env')) {
    const text = await readFile('.env', 'utf8');
    for (const line of text.split(/\r?\n/)) {
      const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
      if (match && !process.env[match[1]]) {
        process.env[match[1]] = match[2].trim().replace(/^['"]|['"]$/g, '');
      }
    }
    geminiKey = process.env.GEMINI_API_KEY;
  }

  const topic = '"보고 싶어요"를 영어로? 초급 영어 필수 문장 20개 EP2';
  const vKey = 'A';
  const isShorts = false;
  const width = isShorts ? 720 : 1280;
  const height = isShorts ? 1280 : 720;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`;
  const prompt = `You are a world-class YouTube Thumbnail Designer & Vector Illustrator for an English education channel ('이해하면 쉬운영어' for 3060 adults).
Create a COMPLETELY UNIQUE, BREATHTAKING, FULL-PAGE standalone SVG thumbnail (viewBox="0 0 ${width} ${height}").

Topic: "${topic}"
Variant: ${vKey} (${vKey === 'A' ? 'Real Life Emotional Situation & Expression Dilemma' : vKey === 'B' ? 'Classroom Chalkboard & Scientific Sound Principle' : 'Shocking Real-Life Mistake vs Native Secret'}).

Design Requirements:
1. NO generic repetitive template boxes! Create a unique visual atmosphere that fits "${topic}" directly.
   - For example: Warm cozy illustrated dialogue scene, glowing airport departure board, chalkboard with handwritten chalk textures, neon futuristic soundwaves, or dramatic spotlighting.
2. Large, ultra-high CTR bold Korean & English typography (Pretendard / Arial Black, large font size, strong stroke and shadow for mobile readability).
3. Highly polished gradients, shadows, visual cues (arrows, speech bubbles, highlight stickers, emoji/stamps).
4. Return ONLY valid SVG starting with <svg and ending with </svg>. No markdown backticks, no explanations.`;

  const models = ['gemini-3.6-flash', 'gemini-3.1-flash', 'gemini-2.0-flash-exp'];
  for (const m of models) {
    console.log(`Testing model: ${m}...`);
    try {
      const mUrl = `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${geminiKey}`;
      const res = await fetch(mUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.7 }
        })
      });
      console.log(`${m} status:`, res.status);
      if (res.ok) {
        const data = await res.json();
        let raw = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        raw = raw.replace(/^```(svg|xml)?/i, '').replace(/```$/i, '').trim();
        const startIdx = raw.indexOf('<svg');
        const endIdx = raw.lastIndexOf('</svg>');
        if (startIdx !== -1 && endIdx !== -1) {
          const svg = raw.substring(startIdx, endIdx + 6);
          console.log(`✅ Success with ${m}! SVG length: ${svg.length}`);
          const { writeFile } = await import('node:fs/promises');
          await writeFile(`scripts/test-gemini-custom-art.svg`, svg, 'utf8');
          return;
        }
      }
    } catch (e) {
      console.error(e.message);
    }
  }
}

testGeminiSvgGeneration().catch(console.error);
