// Outlier video comment analysis tool for ihm-easy-english.
//
// Extracts audience language, confusion points, FAQs, and emotional pain points
// from high-performing outlier videos on YouTube, and uses Google Gemini to generate
// actionable episode ideas, thumbnail angles, and 3-second hooks.
//
// Usage:
//   node scripts/analyze-outlier-comments.mjs --url="https://youtube.com/watch?v=..."
//   node scripts/analyze-outlier-comments.mjs --video="<videoId>"
//   node scripts/analyze-outlier-comments.mjs --keyword="영어 연음 축약"
//   node scripts/analyze-outlier-comments.mjs --all
//   node scripts/analyze-outlier-comments.mjs --dry-run

import { GEMINI_TEXT_MODELS } from './gemini-models.mjs';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const projectDir = dirname(dirname(fileURLToPath(import.meta.url)));
const envPath = join(projectDir, ".env");
const marketDemandPath = join(projectDir, "data", "youtube", "market-demand.json");
const outputCommentsDir = join(projectDir, "data", "youtube", "outlier-comments");
const outputInsightsDir = join(projectDir, "output", "insights");

// Ensure directories exist
if (!existsSync(outputCommentsDir)) mkdirSync(outputCommentsDir, { recursive: true });
if (!existsSync(outputInsightsDir)) mkdirSync(outputInsightsDir, { recursive: true });

// Load environment variables
if (existsSync(envPath)) {
  try {
    process.loadEnvFile(envPath);
  } catch {
    // Fallback parser if loadEnvFile fails
    const text = readFileSync(envPath, "utf8");
    for (const line of text.split(/\r?\n/)) {
      const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
      if (match && !process.env[match[1]]) {
        let val = match[2].trim().replace(/^['"]|['"]$/g, "");
        process.env[match[1]] = val;
      }
    }
  }
}

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY?.trim();
const GEMINI_API_KEY = (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY)?.trim();

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const noAi = args.includes("--no-ai");

function extractVideoId(urlOrId) {
  if (!urlOrId) return null;
  const str = urlOrId.trim();
  // Standard full URL
  const matchWatch = str.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
  if (matchWatch) return matchWatch[1];
  // Shortened URL (youtu.be/...)
  const matchShort = str.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
  if (matchShort) return matchShort[1];
  // Shorts URL
  const matchShorts = str.match(/youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/);
  if (matchShorts) return matchShorts[1];
  // Direct 11-char ID
  if (/^[a-zA-Z0-9_-]{11}$/.test(str)) return str;
  return null;
}

function sanitizeFilename(name) {
  return name
    .replace(/[\\/:*?"<>|]/g, "_")
    .replace(/\s+/g, "_")
    .slice(0, 50);
}

async function fetchVideoDetails(videoId, apiKey) {
  const url = new URL("https://www.googleapis.com/youtube/v3/videos");
  url.search = new URLSearchParams({
    part: "snippet,statistics",
    id: videoId,
    key: apiKey,
  });

  const res = await fetch(url, { signal: AbortSignal.timeout(20_000) });
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`YouTube Video API failed (${res.status}): ${errorText}`);
  }
  const data = await res.json();
  const item = data.items?.[0];
  if (!item) return null;

  return {
    videoId,
    title: item.snippet.title,
    channelTitle: item.snippet.channelTitle,
    channelId: item.snippet.channelId,
    publishedAt: item.snippet.publishedAt,
    viewCount: Number(item.statistics?.viewCount || 0),
    likeCount: Number(item.statistics?.likeCount || 0),
    commentCount: Number(item.statistics?.commentCount || 0),
    thumbnailUrl: item.snippet.thumbnails?.high?.url || item.snippet.thumbnails?.default?.url,
  };
}

async function fetchComments(videoId, apiKey, maxResults = 100, options = {}) {
  const { throwOnDisabled = false } = options;
  const url = new URL("https://www.googleapis.com/youtube/v3/commentThreads");
  url.search = new URLSearchParams({
    part: "snippet",
    videoId: videoId,
    order: "relevance",
    maxResults: String(Math.min(maxResults, 100)),
    textFormat: "plainText",
    key: apiKey,
  });

  const res = await fetch(url, { signal: AbortSignal.timeout(20_000) });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const reason = err.error?.errors?.[0]?.reason || err.error?.message;
    if (reason === "commentsDisabled") {
      if (throwOnDisabled) {
        throw new Error(`영상(${videoId})의 댓글 기능이 비활성화되어 있습니다 (commentsDisabled).`);
      }
      console.warn(`  ⚠ 영상(${videoId})의 댓글 기능이 비활성화되어 있습니다.`);
      return [];
    }
    throw new Error(`YouTube Comment API failed (${res.status}): ${JSON.stringify(err)}`);
  }

  const data = await res.json();
  return (data.items || []).map((item) => {
    const top = item.snippet.topLevelComment.snippet;
    return {
      commentId: item.id,
      text: top.textDisplay,
      author: top.authorDisplayName,
      likeCount: top.likeCount,
      publishedAt: top.publishedAt,
      replyCount: item.snippet.totalReplyCount,
    };
  });
}

async function analyzeCommentsWithGemini(videoMeta, comments, apiKey, existingPainPoints = []) {
  if (!apiKey) {
    console.warn("  ⚠ GEMINI_API_KEY가 없어 규칙 기반 키워드 요약으로 대체합니다.");
    return null;
  }

  const commentsSnippet = comments
    .slice(0, 80)
    .map(
      (c, idx) =>
        `[${idx + 1}] (👍 ${c.likeCount}) ${c.author}: ${c.text.replace(/\r?\n/g, " ")}`
    )
    .join("\n");

  const knownBlock = existingPainPoints.length
    ? `\n[이미 파악된 고통점/질문 — 이미 여러 번 확인된 것이므로 그대로 재탕하지 말고, 새로운 관점이나 아직 안 나온 항목 위주로 뽑을 것]:\n${existingPainPoints.slice(0, 10).map((e) => `- ${e.text}`).join("\n")}\n`
    : "";

  const prompt = `
당신은 유튜브 영어 교육 채널 **'이해하면 쉬운영어'**의 수석 콘텐츠 기획자입니다.
- **채널 페르소나**: "기초가 전혀 없어도 괜찮습니다. 당신이 영어를 못했던 게 아니라 소리 나는 원리를 몰랐을 뿐입니다. 무작정 외우지 마세요."
- **톤앤매너**: 어려운 문법 용어 배제, '게으른 혀의 소리 지름길' 직관 비유, 시청자의 가려운 곳을 긁어주는 솔직 담백한 학습 동반자.
${knownBlock}
다음은 경쟁/벤치마크 채널에서 큰 조회수를 기록한 아웃라이어 영상과, 그 영상에 달린 시청자들의 인기 댓글 목록입니다.

---
[분석 대상 영상]
- 제목: ${videoMeta.title}
- 채널: ${videoMeta.channelTitle}
- 조회수: ${videoMeta.viewCount.toLocaleString()}회 | 댓글수: ${videoMeta.commentCount.toLocaleString()}개

[시청자 인기 댓글 80개]
${commentsSnippet}
---

위 댓글들을 심층 분석하여 아래 5가지 항목을 반드시 JSON 형식으로 응답해 주세요:

1. painPoints (시청자 핵심 고통 TOP 3~4):
   - 시청자가 영어를 들을 때/말할 때 겪는 답답함, 오해, 좌절 포인트 (댓글의 생생한 반응 인용 포함)
2. audienceQuestions (시청자 질문 및 미해결 의문 TOP 3~4):
   - 댓글에서 시청자가 "그럼 이건 왜 그래요?", "A와 B는 어떻게 달라요?"처럼 추가로 물어본 구체적인 질문 (차기 영상 소재)
3. audienceVocabulary (시청자의 생생한 언어):
   - 문법/음성학 용어 대신 시청자들이 자연스럽게 사용한 표현이나 비유 (예: '버터발음', '혀끝', '흘려듣기', '뭉개짐' 등 5~8개)
4. whatWorked (시청자가 극찬한 설명 포인트):
   - 시청자들이 "이 부분 설명 덕분에 이해됐다"고 감탄한 지점 (우리가 벤치마킹할 설명 논리)
5. actionableContentPitches (우리 채널용 즉시 제작 제안):
   - titleCandidates: 이 고민을 꿰뚫는 매력적인 영상 제목 후보 3개 (A/B 테스트용)
   - hookThreeSeconds: 영상 시작 3초 만에 시청자를 사로잡는 첫 후킹 멘트
   - shortsTrackAIdea: 원리 설명형 쇼츠(Track A) 기획 컨셉 및 후킹 한 줄
   - shortsTrackBIdea: 대화/상황극형 쇼츠(Track B) 기획 컨셉 및 후킹 한 줄

반드시 JSON 코드 블록(\`\`\`json ... \`\`\`)으로 출력해 주세요.
`;

  const models = [...GEMINI_TEXT_MODELS];
  let lastError = null;

  for (const model of models) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: AbortSignal.timeout(45_000),
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.4,
            responseMimeType: "application/json",
          },
        }),
      });

      if (!res.ok) {
        const errBody = await res.text();
        throw new Error(`Gemini API (${model}) failed: ${res.status} ${errBody}`);
      }

      const data = await res.json();
      const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawText) throw new Error("Empty response from Gemini");

      // Extract JSON
      const jsonMatch = rawText.match(/```json\s*([\s\S]*?)\s*```/) || [null, rawText];
      const parsed = JSON.parse(jsonMatch[1].trim());
      return parsed;
    } catch (err) {
      lastError = err;
      // try next model
    }
  }

  console.warn(`  ⚠ Gemini 분석 실패: ${lastError?.message}`);
  return null;
}

function formatInsightText(item) {
  if (item == null) return "";
  if (typeof item === "string") return item;
  if (typeof item === "object") {
    const text = item.painPoint || item.question || item.point || item.description || item.text || item.problem || item.reason || item.title;
    const detail = item.quote || item.example || item.detail;
    if (text && detail) return `${text} (💬 "${detail}")`;
    if (text) return text;
    return Object.values(item).filter(Boolean).join(" - ");
  }
  return String(item);
}

function generateMarkdownReport(videoMeta, comments, aiInsights) {
  const dateStr = new Date().toISOString().split("T")[0];
  const topLikedComments = [...comments].sort((a, b) => b.likeCount - a.likeCount).slice(0, 8);
  const isMyChannel = videoMeta.channelId === "UCwNrEdm2jYAtUlfHVvH3WQw" ||
    (videoMeta.channelTitle && (videoMeta.channelTitle.includes("이해하면 쉬운 영어") || videoMeta.channelTitle.includes("이해하면 쉬운영어")));

  let md = `# 📊 아웃라이어 영상 댓글 분석 리포트: ${videoMeta.title}\n\n`;
  md += `- **분석 유형**: ${isMyChannel ? "🏠 **우리 채널 시그니처 영상 (VoC & 시청자 반응 분석)**" : "🎯 **외부 경쟁 채널 벤치마크 (시장 수요 & 결핍 분석)**"}\n`;
  md += `- **분석 일자**: ${dateStr}\n`;
  md += `- **대상 영상**: [${videoMeta.title}](https://youtube.com/watch?v=${videoMeta.videoId})\n`;
  md += `- **채널명**: ${videoMeta.channelTitle} ${isMyChannel ? "(★ 우리 채널)" : ""}\n`;
  md += `- **조회수**: ${videoMeta.viewCount.toLocaleString()}회 | **댓글 수집**: ${comments.length}개\n\n`;
  md += `---\n\n`;

  if (aiInsights) {
    md += `## 💡 1. 시청자 핵심 고통 (Pain Points)\n\n`;
    (aiInsights.painPoints || []).forEach((p, idx) => {
      md += `${idx + 1}. ${formatInsightText(p)}\n`;
    });
    md += `\n`;

    md += `## ❓ 2. 시청자 미해결 질문 (차기 영상 소재 TOP)\n\n`;
    (aiInsights.audienceQuestions || []).forEach((q, idx) => {
      md += `${idx + 1}. ${formatInsightText(q)}\n`;
    });
    md += `\n`;

    md += `## 🗣️ 3. 시청자의 생생한 어휘 (Audience Vocabulary)\n\n`;
    md += `> **대본/썸네일 작성 시 활용할 단어**:\n`;
    md += `> ${(aiInsights.audienceVocabulary || []).map((v) => `\`${typeof v === "string" ? v : Object.values(v)[0]}\``).join(", ")}\n\n`;

    if (aiInsights.whatWorked) {
      md += `## 🎯 4. 호평받은 설명 논리 (What Worked)\n\n`;
      if (Array.isArray(aiInsights.whatWorked)) {
        aiInsights.whatWorked.forEach((w) => {
          md += `- ${formatInsightText(w)}\n`;
        });
      } else {
        md += `- ${formatInsightText(aiInsights.whatWorked)}\n`;
      }
      md += `\n`;
    }

    if (aiInsights.actionableContentPitches) {
      const p = aiInsights.actionableContentPitches;
      md += `## 🚀 5. 우리 채널 즉시 적용 기획안\n\n`;
      md += `### 📌 추천 제목 후보 (A/B 테스트)\n`;
      (p.titleCandidates || []).forEach((t, idx) => {
        md += `${idx + 1}. **${formatInsightText(t)}**\n`;
      });
      md += `\n`;

      if (p.hookThreeSeconds) {
        md += `### ⚡ 첫 3초 후킹 멘트\n`;
        md += `> "${p.hookThreeSeconds}"\n\n`;
      }

      const formatPitchItem = (item) => {
        if (!item) return "";
        if (typeof item === "string") return item;
        if (typeof item === "object") {
          const parts = [];
          if (item.concept || item.idea || item.title) parts.push(`**컨셉**: ${item.concept || item.idea || item.title}`);
          if (item.hook || item.hookLine) parts.push(`**후킹**: "${item.hook || item.hookLine}"`);
          if (parts.length > 0) return parts.join("\n  - ");
          return Object.entries(item).map(([k, v]) => `**${k}**: ${v}`).join("\n  - ");
        }
        return String(item);
      };

      if (p.shortsTrackAIdea) {
        md += `### 🎬 쇼츠 Track A (원리형) 아이디어\n`;
        md += `- ${formatPitchItem(p.shortsTrackAIdea)}\n\n`;
      }

      if (p.shortsTrackBIdea) {
        md += `### 🎭 쇼츠 Track B (상황극/대화형) 아이디어\n`;
        md += `- ${formatPitchItem(p.shortsTrackBIdea)}\n\n`;
      }
    }
  }

  md += `---\n\n`;
  md += `## 💬 공감도(좋아요) 높은 실제 시청자 댓글 Top 8\n\n`;
  topLikedComments.forEach((c, idx) => {
    md += `**[${idx + 1}] 👍 ${c.likeCount}개** - \`${c.author}\`\n`;
    md += `> ${c.text.replace(/\n/g, "\n> ")}\n\n`;
  });

  return md;
}

// 키도 있고 댓글도 있어 AI를 불렀는데 결과가 없으면 실패다. analyzeCommentsWithGemini는 실패하면
// null을 돌려줘서, 예전에는 빈 결과가 "분석 성공"으로 기록됐다(2026-11-09 점검 6번).
// 키가 없거나 댓글이 없으면 처음부터 AI를 부르지 않으므로 실패가 아니다.
const aiAnalysisFailed = ({hasGeminiKey, commentsCount, aiInsights}) =>
  Boolean(hasGeminiKey && commentsCount > 0 && !aiInsights);

export {
  aiAnalysisFailed,
  extractVideoId,
  fetchVideoDetails,
  fetchComments,
  analyzeCommentsWithGemini,
  analyzeSingleVideo,
  generateMarkdownReport,
  formatInsightText,
};


async function analyzeSingleVideo(videoId) {
  console.log(`\n========================================`);
  console.log(`🔍 영상 분석 시작: ${videoId}`);
  console.log(`========================================`);

  // 1. Fetch Video Metadata
  console.log(`▶ 1/3 영상 정보 조회 중...`);
  const meta = await fetchVideoDetails(videoId, YOUTUBE_API_KEY);
  if (!meta) {
    console.error(`❌ 영상 정보를 찾을 수 없습니다: ${videoId}`);
    return;
  }
  console.log(`   제목: "${meta.title}"`);
  console.log(`   채널: ${meta.channelTitle} | 조회수: ${meta.viewCount.toLocaleString()}회`);

  // 2. Fetch Comments
  console.log(`▶ 2/3 인기 댓글 수집 중...`);
  const comments = await fetchComments(videoId, YOUTUBE_API_KEY, 100);
  console.log(`   수집 완료: 총 ${comments.length}개 댓글`);

  if (comments.length === 0) {
    console.warn(`   댓글이 없어 분석을 건너뜁니다.`);
    return;
  }

  // 3. Gemini AI Analysis
  let aiInsights = null;
  if (!noAi && GEMINI_API_KEY) {
    console.log(`▶ 3/3 Gemini AI 심층 분석 실행 중...`);
    aiInsights = await analyzeCommentsWithGemini(meta, comments, GEMINI_API_KEY);
    if (aiInsights) {
      console.log(`   ✓ AI 인사이트 및 기획안 생성 완료!`);
    }
  } else {
    console.log(`▶ 3/3 AI 분석 건너뜀 (--no-ai 또는 키 누락)`);
  }

  // 4. Save JSON & Markdown Report
  const resultJson = {
    schemaVersion: 1,
    analyzedAt: new Date().toISOString(),
    video: meta,
    commentCountCollected: comments.length,
    aiInsights,
    comments,
  };

  const jsonFile = join(outputCommentsDir, `${videoId}.json`);
  writeFileSync(jsonFile, JSON.stringify(resultJson, null, 2), "utf8");

  const slug = sanitizeFilename(`${meta.title}_${videoId}`);
  const reportMd = generateMarkdownReport(meta, comments, aiInsights);
  const mdFile = join(outputInsightsDir, `${slug}.md`);
  writeFileSync(mdFile, reportMd, "utf8");

  console.log(`\n✅ 분석 완료! 산출물 저장 경로:`);
  console.log(`   - JSON 데이터: ${jsonFile}`);
  console.log(`   - 기획 리포트: ${mdFile}\n`);

  if (aiInsights?.actionableContentPitches) {
    const p = aiInsights.actionableContentPitches;
    console.log(`[💡 즉시 추천 제목 후보]`);
    (p.titleCandidates || []).forEach((t, i) => console.log(`   ${i + 1}. ${t}`));
    if (p.hookThreeSeconds) console.log(`\n[⚡ 첫 3초 후킹]: "${p.hookThreeSeconds}"`);
  }
}

async function main() {
  const urlArg = args.find((a) => a.startsWith("--url="))?.slice("--url=".length);
  const videoArg = args.find((a) => a.startsWith("--video="))?.slice("--video=".length);
  const keywordArg = args.find((a) => a.startsWith("--keyword="))?.slice("--keyword=".length);
  const allFlag = args.includes("--all");

  if (args.includes("--help") || (args.length === 0)) {
    console.log(`
사용법 (Usage):
  node scripts/analyze-outlier-comments.mjs --url="https://youtube.com/watch?v=..."
  node scripts/analyze-outlier-comments.mjs --video="<videoId>"
  node scripts/analyze-outlier-comments.mjs --keyword="영어 연음 축약"
  node scripts/analyze-outlier-comments.mjs --all

옵션:
  --dry-run   실제 API 호출 없이 설정 및 대상 영상 목록만 확인
  --no-ai     Gemini AI 분석 없이 댓글 수집만 진행
`);
    process.exit(0);
  }

  if (dryRun) {
    const ytOk = YOUTUBE_API_KEY && YOUTUBE_API_KEY !== "YOUR_YOUTUBE_API_KEY_HERE";
    const geminiOk = GEMINI_API_KEY && GEMINI_API_KEY !== "YOUR_GEMINI_API_KEY_HERE";
    console.log(`[Dry Run 모드]`);
    console.log(`- YouTube API Key: ${ytOk ? "✓ 설정됨" : "✗ 미설정 (.env에 실제 키 필요)"}`);
    console.log(`- Gemini API Key:  ${geminiOk ? "✓ 설정됨" : "✗ 미설정"}`);
    process.exit(0);
  }

  if (!YOUTUBE_API_KEY || YOUTUBE_API_KEY === "YOUR_YOUTUBE_API_KEY_HERE") {
    console.error(`
❌ 오류: .env 파일에 'YOUTUBE_API_KEY'가 설정되어 있지 않습니다.
   Google Cloud Console에서 API 키를 발급받아 .env의 YOUTUBE_API_KEY에 입력해 주세요.
`);
    process.exit(1);
  }

  // Case 1: Specific URL or Video ID
  const directId = extractVideoId(urlArg || videoArg);
  if (directId) {
    await analyzeSingleVideo(directId);
    return;
  }

  // Case 2: From market-demand.json (by keyword or all)
  if (!existsSync(marketDemandPath)) {
    console.error(`❌ ${marketDemandPath} 파일이 없습니다. 먼저 'node scripts/market-demand.mjs'를 실행하거나 --url을 사용하세요.`);
    process.exit(1);
  }

  const marketDemand = JSON.parse(readFileSync(marketDemandPath, "utf8"));
  let targets = [];

  if (keywordArg) {
    const entry = marketDemand.byKeyword?.find((k) => k.keyword.includes(keywordArg) || keywordArg.includes(k.keyword));
    if (!entry || !entry.topOutliers?.length) {
      console.error(`❌ '${keywordArg}' 키워드에 해당하는 아웃라이어 영상을 market-demand.json에서 찾지 못했습니다.`);
      process.exit(1);
    }
    targets = entry.topOutliers;
  } else if (allFlag) {
    const seenIds = new Set();
    for (const k of marketDemand.byKeyword || []) {
      for (const o of k.topOutliers || []) {
        if (o.videoId && !seenIds.has(o.videoId)) {
          seenIds.add(o.videoId);
          targets.push(o);
        }
      }
    }
  }

  if (targets.length === 0) {
    console.log(`분석할 아웃라이어 영상이 없습니다.`);
    return;
  }

  console.log(`\n총 ${targets.length}개 아웃라이어 영상 분석을 시작합니다.`);
  for (const target of targets) {
    if (target.videoId) {
      await analyzeSingleVideo(target.videoId);
    } else {
      console.warn(`  ⚠ videoId가 없는 항목 건너뜀: ${target.title}`);
    }
  }
}

const isDirectRun = process.argv[1] && (
  fileURLToPath(import.meta.url) === process.argv[1] ||
  process.argv[1].endsWith("analyze-outlier-comments.mjs")
);

if (isDirectRun) {
  main().catch((err) => {
    console.error(`\n❌ 실행 중 오류 발생: ${err.message}`);
    process.exit(1);
  });
}
