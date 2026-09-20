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
    orig_im = Image.open(base_image_path).convert("RGBA")
    width, height = orig_im.size
    
    # 1. 정밀 마스크: 눈/눈썹 영역만 정확히 선택 (모자 챙과 수염은 완전히 제외)
    # 눈 영역: x: 405~595, y: 440~520
    # 입 영역: x: 440~560, y: 545~585
    mask = Image.new("L", (width, height), 0)
    draw = ImageDraw.Draw(mask)
    
    # 눈과 눈썹 영역
    draw.ellipse([405, 435, 595, 520], fill=255)
    # 입 영역
    draw.ellipse([445, 545, 555, 585], fill=255)
    
    # 블러 반경 8로 경계 부드럽게
    mask_blurred = mask.filter(ImageFilter.GaussianBlur(radius=8))
    
    # ComfyUI용 RGB 마스크 저장 (640x640)
    mask_rgb = Image.merge("RGB", (mask_blurred, mask_blurred, mask_blurred))
    
    os.makedirs(COMFY_INPUT_DIR, exist_ok=True)
    base_fn = "confused_face_640.png"
    mask_fn = "confused_mask_face_640.png"
    
    orig_im.convert("RGB").resize((640, 640), Image.Resampling.LANCZOS).save(os.path.join(COMFY_INPUT_DIR, base_fn))
    mask_rgb.resize((640, 640), Image.Resampling.LANCZOS).save(os.path.join(COMFY_INPUT_DIR, mask_fn))
    
    # 프롬프트: 표정 변화 (눈을 감고 당황한 귀여운 표정)
    prompt_text = (
        "facial expression variation, comical panicked face, tightly shut squinting eyes > <, "
        "wavy trembling eyebrows, comical sweat drop, open mouth gasping in surprise, "
        "2D comic vector illustration, clean black outlines, flat colors, cartoon character"
    )
    negative_text = (
        "hair on face, extra forehead hair, messy shading, dirty face, realistic photo, 3d render, blurry, distorted"
    )
    
    workflow = {
        "3": {
            "inputs": {
                "seed": 777123,
                "steps": 22,
                "cfg": 7.5,
                "sampler_name": "dpmpp_2m",
                "scheduler": "karras",
                "denoise": 0.52,  # 0.52로 원본 얼굴 골격과 피부톤 유지하며 표정만 리터칭
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
            "inputs": { "filename_prefix": "ComfyFacePose", "images": ["8", 0] },
            "class_type": "SaveImage"
        },
        "10": {
            "inputs": { "image": base_fn, "upload": "image" },
            "class_type": "LoadImage"
        },
        "11": {
            "inputs": { "image": mask_fn, "upload": "image" },
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
    
    print("[ComfyUI] Sending Inpainting request with Denoise 0.52...")
    req_data = json.dumps({"prompt": workflow}).encode("utf-8")
    req = urllib.request.Request(f"http://{COMFY_HOST}:{COMFY_PORT}/prompt", data=req_data, headers={"Content-Type": "application/json"})
    
    with urllib.request.urlopen(req) as resp:
        res = json.loads(resp.read().decode("utf-8"))
        prompt_id = res.get("prompt_id")
        print(f"[ComfyUI] Queued Prompt ID: {prompt_id}")
        
    import time
    output_filename = None
    subfolder = ""
    for _ in range(90):
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
        print("[ComfyUI] Generation failed or timed out.")
        return

    print(f"[ComfyUI] Generated image: {output_filename}")
    view_url = f"http://{COMFY_HOST}:{COMFY_PORT}/view?filename={urllib.parse.quote(output_filename)}&subfolder={urllib.parse.quote(subfolder)}&type=output"
    temp_path = "scripts/comfy_face_raw.png"
    urllib.request.urlretrieve(view_url, temp_path)
    
    # 1024x1024 업스케일
    generated_im = Image.open(temp_path).convert("RGBA").resize((width, height), Image.Resampling.LANCZOS)
    
    # 마스크 합성 (오직 눈/입 마스크 영역만 적용)
    final_composite = Image.composite(generated_im, orig_im, mask_blurred)
    
    # 원본 브랜드 자산 100% 픽셀 잠금
    # 1. 모자 파형 로고
    final_composite.paste(orig_im.crop([450, 290, 560, 360]), (450, 290))
    # 2. 가슴 파형 로고
    final_composite.paste(orig_im.crop([570, 720, 650, 785]), (570, 720))
    # 3. 가슴 영문 문구 "WHY ARE THEY DIFFERENT?!"
    final_composite.paste(orig_im.crop([340, 770, 680, 890]), (340, 770))
    # 4. 상단 말풍선 영문 텍스트
    final_composite.paste(orig_im.crop([150, 80, 870, 390]), (150, 80))
    # 5. 수염 라인 전체 (턱 아래)
    final_composite.paste(orig_im.crop([390, 585, 610, 650]), (390, 585))
    
    out_path = "videos/ep19-ate-suffix/assets/images/char_confused_step1_locked.jpg"
    final_composite.convert("RGB").save(out_path, quality=95)
    print(f"[ComfyUI] SUCCESS: Saved locked stopmotion pose to: {out_path}")

if __name__ == "__main__":
    main()
