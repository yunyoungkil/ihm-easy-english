// 블로그 전용 독자 눈 1회 검수 모듈 (2026-11-28 사용자 확정).
// 기계 검사(check-post.mjs: 대가 문구·써 본 척·금지어·출처 1:1 대조·AI 티 67규칙·그림 안전선)를 통과한 초안을
// 초안 작성 문맥과 분리된 상위 모델(Opus)이 '처음 들어온 검색 독자' 눈으로 딱 1회 점검한다.
// 숫자·틀 강제("소제목 5개" 등)는 AI 평균값을 만들므로 두지 않고, 독자 관점 질문형 기준만 쓴다.
import {spawn} from 'node:child_process';
import {mkdtemp, readFile, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';

export const READER_REVIEW_MODEL = 'claude-opus-5-5';
const REVIEW_TIMEOUT_MS = 300_000; // allow-literal: 독자 눈 1회 검수 최대 대기 시간(5분)
const RECENT_TITLES_LIMIT = 15; // allow-literal: 제목 반복 확인용 최근 발행 제목 최대 개수
const MAX_ISSUES = 5; // allow-literal: 1회 수정에 넘길 핵심 지적 최대 개수

export const COMMON_CRITERIA = [
  {
    id: 'title-click',
    name: '제목·검색 요약 클릭력',
    question: '뻔한 말("~점검 순서", "~총정리") 반복 없이, 검색자가 바로 알아보는 구체 증상·숫자·판단 기준이 앞쪽에 나와 있으며 과장·낚시가 없는가?',
  },
  {
    id: 'first-screen-synergy',
    name: '제목·첫 그림·첫 문단 시너지',
    question: '제목이 약속한 문제, 첫 그림이 보여 주는 순간(heroImage.moment/alt), 첫 문단이 여는 이야기가 한 장면으로 자연스럽게 이어지며, 휴대폰 첫 화면에서 서론·안내 문구에 밀려 답의 방향이 아래로 숨지 않았는가?',
  },
  {
    id: 'answer-first-hook',
    name: '첫 문단 결론 우선 훅',
    question: '유튜브처럼 애태우지 않고, 1문장 정확한 상황 공감 + 가장 먼저 볼 핵심 답·순서를 앞 2~3문장 안에 던져 뒤로 가기를 막는가?',
  },
  {
    id: 'scannable-flow',
    name: '훑어보기 가독성·스크롤 호흡',
    question: '긴 줄글 벽 없이 짧은 문단(모바일 3~4줄 안팎)과 내용이 바로 읽히는 소제목으로 끊어졌고, 수치·비교·단계에는 목록·표·굵은 표시가 자연스럽게 들어갔으며, 모든 구간 길이가 똑같은 기계 리듬으로 굳어 있지 않은가?',
  },
  {
    id: 'info-gain',
    name: 'AI 요약 대비 추가 가치',
    question: '구글 AI 요약이나 상위 글만 봐도 아는 뻔한 말("왜 중요한가") 대신, 이 글만의 알짜 하나(놓친 공식 규격·예외·흔한 실수·쉬운 비유)와 바로 써먹는 행동("어떻게 하는가")이 분명한가?',
  },
  {
    id: 'closing-and-ad-flow',
    name: '막다른 길 없는 끝맺음·광고 흐름',
    question: '글 끝에서 독자가 다음에 할 행동(관련 글·영상·서비스센터 등)이 자연스럽게 이어지며, 단가를 노린 억지 키워드나 읽기 흐름을 망치는 끊김이 없는가?',
  },
];

export const TECH_CRITERIA = [
  {
    id: 'tech-probable-safe-order',
    name: '확률·안전 우선 순서',
    question: '가장 흔하고 돈·위험이 안 드는 확인 단계부터 앞쪽에 배치했는가?',
  },
  {
    id: 'tech-honest-not-fit',
    name: '안 맞는 조건·사지 말아야 할 선 긋기',
    question: '구매·설치 전 확인 글이라면 "이런 집·기기에는 안 맞으니 안 사도 된다"는 정직한 기준이 분명한가?',
  },
  {
    id: 'tech-product-and-note-spot',
    name: '연결 상품 맥락 & 미사용 안내 자리',
    question: '추천 물건이 억지 끼워 팔기처럼 튀지 않고 해결 흐름에 자연스럽게 붙었으며, "직접 써 보지 않았다" 안내는 첫 화면 답을 가로막지 않는 자리에 놓였는가?',
  },
];

export const ENGLISH_CRITERIA = [
  {
    id: 'english-not-transcript',
    name: '영상 대본 복붙 탈피',
    question: '유튜브 말투·구독 유도를 그대로 옮기지 않고, 구글 검색으로 처음 들어온 독자도 글만 보고 이해되는 완성된 읽기 글인가?',
  },
  {
    id: 'english-3060-video-timing',
    name: '3060 눈높이 & 영상 재생 타이밍',
    question: '발음 원리가 학술 용어 없이 쉬운 일상 비유·입모양으로 풀렸고, 본문 속 유튜브 영상(자동 재생 금지)이 "지금 직접 들어 보고 싶다"는 자리에 놓였는가?',
  },
  {
    id: 'english-mini-study-room',
    name: '하단 미니 1:1 과외방 참여감',
    question: '핵심 단어 입모양 카드와 접어 둔(숨김) 질문이 한 번 눌러 맞춰 볼 흥미를 주며, 댓글·유튜브로 자연스럽게 이어지는가?',
  },
  {
    id: 'english-ad-spacing-safety',
    name: '영상·버튼과 광고 거리 안전선',
    question: '삽입된 유튜브 영상·소리·정답 펼치기 버튼 근처에 애드센스 광고가 붙지 않고 본문 글 구간과 분명히 떨어져 있는가?',
  },
];

/** 블로그 종류에 맞는 독자 눈 검수 기준 배열을 돌려준다. */
export function getBlogReviewCriteria(blog = 'tech') {
  const extra = blog === 'english' ? ENGLISH_CRITERIA : TECH_CRITERIA;
  return [...COMMON_CRITERIA, ...extra];
}

/** 초안 작성 문맥과 분리된 백지 독자 눈 검수 프롬프트를 만든다. */
export function buildReaderReviewPrompt({
  draft,
  topic = {},
  recentTitles = [],
  blog = 'tech',
  verdictRel = 'verdict.json',
} = {}) {
  const criteria = getBlogReviewCriteria(blog);
  const blogLabel = blog === 'english'
    ? '이해하면 쉬운영어 복습 노트(english.d40m.com)'
    : '가전·디지털 해결 노트(tech.d40m.com)';
  const recentLines = (Array.isArray(recentTitles) ? recentTitles : [])
    .filter((t) => typeof t === 'string' && t.trim())
    .slice(-RECENT_TITLES_LIMIT)
    .map((t) => `- ${t.trim()}`)
    .join('\n');

  const criteriaLines = criteria
    .map((c, idx) => `${idx + 1}. [${c.id}] ${c.name}: ${c.question}`)
    .join('\n');

  return [
    `당신은 "${blogLabel}"의 글을 처음 열어 보는 까다로운 한국어 검색 독자 겸 편집 검수자다.`,
    '기계 검사(대가 문구·써 본 척·금지어·출처 1:1 대조·AI 티 67규칙·그림 안전선)는 이미 통과했다. 그 항목은 다시 따지지 말고, 아래 독자 관점 기준만 냉정하게 본다.',
    '',
    '## 검수 기준',
    criteriaLines,
    '',
    '## 판정 원칙',
    '- 사소한 문장 취향이나 억지 흠잡기로 떨어뜨리지 않는다. 실제 독자가 첫 10초에 나가거나, 줄글 벽 때문에 못 읽거나, 제목·첫 그림·첫 문단이 어긋나거나, 핵심 가치가 빠진 분명한 문제가 있을 때만 "revise"를 준다.',
    '- 반대로 위 문제가 하나라도 뚜렷하면 눈감지 말고 "revise"를 주고, 고칠 지점과 구체적 수정 방향을 짧게 적는다(최대 5개).',
    '- 새로운 사실이나 출처에 없는 숫자를 지어내라고 지시하지 않는다. 기존 검증된 사실·인용문·안내 문구를 유지하면서 구성·제목·첫 문단·표/목록·순서를 다듬는 지시만 쓴다.',
    '',
    '## 최근 발행 제목 (비슷한 제목 틀 반복 확인용)',
    recentLines || '(없음)',
    '',
    '## 검수 대상 초안',
    `- 글 종류(kind): ${topic?.kind || 'fix'}`,
    `- 주 검색어(targetKeyword): ${topic?.targetKeyword || '(없음)'}`,
    `- 제목(title): ${draft?.title || ''}`,
    `- 검색 요약(description): ${draft?.description || ''}`,
    `- 첫 그림 장면(heroImage.moment): ${draft?.heroImage?.moment || ''}`,
    `- 첫 그림 설명(heroImage.alt): ${draft?.heroImage?.alt || ''}`,
    `- 미사용 안내(notUsedNote): ${draft?.notUsedNote || ''}`,
    `- 연결 상품(product): ${draft?.product ? `${draft.product.query || ''} — ${draft.product.why || ''}` : '(없음)'}`,
    '',
    '### 본문 HTML(bodyHtml)',
    String(draft?.bodyHtml || ''),
    '',
    `결과는 Write 도구로 정확히 "${verdictRel}" 경로에 순수 JSON 하나만 저장한다(코드 펜스·앞뒤 설명 없이):`,
    '{"verdict": "pass" 또는 "revise", "summary": "한 줄 총평", "issues": [{"criterion": "기준 id", "problem": "무엇이 문제인가", "fix": "어떻게 고칠까"}]}',
    '- verdict가 "pass"면 issues는 빈 배열 []로 둔다.',
    '- verdict가 "revise"면 issues는 1~5개 채운다.',
  ].join('\n');
}

/** 검수 결과 JSON 문자열을 검증·정규화한다. 형식이 틀리면 null. */
export function parseVerdict(raw) {
  let obj;
  try {
    obj = typeof raw === 'string' ? JSON.parse(raw) : raw;
  } catch {
    return null;
  }
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return null;
  if (obj.verdict !== 'pass' && obj.verdict !== 'revise') return null;
  const summary = typeof obj.summary === 'string' ? obj.summary.trim() : '';
  const rawIssues = Array.isArray(obj.issues) ? obj.issues : [];
  const issues = rawIssues
    .filter((it) => it && typeof it === 'object')
    .map((it) => ({
      criterion: String(it.criterion || '').trim(),
      problem: String(it.problem || '').trim(),
      fix: String(it.fix || '').trim(),
    }))
    .filter((it) => it.problem || it.fix)
    .slice(0, MAX_ISSUES);
  if (obj.verdict === 'revise' && issues.length === 0) return null;
  return {
    verdict: obj.verdict,
    summary,
    issues: obj.verdict === 'pass' ? [] : issues,
  };
}

/** 독자 눈 검수 지적만 반영해 앞 초안을 1회 다듬는 수정 프롬프트를 만든다. */
export function buildReaderRevisionPrompt({basePrompt, draft, review} = {}) {
  const issueLines = (review?.issues || []).map((it, idx) => {
    const tag = it.criterion ? `[${it.criterion}] ` : '';
    return `${idx + 1}. ${tag}${it.problem}${it.fix ? ` → 수정 방향: ${it.fix}` : ''}`;
  });
  return [
    String(basePrompt || '').trim(),
    '',
    '앞 초안은 사실·출처·AI 티·안전선 기계 검사를 이미 통과했다.',
    '다만 독자 눈 1회 검수에서 아래 가독성·클릭·구성 개선점이 지적됐다. 이 항목만 반영해 같은 파일에 다시 써라.',
    ...issueLines,
    '',
    '중요 제약:',
    '- 웹 검색·새 조사는 하지 마라. 출처에 없는 숫자나 사실을 지어내지 마라.',
    '- 이미 검증된 `sources`와 `steps[].source`(url·quote)는 그대로 유지하고, 모든 `steps[].text` 문장이 `bodyHtml` 안에 정확히 그대로 남아 있어야 한다(글자가 달라지면 기계 검사에서 탈락한다).',
    '- `notUsedNote` 문장도 `bodyHtml` 안에 정확히 그대로 남아 있어야 한다(위치는 첫 화면 답을 가로막지 않게 본문 중간·하단으로 옮겨도 된다).',
    '- 제목·검색 요약·첫 문단·소제목·표/목록·마무리 흐름만 다듬어 같은 JSON 형식으로 같은 파일에 Write 하라.',
    '앞 초안:',
    JSON.stringify(draft, null, 2),
  ].join('\n');
}

async function defaultRunClaude({prompt, cwd, timeoutMs = REVIEW_TIMEOUT_MS, exe} = {}) {
  const claudeExe = exe || (await import('./write-tech-post.mjs')).resolveClaudeExe();
  if (!claudeExe) return {ok: false, error: 'claude 실행 파일을 찾을 수 없습니다.'};
  const args = [
    '-p',
    '--model', READER_REVIEW_MODEL,
    '--restricted',
    '--tools', 'Write',
    '--allowedTools', 'Write',
    '--permission-mode', 'dontAsk',
    '--permission-prompts', 'none',
    '--output-format', 'json',
    '--no-session-persistence',
    '--strict-mcp-config',
    prompt,
  ];
  return new Promise((resolve) => {
    let settled = false;
    let stderr = '';
    const child = spawn(claudeExe, args, {cwd, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true});
    const finish = (res) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(res);
    };
    const timer = setTimeout(() => {
      try { child.kill('SIGTERM'); } catch { /* ignore */ }
      finish({ok: false, error: `독자 눈 검수 제한 시간(${timeoutMs}ms)을 초과했습니다.`});
    }, timeoutMs);
    child.stdout?.on?.('data', () => {});
    child.stderr?.on?.('data', (c) => { stderr += String(c); });
    child.on('error', (err) => finish({ok: false, error: `독자 눈 검수 실행 오류: ${err.message}`}));
    child.on('close', (code) => {
      finish(code === 0 ? {ok: true} : {ok: false, error: `독자 눈 검수 종료 코드 ${code}${stderr ? `: ${stderr.trim()}` : ''}`});
    });
  });
}

/**
 * 초안을 독자 눈으로 딱 1회 검수한다.
 * @returns {Promise<{ok:boolean, verdict?:'pass'|'revise', summary?:string, issues?:Array, error?:string}>}
 */
export async function reviewBlogDraft({
  draft,
  topic = {},
  recentTitles = [],
  blog = 'tech',
  exe,
  runClaude = defaultRunClaude,
  timeoutMs = REVIEW_TIMEOUT_MS,
} = {}) {
  const reviewDir = await mkdtemp(path.join(tmpdir(), 'blog-reader-review-'));
  const verdictRel = 'verdict.json';
  const verdictPath = path.join(reviewDir, verdictRel);
  const prompt = buildReaderReviewPrompt({draft, topic, recentTitles, blog, verdictRel});
  try {
    const res = await runClaude({prompt, cwd: reviewDir, timeoutMs, exe});
    if (!res?.ok) {
      return {ok: false, error: res?.error || '독자 눈 검수 실행에 실패했습니다.'};
    }
    let raw;
    try {
      raw = await readFile(verdictPath, 'utf8');
    } catch (err) {
      return {ok: false, error: `독자 눈 검수 결과 파일을 읽지 못했습니다(${err.code || err.message}).`};
    }
    const parsed = parseVerdict(raw);
    if (!parsed) {
      return {ok: false, error: '독자 눈 검수 결과 형식이 올바르지 않습니다.'};
    }
    return {ok: true, ...parsed};
  } finally {
    await rm(reviewDir, {recursive: true, force: true});
  }
}
