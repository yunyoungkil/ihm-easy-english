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
   - **어려운 음성학·문법 용어도 피할 것**(브랜드 페르소나 — 어려운 음성학 용어 절대 금지 —
     원칙을 headline에도 그대로 적용). "겹모음"처럼 정확하지만 딱딱한 용어 대신, 시청자가
     바로 이해하는 쉬운 말이나 구체적 예시 단어(예: "BOAT", "두 글자")로 표현할 것.
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
   - **손실회피/경고형**: "-sion 계속 틀리는 중"(4단어) — 소재 키워드("-sion")를 직접 지목해 경각심.
   - **호기심 유발형**: "-sion, 이제 안 헷갈림"(3단어) — 소재 키워드는 남기고 결말만 숨김.
   - **초효율성형**: "-sion 규칙 하나로 끝"(4단어) — 소재 키워드("-sion")를 명시하고 효율만 궁금증으로.
   - **타깃 저격형**: "긴 단어 겁나면 여기"(4단어) — 소재가 다루는 대상(긴 단어)을 직접 지목.
   - **상식파괴/도발형**: "-sion 외우지 마세요"(3단어) — 소재 키워드 + 반전을 한 문장에.
   - **약속/결과 확정형**: "-sion 다시는 안 틀림"(4단어) — 궁금증이 아니라 시청 후 달라질
     구체적 상태를 단정문으로 확정한다.
   **유일하게 강제하는 건 "5개가 서로 다른 접근법이어야 한다"는 것뿐이다** — 5개 전부 같은
   접근법(예: 전부 손실회피형)으로 쏠리면 안 된다.
   ⚠️ **'권위·증명형'("전문가가 말하는", "요즘 난리 난")은 쓰지 말 것** — 우리 채널엔 그런 근거가 실제로
   없는데 있는 척 꾸미는 것은 "가식 없는 솔직 담백" 페르소나 위반이다. 모든 문구는 실제 발음/연음 원리에
   근거해야 하며, 근거 없는 가짜 통계("99%가 모르는")나 과장된 위협 문구는 손실회피형에서도 절대 쓰지 않는다.
8. **'title'은 모바일 3단 배치 구조로 쓸 것**(2026-09-13, 사용자 제공 외부 자료 근거 — 모바일
   유튜브 앱에서 실제로 안 잘리는/잘리는 글자 수 구간을 기준으로 만든 구조. 기존 "앞 30자 이내에
   키워드"라는 단순 규칙만으로는 부족했다 — 키워드가 앞에 있어도 그 안에서 뭘 먼저 던지고 뭘
   나중에 둘지가 고정돼 있으면 초반 타격감이 죽는다):
   - **1~15자(절대 영역 · Hook)**: 가장 호기심을 자극하거나 뼈를 때리는 핵심 정보를 무조건
     맨 앞에 배치. 모바일에서 절대 안 잘리고 가장 먼저 시선이 꽂히는 자리다.
   - **16~25자(정보 영역 · 조건/상황)**: 영상이 다루는 구체적 상황이나 진짜 주제를 설명.
   - **26자 이후(부가 영역 · 검색 키워드)**: 화면에서 "..."으로 잘려도 무방한 카테고리·기본
     검색 키워드.
   - **절대 영역에 정확히 뭘 놓을지는 소재 성격에 맞춰 자유롭게 판단할 것** — 5개 후보를 전부
     같은 패턴으로 찍어내지 말고, 아래 3가지 배치 유형 중 이 소재에 가장 잘 맞는 걸 후보마다
     판단해서 다양하게 배분한다(패턴만 참고하고 예시 문구를 그대로 베끼지 말 것):
     - **A. 해결책 전면 배치형**(핵심 정답 → 상황 → 카테고리): 예) "앞 모음만 소리납니다!
       모음 2개 겹칠 때 단어 읽는 법" — 결과 자체가 강력한 후킹일 때 적합. 단 규칙 1(정답/
       메커니즘 노출 금지)과 반드시 같이 지킬 것 — "무엇이 되는지"는 던져도 "왜 그런지"는
       여전히 숨긴다.
     - **B. 페인포인트 전면 배치형**(공감/경고 → 상황 → 카테고리): 예) "철자 무작정 외우지
       마세요, 모음 2개 겹칠 때 '이것'만 알면 끝" — 타겟이 겪는 구체적 고통을 정면에 배치.
     - **C. 호기심 전면 배치형**(질문/구체적 예시 → 상황·정보): 예) "Boat, Rain 왜 앞 모음만
       읽힐까? 단숨에 뚫리는 영어 모음 규칙" — 시청자가 이미 아는 구체적 단어·사례를 맨 앞에
       던져 "아는 건데 왜 이런지는 몰랐네" 인지 부조화를 자극.
9. **'title' 맨 끝에 "|"로 구분한 타겟 맞춤형 키워드를 붙일 것**(2026-09-13, 2026-09-15 채널명
   옵션 폐지) — 위 8번 구조의 "부가 영역"을 구체화한 것. 이 영상의 목적에 따라 아래 중 가장
   맞는 종류를 판단해서 붙이고, 5개 후보에 다양하게 배분할 것(전부 같은 키워드를 기계적으로
   붙이지 말 것):
   - 검색 유입을 극대화하고 싶은 소재라면: "| 영어 읽는 법", "| 파닉스 기초"처럼 일반 검색어.
   - 특정 타겟을 정확히 공략하고 싶은 소재라면: "| 영어 왕초보", "| 성인 파닉스"처럼 타겟 특징.
   **채널명("| 이해하면 쉬운영어")은 이 자리에 절대 넣지 않는다**(2026-09-15 확정) — 유튜브
   UI가 검색 결과·피드에서 채널명을 제목과 별도로 항상 보여주므로 제목 텍스트 안에 또 넣는 건
   글자 수만 낭비하고, 모바일에서 정작 중요한 앞부분(훅)이 잘릴 위험만 키운다. 실제로 존재하지
   않는 검색어·타겟 표현을 지어내지 말 것.
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
    있었다. 시청자와 똑같이 헤매다가 "저도 이제야 알았습니다"라고 함께 놀라는 동반자 톤으로
    바꿀 것):
    - ❌ 전문가 톤: "절대 다 읽지 마세요" → ✅ 동반자 톤: "여태 두 글자 다 읽었네요..."
    - ❌ 전문가 톤: "원어민의 1초 꼼수" → ✅ 동반자 톤: "이걸 50살에야 알았습니다"
    - 실제 좋은 예: "50대인 저도 1초 만에 이해했습니다. 모음 2개 겹칠 때 단어 읽는 법" — 위
      8번 구조의 절대 영역(맨 앞 15자)에 "저도/제가/이제야/여태" 같은 1인칭 경험담을 놓고,
      정보 영역에서 구체적 소재를 설명하는 식으로 결합한다.
    - 이건 8번의 A(해결책 전면)/B(페인포인트 전면)/C(호기심 전면) 배치 유형과는 별개 축이다
      — 어느 배치 유형을 쓰든 동반자 톤으로 표현할 수 있다. 5개 전부 기본적으로 이 톤을
      따르되, 실제 채널 시그니처 멘트(brand-persona.md 5절 — "저도 외우는 거 딱
      질색이었습니다" 등)처럼 자연스러운 범위 안에서 쓸 것, 어색하게 나이·숫자를 끼워 맞추지
      않는다.

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
      "title": "모바일 3단 배치(1~15자 Hook·16~25자 상황·26자~ 키워드) — 해결책/페인포인트/호기심 중 이 소재에 맞는 배치 유형을 판단해서 절대 영역(맨 앞 15자)에 가장 강한 정보를 놓을 것, 맨 끝엔 '|'로 목적에 맞는 키워드(검색용/타겟명 중 택1 — 채널명은 절대 넣지 않는다) 추가. 톤은 위에서 알려주는 전문가 톤이 아니라 시청자와 똑같이 겪고 이해하며 함께 놀라는 동반자 톤을 기본으로 쓸 것 (예: '절대 다 읽지 마세요'(전문가 톤, 지양) 대신 '50대인 저도 1초 만에 이해했습니다. 모음 2개 겹칠 때 단어 읽는 법'(동반자 톤, 지향))",
      "thumbnailHeadline": "썸네일 이미지 안의 유일한 텍스트(하단 캡션·뱃지는 폐지) — 조사를 뺀 핵심 단어 3~4개로 극도로 압축(예: '다시는 안 틀림'). 설득하는 문장이 아니라 스크롤을 멈추는 시각적 스턴건이라는 게 목적. title과 핵심 키워드를 공유해도 되지만 명령/단정형으로 압축할 것(title은 서술형 문장, headline은 '~하세요/~만/~됨' 같은 압축형). 반드시 이 소재의 구체적 영역 키워드를 하나는 그대로 노출해 '무슨 얘기인지'는 명시할 것 — 무관한 범용 문구('10초면 끝')도, 주제 자체가 안 보이는 문구('그 규칙 하나로 끝')도 둘 다 실패",
      "designConcept": "이 title/thumbnailHeadline 조합에 맞는 비주얼 컨셉 한 줄",
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
export function buildThumbnailPrompt({ topic = '', variantKey = 'A', title = '', thumbnailHeadline = '', format = 'LONGFORM', hasPersonReference = false, visualConcept = '' }) {
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

  // 2026-09-14: 사용자가 호스트를 가리키는 화살표+정체성 라벨(채널 정체성 장치)을 요청 —
  // 처음엔 후보 3개를 전부 항상 보여주는 안으로 갔다가, 실제 생성 이미지 2장(나노바나나·챗GPT
  // 둘 다)을 직접 비교해보니 작은 썸네일 크기에서 라벨 3개가 다 읽히기 힘들고 헤드라인과 시선을
  // 두고 경쟁하는 문제가 확인돼, 후보 3개 중 소재에 맞는 2개만 AI가 골라 쓰는 방식으로 확정.
  // 화살표 스타일도 "손그림+찢어진 종이"로 지시했지만 두 엔진 다 깔끔한 인쇄 태그+심플한 벡터
  // 화살표로 수렴했고, 그 결과가 신뢰형 톤(3060 성인 타깃)에 오히려 더 잘 맞아서 그대로 밀고
  // 가기로 확정(사용자 확인 완료) — "손그림/찢어진 종이"를 강제하는 문구는 더 이상 안 쓴다.
  const heroLabelCandidates = [
    '영어 기초 1도 없이 시작한 사람',
    '영상 만들면서 공부하는 사람',
    '외우기 싫어하고 외워도 금방 까먹는 사람',
  ];

  // 2026-09-02엔 "인물 위치·거리·오려내기는 자유롭게 판단하라"고만 시켰더니 실제로는 거의
  // 항상 같은 기본값(오른쪽·클로즈업)으로 수렴하는 문제가 실측으로 확인돼서, 그때는 코드가
  // Math.random()으로 고정 목록 중 하나를 강제 배정하는 방식으로 바꿨었다.
  // 2026-09-14: 배경/장면 자체를 고정 템플릿에서 "이 소재의 상황을 보여주는 구체적 장면을
  // 직접 판단"으로 바꾼 뒤(이 함수의 BACKGROUND & SCENE 문단), `test-prompts/
  // thumbnail-test-v5-freeform-hero-placement.md`로 위치·거리·오려내기도 다시 자유 판단으로
  // 테스트 — 장면 자체가 소재마다 달라지니 인물 배치도 그 장면에 맞춰 자연스럽게 달라지는 걸
  // 실제 생성으로 확인(사용자 확인 완료). 그래서 이번엔 강제 배열 없이 프롬프트 문장으로만
  // "이 장면에 맞게 직접 정하라"고 지시한다 — 다시 한쪽으로 쏠리면 이 커밋을 되돌리고 강제
  // 배정으로 복귀할 것.

  const prompt = `A high-CTR, photorealistic YouTube thumbnail for Korean English-pronunciation education channel '이해하면 쉬운영어' (target: 3060 adult learners), ${isShorts ? '9:16 vertical shorts cover' : '16:9 horizontal'}, on the topic "${rawText}".

=== TEXT CONTENT (render each quoted string below exactly character-for-character — do not substitute, merge, reorder, or invent a single character) ===
- Headline — ${headlineLines.length === 2 ? 'two separate lines' : 'one line (wrap naturally across 2 lines only if it does not fit on one)'}, massive bold letters, 3-4 words only — this is the ENTIRE text content of the thumbnail, not a slogan to explain the video: ${headlineLines.map((l) => `"${l}"`).join(' / ')}
- Hero identity callout — TWO small paper-note tag labels placed near the hero, each connected to the hero by a simple, bold red arrow (a clean, printed style — not a loose hand sketch) pointing at a different point on the hero (e.g., their cap, shoulder) so the two arrows never cross or overlap. Each tag holds one short line of dark text on a light background, clearly smaller than the headline — a supporting identity note, not a second headline. From the three identity labels below, pick exactly TWO that fit this specific topic best — one per arrow — do not invent a different line and do not use all three: ${heroLabelCandidates.map((l) => `"${l}"`).join(', ')} (pick the first when in doubt — it fits almost any topic — and pick the third whenever the topic is about a rule or shortcut that replaces rote memorization; pick the second only for topics with a behind-the-scenes, process-sharing feel).
${useCards ? `- Secondary info cards near the bottom, three short items: "${card1}", "${card2}", "${card3}"\n` : ''}Do not render any text other than the strings quoted above — no badge, no bottom caption, no channel name, no logo, no watermark, no UI mockup text, no extra labels, no duplicated copies of any string.

=== BACKGROUND & SCENE (you decide — no fixed template) ===
Invent a concrete, specific scene or prop that visually shows the exact "mistake / confusion / realization" moment this topic is about — the viewer should be able to guess the general situation just from the image, before reading any text. Use whatever object, setting, or visual device genuinely fits this specific topic (a notebook page, a chalkboard, a handwritten note, a phone screen, a printed word, a classroom prop, a close-up detail — anything is fair game, old-school or modern). The one hard requirement is that it must look like a genuinely designed, sophisticated photograph — a specific, named lighting technique (e.g., "a single warm practical desk-lamp from camera-left casting a soft pool of light and gentle shadow," "diffused overcast window light from behind," "a three-point studio softbox setup with a cool rim light") and a considered color harmony, not a vague "nice lighting" — never a generic, low-effort AI-generated image (flat even lighting, a random gradient glow for its own sake, a cliché stock-photo arrangement). Infer the emotional register of the headline text above (warm and nostalgic, bright and energetic, cool and modern, urgent, calm — whatever it actually is) and choose a mood and color palette that genuinely fits it — do not default to any single fixed palette regardless of topic (2026-09-14: this replaces a fixed dark-navy-with-cyan/magenta-glow background that was used for every topic and every mood, and a fixed per-variant "mood" label that ignored the actual headline — a warm, personal headline was getting cold neon lighting because the variant slot said so).

CRITICAL — do not let the scene explain the answer: any mark or detail in the scene may show THAT something is wrong or resolved (e.g., a red strikethrough, an X, a circle around one letter, a checkmark) but must NOT spell out the correct pronunciation, a phonetic transcription, or any written explanation of why/how it works. The scene should raise the question, not answer it — exactly like the headline text does.

CRITICAL — anchor the scene to real words/examples, not a generic "knowledge" metaphor (2026-09-14: real generations kept drifting into clichés like an ancient locked book or stack of old paper glowing with mystical light — visually striking but disconnected from the actual topic, physically nonsensical (why would a locked book emit light?), and generic enough to fit literally any educational video). The scene must include an actual word or example this specific topic is about (e.g., real English words relevant to this exact pronunciation rule), written or displayed somewhere in the prop. Avoid abstract "unlocking wisdom" imagery (glowing locked books, magical light bursts, treasure chests, keys/locks with no real-world reason to be there) — these could illustrate any topic and show nothing about what this video actually teaches. Every element in the scene should have a plausible, real-world reason for looking the way it does; if you can't explain why the object would realistically look that way, choose a different, more grounded scene.
${visualConcept.trim() ? `\nConcept direction for this specific variant (work this into the scene — extra graphic elements, color accents, iconography, framing choices — without breaking any rule stated above, especially the Hero identity, text-accuracy, and no-answer-reveal rules): ${visualConcept.trim()}\n` : ''}
Before finalizing, briefly commit (in your own internal reasoning, not rendered as text) to: what specific object or scene you chose, why it visually implies the situation without any explanation text, and the exact lighting technique and color treatment you are using (name it specifically, the way a cinematographer would) to make it look intentionally designed rather than generic.

Hero: ${
    hasPersonReference
      ? `the exact same person's face shown in the attached reference image — same facial identity and features, clearly recognizable as this person. Freely vary their hairstyle and facial hair from what is shown in the reference image — only the face must match. Dress them in the EXACT SAME outfit shown in the reference image — the same navy baseball cap and black t-shirt, each printed with the same small colorful vertical-bar sound-wave icon exactly as shown (icon only, no text on the cap or shirt) — this is the channel's fixed signature uniform, do not substitute a different outfit, different colors, or a different logo`
      : 'a photorealistic Korean adult (20s-40s)'
  }, with a genuine, expressive reaction that fits the scene and the headline's emotional register (realization, quiet confidence, warmth, energy — whatever actually fits), their eyes and gaze directed toward the headline text rather than straight at the camera — as if they just reacted to reading it, lit consistently with whatever lighting treatment you chose for the scene above (not a fixed color), freely choosing whichever silhouette treatment suits your chosen composition better: cut out along an irregular torn-paper silhouette following their head and shoulders with a slightly rough paper-fiber edge texture (not a smooth sticker outline), OR bleed directly to the frame edge with a soft dark vignette and no visible border.

Composition: this is a ${isShorts ? '9:16 vertical' : '16:9 horizontal'} frame. Freely decide the hero's position (left/right/center/top/bottom — whichever makes THIS headline easiest to read and best complements the scene you invented), camera distance (close-up / medium / waist-up), and camera angle, along with a lens character that fits the scene (e.g., "an 85mm portrait lens with shallow depth of field," "a wide 35mm lens keeping both hero and prop in sharp focus," "a macro lens tight on the prop with the hero softly out of focus behind it") — pick whichever lens best matches the scene you invented. Arrange the headline${useCards ? ' and cards' : ''} freely within the remaining space — pick whatever exact layout best fits THIS specific headline length${useCards ? ' and card count' : ''}. The hero and the background scene/prop should feel like they belong in the same physical space (e.g., the hero is reacting to or near the object, not just floating in front of an unrelated backdrop). Treat the hero photo and every text block as separate, non-intersecting regions with a visible gap of empty background between them, the way a clean infographic keeps its photo and its text in distinct zones — never let the hero's head, hair, or shoulders cross in front of or behind any letter. Position the two hero identity callouts (tag + red arrow, each) near the hero without overlapping the hero, the headline, the highlighted chip, or each other — small supporting zones, not a wall of text. Before finalizing, check every line of text and confirm no part of it is covered, thinned, or interrupted by the hero photo; if it would be, shrink or move the hero instead of the text.

Typography: use a clean, bold, heavy sans-serif font throughout for maximum legibility, rendered as sharp, stylized, infographic-quality text (not painterly or hand-lettered), with a heavy black outline for contrast so it stays readable against whatever background scene you chose. The headline itself is already compressed to 3-4 words — a visual "stun gun," not a sentence to persuade with — so treat every word in it as important. Within it, pick the single most important 1-2 word phrase — the sharpest word(s) — and render just those with a solid warm-yellow (#F5C518) background chip directly behind the letters (dark navy or black lettering on the yellow chip, not yellow lettering); every other word stays plain white with the black outline. This highlighted-phrase chip must appear exactly once somewhere in the headline — never skip it and never apply it to more than one phrase. Each hero identity callout's single line uses the same clean sans-serif family but noticeably smaller and without the yellow highlight chip — it reads as a supporting aside near the hero, not a second headline.

CRITICAL TEXT ACCURACY: every string in the TEXT CONTENT section must be spelled out exactly, letter by letter, with correct Korean/English characters — do not invent, substitute, or garble any character. If unsure how to render a word clearly, make it larger and simpler rather than risk misspelling it.

Style: ultra-realistic, sharp focus, high detail — the human subject and the scene/prop must look like a real photograph, not an illustration or 3D render. No watermark, no fake phone or browser UI, no stock-photo text, no crude cartoon doodles.`;

  const expectedTexts = [...headlineLines, ...(useCards ? [card1, card2, card3] : [])].filter(Boolean);
  return { prompt, expectedTexts, variantKey: vKey, isShorts };
}

export async function generateAiThumbnailImage({ prompt, topic = '', variantKey = 'A', title = '', thumbnailHeadline = '', format = 'LONGFORM', engine = 'flux', geminiKey, visualConcept = '' }) {
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
    const built = useCustomPrompt ? null : buildThumbnailPrompt({ topic, variantKey: vKey, title, thumbnailHeadline, format, hasPersonReference: !!personReference, visualConcept });
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
