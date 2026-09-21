import json
import os
import urllib.request
import urllib.parse
import time

COMFY_HOST = "127.0.0.1"
COMFY_PORT = 8188
TRIGGER = "ep20hostchar"

OUT_DIR = "videos/ep20-world-rl/assets/lora-dataset"
os.makedirs(OUT_DIR, exist_ok=True)

# (filename suffix, scene prompt, caption)
VARIANTS = [
    ("pose01_neutral", "standing neutral pose, arms relaxed at sides, gentle smile, front view",
     "standing neutral pose, arms relaxed, gentle smile, front view"),
    ("pose02_pointing", "pointing at the viewer with one hand, confident expression, three-quarter view",
     "pointing at viewer with one hand, confident expression, three-quarter view"),
    ("pose03_crossed_arms", "arms crossed over chest, raised eyebrow, skeptical expression, front view",
     "arms crossed over chest, raised eyebrow, skeptical expression"),
    ("pose04_shrug", "shrugging with both palms open and raised, confused expression, front view",
     "shrugging with both palms open, confused expression"),
    ("pose05_headphones", "wearing large over-ear headphones, eyes closed, relaxed listening expression",
     "wearing large over-ear headphones, eyes closed, relaxed listening expression"),
    ("pose06_chin_think", "hand on chin, thoughtful pondering expression, looking upward, side-lit",
     "hand on chin, thoughtful pondering expression, looking upward"),
    ("pose07_explaining", "both hands open mid-gesture as if explaining something, animated expression, front view",
     "both hands open mid-gesture explaining, animated expression"),
    ("pose08_shocked", "both hands on cheeks, eyes wide open, mouth open in shock, surprised expression",
     "both hands on cheeks, eyes wide open, shocked surprised expression"),
    ("pose09_laughing", "head tilted back slightly, big open laughing smile, eyes crinkled with joy",
     "laughing with big open smile, eyes crinkled with joy"),
    ("pose10_sideprofile", "side profile view, looking to the right, calm neutral expression",
     "side profile view, looking right, calm neutral expression"),
    ("pose11_closeup", "extreme close-up of face only, warm smile, direct eye contact with viewer",
     "extreme close-up face portrait, warm smile, direct eye contact"),
    ("pose12_thumbsup", "both thumbs up, big excited grin, front view, energetic pose",
     "both thumbs up, big excited grin, energetic pose"),
    ("pose13_facepalm", "one hand covering face in a facepalm gesture, exasperated expression",
     "facepalm gesture, one hand covering face, exasperated expression"),
    ("pose14_leaning", "leaning forward slightly with curious raised eyebrows, hand near ear as if listening closely",
     "leaning forward, curious expression, hand near ear listening closely"),
    ("pose15_backview_turn", "turned three-quarter away from camera looking back over shoulder, playful smile",
     "turned three-quarter away looking back over shoulder, playful smile"),
    ("pose16_phone_confused", "holding a smartphone up near face, squinting at the screen with confused expression",
     "holding smartphone near face, squinting confused expression"),
]


def build_workflow(scene_prompt, seed, out_suffix):
    return {
        "1": {"inputs": {"ckpt_name": "dreamshaper_8.safetensors"}, "class_type": "CheckpointLoaderSimple"},
        "2": {"inputs": {"model": ["1", 0], "preset": "PLUS (high strength)"}, "class_type": "IPAdapterUnifiedLoader"},
        "3": {"inputs": {"image": "ep20_ipadapter_ref.jpg", "upload": "image"}, "class_type": "LoadImage"},
        "4": {
            "inputs": {
                "model": ["2", 0], "ipadapter": ["2", 1], "image": ["3", 0],
                "weight": 0.85, "start_at": 0.0, "end_at": 1.0, "weight_type": "standard",
            },
            "class_type": "IPAdapter",
        },
        "5": {
            "inputs": {
                "text": f"2D sticker illustration character, {scene_prompt}, warm skin tone, "
                        f"simple flat cartoon eyes with thick black outline, clean vector line art, "
                        f"flat bright colors, sketchnote style, wearing blue cap and navy hoodie",
                "clip": ["1", 1],
            },
            "class_type": "CLIPTextEncode",
        },
        "6": {
            "inputs": {
                "text": "realistic, photo, 3d render, ugly, messy, distorted, text, letters, words, "
                        "writing, extra limbs, blurry, extra fingers, mutated hands",
                "clip": ["1", 1],
            },
            "class_type": "CLIPTextEncode",
        },
        "7": {"inputs": {"width": 512, "height": 512, "batch_size": 1}, "class_type": "EmptyLatentImage"},
        "8": {
            "inputs": {
                "seed": seed, "steps": 26, "cfg": 7.0, "sampler_name": "dpmpp_2m", "scheduler": "karras",
                "denoise": 1.0, "model": ["4", 0], "positive": ["5", 0], "negative": ["6", 0],
                "latent_image": ["7", 0],
            },
            "class_type": "KSampler",
        },
        "9": {"inputs": {"samples": ["8", 0], "vae": ["1", 2]}, "class_type": "VAEDecode"},
        "10": {"inputs": {"filename_prefix": f"EP20LoraDS_{out_suffix}", "images": ["9", 0]}, "class_type": "SaveImage"},
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
                    if "10" in outputs and "images" in outputs["10"]:
                        img_info = outputs["10"]["images"][0]
                        return img_info["filename"], img_info.get("subfolder", "")
        except Exception:
            pass
    return None, None


def main():
    for i, (suffix, scene_prompt, caption) in enumerate(VARIANTS):
        seed = 500000 + i * 137
        print(f"[{i+1}/{len(VARIANTS)}] Generating {suffix}...")
        workflow = build_workflow(scene_prompt, seed, suffix)
        filename, subfolder = queue_and_wait(workflow)
        if not filename:
            print(f"  FAILED: {suffix}")
            continue
        view_url = f"http://{COMFY_HOST}:{COMFY_PORT}/view?filename={urllib.parse.quote(filename)}&subfolder={urllib.parse.quote(subfolder)}&type=output"
        img_path = os.path.join(OUT_DIR, f"{suffix}.jpg")
        urllib.request.urlretrieve(view_url, img_path)
        caption_path = os.path.join(OUT_DIR, f"{suffix}.txt")
        with open(caption_path, "w", encoding="utf-8") as f:
            f.write(f"{TRIGGER}, {caption}")
        print(f"  Saved {img_path}")

    print("Done.")


if __name__ == "__main__":
    main()
