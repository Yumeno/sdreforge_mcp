/**
 * Tool Generator
 * Generates MCP tools from presets
 */

import { PresetManager, Preset } from '../presets';
import { MCPTool } from './types';

export class ToolGenerator {
  private presetManager: PresetManager;

  constructor(presetsDir: string = './presets') {
    this.presetManager = new PresetManager(presetsDir);
  }

  /**
   * Generate MCP tools from all presets
   */
  generateTools(): MCPTool[] {
    const tools: MCPTool[] = [];
    const presets = this.presetManager.loadAllPresets();

    for (const preset of presets) {
      const tool = this.presetToTool(preset);
      if (tool) {
        tools.push(tool);
      }
    }

    return tools;
  }

  /**
   * Convert a preset to an MCP tool
   */
  private presetToTool(preset: Preset): MCPTool | null {
    // Include all preset types
    const supportedTypes = ['txt2img', 'img2img', 'extras', 'extras-single-image', 'rembg', 'png-info', 'tagger', 'utility'];
    if (!supportedTypes.includes(preset.type)) {
      return null;
    }

    const toolName = `sdreforge_${preset.name}`;

    // Determine required fields based on preset type
    let required: string[] = [];
    switch (preset.type) {
      case 'txt2img':
        required = ['prompt'];
        break;
      case 'img2img':
        required = ['prompt', 'init_image'];
        break;
      case 'extras':
      case 'png-info':
      case 'tagger':
        required = ['image'];
        break;
      case 'utility':
        // No required fields for utility tools
        required = [];
        break;
      default:
        required = [];
    }

    const tool: MCPTool = {
      name: toolName,
      description: preset.description || `${preset.type} generation with ${preset.name}`,
      inputSchema: {
        type: 'object',
        properties: this.generateInputSchema(preset),
        required: required
      }
    };

    return tool;
  }

  /**
   * Generate input schema from preset
   */
  private generateInputSchema(preset: Preset): Record<string, any> {
    const schema: Record<string, any> = {};

    // Skip prompt for non-generation tools
    const noPromptTypes = ['utility', 'extras', 'png-info', 'tagger', 'extras-single-image', 'rembg'];
    if (!noPromptTypes.includes(preset.type)) {
      // Common parameters for generation tools
      schema.prompt = {
        type: 'string',
        description: 'The prompt for image generation'
      };
    }

    if (preset.type === 'img2img') {
      schema.init_image = {
        type: 'string',
        description: 'Base64 encoded image or image URL'
      };
    }

    // For image processing tools
    const imageProcessingTypes = ['extras', 'extras-single-image', 'png-info', 'tagger', 'rembg'];
    if (imageProcessingTypes.includes(preset.type)) {
      schema.image = {
        type: 'string',
        description: 'Base64 encoded image or image path'
      };
    }

    // For utility tools
    if (preset.type === 'utility' && preset.settings?.action === 'switch_model') {
      schema.model_name = {
        type: 'string',
        description: 'Model name to switch to (e.g., "sd_waiNSFWIllustrious_v150")'
      };
    }

    // Optional parameters based on preset settings
    if (preset.base_settings?.seed === -1) {
      schema.seed = {
        type: 'number',
        description: 'Random seed (-1 for random)',
        default: -1
      };
    }

    if (preset.base_settings?.steps) {
      schema.steps = {
        type: 'number',
        description: `Number of generation steps (preset default: ${preset.base_settings.steps})`,
        default: preset.base_settings.steps
      };
    }

    if (preset.base_settings?.cfg_scale) {
      schema.cfg_scale = {
        type: 'number',
        description: `CFG scale (preset default: ${preset.base_settings.cfg_scale})`,
        default: preset.base_settings.cfg_scale
      };
    }

    // Size parameters if not fixed in preset
    if (!preset.base_settings?.width || !preset.base_settings?.height) {
      schema.width = {
        type: 'number',
        description: 'Image width',
        default: preset.base_settings?.width || 1024
      };
      schema.height = {
        type: 'number',
        description: 'Image height',
        default: preset.base_settings?.height || 1024
      };
    }

    // Batch parameters
    schema.batch_size = {
      type: 'number',
      description: 'Number of images to generate in parallel',
      default: preset.base_settings?.batch_size || 1
    };

    // img2img specific parameters
    if (preset.type === 'img2img') {
      schema.denoising_strength = {
        type: 'number',
        description: 'Denoising strength (0.0-1.0)',
        default: preset.base_settings?.denoising_strength || 0.75,
        minimum: 0,
        maximum: 1
      };
    }

    return schema;
  }

  /**
   * Get preset by name
   */
  getPreset(presetName: string): Preset | null {
    try {
      // Remove sdreforge_ prefix if present
      const cleanName = presetName.replace(/^sdreforge_/, '');

      // Map preset names to file names
      const fileNameMap: Record<string, string> = {
        'txt2img_animagine_no_adetailer': '00_txt2img_animagine_no_adetailer.yaml',
        'txt2img_animagine_base': '01_txt2img_animagine_base.yaml',
        'txt2img_animagine_cn3': '02_txt2img_animagine_cn3.yaml',
        'txt2img_animagine_cn4': '03_txt2img_animagine_cn4.yaml',
        'img2img_animagine_base': '04_img2img_animagine_base.yaml',
        'img2img_animagine_cn3': '05_img2img_animagine_cn3.yaml',
        'img2img_animagine_cn4': '06_img2img_animagine_cn4.yaml',
        'txt2img_cn3_rp_matrix': '07_txt2img_cn3_rp_matrix.yaml',
        'txt2img_cn3_rp_mask': '08_txt2img_cn3_rp_mask.yaml',
        'txt2img_cn4_rp_matrix': '09_txt2img_cn4_rp_matrix.yaml',
        'txt2img_cn4_rp_mask': '10_txt2img_cn4_rp_mask.yaml',
        'img2img_cn3_rp_matrix': '11_img2img_cn3_rp_matrix.yaml',
        'img2img_cn3_rp_mask': '12_img2img_cn3_rp_mask.yaml',
        'img2img_cn4_rp_matrix': '13_img2img_cn4_rp_matrix.yaml',
        'img2img_cn4_rp_mask': '14_img2img_cn4_rp_mask.yaml',
        'utility_png_info': '15_utility_png_info.yaml',
        'extras_upscale_ultrasharp': '16_extras_upscale_ultrasharp.yaml',
        'extras_upscale_fatal_anime': '17_extras_upscale_fatal_anime.yaml',
        'extras_rembg_u2net': '18_extras_rembg_u2net.yaml',
        'extras_rembg_isnet_anime': '19_extras_rembg_isnet_anime.yaml',
        'tagger_wd_eva02': '20_tagger_wd_eva02.yaml',
        'utility_check_model': '21_utility_check_model.yaml',
        'utility_switch_model': '22_utility_switch_model.yaml',
        'txt2img_animagine_face_hand': '23_txt2img_animagine_face_hand.yaml'
      };

      const fileName = fileNameMap[cleanName];
      if (!fileName) {
        return null;
      }

      return this.presetManager.loadPreset(fileName);
    } catch {
      return null;
    }
  }

  /**
   * Get preset manager
   */
  getPresetManager(): PresetManager {
    return this.presetManager;
  }
}