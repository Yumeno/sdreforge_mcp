import os

presets_dir = "presets"

# Define remaining presets
remaining_presets = {
    "10_txt2img_cn4_rp_mask.yaml": """# (10) txt2img CN4 + Regional Prompter Mask mode
name: txt2img_cn4_rp_mask
type: txt2img
description: "txt2img with ControlNet Anytest4 + Regional Prompter Mask"

base_settings:
  checkpoint: "animagineXL40_v4Opt"
  sampler_name: "Euler a"
  scheduler: "Automatic"
  steps: 20
  cfg_scale: 7
  width: 1024
  height: 1024
  seed: -1
  batch_size: 1
  n_iter: 1
  enable_hr: false
  denoising_strength: 0.4
  clip_skip: 2

prompt_template:
  positive_prefix: ""
  positive_suffix: "masterpiece, best quality"
  negative: "worst quality, low quality, normal quality"

extensions:
  adetailer:
    enabled: true
    models:
      - model: "face_yolov8n.pt"
        prompt: "detailed face, beautiful eyes"
        confidence: 0.3

  controlnet:
    enabled: true
    units:
      - module: "none"
        model: "CN-Anytest4_animagine4_A"
        weight: 1.0
        guidance_start: 0.0
        guidance_end: 1.0
        control_mode: 0
        pixel_perfect: true

  regional_prompter:
    enabled: true
    mode: "Mask"
""",
    "11_img2img_cn3_rp_matrix.yaml": """# (11) img2img CN3 + Regional Prompter Matrix mode
name: img2img_cn3_rp_matrix
type: img2img
description: "img2img with ControlNet Anytest3 + Regional Prompter Matrix"

base_settings:
  checkpoint: "animagineXL40_v4Opt"
  sampler_name: "Euler a"
  scheduler: "Automatic"
  steps: 20
  cfg_scale: 7
  width: 1024
  height: 1024
  seed: -1
  batch_size: 1
  n_iter: 1
  denoising_strength: 0.5
  clip_skip: 2
  resize_mode: 0
  inpainting_fill: 1

prompt_template:
  positive_prefix: ""
  positive_suffix: "masterpiece, best quality"
  negative: "worst quality, low quality, normal quality"

extensions:
  adetailer:
    enabled: true
    models:
      - model: "face_yolov8n.pt"
        prompt: "detailed face, beautiful eyes"
        confidence: 0.3

  controlnet:
    enabled: true
    units:
      - module: "none"
        model: "CN-Anytest3_animagine4_A"
        weight: 1.0
        guidance_start: 0.0
        guidance_end: 1.0
        control_mode: 0
        pixel_perfect: true

  regional_prompter:
    enabled: true
    mode: "Matrix"
    divide_ratio: "1,1"
""",
    "12_img2img_cn3_rp_mask.yaml": """# (12) img2img CN3 + Regional Prompter Mask mode
name: img2img_cn3_rp_mask
type: img2img
description: "img2img with ControlNet Anytest3 + Regional Prompter Mask"

base_settings:
  checkpoint: "animagineXL40_v4Opt"
  sampler_name: "Euler a"
  scheduler: "Automatic"
  steps: 20
  cfg_scale: 7
  width: 1024
  height: 1024
  seed: -1
  batch_size: 1
  n_iter: 1
  denoising_strength: 0.5
  clip_skip: 2
  resize_mode: 0
  inpainting_fill: 1

prompt_template:
  positive_prefix: ""
  positive_suffix: "masterpiece, best quality"
  negative: "worst quality, low quality, normal quality"

extensions:
  adetailer:
    enabled: true
    models:
      - model: "face_yolov8n.pt"
        prompt: "detailed face, beautiful eyes"
        confidence: 0.3

  controlnet:
    enabled: true
    units:
      - module: "none"
        model: "CN-Anytest3_animagine4_A"
        weight: 1.0
        guidance_start: 0.0
        guidance_end: 1.0
        control_mode: 0
        pixel_perfect: true

  regional_prompter:
    enabled: true
    mode: "Mask"
""",
    "13_img2img_cn4_rp_matrix.yaml": """# (13) img2img CN4 + Regional Prompter Matrix mode
name: img2img_cn4_rp_matrix
type: img2img
description: "img2img with ControlNet Anytest4 + Regional Prompter Matrix"

base_settings:
  checkpoint: "animagineXL40_v4Opt"
  sampler_name: "Euler a"
  scheduler: "Automatic"
  steps: 20
  cfg_scale: 7
  width: 1024
  height: 1024
  seed: -1
  batch_size: 1
  n_iter: 1
  denoising_strength: 0.5
  clip_skip: 2
  resize_mode: 0
  inpainting_fill: 1

prompt_template:
  positive_prefix: ""
  positive_suffix: "masterpiece, best quality"
  negative: "worst quality, low quality, normal quality"

extensions:
  adetailer:
    enabled: true
    models:
      - model: "face_yolov8n.pt"
        prompt: "detailed face, beautiful eyes"
        confidence: 0.3

  controlnet:
    enabled: true
    units:
      - module: "none"
        model: "CN-Anytest4_animagine4_A"
        weight: 1.0
        guidance_start: 0.0
        guidance_end: 1.0
        control_mode: 0
        pixel_perfect: true

  regional_prompter:
    enabled: true
    mode: "Matrix"
    divide_ratio: "1,1"
""",
    "14_img2img_cn4_rp_mask.yaml": """# (14) img2img CN4 + Regional Prompter Mask mode
name: img2img_cn4_rp_mask
type: img2img
description: "img2img with ControlNet Anytest4 + Regional Prompter Mask"

base_settings:
  checkpoint: "animagineXL40_v4Opt"
  sampler_name: "Euler a"
  scheduler: "Automatic"
  steps: 20
  cfg_scale: 7
  width: 1024
  height: 1024
  seed: -1
  batch_size: 1
  n_iter: 1
  denoising_strength: 0.5
  clip_skip: 2
  resize_mode: 0
  inpainting_fill: 1

prompt_template:
  positive_prefix: ""
  positive_suffix: "masterpiece, best quality"
  negative: "worst quality, low quality, normal quality"

extensions:
  adetailer:
    enabled: true
    models:
      - model: "face_yolov8n.pt"
        prompt: "detailed face, beautiful eyes"
        confidence: 0.3

  controlnet:
    enabled: true
    units:
      - module: "none"
        model: "CN-Anytest4_animagine4_A"
        weight: 1.0
        guidance_start: 0.0
        guidance_end: 1.0
        control_mode: 0
        pixel_perfect: true

  regional_prompter:
    enabled: true
    mode: "Mask"
""",
    "17_extras_upscale_fatal_anime.yaml": """# (17) Extras Upscale with 4x_fatal_anime_500000_G
name: extras_upscale_fatal_anime
type: extras
description: "Upscale image using 4x_fatal_anime_500000_G model"

settings:
  upscaling_resize: 4
  upscaler_1: "4x_fatal_anime_500000_G"
  extras_upscaler_2_visibility: 0
  gfpgan_visibility: 0
  codeformer_visibility: 0
  codeformer_weight: 0
""",
    "18_extras_rembg_u2net.yaml": """# (18) Extras Remove Background with u2net
name: extras_rembg_u2net
type: extras
description: "Remove background using u2net model"

settings:
  rembg_model: "u2net"
""",
    "19_extras_rembg_isnet_anime.yaml": """# (19) Extras Remove Background with isnet_anime
name: extras_rembg_isnet_anime
type: extras
description: "Remove background using isnet_anime model"

settings:
  rembg_model: "isnet_anime"
""",
    "20_tagger_wd_eva02.yaml": """# (20) Tagger with wd-EVA02-Large-v3
name: tagger_wd_eva02
type: tagger
description: "Tag images using wd-EVA02-Large-v3 model"

settings:
  model: "wd-EVA02-Large-v3"
  threshold: 0.35
"""
}

# Create each file
for filename, content in remaining_presets.items():
    filepath = os.path.join(presets_dir, filename)
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"Created {filename}")

print(f"\nTotal files created: {len(remaining_presets)}")
