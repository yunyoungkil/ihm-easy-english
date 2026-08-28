import {mkdir, readFile, writeFile} from 'node:fs/promises';
import {basename, dirname, join, resolve} from 'node:path';

const source = resolve(process.argv[2] || 'content/season1/ep08/shorts-b.json');
const content = JSON.parse(await readFile(source, 'utf8'));
const output = resolve(process.argv[3] || join('output', 'upload-packages', content.contentId));
await mkdir(output, {recursive: true});

const files = {
  'metadata.json': JSON.stringify(content, null, 2),
  'title.txt': `${content.youtube.title}\n`,
  'description.txt': `${content.youtube.description}\n`,
  'tags.txt': `${content.youtube.tags.join(', ')}\n`,
  'pinned-comment.txt': `${content.youtube.pinnedComment}\n`,
  'thumbnail-text.txt': `${content.youtube.thumbnailText.join('\n')}\n`,
};

if (content.script?.segments?.length) {
  files['script.txt'] = `${content.script.segments
    .map((segment) => `[${segment.id}. ${segment.role}]\n${segment.narration}`)
    .join('\n\n')}\n`;
}

for (const [name, value] of Object.entries(files)) await writeFile(join(output, name), value, 'utf8');
console.log(JSON.stringify({ok: true, source: basename(source), output, files: Object.keys(files)}, null, 2));
