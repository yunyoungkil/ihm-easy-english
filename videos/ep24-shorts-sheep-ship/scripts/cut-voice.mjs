#!/usr/bin/env node
// EP24 쇼츠: 나레이션 한 파일을 문장별로 자르고, 쓸 원어민 단어 음성을 롱폼에서 복사한다.
// 문장 경계는 소리 크기를 재서 찾은 값이다(2026-11-07). 끝에 0.2초 여운과 0.05초 페이드아웃을 둔다.
import {copyFileSync, existsSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const voice = join(here, '..', 'assets', 'voice');
const longform = join(here, '..', '..', 'ep24-long-short-i', 'assets', 'voice');

const lines = [
  ['n01', 0.21, 2.54],
  ['n02', 3.53, 4.65],
  ['n03', 5.71, 9.15],
  ['n04', 10.02, 12.52],
  ['n05', 13.49, 14.61],
  ['n06', 15.56, 19.08],
  ['n07', 20.01, 20.91],
  ['n08', 21.77, 24.39],
  ['n09', 25.29, 28.18],
  ['n10', 29.03, 31.99],
  ['n11', 32.78, 35.95],
];

const LEAD = 0.05;
const TAIL = 0.2;
const FADE = 0.05;
for (const [id, a, b] of lines) {
  const start = Math.max(0, a - LEAD);
  const dur = b + TAIL - start;
  const r = spawnSync('ffmpeg', ['-y', '-v', 'error', '-ss', start.toFixed(3), '-t', dur.toFixed(3), '-i', join(voice, 'narration_all.wav'), '-af', `afade=t=out:st=${(dur - FADE).toFixed(3)}:d=${FADE}`, '-ar', '24000', '-ac', '1', '-c:a', 'pcm_s16le', join(voice, `${id}.wav`)]);
  if (r.status !== 0) throw new Error(`${id}: ${r.stderr}`);
}

for (const name of ['m_w01_sheep', 'm_w02_ship', 'm_w05_seat', 'm_w06_sit', 'f_w23_feel', 'f_w24_fill']) {
  const target = join(voice, `${name}.wav`);
  if (!existsSync(target)) copyFileSync(join(longform, `${name}.wav`), target);
}
console.log('done');
