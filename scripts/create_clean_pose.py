import os
from PIL import Image, ImageDraw, ImageFilter

def create_expressive_stopmotion_pose():
    base_path = "videos/ep19-ate-suffix/assets/images/char_confused.jpg"
    im = Image.open(base_path).convert("RGBA")
    width, height = im.size
    
    # 캔버스 복사
    pose2 = im.copy()
    draw = ImageDraw.Draw(pose2)
    
    # 피부색 샘플링 (이마/볼 피부색: RGB ~ (254, 219, 196) 또는 원본 픽셀에서 직접 추출)
    skin_color = pose2.getpixel((512, 470))
    print(f"Sampled skin color: {skin_color}")
    
    # 1. 기존 눈과 눈썹 지우기 (피부색으로 자연스럽게 패치)
    # 왼쪽 눈 (보는 기준): 중심 x ~ 445, y ~ 475
    # 오른쪽 눈 (보는 기준): 중심 x ~ 555, y ~ 475
    # 왼쪽 눈썹: x: 410~470, y: 415~445
    # 오른쪽 눈썹: x: 520~585, y: 415~445
    
    # 눈 영역 피부색 패치 (타원으로 부드럽게 덮기)
    draw.ellipse([405, 410, 480, 505], fill=skin_color)
    draw.ellipse([515, 410, 590, 505], fill=skin_color)
    
    # 볼 홍조 다시 추가
    blush_color = (245, 170, 160, 180)
    draw.ellipse([395, 490, 440, 525], fill=blush_color)
    draw.ellipse([550, 490, 605, 525], fill=blush_color)
    
    # 2. 질끈 감은 눈 (> < 형태의 카툰 당황 표정)과 떨리는 눈썹 그리기
    ink_color = (25, 23, 22, 255) # 카툰 외곽선 검정 잉크색
    line_w = 7 # 원본과 동일한 두께
    
    # 왼쪽 눈: 질끈 감은 '>' 모양
    # 위쪽 꺾임: (420, 465) -> (450, 478) -> (420, 492)
    draw.line([(418, 462), (452, 476), (420, 494)], fill=ink_color, width=line_w, joint="curve")
    
    # 오른쪽 눈: 질끈 감은 '<' 모양
    # (580, 462) -> (548, 476) -> (578, 494)
    draw.line([(582, 462), (548, 476), (580, 494)], fill=ink_color, width=line_w, joint="curve")
    
    # 당황해서 물결치는 눈썹 (왼쪽)
    draw.line([(412, 428), (432, 420), (455, 432), (475, 425)], fill=ink_color, width=line_w+2, joint="curve")
    
    # 당황해서 물결치는 눈썹 (오른쪽)
    draw.line([(525, 425), (545, 432), (568, 420), (588, 428)], fill=ink_color, width=line_w+2, joint="curve")
    
    # 3. 입 모양: 살짝 더 벌리고 떨리는 입
    # 기존 입: x: 445~560, y: 535~585
    # 피부색으로 입술 안쪽만 살짝 정리 후 더 큰 패닉 입
    draw.ellipse([450, 535, 555, 585], fill=skin_color)
    # 입 외곽선 (당황해서 벌어진 타원형 입)
    mouth_bg = (160, 40, 40, 255) # 입 안쪽 어두운 빨강
    draw.ellipse([455, 538, 550, 582], fill=mouth_bg, outline=ink_color, width=line_w)
    # 윗니 (하얀색 사각형)
    draw.rectangle([470, 540, 535, 552], fill=(255, 255, 255, 255), outline=ink_color, width=3)
    # 콧수염 다시 살리기 (입 바로 윗부분)
    draw.arc([445, 528, 560, 550], start=10, end=170, fill=ink_color, width=line_w)
    
    # 4. 추가 땀방울 효과 (오른쪽 볼 외에도 왼쪽 볼에도 땀방울 튐 + 공중에 튀는 카툰 땀방울)
    sweat_color = (130, 210, 245, 255) # 밝은 하늘색
    sweat_outline = (25, 23, 22, 255)
    
    # 왼쪽 볼 땀방울
    draw.polygon([(390, 460), (380, 485), (400, 485)], fill=sweat_color, outline=sweat_outline)
    draw.ellipse([380, 475, 400, 495], fill=sweat_color, outline=sweat_outline, width=3)
    
    # 머리 옆 공중에 튀는 땀방울 2개
    draw.ellipse([345, 430, 360, 448], fill=sweat_color, outline=sweat_outline, width=3)
    draw.ellipse([640, 435, 655, 452], fill=sweat_color, outline=sweat_outline, width=3)
    
    # 5. 얼굴 주변 당황 떨림 효과선 (카툰 액션 라인)
    draw.line([(365, 460), (350, 465)], fill=ink_color, width=4)
    draw.line([(365, 475), (348, 480)], fill=ink_color, width=4)
    draw.line([(635, 460), (652, 465)], fill=ink_color, width=4)
    draw.line([(635, 475), (655, 480)], fill=ink_color, width=4)

    # 6. 최종 완벽 잠금: 모자 로고, 가슴 로고, 텍스트, 말풍선 원본 100% 복사
    orig_rgba = im.convert("RGBA")
    # 모자 파형 로고
    pose2.paste(orig_rgba.crop([450, 290, 560, 360]), (450, 290))
    # 가슴 파형 로고
    pose2.paste(orig_rgba.crop([570, 720, 650, 785]), (570, 720))
    # 가슴 텍스트 'WHY ARE THEY DIFFERENT?!'
    pose2.paste(orig_rgba.crop([340, 770, 680, 890]), (340, 770))
    # 상단 말풍선
    pose2.paste(orig_rgba.crop([150, 80, 870, 390]), (150, 80))
    
    out_path = "videos/ep19-ate-suffix/assets/images/char_confused_step1_locked.jpg"
    pose2.convert("RGB").save(out_path, quality=95)
    print(f"Saved to {out_path}")

if __name__ == "__main__":
    create_expressive_stopmotion_pose()
