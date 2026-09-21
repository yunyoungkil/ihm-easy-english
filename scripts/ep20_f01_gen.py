import json
import os
import urllib.request
import urllib.parse
import time
import shutil

COMFY_HOST = "127.0.0.1"
COMFY_PORT = 8188
COMFY_INPUT_DIR = r"C:\ai-tools\ComfyUI_windows_portable\ComfyUI\input"

OUT_DIR = "videos/ep20-world-rl/assets/images"

VARIANTS = [
    ("f01_react_00_neutral", "calmly holding a smartphone up at chest height with right hand, looking at the "
     "screen with a relaxed neutral expression, mild closed-mouth smile, left arm relaxed at side, "
     "close bust portrait", 0.65, False),
    ("f01_react_01_confused", "holding a smartphone near face, head tilted, one eyebrow raised, confused "
     "puzzled expression, NOT smiling, mouth in a flat concerned line, other hand rising toward chin, "
     "close bust portrait", 0.55, True),
    ("f01_react_02_surprised", "leaning back slightly, eyes wide open, mouth open in surprise, NOT smiling, "
     "startled worried expression, one hand near open mouth, holding smartphone close to chest, "
     "close bust portrait", 0.55, True),
    ("f01_react_03_shocked", "both arms thrown up dramatically near head, extremely shocked panicked "
     "expression, NOT smiling, mouth wide open shouting in distress, eyes wide with fear, worried "
     "expression, head tilted back, sweat drop, close bust portrait", 0.55, True),
]


def build_workflow(pose_file, scene_prompt, seed, out_suffix, ip_weight=0.65, anti_smile=False):
    negative_text = ("realistic, photo, 3d render, ugly, messy, distorted, text, letters, words, "
                      "writing, extra limbs, blurry, extra fingers, mutated hands, two people, "
                      "duplicate, twins, three people, full body, legs, standing")
    if anti_smile:
        negative_text += ", smiling, happy, cheerful, grinning, celebrating, joy, laughing"
    return {
        "1": {"inputs": {"ckpt_name": "dreamshaper_8.safetensors"}, "class_type": "CheckpointLoaderSimple"},
        "2": {"inputs": {"model": ["1", 0], "preset": "PLUS (high strength)"}, "class_type": "IPAdapterUnifiedLoader"},
        "3": {"inputs": {"image": "ep20_ipadapter_ref.jpg", "upload": "image"}, "class_type": "LoadImage"},
        "4": {
            "inputs": {
                "model": ["2", 0], "ipadapter": ["2", 1], "image": ["3", 0],
                "weight": ip_weight, "start_at": 0.0, "end_at": 1.0, "weight_type": "standard",
            },
            "class_type": "IPAdapter",
        },
        "5": {
            "inputs": {
                "text": f"ep20hostchar, 2D sticker illustration character, {scene_prompt}, warm skin tone, "
                        f"simple flat cartoon eyes with thick black outline, clean vector line art, "
                        f"flat bright colors, sketchnote style, wearing blue cap and navy hoodie",
                "clip": ["1", 1],
            },
            "class_type": "CLIPTextEncode",
        },
        "6": {
            "inputs": {
                "text": negative_text,
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
                "seed": seed, "steps": 28, "cfg": 7.0, "sampler_name": "dpmpp_2m", "scheduler": "karras",
                "denoise": 1.0, "model": ["4", 0], "positive": ["9", 0], "negative": ["9", 1],
                "latent_image": ["10", 0],
            },
            "class_type": "KSampler",
        },
        "12": {"inputs": {"samples": ["11", 0], "vae": ["1", 2]}, "class_type": "VAEDecode"},
        "13": {"inputs": {"filename_prefix": f"EP20F01_{out_suffix}", "images": ["12", 0]}, "class_type": "SaveImage"},
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
    # copy pose skeletons into comfyui input
    for pose_file, _, _, _ in VARIANTS:
        src = f"videos/ep20-world-rl/assets/pose-skeletons/{pose_file}.png"
        dst = os.path.join(COMFY_INPUT_DIR, f"{pose_file}.png")
        shutil.copy(src, dst)

    for i, (pose_file, scene_prompt, ip_weight, anti_smile) in enumerate(VARIANTS):
        seed = 700000 + i * 211
        print(f"[{i+1}/{len(VARIANTS)}] Generating {pose_file}...")
        workflow = build_workflow(pose_file, scene_prompt, seed, pose_file, ip_weight, anti_smile)
        filename, subfolder = queue_and_wait(workflow)
        if not filename:
            print(f"  FAILED: {pose_file}")
            continue
        view_url = f"http://{COMFY_HOST}:{COMFY_PORT}/view?filename={urllib.parse.quote(filename)}&subfolder={urllib.parse.quote(subfolder)}&type=output"
        img_path = os.path.join(OUT_DIR, f"{pose_file}.jpg")
        urllib.request.urlretrieve(view_url, img_path)
        print(f"  Saved {img_path}")

    print("Done.")


if __name__ == "__main__":
    main()
