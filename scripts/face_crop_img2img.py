import os
import json
import urllib.request
import urllib.parse
from PIL import Image

COMFY_HOST = "127.0.0.1"
COMFY_PORT = 8188
COMFY_INPUT_DIR = r"C:\ai-tools\ComfyUI_windows_portable\ComfyUI\input"

def main():
    base_image_path = "videos/ep19-ate-suffix/assets/images/char_confused.jpg"
    orig_im = Image.open(base_image_path).convert("RGBA")
    
    # 1. 얼굴 영역만 크롭 (모자 챙 아래 ~ 턱수염 하단)
    # [380, 420, 640, 650]
    crop_box = (380, 420, 640, 650)
    face_crop = orig_im.crop(crop_box)
    face_512 = face_crop.resize((512, 512), Image.Resampling.LANCZOS)
    
    face_fn = "face_img2img_512.png"
    face_512.convert("RGB").save(os.path.join(COMFY_INPUT_DIR, face_fn))
    
    # 프롬프트: 눈을 질끈 감고 당황한 표정, 피부색과 수염 유지
    prompt_text = (
        "close-up portrait of the same cartoon man, comical panic expression, (eyes tightly closed shut:1.4), "
        "(squinting eyes:1.3), cute anime > < eyes, eyebrows trembling, sweat droplet, open mouth shouting in panic, neat beard, clean smooth 2D vector art, flat colors"
    )
    negative_text = (
        "open eyes, big eyes, different person, realistic photo, 3d, dark shadow, ugly, distorted, change beard, change face shape"
    )
    
    # 일반 Img2Img (마스크 없이 크롭 얼굴 전체를 denoise 0.58로 확실하게 표정 변형)
    workflow = {
        "3": {
            "inputs": {
                "seed": 999888,
                "steps": 22,
                "cfg": 7.5,
                "sampler_name": "dpmpp_2m",
                "scheduler": "karras",
                "denoise": 0.58,  # 0.58로 눈을 감은 표정 확실하게 생성
                "model": ["4", 0],
                "positive": ["6", 0],
                "negative": ["7", 0],
                "latent_image": ["11", 0]
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
            "inputs": { "filename_prefix": "FaceImg2Img", "images": ["8", 0] },
            "class_type": "SaveImage"
        },
        "10": {
            "inputs": { "image": face_fn, "upload": "image" },
            "class_type": "LoadImage"
        },
        "11": {
            "inputs": { "pixels": ["10", 0], "vae": ["4", 2] },
            "class_type": "VAEEncode"
        }
    }
    
    print("[Face Img2Img] Sending request to ComfyUI...")
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
        print("[Face Img2Img] Timed out.")
        return

    print(f"[Face Img2Img] Success: {output_filename}")
    view_url = f"http://{COMFY_HOST}:{COMFY_PORT}/view?filename={urllib.parse.quote(output_filename)}&subfolder={urllib.parse.quote(subfolder)}&type=output"
    temp_path = "scripts/comfy_face_img2img_raw.png"
    urllib.request.urlretrieve(view_url, temp_path)
    
    # 크롭 영역 크기로 리사이즈
    orig_w = crop_box[2] - crop_box[0]
    orig_h = crop_box[3] - crop_box[1]
    gen_face = Image.open(temp_path).convert("RGBA").resize((orig_w, orig_h), Image.Resampling.LANCZOS)
    
    # 원본 이미지에 결합
    final_image = orig_im.copy()
    final_image.paste(gen_face, (crop_box[0], crop_box[1]))
    
    # 브랜드 자산 100% 픽셀 잠금
    final_image.paste(orig_im.crop([450, 290, 560, 360]), (450, 290))
    final_image.paste(orig_im.crop([570, 720, 650, 785]), (570, 720))
    final_image.paste(orig_im.crop([340, 770, 680, 890]), (340, 770))
    final_image.paste(orig_im.crop([150, 80, 870, 390]), (150, 80))
    
    # Separate filename from face_crop_inpaint.py's output — this script pastes the
    # whole regenerated crop with no mask blend (harder seam), so it's a comparison
    # test, not the canonical result. Don't let it silently overwrite the masked version.
    out_path = "videos/ep19-ate-suffix/assets/images/char_confused_step1_locked_nomask_test.jpg"
    final_image.convert("RGB").save(out_path, quality=95)
    print(f"[Face Img2Img] Saved to {out_path}")

if __name__ == "__main__":
    main()
