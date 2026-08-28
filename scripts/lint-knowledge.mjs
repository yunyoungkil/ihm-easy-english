import {readdir, readFile, stat} from 'node:fs/promises';
import {dirname, relative, resolve} from 'node:path';

const projectDir = resolve(import.meta.dirname, '..');
const knowledgeDir = resolve(projectDir, 'knowledge');

const walk = async (dir) => {
  const entries = await readdir(dir, {withFileTypes: true});
  const files = [];
  for (const entry of entries) {
    const path = resolve(dir, entry.name);
    if (entry.isDirectory()) files.push(...await walk(path));
    else if (entry.isFile() && entry.name.endsWith('.md')) files.push(path);
  }
  return files;
};

const files = await walk(knowledgeDir);
const inbound = new Map(files.map((file) => [file, 0]));
const broken = [];
const markdownLink = /\[[^\]]+\]\(([^)]+)\)/g;

for (const file of files) {
  const text = await readFile(file, 'utf8');
  for (const match of text.matchAll(markdownLink)) {
    const target = match[1].split('#')[0].trim();
    if (!target || /^(https?:|mailto:)/i.test(target)) continue;
    const absolute = resolve(dirname(file), decodeURIComponent(target));
    try {
      const info = await stat(absolute);
      if (!info.isFile()) broken.push({file, target});
      if (inbound.has(absolute)) inbound.set(absolute, inbound.get(absolute) + 1);
    } catch {
      broken.push({file, target});
    }
  }
}

const ignoredOrphans = new Set(['index.md', 'now.md', 'README.md', 'log.md']);
const orphans = [...inbound]
  .filter(([file, count]) => count === 0 && !ignoredOrphans.has(relative(knowledgeDir, file)))
  .map(([file]) => relative(knowledgeDir, file));

const nowPath = resolve(knowledgeDir, 'now.md');
const nowText = await readFile(nowPath, 'utf8');
const lineCount = nowText.split(/\r?\n/).length;
const warnings = [];
if (lineCount > 80) warnings.push(`now.md가 ${lineCount}줄입니다. 현재 업무만 남기고 줄이세요.`);
if (orphans.length) warnings.push(`들어오는 링크가 없는 문서: ${orphans.join(', ')}`);

console.log(JSON.stringify({
  ok: broken.length === 0,
  markdownFiles: files.length,
  brokenLinks: broken.map((item) => ({file: relative(projectDir, item.file), target: item.target})),
  warnings,
}, null, 2));

if (broken.length) process.exitCode = 1;

