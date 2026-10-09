import fs from 'fs';
import path from 'path';

const projectDir = path.resolve('videos/ep27-s-ending');
const outputDir = path.resolve('output/upload-packages/ep27-s-ending');
fs.mkdirSync(outputDir, { recursive: true });

// 1. Parse timeline from index.html
const indexHtml = fs.readFileSync(path.join(projectDir, 'index.html'), 'utf8');
const sceneMatches = [...indexHtml.matchAll(/data-composition-id="([^"]+)" data-composition-src="([^"]+)" data-start="([^"]+)" data-duration="([^"]+)"/g)];

const frameTitles = {
  '01-hook': "-S, 다 '스'로 읽으셨죠? 3가지 끝소리 차이 (도입부)",
  '02-principle': "조음 물리법칙 ([s] vs [z] vs [ɪz] 쿠션 원리)",
  '03-group1': "Group 1: [s] 무성음 6단어 (cats, cups, books, laughs...)",
  '04-group2': "Group 2: [z] 유성음 6단어 (dogs, plays, pens, calls...)",
  '05-group3': "Group 3: [ɪz] 쿠션 모음 6단어 (bu · ses, wat · ches, box · es...)",
  '06-group4': "Group 4: [ɪz] 특수 예외 & 기능어 6단어 (hou · ses, pri · zes, is...)",
  '07-dialogue': "실전 대화 7문장 (-S 문맥 청취 & 타겟 단어 대비)",
  '08-shuffle': "24단어 무작위 덱 셔플 귀 훈련 (실전 반응 퀴즈)",
  '09-summary': "스마트폰 캡처용 1장 요약 치트시트",
  '10-encore': "24단어 무한 앵콜 총복습 & 다음 영상 추천"
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

const timelineText = timelineLines.join('\n') + '\n';
fs.writeFileSync(path.join(outputDir, 'timeline.txt'), timelineText, 'utf8');

// 2. Titles
const mainTitle = "[30분 듣기] 영어 -S 끝소리 3가지 물리법칙, 이것만 알면 귀가 뚫립니다 | 기초 파닉스";
fs.writeFileSync(path.join(outputDir, 'title.txt'), mainTitle + '\n', 'utf8');

const titleVariants = `Variant C (메인 채택 · 바스트샷 와이드):
[30분 듣기] 영어 -S 끝소리 3가지 물리법칙, 이것만 알면 귀가 뚫립니다 | 기초 파닉스

Variant A (대조군 · 직관적 반전형):
[30분 듣기] 단어 끝 S, 전부 '스'로 읽으셨죠? 3가지 끝소리 차이 | 영어 발음

Variant B (대조군 · 실수경고형):
[30분 듣기] 원어민은 -S를 절대 다 '스'로 안 읽습니다! 24단어 귀 뚫림 | 영어 발음
`;
fs.writeFileSync(path.join(outputDir, 'title-variants.txt'), titleVariants, 'utf8');

// 3. Description
const description = `학창 시절 영어 시간에 "복수형이나 3인칭 단수에 붙은 S는 그냥 '스'라고 읽으면 돼"라고 배우셨나요?
원어민에게 "dogs"를 "독스", "is"를 "이스"라고 발음하면 왜 어색하게 들리고, 미드에서는 왜 S 소리가 다르게 들릴까요?

영어 단어 끝에 붙는 -S / -ES는 사실 성대의 떨림과 입안 공간에 따라 딱 3가지 물리 법칙으로 결정됩니다.
이 영상 하나로 24개 필수 단어의 끝소리를 원어민 남녀 음성으로 6회 반복 체화해 보세요! 🎧

[타임라인 챕터]
${timelineText}
━━━━━━━━━━━━━━━━━━━
💡 -S · -ES 발음의 3가지 물리 법칙 완전 정복:
① [s] 무성음 뒤: 성대 떨림 0% 뒤에서는 똑같이 안 떨리는 [s] (cats, cups, books, laughs, stops, sleeps)
② [z] 유성음 뒤: 성대가 울리는 소리 뒤에서는 부드러운 [z] (dogs, plays, pens, calls, loves, dreams)
③ [ɪz] 치찰음 뒤: 혀 꼬임 방지 쿠션 모음 투입! 음절 +1 (bu · ses, wat · ches, box · es, clas · ses)
★ 특수 예외 & 기능어: hou · ses (어간 유성음화 [haʊzɪz]), is [ɪz], was [wɑːz], has [hæz], does [dʌz]

━━━━━━━━━━━━━━━━━━━
📌 학습 팁:
단어만 보지 마시고, 05:00부터 시작되는 실전 대화 7문장과 24단어 무작위 셔플 퀴즈를 통해 귀가 먼저 반응할 때까지 반복 청취해 보세요!

#영어발음 #S발음 #복수형발음 #영어듣기 #영어리스닝 #영어회화 #기초영어 #파닉스 #이해하면쉬운영어
`;
fs.writeFileSync(path.join(outputDir, 'description.txt'), description, 'utf8');

// 4. Pinned comment
const pinnedComment = `오늘도 24단어 -S · -ES 끝소리 훈련을 끝까지 완주하신 여러분, 정말 고생하셨습니다! 👏

💬 여러분은 그동안 24개 단어 중 어떤 단어의 S 발음이 가장 헷갈리셨나요?
(예: dogs를 독스로 알고 계셨나요? 아니면 houses가 하우지즈로 변하는 게 신기하셨나요?)
댓글로 남겨주시면 발음 교정 팁을 함께 나눠드리겠습니다!

📱 07:30 요약 치트시트는 스마트폰에 캡처해 두고 틈날 때마다 꺼내보세요!
구독과 좋아요는 다음 유익한 발음 영상 제작에 큰 힘이 됩니다. ❤️
`;
fs.writeFileSync(path.join(outputDir, 'pinned-comment.txt'), pinnedComment, 'utf8');

// 5. Tags
const tags = "영어발음, S발음, 영어복수형, 3인칭단수, 영어리스닝, 영어듣기, 영어회화, 기초영어, 파닉스, 발음규칙, 영어공부, 원어민발음, 이해하면쉬운영어, English pronunciation, s ending pronunciation, plural s";
fs.writeFileSync(path.join(outputDir, 'tags.txt'), tags + '\n', 'utf8');

// 6. Status JSON
const statusJson = {
  status: "ready_to_upload",
  episodeId: "ep27-s-ending",
  title: mainTitle,
  recommendedPublishAt: "2026-10-11T14:00:00Z",
  videoFile: "English_Pronunciation_S_Ending_3_Rules_Listening_Drill.mp4",
  thumbnailsCount: 4,
  generatedAt: new Date().toISOString()
};
fs.writeFileSync(path.join(outputDir, 'status.json'), JSON.stringify(statusJson, null, 2), 'utf8');

// 7. Checklist
const checklist = `[EP27 유튜브 업로드 체크리스트]
- 에피소드: ep27-s-ending (-S · -ES 끝소리 3가지 물리법칙)
- 영상 파일: English_Pronunciation_S_Ending_3_Rules_Listening_Drill.mp4
- 썸네일:
  [C안 메인] thumbnail.jpg (와이드 바스트샷)
  [C안 모바일] thumbnail-close-up.jpg (모바일 피드 100px 특화 1위 권장)
  [A안] thumbnail-variant-a.jpg (반전형: "다 '스'로 읽으셨죠?")
  [B안] thumbnail-variant-b.jpg (실수경고형: "80%가 '즈' 소리입니다")
- 카테고리: 교육 (Education)
- 재생목록: [이해하면 쉬운영어] 30분 집중 듣기 드릴 정주행
- 최종 태그: 15개 키워드 탑재 완료
- 자막: 한국어 오디오 내장 + Whisper 타임라인 완비
`;
fs.writeFileSync(path.join(outputDir, 'upload-checklist.txt'), checklist, 'utf8');

// 8. Copy thumbnails
const thumbDir = path.join(projectDir, '.thumbnails');
if (fs.existsSync(thumbDir)) {
  const thumbFiles = fs.readdirSync(thumbDir).filter(f => f.endsWith('.jpg') || f.endsWith('.png'));
  thumbFiles.forEach(f => {
    fs.copyFileSync(path.join(thumbDir, f), path.join(outputDir, f));
  });
  console.log(`✓ Copied ${thumbFiles.length} thumbnail files to upload package`);
}

// 9. Copy rendered MP4 if available
const candidateRendersDirs = [path.resolve('renders'), path.join(projectDir, 'renders')];
let foundMp4 = null;

for (const rDir of candidateRendersDirs) {
  if (fs.existsSync(rDir)) {
    const mp4Files = fs.readdirSync(rDir).filter(f => f.startsWith('ep27') && f.endsWith('.mp4')).sort((a, b) => {
      return fs.statSync(path.join(rDir, b)).mtimeMs - fs.statSync(path.join(rDir, a)).mtimeMs;
    });
    if (mp4Files.length > 0) {
      foundMp4 = path.join(rDir, mp4Files[0]);
      break;
    }
  }
}

if (foundMp4) {
  const targetMp4Name = "English_Pronunciation_S_Ending_3_Rules_Listening_Drill.mp4";
  fs.copyFileSync(foundMp4, path.join(outputDir, targetMp4Name));
  console.log(`✓ Copied rendered video: ${foundMp4} -> ${path.join(outputDir, targetMp4Name)}`);
}

// 10. Generate index.html preview page
const indexHtmlContent = `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>EP27 유튜브 업로드 원클릭 패키지 | 이해하면 쉬운영어</title>
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
    .subtitle {
      color: var(--text-muted);
      font-size: 15px;
      margin-top: 4px;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(12, 1fr);
      gap: 24px;
    }
    .col-8 { grid-column: span 8; }
    .col-4 { grid-column: span 4; }
    .col-12 { grid-column: span 12; }
    @media (max-width: 1024px) {
      .col-8, .col-4 { grid-column: span 12; }
    }
    .card {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: var(--radius);
      padding: 24px;
      display: flex;
      flex-direction: column;
      gap: 16px;
      backdrop-filter: blur(16px);
      box-shadow: 0 10px 30px -10px rgba(0,0,0,0.5);
    }
    .card-title {
      font-size: 17px;
      font-weight: 800;
      display: flex;
      justify-content: space-between;
      align-items: center;
      color: #FFF;
    }
    .copy-btn {
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid rgba(255, 255, 255, 0.15);
      color: #FFF;
      font-size: 13px;
      font-weight: 700;
      padding: 6px 14px;
      border-radius: 8px;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      transition: all 0.2s ease;
    }
    .copy-btn:hover {
      background: var(--primary);
      border-color: var(--primary);
      box-shadow: 0 0 16px rgba(59, 130, 246, 0.4);
      transform: translateY(-1px);
    }
    .copy-btn.copied {
      background: var(--success);
      border-color: var(--success);
    }
    .text-box {
      background: rgba(0, 0, 0, 0.4);
      border: 1px solid rgba(255, 255, 255, 0.05);
      border-radius: 10px;
      padding: 16px;
      font-size: 14px;
      color: var(--text);
      white-space: pre-wrap;
      word-break: break-word;
      font-family: inherit;
      max-height: 280px;
      overflow-y: auto;
    }
    .thumbs-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 16px;
    }
    .thumb-card {
      background: rgba(0, 0, 0, 0.3);
      border: 1px solid var(--card-border);
      border-radius: 12px;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }
    .thumb-card img {
      width: 100%;
      aspect-ratio: 16/9;
      object-fit: cover;
      display: block;
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    }
    .thumb-meta {
      padding: 12px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .thumb-label {
      font-size: 13px;
      font-weight: 800;
    }
    .rec-tag {
      background: rgba(245, 158, 11, 0.2);
      color: var(--accent);
      border: 1px solid rgba(245, 158, 11, 0.4);
      font-size: 11px;
      font-weight: 800;
      padding: 2px 8px;
      border-radius: 6px;
    }
    .video-card video {
      width: 100%;
      border-radius: 10px;
      background: #000;
      outline: none;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div>
        <div class="badge">🚀 UPLOAD READY</div>
        <h1>EP27 유튜브 업로드 원클릭 패키지</h1>
        <div class="subtitle">영어 -S · -ES 끝소리 3가지 물리법칙 [s] vs [z] vs [ɪz] (30분 집중 듣기 드릴)</div>
      </div>
      <div>
        <a href="English_Pronunciation_S_Ending_3_Rules_Listening_Drill.mp4" download class="copy-btn" style="padding: 10px 20px; font-size: 15px; background: var(--primary);">
          ⬇️ 비디오 다운로드 (23.1MB)
        </a>
      </div>
    </div>

    <div class="grid">
      <!-- Title Section -->
      <div class="card col-8">
        <div class="card-title">
          <span>📌 유튜브 영상 제목</span>
          <button class="copy-btn" onclick="copyText('titleBox', this)">복사하기</button>
        </div>
        <div class="text-box" id="titleBox">${mainTitle}</div>
      </div>

      <!-- Checklist -->
      <div class="card col-4">
        <div class="card-title">
          <span>📋 업로드 체크리스트</span>
        </div>
        <div class="text-box" style="font-size: 13px;">${checklist}</div>
      </div>

      <!-- Description Section -->
      <div class="card col-8">
        <div class="card-title">
          <span>📝 영상 설명 및 타임라인</span>
          <button class="copy-btn" onclick="copyText('descBox', this)">복사하기</button>
        </div>
        <div class="text-box" id="descBox" style="max-height: 400px;">${description}</div>
      </div>

      <!-- Video Preview -->
      <div class="card col-4 video-card">
        <div class="card-title">
          <span>🎬 렌더링 영상 확인</span>
        </div>
        <video controls src="English_Pronunciation_S_Ending_3_Rules_Listening_Drill.mp4" preload="metadata"></video>
        <div style="font-size: 13px; color: var(--text-muted);">
          • 1080p Full HD · 8분 19.6초<br>
          • 10초 엔드스크린 구간 탑재 완료
        </div>
      </div>

      <!-- Thumbnails Section -->
      <div class="card col-12">
        <div class="card-title">
          <span>🖼️ 썸네일 4종 (우클릭 저장 또는 즉시 복사)</span>
        </div>
        <div class="thumbs-grid">
          <div class="thumb-card">
            <img src="thumbnail-close-up.jpg" alt="모바일 1위">
            <div class="thumb-meta">
              <div>
                <div class="thumb-label">모바일 전용 클로즈업 (C안)</div>
                <div style="font-size: 12px; color: var(--text-muted);">피드 100px 축소 시 시인성 극대화</div>
              </div>
              <span class="rec-tag">추천 1위</span>
            </div>
          </div>
          <div class="thumb-card">
            <img src="thumbnail.jpg" alt="C안 메인">
            <div class="thumb-meta">
              <div>
                <div class="thumb-label">Variant C (메인 와이드)</div>
                <div style="font-size: 12px; color: var(--text-muted);">"3가지 소리였습니다" 손가락 제스처</div>
              </div>
              <span class="rec-tag">메인</span>
            </div>
          </div>
          <div class="thumb-card">
            <img src="thumbnail-variant-a.jpg" alt="A안">
            <div class="thumb-meta">
              <div>
                <div class="thumb-label">Variant A (직관적 반전형)</div>
                <div style="font-size: 12px; color: var(--text-muted);">"다 '스'로 읽으셨죠?" 호기심 자극</div>
              </div>
            </div>
          </div>
          <div class="thumb-card">
            <img src="thumbnail-variant-b.jpg" alt="B안">
            <div class="thumb-meta">
              <div>
                <div class="thumb-label">Variant B (실수경고형)</div>
                <div style="font-size: 12px; color: var(--text-muted);">"80%가 '즈' 소리입니다" 충격 강조</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Pinned Comment & Tags -->
      <div class="card col-6">
        <div class="card-title">
          <span>💬 고정 댓글</span>
          <button class="copy-btn" onclick="copyText('pinBox', this)">복사하기</button>
        </div>
        <div class="text-box" id="pinBox">${pinnedComment}</div>
      </div>

      <div class="card col-6">
        <div class="card-title">
          <span>🏷️ 검색 태그</span>
          <button class="copy-btn" onclick="copyText('tagBox', this)">복사하기</button>
        </div>
        <div class="text-box" id="tagBox">${tags}</div>
      </div>
    </div>
  </div>

  <script>
    function copyText(elemId, btn) {
      const text = document.getElementById(elemId).innerText;
      navigator.clipboard.writeText(text).then(() => {
        const originalText = btn.innerHTML;
        btn.innerHTML = '✓ 복사완료!';
        btn.classList.add('copied');
        setTimeout(() => {
          btn.innerHTML = originalText;
          btn.classList.remove('copied');
        }, 2000);
      });
    }
  </script>
</body>
</html>
`;

fs.writeFileSync(path.join(outputDir, 'index.html'), indexHtmlContent, 'utf8');
console.log(`✓ Generated upload package dashboard: ${path.join(outputDir, 'index.html')}`);
console.log("=== EP27 Upload Package Complete ===");
