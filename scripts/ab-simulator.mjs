import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes } from 'node:crypto';

const projectDir = dirname(dirname(fileURLToPath(import.meta.url)));
const marketDemandPath = join(projectDir, 'data', 'youtube', 'market-demand.json');
const catalogPath = join(projectDir, 'data', 'youtube', 'catalog.json');
export const tempThumbDir = join(projectDir, 'output', 'temp-thumbnails');
// 채널 정체성으로 쓸 기준 얼굴 — resolveImageToInlineData가 'public/'로 시작하는 상대경로를
// 로컬 파일로 읽어주므로 절대경로가 아니라 이 형태를 그대로 써야 한다. 파일이 아직 없으면
// resolveImageToInlineData가 null을 반환해 레퍼런스 없이 조용히 폴백한다.
const PRESENTER_REFERENCE_PATH = 'public/brand/thumbnail-presenter-reference.jpg';
// "프롬프트만 복사"(서버 라우트)도 이 파일 존재 여부로 hasPersonReference 문구를 넣을지 결정해야
// 실제 생성 경로와 프롬프트 내용이 어긋나지 않는다 — buildThumbnailPrompt 자체는 파일 I/O가 없는
// 순수 함수로 유지하고, 존재 확인만 별도로 export.
export async function hasPresenterReference() {
  return !!(await resolveImageToInlineData(PRESENTER_REFERENCE_PATH));
}

// topic을 넘기면 관련도 높은 순으로 정렬해서 돌려준다 — LIVE MOBILE FEED PREVIEW가 아무 경쟁
// 영상이나 보여주는 게 아니라, 지금 다루는 소재와 실제로 겹치는 경쟁 영상을 보여줘야 "우리
// 썸네일이 이 경쟁 영상들 사이에서 얼마나 눈에 띄는가"라는 이 도구의 목적에 맞는다
// (2026-09-01, 사용자 피드백). topic이 없으면 기존 순서(수집된 순서) 그대로.
export async function getMockCompetitorVideos({ topic = '' } = {}) {
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
            duration: item.durationSeconds != null ? formatDurationLabel(item.durationSeconds) : '08:24',
            // market-demand.mjs가 videos.list contentDetails로 구한 실측값 — 없으면(구버전
            // market-demand.json) null이라 롱폼/쇼츠 어느 쪽으로도 단정하지 않고 롱폼 취급한다
            // (기존 폴백 목록도 전부 롱폼이라 안전한 기본값).
            isShort: item.isShort === true,
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
        isShort: false,
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
        isShort: false,
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
        isShort: true,
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
        isShort: false,
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
        isShort: false,
      },
    ];
    competitorVideos.push(...fallbackList);
  }

  const topicTokens = tokenizeTopic(topic);
  const ranked = rankByTopicRelevance(competitorVideos, topicTokens, (v) => `${v.title} ${v.channelTitle}`);
  return ranked.slice(0, 16);
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

// 초 단위 duration을 화면 표시용 "M:SS"/"H:MM:SS"로. market-demand.mjs의 durationSeconds를
// LIVE MOBILE FEED PREVIEW 카드에 그대로 보여주기 위한 포맷터.
function formatDurationLabel(totalSeconds) {
  const s = Math.max(0, Math.round(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const mm = h > 0 ? String(m).padStart(2, '0') : String(m);
  const ss = String(sec).padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
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

  // ⚠️ 2026-09-19 롤백 — 한때 market-demand.json의 자동완성 키워드 풀 전체를 여기서 뽑아
  // 프롬프트에 통째로 주입하고("1타 4피 융합 공식"), 'title' 맨 끝 "|" 뒤 키워드만 그 풀에서
  // 골라 융합하게 시도한 적이 있다. 실제로 3차례 재검증해보니 (1) 풀 키워드를 그대로 베껴서
  // 붙이기만 하고 진짜 융합이 안 되는 사례가 반복됐고, (2) 더 심각하게는 "영어 발음 원리"류
  // 뭉뚱그린 키워드 목록이 '|' 뒤뿐 아니라 title 본문 어투에까지 새어들어가, 이 소재만의
  // 구체적 단어(예: "-ate")가 본문에서 빠지고 "왜 다르게 읽힐까" 같은 어느 발음 영상에나
  // 붙일 수 있는 뭉뚱그린 문장으로 흘러가는 부작용이 나왔다(5개 중 4개꼴). 패치를 거듭할수록
  // 새로운 부작용이 하나씩 튀어나오는 패턴이라, 검증되지 않은 "토큰 조합 매칭" 가정에 기반한
  // 이 기능 전체를 걷어내고 아래 규칙 9(구체적 롱테일 키워드 하나를 소재 자체에서 직접
  // 뽑는 원래 방식)로 되돌렸다. topic과 실제로 겹치는 키워드만 골라내는 matchedDemandKeywords는
  // 여전히 유효하므로 그대로 둔다.

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
      `- 썸네일 헤드라인: "${v.thumbnailHeadline || '(이미지 내 텍스트 분석 필요)'}"\n`;
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

'curiosityGapScore'를 매길 때 이 시안이 어떤 종류의 호기심 격차를 쓰고 있는지 먼저 직접
판단할 것 — 아래는 고정된 필수 카테고리가 아니라 참고용 예시일 뿐이다(2026-09-29 확정,
사용자 지적 — "정해진 게 없고 제미나이가 알아서 결정하는 걸로 했다": 이 5개 중 하나를
반드시 골라야 한다고 강제하면 안 된다. 이 소재에 더 잘 맞는, 아래 목록에 없는 유형이면
그걸 그대로 판단에 쓸 것):
- 예시: 순간형(발음이 꼬이거나 표정이 굳기 직전의 찰나), 스토리형(서사의 긴장 지점),
  결과형(원리를 터득해 술술 읽히는 이상적 상태), 변화형(엉터리 발음 → 원어민 발음 도달 과정),
  참신형(당연하게 믿던 발음 상식이 깨지는 충격) 등.
여러 시안을 함께 진단할 때 전부 비슷한 유형으로 쏠려 있으면 weaknesses에 "다른 시안과
유형이 겹친다"고 자유롭게 지적해도 좋다(1개 시안만 진단할 때는 해당 없음).

'aiTitleSuggestions' 5개는 반드시 아래 규칙을 지킬 것:
1. **정답/핵심 메커니즘 노출 금지 — 'title'뿐 아니라 'thumbnailHeadline'도 똑같이 적용된다**
   (2026-09-14 강화 — 실제로 "겹모음 뒤는 버리세요"라는 headline이 나온 사례가 있었다: 이건
   "모음이 겹칠 때 어떻게 읽는지"라는 이 영상의 핵심 정답을 통째로 말해버린 것이다. 사용자
   지적: "정답의 100% 누설... 영상을 클릭할 이유(결핍)를 없애버린 것"). 특히 상식파괴/반전
   계열 각도의 후보는 "상식이 틀렸다는 사실"까지만 드러내고 "왜/어떻게 그런지"는 절대 밝히지
   말 것. title이든 headline이든, 정답을 다 알려주면 영상을 볼 이유가 없다.
   (예: "끝소리 T는 소리 내지 마세요, 목소리 빼고 바람만 뱉는 원리"·"겹모음 뒤는 버리세요"처럼
   메커니즘/규칙 자체를 문장으로 설명하면 안 됨 — "끝소리 T, 원어민은 절대 이렇게 안 읽습니다"·
   "여태 두 글자 다 읽었네요..."처럼 궁금증만 남길 것.)
   - **어려운 음성학·문법·학술 용어 절대 금지** (headline·title 본문·'|' 뒤 검색 키워드 전부에 적용):
     브랜드 페르소나 — 어려운 음성학 용어 절대 금지 원칙. "겹모음", "축약", "리덕션", "탄설음",
     "자음동화", "음소"처럼 교수나 전문가만 아는 용어는 제목·키워드 어디에도 쓰지 말 것.
     타겟 시청자가 바로 이해하고 검색창에 손가락으로 직접 칠 쉬운 입말이나 구체적 상황(예: "단어 읽는 법",
     "발음 차이", "소리 원리", "두 글자")으로 표현할 것.
2. **5개 전부 [영상 기획 주제]를 구체적으로 반영할 것** — 특히 공감/타겟맞춤 계열 각도의 후보가 브랜드
   톤앤매너 문장을 그대로 재사용하는 슬로건이 되지 않도록, 이 소재 고유의 키워드(단어/상황)를 반드시
   포함할 것.
3. **'title'·'thumbnailHeadline'는 핵심 키워드를 공유해도 된다 — 진짜 원칙은
   "같은 정보 금지"가 아니라 "표현 형식(register)을 다르게" 하는 것이다**(2026-09-11, 실제
   상위 채널 12건 실측으로 재검증 — 처음엔 "절대 반복 금지"로 너무 엄격하게 잡았다가, 실제
   경쟁 채널 썸네일/제목 쌍을 직접 대조해보니 핵심 키워드·숫자를 그대로 공유하는 게 오히려
   흔하고 효과적인 패턴이었다. 예: 실측 사례 — 썸네일 "3개월간 '이것'만 하세요" ↔ 제목
   "영어회화는 '이것'이 핵심입니다! 3개월만 제발 이렇게 하세요" — "이것"·"3개월"을 그대로
   공유하면서 형식만 다름. 또 다른 사례: 썸네일 "Have been / 1분 30초만 보세요" ↔ 제목
   "...have been 1분30초 안에 이해 못하면 욕해도 됩니다" — 핵심 단어·시간이 동일).
   - **title = 서술/스토리 톤**: "~했더니 ~됐어요", "~한다면 꼭 보세요"처럼 맥락과 서사가 있는
     완전한 문장. 검색 키워드·숫자·맥락이 담긴다.
   - **thumbnailHeadline = 명령/단정 압축 톤**: 썸네일 이미지 안의 **유일한 텍스트**(2026-09-13,
     하단 보조 캡션·포인트 뱃지 폐지 — 아래 6번 참고). title과 같은 핵심 키워드를 써도 되지만,
     "~하세요/~만/~됨"처럼 짧고 강렬하게 압축한 명령형·단정형이어야 한다 — title을 그대로
     줄인 것처럼 보이면 안 되고, 같은 핵심을 다른 어투로 찍어야 한다.
   - **유일하게 피해야 할 것은 이 영상과 무관한 범용 문구다**(2026-09-11, 사용자 지적: "제목과
     같으면 안 되지만 제목의 보조 역할이나 제목으로 연관돼서 클릭할 수 있는 걸 추가해야지,
     지금 문구는 이득만 있는거잖아" — "10초면 충분"처럼 이 소재가 영어 발음인지 다이어트인지
     전혀 알 수 없는 완전 교체 가능한 문구가 문제였지, 키워드를 title과 공유하는 것 자체는
     문제가 아니었다). headline만 따로 떼어놔도 "아, 이 영상 얘기구나" 싶은 단서가 남아야 한다.
   예: title="'-sion' 끝소리 규칙, 원어민들이 절대 글자 그대로 안 읽는 이유" →
   - ❌ 실패: "10초면 충분" (이 영상만의 단서가 전혀 없음, 아무 영상에나 붙여도 말이 됨)
   - ✅ 성공: "-sion 이제 그만" (title의 핵심 키워드 "-sion"을 그대로 공유하되, 서술형 title과
     다르게 명령형으로 압축 — 실제 상위 채널 패턴과 동일, 아래 6번 기준 3단어로 압축까지 반영)
4. **'thumbnailHeadline'은 "무슨 주제를 다루는지"는 명시하고, 궁금증은 오직 "구체적 해법·이유·개수"에만
   걸 것**(2026-09-11, 실제 상위 채널 6건 실측 — "독학으로 영어 입터지는 법", "영어어순, 이게 전부입니다",
   "BBC가 한국어처럼 들려요" 등은 전부 헤드라인만 봐도 "이 영상이 스피킹/어순/듣기 중 뭘 다루는지"가 즉시
   보였고, 궁금증은 오직 "그 방법·이유가 정확히 뭔지"에만 걸려 있었다 — 주제 자체를 숨긴 예는 하나도
   없었다). 위 규칙 3이 막는 건 "이 영상과 무관한 범용 문구"인데, 그것만으로는 부족하다 — "이 끝소리
   계속 틀림", "그 규칙 하나로 다 풀림"처럼 무관하진 않지만 **소재 자체가 뭔지 전혀 안 보이는** headline도
   여전히 실패다.
   - headline 안에 이 소재의 구체적 영역 키워드(핵심 단어·규칙 이름·발음 현상 — 예: "-sion", "연음",
     "겹자음")를 최소 하나는 그대로 노출해서, 이 문구만 따로 떼어 봐도 "아 이거 무슨 얘기구나"가 바로
     잡혀야 한다.
   - 숨겨도 되는 건 "왜 그런지/어떻게 고치는지/몇 개인지" 같은 **결말·해법**뿐이다. 주제 도메인 자체는
     절대 숨기지 않는다.
   - 예(소재: "-sion 끝소리 규칙"): ❌ "그 규칙 하나로 다 풀림"(무슨 규칙인지 전혀 안 보임) →
     ✅ "-sion 끝소리, 이 규칙 하나면 끝"(주제 "-sion 끝소리"는 명시하고, "이 규칙"이 정확히 뭔지만
     궁금증으로 남김).
5. **headline은 궁금증만 만들지 말고, "이 영상을 보면 정확히 뭘 할 수 있게 되는지"라는
   구체적 약속도 표현할 수 있어야 한다**(2026-09-11, 사용자 지적: "썸네일부터 스토리텔링을 시작하는
   거다, 우리는 썸네일의 약속을 지킨다가 규칙에 있다" — knowledge/thumbnail-strategy.md의 "썸네일은
   제목과 함께 하나의 약속을 만든다" 원칙, VIDEO_WORKFLOW.md의 "대본은 제목·썸네일이 건 약속을
   실제로 지켜야 한다" 원칙과 직결된다. 2026-09-13 정정: 원래는 이 역할을 headline·thumbnailCopy가
   나눠 맡았는데, thumbnailCopy가 폐지되면서 headline 혼자 감당한다). 이 채널이 실제로 써 온 좋은
   예: EP9 헤드라인 "-CIAL → 셜"(뒤에 카피로 "처음 보는 단어도 읽힌다"를 붙였던 방식은 이제
   폐지), EP13 "이제 단어가 아니라 문장이 들립니다" — 전부 궁금증이 아니라 **시청 후 달라지는
   구체적 상태**를 명시한다. "-sion 왜 계속 틀릴까"처럼 질문만 던지는 문구는 궁금증은 만들어도
   약속이 없다 — 이 소재에 맞으면 headline 자체가 이런 "약속·결과 확정" 문장이 되도록 할 것
   (아래 7번의 "약속/결과 확정형" 참고. 2026-09-13: 몇 개를 이 방식으로 써야 하는지는 더 이상
   고정하지 않는다 — 아래 7번 참고, 소재에 안 맞는데 개수를 채우려고 억지로 끼워 넣지 말 것).
   쓸 땐 아래 6번의 3~4단어 압축 안에서 표현할 것 — 예: "다시는 안 틀림", "이제 안 막힘"처럼
   짧게 확정한다.
6. **'thumbnailHeadline'·'suggestedBadge'·'thumbnailCopy' 중 헤드라인만 남기고 나머지 둘은
   폐지, 헤드라인은 3~4단어로 극도로 압축해 시각적 "스턴건(Stun Gun)" 역할만 하게 할 것**
   (2026-09-13 재정정, 사용자 제공 문구 — "썸네일 문구는 시청자를 '설득'하는 용도가 아니라,
   무의식적으로 스크롤을 내리던 엄지손가락을 '정지'시키는 충격 요법입니다. 텍스트가 짧을수록
   시청자의 판단이 흐려지는 것이 아니라, 오히려 클릭해야 할 이유가 0.1초 만에 선명하게 꽂힙니다."
   — 하단 보조 캡션과 포인트 뱃지는 이 스턴건 효과를 흐리는 군더더기라 판단해 폐지함).
   2026-09-11엔 "한글 3~8자씩 최대 2줄"이라는 글자 수 산수가 5번 규칙의 "약속 문장"을 억지로
   쪼개서 부자연스러워졌다는 이유로 길이 제한을 아예 없앴는데, 그러자 이번엔 헤드라인이 다시
   길어지는 반대쪽 문제가 생겼다. **이번엔 "글자 수"가 아니라 "단어(어절) 수"로 압축 기준을
   바꿔서 같은 실패를 반복하지 않는다** — 단어 단위로 세면 어절이 통째로 남거나 통째로 빠지므로,
   글자를 어절 중간에서 억지로 잘라 뜻이 끊기는 부자연스러움이 생기지 않는다:
   - 조사를 뺀 핵심 단어 3~4개로 끝낼 것 — 예: "다시는 안 틀림"(3단어), "-sion 이제 그만"
     (3단어), "긴 단어 겁나면 여기"(4단어).
   - **공부책/강의 냄새 절대 금지**(2026-09-19 확정) — "-ate 그냥 읽으면 틀림", "-ate 소리 외우지마세요",
     "-ate 규칙 하나로 끝"처럼 뻔한 영어 수업 느낌의 설명/명령조는 피드 스크롤 중 "또 공부하라는 소리네"
     하며 넘어가게 만든다. 대신 **시청자의 상식 붕괴 혼잣말·배신감·충격의 의문문**으로 엄지손가락을
     0.1초 만에 멈추게 할 것!
     (예: '"-ate" 아니었어?'(3단어), '철자 같은데 전혀 딴판'(4단어), '설마 다 읽었나요?'(3단어),
     '알파벳에 제대로 속음'(3단어), '모음 두 개? 여태 헛고생'(4단어)).
   - 압축의 목적은 정보를 줄이는 게 아니라 "0.1초 안에 클릭할 이유가 꽂히게" 만드는 것이다 —
     친절하게 설명하려고 단어를 더 넣지 말고, 가장 강력한 단어 3~4개만 남길 것.
   - 이 압축은 아래 심리 공식 어느 걸 고르든 똑같이 적용된다.
7. **'thumbnailHeadline'의 심리적 접근법을 고정된 목록·비율로 강제하지 말고, 이 소재에 가장 잘
   맞는 걸 매번 직접 판단할 것**(2026-09-13 정정 — 사용자 지적: "손실회피/호기심/효율성/타깃저격/
   상식파괴/약속확정 이것도 확정하지마... 이걸 정해두면 하나만 계속 사용할 수도 있어." 원래는
   "①은 최소 1개, ③은 최소 1개, ⑥은 최소 2개 반드시 포함"처럼 고정 비율을 강제했는데, 이게
   바로 위 10번 규칙에서 'type' 라벨에 있었던 것과 같은 문제 — 소재와 무관하게 항상 같은 틀로
   찍어낼 위험 — 를 심리 공식 쪽에도 똑같이 남겨두고 있었다). 아래는 "이런 접근법도 있다"는
   참고용 메뉴일 뿐 몇 개를 반드시 써야 한다는 강제가 아니다 — 이 소재엔 이 중 몇 개가 안 맞을
   수도 있고, 목록에 없는 다른 접근법이 더 잘 맞을 수도 있다. 아래 예시는 전부 "-sion 끝소리
   규칙" 소재를 가정했고 위 6번 기준 3~4단어로 압축돼 있다 — **패턴만 참고하고 예시 문구를
   그대로 베끼지 말 것**. 패턴을 이번 소재(위 [영상 기획 주제])의 실제 단어/상황에 맞게 다시
   채워서, headline만 봐도 이 영상 얘기라는 게 드러나야 한다(규칙 3·4 참고 — 범용 문구·주제
   은폐 금지):
   - **상식 붕괴 / 인지부조화**: '"-ate" 아니었어?'(3단어), '철자 같은데 전혀 딴판'(4단어) — 시청자가 당연하게 믿던 지식이 0.1초 만에 박살 나는 충격.
   - **현실 배신감 / 실패 소환**: '알파벳에 제대로 속음'(3단어), '외국인이 왜 못 알아듣지?'(4단어) — 과거의 억울함·실패 경험을 직격.
   - **불안감 / 확인 욕구**: '설마 이것도 다 읽음?'(4단어), '여태 나만 딴소리 냄'(4단어) — 어? 나 잘못 알고 있나 하는 즉각적인 불안감 자극.
   - **통쾌한 해결 / 사이다**: '모음 두 개? 여태 헛고생'(4단어), '이 단어의 충격 반전'(4단어) — 정답은 숨긴 채 카타르시스를 예고.
   ⚠️ **"~ 규칙 하나로 끝", "~ 외우지 마세요", "~ 계속 틀리는 중" 같은 지루한 학원 강의식 어투는 절대 쓰지 말 것!**
   피드 스크롤을 0.1초 만에 정지시키는 건 공부하라는 명령이 아니라, **시청자 본인의 상식이 무너지는 당황스러움**이다.
   **유일하게 강제하는 건 "5개가 서로 다른 접근법이어야 한다"는 것뿐이다** — 5개 전부 비슷한 각도로 쏠리면 안 된다.
   ⚠️ **'권위·증명형'("전문가가 말하는", "요즘 난리 난")은 쓰지 말 것** — 우리 채널엔 그런 근거가 실제로
   없는데 있는 척 꾸미는 것은 "가식 없는 솔직 담백" 페르소나 위반이다. 모든 문구는 실제 발음/연음 원리에
   근거해야 하며, 근거 없는 가짜 통계("99%가 모르는")나 과장된 위협 문구는 손실회피형에서도 절대 쓰지 않는다.
8. **'title'은 모바일 3단 구간 감각을 참고해서 쓸 것**(2026-09-13, 사용자 제공 외부 자료 근거
   — 모바일 유튜브 앱에서 실제로 안 잘리는/잘리는 글자 수 구간을 기준으로 만든 구조. 기존
   "앞 30자 이내에 키워드"라는 단순 규칙만으로는 부족했다 — 키워드가 앞에 있어도 그 안에서
   뭘 먼저 던지고 뭘 나중에 둘지가 고정돼 있으면 초반 타격감이 죽는다. ⚠️ 2026-09-19 조정 —
   이 구간을 "반드시 쉼표로 끊는 3칸"처럼 기계적으로 지키다 보니 실제 제목들이 전부
   "[훅], [설명] | [키워드]"라는 똑같은 문장부호 구조로 찍혀 나오는 부작용이 있었다(EP17
   "발음기호 외우다 지쳤는데, R 하나로...", EP18 "저도 왜 소리 안 나는지 몰랐습니다, 혀가..."
   — 쉼표 위치까지 거의 동일). 아래 글자 수는 "여기서부턴 안 잘린다/잘려도 된다"는 참고
   기준일 뿐, 쉼표로 강제 분절하라는 뜻이 아니다 — **자연스럽게 이어지는 한 문장으로 써도
   되고, 쉼표·느낌표·말줄임표 중 이 소재에 맞는 걸 자유롭게 고를 것**):
   - **1~15자 안쪽 (감정 직격 타격감)**: 모바일에서 절대 안 잘리는 구간. **점잖은 모범생식 설명이나
     교과서적 의문문("철자 같은 -ate 소리가 왜 2개로 갈릴까...")은 절대 금지한다**(2026-09-19 확정).
     피드에서는 시청자의 아픈 경험(과거 망신살·실패 경험)이나 상식 붕괴 배신감을 팍 찌르는
     첫 10~15자 타격감으로 시작할 것:
     * 과거 망신살·실패 소환: 예) "외국인이 왜 못 알아듣나 했더니...", "열심히 읽었는데 아무도 못 알아듣는 이유"
     * 믿었던 지식의 배신감: 예) "알파벳에 제대로 속았습니다...", "사전 찾아보고 배신감 느꼈습니다"
     * 불안감·확인 욕구: 예) "설마 이것도 다 읽으셨나요?", "평생 '에이트'인 줄 알았는데..."
   - **16~25자 부근까지**: 위 훅에 이어 영상이 다루는 구체적 상황이나 진짜 주제가 물 흐르듯 자연스럽게 이어져야 한다.
   - **26자 이후**: 화면에서 "..."으로 잘려도 무방한 융합 롱테일 검색 키워드 영역('|' 꼬리표).
   - **정확히 뭘 어디에 놓을지, 몇 개 절로 나눌지는 소재 성격에 맞춰 자유롭게 판단할 것** —
     5개 후보를 전부 같은 절 구조·같은 문장부호로 찍어내지 말 것. 아래는 참고용 접근 각도일
     뿐 고정된 목록이 아니다(2026-09-19 조정 — 아래 3개를 A/B/C로 고정 라벨링해뒀더니 5개
     후보가 전부 이 3개 틀 안에서만 돌려막기 되는 문제가 있었다 — 바로 아래 규칙 10의 'type'
     라벨을 고정 목록에서 자유 판단으로 바꾼 것과 같은 이유로 여기도 고정을 없앤다):
     - **결과·경험 전면**: 예) "이제 하나도 안 헷갈립니다, 모음 2개 겹칠 때 단어 읽는 법" —
       "정답이 뭔지"가 아니라 "그 정답을 알면 시청자가 어떤 상태가 되는지"(결과·경험)를
       맨 앞에 던진다. ⚠️ 이 각도는 규칙 1(정답/메커니즘 노출 금지)과 가장 부딪히기 쉽다 —
       "앞 모음만 소리납니다"처럼 메커니즘 자체를 요약해서 앞에 놓으면 규칙 1이 실패 사례로
       꼽은 "겹모음 뒤는 버리세요"(2026-09-14 사례)와 표현만 다를 뿐 같은 정답 누설이 된다.
       "무엇이 정답인지"는 절대 던지지 말고 "정답을 알고 난 뒤의 상태 변화"만 던질 것.
     - **페인포인트 전면**: 예) "철자 무작정 외우지 마세요, 모음 2개 겹칠 때 '이것'만 알면
       끝" — 타겟이 겪는 구체적 고통을 정면에 배치.
     - **호기심 전면**: 예) "Boat, Rain 왜 앞 모음만 읽힐까? 단숨에 뚫리는 영어 모음 규칙" —
       시청자가 이미 아는 구체적 단어·사례를 맨 앞에 던져 "아는 건데 왜 이런지는 몰랐네"
       인지 부조화를 자극.
     - 이 세 각도에 안 맞으면 다른 접근도 얼마든지 쓸 것 — 목록에 없는 각도가 이 소재에
       더 잘 맞을 수 있다.
9. **'title' 맨 끝에 "|"로 구분한 구체적 롱테일 검색어를 붙일 것**(2026-09-13, 2026-09-15
   채널명 옵션 폐지, 2026-09-19 뭉뚱그린 타겟명 폐지 — 자동완성 키워드 풀 전체를 프롬프트에
   통째로 주입해 융합시키려던 시도는 같은 날 롤백함: 풀 키워드를 그대로 베껴 붙이기만 하는
   문제도 반복됐고, 무엇보다 그 목록의 뭉뚱그린 어투가 title 본문에까지 새어들어가 "-ate"
   같은 이 소재 고유의 단어가 본문에서 빠지고 어느 발음 영상에나 붙일 수 있는 밋밋한 문장이
   나오는 부작용이 있었다) — 위 8번 구조의 "부가 영역"을 구체화한 것. **"| 영어 왕초보",
   "| 성인 파닉스"처럼 뭉뚱그린 타겟·카테고리명은 쓰지 말 것** — 검색량은 있어도 경쟁이
   극심해서 우리 채널 규모로는 상위 노출이 사실상 불가능하다. 대신 시청자가 이 영상의
   구체적 문제를 검색창에 그대로 칠 법한 **롱테일 검색어**를 쓴다 — 이 소재가 실제로 다루는
   발음 현상·단어·규칙 이름을 직접 넣을 것(예: "| 영어 모음 읽는 법", "| 영어 묵음 발음",
   "| 영어 연음 듣기", "| bossy r 발음"). 어려운 음성학·학술 전문용어("| 영어 리덕션 발음",
   "| 영어 축약 발음", "| 자음동화 현상")는 절대 쓰지 않는다 — 타겟 시청자(3060 성인·기초
   학습자)가 검색창에 절대 치지 않을 말이다. 5개 후보에 서로 다른 롱테일 표현을 배분하고,
   실제로 존재하지 않는 검색어를 지어내지 말 것.
   **채널명("| 이해하면 쉬운영어")은 이 자리에 절대 넣지 않는다**(2026-09-15 확정) — 유튜브
   UI가 검색 결과·피드에서 채널명을 제목과 별도로 항상 보여주므로 제목 텍스트 안에 또 넣는 건
   글자 수만 낭비하고, 모바일에서 정작 중요한 앞부분(훅)이 잘릴 위험만 키운다.
10. **'type' 라벨은 아래 참고 목록을 고정으로 베끼지 말고, 이 소재에 맞는 심리적 각도를 직접
    판단해서 지을 것**(2026-09-13, 사용자 지적: "후킹/질문/반전/원리/공감으로 고정되어 있잖아?" —
    스키마 예시에 이 5개 라벨이 문자 그대로 박혀 있어서, 소재와 무관하게 매번 토씨까지 똑같이
    복사돼 나오고 있었다). 아래는 "이런 각도도 있다"는 참고용 메뉴일 뿐이다 — 이 소재엔 5개 중
    일부가 안 맞을 수도 있고, 목록에 없는 더 잘 맞는 각도가 있을 수도 있다:
    - 후킹형(호기심 극대화), 질문형(클릭 유도), 반전형(상식 파괴), 원리형(쉬운 해결책),
      공감형(타겟 시청자 맞춤), 손실회피형(경고), 효율성형(시간·숫자로 승부), 타깃저격형(특정
      대상을 직접 호명)
    5개 후보는 반드시 서로 다른 각도여야 한다(전부 비슷한 각도로 쏠리면 안 됨). 라벨 문구
    자체도 이 소재에 맞게 새로 지을 것 — 위 참고 목록의 문구를 토씨까지 그대로 베끼지 말 것.
11. **'title'은 "전문가 톤"이 아니라 "동반자 톤"을 기본값으로 쓸 것**(2026-09-14, 사용자 지적
    — 채널 정체성 "이해하면 쉬운영어"는 위에서 가르치는 게 아니라 시청자와 똑같이 경험하고
    이해하면서 함께 깨닫는 실전 학습 파트너다(knowledge/brand-persona.md 2절 "가식 없이
    솔직 담백한 실전 학습 파트너" 원칙과 직결). 그런데 지금까지 title 예시는 "~하지 마세요",
    "~됩니다"처럼 시청자보다 먼저 다 아는 사람이 위에서 알려주는 전문가/명령 톤에 치우쳐
    있었다. 시청자와 똑같이 헤매다가 함께 깨닫는 동반자 톤으로 바꿀 것):
    - ❌ 전문가 톤: "절대 다 읽지 마세요" → ✅ 동반자 톤: "여태 두 글자 다 읽었네요..."
    - ❌ 전문가 톤: "원어민의 1초 꼼수" → ✅ 동반자 톤: "이걸 이제야 알았습니다"
    - ⚠️ **"저도/제가/이제야/여태" 같은 특정 1인칭 단어를 맨 앞에 고정으로 박지 말 것**
      (2026-09-19 확인 — 이 단어들을 예시로 명시했더니 실제로 EP16 "여태 두 글자 다
      읽었네요", EP18 "저도 왜 소리 안 나는지 몰랐습니다"처럼 매 에피소드가 전부 "후회하는
      화자"로 복제되는 부작용이 나타났다). 동반자 톤의 본질은 "1인칭 후회"가 아니라
      "시청자와 같은 눈높이에서 함께 느끼는 감정"이다 — 후회뿐 아니라 놀라움·의문·카타르시스·
      유쾌한 발견 등 이 소재에 맞는 감정을 매번 다르게 골라 쓸 것. 5개 후보 전부가 같은
      감정 틀로 쏠리면 안 된다.
    - 위 8번의 배치 각도와는 별개 축이다 — 어느 각도를 쓰든 동반자 톤으로 표현할 수 있다.
      실제 채널 시그니처 멘트(brand-persona.md 5절 — "저도 외우는 거 딱 질색이었습니다"
      등)처럼 자연스러운 범위 안에서 쓰되, 특정 문장을 그대로 베끼거나 매번 같은 감정 틀을
      반복하지 말 것.

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
      "type": "이 소재에 맞는 심리적 각도명 — 이모지 1개+한글 2~4단어 라벨 (규칙 10의 참고 목록은 예시일 뿐, 그대로 베끼지 말고 이 소재에 맞게 새로 지을 것. 5개 전부 서로 다른 각도)",
      "title": "모바일 맨 앞 10~15자는 점잖은 모범생 설명 금지! 시청자의 과거 망신살·배신감·상식 붕괴를 팍 찌르는 감정 타격감 훅으로 시작하고, 이어서 25자 부근까지 구체적 상황(이번 소재의 핵심 단어/철자)을 자연스러운 한 문장으로 연결. 맨 끝엔 '|'로 [검증된 자동완성 키워드 + 이번 소재 구체어] 1타 4피 융합 롱테일 검색어 추가 (전문용어 금지, 시청자 입말 사용).",
      "thumbnailHeadline": "공부책/강의 냄새 절대 금지! 시청자가 당연하게 믿던 상식이 박살 나는 순간의 혼잣말·배신감·충격 의문문(예: '\"-ate\" 아니었어?', '철자 같은데 전혀 딴판', '설마 다 읽었나요?')으로 조사를 뺀 3~4단어로 극도로 압축해 0.1초 만에 스크롤을 멈추는 시각적 스턴건. title과 핵심 키워드를 공유해도 되지만 압축형이어야 함.",
      "designConcept": "2026-09-29 확정 — 이 필드는 오직 채널 공식 아바타 호스트의 표정·제스처만 묘사한다(예: '입술에 검지를 대는 쉿 포즈로 눈웃음', '두 손을 번쩍 들며 아하! 하는 표정'). 앵커 단어(예: -ATE, City) 자체나 그 주변에 겹치는 그 어떤 추가 그래픽도 절대 금지 — 3D 오브젝트(열쇠·자물쇠 등)뿐 아니라 돋보기·번개·물음표·충돌 이펙트·글자를 감싸는 도형·글자가 휘거나 찌그러지는 연출 전부 금지다. 이 채널의 실제 확정 썸네일(-ate, City 등)은 앵커 단어가 흰 글자+검은 테두리로 배경 위에 평평하게 있을 뿐, 그 위에 아무것도 얹지 않는다 — 이 필드가 프롬프트에 그대로 주입돼 이미지 생성을 좌우하므로, 여기 장면/소품을 적으면 그대로 화면에 나타난다(실측 확인됨: '붉은 물음표'류 예시 때문에 돋보기+번개, 3D 샌드위치 블록 등이 실제로 생성됨).",
      "midjourneyPrompt": "${isShorts ? 'Clean vertical visual artwork for English pronunciation education, dark cyber-hud deep navy ambient background, minimalist graphic layout, copy space for Korean text, 4k ultra-high resolution, 9:16 --ar 9:16 --no text font letters words watermark phone mockup device frame icons UI buttons --v 6.0' : 'Clean horizontal visual artwork for English pronunciation education, dark cyber-hud deep navy ambient background, minimalist graphic layout, copy space for Korean text, 4k resolution, 16:9 --ar 16:9 --no text font letters words watermark phone mockup device frame icons UI buttons --v 6.0'}(이 title 고유의 비주얼 요소로 구체화해서 다시 쓸 것 — 5개 프롬프트가 서로 달라야 함)"
    },
    {
      "type": "...",
      "title": "...",
      "thumbnailHeadline": "...",
      "designConcept": "...",
      "midjourneyPrompt": "..."
    },
    {
      "type": "...",
      "title": "...",
      "thumbnailHeadline": "...",
      "designConcept": "...",
      "midjourneyPrompt": "..."
    },
    {
      "type": "...",
      "title": "...",
      "thumbnailHeadline": "...",
      "designConcept": "...",
      "midjourneyPrompt": "..."
    },
    {
      "type": "...",
      "title": "...",
      "thumbnailHeadline": "...",
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
// 실제 픽셀 이미지를 diffusion으로 만든다. 기본값은 나노바나나 2 Lite(가장 빠르고 저렴) 먼저,
// 실패하면 나노바나나 2 → 프로 순으로 승격. `models`를 넘기면 그 순서를 그대로 쓴다 — 텍스트가
// 들어가는 생성은 호출부가 나노바나나 2/프로를 1순위로 지정한다(2026-09-01: 이 체인이 "첫
// 성공"에서 멈추는 구조라, 기본 순서로는 flash가 API 에러 없이 항상 성공해서 pro가 한 번도
// 실제로 시도되지 않았던 버그가 있었음 — knowledge/now.md 참고). ListModels API로 실제 존재를
// 확인한 모델 ID만 사용할 것(추측 금지). 1세대 나노바나나(gemini-2.5-flash-image)는 Google
// 공식 문서(ai.google.dev/gemini-api/docs/image-generation, 2026-09-01 확인)가 "나노바나나 2
// Lite로 전환을 강력 권장"이라고 명시한 레거시 모델이라 체인에서 제외했다.
// temperature를 낮추면(기본 미지정보다) 텍스트 렌더링이 좀 더 보수적/일관적으로 나오는 경향이
// 있어 기본값을 살짝 낮춰 받는다 — 그래도 완전히 안정적이진 않아서 호출부의 재시도 루프가 진짜 안전망.
// referenceImages: [{inline_data: {mime_type, data}}, ...] — 넘기면 프롬프트 텍스트 뒤에 이미지
// 파트로 이어 붙여서, 나노바나나가 "이 사람과 같은 얼굴로"처럼 레퍼런스 기반 생성/편집을 하게
// 한다(Vision 진단이 이미지를 보낼 때 쓰는 것과 같은 형태라 새 포맷을 만들 필요 없음).
async function generateImageWithGeminiNative({ prompt, geminiKey, temperature, models, referenceImages }) {
  const modelChain = models && models.length ? models : ['gemini-3.1-flash-lite-image', 'gemini-3.1-flash-image', 'gemini-3-pro-image'];
  let lastError = null;

  for (const model of modelChain) {
    try {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 55000);
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }, ...(referenceImages || [])] }],
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
export async function persistGeneratedImage({ engineLabel, dataUrl, variantKey }) {
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

// 나노바나나 프롬프트를 순수하게 문자열로만 조립한다(API 호출 없음). `generateAiThumbnailImage`가
// 실제 생성에 쓰는 것과 정확히 같은 프롬프트를 만들어야, 사용자가 "프롬프트만 복사해서 제미나이
// 웹(유료 구독)에 직접 붙여넣는" 경로와 API 자동 생성 경로가 서로 다른 결과를 내지 않는다 —
// 그래서 별도로 다시 쓰지 않고 두 경로가 이 함수 하나를 공유한다.
export function buildThumbnailPrompt({ topic = '', variantKey = 'A', title = '', thumbnailHeadline = '', format = 'LONGFORM', hasPersonReference = false, visualConcept = '', closeUp = false }) {
  const isShorts = format === 'SHORTS' || String(format).toLowerCase().includes('short');
  const vKey = String(variantKey || 'A').toUpperCase();
  const rawText = (title || topic || '10초 영어 읽기 테스트').trim();

  // Variant-Specific Layout Profiles — 제목(title)이 없을 때만 쓰는 폴백.
  // 2026-09-01: 예전엔 이 값들이 사실상 항상 쓰였다 — "텍스트 적용"으로 시안에 title을 넣어도
  // 실제 생성 프롬프트의 헤드라인은 이 하드코딩된 문구 그대로였다(사용자 피드백으로 발견).
  // 이제 title이 있으면 그걸 그대로 헤드라인으로 쓰고, 없을 때만 이 프로필로 폴백한다.
  // card1~3(보조 예시 단어)은 title이 그 세부 단어까지 담고 있지 않으므로 계속 시안별 고정값을
  // 쓴다. badge·하단 캡션은 2026-09-13 폐지(사용자 지적: 헤드라인은 설득이 아니라 스크롤을
  // 멈추는 '시각적 스턴건' 역할만 해야 하는데, 뱃지·캡션이 계속 남아 있으면 그 압축 효과를
  // 흐린다) — badgeText/subCalloutFallback 관련 값은 더 이상 만들지 않는다.
  let hookFallback1 = '';
  let hookFallback2 = '';
  let card1 = '';
  let card2 = '';
  let card3 = '';

  if (vKey === 'A') {
    // VARIANT A: 3-Row Phonics Quiz / Self-Diagnosis (Yellow Gold Theme)
    hookFallback1 = '10초 영어 읽기';
    hookFallback2 = '소리 테스트!';
    card1 = 'CAT';
    card2 = 'BOOK';
    card3 = 'ANT';
  } else if (vKey === 'B') {
    // VARIANT B: Phonetic Rule & Shocking Secret (Cyber Cyan Theme)
    hookFallback1 = '한국인 90% 틀리는';
    hookFallback2 = '슈와(ə) 소리 법칙!';
    card1 = 'BANANA';
    card2 = 'ABOUT';
    card3 = 'PENCIL';
  } else {
    // VARIANT C: Loss Aversion & Key Secret Contrast (Magenta / Red Theme)
    hookFallback1 = '단어가 안 들리는 이유?';
    hookFallback2 = '이 소리 모르면 평생 고생!';
    card1 = 'WANT vs WON\'T';
    card2 = '모음 탈락 법칙';
    card3 = '30초 귀 뚫림 족보';
  }

  // 헤드라인은 title이 아니라 thumbnailHeadline(썸네일 전용, 3~4단어로 압축된 시각적 스턴건
  // 문구)을 쓴다 — title은 검색용 완전한 문장이라 그대로 이미지에 박으면 "제목을 썸네일에
  // 복사하는" 흔한 실수가 된다(2026-09-11 확정, 웹 검색으로 재검증). thumbnailHeadline이 없는
  // 예전 저장값(하위 호환)만 title로 폴백하고, 그마저도 없으면 시안별 고정 2줄 문구로 폴백한다.
  const headlineLines = thumbnailHeadline.trim()
    ? [thumbnailHeadline.trim()]
    : (title.trim() ? [title.trim()] : [hookFallback1, hookFallback2].filter(Boolean));

  // card1/2/3(하단 예시 단어 3개)은 시안별 고정 데모 값(CAT/BOOK/ANT 등)이라 실제 소재와 무관하다.
  // headline과 달리 이 값들은 실제 title이 있어도 대체할 방법이 없어서, 지금까지 A/B/C 어떤
  // 소재든 이 고정 단어 3개가 그대로 박혀 나왔다(2026-09-02, 실제 생성 3장으로 확인). title이
  // 실제로 채워졌으면(=진짜 소재가 정해졌으면) 이 무관한 예시 대신 카드 자체를 생략한다 — 빈
  // 워크벤치 상태(title 없음, 데모 폴백을 쓰는 중)일 때만 보여준다.
  const useCards = !title.trim();

  // 2026-09-29: 위의 "인물 정체성 화살표 태그(hero identity callout)"와 "AI가 매번 새 장면/소품을
  // 지어내는 배경" 두 아이디어는 전부 폐기한다. EP18~20에서 실제로 제작·CTR 테스트까지 거쳐 채택된
  // 최종 썸네일(`videos/ep19-ate-suffix/thumbnail-c.jpg`, `thumbnail-close-up.jpg` 등)을 직접
  // 픽셀로 열어 대조해보니 이 두 요소가 전혀 없었다 — 화살표 태그도, 지어낸 배경/소품 장면도
  // 없이 (1) 무지 크림색 배경, (2) 앵커 단어(예: "-ate")를 흰 글자+검은 테두리로 한 줄,
  // (3) 그 아래 나머지 문구 전체를 담은 골드색 알약(pill) 캡슐 한 개, (4) 실사 인물이 그 옆에서
  // 표정으로 반응하는 구도, 이 4개뿐이었다. 대시보드 자동 생성 코드가 실제 채널 표준 디자인과
  // 계속 어긋나 있었던 것(사용자가 2026-09-29 직접 지적) — 이제 이 4요소로 통일한다.
  //
  // 텍스트도 하나의 headline 안에서 "1~2단어만 칩 배경"이 아니라, 완전히 분리된 두 줄이다:
  // 위쪽 줄(anchor)은 이 소재의 핵심 단어/패턴(예: "-ate", "World", "KN-")만 담아 배경 없이
  // 흰 글자+검은 테두리로 크게, 아래쪽 줄(pill)은 thumbnailHeadline 문구 전체를 골드 알약
  // 안에 검은 글자로 담는다. 어느 게 anchor인지는 AI가 topic/title에서 직접 골라야 한다 —
  // 코드로 문자열을 잘라내는 건 언어적 판단(어떤 단어가 이 영상의 핵심 패턴인지)이 필요해서
  // 규칙 기반으로는 못 한다.
  const anchorSource = (title || topic || '').trim();

  const prompt = `A high-CTR, photorealistic YouTube thumbnail for Korean English-pronunciation education channel '이해하면 쉬운영어' (target: 3060 adult learners), ${isShorts ? '9:16 vertical shorts cover' : '16:9 horizontal'}, on the topic "${rawText}". This must match the channel's established, CTR-tested house style exactly — do not invent a different look.

=== TEXT CONTENT (render each quoted string below exactly character-for-character — do not substitute, merge, reorder, or invent a single character) ===
- Anchor line — a very short (1-3 word) anchor for this topic's specific pattern/word/rule, inferred from this context: "${anchorSource || rawText}". Pick the single most recognizable word, suffix, or short rule name this whole video is about (e.g., a specific English suffix like "-ate", a specific tricky word like "World", or a short pattern label like "KN-") — not a sentence, not the full title. Render it standalone, massive, on its own line.
- Pill phrase — a short reaction/hook phrase (3-6 words), rendered as the ENTIRE content of a single solid-colored rounded pill/capsule shape directly below the anchor line: ${headlineLines.map((l) => `"${l}"`).join(' / ')}
${useCards ? `- Secondary info cards near the bottom, three short items: "${card1}", "${card2}", "${card3}"\n` : ''}Do not render any text other than the strings quoted above — no badge, no bottom caption, no channel name, no logo, no watermark, no UI mockup text, no extra labels, no duplicated copies of any string, and no hero identity tags or arrow callouts of any kind.

=== BACKGROUND (fixed — do not invent a scene, do not add props) ===
Use a plain, evenly and softly lit single warm cream/beige backdrop (like a clean seamless photo-studio background) across the ENTIRE frame — this is the channel's actual established look, confirmed across its real published thumbnails. Do NOT invent a scene, a prop, a classroom object, a phone mockup, a chalkboard, or any set dressing — the only things in the frame are the plain backdrop, the two text elements above, and the hero. All visual attention must stay on the anchor word, the pill phrase, and the hero's genuine expression.
${visualConcept.trim() ? `\nConcept direction for this specific variant (apply only through the hero's expression/gesture or minor color choices — never by adding a background scene, prop, or extra text): ${visualConcept.trim()}\n` : ''}
Hero: ${
    hasPersonReference
      ? `the exact same person's face shown in the attached reference image — same facial identity and features, clearly recognizable as this person. Freely vary their hairstyle and facial hair from what is shown in the reference image — only the face must match. Dress them in the EXACT SAME outfit shown in the reference image — the same navy baseball cap and black t-shirt, each printed with the same small colorful vertical-bar sound-wave icon exactly as shown (icon only, no text on the cap or shirt) — this is the channel's fixed signature uniform, do not substitute a different outfit, different colors, or a different logo`
      : 'a photorealistic Korean adult (20s-40s)'
  }, photographed naturally against the plain backdrop (no cutout sticker border, no torn-paper silhouette, no vignette) — a normal photographic crop that can bleed off the frame edge, with a genuine, expressive reaction/gesture that fits the pill phrase's emotional register (realization, playful warning, quiet confidence, amusement — whatever actually fits this specific phrase), eyes and gaze directed toward the text rather than straight at the camera, as if they just reacted to reading it.

Composition: this is a ${isShorts ? '9:16 vertical' : '16:9 horizontal'} frame. ${closeUp ? `This is the dedicated MOBILE CLOSE-UP variant (thumbnail-close-up.jpg) — camera distance and hero size are NOT free choices here: render an extreme close-up where the hero's face and shoulders fill at least 40-50% of the frame width, positioned to one side (left or right, whichever leaves the anchor/pill text more room), with their expression (eyes and mouth) exaggerated and instantly readable even when this image is shrunk to ~100px wide in a mobile feed. Use a tight portrait lens look (shallow depth of field, face in sharp focus).` : `The hero sits to one side (left or right, whichever fits better) at a medium-to-close, waist-up-or-tighter distance — this channel's real thumbnails keep the hero large and clearly readable, not a small figure in a big scene. Pick a natural portrait lens look (shallow depth of field).`} The anchor line and pill phrase stack vertically on the open side, each sized to fill the available width. Treat the hero photo and the text block as separate, non-intersecting regions with a visible gap of empty background between them — never let the hero's head, hair, or shoulders cross in front of or behind any letter. Before finalizing, check every line of text and confirm no part of it is covered, thinned, or interrupted by the hero photo; if it would be, shrink or move the hero instead of the text.

Typography: use a clean, bold, heavy sans-serif font throughout for maximum legibility, rendered as sharp, stylized, infographic-quality text (not painterly or hand-lettered), with a heavy black outline. The anchor line is FLAT plain white lettering with the black outline ONLY — nothing else is added to it. The pill phrase is different: render it entirely inside one solid warm-yellow (#F5C518) rounded capsule/pill shape (black or dark navy bold lettering on the yellow pill, not yellow lettering, with a black outline around the pill itself) — the whole phrase sits inside the pill, not just 1-2 words of it.

NEGATIVE for the anchor line (2026-09-29 — a real generation via this exact prompt came back with a glowing neon sign treatment and circuit-board lines behind the letters, which is not this channel's style at all): do NOT put the anchor line inside a box, panel, or chip of any color. Do NOT add a glow, neon light, drop shadow, backlight, or halo around the letters. Do NOT add circuit-board lines, tech/HUD patterns, sparkles, or any decorative background motif behind or around the letters. Do NOT render the letters with a 3D, embossed, chrome, or metallic look, or a gradient fill. The anchor line must look exactly as flat and plain as text printed directly on paper — white fill, black outline, nothing behind it but the plain cream backdrop.

CRITICAL TEXT ACCURACY: every string in the TEXT CONTENT section must be spelled out exactly, letter by letter, with correct Korean/English characters — do not invent, substitute, or garble any character. If unsure how to render a word clearly, make it larger and simpler rather than risk misspelling it.

Style: ultra-realistic, sharp focus, high detail — the human subject must look like a real photograph, not an illustration or 3D render. No watermark, no fake phone or browser UI, no stock-photo text, no crude cartoon doodles.`;

  const expectedTexts = [...headlineLines, ...(useCards ? [card1, card2, card3] : [])].filter(Boolean);
  return { prompt, expectedTexts, variantKey: vKey, isShorts };
}

export async function generateAiThumbnailImage({ prompt, topic = '', variantKey = 'A', title = '', thumbnailHeadline = '', format = 'LONGFORM', engine = 'flux', geminiKey, visualConcept = '', closeUp = false }) {
  const isShorts = format === 'SHORTS' || String(format).toLowerCase().includes('short');
  const vKey = String(variantKey || 'A').toUpperCase();

  const W = isShorts ? 720 : 1280;
  const H = isShorts ? 1280 : 720;

  // 사용자가 직접 쓴 프롬프트인지 판별 — topic/title로 들어오는 짧은 문자열과 구분하기 위한
  // 임계값. 이 값 이상이면 아래 하드코딩 템플릿을 완전히 건너뛰고 그 프롬프트를 그대로 쓴다.
  const customPrompt = String(prompt || '').trim();
  const useCustomPrompt = customPrompt.length > 60;

  const rawText = (title || topic || prompt || '10초 영어 읽기 테스트').trim();

  // 채널 정체성으로 쓸 기준 얼굴 — 있으면 매 생성에 레퍼런스로 첨부해 "같은 사람"이 나오게 한다.
  // 없으면(아직 안 정했으면) 조용히 건너뛰고 기존처럼 매번 새 얼굴을 생성한다(2026-09-01 추가).
  const personReference = await resolveImageToInlineData(PRESENTER_REFERENCE_PATH);

  // 1. PRIMARY PATH: 진짜 이미지 생성 모델(나노바나나). 커스텀 프롬프트면 그대로, 아니면 변형별
  //    무드를 자연어 브리프로 번역 — 실제 이미지 모델은 SVG 마크업 작성법을 몰라도 되고 알 필요도 없다.
  if (geminiKey && geminiKey !== 'YOUR_GEMINI_API_KEY_HERE') {
    const built = useCustomPrompt ? null : buildThumbnailPrompt({ topic, variantKey: vKey, title, thumbnailHeadline, format, hasPersonReference: !!personReference, visualConcept, closeUp });
    const creativeDirection = useCustomPrompt ? customPrompt : built.prompt;
    // 텍스트 정확도는 diffusion 특성상 매번 다르게 나온다(같은 프롬프트로도 성공/실패가 갈림,
    // 2026-09-01 실측). 그래서 프롬프트 튜닝만으론 신뢰 못 하고, 생성 후 Gemini Vision으로
    // 실제 렌더링된 텍스트를 읽어 의도한 문구와 대조 → 틀리면 재생성.
    // 커스텀 프롬프트는 어떤 텍스트가 "정답"인지 파싱할 수 없으므로 검증을 건너뛴다.
    const expectedTexts = useCustomPrompt ? [] : built.expectedTexts;
    // 2026-09-01: generateImageWithGeminiNative는 체인의 "첫 성공"에서 멈추므로, 매 시도가 같은
    // 기본 순서(flash 먼저)로 호출되면 flash가 API 에러 없이 항상 성공해 pro가 전혀 시도되지
    // 않는다(재시도가 사실상 가짜였던 버그). 텍스트가 있는 생성은 시도마다 다른 상위 모델을
    // 명시적으로 1순위로 지정해 나노바나나 2 → 프로 → 프로 프리뷰를 실제로 한 번씩 다 써본다.
    // (ListModels로 확인한 실제 모델 ID — displayName: "Nano Banana 2"/"Nano Banana Pro")
    const textCandidateModels = ['gemini-3.1-flash-image', 'gemini-3-pro-image', 'gemini-3-pro-image-preview'];
    const maxAttempts = expectedTexts.length ? textCandidateModels.length : 1;
    let lastResult = null;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const primaryModel = expectedTexts.length ? textCandidateModels[attempt - 1] : undefined;
      try {
        const result = await generateImageWithGeminiNative({
          prompt: creativeDirection,
          geminiKey,
          temperature: 0.4,
          // 안전망은 나노바나나 2 Lite로 — 1세대(gemini-2.5-flash-image)는 Google이 전환을
          // 권고하는 레거시 모델이라 더 이상 후보에 넣지 않는다.
          models: primaryModel ? [primaryModel, 'gemini-3.1-flash-lite-image'] : undefined,
          referenceImages: personReference ? [personReference] : undefined,
        });
        lastResult = result;
        if (!expectedTexts.length) break;
        const verify = await verifyThumbnailText({ base64: result.base64, mimeType: result.mimeType, expectedTexts, geminiKey });
        if (verify.allCorrect) break;
        console.error(`나노바나나 시도 ${attempt}/${maxAttempts} (${primaryModel}): 텍스트 깨짐 감지(${verify.brokenTexts.join(', ')}) — 다음 모델로 재생성`);
      } catch (err) {
        console.error(`나노바나나 시도 ${attempt}/${maxAttempts} (${primaryModel}) 실패:`, err.message);
      }
    }

    if (lastResult) {
      return await persistGeneratedImage({
        engineLabel: useCustomPrompt ? `Nano Banana Custom Prompt (${lastResult.model}, Variant ${vKey})` : `Nano Banana Studio (${lastResult.model}, Variant ${vKey}${closeUp ? ', Close-up' : ''})`,
        dataUrl: `data:${lastResult.mimeType};base64,${lastResult.base64}`,
        variantKey: vKey,
      });
    }
    console.error('Nano Banana native image generation failed after all attempts, falling back to plain-text renderer.');
  }

  // 2. FALLBACK: 나노바나나가 실패했거나(API 키 없음 포함) 완전히 실패했을 때의 최후 보루.
  // API 호출이 전혀 없는 순수 텍스트 SVG라 항상 성공한다 — 2026-09-01, 나노바나나 2로 텍스트
  // 정확도가 검증된 뒤 중간 단계였던 레거시 AI-SVG-작성기(gemini-3.6-flash가 SVG 마크업을
  // 직접 쓰던 방식)는 제거했다. 이제 실패해도 조용히 하위 품질로 넘어가지 않고 이 보루 하나로
  // 바로 떨어지므로, 실패 자체는 위 console.error로 알 수 있다.
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
