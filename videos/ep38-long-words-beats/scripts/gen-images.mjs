// visual-prompts.md의 [이름] 지시문을 하나씩 AI Studio로 만든다(순서대로, 이미 있으면 건너뜀).
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
const repo = 'c:/Users/yunyo/.gemini/antigravity-ide/scratch/ihm-easy-english';
const dir = path.join(repo, 'videos/ep38-long-words-beats/assets/images');
const md = fs.readFileSync(path.join(dir, 'visual-prompts.md'), 'utf8').replace(/\r\n/g, '\n');
const tail = ' Absolutely no text, no letters, no words, no numbers, no logos, no brand marks anywhere in the image; every label area is plain and empty. No watermark.';
const block = md.split('```text\n')[1].split('\n```')[0];
const only = process.argv.slice(2);
for (const line of block.split('\n')) {
  if (!line.startsWith('[')) continue;
  const name = line.slice(1, line.indexOf(']'));
  if (only.length && !only.includes(name)) continue;
  const out = path.join(dir, name + '.png');
  if ((fs.existsSync(out) || fs.existsSync(out.replace(/.png$/, '.jpg'))) && !only.length) { console.log('skip', name); continue; }
  const pf = path.join(dir, name + '.prompt.txt');
  fs.writeFileSync(pf, line.slice(line.indexOf(']') + 2) + tail);
  console.log('gen', name, new Date().toISOString());
  const r = spawnSync('node', ['scripts/generate-aistudio-image.mjs', '--prompt-file', pf, '--output', out, '--aspect', '16:9'], { cwd: repo, encoding: 'utf8', timeout: 420000 });
  console.log(name, 'exit', r.status, (r.stdout || '').trim().split('\n').slice(-2).join(' | '), (r.stderr || '').trim().split('\n').slice(-2).join(' | '));
}
console.log('done', new Date().toISOString());
