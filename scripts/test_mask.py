import os
from PIL import Image, ImageDraw

base_path = "videos/ep19-ate-suffix/assets/images/char_confused.jpg"
im = Image.open(base_path).convert("RGBA")
width, height = im.size

# 마스크 생성 (얼굴 표정 영역만 흰색=변화 허용, 나머지는 검은색=완전 잠금)
# 눈, 눈썹, 입, 볼(땀방울) 영역
# 대략: x: 380~640, y: 410~650
mask = Image.new("L", (width, height), 0)
draw = ImageDraw.Draw(mask)

# 표정 영역 (타원 또는 둥근 사각형)
draw.ellipse([390, 420, 630, 620], fill=255)

# 모자 챙 아래, 수염 위쪽의 얼굴 표정만 남김
# 모자 로고 (y: 280~380) -> 0 (잠금)
# 턱수염 (y: 560~640) 중 턱 아래는 잠그고, 입술 주변만 살짝
mask.save("scripts/face_mask_debug.png")
print("Mask saved to scripts/face_mask_debug.png")
