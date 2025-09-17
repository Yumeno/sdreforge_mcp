/**
 * Preset Type Definitions
 */

/**
 * Base preset structure
 */
export interface Preset {
  name: string;
  description?: string;
  type: 'txt2img' | 'img2img' | 'png-info' | 'extras' | 'extras-single-image' | 'extras-batch-images' |
        'interrogate' | 'progress' | 'options-get' | 'options-set' | 'models' |
        'refresh' | 'samplers' | 'unload-checkpoint' | 'rembg' | 'tagger' | 'utility';
  base_settings?: BaseSettings;
  settings?: Record<string, any>;  // For utility presets
  extensions?: Extensions;
  prompt_template?: {
    positive_prefix?: string;
    positive_suffix?: string;
    negative?: string;
  };
}

/**
 * Base generation settings
 */
export interface BaseSettings {
  // プロンプト
  prompt_suffix?: string;
  negative_prompt?: string;

  // 基本パラメータ
  steps?: number;
  cfg_scale?: number;
  width?: number;
  height?: number;
  sampler_name?: string;
  scheduler?: string;
  batch_size?: number;
  n_iter?: number;
  seed?: number;
  subseed?: number;
  subseed_strength?: number;
  seed_resize_from_h?: number;
  seed_resize_from_w?: number;

  // モデル設定
  model?: string;
  checkpoint?: string;  // SD WebUI用のチェックポイント名
  vae?: string;
  clip_skip?: number;

  // img2img特有
  init_images?: string[];
  denoising_strength?: number;
  resize_mode?: number;
  mask?: string;
  mask_blur?: number;
  mask_blur_x?: number;
  mask_blur_y?: number;
  inpainting_fill?: number;
  inpaint_full_res?: boolean;
  inpaint_full_res_padding?: number;
  inpainting_mask_invert?: number;
  image_cfg_scale?: number;
  sketch?: string;

  // Hires Fix
  enable_hr?: boolean;
  hr_scale?: number;
  hr_upscaler?: string;
  hr_second_pass_steps?: number;
  hr_resize_x?: number;
  hr_resize_y?: number;
  hr_prompt?: string;
  hr_negative_prompt?: string;

  // Refiner (SDXL)
  refiner_checkpoint?: string;
  refiner_switch_at?: number;

  // その他
  restore_faces?: boolean;
  tiling?: boolean;
  eta?: number;
  s_churn?: number;
  s_tmax?: number;
  s_tmin?: number;
  s_noise?: number;
}

/**
 * Extension configurations
 */
export interface Extensions {
  adetailer?: ADetailerConfig;
  controlnet?: ControlNetConfig;
  regional_prompter?: RegionalPrompterConfig;
  dynamic_prompts?: DynamicPromptsConfig;
  latent_couple?: LatentCoupleConfig;
  tiled_diffusion?: TiledDiffusionConfig;
  tiled_vae?: TiledVAEConfig;
  ultimate_upscale?: UltimateUpscaleConfig;
  self_attention_guidance?: SelfAttentionGuidanceConfig;
  freeu?: FreeUConfig;
  soft_inpainting?: SoftInpaintingConfig;
  // img2img specific
  color_grading?: ColorGradingConfig;
  inpaint_difference?: InpaintDifferenceConfig;
  outpainting?: OutpaintingConfig;
}

/**
 * ADetailer configuration
 */
export interface ADetailerConfig {
  enabled: boolean;
  models?: ADetailerModel[];
}

export interface ADetailerModel {
  model: string;
  prompt?: string;
  negative_prompt?: string;
  confidence?: number;
  mask_blur?: number;
  dilate_erode?: number;
  x_offset?: number;
  y_offset?: number;
  mask_merge_invert?: string;
  mask_preprocessor?: string;
  inpaint_only_masked?: boolean;
  inpaint_padding?: number;
  denoising_strength?: number;
  use_separate_width?: boolean;
  width?: number;
  use_separate_height?: boolean;
  height?: number;
  use_separate_cfg_scale?: boolean;
  cfg_scale?: number;
  use_separate_steps?: boolean;
  steps?: number;
  use_separate_checkpoint?: boolean;
  checkpoint?: string;
  use_separate_vae?: boolean;
  vae?: string;
  use_separate_sampler?: boolean;
  sampler?: string;
  scheduler?: string;
  use_separate_clip_skip?: boolean;
  clip_skip?: number;
  restore_faces_after?: boolean;
  controlnet_model?: string;
}

/**
 * ControlNet configuration
 */
export interface ControlNetConfig {
  enabled: boolean;
  units?: ControlNetUnit[];
}

export interface ControlNetUnit {
  enabled?: boolean;
  module?: string;
  model?: string;
  weight?: number;
  resize_mode?: number;
  pixel_perfect?: boolean;
  control_mode?: number;
  threshold_a?: number;
  threshold_b?: number;
  guidance_start?: number;
  guidance_end?: number;
  processor_res?: number;
}

/**
 * Regional Prompter configuration
 */
export interface RegionalPrompterConfig {
  // New property names for 26th preset
  rp_active?: boolean;
  rp_debug?: boolean;
  rp_mode?: 'Matrix' | 'Mask' | 'Prompt';
  rp_matrix_submode?: 'Columns' | 'Rows' | 'Cols;Rows';
  rp_mask_submode?: string;
  rp_prompt_submode?: string;
  rp_divide_ratio?: string;
  rp_base_ratio?: string;
  rp_use_base?: boolean;
  rp_use_common?: boolean;
  rp_use_ncommon?: boolean;
  rp_calc_mode?: 'Attention' | 'Latent';
  rp_not_change_and?: boolean;
  rp_lora_stop_step?: string;
  rp_lora_hires_stop_step?: string;
  rp_threshold?: string;

  // Legacy property names for compatibility
  enabled?: boolean;
  mode?: 'Matrix' | 'Mask' | 'Prompt';
  split_mode?: 'Horizontal' | 'Vertical' | 'Random';
  split_ratio?: string;
  base_prompt?: string;
  common_prompt?: string;
  lora_in_common?: boolean;
  lora_in_negative?: boolean;
  disable_convert_and?: boolean;
  use_base?: boolean;
  use_common?: boolean;
  use_negative_common?: boolean;
}

/**
 * Dynamic Prompts configuration
 */
export interface DynamicPromptsConfig {
  enable_dynamic_prompts: boolean;
  combinatorial_generation?: boolean;
  max_generations?: number;
  magic_prompt?: boolean;
  // Legacy support
  enabled?: boolean;
  combinatorial?: boolean;
  enable_jinja_templates?: boolean;
  unlink_seed?: boolean;
  template?: string;
  wildcard_folder?: string;
  wildcards?: Record<string, string[]>;
}

/**
 * Latent Couple configuration
 */
export interface LatentCoupleConfig {
  enabled: boolean;
  divisions?: number;
  positions?: string[];
  weights?: number[];
  prompts?: string[];
}

/**
 * Tiled Diffusion configuration
 */
export interface TiledDiffusionConfig {
  enabled: boolean;
  method?: string;
  tile_width?: number;
  tile_height?: number;
  tile_overlap?: number;
  tile_batch_size?: number;
  upscaler?: string;
  scale_factor?: number;
}

/**
 * Tiled VAE configuration
 */
export interface TiledVAEConfig {
  enabled: boolean;
  encoder_tile_size?: number;
  decoder_tile_size?: number;
  fast_decoder?: boolean;
  fast_encoder?: boolean;
  color_fix?: boolean;
}

/**
 * Ultimate SD Upscale configuration
 */
export interface UltimateUpscaleConfig {
  enabled: boolean;
  target_size_type?: string;
  upscaler_index?: string;
  scale?: number;
  tile_width?: number;
  tile_height?: number;
  mask_blur?: number;
  padding?: number;
  seams_fix_width?: number;
  seams_fix_padding?: number;
  seams_fix_denoise?: number;
  seams_fix_mask_blur?: number;
  seams_fix_type?: string;
}

/**
 * Self Attention Guidance configuration
 */
export interface SelfAttentionGuidanceConfig {
  enabled: boolean;
  scale?: number;
  blur?: number;
}

/**
 * FreeU configuration
 */
export interface FreeUConfig {
  enabled: boolean;
  b1?: number;
  b2?: number;
  s1?: number;
  s2?: number;
}

/**
 * Soft Inpainting configuration
 */
export interface SoftInpaintingConfig {
  enabled: boolean;
  mask_influence?: number;
  difference_influence?: number;
  difference_threshold?: number;
  preserve_unmasked?: boolean;
}

/**
 * Color Grading configuration
 */
export interface ColorGradingConfig {
  enabled: boolean;
  factor?: number;
}

/**
 * Inpaint Difference configuration
 */
export interface InpaintDifferenceConfig {
  enabled: boolean;
  mask_blur?: number;
  difference_threshold?: number;
}

/**
 * Outpainting configuration
 */
export interface OutpaintingConfig {
  enabled: boolean;
  pixels_to_expand?: number;
  mask_blur?: number;
  direction?: string;
  falloff_exponent?: number;
  color_variation?: number;
}