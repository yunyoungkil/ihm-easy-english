import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';

async function testThemeGen() {
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

  const gEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${geminiKey}`;
  const start = Date.now();

  const prompt = `You are a world-class YouTube Thumbnail Art Director for English education channel '이해하면 쉬운영어'.
Topic: "${topic}"
Variant: ${vKey}

Choose the BEST visual style for this topic from:
- "dialogue-dilemma" (Emotional real-life dialogue, speech bubbles, longing/confused silhouette, warm twilight/cozy atmosphere)
- "chalkboard-master" (Chalkboard lecture, chalk handwriting textures, glowing green/dark slate, classroom teacher)
- "neon-soundwave" (Futuristic acoustic lab, holographic soundwaves, neon cyan/yellow formulas, audio frequency curves)
- "split-shock" (Dramatic red ❌ Konglish mistake vs emerald ⭕ native secret split contrast)
- "airport-travel" (Airport departure board, travel luggage, yellow/black high-contrast transit signs)

Craft a high-CTR plan:
Return JSON:
{
  "theme": "dialogue-dilemma",
  "hookLine1": "...",
  "hookLine2": "...",
  "mistakeText": "...",
  "mistakeNote": "...",
  "correctText": "...",
  "correctNote": "...",
  "badgeText": "...",
  "subCallout": "...",
  "bgPrimaryColor": "#...",
  "bgAccentColor": "#...",
  "sceneMood": "..."
}`;

  const res = await fetch(gEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.3, responseMimeType: 'application/json' }
    })
  });

  console.log('Status:', res.status, 'Time:', (Date.now() - start) + 'ms');
  const data = await res.json();
  const parsed = JSON.parse(data.candidates?.[0]?.content?.parts?.[0]?.text || '{}');
  console.log('Plan:', parsed);
}

testThemeGen().catch(console.error);
