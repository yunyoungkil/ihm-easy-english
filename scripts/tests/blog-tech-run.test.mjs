import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {mkdir, mkdtemp, readFile, rm, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';

import {
  readPause,
  readPosts,
  readQueue,
  readRuns,
  writePause,
} from '../blog/blog-store.mjs';
import {DISCLOSURE} from '../blog/check-post.mjs';
import {
  MAX_CONSECUTIVE_REJECTS,
  WRITING_WEEKDAYS,
  pickMatchingProduct,
  runTechOnce,
} from '../blog/tech-run.mjs';

const KST_WED_2AM = new Date('2026-11-24T17:00:00Z'); // KST 2026-11-25 02:00 (수)
const KST_THU_10AM = new Date('2026-11-26T01:00:00Z'); // KST 2026-11-26 10:00 (목)

async function withProject(fn) {
  const dir = await mkdtemp(path.join(tmpdir(), 'blog-tech-run-'));
  const blogDir = path.join(dir, 'data', 'blog');
  await mkdir(blogDir, {recursive: true});
  await writeFile(
    path.join(blogDir, 'blogs.json'),
    JSON.stringify({tech: {blogId: '6595948324958151051', url: 'https://tech.d40m.com/'}}),
    'utf8',
  );
  try {
    await fn(dir, blogDir);
  } finally {
    await rm(dir, {recursive: true, force: true});
  }
}

function makeTopic(topicId = 'dyson-v8-red-blink') {
  return {
    topicId,
    title: '다이슨 V8 빨간불 깜빡임 확인 순서',
    kind: 'fix',
    searchQuery: '다이슨 V8 빨간불 깜빡임 공식 지원',
    sourceHints: ['https://www.dyson.co.kr/support'],
    productHint: '다이슨 V8 호환 어댑터 26.1V',
  };
}

function makeDraft(topicId = 'dyson-v8-red-blink', product = null) {
  return {
    topicId,
    title: '다이슨 V8 빨간불 깜빡임 확인 순서',
    labels: ['가전', '무선청소기'],
    notUsedNote: '이 글은 직접 써 보지 않고 제조사 공식 안내를 정리했습니다.',
    bodyHtml: '<p>이 글은 직접 써 보지 않고 제조사 공식 안내를 정리했습니다.</p><p>충전 어댑터를 콘센트에 다시 연결합니다.</p>',
    steps: [
      {
        text: '충전 어댑터를 콘센트에 다시 연결합니다.',
        source: {url: 'https://www.dyson.co.kr/support', quote: '어댑터 연결을 확인하세요.'},
      },
    ],
    sources: [{url: 'https://www.dyson.co.kr/support', title: '다이슨 공식 지원'}],
    product,
  };
}

function makeBaseDeps(overrides = {}) {
  const calls = {
    runWriter: 0,
    searchProducts: 0,
    deeplink: 0,
    publishToBlogger: 0,
    verifyLive: 0,
    syncData: 0,
    writePause: 0,
  };
  const deps = {
    getBlogAccessToken: async () => 'tok-valid',
    resolveClaudeExe: () => 'C:\\fake\\claude.exe',
    buildWriterPrompt: async (topic, {draftPath}) => `PROMPT:${topic.topicId}:${draftPath}`,
    runWriter: async () => {
      calls.runWriter += 1;
      return {ok: true, draft: makeDraft()};
    },
    searchProducts: async () => {
      calls.searchProducts += 1;
      return [];
    },
    deeplink: async (urls) => {
      calls.deeplink += 1;
      return urls.map((u) => ({originalUrl: u, shortenUrl: 'https://link.coupang.com/a/short'}));
    },
    checkTechPost: async () => ({ok: true, problems: []}),
    publishToBlogger: async ({blogId, title}) => {
      calls.publishToBlogger += 1;
      return {postId: 'post-101', url: `https://tech.d40m.com/${blogId}/${encodeURIComponent(title)}.html`};
    },
    verifyLive: async () => {
      calls.verifyLive += 1;
      return {ok: true, problems: []};
    },
    syncData: async () => {
      calls.syncData += 1;
      return {committed: 3, pushed: true};
    },
    ...overrides,
  };
  return {deps, calls};
}

test('상수: WRITING_WEEKDAYS는 월·수·금([1,3,5]), MAX_CONSECUTIVE_REJECTS는 3', () => {
  assert.deepEqual(WRITING_WEEKDAYS, [1, 3, 5]);
  assert.equal(MAX_CONSECUTIVE_REJECTS, 3);
});

test('pickMatchingProduct: query 핵심 낱말이 모두 들어간 첫 후보를 고르고, 없으면 null', () => {
  const candidates = [
    {productId: 1, productName: '다이슨 V10 충전 어댑터', productUrl: 'https://www.coupang.com/vp/1'},
    {productId: 2, productName: '아트뮤 다이슨 v8 호환 충전기 어댑터 26.1v 780mA', productUrl: 'https://www.coupang.com/vp/2'},
    {productId: 3, productName: '다이슨 V8 호환 어댑터 26.1V 정품형', productUrl: 'https://www.coupang.com/vp/3'},
  ];
  assert.equal(pickMatchingProduct(candidates, '다이슨 V8 호환 어댑터 26.1V')?.productId, 2);
  assert.equal(pickMatchingProduct(candidates, '다이슨 V8 정품 거치대'), null);
  assert.equal(pickMatchingProduct([], '다이슨 V8'), null);
  assert.equal(pickMatchingProduct(candidates, '   '), null);
});

test('1) 멈춤 상태이면 outcome=paused이고 글쓰기를 부르지 않는다', async () => {
  await withProject(async (projectDir, blogDir) => {
    await writePause(blogDir, '연속 실패', KST_WED_2AM);
    await writeFile(path.join(blogDir, 'tech-queue.json'), JSON.stringify([makeTopic()]));
    const {deps, calls} = makeBaseDeps();

    const res = await runTechOnce({projectDir, now: KST_WED_2AM, deps});
    assert.equal(res.outcome, 'paused');
    assert.equal(res.date, '2026-11-25');
    assert.equal(calls.runWriter, 0);
    assert.equal(calls.publishToBlogger, 0);
    const runs = await readRuns(blogDir);
    assert.equal(runs.at(-1).outcome, 'paused');
  });
});

test('2) UTC 17:00(한국 수요일 02:00)은 글쓰기 요일을 통과하고 한국 날짜 2026-11-25로 기록한다', async () => {
  await withProject(async (projectDir, blogDir) => {
    await writeFile(path.join(blogDir, 'tech-queue.json'), JSON.stringify([makeTopic()]));
    const {deps, calls} = makeBaseDeps();

    const res = await runTechOnce({projectDir, now: KST_WED_2AM, deps});
    assert.equal(res.outcome, 'published');
    assert.equal(res.date, '2026-11-25');
    assert.equal(calls.runWriter, 1);
    const posts = await readPosts(blogDir);
    assert.equal(posts[0].date, '2026-11-25');
  });
});

test('3) 글 쓰는 요일이 아니면 outcome=not-writing-day (forceDay=true면 진행)', async () => {
  await withProject(async (projectDir, blogDir) => {
    await writeFile(path.join(blogDir, 'tech-queue.json'), JSON.stringify([makeTopic()]));
    const {deps, calls} = makeBaseDeps();

    const skipped = await runTechOnce({projectDir, now: KST_THU_10AM, deps});
    assert.equal(skipped.outcome, 'not-writing-day');
    assert.equal(calls.runWriter, 0);

    const forced = await runTechOnce({projectDir, now: KST_THU_10AM, forceDay: true, deps});
    assert.equal(forced.outcome, 'published');
    assert.equal(calls.runWriter, 1);
  });
});

test('4) 오늘(한국 날짜) 게시 기록이 이미 있으면 outcome=already-posted-today', async () => {
  await withProject(async (projectDir, blogDir) => {
    await writeFile(path.join(blogDir, 'tech-queue.json'), JSON.stringify([makeTopic('t2')]));
    await writeFile(
      path.join(blogDir, 'tech-posts.json'),
      JSON.stringify([{date: '2026-11-25', topicId: 't1', title: '먼저 올린 글', url: 'u', postId: 'p'}]),
    );
    const {deps, calls} = makeBaseDeps();

    const res = await runTechOnce({projectDir, now: KST_WED_2AM, deps});
    assert.equal(res.outcome, 'already-posted-today');
    assert.equal(calls.runWriter, 0);
    assert.equal(calls.publishToBlogger, 0);
  });
});

test('5) 대기열이 비어 있으면 outcome=queue-empty', async () => {
  await withProject(async (projectDir) => {
    const {deps, calls} = makeBaseDeps();
    const res = await runTechOnce({projectDir, now: KST_WED_2AM, deps});
    assert.equal(res.outcome, 'queue-empty');
    assert.equal(calls.runWriter, 0);
  });
});

test('6) 토큰이 null이면 outcome=auth-failed이고 게시 0번', async () => {
  await withProject(async (projectDir, blogDir) => {
    await writeFile(path.join(blogDir, 'tech-queue.json'), JSON.stringify([makeTopic()]));
    const {deps, calls} = makeBaseDeps({getBlogAccessToken: async () => null});

    const res = await runTechOnce({projectDir, now: KST_WED_2AM, deps});
    assert.equal(res.outcome, 'auth-failed');
    assert.equal(calls.publishToBlogger, 0);
    assert.equal(calls.runWriter, 0);
  });
});

test('7) runWriter 실패면 outcome=writer-failed이고 앞선 2번의 rejected 뒤에도 멈춤을 쓰지 않는다', async () => {
  await withProject(async (projectDir, blogDir) => {
    await writeFile(path.join(blogDir, 'tech-queue.json'), JSON.stringify([makeTopic()]));
    await writeFile(
      path.join(blogDir, 'tech-runs.json'),
      JSON.stringify([
        {date: '2026-11-20', startedAt: '2026-11-20T00:00:00Z', outcome: 'rejected', topicId: 'a'},
        {date: '2026-11-23', startedAt: '2026-11-23T00:00:00Z', outcome: 'rejected', topicId: 'b'},
      ]),
    );
    const {deps, calls} = makeBaseDeps({
      runWriter: async () => ({ok: false, error: '시간 초과'}),
    });

    const res = await runTechOnce({projectDir, now: KST_WED_2AM, deps});
    assert.equal(res.outcome, 'writer-failed');
    assert.equal(calls.publishToBlogger, 0);
    assert.equal((await readPause(blogDir)).paused, false);
  });
});

test('8) 점검 실패 3번 연속(앞선 2번 + 중간 deferred/writer-failed + 이번)이면 writePause 호출', async () => {
  await withProject(async (projectDir, blogDir) => {
    await writeFile(path.join(blogDir, 'tech-queue.json'), JSON.stringify([makeTopic()]));
    await writeFile(
      path.join(blogDir, 'tech-runs.json'),
      JSON.stringify([
        {date: '2026-11-18', startedAt: '2026-11-18T00:00:00Z', outcome: 'rejected', topicId: 'a'},
        {date: '2026-11-20', startedAt: '2026-11-20T00:00:00Z', outcome: 'rejected', topicId: 'b'},
        {date: '2026-11-22', startedAt: '2026-11-22T00:00:00Z', outcome: 'deferred', topicId: 'c'},
        {date: '2026-11-23', startedAt: '2026-11-23T00:00:00Z', outcome: 'writer-failed', topicId: 'c'},
      ]),
    );
    const {deps, calls} = makeBaseDeps({
      checkTechPost: async () => ({ok: false, problems: [{id: 'slop', text: 'AI 티 검출'}]}),
    });

    const res = await runTechOnce({projectDir, now: KST_WED_2AM, deps});
    assert.equal(res.outcome, 'rejected');
    assert.equal(calls.publishToBlogger, 0);
    const pause = await readPause(blogDir);
    assert.equal(pause.paused, true);
    assert.ok(pause.reason.includes('AI 티 검출'));
  });
});

test('9) 앞선 2번 rejected 뒤에 deferred만 나면 멈춤을 쓰지 않는다', async () => {
  await withProject(async (projectDir, blogDir) => {
    await writeFile(path.join(blogDir, 'tech-queue.json'), JSON.stringify([makeTopic()]));
    await writeFile(
      path.join(blogDir, 'tech-runs.json'),
      JSON.stringify([
        {date: '2026-11-18', startedAt: '2026-11-18T00:00:00Z', outcome: 'rejected', topicId: 'a'},
        {date: '2026-11-20', startedAt: '2026-11-20T00:00:00Z', outcome: 'rejected', topicId: 'b'},
      ]),
    );
    const {deps} = makeBaseDeps({
      runWriter: async () => ({
        ok: true,
        draft: makeDraft('dyson-v8-red-blink', {query: '다이슨 V8 어댑터 26.1V', why: '교체용', required: true}),
      }),
      searchProducts: async () => [
        {productId: 9, productName: '다이슨 V8 호환 어댑터 26.1V', productUrl: 'https://www.coupang.com/vp/9'},
      ],
      deeplink: async () => {
        throw new Error('rate-limit');
      },
    });

    const res = await runTechOnce({projectDir, now: KST_WED_2AM, deps});
    assert.equal(res.outcome, 'deferred');
    assert.equal((await readPause(blogDir)).paused, false);
    assert.equal((await readQueue(blogDir)).length, 1);
  });
});

test('10) 필수 상품 링크 실패(맞는 후보 없음/deeplink 오류)면 deferred이고 대기열 그대로; required=false면 링크 없이 게시', async () => {
  await withProject(async (projectDir, blogDir) => {
    await writeFile(path.join(blogDir, 'tech-queue.json'), JSON.stringify([makeTopic()]));
    const {deps: noMatchDeps, calls: noMatchCalls} = makeBaseDeps({
      runWriter: async () => ({
        ok: true,
        draft: makeDraft('dyson-v8-red-blink', {query: '다이슨 V8 어댑터 26.1V', why: '교체용', required: true}),
      }),
      searchProducts: async () => [
        {productId: 10, productName: '전혀 무관한 청소기 거치대', productUrl: 'https://www.coupang.com/vp/10'},
      ],
    });

    const deferred = await runTechOnce({projectDir, now: KST_WED_2AM, deps: noMatchDeps});
    assert.equal(deferred.outcome, 'deferred');
    assert.equal(noMatchCalls.publishToBlogger, 0);
    assert.equal((await readQueue(blogDir)).length, 1);

    const {deps: optionalDeps, calls: optionalCalls} = makeBaseDeps({
      runWriter: async () => ({
        ok: true,
        draft: makeDraft('dyson-v8-red-blink', {query: '다이슨 V8 어댑터 26.1V', why: '보조', required: false}),
      }),
      searchProducts: async () => {
        throw new Error('API error');
      },
    });
    const published = await runTechOnce({projectDir, now: KST_WED_2AM, deps: optionalDeps});
    assert.equal(published.outcome, 'published');
    assert.equal(optionalCalls.publishToBlogger, 1);
    assert.equal((await readPosts(blogDir))[0].productUrl, null);
  });
});

test('11) 정상 auto 흐름: 후보 저장·상품 선택·딥링크·게시·appendPost·shiftQueue·syncData 1회씩', async () => {
  await withProject(async (projectDir, blogDir) => {
    await writeFile(path.join(blogDir, 'tech-queue.json'), JSON.stringify([makeTopic(), makeTopic('next-topic')]));
    const {deps, calls} = makeBaseDeps({
      runWriter: async () => {
        calls.runWriter += 1;
        return {
          ok: true,
          draft: makeDraft('dyson-v8-red-blink', {
            query: '다이슨 V8 어댑터 26.1V',
            why: '규격 맞는 어댑터 확인',
            required: true,
          }),
        };
      },
      searchProducts: async (_q, opts) => {
        calls.searchProducts += 1;
        assert.equal(opts.limit, 5);
        return [
          {productId: 101, productName: '타사 충전기', productUrl: 'https://www.coupang.com/vp/101'},
          {productId: 202, productName: '다이슨 V8 정격 호환 어댑터 26.1V', productUrl: 'https://www.coupang.com/vp/202'},
        ];
      },
      deeplink: async (urls) => {
        calls.deeplink += 1;
        assert.deepEqual(urls, ['https://www.coupang.com/vp/202']);
        return [{originalUrl: urls[0], shortenUrl: 'https://link.coupang.com/a/matched202'}];
      },
    });

    const res = await runTechOnce({projectDir, now: KST_WED_2AM, deps});
    assert.equal(res.outcome, 'published');
    assert.equal(calls.publishToBlogger, 1);
    assert.equal(calls.verifyLive, 1);
    assert.equal(calls.deeplink, 1);
    assert.equal(calls.syncData, 1);

    const posts = await readPosts(blogDir);
    assert.equal(posts.length, 1);
    assert.equal(posts[0].topicId, 'dyson-v8-red-blink');
    assert.equal(posts[0].productUrl, 'https://link.coupang.com/a/matched202');

    const queue = await readQueue(blogDir);
    assert.deepEqual(queue.map((t) => t.topicId), ['next-topic']);

    const savedDraft = JSON.parse(
      await readFile(path.join(blogDir, 'drafts', 'dyson-v8-red-blink.json'), 'utf8'),
    );
    assert.equal(savedDraft.product.chosenProductId, 202);
    assert.equal(savedDraft.product.candidates.length, 2);
  });
});

test('11b) searchProducts 결과 주소가 이미 https://link.coupang.com/이면 deeplink 호출을 생략한다', async () => {
  await withProject(async (projectDir, blogDir) => {
    await writeFile(path.join(blogDir, 'tech-queue.json'), JSON.stringify([makeTopic()]));
    const {deps, calls} = makeBaseDeps({
      runWriter: async () => ({
        ok: true,
        draft: makeDraft('dyson-v8-red-blink', {query: '다이슨 V8 어댑터', why: '교체', required: true}),
      }),
      searchProducts: async () => [
        {productId: 303, productName: '다이슨 V8 호환 어댑터', productUrl: 'https://link.coupang.com/a/alreadyShort'},
      ],
    });

    const res = await runTechOnce({projectDir, now: KST_WED_2AM, deps});
    assert.equal(res.outcome, 'published');
    assert.equal(calls.deeplink, 0);
    assert.equal((await readPosts(blogDir))[0].productUrl, 'https://link.coupang.com/a/alreadyShort');
  });
});

test('12) preview 모드: publishToBlogger/syncData 0번, output/blog/preview/<topicId>.html 생성, outcome=preview', async () => {
  await withProject(async (projectDir, blogDir) => {
    await writeFile(path.join(blogDir, 'tech-queue.json'), JSON.stringify([makeTopic()]));
    const {deps, calls} = makeBaseDeps();

    const res = await runTechOnce({projectDir, now: KST_WED_2AM, mode: 'preview', deps});
    assert.equal(res.outcome, 'preview');
    assert.equal(calls.publishToBlogger, 0);
    assert.equal(calls.syncData, 0);
    assert.equal((await readQueue(blogDir)).length, 1);
    assert.equal((await readPosts(blogDir)).length, 0);

    const previewFile = path.join(projectDir, 'output', 'blog', 'preview', 'dyson-v8-red-blink.html');
    assert.equal(existsSync(previewFile), true);
    const html = await readFile(previewFile, 'utf8');
    assert.ok(html.includes(DISCLOSURE));
  });
});

test('13) publish-draft 모드: 글쓰기를 건너뛰고 지정한 초안 파일을 점검·게시한다', async () => {
  await withProject(async (projectDir, blogDir) => {
    const draftRel = 'data/blog/drafts/ready-post.json';
    const draftAbs = path.join(projectDir, draftRel);
    await mkdir(path.dirname(draftAbs), {recursive: true});
    await writeFile(draftAbs, JSON.stringify(makeDraft('ready-post')), 'utf8');
    await writeFile(path.join(blogDir, 'tech-queue.json'), JSON.stringify([makeTopic('ready-post')]));
    const {deps, calls} = makeBaseDeps();

    const res = await runTechOnce({
      projectDir,
      now: KST_WED_2AM,
      mode: 'publish-draft',
      draftPath: draftRel,
      deps,
    });
    assert.equal(res.outcome, 'published');
    assert.equal(calls.runWriter, 0);
    assert.equal(calls.publishToBlogger, 1);
    assert.equal(calls.syncData, 1);
    assert.equal((await readQueue(blogDir)).length, 0);
    assert.equal((await readPosts(blogDir))[0].topicId, 'ready-post');
  });
});
