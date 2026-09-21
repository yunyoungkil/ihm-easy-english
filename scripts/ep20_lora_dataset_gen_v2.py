import json
import os
import urllib.request
import urllib.parse
import time

COMFY_HOST = "127.0.0.1"
COMFY_PORT = 8188
TRIGGER = "ep20hostchar"

OUT_DIR = "videos/ep20-world-rl/assets/lora-dataset-v2"
os.makedirs(OUT_DIR, exist_ok=True)

# (skeleton_file_suffix, scene description, caption)
VARIANTS = [
    ("pose01_neutral", "standing neutral pose, arms relaxed at sides, gentle smile, front view",
     "standing neutral pose, arms relaxed, gentle smile, front view"),
    ("pose02_pointing", "pointing at the viewer with one raised hand, confident expression, front view",
     "pointing at viewer with raised hand, confident expression"),
    ("pose03_crossed_arms", "arms crossed over chest, raised eyebrow, skeptical expression, front view",
     "arms crossed over chest, raised eyebrow, skeptical expression"),
    ("pose04_shrug", "shrugging with both arms raised and palms open, confused expression, front view",
     "shrugging with both arms raised, confused expression"),
    ("pose05_headphones", "wearing large over-ear headphones, one hand near ear, relaxed listening expression",
     "wearing large over-ear headphones, one hand near ear, relaxed listening expression"),
    ("pose06_chin_think", "hand on chin, thoughtful pondering expression, head tilted",
     "hand on chin, thoughtful pondering expression, head tilted"),
    ("pose07_explaining", "both arms spread open mid-gesture as if explaining something, animated expression",
     "both arms spread open explaining, animated expression"),
    ("pose08_shocked", "both hands on cheeks, eyes wide open, mouth open in shock, surprised expression",
     "both hands on cheeks, eyes wide open, shocked surprised expression"),
    ("pose09_laughing", "head tilted back slightly, one arm raised, big open laughing smile, eyes crinkled with joy",
     "laughing with big open smile, one arm raised, eyes crinkled with joy"),
    ("pose10_sideprofile", "side profile view facing right, calm neutral expression",
     "side profile view facing right, calm neutral expression"),
    ("pose11_closeup_alt", "leaning back slightly laughing wide, both arms relaxed at sides",
     "leaning back laughing, both arms relaxed"),
    ("pose12_thumbsup", "both arms raised with thumbs up, big excited grin, energetic pose",
     "both arms raised thumbs up, big excited grin"),
    ("pose13_facepalm", "one hand covering face in a facepalm gesture, exasperated expression",
     "facepalm gesture, one hand covering face, exasperated expression"),
    ("pose14_leaning", "leaning forward slightly with curious raised eyebrows, one hand near ear listening closely",
     "leaning forward, curious expression, hand near ear listening closely"),
    ("pose15_backview_turn", "torso turned to the side looking back over shoulder, playful smile",
     "turned to the side looking back over shoulder, playful smile"),
    ("pose16_phone_confused", "holding a smartphone up near face with one raised hand, squinting confused expression",
     "holding smartphone near face, squinting confused expression"),
]


def build_workflow(pose_file, scene_prompt, seed, out_suffix):
    return {
        "1": {"inputs": {"ckpt_name": "dreamshaper_8.safetensors"}, "class_type": "CheckpointLoaderSimple"},
        "2": {"inputs": {"model": ["1", 0], "preset": "PLUS (high strength)"}, "class_type": "IPAdapterUnifiedLoader"},
        "3": {"inputs": {"image": "ep20_ipadapter_ref.jpg", "upload": "image"}, "class_type": "LoadImage"},
        "4": {
            "inputs": {
                "model": ["2", 0], "ipadapter": ["2", 1], "image": ["3", 0],
                "weight": 0.7, "start_at": 0.0, "end_at": 1.0, "weight_type": "standard",
            },
            "class_type": "IPAdapter",
        },
        "5": {
            "inputs": {
                "text": f"{TRIGGER}, 2D sticker illustration character, {scene_prompt}, warm skin tone, "
                        f"simple flat cartoon eyes with thick black outline, clean vector line art, "
                        f"flat bright colors, sketchnote style, wearing blue cap and navy hoodie",
                "clip": ["1", 1],
            },
            "class_type": "CLIPTextEncode",
        },
        "6": {
            "inputs": {
                "text": "realistic, photo, 3d render, ugly, messy, distorted, text, letters, words, "
                        "writing, extra limbs, blurry, extra fingers, mutated hands, two people, "
                        "duplicate, twins, three people",
                "clip": ["1", 1],
            },
            "class_type": "CLIPTextEncode",
        },
        "7": {"inputs": {"control_net_name": "control_v11p_sd15_openpose.pth"}, "class_type": "ControlNetLoader"},
        "8": {"inputs": {"image": f"{pose_file}.png", "upload": "image"}, "class_type": "LoadImage"},
        "9": {
            "inputs": {
                "positive": ["5", 0], "negative": ["6", 0], "control_net": ["7", 0],
                "image": ["8", 0], "strength": 0.85, "start_percent": 0.0, "end_percent": 1.0,
            },
            "class_type": "ControlNetApplyAdvanced",
        },
        "10": {"inputs": {"width": 512, "height": 512, "batch_size": 1}, "class_type": "EmptyLatentImage"},
        "11": {
            "inputs": {
                "seed": seed, "steps": 26, "cfg": 7.0, "sampler_name": "dpmpp_2m", "scheduler": "karras",
                "denoise": 1.0, "model": ["4", 0], "positive": ["9", 0], "negative": ["9", 1],
                "latent_image": ["10", 0],
            },
            "class_type": "KSampler",
        },
        "12": {"inputs": {"samples": ["11", 0], "vae": ["1", 2]}, "class_type": "VAEDecode"},
        "13": {"inputs": {"filename_prefix": f"EP20LoraDSv2_{out_suffix}", "images": ["12", 0]}, "class_type": "SaveImage"},
    }


def queue_and_wait(workflow, timeout_s=180):
    req_data = json.dumps({"prompt": workflow}).encode("utf-8")
    req = urllib.request.Request(
        f"http://{COMFY_HOST}:{COMFY_PORT}/prompt", data=req_data,
        headers={"Content-Type": "application/json"},
    )
    with urllib.request.urlopen(req) as resp:
        res = json.loads(resp.read().decode("utf-8"))
        prompt_id = res.get("prompt_id")

    start = time.time()
    while time.time() - start < timeout_s:
        time.sleep(2)
        hist_req = urllib.request.Request(f"http://{COMFY_HOST}:{COMFY_PORT}/history/{prompt_id}")
        try:
            with urllib.request.urlopen(hist_req) as hist_resp:
                hist_data = json.loads(hist_resp.read().decode("utf-8"))
                if prompt_id in hist_data and "outputs" in hist_data[prompt_id]:
                    outputs = hist_data[prompt_id]["outputs"]
                    if "13" in outputs and "images" in outputs["13"]:
                        img_info = outputs["13"]["images"][0]
                        return img_info["filename"], img_info.get("subfolder", "")
        except Exception:
            pass
    return None, None


def main():
    for i, (pose_file, scene_prompt, caption) in enumerate(VARIANTS):
        seed = 600000 + i * 149
        print(f"[{i+1}/{len(VARIANTS)}] Generating {pose_file}...")
        workflow = build_workflow(pose_file, scene_prompt, seed, pose_file)
        filename, subfolder = queue_and_wait(workflow)
        if not filename:
            print(f"  FAILED: {pose_file}")
            continue
        view_url = f"http://{COMFY_HOST}:{COMFY_PORT}/view?filename={urllib.parse.quote(filename)}&subfolder={urllib.parse.quote(subfolder)}&type=output"
        img_path = os.path.join(OUT_DIR, f"{pose_file}.jpg")
        urllib.request.urlretrieve(view_url, img_path)
        caption_path = os.path.join(OUT_DIR, f"{pose_file}.txt")
        with open(caption_path, "w", encoding="utf-8") as f:
            f.write(f"{TRIGGER}, {caption}")
        print(f"  Saved {img_path}")

    print("Done.")


if __name__ == "__main__":
    main()
