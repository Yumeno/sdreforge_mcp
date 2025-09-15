/**
 * MCP Server Implementation
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool
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
    // List tools handler
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      const tools = this.toolGenerator.generateTools();
      return { tools };
    });

    // Call tool handler
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

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
              parameters: genResponse.parameters,
              info: genResponse.info
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
    const transport = new StdioServerTransport();
    await this.server.connect(transport);

    if (this.config.debug) {
      console.error(`${this.config.serverName} v${this.config.serverVersion} started`);
      console.error(`API URL: ${this.config.apiUrl}`);
      console.error(`Presets directory: ${this.config.presetsDir}`);
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