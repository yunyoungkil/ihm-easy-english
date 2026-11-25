import test from 'node:test';
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import {mkdir, mkdtemp, readFile, rm, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';

import {DISCLOSURE, checkRenderedHtml} from '../blog/check-post.mjs';
import {
  buildWriterPrompt,
  resolveClaudeExe,
  runWriter,
} from '../blog/write-tech-post.mjs';
import {
  publishToBlogger,
  renderPostHtml,
  verifyLive,
} from '../blog/publish-post.mjs';

const HOME = 'C:\\Users\\tester';
const EXT_DIR = path.join(HOME, '.vscode', 'extensions');
const exeFor = (ver) =>
  path.join(
    EXT_DIR,
    `anthropic.claude-code-${ver}-win32-x64`,
    'resources',
    'native-binary',
    'claude.exe',
  );

test('resolveClaudeExe: 버전 숫자 순서로 가장 높은 claude.exe를 고르고 없으면 null', () => {
  const dirs = [
    'ms-python.python-2026.10.0-win32-x64',
    'anthropic.claude-code-2.1.299-win32-x64',
    'anthropic.claude-code-2.1.312-win32-x64',
  ];
  const validExes = new Set([exeFor('2.1.299'), exeFor('2.1.312')]);
  const found = resolveClaudeExe({
    home: HOME,
    readdir: () => dirs,
    exists: (p) => validExes.has(p),
    pathEnv: '',
  });
  assert.equal(found, exeFor('2.1.312'));

  // 2.1.99 vs 2.1.100 숫자 세그먼트 비교(문자열 비교면 2.1.99가 이기는 버그 방지)
  const semverDirs = [
    'anthropic.claude-code-2.1.99-win32-x64',
    'anthropic.claude-code-2.1.100-win32-x64',
  ];
  const semverExes = new Set([exeFor('2.1.99'), exeFor('2.1.100')]);
  assert.equal(
    resolveClaudeExe({
      home: HOME,
      readdir: () => semverDirs,
      exists: (p) => semverExes.has(p),
      pathEnv: '',
    }),
    exeFor('2.1.100'),
  );

  // 확장도 PATH도 없으면 null
  assert.equal(
    resolveClaudeExe({
      home: HOME,
      readdir: () => { throw new Error('ENOENT'); },
      exists: () => false,
      pathEnv: 'C:\\Windows\\System32',
    }),
    null,
  );
});

test('buildWriterPrompt: 주제·검색어·DISCLOSURE 금지 안내·draftPath가 들어 있다', async () => {
  const topic = {
    topicId: 'dyson-v8-blinking',
    title: '다이슨 V8 빨간불 깜빡임 원인별 확인 순서',
    kind: 'fix',
    searchQuery: '다이슨 V8 빨간불 깜빡임 공식 지원',
    sourceHints: ['https://www.dyson.co.kr/support'],
    productHint: null,
  };
  const draftPath = 'data/blog/drafts/dyson-v8-blinking.json';
  const prompt = await buildWriterPrompt(topic, {
    posts: [{topicId: 'other-post', title: '이미 올린 다른 글'}],
    draftPath,
  });

  assert.ok(prompt.includes(topic.title));
  assert.ok(prompt.includes(topic.searchQuery));
  assert.ok(prompt.includes(draftPath));
  assert.ok(prompt.includes('이 포스팅은 쿠팡 파트너스 활동의 일환으로') || prompt.includes('대가 문구'));
  assert.ok(prompt.includes('절대 직접 쓰지 않는다') || prompt.includes('쓰지 말'));
  assert.ok(prompt.includes('이미 올린 다른 글'));
});

function makeFakeChild() {
  const child = new EventEmitter();
  child.stdout = new EventEmitter();
  child.stderr = new EventEmitter();
  child.killed = false;
  child.kill = () => {
    child.killed = true;
    return true;
  };
  return child;
}

test('runWriter: 종료 0 + 올바른 JSON이면 ok: true, 파일 없음/깨짐/시간 초과면 ok: false', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'blog-writer-test-'));
  try {
    // 1) 정상
    const okPath = path.join(dir, 'ok.json');
    const validDraft = {
      topicId: 't1',
      title: '제목',
      labels: ['가전'],
      notUsedNote: '안내',
      bodyHtml: '<p>안내</p>',
      steps: [],
      sources: [{url: 'https://example.com', title: '공식'}],
      product: null,
    };
    let capturedArgs = null;
    const okRes = await runWriter({
      exe: 'C:\\fake\\claude.exe',
      prompt: 'write draft',
      draftPath: okPath,
      timeoutMs: 5000,
      spawnImpl: (_exe, args) => {
        capturedArgs = args;
        const child = makeFakeChild();
        setTimeout(async () => {
          await mkdir(path.dirname(okPath), {recursive: true});
          await writeFile(okPath, JSON.stringify(validDraft), 'utf8');
          child.emit('close', 0);
        }, 10);
        return child;
      },
    });
    assert.equal(okRes.ok, true);
    assert.deepEqual(okRes.draft, validDraft);
    assert.ok(capturedArgs.includes('-p'));
    assert.ok(capturedArgs.includes('--tools'));
    assert.ok(capturedArgs.includes('WebSearch,WebFetch,Write'));
    // 글 작성은 Opus로 고정(2026-11-25 사용자 결정)
    assert.equal(capturedArgs[capturedArgs.indexOf('--model') + 1], 'claude-opus-5-5');

    // 2) 파일 없음
    const missingPath = path.join(dir, 'missing.json');
    const missingRes = await runWriter({
      exe: 'C:\\fake\\claude.exe',
      prompt: 'write draft',
      draftPath: missingPath,
      timeoutMs: 5000,
      spawnImpl: () => {
        const child = makeFakeChild();
        setTimeout(() => child.emit('close', 0), 10);
        return child;
      },
    });
    assert.equal(missingRes.ok, false);

    // 3) JSON 깨짐
    const badJsonPath = path.join(dir, 'bad.json');
    const badJsonRes = await runWriter({
      exe: 'C:\\fake\\claude.exe',
      prompt: 'write draft',
      draftPath: badJsonPath,
      timeoutMs: 5000,
      spawnImpl: () => {
        const child = makeFakeChild();
        setTimeout(async () => {
          await writeFile(badJsonPath, '{not valid json', 'utf8');
          child.emit('close', 0);
        }, 10);
        return child;
      },
    });
    assert.equal(badJsonRes.ok, false);

    // 4) 시간 초과 -> ok: false + child.kill 호출
    const timeoutPath = path.join(dir, 'timeout.json');
    let spawnedChild = null;
    const timeoutRes = await runWriter({
      exe: 'C:\\fake\\claude.exe',
      prompt: 'write draft',
      draftPath: timeoutPath,
      timeoutMs: 30,
      spawnImpl: () => {
        spawnedChild = makeFakeChild();
        return spawnedChild;
      },
    });
    assert.equal(timeoutRes.ok, false);
    assert.equal(spawnedChild.killed, true);
  } finally {
    await rm(dir, {recursive: true, force: true});
  }
});

test('renderPostHtml: 첫 <p>가 DISCLOSURE이고 productLink 유무·출처를 올바르게 렌더링해 checkRenderedHtml을 통과한다', () => {
  const draft = {
    topicId: 't1',
    title: '멀티탭 차단기 내려갈 때 확인 순서',
    labels: ['멀티탭'],
    notUsedNote: '이 글은 직접 써 보지 않고 제조사 안전 안내를 정리했습니다.',
    bodyHtml: '<p>이 글은 직접 써 보지 않고 제조사 안전 안내를 정리했습니다.</p><p>연결된 전열 기기를 모두 분리합니다.</p>',
    steps: [{text: '연결된 전열 기기를 모두 분리합니다.', source: {url: 'https://example.com/manual', title: '공식 안내', quote: '모든 플러그를 빼세요.'}}],
    sources: [{url: 'https://example.com/manual', title: '공식 안전 안내'}],
    product: {query: '과부하 차단 고용량 멀티탭 4000W', why: '전열 기기 겸용 시 정격 용량 초과 방지', required: false},
  };

  const withProduct = renderPostHtml(draft, {
    productLink: {shortenUrl: 'https://link.coupang.com/a/abc123', productName: '고용량 멀티탭 4000W'},
  });
  const firstP = withProduct.match(/<p\b[^>]*>([\s\S]*?)<\/p>/i);
  assert.ok(firstP);
  assert.equal(firstP[1], DISCLOSURE);
  assert.match(withProduct, /<a\b[^>]*href="https:\/\/link\.coupang\.com\/a\/abc123"[^>]*rel="sponsored nofollow"/);
  assert.ok(withProduct.includes('https://example.com/manual'));
  assert.ok(withProduct.includes('공식 안전 안내'));
  assert.deepEqual(checkRenderedHtml(withProduct), []);

  const withoutProduct = renderPostHtml(draft, {productLink: null});
  assert.equal(/coupang\.com|coupa\.ng/i.test(withoutProduct), false);
  assert.ok(withoutProduct.includes('https://example.com/manual'));
  assert.deepEqual(checkRenderedHtml(withoutProduct), []);
});

test('publishToBlogger: POST URL·Bearer 토큰·{title, content, labels} 본문을 보내고 {postId, url}을 돌려준다', async () => {
  let calledUrl = '';
  let calledInit = null;
  const res = await publishToBlogger({
    blogId: '999888777',
    title: '글 제목',
    html: '<p>본문</p>',
    labels: ['가전', '점검'],
    token: 'tok-abc',
    fetchImpl: async (url, init) => {
      calledUrl = url;
      calledInit = init;
      return {
        ok: true,
        status: 200,
        json: async () => ({id: '12345', url: 'https://tech.d40m.com/2026/11/test.html'}),
      };
    },
  });

  assert.equal(calledUrl, 'https://www.googleapis.com/blogger/v3/blogs/999888777/posts/');
  assert.equal(calledInit.method, 'POST');
  assert.equal(calledInit.headers.Authorization, 'Bearer tok-abc');
  assert.deepEqual(JSON.parse(calledInit.body), {
    title: '글 제목',
    content: '<p>본문</p>',
    labels: ['가전', '점검'],
  });
  assert.deepEqual(res, {postId: '12345', url: 'https://tech.d40m.com/2026/11/test.html'});
});

test('verifyLive: 200 + 유효 HTML(조각 및 Blogger post-body 포함 전체 페이지)은 통과, 404나 대가 문구 누락은 실패', async () => {
  const fragment = `<p>${DISCLOSURE}</p><p>본문</p><a href="https://link.coupang.com/a/x" rel="sponsored nofollow">상품</a>`;
  assert.deepEqual(
    await verifyLive('https://tech.d40m.com/1', {
      fetchImpl: async () => ({ok: true, status: 200, text: async () => fragment}),
    }),
    {ok: true, problems: []},
  );

  const fullBloggerPage = `<html><body><header><p>블로그 부제 설명입니다</p></header><div class="post-body entry-content"><div class="inner">${fragment}</div></div></body></html>`;
  assert.deepEqual(
    await verifyLive('https://tech.d40m.com/2', {
      fetchImpl: async () => ({ok: true, status: 200, text: async () => fullBloggerPage}),
    }),
    {ok: true, problems: []},
  );

  const notFound = await verifyLive('https://tech.d40m.com/404', {
    fetchImpl: async () => ({ok: false, status: 404, text: async () => 'Not Found'}),
  });
  assert.equal(notFound.ok, false);
  assert.ok(notFound.problems.length > 0);

  const missingDisclosure = await verifyLive('https://tech.d40m.com/no-disc', {
    fetchImpl: async () => ({
      ok: true,
      status: 200,
      text: async () => '<div class="post-body"><p>대가 문구 없음</p></div>',
    }),
  });
  assert.equal(missingDisclosure.ok, false);
  assert.ok(missingDisclosure.problems.some((p) => p.id === 'disclosure-missing'));
});

test('buildWriterPrompt: 지침에 heroImage 설명이 있고, recentBriefs가 있으면 겹치지 않게 문장으로 넣는다', async () => {
  const topic = {topicId: 't-hero', title: '교통카드 안 찍힐 때', kind: 'fix', searchQuery: '교통카드 인식 안됨', sourceHints: [], productHint: null};
  const base = await buildWriterPrompt(topic, {posts: []});
  assert.ok(base.includes('heroImage'));
  assert.ok(base.includes('"moment"') && base.includes('"alt"'));
  assert.equal(base.includes('최근 대표 그림 설계도'), false);

  const briefs = Array.from({length: 7}, (_, i) => ({
    moment: `moment-${i}`, angle: `angle-${i}`, light: `light-${i}`, lens: `lens-${i}`, medium: `medium-${i}`, subject: `secret-subject-${i}`,
  }));
  const withRecent = await buildWriterPrompt(topic, {posts: [], recentBriefs: briefs});
  assert.ok(withRecent.includes('최근 대표 그림 설계도'));
  assert.ok(withRecent.includes('겹치지 않게'));
  assert.ok(withRecent.includes('moment-6') && withRecent.includes('lens-2') && withRecent.includes('medium-4'));
  assert.equal(withRecent.includes('moment-1'), false); // 최근 5개만
  assert.equal(withRecent.includes('secret-subject'), false); // 다섯 칸만 넣는다
});

test('renderPostHtml: hero가 있으면 대가 문구 문단 바로 다음에 그림 문단을 넣고 checkRenderedHtml(hero)를 통과한다', () => {
  const draft = {
    topicId: 't1',
    title: '멀티탭 차단기 내려갈 때 확인 순서',
    bodyHtml: '<p>연결된 전열 기기를 모두 분리합니다.</p>',
    sources: [{url: 'https://example.com/manual', title: '공식 안내'}],
  };
  const hero = {url: 'https://blogger.googleusercontent.com/img/a/AVvXsExample/s1600/h.jpg', alt: '멀티탭 차단기가 내려가 불이 꺼진 순간.', width: 1200, height: 670};
  const html = renderPostHtml(draft, {productLink: null, hero});
  const paragraphs = [...html.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)].map((m) => m[1]);
  assert.equal(paragraphs[0], DISCLOSURE);
  assert.equal(
    paragraphs[1],
    `<img src="${hero.url}" alt="${hero.alt}" width="1200" height="670" fetchpriority="high" decoding="async">`,
  );
  assert.equal(paragraphs[2], '연결된 전열 기기를 모두 분리합니다.');
  assert.equal(html.includes('loading="lazy"'), false);
  assert.deepEqual(checkRenderedHtml(html, {hero}), []);

  // 크기를 안 주면 표시 크기 기본값, 따옴표는 이스케이프
  const noSize = renderPostHtml(draft, {hero: {url: hero.url, alt: '"따옴표" 있는 설명.'}});
  assert.match(noSize, /width="1200" height="670"/);
  assert.ok(noSize.includes('alt="&quot;따옴표&quot; 있는 설명."'));

  // hero가 없으면 예전 출력과 같다
  const without = renderPostHtml(draft, {productLink: null});
  assert.equal(without.includes('<img'), false);
  assert.equal(renderPostHtml(draft, {productLink: null, hero: null}), without);
  assert.equal(renderPostHtml(draft), without);
});
