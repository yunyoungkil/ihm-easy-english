import {mkdir, readFile, writeFile} from 'node:fs/promises';
import {dirname, resolve} from 'node:path';

const episodeDir = resolve(process.argv[2] || 'content/season1/ep09');
const output = resolve(process.argv[3] || 'output/upload-packages/s1-ep09-upload-summary.html');
const names = ['longform.json', 'shorts-a.json', 'shorts-b.json'];
const items = await Promise.all(names.map(async (name) => JSON.parse(await readFile(resolve(episodeDir, name), 'utf8'))));
const esc = (value = '') => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
const block = (label, value) => `<section><div class="section-head"><h3>${esc(label)}</h3><button type="button" class="copy-button" onclick="copyBlock(this)">복사</button></div><pre>${esc(value)}</pre></section>`;
const endScreenPreview = (video) => {
  if (!video?.videoId) return '';
  const thumbnail = video.thumbnailUrl || `https://i.ytimg.com/vi/${encodeURIComponent(video.videoId)}/hqdefault.jpg`;
  return `<section class="end-screen"><div class="section-head"><h3>엔딩 화면 연결 영상</h3></div><a href="${esc(video.url || `https://youtu.be/${video.videoId}`)}" target="_blank" rel="noreferrer"><img src="${esc(thumbnail)}" alt="${esc(video.title || '엔딩 화면 연결 영상')}"></a><div class="end-screen-info"><b>${esc(video.title || video.videoId)}</b><span>영상 ID · ${esc(video.videoId)}</span></div>${block('엔딩 화면 영상 URL', video.url || `https://youtu.be/${video.videoId}`)}</section>`;
};
const schedulePreview = (publishing = {}) => {
  const value = publishing.scheduledAtKst || publishing.proposedAtKst || '';
  const text = value ? `${value} KST` : publishing.relativeToLongform ? `롱폼 공개 ${publishing.relativeToLongform} · ${publishing.timeKst || '시간 미정'} KST` : '예약 시간 미정';
  const missing = value ? '' : ' missing';
  return `<section class="schedule${missing}"><div class="section-head"><h3>예약 공개 일시</h3><button type="button" class="copy-button" onclick="copyBlock(this)">복사</button></div><pre>${esc(text)}</pre></section>`;
};
const postPublishPreview = (publishing = {}) => {
  const tasks = publishing.postPublishTasks || [];
  if (!tasks.length) return '';
  return block('공개 후 확인', tasks.map((item) => `${item.status === 'completed' ? '☑' : '□'} ${item.task}`).join('\n'));
};
const prePublishPreview = (publishing = {}) => {
  const tasks = publishing.prePublishTasks || [];
  if (!tasks.length) return '';
  return block('공개 전 필수 확인', tasks.map((item) => `${item.status === 'completed' ? '☑' : '□'} ${item.task}${item.dueAtKst ? ` · ${item.dueAtKst} KST` : ''}`).join('\n'));
};
const relatedVideoPreview = (video) => {
  if (!video?.videoId) return '';
  const waiting = video.status === 'connect-after-longform-publish';
  const state = waiting ? `현재 연결 대기 · 롱폼 공개 후 ${video.availableFromKst || ''} KST부터 연결` : '연결 가능';
  return `${block('관련 영상 연결', `${state}\n영상 ID: ${video.videoId}\n${video.url || `https://youtu.be/${video.videoId}`}`)}`;
};
const cards = items.map((item) => {
  const y = item.youtube;
  const kind = item.classification.track === 'LONGFORM' ? '롱폼' : `쇼츠 ${item.classification.track}`;
  const preview = item.production?.thumbnailFileName
    ? `<img class="thumbnail" ${item.classification.track === 'LONGFORM' ? '' : 'style="aspect-ratio:9/16;max-height:620px;object-fit:contain;background:#05080d"'} src="${esc(item.contentId)}/${esc(item.production.thumbnailFileName)}" alt="${esc(kind)} 썸네일">`
    : '';
  return `<article><header><span>${kind}</span><strong>${esc(item.status)}</strong></header>
    ${schedulePreview(item.publishing)}
    ${prePublishPreview(item.publishing)}
    ${postPublishPreview(item.publishing)}
    ${preview}
    ${item.classification.track === 'LONGFORM' ? endScreenPreview(y.endScreenVideo) : ''}
    ${item.classification.track === 'LONGFORM' ? '' : relatedVideoPreview(y.relatedVideo)}
    ${block('제목', y.title)}
    ${block('썸네일 문구', y.thumbnailText.join('\n'))}
    ${block('설명', y.description)}
    ${block('태그', y.tags.join(', '))}
    ${block('고정 댓글', y.pinnedComment)}
    ${block('공개 설정', JSON.stringify(item.publishing, null, 2))}
  </article>`;
}).join('\n');

const html = `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>시즌1 EP9 업로드 패키지</title><style>
:root{color-scheme:dark;font-family:Arial,"Noto Sans KR",sans-serif;background:#090d16;color:#f6f8ff}body{margin:0;padding:40px;max-width:1480px;margin:auto}h1{font-size:40px;margin:0 0 10px}.note{color:#aebbd4;margin-bottom:28px}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(360px,1fr));gap:22px}article{background:#101827;border:1px solid #263650;border-radius:20px;padding:22px;box-shadow:0 18px 50px #0005}header{display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;font-size:22px}header span{color:#ffd900;font-weight:900}header strong{font-size:13px;color:#8dd8ff}.thumbnail{width:100%;aspect-ratio:16/9;object-fit:cover;border-radius:12px;border:1px solid #344764;display:block}section{margin-top:16px}.section-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:7px}h3{font-size:13px;color:#91a6c8;margin:0;text-transform:uppercase}.copy-button{border:1px solid #3d5b82;border-radius:8px;background:#17263b;color:#bfe8ff;padding:5px 10px;font-weight:800;cursor:pointer}.copy-button:hover{background:#078df0;color:white;border-color:#078df0}.copy-button.copied{background:#183e34;color:#7ff0c2;border-color:#2d8b70}pre{white-space:pre-wrap;word-break:keep-all;background:#08101c;border-radius:12px;padding:14px;margin:0;line-height:1.55;font-family:inherit;font-size:14px}code{color:#ffd900}.schedule{margin:0 0 16px;padding:13px;border:1px solid #078df0;border-radius:13px;background:linear-gradient(135deg,#092f55,#101827)}.schedule h3{color:#8dd8ff}.schedule pre{padding:5px 0;background:transparent;color:#fff;font-size:19px;font-weight:900}.schedule.missing{border-color:#d9912b;background:#31200d}.schedule.missing h3,.schedule.missing pre{color:#ffd18a}.end-screen{padding:14px;border:1px solid #3f587a;border-radius:14px;background:#0a1321}.end-screen>a{display:block}.end-screen img{display:block;width:100%;aspect-ratio:16/9;object-fit:cover;border-radius:10px;border:1px solid #415b7e}.end-screen-info{display:grid;gap:5px;margin-top:10px}.end-screen-info b{font-size:15px}.end-screen-info span{color:#8dd8ff;font-size:12px}.end-screen section{margin-top:10px}</style></head><body><h1>시즌1 EP9 업로드 패키지</h1><p class="note">공개 순서: 롱폼 → 2일 뒤 쇼츠 A → 4일 뒤 쇼츠 B · <code>{{EP9_LONGFORM_URL}}</code>은 롱폼 공개 후 실제 주소로 교체</p><main class="grid">${cards}</main><script>
async function copyBlock(button){const text=button.closest('section').querySelector('pre').textContent;let copied=false;try{await navigator.clipboard.writeText(text);copied=true}catch(_error){const area=document.createElement('textarea');area.value=text;area.style.position='fixed';area.style.opacity='0';document.body.appendChild(area);area.select();copied=document.execCommand('copy');area.remove()}if(!copied)return;const original=button.textContent;button.textContent='복사됨';button.classList.add('copied');setTimeout(()=>{button.textContent=original;button.classList.remove('copied')},1200)}
</script></body></html>`;
await mkdir(dirname(output), {recursive: true});
await writeFile(output, html, 'utf8');
console.log(JSON.stringify({ok: true, output}, null, 2));
