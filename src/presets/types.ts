/**
 * Preset Type Definitions
 */

/**
 * Base preset structure
 */
export interface Preset {
  name: string;
  description?: string;
  type: 'txt2img' | 'img2img';
  base_settings: BaseSettings;
  extensions?: Extensions;
}

/**
 * Base generation settings
 */
export interface BaseSettings {
  prompt_suffix?: string;
  negative_prompt?: string;
  steps?: number;
  cfg_scale?: number;
  width?: number;
  height?: number;
  sampler_name?: string;
  batch_size?: number;
  seed?: number;
  model?: string;
  denoising_strength?: number;  // For img2img
  scheduler?: string;
  clip_skip?: number;
}

/**
 * Extension configurations
 */
export interface Extensions {
  adetailer?: ADetailerConfig;
  controlnet?: ControlNetConfig;
  regional_prompter?: RegionalPrompterConfig;
  dynamic_prompts?: DynamicPromptsConfig;
}

/**
 * ADetailer configuration
 */
export interface ADetailerConfig {
  enabled: boolean;
  models?: string[];
  confidence?: number;
  mask_blur?: number;
  dilate_erode?: number;
  inpaint_only_masked?: boolean;
  inpaint_padding?: number;
  use_separate_checkpoint?: boolean;
  checkpoint?: string;
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
  enabled: boolean;
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
  enabled: boolean;
  combinatorial?: boolean;
  max_generations?: number;
  enable_jinja_templates?: boolean;
  unlink_seed?: boolean;
  template?: string;
}