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

    const validTypes = ['txt2img', 'img2img', 'extras', 'extras_combined', 'png-info', 'tagger', 'rembg', 'utility'];
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
    else if (['extras', 'extras_combined', 'png-info', 'tagger', 'rembg', 'utility'].includes(preset.type)) {
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

    // Apply prompt template with complete config aggregation
    if (preset.prompt_template && userParams.prompt) {
      // Override template with user-provided values if specified
      const effectiveTemplate = {
        positive_prefix: userParams.prompt_prefix ?? preset.prompt_template.positive_prefix,
        positive_suffix: userParams.prompt_suffix ?? preset.prompt_template.positive_suffix,
        negative: userParams.negative_prompt_base ?? preset.prompt_template.negative
      };

      // Aggregate complete Regional Prompter configuration (defaults + user overrides)
      const finalRpConfig = {
        rp_active: userParams.rp_active ?? preset.extensions?.regional_prompter?.rp_active ?? false,
        rp_use_common: userParams.rp_use_common ?? preset.extensions?.regional_prompter?.rp_use_common ?? false,
        rp_use_base: userParams.rp_use_base ?? preset.extensions?.regional_prompter?.rp_use_base ?? false,
        rp_use_ncommon: userParams.rp_use_ncommon ?? preset.extensions?.regional_prompter?.rp_use_ncommon ?? false,
        rp_not_change_and: userParams.rp_not_change_and ?? preset.extensions?.regional_prompter?.rp_not_change_and ?? false,
        rp_use_neg_common: userParams.rp_use_neg_common ?? false
      };

      // Check if Regional Prompter syntax is present AND user enabled it
      const hasRpSyntax = PromptHandler.hasRegionalPrompterSyntax(userParams.prompt);

      // Build combined negative prompt from base and user input
      let combinedNegativePrompt = '';

      // Use the effective template negative (which may be overridden by user)
      const baseNegative = effectiveTemplate.negative || '';
      const userNegative = userParams.negative_prompt_user || '';

      if (baseNegative && userNegative) {
        combinedNegativePrompt = `${baseNegative}, ${userNegative}`;
      } else if (baseNegative) {
        combinedNegativePrompt = baseNegative;
      } else if (userNegative) {
        combinedNegativePrompt = userNegative;
      }

      if (hasRpSyntax && finalRpConfig.rp_active) {
        // Use Regional Prompter aware prompt processing with aggregated config
        const promptResult = PromptHandler.mergePromptsWithRegionalPrompter(
          userParams.prompt,
          effectiveTemplate,  // Use the effective template with overrides
          finalRpConfig,  // Pass the entire config directly - already has rp_ prefix
          combinedNegativePrompt  // Use combined negative prompt
        );
        basePayload.prompt = promptResult.prompt;
        if (promptResult.negative_prompt) {
          basePayload.negative_prompt = promptResult.negative_prompt;
        }
      } else {
        // Standard prompt processing
        const promptResult = PromptHandler.mergePrompts(
          userParams.prompt,
          effectiveTemplate  // Use the effective template with overrides
        );
        basePayload.prompt = promptResult.prompt;
        // Override with combined negative prompt if user provided negative_prompt_user
        if (combinedNegativePrompt) {
          basePayload.negative_prompt = combinedNegativePrompt;
        } else if (promptResult.negative_prompt) {
          basePayload.negative_prompt = promptResult.negative_prompt;
        }
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

    // Dynamic Prompts (18 arguments required)
    if (extensions.dynamic_prompts?.enable_dynamic_prompts) {
      scripts['dynamic prompts v2.17.1'] = {
        args: [
          extensions.dynamic_prompts.enable_dynamic_prompts || true,     // 1: enabled
          extensions.dynamic_prompts.combinatorial_generation || false,  // 2: combinatorial
          1,                                                            // 3: combinatorial_batches
          extensions.dynamic_prompts.magic_prompt || false,             // 4: magic_prompt
          false,                                                        // 5: feeling_lucky
          false,                                                        // 6: attention_grabber
          1.1,                                                          // 7: min_attention
          1.5,                                                          // 8: max_attention
          100,                                                          // 9: magic_prompt_length
          0.7,                                                          // 10: magic_temp_value
          false,                                                        // 11: use_fixed_seed
          false,                                                        // 12: unlink_seed_from_prompt
          false,                                                        // 13: disable_negative_prompt
          false,                                                        // 14: enable_jinja_templates
          false,                                                        // 15: no_image_generation
          extensions.dynamic_prompts.max_generations || 0,              // 16: max_generations
          "magic_prompt",                                               // 17: magic_model
          ""                                                            // 18: magic_blocklist_regex
        ]
      };
    }

    // Regional Prompter
    if (extensions.regional_prompter?.rp_active) {
      scripts['Regional Prompter'] = {
        args: [
          extensions.regional_prompter.rp_active || false,             // 1: active
          extensions.regional_prompter.rp_debug || false,             // 2: debug
          extensions.regional_prompter.rp_mode || 'Matrix',           // 3: mode
          extensions.regional_prompter.rp_matrix_submode || 'Columns', // 4: matrix_submode
          extensions.regional_prompter.rp_mask_submode || 'Mask',     // 5: mask_submode
          extensions.regional_prompter.rp_prompt_submode || 'Prompt', // 6: prompt_submode
          extensions.regional_prompter.rp_divide_ratio || '1,1',      // 7: divide_ratio
          extensions.regional_prompter.rp_base_ratio || '0.2',        // 8: base_ratio
          extensions.regional_prompter.rp_use_base !== undefined ?
            extensions.regional_prompter.rp_use_base : true,          // 9: use_base
          extensions.regional_prompter.rp_use_common || false,        // 10: use_common
          extensions.regional_prompter.rp_use_ncommon || false,       // 11: use_ncommon
          extensions.regional_prompter.rp_calc_mode || 'Attention',   // 12: calc_mode
          extensions.regional_prompter.rp_not_change_and || false,    // 13: not_change_and
          extensions.regional_prompter.rp_lora_stop_step || '0',      // 14: lora_stop_step
          extensions.regional_prompter.rp_lora_hires_stop_step || '0', // 15: lora_hires_stop_step
          extensions.regional_prompter.rp_threshold || '0.4'          // 16: threshold
        ]
      };
    }

    return scripts;
  }
}