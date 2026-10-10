import fs from 'fs';
import path from 'path';

const projectDir = path.resolve('videos/ep28-f-vs-p');
const outputDir = path.resolve('output/upload-packages/ep28-f-vs-p');
fs.mkdirSync(outputDir, { recursive: true });

// 1. Parse timeline from index.html
const indexHtml = fs.readFileSync(path.join(projectDir, 'index.html'), 'utf8');
const sceneMatches = [...indexHtml.matchAll(/data-composition-id="([^"]+)" data-composition-src="([^"]+)" data-start="([^"]+)" data-duration="([^"]+)"/g)];

const frameTitles = {
  '01-hook': "0.1초 소리 물리법칙 (Coffee vs Copy)",
  '02-principle': "조음 물리법칙 원리 (윗니 0% 파열 vs 윗니 100% 마찰)",
  '03-drill1': "드릴 1: 단모음 기본 6쌍 (fan vs pan, fat vs pat...)",
  '04-drill2': "드릴 2: 장모음 & 이중모음 6쌍 (fool vs pool, face vs pace...)",
  '05-drill3': "드릴 3: 실생활 2음절 필수 6쌍 (cof · fee vs co · py...)",
  '06-drill4': "드릴 4: 받침 끝소리 6쌍 (leaf vs leap, calf vs cap...)",
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

// 엔드스크린 타임라인 라인 추가 (405.61초 -> 06:45)
timelineLines.push("06:45 [엔드스크린] 다음 추천 영상 및 채널 구독");

const timelineText = timelineLines.join('\n') + '\n';
fs.writeFileSync(path.join(outputDir, 'timeline.txt'), timelineText, 'utf8');

// 2. Titles
const mainTitle = "원어민이 F와 P를 0.1초 만에 구별하는 법 | F vs P 24쌍 반복 듣기 드릴";
fs.writeFileSync(path.join(outputDir, 'title.txt'), mainTitle + '\n', 'utf8');

const titleVariants = `Variant 1 (메인 채택 · 물리법칙형):
원어민이 F와 P를 0.1초 만에 구별하는 법 | F vs P 24쌍 반복 듣기 드릴

Variant 2 (대조군 · 실수경고형):
Coffee와 Copy, 입술 닿는 순간 갈립니다 | F vs P 24쌍 반복 듣기 드릴

Variant 3 (대조군 · 상식파괴형):
F 발음할 때 아랫입술 물면 틀립니다! 원어민의 0.1초 비밀 | F vs P 청취 드릴

Variant 4 (간결 집중형):
[30분 듣기] F와 P가 죽어도 안 들렸던 진짜 이유 | 윗니 0% vs 100% 물리법칙
`;
fs.writeFileSync(path.join(outputDir, 'title-variants.txt'), titleVariants, 'utf8');

// 3. Description
const description = `학창 시절 영어 시간에 "F는 입술 물고, P는 프"라고만 배우셨나요?
원어민에게 "Coffee"를 시켰는데 "Copy"로 알아듣거나, 미드에서 F와 P가 0.1초 만에 스쳐 지나갈 때 왜 구별이 안 될까요?

비밀은 '입술을 무는 것'이 아니라, "윗니가 닿는 면적과 공기 흐름의 물리법칙"에 있습니다!
윗니 0% (두 입술 파열) vs 윗니 100% (아랫입술 안쪽 살짝 마찰)의 차이를 원리로 이해하면, 0.1초 만에 두 소리가 선명하게 갈라집니다.

이 영상 하나로 24개 필수 짝단어를 원어민 남녀 음성으로 6회 반복 체화해 보세요! 🎧

[타임라인 챕터]
${timelineText}
━━━━━━━━━━━━━━━━━━━
💡 F vs P 조음 물리법칙 핵심 요약:
① [p] 양순 파열음 (윗니 닿는 면적 0%):
   - 두 입술을 가볍게 닫았다가 공기를 팡 터뜨리는 순간적인 소리
   - (pan, pat, pool, pace, copy, leap 등)

② [f] 순치 마찰음 (윗니 닿는 면적 100%):
   - 윗니 앞니로 아랫입술 '안쪽'을 가볍게 대고, 바람을 부드럽게 밀어내는 지속적인 소리
   - (주의: 아랫입술을 꽉 물면 원어민처럼 빠르고 자연스럽게 소리 낼 수 없습니다!)
   - (fan, fat, fool, face, coffee, leaf 등)

━━━━━━━━━━━━━━━━━━━
📌 학습 팁:
단어만 보지 마시고, 04:21부터 시작되는 실전 회화 7문장과 24단어 무작위 셔플 퀴즈를 통해 귀가 먼저 0.1초 만에 반응할 때까지 반복 청취해 보세요!
05:31에 나오는 '1장 요약 치트시트'는 스마트폰으로 캡처해 두시면 언제든 복습하기 좋습니다.

━━━━━━━━━━━━━━━━━━━
📺 다음 추천 영상:
• EP27: 단어 끝 -S · -ES 3가지 물리법칙 [s] vs [z] vs [ɪz] (https://youtu.be/...)

#영어발음 #F발음 #P발음 #FvsP #영어듣기 #영어리스닝 #영어회화 #기초영어 #파닉스 #이해하면쉬운영어
`;
fs.writeFileSync(path.join(outputDir, 'description.txt'), description, 'utf8');

// 4. Pinned comment
const pinnedComment = `오늘도 F vs P 24쌍 반복 듣기 드릴 훈련을 끝까지 완주하신 여러분, 정말 고생하셨습니다! 👏

💬 여러분은 24개 짝단어 중 어떤 단어가 귀로 가장 구분하기 어려우셨나요?
(예: Coffee vs Copy? Leaf vs Leap? Fool vs Pool?)
댓글로 남겨주시면 발음 교정 팁을 함께 나눠드리겠습니다!

📱 05:31 요약 치트시트는 스마트폰에 캡처해 두고 틈날 때마다 꺼내보세요!
구독과 좋아요는 다음 유익한 발음 영상 제작에 큰 힘이 됩니다. ❤️
`;
fs.writeFileSync(path.join(outputDir, 'pinned-comment.txt'), pinnedComment, 'utf8');

// 5. Tags
const tags = "영어발음, F발음, P발음, F vs P, 영어리스닝, 영어듣기, 영어회화, 기초영어, 파닉스, 발음규칙, 짝단어, 최소대립쌍, 영어공부, 원어민발음, 이해하면쉬운영어, English pronunciation, F vs P, minimal pairs, listening drill, english listening";
fs.writeFileSync(path.join(outputDir, 'tags.txt'), tags + '\n', 'utf8');

// 6. Status JSON
const statusJson = {
  status: "ready_for_render_on_other_pc",
  episodeId: "ep28-f-vs-p",
  title: mainTitle,
  recommendedPublishAt: "2026-10-12T14:00:00Z",
  videoFile: "English_Pronunciation_F_vs_P_Minimal_Pairs_Listening_Drill.mp4",
  durationSeconds: 415.61,
  durationFormatted: "6분 55초",
  endScreenDuration: "10초 (405.61s ~ 415.61s)",
  renderCommand: "npx hyperframes render videos/ep28-f-vs-p --output=output/upload-packages/ep28-f-vs-p/English_Pronunciation_F_vs_P_Minimal_Pairs_Listening_Drill.mp4",
  generatedAt: new Date().toISOString()
};
fs.writeFileSync(path.join(outputDir, 'status.json'), JSON.stringify(statusJson, null, 2), 'utf8');

// 7. Checklist
const checklist = `[EP28 유튜브 업로드 체크리스트]
- 에피소드: ep28-f-vs-p (F vs P 0.1초 조음 물리법칙 24쌍 듣기 드릴)
- 영상 길이: 6분 55.6초 (415.61s) / 엔드스크린 10초 탑재
- 최종 영상 파일명: English_Pronunciation_F_vs_P_Minimal_Pairs_Listening_Drill.mp4
- 타 PC 렌더링 명령어:
  npx hyperframes render videos/ep28-f-vs-p --output=output/upload-packages/ep28-f-vs-p/English_Pronunciation_F_vs_P_Minimal_Pairs_Listening_Drill.mp4
- 썸네일 시안:
  [메인 권장 1위] thumbnail-close-up.jpg (모바일 전용 클로즈업: 윗니 0% vs 100%)
  [메인 와이드] thumbnail.jpg (바스트샷 와이드 16:9)
  [A안 상식파괴] thumbnail-variant-a.jpg ("입술 물면 틀립니다")
  [B안 직격형] thumbnail-variant-b.jpg ("Coffee와 Copy, 입술 닿는 순간 탈락")
- 카테고리: 교육 (Education)
- 재생목록: [이해하면 쉬운영어] 집중 듣기 드릴 정주행
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
    const mp4Files = fs.readdirSync(rDir).filter(f => f.startsWith('ep28') && f.endsWith('.mp4')).sort((a, b) => {
      return fs.statSync(path.join(rDir, b)).mtimeMs - fs.statSync(path.join(rDir, a)).mtimeMs;
    });
    if (mp4Files.length > 0) {
      foundMp4 = path.join(rDir, mp4Files[0]);
      break;
    }
  }
}

const targetMp4Name = "English_Pronunciation_F_vs_P_Minimal_Pairs_Listening_Drill.mp4";
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
  <title>EP28 유튜브 업로드 원클릭 패키지 | 이해하면 쉬운영어</title>
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
    .col-6 { grid-column: span 6; }
    .col-12 { grid-column: span 12; }
    @media (max-width: 1024px) {
      .col-8, .col-4, .col-6 { grid-column: span 12; }
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
      text-decoration: none;
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
    .thumb-meta {
      padding: 16px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .thumb-label {
      font-size: 14px;
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
    .prompt-box {
      background: rgba(0, 0, 0, 0.5);
      border-top: 1px solid var(--card-border);
      padding: 12px 16px;
      font-size: 12px;
      color: var(--text-muted);
      max-height: 120px;
      overflow-y: auto;
    }
    .render-alert {
      background: rgba(59, 130, 246, 0.1);
      border: 1px solid rgba(59, 130, 246, 0.3);
      border-radius: 12px;
      padding: 16px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
    }
    .code-cmd {
      background: rgba(0, 0, 0, 0.6);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 8px;
      padding: 8px 12px;
      font-family: monospace;
      font-size: 13px;
      color: #60A5FA;
      flex-grow: 1;
      overflow-x: auto;
      white-space: nowrap;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div>
        <div class="badge">🚀 UPLOAD PACKAGE READY</div>
        <h1>EP28 유튜브 업로드 원클릭 패키지</h1>
        <div class="subtitle">F vs P 0.1초 조음 물리법칙 (윗니 0% vs 100%) 24쌍 반복 듣기 드릴 | 타 PC 렌더링 지원</div>
      </div>
      <div>
        <span class="rec-tag" style="padding: 8px 16px; font-size: 14px;">타임라인 총 6분 55초 (415.61s)</span>
      </div>
    </div>

    <!-- Other PC Render Guide Alert -->
    <div class="render-alert">
      <div>
        <div style="font-weight: 800; font-size: 15px; margin-bottom: 4px;">💻 다른 PC에서 렌더링 실행 명령어:</div>
        <div style="font-size: 13px; color: var(--text-muted);">작업 PC에서 아래 명령어를 실행하면 이 패키지 폴더로 MP4가 바로 출력됩니다.</div>
      </div>
      <div class="code-cmd" id="renderCmdBox">npx hyperframes render videos/ep28-f-vs-p --output=output/upload-packages/ep28-f-vs-p/${targetMp4Name}</div>
      <button class="copy-btn" onclick="copyText('renderCmdBox', this)">명령어 복사</button>
    </div>

    <div class="grid">
      <!-- Title Section -->
      <div class="card col-8">
        <div class="card-title">
          <span>📌 유튜브 영상 제목 (메인 채택)</span>
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

      <!-- Title Variants -->
      <div class="card col-4">
        <div class="card-title">
          <span>🔀 A/B 테스트 제목 후보군</span>
          <button class="copy-btn" onclick="copyText('variantsBox', this)">복사하기</button>
        </div>
        <div class="text-box" id="variantsBox" style="max-height: 400px; font-size: 13px;">${titleVariants}</div>
      </div>

      <!-- Thumbnails Section -->
      <div class="card col-12">
        <div class="card-title">
          <span>🖼️ 썸네일 기획안 4종 (프롬프트 복사 가능)</span>
          <a href="file:///${path.join(projectDir, 'prompts/thumbnail-prompts.md').replace(/\\/g, '/')}" target="_blank" class="copy-btn">전체 프롬프트 열기</a>
        </div>
        <div class="thumbs-grid">
          <div class="thumb-card">
            <div class="thumb-meta">
              <div>
                <div class="thumb-label">[권장 1위] 모바일 전용 클로즈업 (C안)</div>
                <div style="font-size: 12px; color: var(--text-muted);">"윗니 0% vs 100%" · 모바일 피드 극대화</div>
              </div>
              <span class="rec-tag">추천 1위</span>
            </div>
            <div class="prompt-box">
              <strong>Prompt:</strong> A high-CTR YouTube thumbnail for Korean English channel... Topic: F vs P 0.1초 조음 물리법칙. Mobile extreme close-up. Pill: "윗니 0% vs 100%"
            </div>
          </div>
          <div class="thumb-card">
            <div class="thumb-meta">
              <div>
                <div class="thumb-label">[메인] Variant C (바스트샷 와이드)</div>
                <div style="font-size: 12px; color: var(--text-muted);">"F vs P" + "윗니 0% vs 100%" 제스처</div>
              </div>
              <span class="rec-tag">메인</span>
            </div>
            <div class="prompt-box">
              <strong>Prompt:</strong> A high-CTR YouTube thumbnail... Topic: F vs P 짝단어 드릴. Waist-up distance pointing to upper teeth/lip.
            </div>
          </div>
          <div class="thumb-card">
            <div class="thumb-meta">
              <div>
                <div class="thumb-label">[A안] 대조군 · 상식 파괴형</div>
                <div style="font-size: 12px; color: var(--text-muted);">"입술 물면 틀립니다" 스탑 제스처</div>
              </div>
            </div>
            <div class="prompt-box">
              <strong>Prompt:</strong> Topic: "F 발음할 때 입술 물면 틀립니다". Stop gesture with friendly warning smile.
            </div>
          </div>
          <div class="thumb-card">
            <div class="thumb-meta">
              <div>
                <div class="thumb-label">[B안] 대조군 · 단어 대조 직격형</div>
                <div style="font-size: 12px; color: var(--text-muted);">"Coffee와 Copy" 두 입술 닿으면 탈락</div>
              </div>
            </div>
            <div class="prompt-box">
              <strong>Prompt:</strong> Topic: "Coffee와 Copy 입술 닿는 순간 갈립니다". Two lips touching distinction.
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
          <span>🏷️ 검색 태그 (쉼표 구분)</span>
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
console.log("=== EP28 Upload Package Complete ===");
