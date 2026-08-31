import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';

async function testFull() {
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
  const testTitle = "-sion은 '션'일까 '전'일까? 99%가 모르는 영어 발음의 숨겨진 과학적 원리 (시즌1 EP7)";
  const vKey = "B";

  const gEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${geminiKey}`;
  const gRes = await fetch(gEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{
        parts: [{
          text: `You are an elite YouTube Thumbnail Visual Director and Midjourney prompt engineer for an English education channel ('이해하면 쉬운영어' for adult learners 3060).
Topic: "${testTitle}".
Variant: ${vKey} (Shock / Discovery / Scientific Sound Principle).

Generate:
1. "visualPrompt": An ultra-detailed cinematic English prompt for Flux/Midjourney describing a realistic visual scene for this thumbnail (e.g. realistic expressive Korean adult pointing to glowing holographic sound waves or retro television screen with scientific sound principle, warm cinematic lighting, photorealistic 8k).
2. "koreanHook1": Korean hook line 1 (max 8 chars)
3. "koreanHook2": Korean hook line 2 (max 10 chars)
4. "card1": Word 1
5. "card2": Word 2
6. "badgeText": Badge (max 6 chars)

Respond ONLY with valid JSON:
{"visualPrompt": "...", "koreanHook1": "...", "koreanHook2": "...", "card1": "...", "card2": "...", "badgeText": "..."}`
        }]
      }],
      generationConfig: { temperature: 0.4, responseMimeType: 'application/json' }
    })
  });

  const gData = await gRes.json();
  const parsed = JSON.parse(gData.candidates?.[0]?.content?.parts?.[0]?.text || '{}');
  console.log('Gemini:', parsed);

  const fluxUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(parsed.visualPrompt)}?width=1280&height=720&model=flux&nologo=true&enhance=true&seed=${Math.floor(Math.random()*100000)}`;
  const fRes = await fetch(fluxUrl);
  console.log('Flux Status:', fRes.status);
  if (fRes.ok) {
    const ab = await fRes.arrayBuffer();
    console.log('Success! Image size:', ab.byteLength);
  }
}

testFull().catch(console.error);
