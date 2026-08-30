import { writeFile } from 'node:fs/promises';

async function testCompositeMasterpiece() {
  const photoUrl = "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800&auto=format&fit=crop&q=80";

  const compositeSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 720" width="1280" height="720">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#050811"/>
      <stop offset="50%" stop-color="#0A1124"/>
      <stop offset="100%" stop-color="#030509"/>
    </linearGradient>
    <linearGradient id="goldG" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#FFE600"/>
      <stop offset="100%" stop-color="#FF9900"/>
    </linearGradient>
    <linearGradient id="cyanG" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#00F0FF"/>
      <stop offset="100%" stop-color="#0088FF"/>
    </linearGradient>
    <radialGradient id="cyanGlow" cx="20%" cy="40%" r="65%">
      <stop offset="0%" stop-color="#00F0FF" stop-opacity="0.22"/>
      <stop offset="100%" stop-color="#00F0FF" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="pinkGlow" cx="80%" cy="30%" r="50%">
      <stop offset="0%" stop-color="#FF0077" stop-opacity="0.25"/>
      <stop offset="100%" stop-color="#FF0077" stop-opacity="0"/>
    </radialGradient>
    <filter id="shadow">
      <feDropShadow dx="0" dy="10" stdDeviation="8" flood-color="#000000" flood-opacity="0.95"/>
    </filter>
    <filter id="glow">
      <feGaussianBlur stdDeviation="8" result="blur"/>
      <feComposite in="SourceGraphic" in2="blur" operator="over"/>
    </filter>
    <clipPath id="personClip">
      <rect x="730" y="30" width="510" height="660" rx="32"/>
    </clipPath>
  </defs>

  <!-- Background -->
  <rect width="1280" height="720" fill="url(#bg)"/>
  <rect width="1280" height="720" fill="url(#cyanGlow)"/>
  <rect width="1280" height="720" fill="url(#pinkGlow)"/>

  <!-- Subtle Studio Grid -->
  <path d="M 0,140 L 1280,140 M 0,580 L 1280,580" stroke="#00F0FF" stroke-opacity="0.08" stroke-width="2"/>

  <!-- Right: Real Photorealistic Person Image Card -->
  <g filter="url(#shadow)">
    <!-- Neon Glowing Border Frame -->
    <rect x="726" y="26" width="518" height="668" rx="36" fill="none" stroke="url(#cyanG)" stroke-width="4" filter="url(#glow)"/>
    <!-- High-Res Unsplash Photo with Smooth Rounded Corners -->
    <image href="${photoUrl}" x="730" y="30" width="510" height="660" preserveAspectRatio="xMidYMid slice" clip-path="url(#personClip)"/>
    <!-- Bottom Shadow Gradient Overlay on Photo -->
    <rect x="730" y="460" width="510" height="230" fill="#050811" fill-opacity="0.65" clip-path="url(#personClip)"/>
  </g>

  <!-- Left: Top Badges -->
  <g transform="translate(60, 65)" filter="url(#shadow)">
    <rect x="0" y="0" width="130" height="46" rx="23" fill="#1E293B" stroke="#00F0FF" stroke-width="2"/>
    <text x="65" y="29" fill="#00F0FF" font-family="'Segoe UI', Roboto, sans-serif" font-weight="900" font-size="20" text-anchor="middle">EP.07</text>

    <rect x="145" y="0" width="230" height="46" rx="23" fill="url(#goldG)"/>
    <text x="260" y="29" fill="#000000" font-family="'Segoe UI', Roboto, sans-serif" font-weight="900" font-size="20" text-anchor="middle">1초 소리 족보 ⚡</text>
  </g>

  <!-- Left: Shock Headlines (Brendan Jowett & Shortcut English High CTR Style) -->
  <g transform="translate(60, 205)" filter="url(#shadow)">
    <text x="0" y="0" fill="#00F0FF" font-family="'Segoe UI', Roboto, sans-serif" font-weight="900" font-size="30" letter-spacing="1">99%가 틀리는 영어 발음 원리</text>
    <text x="0" y="95" fill="#FFFFFF" font-family="'Segoe UI', Roboto, 'Arial Black', sans-serif" font-weight="900" font-size="80" stroke="#000000" stroke-width="12" paint-order="stroke fill">‘션’이 아니다?!</text>
    <text x="0" y="200" fill="url(#goldG)" font-family="'Segoe UI', Roboto, 'Arial Black', sans-serif" font-weight="900" font-size="94" stroke="#000000" stroke-width="14" paint-order="stroke fill">‘젼’도 아니다?!</text>
  </g>

  <!-- Left: Bottom Contrast Box -->
  <g transform="translate(60, 520)" filter="url(#shadow)">
    <rect x="0" y="0" width="630" height="120" rx="24" fill="#061224" stroke="#00F0FF" stroke-width="3"/>
    <rect x="16" y="20" width="160" height="80" rx="16" fill="url(#cyanG)"/>
    <text x="96" y="68" fill="#020914" font-family="'Segoe UI', Roboto, sans-serif" font-weight="900" font-size="28" text-anchor="middle">비밀공식</text>
    <text x="195" y="54" fill="#FFFFFF" font-family="'Segoe UI', Roboto, sans-serif" font-weight="800" font-size="24">모음 뒤 -sion = </text>
    <text x="365" y="56" fill="#FFE600" font-family="'Segoe UI', Roboto, sans-serif" font-weight="900" font-size="30">[ ʒən ] ⭕</text>
    <text x="195" y="90" fill="#94A3B8" font-family="'Segoe UI', Roboto, sans-serif" font-weight="600" font-size="19">Decision '데시젼' 발음 3초 교정</text>
  </g>
</svg>`;

  await writeFile('scripts/photo-thumbnail-sample.svg', compositeSvg, 'utf8');
  console.log('✅ Composite Photorealistic SVG created successfully!');
}

testCompositeMasterpiece().catch(console.error);
