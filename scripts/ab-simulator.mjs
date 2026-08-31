import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes } from 'node:crypto';

const projectDir = dirname(dirname(fileURLToPath(import.meta.url)));
const marketDemandPath = join(projectDir, 'data', 'youtube', 'market-demand.json');
const catalogPath = join(projectDir, 'data', 'youtube', 'catalog.json');
export const tempThumbDir = join(projectDir, 'output', 'temp-thumbnails');

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

  // 2. 우리 서버가 직접 저장한 생성 썸네일 (/api/temp-thumbnail/<filename> — generateAiThumbnailImage가
  //    output/temp-thumbnails/에 파일로 저장하고 돌려주는 서빙 URL). 파일시스템 경로가 아니라 라우트라서
  //    아래 범용 로컬 경로 분기보다 먼저 정확히 매칭해야 한다.
  const tempThumbMatch = trimmed.match(/^\/api\/temp-thumbnail\/([^\/?#]+)$/);
  if (tempThumbMatch) {
    try {
      const filePath = join(tempThumbDir, decodeURIComponent(tempThumbMatch[1]));
      if (existsSync(filePath)) {
        const ext = filePath.toLowerCase().endsWith('.png') ? 'image/png' : filePath.toLowerCase().endsWith('.svg') ? 'image/svg+xml' : 'image/jpeg';
        const buf = await readFile(filePath);
        return { inline_data: { mime_type: ext, data: buf.toString('base64') } };
      }
    } catch (err) {
      // ignore, falls through to null
    }
  }

  // 3. Local File Path (Relative or Absolute)
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

  // 4. Remote URL (http/https)
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

// 시청자 DNA/성공 패턴 DB가 쌓일수록 topic과 무관한 항목까지 섞여 상위 N개를 차지할 수 있어서,
// occurrences/CTR만으로 정렬하지 않고 topic과의 텍스트 연관성을 1차 기준으로 삼는다.
function tokenizeTopic(topic) {
  return String(topic || '')
    .toLowerCase()
    .replace(/[^\w\s가-힣]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length >= 2);
}

function relevanceScore(text, topicTokens) {
  if (!topicTokens.length) return 0;
  const t = String(text || '').toLowerCase();
  return topicTokens.reduce((score, tok) => score + (t.includes(tok) ? 1 : 0), 0);
}

// topic 토큰이 없거나 전부 무관(relevance 0)이면 원래 순서(occurrences/CTR 내림차순, 호출부에서
// 이미 정렬해 전달)가 그대로 유지된다 — Array.sort는 안정 정렬이라 동점일 때 원본 순서를 보존한다.
function rankByTopicRelevance(items, topicTokens, textOf) {
  if (!items.length || !topicTokens.length) return items;
  return [...items].sort((a, b) => relevanceScore(textOf(b), topicTokens) - relevanceScore(textOf(a), topicTokens));
}

export async function evaluateThumbnailTitleVariants({ topic, variants, targetAudience = '3060 성인 및 기초 영어 학습자', format = 'LONGFORM', geminiKey, audienceDna = [], successPatterns = [], marketDemand = null }) {
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

  const topicTokens = tokenizeTopic(topic);
  const rankedAudienceDna = rankByTopicRelevance(audienceDna, topicTokens, (d) => d.text).slice(0, 8);
  const rankedSuccessPatterns = rankByTopicRelevance(successPatterns, topicTokens, (p) => `${p.title} ${p.reusableHook || ''} ${p.reusableAnalogy || ''}`).slice(0, 8);

  // topic과 겹치는 키워드의 market-demand 결과에서 검증된 후킹 단어(titlePatterns)만 뽑는다.
  // 정밀 매칭이 아니라 topic 토큰 중 하나라도 키워드에 포함되면 채택 — 후보 소재 문구와 검색
  // 키워드 문구가 정확히 일치할 일이 거의 없기 때문(자유 텍스트 vs 자유 텍스트 매칭).
  const matchedDemandKeywords = (marketDemand?.byKeyword || [])
    .filter((k) => topicTokens.some((tok) => String(k.keyword || '').toLowerCase().includes(tok)))
    .slice(0, 3);

  const parts = [];

  // 1. Intro Text
  let introText = `당신은 대한민국 최고 수준의 유튜브 썸네일 & 타이틀 알고리즘 전략가이자 시각 디자인(Visual Salience) 및 CTR(노출 클릭률) 데이터 전문가입니다.
영어 교육 채널('이해하면 쉬운영어')의 ${formatLabel} 썸네일·제목 A/B 시안을 '시각적 이미지'와 '텍스트 카피'를 모두 결합하여 정밀 진단합니다.
**이번 진단의 타겟은 아래 [타겟 시청자] 필드에 지정된 대상이다 — 채널이 과거에 자주 다룬 특정 연령대가 아니라, 이번 영상에 실제로 지정된 타겟층 기준으로 legibilityScore를 포함한 모든 점수·문구를 판단할 것.**

[채널 핵심 브랜드 철학 & 페르소나 — aiTitleSuggestions·visualImprovementTip에 반드시 반영할 것]:
- 톤앤매너: 가식 없는 솔직 담백한 실전 학습 파트너. ("기초가 전혀 없어도 괜찮습니다. 당신이 영어를 못했던 게 아니라 소리 나는 원리를 몰랐을 뿐입니다. 무작정 외우지 마세요.")
- 선생님처럼 훈계하는 말투, 자극적인 낚시성 과장, 어려운 음성학 용어 절대 금지.
- 독점 3단계 도파민 공식: 1) 게으른 혀의 소리 지름길(원리 발견) → 2) 패턴 확장(카타르시스) → 3) 반전 꿀팁(미세한 차이).

[영상 기획 주제]: ${topic || '기초 영어 발음 및 소리 변신 원리'}
[타겟 시청자]: ${targetAudience}
[콘텐츠 포맷]: ${formatLabel}
${rankedAudienceDna.length ? `
[누적된 시청자 실제 언어·고통점 DB — 이 소재와 연관도 높은 순, aiTitleSuggestions에 이 표현을 최대한 활용할 것]:
${rankedAudienceDna.map(d => `- (${d.occurrences}회 반복 확인) [${d.type}] ${d.text}`).join('\n')}
` : ''}${rankedSuccessPatterns.length ? `
[우리 채널 검증된 성공 패턴 DB — 이 소재와 연관도 높은 순, Q1 영상에서 실제로 먹혔던 후킹/비유, 일반적 archetype 대신 이걸 우선 참고]:
${rankedSuccessPatterns.map(p => `- (${p.title}, CTR ${p.ctr}%) 후킹: ${p.reusableHook || '기록 없음'} / 비유: ${p.reusableAnalogy || '기록 없음'}`).join('\n')}
` : ''}${matchedDemandKeywords.length ? `
[검증된 클릭 유발 후킹 단어 — market-demand.json, 이 소재와 관련된 경쟁 채널 제목에서 반복 확인된 단어. aiTitleSuggestions 작성 시 참고할 것]:
${matchedDemandKeywords.map(k => `- "${k.keyword}" 관련 반복 단어: ${(k.titlePatterns || []).slice(0, 5).map(p => p.word).join(', ') || '없음'}`).join('\n')}
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
특히 'aiTitleSuggestions'의 'midjourneyPrompt' 종횡비는 반드시 '${arParam}'를 포함해야 합니다.

'aiTitleSuggestions' 5개는 반드시 아래 세 규칙을 지킬 것:
1. **정답/핵심 메커니즘 노출 금지** — 특히 '💥 반전형'은 "상식이 틀렸다는 사실"까지만 드러내고 "왜/어떻게 그런지"는 절대 밝히지 말 것.
   제목에서 정답을 다 알려주면 영상을 볼 이유가 없다. (예: "끝소리 T는 소리 내지 마세요, 목소리 빼고 바람만 뱉는 원리"처럼
   메커니즘 자체를 설명하면 안 됨 — "끝소리 T, 원어민은 절대 이렇게 안 읽습니다"처럼 궁금증만 남길 것.)
2. **5개 전부 [영상 기획 주제]를 구체적으로 반영할 것** — 특히 '🤝 공감형'이 브랜드 톤앤매너 문장을 그대로 재사용하는 슬로건이
   되지 않도록, 이 소재 고유의 키워드(단어/상황)를 반드시 포함할 것.
3. **'title'과 'thumbnailCopy'는 절대 같은 정보를 반복하지 말 것** — title은 호기심을 유발하는 훅(질문/반전/예고),
   thumbnailCopy는 그 영상을 시청한 뒤에 얻는 보상/확인 느낌의 짧은 문구(15자 내외)여야 한다. 이 둘이 같은 내용을
   다른 말로 반복하면 안 됨(예: title="원어민이 0.1초 만에 구분하는 차이" → thumbnailCopy는 그 차이를 재설명하지
   말고 "이제 헷갈리지 않는다" 류의 확인/보상 톤으로).

{
  "variantsEvaluation": [
    {
      "variantKey": "A",
      "curiosityGapScore": 88,
      "legibilityScore": 92,
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
      "title": "...",
      "thumbnailCopy": "이 title과 짝을 이루는 시청 후 보상 카피 (15자 내외, title과 내용 겹치지 않게)",
      "designConcept": "이 title/thumbnailCopy 조합에 맞는 비주얼 컨셉 한 줄",
      "midjourneyPrompt": "${isShorts ? 'Clean vertical visual artwork for English pronunciation education, dark cyber-hud deep navy ambient background, minimalist graphic layout, copy space for Korean text, 4k ultra-high resolution, 9:16 --ar 9:16 --no text font letters words watermark phone mockup device frame icons UI buttons --v 6.0' : 'Clean horizontal visual artwork for English pronunciation education, dark cyber-hud deep navy ambient background, minimalist graphic layout, copy space for Korean text, 4k resolution, 16:9 --ar 16:9 --no text font letters words watermark phone mockup device frame icons UI buttons --v 6.0'}(이 title 고유의 비주얼 요소로 구체화해서 다시 쓸 것 — 5개 프롬프트가 서로 달라야 함)"
    },
    {
      "type": "❓ 질문형 (클릭 유도)",
      "title": "...",
      "thumbnailCopy": "...",
      "designConcept": "...",
      "midjourneyPrompt": "..."
    },
    {
      "type": "💥 반전형 (상식 파괴)",
      "title": "...",
      "thumbnailCopy": "...",
      "designConcept": "...",
      "midjourneyPrompt": "..."
    },
    {
      "type": "📐 원리형 (쉬운 해결책)",
      "title": "...",
      "thumbnailCopy": "...",
      "designConcept": "...",
      "midjourneyPrompt": "..."
    },
    {
      "type": "🤝 공감형 (타겟 시청자 맞춤)",
      "title": "...",
      "thumbnailCopy": "...",
      "designConcept": "...",
      "midjourneyPrompt": "..."
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

// 진짜 이미지 생성 모델(코드명 "나노바나나" 계열) — SVG 코드를 손으로 쓰게 하던 기존 방식과 달리
// 실제 픽셀 이미지를 diffusion으로 만든다. flash(저렴) 먼저, 실패하면 pro로 승격.
// temperature를 낮추면(기본 미지정보다) 텍스트 렌더링이 좀 더 보수적/일관적으로 나오는 경향이
// 있어 기본값을 살짝 낮춰 받는다 — 그래도 완전히 안정적이진 않아서 호출부의 재시도 루프가 진짜 안전망.
async function generateImageWithGeminiNative({ prompt, geminiKey, temperature }) {
  const models = ['gemini-2.5-flash-image', 'gemini-3-pro-image', 'gemini-3-pro-image-preview'];
  let lastError = null;

  for (const model of models) {
    try {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 55000);
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          ...(typeof temperature === 'number' ? { generationConfig: { temperature } } : {}),
        }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`${model} error (${res.status}): ${errText.slice(0, 300)}`);
      }

      const data = await res.json();
      const parts = data.candidates?.[0]?.content?.parts || [];
      const imgPart = parts.find((p) => p.inlineData || p.inline_data);
      const inline = imgPart && (imgPart.inlineData || imgPart.inline_data);
      if (!inline || !inline.data) throw new Error(`${model} returned no image data`);

      return { mimeType: inline.mimeType || inline.mime_type || 'image/png', base64: inline.data, model };
    } catch (err) {
      lastError = err;
    }
  }

  throw new Error(`나노바나나 이미지 생성 실패: ${lastError?.message}`);
}

// 나노바나나가 방금 만든 이미지 안의 텍스트가 의도한 문구와 정확히 일치하는지 Gemini Vision으로
// 다시 읽어서 확인한다. 검증 자체가 실패(네트워크 오류 등)하면 "틀렸다"가 아니라 관대하게
// 통과 처리한다 — 검증 실패를 텍스트 오류로 오인해 무한정 재생성하면 안 되기 때문.
async function verifyThumbnailText({ base64, mimeType, expectedTexts, geminiKey }) {
  const prompt = `이 이미지 안에 실제로 렌더링된 모든 한글·영어 텍스트를 확인하세요.

아래는 이 이미지에 오탈자나 깨진 글자 없이 정확히 나타나야 하는 문구 목록입니다:
${expectedTexts.map((t, i) => `${i + 1}. "${t}"`).join('\n')}

각 문구가 이미지 안에 정확히 그 철자로 나타나는지 하나씩 확인하세요. 줄바꿈 위치 차이는 무시하되,
글자가 다른 글자로 바뀌었거나(예: "영어"가 "영애"로), 알아볼 수 없이 뭉개졌으면 불일치로 판정합니다.

아래 JSON 포맷으로만 응답하세요:
{"allCorrect": true 또는 false, "brokenTexts": ["실제로 깨져서 나온 원래 문구만 나열, 문제 없으면 빈 배열"]}`;

  const models = ['gemini-2.5-flash', 'gemini-flash-latest', 'gemini-2.5-flash-lite'];
  for (const model of models) {
    try {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 20000);
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [
            { text: prompt },
            { inline_data: { mime_type: mimeType, data: base64 } },
          ] }],
          generationConfig: { temperature: 0.1, responseMimeType: 'application/json' },
        }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (!res.ok) continue;

      const data = await res.json();
      const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawText) continue;

      const jsonMatch = rawText.match(/```json\s*([\s\S]*?)\s*```/) || [null, rawText];
      const parsed = JSON.parse(jsonMatch[1].trim());
      return { allCorrect: !!parsed.allCorrect, brokenTexts: Array.isArray(parsed.brokenTexts) ? parsed.brokenTexts : [] };
    } catch (err) {
      // 다음 모델로 계속 시도
    }
  }
  return { allCorrect: true, brokenTexts: [] };
}

// 생성 결과(data: base64 URL)를 브라우저 localStorage가 아니라 실제 파일로 저장한다.
// PNG 1장이 1~2MB라 localStorage에 그대로 넣으면 브라우저 용량 한도(보통 5~10MB)를
// 시안 2~3개만 생성해도 넘겨서 저장이 "조용히" 실패한다(knowledge/now.md 2026-09-01 기록).
// 디스크 쓰기가 실패하는 예외 상황에서만 base64를 그대로 반환하는 안전망을 둔다.
async function persistGeneratedImage({ engineLabel, dataUrl, variantKey }) {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) return { engine: engineLabel, imageUrl: dataUrl };

  const mimeType = match[1];
  const ext = mimeType === 'image/png' ? 'png' : mimeType === 'image/jpeg' ? 'jpg' : 'svg';
  const filename = `${variantKey}-${Date.now()}-${randomBytes(3).toString('hex')}.${ext}`;

  try {
    await mkdir(tempThumbDir, { recursive: true });
    await writeFile(join(tempThumbDir, filename), Buffer.from(match[2], 'base64'));
    return { engine: engineLabel, imageUrl: `/api/temp-thumbnail/${filename}` };
  } catch (err) {
    console.error('생성된 썸네일을 파일로 저장하지 못해 base64로 폴백:', err.message);
    return { engine: engineLabel, imageUrl: dataUrl };
  }
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

  const W = isShorts ? 720 : 1280;
  const H = isShorts ? 1280 : 720;

  // 사용자가 직접 쓴 프롬프트인지 판별 — topic/title로 들어오는 짧은 문자열과 구분하기 위한
  // 임계값. 이 값 이상이면 아래 하드코딩 템플릿을 완전히 건너뛰고 그 프롬프트를 그대로 쓴다.
  const customPrompt = String(prompt || '').trim();
  const useCustomPrompt = customPrompt.length > 60;

  // Curated high-res real person photos matched to variant psychology (SVG 폴백 경로 전용 —
  // 진짜 이미지 모델은 사람 묘사를 텍스트로 직접 생성하므로 이 사진이 필요 없다)
  const photoUrlMap = {
    A: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800&auto=format&fit=crop&q=80', // Surprised / Shocked reaction
    B: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=800&auto=format&fit=crop&q=80', // Confident teacher / Pointing formula
    C: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=800&auto=format&fit=crop&q=80', // Adult learner discovery / Real nuance
  };
  const chosenPhotoUrl = photoUrlMap[vKey] || photoUrlMap.B;

  // 1. PRIMARY PATH: 진짜 이미지 생성 모델(나노바나나). 커스텀 프롬프트면 그대로, 아니면 변형별
  //    무드를 자연어 브리프로 번역 — 실제 이미지 모델은 SVG 마크업 작성법을 몰라도 되고 알 필요도 없다.
  if (geminiKey && geminiKey !== 'YOUR_GEMINI_API_KEY_HERE') {
    // 인물을 "항상 둥근 박스+청록 테두리"로 고정하면 매 생성이 똑같아 보인다는 문제가 있었음 —
    // 이 채널의 "고정 템플릿 지양" 원칙과 어긋남. 매 호출마다 구도 하나를 무작위로 골라서
    // variant/에피소드와 무관하게 실제로 다양해지게 한다. 4번째는 EP9/EP10에서 실제로 쓴
    // "찢어진 종이 컷아웃" 기법(CLAUDE.md 기록)을 그대로 반영.
    const heroFramingOptions = [
      'inside a sleek rounded photo frame with a thin glowing cyan border',
      'bleeding directly to the frame edge with a soft dark vignette fading into the background, no visible border or frame',
      'inside a sharp-edged rectangular card with a subtle hard white outline and a soft drop shadow, no glow',
      'cut out along an irregular torn-paper silhouette following the person\'s head and shoulders, with a slightly rough paper-fiber edge texture (not a smooth sticker outline)',
    ];
    const heroFraming = heroFramingOptions[Math.floor(Math.random() * heroFramingOptions.length)];

    const creativeDirection = useCustomPrompt ? customPrompt : `A high-CTR YouTube thumbnail for Korean English-pronunciation education channel '이해하면 쉬운영어' (target: 3060 adult learners), ${isShorts ? '9:16 vertical shorts cover' : '16:9 horizontal'}, on the topic "${rawText}".

Mood: ${
      vKey === 'A'
        ? '충격/뒤통수형 — 평생 맞다고 믿었던 콩글리시 발음을 찌르는 강렬한 시각적 충격'
        : vKey === 'B'
        ? '1초 소리 족보/비밀 공식형 — 직관적인 원리 발견의 짜릿함'
        : '원어민 리얼 뉘앙스 & 대조형 — 상황별 실수와 진짜 정답의 극적 대비'
    }.

Background: dark cinematic studio (near-black navy #060911 to #0F172A) with a soft radial glow of cyan (#00F0FF) and magenta (#FF0077) light emanating from the center.

Hero: a photorealistic close-up of a Korean adult (20s-40s) positioned ${isShorts ? 'center-bottom' : 'on the right side'}, with a genuine, expressive reaction matching the mood above, softly rim-lit in cyan, ${heroFraming}.

Typography (${isShorts ? 'top of frame' : 'left side'}): ONE small glowing neon pill-shaped badge reading "${badgeText}" (do not repeat it twice); below it a massive bold headline in two lines reading "${hookLine1}" and "${hookLine2}", rendered in thick white or yellow letters with a heavy black outline for legibility; near the bottom, a small secondary info box or contrast callout referencing "${card1}", "${card2}", "${card3}" and the note "${subCallout}".

CRITICAL TEXT ACCURACY: every Korean and English word listed above must be spelled out exactly, letter by letter, with correct characters — do not invent, substitute, or garble any character. If unsure how to render a word clearly, make it larger and simpler rather than risk misspelling it.

Style: clean, professional, high-contrast studio photography blended with bold graphic design elements. No watermark, no fake phone or browser UI, no stock-photo text, no crude cartoon doodles — the human subject must look like a real photograph, not an illustration.`;

    // 텍스트 정확도는 diffusion 특성상 매번 다르게 나온다(같은 프롬프트로도 성공/실패가 갈림,
    // 2026-09-01 실측). 그래서 프롬프트 튜닝만으론 신뢰 못 하고, 생성 후 Gemini Vision으로
    // 실제 렌더링된 텍스트를 읽어 의도한 문구와 대조 → 틀리면 재생성(최대 3회 시도).
    // 커스텀 프롬프트는 어떤 텍스트가 "정답"인지 파싱할 수 없으므로 검증을 건너뛴다.
    const expectedTexts = useCustomPrompt ? [] : [hookLine1, hookLine2, badgeText, card1, card2, card3, subCallout].filter(Boolean);
    const maxAttempts = expectedTexts.length ? 3 : 1;
    let lastResult = null;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const result = await generateImageWithGeminiNative({ prompt: creativeDirection, geminiKey, temperature: 0.4 });
        lastResult = result;
        if (!expectedTexts.length) break;
        const verify = await verifyThumbnailText({ base64: result.base64, mimeType: result.mimeType, expectedTexts, geminiKey });
        if (verify.allCorrect) break;
        console.error(`나노바나나 시도 ${attempt}/${maxAttempts}: 텍스트 깨짐 감지(${verify.brokenTexts.join(', ')}) — 재생성`);
      } catch (err) {
        console.error(`나노바나나 시도 ${attempt}/${maxAttempts} 실패:`, err.message);
      }
    }

    if (lastResult) {
      return await persistGeneratedImage({
        engineLabel: useCustomPrompt ? `Nano Banana Custom Prompt (${lastResult.model}, Variant ${vKey})` : `Nano Banana Studio (${lastResult.model}, Variant ${vKey})`,
        dataUrl: `data:${lastResult.mimeType};base64,${lastResult.base64}`,
        variantKey: vKey,
      });
    }
    console.error('Nano Banana native image generation failed after all attempts, falling back to SVG-writer.');
  }

  // 2. FALLBACK: 위 이미지 모델 호출이 실패했을 때만 — Gemini가 SVG 마크업을 직접 손으로 쓰게 하는
  //    구식 경로. 복잡한 구성(그리드 등)엔 약하지만 키가 없거나 API 장애 시의 최후 보루로 남겨둔다.
  if (geminiKey && geminiKey !== 'YOUR_GEMINI_API_KEY_HERE') {
    const geminiPrompt = useCustomPrompt ? `${customPrompt}

TECHNICAL OUTPUT CONSTRAINT (do not skip): this must render as a standalone SVG, viewBox="0 0 ${W} ${H}".
This pipeline generates images by writing SVG markup directly — there is no raster diffusion step. So:
- Anything described as "photorealistic" must be approximated with rich vector shading (gradients, layered shapes,
  highlights) rather than an actual photo, UNLESS you use <image href="${chosenPhotoUrl}"> for a hero photo element.
- Return ONLY the raw valid SVG, starting with <svg and ending with </svg>. No markdown backticks, no commentary.` : `You are the Lead Art Director and YouTube Growth Strategist for English education channel '이해하면 쉬운영어' (Target: 3060 adult learners).

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
          contents: [{ parts: [{ text: geminiPrompt }] }],
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
          return await persistGeneratedImage({
            engineLabel: useCustomPrompt ? `Custom Prompt Test (Variant ${vKey})` : `Competitor-Gap & Reference Studio (Variant ${vKey})`,
            dataUrl: `data:image/svg+xml;base64,${base64CustomSvg}`,
            variantKey: vKey,
          });
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
  const fallbackSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
  <rect width="${W}" height="${H}" fill="#0a0518"/>
  <text x="${W/2}" y="${H/2}" text-anchor="middle" font-family="'Pretendard', sans-serif" font-size="48" font-weight="900" fill="#facc15">${rawText}</text>
</svg>`;
  const base64Svg = Buffer.from(fallbackSvg).toString('base64');
  return await persistGeneratedImage({
    engineLabel: `Fallback Renderer`,
    dataUrl: `data:image/svg+xml;base64,${base64Svg}`,
    variantKey: vKey,
  });
}
