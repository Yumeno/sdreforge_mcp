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

      // Generate payload from preset and user params
      const payload = this.toolGenerator.getPresetManager().presetToPayload(preset, params);

      // Special handling for fully parameterized ControlNet preset (26)
      fs.appendFileSync(debugLogPath, `Checking preset 26 conditions: presetName=${presetName}, has_alwayson=${!!payload.alwayson_scripts}, has_controlnet=${!!(payload.alwayson_scripts?.ControlNet)}, has_args=${!!(payload.alwayson_scripts?.ControlNet?.args)}\n`);

      if (presetName === 'txt2img_cn_multi_3units' && payload.alwayson_scripts?.ControlNet?.args) {
        // Apply user parameter overrides to default ControlNet units
        const units = payload.alwayson_scripts.ControlNet.args;

        // Unit 0 overrides
        if (units[0]) {
          if (params.controlnet_model_1) units[0].model = params.controlnet_model_1;
          if (params.controlnet_module_1) units[0].module = params.controlnet_module_1;
          if (params.controlnet_weight_1 !== undefined) units[0].weight = params.controlnet_weight_1;
        }

        // Unit 1 overrides (enable if image provided)
        if (units[1]) {
          if (params.controlnet_image_2) units[1].enabled = true;
          if (params.controlnet_model_2) units[1].model = params.controlnet_model_2;
          if (params.controlnet_module_2) units[1].module = params.controlnet_module_2;
          if (params.controlnet_weight_2 !== undefined) units[1].weight = params.controlnet_weight_2;
        }

        // Unit 2 overrides (enable if image provided)
        if (units[2]) {
          if (params.controlnet_image_3) units[2].enabled = true;
          if (params.controlnet_model_3) units[2].model = params.controlnet_model_3;
          if (params.controlnet_module_3) units[2].module = params.controlnet_module_3;
          if (params.controlnet_weight_3 !== undefined) units[2].weight = params.controlnet_weight_3;
        }

        // Disable ControlNet entirely if no images provided
        const hasAnyControlNetImage = params.controlnet_image || params.controlnet_image_2 || params.controlnet_image_3;
        if (!hasAnyControlNetImage && payload.alwayson_scripts?.ControlNet) {
          delete payload.alwayson_scripts.ControlNet;
          fs.appendFileSync(debugLogPath, `Disabled ControlNet entirely (no images provided)\n`);
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
              if (imageParamValue.startsWith('C:\\') || imageParamValue.startsWith('/')) {
                const fs = require('fs');
                const buffer = fs.readFileSync(imageParamValue);
                imageData = buffer.toString('base64');
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
          response = await this.apiClient.txt2img(payload);
          break;

        case 'img2img':
          // Handle base64 image input
          if (params.init_image) {
            payload.init_images = [params.init_image];
          }
          response = await this.apiClient.img2img(payload);
          break;

        case 'png-info':
          // PNG Info extraction
          if (params.image) {
            // Read image file and convert to base64 if it's a file path
            let imageData = params.image;
            if (params.image.startsWith('C:\\') || params.image.startsWith('/')) {
              const fs = require('fs');
              const buffer = fs.readFileSync(params.image);
              imageData = buffer.toString('base64');
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
            if (params.image.startsWith('C:\\') || params.image.startsWith('/')) {
              const fs = require('fs');
              const buffer = fs.readFileSync(params.image);
              imageData = buffer.toString('base64');
            }
            payload.image = imageData;
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
            if (params.image.startsWith('C:\\') || params.image.startsWith('/')) {
              const fs = require('fs');
              const buffer = fs.readFileSync(params.image);
              imageData = buffer.toString('base64');
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