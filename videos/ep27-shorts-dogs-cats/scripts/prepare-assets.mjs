#!/usr/bin/env node
// EP27 쇼츠 재료 준비: 나레이션을 줄별로 자르고, 원어민 단어·글꼴·배경음·효과음·손 그림·롱폼 썸네일을 가져오고,
// 네 칸 그림을 칸별로 잘라 낸다. 여러 번 돌려도 같은 결과가 나온다.
//
// 나레이션 줄 경계는 소리 크기(쉼 -38dB 0.25초)로 찾았다(2026-11-09). 줄 안의 쉼표 자리 쉼(0.3~0.6초)은 줄 경계가 아니다.
import {copyFileSync, mkdirSync} from 'node:fs';
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

// 1) 나레이션 10줄 (SCRIPT.md 나레이션 블록 순서)
const LINES = [
  ['n01', 0.29, 5.63], // 강아지 두 마리, 끝에 붙은 에스를 그냥 스로 읽으면 도그스가 됩니다.
  ['n02', 6.45, 9.34], // 그런데 실제로는 도그즈에 가깝게 들립니다.
  ['n03', 10.15, 13.79], // 고양이 두 마리는 캣츠, 여기서는 스가 맞습니다.
  ['n04', 14.71, 18.15], // 버스 두 대는 버시즈, 아예 한 박자가 더 붙고요.
  ['n05', 18.97, 20.85], // 같은 에스인데 왜 이렇게 갈릴까요?
  ['n06', 21.24, 23.02], // 바로 앞 소리를 보면 됩니다.
  ['n07', 23.88, 28.25], // 캣의 트처럼 바람만 나가는 소리 뒤에는 스가 붙습니다.
  ['n08', 28.98, 32.84], // 도그의 그처럼 목이 울리는 소리 뒤에는 즈가 붙고요.
  ['n09', 33.65, 38.11], // 버스처럼 원래 스 소리로 끝나는 단어라면, 이즈로 한 박자가 더 붙습니다.
  ['n10', 38.89, 44.36], // 끝소리 세 가지를 스물네 단어로 반복해 듣는 전체 영상은 화면 아래 링크에 있습니다.
];
const LEAD = 0.05;
const TAIL = 0.2;
const FADE = 0.05;
for (const [id, a, b] of LINES) {
  const start = Math.max(0, a - LEAD);
  const dur = b + TAIL - start;
  ffmpeg(['-ss', start.toFixed(3), '-t', dur.toFixed(3), '-i', at('assets/voice/narration_all.wav'), '-af', `afade=t=out:st=${(dur - FADE).toFixed(3)}:d=${FADE}`, '-ar', '24000', '-ac', '1', '-c:a', 'pcm_s16le', at('assets/voice', `${id}.wav`)], id);
}

// 2) 원어민 단어: 롱폼의 같은 남성 음성
const longformVoice = join(videos, 'ep27-s-ending', 'assets', 'voice');
for (const name of ['m_w07_dogs', 'm_w01_cats', 'm_w13_buses']) copy(join(longformVoice, `${name}.wav`), at('assets/voice', `${name}.wav`));

// 3) EP24~26 쇼츠와 같은 글꼴·배경음·효과음·손 그림. 마지막 안내는 쇼츠 여섯 편이 같아야 쇼츠→롱폼 숫자를 견줄 수 있다.
const ep24 = join(videos, 'ep24-shorts-sheep-ship', 'assets');
copy(join(ep24, 'fonts', 'NotoSansKR-subset.ttf'), at('assets/fonts/NotoSansKR-subset.ttf'));
copy(join(ep24, 'bgm', 'track.mp3'), at('assets/bgm/track.mp3'));
for (const s of ['pop', 'click-soft', 'whoosh']) copy(join(ep24, 'sfx', `${s}.mp3`), at('assets/sfx', `${s}.mp3`));
copy(join(ep24, 'images', 'cta_hand.png'), at('assets/images/cta_hand.png'));

// 4) 롱폼 썸네일(마지막 5초 안내 카드)
ffmpeg(['-i', join(root, '..', '..', 'output', 'upload-packages', 'ep27-s-ending', 'thumbnail.jpg'), '-vf', 'scale=860:-2', '-q:v', '3', at('assets/images/longform_thumb.jpg')], 'longform thumb');

// 5) 네 칸 그림을 칸별로 자른다. 가운데 가로(396~653줄)·세로(443~547열)가 비어 있어 512에서 갈라도 획이 안 잘린다.
//    그림이 칸 안에서 작아서 그린 범위에 여백 20px을 두고 잘랐다(2026-11-09 측정).
//    버스 칸은 오른쪽 아래 구석에 밝기 227짜리 점 1개가 있어(JPEG 잡티, 로고 아님) 그 구석을 빼고 잘랐다.
const grid = at('assets/images/grid_dog_dogs_cats_buses.jpg');
const crops = {dog1: '270:290:120:130', dogs2: '470:290:535:130', cats2: '400:280:60:640', buses2: '470:290:530:640'};
mkdirSync(at('assets/images/panels'), {recursive: true});
for (const [name, spec] of Object.entries(crops)) ffmpeg(['-i', grid, '-vf', `crop=${spec}`, '-q:v', '2', at('assets/images/panels', `${name}.jpg`)], name);
console.log('done');
