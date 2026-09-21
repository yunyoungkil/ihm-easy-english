"""
Hand-authored OpenPose 18-keypoint skeletons for diverse character poses.
Renders in the standard OpenPose COCO-18 color/line format that
control_v11p_sd15_openpose.pth was trained on.
"""
import os
from PIL import Image, ImageDraw

W, H = 512, 512
OUT_DIR = "videos/ep20-world-rl/assets/pose-skeletons"
os.makedirs(OUT_DIR, exist_ok=True)

# Standard OpenPose COCO-18 limb pairs (0-indexed) and colors
POSE_PAIRS = [
    (1, 2), (1, 5), (2, 3), (3, 4), (5, 6), (6, 7), (1, 8), (8, 9), (9, 10),
    (1, 11), (11, 12), (12, 13), (1, 0), (0, 14), (14, 16), (0, 15), (15, 17),
]
COLORS = [
    (255, 0, 0), (255, 85, 0), (255, 170, 0), (255, 255, 0), (170, 255, 0),
    (85, 255, 0), (0, 255, 0), (0, 255, 85), (0, 255, 170), (0, 255, 255),
    (0, 170, 255), (0, 85, 255), (0, 0, 255), (85, 0, 255), (170, 0, 255),
    (255, 0, 255), (255, 0, 170), (255, 0, 85),
]
# keypoint order: Nose,Neck,RSho,RElb,RWri,LSho,LElb,LWri,RHip,RKnee,RAnk,LHip,LKnee,LAnk,REye,LEye,REar,LEar

def draw_skeleton(keypoints, out_name):
    img = Image.new("RGB", (W, H), (0, 0, 0))
    draw = ImageDraw.Draw(img)
    for i, (a, b) in enumerate(POSE_PAIRS):
        if keypoints[a] is None or keypoints[b] is None:
            continue
        draw.line([keypoints[a], keypoints[b]], fill=COLORS[i % len(COLORS)], width=6)
    for i, pt in enumerate(keypoints):
        if pt is None:
            continue
        r = 5
        draw.ellipse([pt[0] - r, pt[1] - r, pt[0] + r, pt[1] + r], fill=COLORS[i % len(COLORS)])
    img.save(os.path.join(OUT_DIR, out_name))
    print("Saved", out_name)


# Base torso anchor points reused across poses (upper-body framed, centered)
NOSE = (256, 120)
NECK = (256, 160)
RSHO = (210, 170)
LSHO = (302, 170)
RHIP = (225, 320)
LHIP = (287, 320)
REYE = (246, 110)
LEYE = (266, 110)
REAR = (232, 118)
LEAR = (280, 118)

POSES = {}

# 1. neutral standing, arms relaxed down
POSES["pose01_neutral"] = [
    NOSE, NECK, RSHO, (200, 250), (195, 330), LSHO, (312, 250), (317, 330),
    RHIP, (218, 410), (215, 480), LHIP, (294, 410), (297, 480), REYE, LEYE, REAR, LEAR,
]

# 2. pointing forward with right hand raised
POSES["pose02_pointing"] = [
    NOSE, NECK, RSHO, (170, 140), (130, 110), LSHO, (312, 250), (317, 330),
    RHIP, (218, 410), (215, 480), LHIP, (294, 410), (297, 480), REYE, LEYE, REAR, LEAR,
]

# 3. arms crossed over chest
POSES["pose03_crossed_arms"] = [
    NOSE, NECK, RSHO, (270, 230), (300, 200), LSHO, (242, 230), (212, 200),
    RHIP, (218, 410), (215, 480), LHIP, (294, 410), (297, 480), REYE, LEYE, REAR, LEAR,
]

# 4. both hands up shrugging
POSES["pose04_shrug"] = [
    NOSE, NECK, RSHO, (175, 130), (150, 90), LSHO, (337, 130), (362, 90),
    RHIP, (218, 410), (215, 480), LHIP, (294, 410), (297, 480), REYE, LEYE, REAR, LEAR,
]

# 5. one hand near ear (headphones)
POSES["pose05_headphones"] = [
    NOSE, NECK, RSHO, (200, 250), (195, 330), LSHO, (320, 150), (290, 105),
    RHIP, (218, 410), (215, 480), LHIP, (294, 410), (297, 480), REYE, LEYE, REAR, LEAR,
]

# 6. hand on chin thinking, head tilted
POSES["pose06_chin_think"] = [
    (246, 118), (256, 160), RSHO, (200, 250), (195, 330), LSHO, (300, 160), (270, 120),
    RHIP, (218, 410), (215, 480), LHIP, (294, 410), (297, 480), (236, 108), (256, 110), REAR, LEAR,
]

# 7. both hands open mid-gesture explaining
POSES["pose07_explaining"] = [
    NOSE, NECK, RSHO, (165, 220), (120, 250), LSHO, (347, 220), (392, 250),
    RHIP, (218, 410), (215, 480), LHIP, (294, 410), (297, 480), REYE, LEYE, REAR, LEAR,
]

# 8. both hands on cheeks, shocked
POSES["pose08_shocked"] = [
    NOSE, NECK, RSHO, (225, 165), (220, 115), LSHO, (287, 165), (292, 115),
    RHIP, (218, 410), (215, 480), LHIP, (294, 410), (297, 480), REYE, LEYE, REAR, LEAR,
]

# 9. laughing, one arm slightly out, head back
POSES["pose09_laughing"] = [
    (256, 128), (256, 165), RSHO, (185, 210), (150, 180), LSHO, (312, 250), (317, 330),
    RHIP, (218, 410), (215, 480), LHIP, (294, 410), (297, 480), REYE, LEYE, REAR, LEAR,
]

# 10. side profile facing right, arms relaxed
POSES["pose10_sideprofile"] = [
    (280, 118), (270, 160), (240, 170), (225, 250), (218, 330), None, None, None,
    (250, 320), (245, 410), (240, 480), None, None, None, (285, 110), None, (260, 115), None,
]

# 11. thumbs up both hands, excited
POSES["pose12_thumbsup"] = [
    NOSE, NECK, RSHO, (185, 230), (160, 270), LSHO, (327, 230), (352, 270),
    RHIP, (218, 410), (215, 480), LHIP, (294, 410), (297, 480), REYE, LEYE, REAR, LEAR,
]

# 12. facepalm, one hand over face
POSES["pose13_facepalm"] = [
    (256, 130), (256, 165), RSHO, (245, 170), (270, 120), LSHO, (312, 250), (317, 330),
    RHIP, (218, 410), (215, 480), LHIP, (294, 410), (297, 480), REYE, LEYE, REAR, LEAR,
]

# 13. leaning forward, hand near ear listening
POSES["pose14_leaning"] = [
    (256, 140), (256, 175), RSHO, (200, 260), (195, 340), LSHO, (325, 165), (300, 120),
    RHIP, (228, 400), (225, 470), LHIP, (304, 400), (307, 470), REYE, LEYE, REAR, LEAR,
]

# 14. turned back-ish view, looking over shoulder (approximate with tighter shoulders)
POSES["pose15_backview_turn"] = [
    (270, 122), (256, 160), (235, 165), (215, 245), (210, 325), (290, 175), (305, 255), (310, 335),
    RHIP, (218, 410), (215, 480), LHIP, (294, 410), (297, 480), (262, 112), (280, 114), REAR, None,
]

# 15. holding phone up near face, confused
POSES["pose16_phone_confused"] = [
    NOSE, NECK, RSHO, (285, 150), (300, 100), LSHO, (312, 250), (317, 330),
    RHIP, (218, 410), (215, 480), LHIP, (294, 410), (297, 480), REYE, LEYE, REAR, LEAR,
]

# 16. leaning back laughing wide, both arms relaxed but head thrown back further
POSES["pose11_closeup_alt"] = [
    (256, 132), (256, 168), RSHO, (195, 240), (190, 320), LSHO, (317, 240), (322, 320),
    RHIP, (218, 410), (215, 480), LHIP, (294, 410), (297, 480), REYE, LEYE, REAR, LEAR,
]

for name, kps in POSES.items():
    draw_skeleton(kps, f"{name}.png")

print(f"Done: {len(POSES)} skeletons written to {OUT_DIR}")
