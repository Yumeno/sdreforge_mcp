/**
 * Preset Manager
 * YAML-based preset management system
 */

import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { Preset, BaseSettings, Extensions } from './types';
import { Txt2ImgPayload, Img2ImgPayload } from '../api/types';
import { PromptHandler } from './prompt-handler';

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
      // Write debug to file for debugging
      const logPath = path.join(process.cwd(), 'mcp-debug.log');
      const debugLog = `[DEBUG ${new Date().toISOString()}] Loading presets from: ${this.presetsDir}\n`;
      fs.appendFileSync(logPath, debugLog);
      const files = fs.readdirSync(this.presetsDir);
      fs.appendFileSync(logPath, `[DEBUG ${new Date().toISOString()}] Found ${files.length} files in presets directory\n`);

      for (const file of files) {
        // Only process YAML files
        if (!file.endsWith('.yaml') && !file.endsWith('.yml')) {
          continue;
        }

        // Skip hidden files
        if (file.startsWith('.')) {
          continue;
        }

        // Skip templates and placeholder files
        if (file.includes('template') || file.includes('placeholder')) {
          continue;
        }

        try {
          const logPath2 = path.join(process.cwd(), 'mcp-debug.log');
          fs.appendFileSync(logPath2, `[DEBUG ${new Date().toISOString()}] Loading preset: ${file}\n`);
          const preset = this.loadPreset(file);
          fs.appendFileSync(logPath2, `[DEBUG ${new Date().toISOString()}] Successfully loaded preset: ${preset.name} (type: ${preset.type})\n`);
          presets.push(preset);
        } catch (error: any) {
          const logPath2 = path.join(process.cwd(), 'mcp-debug.log');
          fs.appendFileSync(logPath2, `[ERROR ${new Date().toISOString()}] Failed to load preset ${file}: ${error.message}\n`);
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

    const validTypes = ['txt2img', 'img2img', 'extras', 'png-info', 'tagger', 'rembg', 'utility'];
    if (!preset.type || !validTypes.includes(preset.type)) {
      return false;
    }

    // txt2img and img2img require base_settings
    if (['txt2img', 'img2img'].includes(preset.type)) {
      if (!preset.base_settings || typeof preset.base_settings !== 'object') {
        return false;
      }
    }
    // Utility and processing presets require settings
    else if (['extras', 'png-info', 'tagger', 'rembg', 'utility'].includes(preset.type)) {
      if (!preset.settings || typeof preset.settings !== 'object') {
        return false;
      }
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

    // Apply prompt template if present
    if (preset.prompt_template && userParams.prompt) {
      const promptResult = PromptHandler.mergePrompts(
        userParams.prompt,
        preset.prompt_template
      );
      basePayload.prompt = promptResult.prompt;
      if (promptResult.negative_prompt) {
        basePayload.negative_prompt = promptResult.negative_prompt;
      }
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
      // ADetailer expects args as: [enable_flag, skip_img2img, {model_config1}, {model_config2}, ...]
      const adetailerArgs: any[] = [
        true,   // Enable ADetailer
        false   // Don't skip img2img
      ];

      // Add each model as a minimal config object
      extensions.adetailer.models.forEach(model => {
        const modelConfig: any = {
          ad_model: model.model || 'face_yolov8n.pt'
        };

        // Only add optional parameters if explicitly defined
        if (model.prompt) modelConfig.ad_prompt = model.prompt;
        if (model.negative_prompt) modelConfig.ad_negative_prompt = model.negative_prompt;
        if (model.confidence !== undefined) modelConfig.ad_confidence = model.confidence;

        adetailerArgs.push(modelConfig);
      });

      scripts.ADetailer = {
        args: adetailerArgs
      };

      // Debug log
      console.error('[DEBUG] ADetailer args structure:', JSON.stringify(adetailerArgs, null, 2));
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