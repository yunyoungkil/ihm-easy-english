import test from 'node:test';
import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import path from 'node:path';

import {
  COMMON_CRITERIA,
  ENGLISH_CRITERIA,
  READER_REVIEW_MODEL,
  TECH_CRITERIA,
  buildReaderReviewPrompt,
  buildReaderRevisionPrompt,
  getBlogReviewCriteria,
  parseVerdict,
  reviewBlogDraft,
} from '../blog/reader-review.mjs';

test('기준 구성: 공통 6개 + 쿠팡 3개 = 9개, 공통 6개 + 영어 4개 = 10개', () => {
  assert.equal(READER_REVIEW_MODEL, 'claude-opus-5-5');
  assert.equal(COMMON_CRITERIA.length, 6);
  assert.equal(TECH_CRITERIA.length, 3);
  assert.equal(ENGLISH_CRITERIA.length, 4);
  assert.equal(getBlogReviewCriteria('tech').length, 9);
  assert.equal(getBlogReviewCriteria('english').length, 10);
});

test('buildReaderReviewPrompt: 블로그별 전용 기준·최근 제목·초안 정보를 모두 담는다', () => {
  const draft = {
    title: '삼성페이 교통카드가 안 찍힐 때 NFC·유심부터 확인하세요',
    description: '삼성페이 교통카드가 안 찍히면 NFC 모드와 교통카드 중복부터 봅니다.',
    notUsedNote: '직접 시험하지 않고 공식 안내를 정리했습니다.',
    heroImage: {moment: 'subway gate reader glowing red', alt: '개찰구에서 휴대폰이 안 찍히는 순간.'},
    bodyHtml: '<p>본문</p>',
    product: {query: '갤럭시 케이스', why: '카드 간섭 방지'},
  };
  const techPrompt = buildReaderReviewPrompt({
    draft,
    topic: {kind: 'fix', targetKeyword: '삼성페이 교통카드'},
    recentTitles: ['맥세이프 카드지갑 점검 순서'],
    blog: 'tech',
  });
  assert.ok(techPrompt.includes('가전·디지털 해결 노트(tech.d40m.com)'));
  assert.ok(techPrompt.includes('[title-click]'));
  assert.ok(techPrompt.includes('[tech-probable-safe-order]'));
  assert.ok(techPrompt.includes('[tech-honest-not-fit]'));
  assert.ok(techPrompt.includes('[tech-product-and-note-spot]'));
  assert.ok(!techPrompt.includes('[english-not-transcript]'));
  assert.ok(techPrompt.includes('맥세이프 카드지갑 점검 순서'));
  assert.ok(techPrompt.includes('subway gate reader glowing red'));

  const englishPrompt = buildReaderReviewPrompt({draft, blog: 'english'});
  assert.ok(englishPrompt.includes('이해하면 쉬운영어 복습 노트(english.d40m.com)'));
  assert.ok(englishPrompt.includes('[english-not-transcript]'));
  assert.ok(englishPrompt.includes('[english-ad-spacing-safety]'));
  assert.ok(!englishPrompt.includes('[tech-probable-safe-order]'));
});

test('parseVerdict: pass·revise 정상 JSON은 통과하고 깨진 형식·이유 없는 revise는 거부한다', () => {
  assert.deepEqual(
    parseVerdict(JSON.stringify({verdict: 'pass', summary: '첫 화면과 표가 깔끔합니다.', issues: []})),
    {verdict: 'pass', summary: '첫 화면과 표가 깔끔합니다.', issues: []},
  );
  const rev = parseVerdict(JSON.stringify({
    verdict: 'revise',
    summary: '줄글 벽 보완 필요',
    issues: [{criterion: 'scannable-flow', problem: '수치가 줄글로만 쓰임', fix: '비교표 1개 추가'}],
  }));
  assert.equal(rev.verdict, 'revise');
  assert.equal(rev.issues.length, 1);
  assert.equal(rev.issues[0].criterion, 'scannable-flow');

  assert.equal(parseVerdict('not json'), null);
  assert.equal(parseVerdict(JSON.stringify({verdict: 'unknown', issues: []})), null);
  assert.equal(parseVerdict(JSON.stringify({verdict: 'revise', issues: []})), null);
});

test('buildReaderRevisionPrompt: 지적 항목과 검증된 steps·출처 보존 제약을 포함한다', () => {
  const prompt = buildReaderRevisionPrompt({
    basePrompt: 'BASE_PROMPT',
    draft: {title: '제목', steps: [{text: '단계1'}]},
    review: {issues: [{criterion: 'scannable-flow', problem: '표 없음', fix: '규격 표 추가'}]},
  });
  assert.ok(prompt.includes('BASE_PROMPT'));
  assert.ok(prompt.includes('[scannable-flow] 표 없음 → 수정 방향: 규격 표 추가'));
  assert.ok(prompt.includes('steps[].text'));
  assert.ok(prompt.includes('notUsedNote'));
});

test('reviewBlogDraft: verdict.json을 읽어 pass·revise·실패를 정확히 반환한다', async () => {
  const passRes = await reviewBlogDraft({
    draft: {title: '제목', bodyHtml: '<p>글</p>'},
    runClaude: async ({cwd}) => {
      await writeFile(path.join(cwd, 'verdict.json'), JSON.stringify({verdict: 'pass', summary: '좋음', issues: []}), 'utf8');
      return {ok: true};
    },
  });
  assert.deepEqual(passRes, {ok: true, verdict: 'pass', summary: '좋음', issues: []});

  const revRes = await reviewBlogDraft({
    draft: {title: '제목', bodyHtml: '<p>글</p>'},
    runClaude: async ({cwd}) => {
      await writeFile(
        path.join(cwd, 'verdict.json'),
        JSON.stringify({verdict: 'revise', summary: '첫 화면 보완', issues: [{criterion: 'answer-first-hook', problem: '답이 늦음', fix: '첫 문단에 결론 배치'}]}),
        'utf8',
      );
      return {ok: true};
    },
  });
  assert.equal(revRes.ok, true);
  assert.equal(revRes.verdict, 'revise');
  assert.equal(revRes.issues.length, 1);

  const failRes = await reviewBlogDraft({
    draft: {title: '제목', bodyHtml: '<p>글</p>'},
    runClaude: async () => ({ok: false, error: '시간 초과'}),
  });
  assert.equal(failRes.ok, false);
  assert.ok(failRes.error.includes('시간 초과'));
});
