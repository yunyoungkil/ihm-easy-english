import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';

async function main() {
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
  const testTitle = "영어 읽는 법 | HEROIC은 왜 히로익일까? -IC만 알면 끝! (영어기초배우기 EP5)";
  const vKey = "A";

  const prompt = `You are an expert YouTube Thumbnail Typography Designer for an English Education channel ('이해하면 쉬운영어' for 3060 adults).
Topic/Title: "${testTitle}" (16:9 Longform).
Variant Key: ${vKey} (3-Row Quiz Test).

Extract or craft high-CTR educational thumbnail text cards tailored for Variant ${vKey}:
- hookLine1: Korean hook top line (max 10 chars, e.g. "HEROIC은 왜")
- hookLine2: Korean hook second line (max 12 chars, e.g. "히로익일까?")
- card1: First key English word/phonetic card (e.g. "HEROIC")
- card2: Second key English word/phonetic card (e.g. "PICNIC")
- card3: Third key English word/phonetic card (e.g. "-IC 소리 규칙")
- badgeText: Highlight badge text (max 8 chars)
- subCallout: Bottom callout tip (max 14 chars)

Respond ONLY with valid JSON:
{"hookLine1": "...", "hookLine2": "...", "card1": "...", "card2": "...", "card3": "...", "badgeText": "...", "subCallout": "..."}`;

  const models = ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-3.6-flash'];
  for (const m of models) {
    const gEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${geminiKey}`;
    const res = await fetch(gEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.2, responseMimeType: 'application/json' }
      })
    });
    console.log(`Model ${m} status:`, res.status);
    if (res.ok) {
      const data = await res.json();
      console.log('Result from', m, ':', data.candidates?.[0]?.content?.parts?.[0]?.text);
      break;
    }
  }
}

main().catch(console.error);
