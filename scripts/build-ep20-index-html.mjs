import fs from 'fs';

const outDir = 'output/upload-packages/ep20-world-rl-longform';
const meta = JSON.parse(fs.readFileSync(`${outDir}/multilingual-metadata.json`, 'utf8'));
const title = fs.readFileSync(`${outDir}/title.txt`, 'utf8').trim();
const description = fs.readFileSync(`${outDir}/description.txt`, 'utf8').trim();
const pinned = fs.readFileSync(`${outDir}/pinned-comment.txt`, 'utf8').trim();
const tags = fs.readFileSync(`${outDir}/tags.txt`, 'utf8').trim();

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const LANGS = [
  { code: 'en', flag: '🇺🇸', name: 'English', dlNote: '전 세계 공용 & 유튜브 SEO 인덱싱용', dlLabel: 'download' },
  { code: 'ja', flag: '🇯🇵', name: '日本語', dlNote: '일본 영어 학습 시청자 타겟', dlLabel: 'ダウンロード' },
  { code: 'zh-tw', flag: '🇹🇼', name: '繁體中文', dlNote: '대만/홍콩 시청자 타겟', dlLabel: '下載' },
  { code: 'zh-cn', flag: '🇨🇳', name: '简体中文', dlNote: '싱가포尔/화교권 시청자 타겟', dlLabel: '下载' },
  { code: 'es', flag: '🇪🇸', name: 'Español', dlNote: '스페인어권 & 미국 히스패닉 타겟', dlLabel: 'descargar' },
  { code: 'vi', flag: '🇻🇳', name: 'Tiếng Việt', dlNote: '베트남 영어 학습 시청자 타겟', dlLabel: 'tải xuống' },
];

const langTabs = LANGS.map((l, i) => `        <button class="lang-tab${i === 0 ? ' active' : ''}" onclick="switchLang('${l.code}', this)">${l.flag} ${l.name}</button>`).join('\n') +
  `\n        <button class="lang-tab" onclick="switchLang('ko', this)">🇰🇷 한국어</button>`;

function panel(l, active) {
  const m = meta[l.code];
  return `      <!-- ${l.code.toUpperCase()} Panel -->
      <div id="panel-${l.code}" class="lang-panel${active ? ' active' : ''}">
        <div style="display: flex; justify-content: space-between; align-items: center; background: rgba(15,20,30,0.6); padding: 12px 16px; border-radius: 8px; border: 1px solid var(--card-border);">
          <div>
            <strong style="color: #FFF; font-size: 15px;">${l.flag} ${l.name} Subtitle File (.srt)</strong>
            <span style="color: var(--text-muted); font-size: 12.5px; display: block;">55개 전체 문장 정밀 싱크 완료 · ${l.dlNote}</span>
          </div>
          <a href="subtitles/subtitles-${l.code}.srt" download="subtitles-${l.code}.srt" class="srt-download-btn">⬇️ subtitles-${l.code}.srt ${l.dlLabel}</a>
        </div>
        <div>
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
            <span style="font-weight: 700; color: #FFF; font-size: 14px;">🏷️ ${l.name} 번역 제목</span>
            <button class="btn-copy" onclick="copyText('title-${l.code}', this)">제목 복사</button>
          </div>
          <div id="title-${l.code}" class="content-box single-line">${esc(m.title)}</div>
        </div>
        <div>
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
            <span style="font-weight: 700; color: #FFF; font-size: 14px;">📝 ${l.name} 번역 설명 (타임스탬프 챕터 포함)</span>
            <button class="btn-copy" onclick="copyText('desc-${l.code}', this)">설명 복사</button>
          </div>
          <div id="desc-${l.code}" class="content-box">${esc(m.desc)}</div>
        </div>
      </div>`;
}

const panelsHtml = LANGS.map((l, i) => panel(l, i === 0)).join('\n\n');

const html = `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>EP20 유튜브 업로드 원클릭 패키지 | 이해하면 쉬운영어</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;800;900&family=Noto+Sans+KR:wght@400;500;700;900&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg: #0C0F17;
      --card-bg: rgba(22, 27, 41, 0.85);
      --card-border: rgba(255, 255, 255, 0.08);
      --accent: #FFE500;
      --accent-glow: rgba(255, 229, 0, 0.35);
      --primary: #2E86AB;
      --success: #00E5A3;
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
        radial-gradient(circle at 15% 10%, rgba(255, 229, 0, 0.06) 0%, transparent 40%),
        radial-gradient(circle at 85% 85%, rgba(46, 134, 171, 0.08) 0%, transparent 40%);
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
      background: rgba(255, 229, 0, 0.15);
      color: var(--accent);
      border: 1px solid rgba(255, 229, 0, 0.3);
      margin-bottom: 10px;
      letter-spacing: 0.5px;
    }
    .title {
      font-size: 32px;
      font-weight: 900;
      letter-spacing: -0.5px;
    }
    .title span { color: var(--accent); }
    .status-pill {
      background: rgba(0, 229, 163, 0.12);
      color: #00E5A3;
      border: 1px solid rgba(0, 229, 163, 0.25);
      padding: 8px 18px;
      border-radius: 100px;
      font-weight: 800;
      font-size: 14px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .status-pill::before {
      content: "";
      width: 8px;
      height: 8px;
      background: #00E5A3;
      border-radius: 50%;
      box-shadow: 0 0 10px #00E5A3;
    }
    .grid {
      display: grid;
      grid-template-columns: 1.15fr 0.85fr;
      gap: 28px;
    }
    @media (max-width: 1024px) {
      .grid { grid-template-columns: 1fr; }
    }
    .card {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: var(--radius);
      padding: 24px;
      backdrop-filter: blur(12px);
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.35);
      display: flex;
      flex-direction: column;
      gap: 16px;
      position: relative;
    }
    .card-title {
      font-size: 18px;
      font-weight: 800;
      display: flex;
      align-items: center;
      justify-content: space-between;
      color: #FFFFFF;
    }
    .btn-copy {
      background: #1F2937;
      color: #E5E7EB;
      border: 1px solid rgba(255, 255, 255, 0.15);
      padding: 6px 14px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 700;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      transition: all 0.15s ease;
    }
    .btn-copy:hover {
      background: var(--accent);
      color: #000000;
      border-color: var(--accent);
      box-shadow: 0 0 12px var(--accent-glow);
    }
    .btn-copy.copied {
      background: var(--success);
      color: #000000;
      font-weight: 900;
      border-color: var(--success);
    }
    .content-box {
      background: rgba(10, 13, 20, 0.7);
      border: 1px solid rgba(255, 255, 255, 0.05);
      border-radius: 10px;
      padding: 14px 16px;
      font-size: 14.5px;
      color: #D1D5DB;
      white-space: pre-wrap;
      word-break: break-all;
      max-height: 280px;
      overflow-y: auto;
      line-height: 1.6;
    }
    .content-box.single-line {
      font-size: 16px;
      font-weight: 700;
      color: #FFFFFF;
      white-space: normal;
    }
    .video-wrapper {
      position: relative;
      border-radius: 12px;
      overflow: hidden;
      border: 1px solid var(--card-border);
      background: #000;
    }
    video {
      width: 100%;
      aspect-ratio: 16/9;
      display: block;
    }
    .video-info-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 10px 14px;
      background: rgba(15, 20, 30, 0.9);
      font-size: 13px;
      color: var(--text-muted);
      border-top: 1px solid var(--card-border);
      flex-wrap: wrap;
      gap: 8px;
    }
    .video-info-bar strong { color: var(--accent); font-weight: 800; }
    .thumb-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 14px;
    }
    .thumb-item {
      background: rgba(15, 20, 30, 0.6);
      border: 1px solid var(--card-border);
      border-radius: 12px;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      transition: transform 0.2s, border-color 0.2s;
    }
    .thumb-item:hover {
      transform: translateY(-3px);
      border-color: var(--accent);
    }
    .thumb-item.selected {
      border: 2px solid var(--accent);
      box-shadow: 0 0 16px var(--accent-glow);
    }
    .thumb-item img {
      width: 100%;
      aspect-ratio: 16/9;
      object-fit: cover;
      display: block;
    }
    .thumb-info {
      padding: 10px 12px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: rgba(20, 25, 38, 0.9);
      font-size: 13px;
    }
    .thumb-tag {
      font-weight: 800;
      color: var(--accent);
      font-size: 11.5px;
      letter-spacing: 0.5px;
    }
    .thumb-dl {
      color: var(--text-muted);
      text-decoration: none;
      font-size: 12px;
      padding: 3px 8px;
      border-radius: 6px;
      background: rgba(255, 255, 255, 0.08);
      transition: background 0.15s;
    }
    .thumb-dl:hover {
      background: var(--accent);
      color: #000;
    }
    .lang-tabs {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
      margin-bottom: 12px;
      border-bottom: 1px solid var(--card-border);
      padding-bottom: 12px;
    }
    .lang-tab {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid var(--card-border);
      color: var(--text-muted);
      padding: 8px 16px;
      border-radius: 8px;
      font-size: 13.5px;
      font-weight: 700;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 6px;
      transition: all 0.15s;
    }
    .lang-tab:hover {
      background: rgba(255, 255, 255, 0.1);
      color: #FFF;
    }
    .lang-tab.active {
      background: var(--primary);
      color: #FFF;
      border-color: var(--primary);
      box-shadow: 0 0 12px rgba(46, 134, 171, 0.4);
    }
    .lang-panel { display: none; flex-direction: column; gap: 14px; }
    .lang-panel.active { display: flex; }
    .srt-download-btn {
      background: var(--primary);
      color: #FFF;
      padding: 7px 14px;
      border-radius: 8px;
      text-decoration: none;
      font-size: 13px;
      font-weight: 800;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      transition: all 0.15s;
    }
    .srt-download-btn:hover {
      background: #3B82F6;
      box-shadow: 0 0 10px rgba(59, 130, 246, 0.4);
    }
    .tip-box {
      background: rgba(255, 229, 0, 0.08);
      border: 1px solid rgba(255, 229, 0, 0.2);
      border-radius: 10px;
      padding: 12px 16px;
      font-size: 13.5px;
      color: #FFF3A8;
      line-height: 1.6;
    }
    .checklist {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .check-item {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 14px;
      background: rgba(10, 13, 20, 0.6);
      border-radius: 8px;
      border: 1px solid var(--card-border);
      cursor: pointer;
      user-select: none;
      font-size: 14px;
    }
    .check-item:hover {
      background: rgba(255, 255, 255, 0.04);
    }
    .check-item input[type="checkbox"] {
      width: 17px;
      height: 17px;
      accent-color: var(--accent);
      cursor: pointer;
    }
  </style>
</head>
<body>
  <main class="container">
    <header class="header">
      <div>
        <div class="badge">🔥 READY TO UPLOAD PACKAGE</div>
        <h1 class="title">EP20 <span>World & Girl 발음의 비밀</span> 원클릭 업로드 패키지</h1>
      </div>
      <div class="status-pill">렌더링 &amp; 7개국 자막 완비</div>
    </header>

    <div class="grid">
      <!-- Left Column: Video & Thumbnails -->
      <div style="display: flex; flex-direction: column; gap: 28px;">
        <section class="card">
          <div class="card-title">
            <span>🎬 최종 렌더 영상 (1080p 30fps)</span>
            <span class="badge" style="margin: 0; background: rgba(0, 229, 163, 0.15); color: #00E5A3; border-color: rgba(0, 229, 163, 0.3);">FULL RESOLUTION</span>
          </div>
          <div class="video-wrapper">
            <video controls preload="metadata" poster="thumbnail.jpg">
              <source src="video.mp4" type="video/mp4">
              브라우저가 비디오 태그를 지원하지 않습니다.
            </video>
            <div class="video-info-bar">
              <div>길이: <strong>8분 30.4초</strong> (510.44s)</div>
              <div>해상도: <strong>1920x1080</strong> (16:9)</div>
              <div>엔드스크린 킵아웃: <strong>8:25 ~ 8:30</strong> (완전 비움)</div>
            </div>
          </div>
        </section>

        <!-- Thumbnail Selection -->
        <section class="card">
          <div class="card-title">
            <span>🖼️ 썸네일 A/B/C 시안 (3종 라인업)</span>
            <span style="font-size: 13px; color: var(--text-muted);">A안(메인) 최고 CTR 선정</span>
          </div>
          <div class="thumb-grid">
            <div class="thumb-item selected">
              <img src="thumbnail-a.jpg" alt="시안 A (메인 채택)">
              <div class="thumb-info">
                <span class="thumb-tag">A안 (대표 채택)</span>
                <a href="thumbnail-a.jpg" download="thumbnail-a.jpg" class="thumb-dl">다운로드</a>
              </div>
            </div>
            <div class="thumb-item">
              <img src="thumbnail-b.jpg" alt="시안 B (보류)">
              <div class="thumb-info">
                <span class="thumb-tag">B안 (경고형)</span>
                <a href="thumbnail-b.jpg" download="thumbnail-b.jpg" class="thumb-dl">다운로드</a>
              </div>
            </div>
            <div class="thumb-item">
              <img src="thumbnail-c.jpg" alt="시안 C (보류)">
              <div class="thumb-info">
                <span class="thumb-tag">C안 (자책 개그형)</span>
                <a href="thumbnail-c.jpg" download="thumbnail-c.jpg" class="thumb-dl">다운로드</a>
              </div>
            </div>
          </div>
        </section>
      </div>

      <!-- Right Column: Metadata & Copy Elements -->
      <div style="display: flex; flex-direction: column; gap: 28px;">
        <!-- Title -->
        <section class="card">
          <div class="card-title">
            <span>🏷️ 유튜브 영상 제목</span>
            <button class="btn-copy" onclick="copyText('titleText', this)">제목 복사</button>
          </div>
          <div id="titleText" class="content-box single-line">${esc(title)}</div>
        </section>

        <!-- Pinned Comment -->
        <section class="card">
          <div class="card-title">
            <span>📌 고정 댓글 (시청자 반응 유도)</span>
            <button class="btn-copy" onclick="copyText('pinnedText', this)">댓글 복사</button>
          </div>
          <div id="pinnedText" class="content-box">${esc(pinned)}</div>
        </section>

        <!-- Tags -->
        <section class="card">
          <div class="card-title">
            <span>🏷️ 검색 최적화 태그</span>
            <button class="btn-copy" onclick="copyText('tagsText', this)">태그 전체 복사</button>
          </div>
          <div id="tagsText" class="content-box single-line" style="font-size: 13px; color: var(--text-muted);">${esc(tags)}</div>
        </section>

        <!-- Korean Description -->
        <section class="card">
          <div class="card-title">
            <span>📝 영상 설명란 전문 (타임라인 포함)</span>
            <button class="btn-copy" onclick="copyText('descText', this)">설명 복사</button>
          </div>
          <div id="descText" class="content-box">${esc(description)}</div>
        </section>
      </div>
    </div>

    <!-- Multilingual Subtitles & Metadata Section -->
    <section class="card" style="border: 2px solid rgba(46, 134, 171, 0.4); box-shadow: 0 0 25px rgba(46, 134, 171, 0.15);">
      <div class="card-title">
        <span style="display: flex; align-items: center; gap: 8px;">
          <span style="font-size: 22px;">🌍</span>
          <span>글로벌 7개국 다국어 자막 & 메타데이터 원클릭 패키지</span>
        </span>
        <span class="badge" style="background: rgba(46,134,171,0.2); color: #60A5FA; border-color: rgba(46,134,171,0.4); margin: 0;">GLOBAL EXPANSION</span>
      </div>
      <p style="font-size: 13.5px; color: var(--text-muted);">
        유튜브 알고리즘이 전 세계 시청자에게 추천할 수 있도록 한국어 음성에 맞춘 <strong>영어, 일본어, 중국어 번체, 중국어 간체, 스페인어, 베트남어</strong> 자막(.srt) 및 번역 제목/설명을 준비했습니다.
      </p>

      <div class="lang-tabs">
${langTabs}
      </div>

${panelsHtml}

      <!-- KO Panel -->
      <div id="panel-ko" class="lang-panel">
        <div style="display: flex; justify-content: space-between; align-items: center; background: rgba(15,20,30,0.6); padding: 12px 16px; border-radius: 8px; border: 1px solid var(--card-border);">
          <div>
            <strong style="color: #FFF; font-size: 15px;">🇰🇷 한국어 자막 파일 (.srt)</strong>
            <span style="color: var(--text-muted); font-size: 12.5px; display: block;">원본 자막 · 실측 whisper 타임스탬프 기준</span>
          </div>
          <a href="subtitles/subtitles-ko.srt" download="subtitles-ko.srt" class="srt-download-btn">⬇️ subtitles-ko.srt 다운로드</a>
        </div>
        <div>
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
            <span style="font-weight: 700; color: #FFF; font-size: 14px;">🏷️ 한국어 원본 제목</span>
            <button class="btn-copy" onclick="copyText('titleText', this)">제목 복사</button>
          </div>
          <div class="content-box single-line">${esc(title)}</div>
        </div>
        <div>
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
            <span style="font-weight: 700; color: #FFF; font-size: 14px;">📝 한국어 원본 설명</span>
            <button class="btn-copy" onclick="copyText('descText', this)">설명 복사</button>
          </div>
          <div class="content-box">${esc(description)}</div>
        </div>
      </div>

      <!-- Quick How-To -->
      <div class="tip-box" style="margin-top: 14px;">
        💡 <strong>YouTube Studio 3분 등록법:</strong><br>
        1. 유튜브 스튜디오 영상 수정 ➔ 왼쪽 <strong>[자막]</strong> 메뉴 클릭<br>
        2. <strong>[언어 추가]</strong> 클릭 후 원하는 언어(영어, 일본어, 중국어 번체, 스페인어 등) 추가<br>
        3. 각 언어의 <strong>[제목 및 설명]</strong>에 위 번역문을 복사 붙여넣고, <strong>[자막]</strong>에 위 다운로드한 <code>.srt</code> 파일을 업로드하면 즉시 완료됩니다!
      </div>
    </section>

    <div class="grid" style="grid-template-columns: 1fr 1fr; gap: 28px; margin-top: 28px;">
      <section class="card">
        <div class="card-title">
          <span>⚙️ 유튜브 Studio 필수 설정 항목</span>
        </div>
        <div style="display: flex; flex-direction: column; gap: 14px;">
          <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px 14px; background: rgba(15,20,30,0.6); border-radius: 8px; border: 1px solid var(--card-border);">
            <div>
              <span style="font-size: 12px; color: var(--accent); font-weight: 800; display: block;">권장 예약 일시</span>
              <strong style="font-size: 16px;">2026-09-28(월) 20:00 KST</strong>
            </div>
            <button class="btn-copy" onclick="copyText('scheduleText', this)">복사</button>
            <span id="scheduleText" style="display:none">2026-09-28 20:00 KST</span>
          </div>
          <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px 14px; background: rgba(15,20,30,0.6); border-radius: 8px; border: 1px solid var(--card-border);">
            <div>
              <span style="font-size: 12px; color: var(--accent); font-weight: 800; display: block;">최종 화면 (엔드스크린) 연결</span>
              <strong style="font-size: 15px;">직전 편 EP19 (-ATE 발음 차이) 연결</strong>
            </div>
            <span style="font-size: 12px; color: var(--text-muted);">끝 5초(8:25~8:30) 비워둠</span>
          </div>
        </div>
      </section>

      <section class="card">
        <div class="card-title">
          <span>📋 업로드 실행 체크리스트</span>
        </div>
        <div class="checklist">
          <label class="check-item">
            <input type="checkbox">
            <span>1. video.mp4 업로드 (1920x1080, 30fps, 8분 30.4초)</span>
          </label>
          <label class="check-item">
            <input type="checkbox">
            <span>2. 제목(A) 및 설명 복사 입력 — 제목 B/C는 Test &amp; Compare용</span>
          </label>
          <label class="check-item">
            <input type="checkbox">
            <span>3. 썸네일 Test &amp; Compare 3종 등록 (a=대표, b, c)</span>
          </label>
          <label class="check-item">
            <input type="checkbox">
            <span>4. 태그 전체 붙여넣기</span>
          </label>
          <label class="check-item">
            <input type="checkbox">
            <span>5. 다국어 자막 7종 + 번역 제목/설명 등록</span>
          </label>
          <label class="check-item">
            <input type="checkbox">
            <span>6. 최종 화면 요소 추가 — 직전 편 EP19 연결</span>
          </label>
          <label class="check-item">
            <input type="checkbox">
            <span>7. 공개 상태: [예약] 2026-09-28(월) 20:00 KST 설정</span>
          </label>
          <label class="check-item">
            <input type="checkbox">
            <span>8. 첫 댓글 작성 및 [댓글 고정]</span>
          </label>
        </div>
      </section>
    </div>
  </main>

  <script>
    function copyText(elementId, btn) {
      const el = document.getElementById(elementId);
      if (!el) return;
      const text = el.innerText || el.textContent;
      navigator.clipboard.writeText(text).then(() => {
        const orig = btn.innerHTML;
        btn.innerHTML = '✓ 복사완료!';
        btn.classList.add('copied');
        setTimeout(() => {
          btn.innerHTML = orig;
          btn.classList.remove('copied');
        }, 1800);
      });
    }

    function switchLang(lang, btn) {
      document.querySelectorAll('.lang-tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.lang-panel').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      const p = document.getElementById('panel-' + lang);
      if (p) p.classList.add('active');
    }
  </script>
</body>
</html>
`;

fs.writeFileSync(`${outDir}/index.html`, html, 'utf8');
console.log(`Wrote ${outDir}/index.html (${html.length} bytes)`);
