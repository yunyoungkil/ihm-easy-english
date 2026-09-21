import os
import json
import urllib.request
import urllib.parse
import time
from PIL import Image, ImageDraw, ImageFilter

COMFY_HOST = "127.0.0.1"
COMFY_PORT = 8188
COMFY_INPUT_DIR = r"C:\ai-tools\ComfyUI_windows_portable\ComfyUI\input"

def run_variant(expression_name, prompt_text, negative_text, seed, out_suffix):
    base_image_path = "videos/ep20-world-rl/assets/images/char_clean_base.jpg"
    orig_im = Image.open(base_image_path).convert("RGBA")

    crop_box = (300, 250, 680, 560)  # 380x310
    face_crop = orig_im.crop(crop_box)
    face_512 = face_crop.resize((512, 512), Image.Resampling.LANCZOS)

    mask_crop = Image.new("L", (512, 512), 0)
    draw = ImageDraw.Draw(mask_crop)
    draw.ellipse([100, 40, 430, 120], fill=255)   # eyes/brows band (raised to actually hit eyes)
    draw.ellipse([150, 170, 370, 300], fill=255)  # mouth band (raised to actually hit mouth, not chin)
    mask_blurred = mask_crop.filter(ImageFilter.GaussianBlur(radius=5))

    os.makedirs(COMFY_INPUT_DIR, exist_ok=True)
    face_fn = f"ep20_face_{out_suffix}.png"
    mask_fn = f"ep20_mask_{out_suffix}.png"
    face_512.convert("RGB").save(os.path.join(COMFY_INPUT_DIR, face_fn))
    mask_blurred.save(os.path.join(COMFY_INPUT_DIR, mask_fn))

    workflow = {
        "3": {
            "inputs": {
                "seed": seed, "steps": 28, "cfg": 7.0,
                "sampler_name": "dpmpp_2m", "scheduler": "karras",
                "denoise": 0.8,
                "model": ["4", 0], "positive": ["6", 0], "negative": ["7", 0],
                "latent_image": ["13", 0]
            },
            "class_type": "KSampler"
        },
        "4": {"inputs": {"ckpt_name": "dreamshaper_8.safetensors"}, "class_type": "CheckpointLoaderSimple"},
        "6": {"inputs": {"text": prompt_text, "clip": ["4", 1]}, "class_type": "CLIPTextEncode"},
        "7": {"inputs": {"text": negative_text, "clip": ["4", 1]}, "class_type": "CLIPTextEncode"},
        "8": {"inputs": {"samples": ["3", 0], "vae": ["4", 2]}, "class_type": "VAEDecode"},
        "9": {"inputs": {"filename_prefix": f"EP20Face{out_suffix}", "images": ["8", 0]}, "class_type": "SaveImage"},
        "10": {"inputs": {"image": face_fn, "upload": "image"}, "class_type": "LoadImage"},
        "11": {"inputs": {"image": mask_fn, "upload": "image"}, "class_type": "LoadImage"},
        "12": {"inputs": {"image": ["11", 0], "channel": "red"}, "class_type": "ImageToMask"},
        "13": {"inputs": {"pixels": ["10", 0], "vae": ["4", 2], "mask": ["12", 0], "grow_mask_by": 4}, "class_type": "VAEEncodeForInpaint"}
    }

    print(f"[{expression_name}] Queuing...")
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
        print(f"[{expression_name}] Failed or timed out.")
        return

    view_url = f"http://{COMFY_HOST}:{COMFY_PORT}/view?filename={urllib.parse.quote(output_filename)}&subfolder={urllib.parse.quote(subfolder)}&type=output"
    temp_path = f"scripts/_ep20_raw_{out_suffix}.png"
    urllib.request.urlretrieve(view_url, temp_path)

    gen_crop = Image.open(temp_path).convert("RGBA")
    face_blended_512 = Image.composite(gen_crop, face_512.convert("RGBA"), mask_blurred)

    orig_crop_w = crop_box[2] - crop_box[0]
    orig_crop_h = crop_box[3] - crop_box[1]
    final_face_crop = face_blended_512.resize((orig_crop_w, orig_crop_h), Image.Resampling.LANCZOS)

    # ⚠️ The inner eyes/mouth mask was already soft-blended above, but the OUTER edge of
    # this whole crop rectangle was being pasted back with a hard, fully-opaque edge —
    # that hard rectangle boundary against the untouched native-resolution image (plus the
    # resize-up/resize-down round trip softening this patch slightly) is exactly the visible
    # "cut-and-pasted" seam a viewer would notice. Feather the crop's own edges so it fades
    # into the surrounding original pixels instead of a hard cut.
    feather_px = 28
    edge_mask = Image.new("L", (orig_crop_w, orig_crop_h), 0)
    edge_draw = ImageDraw.Draw(edge_mask)
    edge_draw.rectangle(
        [feather_px, feather_px, orig_crop_w - feather_px, orig_crop_h - feather_px],
        fill=255,
    )
    edge_mask = edge_mask.filter(ImageFilter.GaussianBlur(radius=feather_px / 2))

    final_image = orig_im.copy()
    final_image.paste(final_face_crop, (crop_box[0], crop_box[1]), mask=edge_mask)

    # Pixel-lock brand areas from the ORIGINAL base (cap logo + hoodie logo), using the
    # same base image throughout since pose never changes here (only face expression does).
    # Coordinates estimated from char_clean_base.jpg (1024x1024) — cap logo band + hoodie chest logo band.
    final_image.paste(orig_im.crop([420, 90, 620, 210]), (420, 90))    # cap logo
    final_image.paste(orig_im.crop([540, 620, 720, 740]), (540, 620))  # hoodie chest logo

    out_path = f"videos/ep20-world-rl/assets/images/f01_{out_suffix}.jpg"
    final_image.convert("RGB").save(out_path, quality=95)
    print(f"[{expression_name}] Saved to {out_path}")

if __name__ == "__main__":
    run_variant(
        "Confused",
        "close-up 2D sticker illustration face, puzzled confused expression, one eyebrow raised, slight frown, eyes narrowed in confusion, simple flat cartoon eyes with thick black outline, dark brown eyes, warm skin tone, clean vector line art, flat bright colors",
        "realistic, photo, 3d render, ugly, messy, distorted, text, letters, words, writing, logo distortion, blue eyes, different eye color, photorealistic eyes, detailed iris, asymmetric eyes, mismatched eyes",
        111222, "step2_confused"
    )
    run_variant(
        "Surprised",
        "close-up 2D sticker illustration face, surprised shocked expression, both eyes wide open completely symmetric, eyebrows raised high, mouth open in an O shape, simple flat cartoon eyes with thick black outline, dark brown eyes, warm skin tone, clean vector line art, flat bright colors",
        "realistic, photo, 3d render, ugly, messy, distorted, text, letters, words, writing, logo distortion, blue eyes, different eye color, photorealistic eyes, detailed iris, asymmetric eyes, mismatched eyes, closed eyes",
        222333, "step3_surprised"
    )
    run_variant(
        "Shocked",
        "close-up 2D sticker illustration face, extremely shocked panicked expression, both eyes wide open completely symmetric, eyebrows raised very high with worry lines, mouth wide open shouting, sweat drop, simple flat cartoon eyes with thick black outline, dark brown eyes, warm skin tone, clean vector line art, flat bright colors",
        "realistic, photo, 3d render, ugly, messy, distorted, text, letters, words, writing, logo distortion, blue eyes, different eye color, photorealistic eyes, detailed iris, asymmetric eyes, mismatched eyes, closed eyes, calm expression",
        333444, "step4_shocked"
    )
