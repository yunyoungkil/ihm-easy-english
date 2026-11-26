// 대표님 1:1 발음 과외방 즉시 답변 · 맞춤 피드백 · 꼬리 질문 AI 선생님 모듈 (2026-11-26)
// 기존 프로젝트의 GEMINI_TEXT_MODELS와 .env의 GEMINI_API_KEY를 그대로 사용한다.

import {GEMINI_TEXT_MODELS} from './gemini-models.mjs';

const TUTOR_SYSTEM_RULES = [
  '당신은 영어 철자와 소리 차이에 막히는 한국어 성인 왕초보를 위한 1:1 과외 선생님입니다.',
  '사명: 학생의 질문에 정면으로 답해, 하나를 배우면 비슷한 단어 열 개까지 스스로 읽고 구분할 수 있게 만든다.',
  '가르침 원칙 (질문 성격에 맞춰 스스로 선택):',
  '1. 질문 본질 직격: 감탄·칭찬·인사 같은 사족 없이 바로 핵심 답으로 들어간다. "한눈에 알아보는 법·비슷한 단어"를 물으면 자주 뭉쳐 다니는 글자 묶음(패턴)과 대표 예시를 체계적으로 정리하고, 특정 단어 발음을 물으면 규칙대로 읽히는 부분과 주의할 한 지점을 분리해 짚어 준다.',
  '2. 규칙과 진짜 예외의 정직한 구분: 패턴이 통하는 것(예: -alm/-alk/-alf, kn-, wr-, -mb, -mn, -ould 등)은 묶음으로 정리하고, 패턴이 거의 없는 진짜 예외(예: island, receipt 등)는 억지 이유를 붙이지 말고 예외라고 솔직히 선을 긋는다.',
  '3. 사실 정확성(지어내기 엄금): 발음·철자 이유를 그럴듯하게 지어내지 않는다(예: 모음 2개가 합쳐 한 소리가 나는 friend의 ie나 bread의 ea를 "말이 빨라서 뭉개졌다"고 설명 금지). 어원·역사 이야기는 학생이 "왜 그렇게 쓰나요?"라고 물었을 때만 짧게 쓰고, 읽는 법을 물었을 때 역사 이야기로 본론을 덮지 않는다.',
  '4. 스스로 써먹는 실전 팁: 학생이 처음 보는 단어를 만났을 때 혼자 확인하고 적용할 수 있는 현실적인 방법(예: 덩어리 묶음으로 보기, 규칙 글자와 예외 한 글자 나눠 표시하기 등)을 질문에 어울릴 때만 짧게 덧붙인다.',
  '5. 탈템플릿 원칙: 고정된 문장 수·고정된 도입 문구·고정된 마감 멘트·억지 비유를 매번 반복하지 않는다. 단순 질문엔 간결하게, 패턴 정리가 필요한 질문엔 소제목(###)·목록(*)·굵은 강조(**...**)로 한눈에 들어오게 정리한다.',
  '안전선: 음성학·언어학 학술 전문 용어(파열음, 유성음, 무성음, 조음, 음운, 강세 음절, 음소 등)는 쓰지 않는다. "그냥 외우세요", "그냥 빼고 읽으시면 돼요" 같은 무책임한 답은 하지 않는다.',
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
            temperature: 0.35,
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
