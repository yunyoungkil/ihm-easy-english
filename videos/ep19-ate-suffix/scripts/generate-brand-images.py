import subprocess
import os
import time

CHROME_PATH = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
OUTPUT_DIR = r"c:\Users\yunyo\Downloads\project\videos\ep19-ate-suffix\assets\images"

seesaw_html = """<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  @import url('https://fonts.googleapis.com/css2?family=Archivo+Black&family=Noto+Sans+KR:wght@700;900&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    width: 1024px;
    height: 1024px;
    background: #F4EFE6;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    font-family: 'Noto Sans KR', sans-serif;
    position: relative;
    overflow: hidden;
  }
  /* Outer sketch border */
  .frame-border {
    position: absolute;
    inset: 32px;
    border: 5px solid #2B2B2B;
    border-radius: 40px;
    background: #FAF7F2;
    box-shadow: 12px 12px 0px #2B2B2B;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: space-between;
    padding: 60px 40px;
  }
  .title-badge {
    background: #F5C518;
    border: 4.5px solid #2B2B2B;
    border-radius: 100px;
    box-shadow: 6px 6px 0px #2B2B2B;
    padding: 16px 40px;
    font-size: 34px;
    font-weight: 900;
    color: #2B2B2B;
    letter-spacing: -0.5px;
    display: flex;
    align-items: center;
    gap: 16px;
  }
  .seesaw-area {
    position: relative;
    width: 800px;
    height: 440px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  /* Seesaw Plank tilted */
  .seesaw-plank {
    position: absolute;
    width: 720px;
    height: 32px;
    background: #FFFFFF;
    border: 5px solid #2B2B2B;
    border-radius: 16px;
    box-shadow: 6px 6px 0px #2B2B2B;
    transform: rotate(-10deg);
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 20px;
  }
  /* Left Weight (Heavy Verb) */
  .weight-left {
    position: absolute;
    left: -40px;
    top: -190px;
    background: #FF5E57;
    border: 5px solid #2B2B2B;
    border-radius: 28px;
    box-shadow: 8px 8px 0px #2B2B2B;
    padding: 24px 32px;
    display: flex;
    flex-direction: column;
    align-items: center;
    color: #FFF;
    text-align: center;
  }
  .weight-left .emoji { font-size: 56px; }
  .weight-left .label { font-size: 32px; font-weight: 900; }
  .weight-left .sub { font-size: 24px; font-weight: 800; opacity: 0.95; }

  /* Right Weight (Light Noun) */
  .weight-right {
    position: absolute;
    right: -40px;
    top: -240px;
    background: #2E86AB;
    border: 5px solid #2B2B2B;
    border-radius: 28px;
    box-shadow: 8px 8px 0px #2B2B2B;
    padding: 24px 32px;
    display: flex;
    flex-direction: column;
    align-items: center;
    color: #FFF;
    text-align: center;
  }
  .weight-right .emoji { font-size: 56px; }
  .weight-right .label { font-size: 32px; font-weight: 900; }
  .weight-right .sub { font-size: 24px; font-weight: 800; opacity: 0.95; }

  /* Pivot Triangle */
  .seesaw-pivot {
    position: absolute;
    bottom: 40px;
    left: 50%;
    transform: translateX(-50%);
    width: 0;
    height: 0;
    border-left: 60px solid transparent;
    border-right: 60px solid transparent;
    border-bottom: 110px solid #2B2B2B;
  }
  .pivot-pin {
    position: absolute;
    left: 50%;
    top: 60px;
    transform: translate(-50%, -50%);
    width: 36px;
    height: 36px;
    border-radius: 50%;
    background: #F5C518;
    border: 5px solid #2B2B2B;
  }
  .bottom-text {
    font-size: 28px;
    font-weight: 900;
    color: #635E54;
    letter-spacing: -0.3px;
  }
  .bottom-text b { color: #2B2B2B; }
</style>
</head>
<body>
  <div class="frame-border">
    <div class="title-badge">
      <span>⚖️</span>
      <span>끝소리 에너지 시소 법칙</span>
    </div>
    <div class="seesaw-area">
      <div class="seesaw-plank">
        <div class="weight-left">
          <div class="emoji">🔥</div>
          <div class="label">동사 100%</div>
          <div class="sub">[-eɪt] 쾅!</div>
        </div>
        <div class="weight-right">
          <div class="emoji">🍃</div>
          <div class="label">명사 0%</div>
          <div class="sub">[-ət] 툭~</div>
        </div>
      </div>
      <div class="seesaw-pivot">
        <div class="pivot-pin"></div>
      </div>
    </div>
    <div class="bottom-text">
      동사는 <b>에너지 100%</b> 무겁게 쿵! ➔ 명사는 <b>에너지 0%</b> 가볍게 둥실~
    </div>
  </div>
</body>
</html>
"""

brain_html = """<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  @import url('https://fonts.googleapis.com/css2?family=Archivo+Black&family=Noto+Sans+KR:wght@700;900&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    width: 1024px;
    height: 1024px;
    background: #F4EFE6;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    font-family: 'Noto Sans KR', sans-serif;
    position: relative;
    overflow: hidden;
  }
  .frame-border {
    position: absolute;
    inset: 32px;
    border: 5px solid #2B2B2B;
    border-radius: 40px;
    background: #FAF7F2;
    box-shadow: 12px 12px 0px #2B2B2B;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: space-between;
    padding: 60px 40px;
  }
  .title-badge {
    background: #F5C518;
    border: 4.5px solid #2B2B2B;
    border-radius: 100px;
    box-shadow: 6px 6px 0px #2B2B2B;
    padding: 16px 40px;
    font-size: 34px;
    font-weight: 900;
    color: #2B2B2B;
    letter-spacing: -0.5px;
    display: flex;
    align-items: center;
    gap: 16px;
  }
  .center-art {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 24px;
  }
  .headphone-avatar {
    width: 240px;
    height: 240px;
    border-radius: 50%;
    background: #FFFFFF;
    border: 6px solid #2B2B2B;
    box-shadow: 8px 8px 0px #2B2B2B;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 110px;
  }
  .sound-waves {
    display: flex;
    align-items: flex-end;
    gap: 12px;
    height: 90px;
  }
  .eq-bar {
    width: 18px;
    border-radius: 10px;
    border: 3.5px solid #2B2B2B;
  }
  .b1 { height: 40px; background: #FF5E57; }
  .b2 { height: 75px; background: #F5C518; }
  .b3 { height: 50px; background: #2E86AB; }
  .b4 { height: 90px; background: #FF5E57; }
  .b5 { height: 60px; background: #F5C518; }
  .b6 { height: 80px; background: #2E86AB; }
  .b7 { height: 45px; background: #FF5E57; }

  .sub-card {
    background: #FFFFFF;
    border: 4px solid #2B2B2B;
    box-shadow: 6px 6px 0px #2B2B2B;
    border-radius: 20px;
    padding: 16px 36px;
    display: flex;
    align-items: center;
    gap: 20px;
  }
  .sub-tag {
    background: #2B2B2B;
    color: #F5C518;
    padding: 6px 16px;
    border-radius: 8px;
    font-size: 22px;
    font-weight: 900;
  }
  .sub-desc {
    font-size: 26px;
    font-weight: 900;
    color: #2B2B2B;
  }
  .bottom-text {
    font-size: 26px;
    font-weight: 900;
    color: #635E54;
    letter-spacing: -0.3px;
  }
  .bottom-text b { color: #2B2B2B; }
</style>
</head>
<body>
  <div class="frame-border">
    <div class="title-badge">
      <span>🎧</span>
      <span>원어민 실전 리스닝 귀 훈련</span>
    </div>
    <div class="center-art">
      <div class="headphone-avatar">👂</div>
      <div class="sound-waves">
        <div class="eq-bar b1"></div>
        <div class="eq-bar b2"></div>
        <div class="eq-bar b3"></div>
        <div class="eq-bar b4"></div>
        <div class="eq-bar b5"></div>
        <div class="eq-bar b6"></div>
        <div class="eq-bar b7"></div>
      </div>
      <div class="sub-card">
        <div class="sub-tag">LISTENING</div>
        <div class="sub-desc">문장 속에서 날아오는 끝소리 2단 콤보!</div>
      </div>
    </div>
    <div class="bottom-text">
      귀를 쫑긋 세우고 <b>동사 '에이트'</b>와 <b>명사 '에스티멋'</b>을 구별해 보세요!
    </div>
  </div>
</body>
</html>
"""

caution_html = """<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  @import url('https://fonts.googleapis.com/css2?family=Archivo+Black&family=Noto+Sans+KR:wght@700;900&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    width: 1024px;
    height: 1024px;
    background: #F4EFE6;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    font-family: 'Noto Sans KR', sans-serif;
    position: relative;
    overflow: hidden;
  }
  .frame-border {
    position: absolute;
    inset: 32px;
    border: 5px solid #2B2B2B;
    border-radius: 40px;
    background: #FAF7F2;
    box-shadow: 12px 12px 0px #2B2B2B;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: space-between;
    padding: 60px 40px;
  }
  .title-badge {
    background: #F5C518;
    border: 4.5px solid #2B2B2B;
    border-radius: 100px;
    box-shadow: 6px 6px 0px #2B2B2B;
    padding: 16px 40px;
    font-size: 34px;
    font-weight: 900;
    color: #2B2B2B;
    letter-spacing: -0.5px;
    display: flex;
    align-items: center;
    gap: 16px;
  }
  .center-shield {
    width: 360px;
    height: 380px;
    background: #F5C518;
    border: 7px solid #2B2B2B;
    border-radius: 48px;
    box-shadow: 12px 12px 0px #2B2B2B;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 16px;
  }
  .shield-icon { font-size: 130px; line-height: 1; }
  .shield-title { font-size: 44px; font-weight: 900; color: #2B2B2B; }
  .shield-tag {
    background: #2B2B2B;
    color: #FFF;
    padding: 6px 20px;
    border-radius: 10px;
    font-size: 22px;
    font-weight: 900;
  }
  .bottom-text {
    font-size: 28px;
    font-weight: 900;
    color: #635E54;
    letter-spacing: -0.3px;
  }
  .bottom-text b { color: #2B2B2B; }
</style>
</head>
<body>
  <div class="frame-border">
    <div class="title-badge">
      <span>⚠️</span>
      <span>끝소리 핵심 절대 공식 요약</span>
    </div>
    <div class="center-shield">
      <div class="shield-icon">⚠️</div>
      <div class="shield-title">핵심 요약</div>
      <div class="shield-tag">MUST MEMORIZE</div>
    </div>
    <div class="bottom-text">
      <b>화면을 캡처</b>해 두고 평생 써먹는 끝소리 황금 법칙!
    </div>
  </div>
</body>
</html>
"""

def render_html_to_jpg(html_content, out_filename):
    temp_html = os.path.join(OUTPUT_DIR, f"temp_{int(time.time()*1000)}.html")
    with open(temp_html, "w", encoding="utf-8") as f:
        f.write(html_content)
    
    out_path = os.path.join(OUTPUT_DIR, out_filename)
    cmd = [
        CHROME_PATH,
        "--headless=new",
        "--disable-gpu",
        "--no-sandbox",
        "--hide-scrollbars",
        "--window-size=1024,1024",
        f"--screenshot={out_path}",
        temp_html
    ]
    subprocess.run(cmd, check=True)
    if os.path.exists(temp_html):
        os.remove(temp_html)
    print(f"Generated: {out_path}")

render_html_to_jpg(seesaw_html, "energy_seesaw.jpg")
render_html_to_jpg(brain_html, "brain_training.jpg")
render_html_to_jpg(caution_html, "caution_badge.jpg")
print("All 3 brand images successfully generated!")
