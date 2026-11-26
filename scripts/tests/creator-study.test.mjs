import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {
  splitIntoSentences,
  buildViewerScriptBlocks,
  resolveFocusWords,
  collectReviewItems,
  patchCreatorStudy,
  saveCreatorStudy,
  loadCreatorStudy,
  applyStudyEditsToSheet,
  summarizeCreatorStudy,
} from '../creator-study.mjs';
import {renderCreatorStudySection, renderAnswerBody} from '../creator-study-view.mjs';
import {buildQuestionPrompt, buildGuessFeedbackPrompt, callGeminiTutor} from '../creator-study-tutor.mjs';

const makeSheet = (status = 'draft') => ({
  schemaVersion: 4,
  episodeId: 'ep99-test-study',
  format: 'SHORTS',
  topic: '테스트 주제',
  status,
  rows: [
    {
      key: 'visual',
      ours: {
        cutPlan: {
          cuts: [
            {t: 0, narration: '연어 살몬, 영어에선 엘을 안 읽어요. 정말 신기하죠?', voiceEn: ['salmon']},
            {t: 5, narration: '영수증도 피를 안 읽습니다.', voiceEn: ['receipt']},
          ],
        },
      },
    },
  ],
});

test('splitIntoSentences: 한국어·문장부호 기준으로 읽기 좋은 문장 블록을 만든다', () => {
  const s = splitIntoSentences('첫 번째 문장입니다. 두 번째 문장인가요? 세 번째!');
  assert.deepEqual(s, ['첫 번째 문장입니다.', '두 번째 문장인가요?', '세 번째!']);
});

test('buildViewerScriptBlocks: 시청자 순서대로 원어민 영어(voiceEn)와 한국어 문장을 함께 묶는다', () => {
  const sheet = makeSheet('draft');
  const study = patchCreatorStudy(
    {sheetId: 'ep99-test-study'},
    {action: 'set_cut_edit', cutIndex: 0, text: '연어 살몬은 엘을 빼고 읽어요. 간단하죠?', originalText: sheet.rows[0].ours.cutPlan.cuts[0].narration},
  );
  const blocks = buildViewerScriptBlocks(sheet, study);
  assert.equal(blocks.length, 2);
  assert.deepEqual(blocks[0].english, ['salmon']);
  assert.equal(blocks[0].isEdited, true);
  assert.equal(blocks[0].sentences.length, 2);
  assert.equal(blocks[1].isEdited, false);
  assert.deepEqual(blocks[1].english, ['receipt']);
});

test('resolveFocusWords: 저장된 과외 단어가 없으면 시트 voiceEn에서 자동 추출한다', () => {
  const words = resolveFocusWords(makeSheet('draft'), null);
  assert.equal(words.length, 2);
  assert.equal(words[0].word, 'salmon');
  assert.equal(words[1].word, 'receipt');
});

test('patchCreatorStudy + save/load + collectReviewItems + summarizeCreatorStudy 전체 순환', () => {
  const dir = mkdtempSync(join(tmpdir(), 'creator-study-'));
  try {
    let stA = loadCreatorStudy('ep-prev-01', dir);
    stA = patchCreatorStudy(stA, {action: 'update_focus_word', word: 'salmon', phoneticHint: '새먼', mouthTip: 'L 빼기', status: 'still_fuzzy', note: '혀가 자꾸 올라감'});
    stA = patchCreatorStudy(stA, {action: 'add_viewer_question', q: '왜 L이 남아 있나요?', teacherAnswer: '라틴어 어원 때문이에요.'});
    stA = patchCreatorStudy(stA, {action: 'add_line_question', cutIndex: 0, sentenceIndex: 0, excerpt: '연어 살몬', question: '살몬이 아니라 새먼인가요?'});
    saveCreatorStudy('ep-prev-01', stA, dir, new Date('2026-11-26T01:00:00Z'));

    const reloaded = loadCreatorStudy('ep-prev-01', dir);
    assert.equal(reloaded.focusWords[0].status, 'still_fuzzy');
    assert.equal(reloaded.lineQuestions.length, 1);
    assert.equal(reloaded.viewerQuestions.length, 1);
    assert.equal(reloaded.viewerQuestions[0].revealed, false);

    // 다른 편을 열 때 시작 30초 복습 카드 최대 2개 반환
    const reviews = collectReviewItems('ep-next-02', [reloaded]);
    assert.equal(reviews.length, 2);
    assert.equal(reviews[0].kind, 'word');
    assert.equal(reviews[0].word, 'salmon');

    // next-episode-input 요약
    const sum = summarizeCreatorStudy(dir);
    assert.equal(sum.totalFiles, 1);
    assert.equal(sum.fuzzyWords.length, 1);
    assert.equal(sum.curiousQuestions.length, 1);
    assert.equal(sum.openQuestions.length, 1);
  } finally {
    rmSync(dir, {recursive: true, force: true});
  }
});

test('applyStudyEditsToSheet: draft 시트만 반영하고 approved 시트는 차단한다', () => {
  const draft = makeSheet('draft');
  const study = patchCreatorStudy(
    {sheetId: 'ep99-test-study'},
    {action: 'set_cut_edit', cutIndex: 0, text: '내가 고친 첫 문장입니다.', originalText: draft.rows[0].ours.cutPlan.cuts[0].narration},
  );
  const {sheet: next, appliedCount} = applyStudyEditsToSheet(draft, study);
  assert.equal(appliedCount, 1);
  assert.equal(next.rows[0].ours.cutPlan.cuts[0].narration, '내가 고친 첫 문장입니다.');

  const approved = makeSheet('approved');
  assert.throws(() => applyStudyEditsToSheet(approved, study), /승인되거나 공개된 시트/);
});

test('renderCreatorStudySection: HTML 이스케이프·설명 기본 숨김·클라이언트 JS 문법 무결성 검증', () => {
  const sheet = makeSheet('draft');
  const study = {
    schemaVersion: 1,
    sheetId: 'ep99-test-study',
    scriptEdits: {},
    lineQuestions: [],
    freeQuestions: [],
    focusWords: [{word: 'salmon', phoneticHint: '새먼', mouthTip: 'L 안 읽음', status: 'unseen', note: ''}],
    viewerQuestions: [{id: 'vq-1', q: '테스트 <script>alert(1)</script>?', source: '테스트', teacherAnswer: '안전한 설명', curious: false, guess: '', revealed: false}],
  };
  const html = renderCreatorStudySection(sheet, study, []);
  assert.ok(html.includes('sec-study-room'));
  assert.ok(html.includes('&lt;script&gt;alert(1)&lt;/script&gt;'));
  // 선생님 설명은 기본으로 open 클래스가 붙지 않아야 한다
  assert.ok(html.includes('class="study-teacher-box" data-vq-answer="1"'));

  // 임베드된 <script> 문법 검사
  const match = html.match(/<script>([\s\S]*?)<\/script>/);
  assert.ok(match, '클라이언트 스크립트가 있어야 한다');
  assert.doesNotThrow(() => new Function(match[1]));
});

test('creator-study-tutor: 프롬프트에 왕초보 눈높이·전문용어 금지·질문 본질 안내가 들어가고 모델 폴백이 작동한다', async () => {
  const sheet = makeSheet('draft');
  const qPrompt = buildQuestionPrompt({
    sheet,
    question: '왜 salmon에서 L을 안 읽어요?',
    excerpt: '연어 살몬, 영어에선 엘을 안 읽어요.',
    cutEnglish: ['salmon'],
    thread: [{role: 'student', text: '처음 질문'}, {role: 'teacher', text: '처음 답'}],
  });
  assert.ok(qPrompt.includes('전문 용어'));
  assert.ok(qPrompt.includes('학생의 꼬리 질문'));
  assert.ok(qPrompt.includes('탈템플릿 원칙'));

  const gPrompt = buildGuessFeedbackPrompt({
    sheet,
    viewerQuestion: {q: '왜 L이 남아 있나요?', teacherAnswer: '라틴어 어원 때문'},
    guess: '옛날 사람이 오타를 낸 것 같아요',
  });
  assert.ok(gPrompt.includes('옛날 사람이 오타를 낸 것 같아요'));

  let calls = 0;
  const fakeFetch = async () => {
    calls += 1;
    if (calls === 1) return {ok: false, status: 503, json: async () => ({error: {message: 'busy'}})};
    return {ok: true, status: 200, json: async () => ({candidates: [{content: {parts: [{text: '쉽게 설명해 드릴게요!'}]}}]})};
  };
  const res = await callGeminiTutor(qPrompt, {apiKey: 'test-key', fetchImpl: fakeFetch, models: ['m1', 'm2']});
  assert.equal(res.model, 'm2');
  assert.equal(res.text, '쉽게 설명해 드릴게요!');
  assert.equal(calls, 2);
});

test('patchCreatorStudy: 꼬리 질문(thread)과 시청자 질문 맞춤 피드백(guessFeedback)을 저장한다', () => {
  let st = {
    sheetId: 'ep99-test-study',
    lineQuestions: [],
    freeQuestions: [],
    viewerQuestions: [{id: 'vq-1', q: '질문1', source: '테스트', teacherAnswer: '기본 답', curious: false, guess: '', revealed: false}],
  };
  st = patchCreatorStudy(st, {action: 'add_free_question', id: 'fq-1', question: '첫 질문', answer: '첫 답'});
  st = patchCreatorStudy(st, {action: 'append_question_thread', kind: 'free', id: 'fq-1', question: '꼬리 질문', answer: '꼬리 답'});
  assert.equal(st.freeQuestions[0].thread.length, 2);
  assert.equal(st.freeQuestions[0].thread[0].role, 'student');
  assert.equal(st.freeQuestions[0].thread[1].role, 'teacher');

  st = patchCreatorStudy(st, {action: 'update_viewer_question', id: 'vq-1', guess: '내 생각', guessFeedback: '맞춤 피드백'});
  assert.equal(st.viewerQuestions[0].guessFeedback, '맞춤 피드백');
  st = patchCreatorStudy(st, {action: 'append_question_thread', kind: 'viewer', id: 'vq-1', question: '추가 궁금증', answer: '추가 설명'});
  assert.equal(st.viewerQuestions[0].thread.length, 2);
});

test('renderAnswerBody: 소제목·중첩 목록·굵은 글씨·코드·인용·수식 화살표를 날것 기호 없이 HTML로 변환한다', () => {
  const md = [
    '### 1. 자음 + L 패턴',
    '#### ① `-alm` 묶음',
    '* **-alm**: `salmon` $\\rightarrow$ 새먼',
    '  * walk, talk, half',
    '> 규칙과 예외를 나눠 보면 쉽습니다.',
  ].join('\n');
  const html = renderAnswerBody(md);
  assert.ok(html.includes('1. 자음 + L 패턴'));
  assert.ok(html.includes('①'));
  assert.ok(html.includes('→'));
  assert.ok(html.includes('<b '));
  assert.ok(html.includes('<code '));
  assert.ok(html.includes('list-style-type:circle'));
  assert.ok(!html.includes('####'));
  assert.ok(!html.includes('###'));
  assert.ok(!html.includes('**'));
  assert.ok(!html.includes('`'));
  assert.ok(!html.includes('\\rightarrow'));
});
