import { readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';

async function testFastGeminiDirectSvg() {
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
  const width = 1280;
  const height = 720;

  const prompt = `You are a world-class graphic designer and illustrator creating a custom, high-CTR YouTube thumbnail SVG for: "${topic}".
Generate a 100% UNIQUE, COMPLETE, STANDALONE, ARTISTIC SVG (viewBox="0 0 ${width} ${height}").

ABSOLUTE RULES:
- NO generic template boxes! Draw a creative, contextual visual scene directly related to "${topic}" (e.g. cozy room illustration, characters, speech bubbles, neon signs, blackboard, airport board, or custom expressive artwork).
- High CTR bold typography (Korean & English) with heavy drop shadows and outlines so it pops on mobile.
- Beautiful color harmony, gradients, lighting effects (<linearGradient>, <radialGradient>, <feDropShadow>).
- Keep the SVG concise, clean, and under 80 lines (less than 2500 bytes) so it completes in full without truncation.
- Output ONLY the raw valid SVG starting with <svg and ending with </svg>. No markdown backticks, no code fence, no commentary.`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${geminiKey}`;
  const start = Date.now();
  
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.7, maxOutputTokens: 6000 }
    })
  });

  console.log('Status:', res.status, 'Time:', (Date.now() - start) + 'ms');
  const data = await res.json();
  let raw = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  raw = raw.replace(/^```(svg|xml)?/i, '').replace(/```$/i, '').trim();
  const startIdx = raw.indexOf('<svg');
  const endIdx = raw.lastIndexOf('</svg>');
  if (startIdx !== -1 && endIdx !== -1) {
    const svg = raw.substring(startIdx, endIdx + 6);
    console.log('✅ Generated Unique SVG! Length:', svg.length);
    await writeFile('scripts/pure-ai-generated-thumb.svg', svg, 'utf8');
  } else {
    console.log('Raw output preview:', raw.slice(0, 300));
  }
}

testFastGeminiDirectSvg().catch(console.error);
