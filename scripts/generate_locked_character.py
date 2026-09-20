import os
import json
import urllib.request
import urllib.parse
from PIL import Image, ImageDraw, ImageFilter

COMFY_HOST = "127.0.0.1"
COMFY_PORT = 8188
COMFY_INPUT_DIR = r"C:\ai-tools\ComfyUI_windows_portable\ComfyUI\input"

def main():
    base_image_path = "videos/ep19-ate-suffix/assets/images/char_confused.jpg"
    im_orig = Image.open(base_image_path).convert("RGB")
    width, height = im_orig.size
    
    # 1. 정밀 마스크 생성 (눈, 눈썹, 입, 볼 땀방울)
    # 0 = 잠금(검정), 255 = 인페인팅 대상(흰색)
    mask = Image.new("L", (width, height), 0)
    draw = ImageDraw.Draw(mask)
    
    # 눈, 눈썹, 코, 입, 볼 (x: 390~630, y: 420~590)
    # 모자 챙(y < 420)과 턱 아래 수염(y > 590)은 철저히 보호
    draw.ellipse([395, 420, 625, 590], fill=255)
    
    # 블러로 자연스러운 경계선 형성
    mask_blurred = mask.filter(ImageFilter.GaussianBlur(radius=6))
    
    # RGB로 저장하여 ComfyUI의 ImageToMask(channel="red")로 전달
    mask_rgb = Image.merge("RGB", (mask_blurred, mask_blurred, mask_blurred))
    
    os.makedirs(COMFY_INPUT_DIR, exist_ok=True)
    base_filename = "confused_base_640.png"
    mask_filename = "confused_mask_640.png"
    
    # 빠른 고품질 생성을 위해 640x640으로 ComfyUI에 전달
    im_orig.resize((640, 640), Image.Resampling.LANCZOS).save(os.path.join(COMFY_INPUT_DIR, base_filename))
    mask_rgb.resize((640, 640), Image.Resampling.LANCZOS).save(os.path.join(COMFY_INPUT_DIR, mask_filename))
    
    prompt_text = (
        "funny shocked cartoon face, eyes tightly closed squeezed shut >< with wavy panicked eyebrows, "
        "mouth open wide in comical panic gasp showing teeth, cartoon sweat drops splashing off face, "
        "2D clean vector comic style, thick black ink outlines, flat vibrant colors"
    )
    negative_text = (
        "realistic, photo, 3d, dark, distorted anatomy, text, watermark, blurry"
    )
    
    workflow = {
        "3": {
            "inputs": {
                "seed": 987654321,
                "steps": 20,
                "cfg": 8.0,
                "sampler_name": "dpmpp_2m",
                "scheduler": "karras",
                "denoise": 0.88,
                "model": ["4", 0],
                "positive": ["6", 0],
                "negative": ["7", 0],
                "latent_image": ["13", 0]
            },
            "class_type": "KSampler"
        },
        "4": {
            "inputs": { "ckpt_name": "dreamshaper_8.safetensors" },
            "class_type": "CheckpointLoaderSimple"
        },
        "6": {
            "inputs": {
                "text": prompt_text,
                "clip": ["4", 1]
            },
            "class_type": "CLIPTextEncode"
        },
        "7": {
            "inputs": {
                "text": negative_text,
                "clip": ["4", 1]
            },
            "class_type": "CLIPTextEncode"
        },
        "8": {
            "inputs": { "samples": ["3", 0], "vae": ["4", 2] },
            "class_type": "VAEDecode"
        },
        "9": {
            "inputs": { "filename_prefix": "LockedInpaintFace", "images": ["8", 0] },
            "class_type": "SaveImage"
        },
        "10": {
            "inputs": { "image": base_filename, "upload": "image" },
            "class_type": "LoadImage"
        },
        "11": {
            "inputs": { "image": mask_filename, "upload": "image" },
            "class_type": "LoadImage"
        },
        "12": {
            "inputs": {
                "image": ["11", 0],
                "channel": "red"
            },
            "class_type": "ImageToMask"
        },
        "13": {
            "inputs": {
                "pixels": ["10", 0],
                "vae": ["4", 2],
                "mask": ["12", 0],
                "grow_mask_by": 4
            },
            "class_type": "VAEEncodeForInpaint"
        }
    }
    
    print("[Local AI] Sending inpaint request to ComfyUI...")
    req_data = json.dumps({"prompt": workflow}).encode("utf-8")
    req = urllib.request.Request(f"http://{COMFY_HOST}:{COMFY_PORT}/prompt", data=req_data, headers={"Content-Type": "application/json"})
    
    with urllib.request.urlopen(req) as resp:
        res = json.loads(resp.read().decode("utf-8"))
        prompt_id = res.get("prompt_id")
        print(f"[Local AI] Queued Inpaint task ID: {prompt_id}")
        
    import time
    output_filename = None
    subfolder = ""
    for _ in range(120):
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
        print("[Local AI] Inpaint timeout or failed.")
        return

    print(f"[Local AI] Generated raw inpaint image: {output_filename}")
    view_url = f"http://{COMFY_HOST}:{COMFY_PORT}/view?filename={urllib.parse.quote(output_filename)}&subfolder={urllib.parse.quote(subfolder)}&type=output"
    raw_inpaint_path = "scripts/raw_inpaint_face.png"
    urllib.request.urlretrieve(view_url, raw_inpaint_path)
    
    # 1024x1024로 복원
    inpaint_generated = Image.open(raw_inpaint_path).convert("RGBA").resize((width, height), Image.Resampling.LANCZOS)
    orig_rgba = im_orig.convert("RGBA")
    
    # 마스크 합성: 마스크(눈/입 표정) 영역만 inpaint_generated, 나머지는 100% 원본 유지
    final_composite = Image.composite(inpaint_generated, orig_rgba, mask_blurred)
    
    # 추가 안전장치: 모자 파형 로고, 가슴 파형 로고, WHY ARE THEY DIFFERENT?! 텍스트 영역을
    # 원본에서 픽셀 단위로 완벽하게 재보증 복사(Locking)
    # 1) 모자 파형 로고: [450, 290, 560, 360]
    cap_logo_crop = orig_rgba.crop([450, 290, 560, 360])
    final_composite.paste(cap_logo_crop, (450, 290))
    
    # 2) 가슴 파형 로고: [570, 720, 650, 785]
    chest_logo_crop = orig_rgba.crop([570, 720, 650, 785])
    final_composite.paste(chest_logo_crop, (570, 720))
    
    # 3) 가슴 텍스트 'WHY ARE THEY DIFFERENT?!': [340, 770, 680, 890]
    chest_text_crop = orig_rgba.crop([340, 770, 680, 890])
    final_composite.paste(chest_text_crop, (340, 770))
    
    # 4) 말풍선 전체 텍스트: [150, 80, 870, 390]
    bubble_crop = orig_rgba.crop([150, 80, 870, 390])
    final_composite.paste(bubble_crop, (150, 80))
    
    out_path = "videos/ep19-ate-suffix/assets/images/char_confused_step1_locked.jpg"
    final_composite.convert("RGB").save(out_path, quality=95)
    print(f"SUCCESS: Generated locked stop-motion image: {out_path}")

if __name__ == "__main__":
    main()
