import {existsSync} from 'node:fs';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {generateAiStudioSpeech} from '../../../scripts/generate-aistudio-speech.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const BASE = join(HERE, '..', 'assets');

const KO_STYLE =
  'Warm, friendly Korean adult speaking conversationally to a friend, lively and natural rhythm, never stiff textbook announcing. Finish each sentence crisply and briskly. Do not stretch, drag or trail off on the final syllable.';

const JOBS = [
  {voice: 'Gero', style: KO_STYLE, text: '스트레스, 영어로는 한 번에 끝나요.', output: join(BASE, 'voice', 'c00.wav')},
  {voice: 'Gero', style: KO_STYLE, text: "자음 사이 '으'만 쏙 빼면 되거든요.", output: join(BASE, 'voice', 'c01.wav')},
  {voice: 'Gero', style: KO_STYLE, text: '스트레스부터!', output: join(BASE, 'voice', 'c02.wav')},
  {voice: 'Gero', style: KO_STYLE, text: '앞엔 바람만 가볍게 스쳐요.', output: join(BASE, 'voice', 'c03.wav')},
  {voice: 'Gero', style: KO_STYLE, text: '스크린도 같아요.', output: join(BASE, 'voice', 'c04.wav')},
  {voice: 'Gero', style: KO_STYLE, text: '세 글자가 한 번에 쫙 붙죠.', output: join(BASE, 'voice', 'c05.wav')},
  {voice: 'Gero', style: KO_STYLE, text: '스프레이는요?', output: join(BASE, 'voice', 'c06.wav')},
  {voice: 'Gero', style: KO_STYLE, text: '칙 한 번 뿜듯 숨으로 뱉어요.', output: join(BASE, 'voice', 'c07.wav')},
  {voice: 'Gero', style: KO_STYLE, text: '다섯 글자, 직접 해 볼까요?', output: join(BASE, 'voice', 'c09.wav')},
  {voice: 'Gero', style: KO_STYLE, text: '길게 끌지 말고 한 번에 툭!', output: join(BASE, 'voice', 'c10.wav')},
  {voice: 'Gero', style: KO_STYLE, text: '고정 댓글에 네 단어 더 적어 뒀어요.', output: join(BASE, 'voice', 'c11.wav')},
  {
    voice: 'Olin',
    style:
      'Crisp, natural General American English pronunciation of the single word "stress" /stres/ in ONE tight syllable (tight str- consonant cluster with zero extra vowel between s, t, r). Single word only, crisp natural delivery.',
    text: 'stress',
    output: join(BASE, 'voice-en', 'stress.wav'),
  },
  {
    voice: 'Olin',
    style:
      'Crisp, natural General American English pronunciation of the single word "screen" /skriːn/ in ONE tight syllable (tight scr- consonant cluster with zero extra vowel between s, k, r). Single word only, crisp natural delivery.',
    text: 'screen',
    output: join(BASE, 'voice-en', 'screen.wav'),
  },
  {
    voice: 'Olin',
    style:
      'Crisp, natural General American English pronunciation of the single word "spray" /spreɪ/ in ONE tight syllable (tight spr- consonant cluster with zero extra vowel between s, p, r). Single word only, crisp natural delivery.',
    text: 'spray',
    output: join(BASE, 'voice-en', 'spray.wav'),
  },
  {
    voice: 'Olin',
    style:
      'Crisp, natural General American English pronunciation of the single word "strike" /straɪk/ in ONE tight syllable (tight str- cluster and crisp clean final k with zero extra trailing vowel). Single word only, crisp natural delivery.',
    text: 'strike',
    output: join(BASE, 'voice-en', 'strike.wav'),
  },
];

let created = 0;
for (const job of JOBS) {
  if (existsSync(job.output)) {
    console.log(`SKIP (exists): ${job.output}`);
    continue;
  }
  const t0 = Date.now();
  const res = await generateAiStudioSpeech(job);
  created++;
  console.log(`OK (${((Date.now() - t0) / 1000).toFixed(1)}s): ${res.file} (${res.bytes} bytes, ${res.voice})`);
  await new Promise((r) => setTimeout(r, 3000));
}
console.log(`VOICE DONE. Newly created: ${created}`);
