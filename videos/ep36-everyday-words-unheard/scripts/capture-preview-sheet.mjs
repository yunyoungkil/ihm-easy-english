import {execFileSync} from 'node:child_process';
import {mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const EP_DIR = join(HERE, '..');
const timeline = JSON.parse(readFileSync(join(EP_DIR, 'assets', 'audio-timeline.json'), 'utf8'));

// Pick one crisp midpoint inside every scene (plus key reveal moments)
const sampleTimes = timeline.scenes.map((sc) => {
  const mid = +(sc.start + sc.duration * 0.58).toFixed(1);
  return mid;
});
// Also capture chocolate/camera second half, steak reveal, vitamin second half
const s2 = timeline.scenes[2];
const s5 = timeline.scenes[5];
const s6 = timeline.scenes[6];
const s10 = timeline.scenes[10];
const allTimes = [
  2.8,
  ...sampleTimes.slice(0, 10),
  +(s10.start + 9.0).toFixed(1),
  +(s10.events.endscreen.globalStart + 4.5).toFixed(1),
  +(s2.start + s2.duration * 0.82).toFixed(1),
  +(s5.start + 0.7).toFixed(1),
  +(s6.start + s6.duration * 0.82).toFixed(1),
].sort((a, b) => a - b);

const snapDir = join(EP_DIR, 'snapshots');
mkdirSync(snapDir, {recursive: true});

console.log('Taking HyperFrames snapshots at:', allTimes.join(', '));
execFileSync(
  'npx',
  ['--yes', 'hyperframes@0.9.77', 'snapshot', '--at', allTimes.join(','), '--out', snapDir],
  {cwd: EP_DIR, stdio: 'inherit', shell: true},
);
console.log('Snapshots written to:', snapDir);
