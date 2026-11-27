import { GEMINI_TEXT_MODELS } from './gemini-models.mjs';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const projectDir = dirname(dirname(fileURLToPath(import.meta.url)));
const envPath = join(projectDir, ".env");
const outputScriptInsightsDir = join(projectDir, "output", "script-insights");
const dataScriptInsightsDir = join(projectDir, "data", "youtube", "script-insights");
const marketDemandPath = join(projectDir, "data", "youtube", "market-demand.json");
const audienceDnaPath = join(projectDir, "data", "youtube", "audience-dna.json");

// Ensure directories exist
mkdirSync(outputScriptInsightsDir, { recursive: true });
mkdirSync(dataScriptInsightsDir, { recursive: true });

// Load .env
if (existsSync(envPath)) {
  const envText = readFileSync(envPath, "utf8");
  for (const line of envText.split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!match || process.env[match[1]]) continue;
    let value = match[2].trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    process.env[match[1]] = value;
  }
}

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

export function extractVideoId(urlOrId) {
  if (!urlOrId) return null;
  const s = String(urlOrId).trim();
  if (/^[A-Za-z0-9_-]{11}$/.test(s)) return s;
  const match = s.match(/(?:v=|\/v\/|youtu\.be\/|\/embed\/|\/shorts\/)([A-Za-z0-9_-]{11})/);
  if (match) return match[1];
  const queryMatch = s.match(/[\?&]v=([A-Za-z0-9_-]{11})/);
  if (queryMatch) return queryMatch[1];
  return null;
}

export async function fetchVideoDetails(videoId, apiKey = YOUTUBE_API_KEY) {
  if (!apiKey) throw new Error("YOUTUBE_API_KEY is required");
  const url = `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics,contentDetails&id=${videoId}&key=${apiKey}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(20_000) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`YouTube Video API failed (${res.status}): ${data?.error?.message || res.statusText}`);
  }
  if (!data.items || data.items.length === 0) return null;
  const item = data.items[0];
  return {
    videoId,
    title: item.snippet.title,
    description: item.snippet.description,
    channelId: item.snippet.channelId,
    channelTitle: item.snippet.channelTitle,
    publishedAt: item.snippet.publishedAt,
    viewCount: Number(item.statistics.viewCount || 0),
    likeCount: Number(item.statistics.likeCount || 0),
    commentCount: Number(item.statistics.commentCount || 0),
    thumbnail: item.snippet.thumbnails?.maxres?.url || item.snippet.thumbnails?.high?.url || item.snippet.thumbnails?.medium?.url,
    duration: item.contentDetails?.duration,
  };
}

const TRANSIENT_TRANSCRIPT_RE = /RequestBlocked|IpBlocked|YouTubeRequestFailed|PoTokenRequired|FailedToCreateConsentCookie|blocking requests|Too Many Requests|HTTP Error 429|\b429\b|timed out|ETIMEDOUT|ECONNRESET|ENOTFOUND/i;

/**
 * youtube_transcript_api 오류를 일시적 제한(429·IP 차단·시간 초과)과 영구적 자막 부재로 구분한다.
 * @param {string} reason
 * @param {string} [errorType]
 * @returns {string}
 */
export function classifyTranscriptError(reason, errorType = "") {
  const raw = String(reason || "");
  const combined = `${errorType} ${raw}`;
  if (TRANSIENT_TRANSCRIPT_RE.test(combined)) {
    return `YouTube 자막 요청 일시 제한/네트워크 오류: ${raw}`;
  }
  if (/TranscriptsDisabled/i.test(errorType) || /subtitles are disabled/i.test(raw)) {
    return "업로더가 이 영상의 자막 기능을 꺼놔서 자막을 가져올 수 없습니다.";
  }
  if (/NoTranscriptFound|StopIteration/i.test(errorType) || /no transcripts? (was|were) found/i.test(raw)) {
    return "이 영상에는 가져올 수 있는 자막이 없습니다.";
  }
  if (
    /VideoUnavailable|VideoUnplayable|InvalidVideoId|AgeRestricted/i.test(errorType) ||
    /video (is )?(unavailable|no longer available)|video unplayable|age[- ]?restricted/i.test(raw)
  ) {
    return "이 영상을 찾을 수 없습니다(비공개이거나 삭제됐을 수 있습니다).";
  }
  return raw;
}

export async function extractTranscript(videoId) {
  const pyScript = join(projectDir, "scripts", "extract-transcript.py");
  try {
    const { stdout } = await execFileAsync("python", [pyScript, videoId], { timeout: 45_000 });
    const data = JSON.parse(stdout.trim());
    if (!data.ok) throw new Error(data.error || "Transcript extraction failed");
    return data;
  } catch (err) {
    // extract-transcript.py가 실패해도 {ok:false, error} JSON을 stdout에 찍고 exit 1로 끝내는데,
    // execFileAsync는 exit 1이면 그 JSON을 파싱해서 보여주지 않고 그냥 "Command failed: ..." 라는
    // 의미 없는 메시지로 reject한다. 다만 Node는 그 실패한 프로세스의 stdout을 err.stdout에
    // 그대로 담아주므로, 여기서 다시 파싱해서 실제 원인을 꺼낸다(2026-09-07, 사용자 지적).
    let reason = err.killed || err.signal === "SIGTERM" ? "자막 추출 시간 초과(timed out)" : err.message;
    let errorType = "";
    if (err.stdout) {
      try {
        const parsed = JSON.parse(String(err.stdout).trim());
        if (parsed?.error) reason = parsed.error;
        if (parsed?.errorType) errorType = parsed.errorType;
      } catch {
        // stdout이 JSON이 아니면(예: python 자체가 없거나 문법 오류) 원래 err.message를 그대로 씀
      }
    }
    throw new Error(`자막 추출 실패 (${videoId}): ${classifyTranscriptError(reason, errorType)}`);
  }
}

export async function analyzeScriptWithGemini(videoMeta, transcriptData, apiKey = GEMINI_API_KEY, options = {}) {
  const { throwOnError = false } = options;
  if (!apiKey || apiKey === "YOUR_GEMINI_API_KEY_HERE") {
    if (throwOnError) throw new Error("GEMINI_API_KEY가 설정되어 있지 않습니다.");
    console.warn("⚠ GEMINI_API_KEY가 없어 AI 대본 분석을 건너뜁니다.");
    return null;
  }

  // 2026-11-12: 이 자리에 있던 우리 채널 철학·"도파민 3단계 공식"·분류 목록은 검증되지 않은 틀이라 뺐다. knowledge/legacy/agents-archive-2026-11-13.md "AI 분석 프롬프트에 검증 안 된 우리 틀을 넣지 않는다".
  // 매일 루프의 자동 생성은 멈췄고, 경쟁 영상 분석은 scripts/outlier-report.mjs의 합친 리포트가 맡는다.
  const prompt = `
당신은 유튜브 영상 대본을 있는 그대로 관찰해서 기록하는 분석가입니다. 평가하거나 미리 정한 유형·공식에 끼워 넣지 말고, 대본에 실제로 있는 것을 적으세요.
우리 채널은 한국에 사는 30~60대 성인이 영어 소리를 이해하도록 돕는 채널이다. 어려운 전문용어나 시청자가 겪지 않은 해외 경험담은 쓰지 않는다. 이 정보는 ourAdaptedScript 칸에만 쓴다.
${(() => {
    if (!existsSync(audienceDnaPath)) return "";
    try {
      const store = JSON.parse(readFileSync(audienceDnaPath, "utf8"));
      const known = (store.entries || []).filter((e) => e.type === "painPoint").slice(0, 10);
      if (!known.length) return "";
      return `\n[이미 파악된 경쟁사 맹점/고통점 — 재탕하지 말고 새로운 관점 위주로 blindSpots를 뽑을 것]:\n${known.map((e) => `- ${e.text}`).join("\n")}\n`;
    } catch { return ""; }
  })()}
다음은 유튜브에서 높은 조회수 또는 반응을 얻은 영상의 [메타데이터]와 [전체 자막/대본(타임스탬프 포함)]입니다.
이 대본이 실제로 어떻게 흘러가는지 시각과 원문 인용을 붙여 기록하세요. 대본으로 알 수 없는 것은 "확인 불가"라고 쓰고, 칸을 억지로 채우지 마세요.
storyArchitecture의 구간 수와 이름은 이 영상의 실제 흐름대로 정합니다(아래 예시 5칸을 따르지 않아도 됩니다).

---
### [분석 대상 영상 정보]
- **제목**: ${videoMeta.title}
- **채널명**: ${videoMeta.channelTitle}
- **조회수**: ${videoMeta.viewCount.toLocaleString()}회 | 좋아요: ${videoMeta.likeCount.toLocaleString()}개
- **전체 자막 텍스트**:
"""
${transcriptData.fullText}
"""

---
### [반드시 아래 JSON 포맷으로만 응답하세요 (JSON 외의 다른 텍스트는 출력하지 마세요)]

\`\`\`json
{
  "hookingAnatomy": {
    "technique": "도입부에서 실제로 한 일을 자기 말로(미리 정한 유형 이름을 쓰지 않는다)",
    "openingHookQuote": "도입부 첫 5초의 핵심 멘트 원문",
    "whyItWorked": "왜 시청자가 스크롤을 멈추고 집중할 수밖에 없었는지 심리적 이유 분석"
  },
  "storyArchitecture": [
    {
      "step": "1. 도입 (Hook)",
      "timeRange": "0:00 ~ 0:08",
      "summary": "핵심 전개 내용",
      "pacingNote": "시청 지속시간 유지 포인트"
    },
    {
      "step": "2. 문제 제기 & 공감 (Pain & Contrast)",
      "timeRange": "0:08 ~ 0:20",
      "summary": "우리가 흔히 틀리는 발음/오해 제시",
      "pacingNote": "..."
    },
    {
      "step": "3. 핵심 비유 & 원리 해설 (Core Metaphor)",
      "timeRange": "0:20 ~ 0:40",
      "summary": "어려운 규칙을 쉽게 납득시킨 비유",
      "pacingNote": "..."
    },
    {
      "step": "4. 실전 훈련 & 낭독 (Practice & Drill)",
      "timeRange": "0:40 ~ 0:52",
      "summary": "입모양 및 발음 가이드",
      "pacingNote": "..."
    },
    {
      "step": "5. 엔딩 & 행동 유도 (Outro & CTA)",
      "timeRange": "0:52 ~ 1:00",
      "summary": "마무리 요약 및 다음 편 연결",
      "pacingNote": "..."
    }
  ],
  "coreMetaphors": [
    {
      "concept": "설명한 영어 소리/문법",
      "metaphorUsed": "사용된 일상적 비유/한국어 개념 (예: 부엉이 소리 '우', 혀끝 튕기기 등)",
      "evaluation": "비유의 직관성 및 효과 평가"
    }
  ],
  "blindSpots": [
    "경쟁사 대본에서 설명이 부족했거나 시청자가 여전히 헷갈려 할 만한 아쉬운 점 1",
    "경쟁사 대본의 맹점 2"
  ],
  "ourAdaptedScript": {
    "recommendedTitle": "이 영상의 구조를 참고한 우리 채널용 제목 후보",
    "openingHook": "첫 3초 멘트 후보",
    "corePrincipleExplanation": "이 영상이 설명한 원리를 우리 시청자에게 쉬운 말로 옮긴 설명",
    "longformStructure": {
      "step1_Hook": "...",
      "step2_CardDisplay": "자막 카드에 띄울 한글 발음 표기 및 영어 단어",
      "step3_Principle": "소리가 변하는 원리 해설",
      "step4_RepetitionDrill": "3060 성인 학습자를 위한 3회 반복 낭독 유도",
      "step5_Outro": "고정댓글/다음 EP 유도 멘트"
    },
    "shortsTrackA": {
      "concept": "Track A 원리형 (30초)",
      "scriptText": "쇼츠 Track A 완성 대본 전문"
    },
    "shortsTrackB": {
      "concept": "Track B 실전 대화/상황극형 (30초)",
      "scriptText": "쇼츠 Track B 완성 대본 전문"
    }
  }
}
\`\`\`
`;

  const models = [...GEMINI_TEXT_MODELS];
  let lastError = null;

  for (const model of models) {
    try {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: AbortSignal.timeout(45_000),
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.2,
            responseMimeType: "application/json",
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || `Gemini API error: ${res.status}`);
      }
      const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawText) throw new Error("Empty response from Gemini");

      const jsonMatch = rawText.match(/```json\s*([\s\S]+?)\s*```/) || [null, rawText];
      return JSON.parse(jsonMatch[1].trim());
    } catch (err) {
      lastError = err;
    }
  }

  console.warn(`  ⚠ Gemini 대본 분석 실패: ${lastError?.message}`);
  if (throwOnError) {
    throw new Error(`Gemini 대본 분석 실패: ${lastError?.message || "알 수 없는 오류"}`);
  }
  return null;
}

export function generateScriptMarkdownReport(videoMeta, transcriptData, aiInsights) {
  const dateStr = new Date().toISOString().split("T")[0];
  const isMyChannel = videoMeta.channelId === "UCwNrEdm2jYAtUlfHVvH3WQw" ||
    (videoMeta.channelTitle && (videoMeta.channelTitle.includes("이해하면 쉬운 영어") || videoMeta.channelTitle.includes("이해하면 쉬운영어")));

  let md = `# 📜 아웃라이어 영상 대본·스크립트 역설계 리포트: ${videoMeta.title}\n\n`;
  md += `- **분석 유형**: ${isMyChannel ? "🏠 **우리 채널 시그니처 영상 (자체 대본 구조 검증)**" : "🎯 **외부 경쟁 채널 벤치마크 (대본 역설계 & 10x 업그레이드)**"}\n`;
  md += `- **분석 일자**: ${dateStr}\n`;
  md += `- **대상 영상**: [${videoMeta.title}](https://youtube.com/watch?v=${videoMeta.videoId})\n`;
  md += `- **채널명**: ${videoMeta.channelTitle} ${isMyChannel ? "(★ 우리 채널)" : ""}\n`;
  md += `- **조회수**: ${videoMeta.viewCount.toLocaleString()}회 | **자막 라인수**: ${transcriptData.lineCount}행\n\n`;
  md += `---\n\n`;

  if (aiInsights) {
    const h = aiInsights.hookingAnatomy || {};
    md += `## 🎯 1. 첫 5~15초 후킹 구조 해부 (Hooking Anatomy)\n\n`;
    md += `- **후킹 기법**: \`${h.technique || "후킹 분석"}\`\n`;
    md += `- **오프닝 멘트**: > "${h.openingHookQuote || ""}"\n`;
    md += `- **시청자가 멈춘 이유**: ${h.whyItWorked || ""}\n\n`;

    md += `## 📐 2. 대본 전개 타임라인 (Story & Logic Architecture)\n\n`;
    md += `| 단계 | 구간 | 핵심 내용 | 시청지속(Retention) 포인트 |\n`;
    md += `|---|---|---|---|\n`;
    (aiInsights.storyArchitecture || []).forEach((s) => {
      md += `| **${s.step}** | \`${s.timeRange}\` | ${s.summary} | ${s.pacingNote || "-"} |\n`;
    });
    md += `\n`;

    if (aiInsights.coreMetaphors?.length) {
      md += `## 💡 3. 핵심 비유법 & 개념 앵커 (Metaphor & Anchor)\n\n`;
      aiInsights.coreMetaphors.forEach((m, idx) => {
        md += `${idx + 1}. **${m.concept}** ➔ \`${m.metaphorUsed}\`\n   - *효과 평가*: ${m.evaluation}\n`;
      });
      md += `\n`;
    }

    if (aiInsights.blindSpots?.length) {
      md += `## ⚠️ 4. 경쟁사 대본의 맹점 (우리가 공략할 빈틈)\n\n`;
      aiInsights.blindSpots.forEach((b, idx) => {
        md += `${idx + 1}. ${b}\n`;
      });
      md += `\n`;
    }

    if (aiInsights.ourAdaptedScript) {
      const a = aiInsights.ourAdaptedScript;
      md += `## 🎬 5. '이해하면 쉬운영어' 채널 맞춤 재해석 대본 템플릿\n\n`;
      md += `### 📌 추천 제목: **${a.recommendedTitle || ""}**\n`;
      md += `> **첫 3초 후킹**: "${a.openingHook || ""}"\n\n`;
      md += `> **소리 원리 가이드**: ${a.corePrincipleExplanation || ""}\n\n`;

      if (a.longformStructure) {
        md += `### 📖 롱폼 대본 전개 가이드\n`;
        Object.entries(a.longformStructure).forEach(([k, v]) => {
          md += `- **${k}**: ${v}\n`;
        });
        md += `\n`;
      }

      if (a.shortsTrackA) {
        md += `### ⚡ 쇼츠 Track A (원리형 30초)\n`;
        md += `\`\`\`text\n${a.shortsTrackA.scriptText || a.shortsTrackA.concept || ""}\n\`\`\`\n\n`;
      }

      if (a.shortsTrackB) {
        md += `### 🎭 쇼츠 Track B (상황극/대화형 30초)\n`;
        md += `\`\`\`text\n${a.shortsTrackB.scriptText || a.shortsTrackB.concept || ""}\n\`\`\`\n\n`;
      }
    }
  }

  md += `---\n\n`;
  md += `## 📜 원본 자막 전문 (Full Transcript)\n\n`;
  md += `> ${transcriptData.fullText.replace(/\n/g, "\n> ")}\n`;

  return md;
}

export async function analyzeSingleScript(videoId, options = {}) {
  const {
    ytKey = YOUTUBE_API_KEY,
    geminiKey = GEMINI_API_KEY,
    fetchMetaFn = fetchVideoDetails,
    extractTranscriptFn = extractTranscript,
    analyzeWithGeminiFn = analyzeScriptWithGemini,
    onDnaEntries = null,
    shouldAbortWrite = null,
  } = options;

  console.log(`\n========================================`);
  console.log(`🔍 영상 대본/자막 심층 분석 시작: ${videoId}`);
  console.log(`========================================`);

  // 1. Fetch Video Details
  console.log(`▶ 1/3 영상 메타데이터 조회 중...`);
  const meta = await fetchMetaFn(videoId, ytKey);
  if (!meta) {
    throw new Error("이 영상을 찾을 수 없습니다(비공개이거나 삭제됐을 수 있습니다).");
  }
  console.log(`   제목: "${meta.title}" (${meta.channelTitle})`);

  // 2. Extract Transcript
  console.log(`▶ 2/3 영상 자막/스크립트 추출 중...`);
  const transcriptData = await extractTranscriptFn(videoId);
  console.log(`   자막 추출 완료 (${transcriptData.lineCount}행, ${transcriptData.languageName})`);

  // 3. Gemini AI Analysis
  console.log(`▶ 3/3 Gemini AI 대본 구조 역설계 및 재해석 중...`);
  const aiInsights = await analyzeWithGeminiFn(meta, transcriptData, geminiKey, { throwOnError: true });
  if (!aiInsights) {
    throw new Error("Gemini 대본 분석이 결과를 돌려주지 않았습니다(쿼터·응답 형식 문제일 수 있음).");
  }

  if (shouldAbortWrite?.()) {
    return null;
  }

  // 4. Save Artifacts
  const safeTitle = meta.title.replace(/[\\/:*?"<>|]/g, "_").slice(0, 50).trim();
  const filePrefix = `${safeTitle}_${videoId}`;
  const jsonPath = join(dataScriptInsightsDir, `${filePrefix}.json`);
  const mdPath = join(outputScriptInsightsDir, `${filePrefix}.md`);

  const reportPayload = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    videoId,
    video: meta,
    transcript: transcriptData,
    aiInsights,
  };

  const mdContent = generateScriptMarkdownReport(meta, transcriptData, aiInsights);

  writeFileSync(jsonPath, JSON.stringify(reportPayload, null, 2), "utf8");
  writeFileSync(mdPath, mdContent, "utf8");

  // 2026-11-12: 대본 분석 결과는 더 이상 시청자 고민(audience-dna.json)에 넣지 않는다.
  // blindSpots는 시청자 말이 아니라 AI가 추측한 "경쟁 영상의 빈틈"이었고 painPoint로 저장돼 시청자 고민과 섞였다(26개).
  // coreMetaphors도 시청자 표현이 아니라 경쟁 강사의 비유였다(15개). 시청자 고민은 댓글에서 온 것만 쓴다(knowledge/data-consumption-map.md).

  console.log(`\n✅ 대본 분석 리포트 저장 완료:`);
  console.log(`   - JSON: ${jsonPath}`);
  console.log(`   - Markdown: ${mdPath}\n`);

  return {
    ...reportPayload,
    markdown: mdContent,
    file: `${filePrefix}.md`,
  };
}

// CLI Execution
if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const args = process.argv.slice(2);
  const urlArg = args.find((a) => a.startsWith("--url="))?.slice("--url=".length);
  const videoArg = args.find((a) => a.startsWith("--video="))?.slice("--video=".length);

  const targetId = extractVideoId(urlArg || videoArg || args[0]);
  if (!targetId) {
    console.log(`
사용법:
  node scripts/analyze-competitor-script.mjs --url="https://youtube.com/watch?v=..."
  node scripts/analyze-competitor-script.mjs --video="<videoId>"
`);
    process.exit(0);
  }

  analyzeSingleScript(targetId)
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("❌ 오류:", err.message);
      process.exit(1);
    });
}
