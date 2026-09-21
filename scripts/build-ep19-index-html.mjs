import fs from 'fs';

const outDir = 'output/upload-packages/ep19-ate-suffix-longform';
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
  { code: 'zh-cn', flag: '🇨🇳', name: '简体中文', dlNote: '싱가포르/화교권 시청자 타겟', dlLabel: '下载' },
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
            <span style="color: var(--text-muted); font-size: 12.5px; display: block;">71개 전체 문장 정밀 싱크 완료 · ${l.dlNote}</span>
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
  <title>EP19 유튜브 업로드 원클릭 패키지 | 이해하면 쉬운영어</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;800;900&family=Noto+Sans+KR:wght@400;500;700;900&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg: #0C0F17;
      --card-bg: rgba(22, 27, 41, 0.85);
      --card-border: rgba(255, 255, 255, 0.08);
      --accent: #F5C518;
      --accent-glow: rgba(245, 197, 24, 0.35);
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
        radial-gradient(circle at 15% 10%, rgba(245, 197, 24, 0.06) 0%, transparent 40%),
        radial-gradient(circle at 85% 85%, rgba(59, 130, 246, 0.06) 0%, transparent 40%);
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
      background: rgba(245, 197, 24, 0.15);
      color: var(--accent);
      border: 1px solid rgba(245, 197, 24, 0.3);
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
      background: rgba(16, 185, 129, 0.12);
      color: #34D399;
      border: 1px solid rgba(16, 185, 129, 0.25);
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
      background: #34D399;
      border-radius: 50%;
      box-shadow: 0 0 10px #34D399;
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
      color: #FFFFFF;
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
      grid-template-columns: repeat(2, 1fr);
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
      transform: translateY(-4px);
      border-color: rgba(245, 197, 24, 0.4);
    }
    .thumb-item.featured {
      border: 2px solid var(--accent);
      box-shadow: 0 0 16px var(--accent-glow);
    }
    .thumb-item img {
      width: 100%;
      aspect-ratio: 16/9;
      object-fit: cover;
      display: block;
    }
    .thumb-label {
      padding: 10px 12px;
      font-size: 12px;
      font-weight: 800;
      display: flex;
      flex-direction: column;
      gap: 3px;
    }
    .thumb-tag {
      font-size: 11px;
      color: var(--accent);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .checklist {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .check-item {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      padding: 12px 14px;
      background: rgba(15, 20, 30, 0.5);
      border: 1px solid rgba(255, 255, 255, 0.05);
      border-radius: 10px;
      font-size: 14px;
      cursor: pointer;
      transition: background 0.15s;
    }
    .check-item:hover {
      background: rgba(30, 40, 60, 0.5);
    }
    .check-item input[type="checkbox"] {
      width: 18px;
      height: 18px;
      margin-top: 2px;
      accent-color: var(--accent);
      cursor: pointer;
    }
    .check-item.done span {
      text-decoration: line-through;
      color: var(--text-muted);
    }
    .lang-tabs {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
      margin-bottom: 16px;
      border-bottom: 1px solid var(--card-border);
      padding-bottom: 12px;
    }
    .lang-tab {
      background: rgba(255,255,255,0.06);
      color: var(--text-muted);
      border: 1px solid var(--card-border);
      padding: 8px 16px;
      border-radius: 8px;
      font-size: 13.5px;
      font-weight: 700;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      transition: all 0.15s;
    }
    .lang-tab:hover {
      background: rgba(255,255,255,0.12);
      color: #FFF;
    }
    .lang-tab.active {
      background: var(--accent);
      color: #000;
      border-color: var(--accent);
      font-weight: 800;
      box-shadow: 0 0 12px var(--accent-glow);
    }
    .lang-panel {
      display: none;
      flex-direction: column;
      gap: 14px;
    }
    .lang-panel.active {
      display: flex;
    }
    .srt-download-btn {
      background: #1E3A8A;
      color: #93C5FD;
      border: 1px solid #3B82F6;
      padding: 8px 16px;
      border-radius: 8px;
      font-weight: 700;
      font-size: 13.5px;
      text-decoration: none;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      transition: all 0.15s;
    }
    .srt-download-btn:hover {
      background: #2563EB;
      color: #FFFFFF;
      box-shadow: 0 0 12px rgba(37,99,235,0.4);
    }
    .tip-box {
      background: rgba(245, 197, 24, 0.08);
      border-left: 4px solid var(--accent);
      padding: 12px 16px;
      border-radius: 0 8px 8px 0;
      font-size: 13px;
      color: #FDE68A;
      line-height: 1.5;
    }
  </style>
</head>
<body>
  <main class="container">
    <header class="header">
      <div>
        <div class="badge">🎬 YOUTUBE UPLOAD PACKAGE · EP19</div>
        <h1 class="title">-ate 동사/명사 발음 차이 <span>(estimate, graduate...)</span></h1>
      </div>
      <div class="status-pill">렌더링 완료 · 업로드 준비 완료</div>
    </header>

    <div class="grid">
      <!-- Left Column: Video & Thumbnails -->
      <div style="display: flex; flex-direction: column; gap: 28px;">
        <!-- Video Preview Card -->
        <section class="card">
          <div class="card-title">
            <span>🎥 렌더링 영상 미리보기 (video.mp4)</span>
            <a href="video.mp4" download="EP19-ate-suffix.mp4" class="btn-copy" style="text-decoration: none;">⬇️ 다운로드</a>
          </div>
          <div class="video-wrapper">
            <video src="video.mp4" controls preload="metadata"></video>
            <div class="video-info-bar">
              <span>해상도: <strong>1920x1080 (FHD 30fps)</strong></span>
              <span>총 재생시간: <strong>7분 35.0초 (455.04s)</strong></span>
              <span>오디오: <strong>나레이션 더킹 BGM 완비</strong></span>
            </div>
          </div>
        </section>

        <!-- Thumbnails Card -->
        <section class="card">
          <div class="card-title">
            <span>🖼️ 썸네일 시안 4종 (브랜드 모자 & 로고 완비)</span>
            <span style="font-size: 12px; color: var(--text-muted);">A/B 테스트 활용</span>
          </div>
          <div class="thumb-grid">
            <div class="thumb-item featured">
              <img src="thumbnail.jpg" alt="메인 썸네일 (시안 A)">
              <div class="thumb-label">
                <span class="thumb-tag">★ 채택 메인</span>
                <span>시안 A: 충격/멘붕형 (동사·명사 분기 화살표)</span>
              </div>
            </div>
            <div class="thumb-item">
              <img src="thumbnail-b.jpg" alt="시안 B">
              <div class="thumb-label">
                <span class="thumb-tag">A/B 후보 · 실사형</span>
                <span>시안 B: 사전 찢으세요! (ESTIMATE 카드 + 동사/명사 에너지 비교)</span>
              </div>
            </div>
            <div class="thumb-item">
              <img src="thumbnail-c.jpg" alt="시안 C">
              <div class="thumb-label">
                <span class="thumb-tag">A/B 후보 (CTR 등급 A, 8.8~10.9% 1위)</span>
                <span>시안 C: 안심/확신 해결형</span>
              </div>
            </div>
            <div class="thumb-item">
              <img src="thumbnail-close-up.jpg" alt="클로즈업 시안">
              <div class="thumb-label">
                <span class="thumb-tag">모바일 특화 (얼굴 50%)</span>
                <span>익스트림 클로즈업: 쉿! 시크릿 제스처</span>
              </div>
            </div>
          </div>
        </section>
      </div>

      <!-- Right Column: Metadata & Checklist -->
      <div style="display: flex; flex-direction: column; gap: 28px;">
        <!-- Title & Variants Card -->
        <section class="card">
          <div class="card-title">
            <span>🏷️ 확정 제목</span>
            <button class="btn-copy" onclick="copyText('titleText', this)">제목 복사</button>
          </div>
          <div id="titleText" class="content-box single-line">${esc(title)}</div>

          <div style="margin-top: 8px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
              <span style="font-size: 13px; font-weight: 700; color: var(--text-muted);">📊 제목 A/B 테스트 시안 (CTR 진단 기준)</span>
              <button class="btn-copy" onclick="copyText('titleVariants', this)">시안 복사</button>
            </div>
            <div id="titleVariants" class="content-box" style="max-height: 120px; font-size: 13px;">[A/B 테스트용 제목 시안 (대시보드 CTR 진단 완료)]
• (채택) C안 [CTR 등급: A | 8.8% ~ 10.9%]: ${esc(title)}
• B안 [CTR 등급: A- | 7.3% ~ 9.1%]: 훅 문구만 보존됨 — "매번 멈칫했는데 소리 나는 길이 따로 있네요"
• A안 [CTR 등급: B+ | 5.4% ~ 7.2%, ★ 실제 게시됨]: 분명 똑같이 적힌 -ate 끝소리를 원어민들은 왜 다르게 흘릴까 궁금했습니다 | 영어 발음 원리</div>
          </div>
        </section>

        <!-- Description Card -->
        <section class="card">
          <div class="card-title">
            <span>📝 영상 설명 (타임라인 포함)</span>
            <button class="btn-copy" onclick="copyText('descText', this)">설명 복사</button>
          </div>
          <div id="descText" class="content-box" style="max-height: 240px;">${esc(description)}</div>
        </section>

        <!-- Pinned Comment & Tags -->
        <section class="card">
          <div class="card-title">
            <span>📌 고정 댓글</span>
            <button class="btn-copy" onclick="copyText('pinnedText', this)">고정댓글 복사</button>
          </div>
          <div id="pinnedText" class="content-box" style="max-height: 110px;">${esc(pinned)}</div>

          <div style="margin-top: 10px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
              <span style="font-size: 14px; font-weight: 800; color: #FFF;">🏷️ 추천 태그</span>
              <button class="btn-copy" onclick="copyText('tagsText', this)">태그 복사</button>
            </div>
            <div id="tagsText" class="content-box" style="max-height: 80px; font-size: 13px;">${esc(tags)}</div>
          </div>
        </section>
      </div>
    </div>

    <!-- Multilingual Subtitles & Metadata Section -->
    <section class="card" style="border: 2px solid rgba(59, 130, 246, 0.4); box-shadow: 0 0 25px rgba(59, 130, 246, 0.15);">
      <div class="card-title">
        <span style="display: flex; align-items: center; gap: 8px;">
          <span style="font-size: 22px;">🌍</span>
          <span>글로벌 7개국 다국어 자막 & 메타데이터 원클릭 패키지</span>
        </span>
        <span class="badge" style="background: rgba(59,130,246,0.2); color: #60A5FA; border-color: rgba(59,130,246,0.4); margin: 0;">GLOBAL EXPANSION</span>
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
            <strong style="color: #FFF; font-size: 15px;">🇰🇷 한국어 字幕파일 (.srt)</strong>
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
              <strong style="font-size: 16px;">2026-09-26(토) 20:00 KST</strong>
            </div>
            <button class="btn-copy" onclick="copyText('scheduleText', this)">복사</button>
            <span id="scheduleText" style="display:none">2026-09-26 20:00 KST</span>
          </div>
          <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px 14px; background: rgba(15,20,30,0.6); border-radius: 8px; border: 1px solid var(--card-border);">
            <div>
              <span style="font-size: 12px; color: var(--accent); font-weight: 800; display: block;">최종 화면 (엔드스크린) 연결</span>
              <strong style="font-size: 15px;">직전 편 EP18 (묵음 자음 KN-/-MB/WR-) 연결</strong>
            </div>
            <span style="font-size: 12px; color: var(--text-muted);">끝 5초(7:30~7:35) 비워둠</span>
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
            <span>1. video.mp4 업로드 (1920x1080, 30fps, 7분 35.0초)</span>
          </label>
          <label class="check-item">
            <input type="checkbox">
            <span>2. 제목(C) 및 설명 복사 입력 — 제목 A/B는 Test & Compare용</span>
          </label>
          <label class="check-item">
            <input type="checkbox">
            <span>3. 썸네일 Test & Compare 4종 등록 (a=대표, b, c, close-up)</span>
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
            <span>6. 최종 화면 요소 추가 — 직전 편 EP18 연결</span>
          </label>
          <label class="check-item">
            <input type="checkbox">
            <span>7. 공개 상태: [예약] 2026-09-26(토) 20:00 KST 설정</span>
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
