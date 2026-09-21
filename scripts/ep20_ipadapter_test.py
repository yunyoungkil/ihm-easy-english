import json
import urllib.request
import urllib.parse
import time

COMFY_HOST = "127.0.0.1"
COMFY_PORT = 8188

workflow = {
    "1": {"inputs": {"ckpt_name": "dreamshaper_8.safetensors"}, "class_type": "CheckpointLoaderSimple"},
    "2": {"inputs": {"model": ["1", 0], "preset": "PLUS (high strength)"}, "class_type": "IPAdapterUnifiedLoader"},
    "3": {"inputs": {"image": "ep20_ipadapter_ref.jpg", "upload": "image"}, "class_type": "LoadImage"},
    "4": {
        "inputs": {
            "model": ["2", 0],
            "ipadapter": ["2", 1],
            "image": ["3", 0],
            "weight": 0.85,
            "start_at": 0.0,
            "end_at": 1.0,
            "weight_type": "standard",
        },
        "class_type": "IPAdapter",
    },
    "5": {
        "inputs": {
            "text": "2D sticker illustration character holding a smartphone with both hands, looking down at the phone screen with a confused puzzled expression, three-quarter body pose, warm skin tone, simple flat cartoon eyes with thick black outline, clean vector line art, flat bright colors, sketchnote style",
            "clip": ["1", 1],
        },
        "class_type": "CLIPTextEncode",
    },
    "6": {
        "inputs": {
            "text": "realistic, photo, 3d render, ugly, messy, distorted, text, letters, words, writing, extra limbs, blurry",
            "clip": ["1", 1],
        },
        "class_type": "CLIPTextEncode",
    },
    "7": {"inputs": {"width": 1024, "height": 1024, "batch_size": 1}, "class_type": "EmptyLatentImage"},
    "8": {
        "inputs": {
            "seed": 424242,
            "steps": 28,
            "cfg": 7.0,
            "sampler_name": "dpmpp_2m",
            "scheduler": "karras",
            "denoise": 1.0,
            "model": ["4", 0],
            "positive": ["5", 0],
            "negative": ["6", 0],
            "latent_image": ["7", 0],
        },
        "class_type": "KSampler",
    },
    "9": {"inputs": {"samples": ["8", 0], "vae": ["1", 2]}, "class_type": "VAEDecode"},
    "10": {"inputs": {"filename_prefix": "EP20IPAdapterTest", "images": ["9", 0]}, "class_type": "SaveImage"},
}

print("Queuing IP-Adapter pose-change test...")
req_data = json.dumps({"prompt": workflow}).encode("utf-8")
req = urllib.request.Request(
    f"http://{COMFY_HOST}:{COMFY_PORT}/prompt",
    data=req_data,
    headers={"Content-Type": "application/json"},
)
with urllib.request.urlopen(req) as resp:
    res = json.loads(resp.read().decode("utf-8"))
    prompt_id = res.get("prompt_id")
    print("prompt_id:", prompt_id)

output_filename = None
subfolder = ""
for i in range(90):
    time.sleep(2)
    hist_req = urllib.request.Request(f"http://{COMFY_HOST}:{COMFY_PORT}/history/{prompt_id}")
    try:
        with urllib.request.urlopen(hist_req) as hist_resp:
            hist_data = json.loads(hist_resp.read().decode("utf-8"))
            if prompt_id in hist_data and "outputs" in hist_data[prompt_id]:
                outputs = hist_data[prompt_id]["outputs"]
                if "10" in outputs and "images" in outputs["10"]:
                    img_info = outputs["10"]["images"][0]
                    output_filename = img_info["filename"]
                    subfolder = img_info.get("subfolder", "")
                    break
                if "status" in hist_data[prompt_id] and hist_data[prompt_id].get("status", {}).get("status_str") == "error":
                    print("ERROR:", hist_data[prompt_id]["status"])
                    break
    except Exception as e:
        pass
    if i % 5 == 0:
        print(f"...waiting ({i*2}s)")

if not output_filename:
    print("Failed or timed out.")
else:
    view_url = f"http://{COMFY_HOST}:{COMFY_PORT}/view?filename={urllib.parse.quote(output_filename)}&subfolder={urllib.parse.quote(subfolder)}&type=output"
    out_path = "videos/ep20-world-rl/assets/images/_ipadapter_test_pose_change.jpg"
    urllib.request.urlretrieve(view_url, out_path)
    print("Saved to", out_path)
