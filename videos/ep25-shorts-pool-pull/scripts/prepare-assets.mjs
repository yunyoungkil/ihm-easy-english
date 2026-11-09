#!/usr/bin/env node
// EP25 쇼츠 재료 준비: 나레이션을 줄별로 자르고, 원어민 단어·글꼴·배경음·효과음·손 그림·롱폼 썸네일을 가져오고,
// 마커 그림을 칸별로 자른다. 여러 번 돌려도 같은 결과가 나온다.
//
// 나레이션 줄 경계는 소리 크기(쉼 -38dB 0.25초, 붙은 구간은 0.1초)로 찾고, 자른 조각을 하나씩 whisper로 받아 적어
// 대본과 같은지 확인했다(2026-11-09). 13.31~13.75초 "풀", 18.39~18.70초 "펄"은 TTS가 대본에 없이 넣은 소리라 버린다.
import {copyFileSync, existsSync, mkdirSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const videos = join(root, '..');
const at = (...p) => join(root, ...p);
const ffmpeg = (args, label) => {
  const r = spawnSync('ffmpeg', ['-y', '-v', 'error', ...args]);
  if (r.status !== 0) throw new Error(`${label}: ${r.stderr}`);
};
const copy = (from, to) => {
  mkdirSync(dirname(to), {recursive: true});
  copyFileSync(from, to);
};

// 1) 나레이션 10줄
const LINES = [
  ['n01', 0.08, 1.77], // 한글로 쓰면 전부 풀입니다.
  ['n02', 2.05, 4.80], // 그런데 영어로 들으면 네 단어가 다 다릅니다.
  ['n03', 5.85, 9.82], // 수영장과 잡아당기다, 이 둘은 입 모양에서 갈립니다.
  ['n04', 10.03, 12.60], // 촛불 끄듯이 입술을 동그랗게 모아 보세요.
  ['n05', 14.40, 17.69], // 이번엔 입술 힘을 툭 빼고 턱을 살짝 내려 보세요.
  ['n06', 19.45, 21.99], // 바보와 배부르다는 말도 이렇게 갈립니다.
  ['n07', 22.60, 24.20], // 마지막으로 귀로만 맞혀 보세요.
  ['n08', 24.70, 26.98], // 바보일까요, 배부르다는 말일까요?
  ['n09', 28.05, 29.03], // 배부르다는 말이었습니다.
  ['n10', 30.00, 33.39], // 소리가 갈리는 단어 스무 쌍은 화면 아래 링크에 모아 두었습니다.
];
const LEAD = 0.05;
const TAIL = 0.2;
const FADE = 0.05;
for (const [id, a, b] of LINES) {
  const start = Math.max(0, a - LEAD);
  const dur = b + TAIL - start;
  ffmpeg(['-ss', start.toFixed(3), '-t', dur.toFixed(3), '-i', at('assets/voice/narration_all.wav'), '-af', `afade=t=out:st=${(dur - FADE).toFixed(3)}:d=${FADE}`, '-ar', '24000', '-ac', '1', '-c:a', 'pcm_s16le', at('assets/voice', `${id}.wav`)], id);
}

// 2) 원어민 단어: 한 쌍 안에서는 같은 목소리(pool·pull 남성, fool·full 여성, 2026-11-07 사용자 결정)
const longformVoice = join(videos, 'ep25-pool-pull', 'assets', 'voice');
for (const name of ['m_w01_pool', 'm_w02_pull', 'f_w03_fool', 'f_w04_full']) copy(join(longformVoice, `${name}.wav`), at('assets/voice', `${name}.wav`));

// 3) EP24 쇼츠와 같은 글꼴(2,451자, EP25 화면 글자 전부 포함 확인)·배경음·효과음·손 그림
const ep24 = join(videos, 'ep24-shorts-sheep-ship', 'assets');
copy(join(ep24, 'fonts', 'NotoSansKR-subset.ttf'), at('assets/fonts/NotoSansKR-subset.ttf'));
copy(join(ep24, 'bgm', 'track.mp3'), at('assets/bgm/track.mp3'));
for (const s of ['pop', 'click-soft', 'whoosh']) copy(join(ep24, 'sfx', `${s}.mp3`), at('assets/sfx', `${s}.mp3`));
copy(join(ep24, 'images', 'cta_hand.png'), at('assets/images/cta_hand.png'));

// 4) 롱폼 썸네일(마지막 5초 안내 카드)
const longThumb = join(root, '..', '..', 'output', 'upload-packages', 'ep25-pool-pull', 'thumbnail.jpg');
ffmpeg(['-i', longThumb, '-vf', 'scale=860:-2', '-q:v', '3', at('assets/images/longform_thumb.jpg')], 'longform thumb');

// 5) 마커 그림 자르기: 네 칸(512x512씩)과 입술 위아래(1024x512 → 1000x500)
mkdirSync(at('assets/images/panels'), {recursive: true});
const grid = at('assets/images/grid_pool_pull_fool_full.jpg');
const cells = {pool: '0:0', pull: '512:0', fool: '0:512', full: '512:512'};
for (const [name, xy] of Object.entries(cells)) ffmpeg(['-i', grid, '-vf', `crop=512:512:${xy}`, '-q:v', '2', at('assets/images/panels', `${name}.jpg`)], name);
const lips = at('assets/images/lips_round_relaxed.jpg');
ffmpeg(['-i', lips, '-vf', 'crop=1024:512:0:0,scale=1000:500:flags=lanczos', '-q:v', '2', at('assets/images/panels/lips_round.jpg')], 'lips round');
ffmpeg(['-i', lips, '-vf', 'crop=1024:512:0:512,scale=1000:500:flags=lanczos', '-q:v', '2', at('assets/images/panels/lips_relaxed.jpg')], 'lips relaxed');

// 귀로만 맞히기 카드(가로로 넓은 카드)용: 같은 칸을 흰 여백과 함께 1000x500으로. 네 칸 그림과 파일을 나눠야
// HyperFrames가 같은 그림을 두 번 찾는 경고(duplicate_media_discovery_risk)가 나지 않는다.
for (const name of ['fool', 'full']) {
  ffmpeg(['-i', at('assets/images/panels', `${name}.jpg`), '-vf', 'scale=500:500:flags=lanczos,pad=1000:500:250:0:white', '-q:v', '2', at('assets/images/panels', `quiz_${name}.jpg`)], `quiz ${name}`);
}

if (!existsSync(at('assets/images/panels/quiz_full.jpg'))) throw new Error('panels missing');
console.log('done');
