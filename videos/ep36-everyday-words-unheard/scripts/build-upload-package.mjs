import {createHash} from 'node:crypto';
import {copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const EP_DIR = join(HERE, '..');
const REPO_ROOT = resolve(EP_DIR, '..', '..');
const PKG_DIR = join(REPO_ROOT, 'output', 'upload-packages', 'ep36-everyday-words-unheard');
const SHEET_PATH = join(REPO_ROOT, 'data', 'youtube', 'transform-sheets', 'ep36-everyday-words-unheard.json');
const SHEET_IMG_DIR = join(REPO_ROOT, 'data', 'youtube', 'transform-sheets', 'images', 'ep36-everyday-words-unheard');
const RENDER_MP4 = join(EP_DIR, 'renders', 'ep36-everyday-words-unheard.mp4');
const SEO_MP4_NAME = 'English_Pronunciation_7_Everyday_Words_Native_Sound_Listening.mp4';

mkdirSync(PKG_DIR, {recursive: true});

const sheet = JSON.parse(readFileSync(SHEET_PATH, 'utf8'));
const timeline = JSON.parse(readFileSync(join(EP_DIR, 'assets', 'audio-timeline.json'), 'utf8'));
const html = readFileSync(join(EP_DIR, 'index.html'), 'utf8');

const titleRow = sheet.rows.find((r) => r.key === 'title');
const pkgRow = sheet.rows.find((r) => r.key === 'package');
const selectedTitle = sheet.titlePicks?.[0] || sheet.aiRecommendation?.title;
const allTitles = titleRow?.ours?.titles || [selectedTitle];
const description = pkgRow?.ours?.description || '';
const tags = pkgRow?.ours?.tags || [];
const pinnedComment = pkgRow?.ours?.pinnedComment || '';

// 1. Copy SEO-named MP4 (2-stage render contract)
if (!existsSync(RENDER_MP4)) {
  throw new Error(`Rendered MP4 not found: ${RENDER_MP4}`);
}
copyFileSync(RENDER_MP4, join(PKG_DIR, SEO_MP4_NAME));

// 2. Copy approved thumbnail + variants
copyFileSync(join(SHEET_IMG_DIR, 'thumb-A.jpg'), join(PKG_DIR, 'thumbnail.jpg'));
copyFileSync(join(SHEET_IMG_DIR, 'thumb-A.jpg'), join(PKG_DIR, 'thumbnail-variant-a.jpg'));
copyFileSync(join(SHEET_IMG_DIR, 'thumb-B.jpg'), join(PKG_DIR, 'thumbnail-variant-b.jpg'));
copyFileSync(join(SHEET_IMG_DIR, 'thumb-C.jpg'), join(PKG_DIR, 'thumbnail-variant-c.jpg'));
const thumbSha256 = createHash('sha256').update(readFileSync(join(PKG_DIR, 'thumbnail.jpg'))).digest('hex');

// 3. Generate exact Korean SRT from index.html track-3 captions
const fmtSrt = (sec) => {
  const ms = Math.max(0, Math.round(sec * 1000));
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  const rem = ms % 1000;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')},${String(rem).padStart(3, '0')}`;
};
const capRegex = /<div id="cap-\d+" class="clip caption-wrap" data-start="([\d.]+)" data-duration="([\d.]+)"[^>]*><div class="caption-pill">([^<]+)<\/div><\/div>/g;
const decode = (s) => s.replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
const srtBlocks = [];
let idx = 1;
for (const m of html.matchAll(capRegex)) {
  const start = Number(m[1]);
  const dur = Number(m[2]);
  const text = decode(m[3]).trim();
  if (!text) continue;
  srtBlocks.push(`${idx++}\n${fmtSrt(start)} --> ${fmtSrt(start + dur)}\n${text}\n`);
}
writeFileSync(join(PKG_DIR, 'subtitles-ko.srt'), srtBlocks.join('\n'), 'utf8');

// 4. Write metadata text files
writeFileSync(join(PKG_DIR, 'title.txt'), selectedTitle + '\n', 'utf8');
writeFileSync(join(PKG_DIR, 'title-variants.txt'), allTitles.map((t, i) => `${i + 1}. ${t}`).join('\n') + '\n', 'utf8');
writeFileSync(join(PKG_DIR, 'description.txt'), description + '\n', 'utf8');
writeFileSync(join(PKG_DIR, 'tags.txt'), tags.join(', ') + '\n', 'utf8');
writeFileSync(join(PKG_DIR, 'pinned-comment.txt'), pinnedComment + '\n', 'utf8');

const fmtMMSS = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
const timelineTxt = timeline.scenes.map((sc) => `${fmtMMSS(sc.start)} ~ ${fmtMMSS(sc.end)} (${sc.duration.toFixed(1)}s) | ${sc.id} | ${sc.title}`).join('\n') + '\n';
writeFileSync(join(PKG_DIR, 'timeline.txt'), timelineTxt, 'utf8');

const totalDur = timeline.totalDuration;
const esStart = timeline.scenes.find((s) => s.id === 'scene-10')?.events?.endscreen?.globalStart ?? +(totalDur - 9).toFixed(2);
const nowIso = new Date().toISOString();

const status = {
  status: 'ready-for-upload',
  episodeId: 'ep36-everyday-words-unheard',
  format: 'LONGFORM',
  title: selectedTitle,
  recommendedPublishAt: '2026-12-07T14:00:00Z',
  playlist: '이해하면 쉬운 영어 | 영어 읽는 법 기초 시즌1 (왕초보 영어 읽기)',
  containsSyntheticMedia: true,
  categoryId: '27',
  defaultLanguage: 'ko',
  videoFile: SEO_MP4_NAME,
  durationSeconds: totalDur,
  durationFormatted: `${Math.floor(totalDur / 60)}분 ${Math.round(totalDur % 60)}초`,
  endScreenDuration: `9초 (${esStart.toFixed(2)}s ~ ${totalDur.toFixed(2)}s)`,
  thumbnailsCount: 3,
  subtitlesFile: 'subtitles-ko.srt',
  subtitlesCount: srtBlocks.length,
  renderedAt: nowIso,
  generatedAt: nowIso,
  thumbnailApproval: {
    file: 'thumbnail.jpg',
    sha256: thumbSha256,
    approvedAt: nowIso,
  },
  pinnedCommentPending: true,
};
writeFileSync(join(PKG_DIR, 'status.json'), JSON.stringify(status, null, 2) + '\n', 'utf8');

const checklist = [
  '# EP36 롱폼 업로드 체크리스트 (Gate 3 승인 후 실행)',
  `- 영상 파일: ${SEO_MP4_NAME} (${status.durationFormatted}, 1920x1080 30fps)`,
  `- 제목: ${selectedTitle}`,
  '- 썸네일: thumbnail.jpg (밝은 아이보리 최종 A안, 1280x720, SHA256 기록 완료)',
  '- 카테고리: 교육 (27) / 동영상·제목 언어: 한국어 (ko)',
  '- 변형되었거나 생성된 콘텐츠(AI 사용 여부): 예 (containsSyntheticMedia: true)',
  '- 재생목록: 이해하면 쉬운 영어 | 영어 읽는 법 기초 시즌1 (왕초보 영어 읽기)',
  `- 한국어 수동 자막: subtitles-ko.srt (${srtBlocks.length}개 자막 블록)`,
  '- 끝 화면(마지막 9초 중앙 비움): 구독 버튼 + 다음 추천 영상 카드 배치',
  '- 공개 후 고정 댓글 게시 및 상단 고정: pinned-comment.txt',
].join('\n') + '\n';
writeFileSync(join(PKG_DIR, 'upload-checklist.txt'), checklist, 'utf8');

console.log(`PACKAGE READY: ${PKG_DIR}`);
console.log(`  MP4: ${SEO_MP4_NAME}`);
console.log(`  SRT: ${srtBlocks.length} blocks`);
console.log(`  Thumbnail SHA256: ${thumbSha256.slice(0, 16)}...`);
