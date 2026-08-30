import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';

async function testGeminiToFlux() {
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
  const vKey = "C";

  const gEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${geminiKey}`;
  const gRes = await fetch(gEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{
        parts: [{
          text: `You are an elite YouTube Thumbnail Visual Director and Midjourney prompt engineer for an English education channel ('이해하면 쉬운영어' for adult learners 3060).
Topic: "${testTitle}".
Variant: ${vKey} (Shock / Wrong vs Right / Dramatic Reaction).

Generate:
1. "visualPrompt": An ultra-detailed cinematic English prompt for Flux/Midjourney that describes a unique, realistic visual scene for this thumbnail (e.g. realistic expressive Korean adult looking confused at a street sign vs eureka moment, warm cinematic lighting, photorealistic 8k, bokeh).
2. "koreanHook1": Short bold Korean hook line 1 (max 8 chars)
3. "koreanHook2": Short bold Korean hook line 2 (max 10 chars)
4. "keyWord": Key English word or phonetic rule to highlight (e.g. "PICTURE")

Respond ONLY with valid JSON:
{"visualPrompt": "...", "koreanHook1": "...", "koreanHook2": "...", "keyWord": "..."}`
        }]
      }],
      generationConfig: { temperature: 0.4, responseMimeType: 'application/json' }
    })
  });

  const gData = await gRes.json();
  const parsed = JSON.parse(gData.candidates?.[0]?.content?.parts?.[0]?.text || '{}');
  console.log('Gemini Planning:', parsed);

  // Call Flux
  const fluxUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(parsed.visualPrompt)}?width=1280&height=720&model=flux&nologo=true&enhance=true&seed=${Math.floor(Math.random()*100000)}`;
  console.log('Flux URL:', fluxUrl.slice(0, 120) + '...');
  const fRes = await fetch(fluxUrl);
  console.log('Flux status:', fRes.status);
  if (fRes.ok) {
    const buf = await fRes.arrayBuffer();
    console.log('Got realistic AI image:', buf.byteLength, 'bytes');
  }
}

testGeminiToFlux().catch(console.error);
