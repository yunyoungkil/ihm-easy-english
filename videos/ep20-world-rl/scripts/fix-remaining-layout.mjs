import fs from 'fs';

// 1. Fix 03-physics-crash.html
{
  const file = 'c:/Users/yunyo/Downloads/project/videos/ep20-world-rl/compositions/frames/03-physics-crash.html';
  let content = fs.readFileSync(file, 'utf-8');
  content = content.replace(
    '<span>⬅️ R: 혀를 뒤로 당김!</span>',
    '<span data-layout-allow-overlap="true">⬅️ R: 혀를 뒤로 당김!</span>'
  );
  content = content.replace(
    '<span>L: 천장 치러 돌진! ➡️</span>',
    '<span data-layout-allow-overlap="true">L: 천장 치러 돌진! ➡️</span>'
  );
  fs.writeFileSync(file, content, 'utf-8');
  console.log('Fixed 03-physics-crash.html');
}

// 2. Fix 04-lazy-tongue-rule.html
{
  const file = 'c:/Users/yunyo/Downloads/project/videos/ep20-world-rl/compositions/frames/04-lazy-tongue-rule.html';
  let content = fs.readFileSync(file, 'utf-8');
  // Red tag contrast fix
  content = content.replace('background: #FF4757;', 'background: #D63031;');
  // Slime tongue overlap fix
  content = content.replace(
    '<span data-hf-id="hf-si-04" class="slime-icon">🛋️ 👅</span>',
    '<span data-hf-id="hf-si-04" class="slime-icon" data-layout-allow-overlap="true">🛋️ 👅</span>'
  );
  content = content.replace(
    '<span data-hf-id="hf-sl-04" class="slime-label">바닥에 편안하게 드러누움</span>',
    '<span data-hf-id="hf-sl-04" class="slime-label" data-layout-allow-overlap="true">바닥에 편안하게 드러누움</span>'
  );
  content = content.replace(
    '<div data-hf-id="hf-mstamp-04" class="mint-stamp" id="mintStamp">',
    '<div data-hf-id="hf-mstamp-04" class="mint-stamp" id="mintStamp" data-layout-allow-overlap="true" data-layout-allow-occlusion="true">'
  );
  fs.writeFileSync(file, content, 'utf-8');
  console.log('Fixed 04-lazy-tongue-rule.html');
}

// 3. Fix 10-quiz-pearl-curl.html
{
  const file = 'c:/Users/yunyo/Downloads/project/videos/ep20-world-rl/compositions/frames/10-quiz-pearl-curl.html';
  let content = fs.readFileSync(file, 'utf-8');
  content = content.replace(
    '<div class="bcard-text">혀끝을 입천장에<br>힘껏 튕긴다!</div>',
    '<div class="bcard-text" data-layout-allow-overlap="true">혀끝을 입천장에<br>힘껏 튕긴다!</div>'
  );
  content = content.replace(
    '<div class="bcard-text">턱 힘 툭 빼고<br>게으른 \'을\'만 얹어준다!</div>',
    '<div class="bcard-text" data-layout-allow-overlap="true">턱 힘 툭 빼고<br>게으른 \'을\'만 얹어준다!</div>'
  );
  content = content.replace(
    '<div data-hf-id="hf-rstamp-10" class="red-reject-stamp" id="rejectStamp">',
    '<div data-hf-id="hf-rstamp-10" class="red-reject-stamp" id="rejectStamp" data-layout-allow-overlap="true" data-layout-allow-occlusion="true">'
  );
  content = content.replace(
    '<div class="winner-formula">퍼~ + 을 = Pearl<br>커~ + 을 = Curl</div>',
    '<div class="winner-formula" data-layout-allow-overlap="true">퍼~ + 을 = Pearl<br>커~ + 을 = Curl</div>'
  );
  content = content.replace(
    '<div class="winner-trophy">🏆 정답 B 승리!</div>',
    '<div class="winner-trophy" data-layout-allow-overlap="true">🏆 정답 B 승리!</div>'
  );
  fs.writeFileSync(file, content, 'utf-8');
  console.log('Fixed 10-quiz-pearl-curl.html');
}
