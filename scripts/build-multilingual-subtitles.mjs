import fs from 'fs';
import path from 'path';

// 1. Load extracted captions
const captionsRaw = JSON.parse(fs.readFileSync('scripts/temp-extracted-captions.json', 'utf8'));

// Helper to format SRT timestamp: 00:00:00,000
function formatSrtTime(seconds) {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);
  return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')},${String(ms).padStart(3, '0')}`;
}

// Translations data for all 63 captions
const translations = {
  en: [
    "A is 'æ', I is 'ɪ', O is 'ɑ'. That's definitely how we learned it.",
    "So why don't we hear any of those sounds in car, sir, or for?",
    "Because the 'R' that follows completely swallowed the vowel sound.",
    "Hello, welcome to 'Easy English When Understood'.",
    "Today, we reveal the secret of vowels lost behind R, and the formula that simplifies them into just three sounds.",
    "There are 5 vowel + R spellings: AR, ER, IR, OR, and UR.",
    "When you open a dictionary, each word shows a different phonetic symbol,",
    "making it look like you have to memorize all five.",
    "In reality, you don't need to memorize all five.",
    "Three of them—ER, IR, and UR—have completely identical sounds, only different spelling: her, bird, fur.",
    "The spelling is E, I, U, but the sound is just one relaxed 'er~'.",
    "So the sounds you actually need to learn are AR, OR, and this 'er~'—just three!",
    "The principle is simple: the tongue moves too early to prepare for the R.",
    "Before the mouth can fully form the vowel shape, the tongue pulls back to make the R sound.",
    "In the end, the original vowel melts into the tongue's movement and becomes an R-controlled sound.",
    "The first sound, AR, is an open, crisp 'ah~' where you drop your jaw.",
    "Instead of the original 'A', open your mouth wide.",
    "Let's say them together: car, park, star, farm, card.",
    "Just relax your jaw and say 'ah~', and it reads naturally.",
    "The second sound, OR, is a deep 'oh~' made by rounding your lips.",
    "When R comes after O, the lips round and resonate at the front.",
    "Try saying them yourself: for, corn, storm, fork, horse.",
    "Round your lips like blowing out a candle, and make a deep 'oh~'.",
    "The final sounds, ER, IR, and UR, are a relaxed, neutral 'er~' sound.",
    "Whether it's spelled E, I, or U makes no difference at all.",
    "person, term, girl, shirt, nurse, burn.",
    "Just relax your mouth completely and make a relaxed 'er~' sound.",
    "Hold on, let's look at one really important pro tip!",
    "An R before a vowel (like in 'red') and an R after a vowel (like in 'car') are completely different sounds.",
    "Front R rounds the lips and pushes outward with 'woo~', while Back R hooks the tail of the vowel and pulls backward.",
    "Just knowing this difference makes English pronunciation so much easier.",
    "Now that you know the rules, try guessing yourself!",
    "When a word appears, call out which sound drawer it belongs to in 3 seconds.",
    "smart!",
    "That's drawer 1, the jaw-drop AR sound.",
    "short!",
    "That's drawer 2, the rounded-lip OR sound.",
    "turn!",
    "That's drawer 3, the relaxed sound. Excellent job!",
    "Now let's challenge round 2 at a faster pace!",
    "dark!",
    "That's the jaw-drop AR sound.",
    "fork!",
    "That's the rounded-lip OR sound.",
    "first!",
    "That's the relaxed IR sound.",
    "If you answered without hesitation, you've mastered it!",
    "Now let's check with full sentences.",
    "All three sounds we learned are inside this one sentence.",
    "The girl in the car is waiting for her turn.",
    "girl's 'er', car's 'ar', for's 'or', turn's 'er'.",
    "Can you distinguish the words automatically now?",
    "Let's read one more sentence. This one has words we use every day.",
    "Please order a burger and corn for the party.",
    "order and corn's 'or', burger's 'er', party's 'ar'.",
    "Now whenever you see loanwords, you'll immediately see their original sounds.",
    "For today's rule, just remember this one summary sheet.",
    "AR drops the jaw for 'ah', OR rounds the lips for 'oh', and ER, IR, UR relax for 'er'.",
    "Five spellings finish in just three sounds.",
    "Take a screenshot and look back at it whenever you read new words.",
    "English isn't about blind memorization; it's about understanding the pathway of sound.",
    "Watching our previous vowel episode will make English even easier.",
    "Thank you for watching today. This was 'Easy English When Understood'."
  ],
  ja: [
    "Aは「ア/エ」、Iは「イ」、Oは「オ」。確かにそう習いましたよね。",
    "でもなぜ car, sir, for ではその音が全く出ないのでしょうか？",
    "後ろについたRが、母音の音を丸ごと飲み込んでしまったからです。",
    "こんにちは、「理解すれば簡単な英語」です。",
    "今日はRの後ろで消えた母音の秘密と、たった3つで終わる発音公式を公開します。",
    "母音の後ろにRがつく綴りは、AR, ER, IR, OR, UR の5種類です。",
    "辞書を開くと単語ごとに発音記号がバラバラに表示されていて、",
    "5つ全部暗記しなければならないように見えますよね。",
    "実はこの5つ、全部覚える必要はありません。",
    "そのうちER, IR, URの3つは、綴りが違うだけで音は完全に同じなんです。her, bird, fur。",
    "綴りはE, I, Uで異なりますが、音は3つともリラックスした「アー(er)」1つです。",
    "つまり本当に覚えるべき音は、AR、OR、そしてこの「アー(er)」まで、たったの3種類だけです。",
    "原理は簡単です。Rを発音しようと舌が早く動きすぎるからです。",
    "母音の口の形を作る前に、舌がRの音を出そうと後ろへグッと引っ込んでしまいます。",
    "結局、母音の元の音は舌の大きな動きに溶け込んでRの音に変わるのです。",
    "1つ目のARの音は、顎をストンと落とすスッキリした「アー」の音です。",
    "Aの元の音の代わりに、口の中を広く開けて声を出します。",
    "一緒に声を出してみましょう。car, park, star, farm, card。",
    "顎の力を抜いて「アー」と声を出すと、自然と読めるようになります。",
    "2つ目のORの音は、唇を丸くすぼめる深い「オー」の音です。",
    "Oの後ろにRが来ると、唇の先が丸く集まって響きます。",
    "実際に声を出してみましょう。for, corn, storm, fork, horse。",
    "ろうそくの火を吹き消すように唇をすぼめ、深く「オー」と発音します。",
    "最後のER, IR, URの音は、口の力をフッと抜いた中立の「アー(er)」の音です。",
    "綴りがEでも、Iでも、Uでも全く関係ありません。",
    "person, term, girl, shirt, nurse, burn。",
    "口角の力を抜いて、ぼーっと「アー」と音を出すだけで十分です。",
    "ここでちょっと、とても重要なワンポイント解説です！",
    "redのように母音の前に来るRと、carのように母音の後ろに来るRは、音が全く違います。",
    "前に来るRは唇を丸めて「ウ」と押し出し、後ろに来るRは母音のしっぽを捕まえて後ろへ引き込みます。",
    "この違いを知るだけで、英語の発音がぐっと楽になります。",
    "原理を学んだので、実際に当ててみましょう。",
    "単語が出たら何番の引き出しの音か、3秒以内に声に出してみてください。",
    "smart！",
    "顎を落とす1番のARの音ですね。",
    "short！",
    "唇を丸める2番のORの音です。",
    "turn！",
    "力を抜く3番の音です。素晴らしいです！",
    "今度はもう少し速いテンポで第2ラウンドに挑戦してみましょう。",
    "dark！",
    "顎を落とすARの音ですね。",
    "fork！",
    "唇を丸めるORの音です。",
    "first！",
    "力を抜いたIRの音です。",
    "迷わずすぐに答えられたら大成功です！",
    "今度は文章で確認してみましょう。",
    "今日学んだ3つの音が、1つの文章に全部入っています。",
    "The girl in the car is waiting for her turn.",
    "girlの「アー」、carの「アー」、forの「オー」、turnの「アー」。",
    "もう自然と単語が見分けられますよね？",
    "もう1文だけ読んでみましょう。今度は日常でよく使う単語が入っています。",
    "Please order a burger and corn for the party.",
    "orderとcornの「オー」、burgerの「アー」、partyの「アー」。",
    "もうカタカナ語を見ても、本来の英語の音がひと目でわかるようになります。",
    "今日学んだルール、このまとめの1枚だけ覚えておいてください。",
    "ARは顎を落として「アー」、ORは唇を丸めて「オー」、ER, IR, URは脱力して「アー」。",
    "5つの綴りがたった3つの音で整理されます。",
    "画面をスクリーンショットして、単語を読むたびに見返してみてください。",
    "英語は丸暗記するのではなく、音の通り道を理解することです。",
    "前回の母音の動画もあわせて見ていただくと、英語がさらに簡単になります。",
    "今日も本当にお疲れ様でした。「理解すれば簡単な英語」でした。"
  ],
  es: [
    "A es 'a', I es 'i', O es 'o'. Definitivamente así lo aprendimos.",
    "¿Pero por qué en car, sir y for no suena ninguna de esas vocales?",
    "Porque la 'R' que sigue se tragó por completo el sonido de la vocal.",
    "Hola, bienvenidos a 'Inglés Fácil Si Lo Entiendes'.",
    "Hoy revelamos el secreto de las vocales que desaparecen tras la R y la fórmula de solo 3 sonidos.",
    "Hay 5 combinaciones de vocal + R: AR, ER, IR, OR y UR.",
    "Al abrir un diccionario, cada palabra muestra símbolos fonéticos diferentes,",
    "haciendo parecer que debes memorizar los cinco.",
    "En realidad, no necesitas memorizar los cinco.",
    "Tres de ellos (ER, IR, UR) tienen exactamente el mismo sonido: her, bird, fur.",
    "La ortografía es E, I, U, pero el sonido es un único y relajado 'er~'.",
    "Así que los sonidos que realmente debes aprender son AR, OR y este 'er~': ¡solo tres!",
    "El principio es sencillo: la lengua se mueve demasiado pronto para preparar la R.",
    "Antes de formar la vocal, la lengua se retrae hacia atrás para hacer la R.",
    "Al final, la vocal original se funde en el movimiento de la lengua hacia la R.",
    "El primer sonido, AR, es una 'a~' abierta y clara donde relajas y dejas caer la mandíbula.",
    "En lugar del sonido original, abre bien la boca.",
    "Pronunciémoslas juntos: car, park, star, farm, card.",
    "Relaja la mandíbula, di 'a~' y se leerá naturalmente.",
    "El segundo sonido, OR, es una 'o~' profunda juntando los labios en círculo.",
    "Cuando la R sigue a la O, los labios se redondean hacia adelante.",
    "Intenta pronunciarlas tú mismo: for, corn, storm, fork, horse.",
    "Redondea los labios como apagando una vela y di una profunda 'o~'.",
    "Los últimos sonidos, ER, IR, UR, son un sonido 'er~' neutro y sin tensión.",
    "No importa si se escribe con E, I o U.",
    "person, term, girl, shirt, nurse, burn.",
    "Solo relaja los labios y pronuncia un relajado 'er~'.",
    "¡Un momento, veamos un consejo súper importante!",
    "La R antes de vocal (red) y la R después de vocal (car) suenan completamente distinto.",
    "La R inicial redondea labios y empuja hacia afuera, mientras la R final jala la vocal hacia adentro.",
    "Conocer esta diferencia hace que el inglés sea mucho más fácil.",
    "¡Ahora que sabes la regla, ponte a prueba!",
    "Cuando aparezca la palabra, di en qué cajón va en menos de 3 segundos.",
    "smart!",
    "Cajón 1, sonido AR bajando la mandíbula.",
    "short!",
    "Cajón 2, sonido OR redondeando labios.",
    "turn!",
    "Cajón 3, sonido relajado. ¡Excelente trabajo!",
    "¡Hagamos la ronda 2 a un ritmo más rápido!",
    "dark!",
    "Sonido AR bajando mandíbula.",
    "fork!",
    "Sonido OR redondeando labios.",
    "first!",
    "Sonido IR relajado.",
    "¡Si respondiste sin dudar, lo has dominado!",
    "Comprobémoslo ahora con una oración completa.",
    "Los tres sonidos aprendidos están en esta sola oración.",
    "The girl in the car is waiting for her turn.",
    "girl tiene 'er', car tiene 'ar', for tiene 'or', turn tiene 'er'.",
    "¿Ves cómo ahora distingues las palabras automáticamente?",
    "Leamos una oración más con palabras de uso cotidiano.",
    "Please order a burger and corn for the party.",
    "order y corn con 'or', burger con 'er', party con 'ar'.",
    "Ahora verás claramente los sonidos originales de las palabras en inglés.",
    "De la regla de hoy, solo recuerda esta hoja de resumen.",
    "AR abre mandíbula ('a'), OR redondea labios ('o'), y ER/IR/UR se relajan ('er').",
    "Cinco combinaciones se reducen a solo tres sonidos.",
    "Haz una captura de pantalla y consúltala cada vez que leas nuevas palabras.",
    "El inglés no es memorizar a ciegas, sino entender el camino del sonido.",
    "Ver nuestro video anterior de vocales hará que el inglés sea aún más sencillo.",
    "¡Muchas gracias por acompañarnos hoy! Esto fue 'Inglés Fácil Si Lo Entiendes'."
  ],
  vi: [
    "A là 'e', I là 'i', O là 'o'. Chúng ta ai cũng từng học như vậy.",
    "Nhưng tại sao trong car, sir, for lại không hề có những âm đó?",
    "Đó là vì chữ R đi phía sau đã nuốt trọn hoàn toàn âm nguyên âm ban đầu.",
    "Xin chào, đây là 'Hiểu Đúng Thì Tiếng Anh Rất Dễ'.",
    "Hôm nay, chúng tôi chia sẻ bí mật nguyên âm biến mất sau R và công thức chỉ 3 âm duy nhất.",
    "Các nguyên âm đi với R gồm 5 cặp: AR, ER, IR, OR, UR.",
    "Khi tra từ điển, mỗi từ lại có ký hiệu phiên âm khác nhau,",
    "khiến bạn tưởng rằng phải học thuộc lòng cả 5 âm.",
    "Thực ra, bạn không cần phải ghi nhớ cả 5.",
    "Trong đó ER, IR, UR dù viết khác nhau nhưng phát âm hoàn toàn giống hệt: her, bird, fur.",
    "Viết là E, I, U, nhưng âm thanh chỉ là một âm 'ơ~ (er)' thả lỏng duy nhất.",
    "Vì vậy, âm bạn thực sự cần nhớ chỉ là AR, OR và âm 'ơ~' này — đúng 3 âm!",
    "Nguyên lý rất đơn giản: lưỡi chuẩn bị cho âm R quá sớm.",
    "Trước khi khẩu hình kịp phát âm nguyên âm, lưỡi đã rụt về sau để đón âm R.",
    "Kết quả là âm nguyên âm ban đầu tan biến theo chuyển động của lưỡi và thành âm R.",
    "Âm đầu tiên AR là âm 'a~' sảng khoái khi bạn thả lỏng và hạ hàm xuống.",
    "Thay vì âm gốc, hãy mở rộng vòm họng và phát âm.",
    "Hãy cùng phát âm nhé: car, park, star, farm, card.",
    "Chỉ cần thả lỏng hàm và phát âm 'a~', bạn sẽ đọc chuẩn tự nhiên.",
    "Âm thứ hai OR là âm 'o~' trầm sâu khi bạn chu tròn môi lại.",
    "Khi O đi trước R, khẩu hình tròn lại ở đầu môi và vang lên.",
    "Hãy tự mình phát âm thử nhé: for, corn, storm, fork, horse.",
    "Chu môi như đang thổi nến và phát âm thật sâu 'o~'.",
    "Cụm âm cuối cùng ER, IR, UR là âm 'ơ~' trung tính, thả lỏng toàn bộ cơ miệng.",
    "Chữ cái viết là E, I hay U hoàn toàn không quan trọng.",
    "person, term, girl, shirt, nurse, burn.",
    "Chỉ cần thả lỏng khóe miệng và phát âm 'ơ~' thật tự nhiên.",
    "Khoan đã, hãy cùng xem một mẹo cực kỳ quan trọng nhé!",
    "Âm R đứng trước nguyên âm (như red) và R đứng sau nguyên âm (như car) hoàn toàn khác nhau.",
    "R đi trước thì chu môi đẩy ra 'u~', còn R đi sau thì móc đuôi nguyên âm kéo giật về sau.",
    "Chỉ cần hiểu điểm khác biệt này, tiếng Anh sẽ trở nên dễ dàng hơn nhiều.",
    "Đã nắm được nguyên lý, bây giờ hãy cùng thử sức đoán nhé!",
    "Khi từ xuất hiện, hãy nói to nó thuộc ngăn âm số mấy trong vòng 3 giây.",
    "smart!",
    "Đó là ngăn 1, âm AR hạ hàm.",
    "short!",
    "Đó là ngăn 2, âm OR chu tròn môi.",
    "turn!",
    "Đó là ngăn 3, âm thả lỏng. Bạn làm rất tốt!",
    "Bây giờ hãy thử thách vòng 2 với tốc độ nhanh hơn nhé!",
    "dark!",
    "Âm AR hạ hàm.",
    "fork!",
    "Âm OR chu môi.",
    "first!",
    "Âm IR thả lỏng.",
    "Nếu bạn trả lời ngay không chút do dự, bạn đã thành công rồi đấy!",
    "Bây giờ hãy cùng kiểm tra qua câu hoàn chỉnh nhé.",
    "Cả ba âm chúng ta vừa học đều nằm trọn vẹn trong một câu này.",
    "The girl in the car is waiting for her turn.",
    "girl là 'ơ', car là 'a', for là 'o', turn là 'ơ'.",
    "Bây giờ bạn đã tự động phân biệt được từng từ rồi đúng không?",
    "Hãy đọc thêm một câu nữa nhé. Câu này chứa những từ chúng ta gặp mỗi ngày.",
    "Please order a burger and corn for the party.",
    "order và corn là 'o', burger là 'ơ', party là 'a'.",
    "Từ giờ, dù nhìn thấy từ mượn bạn cũng sẽ thấy rõ ngay âm thanh nguyên bản của nó.",
    "Quy tắc hôm nay, bạn chỉ cần nhớ một bảng tóm tắt này thôi.",
    "AR hạ hàm 'a', OR chu môi 'o', còn ER, IR, UR thả lỏng 'ơ'.",
    "Năm cách viết nay gói gọn chỉ trong ba âm duy nhất.",
    "Hãy chụp màn hình lại và mở ra xem mỗi khi đọc từ mới nhé.",
    "Tiếng Anh không phải học vẹt, mà là thấu hiểu đường đi của âm thanh.",
    "Xem thêm tập nguyên âm trước của chúng tôi sẽ giúp bạn học dễ dàng hơn nữa.",
    "Hôm nay các bạn đã rất nỗ lực. Đây là 'Hiểu Đúng Thì Tiếng Anh Rất Dễ'."
  ],
  "zh-tw": [
    "A是「æ」、I是「ɪ」、O是「ɑ」。我們以前確實都是這樣學的。",
    "但為什麼在 car、sir、for 裡面，這些母音的聲音全都不見了呢？",
    "因為後面跟著的 R，把前面的母音完完全全給吞下去了。",
    "大家好，這裡是「理解就變簡單的英語」。",
    "今天我們將揭開 R 背後消失的母音之謎，並公開只要 3 個聲音就能搞定的終極發音公式。",
    "母音後面接 R 的拼字，共有 AR、ER、IR、OR、UR 這 5 種。",
    "翻開字典看，每個單字標註的音標都不一樣，",
    "看起來好像 5 個都非得死記硬背不可。",
    "其實這 5 種，根本不需要全部去背。",
    "其中 ER、IR、UR 這 3 種，只是拼字不同，聲音其實完全一模一樣：her、bird、fur。",
    "雖然拼字是 E、I、U，但發音全都是放鬆的同一個「er~」。",
    "所以真正需要記的聲音只有 AR、OR，以及這個「er~」，僅僅 3 種而已！",
    "原理其實非常簡單：因為舌頭為了發出 R 音，動得太早了。",
    "還來不及做出母音的嘴型，舌頭就急著往後縮去發 R 的聲音。",
    "結果母音原本的聲音，就被舌頭大幅度的動作給融化吸收，變成了 R 的聲音。",
    "第 1 個 AR 的聲音，是下巴自然往下掉的爽快「ah~」聲。",
    "不需要發 A 原本的音，只要把口腔大幅張開即可。",
    "我們一起唸唸看吧：car, park, star, farm, card。",
    "放鬆下巴發出「ah~」的聲音，自然就能唸得非常標準。",
    "第 2 個 OR 的聲音，是嘴唇收圓發出的深沉「oh~」聲。",
    "當 O 後面跟著 R 時，嘴唇會在前方圓圓地聚攏共鳴。",
    "請大家親自試著唸唸看：for, corn, storm, fork, horse。",
    "就像吹蠟燭一樣把嘴唇圓圓收攏，深沉地發出「oh~」的聲音。",
    "最後一組 ER、IR、UR 的聲音，則是嘴部完全不費力的中性「er~」音。",
    "拼字到底是 E、I 還是 U，完全沒有任何差別。",
    "person, term, girl, shirt, nurse, burn。",
    "只要放鬆嘴角、放空發出「er~」的聲音就完全足夠了。",
    "這裡稍等一下，跟大家分享一個非常重要的核心秘訣！",
    "像 red 這樣在母音前面的 R，和像 car 這樣在母音後面的 R，發音完全不同。",
    "前面的 R 是把嘴唇收圓往前推「woo~」，後面的 R 則是勾住母音的尾巴往後拉。",
    "光是搞懂這個方向的差異，英語發音就會瞬間變得輕鬆很多。",
    "既然學會了原理，現在就換大家親自試試看吧！",
    "單字一出現，請在 3 秒內大聲說出它屬於幾號聲音抽屜。",
    "smart！",
    "這是下巴往下掉的 1 號 AR 聲音對吧。",
    "short！",
    "這是嘴唇收圓的 2 號 OR 聲音。",
    "turn！",
    "這是完全放鬆的 3 號聲音。太棒了！",
    "這次我們用更快的節奏來挑戰第 2 回合吧！",
    "dark！",
    "是下巴往下掉的 AR 聲音。",
    "fork！",
    "是嘴唇收圓的 OR 聲音。",
    "first！",
    "是完全放鬆的 IR 聲音。",
    "如果你毫不猶豫立刻答對，那就代表你已經完全掌握了！",
    "現在讓我們用完整的句子來實戰檢驗吧。",
    "我們學到的 3 個聲音，全都包含在這一句話裡。",
    "The girl in the car is waiting for her turn.",
    "girl 的「er」、car 的「ar」、for 的「or」、turn 的「er」。",
    "現在單字是不是很自然就能一眼辨別了呢？",
    "我們再來讀最後一句話，裡面有我們日常生活中天天看到的單字。",
    "Please order a burger and corn for the party.",
    "order 和 corn 的「or」、burger 的「er」、party 的「ar」。",
    "現在就算看到外來語單字，原本真實的英語發音也能一目了然。",
    "今天學到的規則，只要記住這一張總整理就夠了。",
    "AR 掉下巴發「ah」、OR 圓嘴唇發「oh」，ER/IR/UR 放鬆發「er」。",
    "5 個拼字組合，最終只要 3 個聲音就能輕鬆搞定。",
    "趕快截圖保存起來，每次遇到生字時拿出來對照看看吧。",
    "學英語不需要死背硬記，而是要理解聲音運行的軌道。",
    "搭配觀看我們上一部雙母音影片，英語學習會變得更加簡單。",
    "今天也辛苦大家了，這裡是「理解就變簡單的英語」。"
  ],
  "zh-cn": [
    "A是“æ”、I是“ɪ”、O是“ɑ”。我们以前确实都是这样学的。",
    "但为什么在 car、sir、for 里面，这些元音的声音全都不见了呢？",
    "因为后面跟着的 R，把前面的元音完完全全给吞下去了。",
    "大家好，这里是“理解就变简单的英语”。",
    "今天我们将揭开 R 背后消失的元音之谜，并公开只要 3 个声音就能搞定的终极发音公式。",
    "元音后面接 R 的拼写，共有 AR、ER、IR、OR、UR 这 5 种。",
    "翻开字典看，每个单词标注的音标都不一样，",
    "看起来好像 5 个都非得死记硬背不可。",
    "其实这 5 种，根本不需要全部去背。",
    "其中 ER、IR、UR 这 3 种，只是拼写不同，声音其实完全一模一样：her、bird、fur。",
    "虽然拼写是 E、I、U，但发音全都是放松的同一个“er~”。",
    "所以真正需要记的声音只有 AR、OR，以及这个“er~”，仅仅 3 种而已！",
    "原理其实非常简单：因为舌头为了发出 R 音，动得太早了。",
    "还来不及做出元音的嘴型，舌头就急着往后缩去发 R 的声音。",
    "结果元音原本的声音，就被舌头大幅度的动作给融化吸收，变成了 R 的声音。",
    "第 1 个 AR 的声音，是下巴自然往下掉的爽快“ah~”声。",
    "不需要发 A 原本的音，只要把口腔大幅张开即可。",
    "我们一起念读看看吧：car, park, star, farm, card。",
    "放松下巴发出“ah~”的声音，自然就能读得非常标准。",
    "第 2 个 OR 的声音，是嘴唇收圆发出的深沉“oh~”声。",
    "当 O 后面跟着 R 时，嘴唇会在前方圆圆地聚拢共鸣。",
    "请大家亲自试着念读看看：for, corn, storm, fork, horse。",
    "就像吹蜡烛一样把嘴唇圆圆收拢，深沉地发出“oh~”的声音。",
    "最后一组 ER、IR、UR 的声音，则是嘴部完全不费力的中性“er~”音。",
    "拼写到底是 E、I 还是 U，完全没有任何差别。",
    "person, term, girl, shirt, nurse, burn。",
    "只要放松嘴角、放空发出“er~”的声音就完全足够了。",
    "这里稍等一下，跟大家分享一个非常重要的核心秘诀！",
    "像 red 这样在元音前面的 R，和像 car 这样在元音后面的 R，发音完全不同。",
    "前面的 R 是把嘴唇收圆往前推“woo~”，后面的 R 则是勾住元音的尾巴往后拉。",
    "光是搞懂这个方向的差异，英语发音就会瞬间变得轻松很多。",
    "既然学会了原理，现在就换大家亲自试试看吧！",
    "单词一出现，请在 3 秒内大声说出它属于几号声音抽屉。",
    "smart！",
    "这是下巴往下掉的 1 号 AR 声音对吧。",
    "short！",
    "这是嘴唇收圆的 2 号 OR 声音。",
    "turn！",
    "这是完全放松的 3 号声音。太棒了！",
    "这次我们用更快的节奏来挑战第 2 回合吧！",
    "dark！",
    "是下巴往下掉的 AR 声音。",
    "fork！",
    "是嘴唇收圆的 OR 声音。",
    "first！",
    "是完全放松的 IR 声音。",
    "如果你毫不犹豫立刻答对，那就代表你已经完全掌握了！",
    "现在让我们用完整的句子来实战检验吧。",
    "我们学到的 3 个声音，全都包含在这一句话里。",
    "The girl in the car is waiting for her turn.",
    "girl 的“er”、car 的“ar”、for 的“or”、turn 的“er”。",
    "现在单词是不是很自然就能一眼辨别了呢？",
    "我们再来读最后一句，里面有我们日常生活中天天看到的单词。",
    "Please order a burger and corn for the party.",
    "order 和 corn 的“or”、burger 的“er”、party 的“ar”。",
    "现在就算看到外来语单词，原本真实的英语发音也能一目了然。",
    "今天学到的规则，只要记住这一张总整理就够了。",
    "AR 掉下巴发“ah”、OR 圆嘴唇发“oh”，ER/IR/UR 放松发“er”。",
    "5 个拼写组合，最终只要 3 个声音就能轻松搞定。",
    "赶快截图保存起来，每次遇到生词时拿出来对照看看吧。",
    "学英语不需要死记硬背，而是要理解声音运行的轨道。",
    "搭配观看我们上一部双元音视频，英语学习会变得更加简单。",
    "今天也辛苦大家了，这里是“理解就变简单的英语”。"
  ]
};

// Create output directories
const outDir = 'output/upload-packages/ep17-bossy-r-longform/subtitles';
fs.mkdirSync(outDir, { recursive: true });

// Function to generate SRT string
function buildSrt(langCode) {
  let lines = [];
  for (let i = 0; i < captionsRaw.length; i++) {
    const item = captionsRaw[i];
    const text = (langCode === 'ko') ? item.text : translations[langCode][i];
    lines.push(`${i + 1}`);
    lines.push(`${formatSrtTime(item.start)} --> ${formatSrtTime(item.end)}`);
    lines.push(text);
    lines.push('');
  }
  return lines.join('\n');
}

// Generate all SRT files
const languages = [
  { code: 'ko', name: '한국어 (Korean)', file: 'subtitles-ko.srt' },
  { code: 'en', name: 'English', file: 'subtitles-en.srt' },
  { code: 'ja', name: '日本語 (Japanese)', file: 'subtitles-ja.srt' },
  { code: 'zh-tw', name: '繁體中文 (Traditional Chinese)', file: 'subtitles-zh-tw.srt' },
  { code: 'zh-cn', name: '简体中文 (Simplified Chinese)', file: 'subtitles-zh-cn.srt' },
  { code: 'es', name: 'Español (Spanish)', file: 'subtitles-es.srt' },
  { code: 'vi', name: 'Tiếng Việt (Vietnamese)', file: 'subtitles-vi.srt' }
];

for (const lang of languages) {
  const srtContent = buildSrt(lang.code);
  const filePath = path.join(outDir, lang.file);
  fs.writeFileSync(filePath, srtContent, 'utf8');
  console.log(`Generated ${lang.file} (${lang.name})`);
}

// Generate localized Metadata (Title & Description) for YouTube Studio
const metadata = {
  ko: {
    lang: "한국어 (Korean)",
    title: "발음기호 외우다 지쳤는데, R 하나로 모음 5개가 한 번에 정리됩니다 | 성인 파닉스",
    desc: `CAR, HER, BIRD, FOR, FUR — 다 아는 쉬운 단어인데, 왜 A는 '애'가 아니라 '아'로, E·I·U는 전부 똑같이 '어'로 읽히는지 생각해 보신 적 있으신가요?
그 답을 모른 채 다섯 개 발음기호부터 외우려니 지치는 겁니다. 사실 외울 건 다섯 개가 아니라 딱 세 가지 소리뿐입니다. 오늘 그 기준 하나만 알면, 모음 뒤에 R이 오는 단어는 더 이상 헷갈리지 않고 바로 읽으실 수 있습니다.

「이해하면 쉬운영어」입니다. 왕초보도 이해할 수 있게, 소리 나는 원리로 설명합니다.

⏱️ 영상 순서
0:00 CAR, SIR, FOR — 왜 이렇게 읽힐까
0:22 채널 소개
0:34 사전 발음기호 다섯 개, 복잡해 보이는 이유
0:54 반전: 사실은 소리 서랍 세 개뿐입니다
1:32 혀가 뒤로 물러나는 원리 (구강 단면도)
1:53 1번 서랍 AR 소리 실전 낭독
2:22 2번 서랍 OR 소리 실전 낭독
2:53 3번 서랍 ER·IR·UR 소리 실전 낭독
3:27 반전 꿀팁: 앞에 오는 R과 뒤에 오는 R은 방향이 다르다
3:56 실전 퀴즈 1라운드
4:32 실전 퀴즈 2라운드 (스피드)
5:00 문장으로 자연스럽게 읽기 ①
5:24 문장으로 자연스럽게 읽기 ②
5:48 오늘 배운 세 가지 소리 서랍 총정리
6:11 마무리

#영어발음 #파닉스 #영어읽기 #왕초보영어 #BossyR`
  },
  en: {
    lang: "English (United States)",
    title: "Tired of Pronunciation Symbols? How 'R' Explains All 5 Vowels at Once | Phonics Rules",
    desc: `CAR, HER, BIRD, FOR, FUR — simple words we all know, but have you ever wondered why A sounds like 'ah' instead of 'æ', and why E, I, and U all sound identical as 'er'?
Trying to memorize 5 different phonetic symbols without knowing the principle is exhausting. In reality, you don't need to learn 5 sounds—there are only THREE! Once you learn this single standard, you will never get confused by vowels followed by R.

Welcome to "Easy English When Understood". We explain English by the physical principles of sound so anyone can master it.

⏱️ Timestamps
0:00 CAR, SIR, FOR — Why do they sound this way?
0:22 Welcome & Channel Intro
0:34 Why 5 dictionary symbols look overwhelming
0:54 The Twist: There are only 3 sound drawers!
1:32 Why the tongue pulls back (Mouth diagram)
1:53 Drawer 1: The open AR sound practice
2:22 Drawer 2: The rounded OR sound practice
2:53 Drawer 3: The unified ER/IR/UR sound practice
3:27 Pro Tip: Front R vs Back R direction difference
3:56 3-Second Quiz Round 1
4:32 3-Second Quiz Round 2 (Speed)
5:00 Sentence Reading ①
5:24 Sentence Reading ②
5:48 One-Sheet Summary Map
6:11 Closing

#EnglishPronunciation #Phonics #BossyR #ESL #LearnEnglish #EnglishReading`
  },
  ja: {
    lang: "日本語 (Japanese)",
    title: "発音記号の暗記に疲れた方へ！R一つで母音5つが一気に整理される法則 | 大人のフォニックス",
    desc: `CAR, HER, BIRD, FOR, FUR — 誰もが知っている簡単な単語なのに、なぜ A は「エ」ではなく「アー」になり、E・I・U はすべて同じ「アー(er)」と発音されるのか疑問に思ったことはありませんか？
その仕組みを知らないまま辞書の発音記号を丸暗記しようとするから疲れてしまうのです。実は覚えるべき音は5つではなく、たったの「3つ」だけ！今日のルールを一つ知るだけで、母音＋Rの単語で迷うことはもう二度となくなります。

「理解すれば簡単な英語」へようこそ。初心者でも納得できるよう、発音の原理から分かりやすく解説します。

⏱️ タイムスタンプ
0:00 CAR, SIR, FOR — なぜこう読まれるのか？
0:22 チャンネル紹介
0:34 辞書の発音記号が複雑に見える理由
0:54 大反転：実は「3つの音の引き出し」だけ！
1:32 舌が後ろへ引っ込む原理（口内断面図）
1:53 1番の引き出し：AR音の実践音読
2:22 2番の引き出し：OR音の実践音読
2:53 3番の引き出し：ER・IR・UR音の実践音読
3:27 ワンポイント解説：前Rと後Rは舌の向きが違う！
3:56 3秒クイズ 第1ラウンド
4:32 3秒クイズ 第2ラウンド（スピード）
5:00 例文で自然に読む ①
5:24 例文で自然に読む ②
5:48 まとめシート
6:11 エンディング

#英語発音 #フォニックス #大人のやり直し英語 #英語の読み方 #BossyR #英語独学`
  },
  es: {
    lang: "Español (Spanish)",
    title: "¿Cansado de los símbolos fonéticos? Cómo la 'R' explica las 5 vocales en solo 3 sonidos | Fonética",
    desc: `CAR, HER, BIRD, FOR, FUR — palabras sencillas que todos conocemos, pero ¿te has preguntado por qué A suena 'ah' y por qué E, I, U suenan exactamente igual como 'er'?
Tratar de memorizar 5 símbolos fonéticos sin entender el principio es agotador. En realidad, no son 5 sonidos: ¡son solo TRES! Al dominar este criterio, nunca más dudarás al leer vocales seguidas de R.

Bienvenidos a "Inglés Fácil Si Lo Entiendes". Explicamos las reglas mediante los principios físicos del sonido.

⏱️ Marcas de tiempo
0:00 CAR, SIR, FOR —¿Por qué se leen así?
0:22 Introducción
0:34 Por qué 5 símbolos de diccionario parecen difíciles
0:54 El gran giro: ¡Solo hay 3 cajones de sonido!
1:32 Por qué la lengua retrocede (diagrama de la boca)
1:53 Cajón 1: Práctica del sonido AR abierto
2:22 Cajón 2: Práctica del sonido OR redondeado
2:53 Cajón 3: Práctica del sonido unificado ER/IR/UR
3:27 Consejo clave: R inicial vs R final
3:56 Mini Quiz Ronda 1
4:32 Mini Quiz Ronda 2 (Velocidad)
5:00 Lectura en oraciones ①
5:24 Lectura en oraciones ②
5:48 Hoja de resumen final
6:11 Cierre

#PronunciacionIngles #FoneticaIngles #AprenderIngles #InglesBasico #BossyR`
  },
  vi: {
    lang: "Tiếng Việt (Vietnamese)",
    title: "Hết sợ ký hiệu phiên âm! Chỉ với chữ R, 5 nguyên âm tiếng Anh được giải quyết gọn gàng",
    desc: `CAR, HER, BIRD, FOR, FUR — những từ quen thuộc ai cũng biết, nhưng bạn có từng thắc mắc vì sao A đọc là 'a' và vì sao E, I, U lại đọc y hệt nhau là 'ơ (er)'?
Cố học thuộc 5 ký hiệu phiên âm mà không hiểu nguyên lý khiến bạn nhanh nản. Thực tế, bạn không cần nhớ 5 âm — chỉ có ĐÚNG 3 ÂM! Nắm được quy tắc này, bạn sẽ tự tin đọc chuẩn mọi từ có nguyên âm đi với R.

Chào mừng bạn đến với "Hiểu Đúng Thì Tiếng Anh Rất Dễ". Học tiếng Anh qua nguyên lý tự nhiên của âm thanh.

⏱️ Mốc thời gian
0:00 CAR, SIR, FOR — Vì sao lại đọc như vậy?
0:22 Giới thiệu
0:34 Vì sao 5 ký hiệu từ điển trông phức tạp
0:54 Bất ngờ: Thực ra chỉ có 3 ngăn âm!
1:32 Vì sao lưỡi rụt về sau (sơ đồ khoang miệng)
1:53 Ngăn 1: Luyện đọc âm AR hạ hàm
2:22 Ngăn 2: Luyện đọc âm OR chu môi
2:53 Ngăn 3: Luyện đọc âm hợp nhất ER/IR/UR
3:27 Mẹo quan trọng: R đi trước vs R đi sau
3:56 Câu đố 3 giây Vòng 1
4:32 Câu đố 3 giây Vòng 2
5:00 Luyện đọc trong câu ①
5:24 Luyện đọc trong câu ②
5:48 Bảng tóm tắt
6:11 Lời kết

#PhatAmTiengAnh #HocTiengAnh #TiengAnhGiaoTiep #Phonics #BossyR`
  },
  "zh-tw": {
    lang: "繁體中文 (Traditional Chinese - 台灣/香港)",
    title: "別再死記音標了！只要一個 R，5個母音發音一次全搞定 | 成人自然拼讀",
    desc: `CAR, HER, BIRD, FOR, FUR — 明明都是最簡單的單字，但你有沒有想過，為什麼 A 不唸「æ」而是唸「ah」，為什麼 E、I、U 拼字全都不一樣，發音卻一模一樣全是「er」？
在不知道發音原理的情況下，光看字典裡 5 個不同的音標死記硬背，當然會覺得非常挫折。其實需要記的不是 5 個音，而是只有「3 個聲音」而已！只要掌握今天這套標準，以後遇到任何母音後面帶 R 的單字，你都能毫不猶豫、一眼唸對。

歡迎來到「理解就變簡單的英語」。我們用最直觀的發音生理原理，讓初學者也能徹底理解。

⏱️ 時間軸
0:00 CAR, SIR, FOR — 為什麼會這樣發音？
0:22 頻道介紹
0:34 字典裡的 5 個音標為什麼讓人頭痛
0:54 驚人反轉：其實只有「3 個聲音抽屜」！
1:32 舌頭往後縮的物理原理（口腔剖面圖）
1:53 1號抽屜：AR 掉下巴發音實戰朗讀
2:22 2號抽屜：OR 圓唇發音實戰朗讀
2:53 3號抽屜：ER·IR·UR 統一發音實戰朗讀
3:27 核心秘訣：前 R 與後 R 舌頭方向完全相反！
3:56 3秒實戰測驗 第1回合
4:32 3秒實戰測驗 第2回合（極速）
5:00 句子自然朗讀練習 ①
5:24 句子自然朗讀練習 ②
5:48 一張圖總結精華複習
6:11 結語

#英語發音 #自然拼讀 #Phonics #BossyR #零基礎英語 #成人學英語`
  },
  "zh-cn": {
    lang: "简体中文 (Simplified Chinese - 新加坡/全球华人)",
    title: "别再死记音标了！只要一个 R，5个元音发音一次全搞定 | 成人自然拼读",
    desc: `CAR, HER, BIRD, FOR, FUR — 明明都是最简单的单词，但你有没有想过，为什么 A 不念“æ”而是念“ah”，为什么 E、I、U 拼写完全不同，发音却一模一样全是“er”？
在不知道发音原理的情况下，光看字典里 5 个不同的音标死记硬背，当然会觉得非常受挫。其实需要记的不是 5 个音，而是只有“3 个声音”而已！只要掌握今天这套标准，以后遇到任何元音后面带 R 的单词，你都能毫不犹豫、一眼读对。

欢迎来到“理解就变简单的英语”。我们用最直观的发音生理原理，让初学者也能彻底理解。

⏱️ 时间戳
0:00 CAR, SIR, FOR — 为什么会这样发音？
0:22 频道介绍
0:34 字典里的 5 个音标为什么让人头痛
0:54 惊人反转：其实只有“3 个声音抽屉”！
1:32 舌头往后缩的物理原理（口腔剖面图）
1:53 1号抽屉：AR 掉下巴发音实战朗读
2:22 2号抽屉：OR 圆唇发音实战朗读
2:53 3号抽屉：ER·IR·UR 统一发音实战朗读
3:27 核心秘诀：前 R 与后 R 舌头方向完全相反！
3:56 3秒实战测验 第1回合
4:32 3秒实战测验 第2回合（极速）
5:00 句子自然朗读练习 ①
5:24 句子自然朗读练习 ②
5:48 一张图总结精华复习
6:11 结语

#英语发音 #自然拼读 #Phonics #BossyR #零基础英语 #成人学英语`
  }
};

fs.writeFileSync('output/upload-packages/ep17-bossy-r-longform/multilingual-metadata.json', JSON.stringify(metadata, null, 2), 'utf8');

// Write a clean human-readable guide text file
let guideTxt = `================================================================================
🌍 이해하면 쉬운영어 EP17 - 글로벌 다국어 유튜브 세팅 가이드
================================================================================
유튜브 스튜디오 [자막] 및 [세부정보]에서 복사해서 바로 붙여넣으실 수 있도록
핵심 6대 글로벌 언어(영어, 일본어, 중국어 번체, 중국어 간체, 스페인어, 베트남어)와 한국어 자막/메타데이터를 완비했습니다.

📁 생성된 자막 파일 (output/upload-packages/ep17-bossy-r-longform/subtitles/):
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

fs.writeFileSync('output/upload-packages/ep17-bossy-r-longform/multilingual-guide.txt', guideTxt, 'utf8');
console.log('Generated multilingual-metadata.json and multilingual-guide.txt');

// 3. Inject interactive multilingual section into index.html
const indexHtmlFile = 'output/upload-packages/ep17-bossy-r-longform/index.html';
if (fs.existsSync(indexHtmlFile)) {
  let html = fs.readFileSync(indexHtmlFile, 'utf8');
  
  // Tab CSS styles
  const tabStyles = `
    .lang-tab {
      background: #1A2234;
      color: #9CA3AF;
      border: 1px solid rgba(255,255,255,0.1);
      padding: 8px 16px;
      border-radius: 8px;
      font-size: 13.5px;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.15s;
    }
    .lang-tab:hover {
      background: #23304A;
      color: #FFF;
    }
    .lang-tab.active {
      background: var(--accent);
      color: #000;
      border-color: var(--accent);
      box-shadow: 0 0 12px var(--accent-glow);
    }
    .lang-panel {
      display: none;
      flex-direction: column;
      gap: 16px;
      margin-top: 16px;
    }
    .lang-panel.active {
      display: flex;
    }
    .srt-download-btn {
      background: linear-gradient(135deg, #10B981, #059669);
      color: #FFF;
      font-weight: 800;
      font-size: 13.5px;
      padding: 8px 18px;
      border-radius: 8px;
      text-decoration: none;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      box-shadow: 0 4px 12px rgba(16, 185, 129, 0.25);
      transition: all 0.15s;
    }
    .srt-download-btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 16px rgba(16, 185, 129, 0.4);
    }
  `;

  if (!html.includes('.lang-tab {')) {
    html = html.replace('</style>', `${tabStyles}\n  </style>`);
  }

  // Multilingual HTML section
  const sectionHtml = `
      <!-- GLOBAL MULTILINGUAL PACKAGE -->
      <section class="card" style="margin-top: 28px; border: 1px solid rgba(245, 197, 24, 0.4); box-shadow: 0 0 25px rgba(245, 197, 24, 0.08);">
        <div class="card-title" style="border-bottom: 1px solid rgba(255,255,255,0.08); padding-bottom: 14px;">
          <div style="display: flex; align-items: center; gap: 10px;">
            <span style="font-size: 24px;">🌍</span>
            <div>
              <span style="font-size: 18px; font-weight: 800; color: #FFF;">글로벌 다국어 노출 패키지 (자막 파일 & 번역 메타데이터)</span>
              <span style="font-size: 12.5px; color: var(--text-muted); display: block; margin-top: 2px;">미국·일본·남미·동남아 등 전 세계 시청자 및 알고리즘 추천을 위한 원스톱 세팅 자료</span>
            </div>
          </div>
          <a href="multilingual-guide.txt" target="_blank" class="btn-copy" style="text-decoration: none;">📄 가이드 전문 보기</a>
        </div>

        <div style="display: flex; gap: 8px; flex-wrap: wrap; margin-top: 14px;">
          <button class="lang-tab active" onclick="switchLang('en', this)">🇺🇸 English (미국/글로벌)</button>
          <button class="lang-tab" onclick="switchLang('ja', this)">🇯🇵 日本語 (일본)</button>
          <button class="lang-tab" onclick="switchLang('zh-tw', this)">🇹🇼 繁體中文 (대만/홍콩)</button>
          <button class="lang-tab" onclick="switchLang('zh-cn', this)">🇨🇳 简体中文 (싱가포르/글로벌)</button>
          <button class="lang-tab" onclick="switchLang('es', this)">🇪🇸 Español (스페인어/남미)</button>
          <button class="lang-tab" onclick="switchLang('vi', this)">🇻🇳 Tiếng Việt (베트남)</button>
          <button class="lang-tab" onclick="switchLang('ko', this)">🇰🇷 한국어 (기본 원본)</button>
        </div>

        <!-- EN Panel -->
        <div id="panel-en" class="lang-panel active">
          <div style="display: flex; justify-content: space-between; align-items: center; background: rgba(15,20,30,0.6); padding: 12px 16px; border-radius: 8px; border: 1px solid var(--card-border);">
            <div>
              <strong style="color: #FFF; font-size: 15px;">🇺🇸 English 자막 파일 (.srt)</strong>
              <span style="color: var(--text-muted); font-size: 12.5px; display: block;">63개 구간 정밀 싱크 완료 · 전 세계 공용 및 유튜브 글로벌 검색 인덱싱용</span>
            </div>
            <a href="subtitles/subtitles-en.srt" download="subtitles-en.srt" class="srt-download-btn">⬇️ subtitles-en.srt 다운로드</a>
          </div>
          <div>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
              <span style="font-weight: 700; color: #FFF; font-size: 14px;">🏷️ 영어 번역 제목</span>
              <button class="btn-copy" onclick="copyText('title-en', this)">제목 복사</button>
            </div>
            <div id="title-en" class="content-box single-line">${metadata.en.title}</div>
          </div>
          <div>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
              <span style="font-weight: 700; color: #FFF; font-size: 14px;">📝 영어 번역 설명 (타임스탬프 챕터 포함)</span>
              <button class="btn-copy" onclick="copyText('desc-en', this)">설명 복사</button>
            </div>
            <div id="desc-en" class="content-box">${metadata.en.desc}</div>
          </div>
        </div>

        <!-- JA Panel -->
        <div id="panel-ja" class="lang-panel">
          <div style="display: flex; justify-content: space-between; align-items: center; background: rgba(15,20,30,0.6); padding: 12px 16px; border-radius: 8px; border: 1px solid var(--card-border);">
            <div>
              <strong style="color: #FFF; font-size: 15px;">🇯🇵 日本語 자막 파일 (.srt)</strong>
              <span style="color: var(--text-muted); font-size: 12.5px; display: block;">63개 구간 정밀 싱크 완료 · 일본 영어 학습자 타겟 (가타카나 발음 한계 극복)</span>
            </div>
            <a href="subtitles/subtitles-ja.srt" download="subtitles-ja.srt" class="srt-download-btn">⬇️ subtitles-ja.srt 다운로드</a>
          </div>
          <div>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
              <span style="font-weight: 700; color: #FFF; font-size: 14px;">🏷️ 일본어 번역 제목</span>
              <button class="btn-copy" onclick="copyText('title-ja', this)">제목 복사</button>
            </div>
            <div id="title-ja" class="content-box single-line">${metadata.ja.title}</div>
          </div>
          <div>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
              <span style="font-weight: 700; color: #FFF; font-size: 14px;">📝 일본어 번역 설명 (타임스탬프 챕터 포함)</span>
              <button class="btn-copy" onclick="copyText('desc-ja', this)">설명 복사</button>
            </div>
            <div id="desc-ja" class="content-box">${metadata.ja.desc}</div>
          </div>
        </div>

        <!-- ZH-TW Panel -->
        <div id="panel-zh-tw" class="lang-panel">
          <div style="display: flex; justify-content: space-between; align-items: center; background: rgba(15,20,30,0.6); padding: 12px 16px; border-radius: 8px; border: 1px solid var(--card-border);">
            <div>
              <strong style="color: #FFF; font-size: 15px;">🇹🇼 繁體中文 자막 파일 (.srt)</strong>
              <span style="color: var(--text-muted); font-size: 12.5px; display: block;">63개 구간 정밀 싱크 완료 · 대만·홍콩 영어 학습자 타겟 (유튜브 시청률 1위 권역)</span>
            </div>
            <a href="subtitles/subtitles-zh-tw.srt" download="subtitles-zh-tw.srt" class="srt-download-btn">⬇️ subtitles-zh-tw.srt 다운로드</a>
          </div>
          <div>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
              <span style="font-weight: 700; color: #FFF; font-size: 14px;">🏷️ 번체자 번역 제목</span>
              <button class="btn-copy" onclick="copyText('title-zh-tw', this)">제목 복사</button>
            </div>
            <div id="title-zh-tw" class="content-box single-line">${metadata['zh-tw'].title}</div>
          </div>
          <div>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
              <span style="font-weight: 700; color: #FFF; font-size: 14px;">📝 번체자 번역 설명 (타임스탬프 챕터 포함)</span>
              <button class="btn-copy" onclick="copyText('desc-zh-tw', this)">설명 복사</button>
            </div>
            <div id="desc-zh-tw" class="content-box">${metadata['zh-tw'].desc}</div>
          </div>
        </div>

        <!-- ZH-CN Panel -->
        <div id="panel-zh-cn" class="lang-panel">
          <div style="display: flex; justify-content: space-between; align-items: center; background: rgba(15,20,30,0.6); padding: 12px 16px; border-radius: 8px; border: 1px solid var(--card-border);">
            <div>
              <strong style="color: #FFF; font-size: 15px;">🇨🇳 简体中文 자막 파일 (.srt)</strong>
              <span style="color: var(--text-muted); font-size: 12.5px; display: block;">63개 구간 정밀 싱크 완료 · 싱가포르·말레이시아 및 글로벌 화교 타겟</span>
            </div>
            <a href="subtitles/subtitles-zh-cn.srt" download="subtitles-zh-cn.srt" class="srt-download-btn">⬇️ subtitles-zh-cn.srt 다운로드</a>
          </div>
          <div>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
              <span style="font-weight: 700; color: #FFF; font-size: 14px;">🏷️ 간체자 번역 제목</span>
              <button class="btn-copy" onclick="copyText('title-zh-cn', this)">제목 복사</button>
            </div>
            <div id="title-zh-cn" class="content-box single-line">${metadata['zh-cn'].title}</div>
          </div>
          <div>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
              <span style="font-weight: 700; color: #FFF; font-size: 14px;">📝 간체자 번역 설명 (타임스탬프 챕터 포함)</span>
              <button class="btn-copy" onclick="copyText('desc-zh-cn', this)">설명 복사</button>
            </div>
            <div id="desc-zh-cn" class="content-box">${metadata['zh-cn'].desc}</div>
          </div>
        </div>

        <!-- ES Panel -->
        <div id="panel-es" class="lang-panel">
          <div style="display: flex; justify-content: space-between; align-items: center; background: rgba(15,20,30,0.6); padding: 12px 16px; border-radius: 8px; border: 1px solid var(--card-border);">
            <div>
              <strong style="color: #FFF; font-size: 15px;">🇪🇸 Español 자막 파일 (.srt)</strong>
              <span style="color: var(--text-muted); font-size: 12.5px; display: block;">63개 구간 정밀 싱크 완료 · 미국 히스패닉 & 중남미 영어 초보자 타겟</span>
            </div>
            <a href="subtitles/subtitles-es.srt" download="subtitles-es.srt" class="srt-download-btn">⬇️ subtitles-es.srt 다운로드</a>
          </div>
          <div>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
              <span style="font-weight: 700; color: #FFF; font-size: 14px;">🏷️ 스페인어 번역 제목</span>
              <button class="btn-copy" onclick="copyText('title-es', this)">제목 복사</button>
            </div>
            <div id="title-es" class="content-box single-line">${metadata.es.title}</div>
          </div>
          <div>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
              <span style="font-weight: 700; color: #FFF; font-size: 14px;">📝 스페인어 번역 설명 (타임스탬프 챕터 포함)</span>
              <button class="btn-copy" onclick="copyText('desc-es', this)">설명 복사</button>
            </div>
            <div id="desc-es" class="content-box">${metadata.es.desc}</div>
          </div>
        </div>

        <!-- VI Panel -->
        <div id="panel-vi" class="lang-panel">
          <div style="display: flex; justify-content: space-between; align-items: center; background: rgba(15,20,30,0.6); padding: 12px 16px; border-radius: 8px; border: 1px solid var(--card-border);">
            <div>
              <strong style="color: #FFF; font-size: 15px;">🇻🇳 Tiếng Việt 자막 파일 (.srt)</strong>
              <span style="color: var(--text-muted); font-size: 12.5px; display: block;">63개 구간 정밀 싱크 완료 · 동남아 1위 영어 교육 수요국 베트남 타겟</span>
            </div>
            <a href="subtitles/subtitles-vi.srt" download="subtitles-vi.srt" class="srt-download-btn">⬇️ subtitles-vi.srt 다운로드</a>
          </div>
          <div>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
              <span style="font-weight: 700; color: #FFF; font-size: 14px;">🏷️ 베트남어 번역 제목</span>
              <button class="btn-copy" onclick="copyText('title-vi', this)">제목 복사</button>
            </div>
            <div id="title-vi" class="content-box single-line">${metadata.vi.title}</div>
          </div>
          <div>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
              <span style="font-weight: 700; color: #FFF; font-size: 14px;">📝 베트남어 번역 설명 (타임스탬프 챕터 포함)</span>
              <button class="btn-copy" onclick="copyText('desc-vi', this)">설명 복사</button>
            </div>
            <div id="desc-vi" class="content-box">${metadata.vi.desc}</div>
          </div>
        </div>

        <!-- KO Panel -->
        <div id="panel-ko" class="lang-panel">
          <div style="display: flex; justify-content: space-between; align-items: center; background: rgba(15,20,30,0.6); padding: 12px 16px; border-radius: 8px; border: 1px solid var(--card-border);">
            <div>
              <strong style="color: #FFF; font-size: 15px;">🇰🇷 한국어 자막 파일 (.srt)</strong>
              <span style="color: var(--text-muted); font-size: 12.5px; display: block;">63개 구간 정밀 싱크 완료 · 한국어 음성 100% 일치 기본 자막</span>
            </div>
            <a href="subtitles/subtitles-ko.srt" download="subtitles-ko.srt" class="srt-download-btn">⬇️ subtitles-ko.srt 다운로드</a>
          </div>
          <div>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
              <span style="font-weight: 700; color: #FFF; font-size: 14px;">🏷️ 한국어 원본 제목</span>
              <button class="btn-copy" onclick="copyText('titleText', this)">제목 복사</button>
            </div>
            <div class="content-box single-line">${metadata.ko.title}</div>
          </div>
          <div>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
              <span style="font-weight: 700; color: #FFF; font-size: 14px;">📝 한국어 원본 설명</span>
              <button class="btn-copy" onclick="copyText('descText', this)">설명 복사</button>
            </div>
            <div class="content-box">${metadata.ko.desc}</div>
          </div>
        </div>

        <!-- Quick How-To -->
        <div class="tip-box" style="margin-top: 14px;">
          💡 <strong>YouTube Studio 3분 등록법:</strong><br>
          1. 유튜브 스튜디오 영상 수정 ➔ 왼쪽 <strong>[자막]</strong> 메뉴 클릭<br>
          2. <strong>[언어 추가]</strong> 클릭 후 위 4개 언어(영어, 일본어, 스페인어, 베트남어) 추가<br>
          3. 각 언어의 <strong>[제목 및 설명]</strong>에 위 번역문을 복사 붙여넣고, <strong>[자막]</strong>에 위 다운로드한 <code>.srt</code> 파일을 업로드하면 즉시 완료됩니다!
        </div>
      </section>
  `;

  // Script for tab switching
  const tabScript = `
  function switchLang(lang, btn) {
    document.querySelectorAll('.lang-tab').forEach(function(t) { t.classList.remove('active'); });
    document.querySelectorAll('.lang-panel').forEach(function(p) { p.classList.remove('active'); });
    btn.classList.add('active');
    var p = document.getElementById('panel-' + lang);
    if (p) p.classList.add('active');
  }
  `;

  // Remove existing section if present
  if (html.includes('<!-- GLOBAL MULTILINGUAL PACKAGE -->')) {
    html = html.replace(/<!-- GLOBAL MULTILINGUAL PACKAGE -->[\s\S]*?<!-- \/GLOBAL MULTILINGUAL PACKAGE -->/, '');
  }

  // Insert before </main>
  html = html.replace('</main>', `${sectionHtml}\n    <!-- /GLOBAL MULTILINGUAL PACKAGE -->\n  </main>`);

  // Insert script before </script>
  if (!html.includes('function switchLang(')) {
    html = html.replace('</script>', `${tabScript}\n</script>`);
  }

  fs.writeFileSync(indexHtmlFile, html, 'utf8');
  console.log('Successfully injected Multilingual section into index.html');
}

