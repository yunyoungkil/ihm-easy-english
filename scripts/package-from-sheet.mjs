// 비교 시트의 제목·설명글·태그·고정 댓글을 업로드 패키지 파일로 옮긴다(2026-11-13).
// 패키지에서 문구를 새로 쓰지 않는다: 시트가 이미 대본·썸네일과 맞춰 둔 문구를 그대로 복사한다.
// 사용: node scripts/package-from-sheet.mjs <원본 영상ID> <패키지 폴더>
// 이미 있는 파일은 덮어쓰지 않는다(다른 세션이 쓴 파일을 지우지 않으려고).
import {createHash} from 'node:crypto';
import {copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {classifySheetProblems, sheetImageExists, sheetsDir} from './transform-sheet.mjs';

/** 시트에서 패키지 파일 4개의 내용을 만든다. 제목은 사용자가 고른 것(titlePicks)만 쓴다. */
export function packageFilesFromSheet(sheet) {
  const pkg = sheet.rows?.find((r) => r.key === 'package')?.ours;
  if (!pkg?.description) throw new Error('시트에 설명글·태그·고정 댓글 칸이 없다');
  const titles = sheet.titlePicks || [];
  if (titles.length < 1 || titles.length > 3) throw new Error(`제목을 1~3개 골라야 한다(지금 ${titles.length}개, 유튜브 제목·썸네일 테스트는 최대 3개). 시트 화면에서 고른다`);
  return {
    'title.txt': `${titles[0]}
`,
    ...(titles.length > 1 ? {'title-variants.txt': `${titles.join('\n')}\n`} : {}),
    'description.txt': `${pkg.description.trim()}
`,
    'tags.txt': `${pkg.tags.join(', ')}
`,
    'pinned-comment.txt': `${pkg.pinnedComment.trim()}
`,
  };
}

/** 고른 썸네일 시안(최대 3개)을 패키지 이름 규칙대로: 첫째 thumbnail.jpg, 다음 thumbnail-variant-b.jpg, -c.jpg. */
export function packageImagesFromSheet(sheet) {
  const picks = sheet.thumbnailPicks || [];
  if (picks.length < 1 || picks.length > 3) throw new Error(`썸네일 시안을 1~3개 골라야 한다(지금 ${picks.length}개)`);
  const names = ['thumbnail.jpg', 'thumbnail-variant-b.jpg', 'thumbnail-variant-c.jpg'];
  return picks.map((rel, i) => ({from: rel, to: names[i]}));
}

// 시트 승인 = 썸네일 승인(2026-11-13 결정). 업로드 쪽(youtube-publisher.mjs)이 같은 이름의 파일을 읽는다.
// status.json이 아니라 별도 파일로 둔다: 영상이 나오기 전에 패키지가 자동 업로드 대기열에 들어가면 안 된다.
export const SHEET_THUMBNAIL_APPROVAL_FILE = 'sheet-thumbnail-approval.json';

const sha256Of = (path) => createHash('sha256').update(readFileSync(path)).digest('hex');

/** 시트가 승인 상태이고, 패키지에 들어간 thumbnail.jpg가 시트에서 고른 첫 시안과 같은 파일일 때만 승인 기록을 돌려준다. */
export function sheetThumbnailApproval({sheet, sheetImageSha256, packageThumbSha256, now = new Date()}) {
  if (sheet?.status !== 'approved') return {approved: false, reason: `시트 상태가 approved가 아니다(지금 ${sheet?.status ?? '없음'})`};
  if (!sheetImageSha256) return {approved: false, reason: '시트에서 고른 첫 시안 이미지를 읽지 못했다'};
  if (!packageThumbSha256) return {approved: false, reason: '패키지에 thumbnail.jpg가 없다'};
  if (sheetImageSha256 !== packageThumbSha256) return {approved: false, reason: '패키지 thumbnail.jpg가 시트에서 고른 첫 시안과 다른 파일이다'};
  return {
    approved: true,
    record: {
      sheetId: sheet.sourceVideoId,
      file: 'thumbnail.jpg',
      sha256: packageThumbSha256,
      approvedAt: now.toISOString(),
      source: 'sheet-approved',
    },
  };
}

/** 패키지 폴더의 승인 파일을 쓴다. 이미 같은 sha256 기록이 있으면 그대로 두고, 다르면 새로 쓴다. 조건이 안 맞으면 쓰지 않고 이유를 돌려준다. */
export function writeSheetThumbnailApproval({sheet, videoId, outDir, now = new Date(), imagesRoot = sheetsDir}) {
  const thumbPath = join(outDir, 'thumbnail.jpg');
  const firstPick = sheet.thumbnailPicks?.[0];
  const sheetImagePath = firstPick ? join(imagesRoot, firstPick) : null;
  const result = sheetThumbnailApproval({
    sheet,
    sheetImageSha256: sheetImagePath && existsSync(sheetImagePath) ? sha256Of(sheetImagePath) : null,
    packageThumbSha256: existsSync(thumbPath) ? sha256Of(thumbPath) : null,
    now,
  });
  if (!result.approved) return {written: false, reason: result.reason};
  const target = join(outDir, SHEET_THUMBNAIL_APPROVAL_FILE);
  if (existsSync(target)) {
    try {
      if (JSON.parse(readFileSync(target, 'utf8')).sha256 === result.record.sha256) return {written: false, reason: '이미 같은 승인 기록이 있다'};
    } catch { /* 깨진 기록은 새로 쓴다 */ }
  }
  writeFileSync(target, `${JSON.stringify({...result.record, sheetId: result.record.sheetId ?? videoId}, null, 2)}\n`, 'utf8');
  return {written: true, record: result.record};
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  try {
    const args = process.argv.slice(2);
    const allowDraft = args.includes('--allow-draft');
    const [videoId, outDir] = args.filter((a) => !a.startsWith('--'));
    if (!videoId || !outDir) throw new Error('사용: node scripts/package-from-sheet.mjs <영상ID> <패키지 폴더>');
    const sheet = JSON.parse(readFileSync(join(sheetsDir, `${videoId}.json`), 'utf8'));
    if (!allowDraft && sheet.status !== 'approved' && sheet.status !== 'published') {
      throw new Error(`비교 시트가 아직 '${sheet.status}' 상태입니다 — 승인 후 패키지를 만드세요.`);
    }
    const {blockers} = classifySheetProblems(sheet, {imageExists: sheetImageExists});
    if (blockers.length) throw new Error(`비교 시트 차단 항목(${blockers.length}건): ${blockers.join('; ')}`);
    const files = packageFilesFromSheet(sheet);
    const images = packageImagesFromSheet(sheet);
    mkdirSync(outDir, {recursive: true});
    for (const {from, to} of images) {
      const target = join(outDir, to);
      if (existsSync(target)) { console.log(`건너뜀(이미 있음): ${to}`); continue; }
      copyFileSync(join(sheetsDir, from), target);
      console.log(`복사: ${from} → ${to}`);
    }
    for (const [name, text] of Object.entries(files)) {
      const target = join(outDir, name);
      if (existsSync(target)) { console.log(`건너뜀(이미 있음): ${name}`); continue; }
      writeFileSync(target, text, 'utf8');
      console.log(`만듦: ${name}`);
    }
    const approval = writeSheetThumbnailApproval({sheet, videoId, outDir});
    console.log(approval.written ? `만듦: ${SHEET_THUMBNAIL_APPROVAL_FILE}(시트 승인 = 썸네일 승인)` : `썸네일 승인 기록 안 만듦: ${approval.reason}`);
  } catch (err) {
    console.error(`실패: ${err.message}`);
    process.exitCode = 1;
  }
}
