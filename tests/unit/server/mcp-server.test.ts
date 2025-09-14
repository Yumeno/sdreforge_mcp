/**
 * MCP Server Unit Tests
 * TDD: MCPサーバーの基本機能テスト
 */

import { MCPServer } from '../../../src/server/mcp-server';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

// MCPモックの設定
jest.mock('@modelcontextprotocol/sdk/server/index.js');
jest.mock('@modelcontextprotocol/sdk/server/stdio.js');

describe('MCPServer', () => {
  let mcpServer: MCPServer;
  let mockServer: jest.Mocked<Server>;
  let mockTransport: jest.Mocked<StdioServerTransport>;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock Server instance
    mockServer = {
      setRequestHandler: jest.fn(),
      connect: jest.fn(),
      close: jest.fn(),
      error: jest.fn(),
    } as any;

    // Mock Transport
    mockTransport = {
      start: jest.fn(),
      close: jest.fn(),
    } as any;

    (Server as jest.MockedClass<typeof Server>).mockImplementation(() => mockServer);
    (StdioServerTransport as jest.MockedClass<typeof StdioServerTransport>).mockImplementation(() => mockTransport);

    mcpServer = new MCPServer();
  });

  describe('Server Initialization', () => {
    it('should initialize with correct metadata', () => {
      expect(Server).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'sdreforge-mcp',
          version: expect.any(String)
        }),
        expect.objectContaining({
          capabilities: expect.objectContaining({
            tools: {}
          })
        })
      );
    });

    it('should register tool handlers', () => {
      expect(mockServer.setRequestHandler).toHaveBeenCalledWith(
        expect.anything(),
        expect.any(Function)
      );
    });
  });

  describe('Tool Registration', () => {
    it('should register preset-based tools', async () => {
      const presets = [
        {
          name: 'txt2img_base',
          type: 'txt2img',
          description: 'Basic text to image',
          base_settings: { steps: 20 }
        },
        {
          name: 'img2img_base',
          type: 'img2img',
          description: 'Basic image to image',
          base_settings: { denoising_strength: 0.75 }
        }
      ];

      await mcpServer.registerTools(presets);

      const tools = mcpServer.getRegisteredTools();

      expect(tools).toHaveLength(2);
      expect(tools[0].name).toBe('sdreforge_txt2img_base');
      expect(tools[0].description).toContain('Basic text to image');
      expect(tools[1].name).toBe('sdreforge_img2img_base');
    });

    it('should create tool with correct input schema for txt2img', async () => {
      const preset = {
        name: 'txt2img_test',
        type: 'txt2img',
        description: 'Test txt2img',
        base_settings: { steps: 20 }
      };

      await mcpServer.registerTools([preset]);

      const tools = mcpServer.getRegisteredTools();
      const tool = tools[0];

      expect(tool.inputSchema).toEqual({
        type: 'object',
        properties: {
          prompt: {
            type: 'string',
            description: 'The prompt for image generation'
          },
          negative_prompt: {
            type: 'string',
            description: 'Negative prompt to avoid unwanted features'
          },
          seed: {
            type: 'number',
            description: 'Random seed (-1 for random)'
          },
          steps: {
            type: 'number',
            description: 'Number of sampling steps'
          },
          cfg_scale: {
            type: 'number',
            description: 'Classifier Free Guidance scale'
          }
        },
        required: ['prompt']
      });
    });

    it('should create tool with correct input schema for img2img', async () => {
      const preset = {
        name: 'img2img_test',
        type: 'img2img',
        description: 'Test img2img',
        base_settings: { denoising_strength: 0.75 }
      };

      await mcpServer.registerTools([preset]);

      const tools = mcpServer.getRegisteredTools();
      const tool = tools[0];

      expect(tool.inputSchema.properties).toHaveProperty('init_image');
      expect(tool.inputSchema.properties).toHaveProperty('denoising_strength');
      expect(tool.inputSchema.required).toContain('init_image');
    });

    it('should handle utility presets', async () => {
      const presets = [
        {
          name: 'png_info',
          type: 'utility',
          subtype: 'png_info',
          description: 'Extract PNG metadata'
        },
        {
          name: 'upscale_4x',
          type: 'utility',
          subtype: 'upscale',
          description: 'Upscale image 4x'
        }
      ];

      await mcpServer.registerTools(presets);

      const tools = mcpServer.getRegisteredTools();

      expect(tools).toHaveLength(2);
      expect(tools[0].name).toBe('sdreforge_png_info');
      expect(tools[1].name).toBe('sdreforge_upscale_4x');
    });
  });

  describe('Tool Execution', () => {
    it('should handle txt2img tool execution', async () => {
      const preset = {
        name: 'txt2img_test',
        type: 'txt2img',
        base_settings: {
          steps: 20,
          cfg_scale: 7.0,
          width: 1024,
          height: 1024
        }
      };

      mcpServer.setApiClient({
        txt2img: jest.fn().mockResolvedValue({
          images: ['base64_image_data'],
          info: '{}'
        })
      } as any);

      await mcpServer.registerTools([preset]);

      const result = await mcpServer.executeTool('sdreforge_txt2img_test', {
        prompt: 'a beautiful landscape'
      });

      expect(result.content).toContain({
        type: 'text',
        text: expect.stringContaining('Generated 1 image')
      });
      expect(result.content).toContain({
        type: 'resource',
        resource: expect.objectContaining({
          uri: expect.stringContaining('data:image/png;base64,')
        })
      });
    });

    it('should handle img2img tool execution', async () => {
      const preset = {
        name: 'img2img_test',
        type: 'img2img',
        base_settings: {
          denoising_strength: 0.75,
          steps: 20
        }
      };

      mcpServer.setApiClient({
        img2img: jest.fn().mockResolvedValue({
          images: ['base64_output_image'],
          info: '{}'
        })
      } as any);

      await mcpServer.registerTools([preset]);

      const result = await mcpServer.executeTool('sdreforge_img2img_test', {
        init_image: 'base64_input_image',
        prompt: 'modify this image',
        denoising_strength: 0.5
      });

      expect(result.content).toContain({
        type: 'text',
        text: expect.stringContaining('Processed image')
      });
    });

    it('should handle tool execution errors', async () => {
      const preset = {
        name: 'txt2img_test',
        type: 'txt2img',
        base_settings: {}
      };

      mcpServer.setApiClient({
        txt2img: jest.fn().mockRejectedValue(new Error('API Error'))
      } as any);

      await mcpServer.registerTools([preset]);

      const result = await mcpServer.executeTool('sdreforge_txt2img_test', {
        prompt: 'test'
      });

      expect(result.content).toContain({
        type: 'text',
        text: expect.stringContaining('Error')
      });
      expect(result.isError).toBe(true);
    });
  });

  describe('Server Lifecycle', () => {
    it('should start server correctly', async () => {
      await mcpServer.start();

      expect(mockTransport.start).toHaveBeenCalled();
      expect(mockServer.connect).toHaveBeenCalledWith(mockTransport);
    });

    it('should stop server correctly', async () => {
      await mcpServer.stop();

      expect(mockServer.close).toHaveBeenCalled();
      expect(mockTransport.close).toHaveBeenCalled();
    });

    it('should handle server errors', async () => {
      const errorHandler = jest.fn();
      mcpServer.on('error', errorHandler);

      const error = new Error('Server error');
      mockServer.error.mockImplementation((callback) => {
        callback(error);
      });

      await mcpServer.start();

      expect(errorHandler).toHaveBeenCalledWith(error);
    });
  });

  describe('List Tools Handler', () => {
    it('should list all registered tools', async () => {
      const presets = [
        {
          name: 'txt2img_base',
          type: 'txt2img',
          description: 'Basic txt2img'
        },
        {
          name: 'img2img_base',
          type: 'img2img',
          description: 'Basic img2img'
        }
      ];

      await mcpServer.registerTools(presets);

      const toolsList = await mcpServer.handleListTools();

      expect(toolsList.tools).toHaveLength(2);
      expect(toolsList.tools[0].name).toBe('sdreforge_txt2img_base');
      expect(toolsList.tools[1].name).toBe('sdreforge_img2img_base');
    });

    it('should return empty list when no tools registered', async () => {
      const toolsList = await mcpServer.handleListTools();

      expect(toolsList.tools).toEqual([]);
    });
  });
});