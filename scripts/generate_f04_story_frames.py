import os
import json
import urllib.request
import urllib.parse
import time

COMFY_HOST = "127.0.0.1"
COMFY_PORT = 8188
OUTPUT_DIR = "videos/ep19-ate-suffix/assets/images"

steps_config = [
    {
        "filename": "f04_story_step1.jpg",
        "prompt": (
            "2D clean vector comic illustration, a cartoon young man with neat beard wearing dark blue cap and navy hoodie, "
            "looking at open laptop and holding invoice paper document, confident talking face, "
            "thick clean black ink outlines, flat vibrant colors, warm cream background #F4EFE6, comic strip style"
        ),
        "seed": 100101
    },
    {
        "filename": "f04_story_step2.jpg",
        "prompt": (
            "2D clean vector comic illustration, the same cartoon young man with neat beard wearing dark blue cap and navy hoodie, "
            "shocked panic expression, big wide eyes, funny confusion, sweat drops flying, question marks around head, "
            "thick clean black ink outlines, flat vibrant colors, warm cream background #F4EFE6, comic strip style"
        ),
        "seed": 200202
    },
    {
        "filename": "f04_story_step3.jpg",
        "prompt": (
            "2D clean vector comic illustration, the same cartoon young man with neat beard wearing dark blue cap and navy hoodie, "
            "bright happy eureka realization, smiling face, bright glowing yellow lightbulb above head, pointing finger up, "
            "thick clean black ink outlines, flat vibrant colors, warm cream background #F4EFE6, comic strip style"
        ),
        "seed": 300303
    }
]

negative_prompt = (
    "ugly, blurry, low quality, 3d render, realistic photo, dark shadows, deformed anatomy, extra limbs, watermark, text"
)

def generate_step(cfg):
    workflow = {
        "3": {
            "inputs": {
                "seed": cfg["seed"],
                "steps": 20,
                "cfg": 7.5,
                "sampler_name": "dpmpp_2m",
                "scheduler": "karras",
                "denoise": 1.0,
                "model": ["4", 0],
                "positive": ["6", 0],
                "negative": ["7", 0],
                "latent_image": ["5", 0]
            },
            "class_type": "KSampler"
        },
        "4": {
            "inputs": { "ckpt_name": "dreamshaper_8.safetensors" },
            "class_type": "CheckpointLoaderSimple"
        },
        "5": {
            "inputs": { "width": 640, "height": 640, "batch_size": 1 },
            "class_type": "EmptyLatentImage"
        },
        "6": {
            "inputs": {
                "text": cfg["prompt"],
                "clip": ["4", 1]
            },
            "class_type": "CLIPTextEncode"
        },
        "7": {
            "inputs": {
                "text": negative_prompt,
                "clip": ["4", 1]
            },
            "class_type": "CLIPTextEncode"
        },
        "8": {
            "inputs": { "samples": ["3", 0], "vae": ["4", 2] },
            "class_type": "VAEDecode"
        },
        "9": {
            "inputs": { "filename_prefix": "F04Story", "images": ["8", 0] },
            "class_type": "SaveImage"
        }
    }
    
    print(f"[ComfyUI] Queuing {cfg['filename']}...")
    req_data = json.dumps({"prompt": workflow}).encode("utf-8")
    req = urllib.request.Request(f"http://{COMFY_HOST}:{COMFY_PORT}/prompt", data=req_data, headers={"Content-Type": "application/json"})
    
    with urllib.request.urlopen(req) as resp:
        res = json.loads(resp.read().decode("utf-8"))
        prompt_id = res.get("prompt_id")
        
    output_filename = None
    subfolder = ""
    for _ in range(60):
        time.sleep(1)
        hist_req = urllib.request.Request(f"http://{COMFY_HOST}:{COMFY_PORT}/history/{prompt_id}")
        try:
            with urllib.request.urlopen(hist_req) as hist_resp:
                hist_data = json.loads(hist_resp.read().decode("utf-8"))
                if prompt_id in hist_data and "outputs" in hist_data[prompt_id]:
                    outputs = hist_data[prompt_id]["outputs"]
                    if "9" in outputs and "images" in outputs["9"]:
                        img_info = outputs["9"]["images"][0]
                        output_filename = img_info["filename"]
                        subfolder = img_info.get("subfolder", "")
                        break
        except Exception:
            pass

    if not output_filename:
        print(f"[ComfyUI] Failed to generate {cfg['filename']}")
        return False

    view_url = f"http://{COMFY_HOST}:{COMFY_PORT}/view?filename={urllib.parse.quote(output_filename)}&subfolder={urllib.parse.quote(subfolder)}&type=output"
    save_path = os.path.join(OUTPUT_DIR, cfg["filename"])
    urllib.request.urlretrieve(view_url, save_path)
    print(f"[ComfyUI] Successfully saved to {save_path}")
    return True

def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    for cfg in steps_config:
        generate_step(cfg)

if __name__ == "__main__":
    main()
