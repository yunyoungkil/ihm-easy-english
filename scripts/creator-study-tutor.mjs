// 대표님 1:1 발음 과외방 즉시 답변 · 맞춤 피드백 · 꼬리 질문 AI 선생님 모듈 (2026-11-26)
// 기존 프로젝트의 GEMINI_TEXT_MODELS와 .env의 GEMINI_API_KEY를 그대로 사용한다.

import {GEMINI_TEXT_MODELS} from './gemini-models.mjs';

const TUTOR_SYSTEM_RULES = [
  '당신은 영어 왕초보 학생을 위한 1:1 과외 선생님입니다.',
  '사명: 학생의 질문 본질(글자 패턴, 소리가 빠지거나 이어지는 물리적 이유, 구별 기준 등)을 정확히 파악하여, 초등학생도 바로 이해할 수 있도록 명쾌하고 구체적으로 설명하세요.',
  '안전 가드레일: 음성학·언어학 전문 용어(파열음, 유성음, 무성음, 조음, 음운, 강세 음절, 음소, 발음기호 /æ/ 등)는 절대 쓰지 마세요.',
  '탈템플릿 원칙: 인위적인 답변 형식이나 고정된 줄 수, 억지 비유, 판에 박힌 마무리 인사를 강제하지 않습니다. 학생이 묻는 질문의 성격에 맞게 자율적이고 살아있는 설명으로 답하세요.',
  '금지 사항: "그냥 외우세요", "그냥 빼고 읽으시면 돼요", "마치 선글라스를 낀 것처럼" 같은 추상적이거나 무책임한 멋부리기 답변은 엄격히 금지합니다.',
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
    lines.push('', `[학생의 꼬리 질문] ${question}`, '앞선 설명을 겉핥기로 반복하지 말고, 학생이 무엇을 궁금해하는지 핵심을 짚어 명쾌하게 설명해 주세요.');
  } else {
    lines.push('', `[학생 질문] ${question}`, '학생 질문의 본질을 정확히 짚어 1:1 과외처럼 알기 쉽게 답해 주세요.');
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
      ? '학생의 생각을 살펴보고, 잘 짚은 부분은 인정해 주며 헷갈린 원리를 이해하기 쉽게 짚어 주세요.'
      : '학생이 부담 없이 핵심 원리를 이해할 수 있도록 쉽게 설명해 주세요.',
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
