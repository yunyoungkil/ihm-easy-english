import {existsSync} from 'node:fs';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {generateAiStudioSpeech} from '../../../scripts/generate-aistudio-speech.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const BASE = join(HERE, '..', 'assets');

const KO_STYLE =
  'Warm, friendly Korean adult speaking conversationally to a friend, lively and natural rhythm, never stiff textbook announcing. Pronounce every word and final syllable clearly and crisply at full voice. Do not whisper, swallow, or trail off on the final word.';

const JOBS = [
  {voice: 'Gero', style: KO_STYLE, text: '연어 살몬, 영어에선 엘을 안 읽어요.', output: join(BASE, 'voice', 'c00.wav')},
  {voice: 'Gero', style: KO_STYLE, text: '옛날 학자들이 멋 내려고 끼워 넣었거든요.', output: join(BASE, 'voice', 'c01.wav')},
  {voice: 'Gero', style: KO_STYLE, text: '연어부터 볼까요?', output: join(BASE, 'voice', 'c02.wav')},
  {voice: 'Gero', style: KO_STYLE, text: '엘만 떼면 새먼이죠.', output: join(BASE, 'voice', 'c03.wav')},
  {voice: 'Gero', style: KO_STYLE, text: '영수증은 어떨까요?', output: join(BASE, 'voice', 'c04.wav')},
  {voice: 'Gero', style: KO_STYLE, text: '피 글자 빼고 리싯으로 읽어요.', output: join(BASE, 'voice', 'c05.wav')},
  {voice: 'Gero', style: KO_STYLE, text: '이건 빚이에요.', output: join(BASE, 'voice', 'c06.wav')},
  {voice: 'Gero', style: KO_STYLE, text: '비 글자 없이 깔끔하게 뎃!', output: join(BASE, 'voice', 'c07.wav')},
  {voice: 'Gero', style: KO_STYLE, text: '섬은 착각해서 에스를 넣었대요.', output: join(BASE, 'voice', 'c08.wav')},
  {voice: 'Gero', style: KO_STYLE, text: '그럼 이건요? 하나 빼고 읽어 볼까요?', output: join(BASE, 'voice', 'c10.wav')},
  {voice: 'Gero', style: KO_STYLE, text: '비 글자 빼고 다웃! 제일 억울한 단어는 뭐였나요?', output: join(BASE, 'voice', 'c11.wav')},
  {
    voice: 'Olin',
    style:
      'Crisp, natural General American English pronunciation of the single word "salmon" /ˈsæmən/ with a COMPLETELY SILENT letter L (never pronounce any L sound). Single word only, clear natural studio delivery.',
    text: 'salmon',
    output: join(BASE, 'voice-en', 'salmon.wav'),
  },
  {
    voice: 'Olin',
    style:
      'Crisp, natural General American English pronunciation of the single word "receipt" /rɪˈsiːt/ with a COMPLETELY SILENT letter P (never pronounce any P sound). Single word only, clear natural studio delivery.',
    text: 'receipt',
    output: join(BASE, 'voice-en', 'receipt.wav'),
  },
  {
    voice: 'Olin',
    style:
      'Crisp, natural General American English pronunciation of the single word "debt" /det/ with a COMPLETELY SILENT letter B (rhymes cleanly with "met", never pronounce any B sound). Single word only, clear natural studio delivery.',
    text: 'debt',
    output: join(BASE, 'voice-en', 'debt.wav'),
  },
  {
    voice: 'Olin',
    style:
      'Crisp, natural General American English pronunciation of the single word "island" /ˈaɪlənd/ with a COMPLETELY SILENT letter S (never pronounce any S sound). Single word only, clear natural studio delivery.',
    text: 'island',
    output: join(BASE, 'voice-en', 'island.wav'),
  },
  {
    voice: 'Olin',
    style:
      'Crisp, natural General American English pronunciation of the single word "doubt" /daʊt/ with a COMPLETELY SILENT letter B (rhymes cleanly with "out", never pronounce any B sound). Single word only, clear natural studio delivery.',
    text: 'doubt',
    output: join(BASE, 'voice-en', 'doubt.wav'),
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
