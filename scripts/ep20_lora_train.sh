#!/bin/bash
# EP20 캐릭터 LoRA 학습 실행 스크립트
# 사전 조건: videos/ep20-world-rl/assets/lora-dataset/ 에 16장 이미지+caption(.txt) 생성 완료
set -e

PROJECT_ROOT="C:/Users/yunyo/Downloads/project"
SDSCRIPTS="C:/ai-tools/sd-scripts"
VENV_PY="$SDSCRIPTS/venv/Scripts/python.exe"
DATASET_SRC="$PROJECT_ROOT/videos/ep20-world-rl/assets/lora-dataset-v2"
DATASET_FORMATTED="$PROJECT_ROOT/videos/ep20-world-rl/assets/lora-dataset-v2-formatted/20_ep20hostchar"
BASE_CKPT="C:/ai-tools/ComfyUI_windows_portable/ComfyUI/models/checkpoints/dreamshaper_8.safetensors"
OUTPUT_DIR="$SDSCRIPTS/lora-output"

mkdir -p "$DATASET_FORMATTED"
mkdir -p "$OUTPUT_DIR"

# sd-scripts는 "<repeat수>_<개념이름>" 폴더 구조를 요구한다 (epoch당 이미지당 20회 반복)
cp "$DATASET_SRC"/*.jpg "$DATASET_FORMATTED/"
cp "$DATASET_SRC"/*.txt "$DATASET_FORMATTED/"

cd "$SDSCRIPTS"
export PYTHONIOENCODING=utf-8
export PYTHONUTF8=1
"$VENV_PY" -m accelerate.commands.launch \
  --num_cpu_threads_per_process 2 \
  --mixed_precision no \
  train_network.py \
  --pretrained_model_name_or_path="$BASE_CKPT" \
  --vae="C:/ai-tools/sd-scripts/vae-ft-mse-840000-ema-pruned.safetensors" \
  --train_data_dir="$PROJECT_ROOT/videos/ep20-world-rl/assets/lora-dataset-v2-formatted" \
  --caption_extension=".txt" \
  --output_dir="$OUTPUT_DIR" \
  --output_name="ep20hostchar_v2" \
  --resolution="512,512" \
  --enable_bucket \
  --min_bucket_reso=256 \
  --max_bucket_reso=1024 \
  --network_module=networks.lora \
  --network_dim=32 \
  --network_alpha=16 \
  --train_batch_size=1 \
  --max_train_epochs=10 \
  --learning_rate=1e-4 \
  --optimizer_type=AdamW \
  --lr_scheduler=cosine_with_restarts \
  --mixed_precision=no \
  --save_precision=fp16 \
  --cache_latents \
  --gradient_checkpointing \
  --mem_eff_attn \
  --save_every_n_epochs=2 \
  --seed=42 \
  --logging_dir="$OUTPUT_DIR/logs"
