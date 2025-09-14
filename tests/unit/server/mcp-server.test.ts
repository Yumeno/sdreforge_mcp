/**
 * MCP Server Unit Tests
 * TDD: MCPサーバーの基本機能テスト
 */

import { MCPServer } from '../../../src/server/mcp-server';
import { ToolGenerator } from '../../../src/server/tool-generator';
import { SDWebUIClient } from '../../../src/api/client';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequest,
  ListToolsRequest,
  CallToolResult,
  ListToolsResult
} from '@modelcontextprotocol/sdk/types.js';

// モックの設定
jest.mock('@modelcontextprotocol/sdk/server/index.js');
jest.mock('@modelcontextprotocol/sdk/server/stdio.js');
jest.mock('../../../src/api/client');
jest.mock('../../../src/server/tool-generator');

describe('MCPServer', () => {
  let mcpServer: MCPServer;
  let mockServer: jest.Mocked<Server>;
  let mockApiClient: jest.Mocked<SDWebUIClient>;
  let mockToolGenerator: jest.Mocked<ToolGenerator>;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock Server instance
    mockServer = {
      setRequestHandler: jest.fn(),
      connect: jest.fn().mockResolvedValue(undefined),
      close: jest.fn(),
    } as any;

    // Mock API Client
    mockApiClient = {
      txt2img: jest.fn(),
      img2img: jest.fn(),
      testConnection: jest.fn(),
    } as any;

    // Mock Tool Generator
    mockToolGenerator = {
      generateTools: jest.fn().mockReturnValue([]),
      getPreset: jest.fn(),
      getPresetManager: jest.fn(),
    } as any;

    // Mock constructors
    (Server as any).mockImplementation(() => mockServer);
    (SDWebUIClient as any).mockImplementation(() => mockApiClient);
    (ToolGenerator as any).mockImplementation(() => mockToolGenerator);

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

    it('should setup request handlers', () => {
      expect(mockServer.setRequestHandler).toHaveBeenCalledTimes(2);
      // Check that handlers were set up for the right schemas
      const calls = mockServer.setRequestHandler.mock.calls;
      expect(calls.length).toBe(2);
      // We don't check exact schema objects, just that 2 handlers were registered
    });

    it('should use custom configuration', () => {
      const customConfig = {
        serverName: 'custom-server',
        serverVersion: '1.0.0',
        presetsDir: './custom-presets',
        apiUrl: 'http://custom:7860'
      };

      new MCPServer(customConfig);

      expect(Server).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'custom-server',
          version: '1.0.0'
        }),
        expect.any(Object)
      );
    });
  });

  describe('Server Start', () => {
    it('should start server with stdio transport', async () => {
      await mcpServer.start();

      expect(mockServer.connect).toHaveBeenCalled();
      expect(mockServer.connect).toHaveBeenCalledWith(expect.any(StdioServerTransport));
    });

    it('should handle start errors', async () => {
      mockServer.connect.mockRejectedValue(new Error('Connection failed'));

      await expect(mcpServer.start()).rejects.toThrow('Connection failed');
    });
  });

  describe('List Tools Handler', () => {
    it('should return generated tools', async () => {
      const mockTools = [
        {
          name: 'sdreforge_txt2img_base',
          description: 'Basic txt2img',
          inputSchema: { type: 'object' as const, properties: {} }
        }
      ];

      mockToolGenerator.generateTools.mockReturnValue(mockTools);

      // Get the handler function (first call is ListTools)
      const listToolsHandler = mockServer.setRequestHandler.mock.calls[0]?.[1];

      const result = await listToolsHandler?.({ method: 'tools/list' }, {} as any);

      expect(result).toEqual({ tools: mockTools });
    });
  });

  describe('Call Tool Handler', () => {
    it('should execute txt2img tool successfully', async () => {
      const mockPreset = {
        name: 'test_preset',
        type: 'txt2img' as const,
        base_settings: { steps: 20 }
      };

      const mockResponse = {
        images: ['base64imagedata'],
        parameters: {},
        info: '{}'
      };

      mockToolGenerator.getPreset.mockReturnValue(mockPreset);
      mockToolGenerator.getPresetManager.mockReturnValue({
        presetToPayload: jest.fn().mockReturnValue({ prompt: 'test' })
      } as any);
      mockApiClient.txt2img.mockResolvedValue(mockResponse);

      // Get the handler function (second call is CallTool)
      const callToolHandler = mockServer.setRequestHandler.mock.calls[1]?.[1];

      const result = await callToolHandler?.({
        method: 'tools/call',
        params: {
          name: 'sdreforge_test_preset',
          arguments: { prompt: 'test prompt' }
        }
      } as any, {} as any) as any;

      expect(result?.content).toHaveLength(1);
      expect(result?.content[0].type).toBe('text');
      expect(JSON.parse(result?.content[0].text)).toHaveProperty('images');
    });

    it('should handle tool execution errors', async () => {
      mockToolGenerator.getPreset.mockReturnValue(null);

      const callToolHandler = mockServer.setRequestHandler.mock.calls[1]?.[1];

      const result = await callToolHandler?.({
        method: 'tools/call',
        params: {
          name: 'sdreforge_invalid',
          arguments: {}
        }
      } as any, {} as any) as any;

      expect(result?.isError).toBe(true);
      expect(result?.content[0].text).toContain('Preset not found');
    });

    it('should handle img2img tool with init_image', async () => {
      const mockPreset = {
        name: 'img2img_preset',
        type: 'img2img' as const,
        base_settings: {}
      };

      const mockResponse = {
        images: ['base64outputimage'],
        parameters: {},
        info: '{}'
      };

      mockToolGenerator.getPreset.mockReturnValue(mockPreset);
      mockToolGenerator.getPresetManager.mockReturnValue({
        presetToPayload: jest.fn().mockReturnValue({})
      } as any);
      mockApiClient.img2img.mockResolvedValue(mockResponse);

      const callToolHandler = mockServer.setRequestHandler.mock.calls[1]?.[1];

      const result = await callToolHandler?.({
        method: 'tools/call',
        params: {
          name: 'sdreforge_img2img_preset',
          arguments: {
            prompt: 'test prompt',
            init_image: 'base64inputimage'
          }
        }
      } as any, {} as any) as any;

      expect(mockApiClient.img2img).toHaveBeenCalledWith(
        expect.objectContaining({
          init_images: ['base64inputimage']
        })
      );
      expect(result?.content).toHaveLength(1);
    });
  });

  describe('Tool Execution', () => {
    it('should save generated images', async () => {
      const mockPreset = {
        name: 'test_preset',
        type: 'txt2img' as const,
        base_settings: {}
      };

      const mockResponse = {
        images: ['base64imagedata1', 'base64imagedata2'],
        parameters: {},
        info: '{}'
      };

      mockToolGenerator.getPreset.mockReturnValue(mockPreset);
      mockToolGenerator.getPresetManager.mockReturnValue({
        presetToPayload: jest.fn().mockReturnValue({})
      } as any);
      mockApiClient.txt2img.mockResolvedValue(mockResponse);

      const result = await mcpServer.executeTool('sdreforge_test_preset', { prompt: 'test' });

      expect(result.success).toBe(true);
      expect(result.data?.images).toHaveLength(2);
      expect(result.data?.images[0]).toContain('test_preset');
      expect(result.data?.images[0]).toContain('.png');
    });

    it('should handle API errors', async () => {
      const mockPreset = {
        name: 'test_preset',
        type: 'txt2img' as const,
        base_settings: {}
      };

      mockToolGenerator.getPreset.mockReturnValue(mockPreset);
      mockToolGenerator.getPresetManager.mockReturnValue({
        presetToPayload: jest.fn().mockReturnValue({})
      } as any);
      mockApiClient.txt2img.mockRejectedValue(new Error('API Error'));

      const result = await mcpServer.executeTool('sdreforge_test_preset', { prompt: 'test' });

      expect(result.success).toBe(false);
      expect(result.error).toBe('API Error');
    });

    it('should handle unsupported preset types', async () => {
      const mockPreset = {
        name: 'utility_preset',
        type: 'png-info' as const,
        settings: {}
      };

      mockToolGenerator.getPreset.mockReturnValue(mockPreset);
      mockToolGenerator.getPresetManager.mockReturnValue({
        presetToPayload: jest.fn().mockReturnValue({})
      } as any);

      const result = await mcpServer.executeTool('sdreforge_utility_preset', {});

      expect(result.success).toBe(false);
      expect(result.error).toContain('Unsupported preset type');
    });
  });

  describe('Getters', () => {
    it('should provide access to internal components', () => {
      expect(mcpServer.getServer()).toBe(mockServer);
      expect(mcpServer.getApiClient()).toBe(mockApiClient);
      expect(mcpServer.getToolGenerator()).toBe(mockToolGenerator);
    });
  });
});