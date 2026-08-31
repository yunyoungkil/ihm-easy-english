import { readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';

async function testCompetitorGapThumbnail() {
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
  const vKey = 'A'; // A: 충격 반격, B: 1초 소리 족보, C: 리얼 뉘앙스 대비
  const isShorts = false;
  const W = isShorts ? 720 : 1280;
  const H = isShorts ? 1280 : 720;

  console.log('1️⃣ [경쟁사 결핍 및 시청자 심리 진단 + 레퍼런스급 썸네일 아트워크 생성 시작]');

  const prompt = `You are the Lead Art Director and YouTube Growth Strategist for English education channel '이해하면 쉬운영어' (Target: 3060 adult learners).

YOUR MISSION:
Analyze the topic: "${topic}"
Target Variant: ${vKey} (${
    vKey === 'A'
      ? '오답 충격 & 뒤통수형 (시청자가 평생 맞다고 믿었던 콩글리시/오해를 찌르는 강렬한 시각적 충격)'
      : vKey === 'B'
      ? '1초 소리 족보 & 비밀 공식형 (Brendan Jowett 테크/노하우 스타일: 2~3단어 초대형 네온 뱃지와 직관적 가치 제안)'
      : '원어민 리얼 뉘앙스 & 비교 대조형 (상황별 당혹스러운 실수 ❌ vs 원어민 진짜 정답 ⭕의 극적 대비)'
  })

STEP 1. COMPETITOR GAP & VIEWER PSYCHOLOGY ANALYSIS:
- Typical Competitors do: boring chalkboard photos, long sentence lists, low-contrast text.
- Our Channel's Unfair Advantage: Brendan Jowett style dark cinematic studio lighting, rim-light glow, expressive reaction figure/character, massive 2~3 word high-CTR micro-copy, floating neon pill badges.

STEP 2. GENERATE FULL STANDALONE SVG ARTWORK (viewBox="0 0 ${W} ${H}"):
- NO generic 3-box templates!
- Draw a cinematic dark studio background with vibrant neon rim lights (cyan, pink/red, golden yellow).
- Draw an expressive character/reaction silhouette or stylized vector figure on one side (puzzled/shocked for A, confident/holding device for B, dynamic speaker for C).
- Place massive, ultra-bold 2~3 word typography with thick black stroke and heavy drop shadows.
- Include floating high-contrast neon pill badges and stickers (e.g. [I MISS YOU?], [절대 금지 ❌], [1초 소리 족보 ⚡], [EP.02]).
- Clean, compact, valid SVG under 80 lines (< 4KB). Output ONLY the raw SVG code starting with <svg and ending with </svg>.`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${geminiKey}`;
  const start = Date.now();
  
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.7, maxOutputTokens: 5000 }
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
    console.log('✅ Generated Reference-Grade Competitor-Gap SVG! Length:', svg.length);
    await writeFile('scripts/competitor-gap-thumb-sample.svg', svg, 'utf8');
  } else {
    console.log('Raw output preview:', raw.slice(0, 300));
  }
}

testCompetitorGapThumbnail().catch(console.error);
