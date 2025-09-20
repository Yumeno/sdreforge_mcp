/**
 * MCP Server Implementation
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool as MCPTool
} from '@modelcontextprotocol/sdk/types.js';
import { SDWebUIClient } from '../api/client';
import { ToolGenerator } from './tool-generator';
import { ServerConfig, ToolExecutionResult } from './types';
import * as fs from 'fs';
import * as path from 'path';
const { Jimp } = require('jimp');
const { intToRGBA, rgbaToInt } = require('@jimp/utils');

export class MCPServer {
  private server: Server;
  private apiClient: SDWebUIClient;
  private toolGenerator: ToolGenerator;
  private config: ServerConfig;
  private cachedTools: MCPTool[] | null = null;

  constructor(config: ServerConfig = {}) {
    this.config = {
      presetsDir: config.presetsDir || path.join(__dirname, '../../presets'),
      apiUrl: config.apiUrl || process.env.SD_WEBUI_URL,
      serverName: config.serverName || 'sdreforge-mcp',
      serverVersion: config.serverVersion || '0.1.0',
      debug: config.debug || true  // Enable debug for troubleshooting
    };

    // Initialize components
    this.apiClient = new SDWebUIClient(this.config.apiUrl);
    this.toolGenerator = new ToolGenerator(this.config.presetsDir);

    // Initialize MCP server
    this.server = new Server(
      {
        name: this.config.serverName!,
        version: this.config.serverVersion!
      },
      {
        capabilities: {
          tools: {}
        }
      }
    );

    this.setupHandlers();
  }

  /**
   * Setup request handlers
   */
  private setupHandlers(): void {
    // List tools handler with caching
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      console.log('[CONSOLE] ListTools request received');
      if (!this.cachedTools) {
        console.log('[CONSOLE] Generating tools for first time...');
        this.cachedTools = this.toolGenerator.generateTools();
        console.log(`[CONSOLE] Generated ${this.cachedTools.length} tools`);
      } else {
        console.log(`[CONSOLE] Using cached tools: ${this.cachedTools.length} tools`);
      }
      return { tools: this.cachedTools };
    });

    // Call tool handler
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      // Log to file immediately when request is received
      const callLogPath = path.join(process.cwd(), 'mcp-call-requests.log');
      const callLogEntry = `[${new Date().toISOString()}] CALL REQUEST: ${name}\nArgs: ${JSON.stringify(args, null, 2)}\n=====\n`;
      fs.appendFileSync(callLogPath, callLogEntry);

      try {
        const result = await this.executeTool(name, args);

        if (result.success) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(result.data, null, 2)
              }
            ]
          };
        } else {
          return {
            content: [
              {
                type: 'text',
                text: `Error: ${result.error}`
              }
            ],
            isError: true
          };
        }
      } catch (error: any) {
        return {
          content: [
            {
              type: 'text',
              text: `Failed to execute tool: ${error.message}`
            }
          ],
          isError: true
        };
      }
    });
  }

  /**
   * Execute a tool
   */
  /**
   * Combine multiple black & white masks into a single colored mask for Regional Prompter
   */
  async combineMasks(maskPaths: string[]): Promise<string> {
    const debugLogPath = path.join(process.cwd(), 'mcp-tool-execution.log');

    if (!maskPaths || maskPaths.length === 0) {
      throw new Error('No mask paths provided');
    }

    // Generate colors using the same deterministic algorithm as Regional Prompter
    const deterministic_colours = (n: number): Array<[number, number, number]> => {
      const colors: Array<[number, number, number]> = [];
      let pcyc = -1;
      let cval = 0;
      let dlt = 0;

      for (let i = 0; i < n; i++) {
        const ccyc = Math.ceil(Math.log2(i + 1));

        if (ccyc === 0) { // First col = 0
          cval = 0;
          pcyc = ccyc;
        } else if (pcyc !== ccyc) { // New cycle, start from the half point between 0 and first point
          dlt = 1 / Math.pow(2, ccyc);
          cval = dlt;
          pcyc = ccyc;
        } else {
          cval = cval + 2 * dlt; // Jumps over existing vals
        }

        // HSV to RGB conversion (H=cval, S=0.5, V=0.5)
        const h = cval;
        const s = 0.5;
        const v = 0.5;

        const c = v * s;
        const x = c * (1 - Math.abs(((h * 6) % 2) - 1));
        const m = v - c;

        let r = 0, g = 0, b = 0;
        if (h < 1/6) { r = c; g = x; b = 0; }
        else if (h < 2/6) { r = x; g = c; b = 0; }
        else if (h < 3/6) { r = 0; g = c; b = x; }
        else if (h < 4/6) { r = 0; g = x; b = c; }
        else if (h < 5/6) { r = x; g = 0; b = c; }
        else { r = c; g = 0; b = x; }

        // Convert to 0-255 range (CBLACK = 255)
        colors.push([
          Math.round((r + m) * 256),  // Note: 256 not 255, to match (CBLACK + 1)
          Math.round((g + m) * 256),
          Math.round((b + m) * 256)
        ]);
      }

      return colors;
    };

    try {
      // Load all masks
      const masks = await Promise.all(maskPaths.map(async (path) => {
        const img = await Jimp.read(path);
        return img;
      }));

      if (masks.length === 0) {
        throw new Error('No masks loaded successfully');
      }

      // Get dimensions from first mask
      const width = masks[0].bitmap.width;
      const height = masks[0].bitmap.height;

      // Create combined mask with black background
      const combined = new Jimp({ width, height, color: 0x000000FF });

      // Generate colors for regions
      // Index 0 is background (black), index 1-n are for the mask regions
      const regionColors = deterministic_colours(masks.length + 1);

      fs.appendFileSync(debugLogPath, `Combining ${masks.length} masks, dimensions: ${width}x${height}\n`);
      fs.appendFileSync(debugLogPath, `Generated colors: ${JSON.stringify(regionColors)}\n`);

      // Process each mask
      for (let maskIndex = 0; maskIndex < masks.length; maskIndex++) {
        const mask = masks[maskIndex];
        const regionIndex = maskIndex + 1; // Region 1, 2, 3... (0 is background)
        const [r, g, b] = regionColors[regionIndex];

        fs.appendFileSync(debugLogPath, `Processing mask ${maskIndex} as region ${regionIndex} with color RGB(${r},${g},${b})\n`);

        // Scan through each pixel (use arrow function to avoid 'this' context issues)
        mask.scan(0, 0, width, height, (x: number, y: number, idx: number) => {
          // Get mask pixel color
          const pixelColor = mask.getPixelColor(x, y);
          const { r: mr, g: mg, b: mb } = intToRGBA(pixelColor);

          // Check if pixel is white (mask area)
          if (mr > 128 || mg > 128 || mb > 128) {
            // Check if combined mask is still black at this position
            const currentColor = combined.getPixelColor(x, y);
            const { r: cr, g: cg, b: cb } = intToRGBA(currentColor);

            if (cr === 0 && cg === 0 && cb === 0) { // Still black (uncolored)
              // Set the region color
              const newColor = rgbaToInt(r, g, b, 255);
              combined.setPixelColor(newColor, x, y);
            }
          }
        });
      }

      // Save combined mask for debugging
      const debugMaskPath = path.join(process.cwd(), 'output', `combined_mask_${Date.now()}.png`);
      await combined.write(debugMaskPath);
      fs.appendFileSync(debugLogPath, `Saved combined mask to: ${debugMaskPath}\n`);

      // Convert to base64
      const buffer = await combined.getBuffer("image/png");
      const base64 = buffer.toString('base64');

      fs.appendFileSync(debugLogPath, `Successfully combined masks into base64 (size: ${base64.length})\n`);

      return base64;

    } catch (error) {
      fs.appendFileSync(debugLogPath, `Error in combineMasks: ${error}\n`);
      throw error;
    }
  }

  async executeTool(toolName: string, params: any): Promise<ToolExecutionResult> {
    try {
      // Debug: Log all received parameters to file
      const debugLogPath = path.join(process.cwd(), 'mcp-tool-execution.log');
      const logEntry = `[${new Date().toISOString()}] Tool: ${toolName}\nParams: ${JSON.stringify(params, null, 2)}\n---\n`;
      fs.appendFileSync(debugLogPath, logEntry);

      // Get preset
      const presetName = toolName.replace(/^sdreforge_/, '');
      const preset = this.toolGenerator.getPreset(presetName);

      if (!preset) {
        return {
          success: false,
          error: `Preset not found: ${presetName}`
        };
      }

      // Check for unsupported Regional Prompter modes BEFORE generating payload
      // TEMPORARILY DISABLED - Mask/Prompt modes may not work correctly via API (REGUSE variable issue)
      // if (params.rp_active && (params.rp_mode === 'Mask' || params.rp_mode === 'Prompt')) {
      //   fs.appendFileSync(debugLogPath, `Error: Regional Prompter ${params.rp_mode} mode is not supported via API\n`);
      //   return {
      //     success: false,
      //     error: `Regional Prompter ${params.rp_mode} mode is not supported via API. Please use Matrix mode (Columns/Rows) instead. See docs/regional-prompter-mask-mode-api-investigation.md for details.`
      //   };
      // }

      // Generate payload from preset and user params
      const payload = this.toolGenerator.getPresetManager().presetToPayload(preset, params);

      // Debug: Check preset type
      fs.appendFileSync(debugLogPath, `Preset type: ${preset.type}\n`);
      console.log(`[DEBUG] Preset type: ${preset.type}`);

      // Special handling for img2img - process file paths BEFORE switch statement
      if (preset.type === 'img2img') {
        fs.appendFileSync(debugLogPath, `[IMG2IMG] Entering img2img processing block\n`);
        console.log(`[IMG2IMG] Processing with params keys: ${Object.keys(params).join(', ')}`);

        // Handle base64 image input
        if (params.init_image) {
          let initImageData = params.init_image;
          console.log(`[IMG2IMG] init_image input type check:`);
          console.log(`  - Input length: ${params.init_image.length}`);
          console.log(`  - First 100 chars: ${params.init_image.substring(0, 100)}`);

          // Check if it's a file path (not base64 data)
          // More robust check: file path vs base64
          const isBase64 = /^[A-Za-z0-9+/]+=*$/.test(params.init_image) || params.init_image.startsWith('data:image');
          const isFilePath = !isBase64 && (
            params.init_image.includes('\\') ||
            params.init_image.includes('/') ||
            /^[A-Z]:/i.test(params.init_image) ||
            fs.existsSync(params.init_image)
          );

          console.log(`  - Is base64: ${isBase64}`);
          console.log(`  - Is file path: ${isFilePath}`);

          if (isFilePath) {
            try {
              const resolvedPath = path.resolve(params.init_image);
              console.log(`  - Resolved path: ${resolvedPath}`);

              if (fs.existsSync(resolvedPath)) {
                const stats = fs.statSync(resolvedPath);
                console.log(`  - File size: ${stats.size} bytes`);

                const buffer = fs.readFileSync(resolvedPath);
                initImageData = buffer.toString('base64');

                console.log(`  ✓ Successfully loaded init_image from file`);
                console.log(`    - Base64 length: ${initImageData.length}`);
                console.log(`    - Base64 preview: ${initImageData.substring(0, 50)}...`);
                fs.appendFileSync(debugLogPath, `[IMG2IMG] init_image converted from file to base64 (${initImageData.length} chars)\n`);
              } else {
                console.error(`  ✗ File does not exist: ${resolvedPath}`);
                fs.appendFileSync(debugLogPath, `[IMG2IMG] ERROR: init_image file not found: ${resolvedPath}\n`);
              }
            } catch (e) {
              console.error(`  ✗ Error loading init_image: ${e}`);
              fs.appendFileSync(debugLogPath, `[IMG2IMG] ERROR loading init_image: ${e}\n`);
            }
          } else if (isBase64) {
            console.log(`  - Using existing base64 data`);
            fs.appendFileSync(debugLogPath, `[IMG2IMG] init_image already in base64 format\n`);
          }

          payload.init_images = [initImageData];
          console.log(`[IMG2IMG] Final init_images[0] length: ${payload.init_images[0].length}`);
        }

        // Handle mask image for inpainting (preset 27 inpaint mode)
        if (params.mask_image) {
          console.log(`[IMG2IMG] mask_image input type check:`);
          console.log(`  - Input length: ${params.mask_image.length}`);
          console.log(`  - First 100 chars: ${params.mask_image.substring(0, 100)}`);

          let maskImageData = params.mask_image;

          // Check if it's a file path (not base64 data)
          const isMaskBase64 = /^[A-Za-z0-9+/]+=*$/.test(params.mask_image) || params.mask_image.startsWith('data:image');
          const isMaskFilePath = !isMaskBase64 && (
            params.mask_image.includes('\\') ||
            params.mask_image.includes('/') ||
            /^[A-Z]:/i.test(params.mask_image) ||
            fs.existsSync(params.mask_image)
          );

          console.log(`  - Is base64: ${isMaskBase64}`);
          console.log(`  - Is file path: ${isMaskFilePath}`);

          if (isMaskFilePath) {
            try {
              const resolvedPath = path.resolve(params.mask_image);
              console.log(`  - Resolved path: ${resolvedPath}`);

              if (fs.existsSync(resolvedPath)) {
                const stats = fs.statSync(resolvedPath);
                console.log(`  - File size: ${stats.size} bytes`);

                const buffer = fs.readFileSync(resolvedPath);
                maskImageData = buffer.toString('base64');

                console.log(`  ✓ Successfully loaded mask_image from file`);
                console.log(`    - Base64 length: ${maskImageData.length}`);
                console.log(`    - Base64 preview: ${maskImageData.substring(0, 50)}...`);
                fs.appendFileSync(debugLogPath, `[IMG2IMG] mask_image converted from file to base64 (${maskImageData.length} chars)\n`);
              } else {
                console.error(`  ✗ File does not exist: ${resolvedPath}`);
                fs.appendFileSync(debugLogPath, `[IMG2IMG] ERROR: mask_image file not found: ${resolvedPath}\n`);
              }
            } catch (e) {
              console.error(`  ✗ Error loading mask_image: ${e}`);
              fs.appendFileSync(debugLogPath, `[IMG2IMG] ERROR loading mask_image: ${e}\n`);
            }
          } else if (isMaskBase64) {
            console.log(`  - Using existing base64 data`);
            fs.appendFileSync(debugLogPath, `[IMG2IMG] mask_image already in base64 format\n`);
          }

          payload.mask = maskImageData;
          console.log(`[IMG2IMG] Final mask length: ${payload.mask.length}`);

          // Apply inpaint-specific parameters if provided
          if (params.mask_blur !== undefined) payload.mask_blur = params.mask_blur;
          if (params.inpainting_fill !== undefined) payload.inpainting_fill = params.inpainting_fill;
          if (params.inpaint_full_res !== undefined) payload.inpaint_full_res = params.inpaint_full_res;
          if (params.inpaint_full_res_padding !== undefined) payload.inpaint_full_res_padding = params.inpaint_full_res_padding;
          if (params.inpainting_mask_invert !== undefined) payload.inpainting_mask_invert = params.inpainting_mask_invert;

          console.log(`[IMG2IMG] Inpaint mode enabled with parameters:`);
          console.log(`  - mask_blur: ${payload.mask_blur}`);
          console.log(`  - inpainting_fill: ${payload.inpainting_fill}`);
          console.log(`  - inpaint_full_res: ${payload.inpaint_full_res}`);
          console.log(`  - inpaint_full_res_padding: ${payload.inpaint_full_res_padding}`);
          console.log(`  - inpainting_mask_invert: ${payload.inpainting_mask_invert}`);

          fs.appendFileSync(debugLogPath, `[IMG2IMG] Inpaint parameters set\n`);
        }

        // Clean up redundant fields that were copied from userParams
        // The API expects init_images array and mask, not init_image and mask_image
        delete payload.init_image;
        delete payload.mask_image;

        // Final validation and debug summary
        console.log('\n[IMG2IMG] === Final Payload Validation ===');
        console.log(`  - init_images array present: ${!!payload.init_images}`);
        console.log(`  - init_images[0] length: ${payload.init_images?.[0]?.length || 0}`);
        console.log(`  - mask present: ${!!payload.mask}`);
        console.log(`  - mask length: ${payload.mask?.length || 0}`);
        console.log(`  - Payload ready for API: ${payload.init_images && payload.init_images[0] ? '✓' : '✗'}`);

        fs.appendFileSync(debugLogPath, `[IMG2IMG] Final payload state: init_images=${!!payload.init_images}, mask=${!!payload.mask}\n`);
      }

      // Special handling for img2img upscaler
      let originalUpscalerSetting: string | null = null;
      if (presetName === 'img2img_cn_multi_3units' && params.upscaler_model) {
        try {
          // Get current upscaler setting
          const currentOptions = await this.apiClient.getOptions();
          originalUpscalerSetting = currentOptions.upscaler_for_img2img;

          fs.appendFileSync(debugLogPath, `Original upscaler: ${originalUpscalerSetting}, Requested: ${params.upscaler_model}\n`);

          // Change upscaler if different
          if (originalUpscalerSetting !== params.upscaler_model) {
            await this.apiClient.setOptions({
              upscaler_for_img2img: params.upscaler_model
            });

            fs.appendFileSync(debugLogPath, `Changed upscaler from ${originalUpscalerSetting} to ${params.upscaler_model}\n`);
          }
        } catch (error) {
          fs.appendFileSync(debugLogPath, `Error managing upscaler setting: ${error}\n`);
        }
      }

      // Special handling for fully parameterized ControlNet preset (26)
      fs.appendFileSync(debugLogPath, `Checking preset 26 conditions: presetName=${presetName}, has_alwayson=${!!payload.alwayson_scripts}, has_controlnet=${!!(payload.alwayson_scripts?.ControlNet)}, has_args=${!!(payload.alwayson_scripts?.ControlNet?.args)}\n`);

      if ((presetName === 'txt2img_cn_multi_3units' || presetName === 'img2img_cn_multi_3units') && payload.alwayson_scripts?.ControlNet?.args) {
        // Apply user parameter overrides to default ControlNet units
        // Check if any ControlNet images are provided
        const hasAnyControlNetImage = params.controlnet_image || params.controlnet_image_2 || params.controlnet_image_3;

        // Disable ControlNet entirely if no images provided
        if (!hasAnyControlNetImage) {
          delete payload.alwayson_scripts.ControlNet;
          fs.appendFileSync(debugLogPath, `Disabled ControlNet entirely (no images provided)\n`);
        } else {
          // Only process units if ControlNet is enabled
          const units = payload.alwayson_scripts.ControlNet.args;

          // Unit 0 overrides (disable if no image AND model is not "None")
          if (units[0]) {
            if (!params.controlnet_image) {
              // Disable Unit 0 if no image provided
              units[0].enabled = false;
              fs.appendFileSync(debugLogPath, `Disabled ControlNet Unit 0 (no image provided)\n`);
            } else {
              // Enable and configure Unit 0
              units[0].enabled = true;
              if (params.controlnet_model_1) units[0].model = params.controlnet_model_1;
              if (params.controlnet_module_1) units[0].module = params.controlnet_module_1;
              if (params.controlnet_weight_1 !== undefined) units[0].weight = params.controlnet_weight_1;
            }
          }

          // Unit 1 overrides (enable only if image provided)
          if (units[1]) {
            if (params.controlnet_image_2) {
              units[1].enabled = true;
              if (params.controlnet_model_2) units[1].model = params.controlnet_model_2;
              if (params.controlnet_module_2) units[1].module = params.controlnet_module_2;
              if (params.controlnet_weight_2 !== undefined) units[1].weight = params.controlnet_weight_2;
            } else {
              units[1].enabled = false;
              fs.appendFileSync(debugLogPath, `Disabled ControlNet Unit 1 (no image provided)\n`);
            }
          }

          // Unit 2 overrides (enable only if image provided)
          if (units[2]) {
            if (params.controlnet_image_3) {
              units[2].enabled = true;
              if (params.controlnet_model_3) units[2].model = params.controlnet_model_3;
              if (params.controlnet_module_3) units[2].module = params.controlnet_module_3;
              if (params.controlnet_weight_3 !== undefined) units[2].weight = params.controlnet_weight_3;
            } else {
              units[2].enabled = false;
              fs.appendFileSync(debugLogPath, `Disabled ControlNet Unit 2 (no image provided)\n`);
            }
          }
        }

        // ADetailer selective configuration
        if (payload.alwayson_scripts?.ADetailer?.args) {
          const adetailerArgs = payload.alwayson_scripts.ADetailer.args;

          // Rebuild ADetailer args array with only specified models
          const newADetailerArgs: any[] = [
            true,   // enable flag
            false   // skip_img2img flag
          ];

          // Add Model 1 (always enabled - face detection by default)
          newADetailerArgs.push({ ad_model: 'face_yolov8n.pt' });

          // Add Model 2 only if specified
          if (params.adetailer_model_2) {
            newADetailerArgs.push({ ad_model: params.adetailer_model_2 });
            fs.appendFileSync(debugLogPath, `Enabled ADetailer Model 2: ${params.adetailer_model_2}\n`);
          }

          // Add Model 3 only if specified
          if (params.adetailer_model_3) {
            newADetailerArgs.push({ ad_model: params.adetailer_model_3 });
            fs.appendFileSync(debugLogPath, `Enabled ADetailer Model 3: ${params.adetailer_model_3}\n`);
          }

          // Add Model 4 only if specified
          if (params.adetailer_model_4) {
            newADetailerArgs.push({ ad_model: params.adetailer_model_4 });
            fs.appendFileSync(debugLogPath, `Enabled ADetailer Model 4: ${params.adetailer_model_4}\n`);
          }

          // Replace the args array
          payload.alwayson_scripts.ADetailer.args = newADetailerArgs;
          fs.appendFileSync(debugLogPath, `ADetailer configured with ${newADetailerArgs.length - 2} models\n`);
        }

        // Hires Fix overrides
        if (params.enable_hr !== undefined) {
          payload.enable_hr = params.enable_hr;
          fs.appendFileSync(debugLogPath, `Hires Fix enabled: ${params.enable_hr}\n`);

          if (params.enable_hr) {
            // Apply Hires Fix parameters if enabled
            if (params.hr_scale !== undefined) payload.hr_scale = params.hr_scale;
            if (params.hr_upscaler) payload.hr_upscaler = params.hr_upscaler;
            if (params.hr_second_pass_steps !== undefined) payload.hr_second_pass_steps = params.hr_second_pass_steps;
            if (params.hr_denoising_strength !== undefined) payload.denoising_strength = params.hr_denoising_strength;
            if (params.hr_resize_x !== undefined) payload.hr_resize_x = params.hr_resize_x;
            if (params.hr_resize_y !== undefined) payload.hr_resize_y = params.hr_resize_y;

            fs.appendFileSync(debugLogPath, `Hires Fix configured: scale=${payload.hr_scale}, upscaler=${payload.hr_upscaler}\n`);
          }
        }

        // Batch generation overrides
        if (params.batch_size !== undefined) {
          payload.batch_size = params.batch_size;
          fs.appendFileSync(debugLogPath, `Batch size set to: ${params.batch_size}\n`);
        }
        if (params.n_iter !== undefined) {
          payload.n_iter = params.n_iter;
          fs.appendFileSync(debugLogPath, `Batch iterations set to: ${params.n_iter}\n`);
        }

        // Dynamic Prompts overrides (18 arguments structure)
        if (payload.alwayson_scripts && (params.enable_dynamic_prompts !== undefined || params.magic_prompt !== undefined || params.combinatorial_generation !== undefined || params.max_generations !== undefined)) {
          // Initialize Dynamic Prompts if not exists (correct 18 arguments)
          if (!payload.alwayson_scripts['dynamic prompts v2.17.1']) {
            payload.alwayson_scripts['dynamic prompts v2.17.1'] = {
              args: [
                true,            // 1: enabled
                false,           // 2: combinatorial
                1,               // 3: combinatorial_batches
                false,           // 4: magic_prompt
                false,           // 5: feeling_lucky
                false,           // 6: attention_grabber
                1.1,             // 7: min_attention
                1.5,             // 8: max_attention
                100,             // 9: magic_prompt_length
                0.7,             // 10: magic_temp_value
                true,            // 11: use_fixed_seed (for combinatorial generation)
                false,           // 12: unlink_seed_from_prompt
                false,           // 13: disable_negative_prompt
                false,           // 14: enable_jinja_templates
                false,           // 15: no_image_generation
                0,               // 16: max_generations
                "magic_prompt",  // 17: magic_model
                ""               // 18: magic_blocklist_regex
              ]
            };
          }

          const dpArgs = payload.alwayson_scripts['dynamic prompts v2.17.1'].args;

          // Apply overrides to correct positions
          if (params.enable_dynamic_prompts !== undefined) dpArgs[0] = params.enable_dynamic_prompts;
          if (params.combinatorial_generation !== undefined) dpArgs[1] = params.combinatorial_generation;
          if (params.magic_prompt !== undefined) dpArgs[3] = params.magic_prompt;
          if (params.use_fixed_seed !== undefined) dpArgs[10] = params.use_fixed_seed; // Position 11 (0-indexed)
          if (params.max_generations !== undefined) dpArgs[15] = params.max_generations; // Position 16 (0-indexed)

          fs.appendFileSync(debugLogPath, `Dynamic Prompts configured: enabled=${dpArgs[0]}, combinatorial=${dpArgs[1]}, use_fixed_seed=${dpArgs[10]}, magic=${dpArgs[3]}, max_gen=${dpArgs[15]}\n`);
        }

        // Regional Prompter overrides (16 arguments structure)
        if (params.rp_active) {
          // Initialize Regional Prompter if not exists
          if (!payload.alwayson_scripts) payload.alwayson_scripts = {};

          // Adjust base_ratio for Mask mode based on BREAK count
          let baseRatioValue = params.rp_base_ratio || '0.2';

          // Fix for bratios persistence issue - ensure proper initialization
          if (!baseRatioValue || baseRatioValue === '' || baseRatioValue === '[]' || baseRatioValue === '[][]') {
            baseRatioValue = '0.2';
            fs.appendFileSync(debugLogPath, `Warning: bratios was empty or invalid, reset to default: "${baseRatioValue}"\n`);
          }

          // Validation - ensure baseRatioValue is never empty
          if (!baseRatioValue || baseRatioValue.trim() === '') {
            baseRatioValue = '0.2';
            fs.appendFileSync(debugLogPath, `Validation: baseRatioValue was empty, set to: "${baseRatioValue}"\n`);
          }

          // Handle mask combination for Mask mode
          let polymaskData: string | null = null;
          if (params.rp_mode === 'Mask') {
            // Combine user-provided masks into a single colored mask
            const maskPaths: string[] = [];
            if (params.rp_mask_1) maskPaths.push(params.rp_mask_1);
            if (params.rp_mask_2) maskPaths.push(params.rp_mask_2);
            if (params.rp_mask_3) maskPaths.push(params.rp_mask_3);

            if (maskPaths.length > 0) {
              fs.appendFileSync(debugLogPath, `Combining ${maskPaths.length} masks for Regional Prompter\n`);
              try {
                const combinedMaskBase64 = await this.combineMasks(maskPaths);
                if (combinedMaskBase64) {
                  polymaskData = combinedMaskBase64;
                  fs.appendFileSync(debugLogPath, `Successfully combined masks into base64 data (length: ${combinedMaskBase64.length})\n`);
                }
              } catch (error) {
                fs.appendFileSync(debugLogPath, `Error combining masks: ${error}\n`);
              }
            }
          }

          // Build 16+1 argument structure (17 total for Mask mode)
          const rpArgs = [
            params.rp_active || false,                           // 1: active
            params.rp_debug || false,                           // 2: debug
            params.rp_mode || 'Matrix',                         // 3: mode
            params.rp_matrix_submode || 'Columns',              // 4: matrix_submode
            params.rp_mask_submode || 'Mask',                   // 5: mask_submode
            params.rp_prompt_submode || 'Prompt',               // 6: prompt_submode
            params.rp_divide_ratio || '1,1',                    // 7: divide_ratio
            baseRatioValue,                                      // 8: base_ratio (adjusted for Mask mode)
            params.rp_use_base !== undefined ? params.rp_use_base : true,     // 9: use_base
            params.rp_use_common || false,                      // 10: use_common
            params.rp_use_ncommon || false,                     // 11: use_ncommon
            params.rp_calc_mode || 'Attention',                 // 12: calc_mode
            params.rp_not_change_and || false,                 // 13: not_change_and
            params.rp_lora_stop_step || '0',                    // 14: lora_stop_step
            params.rp_lora_hires_stop_step || '0',              // 15: lora_hires_stop_step
            params.rp_threshold || '0.4'                        // 16: threshold
          ];

          // Add 17th parameter for Mask mode
          if (params.rp_mode === 'Mask' && polymaskData) {
            rpArgs.push(polymaskData);  // 17: polymask (combined mask as base64)
            fs.appendFileSync(debugLogPath, `Added polymask as 17th parameter\n`);
          }

          // Log the final rpArgs for debugging
          fs.appendFileSync(debugLogPath, `Final Regional Prompter args:\n${JSON.stringify(rpArgs.slice(0, 16), null, 2)}\n`);
          if (rpArgs.length > 16) {
            fs.appendFileSync(debugLogPath, `Plus polymask data (17th param, length: ${rpArgs[16].length})\n`);
          }
          fs.appendFileSync(debugLogPath, `Specifically - base_ratio (arg[7]): "${rpArgs[7]}"\n`);

          payload.alwayson_scripts['Regional Prompter'] = {
            args: rpArgs
          };

          fs.appendFileSync(debugLogPath, `Regional Prompter configured: mode=${params.rp_mode}, active=${params.rp_active}\n`);
        }

        fs.appendFileSync(debugLogPath, `Applied user parameter overrides to all features\n`);
      }

      // Add required fields
      payload.send_images = true;
      payload.save_images = false;

      // Handle model checkpoint switching if specified in preset
      if (preset.base_settings?.checkpoint) {
        console.log('Checkpoint specified in preset:', preset.base_settings.checkpoint);
        try {
          // Get current model from API
          const currentOptions = await this.apiClient.getOptions();
          const currentModel = currentOptions.sd_model_checkpoint;
          console.log('Current model in API:', currentModel);

          // Build the full model title (format: "sd\\modelname.safetensors [hash]")
          let targetModel = preset.base_settings.checkpoint;

          // If the model name doesn't already have the full format, try to find it
          if (!targetModel.includes('.safetensors') && !targetModel.includes('.ckpt')) {
            console.log('Looking up full model title for:', targetModel);
            // Get available models to find the full title
            const models = await this.apiClient.getModels();
            const modelInfo = models.find((m: any) => {
              // Try exact match with model_name first
              if (m.model_name === targetModel) return true;
              // Handle sd_ prefix - preset has sd_animagineXL40_v4Opt
              const targetWithoutPrefix = targetModel.startsWith('sd_') ? targetModel.substring(3) : targetModel;
              if (m.model_name === targetWithoutPrefix) return true;
              // Try adding sd_ prefix if not present
              if (!targetModel.startsWith('sd_') && m.model_name === `sd_${targetModel}`) return true;
              // Try title includes
              if (m.title.includes(targetWithoutPrefix)) return true;
              // Try title includes with backslash
              if (m.title.includes(`\\${targetWithoutPrefix}`)) return true;
              return false;
            });

            if (modelInfo) {
              targetModel = modelInfo.title;
              console.log('Found full model title:', targetModel);
            } else {
              console.log('Model not found in available models');
            }
          }

          // Only switch if the model is different
          if (currentModel !== targetModel) {
            if (this.config.debug) {
              console.log(`Switching model from ${currentModel} to ${targetModel}`);
            }

            // Switch the model via options API
            await this.apiClient.setOptions({
              sd_model_checkpoint: targetModel
            });

            // Wait a bit for model to load
            await new Promise(resolve => setTimeout(resolve, 2000));

            if (this.config.debug) {
              console.log('Model switched successfully');
            }
          } else {
            if (this.config.debug) {
              console.log('Model already set, no switch needed');
            }
          }
        } catch (error) {
          console.error('Failed to switch model:', error);
          // Continue with generation even if model switch fails
        }
      }

      // Handle ControlNet image parameter - log to file
      const controlnetDebugInfo = {
        has_controlnet_image: !!params.controlnet_image,
        controlnet_image_path: params.controlnet_image,
        has_alwayson_scripts: !!payload.alwayson_scripts,
        has_controlnet_in_scripts: !!(payload.alwayson_scripts?.ControlNet)
      };
      fs.appendFileSync(debugLogPath, `ControlNet Check: ${JSON.stringify(controlnetDebugInfo, null, 2)}\n`);

      // Handle multiple ControlNet image parameters (controlnet_image, controlnet_image_2, controlnet_image_3)
      if (payload.alwayson_scripts?.ControlNet) {
        try {
          // Process multiple ControlNet images
          const imageParams = [
            { key: 'controlnet_image', unitIndex: 0 },
            { key: 'controlnet_image_2', unitIndex: 1 },
            { key: 'controlnet_image_3', unitIndex: 2 }
          ];

          for (const imageParam of imageParams) {
            const imageParamValue = params[imageParam.key];
            if (imageParamValue && payload.alwayson_scripts.ControlNet.args[imageParam.unitIndex]) {
              // Read image file and convert to base64
              let imageData = imageParamValue;
              // Check if it's a file path (not base64 data)
              if (!imageParamValue.startsWith('data:') && !imageParamValue.match(/^[A-Za-z0-9+/]+=*$/)) {
                try {
                  const resolvedPath = path.resolve(imageParamValue);
                  if (fs.existsSync(resolvedPath)) {
                    const buffer = fs.readFileSync(resolvedPath);
                    imageData = buffer.toString('base64');
                  }
                } catch (e) {
                  // If it fails, assume it's already base64 data
                }
              }

              // Add image to corresponding ControlNet unit
              payload.alwayson_scripts.ControlNet.args[imageParam.unitIndex].image = imageData;
              fs.appendFileSync(debugLogPath, `Added image to ControlNet Unit ${imageParam.unitIndex}: ${imageParam.key}\n`);
            }
          }


          // Resolve ControlNet model names (using proven working logic)
          if (payload.alwayson_scripts.ControlNet.args && payload.alwayson_scripts.ControlNet.args.length > 0) {
            fs.appendFileSync(debugLogPath, `Starting ControlNet model resolution for ${payload.alwayson_scripts.ControlNet.args.length} units\n`);

            for (const unit of payload.alwayson_scripts.ControlNet.args) {
              if (unit.model && !unit.model.includes('[')) {
                fs.appendFileSync(debugLogPath, `Resolving ControlNet model: ${unit.model}\n`);
                try {
                  const controlnetModels = await this.apiClient.getControlNetModels();
                  const modelInfo = controlnetModels.find((modelName: string) => {
                    // Try exact match first
                    if (modelName === unit.model) return true;
                    // Try includes match (without hash)
                    if (modelName.includes(unit.model)) return true;
                    // Try case-insensitive match
                    if (modelName.toLowerCase().includes(unit.model.toLowerCase())) return true;
                    return false;
                  });

                  if (modelInfo) {
                    fs.appendFileSync(debugLogPath, `Resolved ControlNet model: ${unit.model} -> ${modelInfo}\n`);
                    unit.model = modelInfo;
                  } else {
                    fs.appendFileSync(debugLogPath, `WARNING: ControlNet model not found: ${unit.model}\n`);
                  }
                } catch (error: any) {
                  fs.appendFileSync(debugLogPath, `ERROR: Failed to resolve ControlNet model: ${error.message}\n`);
                }
              }
            }

            fs.appendFileSync(debugLogPath, `ControlNet processing complete\n`);
          }
        } catch (error) {
          console.error('[ERROR] Failed to process ControlNet image:', error);
        }
      }

      // Debug: Log the actual payload being sent
      if (payload.alwayson_scripts) {
        console.error('[DEBUG] Payload alwayson_scripts:', JSON.stringify(payload.alwayson_scripts, null, 2));
      }

      // Execute based on preset type
      let response;
      switch (preset.type) {
        case 'txt2img':
          // Comprehensive payload logging before API call
          const path = require('path');
          const payloadLogPath = path.join(process.cwd(), 'payload-debug.log');
          const timestamp = new Date().toISOString();
          fs.appendFileSync(payloadLogPath, `\n========== txt2img API Call at ${timestamp} ==========\n`);
          fs.appendFileSync(payloadLogPath, `Preset: ${presetName}\n`);
          fs.appendFileSync(payloadLogPath, `\n--- Core Parameters ---\n`);
          fs.appendFileSync(payloadLogPath, `prompt: "${payload.prompt}"\n`);
          fs.appendFileSync(payloadLogPath, `negative_prompt: "${payload.negative_prompt || ''}"\n`);
          fs.appendFileSync(payloadLogPath, `steps: ${payload.steps}\n`);
          fs.appendFileSync(payloadLogPath, `cfg_scale: ${payload.cfg_scale}\n`);
          fs.appendFileSync(payloadLogPath, `sampler_name: "${payload.sampler_name}"\n`);
          fs.appendFileSync(payloadLogPath, `clip_skip: ${payload.clip_skip}\n`);
          fs.appendFileSync(payloadLogPath, `width: ${payload.width}\n`);
          fs.appendFileSync(payloadLogPath, `height: ${payload.height}\n`);
          fs.appendFileSync(payloadLogPath, `seed: ${payload.seed}\n`);
          fs.appendFileSync(payloadLogPath, `batch_size: ${payload.batch_size}\n`);
          fs.appendFileSync(payloadLogPath, `n_iter: ${payload.n_iter}\n`);
          fs.appendFileSync(payloadLogPath, `enable_hr: ${payload.enable_hr}\n`);
          fs.appendFileSync(payloadLogPath, `denoising_strength: ${payload.denoising_strength}\n`);

          fs.appendFileSync(payloadLogPath, `\n--- Model Checkpoint ---\n`);
          fs.appendFileSync(payloadLogPath, `checkpoint_from_preset: "${preset.base_settings?.checkpoint || 'not specified'}"\n`);
          fs.appendFileSync(payloadLogPath, `override_checkpoint: "${payload.override_settings?.checkpoint || 'not specified'}"\n`);

          if (payload.alwayson_scripts) {
            fs.appendFileSync(payloadLogPath, `\n--- AlwaysOn Scripts ---\n`);
            fs.appendFileSync(payloadLogPath, JSON.stringify(payload.alwayson_scripts, null, 2) + '\n');
          }

          fs.appendFileSync(payloadLogPath, `\n--- Full Payload ---\n`);
          fs.appendFileSync(payloadLogPath, JSON.stringify(payload, (key, value) => {
            // Truncate base64 image data for readability
            if (typeof value === 'string' && value.length > 100 && value.match(/^[A-Za-z0-9+/]+=*$/)) {
              return `[BASE64_DATA_${value.length}_CHARS]`;
            }
            return value;
          }, 2) + '\n');
          fs.appendFileSync(payloadLogPath, `========== End of payload log ==========\n\n`);

          response = await this.apiClient.txt2img(payload);
          break;

        case 'img2img':
          // img2img processing is already handled before the switch statement (lines 290-356)
          // The payload should already have init_images and mask properly set from the pre-processing

          // Debug: Log the final payload state
          console.log('[IMG2IMG] Final payload state:');
          console.log('- init_images present:', !!payload.init_images);
          console.log('- init_images[0] length:', payload.init_images?.[0]?.length);
          console.log('- mask present:', !!payload.mask);
          console.log('- mask length:', payload.mask?.length);

          response = await this.apiClient.img2img(payload);
          break;

        case 'png-info':
          // PNG Info extraction
          if (params.image) {
            // Read image file and convert to base64 if it's a file path
            let imageData = params.image;
            // Check if it's a file path (not base64 data)
              const path = require('path');
            // If it looks like a path and not base64 data
            if (!params.image.startsWith('data:') && !params.image.match(/^[A-Za-z0-9+/]+=*$/)) {
              try {
                // Try to resolve the path and check if file exists
                const resolvedPath = path.resolve(params.image);
                if (fs.existsSync(resolvedPath)) {
                  const buffer = fs.readFileSync(resolvedPath);
                  imageData = buffer.toString('base64');
                }
              } catch (e) {
                // If it fails, assume it's already base64 data
              }
            }
            response = await this.apiClient.pngInfo(imageData);
          } else {
            return {
              success: false,
              error: 'Image parameter is required for PNG info extraction'
            };
          }
          break;

        case 'extras':
          // Extras processing (upscale, rembg)
          if (params.image) {
            // Read image file and convert to base64 if it's a file path
            let imageData = params.image;
            // Check if it's a file path (not base64 data)
            if (!params.image.startsWith('data:') && !params.image.match(/^[A-Za-z0-9+/]+=*$/)) {
                  const path = require('path');
              try {
                const resolvedPath = path.resolve(params.image);
                if (fs.existsSync(resolvedPath)) {
                  const buffer = fs.readFileSync(resolvedPath);
                  imageData = buffer.toString('base64');
                }
              } catch (e) {
                // If it fails, assume it's already base64 data
              }
            }
            payload.image = imageData;

            // Check if RemBG processing is configured
            if (preset.settings?.rembg_model) {
              // RemBG is a postprocessing script, needs to be in alwayson_scripts
              // Build the payload with all required settings
              const rembgSettings: any = {
                ...payload,
                ...preset.settings
              };

              // Remove the rembg-specific settings from main payload
              delete rembgSettings.rembg_model;
              delete rembgSettings.return_mask;
              delete rembgSettings.alpha_matting;
              delete rembgSettings.alpha_matting_foreground_threshold;
              delete rembgSettings.alpha_matting_background_threshold;
              delete rembgSettings.alpha_matting_erode_size;

              // Apply the cleaned settings back to payload
              Object.keys(rembgSettings).forEach(key => {
                if (key !== 'image') {
                  payload[key] = rembgSettings[key];
                }
              });

              // Add RemBG-specific parameters as postprocessor args
              payload.postprocessor_order = ["Rembg"];
              payload.extras = {
                "Rembg": {
                  "model": preset.settings.rembg_model || "u2net",
                  "return_mask": preset.settings.return_mask || false,
                  "alpha_matting": preset.settings.alpha_matting || false,
                  "alpha_matting_foreground_threshold": preset.settings.alpha_matting_foreground_threshold || 240,
                  "alpha_matting_background_threshold": preset.settings.alpha_matting_background_threshold || 50,
                  "alpha_matting_erode_size": preset.settings.alpha_matting_erode_size || 10
                }
              };

              // Debug log
              console.log('[RemBG] Configured with model:', preset.settings.rembg_model);
              console.log('[RemBG] Payload extras:', JSON.stringify(payload.extras, null, 2));
            }

            response = await this.apiClient.extrasSingleImage(payload);
          } else {
            return {
              success: false,
              error: 'Image parameter is required for extras processing'
            };
          }
          break;

        case 'utility':
          // Utility functions (check model, switch model, etc.)
          if (preset.settings?.action === 'check_model') {
            const options = await this.apiClient.getOptions();
            return {
              success: true,
              data: {
                current_model: options.sd_model_checkpoint,
                message: `Current model: ${options.sd_model_checkpoint}`
              }
            };
          } else if (preset.settings?.action === 'switch_model') {
            const modelName = params.model_name || preset.settings?.model_name;
            if (!modelName) {
              return {
                success: false,
                error: 'Model name is required for switch_model action'
              };
            }

            // Get available models to find the full title
            const models = await this.apiClient.getModels();
            const modelInfo = models.find((m: any) => {
              // Handle sd_ prefix consistently
              const modelNameWithoutPrefix = modelName.startsWith('sd_') ? modelName.substring(3) : modelName;
              if (m.model_name === modelName) return true;
              if (m.model_name === modelNameWithoutPrefix) return true;
              if (!modelName.startsWith('sd_') && m.model_name === `sd_${modelName}`) return true;
              if (m.title.includes(modelNameWithoutPrefix)) return true;
              if (m.title.includes(`\\${modelNameWithoutPrefix}`)) return true;
              return false;
            });

            if (!modelInfo) {
              return {
                success: false,
                error: `Model not found: ${modelName}`
              };
            }

            // Switch the model
            await this.apiClient.setOptions({
              sd_model_checkpoint: modelInfo.title
            });

            return {
              success: true,
              data: {
                switched_to: modelInfo.title,
                message: `Switched to model: ${modelInfo.title}`
              }
            };
          } else if (preset.settings?.action === 'controlnet_models') {
            // Get ControlNet models and test name resolution
            try {
              const controlnetModels = await this.apiClient.getControlNetModels();

              // Test resolution for common models
              const testModels = ['CN-anytest3_animagine4_A', 'CN-anytest4_animagine4_A'];
              const resolutionResults: Record<string, string> = {};

              for (const testModel of testModels) {
                const resolved = controlnetModels.find((modelName: string) => {
                  if (modelName === testModel) return true;
                  if (modelName.includes(testModel)) return true;
                  if (modelName.toLowerCase().includes(testModel.toLowerCase())) return true;
                  return false;
                });

                resolutionResults[testModel] = resolved || 'NOT_FOUND';
              }

              return {
                success: true,
                data: {
                  total_models: controlnetModels.length,
                  all_models: controlnetModels,
                  resolution_test: resolutionResults,
                  message: `Found ${controlnetModels.length} ControlNet models`
                }
              };
            } catch (error: any) {
              return {
                success: false,
                error: `Failed to get ControlNet models: ${error.message}`
              };
            }
          } else if (preset.settings?.action === 'upscalers') {
            try {
              const upscalers = await this.apiClient.getUpscalers();
              return {
                success: true,
                data: {
                  upscalers: upscalers,
                  total: upscalers.length,
                  message: `Found ${upscalers.length} upscaler models`
                }
              };
            } catch (error: any) {
              return {
                success: false,
                error: `Failed to get upscaler models: ${error.message}`
              };
            }
          } else if (preset.settings?.action === 'samplers') {
            try {
              const samplers = await this.apiClient.getSamplers();
              return {
                success: true,
                data: {
                  samplers: samplers,
                  total: samplers.length,
                  message: `Found ${samplers.length} samplers`
                }
              };
            } catch (error: any) {
              return {
                success: false,
                error: `Failed to get samplers: ${error.message}`
              };
            }
          } else if (preset.settings?.action === 'controlnet_modules') {
            try {
              const apiUrl = (this.apiClient as any).baseUrl || 'http://192.168.91.2:7863';
              const response = await fetch(`${apiUrl}/controlnet/module_list`);
              const data: any = await response.json();
              const modules = data.module_list || [];
              return {
                success: true,
                data: {
                  modules: modules,
                  total: modules.length,
                  message: `Found ${modules.length} ControlNet modules`
                }
              };
            } catch (error: any) {
              return {
                success: false,
                error: `Failed to get ControlNet modules: ${error.message}`
              };
            }
          } else if (preset.settings?.action === 'adetailer_models') {
            try {
              const apiUrl = (this.apiClient as any).baseUrl || 'http://192.168.91.2:7863';
              const response = await fetch(`${apiUrl}/adetailer/v1/ad_model`);
              const models: any = await response.json();
              return {
                success: true,
                data: {
                  models: models.ad_model,
                  total: models.ad_model.length,
                  message: `Found ${models.ad_model.length} ADetailer models`
                }
              };
            } catch (error: any) {
              return {
                success: false,
                error: `Failed to get ADetailer models: ${error.message}`
              };
            }
          } else if (preset.settings?.action === 'tagger_models') {
            try {
              const apiUrl = (this.apiClient as any).baseUrl || 'http://192.168.91.2:7863';
              const response = await fetch(`${apiUrl}/tagger/v1/interrogators`);
              const models: any = await response.json();
              return {
                success: true,
                data: {
                  models: models.models,
                  total: models.models.length,
                  message: `Found ${models.models.length} Tagger models`
                }
              };
            } catch (error: any) {
              return {
                success: false,
                error: `Failed to get Tagger models: ${error.message}`
              };
            }
          } else if (preset.settings?.action === 'rembg_models') {
            // RemBG models are hardcoded in the extension (from postprocessing_rembg.py)
            const models = [
              "isnet-general-use",
              "isnet-anime",
              "u2net",
              "u2netp",
              "u2net_human_seg",
              "u2net_cloth_seg",
              "silueta"
            ];
            return {
              success: true,
              data: {
                models: models,
                total: models.length,
                message: `Found ${models.length} RemBG models (hardcoded from extension)`
              }
            };
          } else {
            return {
              success: false,
              error: `Unknown utility action: ${preset.settings?.action}`
            };
          }
          break;

        case 'tagger':
          // Tagger (interrogate)
          if (params.image) {
            // Read image file and convert to base64 if it's a file path
            let imageData = params.image;
            // Check if it's a file path (not base64 data)
            if (!params.image.startsWith('data:') && !params.image.match(/^[A-Za-z0-9+/]+=*$/)) {
                  const path = require('path');
              try {
                const resolvedPath = path.resolve(params.image);
                if (fs.existsSync(resolvedPath)) {
                  const buffer = fs.readFileSync(resolvedPath);
                  imageData = buffer.toString('base64');
                }
              } catch (e) {
                // If it fails, assume it's already base64 data
              }
            }
            payload.image = imageData;
            response = await this.apiClient.interrogate(payload);
          } else {
            return {
              success: false,
              error: 'Image parameter is required for tagging'
            };
          }
          break;

        default:
          return {
            success: false,
            error: `Unsupported preset type: ${preset.type}`
          };
      }

      // Handle different response types
      if (preset.type === 'txt2img' || preset.type === 'img2img') {
        // Generation response with images
        const genResponse = response as any;
        if (genResponse.images && genResponse.images.length > 0) {
          const savedFiles = await this.saveImages(genResponse.images, presetName);

          // Restore original upscaler setting if it was changed
          if (originalUpscalerSetting !== null && params.upscaler_model && originalUpscalerSetting !== params.upscaler_model) {
            try {
              await this.apiClient.setOptions({
                upscaler_for_img2img: originalUpscalerSetting
              });
              fs.appendFileSync(debugLogPath, `Restored upscaler to original: ${originalUpscalerSetting}\n`);
            } catch (error) {
              fs.appendFileSync(debugLogPath, `Error restoring upscaler setting: ${error}\n`);
            }
          }

          return {
            success: true,
            data: {
              images: savedFiles,
              // Remove large parameters object to avoid MCP size limits
              // parameters: genResponse.parameters,
              // info: genResponse.info
            },
            metadata: {
              preset: presetName,
              type: preset.type
            }
          };
        }
      } else if (preset.type === 'extras') {
        // Extras response with processed image
        const extrasResponse = response as any;
        if (extrasResponse.image) {
          const savedFiles = await this.saveImages([extrasResponse.image], presetName);
          return {
            success: true,
            data: {
              images: savedFiles,
              html_info: extrasResponse.html_info
            },
            metadata: {
              preset: presetName,
              type: preset.type
            }
          };
        }
      }

      // For png-info, tagger, and other non-image responses
      return {
        success: true,
        data: response,
        metadata: {
          preset: presetName,
          type: preset.type
        }
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Save generated images
   */
  private async saveImages(images: string[], presetName: string): Promise<string[]> {
    const outputDir = path.join(process.cwd(), 'output');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const savedFiles: string[] = [];
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

    for (let i = 0; i < images.length; i++) {
      const filename = `${presetName}-${timestamp}${i > 0 ? `-${i}` : ''}.png`;
      const filepath = path.join(outputDir, filename);

      const buffer = Buffer.from(images[i], 'base64');
      fs.writeFileSync(filepath, buffer);

      savedFiles.push(filepath);

      if (this.config.debug) {
        console.log(`Saved image: ${filepath}`);
      }
    }

    return savedFiles;
  }

  /**
   * Start the server
   */
  async start(): Promise<void> {
    // Ensure all presets are loaded before starting server
    console.error('[DEBUG] Starting tool preload process...');
    const tools = this.toolGenerator.generateTools();
    this.cachedTools = tools; // Cache the tools for immediate availability
    console.error(`[DEBUG] Preloaded ${tools.length} tools during startup`);

    // Add explicit delay to ensure all initialization is complete
    console.error('[DEBUG] Waiting for initialization to complete...');
    await new Promise(resolve => setTimeout(resolve, 1000));

    console.error('[DEBUG] Starting MCP transport connection...');
    const transport = new StdioServerTransport();
    await this.server.connect(transport);

    console.error('[DEBUG] MCP server connection established');

    if (this.config.debug) {
      console.error(`${this.config.serverName} v${this.config.serverVersion} started`);
      console.error(`API URL: ${this.config.apiUrl}`);
      console.error(`Presets directory: ${this.config.presetsDir}`);
      console.error(`Tools available: ${tools.length}`);
    }
  }

  /**
   * Get server instance (for testing)
   */
  getServer(): Server {
    return this.server;
  }

  /**
   * Get API client (for testing)
   */
  getApiClient(): SDWebUIClient {
    return this.apiClient;
  }

  /**
   * Get tool generator (for testing)
   */
  getToolGenerator(): ToolGenerator {
    return this.toolGenerator;
  }
}