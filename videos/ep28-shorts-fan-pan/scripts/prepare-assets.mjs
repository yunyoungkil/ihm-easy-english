#!/usr/bin/env node
// EP28 쇼츠 재료 준비: 나레이션을 줄별로 자르고, 원어민 fan·pan을 소리만 남겨 다듬고, 글꼴·배경음·효과음·손 그림·롱폼 썸네일을
// 가져오고, 마커 그림을 위아래로 자른다. 여러 번 돌려도 같은 결과가 나온다.
//
// 나레이션 줄 경계는 소리 크기(쉼 -38dB 0.25초)로 찾았다(2026-11-09). "이번엔 네 번입니다."와 "아이돌 팬은 몇 번일까요?"는
// 한 줄이지만 문장 사이 쉼이 0.6초라 둘로 나눴다(n06, n07).
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

// 1) 나레이션 9조각 (대본 8줄, 6줄은 문장 둘로 나눔)
const LINES = [
  ['n01', 0.0, 4.87], // 아이돌 팬도 팬, 프라이팬도 팬, 한글로는 똑같이 적습니다.
  ['n02', 5.61, 8.69], // 다섯 번 들려 드릴 테니, 프라이팬이 몇 번인지 세어 보세요.
  ['n03', 9.43, 10.68], // 정답은 두 번입니다.
  ['n04', 11.34, 15.21], // 프라이팬은 두 입술을 붙였다가 팡 하고 떼면서 시작합니다.
  ['n05', 15.87, 21.38], // 아이돌 팬은 윗니를 아랫입술에 살짝 대고, 바람을 흘려보내면서 시작하고요.
  ['n06', 22.17, 23.33], // 이번엔 네 번입니다.
  ['n07', 23.94, 25.33], // 아이돌 팬은 몇 번일까요?
  ['n08', 26.11, 26.95], // 한 번이었습니다.
  ['n09', 28.0, 32.32], // 짝단어 스물네 쌍을 반복해 듣는 전체 영상은 화면 아래 링크에 있습니다.
];
const LEAD = 0.05;
const TAIL = 0.2;
const FADE = 0.05;
for (const [id, a, b] of LINES) {
  const start = Math.max(0, a - LEAD);
  const dur = b + TAIL - start;
  ffmpeg(['-ss', start.toFixed(3), '-t', dur.toFixed(3), '-i', at('assets/voice/narration_all.wav'), '-af', `afade=t=out:st=${(dur - FADE).toFixed(3)}:d=${FADE}`, '-ar', '24000', '-ac', '1', '-c:a', 'pcm_s16le', at('assets/voice', `${id}.wav`)], id);
}

// 2) 원어민 fan·pan: 롱폼의 같은 남성 음성. 세어 보기 문제는 단어가 빠르게 이어져야 해서 앞뒤 무음을 걷어 낸다.
//    소리 구간(-40dB, 2026-11-09 측정): fan 0.24~0.80초, pan 0.00~0.45초. 앞 0.06초, 뒤 0.15초 여유를 두고 0.05초 페이드.
const longformVoice = join(videos, 'ep28-f-vs-p', 'assets', 'voice');
const TRIM = {m_w01_fan: [0.18, 0.95], m_w02_pan: [0.0, 0.62]};
for (const [name, [a, b]] of Object.entries(TRIM)) {
  ffmpeg(['-ss', String(a), '-t', String(b - a), '-i', join(longformVoice, `${name}.wav`), '-af', `afade=t=out:st=${(b - a - 0.05).toFixed(3)}:d=0.05`, '-ar', '24000', '-ac', '1', '-c:a', 'pcm_s16le', at('assets/voice', `${name}.wav`)], name);
}

// 3) EP24~26 쇼츠와 같은 글꼴·배경음·효과음·손 그림
const ep24 = join(videos, 'ep24-shorts-sheep-ship', 'assets');
copy(join(ep24, 'fonts', 'NotoSansKR-subset.ttf'), at('assets/fonts/NotoSansKR-subset.ttf'));
copy(join(ep24, 'bgm', 'track.mp3'), at('assets/bgm/track.mp3'));
for (const s of ['pop', 'click-soft', 'whoosh']) copy(join(ep24, 'sfx', `${s}.mp3`), at('assets/sfx', `${s}.mp3`));
copy(join(ep24, 'images', 'cta_hand.png'), at('assets/images/cta_hand.png'));

// 4) 롱폼 썸네일(마지막 5초 안내 카드)
ffmpeg(['-i', join(root, '..', '..', 'output', 'upload-packages', 'ep28-f-vs-p', 'thumbnail.jpg'), '-vf', 'scale=860:-2', '-q:v', '3', at('assets/images/longform_thumb.jpg')], 'longform thumb');

// 5) 마커 그림 자르기. 줄마다 어두운 점 수를 세어 정했다(2026-11-09): 응원봉·프라이팬은 473~600줄, 입 모양은 423~571줄이
//    비어 있어 512에서 갈라도 획이 안 잘린다. 그린 범위에 여백 20px을 두고 잘랐다.
mkdirSync(at('assets/images/panels'), {recursive: true});
const crop = (src, spec, out) => ffmpeg(['-i', at('assets/images', src), '-vf', `crop=${spec}`, '-q:v', '2', at('assets/images/panels', out)], out);
crop('pair_lightstick_pan.jpg', '232:430:393:62', 'lightstick.jpg');
crop('pair_lightstick_pan.jpg', '692:344:182:581', 'pan.jpg');
crop('lips_close_touch.jpg', '809:334:107:108', 'lips_close.jpg');
crop('lips_close_touch.jpg', '799:386:112:552', 'lips_touch.jpg');
console.log('done');
