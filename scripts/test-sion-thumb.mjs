import { readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';

async function testSionGeneration() {
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

  const topic = "-sion은 '션'일까 '젼'일까? 99%가 모르는 영어 발음의 숨겨진 과학적 원리 (시즌1 EP7)";
  const vKey = 'B';
  const W = 1280;
  const H = 720;

  const prompt = `You are the Lead Art Director and YouTube Growth Strategist for English education channel '이해하면 쉬운영어' (Target: 3060 adult learners).

YOUR MISSION:
Perform a deep COMPETITOR GAP & VIEWER PSYCHOLOGY ANALYSIS on topic: "${topic}".
Target Variant: ${vKey} (1초 소리 족보 & 비밀 공식형: Brendan Jowett 테크/노하우 스타일 - 2~3단어 초대형 네온 뱃지와 직관적 원리 가치 제안)

STEP 1. COMPETITOR DEFICIENCY OVERCOME:
- Typical competitors do: boring whiteboard photos, long text lists, low-contrast generic boxes.
- Our Channel Advantage: Brendan Jowett style dark cinematic studio lighting, neon rim-light flares (cyan, gold), expressive stylized character silhouette pointing, massive 2~3 word high-CTR micro-copy, floating high-contrast neon pill badges.

STEP 2. DRAW FULL STANDALONE SVG ARTWORK (viewBox="0 0 ${W} ${H}"):
- NO generic 3-box templates!
- Dark cinematic studio background with ambient radial glow and subtle lighting grid.
- Stylized vector silhouette/character on one side with vibrant cyan rim-light glow.
- Massive 2~3 word ultra-bold Korean/English typography (e.g. "-SION 소리 공식", "션 vs 젼", "DECISION") with thick black stroke and heavy drop shadows.
- Floating high-contrast neon pill badges ([EP.07], [1초 소리 족보 ⚡], [발음 비밀 ⭕]).
- NO verbose XML comments. Write clean, direct SVG code under 80 lines (< 4KB) so it completes cleanly and closes with </svg>.
- Return ONLY the raw SVG code starting with <svg and ending with </svg>. No markdown backticks.`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${geminiKey}`;
  const start = Date.now();
  
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.7, maxOutputTokens: 8192 }
    })
  });

  console.log('Status:', res.status, 'Time:', (Date.now() - start) + 'ms');
  const data = await res.json();
  console.log('FinishReason:', data.candidates?.[0]?.finishReason);
  let raw = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  console.log('Raw output length:', raw.length);
  console.log('Raw output preview:', raw.slice(0, 400));
  raw = raw.replace(/^```(svg|xml)?/i, '').replace(/```$/i, '').trim();
  const startIdx = raw.indexOf('<svg');
  const endIdx = raw.lastIndexOf('</svg>');
  if (startIdx !== -1 && endIdx !== -1) {
    const svg = raw.substring(startIdx, endIdx + 6);
    console.log('✅ Generated Sion Variant B SVG! Length:', svg.length);
    await writeFile('scripts/sion-variant-b.svg', svg, 'utf8');
  } else {
    console.log('No <svg> or </svg> tag. StartIdx:', startIdx, 'EndIdx:', endIdx);
  }
}

testSionGeneration().catch(console.error);
