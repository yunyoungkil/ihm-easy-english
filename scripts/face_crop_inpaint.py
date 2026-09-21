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
    
    # 1. 얼굴 영역 크롭 (370, 410, 650, 650) -> 크기 280x240
    crop_box = (370, 415, 650, 655)
    face_crop = orig_im.crop(crop_box)
    
    # 512x512로 리사이즈하여 ComfyUI가 선명한 얼굴 표정을 그리게 함
    face_512 = face_crop.resize((512, 512), Image.Resampling.LANCZOS)
    
    # 크롭된 얼굴 내에서 눈과 입 부분만 마스크 (모자 챙과 턱 아래 수염 제외)
    # 512x512 기준. 입 마스크는 원래 y:280에서 시작했는데, blur(radius=8)의 번짐이
    # 콧수염 자리(입 바로 위)까지 새어 들어가 콧수염이 통째로 사라지는 버그가 실측으로
    # 확인됨 — 입 마스크를 아래로 내리고(y:300) blur 반경도 줄여서 번짐이 콧수염 자리를
    # 침범하지 않게 함.
    # 눈/눈썹 영역: x: 70~440, y: 60~240
    # 입 영역: x: 150~360, y: 300~385 (콧수염 보호를 위해 위쪽 여백 확보)
    mask_crop = Image.new("L", (512, 512), 0)
    draw = ImageDraw.Draw(mask_crop)
    draw.ellipse([80, 70, 430, 240], fill=255)
    draw.ellipse([150, 300, 360, 385], fill=255)
    mask_blurred = mask_crop.filter(ImageFilter.GaussianBlur(radius=5))
    
    mask_rgb = Image.merge("RGB", (mask_blurred, mask_blurred, mask_blurred))
    
    os.makedirs(COMFY_INPUT_DIR, exist_ok=True)
    face_fn = "crop_face_512.png"
    mask_fn = "crop_mask_512.png"
    
    face_512.convert("RGB").save(os.path.join(COMFY_INPUT_DIR, face_fn))
    mask_rgb.save(os.path.join(COMFY_INPUT_DIR, mask_fn))
    
    prompt_text = (
        "close-up 2D cartoon face portrait, funny expression, both eyes completely shut scrunched closed, "
        "two simple curved closed-eye lines, both eyes perfectly symmetric and matching each other, "
        "simple flat black cartoon eyes with thick black outline and minimal shading, "
        "warm skin tone matching original, full mustache connecting to beard above upper lip, "
        "sweat drop on cheek, surprised mouth, clean vector line art, flat bright colors, cute comic style"
    )
    negative_text = (
        "dark shadows, realistic, photo, 3d render, ugly, messy, distorted, extra hair, beard covering eyes, "
        "blue eyes, green eyes, different eye color, pale skin, photorealistic eyes, detailed iris, glossy eyes, "
        "painterly shading, missing mustache, clean-shaven upper lip, bare skin above lip, "
        "asymmetric eyes, mismatched eyes, one eye open one eye closed, one eye more open than the other, "
        "wall-eyed, cross-eyed, uneven eyebrows, winking, half-closed eyes"
    )
    
    workflow = {
        "3": {
            "inputs": {
                "seed": 555888,
                "steps": 28,
                "cfg": 7.0,
                "sampler_name": "dpmpp_2m",
                "scheduler": "karras",
                # dreamshaper_8 is a plain (non-inpainting-specialized) checkpoint, so
                # VAEEncodeForInpaint blanks the masked area to flat grey before sampling —
                # at denoise 0.55 there isn't enough noise added to actually repaint that
                # blank fill, so it comes back as a grey smudge (confirmed by test render).
                # Needs to be high (~0.9) so the sampler treats the masked region as
                # near-fresh noise instead of "lightly refine this already-grey patch".
                "denoise": 0.8,
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
            "inputs": { "filename_prefix": "ComfyCropFace", "images": ["8", 0] },
            "class_type": "SaveImage"
        },
        "10": {
            "inputs": { "image": face_fn, "upload": "image" },
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
    
    print("[Face Crop Inpaint] Queuing task to ComfyUI...")
    req_data = json.dumps({"prompt": workflow}).encode("utf-8")
    req = urllib.request.Request(f"http://{COMFY_HOST}:{COMFY_PORT}/prompt", data=req_data, headers={"Content-Type": "application/json"})
    
    with urllib.request.urlopen(req) as resp:
        res = json.loads(resp.read().decode("utf-8"))
        prompt_id = res.get("prompt_id")
        
    import time
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
        print("[Face Crop Inpaint] Failed or timed out.")
        return

    print(f"[Face Crop Inpaint] Success: {output_filename}")
    view_url = f"http://{COMFY_HOST}:{COMFY_PORT}/view?filename={urllib.parse.quote(output_filename)}&subfolder={urllib.parse.quote(subfolder)}&type=output"
    temp_path = "scripts/comfy_crop_raw.png"
    urllib.request.urlretrieve(view_url, temp_path)
    
    # 생성된 512x512 얼굴 이미지를 마스크 블렌딩 후 원래 크기로 복원
    gen_crop = Image.open(temp_path).convert("RGBA")
    face_blended_512 = Image.composite(gen_crop, face_512.convert("RGBA"), mask_blurred)
    
    orig_crop_w = crop_box[2] - crop_box[0]
    orig_crop_h = crop_box[3] - crop_box[1]
    final_face_crop = face_blended_512.resize((orig_crop_w, orig_crop_h), Image.Resampling.LANCZOS)
    
    # 원본 1024 이미지의 원래 위치에 붙여넣기
    final_image = orig_im.copy()
    final_image.paste(final_face_crop, (crop_box[0], crop_box[1]))
    
    # 원본 브랜드 자산 100% 보장 (모자 로고, 가슴 로고, 가슴 텍스트, 말풍선 텍스트)
    final_image.paste(orig_im.crop([450, 290, 560, 360]), (450, 290))
    final_image.paste(orig_im.crop([570, 720, 650, 785]), (570, 720))
    final_image.paste(orig_im.crop([340, 770, 680, 890]), (340, 770))
    final_image.paste(orig_im.crop([150, 80, 870, 390]), (150, 80))
    
    out_path = "videos/ep19-ate-suffix/assets/images/char_confused_step1_locked.jpg"
    final_image.convert("RGB").save(out_path, quality=95)
    print(f"[Face Crop Inpaint] Final stopmotion pose saved to: {out_path}")

if __name__ == "__main__":
    main()
