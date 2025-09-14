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
    // Skip utility presets for now (they need special handling)
    if (!['txt2img', 'img2img'].includes(preset.type)) {
      return null;
    }

    const toolName = `sdreforge_${preset.name}`;
    const tool: MCPTool = {
      name: toolName,
      description: preset.description || `${preset.type} generation with ${preset.name}`,
      inputSchema: {
        type: 'object',
        properties: this.generateInputSchema(preset),
        required: preset.type === 'txt2img' ? ['prompt'] : ['prompt', 'init_image']
      }
    };

    return tool;
  }

  /**
   * Generate input schema from preset
   */
  private generateInputSchema(preset: Preset): Record<string, any> {
    const schema: Record<string, any> = {};

    // Common parameters
    schema.prompt = {
      type: 'string',
      description: 'The prompt for image generation'
    };

    if (preset.type === 'img2img') {
      schema.init_image = {
        type: 'string',
        description: 'Base64 encoded image or image URL'
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
      return this.presetManager.loadPreset(`${cleanName}.yaml`);
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