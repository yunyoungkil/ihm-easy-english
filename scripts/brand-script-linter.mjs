import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { lintNarration } from "./narration-lint.mjs";

const projectDir = dirname(dirname(fileURLToPath(import.meta.url)));
const envPath = join(projectDir, ".env");

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

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

/**
 * 3060 Brand Persona & HyperFrames Scene Linter Engine
 */
export async function lintBrandScript({ scriptText, topic = "", format = "SHORTS", apiKey = GEMINI_API_KEY }) {
  if (!scriptText || !scriptText.trim()) {
    throw new Error("대본 텍스트가 입력되지 않았습니다.");
  }

  // 1. Static Rule Linting (TTS slurring, excessive line lengths)
  const lines = scriptText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const staticViolations = [];
  let totalChars = 0;

  lines.forEach((line, idx) => {
    totalChars += line.length;
    // TTS Slurring check from narration-lint
    const ttsIssues = lintNarration(line);
    if (ttsIssues && ttsIssues.length > 0) {
      staticViolations.push({
        lineIndex: idx + 1,
        lineText: line,
        type: "TTS_PRONUNCIATION_GLITCH",
        message: `TTS 발음 뭉개짐 위험: ${ttsIssues.map(i => i.problem).join(", ")}`,
        fix: ttsIssues.map(i => i.fix).join(" / "),
      });
    }

    // Line length check (3060 adult learner readability: ideal 18~28 chars per line)
    if (line.length > 35) {
      staticViolations.push({
        lineIndex: idx + 1,
        lineText: line,
        type: "READABILITY_TOO_LONG",
        message: `한 줄 글자 수(${line.length}자) 초과: 3060 모바일 화면에서 호흡이 길어 이탈 위험 (권장 18~28자)`,
        fix: "문장을 2개로 분절하거나 불필요한 조사/수식어를 압축하세요.",
      });
    }
  });

  const avgCharsPerLine = lines.length > 0 ? Math.round(totalChars / lines.length) : 0;

  // 2. Gemini AI Deep Brand Linter & HyperFrames Scene Generator
  if (!apiKey) {
    // Fallback if no API key
    return {
      score: 75,
      grade: "B",
      pass: false,
      summary: "API 키 없이 정적 검사만 수행되었습니다. Gemini API 키 연동 시 정밀 도파민 3단계 검사 및 HyperFrames 씬 JSON이 자동 생성됩니다.",
      staticViolations,
      dopamineStages: {
        stage1_shortcut: { present: true, note: "정적 검사 모드" },
        stage2_expansion: { present: true, note: "정적 검사 모드" },
        stage3_twist: { present: false, note: "정적 검사 모드" },
      },
      readabilityCheck: {
        avgCharsPerLine,
        lineCount: lines.length,
        seniorFriendly: avgCharsPerLine <= 28,
      },
      improvedScript: scriptText,
      hyperFramesScenes: generateFallbackScenes(lines, topic, format),
    };
  }

  const prompt = `
당신은 대한민국 최고의 유튜브 영어 교육 콘텐츠 기획자이자 대본 디렉터입니다.
타겟 채널: **'이해하면 쉬운영어'**

채널 핵심 브랜드 철학 & 페르소나:
1. **톤앤매너**:
   - 가식 없는 솔직 담백한 실전 학습 파트너 ("기초가 전혀 없어도 괜찮습니다. 당신이 영어를 못했던 게 아니라 소리 나는 원리를 몰랐을 뿐입니다. 무작정 외우지 마세요.")
   - 선생님처럼 훈계하는 말투, 어려운 음성학 용어(비음화, 유음화, 연음 공식, IPA 기호) 절대 금지!
2. **독점 3단계 도파민 공식 (The Epiphany Formula)**:
   - **1단계: 게으른 혀의 소리 지름길 (원리 발견)** ➔ "미국인들도 혀를 편하게 하려고 이렇게 소리를 냅니다."
   - **2단계: 패턴 확장 (카타르시스)** ➔ "어? 이 원리가 다른 단어(A, B, C)에도 똑같이 통하네? 아싸!"
   - **3단계: 반전 꿀팁 (미세한 차이)** ➔ "어? 근데 왜 이건 다르게 소리 나지? 딱 요 사소한 차이 하나만 기억하세요!"
3. **3060 가독성 및 Cyber-HUD 비주얼 카드 맞춤**:
   - 한 줄당 18~28자 이내로 낭독 호흡이 편안해야 함.
   - 화면에 띄울 핵심 키워드(큰 글씨)가 명확해야 함.
   - 3회 반복 리듬감(원리 ➔ 듣기 ➔ 따라하기).

다음 [분석 대상 대본]을 엄격하게 심사하고, 채널 공식 규격에 맞는 **HyperFrames 씬(Scene) JSON**을 생성하세요.

[영상 주제]: ${topic || '영어 발음 및 회화 원리'}
[포맷]: ${format} (${format === 'SHORTS' ? '60초 이내 쇼츠' : '3~8분 롱폼'})
[대본 텍스트]:
${scriptText}

반드시 아래 JSON 형식으로만 응답하세요. 백틱 이외의 다른 설명 문구는 절대 출력하지 마세요.
\`\`\`json
{
  "score": 92,
  "grade": "A+",
  "pass": true,
  "summary": "3060 타겟 맞춤 원리 설명과 도파민 3단계 공식이 완벽하게 반영된 우수 대본입니다.",
  "dopamineStages": {
    "stage1_shortcut": {
      "present": true,
      "score": 95,
      "foundLine": "원리가 설명된 대본 문장 인용",
      "note": "게으른 혀의 소리 지름길이 직관적으로 잘 드러남"
    },
    "stage2_expansion": {
      "present": true,
      "score": 90,
      "foundLine": "단어 확장이 일어나는 문장 인용",
      "note": "2개 이상의 추가 단어로 쾌감 확장 완료"
    },
    "stage3_twist": {
      "present": true,
      "score": 88,
      "foundLine": "반전/주의점이 나오는 문장 인용",
      "note": "헷갈리기 쉬운 반전 꿀팁 제공"
    }
  },
  "readabilityCheck": {
    "avgCharsPerLine": ${avgCharsPerLine},
    "jargonFree": true,
    "jargonWordsFound": [],
    "seniorFriendly": true,
    "rhythmScore": 90
  },
  "violations": [
    {
      "lineIndex": 2,
      "lineText": "위반된 대본 원문",
      "type": "TONE_TOO_ACADEMIC / LINE_TOO_LONG / MISSING_DOPAMINE",
      "message": "구체적인 위반 사유",
      "suggestedFix": "3060 맞춤 친근한 교정 문장"
    }
  ],
  "improvedScript": "3단계 도파민 공식과 3060 낭독 호흡에 맞춰 100% 교정된 완성 대본 전문",
  "hyperFramesScenes": [
    {
      "sceneIndex": 1,
      "type": "hook",
      "spokenText": "30초 만에 Want와 Won't를 귀로 구분하는 비법!",
      "cardTitle": "WANT vs WON'T",
      "highlightWord": "입술 모양",
      "phoneticVisual": "👄 입술 힘 빼기",
      "durationSec": 5,
      "onScreenVisualTip": "칠흑 같은 블랙 배경 + 네온 옐로우 글로우 텍스트 카드"
    },
    {
      "sceneIndex": 2,
      "type": "rule",
      "spokenText": "원어민은 Want를 말할 때 절대 입술을 모으지 않습니다.",
      "cardTitle": "소리 지름길 원리",
      "highlightWord": "원리 해제",
      "phoneticVisual": "⚡ 원리 발견",
      "durationSec": 8,
      "onScreenVisualTip": "입모양 비교 그래픽"
    },
    {
      "sceneIndex": 3,
      "type": "expand",
      "spokenText": "이 원리는 다른 단어 Water, What에도 똑같이 통합니다!",
      "cardTitle": "패턴 확장 카타르시스",
      "highlightWord": "패턴 확장",
      "phoneticVisual": "🚀 3단 확장",
      "durationSec": 10,
      "onScreenVisualTip": "단어 카드 3개 순차 팝업"
    },
    {
      "sceneIndex": 4,
      "type": "twist",
      "spokenText": "근데 Won't는 왜 다를까요? 바로 입술을 오므려야 하기 때문입니다!",
      "cardTitle": "반전 꿀팁",
      "highlightWord": "딱 요 차이",
      "phoneticVisual": "💡 반전 꿀팁",
      "durationSec": 8,
      "onScreenVisualTip": "반전 강조 네온 레드/마젠타 박스"
    },
    {
      "sceneIndex": 5,
      "type": "outro",
      "spokenText": "이제 들리시죠? 하루 1분이면 영어가 쉬워집니다. 구독하고 매일 소리 비법을 받아보세요.",
      "cardTitle": "이해하면 쉬운 영어",
      "highlightWord": "소리 마스터",
      "phoneticVisual": "✨ 3060 힐링 파트너",
      "durationSec": 5,
      "onScreenVisualTip": "구독 & 다음 영상 안내 카드"
    }
  ]
}
\`\`\`
`;

  const models = ['gemini-flash-latest', 'gemini-2.5-flash-lite', 'gemini-3.7-flash', 'gemini-2.5-flash'];
  let lastError = null;

  for (const model of models) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.2,
            responseMimeType: "application/json",
          },
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Gemini ${model} error (${res.status}): ${errText}`);
      }

      const data = await res.json();
      const rawContent = data.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
      const cleaned = rawContent.replace(/^```json\s*/i, "").replace(/\s*```$/i, "").trim();
      const parsed = JSON.parse(cleaned);

      // Merge static violations with Gemini violations
      const allViolations = [
        ...staticViolations,
        ...(parsed.violations || []),
      ];

      return {
        ...parsed,
        violations: allViolations,
        staticViolationsCount: staticViolations.length,
      };
    } catch (err) {
      lastError = err;
      console.warn(`Model ${model} failed, trying next...:`, err.message);
    }
  }

  console.error("Gemini script linter all models error:", lastError);
  return {
    score: 70,
    grade: "B-",
    pass: false,
    summary: `AI 정밀 린팅 중 오류 발생: ${lastError?.message || "모델 응답 없음"}`,
    staticViolations,
    violations: staticViolations,
    dopamineStages: {
      stage1_shortcut: { present: true, note: "정적 검사 모드" },
      stage2_expansion: { present: false, note: "정적 검사 모드" },
      stage3_twist: { present: false, note: "정적 검사 모드" },
    },
    readabilityCheck: {
      avgCharsPerLine,
      lineCount: lines.length,
      seniorFriendly: avgCharsPerLine <= 28,
    },
    improvedScript: scriptText,
    hyperFramesScenes: generateFallbackScenes(lines, topic, format),
  };
}

function generateFallbackScenes(lines, topic, format) {
  const sceneCount = Math.max(3, Math.min(lines.length, 6));
  const types = ["hook", "rule", "expand", "twist", "outro"];
  const scenes = [];

  for (let i = 0; i < sceneCount; i++) {
    const text = lines[i] || `${topic} 핵심 원리 설명`;
    const type = types[i % types.length];
    scenes.push({
      sceneIndex: i + 1,
      type,
      spokenText: text,
      cardTitle: type === "hook" ? "30초 핵심 비법" : type === "rule" ? "소리 지름길 원리" : type === "expand" ? "패턴 확장" : type === "twist" ? "반전 꿀팁" : "이해하면 쉬운영어",
      highlightWord: topic.slice(0, 10) || "원리 해제",
      phoneticVisual: "⚡ 소리 마스터",
      durationSec: format === "SHORTS" ? 6 : 15,
      onScreenVisualTip: "칠흑 같은 블랙 배경 + 네온 옐로우 글로우 Cyber-HUD 룩",
    });
  }
  return scenes;
}
