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
      presetsDir: config.presetsDir || './presets',
      apiUrl: config.apiUrl || process.env.SD_WEBUI_URL,
      serverName: config.serverName || 'sdreforge-mcp',
      serverVersion: config.serverVersion || '0.1.0',
      debug: config.debug || false
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
        default:
          return {
            success: false,
            error: `Unsupported preset type: ${preset.type}`
          };
      }

      // Save images if generated
      if (response.images && response.images.length > 0) {
        const savedFiles = await this.saveImages(response.images, presetName);

        return {
          success: true,
          data: {
            images: savedFiles,
            parameters: response.parameters,
            info: response.info
          },
          metadata: {
            preset: presetName,
            type: preset.type
          }
        };
      }

      return {
        success: true,
        data: response
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