import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectDir = dirname(dirname(fileURLToPath(import.meta.url)));
const marketDemandPath = join(projectDir, 'data', 'youtube', 'market-demand.json');
const catalogPath = join(projectDir, 'data', 'youtube', 'catalog.json');
const tempThumbDir = join(projectDir, 'output', 'temp-thumbnails');

export async function getMockCompetitorVideos() {
  const competitorVideos = [];

  if (existsSync(marketDemandPath)) {
    try {
      const data = JSON.parse(await readFile(marketDemandPath, 'utf8'));
      const keywords = data.byKeyword || [];
      for (const kw of keywords) {
        for (const item of (kw.topOutliers || [])) {
          if (!item.videoId || competitorVideos.some(v => v.videoId === item.videoId)) continue;
          competitorVideos.push({
            videoId: item.videoId,
            title: item.title,
            channelTitle: item.channelTitle || '영어 교육 채널',
            views: item.viewCount || Math.floor(Math.random() * 800000 + 100000),
            publishedAgo: item.publishedAt ? formatTimeAgo(item.publishedAt) : '3주 전',
            thumbnail: item.thumbnail || `https://i.ytimg.com/vi/${item.videoId}/mqdefault.jpg`,
            channelAvatar: `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(item.channelTitle || item.videoId)}`,
            duration: '08:24',
          });
        }
      }
    } catch {}
  }

  // Fallback defaults if market-demand is sparse
  if (competitorVideos.length < 6) {
    const fallbackList = [
      {
        videoId: 't_wVvVyqdbg',
        title: "30초 만에 'Want' vs 'Won't' #발음 완벽 구분! 원어민은 이렇게 듣습니다",
        channelTitle: '영어 발음 연구소',
        views: 892000,
        publishedAgo: '2주 전',
        thumbnail: 'https://i.ytimg.com/vi/t_wVvVyqdbg/mqdefault.jpg',
        channelAvatar: 'https://api.dicebear.com/7.x/identicon/svg?seed=eng1',
        duration: '06:12',
      },
      {
        videoId: 'WZFLgtzV_80',
        title: '영어 수동태 단번에 마스터 하기 (원리만 알면 초보도 1초 컷)',
        channelTitle: '이지 잉글리시',
        views: 645000,
        publishedAgo: '1개월 전',
        thumbnail: 'https://i.ytimg.com/vi/WZFLgtzV_80/mqdefault.jpg',
        channelAvatar: 'https://api.dicebear.com/7.x/identicon/svg?seed=eng2',
        duration: '11:45',
      },
      {
        videoId: '5MiM1tIpQQk',
        title: 'TREASURE를 ‘트레처’라고 읽으면 틀립니다! #영어발음',
        channelTitle: '발음의 신',
        views: 1200000,
        publishedAgo: '3일 전',
        thumbnail: 'https://i.ytimg.com/vi/5MiM1tIpQQk/mqdefault.jpg',
        channelAvatar: 'https://api.dicebear.com/7.x/identicon/svg?seed=eng3',
        duration: '00:58',
      },
      {
        videoId: 'mock_comp_04',
        title: '원어민이 가장 많이 쓰는 초급 회화 50문장 (매일 틀어놓고 들으세요)',
        channelTitle: '매일 영어 루틴',
        views: 450000,
        publishedAgo: '1달 전',
        thumbnail: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=640&q=80',
        channelAvatar: 'https://api.dicebear.com/7.x/identicon/svg?seed=eng4',
        duration: '18:30',
      },
      {
        videoId: 'mock_comp_05',
        title: "알파벳 'A' 소리가 5가지나 된다고? (성인 기초 파닉스 완벽 정리)",
        channelTitle: '친절한 영어쌤',
        views: 780000,
        publishedAgo: '2개월 전',
        thumbnail: 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=640&q=80',
        channelAvatar: 'https://api.dicebear.com/7.x/identicon/svg?seed=eng5',
        duration: '14:20',
      },
    ];
    competitorVideos.push(...fallbackList);
  }

  return competitorVideos.slice(0, 10);
}

function formatTimeAgo(isoString) {
  try {
    const diffMs = Date.now() - new Date(isoString).getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays <= 0) return '오늘';
    if (diffDays < 7) return `${diffDays}일 전`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}주 전`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)}개월 전`;
    return `${Math.floor(diffDays / 365)}년 전`;
  } catch {
    return '최근';
  }
}

/**
 * Resolves an image URL (Base64 dataUrl, local file path, or remote URL) to Gemini inline_data format.
 */
async function resolveImageToInlineData(imageUrl) {
  if (!imageUrl || typeof imageUrl !== 'string') return null;
  const trimmed = imageUrl.trim();

  // 1. Data URL (Base64)
  const dataUrlMatch = trimmed.match(/^data:(image\/[a-zA-Z0-9+.-]+);base64,(.+)$/);
  if (dataUrlMatch) {
    return {
      inline_data: {
        mime_type: dataUrlMatch[1],
        data: dataUrlMatch[2],
      },
    };
  }

  // 2. Local File Path (Relative or Absolute)
  try {
    let localPath = null;
    if (trimmed.startsWith('/') || /^[A-Za-z]:[\\/]/.test(trimmed)) {
      if (existsSync(trimmed)) localPath = trimmed;
    } else if (trimmed.startsWith('output/') || trimmed.startsWith('output\\') || trimmed.startsWith('videos/') || trimmed.startsWith('public/')) {
      const p = resolve(projectDir, trimmed);
      if (existsSync(p)) localPath = p;
    }

    if (localPath) {
      const ext = localPath.toLowerCase().endsWith('.png') ? 'image/png' : localPath.toLowerCase().endsWith('.webp') ? 'image/webp' : 'image/jpeg';
      const buf = await readFile(localPath);
      return {
        inline_data: {
          mime_type: ext,
          data: buf.toString('base64'),
        },
      };
    }
  } catch (err) {
    // ignore
  }

  // 3. Remote URL (http/https)
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);
      const res = await fetch(trimmed, { signal: controller.signal });
      clearTimeout(timeoutId);
      if (res.ok) {
        const contentType = res.headers.get('content-type') || 'image/jpeg';
        const mimeType = contentType.split(';')[0].trim() || 'image/jpeg';
        const arrayBuf = await res.arrayBuffer();
        const buf = Buffer.from(arrayBuf);
        return {
          inline_data: {
            mime_type: mimeType.startsWith('image/') ? mimeType : 'image/jpeg',
            data: buf.toString('base64'),
          },
        };
      }
    } catch (err) {
      // Remote fetch fallback / timeout
    }
  }

  return null;
}

export async function evaluateThumbnailTitleVariants({ topic, variants, targetAudience = '3060 성인 및 기초 영어 학습자', format = 'LONGFORM', geminiKey, audienceDna = [], successPatterns = [] }) {
  if (!geminiKey) {
    throw new Error('Gemini API 키(GEMINI_API_KEY)가 설정되지 않았습니다.');
  }

  const validVariants = (variants || []).filter(v => v && (v.title || v.imageUrl));
  if (validVariants.length === 0) {
    throw new Error('평가할 시안 제목이나 썸네일 정보가 없습니다.');
  }

  const isShorts = format === 'SHORTS' || String(format).toLowerCase().includes('short');
  const arParam = isShorts ? '--ar 9:16' : '--ar 16:9';
  const formatLabel = isShorts ? '📱 유튜브 쇼츠 (Shorts - 9:16 세로형)' : '📺 유튜브 롱폼 (Longform - 16:9 가로형)';

  const parts = [];

  // 1. Intro Text
  let introText = `당신은 대한민국 최고 수준의 유튜브 썸네일 & 타이틀 알고리즘 전략가이자 시각 디자인(Visual Salience) 및 CTR(노출 클릭률) 데이터 전문가입니다.
특히 '3060 성인 학습자(바쁜 직장인·시니어·왕초보)'를 타겟으로 하는 영어 교육 채널('이해하면 쉬운영어')의 ${formatLabel} 썸네일·제목 A/B 시안을 '시각적 이미지'와 '텍스트 카피'를 모두 결합하여 정밀 진단합니다.

[채널 핵심 브랜드 철학 & 페르소나 — aiTitleSuggestions·visualImprovementTip에 반드시 반영할 것]:
- 톤앤매너: 가식 없는 솔직 담백한 실전 학습 파트너. ("기초가 전혀 없어도 괜찮습니다. 당신이 영어를 못했던 게 아니라 소리 나는 원리를 몰랐을 뿐입니다. 무작정 외우지 마세요.")
- 선생님처럼 훈계하는 말투, 자극적인 낚시성 과장, 어려운 음성학 용어 절대 금지.
- 독점 3단계 도파민 공식: 1) 게으른 혀의 소리 지름길(원리 발견) → 2) 패턴 확장(카타르시스) → 3) 반전 꿀팁(미세한 차이).

[영상 기획 주제]: ${topic || '기초 영어 발음 및 소리 변신 원리'}
[타겟 시청자]: ${targetAudience}
[콘텐츠 포맷]: ${formatLabel}
${audienceDna.length ? `
[누적된 시청자 실제 언어·고통점 DB — aiTitleSuggestions에 이 표현을 최대한 활용할 것]:
${audienceDna.slice(0, 8).map(d => `- (${d.occurrences}회 반복 확인) [${d.type}] ${d.text}`).join('\n')}
` : ''}${successPatterns.length ? `
[우리 채널 검증된 성공 패턴 DB — Q1 영상에서 실제로 먹혔던 후킹/비유, 일반적 archetype 대신 이걸 우선 참고]:
${successPatterns.slice(0, 8).map(p => `- (${p.title}, CTR ${p.ctr}%) 후킹: ${p.reusableHook || '기록 없음'} / 비유: ${p.reusableAnalogy || '기록 없음'}`).join('\n')}
` : ''}
[포맷별 핵심 평가 규칙]:
${isShorts ? `- **쇼츠 9:16 세로형 특화**:
  * 세로 화면에서 첫 1초 스와이프를 멈추게 하는 상단·중앙 시각 후킹(Cover Frame)을 집중 평가합니다.
  * **하단 30% UI 사각지대(Dead Zone) 검증**: 쇼츠 하단은 유튜브 제목, 채널명, 사운드, 우측 액션 버튼(좋아요/댓글)으로 가려집니다. 핵심 텍스트가 하단에 깔려 가려지는지 엄격히 감점/처방합니다.
  * **미드저니/AI 프롬프트 종횡비**: 썸네일 생성 프롬프트는 반드시 세로형 \`--ar 9:16\`으로 작성해야 합니다.` :
`- **롱폼 16:9 가로형 특화**:
  * 가로 16:9 피드 화면에서 좌우 2분할 대조 및 120px 모바일 가독성을 집중 평가합니다.
  * 우측 하단 영상 길이 태그(예: 08:24)에 텍스트가 가려지지 않도록 검증합니다.
  * **미드저니/AI 프롬프트 종횡비**: 썸네일 생성 프롬프트는 반드시 가로형 \`--ar 16:9\`로 작성해야 합니다.`}

[테스트 후보 시안 목록]:\n`;

  for (let i = 0; i < validVariants.length; i++) {
    const v = validVariants[i];
    const varKey = String.fromCharCode(65 + i);
    introText += `\n--- [시안 ${varKey} (Variant ${varKey})] ---\n` +
      `- 제목: "${v.title || '(제목 미지정)'}"\n` +
      `- 썸네일 텍스트 카피: "${v.thumbnailCopy || '(이미지 내 텍스트 분석 필요)'}"\n` +
      `- 포인트 뱃지 태그: "${v.badge || '(없음)'}"\n`;
  }

  parts.push({ text: introText });

  // 2. Attach Image Parts (Multimodal Vision)
  let imageCount = 0;
  for (let i = 0; i < validVariants.length; i++) {
    const v = validVariants[i];
    const varKey = String.fromCharCode(65 + i);
    if (v.imageUrl) {
      const inlineImg = await resolveImageToInlineData(v.imageUrl);
      if (inlineImg) {
        parts.push({ text: `\n[시안 ${varKey} (Variant ${varKey}) 실제 썸네일 이미지 파일]:` });
        parts.push(inlineImg);
        imageCount++;
      }
    }
  }

  // 3. Instruction & Schema
  const instructionText = `
---
위 각 시안의 ${imageCount > 0 ? "'실제 썸네일 이미지(시각 디자인/색상/폰트/배경)'와 " : ""}'제목/카피'를 엄격하게 정밀 진단하여 아래 JSON 포맷 규격으로만 응답하세요. 백틱(\`\`\`json)으로 감싸서 출력하세요.
특히 'aiImagePrompts'의 'midjourneyPrompt' 종횡비는 반드시 '${arParam}'를 포함해야 합니다.

{
  "variantsEvaluation": [
    {
      "variantKey": "A",
      "curiosityGapScore": 88,
      "seniorLegibilityScore": 92,
      "visualSalienceScore": 85,
      "contrastRating": "최상(High)",
      "focalPoint": "첫 1초에 시선이 머무는 핵심 시각 오브젝트 (예: ${isShorts ? '중앙 상단 발광 Q 알파벳' : '중앙 옐로우 WANT 텍스트 박스'})",
      "predictedGrade": "A",
      "predictedCtrRange": "8.5% ~ 11.2%",
      "strengths": [
        "시각적 강점 1 (명도 대비, 폰트 가독성, 인물 표정 등)",
        "카피/제목 강점 2"
      ],
      "weaknesses": [
        "시각적 또는 제목상 아쉬운 점 (${isShorts ? '하단 UI 가림 여부 포함' : '피드 스크롤 시선 분산 여부'})"
      ],
      "visualImprovementTip": "실제 디자이너 관점의 즉각 개선 팁 (예: ${isShorts ? '하단 30% 텍스트를 상단으로 150px 이동, Q 글자에 네온 글로우 앰비언트 추가' : '배경 어두운 비네팅 추가, 노란색 폰트에 블랙 외곽선 4px 권장'})"
    }
  ],
  "bestVariant": "A",
  "overallVerdict": "종합 1위 시안 선정 이유 및 ${isShorts ? '쇼츠 피드 스와이프 중 시선 스턴건 효과' : '홈 피드 스크롤 중 클릭 유발력'} 평가 (2~3문장)",
  "aiTitleSuggestions": [
    {
      "type": "⚡ 후킹형 (호기심 극대화)",
      "title": "..."
    },
    {
      "type": "❓ 질문형 (클릭 유도)",
      "title": "..."
    },
    {
      "type": "💥 반전형 (상식 파괴)",
      "title": "..."
    },
    {
      "type": "📐 원리형 (쉬운 해결책)",
      "title": "..."
    },
    {
      "type": "🤝 공감형 (시니어 맞춤)",
      "title": "..."
    }
  ],
  "aiImagePrompts": [
    {
      "variantKey": "A",
      "designConcept": "${isShorts ? '쇼츠 9:16 세로형 고클릭 커버 프레임 설계 (상단 강조, 중앙 오브젝트, 하단 여백)' : '롱폼 16:9 고클릭 썸네일 레이아웃 설계'}",
      "koreanOverlayCopy": "${isShorts ? '상단(Yellow): \"Q는 어떻게 읽을까요?\" / 중앙: 대형 \"Q\" / 하단 뱃지: \"10초 발음 공식\"' : '좌측: \"WANT vs WON\\\'T\" 대형 노란 글씨 / 우측: 입모양 다이어그램'}",
      "midjourneyPrompt": "${isShorts ? 'Clean vertical visual artwork for English pronunciation education, large glowing neon yellow letter Q in center, dark cyber-hud deep navy ambient background, minimalist graphic layout, copy space for Korean text, 4k ultra-high resolution, 9:16 --ar 9:16 --no text font letters words watermark phone mockup device frame icons UI buttons --v 6.0' : 'Clean horizontal visual artwork for English pronunciation education, split-screen contrast, glowing neon accents on deep navy ambient background, minimalist graphic layout, copy space for Korean text, 4k resolution, 16:9 --ar 16:9 --no text font letters words watermark phone mockup device frame icons UI buttons --v 6.0'}"
    }
  ]
}`;

  parts.push({ text: instructionText });


  const models = ['gemini-2.5-flash', 'gemini-flash-latest', 'gemini-2.5-flash-lite', 'gemini-3.7-flash'];
  let lastError = null;

  for (const model of models) {
    try {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`;
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts }],
          generationConfig: {
            temperature: 0.3,
            responseMimeType: 'application/json',
          },
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Gemini ${model} error (${res.status}): ${errText}`);
      }

      const data = await res.json();
      const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawText) throw new Error('Gemini 반환 데이터가 비어 있습니다.');

      const jsonMatch = rawText.match(/```json\s*([\s\S]*?)\s*```/) || [null, rawText];
      return JSON.parse(jsonMatch[1].trim());
    } catch (err) {
      lastError = err;
    }
  }

  throw new Error(`AI 진단 실패: ${lastError?.message}`);
}

export async function generateAiThumbnailImage({ prompt, topic = '', variantKey = 'A', title = '', thumbnailCopy = '', badge = '', format = 'LONGFORM', engine = 'flux', geminiKey }) {
  const isShorts = format === 'SHORTS' || String(format).toLowerCase().includes('short');
  const vKey = String(variantKey || 'A').toUpperCase();
  const rawText = (title || topic || prompt || '10초 영어 읽기 테스트').trim();

  // 1. Variant-Specific Layout Profiles
  let hookLine1 = '';
  let hookLine2 = '';
  let card1 = '';
  let card2 = '';
  let card3 = '';
  let badgeText = '';
  let subCallout = '';
  let theme = 'yellow'; // 'yellow' | 'cyan' | 'magenta'

  if (vKey === 'A') {
    // VARIANT A: 3-Row Phonics Quiz / Self-Diagnosis (Yellow Gold Theme)
    theme = 'yellow';
    hookLine1 = '10초 영어 읽기';
    hookLine2 = '소리 테스트!';
    card1 = 'CAT';
    card2 = 'BOOK';
    card3 = 'ANT';
    badgeText = badge || '⏱️ 10초 완성';
    subCallout = '💡 3문제 다 맞히면 상위 1%';
  } else if (vKey === 'B') {
    // VARIANT B: Phonetic Rule & Shocking Secret (Cyber Cyan Theme)
    theme = 'cyan';
    hookLine1 = '한국인 90% 틀리는';
    hookLine2 = '슈와(ə) 소리 법칙!';
    card1 = 'BANANA';
    card2 = 'ABOUT';
    card3 = 'PENCIL';
    badgeText = badge || '⚡ 소리 비밀 반전';
    subCallout = '💡 게으른 혀의 소리 지름길';
  } else {
    // VARIANT C: Loss Aversion & Key Secret Contrast (Magenta / Red Theme)
    theme = 'magenta';
    hookLine1 = '단어가 안 들리는 이유?';
    hookLine2 = '이 소리 모르면 평생 고생!';
    card1 = 'WANT vs WON\'T';
    card2 = '모음 탈락 법칙';
    card3 = '30초 귀 뚫림 족보';
    badgeText = badge || '🔥 필수 핵심 족보';
    subCallout = '💡 원어민 귀가 뚫리는 공식';
  }

  // 2. Generate 100% Freeform Pure AI Photorealistic & High-CTR Generative SVG Artwork with Gemini 3.6 Flash
  if (geminiKey && geminiKey !== 'YOUR_GEMINI_API_KEY_HERE') {
    const W = isShorts ? 720 : 1280;
    const H = isShorts ? 1280 : 720;
    
    // Curated high-res real person photos matched to variant psychology
    const photoUrlMap = {
      A: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800&auto=format&fit=crop&q=80', // Surprised / Shocked reaction
      B: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=800&auto=format&fit=crop&q=80', // Confident teacher / Pointing formula
      C: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=800&auto=format&fit=crop&q=80', // Adult learner discovery / Real nuance
    };
    const chosenPhotoUrl = photoUrlMap[vKey] || photoUrlMap.B;

    const prompt = `You are the Lead Art Director and YouTube Growth Strategist for English education channel '이해하면 쉬운영어' (Target: 3060 adult learners).

YOUR MISSION:
Draw a standalone High-CTR YouTube Thumbnail SVG (viewBox="0 0 ${W} ${H}") on topic: "${rawText}" (${isShorts ? '9:16 Shorts' : '16:9 Longform'}).
Target Variant: ${vKey} (${
      vKey === 'A'
        ? '오답 충격 & 뒤통수형: 평생 맞다고 믿었던 콩글리시/오해를 찌르는 강렬한 시각적 충격'
        : vKey === 'B'
        ? '1초 소리 족보 & 비밀 공식형: 2~3단어 초대형 네온 뱃지와 직관적 원리 가치 제안'
        : '원어민 리얼 뉘앙스 & 비교 대조형: 상황별 당혹스러운 실수 ❌ vs 원어민 진짜 정답 ⭕의 극적 대비'
    })

DESIGN REQUIREMENTS:
1. BACKGROUND: Dark cinematic studio (#060911, #0F172A) with radial cyan (#00F0FF) and magenta (#FF0077) glow.
2. PHOTOREALISTIC HERO CARD (${isShorts ? 'Center/Bottom' : 'Right side'}):
   - Place a sleek rounded frame with a high-res photo element:
     ${isShorts ? `
     <clipPath id="personClip"><rect x="60" y="520" width="600" height="700" rx="30"/></clipPath>
     <g filter="url(#shadow)">
       <rect x="56" y="516" width="608" height="708" rx="34" fill="none" stroke="#00F0FF" stroke-width="4"/>
       <image href="${chosenPhotoUrl}" x="60" y="520" width="600" height="700" preserveAspectRatio="xMidYMid slice" clip-path="url(#personClip)"/>
     </g>` : `
     <clipPath id="personClip"><rect x="730" y="30" width="510" height="660" rx="32"/></clipPath>
     <g filter="url(#shadow)">
       <rect x="726" y="26" width="518" height="668" rx="36" fill="none" stroke="#00F0FF" stroke-width="4"/>
       <image href="${chosenPhotoUrl}" x="730" y="30" width="510" height="660" preserveAspectRatio="xMidYMid slice" clip-path="url(#personClip)"/>
       <rect x="730" y="460" width="510" height="230" fill="#060911" fill-opacity="0.7" clip-path="url(#personClip)"/>
     </g>`}
   - CRITICAL: DO NOT draw any crude humanoid path silhouettes or doodle monster shapes! Use ONLY the clean <image> photo card.
3. HIGH-CTR TYPOGRAPHY & BADGES (${isShorts ? 'Top' : 'Left side'}):
   - Top Neon Pill Badges: [EP.07 or Topic Tag] + [🚨 99%가 틀림 or 1초 소리 족보 ⚡]
   - Massive 2~3 word headline with thick black stroke (stroke="#000000" stroke-width="14" paint-order="stroke fill"): Yellow #FFE600, White #FFFFFF, Cyan #00F0FF.
   - Bottom Secret Rule Box or ❌ vs ⭕ contrast box.
4. Clean code under 90 lines. Return ONLY the raw valid SVG starting with <svg and ending with </svg>. No markdown backticks, no code fence, no commentary.`;

    try {
      const gEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${geminiKey}`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 55000);
      const gRes = await fetch(gEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.7, maxOutputTokens: 8192 }
        }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (gRes.ok) {
        const gData = await gRes.json();
        let raw = gData.candidates?.[0]?.content?.parts?.[0]?.text || '';
        raw = raw.replace(/^```(svg|xml)?/i, '').replace(/```$/i, '').trim();
        const startIdx = raw.indexOf('<svg');
        const endIdx = raw.lastIndexOf('</svg>');
        if (startIdx !== -1 && endIdx !== -1) {
          const customSvg = raw.substring(startIdx, endIdx + 6);
          const base64CustomSvg = Buffer.from(customSvg).toString('base64');
          return {
            engine: `Competitor-Gap & Reference Studio (Variant ${vKey})`,
            imageUrl: `data:image/svg+xml;base64,${base64CustomSvg}`,
          };
        } else {
          console.error('Gemini SVG missing tag. Raw preview:', raw.slice(0, 200));
        }
      } else {
        const errText = await gRes.text();
        console.error('Gemini SVG HTTP Error:', gRes.status, errText);
      }
    } catch (err) {
      console.error('Gemini direct SVG generator exception:', err.message);
    }
  } else {
    console.error('Gemini direct SVG skipped: No geminiKey provided');
  }

  // 3. Fallback High-Res Vector SVG Renderer if Offline
  const W = isShorts ? 720 : 1280;
  const H = isShorts ? 1280 : 720;
  const fallbackSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
  <rect width="${W}" height="${H}" fill="#0a0518"/>
  <text x="${W/2}" y="${H/2}" text-anchor="middle" font-family="'Pretendard', sans-serif" font-size="48" font-weight="900" fill="#facc15">${rawText}</text>
</svg>`;
  const base64Svg = Buffer.from(fallbackSvg).toString('base64');
  return {
    engine: `Fallback Renderer`,
    imageUrl: `data:image/svg+xml;base64,${base64Svg}`,
  };
}
