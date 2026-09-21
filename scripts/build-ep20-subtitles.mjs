import fs from 'fs';
import path from 'path';

const TOTAL_DURATION = 510.44;
const outDir = 'output/upload-packages/ep20-world-rl-longform';
const subDir = path.join(outDir, 'subtitles');
fs.mkdirSync(subDir, { recursive: true });

const raw = JSON.parse(fs.readFileSync('scripts/ep20-captions-raw.json', 'utf8'));
const translations = JSON.parse(fs.readFileSync('scripts/ep20-translations.json', 'utf8'));

// End time = next caption's start (chained across frames since it's one continuous timeline);
// the last caption holds until the total video duration.
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

// Multilingual metadata
const metadata = {
  ko: {
    lang: "한국어 (기본 메타데이터)",
    title: "World 발음이 유독 꼬였던 이유: R과 L이 만날 때 게으른 혀의 소리 규칙 | 영어 발음 꿀팁",
    desc: `스마트폰 앱이나 번역기 켜놓고 혼자 발음 연습할 때, 다른 단어는 다 넘어가는데 유독 'World'나 'Girl'만 나오면 시뻘건 오답 창이 뜨며 속 터지셨던 적 있으시죠?
턱이 빠져라 혀를 굴려봐도 화면에는 엉뚱하게 'Old'나 'Word'로 찍혔던 굴욕, 여러분의 혀가 굳어서가 아닙니다.
R과 L이 만날 때 혀를 굴릴수록 입안에서 정면충돌이 일어나는 치명적인 착각 때문입니다.

원어민은 절대로 혀끝을 천장에 붙이며 피곤하게 소리 내지 않습니다.
오늘 딱 7분만 투자해 보세요. 어려운 문법이나 발음기호 없이 초등학생도 1초 만에 따라 하는 '게으른 혀의 4글자 소리 공식'으로 여러분의 굳었던 입을 시원하게 뚫어드립니다.

「이해하면 쉬운영어」입니다. 왕초보도 이해할 수 있게, 소리의 물리적 원리로 설명합니다.

📌 오늘 배우는 내용
・스마트폰 앱이 World/Girl만 못 알아들었던 이유 (R의 후퇴 vs L의 전진 충돌)
・원어민의 비밀: 혀끝을 천장에 대지 않는 '게으른 혀'의 원리
・1단계: 붕어 입술 + 하품 턱 = [우-어] (워~)
・2단계: 침 삼키듯 목구멍 뒤쪽 게으른 울림 = [을]
・완성: 딱 네 글자로 끝내는 World 공식 [우-어-을-드]
・실전 확장: 성인 90%가 포기하던 'Girl'도 [거~을]로 1초 완성
・실전 퀴즈 1R: 귀로 구분하는 Word vs World (묵직한 '을' 쿠션 감별법)
・실전 퀴즈 2R: Pearl & Curl 밸런스 게임
・스마트폰 캡처용 1장 요약 치트시트

⏱️ 챕터 타임라인
0:00 스마트폰 앱이 World를 못 알아듣는 이유
0:59 버터 발음 굴릴수록 망하는 이유
1:33 R과 L의 입안 정면충돌 교통사고
2:13 원어민의 비밀: '게으른 혀'의 법칙
2:52 1단계: 붕어 입술과 하품 턱 [우-어]
3:31 2단계: 침 삼키듯 목구멍 게으른 울림 [을]
4:11 완성: 4글자 소리 공식으로 World 끝내기
4:50 실전 확장: 'Girl'도 딱 1초 만에 해결
5:26 1R 청각 퀴즈: Word vs World 1초 구분법
6:33 2R 실전 퀴즈: Pearl & Curl 밸런스 게임
7:20 한 장 요약 스마트폰 캡처 치트시트
7:58 엔딩 & 다음 소리 공식 예고

영어는 혀를 혹사시키며 무작정 굴리는 게 아니라, 소리가 지나가는 진짜 길을 이해하는 것입니다.
구독과 좋아요는 다음 영상 제작에 큰 힘이 됩니다.

#영어발음 #World발음 #영어발음꿀팁 #파닉스 #발음교정 #왕초보영어 #영어스피킹 #영어공부 #기초영어 #성인영어`
  },
  en: {
    lang: "English (글로벌 공용어 & 알고리즘 인덱싱)",
    title: "Why \"World\" and \"Girl\" Trip Up Your Tongue: The Lazy Tongue Rule for R & L | English Pronunciation",
    desc: `When practicing English pronunciation with smartphone apps or translators, other words pass effortlessly, but whenever \"World\" or \"Girl\" comes up, it stubbornly flashes a red error screen, driving you crazy.
Even if you strain your jaw and roll your tongue with all your might, the screen stubbornly displays \"Old\" or \"Word\". It's not because your tongue is stiff — it's because of a fatal collision that happens inside your mouth the more you try to roll your tongue!

Native speakers never exhaust themselves by forcing their tongue tip against the roof of their mouth.
Invest just 7 minutes today. Without confusing grammar or phonetic jargon, unlock your frozen mouth with our 4-sound 'Lazy Tongue Formula' that even an elementary schooler can follow in 1 second.

Welcome to \"Easy English When Understood.\" We explain English through the physical mechanics of sound so anyone can master it.

📌 What you will learn today
• Why smartphone apps fail to recognize \"World\" & \"Girl\" (R's pullback vs. L's lunging collision)
• The native secret: the 'Lazy Tongue' rule (no tongue-tip contact needed)
• Step 1: Goldfish lips + Yawn jaw = [Woo-Eo] (\"War~\")
• Step 2: Lazy throat resonance like swallowing = [Eul]
• Payoff: The 4-sound formula for World [Woo - Eo - Eul - Deu]
• Practice Transfer: \"Girl\" unlocked in 1 second as [Ger~eul]
• Quiz Round 1: Distinguishing Word vs. World by ear (the heavy 'Eul' cushion)
• Quiz Round 2: Pearl & Curl balance challenge
• 1-page summary screenshot cheat sheet

⏱️ Chapters
0:00 Why smartphone apps fail to recognize World
0:59 Why rolling your tongue makes it worse
1:33 The inside-mouth traffic collision of R and L
2:13 The native secret: the 'Lazy Tongue' rule
2:52 Step 1: Goldfish lips & Yawn jaw [Woo-Eo]
3:31 Step 2: Swallowing-like throat resonance [Eul]
4:11 Payoff: Conquering World with the 4-sound formula
4:50 Practice Transfer: \"Girl\" unlocked in 1 second
5:26 Quiz 1: Word vs. World 1-second ear test
6:33 Quiz 2: Pearl & Curl balance game
7:20 1-page summary screenshot cheat sheet
7:58 Closing & preview of next sound formula

#EnglishPronunciation #PronounceWorld #PronunciationTips #Phonics #LearnEnglish #EnglishSpeaking #AmericanAccent #BeginnerEnglish`
  },
  ja: {
    lang: "日本語 (Japanese - 일본 시청자 타겟)",
    title: "WorldやGirlの発音で舌がもつれる本当の理由：RとLが出会う「怠け者の舌」の法則 | 英語発音のコツ",
    desc: `スマホの英語学習アプリで発音練習をしているとき、他の単語は通るのに「World」や「Girl」だけは絶対に認識されず、真っ赤なエラー画面が出て悔しい思いをしたことはありませんか？
顎が外れそうなほど舌を巻いても、画面には無情にも「Old」や「Word」と表示される屈辱。それは決してあなたの舌が硬いからではありません。
RとLが出会ったとき、舌を巻けば巻くほど口の中で正面衝突が起きるという致命的な思い込みのせいです。

ネイティブスピーカーは、決して舌先を口の天井にくっつけて疲れる発音はしません。
今日たった7分だけ投資してみてください。難しい文法や発音記号なしで、小学生でも1秒で真似できる「怠け者の舌の4文字公式」で、固まった口をすっきり解放します。

「理解すれば簡単な英語」へようこそ。初心者でも腑に落ちるよう、発声の物理的な仕組みから解説します。

📌 今回のレッスン内容
・スマホアプリがWorld/Girlを聞き取れない理由（Rの後退 vs Lの前進衝突）
・ネイティブの秘密：舌先を天井につけない「怠け者の舌」の原理
・第1段階：金魚の唇＋あくびの顎＝［ウ・オ］（ウォー〜）
・第2段階：唾を飲み込むような喉の奥の怠惰な響き＝［ウル］
・完成：4文字で終わらせるWorld公式［ウ・オ・ウル・ド］
・実戦応用：大人の9割が挫折する「Girl」も［ガー〜ウル］で1秒解決
・実戦クイズ1R：耳で聞き分けるWord vs World（重厚な「ウル」クッション識別法）
・実戦クイズ2R：Pearl & Curl バランスゲーム
・スマホ保存用 1枚まとめチートシート

⏱️ チャプター
0:00 スマホアプリがWorldを聞き取れない理由
0:59 舌を巻くほど失敗する理由
1:33 口の中で起きるRとLの正面衝突
2:13 ネイティブの秘密：「怠け者の舌」の法則
2:52 第1段階：金魚の唇とあくびの顎［ウ・オ］
3:31 第2段階：唾を飲むような喉の怠惰な響き［ウル］
4:11 完成：4文字公式でWorldを攻略
4:50 実戦応用：「Girl」も1秒で解決
5:26 クイズ1R：Word vs World 耳の聞き分け法
6:33 クイズ2R：Pearl & Curl バランスゲーム
7:20 1枚まとめスクリーンショット用チートシート
7:58 エンディング

#英語発音 #World発音 #英語発音のコツ #フォニックス #大人のやり直し英語 #英会話初心者 #英語学習 #ネイティブ発音`
  },
  "zh-tw": {
    lang: "繁體中文 (Traditional Chinese - 台灣/香港)",
    title: "World 和 Girl 發音總是打結的真正原因：R 碰到 L 時「偷懶舌頭」的聲音法則 | 英文發音技巧",
    desc: `用手機英語 App 練習發音時，其他單字都順暢通過，但唯獨碰到 \"World\" 或 \"Girl\" 怎麼念都紅字報錯，真的讓人沮喪。
嘴巴貼緊麥克風用力捲舌，螢幕上卻總是跳出完全不相干的 \"Old\" 或 \"Word\"。這絕對不是因為你的舌頭笨拙，而是因為 R 和 L 相遇時，舌頭越用力捲，嘴裡就越容易發生慘烈車禍！

母語者在念 World 時，絕對不會費力地把舌尖硬頂到上顎。
今天只要給自己 7 分鐘。拋開繁複文法和音標，用小學生 1 秒就能學會的「偷懶舌頭 4 字公式」，徹底解放你僵硬的下巴和舌頭。

歡迎來到「理解就變簡單的英語」。我們用聲音的物理原理，帶你輕鬆攻克英語障礙。

⏱️ 時間戳記
0:00 手機 App 為什麼聽不懂 World？
0:59 越用力捲舌越崩潰的原因
1:33 R 與 L 在嘴裡的迎面撞車事故
2:13 母語者的秘密：「偷懶舌頭」法則
2:52 第 1 步：金魚嘟嘴與打哈欠下巴 [Wu-Eo]
3:31 第 2 步：喉嚨如吞口水般的偷懶共鳴 [Eul]
4:11 完成：用 4 字公式徹底解決 World [Wu-Eo-Eul-Deu]
4:50 實戰延伸：成年人最怕的 \"Girl\" 也能 1 秒搞定
5:26 聽力測驗 1R：Word 與 World 1 秒耳力分辨法
6:33 實戰測驗 2R：Pearl 與 Curl 二選一挑戰
7:20 一張圖精華截圖速記小抄
7:58 結語

#英語發音 #World發音 #英文發音技巧 #自然拼讀 #零基礎英語 #美式發音 #英語學習 #Phonics`
  },
  "zh-cn": {
    lang: "简体中文 (Simplified Chinese - 新加坡/全球华人)",
    title: "World 和 Girl 发音总是打结的真正原因：R 碰到 L 时“偷懒舌头”的声音法则 | 英语发音技巧",
    desc: `用手机英语 App 练习发音时，其他单词都顺畅通过，但唯独碰到 \"World\" 或 \"Girl\" 怎么念都红字报错，真的让人沮丧。
嘴巴贴紧麦克风用力卷舌，屏幕上却总是跳出完全不相干的 \"Old\" 或 \"Word\"。这绝对不是因为你的舌头笨拙，而是因为 R 和 L 相遇时，舌头越用力卷，嘴里就越容易发生惨烈车祸！

母语者在念 World 时，绝对不会费力地把舌尖硬顶到上腭。
今天只要给自己 7 分钟。抛开繁复语法和音标，用小学生 1 秒就能学会的“偷懒舌头 4 字公式”，彻底解放你僵硬的下巴和舌头。

欢迎来到“理解就变简单的英语”。我们用声音的物理原理，带你轻松攻克英语障碍。

⏱️ 时间戳
0:00 手机 App 为什么听不懂 World？
0:59 越用力卷舌越崩溃的原因
1:33 R 与 L 在嘴里的迎面撞车事故
2:13 母语者的秘密：“偷懒舌头”法则
2:52 第 1 步：金鱼嘟嘴与打哈欠下巴 [Wu-Eo]
3:31 第 2 步：喉咙如吞口水般的偷懒共鸣 [Eul]
4:11 完成：用 4 字公式彻底解决 World [Wu-Eo-Eul-Deu]
4:50 实战延伸：成年人最怕的 \"Girl\" 也能 1 秒搞定
5:26 听力测验 1R：Word 与 World 1 秒耳力分辨法
6:33 实战测验 2R：Pearl 与 Curl 二选一挑战
7:20 一张图精华截图速记小抄
7:58 结语

#英语发音 #World发音 #英语发音技巧 #自然拼读 #零基础英语 #美式发音 #英语学习 #Phonics`
  },
  es: {
    lang: "Español (스페인어권 / 미국 히스패닉 / 중남미)",
    title: "Por qué se te traba la lengua con \"World\" y \"Girl\": La regla de la lengua perezosa para R y L | Pronunciación en inglés",
    desc: `Al practicar pronunciación con aplicaciones móviles, otras palabras pasan fácil, pero cuando sale \"World\" o \"Girl\", la pantalla roja de error nunca falla.
Por más que enrollas la lengua con fuerza, el móvil reconoce tercamente \"Old\" o \"Word\". No es porque tengas la lengua rígida: ¡es porque cuanto más intentas enrollarla, más chocan la R y la L dentro de tu boca!

Los nativos jamás se cansan pegando la punta de la lengua al paladar.
Dedica solo 7 minutos hoy. Sin gramática confusa ni símbolos fonéticos, desbloquea tu boca con la 'Fórmula de 4 Sonidos de la Lengua Perezosa' que hasta un niño sigue en 1 segundo.

Bienvenidos a \"Inglés Fácil Cuando se Entiende\". Explicamos el inglés a través de la mecánica física del sonido.

⏱️ Capítulos
0:00 Por qué las apps no entienden World
0:59 Por qué enrollar la lengua lo empeora
1:33 El choque frontal entre la R y la L en tu boca
2:13 El secreto nativo: la regla de la 'lengua perezosa'
2:52 Paso 1: Labios de pez y mandíbula relajada [U-O]
3:31 Paso 2: Resonancia de garganta como tragando [Eul]
4:11 Payoff: Domina World con la fórmula de 4 sonidos
4:50 Práctica: Desbloquea \"Girl\" en 1 segundo
5:26 Quiz 1: Distinguir Word vs. World de oído
6:33 Quiz 2: Desafío Pearl y Curl
7:20 Hoja resumen para captura de pantalla
7:58 Despedida

#PronunciacionIngles #PronunciarWorld #InglesDesdeCero #AprenderIngles #InglesAmericano #FoneticaIngles`
  },
  vi: {
    lang: "Tiếng Việt (동남아 영어 학습 1위 베트남)",
    title: "Vì sao phát âm \"World\" và \"Girl\" lại hay bị líu lưỡi: Quy tắc lưỡi lười biếng khi R gặp L | Phát âm tiếng Anh chuẩn",
    desc: `Khi luyện phát âm trên ứng dụng điện thoại, các từ khác đều qua dễ dàng nhưng hễ đến \"World\" hay \"Girl\" là màn hình đỏ báo lỗi liên tục.
Dù mỏi cả quai hàm uốn lưỡi, máy vẫn nhận diện thành \"Old\" hay \"Word\". Không phải do lưỡi bạn cứng, mà là do càng cố uốn lưỡi thì âm R và L càng va chạm nảy lửa trong vòm họng!

Người bản xứ tuyệt đối không bao giờ mệt mỏi đưa đầu lưỡi chạm vào vòm họng.
Hôm nay chỉ cần 7 phút. Không cần ngữ pháp hay ký hiệu phiên âm phức tạp, công thức 4 âm thanh 'Chiếc lưỡi lười biếng' sẽ giúp miệng bạn phát âm nhẹ nhõm ngay tức thì.

Chào mừng bạn đến với \"Hiểu Là Tiếng Anh Dễ Dàng\". Chúng tôi giải thích tiếng Anh qua cơ chế vật lý của âm thanh.

⏱️ Dấu mốc thời gian
0:00 Vì sao ứng dụng điện thoại không nhận diện được World
0:59 Càng uốn lưỡi thì phát âm càng hỏng
1:33 Vụ va chạm nảy lửa giữa R và L trong khoang miệng
2:13 Bí mật bản xứ: quy tắc 'chiếc lưỡi lười biếng'
2:52 Bước 1: Môi cá vàng và hàm thả lỏng [U-Ơ]
3:31 Bước 2: Độ vang cuống họng như nuốt nước bọt [Eul]
4:11 Hoàn thiện: Làm chủ World với công thức 4 âm thanh
4:50 Ứng dụng: Xử lý từ \"Girl\" trong đúng 1 giây
5:26 Đố vui 1: Phân biệt Word và World bằng tai
6:33 Đố vui 2: Thử thách Pearl & Curl
7:20 Trang tóm tắt chụp màn hình điện thoại
7:58 Lời kết

#PhatAmTiengAnh #PhatAmWorld #HocTiengAnh #TiengAnhGiaoTiep #TuHocTiengAnh #PhatAmChuan`
  }
};

fs.writeFileSync(path.join(outDir, 'multilingual-metadata.json'), JSON.stringify(metadata, null, 2), 'utf8');

// Human-readable guide
let guideTxt = `================================================================================
🌍 이해하면 쉬운영어 EP20 (World & Girl R-L 게으른 혀의 소리 규칙) - 글로벌 다국어 유튜브 세팅 가이드
================================================================================
유튜브 스튜디오 [자막] 및 [세부정보]에서 복사해서 바로 붙여넣으실 수 있도록
핵심 6대 글로벌 언어(영어, 일본어, 중국어 번체, 중국어 간체, 스페인어, 베트남어)와 한국어 자막/메타데이터를 완비했습니다.

📁 생성된 자막 파일 (output/upload-packages/ep20-world-rl-longform/subtitles/):
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
- 자막 타이밍은 실측 whisper 타임스탬프 기반 프레임 컴포지션의
  실시간 타임라인을 그대로 사용했습니다.
- 영어 핵심 예시 단어(World, Girl, Pearl, Curl, Word, Old)는 모든 언어 자막에서
  원문 그대로 유지했습니다(발음 학습 영상이므로).
================================================================================
`;
fs.writeFileSync(path.join(outDir, 'multilingual-guide.txt'), guideTxt, 'utf8');

// Also write core metadata files in outDir
fs.writeFileSync(path.join(outDir, 'title.txt'), metadata.ko.title, 'utf8');
fs.writeFileSync(path.join(outDir, 'description.txt'), metadata.ko.desc, 'utf8');
fs.writeFileSync(path.join(outDir, 'tags.txt'), "영어발음,World발음,영어발음꿀팁,파닉스,발음교정,왕초보영어,영어스피킹,영어공부,기초영어,성인영어,Girl발음,다크L,dark L,영어회화,쉬운영어", 'utf8');

const pinnedComment = `📌 여러분은 스마트폰 앱에서 World 발음할 때 어떤 단어로 가장 많이 오인식되셨나요?
1번 Old (늙은... 👴)
2번 Word (단어... 📖)
3번 그냥 침묵... (인식 불가 ❌)

댓글로 여러분의 현실 경험을 남겨주시면, '게으른 혀 4글자 공식'으로 바로 뚫어드립니다!
오늘 영상이 도움 되셨다면 [구독 & 좋아요] 부탁드립니다! ✨`;
fs.writeFileSync(path.join(outDir, 'pinned-comment.txt'), pinnedComment, 'utf8');

const timeline = `0:00 스마트폰 앱이 World를 못 알아듣는 이유
0:59 버터 발음 굴릴수록 망하는 이유
1:33 R과 L의 입안 정면충돌 교통사고
2:13 원어민의 비밀: '게으른 혀'의 법칙
2:52 1단계: 붕어 입술과 하품 턱 [우-어]
3:31 2단계: 침 삼키듯 목구멍 게으른 울림 [을]
4:11 완성: 4글자 소리 공식으로 World 끝내기
4:50 실전 확장: 'Girl'도 딱 1초 만에 해결
5:26 1R 청각 퀴즈: Word vs World 1초 구분법
6:33 2R 실전 퀴즈: Pearl & Curl 밸런스 게임
7:20 한 장 요약 스마트폰 캡처 치트시트
7:58 엔딩 & 다음 소리 공식 예고`;
fs.writeFileSync(path.join(outDir, 'timeline.txt'), timeline, 'utf8');

const titleVariants = `================================================================================
📌 EP20 제목 & 썸네일 A/B 테스트 시안 보존
================================================================================

[메인 채택 시안 - A안]
- 썸네일 파일: thumbnail-a.jpg (메인 thumbnail.jpg와 동일)
- 썸네일 훅 문구: "'월드' 했더니 '올드'로 들림?" (공감형 인지 부조화 훅)
- 확정 유튜브 제목: World 발음이 유독 꼬였던 이유: R과 L이 만날 때 게으른 혀의 소리 규칙 | 영어 발음 꿀팁
- 특징: 스마트폰 번역기 현실 굴욕 경험 공감 ➔ 클릭률 1위 선정

[보류 시안 - B안]
- 썸네일 파일: thumbnail-b.jpg
- 썸네일 훅 문구: "World 발음할 때 혀끝 닿으면 끝장! (한국인 99% 실수)"
- 예비 제목: World 발음할 때 혀끝 닿으면 끝장! 한국인 99%가 모르는 R과 L의 비밀
- 특징: 강한 경고 및 권위형, 구강 단면도 정보 밀도 강조

[보류 시안 - C안]
- 썸네일 파일: thumbnail-c.jpg
- 썸네일 훅 문구: "World 혀 굴리면 외계어 (버터 발음의 대참사)"
- 예비 제목: World 발음 혀 굴리다 턱 마비된 분들만 보세요 (외계어 소리 1초 탈출)
- 특징: 자책 개그형, 버터 발음 상식 파괴 훅
`;
fs.writeFileSync(path.join(outDir, 'title-variants.txt'), titleVariants, 'utf8');

const statusJson = {
  episode: "ep20-world-rl",
  status: "ready_to_upload",
  rendered_at: new Date().toISOString(),
  scheduled_publish_date: "2026-09-28T11:00:00Z", // 2026-09-28 (월) 20:00 KST
  total_duration_seconds: TOTAL_DURATION,
  endscreen_keep_out: {
    start_seconds: 505.44,
    end_seconds: 510.44,
    duration_seconds: 5.0
  },
  files: {
    video: "video.mp4",
    thumbnail_main: "thumbnail.jpg",
    thumbnail_a: "thumbnail-a.jpg",
    thumbnail_b: "thumbnail-b.jpg",
    thumbnail_c: "thumbnail-c.jpg"
  }
};
fs.writeFileSync(path.join(outDir, 'status.json'), JSON.stringify(statusJson, null, 2), 'utf8');

const uploadChecklist = `================================================================================
✅ EP20 유튜브 업로드 체크리스트 (World R & L 게으른 혀의 소리 규칙)
================================================================================
[기본 정보]
- 에피소드: EP20 (롱폼)
- 총 영상 길이: 510.44초 (8분 30.44초)
- 권장 예약 발행일: 2026-09-28(월) 20:00 KST (2026-09-28T11:00:00Z)

[업로드 단계 체크]
1. [ ] 동영상 업로드: output/upload-packages/ep20-world-rl-longform/video.mp4 업로드
2. [ ] 썸네일 업로드: thumbnail.jpg (A안) 설정 (A/B 테스트 시 b/c 활용)
3. [ ] 제목/설명: title.txt 및 description.txt 복사 붙여넣기
4. [ ] 태그: tags.txt 내용 복사 붙여넣기
5. [ ] 고정 댓글: pinned-comment.txt 복사 후 즉시 고정
6. [ ] 다국어 자막 7종 업로드: subtitles/ 폴더 내 .srt 파일 업로드 (ko, en, ja, zh-tw, zh-cn, es, vi)
7. [ ] 다국어 메타데이터 입력: multilingual-metadata.json 참고하여 영어, 일본어, 중국어 등 제목/설명 입력
8. [ ] 최종 화면(End Screen):
   - 시작 시간: 08:25 (505.44초) ~ 종료 08:30 (510.44초)
   - 배치: 중앙 킵아웃 존(600x350) 준수, 이전 추천 영상(EP19 -ATE 발음 차이) 및 구독 버튼 연결
================================================================================
`;
fs.writeFileSync(path.join(outDir, 'upload-checklist.txt'), uploadChecklist, 'utf8');

// Copy thumbnails from videos/ep20-world-rl/
const thumbDir = 'videos/ep20-world-rl';
for (const fn of ['thumbnail.jpg', 'thumbnail-a.jpg', 'thumbnail-b.jpg', 'thumbnail-c.jpg']) {
  const src = path.join(thumbDir, fn);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, path.join(outDir, fn));
    console.log(`Copied ${fn} to ${outDir}`);
  }
}

console.log('Complete upload package generated in', outDir);
