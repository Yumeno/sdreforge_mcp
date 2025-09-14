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
    const basePayload: any = {
      ...preset.base_settings,
      ...userParams
    };

    // Apply prompt suffix if present
    if (preset.base_settings.prompt_suffix && userParams.prompt) {
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
    if (extensions.adetailer?.enabled) {
      scripts.ADetailer = {
        args: [{
          ad_model: extensions.adetailer.models?.[0] || 'face_yolov8n.pt',
          ad_confidence: extensions.adetailer.confidence || 0.3,
          ad_mask_blur: extensions.adetailer.mask_blur || 4,
          ad_dilate_erode: extensions.adetailer.dilate_erode || 4,
          ad_inpaint_only_masked: extensions.adetailer.inpaint_only_masked !== false,
          ad_inpaint_padding: extensions.adetailer.inpaint_padding || 32,
          ad_use_checkpoint: extensions.adetailer.use_separate_checkpoint || false,
          ad_checkpoint: extensions.adetailer.checkpoint || null
        }]
      };

      // Add additional models if specified
      if (extensions.adetailer.models && extensions.adetailer.models.length > 1) {
        for (let i = 1; i < extensions.adetailer.models.length && i < 3; i++) {
          scripts.ADetailer.args.push({
            ad_model: extensions.adetailer.models[i],
            ad_confidence: extensions.adetailer.confidence || 0.3,
            ad_mask_blur: extensions.adetailer.mask_blur || 4,
            ad_dilate_erode: extensions.adetailer.dilate_erode || 4,
            ad_inpaint_only_masked: extensions.adetailer.inpaint_only_masked !== false,
            ad_inpaint_padding: extensions.adetailer.inpaint_padding || 32
          });
        }
      }
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