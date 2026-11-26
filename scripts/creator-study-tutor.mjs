// 대표님 1:1 발음 과외방 즉시 답변 · 맞춤 피드백 · 꼬리 질문 AI 선생님 모듈 (2026-11-26)
// 기존 프로젝트의 GEMINI_TEXT_MODELS와 .env의 GEMINI_API_KEY를 그대로 사용한다.

import {GEMINI_TEXT_MODELS} from './gemini-models.mjs';

const TUTOR_SYSTEM_RULES = [
  '당신은 영어 기초 단어 정도만 읽을 수 있는 한국인 성인 왕초보(30~60대) 대표님의 다정한 1:1 영어 발음·듣기 개인 선생님입니다.',
  '절대 금지: 음성학·언어학 전문 용어(파열음, 유성음, 무성음, 마찰음, 치찰음, 조음, 음운, 강세 음절, 음소, 구개음화, 발음 기호 /æ/ 등)를 절대 쓰지 마세요.',
  '말투: 거창하게 과장하거나 교과서처럼 딱딱하게 말하지 말고, 옆에서 차근차근 알려 주는 담백하고 편한 입말 존댓말로 쓰세요(예: "소리 내어" 대신 "소리 내서", "듣기가 편해져요").',
  '답변 형식(중요):',
  '1) 먼저 핵심 이유를 왕초보 눈높이로 3~4줄 안에 쉽게 설명하고, 일상 비유나 입·혀 모양 한 가지를 꼭 넣으세요.',
  '2) 이어서 비슷한 쉬운 예시 단어 2~3개와 "소리 내서 따라 해 볼 순서"를 1~2줄로 덧붙이세요.',
  '마크다운 기호(###, **, ``` 등)는 남발하지 말고 일반 문장과 짧은 줄바꿈으로 읽기 편하게 답하세요.',
].join('\n');

function extractContextSummary(sheet) {
  const topic = String(sheet?.topic || '').trim();
  const visual = (sheet?.rows || []).find((r) => r.key === 'visual');
  const cuts = visual?.ours?.cutPlan?.cuts || [];
  const words = [...new Set(cuts.flatMap((c) => (Array.isArray(c?.voiceEn) ? c.voiceEn : (c?.voiceEn ? [c.voiceEn] : []))))].slice(0, 12);
  return {topic, words};
}

export function buildQuestionPrompt({sheet, question, excerpt = '', cutNarration = '', cutEnglish = [], thread = []}) {
  const {topic, words} = extractContextSummary(sheet);
  const lines = [
    TUTOR_SYSTEM_RULES,
    '',
    `[이번 영상 주제] ${topic || '영어 발음·듣기'}`,
    words.length ? `[영상에 나오는 주요 영어] ${words.join(', ')}` : '',
    cutEnglish.length ? `[해당 장면의 영어 소리] ${cutEnglish.join(', ')}` : '',
    excerpt ? `[학생이 짚은 대본 문장] "${excerpt}"` : '',
    cutNarration && cutNarration !== excerpt ? `[해당 장면 전체 대본] "${cutNarration}"` : '',
  ].filter(Boolean);

  if (Array.isArray(thread) && thread.length) {
    lines.push('', '[지금까지 나눈 과외 대화]');
    for (const turn of thread.slice(-6)) {
      lines.push(`${turn.role === 'student' ? '학생' : '선생님'}: ${turn.text}`);
    }
    lines.push('', `[학생의 꼬리 질문] ${question}`, '앞선 설명을 반복하지 말고, 학생이 새로 막힌 부분에 초점을 맞춰 더 쉬운 비유와 예시로 답해 주세요.');
  } else {
    lines.push('', `[학생 질문] ${question}`, '위 질문에 바로 이해되도록 1:1 과외처럼 답해 주세요.');
  }
  return lines.join('\n');
}

export function buildGuessFeedbackPrompt({sheet, viewerQuestion, guess = ''}) {
  const {topic, words} = extractContextSummary(sheet);
  const q = String(viewerQuestion?.q || '').trim();
  const baseAnswer = String(viewerQuestion?.teacherAnswer || '').trim();
  const cleanGuess = String(guess || '').trim();
  return [
    TUTOR_SYSTEM_RULES,
    '',
    `[이번 영상 주제] ${topic || '영어 발음·듣기'}`,
    words.length ? `[영상 주요 영어] ${words.join(', ')}` : '',
    `[시청자 질문] ${q}`,
    baseAnswer ? `[참고 정답 핵심] ${baseAnswer}` : '',
    cleanGuess
      ? `[학생이 적어 본 내 생각] "${cleanGuess}"`
      : '[학생 상태] 아직 잘 몰라서 빈칸으로 두고 선생님 설명을 요청함.',
    '',
    cleanGuess
      ? '먼저 학생의 생각에서 잘 짚었거나 자연스러운 추측을 따뜻하게 받아 주고, 틀리거나 헷갈린 부분만 쉽게 바로잡아 주세요. 일상 비유/입모양 1가지 + 비슷한 쉬운 예시 단어 2~3개와 따라 해 볼 순서를 붙여 주세요.'
      : '학생이 기초 단계라 부담 없도록 아주 쉬운 비유와 입모양 1가지, 비슷한 쉬운 예시 단어 2~3개, 따라 해 볼 순서를 알려 주세요.',
  ].filter(Boolean).join('\n');
}

export async function callGeminiTutor(prompt, {apiKey, fetchImpl = fetch, models = GEMINI_TEXT_MODELS, timeoutMs = 22000} = {}) {
  const key = String(apiKey || '').trim();
  if (!key || key === 'YOUR_GEMINI_API_KEY_HERE') {
    throw new Error('.env 파일에 GEMINI_API_KEY 설정이 없어 즉시 답변을 불러올 수 없습니다.');
  }
  let lastErr = '응답을 받지 못했습니다.';
  for (const model of models) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}`;
      const res = await fetchImpl(url, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        signal: controller.signal,
        body: JSON.stringify({
          contents: [{role: 'user', parts: [{text: prompt}]}],
          generationConfig: {
            temperature: 0.45,
            // 생각 토큰이 출력 한도를 먹어 답이 중간에 잘리던 문제(700 → 잘림) 때문에 넉넉히 둔다.
            // thinkingBudget: 0은 gemini-3.5-flash가 "invalid argument"로 거절해 쓰지 않는다(2026-11-26 실측).
            maxOutputTokens: 4096,
          },
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        lastErr = data?.error?.message || `HTTP ${res.status}`;
        continue;
      }
      const text = (data?.candidates?.[0]?.content?.parts || [])
        .map((p) => p?.text || '')
        .join('')
        .trim();
      if (text) {
        return {text, model};
      }
      lastErr = `${model} 빈 응답`;
    } catch (err) {
      lastErr = err?.name === 'AbortError' ? `${model} 시간 초과` : String(err?.message || err);
    } finally {
      clearTimeout(timer);
    }
  }
  throw new Error(`AI 선생님 연결에 실패했습니다(${lastErr}). 질문은 안전하게 저장되어 있으니 잠시 후 다시 눌러 보세요.`);
}

export async function answerStudentQuestion(opts) {
  const prompt = buildQuestionPrompt(opts);
  return callGeminiTutor(prompt, opts);
}

export async function feedbackViewerGuess(opts) {
  const prompt = buildGuessFeedbackPrompt(opts);
  return callGeminiTutor(prompt, opts);
}
