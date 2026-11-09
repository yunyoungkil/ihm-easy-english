#!/usr/bin/env node
// EP26 쇼츠 재료 준비: 나레이션을 줄별로 자르고, 원어민 문장·단어, 글꼴·배경음·효과음·손 그림, 롱폼 썸네일을 가져오고,
// 마커 그림을 위아래로 나눈다. 여러 번 돌려도 같은 결과가 나온다.
//
// 나레이션 줄 경계는 소리 크기(쉼 -38dB 0.25초)로 찾고, 자른 조각을 하나씩 whisper로 받아 적어 대본과 같은지
// 확인했다(2026-11-09).
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
  ['n01', 0.26, 3.54], // 길을 알려 줄 때 쓰는 문장인데, 라이트가 두 번 나옵니다.
  ['n02', 4.27, 7.12], // 앞의 라이트와 뒤의 라이트, 같은 소리일까요?
  ['n03', 7.94, 9.02], // 서로 다른 소리입니다.
  ['n04', 9.68, 12.70], // 앞은 오른쪽이고, 뒤는 신호등이거든요.
  ['n05', 13.52, 17.50], // 우리말에는 리을 소리가 하나뿐이라, 둘이 똑같이 들리기 쉽습니다.
  ['n06', 18.23, 19.76], // 차이는 혀끝에 있습니다.
  ['n07', 20.34, 24.13], // 혀끝을 입천장에 대지 않고 띄워 두면 오른쪽입니다.
  ['n08', 24.72, 27.95], // 혀끝을 윗니 뒤 잇몸에 붙이면 신호등입니다.
  ['n09', 28.55, 30.07], // 이제 문장을 다시 들어 보세요.
  ['n10', 30.56, 35.45], // 짝단어 스무 쌍으로 더 연습하고 싶으시면, 화면 아래 링크에 전체 영상이 있습니다.
];
const LEAD = 0.05;
const TAIL = 0.2;
const FADE = 0.05;
for (const [id, a, b] of LINES) {
  const start = Math.max(0, a - LEAD);
  const dur = b + TAIL - start;
  ffmpeg(['-ss', start.toFixed(3), '-t', dur.toFixed(3), '-i', at('assets/voice/narration_all.wav'), '-af', `afade=t=out:st=${(dur - FADE).toFixed(3)}:d=${FADE}`, '-ar', '24000', '-ac', '1', '-c:a', 'pcm_s16le', at('assets/voice', `${id}.wav`)], id);
}

// 2) 원어민: 문장 하나와 단어 둘. 단어는 남성 음성으로 통일한다(BRIEF.md, 목소리 차이가 소리 차이처럼 들리지 않게).
const longformVoice = join(videos, 'ep26-r-vs-l', 'assets', 'voice');
for (const name of ['dial_01_right_light', 'm_w01_right', 'm_w02_light']) copy(join(longformVoice, `${name}.wav`), at('assets/voice', `${name}.wav`));

// 3) EP24·25 쇼츠와 같은 글꼴·배경음·효과음·손 그림. 마지막 안내는 세 편이 같아야 쇼츠→롱폼 숫자를 견줄 수 있다.
const ep24 = join(videos, 'ep24-shorts-sheep-ship', 'assets');
copy(join(ep24, 'fonts', 'NotoSansKR-subset.ttf'), at('assets/fonts/NotoSansKR-subset.ttf'));
copy(join(ep24, 'bgm', 'track.mp3'), at('assets/bgm/track.mp3'));
for (const s of ['pop', 'click-soft', 'whoosh']) copy(join(ep24, 'sfx', `${s}.mp3`), at('assets/sfx', `${s}.mp3`));
copy(join(ep24, 'images', 'cta_hand.png'), at('assets/images/cta_hand.png'));

// 4) 롱폼 썸네일(마지막 5초 안내 카드)
const longThumb = join(root, '..', '..', 'output', 'upload-packages', 'ep26-r-vs-l', 'thumbnail.jpg');
ffmpeg(['-i', longThumb, '-vf', 'scale=860:-2', '-q:v', '3', at('assets/images/longform_thumb.jpg')], 'longform thumb');

// 5) 마커 그림을 위아래로 나눈다. 경계는 줄마다 어두운 점 수를 세어 정했다(2026-11-09).
//    차·신호등: 521~578줄이 완전히 비어 있어 550에서 자른다.
//    혀: 빈 줄이 없다. 위 그림 목선은 512줄까지, 아래 그림 이마선은 505줄부터라 위는 0~500, 아래는 513부터 자른다.
mkdirSync(at('assets/images/panels'), {recursive: true});
const crop = (src, spec, out) => ffmpeg(['-i', at('assets/images', src), '-vf', `crop=${spec}`, '-q:v', '2', at('assets/images/panels', out)], out);
crop('pair_right_light.jpg', '1024:550:0:0', 'car_right.jpg');
crop('pair_right_light.jpg', '1024:474:0:550', 'traffic_light.jpg');
crop('tongue_free_touch.jpg', '1024:500:0:0', 'tongue_free.jpg');
crop('tongue_free_touch.jpg', '1024:511:0:513', 'tongue_touch.jpg');

if (!existsSync(at('assets/images/panels/tongue_touch.jpg'))) throw new Error('panels missing');
console.log('done');
