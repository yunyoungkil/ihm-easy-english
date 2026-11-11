#!/usr/bin/env node
// EP24 두 번째 쇼츠(seat·sit): 나레이션 한 파일을 문장별로 자른다.
// 경계는 silencedetect(-38dB, 0.25초)와 whisper 단어 시각으로 찾은 값이다(2026-11-11).
// 문장 안 쉼표의 짧은 쉼은 그 문장에 포함한다. 끝에 0.2초 여운과 0.05초 페이드아웃.
import {spawnSync} from 'node:child_process';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const voice = join(here, '..', 'assets', 'voice');

export const LINES = [
  ['n01', 0.359, 3.535],   // 학창 시절에, 긴 소리는 길게 끌어 읽으라고 배우셨죠?
  ['n02', 3.807, 7.446],   // 그런데 방금 들으신 두 소리, 길이는 거의 같습니다.
  ['n03', 8.031, 11.203],  // 뒤에 티 소리가 오면, 긴 소리도 짧게 끊기거든요.
  ['n04', 11.769, 14.190], // 그럼 무엇이 다를까요? 입 모양입니다. ("입 모양입니다"는 13.47초부터)
  ['n05', 14.813, 17.966], // 웃듯이 입꼬리를 옆으로 당기면, 이 소리가 나고요.
  ['n06', 18.379, 21.784], // 힘을 툭 빼고 턱을 살짝 내리면, 이 소리가 납니다.
  ['n07', 22.481, 26.017], // 이런 짝단어 스무 쌍을, 화면 아래 링크에서 이어서 들어 보세요.
];

const LEAD = 0.05;
const TAIL = 0.2;
const FADE = 0.05;
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  for (const [id, a, b] of LINES) {
    const start = Math.max(0, a - LEAD);
    const dur = b + TAIL - start;
    const r = spawnSync('ffmpeg', ['-y', '-v', 'error', '-ss', start.toFixed(3), '-t', dur.toFixed(3), '-i', join(voice, 'narration_all.wav'), '-af', `afade=t=out:st=${(dur - FADE).toFixed(3)}:d=${FADE}`, '-ar', '24000', '-ac', '1', '-c:a', 'pcm_s16le', join(voice, `${id}.wav`)]);
    if (r.status !== 0) throw new Error(`${id}: ${r.stderr}`);
    console.log(id, dur.toFixed(2) + '초');
  }
}
