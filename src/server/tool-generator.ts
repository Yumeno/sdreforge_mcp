/**
 * Tool Generator
 * Generates MCP tools from presets
 */

import { PresetManager, Preset } from '../presets';
import { MCPTool } from './types';

export class ToolGenerator {
  private presetManager: PresetManager;
  private presetsDir: string;

  constructor(presetsDir: string = './presets') {
    this.presetsDir = presetsDir;
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
    const supportedTypes = ['txt2img', 'img2img', 'extras', 'extras_combined', 'extras-single-image', 'rembg', 'png-info', 'tagger', 'utility'];
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
      case 'extras_combined':
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
    const presetName = preset.name;

    // Skip prompt for non-generation tools
    const noPromptTypes = ['utility', 'extras', 'extras_combined', 'png-info', 'tagger', 'extras-single-image', 'rembg'];
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
    const imageProcessingTypes = ['extras', 'extras_combined', 'extras-single-image', 'png-info', 'tagger', 'rembg'];
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

    // For ControlNet-enabled presets
    if (preset.extensions?.controlnet?.enabled) {
      // Special handling for fully parameterized preset (26)
      if (preset.name === 'txt2img_dynamic' || preset.name === 'img2img_dynamic') {
        // Dynamic ControlNet support based on max_units
        const maxControlnetUnits = preset.extensions?.controlnet?.max_units || 3;

        // Generate image parameters
        for (let i = 1; i <= maxControlnetUnits; i++) {
          const paramName = i === 1 ? 'controlnet_image' : `controlnet_image_${i}`;
          const unitIndex = i - 1; // Unit 0, 1, 2...
          schema[paramName] = {
            type: 'string',
            description: `Image file path for ControlNet Unit ${unitIndex} reference${i === 1 ? '' : ' (optional)'}`
          };
        }

        // Generate enable parameters
        for (let i = 1; i <= maxControlnetUnits; i++) {
          const unitIndex = i - 1; // Unit 0, 1, 2...
          schema[`controlnet_enable_${i}`] = {
            type: 'boolean',
            description: `Enable ControlNet Unit ${unitIndex} (defaults to auto-enable when image provided)`,
            default: false
          };
        }

        // Generate model parameters
        for (let i = 1; i <= maxControlnetUnits; i++) {
          const unitIndex = i - 1; // Unit 0, 1, 2...
          schema[`controlnet_model_${i}`] = {
            type: 'string',
            description: `ControlNet model for Unit ${unitIndex}${i === 1 ? ' (e.g., "CN-anytest3_animagine4_A")' : ' (optional)'}`,
            ...(i === 1 ? { default: 'CN-anytest3_animagine4_A' } : {})
          };
        }

        // Generate module parameters
        for (let i = 1; i <= maxControlnetUnits; i++) {
          const unitIndex = i - 1; // Unit 0, 1, 2...
          schema[`controlnet_module_${i}`] = {
            type: 'string',
            description: `ControlNet preprocessor for Unit ${unitIndex}${i === 1 ? ' (e.g., "None", "canny", "openpose")' : ' (optional)'}`,
            default: 'None'
          };
        }

        // Generate weight parameters
        for (let i = 1; i <= maxControlnetUnits; i++) {
          const unitIndex = i - 1; // Unit 0, 1, 2...
          const defaultWeight = i === 1 ? 1.0 : (i === 2 ? 0.8 : 0.6);
          schema[`controlnet_weight_${i}`] = {
            type: 'number',
            description: `ControlNet weight for Unit ${unitIndex} (0.0-2.0)`,
            default: defaultWeight,
            minimum: 0.0,
            maximum: 2.0
          };
        }

        // ADetailer model parameters (all models based on max_models)
        const maxAdetailerModels = preset.extensions?.adetailer?.max_models || 2;
        for (let i = 1; i <= maxAdetailerModels; i++) {
          schema[`adetailer_model_${i}`] = {
            type: 'string',
            description: `ADetailer model ${i} (e.g., ${i === 1 ? '"face_yolov8n.pt"' : '"hand_yolov8n.pt", "person_yolov8n-seg.pt", "eye_yolov8n.pt"'}) - enables Model ${i}`,
            ...(i === 1 ? { default: 'face_yolov8n.pt' } : {})
          };
        }

        // Hires Fix parameters
        schema.enable_hr = {
          type: 'boolean',
          description: 'Enable Hires Fix for high resolution generation',
          default: false
        };
        schema.hr_scale = {
          type: 'number',
          description: 'Hires Fix scale factor (1.0-4.0)',
          default: 2.0,
          minimum: 1.0,
          maximum: 4.0
        };
        schema.hr_upscaler = {
          type: 'string',
          description: 'Upscaler model (e.g., "R-ESRGAN 4x+ Anime6B", "Latent")',
          default: 'R-ESRGAN 4x+ Anime6B'
        };
        schema.hr_second_pass_steps = {
          type: 'number',
          description: 'Hires Fix second pass steps (0 = use same steps)',
          default: 0,
          minimum: 0,
          maximum: 150
        };
        schema.hr_denoising_strength = {
          type: 'number',
          description: 'Hires Fix denoising strength (0.0-1.0)',
          default: 0.7,
          minimum: 0.0,
          maximum: 1.0
        };

        // Batch generation parameters
        schema.batch_size = {
          type: 'number',
          description: 'Number of images to generate in parallel (limited by VRAM)',
          default: 1,
          minimum: 1
        };
        schema.n_iter = {
          type: 'number',
          description: 'Number of batch iterations (batch count) (limited by time/storage)',
          default: 1,
          minimum: 1
        };

        // Dynamic Prompts parameters
        schema.enable_dynamic_prompts = {
          type: 'boolean',
          description: 'Enable Dynamic Prompts for automatic prompt expansion',
          default: true
        };
        schema.magic_prompt = {
          type: 'boolean',
          description: 'Enable Magic Prompt for enhanced prompt generation',
          default: false
        };
        schema.combinatorial_generation = {
          type: 'boolean',
          description: 'Enable combinatorial generation for all prompt combinations',
          default: false
        };
        schema.max_generations = {
          type: 'number',
          description: 'Maximum number of prompt variations (0 = unlimited)',
          default: 0,
          minimum: 0
        };
        schema.use_fixed_seed = {
          type: 'boolean',
          description: 'Use fixed seed for wildcards (recommended for combinatorial generation)',
          default: true
        };

        // Regional Prompter parameters
        schema.rp_active = {
          type: 'boolean',
          description: 'Enable Regional Prompter for region-based prompt control',
          default: false
        };
        schema.rp_mode = {
          type: 'string',
          description: 'Regional Prompter mode: "Matrix" (grid) or "Mask" (masked regions)',
          default: 'Matrix',
          enum: ['Matrix', 'Mask']
        };
        schema.rp_matrix_submode = {
          type: 'string',
          description: 'Matrix submode: "Columns" (vertical split), "Rows" (horizontal split), "Cols;Rows" (grid)',
          default: 'Columns'
        };
        schema.rp_divide_ratio = {
          type: 'string',
          description: 'Division ratios (e.g., "1,1" = 50/50, "1,2,1" = 25/50/25)',
          default: '1,1'
        };
        schema.rp_calc_mode = {
          type: 'string',
          description: 'Calculation mode: "Attention" (soft boundaries) or "Latent" (hard boundaries)',
          default: 'Attention'
        };

        // Mask Mode parameters (unlimited masks supported: rp_mask_1, rp_mask_2, rp_mask_3, ...)
        // Note: These are dynamically detected - you can use rp_mask_1, rp_mask_2, rp_mask_3, etc. as needed
        schema.rp_mask_1 = {
          type: 'string',
          description: 'Mask image file path for region 1 (white=region area, black=ignore)'
        };
        schema.rp_mask_2 = {
          type: 'string',
          description: 'Mask image file path for region 2 (optional)'
        };
        schema.rp_mask_3 = {
          type: 'string',
          description: 'Mask image file path for region 3 (optional)'
        };
        schema.rp_base_ratio = {
          type: 'string',
          description: 'Base ratio for mask mode (e.g., "0.2") - controls base influence',
          default: '0.2'
        };

        // Additional Regional Prompter parameters
        schema.rp_debug = {
          type: 'boolean',
          description: 'Enable debug mode for Regional Prompter',
          default: false
        };
        schema.rp_mask_submode = {
          type: 'string',
          description: 'Mask submode for Regional Prompter',
          default: 'Mask'
        };
        schema.rp_prompt_submode = {
          type: 'string',
          description: 'Prompt submode for Regional Prompter',
          default: 'Prompt'
        };
        schema.rp_use_base = {
          type: 'boolean',
          description: 'Use base prompt for all regions',
          default: true
        };
        schema.rp_use_common = {
          type: 'boolean',
          description: 'Use common prompt for all regions',
          default: false
        };
        schema.rp_use_ncommon = {
          type: 'boolean',
          description: 'Use common negative prompt for all regions',
          default: false
        };
        schema.rp_not_change_and = {
          type: 'boolean',
          description: 'Do not change AND keywords in Regional Prompter',
          default: false
        };
        schema.rp_lora_stop_step = {
          type: 'string',
          description: 'LoRA stop step for Regional Prompter (e.g., "0")',
          default: '0'
        };
        schema.rp_lora_hires_stop_step = {
          type: 'string',
          description: 'LoRA hires stop step for Regional Prompter (e.g., "0")',
          default: '0'
        };
        schema.rp_threshold = {
          type: 'string',
          description: 'Regional Prompter threshold (e.g., "0.4")',
          default: '0.4'
        };
        // Prompt template overrides
        schema.prompt_prefix = {
          type: 'string',
          description: 'Prefix to add before the prompt',
          default: preset.prompt_template?.positive_prefix || ''
        };
        schema.prompt_suffix = {
          type: 'string',
          description: 'Suffix to add after the prompt',
          default: preset.prompt_template?.positive_suffix || 'masterpiece, high score, great score, absurdres'
        };

        // Negative prompt controls
        schema.negative_prompt_base = {
          type: 'string',
          description: 'Base negative prompt (auto-appended)',
          default: preset.prompt_template?.negative || 'lowres, bad anatomy, bad hands, text, error, missing finger, extra digits, fewer digits, cropped, worst quality, low quality, low score, bad score, average score, signature, watermark, username, blurry'
        };
        schema.negative_prompt_user = {
          type: 'string',
          description: 'Additional user negative prompt (supports Regional Prompter syntax)'
        };

        // Model checkpoint override
        schema.checkpoint = {
          type: 'string',
          description: 'Model checkpoint to use (e.g., "sd_animagineXL40_v4Opt")',
          default: preset.base_settings?.checkpoint || 'sd_animagineXL40_v4Opt'
        };

        // img2img upscaler and inpaint support
        if (preset.name === 'img2img_dynamic') {
          schema.upscaler_model = {
            type: 'string',
            description: 'Upscaler model to use for img2img (e.g., "4x-UltraSharp", "R-ESRGAN 4x+ Anime6B")',
            default: '4x_fatal_Anime_500000_G'
          };

          // Inpaint mode parameters (activated when mask_image is provided)
          schema.mask_image = {
            type: 'string',
            description: 'Mask image file path (white=edit area, black=preserve)'
          };
          schema.mask_blur = {
            type: 'number',
            description: 'Blur mask edges for smooth blending (0-64)',
            default: 4
          };
          schema.inpainting_fill = {
            type: 'number',
            description: '0=fill, 1=original, 2=latent noise, 3=latent nothing',
            default: 1
          };
          schema.inpaint_full_res = {
            type: 'boolean',
            description: 'Process only masked area (true) or whole image (false)',
            default: true
          };
          schema.inpaint_full_res_padding = {
            type: 'number',
            description: 'Padding pixels around mask (0-256)',
            default: 0
          };
          schema.inpainting_mask_invert = {
            type: 'number',
            description: '0=normal mask, 1=invert mask',
            default: 0
          };
        }
      } else {
        // Standard ControlNet handling for other presets
        schema.controlnet_image = {
          type: 'string',
          description: 'Base64 encoded image or image file path for ControlNet Unit 0 reference'
        };

        // Add support for multiple ControlNet units
        const units = preset.extensions.controlnet.units || [];
        if (units.length > 1) {
          schema.controlnet_image_2 = {
            type: 'string',
            description: 'Base64 encoded image or image file path for ControlNet Unit 1 reference (optional)'
          };
        }
        if (units.length > 2) {
          schema.controlnet_image_3 = {
            type: 'string',
            description: 'Base64 encoded image or image file path for ControlNet Unit 2 reference (optional)'
          };
        }
      }
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

      // Add upscaler model selection for preset 27
      if (presetName === 'img2img_dynamic') {
        schema.upscaler_model = {
          type: 'string',
          description: 'Upscaler model to use for img2img (e.g., "4x-UltraSharp", "R-ESRGAN 4x+ Anime6B")',
          default: '4x_fatal_Anime_500000_G'
        };

        // Inpaint mode parameters (optional)
        schema.mask_image = {
          type: 'string',
          description: 'Mask image file path (white=edit area, black=preserve)'
        };
        schema.mask_blur = {
          type: 'number',
          description: 'Mask blur radius in pixels',
          default: 4,
          minimum: 0,
          maximum: 64
        };
        schema.inpainting_fill = {
          type: 'number',
          description: 'Inpaint filling mode: 0=fill, 1=original, 2=latent noise, 3=latent nothing',
          default: 1,
          minimum: 0,
          maximum: 3
        };
        schema.inpaint_full_res = {
          type: 'boolean',
          description: 'Process only masked area (true) or whole image (false)',
          default: true
        };
        schema.inpaint_full_res_padding = {
          type: 'number',
          description: 'Padding pixels around mask area when inpaint_full_res is true',
          default: 0,
          minimum: 0,
          maximum: 256
        };
        schema.inpainting_mask_invert = {
          type: 'number',
          description: 'Mask inversion: 0=normal, 1=invert',
          default: 0,
          minimum: 0,
          maximum: 1
        };
      }
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

      // Dynamically find preset file by name
      const fs = require('fs');
      const path = require('path');
      const presetsDir = this.presetsDir;

      // Look for preset file that matches the name
      const files = fs.readdirSync(presetsDir);
      let presetFile: string | null = null;

      // Try direct match with numbered prefix
      for (const file of files) {
        if (file.endsWith('.yaml')) {
          // Load the file to check the name
          const filePath = path.join(presetsDir, file);
          const content = fs.readFileSync(filePath, 'utf8');
          const yaml = require('js-yaml');
          const yamlContent = yaml.load(content);

          if (yamlContent.name === cleanName) {
            presetFile = file;
            break;
          }
        }
      }

      if (presetFile) {
        return this.presetManager.loadPreset(presetFile);
      }

      // Fallback to old static map for backward compatibility
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
        'txt2img_animagine_face_hand': '23_txt2img_animagine_face_hand.yaml',
        'utility_controlnet_models': '25_utility_controlnet_models.yaml',
        'txt2img_cn_multi_3units': '26_txt2img_cn_multi_3units.yaml'
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