// 업로드 패키지 폴더의 글 파일(title.txt 등)을 읽어 복사용 요약 페이지(index.html)를 만든다.
// 글을 페이지에 따로 적어 두면 파일과 어긋난다(EP29 페이지의 설명란이 description.txt와 달랐음).
// 그래서 페이지는 항상 파일에서 만들고, 만들 때 금지어·제목 길이·자리표시자 링크도 함께 검사한다.
//
// 사용법: npm run upload-page -- output/upload-packages/ep24-long-short-i [다른 폴더...]
import {readFile, readdir, writeFile} from 'node:fs/promises';
import {basename, join, resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {findBannedTerms} from './banned-terms.mjs';

const MAX_TITLE_LENGTH = 50;

const esc = (value = '') =>
  String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');

export const parseTitleVariants = (raw = '') =>
  raw
    .split(/\r?\n/)
    .map((line) => line.match(/^\[([A-Za-z0-9]+)\]\s*(?:\(([^)]*)\)\s*)?(.+)$/))
    .filter(Boolean)
    .map((m) => ({id: m[1], note: m[2] || '', title: m[3].trim()}));

// ignoreLengthHint: 길이 표기는 맞을 수도 있어 사람이 보는 경고로만 쓴다. 업로드를 막는 검사에서는 끈다.
export const findPackageProblems = ({title = '', variants = [], description = '', tags = '', pinned = '', ignoreLengthHint = false}) => {
  const problems = [];
  for (const candidate of [title, ...variants.map((v) => v.title)]) {
    const length = [...candidate].length;
    if (length > MAX_TITLE_LENGTH) problems.push(`제목 ${length}자 (최대 ${MAX_TITLE_LENGTH}자): ${candidate}`);
    if (!ignoreLengthHint && /\d+분\s*(듣기|완성)/.test(candidate)) problems.push(`영상 길이를 적은 제목, 실제 길이와 맞는지 확인: ${candidate}`);
  }
  const allText = {제목: [title, ...variants.map((v) => v.title)].join('\n'), 설명: description, 태그: tags, '고정 댓글': pinned};
  for (const [where, text] of Object.entries(allText)) {
    for (const term of new Set(findBannedTerms(text).map((hit) => hit.term))) problems.push(`${where}에 금지어: ${term}`);
    if (/youtu\.be\/\.\.\./.test(text)) problems.push(`${where}에 자리표시자 링크: https://youtu.be/...`);
  }
  return problems;
};

const copyBlock = (id, label, text) => `<section class="card">
      <div class="card-head"><h2>${esc(label)}</h2><button type="button" data-copy="${esc(id)}">복사</button></div>
      <pre id="${esc(id)}">${esc(text)}</pre>
    </section>`;

const variantRow = (variant) => `<div class="variant">
        <div class="card-head"><h3>${esc(variant.id)}안${variant.note ? ` · ${esc(variant.note)}` : ''}</h3><button type="button" data-copy="variant-${esc(variant.id)}">복사</button></div>
        <pre id="variant-${esc(variant.id)}">${esc(variant.title)}</pre>
      </div>`;

const thumbnailOrder = (name) => {
  if (name === 'thumbnail.jpg') return 0;
  if (name.includes('close-up')) return 9;
  return 1;
};

const PAGE_SCRIPT = `document.addEventListener('click', async (event) => {
  const button = event.target.closest('[data-copy]');
  if (!button) return;
  const text = document.getElementById(button.dataset.copy).textContent;
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const area = document.createElement('textarea');
    area.value = text;
    document.body.appendChild(area);
    area.select();
    document.execCommand('copy');
    area.remove();
  }
  button.textContent = '복사됨';
  setTimeout(() => { button.textContent = '복사'; }, 1500);
});`;

const PAGE_STYLE = `:root{color-scheme:dark;--bg:#0C0F17;--card:#161B29;--line:rgba(255,255,255,.12);--accent:#F5C518;--text:#F3F4F6;--muted:#A3ACBA}
*{box-sizing:border-box;margin:0}
body{background:var(--bg);color:var(--text);font-family:'Noto Sans KR','Malgun Gothic',sans-serif;line-height:1.6;padding:32px 16px}
main{max-width:1180px;margin:0 auto;display:grid;gap:20px}
header p{color:var(--muted);overflow-wrap:anywhere}
h1{font-size:26px;font-weight:900}
h2{font-size:17px;font-weight:800}
h3{font-size:14px;font-weight:700;color:var(--muted)}
.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:20px}
.card{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:20px;display:grid;gap:12px;min-width:0;align-content:start}
.card-head{display:flex;justify-content:space-between;align-items:center;gap:12px}
.check{border-color:var(--accent)}
.check pre{max-height:none}
pre{background:rgba(0,0,0,.35);border-radius:8px;padding:14px;font:inherit;font-size:14px;white-space:pre-wrap;overflow-wrap:anywhere;max-height:360px;overflow-y:auto}
button{flex-shrink:0;background:transparent;border:1px solid var(--line);border-radius:8px;color:var(--text);cursor:pointer;font:inherit;font-size:13px;font-weight:700;padding:6px 14px;white-space:nowrap}
button:hover{border-color:var(--accent);color:var(--accent)}
.variant{display:grid;gap:8px}
.thumbs{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:12px}
figure{display:grid;gap:6px}
img{width:100%;aspect-ratio:16/9;object-fit:cover;border-radius:8px;display:block}
figcaption{color:var(--muted);font-size:13px;overflow-wrap:anywhere}
a{color:var(--accent);overflow-wrap:anywhere}
@media (max-width:900px){.grid{grid-template-columns:1fr}}`;

export const renderPackagePage = ({folder, title, variants, description, tags, pinned, timeline, checklist, thumbnails, video}) => {
  const episode = (folder.match(/^ep\d+/i)?.[0] || folder).toUpperCase();
  const figures = thumbnails
    .map((name) => `<figure><img src="${esc(name)}" alt="${esc(name)}" loading="lazy"><figcaption>${esc(name)}</figcaption></figure>`)
    .join('\n        ');
  return `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(episode)} 업로드 패키지</title>
<style>${PAGE_STYLE}</style>
</head>
<body>
<main>
  <header>
    <h1>${esc(episode)} 업로드 패키지</h1>
    <p>${esc(title)}</p>
    ${video ? `<p>영상 파일: <a href="${esc(video)}">${esc(video)}</a></p>` : '<p>영상 파일이 이 폴더에 없습니다.</p>'}
  </header>
  <section class="card check">
    <div class="card-head"><h2>업로드 체크리스트</h2><button type="button" data-copy="checklist">복사</button></div>
    <pre id="checklist">${esc(checklist)}</pre>
  </section>
  <section class="card">
    <h2>썸네일</h2>
    <div class="thumbs">
        ${figures || '<p>썸네일 파일이 없습니다.</p>'}
    </div>
  </section>
  ${copyBlock('title', '메인 제목', title)}
  <section class="card">
    <h2>제목 시안 (제목 및 썸네일 테스트용)</h2>
    ${variants.map(variantRow).join('\n      ')}
  </section>
  <div class="grid">
    ${copyBlock('description', '설명', description)}
    ${copyBlock('pinned', '고정 댓글', pinned)}
    ${copyBlock('tags', '태그', tags)}
    ${copyBlock('timeline', '챕터', timeline)}
  </div>
</main>
<script>${PAGE_SCRIPT}</script>
</body>
</html>
`;
};

const readText = async (dir, name) => {
  try {
    return (await readFile(join(dir, name), 'utf8')).replace(/\r\n/g, '\n').trim();
  } catch (error) {
    if (error.code === 'ENOENT') return '';
    throw error;
  }
};

export const buildPackagePage = async (packageDir) => {
  const dir = resolve(packageDir);
  const [title, variantsRaw, description, tags, pinned, timeline, checklist, files] = await Promise.all([
    readText(dir, 'title.txt'),
    readText(dir, 'title-variants.txt'),
    readText(dir, 'description.txt'),
    readText(dir, 'tags.txt'),
    readText(dir, 'pinned-comment.txt'),
    readText(dir, 'timeline.txt'),
    readText(dir, 'upload-checklist.txt'),
    readdir(dir),
  ]);
  const variants = parseTitleVariants(variantsRaw);
  const thumbnails = files
    .filter((name) => /^thumbnail.*\.(jpg|jpeg|png)$/i.test(name))
    .sort((a, b) => thumbnailOrder(a) - thumbnailOrder(b) || a.localeCompare(b));
  const video = files.find((name) => name.toLowerCase().endsWith('.mp4')) || '';
  const html = renderPackagePage({folder: basename(dir), title, variants, description, tags, pinned, timeline, checklist, thumbnails, video});
  await writeFile(join(dir, 'index.html'), html, 'utf8');
  return {problems: findPackageProblems({title, variants, description, tags, pinned}), variants: variants.length, thumbnails: thumbnails.length};
};

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const folders = process.argv.slice(2);
  if (folders.length === 0) {
    console.error('사용법: npm run upload-page -- output/upload-packages/<패키지 폴더> [다른 폴더...]');
    process.exit(1);
  }
  for (const folder of folders) {
    const {problems, variants, thumbnails} = await buildPackagePage(folder);
    console.log(`${basename(resolve(folder))}: 페이지 생성 (제목 시안 ${variants}, 썸네일 ${thumbnails})`);
    for (const problem of problems) console.log(`  ⚠️ ${problem}`);
  }
}
