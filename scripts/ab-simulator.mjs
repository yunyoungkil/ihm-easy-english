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

'aiTitleSuggestions' 5개는 반드시 아래 규칙을 지킬 것:
1. **정답/핵심 메커니즘 노출 금지** — 특히 '💥 반전형'은 "상식이 틀렸다는 사실"까지만 드러내고 "왜/어떻게 그런지"는 절대 밝히지 말 것.
   제목에서 정답을 다 알려주면 영상을 볼 이유가 없다. (예: "끝소리 T는 소리 내지 마세요, 목소리 빼고 바람만 뱉는 원리"처럼
   메커니즘 자체를 설명하면 안 됨 — "끝소리 T, 원어민은 절대 이렇게 안 읽습니다"처럼 궁금증만 남길 것.)
2. **5개 전부 [영상 기획 주제]를 구체적으로 반영할 것** — 특히 '🤝 공감형'이 브랜드 톤앤매너 문장을 그대로 재사용하는 슬로건이
   되지 않도록, 이 소재 고유의 키워드(단어/상황)를 반드시 포함할 것.
3. **'title'·'thumbnailHeadline'·'thumbnailCopy'는 핵심 키워드를 공유해도 된다 — 진짜 원칙은
   "같은 정보 금지"가 아니라 "표현 형식(register)을 다르게" 하는 것이다**(2026-09-11, 실제
   상위 채널 12건 실측으로 재검증 — 처음엔 "절대 반복 금지"로 너무 엄격하게 잡았다가, 실제
   경쟁 채널 썸네일/제목 쌍을 직접 대조해보니 핵심 키워드·숫자를 그대로 공유하는 게 오히려
   흔하고 효과적인 패턴이었다. 예: 실측 사례 — 썸네일 "3개월간 '이것'만 하세요" ↔ 제목
   "영어회화는 '이것'이 핵심입니다! 3개월만 제발 이렇게 하세요" — "이것"·"3개월"을 그대로
   공유하면서 형식만 다름. 또 다른 사례: 썸네일 "Have been / 1분 30초만 보세요" ↔ 제목
   "...have been 1분30초 안에 이해 못하면 욕해도 됩니다" — 핵심 단어·시간이 동일).
   - **title = 서술/스토리 톤**: "~했더니 ~됐어요", "~한다면 꼭 보세요"처럼 맥락과 서사가 있는
     완전한 문장. 검색 키워드·숫자·맥락이 담긴다.
   - **thumbnailHeadline = 명령/단정 압축 톤**: 썸네일 이미지 안의 **가장 큰 텍스트**. title과
     같은 핵심 키워드를 써도 되지만, "~하세요/~만/~됨"처럼 짧고 강렬하게 압축한 명령형·단정형
     이어야 한다 — title을 그대로 줄인 것처럼 보이면 안 되고, 같은 핵심을 다른 어투로 찍어야
     한다.
   - **유일하게 피해야 할 것은 이 영상과 무관한 범용 문구다**(2026-09-11, 사용자 지적: "제목과
     같으면 안 되지만 제목의 보조 역할이나 제목으로 연관돼서 클릭할 수 있는 걸 추가해야지,
     지금 문구는 이득만 있는거잖아" — "10초면 충분"처럼 이 소재가 영어 발음인지 다이어트인지
     전혀 알 수 없는 완전 교체 가능한 문구가 문제였지, 키워드를 title과 공유하는 것 자체는
     문제가 아니었다). headline만 따로 떼어놔도 "아, 이 영상 얘기구나" 싶은 단서가 남아야 한다.
   - **thumbnailCopy = 하단 보조 캡션**: 시청 후 보상/확인 느낌의 짧은 문구(15자 내외), headline이
     만든 긴장을 풀어주는 역할. 이것도 이 소재와 무관한 범용 문구가 되면 안 된다.
   예: title="'-sion' 끝소리 규칙, 원어민들이 절대 글자 그대로 안 읽는 이유" →
   - ❌ 실패: "10초면 충분" (이 영상만의 단서가 전혀 없음, 아무 영상에나 붙여도 말이 됨)
   - ✅ 성공: "-sion 이제 그만 틀리세요" (title의 핵심 키워드 "-sion"을 그대로 공유하되,
     서술형 title과 다르게 명령형으로 압축 — 실제 상위 채널 패턴과 동일)
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
5. **headline·copy는 궁금증만 만들지 말고, "이 영상을 보면 정확히 뭘 할 수 있게 되는지"라는
   구체적 약속도 반드시 함께 적을 것**(2026-09-11, 사용자 지적: "썸네일부터 스토리텔링을 시작하는
   거다, 우리는 썸네일의 약속을 지킨다가 규칙에 있다" — knowledge/thumbnail-strategy.md의 "썸네일은
   제목과 함께 하나의 약속을 만든다" 원칙, VIDEO_WORKFLOW.md의 "대본은 제목·썸네일이 건 약속을
   실제로 지켜야 한다" 원칙과 직결된다). 이 채널이 실제로 써 온 좋은 예: EP9 헤드라인 "-CIAL → 셜"
   + 카피 "처음 보는 단어도 읽힌다"(약속: 읽는 능력이 생긴다), EP13 카피 "이제 단어가 아니라
   문장이 들립니다"(약속: 듣기 능력이 생긴다) — 전부 궁금증이 아니라 **시청 후 달라지는 구체적
   상태**를 명시한다. "-sion 왜 계속 틀릴까"처럼 질문만 던지는 문구는 궁금증은 만들어도 약속이
   없다 — 5개 중 최소 2개는 headline이나 copy 어느 한쪽에 이런 "약속·결과 확정" 문장을 담을 것
   (아래 심리 공식 ⑥ 참고).
6. **'thumbnailHeadline' 길이는 글자 수를 억지로 맞추지 말 것**(2026-09-11 정정 — 이전엔 "한글
   3~8자씩 최대 2줄"로 너무 엄격하게 제한해서, 위 5번의 "약속 문장"을 억지로 쪼개다 보니 뜻이
   끊기고 부자연스러운 문구만 나왔다. 사용자 지적: "글자 수는 너무 제한을 두지 말고"). 모바일에서
   한눈에 읽히는 짧고 굵은 문장이면 충분하고, 약속을 온전히 담기 위해 한 줄이 길어져도 된다 —
   조사('을/를/이/가' 등)를 과감히 생략해 리듬을 압축하는 감각은 유지하되, 글자 수를 맞추려고
   의미를 끊거나 부자연스럽게 쪼개지 않는다.
7. **'thumbnailHeadline'은 아래 심리 공식 중 이 소재에 맞는 것을 골라 5개 전체에 다양하게 배분할 것**
   (2026-09-11, 웹 검색 근거 — 한국어 유튜브 채널 실전 카피 공식). **5개 중 최소 1개는 ①, 최소 1개는
   ③, 최소 2개는 ⑥을 반드시 포함할 것**. 아래 예시는 전부 "-sion 끝소리 규칙" 소재를 가정한 것이다 —
   **패턴만 참고하고 이 예시 문구를 그대로 베끼지 말 것**. 패턴을 이번 소재(위 [영상 기획 주제])의
   실제 단어/상황에 맞게 다시 채워서, headline만 봐도 이 영상 얘기라는 게 드러나야 한다(규칙 3·4
   참고 — 범용 문구·주제 은폐 금지):
   ① **손실회피/경고형**: "-sion 끝소리 계속 틀리는 중" — 소재 키워드("-sion")를 직접 지목해 경각심.
   ② **호기심 유발형**: "-sion, 이제 안 헷갈림" — 소재 키워드는 남기고 결말만 숨김.
   ③ **초효율성형**: "-sion 규칙 하나로 다 풀림" — 소재 키워드("-sion")를 명시하고 효율만 궁금증으로.
   ④ **타깃 저격형**: "긴 단어 무서운 사람 여기" — 소재가 다루는 대상(긴 단어)을 직접 지목.
   ⑤ **상식파괴/도발형**: "-sion 외우지 마세요" — 소재 키워드 + 반전을 한 문장에.
   ⑥ **약속/결과 확정형**(2026-09-11 신설): "-sion 끝소리, 오늘부로 다시는 안 틀립니다" — 궁금증이
   아니라 시청 후 달라질 구체적 상태를 단정문으로 확정한다. 질문형(②)과 짝을 이뤄도 좋다(headline이
   질문을 던지면 copy가 이 약속으로 답하는 식).
   ⚠️ **'권위·증명형'("전문가가 말하는", "요즘 난리 난")은 쓰지 말 것** — 우리 채널엔 그런 근거가 실제로
   없는데 있는 척 꾸미는 것은 "가식 없는 솔직 담백" 페르소나 위반이다. 모든 문구는 실제 발음/연음 원리에
   근거해야 하며, 근거 없는 가짜 통계("99%가 모르는")나 과장된 위협 문구는 ①에서도 절대 쓰지 않는다.
8. **제목 앞부분(한글 기준 약 30자 이내)에 핵심 검색 키워드를 배치할 것** — 이 소재의 핵심 단어 철자·규칙 이름
   (예: "-sion", "연음", "GONNA")이 모바일에서 제목이 잘려도 이미 보이는 위치에 오게 한다. 문장 맨 끝에만
   키워드를 두지 말 것.

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
      "thumbnailHeadline": "썸네일 이미지 안의 가장 큰 텍스트 — 모바일에서 한눈에 읽히는 짧고 굵은 문장이면 충분, 글자 수를 억지로 맞추려 쪼개지 말 것(조사는 과감히 생략). title과 핵심 키워드를 공유해도 되지만 명령/단정형으로 압축할 것(title은 서술형 문장, headline은 '~하세요/~만/~됨' 같은 압축형). 반드시 이 소재의 구체적 영역 키워드를 하나는 그대로 노출해 '무슨 얘기인지'는 명시할 것 — 무관한 범용 문구('10초면 끝')도, 주제 자체가 안 보이는 문구('그 규칙 하나로 끝')도 둘 다 실패. 궁금증만 만들지 말고 '시청 후 뭘 할 수 있게 되는지'라는 구체적 약속도 담을 것(예: '-sion 끝소리, 오늘부로 다시는 안 틀립니다')",
      "thumbnailCopy": "이 title과 짝을 이루는 시청 후 보상 카피 — headline이 궁금증(질문)이면 copy는 그 약속(결과)으로 답하는 관계가 이상적. title과 내용이 겹치지 않게, 글자 수보다 '이 영상을 보면 정확히 뭘 할 수 있게 되는지'가 명확히 전달되는 걸 우선할 것",
      "suggestedBadge": "썸네일 상단 포인트 뱃지 문구, 이모지 1개+한글 2~5단어, 이 소재의 단어/규칙이 드러나게 (예: '⚡ 소리 비밀 반전', '🔑 -sion 완전정복') — 이 title/thumbnailCopy 조합 고유의 문구로, 5개가 서로 겹치지 않게 지을 것",
      "designConcept": "이 title/thumbnailCopy 조합에 맞는 비주얼 컨셉 한 줄",
      "midjourneyPrompt": "${isShorts ? 'Clean vertical visual artwork for English pronunciation education, dark cyber-hud deep navy ambient background, minimalist graphic layout, copy space for Korean text, 4k ultra-high resolution, 9:16 --ar 9:16 --no text font letters words watermark phone mockup device frame icons UI buttons --v 6.0' : 'Clean horizontal visual artwork for English pronunciation education, dark cyber-hud deep navy ambient background, minimalist graphic layout, copy space for Korean text, 4k resolution, 16:9 --ar 16:9 --no text font letters words watermark phone mockup device frame icons UI buttons --v 6.0'}(이 title 고유의 비주얼 요소로 구체화해서 다시 쓸 것 — 5개 프롬프트가 서로 달라야 함)"
    },
    {
      "type": "❓ 질문형 (클릭 유도)",
      "title": "...",
      "thumbnailHeadline": "...",
      "thumbnailCopy": "...",
      "suggestedBadge": "...",
      "designConcept": "...",
      "midjourneyPrompt": "..."
    },
    {
      "type": "💥 반전형 (상식 파괴)",
      "title": "...",
      "thumbnailHeadline": "...",
      "thumbnailCopy": "...",
      "suggestedBadge": "...",
      "designConcept": "...",
      "midjourneyPrompt": "..."
    },
    {
      "type": "📐 원리형 (쉬운 해결책)",
      "title": "...",
      "thumbnailHeadline": "...",
      "thumbnailCopy": "...",
      "suggestedBadge": "...",
      "designConcept": "...",
      "midjourneyPrompt": "..."
    },
    {
      "type": "🤝 공감형 (타겟 시청자 맞춤)",
      "title": "...",
      "thumbnailHeadline": "...",
      "thumbnailCopy": "...",
      "suggestedBadge": "...",
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
export function buildThumbnailPrompt({ topic = '', variantKey = 'A', title = '', thumbnailHeadline = '', thumbnailCopy = '', badge = '', format = 'LONGFORM', hasPersonReference = false, visualConcept = '' }) {
  const isShorts = format === 'SHORTS' || String(format).toLowerCase().includes('short');
  const vKey = String(variantKey || 'A').toUpperCase();
  const rawText = (title || topic || '10초 영어 읽기 테스트').trim();

  // Variant-Specific Layout Profiles — 제목(title)/카피(thumbnailCopy)가 없을 때만 쓰는 폴백.
  // 2026-09-01: 예전엔 이 값들이 사실상 항상 쓰였다 — "텍스트 적용"으로 시안에 title을 넣어도
  // 실제 생성 프롬프트의 헤드라인은 이 하드코딩된 문구 그대로였다(사용자 피드백으로 발견).
  // 이제 title/thumbnailCopy가 있으면 그걸 그대로 헤드라인/캡션으로 쓰고, 없을 때만 이 프로필로
  // 폴백한다. card1~3(보조 예시 단어)은 title이 그 세부 단어까지 담고 있지 않으므로 계속
  // 시안별 고정값을 쓴다.
  let hookFallback1 = '';
  let hookFallback2 = '';
  let card1 = '';
  let card2 = '';
  let card3 = '';
  let badgeText = '';
  let subCalloutFallback = '';

  if (vKey === 'A') {
    // VARIANT A: 3-Row Phonics Quiz / Self-Diagnosis (Yellow Gold Theme)
    hookFallback1 = '10초 영어 읽기';
    hookFallback2 = '소리 테스트!';
    card1 = 'CAT';
    card2 = 'BOOK';
    card3 = 'ANT';
    badgeText = badge || '⏱️ 10초 완성';
    subCalloutFallback = '💡 3문제 다 맞히면 상위 1%';
  } else if (vKey === 'B') {
    // VARIANT B: Phonetic Rule & Shocking Secret (Cyber Cyan Theme)
    hookFallback1 = '한국인 90% 틀리는';
    hookFallback2 = '슈와(ə) 소리 법칙!';
    card1 = 'BANANA';
    card2 = 'ABOUT';
    card3 = 'PENCIL';
    badgeText = badge || '⚡ 소리 비밀 반전';
    subCalloutFallback = '💡 게으른 혀의 소리 지름길';
  } else {
    // VARIANT C: Loss Aversion & Key Secret Contrast (Magenta / Red Theme)
    hookFallback1 = '단어가 안 들리는 이유?';
    hookFallback2 = '이 소리 모르면 평생 고생!';
    card1 = 'WANT vs WON\'T';
    card2 = '모음 탈락 법칙';
    card3 = '30초 귀 뚫림 족보';
    badgeText = badge || '🔥 필수 핵심 족보';
    subCalloutFallback = '💡 원어민 귀가 뚫리는 공식';
  }

  // 헤드라인은 title이 아니라 thumbnailHeadline(썸네일 전용 3~8자×2줄 감정 카피)을 쓴다 — title은
  // 검색용 완전한 문장이라 그대로 이미지에 박으면 "제목을 썸네일에 복사하는" 흔한 실수가 된다
  // (2026-09-11 확정, 웹 검색으로 재검증). thumbnailHeadline이 없는 예전 저장값(하위 호환)만
  // title로 폴백하고, 그마저도 없으면 시안별 고정 2줄 문구로 폴백한다.
  const headlineLines = thumbnailHeadline.trim()
    ? [thumbnailHeadline.trim()]
    : (title.trim() ? [title.trim()] : [hookFallback1, hookFallback2].filter(Boolean));
  const subCallout = thumbnailCopy.trim()
    ? (thumbnailCopy.trim().startsWith('💡') ? thumbnailCopy.trim() : '💡 ' + thumbnailCopy.trim())
    : subCalloutFallback;

  // card1/2/3(하단 예시 단어 3개)은 시안별 고정 데모 값(CAT/BOOK/ANT 등)이라 실제 소재와 무관하다.
  // headline과 달리 이 값들은 실제 title이 있어도 대체할 방법이 없어서, 지금까지 A/B/C 어떤
  // 소재든 이 고정 단어 3개가 그대로 박혀 나왔다(2026-09-02, 실제 생성 3장으로 확인). title이
  // 실제로 채워졌으면(=진짜 소재가 정해졌으면) 이 무관한 예시 대신 카드 자체를 생략한다 — 빈
  // 워크벤치 상태(title 없음, 데모 폴백을 쓰는 중)일 때만 보여준다.
  const useCards = !title.trim();

  // 인물을 "항상 둥근 박스+청록 테두리"로 고정하면 매 생성이 똑같아 보인다는 문제가 있었음 —
  // 이 채널의 "고정 템플릿 지양" 원칙과 어긋남. 매 호출마다 구도 하나를 무작위로 골라서
  // variant/에피소드와 무관하게 실제로 다양해지게 한다.
  // 2026-09-02: 카드 프레임 2종(둥근 청록 테두리·각진 흰 테두리)은 완전히 제거 — 하단 정보 카드
  // (`useCards`)와 시각적으로 겹쳐 "카드가 너무 많아 보이는" 문제, 그리고 사용자가 실제 생성
  // 이미지에서 "얼굴이 네모 카드에 갇힌 느낌"을 반복적으로 지적해서 결정. 남은 두 방식(EP9/EP10
  // 에서 실제로 쓴 "찢어진 종이 컷아웃" 기법 포함, CLAUDE.md 기록)만 랜덤으로 고른다.
  const heroFramingOptions = [
    'bleeding directly to the frame edge with a soft dark vignette fading into the background, no visible border or frame',
    'cut out along an irregular torn-paper silhouette following the person\'s head and shoulders, with a slightly rough paper-fiber edge texture (not a smooth sticker outline)',
  ];
  const heroFraming = heroFramingOptions[Math.floor(Math.random() * heroFramingOptions.length)];

  // "인물 위치는 자유롭게 판단"이라고만 지시했더니 실제로는 거의 항상 오른쪽으로 수렴했다
  // (2026-09-02, 사용자가 여러 장을 보고 지적 — "자유 판단"은 모델이 제일 흔한 관습적 기본값
  // 하나로 회귀하게 만들 뿐, 강제하지 않으면 실제 다양성이 안 나온다는 걸 확인). heroFraming처럼
  // 위치·샷 거리도 우리 코드가 미리 랜덤으로 골라 프롬프트에 못박는다 — "선택하라"가 아니라
  // "이렇게 배치하라"로 바꿔야 매번 실제로 달라진다.
  const heroPositionOptions = [
    'positioned on the right side of the frame, with all text content arranged to its left',
    'positioned on the left side of the frame, with all text content arranged to its right',
    'positioned centered in the upper half of the frame, with the badge and headline arranged below it',
    'positioned in the lower third of the frame, with the badge and headline arranged above it',
  ];
  const heroPosition = heroPositionOptions[Math.floor(Math.random() * heroPositionOptions.length)];
  const heroDistanceOptions = [
    'a tight close-up cropped just above the shoulders',
    'a medium shot showing head, shoulders, and some of the chest',
    'a waist-up shot showing more of the body and outfit',
  ];
  const heroDistance = heroDistanceOptions[Math.floor(Math.random() * heroDistanceOptions.length)];

  const prompt = `A high-CTR YouTube thumbnail for Korean English-pronunciation education channel '이해하면 쉬운영어' (target: 3060 adult learners), ${isShorts ? '9:16 vertical shorts cover' : '16:9 horizontal'}, on the topic "${rawText}".

=== TEXT CONTENT (render each quoted string below exactly character-for-character — do not substitute, merge, reorder, or invent a single character) ===
- Badge — ONE small glowing neon pill-shaped label, appears exactly once, centered on itself, single line: "${badgeText}"
- Headline — ${headlineLines.length === 2 ? 'two separate lines' : 'one line (wrap naturally across 2 lines only if it does not fit on one)'}, massive bold letters: ${headlineLines.map((l) => `"${l}"`).join(' / ')}
${useCards ? `- Secondary info cards near the bottom, three short items: "${card1}", "${card2}", "${card3}"\n` : ''}- Supporting caption near the bottom, single line: "${subCallout}"
Do not render any text other than the strings quoted above — no channel name, no logo, no watermark, no UI mockup text, no extra labels, no duplicated copies of any string.

=== VISUAL STYLE ===
Mood: ${
    vKey === 'A'
      ? '충격/뒤통수형 — 평생 맞다고 믿었던 콩글리시 발음을 찌르는 강렬한 시각적 충격'
      : vKey === 'B'
      ? '1초 소리 족보/비밀 공식형 — 직관적인 원리 발견의 짜릿함'
      : '원어민 리얼 뉘앙스 & 대조형 — 상황별 실수와 진짜 정답의 극적 대비'
  }.

${visualConcept.trim() ? `Concept direction for this specific variant (work this into the scene — extra graphic elements, color accents, iconography, framing choices — without breaking any rule stated elsewhere in this brief, especially the Hero identity and text-accuracy rules): ${visualConcept.trim()}\n\n` : ''}Background: dark cinematic studio (near-black navy #060911 to #0F172A) with a soft radial glow of cyan (#00F0FF) and magenta (#FF0077) light emanating from the center.

Hero: ${
    hasPersonReference
      ? `the exact same person's face shown in the attached reference image — same facial identity and features, clearly recognizable as this person. Freely vary their hairstyle and facial hair from what is shown in the reference image — only the face must match. Dress them in the EXACT SAME outfit shown in the reference image — the same navy baseball cap and black t-shirt, each printed with the same small colorful vertical-bar sound-wave icon exactly as shown (icon only, no text on the cap or shirt) — this is the channel's fixed signature uniform, do not substitute a different outfit, different colors, or a different logo`
      : 'a photorealistic Korean adult (20s-40s)'
  }, with a genuine, expressive reaction matching the mood above, their eyes and gaze directed toward the headline text rather than straight at the camera — as if they just reacted to reading it, softly rim-lit in cyan, ${heroFraming}.

Composition: this is a ${isShorts ? '9:16 vertical' : '16:9 horizontal'} frame. Place the hero ${heroPosition}, shot as ${heroDistance}. Arrange the badge, headline${useCards ? ', cards' : ''}, and caption freely within the remaining space — pick whatever exact layout best fits THIS specific headline length${useCards ? ' and card count' : ''}. Treat the hero photo and every text block as separate, non-intersecting regions with a visible gap of empty background between them, the way a clean infographic keeps its photo and its text in distinct zones — never let the hero's head, hair, or shoulders cross in front of or behind any letter. Before finalizing, check every line of text and confirm no part of it is covered, thinned, or interrupted by the hero photo; if it would be, shrink or move the hero instead of the text.

Typography: use a clean, bold, heavy sans-serif font throughout for maximum legibility, rendered as sharp, stylized, infographic-quality text (not painterly or hand-lettered), with a heavy black outline for contrast. Within the headline, pick the single most important 2-4 word phrase — the core hook of this specific topic — and render just those words with a solid warm-yellow (#F5C518) background chip directly behind the letters (dark navy or black lettering on the yellow chip, not yellow lettering); every other word in the headline stays plain white with the black outline. This highlighted-phrase chip must appear exactly once somewhere in the headline — never skip it and never apply it to more than one phrase.

CRITICAL TEXT ACCURACY: every string in the TEXT CONTENT section must be spelled out exactly, letter by letter, with correct Korean/English characters — do not invent, substitute, or garble any character. If unsure how to render a word clearly, make it larger and simpler rather than risk misspelling it.

Style: clean, professional, high-contrast studio photography blended with bold graphic design elements. No watermark, no fake phone or browser UI, no stock-photo text, no crude cartoon doodles — the human subject must look like a real photograph, not an illustration.`;

  const expectedTexts = [...headlineLines, badgeText, ...(useCards ? [card1, card2, card3] : []), subCallout].filter(Boolean);
  return { prompt, expectedTexts, variantKey: vKey, isShorts };
}

export async function generateAiThumbnailImage({ prompt, topic = '', variantKey = 'A', title = '', thumbnailHeadline = '', thumbnailCopy = '', badge = '', format = 'LONGFORM', engine = 'flux', geminiKey, visualConcept = '' }) {
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
    const built = useCustomPrompt ? null : buildThumbnailPrompt({ topic, variantKey: vKey, title, thumbnailHeadline, thumbnailCopy, badge, format, hasPersonReference: !!personReference, visualConcept });
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
        engineLabel: useCustomPrompt ? `Nano Banana Custom Prompt (${lastResult.model}, Variant ${vKey})` : `Nano Banana Studio (${lastResult.model}, Variant ${vKey})`,
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
