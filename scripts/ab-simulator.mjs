import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
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

export async function evaluateThumbnailTitleVariants({ topic, variants, targetAudience = '5060 시니어 및 기초 영어 학습자', geminiKey }) {
  if (!geminiKey) {
    throw new Error('Gemini API 키(GEMINI_API_KEY)가 설정되지 않았습니다.');
  }

  const validVariants = (variants || []).filter(v => v && (v.title || v.imageUrl));
  if (validVariants.length === 0) {
    throw new Error('평가할 시안 제목이나 썸네일 정보가 없습니다.');
  }

  const prompt = `당신은 대한민국 최고 수준의 유튜브 썸네일 & 타이틀 알고리즘 전략가이자 CTR(노출 클릭률) 데이터 전문가입니다.
특히 '5060 시니어' 및 '왕초보 영어 학습자'를 타겟으로 하는 영어 교육 채널('이해하면 쉬운영어')의 썸네일·제목 A/B 시안을 정밀 진단합니다.

[영상 기획 주제]: ${topic || '기초 영어 발음 및 원리 학습'}
[타겟 시청자]: ${targetAudience}

[테스트 후보 시안 목록]:
${validVariants.map((v, i) => `시안 ${String.fromCharCode(65 + i)} (Variant ${String.fromCharCode(65 + i)}):
- 제목: "${v.title || '(제목 미지정)'}"
- 썸네일 카피/콘셉트: "${v.thumbnailCopy || v.imageUrl || '기본 이미지'}"
- 썸네일 포인트 태그: "${v.badge || ''}"
`).join('\n')}

아래 JSON 스키마 규격으로만 응답하세요. 백틱(\`\`\`json)으로 감싸서 출력하세요.

{
  "variantsEvaluation": [
    {
      "variantKey": "A",
      "curiosityGapScore": 88,
      "seniorLegibilityScore": 92,
      "visualSalienceScore": 85,
      "predictedGrade": "A",
      "predictedCtrRange": "8.5% ~ 11.2%",
      "strengths": ["간결하고 3초 안에 문제 인식 가능", "시니어가 선호하는 명확한 대조"],
      "weaknesses": ["제목의 마지막 단어가 다소 평이함"],
      "improvementTip": "제목 앞부분에 '원어민 99%가 틀리는' 같은 구체적 숫자 후킹 추가"
    }
  ],
  "bestVariant": "A",
  "overallVerdict": "시안 A가 호기심 갭과 5060 시니어 모바일 가독성에서 가장 높은 점수를 받았습니다. 피드 스크롤 중 스턴건 효과가 가장 우수합니다.",
  "aiTitleSuggestions": [
    {
      "type": "⚡ 후킹형 (호기심 극대화)",
      "title": "원어민이 'Want' 발음할 때 절대 입술을 안 모으는 진짜 이유"
    },
    {
      "type": "❓ 질문형 (클릭 유도)",
      "title": "왜 우리는 평생 '워터'를 틀리게 발음했을까? (10초 원리)"
    },
    {
      "type": "💥 반전형 (상식 파괴)",
      "title": "영어 발음 기호 외우지 마세요! 이 법칙 하나면 간판 다 읽힙니다"
    },
    {
      "type": "📐 원리형 (쉬운 해결책)",
      "title": "CAT은 '캣'인데 KING은 왜 '킹'일까? C와 K의 완벽 구분법"
    },
    {
      "type": "🤝 공감형 (시니어 맞춤)",
      "title": "50대에 시작해도 늦지 않은 영어 읽기 비법 (하루 5분 완성)"
    }
  ]
}`;

  const models = ['gemini-2.5-flash', 'gemini-flash-latest', 'gemini-2.5-flash-lite', 'gemini-3.7-flash'];
  let lastError = null;

  for (const model of models) {
    try {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`;
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
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
