import fs from 'fs';
import path from 'path';

// ⛔ 2026-11-06: 이 스크립트에는 고치기 전 문구(금지어, [30분 듣기] 등)가 들어 있다.
// 다시 실행하면 고친 패키지를 옛 글로 덮어쓰므로 막아 둔다. 글은 패키지 폴더의 txt 파일을 직접 고치고,
// 페이지는 `npm run upload-page -- <패키지 폴더>`로 다시 만든다.
throw new Error('옛 업로드 패키지 빌드 스크립트입니다. npm run upload-page를 쓰세요.');

const projectDir = path.resolve('videos/ep29-b-vs-v');
const outputDir = path.resolve('output/upload-packages/ep29-b-vs-v');
fs.mkdirSync(outputDir, { recursive: true });

// 1. Parse timeline from index.html
const indexHtml = fs.readFileSync(path.join(projectDir, 'index.html'), 'utf8');
const sceneMatches = [...indexHtml.matchAll(/data-composition-id="([^"]+)" data-composition-src="([^"]+)" data-start="([^"]+)" data-duration="([^"]+)"/g)];

const frameTitles = {
  '01-hook': "0.1초 소리 원리 (Best vs Vest)",
  '02-principle': "소리 원리 (윗니 0% 파열 vs 윗니 100% 마찰)",
  '03-drill1': "1단계: 기본 단모음 6쌍 (best vs vest, ban vs van...)",
  '04-drill2': "2단계: 패턴 확장 6쌍 (base vs vase, bolt vs volt...)",
  '05-drill3': "3단계: 심화 짝단어 6쌍 (curb vs curve, lobe vs love...)",
  '06-drill4': "4단계: 어말 & 어중 6쌍 (cab vs calve, marble vs marvel...)",
  '07-dialogue': "실전 회화 문맥 속 청취 (7문장 타겟 단어 대비)",
  '08-quiz': "0.1초 직관 청취 퀴즈 (8문항 실전 반응 훈련)",
  '09-summary': "스마트폰 캡처용 1장 요약 치트시트",
  '10-encore': "24쌍 무한 앵콜 총복습"
};

const timelineLines = sceneMatches.map(m => {
  const compId = m[1];
  const sec = parseFloat(m[3]);
  const min = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  const timeStr = String(min).padStart(2, '0') + ':' + String(s).padStart(2, '0');
  const title = frameTitles[compId] || compId;
  return `${timeStr} ${title}`;
});

// 엔드스크린 타임라인 라인 추가 (402.59초 -> 06:42)
timelineLines.push("06:42 [엔드스크린] 다음 추천 영상 및 채널 구독");

const timelineText = timelineLines.join('\n') + '\n';
fs.writeFileSync(path.join(outputDir, 'timeline.txt'), timelineText, 'utf8');

// 2. Titles
const mainTitle = "원어민이 B와 V를 0.1초 만에 구별하는 법 | B vs V 24쌍 반복 듣기";
fs.writeFileSync(path.join(outputDir, 'title.txt'), mainTitle + '\n', 'utf8');

const titleVariants = `Variant 1 (메인 채택 · 물리법칙형):
원어민이 B와 V를 0.1초 만에 구별하는 법 | B vs V 24쌍 반복 듣기

Variant 2 (대조군 · 상식파괴형):
여태 둘 다 'ㅂ'으로 읽으셨나요? B와 V를 0.1초 만에 구별하는 법 | B vs V 24쌍 반복 듣기

Variant 3 (대조군 · 직격호기심형):
[반복 듣기] Best와 Vest를 똑같이 읽으면 미국인이 못 알아듣는 이유 | B vs V 24쌍 소리 연습

Variant 4 (간결 집중형):
[30분 듣기] B와 V가 죽어도 안 들렸던 진짜 이유 | 윗니 0% vs 100% 소리 원리
`;
fs.writeFileSync(path.join(outputDir, 'title-variants.txt'), titleVariants, 'utf8');

// 3. Description
const description = `학창 시절 영어 시간에 B(베스트)와 V(베스트)를 둘 다 한글 'ㅂ'으로 표기해 소리 내셨나요?
원어민에게 "Best"라고 했는데 "Vest"로 알아듣거나, 미드에서 B와 V가 0.1초 만에 스쳐 지나갈 때 왜 구별이 안 될까요?

비밀은 글자 모양이 아니라, "윗니가 닿는 면적과 입술의 물리법칙"에 있습니다!
윗니 0% (두 입술 파열) vs 윗니 100% (윗니로 아랫입술 살짝 물고 성대 진동)의 차이를 원리로 이해하면, 0.1초 만에 두 소리가 선명하게 갈라집니다.

이 영상 하나로 24개 필수 짝단어를 원어민 남녀 음성으로 반복 체화해 보세요! 🎧

[타임라인 챕터]
${timelineText}
━━━━━━━━━━━━━━━━━━━
💡 B vs V 소리 원리 핵심 요약:
① [b] 두 입술 터지는 소리 (윗니 닿는 면적 0%):
   - 두 입술을 가볍게 닫았다가 공기를 팡 터뜨리는 순간적인 폭발음
   - (best, ban, berry, bat, boat, base, curb 등)

② [v] 윗니 진동 마찰 소리 (윗니 닿는 면적 100%):
   - 윗니 앞니로 아랫입술 안쪽 살을 살짝 대고, 성대를 부르르 떨며 바람을 밀어내는 지속음
   - (주의: 아랫입술을 꽉 깨물면 원어민처럼 자연스럽게 발음할 수 없습니다!)
   - (vest, van, very, vat, vote, vase, curve 등)

━━━━━━━━━━━━━━━━━━━
📌 학습 팁:
단어만 보지 마시고, 04:00부터 시작되는 실전 회화 7문장과 24단어 무작위 셔플 퀴즈를 통해 귀가 먼저 0.1초 만에 반응할 때까지 반복 청취해 보세요!
05:03에 나오는 '1장 요약 치트시트'는 스마트폰으로 캡처해 두시면 언제든 복습하기 좋습니다.

━━━━━━━━━━━━━━━━━━━
📺 다음 추천 영상:
• EP28: F vs P 0.1초 조음 물리법칙 [f] vs [p] (https://youtu.be/...)

#영어발음 #B발음 #V발음 #BvsV #영어듣기 #영어리스닝 #영어회화 #기초영어 #파닉스 #이해하면쉬운영어
`;
fs.writeFileSync(path.join(outputDir, 'description.txt'), description, 'utf8');

// 4. Pinned comment
const pinnedComment = `오늘도 B vs V 24쌍 반복 듣기 훈련을 끝까지 완주하신 여러분, 정말 고생하셨습니다! 👏

💬 여러분은 24개 짝단어 중 어떤 단어가 귀로 가장 구분하기 어려우셨나요?
(예: Best vs Vest? Berry vs Very? Curb vs Curve?)
댓글로 남겨주시면 발음 교정 팁을 함께 나눠드리겠습니다!

📱 05:03 요약 치트시트는 스마트폰에 캡처해 두고 틈날 때마다 꺼내보세요!
구독과 좋아요는 다음 유익한 발음 영상 제작에 큰 힘이 됩니다. ❤️
`;
fs.writeFileSync(path.join(outputDir, 'pinned-comment.txt'), pinnedComment, 'utf8');

// 5. Tags
const tags = "영어발음, B발음, V발음, B vs V, 영어리스닝, 영어듣기, 영어회화, 기초영어, 파닉스, 발음규칙, 짝단어, 영어공부, 원어민발음, 이해하면쉬운영어, English pronunciation, B vs V, minimal pairs, listening drill, english listening";
fs.writeFileSync(path.join(outputDir, 'tags.txt'), tags + '\n', 'utf8');

// 6. Status JSON
const statusJson = {
  status: "ready_for_render_on_other_pc",
  episodeId: "ep29-b-vs-v",
  title: mainTitle,
  recommendedPublishAt: "2026-10-15T14:00:00Z",
  videoFile: "English_Pronunciation_B_vs_V_Minimal_Pairs_Listening_Drill.mp4",
  durationSeconds: 412.59,
  durationFormatted: "6분 53초",
  endScreenDuration: "10초 (402.59s ~ 412.59s)",
  thumbnailsCount: 4,
  renderCommand: "npx hyperframes render videos/ep29-b-vs-v --output=output/upload-packages/ep29-b-vs-v/English_Pronunciation_B_vs_V_Minimal_Pairs_Listening_Drill.mp4",
  generatedAt: new Date().toISOString()
};
fs.writeFileSync(path.join(outputDir, 'status.json'), JSON.stringify(statusJson, null, 2), 'utf8');

// 7. Checklist
const checklist = `[EP29 유튜브 업로드 체크리스트]
- 에피소드: ep29-b-vs-v (B vs V 0.1초 소리 원리 24쌍 반복 듣기)
- 영상 길이: 6분 52.6초 (412.59s) / 엔드스크린 10초 탑재
- 최종 영상 파일명: English_Pronunciation_B_vs_V_Minimal_Pairs_Listening_Drill.mp4
- 타 PC 렌더링 명령어:
  npx hyperframes render videos/ep29-b-vs-v --output=output/upload-packages/ep29-b-vs-v/English_Pronunciation_B_vs_V_Minimal_Pairs_Listening_Drill.mp4
- 썸네일 시안:
  [A안 상식파괴 · 채택] thumbnail-variant-a.jpg ("다 'ㅂ'으로 읽으셨죠?")
  [메인 권장 1위] thumbnail-close-up.jpg (모바일 전용 클로즈업: 윗니 0% vs 100%)
  [메인 와이드] thumbnail.jpg (바스트샷 와이드 16:9)
  [B안 직격형] thumbnail-variant-b.jpg ("터뜨리기 vs 물기")
- 카테고리: 교육 (Education)
- 재생목록: [이해하면 쉬운영어] 반복 듣기 정주행
- 최종 태그: 19개 핵심 키워드 탑재 완료
- 자막: 한국어 오디오 내장 + Whisper 타임라인 완비
`;
fs.writeFileSync(path.join(outputDir, 'upload-checklist.txt'), checklist, 'utf8');

// 8. Copy thumbnails if exist
const thumbDir = path.join(projectDir, '.thumbnails');
if (fs.existsSync(thumbDir)) {
  const thumbFiles = fs.readdirSync(thumbDir).filter(f => !f.startsWith('v5_') && (f.endsWith('.jpg') || f.endsWith('.png')));
  thumbFiles.forEach(f => {
    fs.copyFileSync(path.join(thumbDir, f), path.join(outputDir, f));
  });
  if (thumbFiles.length > 0) {
    console.log(`✓ Copied ${thumbFiles.length} thumbnail files`);
  }
}

// 9. Copy rendered MP4 if available
const candidateRendersDirs = [path.resolve('renders'), path.join(projectDir, 'renders')];
let foundMp4 = null;

for (const rDir of candidateRendersDirs) {
  if (fs.existsSync(rDir)) {
    const mp4Files = fs.readdirSync(rDir).filter(f => f.startsWith('ep29') && f.endsWith('.mp4')).sort((a, b) => {
      return fs.statSync(path.join(rDir, b)).mtimeMs - fs.statSync(path.join(rDir, a)).mtimeMs;
    });
    if (mp4Files.length > 0) {
      foundMp4 = path.join(rDir, mp4Files[0]);
      break;
    }
  }
}

const targetMp4Name = "English_Pronunciation_B_vs_V_Minimal_Pairs_Listening_Drill.mp4";
if (foundMp4) {
  fs.copyFileSync(foundMp4, path.join(outputDir, targetMp4Name));
  console.log(`✓ Copied rendered video: ${foundMp4} -> ${path.join(outputDir, targetMp4Name)}`);
}

// 10. Generate index.html preview page
const indexHtmlContent = `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>EP29 유튜브 업로드 원클릭 패키지 | 이해하면 쉬운영어</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;800;900&family=Noto+Sans+KR:wght@400;500;700;900&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg: #0C0F17;
      --card-bg: rgba(22, 27, 41, 0.85);
      --card-border: rgba(255, 255, 255, 0.08);
      --accent: #F59E0B;
      --accent-glow: rgba(245, 158, 11, 0.35);
      --primary: #3B82F6;
      --success: #10B981;
      --text: #F3F4F6;
      --text-muted: #9CA3AF;
      --radius: 16px;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: var(--bg);
      color: var(--text);
      font-family: 'Noto Sans KR', 'Outfit', sans-serif;
      min-height: 100vh;
      padding: 40px 24px;
      line-height: 1.6;
      background-image:
        radial-gradient(circle at 15% 10%, rgba(59, 130, 246, 0.08) 0%, transparent 40%),
        radial-gradient(circle at 85% 85%, rgba(245, 158, 11, 0.08) 0%, transparent 40%);
    }
    .container {
      max-width: 1380px;
      margin: 0 auto;
      display: flex;
      flex-direction: column;
      gap: 32px;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      padding-bottom: 24px;
      border-bottom: 1px solid var(--card-border);
      flex-wrap: wrap;
      gap: 16px;
    }
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 12px;
      border-radius: 100px;
      font-size: 13px;
      font-weight: 800;
      background: rgba(59, 130, 246, 0.15);
      color: var(--primary);
      border: 1px solid rgba(59, 130, 246, 0.3);
      margin-bottom: 8px;
    }
    h1 {
      font-size: 32px;
      font-weight: 900;
      letter-spacing: -0.5px;
      background: linear-gradient(135deg, #FFF 40%, var(--primary) 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    .grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 24px;
    }
    @media (max-width: 1024px) {
      .grid { grid-template-columns: 1fr; }
    }
    .card {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: var(--radius);
      padding: 24px;
      backdrop-filter: blur(16px);
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .card-title {
      font-size: 18px;
      font-weight: 800;
      display: flex;
      justify-content: space-between;
      align-items: center;
      color: #FFF;
    }
    .copy-btn {
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid rgba(255, 255, 255, 0.12);
      color: var(--text);
      padding: 6px 14px;
      border-radius: 8px;
      cursor: pointer;
      font-size: 13px;
      font-weight: 700;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      transition: all 0.2s ease;
    }
    .copy-btn:hover {
      background: var(--primary);
      border-color: var(--primary);
      color: #FFF;
      transform: translateY(-1px);
    }
    .copy-btn.copied {
      background: var(--success);
      border-color: var(--success);
      color: #FFF;
    }
    .content-box {
      background: rgba(0, 0, 0, 0.4);
      border: 1px solid rgba(255, 255, 255, 0.05);
      border-radius: 10px;
      padding: 16px;
      font-size: 14px;
      line-height: 1.6;
      color: #D1D5DB;
      white-space: pre-wrap;
      max-height: 280px;
      overflow-y: auto;
      font-family: inherit;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div>
        <div class="badge">🚀 UPLOAD PACKAGE</div>
        <h1>EP29 · B vs V 0.1초 소리 원리 24쌍 반복 듣기</h1>
      </div>
    </div>
    <div class="grid">
      <div class="card">
        <div class="card-title">
          <span>📝 메인 제목</span>
          <button class="copy-btn" onclick="copyText('titleContent', this)">복사하기</button>
        </div>
        <div class="content-box" id="titleContent">${mainTitle}</div>
      </div>
      <div class="card">
        <div class="card-title">
          <span>🏷️ 업로드 태그</span>
          <button class="copy-btn" onclick="copyText('tagsContent', this)">복사하기</button>
        </div>
        <div class="content-box" id="tagsContent">${tags}</div>
      </div>
      <div class="card">
        <div class="card-title">
          <span>📌 고정 댓글</span>
          <button class="copy-btn" onclick="copyText('pinnedContent', this)">복사하기</button>
        </div>
        <div class="content-box" id="pinnedContent">${pinnedComment}</div>
      </div>
      <div class="card">
        <div class="card-title">
          <span>⏱️ 챕터 타임라인</span>
          <button class="copy-btn" onclick="copyText('timelineContent', this)">복사하기</button>
        </div>
        <div class="content-box" id="timelineContent">${timelineText}</div>
      </div>
    </div>
  </div>
  <script>
    function copyText(id, btn) {
      const text = document.getElementById(id).innerText;
      navigator.clipboard.writeText(text).then(() => {
        const orig = btn.innerText;
        btn.innerText = "✓ 복사완료";
        btn.classList.add("copied");
        setTimeout(() => {
          btn.innerText = orig;
          btn.classList.remove("copied");
        }, 1800);
      });
    }
  </script>
</body>
</html>`;

fs.writeFileSync(path.join(outputDir, 'index.html'), indexHtmlContent, 'utf8');

console.log("\n=== EP29 Upload Package Successfully Generated! ===");
console.log(`Directory: ${outputDir}`);
console.log(`Main Title: ${mainTitle}`);
console.log(`Duration: 412.59s (~6.9 min)`);
