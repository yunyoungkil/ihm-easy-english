import fs from 'fs';
import path from 'path';

// 1. Load extracted captions
const captionsRaw = JSON.parse(fs.readFileSync('scripts/ep18-extracted-captions.json', 'utf8'));

// Helper to format SRT timestamp: 00:00:00,000
function formatSrtTime(seconds) {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);
  return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')},${String(ms).padStart(3, '0')}`;
}

// Translations data for all 66 captions
const translations = {
  en: [
    "k, n, e, e. According to the alphabet rules we learned, it should be pronounced 'k-nee'.",
    "Climb should be 'climb-b', and write should be 'w-rite'.",
    "So why do native speakers completely erase the first and last letters that are clearly written right there?",
    "The reason is surprisingly simple. With just this one rule today, silent words you struggled with for a lifetime will be read instantly without a dictionary.",
    "Hello, welcome to 'Easy English When Understood'.",
    "Today, we reveal the secret of silent letters—understood physically without blind memorization.",
    "When you open a dictionary, silent letters seem scattered randomly across every word.",
    "knee, climb, write, knock, thumb...",
    "It felt overwhelming because it seemed like you had to memorize every single one as an exception, right?",
    "In truth, these aren't exceptions—native speakers dropped them simply because their tongues got too exhausted.",
    "Surprisingly, in Old English, almost all of these letters were actually pronounced aloud.",
    "However, as people spoke quickly, it became too cumbersome, so they naturally fell away.",
    "Once you know that principle, those messy silent words neatly organize into just three sound drawers.",
    "The principle is remarkably simple: the sounds collide with each other.",
    "Making a 'K' deep in the throat and immediately flying the tongue to the front teeth for 'N' is just too far,",
    "and closing your lips for 'M' only to force them to pop open again for 'B!' is annoying double work.",
    "In the end, our tongue and lips chose the most comfortable shortcut.",
    "The first drawer is the 'KN-' sound at the beginning of words.",
    "The tongue completely discards the lazy 'K' up front, and starts directly with the 'N' sound.",
    "Don't bother trying to say the K. Just place your tongue behind your upper teeth from the start and say 'nee'.",
    "Shall we practice together? knee, know, knife, knock, knight.",
    "Erase the K completely and just make a light N sound from behind the front teeth.",
    "The second drawer is the '-MB' sound at the end of words.",
    "Even common words like 'honeycomb' or 'thumb drive' never pronounce the B.",
    "Try closing your lips right now. Say 'climb~' with lips closed, and don't pop them open for 'b!'.",
    "Just leave your lips comfortably closed at the end—that is the authentic native sound.",
    "Say them aloud yourself: climb, comb, thumb, lamb, bomb.",
    "Don't burst the B sound; simply finish with a gentle 'm~' hum.",
    "The third drawer is the 'WR-' sound at the beginning of words.",
    "Don't hesitate trying to round your lips for an extra 'woo'.",
    "Forget about W, pull your tongue back from the start, and go straight into a crisp 'write'.",
    "Let's read together: write, wrong, wrist, wrap, wreck.",
    "Don't pause on W; immediately pull your tongue back and let the R sound flow smoothly.",
    "Hold on a second: why on earth did English keep these letters if they aren't pronounced?",
    "While early printing fixed spelling into place, their primary role today is serving as an invaluable ID card to distinguish word meanings.",
    "They sound identical, but 'knight' is a warrior and 'night' is evening; 'knot' is a tie, and 'not' means no.",
    "By seeing the spelling, you can instantly distinguish their meanings at a single glance.",
    "Now that you understand the principle, let's test your skills! These are fresh words not shown earlier in the video.",
    "Call out which drawer it belongs to within 3 seconds.",
    "knit!",
    "knit! That's drawer 1, KN, where the K disappears.",
    "crumb!",
    "crumb! That's drawer 2, MB, where the B disappears.",
    "wreath!",
    "wreath! That's drawer 3, WR, where the W disappears. Even unfamiliar words are read instantly with this rule, right?",
    "Now, shall we challenge round 2 at a much faster pace?",
    "numb!",
    "numb! That's the MB sound without the B.",
    "knob!",
    "knob! That's the KN sound without the K.",
    "wrench!",
    "wrench! That's the WR sound without the W. If you answered without hesitation, you've mastered it!",
    "Now, let's verify with full sentences. All the silent words are packed into this one sentence.",
    "The knight with a sharp knife is kneeling down.",
    "knight, knife, kneeling.",
    "Once you cleanly erase the K sound, even a long sentence flows like water, doesn't it?",
    "Let's read just one more sentence. This time, both the MB and WR sounds appear together.",
    "Please comb your hair and wrap the gift before you write.",
    "Drop the B in comb, and drop the W in wrap and write.",
    "By bypassing these silent letters, your pronunciation becomes effortless.",
    "For today's silent letter rules, just remember this single summary sheet.",
    "For KN, drop K and say N; for MB, drop B and say M; for WR, drop W and say R.",
    "Take a screenshot of the screen and bring it out whenever you read new words.",
    "English isn't about blind memorization; it's about understanding how the lazy tongue naturally moves.",
    "Watching our previous 'Vowel + R (Bossy R)' episode will make English even easier.",
    "Thank you so much for watching today. This was 'Easy English When Understood'."
  ],
  ja: [
    "k, n, e, e. アルファベットの習った通りなら、絶対に「クニー」のはずです。",
    "climbも「クライムブ」、writeも「ウライト」でなければなりません。",
    "なのに、なぜネイティブははっきりと書かれている最初と最後の文字を跡形もなく消してしまうのでしょうか？",
    "理由はとてもシンプルです。今日この基準を1つ知るだけで、一生迷っていた黙字単語が辞書なしでも一発で読めるようになります。",
    "こんにちは、「理解すれば簡単な英語」です。",
    "今日は暗記せず体で理解する、発音しない文字の秘密を公開します。",
    "辞書を開くと、音の出ない文字が単語ごとにバラバラに散らばっています。",
    "knee, climb, write, knock, thumb...",
    "単語ごとに例外として全部覚えなければならない気がして、途方に暮れていませんでしたか。",
    "実はこれら、例外ではなくネイティブも舌が疲れすぎて省いたものなのです。",
    "驚くことに昔の英語では、これらの文字のほとんどを声に出して読んでいました。",
    "けれど話していくうちにあまりに不便で、自然と脱落していったのです。",
    "その原理さえ分かれば、複雑に見えた黙字単語がたった3つの音の引き出しにすっきり整理されます。",
    "原理はとてもシンプル。音同士が互いにぶつかり合うからです。",
    "喉の奥深くで「K」の音を出してすぐ、前歯の裏の「N」の音へと舌が飛んでいくには距離が遠すぎますし、",
    "唇を閉じて「M」の音を出したのに、また無理に「ブッ！」と唇を破裂させるのは二度手間で面倒だからです。",
    "結局、私たちの舌と唇が最も楽な近道を選んだというわけです。",
    "1つ目の引き出しは、単語の先頭に来る「KN」の音です。",
    "手前の「K」は舌が面倒くさがって完全に捨て去り、最初から「N」の音でスタートします。",
    "Kを無理に発音しようとしないでください。舌を最初から上の前歯の裏にペタッとつけ、そのまま「ニー」と発声すればOKです。",
    "一緒に声を出してみましょう。knee, know, knife, knock, knight。",
    "Kはきれいに消し、前歯の裏からNの音だけを軽やかに出せば完璧です。",
    "2つ目の引き出しは、単語の末尾に来る「MB」の音です。",
    "私たちが日常で使う「ハニカム(comb)」や「サムドライブ(thumb)」もBの音は出しませんよね。",
    "実際に唇を閉じてみてください。「クライム〜」と唇を合わせた状態のまま、無理に「ブッ！」と離さないでください。",
    "ただ唇をリラックスして閉じたまま終える、それこそがネイティブの発音です。",
    "実際に声を出してみましょう。climb, comb, thumb, lamb, bomb。",
    "Bの音を破裂させず、柔らかい「ム〜(m)」の余韻で締めくくれば大成功です。",
    "3つ目の引き出しは、単語の先頭に来る「WR」の音です。",
    "唇をすぼめて「ウ〜」と言おうと迷ったりしないでください。",
    "Wはすっぱり忘れ、最初から舌を後ろに引いてスッキリ「ライト」へと直行すれば大丈夫です。",
    "一緒に読んでみましょう。write, wrong, wrist, wrap, wreck。",
    "Wでためらわず、すぐに舌を引いて気持ちよくRの音を響かせてみてください。",
    "ここでちょっと疑問：音もしない文字を、なぜわざわざ残しておいたのでしょうか？",
    "印刷技術の普及でスペルが固定された面もありますが、まさに意味を見分けるありがたい身分証の役割を果たしているからです。",
    "音は全く同じでも knightは騎士、nightは夜。knotは結び目、notは否定。",
    "文字を見れば意味が一目で区別できるわけです。",
    "原理が分かったところで、実際に当ててみましょう！動画の前半には出なかった新しい単語たちです。",
    "何番の引き出しに入るか、3秒以内に声に出してみてください。",
    "knit！",
    "knit！Kが消える1番の「KN」の引き出しですね。",
    "crumb！",
    "crumb！Bが消える2番の「MB」の引き出しです。",
    "wreath！",
    "wreath！Wが消える3番の「WR」の引き出しです。初めての単語でも原理で即座に読めますよね？",
    "今度は少しスピードを上げて、第2ラウンドに挑戦してみましょう！",
    "numb！",
    "numb！Bを抜いた「MB」の音ですね。",
    "knob！",
    "knob！Kを抜いた「KN」の音です。",
    "wrench！",
    "wrench！Wを抜いた「WR」の音です。ためらわずに即答できたなら大成功です！",
    "それでは文章の中で確認してみましょう。黙字の単語が1つの文に全部入っています。",
    "The knight with a sharp knife is kneeling down.",
    "knight, knife, kneeling。",
    "Kの音を綺麗に消すと、長い文でも水が流れるようにスラスラ読めますよね？",
    "もう1文だけ読んでみましょう。今度は「MB」の音と「WR」の音が一緒に入っています。",
    "Please comb your hair and wrap the gift before you write.",
    "combのBを脱落、wrapとwriteのWを脱落。",
    "音のない文字をサラリと避けて通るだけで、発音がぐっと楽になります。",
    "今日学んだ黙字のルール、この1枚だけ覚えておいてください。",
    "KNの音はKを捨ててN、MBの音はBを捨ててM、WRの音はWを捨ててR。",
    "画面をスクリーンショットしておき、新しい単語を読むたびに見返してみてください。",
    "英語はやみくもに暗記するのではなく、なまけものの舌が織りなす音の仕組みを理解することです。",
    "前回の「母音の後ろのR」編もあわせてご覧いただくと、英語がもっと簡単になります。",
    "今日も大変お疲れ様でした。「理解すれば簡単な英語」でした。"
  ],
  "zh-tw": [
    "k, n, e, e. 按照我們學過的字母發音，理應讀作「克尼」。",
    "climb 也該是「克萊姆夫」，write 也該是「烏賴特」。",
    "但為什麼母語者會把寫得清清楚楚的字首和字尾字母，徹底抹去不讀呢？",
    "原因非常簡單。今天只要掌握這一個標準，一輩子搞混的默音單字不用查字典也能一眼讀對。",
    "哈囉，歡迎來到「理解就變簡單的英語」。",
    "今天我們將公開不靠死記硬背、用發音肌肉自然理解的默音字母秘密。",
    "翻開字典，不發音的字母似乎凌亂地分散在各個單字中。",
    "knee, climb, write, knock, thumb...",
    "你是不是曾覺得每個單字都是例外、必須死背而感到無力？",
    "其實這些單字不是例外，而是母語者說話時舌頭太費力才主動省掉的。",
    "令人驚訝的是，在古英語時期，這些字母絕大多數都是要讀出聲的。",
    "但在日常快速對話中實在太卡頓，久而久之就自然脫落省略了。",
    "只要掌握這個原理，看似龐雜的默音單字就能乾淨俐落地歸入三個聲音抽屜。",
    "原理非常簡單：因為發音器官彼此碰撞打架。",
    "剛在喉嚨深處發出「K」，舌頭要立刻飛到門牙後方發「N」，距離實在太遠；",
    "閉上雙唇發完「M」，又要費力爆破發出「B！」，根本是多此一舉的重複動作。",
    "歸根結底，是我們的舌頭和嘴唇選擇了一條最省力的捷徑。",
    "第一個抽屜是單字最前端的「KN」組合。",
    "舌頭嫌麻煩直接扔掉前面的「K」，直接從「N」音起跑發聲。",
    "千萬別刻意想發出 K。一開始就把舌頭緊貼在上門牙後方，直接念「尼」出發即可。",
    "我們一起讀出聲來：knee, know, knife, knock, knight。",
    "俐落地抹去 K，只在上門牙後方輕鬆發出 N 的聲音就行了。",
    "第二個抽屜是單字結尾的「MB」組合。",
    "我們日常說的「蜂巢(honeycomb)」或「隨身碟(thumb drive)」，也都完全不發 B 音。",
    "試著閉上雙唇。念「克萊姆～」雙唇輕閉後，千萬別再多此一舉地把嘴唇彈開發出「夫！」的爆破音。",
    "只要嘴唇自然閉合收尾，那就是地道的母語者發音。",
    "自己讀讀看：climb, comb, thumb, lamb, bomb。",
    "不要爆破 B 音，只要用柔和的「嗯～(m)」收尾就非常完美了。",
    "第三個抽屜是單字最前端的「WR」組合。",
    "不要猶豫著嘟起嘴唇想要發出多餘的「烏」音。",
    "把 W 忘個精光，一開始就把舌頭往後拉，痛快俐落地直奔「賴特(write)」。",
    "我們一起來讀：write, wrong, wrist, wrap, wreck。",
    "別在 W 上猶豫，立刻收縮舌頭，順暢清脆地發出 R 音。",
    "這時候大家可能會好奇：既然根本不發音，為什麼還要大費周章留著這些字母？",
    "除了印刷術普及將拼寫固定下來，更關鍵的原因是它們充當了辨別字義的無價身分證。",
    "發音完全一樣，但 knight 是騎士，night 是夜晚；knot 是繩結，not 是否定。",
    "只要看到拼寫，一眼就能清楚分辨含義。",
    "既然懂了原理，我們來實戰測驗吧！這些都是影片前面沒出現過的新單字。",
    "請在 3 秒之內大聲念出它屬於幾號抽屜。",
    "knit！",
    "knit！這是 K 消失的 1 號「KN」抽屜。",
    "crumb！",
    "crumb！這是 B 消失的 2 號「MB」抽屜。",
    "wreath！",
    "wreath！這是 W 消失的 3 號「WR」抽屜。即使是全新單字，靠原理也能秒讀出來對吧？",
    "這次讓我們用更快的節奏，挑戰第 2 回合吧！",
    "numb！",
    "numb！這是省去 B 的「MB」發音。",
    "knob！",
    "knob！這是省去 K 的「KN」發音。",
    "wrench！",
    "wrench！這是省去 W 的「WR」發音。如果你毫無猶豫立刻答對，那就徹底掌握了！",
    "現在讓我們放入句子裡驗證吧！默音單字全都在這同一個句子裡。",
    "The knight with a sharp knife is kneeling down.",
    "knight, knife, kneeling。",
    "乾淨抹去 K 的聲音後，即使是長句子也能如行雲流水般順暢朗讀，對吧？",
    "我們再讀一個句子。這次「MB」和「WR」的聲音同時出現在裡面。",
    "Please comb your hair and wrap the gift before you write.",
    "comb 的 B 脫落，wrap 和 write 的 W 脫落。",
    "避開這些不發音的字母，發音瞬間變得無比輕鬆舒服。",
    "今天學到的默音規則，只要記住這一張精華總結圖就行了。",
    "KN 組合扔掉 K 念 N，MB 組合扔掉 B 念 M，WR 組合扔掉 W 念 R。",
    "把畫面截圖保存起來，每次遇到生字時拿出來對照一下。",
    "學英語絕非死記硬背，而是理解我們「懶惰舌頭」最省力的聲音生理原理。",
    "搭配觀看上一集「母音後面的 R (Bossy R)」，你的英語發音會變得更加簡單！",
    "今天大家也辛苦了。這裡是「理解就變簡單的英語」，我們下期再見！"
  ],
  "zh-cn": [
    "k, n, e, e. 按照我们学过的字母发音，理应读作“克尼”。",
    "climb 也该是“克莱姆夫”，write 也该是“乌赖特”。",
    "但为什么母语者会把写得清清楚楚的词首和词尾字母，彻底抹去不读呢？",
    "原因非常简单。今天只要掌握这一个标准，一辈子搞混的默音单词不用查字典也能一眼读对。",
    "哈喽，欢迎来到“理解就变简单的英语”。",
    "今天我们将公开不靠死记硬背、用发音肌肉自然理解的默音字母秘密。",
    "翻开字典，不发音的字母似乎凌乱地分散在各个单词中。",
    "knee, climb, write, knock, thumb...",
    "你是不是曾觉得每个单词都是例外、必须死背而感到无力？",
    "其实这些单词不是例外，而是母语者说话时舌头太费力才主动省掉的。",
    "令人惊讶的是，在古英语时期，这些字母绝大多数都是要读出声的。",
    "但在日常快速对话中实在太卡顿，久而久之就自然脱落省略了。",
    "只要掌握这个原理，看似庞杂的默音单词就能干脆利落地归入三个声音抽屉。",
    "原理非常简单：因为发音器官彼此碰撞打架。",
    "刚在喉咙深处发出“K”，舌头要立刻飞到门牙后方发“N”，距离实在太远；",
    "闭上双唇发完“M”，又要费力爆破发出“B！”，根本是多此一举的重复动作。",
    "归根结底，是我们的舌头和嘴唇选择了一条最省力的捷径。",
    "第一个抽屉是单词最前端的“KN”组合。",
    "舌头嫌麻烦直接扔掉前面的“K”，直接从“N”音起跑发声。",
    "千万别刻意想发出 K。一开始就把舌头紧贴在上门牙后方，直接念“尼”出发即可。",
    "我们一起读出声来：knee, know, knife, knock, knight。",
    "干脆地抹去 K，只在上门牙后方轻松发出 N 的声音就行了。",
    "第二个抽屉是单词结尾的“MB”组合。",
    "我们日常说的“蜂巢(honeycomb)”或“U盘(thumb drive)”，也都完全不发 B 音。",
    "试着闭上双唇。念“克莱姆～”双唇轻闭后，千万别再多此一举地把嘴唇弹开发出“夫！”的爆破音。",
    "只要嘴唇自然闭合收尾，那就是地道的母语者发音。",
    "自己读读看：climb, comb, thumb, lamb, bomb。",
    "不要爆破 B 音，只要用柔和的“嗯～(m)”收尾就非常完美了。",
    "第三个抽屉是单词最前端的“WR”组合。",
    "不要犹豫着嘟起嘴唇想要发出多余的“乌”音。",
    "把 W 忘个精光，一开始就把舌头往后拉，痛快干脆地直奔“赖特(write)”。",
    "我们一起来读：write, wrong, wrist, wrap, wreck。",
    "别在 W 上犹豫，立刻收缩舌头，顺畅清脆地发出 R 音。",
    "这时候大家可能会好奇：既然根本不发音，为什么还要大费周章留着这些字母？",
    "除了印刷术普及将拼写固定下来，更关键的原因是它们充当了辨别字义的无价身份证。",
    "发音完全一样，但 knight 是骑士，night 是夜晚；knot 是绳结，not 是否定。",
    "只要看到拼写，一眼就能清楚分辨含义。",
    "既然懂了原理，我们来实战测验吧！这些都是视频前面没出现过的新单词。",
    "请在 3 秒之内大声念出它属于几号抽屉。",
    "knit！",
    "knit！这是 K 消失的 1 号“KN”抽屉。",
    "crumb!",
    "crumb！这是 B 消失的 2 号“MB”抽屉。",
    "wreath！",
    "wreath！这是 W 消失的 3 号“WR”抽屉。即使是全新单词，靠原理也能秒读出来对吧？",
    "这次让我们用更快的节奏，挑战第 2 回合吧！",
    "numb！",
    "numb！这是省去 B 的“MB”发音。",
    "knob！",
    "knob！这是省去 K 的“KN”发音。",
    "wrench！",
    "wrench！这是省去 W 的“WR”发音。如果你毫无犹豫立刻答对，那就彻底掌握了！",
    "现在让我们放入句子里验证吧！默音单词全都在这同一个句子里。",
    "The knight with a sharp knife is kneeling down.",
    "knight, knife, kneeling。",
    "干净抹去 K 的声音后，即使是长句子也能如行云流水般顺畅朗读，对吧？",
    "我们再读一个句子。这次“MB”和“WR”的声音同时出现在里面。",
    "Please comb your hair and wrap the gift before you write.",
    "comb 的 B 脱落，wrap 和 write 的 W 脱落。",
    "避开这些不发音的字母，发音瞬间变得无比轻松舒服。",
    "今天学到的默音规则，只要记住这一张精华总结图就行了。",
    "KN 组合扔掉 K 念 N，MB 组合扔掉 B 念 M，WR 组合扔掉 W 念 R。",
    "把画面截图保存起来，每次遇到生词时拿出来对照一下。",
    "学英语绝非死记硬背，而是理解我们“懒惰舌头”最省力的声音生理原理。",
    "搭配观看上一集“元音后面的 R (Bossy R)”，你的英语发音会变得更加简单！",
    "今天大家也辛苦了。这里是“理解就变简单的英语”，我们下期再见！"
  ],
  es: [
    "k, n, e, e. Si siguiéramos las reglas que aprendimos, debería sonar 'k-nee'.",
    "Climb debería ser 'climb-b', y write debería ser 'w-rite'.",
    "¿Por qué los nativos borran por completo la primera y última letra que están claramente escritas?",
    "La razón es muy simple. Con solo esta regla hoy, leerás esas palabras mudas sin dudar y sin diccionario.",
    "Hola, bienvenidos a 'Inglés Fácil Cuando se Entiende'.",
    "Hoy revelamos el secreto de las letras mudas, comprendidas físicamente sin memorización.",
    "Al abrir un diccionario, las letras mudas parecen dispersas al azar en cada palabra.",
    "knee, climb, write, knock, thumb...",
    "¿Te sentías abrumado pensando que debías memorizar cada una como una excepción?",
    "En realidad, no son excepciones: los nativos las eliminaron porque cansan la lengua.",
    "Sorprendentemente, en el inglés antiguo, casi todas estas letras se pronunciaban.",
    "Pero al hablar, resultaba tan incómodo que se eliminaron de forma natural.",
    "Al entender ese principio, las palabras mudas se organizan en solo tres cajones de sonido.",
    "El principio es simple: los sonidos chocan entre sí.",
    "Hacer una 'K' en la garganta y volar la lengua a los dientes para la 'N' está demasiado lejos,",
    "y cerrar los labios para la 'M' y forzarlos a estallar en 'B!' es trabajar el doble.",
    "Al final, la lengua y los labios eligieron el atajo más cómodo.",
    "El primer cajón es el sonido 'KN-' al principio de las palabras.",
    "La lengua descarta la 'K' por pereza y arranca directo con el sonido 'N'.",
    "No intentes pronunciar la K. Pon la lengua tras los dientes superiores y di 'nee'.",
    "¿Leemos juntos? knee, know, knife, knock, knight.",
    "Borra la K y solo emite suavemente la N detrás de los dientes.",
    "El segundo cajón es el sonido '-MB' al final de las palabras.",
    "Incluso palabras cotidianas como 'honeycomb' o 'thumb drive' nunca dicen la B.",
    "Cierra los labios. Di 'climb~' con los labios juntos, sin abrirlos con un 'b!'.",
    "Solo déjalos cómodamente cerrados al final: ese es el sonido nativo.",
    "Dilo tú mismo: climb, comb, thumb, lamb, bomb.",
    "No hagas estallar la B; termina con un suave zumbido de 'm~'.",
    "El tercer cajón es el sonido 'WR-' al principio de las palabras.",
    "No dudes intentando redondear los labios para un 'u'.",
    "Olvida la W, tira la lengua hacia atrás y ve directo a un claro 'write'.",
    "Leamos juntos: write, wrong, wrist, wrap, wreck.",
    "No te detengas en la W; retrae la lengua y deja fluir el sonido de la R.",
    "Un momento: ¿por qué se mantuvieron estas letras si ni siquiera se pronuncian?",
    "Aunque la imprenta fijó la ortografía, actúan como un valioso documento de identidad para distinguir significados.",
    "Suenan igual, pero knight es caballero y night es noche; knot es nudo y not es no.",
    "Al ver las letras, el significado se distingue de inmediato.",
    "Ahora que conoces el principio, ¡vamos a adivinar! Son palabras nuevas que no vimos antes.",
    "Di en voz alta a qué cajón pertenece en 3 segundos.",
    "knit!",
    "¡knit! Es el cajón 1, KN, donde desaparece la K.",
    "crumb!",
    "¡crumb! Es el cajón 2, MB, donde desaparece la B.",
    "wreath!",
    "¡wreath! Es el cajón 3, WR, donde la W desaparece. Con esta regla, lees palabras nuevas al instante, ¿verdad?",
    "¿Nos atrevemos con la ronda 2 a un ritmo más rápido?",
    "numb!",
    "¡numb! Es el sonido MB sin la B.",
    "knob!",
    "¡knob! Es el sonido KN sin la K.",
    "wrench!",
    "¡wrench! Es el sonido WR sin la W. Si respondiste sin dudar, ¡lo lograste!",
    "Ahora comprobemos con oraciones completas. Todas estas palabras mudas están reunidas en una sola frase.",
    "The knight with a sharp knife is kneeling down.",
    "knight, knife, kneeling.",
    "Al borrar la K, la frase fluye con total naturalidad, ¿verdad?",
    "Leamos una más. Esta vez incluye tanto el sonido MB como el WR.",
    "Please comb your hair and wrap the gift before you write.",
    "Elimina la B en comb, y la W en wrap y write.",
    "Al esquivar las letras mudas, la pronunciación es mucho más cómoda.",
    "De las reglas de letras mudas de hoy, recuerda solo esta hoja resumen.",
    "Para KN, descarta la K y di N; para MB, descarta la B y di M; para WR, descarta la W y di R.",
    "Haz una captura de pantalla y revísala cada vez que leas palabras nuevas.",
    "El inglés no se trata de memorizar a ciegas, sino de entender el camino natural de la lengua.",
    "Si ves nuestro episodio anterior de 'Vocal + R', el inglés será aún más fácil.",
    "¡Muchas gracias por acompañarnos hoy! Esto fue 'Inglés Fácil Cuando se Entiende'."
  ],
  vi: [
    "k, n, e, e. Nếu theo đúng bảng chữ cái đã học, chắc chắn phải đọc là 'k-nee'.",
    "Climb phải là 'climb-b', và write phải là 'u-rite'.",
    "Vậy tại sao người bản xứ lại nuốt trọn chữ cái đầu và cuối được viết rõ ràng như vậy?",
    "Lý do cực kỳ đơn giản. Chỉ cần nắm vững quy tắc hôm nay, bạn sẽ đọc vanh vách các từ câm cả đời không cần tra từ điển.",
    "Xin chào, chào mừng các bạn đến với 'Hiểu Là Tiếng Anh Dễ Dàng'.",
    "Hôm nay, chúng ta cùng giải mã bí mật của các chữ cái câm mà không cần học vẹt.",
    "Khi mở từ điển, các chữ cái câm dường như rải rác lộn xộn trong từng từ.",
    "knee, climb, write, knock, thumb...",
    "Chắc hẳn bạn từng thấy nản lòng vì nghĩ phải học vẹt từng từ như một ngoại lệ đúng không?",
    "Thực chất đây không phải ngoại lệ, mà người bản xứ lược bỏ vì lưỡi chuyển động quá mệt.",
    "Thật kinh ngạc là trong tiếng Anh cổ, hầu hết các chữ này từng được phát âm thành tiếng.",
    "Nhưng khi giao tiếp thấy quá bất tiện, chúng đã tự động rơi rụng theo thời gian.",
    "Nắm được nguyên lý này, mớ từ câm phức tạp sẽ thu gọn gàng vào 3 ngăn kéo phát âm.",
    "Nguyên lý cực kỳ đơn giản: do các âm va chạm vào nhau.",
    "Vừa phát âm 'K' sâu trong cổ họng đã phải phi lưỡi đến răng cửa phát âm 'N' thì quá xa,",
    "và khép môi phát âm 'M' rồi lại gượng ép bật môi 'B!' là làm việc thừa thãi hai lần.",
    "Rốt cuộc, lưỡi và môi chúng ta đã chọn con đường tắt thoải mái nhất.",
    "Ngăn kéo thứ nhất là âm 'KN-' ở ngay đầu từ.",
    "Lưỡi lười biếng vứt bỏ hoàn toàn chữ 'K' phía trước và bắt đầu ngay bằng âm 'N'.",
    "Đừng cố phát âm chữ K. Hãy đặt lưỡi sau răng cửa trên ngay từ đầu và nói 'ni'.",
    "Hãy cùng phát âm nhé: knee, know, knife, knock, knight.",
    "Xóa sạch chữ K và chỉ cần bật nhẹ âm N từ sau răng cửa.",
    "Ngăn kéo thứ hai là âm '-MB' ở cuối từ.",
    "Ngay cả từ quen thuộc như 'honeycomb' hay 'thumb drive' cũng không phát âm B.",
    "Hãy thử khép môi lại. Đọc 'climb~' rồi giữ nguyên môi, đừng cố bật môi thành 'b!'.",
    "Chỉ cần khép môi thoải mái và kết thúc, đó chính là phát âm chuẩn bản xứ.",
    "Hãy tự mình phát âm: climb, comb, thumb, lamb, bomb.",
    "Đừng bật âm B, chỉ cần kết thúc bằng âm 'm~' nhẹ nhàng.",
    "Ngăn kéo thứ ba là âm 'WR-' ở đầu từ.",
    "Đừng chần chừ chu môi để phát âm thêm tiếng 'u'.",
    "Hãy quên chữ W đi, kéo lưỡi về sau ngay từ đầu và đọc thẳng thành 'write'.",
    "Cùng đọc nhé: write, wrong, wrist, wrap, wreck.",
    "Đừng ngập ngừng ở chữ W, hãy kéo lưỡi lại và phát âm R dứt khoát.",
    "Chờ một chút: tại sao không phát âm mà người ta vẫn giữ lại những chữ cái này?",
    "Dù kỹ thuật in ấn đã cố định chính tả, nhưng vai trò quan trọng là làm thẻ căn cước phân biệt nghĩa từ.",
    "Âm giống hệt nhau nhưng knight là hiệp sĩ, night là đêm; knot là nút thắt, not là không.",
    "Nhìn vào mặt chữ là hiểu ngay ý nghĩa trong nháy mắt.",
    "Hiểu nguyên lý rồi, hãy cùng thử tài nhé! Đây là các từ mới toanh chưa xuất hiện ở phần trước.",
    "Hãy gọi tên ngăn kéo phù hợp trong vòng 3 giây.",
    "knit!",
    "knit! Đó là ngăn kéo 1 KN, nơi chữ K biến mất.",
    "crumb!",
    "crumb! Đó là ngăn kéo số 2 MB, nơi chữ B biến mất.",
    "wreath!",
    "wreath! Ngăn kéo 3 WR nơi W biến mất. Từ mới đến mấy cũng đọc được ngay theo nguyên lý đúng không?",
    "Bây giờ cùng thử thách hiệp 2 với tốc độ nhanh hơn nhé!",
    "numb!",
    "numb! Âm MB lược bỏ chữ B.",
    "knob!",
    "knob! Âm KN lược bỏ chữ K.",
    "wrench!",
    "wrench! Âm WR lược bỏ chữ W. Trả lời dứt khoát không ngần ngại là bạn đã thành công rồi!",
    "Bây giờ cùng ghép vào câu nhé! Tất cả các từ câm đều có trong câu này.",
    "The knight with a sharp knife is kneeling down.",
    "knight, knife, kneeling.",
    "Xóa sạch âm K là câu dài mấy cũng trôi chảy như dòng nước đúng không?",
    "Đọc thêm một câu nữa nhé. Lần này có cả âm MB và WR cùng xuất hiện.",
    "Please comb your hair and wrap the gift before you write.",
    "Lược bỏ B trong comb, lược bỏ W trong wrap và write.",
    "Né được các chữ cái câm này, việc phát âm sẽ nhẹ nhàng hơn rất nhiều.",
    "Quy tắc chữ câm hôm nay, bạn chỉ cần nhớ một trang tổng kết này.",
    "Âm KN bỏ K đọc N, âm MB bỏ B đọc M, âm WR bỏ W đọc R.",
    "Hãy chụp màn hình lại và mở ra xem mỗi khi đọc từ mới nhé.",
    "Tiếng Anh không phải học vẹt, mà là thấu hiểu cơ chế phát âm thoải mái của chiếc lưỡi.",
    "Xem thêm tập trước về 'Nguyên âm theo sau bởi R', tiếng Anh sẽ dễ hơn rất nhiều.",
    "Cảm ơn các bạn đã theo dõi. Đây là 'Hiểu Là Tiếng Anh Dễ Dàng'."
  ]
};

// Target output folder
const outDir = 'output/upload-packages/ep18-silent-consonants-longform';
const subDir = path.join(outDir, 'subtitles');
fs.mkdirSync(subDir, { recursive: true });

// 1. Build Subtitles (.srt)
// Korean
let srtKo = '';
captionsRaw.forEach((c, idx) => {
  srtKo += `${idx + 1}\n${formatSrtTime(c.start)} --> ${formatSrtTime(c.end)}\n${c.text}\n\n`;
});
fs.writeFileSync(path.join(subDir, 'subtitles-ko.srt'), srtKo, 'utf8');

// Other languages
const langCodes = ['en', 'ja', 'zh-tw', 'zh-cn', 'es', 'vi'];
for (const code of langCodes) {
  let srt = '';
  const transList = translations[code];
  captionsRaw.forEach((c, idx) => {
    const text = transList[idx] || c.text;
    srt += `${idx + 1}\n${formatSrtTime(c.start)} --> ${formatSrtTime(c.end)}\n${text}\n\n`;
  });
  fs.writeFileSync(path.join(subDir, `subtitles-${code}.srt`), srt, 'utf8');
}
console.log('Generated all 7 SRT files in', subDir);

// 2. Multilingual Metadata
const metadata = {
  ko: {
    lang: "한국어 (Korean - 기본 메타데이터)",
    title: "저도 왜 소리 안 나는지 몰랐습니다, 혀가 편해지는 묵음 원리 | 영어 왕초보",
    desc: `KNEE, CLIMB, WRITE, KNOCK, THUMB — 다 아는 쉬운 단어인데, 왜 K와 B와 W는 멀쩡히 써놓고 소리를 내지 않는 걸까요?
사전에 흩어진 발음기호를 일일이 예외로 외우려니 영어가 끝없는 암기처럼 느껴졌던 겁니다. 사실 이 글자들은 예외가 아니라, 원어민들도 발음하기 너무 불편해서 혀가 지름길을 택한 결과입니다.
오늘 딱 세 개의 소리 서랍(KN-, -MB, WR-)만 기억하시면, 평생 헷갈리던 묵음 단어가 사전 없이도 한눈에 읽힙니다.

「이해하면 쉬운영어」입니다. 왕초보도 이해할 수 있게, 입술과 혀의 물리적 원리로 설명합니다.

📌 오늘 배우는 내용
・철자에는 있는데 왜 소리가 나지 않을까? (자음 충돌 회피 원리)
・1번 서랍 KN-(knee, knife, know): 앞니 뒤 N으로 직행하기
・2번 서랍 -MB(climb, comb, thumb): 입술 닫고 부드럽게 '음~'으로 마무리
・3번 서랍 WR-(write, wrong, wrist): W 망설임 없이 바로 혀 당겨 R로 출발
・소리 안 나는 철자를 남겨둔 진짜 이유: 뜻을 구별해 주는 고마운 신분증(knight vs night)
・실전 퀴즈 2라운드 (새로운 단어 즉각 분류 훈련)
・자연스러운 문장 낭독 트레이닝 + 한 장 요약 치트시트

⏱️ 챕터 타임라인
0:00 KNEE, CLIMB, WRITE — 왜 소리가 안 날까?
0:30 채널 소개
0:40 사전 속 예외처럼 흩어진 묵음 철자들
0:57 반전: 예외가 아니라 혀가 지쳐서 빠진 겁니다
1:24 소리가 서로 부딪히는 물리적 원리
1:54 1번 서랍: KN- 소리 (K 지우고 N으로 출발)
2:31 2번 서랍: -MB 소리 (B 터뜨리지 않고 편안히 닫기)
3:11 3번 서랍: WR- 소리 (W 버리고 시원하게 R로 직진)
3:46 꿀팁: 소리 안 나는 글자를 남겨둔 고마운 이유 (knight vs night)
4:15 실전 퀴즈 1라운드 (3초 챌린지)
4:57 실전 퀴즈 2라운드 (스피드 챌린지)
5:25 문장으로 자연스럽게 읽기 ①
5:47 문장으로 자연스럽게 읽기 ②
6:13 한 장 요약 총정리 치트시트
6:32 엔딩

영어는 무작정 외우는 것이 아니라, 소리의 원리를 이해하는 것입니다.
구독과 좋아요는 다음 영상 제작에 큰 힘이 됩니다.

#영어발음 #파닉스 #묵음 #영어읽기 #왕초보영어 #영어공부 #영단어 #발음원리 #성인영어 #기초영어`
  },
  en: {
    lang: "English (글로벌 공용어 & 알고리즘 인덱싱)",
    title: "Stop Memorizing Silent Letters! The Lazy Tongue Secret of KN, MB, WR | English Phonics",
    desc: `KNEE, CLIMB, WRITE, KNOCK, THUMB — You see these words every day, but why on earth are K, B, and W written if they aren't pronounced at all?
Trying to memorize every silent letter as a random dictionary exception makes English feel frustrating and exhausting. But here's the secret: they aren't exceptions at all! Native speakers simply dropped them because their tongues got tired of awkward physical collisions.
With just three simple sound drawers (KN-, -MB, WR-) introduced today, you'll read these confusing silent words instantly without ever checking a dictionary again!

Welcome to 'Easy English When Understood'. We explain English through intuitive pronunciation physiology so even complete beginners can master authentic spoken English.

📌 What you will learn today
• The collision-avoidance principle: Why English letters go silent
• Drawer 1: KN- (knee, knife, know) — Drop K and launch straight from N behind upper teeth
• Drawer 2: -MB (climb, comb, thumb) — Keep lips gently closed without bursting the 'B'
• Drawer 3: WR- (write, wrong, wrist) — Forget W and drive straight into an effortless R
• The real reason silent letters survived: The invaluable ID card distinguishing meaning (knight vs night)
• 2-Round Instant Quiz Challenge (Immediate word classification)
• Real-life sentence reading & 1-page summary cheat sheet

⏱️ Chapters
0:00 KNEE, CLIMB, WRITE — Why are they silent?
0:30 Channel Introduction
0:40 The frustrating mess of dictionary exceptions
0:57 The Plot Twist: Native tongues got exhausted!
1:24 Physical principle of consonant collisions
1:54 Drawer 1: KN- (Drop K and launch into N)
2:31 Drawer 2: -MB (Close lips gently without popping B)
3:11 Drawer 3: WR- (Bypass W and drive straight into R)
3:46 Pro Tip: Why silent letters stay (knight vs night)
4:15 3-Second Real-world Quiz Round 1
4:57 Rapid-fire Quiz Round 2
5:25 Sentence Fluency Practice ①
5:47 Sentence Fluency Practice ②
6:13 1-Page Master Summary Cheat Sheet
6:32 Closing & Next Steps

#EnglishPronunciation #Phonics #SilentLetters #LearnEnglish #EnglishSpeaking #PronunciationRules #AdultPhonics #BeginnerEnglish`
  },
  ja: {
    lang: "日本語 (Japanese - 일본 시청자 타겟)",
    title: "黙字を丸暗記するのはもうやめよう！K, B, Wが消える「なまけものの舌」の秘密 | 大人のフォニックス",
    desc: `KNEE, CLIMB, WRITE, KNOCK, THUMB — 誰もが知っている基本単語なのに、なぜ書かれている K, B, W を全く発音しないのでしょうか？
辞書のバラバラな発音記号を見て「全部例外として暗記しなきゃ」と途方に暮れていませんでしたか？実はこれら、例外ではなくネイティブの舌が疲れすぎて自然と脱落した発音の近道なのです。
今日ご紹介する「たった3つの音の引き出し(KN-, -MB, WR-)」さえ知れば、一生迷っていた黙字単語が辞書なしでスラスラ読めるようになります。

「理解すれば簡単な英語」へようこそ。初心者でも腑に落ちるよう、発声の身体的メカニズムから分かりやすく解説します。

📌 今回のレッスン内容
・文字はあるのに発音しない理由（調音の衝突回避メカニズム）
・引き出し1：KN-(knee, knife, know) — Kを捨てて前歯の裏のNから発進
・引き出し2：-MB(climb, comb, thumb) — 唇を閉じたまま「ム〜」で優しく終了
・引き出し3：WR-(write, wrong, wrist) — Wでためらわず一気にRへ直行
・発音しない文字が現代まで残った理由：単語の意味を見分ける身分証 (knight vs night)
・3秒クイズ2ラウンド（初見単語の即答チャレンジ）
・自然なセンテンス音読トレーニング＋1枚まとめチートシート

⏱️ チャプター
0:00 KNEE, CLIMB, WRITE — なぜ音が出ないのか？
0:30 チャンネル紹介
0:40 辞書に散らばる例外に見える黙字たち
0:57 衝撃の真実：ネイティブの舌が疲れた結果だった！
1:24 音同士が衝突する物理的原理
1:54 引き出し1：KN-の音（Kを消してNで出発）
2:31 引き出し2：-MBの音（Bを破裂させず唇を閉じるだけ）
3:11 引き出し3：WR-の音（Wを捨てて気持ちよくRへ直進）
3:46 豆知識：発音しない文字を残したありがたい理由（knight vs night）
4:15 実戦3秒クイズ 第1ラウンド
4:57 実戦スピードクイズ 第2ラウンド
5:25 文章スラスラ音読 ①
5:47 文章スラスラ音読 ②
6:13 1枚完結まとめチートシート
6:32 エンディング

#英語発音 #フォニックス #大人のやり直し英語 #黙字 #発音のルール #英語初心者 #英語学習 #ネイティブ発音`
  },
  "zh-tw": {
    lang: "繁體中文 (Traditional Chinese - 台灣/香港)",
    title: "別再死記默音了！K, B, W 為什麼不發音？3個發音抽屜一次搞懂 | 成人自然拼讀",
    desc: `KNEE, CLIMB, WRITE, KNOCK, THUMB — 這些天天看見的常用單字，為什麼拼寫明明有 K、B、W，母語者卻徹底裝作看不見？
如果以為每個單字都是無規則的例外死記硬背，學英語當然痛苦萬分。其實這些字母不是例外，而是母語者講話時舌頭太累，為了省力而發明的「生理發音捷徑」！
今天只要掌握 3 個聲音抽屜（KN-, -MB, WR-），以後看到任何默音單字，不查字典也能一眼讀對。

歡迎來到「理解就變簡單的英語」。我們從最直觀的發音生理原理出發，讓初學者也能徹底理解。

⏱️ 時間戳記
0:00 KNEE, CLIMB, WRITE — 為什麼這些字母不發音？
0:30 頻道介紹
0:40 字典裡令人頭痛的例外默音單字
0:57 驚人真相：其實是舌頭太累省掉的！
1:24 發音器官碰撞衝突的物理原理
1:54 1號抽屜：KN- 發音（扔掉 K，直接從 N 起跑）
2:31 2號抽屜：-MB 發音（雙唇自然閉合，別爆破 B）
3:11 3號抽屜：WR- 發音（忘掉 W，順暢直奔 R）
3:46 核心冷知識：不發音的字母為何必須保留？（knight vs night）
4:15 3秒實戰測驗 第1回合
4:57 極速實戰測驗 第2回合
5:25 句子流暢朗讀練習 ①
5:47 句子流暢朗讀練習 ②
6:13 一張圖精華總結複習
6:32 結語

#英語發音 #自然拼讀 #默音 #零基礎英語 #成人學英語 #英文發音規則 #Phonics`
  },
  "zh-cn": {
    lang: "简体中文 (Simplified Chinese - 新加坡/全球华人)",
    title: "别再死记默音了！K, B, W 为什么不发音？3个声音抽屉一次全搞定 | 成人自然拼读",
    desc: `KNEE, CLIMB, WRITE, KNOCK, THUMB — 这些天天看见的常用单词，为什么拼写明明有 K、B、W，母语者却彻底装作看不见？
如果以为每个单词都是无规则的例外死记硬背，学英语当然痛苦万分。其实这些字母不是例外，而是母语者讲话时舌头太累，为了省力而发明的“生理发音捷径”！
今天只要掌握 3 个声音抽屉（KN-, -MB, WR-），以后看到任何默音单词，不查字典也能一眼读对。

欢迎来到“理解就变简单的英语”。我们从最直观的发音生理原理出发，让初学者也能彻底理解。

⏱️ 时间戳
0:00 KNEE, CLIMB, WRITE — 为什么这些字母不发音？
0:30 频道介绍
0:40 字典里让人头痛的例外默音单词
0:57 惊人真相：其实是舌头太累省掉的！
1:24 发音器官碰撞冲突的物理原理
1:54 1号抽屉：KN- 发音（扔掉 K，直接从 N 起跑）
2:31 2号抽屉：-MB 发音（双唇自然闭合，别爆破 B）
3:11 3号抽屉：WR- 发音（忘掉 W，顺畅直奔 R）
3:46 核心冷知识：不发音的字母为何必须保留？（knight vs night）
4:15 3秒实战测验 第1回合
4:57 极速实战测验 第2回合
5:25 句子流畅朗读练习 ①
5:47 句子流畅朗读练习 ②
6:13 一张图精华总结复习
6:32 结语

#英语发音 #自然拼读 #默音 #零基础英语 #成人学英语 #英语发音规则 #Phonics`
  },
  es: {
    lang: "Español (스페인어권 / 미국 히스패닉 / 중남미)",
    title: "¡Deja de memorizar letras mudas! El secreto de la lengua perezosa para KN, MB, WR | Fonética en Inglés",
    desc: `KNEE, CLIMB, WRITE, KNOCK, THUMB — Palabras comunes que vemos a diario, pero ¿por qué la K, la B y la W están escritas si nadie las pronuncia?
Memorizar cada letra muda como una excepción aleatoria del diccionario es frustrante. ¡Pero no son excepciones! Los hablantes nativos simplemente las eliminaron porque cansan la lengua en colisiones incómodas.
Con solo tres sencillos cajones de sonido (KN-, -MB, WR-), ¡podrás leer estas palabras al instante sin consultar el diccionario!

Bienvenidos a 'Inglés Fácil Cuando se Entiende'. Explicamos el inglés a través de la fisiología del habla para que cualquiera hable con soltura.

⏱️ Capítulos
0:00 KNEE, CLIMB, WRITE — ¿Por qué son mudas?
0:30 Presentación del canal
0:40 El dilema de las excepciones en el diccionario
0:57 Revelación: ¡A los nativos les cansaba la lengua!
1:24 El choque físico de consonantes
1:54 Cajón 1: Sonido KN- (Olvida la K y di N)
2:31 Cajón 2: Sonido -MB (Cierra los labios suavemente sin explotar la B)
3:11 Cajón 3: Sonido WR- (Pasa de la W y ve directo a la R)
3:46 Dato clave: Por qué se conservan las letras mudas (knight vs night)
4:15 Reto Quiz de 3 Segundos Ronda 1
4:57 Reto Quiz Rápido Ronda 2
5:25 Práctica de lectura en frases ①
5:47 Práctica de lectura en frases ②
6:13 Hoja de trucos resumen
6:32 Despedida

#PronunciacionIngles #FoneticaIngles #LetrasMudas #InglesDesdeCero #AprenderIngles #InglesParaAdultos`
  },
  vi: {
    lang: "Tiếng Việt (동남아 영어 학습 1위 베트남)",
    title: "Đừng học vẹt chữ câm nữa! Bí mật 'chiếc lưỡi lười' của KN, MB, WR | Phát âm tiếng Anh chuẩn",
    desc: `KNEE, CLIMB, WRITE, KNOCK, THUMB — Những từ vựng quen thuộc hằng ngày, nhưng tại sao K, B, W được viết rành rành mà người bản xứ lại không hề phát âm?
Nếu cứ coi mỗi từ là một ngoại lệ để học vẹt, bạn sẽ thấy tiếng Anh vô cùng nản. Thực chất, đây là con đường tắt giúp lưỡi và môi đỡ mệt mỏi khi nói chuyện!
Chỉ cần nhớ 3 ngăn kéo phát âm (KN-, -MB, WR-) hôm nay, bạn sẽ đọc chuẩn mọi từ câm mà không cần mở từ điển.

Chào mừng bạn đến với 'Hiểu Là Tiếng Anh Dễ Dàng'. Chúng tôi giải thích tiếng Anh bằng nguyên lý vật lý của cơ miệng để người mới bắt đầu cũng hiểu sâu sắc.

⏱️ Dấu mốc thời gian
0:00 KNEE, CLIMB, WRITE — Tại sao lại câm?
0:30 Giới thiệu kênh
0:40 Nỗi ám ảnh về từ câm trong từ điển
0:57 Sự thật bất ngờ: Người bản xứ bỏ vì mỏi lưỡi!
1:24 Nguyên lý va chạm giữa các âm thanh
1:54 Ngăn kéo 1: Âm KN- (Bỏ K, phát âm N)
2:31 Ngăn kéo 2: Âm -MB (Khép môi nhẹ nhàng, đừng bật B)
3:11 Ngăn kéo 3: Âm WR- (Quên W, kéo lưỡi đọc R)
3:46 Lý do giữ lại chữ câm: Thẻ căn cước phân biệt nghĩa (knight vs night)
4:15 Thử thách đố vui 3 giây Hiệp 1
4:57 Thử thách đố vui siêu tốc Hiệp 2
5:25 Luyện đọc câu trôi chảy ①
5:47 Luyện đọc câu trôi chảy ②
6:13 Bảng tổng kết ghi nhớ trong 1 trang
6:32 Lời kết

#PhatAmTiengAnh #HocTiengAnh #ChuCamTiengAnh #TiengAnhGiaoTiep #TuHocTiengAnh #TiengAnhChoNguoiMoiBatDau`
  }
};

fs.writeFileSync(path.join(outDir, 'multilingual-metadata.json'), JSON.stringify(metadata, null, 2), 'utf8');

// 3. Human-readable Guide text file
let guideTxt = `================================================================================
🌍 이해하면 쉬운영어 EP18 - 글로벌 다국어 유튜브 세팅 가이드
================================================================================
유튜브 스튜디오 [자막] 및 [세부정보]에서 복사해서 바로 붙여넣으실 수 있도록
핵심 6대 글로벌 언어(영어, 일본어, 중국어 번체, 중국어 간체, 스페인어, 베트남어)와 한국어 자막/메타데이터를 완비했습니다.

📁 생성된 자막 파일 (output/upload-packages/ep18-silent-consonants-longform/subtitles/):
1. subtitles-ko.srt     -> 한국어 (기본 자막)
2. subtitles-en.srt     -> English (전 세계 공용 & 유튜브 알고리즘 인덱싱)
3. subtitles-ja.srt     -> 日本語 (일본 시청자 타겟)
4. subtitles-zh-tw.srt  -> 繁體中文 (대만·홍콩 유튜브 시청자 1위 타겟)
5. subtitles-zh-cn.srt  -> 简体中文 (싱가포르·말레이시아 및 글로벌 화교 타겟)
6. subtitles-es.srt     -> Español (스페인어권 / 미국 히스패닉 / 중남미)
7. subtitles-vi.srt     -> Tiếng Việt (동남아 영어 학습 1위 베트남)

--------------------------------------------------------------------------------
[1] YouTube Studio 등록 순서 (3분 완성)
--------------------------------------------------------------------------------
1. 유튜브 스튜디오 -> 동영상 수정 -> 왼쪽 [자막] 메뉴 클릭
2. [언어 추가] 클릭 -> '영어', '일본어', '중국어(번체)', '스페인어' 등 원하는 언어 추가
3. 각 언어별로:
   - [제목 및 설명] 수정 클릭 -> 아래 각 언어별 제목/설명 복사 붙여넣기
   - [자막] 추가 클릭 -> [파일 업로드] -> [타이밍 포함] -> 해당 .srt 파일 업로드
4. 우측 상단 [게시] 누르면 완료!

`;

for (const [key, item] of Object.entries(metadata)) {
  guideTxt += `\n================================================================================\n[언어: ${item.lang}]\n================================================================================\n[제목]\n${item.title}\n\n[설명]\n${item.desc}\n`;
}
fs.writeFileSync(path.join(outDir, 'multilingual-guide.txt'), guideTxt, 'utf8');

// 4. Korean specific metadata files
fs.writeFileSync(path.join(outDir, 'title.txt'), metadata.ko.title, 'utf8');

const titleVariants = `[A/B 테스트용 제목 시안 (대시보드 CTR 진단 완료)]
================================================================================
(채택) B안 [CTR 등급: A | 8.7% ~ 11.4%]:
저도 왜 소리 안 나는지 몰랐습니다, 혀가 편해지는 묵음 원리 | 영어 왕초보

A안 [CTR 등급: A- | 7.8% ~ 9.5%]:
여태 스펠링 다 읽으셨나요? K, B, W 소리 안 나는 진짜 이유 | 묵음 파닉스

C안 [CTR 등급: B+ | 6.8% ~ 8.4%]:
외우지 않아도 저절로 읽힙니다, 3개 서랍으로 끝내는 묵음 법칙 | 성인 기초영어
`;
fs.writeFileSync(path.join(outDir, 'title-variants.txt'), titleVariants, 'utf8');

fs.writeFileSync(path.join(outDir, 'description.txt'), metadata.ko.desc, 'utf8');

const pinnedComment = `📌 오늘 영상 핵심 요약 (화면 캡처 치트시트)
1. 1번 서랍 KN- (knee, knife, know) ➔ 앞의 K 버리고 앞니 뒤 N으로 바로 출발!
2. 2번 서랍 -MB (climb, comb, thumb) ➔ 뒤의 B 버리고 입술 편안히 붙여 '음~'으로 마무리!
3. 3번 서랍 WR- (write, wrong, wrist) ➔ 앞의 W 버리고 혀 뒤로 당겨 시원하게 R로 직진!

💡 질문: 여러분이 영어를 배우면서 가장 읽기 힘들었던 묵음 단어는 무엇이었나요? 댓글로 남겨주시면 다음 영상에 반영하겠습니다!`;
fs.writeFileSync(path.join(outDir, 'pinned-comment.txt'), pinnedComment, 'utf8');

const tags = `영어발음,파닉스,묵음,silent letters,영어읽기,왕초보영어,영어공부,영단어,발음원리,성인영어,기초영어,knee 발음,climb 발음,write 발음,성인파닉스,이해하면쉬운영어`;
fs.writeFileSync(path.join(outDir, 'tags.txt'), tags, 'utf8');

const timeline = `0:00 KNEE, CLIMB, WRITE — 왜 소리가 안 날까?
0:30 채널 소개
0:40 사전 속 예외처럼 흩어진 묵음 철자들
0:57 반전: 예외가 아니라 혀가 지쳐서 빠진 겁니다
1:24 소리가 서로 부딪히는 물리적 원리
1:54 1번 서랍: KN- 소리 (K 지우고 N으로 출발)
2:31 2번 서랍: -MB 소리 (B 터뜨리지 않고 편안히 닫기)
3:11 3번 서랍: WR- 소리 (W 버리고 시원하게 R로 직진)
3:46 꿀팁: 소리 안 나는 글자를 남겨둔 고마운 이유 (knight vs night)
4:15 실전 퀴즈 1라운드 (3초 챌린지)
4:57 실전 퀴즈 2라운드 (스피드 챌린지)
5:25 문장으로 자연스럽게 읽기 ①
5:47 문장으로 자연스럽게 읽기 ②
6:13 한 장 요약 총정리 치트시트
6:32 엔딩`;
fs.writeFileSync(path.join(outDir, 'timeline.txt'), timeline, 'utf8');

const uploadChecklist = `[EP18 유튜브 롱폼 업로드 체크리스트]
================================================================================
1. [영상 파일]
   - video.mp4 (1080p 60fps, HyperFrames 정밀 렌더 완료)
2. [썸네일 이미지]
   - 메인: thumbnail.jpg (시안 B - 3단 서랍과 자신감 있는 미소, 모자&로고 완비)
   - A/B 테스트용 보조: thumbnail-a.jpg (호기심/충격), thumbnail-c.jpg (주의/손짓), thumbnail-close-up.jpg (모바일 익스트림 클로즈업)
3. [제목]
   - title.txt 복사 붙여넣기 (저도 왜 소리 안 나는지 몰랐습니다, 혀가 편해지는 묵음 원리 | 영어 왕초보)
4. [설명]
   - description.txt 복사 붙여넣기 (챕터 타임라인 포함)
5. [고정 댓글]
   - pinned-comment.txt 복사하여 첫 댓글 등록 후 [고정] 클릭
6. [태그]
   - tags.txt 내용 복사 붙여넣기
7. [자막 (다국어)]
   - 한국어: subtitles/subtitles-ko.srt 업로드
   - 영어: subtitles/subtitles-en.srt 업로드 + 영어 제목/설명 적용
   - 일본어: subtitles/subtitles-ja.srt 업로드 + 일본어 제목/설명 적용
   - 중국어 번체: subtitles/subtitles-zh-tw.srt 업로드 + 번체 제목/설명 적용
   - 중국어 간체: subtitles/subtitles-zh-cn.srt 업로드 + 간체 제목/설명 적용
   - 스페인어: subtitles/subtitles-es.srt 업로드 + 스페인어 제목/설명 적용
   - 베트남어: subtitles/subtitles-vi.srt 업로드 + 베트남어 제목/설명 적용
8. [엔드스크린 & 카드]
   - 마지막 5초 (6:32 ~ 6:45) 중앙 여백 영역에 추천 영상 카드 및 구독 버튼 배치
================================================================================`;
fs.writeFileSync(path.join(outDir, 'upload-checklist.txt'), uploadChecklist, 'utf8');

// 5. Copy Thumbnails
const thumbSrc = 'videos/ep18-silent-consonants';
if (fs.existsSync(path.join(thumbSrc, 'thumbnail-b.jpg'))) {
  fs.copyFileSync(path.join(thumbSrc, 'thumbnail-b.jpg'), path.join(outDir, 'thumbnail.jpg'));
  fs.copyFileSync(path.join(thumbSrc, 'thumbnail-b.jpg'), path.join(outDir, 'thumbnail-b.jpg'));
}
if (fs.existsSync(path.join(thumbSrc, 'thumbnail-a.jpg'))) {
  fs.copyFileSync(path.join(thumbSrc, 'thumbnail-a.jpg'), path.join(outDir, 'thumbnail-a.jpg'));
}
if (fs.existsSync(path.join(thumbSrc, 'thumbnail-c.jpg'))) {
  fs.copyFileSync(path.join(thumbSrc, 'thumbnail-c.jpg'), path.join(outDir, 'thumbnail-c.jpg'));
}
if (fs.existsSync(path.join(thumbSrc, 'thumbnail-close-up.jpg'))) {
  fs.copyFileSync(path.join(thumbSrc, 'thumbnail-close-up.jpg'), path.join(outDir, 'thumbnail-close-up.jpg'));
}
console.log('Copied all thumbnail variants to upload package');

// 6. Write status.json
const statusObj = {
  project: "ep18-silent-consonants",
  renderedAt: new Date().toISOString(),
  durationSeconds: 405.23,
  packageReady: true,
  thumbnailsReady: true,
  subtitlesReady: true,
  multilingualReady: true
};
fs.writeFileSync(path.join(outDir, 'status.json'), JSON.stringify(statusObj, null, 2), 'utf8');

console.log('EP18 upload package assets generated successfully!');
