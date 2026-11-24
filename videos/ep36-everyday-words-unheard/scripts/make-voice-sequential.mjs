import {existsSync} from 'node:fs';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {generateAiStudioSpeech} from '../../../scripts/generate-aistudio-speech.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const BASE = join(HERE, '..', 'assets');

const KO_STYLE =
  'Warm, friendly Korean adult speaking conversationally to a friend in a calm, engaging YouTube explainer rhythm, never stiff textbook announcing. Pronounce every word and final syllable clearly and crisply at full voice. Do not whisper, swallow, or trail off on the final word.';

const EN_WORD_STYLE = (word, ipa, note) =>
  `Crisp, natural General American English pronunciation of the single word "${word}" ${ipa} (${note}). Single word only, clear natural conversational studio delivery, zero trailing breath.`;

const EN_SENT_STYLE =
  'Natural, relaxed General American English adult speaking at normal everyday conversational speed (not slow textbook reading, not rushed), warm clear studio voice.';

const JOBS = [
  // Korean narration segments (exact approved SCRIPT.md v2, split cleanly at native-audio interleave points)
  {voice: 'Gero', style: KO_STYLE, text: '방금 세 단어, 몇 개나 들리셨어요? 초콜릿, 카메라, 스테이크. 다 아는 단어인데 막상 원어민이 툭 던지면 멍해지죠. 우리가 평소에 한국말처럼 쓰는 발음이랑 영어 소리가 아예 다르게 생겨서 그래요.', output: join(BASE, 'voice', 'c00.wav')},
  {voice: 'Gero', style: KO_STYLE, text: '본격적으로 들어가기 전에, 자막 끄고 딱 세 문장만 먼저 들어 볼게요. 오늘 나올 일곱 단어가 그대로 들어가 있습니다.', output: join(BASE, 'voice', 'c01a.wav')},
  {voice: 'Gero', style: KO_STYLE, text: '좀 훅 지나갔죠? 지금 다 안 들려도 상관없어요. 영상 끝무렵에 속도 하나 안 바꾸고 이 세 문장 그대로 다시 틀어 드릴게요. 지금 몇 단어쯤 잡혔는지만 머릿속에 살짝 담아 두면 됩니다.', output: join(BASE, 'voice', 'c01b.wav')},
  {voice: 'Gero', style: KO_STYLE, text: '제일 만만한 초콜릿부터 들어 볼게요. 우리가 편의점이나 마트에서 뭐라고 해요? 초콜릿 하나 사 올게. 초, 콜, 릿. 세 글자로 또박또박 말하잖아요. 철자도 길고, 입에도 세 박자가 딱 붙어 있죠. 근데 원어민은 가운데 콜을 거의 안 읽어요. 들어 볼까요?', output: join(BASE, 'voice', 'c02a.wav')},
  {voice: 'Gero', style: KO_STYLE, text: '초클릿, 딱 두 박자. 앞에 초만 세게 찍고 뒤는 그냥 흘려 넘겨서 초클릿으로 끝나요. 사진 찍을 때 맨날 쓰는 카메라도 비슷한 일이 생깁니다. 한글로는 카, 메, 라 세 글자인데, 원어민 소리는 어떨까요?', output: join(BASE, 'voice', 'c02b.wav')},
  {voice: 'Gero', style: KO_STYLE, text: '캠러. 방금 메 어디 갔지 싶죠? 가운데 약한 글자를 건너뛰고 앞뒤를 붙여서 진짜 두 박자밖에 안 남아요.', output: join(BASE, 'voice', 'c02c.wav')},
  {voice: 'Gero', style: KO_STYLE, text: '미드에서 의자나 옷 얘기할 때 정말 자주 나오는 컴퍼터블. 한글로 쓰면 컴, 퍼, 터, 블 네 글자죠. 입도 네 번이나 움직여야 돼요. 막상 들어 보면 가운데 퍼가 쏙 빠지고 컴프터블처럼 짧아집니다.', output: join(BASE, 'voice', 'c03a.wav')},
  {voice: 'Gero', style: KO_STYLE, text: '입에선 벌써 끝났는데 내 머릿속엔 네 글자가 남아 있으니까 자꾸 놓치게 되죠. 앞에 힘이 들어가면 바로 뒤 글자는 빠진다, 일단 이것만 기억하면 돼요.', output: join(BASE, 'voice', 'c03b.wav')},
  {voice: 'Gero', style: KO_STYLE, text: '방금은 글자가 빠진 거였죠. 반대로 한국어가 글자를 억지로 늘려 놓은 단어도 있어요. 글자 보기 전에 소리 먼저 하나 들어 보실래요?', output: join(BASE, 'voice', 'c04.wav')},
  {voice: 'Gero', style: KO_STYLE, text: '방금 이거 무슨 단어인 줄 아셨어요? 스테이크예요. 스, 테, 이, 크, 한글로 세면 네 글자잖아요. 근데 영어에선 딱 한 박자. 스테익!', output: join(BASE, 'voice', 'c05a.wav')},
  {voice: 'Gero', style: KO_STYLE, text: '왜 이렇게 짧아지냐면요, 우리말은 자음 혼자서는 글자를 못 쓰잖아요. 그래서 스, 크 뒤에 억지로 으를 붙여서 네 덩어리로 읽는데, 영어엔 그 으가 없거든요. 앞에 에스는 소리 대신 이 사이로 바람만 쓰 하고 스치고, 끝의 케이도 입안에서 툭 막고 끝납니다. 원어민이 혀가 빨라서가 아니에요. 우린 네 번 끊어 읽을 걸 저쪽은 숨 한 번에 끝내니까 당연히 안 들릴 수밖에 없어요.', output: join(BASE, 'voice', 'c05b.wav')},
  {voice: 'Gero', style: KO_STYLE, text: '이제 남은 세 단어는 아예 얘기가 달라요. 우리가 평소에 복숭아 알레르기 있어, 이런 말 자주 하잖아요. 사실 알레르기는 영어 발음이 아니라 독일어에서 온 말이에요. 미드나 유튜브에서 원어민이 말할 땐 아예 딴소리가 납니다.', output: join(BASE, 'voice', 'c06a.wav')},
  {voice: 'Gero', style: KO_STYLE, text: '앨러지! 알, 레, 르, 기랑 앨러지. 소리가 아예 다른 단어처럼 들리죠. 약국에서 매일 보는 비타민도 미국 영어에선 첫 글자부터 바뀝니다. 우린 그냥 다 비타민이라고 하고 영국 쪽도 비슷하게 읽긴 해요. 미국 드라마나 일상 대화에선요?', output: join(BASE, 'voice', 'c06b.wav')},
  {voice: 'Gero', style: KO_STYLE, text: '바이러민! 앞을 바이로 확 열고 가운데 티까지 부드럽게 굴립니다. 머릿속엔 비타민만 들어 있는데 영상에서 테이크 유어 바이러민 하면 무슨 낯선 약 이름인가 싶죠.', output: join(BASE, 'voice', 'c06c.wav')},
  {voice: 'Gero', style: KO_STYLE, text: '마지막으로 하나만 직접 맞혀 볼까요? 호텔 조식에서 자주 보는 뷔페. 이것도 영어 소리가 아니라 프랑스어 발음이 그대로 들어왔어요. 그럼 미국 원어민은 이 단어를 어떻게 읽을까요? 잠깐, 입 밖으로 한 번만 말해 보세요.', output: join(BASE, 'voice', 'c07a.wav')},
  {voice: 'Gero', style: KO_STYLE, text: '버페이! 앞에 힘을 빼고 뒤에 페이를 올려서 버페이. 뷔페랑은 소리가 아예 다르죠. 이제 드라마나 여행 영상에서 버페이 나오면 낯설지 않을 텐데요.', output: join(BASE, 'voice', 'c07b.wav')},
  {voice: 'Gero', style: KO_STYLE, text: '그럼 처음에 들었던 그 세 문장, 속도 그대로 다시 틀어 드릴게요. 아까보다 몇 단어 더 들리는지 직접 한 번 세어 볼까요?', output: join(BASE, 'voice', 'c08.wav')},
  {voice: 'Gero', style: KO_STYLE, text: '어떠세요, 아까보단 귀에 걸리는 단어가 꽤 늘었죠? 자막 켜고 바로 확인해 볼게요.', output: join(BASE, 'voice', 'c09a.wav')},
  {voice: 'Gero', style: KO_STYLE, text: '첫 문장에 캠러, 초클릿, 컴프터블.', output: join(BASE, 'voice', 'c09b.wav')},
  {voice: 'Gero', style: KO_STYLE, text: '둘째 문장에 스테익.', output: join(BASE, 'voice', 'c09c.wav')},
  {voice: 'Gero', style: KO_STYLE, text: '마지막 문장에 버페이, 앨러지, 바이러민까지. 속도 하나도 안 줄였는데, 가운데 빠지고 한 박자로 줄고 애초에 발음이 다르다는 것만 알아도 귀가 다르게 열립니다.', output: join(BASE, 'voice', 'c09d.wav')},
  {voice: 'Gero', style: KO_STYLE, text: '오늘 나온 일곱 단어, 화면에 한 번에 띄워 둘게요. 외우려고 애쓰실 필요 없고, 필요할 때 잠깐 멈춰 놓고 캡처해 두셔도 됩니다. 일곱 개 중에 제일 이게 이 소리였어 싶었던 단어 하나만 댓글에 남겨 주세요.', output: join(BASE, 'voice', 'c10.wav')},

  // Native General American English words (Olin, crisp everyday American pronunciation)
  {voice: 'Olin', style: EN_WORD_STYLE('chocolate', '/ˈtʃɑːklət/', 'two syllables CHAHK-luht, elided middle o'), text: 'chocolate', output: join(BASE, 'voice-en', 'chocolate.wav')},
  {voice: 'Olin', style: EN_WORD_STYLE('camera', '/ˈkæmrə/', 'two syllables KAM-ruh, elided middle e'), text: 'camera', output: join(BASE, 'voice-en', 'camera.wav')},
  {voice: 'Olin', style: EN_WORD_STYLE('comfortable', '/ˈkʌmftɚbəl/', 'compressed three syllables KUMF-ter-bul, dropped middle or'), text: 'comfortable', output: join(BASE, 'voice-en', 'comfortable.wav')},
  {voice: 'Olin', style: EN_WORD_STYLE('steak', '/steɪk/', 'one crisp syllable STAYK, never two syllables'), text: 'steak', output: join(BASE, 'voice-en', 'steak.wav')},
  {voice: 'Olin', style: EN_WORD_STYLE('allergy', '/ˈælɚdʒi/', 'American AL-er-jee with soft j sound'), text: 'allergy', output: join(BASE, 'voice-en', 'allergy.wav')},
  {voice: 'Olin', style: EN_WORD_STYLE('vitamin', '/ˈvaɪt̬əmɪn/', 'American VY-duh-min with long I and flapped t'), text: 'vitamin', output: join(BASE, 'voice-en', 'vitamin.wav')},
  {voice: 'Olin', style: EN_WORD_STYLE('buffet', '/bəˈfeɪ/', 'American buh-FAY with stress on second syllable and silent t'), text: 'buffet', output: join(BASE, 'voice-en', 'buffet.wav')},

  // Native General American English natural-speed sentences (Before/After exact reuse)
  {voice: 'Olin', style: EN_SENT_STYLE, text: 'Grab your camera — this chocolate is great, and this chair is so comfortable.', output: join(BASE, 'voice-en', 'sent1.wav')},
  {voice: 'Olin', style: EN_SENT_STYLE, text: 'We ordered a steak at the hotel.', output: join(BASE, 'voice-en', 'sent2.wav')},
  {voice: 'Olin', style: EN_SENT_STYLE, text: 'Check the buffet for your allergy, and take your vitamin.', output: join(BASE, 'voice-en', 'sent3.wav')},
];

let created = 0;
for (let i = 0; i < JOBS.length; i++) {
  const job = JOBS[i];
  if (existsSync(job.output)) {
    console.log(`[${i + 1}/${JOBS.length}] SKIP (exists): ${job.output}`);
    continue;
  }
  const t0 = Date.now();
  const res = await generateAiStudioSpeech(job);
  created++;
  console.log(`[${i + 1}/${JOBS.length}] OK (${((Date.now() - t0) / 1000).toFixed(1)}s): ${res.file} (${res.bytes} bytes, ${res.voice})`);
  await new Promise((r) => setTimeout(r, 2200));
}
console.log(`VOICE DONE. Newly created: ${created}/${JOBS.length}`);
