import { readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';

async function testPhotoGen() {
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
  const vKey = 'A';
  const W = 1280;
  const H = 720;
  const photoUrl = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800&auto=format&fit=crop&q=80';

  const prompt = `You are the Lead Art Director and YouTube Growth Strategist for English education channel '이해하면 쉬운영어' (Target: 3060 adult learners).

YOUR MISSION:
Draw a standalone High-CTR YouTube Thumbnail SVG (viewBox="0 0 ${W} ${H}") on topic: "${topic}".
Target Variant: ${vKey} (오답 충격 & 뒤통수형: 평생 맞다고 믿었던 콩글리시/오해를 찌르는 강렬한 시각적 충격)

DESIGN REQUIREMENTS:
1. BACKGROUND: Dark cinematic studio (#060911, #0F172A) with radial cyan (#00F0FF) and magenta (#FF0077) glow.
2. PHOTOREALISTIC HERO CARD (Right or Left):
   - Place a sleek rounded frame with a high-res photo element:
     <clipPath id="personClip"><rect x="730" y="30" width="510" height="660" rx="32"/></clipPath>
     <g filter="url(#shadow)">
       <rect x="726" y="26" width="518" height="668" rx="36" fill="none" stroke="#00F0FF" stroke-width="4"/>
       <image href="${photoUrl}" x="730" y="30" width="510" height="660" preserveAspectRatio="xMidYMid slice" clip-path="url(#personClip)"/>
       <rect x="730" y="460" width="510" height="230" fill="#060911" fill-opacity="0.7" clip-path="url(#personClip)"/>
     </g>
   - CRITICAL: DO NOT draw any crude humanoid path silhouettes or doodle monster shapes! Use ONLY the clean <image> photo card.
3. HIGH-CTR TYPOGRAPHY & BADGES (Other side):
   - Top Neon Pill Badges: [EP.07] + [🚨 99%가 틀림]
   - Massive 2~3 word headline with thick black stroke: e.g. "‘션’이 아니다?!" / "‘젼’도 아니다?!" (Yellow #FFE600, White #FFFFFF)
   - Bottom Secret Rule Box: [비밀공식: 모음 뒤 -sion = [젼] ⭕]
4. Clean code under 80 lines. Return ONLY the raw valid SVG starting with <svg and ending with </svg>.`;

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
  let raw = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  raw = raw.replace(/^```(svg|xml)?/i, '').replace(/```$/i, '').trim();
  const startIdx = raw.indexOf('<svg');
  const endIdx = raw.lastIndexOf('</svg>');
  if (startIdx !== -1 && endIdx !== -1) {
    const svg = raw.substring(startIdx, endIdx + 6);
    console.log('✅ Generated Photo-based SVG! Length:', svg.length);
    await writeFile('scripts/test-photo-gen.svg', svg, 'utf8');
  }
}

testPhotoGen().catch(console.error);
