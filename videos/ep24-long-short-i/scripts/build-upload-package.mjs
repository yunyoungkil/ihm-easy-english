import fs from 'fs';
import path from 'path';

// ⛔ 2026-11-06: 이 스크립트에는 고치기 전 문구(금지어, [30분 듣기] 등)가 들어 있다.
// 다시 실행하면 고친 패키지를 옛 글로 덮어쓰므로 막아 둔다. 글은 패키지 폴더의 txt 파일을 직접 고치고,
// 페이지는 `npm run upload-page -- <패키지 폴더>`로 다시 만든다.
throw new Error('옛 업로드 패키지 빌드 스크립트입니다. npm run upload-page를 쓰세요.');

const projectDir = path.resolve('videos/ep24-long-short-i');
const outPackageDir = path.resolve('output/upload-packages/ep24-long-short-i');

if (!fs.existsSync(outPackageDir)) {
  fs.mkdirSync(outPackageDir, { recursive: true });
}

console.log("Building EP24 upload package...");

// 1. Title variants
const titleVariants = `[A] (메인 채택 · 초효율성형) [30분 듣기] Sheep과 Ship, 둘 다 똑같이 '쉽'으로 발음하셨나요? 20단어 귀 뚫림 | 영어 모음 발음
[B] (대조군 · 손실회피형) Beach와 Bitch, 잘못 발음했다가 외국인 얼어붙는 단어 20쌍 | 영어 발음 주의
[C] (대조군 · 원리해결형) 소리 길이 늘이지 마세요, 입꼬리 딱 1cm 당기면 원어민 발음 됩니다 | 파닉스 모음
[D] (대조군 · 호기심형) 원어민 귀에는 완전히 다르게 들리는 짝단어 20개 비밀 | 영어 리스닝 훈련
`;

fs.writeFileSync(path.join(outPackageDir, 'title-variants.txt'), titleVariants, 'utf8');

// 2. Title
const mainTitle = `[30분 듣기] Sheep과 Ship, 둘 다 똑같이 '쉽'으로 발음하셨나요? 20단어 귀 뚫림 | 영어 모음 발음`;
fs.writeFileSync(path.join(outPackageDir, 'title.txt'), mainTitle, 'utf8');

// 3. Description with exact chapters
const description = `솔직히 sheep과 ship, seat와 sit, 둘 다 그냥 똑같이 "쉽", "싯"으로 읽고 계셨죠?
학창 시절에 장모음은 길게 끌고, 단모음은 짧게 끊으라고 배웠지만, 미드나 영화를 보면 원어민들은 길게 끄는 것 같지도 않은데 기가 막히게 구분합니다.

원어민들이 두 소리를 완벽히 구별하는 진짜 이유는 '소리의 길이'가 아닙니다.
바로 "입술과 턱을 쓰는 방법(조음 긴장도)"이 완전히 다르기 때문입니다.

① [iː] 장모음 (TENSE): 웃듯이 입꼬리를 양옆으로 팽팽하게 당기며 내는 단단한 소리
② [ɪ] 단모음 (LAX): 멍때리듯이 턱과 입술에 힘을 툭 빼고 내는 편안한 소리

오늘 딱 20쌍 40개 단어를 남녀 원어민 음성으로 3회씩 반복해 듣고, 실전 카페 대화와 무작위 40단어 덱 셔플까지 귀로 훈련해 보세요.
영상을 다 보고 나시면 "아, 이래서 다르게 들렸구나!" 바로 귀가 뚫리게 됩니다.

「이해하면 쉬운영어」입니다. 왕초보도 이해할 수 있게, 소리의 물리적 원리로 설명합니다.

📌 오늘 배우는 내용
・Sheep vs Ship: 소리의 길이가 아니라 입꼬리 1초 차이
・구강 조음 단면도로 보는 긴장모음 vs 이완모음 원리
・Group 1: 일상 사물 & 동물 5쌍 (sheep/ship, feet/fit, seat/sit, heel/hill, peel/pill)
・Group 2: 음식 & 동작 5쌍 (meat/mitt, peach/pitch, beat/bit, heat/hit, cheap/chip)
・Group 3: 감각 & 상태 5쌍 (sleep/slip, feel/fill, reach/rich, leave/live, seek/sick)
・Group 4: 추상 & 주의 단어 5쌍 (lead/lid, teen/tin, deed/did, steel/still, beach/bitch)
・카페 실전 대화 7문장 3회 연속 리스닝
・40단어 무작위 덱 셔플 반응 훈련 (실전 귀 훈련)
・스마트폰 캡처용 1장 요약 치트시트
・처음부터 끝까지 무한 앵콜 총복습

⏱️ 챕터 타임라인
0:00 Sheep vs Ship, 둘 다 똑같이 '쉽'?
0:31 [iː] vs [ɪ] 입 모양 1초 차이 조음 원리
0:57 Group 1: 일상 사물 & 동물 5쌍 (sheep vs ship, feet vs fit...)
1:41 Group 2: 음식 & 동작 5쌍 (meat vs mitt, peach vs pitch...)
2:23 Group 3: 감각 & 상태 5쌍 (sleep vs slip, feel vs fill...)
3:08 Group 4: 추상 & 주의 단어 5쌍 (lead vs lid, beach vs bitch...)
3:51 실전 짝단어 문장 대화 7문장
4:56 40단어 무작위 덱 셔플 귀 훈련 (실전 퀴즈)
8:12 스마트폰 캡처용 1장 요약 치트시트
8:29 20쌍 무한 앵콜 총복습
9:19 다음 추천 영상 & 완주

영어를 배울 때 무작정 소리를 길게 늘여 빼는 것은 오히려 어색한 발음을 만듭니다.
소리가 나는 물리적 원리를 이해하면, 리스닝도 스피킹도 한결 쉬워집니다.
영상이 도움이 되셨다면 구독과 좋아요 부탁드립니다!

#영어발음 #영어모음 #장모음단모음 #sheepship #발음비교 #파닉스 #성인파닉스 #원어민발음 #영어단어읽는법 #영어리스닝
`;

fs.writeFileSync(path.join(outPackageDir, 'description.txt'), description, 'utf8');

// 4. Tags
const tags = `영어발음, 영어모음, 장모음, 단모음, sheep ship, 발음비교, 파닉스, 성인파닉스, 왕초보영어, 기초영어, 영어리스닝, 영어듣기, 영어회화, 미국식발음, 발음원리, 발음교정, 영어단어읽는법, 영어공부혼자하기, 이해하면쉬운영어, 미니멀페어, 최소대립쌍`;
fs.writeFileSync(path.join(outPackageDir, 'tags.txt'), tags, 'utf8');

// 5. Pinned comment
const pinnedComment = `☕ 여러분은 그동안 sheep과 ship, seat와 sit을 읽을 때 소리 길이를 늘이셨나요, 아니면 입꼬리를 당기셨나요?

영상을 보시면서 가장 소리 구분이 잘 안 됐거나 헷갈렸던 짝단어가 있다면 댓글로 편하게 남겨주세요!
하나하나 읽어보고 답변드리겠습니다. 😊

오늘 9분 집중 훈련을 완주하신 분들은 댓글에 "완주 완료! 🐑🚢"를 남겨주시면 큰 응원이 됩니다!
(단어만 빠르게 복습하실 분들은 8:29 앵콜 총복습 구간을 반복해서 활용해 보세요!)`;

fs.writeFileSync(path.join(outPackageDir, 'pinned-comment.txt'), pinnedComment, 'utf8');

// 6. Timeline
const timeline = `0:00 Sheep vs Ship, 둘 다 똑같이 '쉽'?
0:31 [iː] vs [ɪ] 입 모양 1초 차이 조음 원리
0:57 Group 1: 일상 사물 & 동물 5쌍 (sheep vs ship, feet vs fit...)
1:41 Group 2: 음식 & 동작 5쌍 (meat vs mitt, peach vs pitch...)
2:23 Group 3: 감각 & 상태 5쌍 (sleep vs slip, feel vs fill...)
3:08 Group 4: 추상 & 주의 단어 5쌍 (lead vs lid, beach vs bitch...)
3:51 실전 짝단어 문장 대화 7문장
4:56 40단어 무작위 덱 셔플 귀 훈련 (실전 퀴즈)
8:12 스마트폰 캡처용 1장 요약 치트시트
8:29 20쌍 무한 앵콜 총복습
9:19 다음 추천 영상 & 완주`;

fs.writeFileSync(path.join(outPackageDir, 'timeline.txt'), timeline, 'utf8');

// 7. Upload checklist
const uploadChecklist = `================================================================================
✅ EP24 유튜브 업로드 체크리스트 (Sheep vs Ship 장모음 [iː] vs 단모음 [ɪ] 20쌍 드릴)
================================================================================
[기본 정보]
- 총 영상 길이: 569.32초 (9분 29.3초)
- 에피소드 ID: ep24-long-short-i
- SEO 영상 파일명: English_Pronunciation_Sheep_vs_Ship_Minimal_Pairs_Listening_Drill.mp4
- 권장 예약 발행일: EP23 기준 2일 간격 골든타임 권장

[업로드 단계 체크]
1. [ ] 동영상 파일 업로드 (유튜브 SEO 검색 키워드 파일명):
       English_Pronunciation_Sheep_vs_Ship_Minimal_Pairs_Listening_Drill.mp4
       (경로: output/upload-packages/ep24-long-short-i/English_Pronunciation_Sheep_vs_Ship_Minimal_Pairs_Listening_Drill.mp4)
2. [ ] 썸네일 업로드:
       A안 (메인 추천) 또는 사용자 선택 시안 (thumbnail.jpg)
       - A/B 테스트 대조군: thumbnail-b.jpg, thumbnail-c.jpg, thumbnail-close-up.jpg
3. [ ] 제목/설명 입력:
       title-variants.txt 선택안 복사 & description.txt 본문 복사
4. [ ] 태그 입력:
       tags.txt 내용 전체 복사 붙여넣기
5. [ ] 고정 댓글 등록:
       pinned-comment.txt 복사하여 첫 댓글 등록 후 [댓글 고정] 설정
6. [ ] 최종 화면 (End Screen) 설정:
       - 시작 시각: 09:19 (559.32초) ~ 09:29 (569.32초) — 10.0초간 유지
       - 연결 영상: 직전 편 EP23 (같은 자음 두 개는 한 번만 소리 난다)
       - 구성: 좌측 16:9 직전 편 추천 영상, 우측 16:9 전체 재생목록, 하단 구독 버튼
       (※ 영상 마지막 10초에 전용 엔드스크린 템플릿과 카드 가이드라인이 이미 렌더링되어 있습니다)
================================================================================
`;

fs.writeFileSync(path.join(outPackageDir, 'upload-checklist.txt'), uploadChecklist, 'utf8');

// 8. One-click Dashboard HTML
const dashboardHtml = `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>EP24 유튜브 업로드 원클릭 패키지 | 이해하면 쉬운영어</title>
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
      --primary: #10B981;
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
        radial-gradient(circle at 15% 10%, rgba(16, 185, 129, 0.08) 0%, transparent 40%),
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
      background: rgba(16, 185, 129, 0.15);
      color: var(--primary);
      border: 1px solid rgba(16, 185, 129, 0.3);
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
    .meta-pills {
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
    }
    .meta-pill {
      background: rgba(255, 255, 255, 0.05);
      padding: 6px 14px;
      border-radius: 8px;
      font-size: 13px;
      color: var(--text-muted);
      border: 1px solid var(--card-border);
    }
    .meta-pill strong { color: var(--text); }
    .grid-2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 28px;
    }
    @media (max-width: 960px) {
      .grid-2 { grid-template-columns: 1fr; }
    }
    .card {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: var(--radius);
      padding: 28px;
      backdrop-filter: blur(16px);
      display: flex;
      flex-direction: column;
      gap: 20px;
      position: relative;
    }
    .card-title {
      font-size: 18px;
      font-weight: 800;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .card-title span {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .copy-btn {
      background: var(--accent);
      color: #000;
      border: none;
      padding: 8px 18px;
      border-radius: 8px;
      font-weight: 800;
      font-size: 13px;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 6px;
      transition: all 0.2s;
    }
    .copy-btn:hover {
      filter: brightness(1.1);
      transform: translateY(-1px);
    }
    .copy-btn.copied {
      background: var(--success);
      color: #FFF;
    }
    .preview-box {
      background: rgba(0, 0, 0, 0.35);
      border: 1px solid rgba(255, 255, 255, 0.05);
      border-radius: 10px;
      padding: 16px;
      font-size: 14px;
      color: var(--text);
      white-space: pre-wrap;
      word-break: break-all;
      max-height: 380px;
      overflow-y: auto;
      line-height: 1.7;
    }
    .thumb-grid {
      display: grid;
      grid-template-columns: 1.2fr 1fr;
      gap: 20px;
    }
    @media (max-width: 640px) {
      .thumb-grid { grid-template-columns: 1fr; }
    }
    .thumb-card {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .thumb-img {
      width: 100%;
      border-radius: 10px;
      border: 2px solid var(--card-border);
      aspect-ratio: 16/9;
      object-fit: cover;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
    }
    .thumb-label {
      font-size: 13px;
      font-weight: 700;
      color: var(--accent);
      display: flex;
      justify-content: space-between;
    }
    .checklist-item {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      padding: 12px 14px;
      background: rgba(255, 255, 255, 0.03);
      border-radius: 8px;
      font-size: 14px;
    }
    .checklist-item input[type="checkbox"] {
      margin-top: 4px;
      accent-color: var(--accent);
      width: 16px;
      height: 16px;
    }
  </style>
</head>
<body>
  <div class="container">
    <header class="header">
      <div>
        <div class="badge">EP24 · 롱폼 패키지</div>
        <h1>EP24 유튜브 업로드 원클릭 패키지</h1>
      </div>
      <div class="meta-pills">
        <div class="meta-pill">총 러닝타임: <strong>9분 29초 (569.32s)</strong></div>
        <div class="meta-pill">선택 시안: <strong>A안 (메인)</strong></div>
        <div class="meta-pill">최종 화면: <strong>마지막 10초 (09:19 ~ 09:29)</strong></div>
        <div class="meta-pill">SEO 파일명: <strong>English_Pronunciation_Sheep_vs_Ship_Minimal_Pairs_Listening_Drill.mp4</strong></div>
      </div>
    </header>

    <!-- 썸네일 미리보기 -->
    <div class="card">
      <div class="card-title">
        <span>🖼️ 생성 완료 썸네일 (메인 와이드 + 모바일 클로즈업)</span>
        <span style="font-size: 13px; color: var(--text-muted);">클릭 시 원본 다운로드</span>
      </div>
      <div class="thumb-grid">
        <div class="thumb-card">
          <div class="thumb-label">
            <span>[메인 채택] thumbnail.jpg (와이드)</span>
            <a href="thumbnail.jpg" download style="color: var(--accent); text-decoration: none;">다운로드 ⬇️</a>
          </div>
          <img src="thumbnail.jpg" alt="메인 썸네일" class="thumb-img" onerror="this.style.display='none'">
        </div>
        <div class="thumb-card">
          <div class="thumb-label">
            <span>[모바일 1위] thumbnail-close-up.jpg</span>
            <a href="thumbnail-close-up.jpg" download style="color: var(--accent); text-decoration: none;">다운로드 ⬇️</a>
          </div>
          <img src="thumbnail-close-up.jpg" alt="클로즈업 썸네일" class="thumb-img" onerror="this.style.display='none'">
        </div>
      </div>
    </div>

    <!-- 제목 & 설명란 -->
    <div class="grid-2">
      <!-- 제목 -->
      <div class="card">
        <div class="card-title">
          <span>📌 유튜브 영상 제목 (Title)</span>
          <button class="copy-btn" onclick="copyText('title-text', this)">복사하기</button>
        </div>
        <div id="title-text" class="preview-box" style="font-weight: 700; font-size: 16px; color: var(--accent);">${mainTitle}</div>
        <div style="font-size: 13px; color: var(--text-muted);">
          * 50자 이내(49자), 모바일 3단 구간 최적화, 롱테일 검색어("| 영어 모음 발음") 배치 완료
        </div>
      </div>

      <!-- 고정 댓글 -->
      <div class="card">
        <div class="card-title">
          <span>💬 고정 댓글 (Pinned Comment)</span>
          <button class="copy-btn" onclick="copyText('pinned-text', this)">복사하기</button>
        </div>
        <div id="pinned-text" class="preview-box">${pinnedComment}</div>
      </div>
    </div>

    <!-- 설명란 & 태그 -->
    <div class="grid-2">
      <!-- 설명란 -->
      <div class="card">
        <div class="card-title">
          <span>📝 유튜브 영상 설명 (Description + 타임라인)</span>
          <button class="copy-btn" onclick="copyText('desc-text', this)">복사하기</button>
        </div>
        <div id="desc-text" class="preview-box">${description}</div>
      </div>

      <!-- 태그 & 엔드스크린 체크리스트 -->
      <div class="card">
        <div class="card-title">
          <span>🏷️ 검색 태그 (Tags)</span>
          <button class="copy-btn" onclick="copyText('tags-text', this)">복사하기</button>
        </div>
        <div id="tags-text" class="preview-box" style="max-height: 120px;">${tags}</div>

        <div class="card-title" style="margin-top: 10px;">
          <span>🎞️ 동영상 원본 파일명 (유튜브 SEO 검색 키워드)</span>
          <button class="copy-btn" onclick="copyText('video-filename-text', this)">복사하기</button>
        </div>
        <div id="video-filename-text" class="preview-box" style="padding: 10px 14px; font-weight: 700; color: #10B981;">English_Pronunciation_Sheep_vs_Ship_Minimal_Pairs_Listening_Drill.mp4</div>

        <div class="card-title" style="margin-top: 10px;">
          <span>🎬 최종 화면 (End Screen) 10초 세팅 안내</span>
        </div>
        <div style="display: flex; flex-direction: column; gap: 8px;">
          <div class="checklist-item">
            <input type="checkbox" checked disabled>
            <div><strong>시작 시간:</strong> 09:19 (559.32초) ~ 종료 09:29 (569.32초) — 10.0초간 유지</div>
          </div>
          <div class="checklist-item">
            <input type="checkbox" checked disabled>
            <div><strong>좌측 가이드:</strong> 16:9 추천 영상 (직전 편 EP23 자음 규칙)</div>
          </div>
          <div class="checklist-item">
            <input type="checkbox" checked disabled>
            <div><strong>우측 가이드:</strong> 16:9 재생목록 ([이해하면 쉬운영어] 정주행 플레이리스트)</div>
          </div>
          <div class="checklist-item">
            <input type="checkbox" checked disabled>
            <div><strong>하단 중앙:</strong> 구독 원형 버튼 (채널 구독 알약 뱃지 위치)</div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <script>
    function copyText(id, btn) {
      const el = document.getElementById(id);
      const text = el.innerText || el.textContent;
      navigator.clipboard.writeText(text).then(() => {
        const originalText = btn.innerText;
        btn.innerText = '복사 완료! ✓';
        btn.classList.add('copied');
        setTimeout(() => {
          btn.innerText = originalText;
          btn.classList.remove('copied');
        }, 2000);
      });
    }
  </script>
</body>
</html>
`;

fs.writeFileSync(path.join(outPackageDir, 'index.html'), dashboardHtml, 'utf8');

console.log("✓ Upload package files created successfully in " + outPackageDir);
