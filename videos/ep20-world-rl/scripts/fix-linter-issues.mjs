import fs from 'fs';
import path from 'path';

const framesDir = 'c:/Users/yunyo/Downloads/project/videos/ep20-world-rl/compositions/frames';
const files = fs.readdirSync(framesDir).filter(f => f.endsWith('.html'));

for (const file of files) {
  const filePath = path.join(framesDir, file);
  let content = fs.readFileSync(filePath, 'utf-8');

  // 1. Replace ../../assets/ with assets/
  content = content.replaceAll('../../assets/', 'assets/');

  // 2. Add max-width: 1600px; overflow: visible; to .caption-line if not present
  if (content.includes('.caption-line {') && !content.includes('max-width: 1600px;')) {
    content = content.replace(
      /\.caption-line\s*\{([^}]+)\}/,
      (match, p1) => {
        let updated = p1;
        if (!updated.includes('max-width:')) {
          updated += '    max-width: 1600px;\n    overflow: visible;\n';
        }
        return `.caption-line {${updated}}`;
      }
    );
  }

  // 3. Fix 03-physics-crash.html
  if (file === '03-physics-crash.html') {
    content = content.replace(
      'tl.to("#arrowR", { left: "32cqw", duration: 0.8, ease: "power3.in" }, 15.0);',
      'tl.to("#arrowR", { x: "22cqw", duration: 0.8, ease: "power3.in" }, 15.0);'
    );
    content = content.replace(
      'tl.to("#arrowL", { right: "32cqw", duration: 0.8, ease: "power3.in" }, 15.0);',
      'tl.to("#arrowL", { x: "-22cqw", duration: 0.8, ease: "power3.in" }, 15.0);'
    );
  }

  // 4. Fix 05-step1-woo-eo.html
  if (file === '05-step1-woo-eo.html') {
    content = content.replace(
      'tl.to("#blockWoo", { left: "32cqw", duration: 0.4, ease: "power2.in" }, 22.0);',
      'tl.to("#blockWoo", { x: "14cqw", duration: 0.4, ease: "power2.in" }, 22.0);'
    );
    content = content.replace(
      'tl.to("#blockEo", { right: "32cqw", duration: 0.4, ease: "power2.in" }, 22.0);',
      'tl.to("#blockEo", { x: "-14cqw", duration: 0.4, ease: "power2.in" }, 22.0);'
    );
  }

  // 5. Fix 09-quiz-word-vs-world.html
  if (file === '09-quiz-word-vs-world.html') {
    content = content.replace(
      'tl.to("#cntNum", { opacity: 0, scale: 0.8, duration: 0.2 }, 48.2);',
      'tl.to("#cntNum", { opacity: 0, scale: 0.8, duration: 0.15 }, 48.2);'
    );
    content = content.replace(
      'tl.to("#cntNum", { opacity: 0, scale: 0.8, duration: 0.2 }, 49.2);',
      'tl.to("#cntNum", { opacity: 0, scale: 0.8, duration: 0.15 }, 49.2);'
    );
  }

  fs.writeFileSync(filePath, content, 'utf-8');
  console.log(`Updated ${file}`);
}
