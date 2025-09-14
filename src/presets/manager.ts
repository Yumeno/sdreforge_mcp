/**
 * Preset Manager
 * YAML-based preset management system
 */

import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { Preset, BaseSettings, Extensions } from './types';
import { Txt2ImgPayload, Img2ImgPayload } from '../api/types';

export class PresetManager {
  private presetsDir: string;

  constructor(presetsDir: string = './presets') {
    this.presetsDir = presetsDir;
  }

  /**
   * Load a single preset from YAML file
   */
  loadPreset(filename: string): Preset {
    try {
      const filepath = path.join(this.presetsDir, filename);
      const content = fs.readFileSync(filepath, 'utf-8');
      const preset = yaml.load(content) as Preset;

      if (!this.validatePreset(preset)) {
        throw new Error('Invalid preset structure');
      }

      return preset;
    } catch (error: any) {
      if (error.message === 'Invalid preset structure') {
        throw error;
      }
      throw new Error(`Failed to load preset: ${error.message}`);
    }
  }

  /**
   * Load all presets from directory
   */
  loadAllPresets(): Preset[] {
    const presets: Preset[] = [];

    try {
      const files = fs.readdirSync(this.presetsDir);

      for (const file of files) {
        // Only process YAML files
        if (!file.endsWith('.yaml') && !file.endsWith('.yml')) {
          continue;
        }

        // Skip hidden files
        if (file.startsWith('.')) {
          continue;
        }

        try {
          const preset = this.loadPreset(file);
          presets.push(preset);
        } catch (error) {
          console.warn(`Failed to load preset ${file}:`, error);
        }
      }
    } catch (error) {
      console.error('Failed to read presets directory:', error);
    }

    return presets;
  }

  /**
   * Validate preset structure
   */
  validatePreset(preset: any): boolean {
    // Check required fields
    if (!preset || typeof preset !== 'object') {
      return false;
    }

    if (!preset.name || typeof preset.name !== 'string') {
      return false;
    }

    if (!preset.type || !['txt2img', 'img2img'].includes(preset.type)) {
      return false;
    }

    if (!preset.base_settings || typeof preset.base_settings !== 'object') {
      return false;
    }

    // Validate img2img specific requirements
    if (preset.type === 'img2img') {
      const settings = preset.base_settings;
      // img2img should have denoising_strength
      if (settings.denoising_strength !== undefined &&
          (typeof settings.denoising_strength !== 'number' ||
           settings.denoising_strength < 0 ||
           settings.denoising_strength > 1)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Convert preset to API payload
   */
  presetToPayload(preset: Preset, userParams: Record<string, any>): any {
    // Handle utility presets differently
    if (preset.settings) {
      return {
        ...preset.settings,
        ...userParams
      };
    }

    const basePayload: any = {
      ...preset.base_settings,
      ...userParams
    };

    // Apply prompt suffix if present
    if (preset.base_settings?.prompt_suffix && userParams.prompt) {
      basePayload.prompt = userParams.prompt + preset.base_settings.prompt_suffix;
    }

    // Remove preset-specific fields that aren't part of API
    delete basePayload.prompt_suffix;
    delete basePayload.model;  // Model is set via options, not in payload

    // Add extension configurations
    if (preset.extensions) {
      basePayload.alwayson_scripts = this.buildExtensionScripts(preset.extensions);
    }

    return basePayload;
  }

  /**
   * Build alwayson_scripts configuration from extensions
   */
  private buildExtensionScripts(extensions: Extensions): any {
    const scripts: any = {};

    // ADetailer
    if (extensions.adetailer?.enabled && extensions.adetailer.models) {
      scripts.ADetailer = {
        args: extensions.adetailer.models.map(model => ({
          ad_model: model.model || 'face_yolov8n.pt',
          ad_prompt: model.prompt || '',
          ad_negative_prompt: model.negative_prompt || '',
          ad_confidence: model.confidence || 0.3,
          ad_mask_blur: model.mask_blur || 4,
          ad_dilate_erode: model.dilate_erode || 4,
          ad_x_offset: model.x_offset || 0,
          ad_y_offset: model.y_offset || 0,
          ad_mask_merge_invert: model.mask_merge_invert || 'None',
          ad_mask_preprocessor: model.mask_preprocessor || 'None',
          ad_inpaint_only_masked: model.inpaint_only_masked !== false,
          ad_inpaint_padding: model.inpaint_padding || 32,
          ad_use_inpaint_width_height: model.use_separate_width || false,
          ad_inpaint_width: model.width || 512,
          ad_inpaint_height: model.height || 512,
          ad_use_cfg_scale: model.use_separate_cfg_scale || false,
          ad_cfg_scale: model.cfg_scale || 7.0,
          ad_use_steps: model.use_separate_steps || false,
          ad_steps: model.steps || 28,
          ad_use_checkpoint: model.use_separate_checkpoint || false,
          ad_checkpoint: model.checkpoint || '',
          ad_use_vae: model.use_separate_vae || false,
          ad_vae: model.vae || '',
          ad_use_sampler: model.use_separate_sampler || false,
          ad_sampler: model.sampler || '',
          ad_scheduler: model.scheduler || 'Automatic',
          ad_use_clip_skip: model.use_separate_clip_skip || false,
          ad_clip_skip: model.clip_skip || 1,
          ad_restore_after_face: model.restore_faces_after || false,
          ad_controlnet_model: model.controlnet_model || 'None'
        }))
      };
    }

    // ControlNet
    if (extensions.controlnet?.enabled && extensions.controlnet.units) {
      scripts.ControlNet = {
        args: extensions.controlnet.units.map(unit => ({
          enabled: unit.enabled !== false,
          module: unit.module || 'none',
          model: unit.model || '',
          weight: unit.weight || 1.0,
          resize_mode: unit.resize_mode || 1,
          pixel_perfect: unit.pixel_perfect || false,
          control_mode: unit.control_mode || 0,
          threshold_a: unit.threshold_a || 64,
          threshold_b: unit.threshold_b || 64,
          guidance_start: unit.guidance_start || 0.0,
          guidance_end: unit.guidance_end || 1.0,
          processor_res: unit.processor_res || 512
        }))
      };
    }

    // Regional Prompter
    if (extensions.regional_prompter?.enabled) {
      scripts['Regional Prompter'] = {
        args: [{
          mode: extensions.regional_prompter.mode || 'Matrix',
          split_mode: extensions.regional_prompter.split_mode || 'Horizontal',
          split_ratio: extensions.regional_prompter.split_ratio || '1,1',
          base_prompt: extensions.regional_prompter.base_prompt || '',
          common_prompt: extensions.regional_prompter.common_prompt || '',
          lora_in_common: extensions.regional_prompter.lora_in_common || false,
          lora_in_negative: extensions.regional_prompter.lora_in_negative || false,
          disable_convert_and: extensions.regional_prompter.disable_convert_and || false,
          use_base: extensions.regional_prompter.use_base || false,
          use_common: extensions.regional_prompter.use_common || false,
          use_negative_common: extensions.regional_prompter.use_negative_common || false
        }]
      };
    }

    // Dynamic Prompts
    if (extensions.dynamic_prompts?.enabled) {
      scripts['Dynamic Prompts'] = {
        args: [{
          combinatorial: extensions.dynamic_prompts.combinatorial || false,
          max_generations: extensions.dynamic_prompts.max_generations || 1,
          enable_jinja_templates: extensions.dynamic_prompts.enable_jinja_templates || false,
          unlink_seed: extensions.dynamic_prompts.unlink_seed || false,
          template: extensions.dynamic_prompts.template || ''
        }]
      };
    }

    return scripts;
  }
}