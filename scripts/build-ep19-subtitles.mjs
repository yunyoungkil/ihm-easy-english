import fs from 'fs';
import path from 'path';

const TOTAL_DURATION = 455.04;
const outDir = 'output/upload-packages/ep19-ate-suffix-longform';
const subDir = path.join(outDir, 'subtitles');
fs.mkdirSync(subDir, { recursive: true });

const raw = JSON.parse(fs.readFileSync('scripts/ep19-captions-raw.json', 'utf8'));
const translations = JSON.parse(fs.readFileSync('scripts/ep19-translations.json', 'utf8'));

// End time = next caption's start (chained across frames since it's one continuous
// timeline); the last caption holds until the total video duration.
const captions = raw.map((c, idx) => ({
  start: c.t,
  end: idx + 1 < raw.length ? raw[idx + 1].t : TOTAL_DURATION,
  text: c.text,
}));

function formatSrtTime(seconds) {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);
  return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')},${String(ms).padStart(3, '0')}`;
}

function buildSrt(textList) {
  let srt = '';
  captions.forEach((c, idx) => {
    const text = textList[idx];
    srt += `${idx + 1}\n${formatSrtTime(c.start)} --> ${formatSrtTime(c.end)}\n${text}\n\n`;
  });
  return srt;
}

// Korean (source)
fs.writeFileSync(path.join(subDir, 'subtitles-ko.srt'), buildSrt(captions.map(c => c.text)), 'utf8');

// Other languages
for (const code of Object.keys(translations)) {
  fs.writeFileSync(path.join(subDir, `subtitles-${code}.srt`), buildSrt(translations[code]), 'utf8');
}
console.log(`Generated ${1 + Object.keys(translations).length} SRT files in ${subDir}`);

// Multilingual metadata (title/description per language for YouTube's multi-language
// metadata fields — lang field is "원어 표기 (한국어 설명)" per production-rules.md).
const metadata = {
  ko: {
    lang: "한국어 (기본 메타데이터)",
    title: "헷갈리던 -ate 발음 차이 이 원리 하나 알고 나니 입에서 바로 구분됩니다 | 영어 발음 차이",
    desc: `estimate, graduate, separate, certificate, moderate, delegate... 스펠링은 분명 똑같은데 동사일 땐 '에이트'로 또렷하게, 명사·형용사일 땐 힘 빠진 '엇/잇'으로 들리는 걸 눈치채셨나요?
이걸 단어마다 따로 외우려니 영어가 끝없는 암기처럼 느껴졌던 겁니다. 사실 이건 예외가 아니라 딱 하나의 강세-모음축약 원리로 전부 설명됩니다.
오늘 이 원리 하나만 기억하시면, 처음 보는 -ate 단어도 사전 없이 바로 구분해서 읽을 수 있습니다.

「이해하면 쉬운영어」입니다. 왕초보도 이해할 수 있게, 소리 에너지의 물리적 원리로 설명합니다.

📌 오늘 배우는 내용
・estimate/graduate 동사·명사 발음이 다른 이유 (1음절 제1강세는 공통, 끝소리 에너지가 다름)
・동사일 때: 끝의 -ate까지 힘을 살려 '에이트'
・명사·형용사일 때: 앞머리만 힘주고 뒤는 힘 빼서 '엇/잇'
・실전 3회 반복 낭독: estimate(견적서) / separate(식당 계산) / certificate(자격증)
・반전 꿀팁: chocolate, climate, private도 전부 같은 원리
・실전 퀴즈 2라운드 (moderate, delegate)
・문장 속 듣기 트레이닝 + 한 장 요약 치트시트

⏱️ 챕터 타임라인
0:00 estimate, graduate — 왜 소리가 다를까?
0:30 채널 소개 & 핵심 공식 선언
0:53 소리의 진짜 비밀: 끝소리 에너지 법칙
1:43 1번 실전: estimate (견적서 맥락)
2:27 2번 실전: separate (식당 계산 맥락)
3:17 3번 실전: certificate (자격증 맥락)
4:10 반전: 초콜릿도 이 원리였다 (chocolate, climate, private)
5:04 실전 퀴즈 1라운드 (moderate)
5:39 실전 퀴즈 2라운드 (delegate)
6:12 문장 속에서 듣기 트레이닝
6:45 한 장 요약 총정리
7:14 엔딩

영어는 무작정 외우는 것이 아니라, 소리의 원리를 이해하는 것입니다.
구독과 좋아요는 다음 영상 제작에 큰 힘이 됩니다.

#영어발음 #파닉스 #영어발음차이 #영어읽기 #왕초보영어 #영어공부 #영단어 #발음원리 #성인영어 #기초영어`
  },
  en: {
    lang: "English (글로벌 공용어 & 알고리즘 인덱싱)",
    title: "Why Does \"-ate\" Sound Different in estimate vs. graduate? | English Pronunciation Rule",
    desc: `estimate, graduate, separate, certificate, moderate, delegate... The spelling never changes, but did you notice the verb form rings out with a clear "-ate" while the noun/adjective form fades into a soft "-it"?
Trying to memorize each one as a random exception makes English feel exhausting. But this isn't an exception at all — it's explained by a single stress-and-vowel-reduction rule.
Remember just this one principle today, and you'll be able to read brand-new "-ate" words correctly without ever checking a dictionary.

Welcome to "Easy English When Understood." We explain English through the physical mechanics of sound energy so even complete beginners can master it.

📌 What you will learn today
• Why estimate/graduate sound different as verbs vs. nouns (same primary stress, different ending energy)
• As a verb: keep the energy all the way through — "-ate"
• As a noun/adjective: stress the front, drop the end — "-it"
• 3x practice drills: estimate (a quote), separate (splitting a restaurant bill), certificate
• Plot twist: chocolate, climate, and private follow the exact same rule
• 2-round instant quiz (moderate, delegate)
• Sentence listening practice + 1-page summary cheat sheet

⏱️ Chapters
0:00 estimate, graduate — why do they sound different?
0:30 Channel intro & the core formula
0:53 The real secret: the end-sound energy rule
1:43 Practice 1: estimate (getting a quote)
2:27 Practice 2: separate (splitting the check)
3:17 Practice 3: certificate
4:10 Plot twist: chocolate follows the same rule (climate, private too)
5:04 Quiz round 1 (moderate)
5:39 Quiz round 2 (delegate)
6:12 Listening practice in full sentences
6:45 1-page summary
7:14 Closing

#EnglishPronunciation #Phonics #LearnEnglish #EnglishSpeaking #PronunciationRules #AdultPhonics #BeginnerEnglish #VowelReduction`
  },
  ja: {
    lang: "日本語 (Japanese - 일본 시청자 타겟)",
    title: "estimateとgraduateの「-ate」の音が違う理由 | 大人のための英語発音ルール",
    desc: `estimate, graduate, separate, certificate, moderate, delegate... スペルは全く同じなのに、動詞のときは「エイト」とはっきり、名詞・形容詞のときは力の抜けた「エット」に聞こえること、気づいていましたか？
単語ごとに例外として暗記しようとするから、英語が終わりのない暗記作業に感じられていたのです。実はこれ、たった1つの「アクセントと母音の弱化」の原理だけで全部説明できます。
今日この原理を1つ覚えるだけで、初めて見る-ate単語も辞書なしで正しく読めるようになります。

「理解すれば簡単な英語」へようこそ。初心者でも腑に落ちるよう、発声エネルギーの物理的な仕組みから解説します。

📌 今回のレッスン内容
・estimate/graduateの動詞・名詞で発音が違う理由（第一アクセントは共通、語尾のエネルギーが違う）
・動詞のとき：語尾の-ateまで力を生かして「エイト」
・名詞・形容詞のとき：先頭だけ力を入れ、語尾は力を抜いて「エット」
・実戦3回反復音読：estimate（見積書）／separate（レストランの会計）／certificate（資格証）
・どんでん返し：chocolate, climate, privateも全部同じ原理
・実戦クイズ2ラウンド（moderate, delegate）
・文章の中で聞き取るトレーニング＋1枚まとめチートシート

⏱️ チャプター
0:00 estimate, graduate — なぜ音が違うのか？
0:30 チャンネル紹介＆核心公式の宣言
0:53 音の本当の秘密：語尾エネルギーの法則
1:43 実戦1：estimate（見積書）
2:27 実戦2：separate（レストランの会計）
3:17 実戦3：certificate（資格証）
4:10 どんでん返し：チョコレートもこの原理だった
5:04 実戦クイズ 第1ラウンド（moderate）
5:39 実戦クイズ 第2ラウンド（delegate）
6:12 文章の中で聞き取りトレーニング
6:45 1枚まとめ総整理
7:14 エンディング

#英語発音 #フォニックス #大人のやり直し英語 #発音のルール #英語初心者 #英語学習 #ネイティブ発音`
  },
  "zh-tw": {
    lang: "繁體中文 (Traditional Chinese - 台灣/香港)",
    title: "estimate 和 graduate 的「-ate」發音為什麼不一樣？| 成人英語發音規則",
    desc: `estimate, graduate, separate, certificate, moderate, delegate... 拼寫明明完全一樣，但你有沒有發現動詞時讀成清楚的「-ate」，名詞、形容詞時卻讀成無力的「-it」？
如果把每個單字都當成例外死記硬背，學英語當然覺得無窮無盡。其實這完全不是例外，只靠「重音與母音弱化」這一個原理就能全部說明。
今天只要記住這一個原理，就算是第一次看到的 -ate 單字，也能不查字典直接讀對。

歡迎來到「理解就變簡單的英語」。我們從發音能量的物理原理出發，讓初學者也能徹底理解。

⏱️ 時間戳記
0:00 estimate, graduate — 為什麼發音不一樣？
0:30 頻道介紹＆核心公式宣言
0:53 聲音的真正秘密：結尾能量法則
1:43 實戰1：estimate（估價單情境）
2:27 實戰2：separate（餐廳結帳情境）
3:17 實戰3：certificate（證書情境）
4:10 反轉真相：巧克力也是同樣的原理
5:04 實戰測驗 第1回合（moderate）
5:39 實戰測驗 第2回合（delegate）
6:12 句子聽力訓練
6:45 一張圖精華總結
7:14 結語

#英語發音 #自然拼讀 #成人學英語 #英文發音規則 #零基礎英語 #Phonics`
  },
  "zh-cn": {
    lang: "简体中文 (Simplified Chinese - 新加坡/全球华人)",
    title: "estimate 和 graduate 的“-ate”发音为什么不一样？| 成人英语发音规则",
    desc: `estimate, graduate, separate, certificate, moderate, delegate... 拼写明明完全一样，但你有没有发现动词时读成清楚的“-ate”，名词、形容词时却读成无力的“-it”？
如果把每个单词都当成例外死记硬背，学英语当然觉得无穷无尽。其实这完全不是例外，只靠“重音与元音弱化”这一个原理就能全部说明。
今天只要记住这一个原理，就算是第一次看到的 -ate 单词，也能不查字典直接读对。

欢迎来到“理解就变简单的英语”。我们从发音能量的物理原理出发，让初学者也能彻底理解。

⏱️ 时间戳
0:00 estimate, graduate — 为什么发音不一样？
0:30 频道介绍＆核心公式宣言
0:53 声音的真正秘密：结尾能量法则
1:43 实战1：estimate（报价单情境）
2:27 实战2：separate（餐厅结账情境）
3:17 实战3：certificate（证书情境）
4:10 反转真相：巧克力也是同样的原理
5:04 实战测验 第1回合（moderate）
5:39 实战测验 第2回合（delegate）
6:12 句子听力训练
6:45 一张图精华总结
7:14 结语

#英语发音 #自然拼读 #成人学英语 #英语发音规则 #零基础英语 #Phonics`
  },
  es: {
    lang: "Español (스페인어권 / 미국 히스패닉 / 중남미)",
    title: "¿Por qué \"-ate\" suena distinto en estimate y graduate? | Regla de pronunciación en inglés",
    desc: `estimate, graduate, separate, certificate, moderate, delegate... La ortografía nunca cambia, pero ¿notaste que la forma verbal suena con un claro "-ate" mientras que la forma de sustantivo o adjetivo se apaga en un suave "-it"?
Memorizar cada palabra como una excepción aleatoria hace que el inglés se sienta agotador. ¡Pero esto no es una excepción! Se explica con una sola regla de acento y reducción vocálica.
Recuerda solo este principio hoy, y podrás leer correctamente cualquier palabra nueva en "-ate" sin consultar el diccionario.

Bienvenidos a "Inglés Fácil Cuando se Entiende". Explicamos el inglés a través de la mecánica física de la energía del sonido para que cualquiera lo domine.

⏱️ Capítulos
0:00 estimate, graduate — ¿por qué suenan distinto?
0:30 Introducción del canal y la fórmula clave
0:53 El verdadero secreto: la regla de la energía final
1:43 Práctica 1: estimate (pedir un presupuesto)
2:27 Práctica 2: separate (la cuenta en el restaurante)
3:17 Práctica 3: certificate
4:10 Giro sorpresa: el chocolate sigue la misma regla
5:04 Quiz ronda 1 (moderate)
5:39 Quiz ronda 2 (delegate)
6:12 Práctica de escucha en oraciones
6:45 Hoja de resumen
7:14 Despedida

#PronunciacionIngles #FoneticaIngles #InglesDesdeCero #AprenderIngles #InglesParaAdultos`
  },
  vi: {
    lang: "Tiếng Việt (동남아 영어 학습 1위 베트남)",
    title: "Vì sao \"-ate\" trong estimate và graduate lại phát âm khác nhau? | Quy tắc phát âm tiếng Anh",
    desc: `estimate, graduate, separate, certificate, moderate, delegate... Cách viết không hề đổi, nhưng bạn có để ý dạng động từ đọc rõ ràng "-ate" còn dạng danh từ/tính từ lại yếu đi thành "-it" không?
Nếu cứ học vẹt từng từ như một ngoại lệ riêng lẻ, tiếng Anh sẽ mãi cảm thấy vô tận. Nhưng đây hoàn toàn không phải ngoại lệ — chỉ một quy tắc trọng âm và giảm nguyên âm giải thích được tất cả.
Chỉ cần nhớ nguyên lý này hôm nay, bạn sẽ đọc đúng bất kỳ từ "-ate" mới nào mà không cần tra từ điển.

Chào mừng bạn đến với "Hiểu Là Tiếng Anh Dễ Dàng". Chúng tôi giải thích tiếng Anh qua cơ chế vật lý của năng lượng âm thanh để người mới bắt đầu cũng hiểu sâu sắc.

⏱️ Dấu mốc thời gian
0:00 estimate, graduate — vì sao phát âm khác nhau?
0:30 Giới thiệu kênh & công thức cốt lõi
0:53 Bí mật thật sự: quy tắc năng lượng âm cuối
1:43 Thực hành 1: estimate (báo giá)
2:27 Thực hành 2: separate (tính tiền nhà hàng)
3:17 Thực hành 3: certificate
4:10 Bất ngờ: chocolate cũng theo đúng quy tắc này
5:04 Đố vui vòng 1 (moderate)
5:39 Đố vui vòng 2 (delegate)
6:12 Luyện nghe trong câu
6:45 Trang tổng kết
7:14 Lời kết

#PhatAmTiengAnh #HocTiengAnh #TiengAnhGiaoTiep #TuHocTiengAnh #TiengAnhChoNguoiMoiBatDau`
  }
};

fs.writeFileSync(path.join(outDir, 'multilingual-metadata.json'), JSON.stringify(metadata, null, 2), 'utf8');

// Human-readable guide
let guideTxt = `================================================================================
🌍 이해하면 쉬운영어 EP19 (-ATE 동사/명사 발음 차이) - 글로벌 다국어 유튜브 세팅 가이드
================================================================================
유튜브 스튜디오 [자막] 및 [세부정보]에서 복사해서 바로 붙여넣으실 수 있도록
핵심 6대 글로벌 언어(영어, 일본어, 중국어 번체, 중국어 간체, 스페인어, 베트남어)와 한국어 자막/메타데이터를 완비했습니다.

📁 생성된 자막 파일 (output/upload-packages/ep19-ate-suffix-longform/subtitles/):
1. subtitles-ko.srt     -> 한국어 (기본 자막)
2. subtitles-en.srt     -> English (전 세계 공용 & 유튜브 알고리즘 인덱싱)
3. subtitles-ja.srt     -> 日本語 (일본 시청자 타겟)
4. subtitles-zh-tw.srt  -> 繁體中文 (대만·홍콩 유튜브 시청자 1위 타겟)
5. subtitles-zh-cn.srt  -> 简体中文 (싱가포르·말레이시아 및 글로벌 화교 타겟)
6. subtitles-es.srt     -> Español (스페인어권 & 미국 히스패닉)
7. subtitles-vi.srt     -> Tiếng Việt (베트남 영어 학습 시청자)

📝 사용 방법
1. 유튜브 스튜디오 > 해당 영상 > [자막] 탭에서 언어별로 "새 자막 추가" > 파일 업로드로
   각 .srt 파일을 업로드합니다.
2. [세부정보] 탭의 "번역 추가"에서 multilingual-metadata.json의 title/desc를 언어별로
   복사해서 붙여넣습니다.

⚠️ 참고
- 자막 타이밍은 실측 whisper 타임스탬프(assets/voice/*.words.json) 기반 프레임 컴포지션의
  setCaption() 호출 시각을 그대로 사용했습니다. 원어(한국어) 자막이 기준이며, 번역 자막은
  같은 타이밍에 맞춰 문장 단위로 배치됩니다.
- 영어 예시 단어(estimate, graduate, separate, certificate, moderate, delegate, chocolate,
  climate, private)는 모든 언어 자막에서 원문 그대로 유지했습니다(발음 학습 영상이므로).
================================================================================
`;
fs.writeFileSync(path.join(outDir, 'multilingual-guide.txt'), guideTxt, 'utf8');
console.log('Generated multilingual-metadata.json and multilingual-guide.txt');
