// 비교 시트의 제목·설명글·태그·고정 댓글을 업로드 패키지 파일로 옮긴다(2026-11-13).
// 패키지에서 문구를 새로 쓰지 않는다: 시트가 이미 대본·썸네일과 맞춰 둔 문구를 그대로 복사한다.
// 사용: node scripts/package-from-sheet.mjs <원본 영상ID> <패키지 폴더>
// 이미 있는 파일은 덮어쓰지 않는다(다른 세션이 쓴 파일을 지우지 않으려고).
import {existsSync, mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {sheetsDir, validateSheet} from './transform-sheet.mjs';

/** 시트에서 패키지 파일 4개의 내용을 만든다. 제목은 사용자가 고른 것(titlePicks)만 쓴다. */
export function packageFilesFromSheet(sheet) {
  const pkg = sheet.rows?.find((r) => r.key === 'package')?.ours;
  if (!pkg?.description) throw new Error('시트에 설명글·태그·고정 댓글 칸이 없다');
  const titles = sheet.titlePicks || [];
  if (titles.length !== 1) throw new Error(`제목을 정확히 1개 골라야 한다(지금 ${titles.length}개). 시트 화면에서 고른다`);
  return {
    'title.txt': `${titles[0]}
`,
    'description.txt': `${pkg.description.trim()}
`,
    'tags.txt': `${pkg.tags.join(', ')}
`,
    'pinned-comment.txt': `${pkg.pinnedComment.trim()}
`,
  };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  try {
    const [videoId, outDir] = process.argv.slice(2);
    if (!videoId || !outDir) throw new Error('사용: node scripts/package-from-sheet.mjs <영상ID> <패키지 폴더>');
    const sheet = JSON.parse(readFileSync(join(sheetsDir, `${videoId}.json`), 'utf8'));
    const problems = validateSheet(sheet).filter((p) => p.startsWith('설명글·태그·고정 댓글'));
    if (problems.length) throw new Error(problems.join('; '));
    const files = packageFilesFromSheet(sheet);
    mkdirSync(outDir, {recursive: true});
    for (const [name, text] of Object.entries(files)) {
      const target = join(outDir, name);
      if (existsSync(target)) { console.log(`건너뜀(이미 있음): ${name}`); continue; }
      writeFileSync(target, text, 'utf8');
      console.log(`만듦: ${name}`);
    }
  } catch (err) {
    console.error(`실패: ${err.message}`);
    process.exitCode = 1;
  }
}
