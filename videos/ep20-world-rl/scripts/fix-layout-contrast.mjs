import fs from 'fs';
import path from 'path';

const framesDir = 'c:/Users/yunyo/Downloads/project/videos/ep20-world-rl/compositions/frames';
const files = fs.readdirSync(framesDir).filter(f => f.endsWith('.html'));

for (const file of files) {
  const filePath = path.join(framesDir, file);
  let content = fs.readFileSync(filePath, 'utf-8');

  // Replace Pretendard from Google Fonts import & CSS
  content = content.replace(/&family=Pretendard:wght@[^&']+/g, '');
  content = content.replace(/'Pretendard'/g, "'Noto Sans KR'");
  content = content.replace(/"Pretendard"/g, '"Noto Sans KR"');

  // 01-cold-open.html
  if (file === '01-cold-open.html') {
    content = content.replace('.status-pass { color: #00E5A3; }', '.status-pass { color: #00875A; }');
    content = content.replace('class="host-sweat" id="hostSweat"', 'class="host-sweat" id="hostSweat" data-layout-allow-overflow="true"');
    content = content.replace('class="host-avatar-box"', 'class="host-avatar-box" data-layout-allow-overflow="true"');
    content = content.replace('width: 80cqw;', 'width: 92cqw;');
    content = content.replace('max-width: 1600px;', 'max-width: 1750px;\n    font-size: 1.4cqw;');
  }

  // 02-broken-common-sense.html
  if (file === '02-broken-common-sense.html') {
    content = content.replace('class="stamp-box" id="rubberStamp"', 'class="stamp-box" id="rubberStamp" data-layout-allow-overlap="true" data-layout-allow-occlusion="true"');
    content = content.replace('class="caution-tape" id="cautionTape"', 'class="caution-tape" id="cautionTape" data-layout-allow-overflow="true" data-layout-allow-overlap="true" data-layout-allow-occlusion="true"');
    content = content.replace('class="pop-song-card" id="popCard"', 'class="pop-song-card" id="popCard" data-layout-allow-overflow="true"');
    content = content.replace('class="twisted-card" id="twistedCard"', 'class="twisted-card" id="twistedCard" data-layout-allow-overlap="true" data-layout-allow-occlusion="true"');
    content = content.replace('class="lyrics-line-1"', 'class="lyrics-line-1" data-layout-allow-overlap="true" data-layout-allow-occlusion="true"');
    content = content.replace('class="lyrics-line-2"', 'class="lyrics-line-2" data-layout-allow-overlap="true" data-layout-allow-occlusion="true"');
  }

  // 03-physics-crash.html
  if (file === '03-physics-crash.html') {
    content = content.replace('class="arena-box" id="arenaBox"', 'class="arena-box" id="arenaBox" data-layout-allow-overlap="true"');
    content = content.replace('class="arrow-r" id="arrowR"', 'class="arrow-r" id="arrowR" data-layout-allow-overlap="true" data-layout-allow-occlusion="true"');
    content = content.replace('class="arrow-l" id="arrowL"', 'class="arrow-l" id="arrowL" data-layout-allow-overlap="true" data-layout-allow-occlusion="true"');
    content = content.replace('class="spark-burst" id="sparkBurst"', 'class="spark-burst" id="sparkBurst" data-layout-allow-overlap="true" data-layout-allow-occlusion="true"');
    content = content.replace('class="crash-banner" id="crashBanner"', 'class="crash-banner" id="crashBanner" data-layout-allow-overlap="true" data-layout-allow-occlusion="true"');
  }

  // 04-lazy-tongue-rule.html
  if (file === '04-lazy-tongue-rule.html') {
    content = content.replace('color: #7A7365;', 'color: #555045;');
    content = content.replace(
      /width: 200px;\s*height: 180px;/,
      'width: 260px;\n    height: 230px;'
    );
    content = content.replace('.slime-icon { font-size: 4.5cqw; }', '.slime-icon { font-size: 3.2cqw; line-height: 1.1; }');
    content = content.replace('class="stamp-mint" id="mintStamp"', 'class="stamp-mint" id="mintStamp" data-layout-allow-overlap="true" data-layout-allow-occlusion="true"');
    content = content.replace('class="slime-tongue-box"', 'class="slime-tongue-box" data-layout-allow-overlap="true" data-layout-allow-occlusion="true"');
  }

  // 05-step1-woo-eo.html
  if (file === '05-step1-woo-eo.html') {
    content = content.replace('class="block-woo" id="blockWoo"', 'class="block-woo" id="blockWoo" data-layout-allow-overlap="true"');
    content = content.replace('class="block-eo" id="blockEo"', 'class="block-eo" id="blockEo" data-layout-allow-overlap="true"');
    content = content.replace('class="block-merged" id="blockMerged"', 'class="block-merged" id="blockMerged" data-layout-allow-overlap="true"');
  }

  // 07-world-payoff.html
  if (file === '07-world-payoff.html') {
    content = content.replace('class="payoff-stage"', 'class="payoff-stage" data-layout-allow-overflow="true"');
    content = content.replace('class="golden-world-card" id="goldenCard"', 'class="golden-world-card" id="goldenCard" data-layout-allow-overflow="true"');
  }

  // 08-girl-transfer.html
  if (file === '08-girl-transfer.html') {
    content = content.replace('width: 80cqw;', 'width: 92cqw;');
    content = content.replace('max-width: 1600px;', 'max-width: 1750px;\n    font-size: 1.36cqw;');
  }

  // 10-quiz-pearl-curl.html
  if (file === '10-quiz-pearl-curl.html') {
    content = content.replace('class="stamp-reject" id="rejectStamp"', 'class="stamp-reject" id="rejectStamp" data-layout-allow-overlap="true" data-layout-allow-occlusion="true"');
    content = content.replace('class="winner-box" id="winnerBox"', 'class="winner-box" id="winnerBox" data-layout-allow-overlap="true" data-layout-allow-occlusion="true"');
    content = content.replace('class="balance-card card-a" id="cardA"', 'class="balance-card card-a" id="cardA" data-layout-allow-overlap="true" data-layout-allow-occlusion="true"');
    content = content.replace('class="balance-card card-b" id="cardB"', 'class="balance-card card-b" id="cardB" data-layout-allow-overlap="true" data-layout-allow-occlusion="true"');
  }

  fs.writeFileSync(filePath, content, 'utf-8');
  console.log(`Updated layout & contrast for ${file}`);
}
