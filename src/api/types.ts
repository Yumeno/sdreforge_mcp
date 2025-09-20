/**
 * API Types
 * SD WebUI Reforge API用の型定義
 */

export interface SDWebUIConfig {
  baseUrl: string;
  timeout?: number;
}

export interface APIError {
  status: number;
  message: string;
  details?: any;
}

export interface ValidationError {
  loc: string[];
  msg: string;
  type: string;
}

export interface Txt2ImgPayload {
  prompt: string;
  negative_prompt?: string;
  steps: number;
  cfg_scale: number;
  width: number;
  height: number;
  sampler_name: string;
  batch_size: number;
  seed: number;
  send_images: boolean;
  save_images: boolean;

  // Hires Fix
  enable_hr?: boolean;
  hr_scale?: number;
  hr_upscaler?: string;
  hr_second_pass_steps?: number;
  denoising_strength?: number;
  hr_resize_x?: number;
  hr_resize_y?: number;

  // Model override
  override_settings?: {
    sd_model_checkpoint?: string;
  };
  override_settings_restore_afterwards?: boolean;

  // Extensions
  alwayson_scripts?: Record<string, any>;
}

export interface Img2ImgPayload {
  init_images: string[];
  resize_mode: number;
  denoising_strength: number;
  prompt: string;
  negative_prompt?: string;
  seed: number;
  sampler_name: string;
  batch_size: number;
  n_iter: number;
  steps: number;
  cfg_scale: number;
  width: number;
  height: number;
  restore_faces: boolean;
  tiling: boolean;
  send_images: boolean;
  save_images: boolean;

  // Inpainting
  mask?: string;
  mask_blur?: number;
  mask_blur_x?: number;
  mask_blur_y?: number;
  inpainting_fill?: number;
  inpaint_full_res?: boolean;
  inpaint_full_res_padding?: number;
  inpainting_mask_invert?: number;

  // Model override
  override_settings?: {
    sd_model_checkpoint?: string;
  };
  override_settings_restore_afterwards?: boolean;

  // Extensions
  alwayson_scripts?: Record<string, any>;
}

export interface GenerationResponse {
  images: string[];
  parameters: Record<string, any>;
  info: string;
}

export interface PNGInfoPayload {
  image: string;
}

export interface PNGInfoResponse {
  info: string;
  items?: {
    parameters?: Record<string, any>;
  };
}

export interface ExtrasSingleImagePayload {
  image: string;
  resize_mode?: number;
  show_extras_results?: boolean;
  gfpgan_visibility?: number;
  codeformer_visibility?: number;
  codeformer_weight?: number;
  upscaling_resize?: number;
  upscaling_resize_w?: number;
  upscaling_resize_h?: number;
  upscaling_crop?: boolean;
  upscaler_1?: string;
  upscaler_2?: string;
  extras_upscaler_2_visibility?: number;
  upscale_first?: boolean;
}

export interface ExtrasResponse {
  image: string;
  html_info?: string;
}

export interface InterrogatePayload {
  image: string;
  model: 'clip' | 'deepdanbooru';
}

export interface InterrogateResponse {
  caption: string;
}

// Tagger API types
export interface TaggerPayload {
  image: string;
  model: string;
  threshold?: number;
  exclude_tags?: string;
  replace_underscore?: boolean;
  replace_underscore_excludes?: string;
  escape_tag?: boolean;
  unload_model_after_running?: boolean;
}

export interface TaggerResponse {
  caption: string;
}

// Utility type for cleaning payloads
export type CleanPayload<T> = {
  [K in keyof T]: T[K] extends null ? never :
                   T[K] extends undefined ? never :
                   T[K] extends object ? CleanPayload<T[K]> :
                   T[K];
};