"""
Frame 1 cold-open reaction sequence: 4 poses escalating from calm to shocked
while holding a phone. Bust/upper-body framing to match the host-illustration
box aspect (wider than tall, object-fit: cover crops left/right, not top/bottom).
"""
import os
from PIL import Image, ImageDraw

W, H = 512, 512
OUT_DIR = "videos/ep20-world-rl/assets/pose-skeletons"
os.makedirs(OUT_DIR, exist_ok=True)

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


NOSE = (256, 150)
NECK = (256, 195)
RHIP = (225, 400)
LHIP = (287, 400)

POSES = {}

# Frame 0: neutral, calmly holding phone up at chest height with right hand,
# left arm relaxed at side
POSES["f01_react_00_neutral"] = [
    NOSE, NECK, (210, 205), (200, 285), (215, 330), (302, 205), (312, 285), (317, 330),
    RHIP, None, None, LHIP, None, None, (246, 140), (266, 140), (232, 148), (280, 148),
]

# Frame 1: confused, head tilted, phone hand rises slightly closer to face,
# left hand rises toward chin
POSES["f01_react_01_confused"] = [
    (246, 145), NECK, (210, 200), (195, 260), (200, 210), (302, 205), (330, 250), (305, 225),
    RHIP, None, None, LHIP, None, None, (238, 133), (258, 138), (224, 141), (272, 148),
]

# Frame 2: surprised, leaning back slightly, phone hand pulled toward chest,
# left hand near open mouth
POSES["f01_react_02_surprised"] = [
    (256, 138), (256, 185), (205, 200), (185, 165), (180, 120), (307, 205), (325, 260), (335, 305),
    RHIP, None, None, LHIP, None, None, (246, 128), (266, 128), (230, 136), (280, 136),
]

# Frame 3: shocked, both arms thrown up near head, phone still gripped in
# right hand raised high, head thrown back
POSES["f01_react_03_shocked"] = [
    (256, 128), (256, 178), (195, 175), (155, 110), (130, 70), (317, 175), (357, 110), (382, 70),
    RHIP, None, None, LHIP, None, None, (246, 118), (266, 118), (228, 126), (284, 126),
]

for name, kps in POSES.items():
    draw_skeleton(kps, f"{name}.png")

print(f"Done: {len(POSES)} skeletons written to {OUT_DIR}")
