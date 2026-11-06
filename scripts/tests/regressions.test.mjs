// 2026-11-06 점검에서 실제로 재현한 보안 문제가 다시 생기지 않는지 확인한다. 실행: npm test
import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {getRequestBlockReason} from '../request-guard.mjs';
import {extractZip} from '../studio-auto-ingest.mjs';
import {persistGeneratedImage, tempThumbDir} from '../ab-simulator.mjs';
import {buildPackagePage, findPackageProblems, parseTitleVariants} from '../build-upload-package-page.mjs';

const guard = (headers, method = 'GET', pathname = '/api/dashboard') =>
  getRequestBlockReason({headers: {host: 'localhost:3001', ...headers}, method, pathname, port: 3001});

test('대시보드 화면과 터미널 스크립트의 요청은 통과한다', () => {
  assert.equal(guard({}), null);
  assert.equal(guard({'sec-fetch-site': 'same-origin', origin: 'http://localhost:3001'}, 'POST', '/api/sync'), null);
  assert.equal(guard({host: '127.0.0.1:3001', origin: 'http://127.0.0.1:3001'}, 'POST', '/api/sync'), null);
  assert.equal(guard({'sec-fetch-site': 'none', 'sec-fetch-mode': 'navigate'}, 'GET', '/logout'), null);
});

test('다른 사이트에서 온 요청은 막는다', () => {
  assert.equal(guard({origin: 'https://evil.example'}, 'POST', '/api/ab-simulator/generate-image'), 'origin');
  assert.equal(guard({origin: 'null'}, 'POST', '/api/sync'), 'origin');
  assert.equal(guard({origin: 'http://localhost:9999'}, 'POST', '/api/sync'), 'origin');
  assert.equal(guard({'sec-fetch-site': 'cross-site', 'sec-fetch-mode': 'no-cors'}, 'GET', '/logout'), 'cross-site');
  assert.equal(guard({'sec-fetch-site': 'cross-site', 'sec-fetch-mode': 'navigate'}, 'GET', '/logout'), 'cross-site');
  assert.equal(guard({'sec-fetch-site': 'same-site', 'sec-fetch-mode': 'cors'}, 'GET', '/api/dashboard'), 'cross-site');
});

test('DNS 리바인딩처럼 Host가 다른 요청은 막는다', () => {
  assert.equal(guard({host: 'evil.example:3001'}), 'host');
});

test('구글 로그인에서 돌아오는 이동은 통과한다', () => {
  const nav = {'sec-fetch-site': 'cross-site', 'sec-fetch-mode': 'navigate'};
  for (const path of ['/', '/auth', '/oauth2callback']) assert.equal(guard(nav, 'GET', path), null);
  assert.equal(guard(nav, 'POST', '/oauth2callback'), 'cross-site');
});

test('zip 파일 이름으로 명령을 실행할 수 없다', {skip: process.platform !== 'win32'}, async () => {
  const dir = mkdtempSync(join(tmpdir(), 'ingest-'));
  const cwd = process.cwd();
  process.chdir(dir);
  try {
    const zip = join(dir, '콘텐츠 report’; Set-Content -Path marker.txt -Value pwned #.zip');
    writeFileSync(zip, 'not a real zip');
    await extractZip(zip, join(dir, 'out')).catch(() => {});
    assert.equal(existsSync(join(dir, 'marker.txt')), false);
  } finally {
    process.chdir(cwd);
    rmSync(dir, {recursive: true, force: true});
  }
});

test('곡선 따옴표와 한글이 들어간 이름의 실제 zip은 정상으로 풀린다', {skip: process.platform !== 'win32'}, async () => {
  const dir = mkdtempSync(join(tmpdir(), 'ingest-'));
  try {
    const src = join(dir, '표 데이터.csv');
    writeFileSync(src, 'a,b\n1,2\n');
    const zip = join(dir, '콘텐츠 it’s 2026.zip');
    execFileSync('powershell', ['-NoProfile', '-NonInteractive', '-Command', 'Compress-Archive -LiteralPath $env:SRC -DestinationPath $env:DST'], {
      env: {...process.env, SRC: src, DST: zip},
    });
    const out = join(dir, 'out');
    assert.equal(await extractZip(zip, out), true);
    assert.equal(existsSync(join(out, '표 데이터.csv')), true);
  } finally {
    rmSync(dir, {recursive: true, force: true});
  }
});

test('이미지 저장은 지정 폴더 밖으로 나갈 수 없다', async () => {
  mkdirSync(tempThumbDir, {recursive: true});
  const {imageUrl} = await persistGeneratedImage({engineLabel: 'test', dataUrl: 'data:image/png;base64,AA==', variantKey: '../../evil\\x'});
  assert.match(imageUrl, /^\/api\/temp-thumbnail\/[A-Za-z0-9_-]+-\d+-[0-9a-f]+\.png$/);
  const saved = join(tempThumbDir, imageUrl.split('/').pop());
  assert.equal(existsSync(saved), true);
  rmSync(saved);
});

test('업로드 패키지 페이지는 글 파일에서 만들고 HTML을 이스케이프한다', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'ep99-package-'));
  writeFileSync(join(dir, 'title.txt'), '제목 <b>굵게</b>\n');
  writeFileSync(join(dir, 'title-variants.txt'), '[A] (메인) 첫 제목\r\n설명 줄\r\n[B] 둘째 제목\r\n');
  writeFileSync(join(dir, 'description.txt'), '설명 본문');
  writeFileSync(join(dir, 'thumbnail.jpg'), '');
  const result = await buildPackagePage(dir);
  const html = readFileSync(join(dir, 'index.html'), 'utf8');
  assert.equal(result.variants, 2);
  assert.equal(result.thumbnails, 1);
  assert.match(html, /제목 &lt;b&gt;굵게&lt;\/b&gt;/);
  assert.doesNotMatch(html, /<b>굵게/);
  assert.match(html, /설명 본문/);
  rmSync(dir, {recursive: true, force: true});
});

test('패키지 검사는 금지어·긴 제목·자리표시자 링크를 잡고 들려드릴은 넘긴다', () => {
  const variants = parseTitleVariants('[A] (메인) 짧은 제목');
  assert.deepEqual(findPackageProblems({title: '짧은 제목', variants, description: '세 번씩 들려드릴게요'}), []);
  const problems = findPackageProblems({
    title: `[30분 듣기] ${'가'.repeat(50)}`,
    description: '듣기 드릴과 조음 https://youtu.be/...',
    pinned: 'beach vs Bitch',
  }).join('\n');
  for (const expected of ['제목 59자','실제 길이와 맞는지', '드릴', '조음', '자리표시자', 'Bitch']) assert.match(problems, new RegExp(expected));
});
