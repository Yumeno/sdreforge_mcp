/**
 * API Client Unit Tests
 * TDD: APIクライアントの基本機能テスト
 */

import { SDWebUIClient } from '../../../src/api/client';
import axios from 'axios';

// Axiosモックの設定
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// axios.createのモックを設定
const mockAxiosInstance = {
  get: jest.fn(),
  post: jest.fn(),
  interceptors: {
    request: { use: jest.fn() },
    response: { use: jest.fn() }
  }
};

(mockedAxios.create as jest.Mock).mockReturnValue(mockAxiosInstance);

describe('SDWebUIClient', () => {
  let client: SDWebUIClient;
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset environment variables for tests
    process.env = { ...originalEnv };
    delete process.env.SD_WEBUI_URL;
    client = new SDWebUIClient('http://localhost:7860');
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('Constructor', () => {
    it('should create client with default URL', () => {
      const defaultClient = new SDWebUIClient();
      expect(defaultClient.baseUrl).toBe('http://localhost:7860');
    });

    it('should create client with custom URL', () => {
      const customClient = new SDWebUIClient('http://192.168.1.100:7863');
      expect(customClient.baseUrl).toBe('http://192.168.1.100:7863');
    });

    it('should remove trailing slash from URL', () => {
      const clientWithSlash = new SDWebUIClient('http://localhost:7860/');
      expect(clientWithSlash.baseUrl).toBe('http://localhost:7860');
    });
  });

  describe('Connection Test', () => {
    it('should successfully connect to API', async () => {
      mockAxiosInstance.get.mockResolvedValueOnce({
        data: { version: '1.0.0' },
        status: 200,
      });

      const result = await client.testConnection();
      expect(result).toBe(true);
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/sd-models');
    });

    it('should handle connection failure', async () => {
      mockAxiosInstance.get.mockRejectedValueOnce(new Error('Connection refused'));

      const result = await client.testConnection();
      expect(result).toBe(false);
    });
  });

  describe('Payload Cleaning', () => {
    it('should remove null values from payload', () => {
      const payload = {
        prompt: 'test',
        negative_prompt: null,
        steps: 20,
        cfg_scale: null,
        nested: {
          value: 'test',
          nullValue: null,
        }
      };

      const cleaned = client.cleanPayload(payload);

      expect(cleaned).toEqual({
        prompt: 'test',
        steps: 20,
        nested: {
          value: 'test'
        }
      });
      expect(cleaned.negative_prompt).toBeUndefined();
      expect(cleaned.cfg_scale).toBeUndefined();
    });

    it('should preserve undefined values as missing keys', () => {
      const payload = {
        prompt: 'test',
        negative_prompt: undefined,
        steps: 20
      };

      const cleaned = client.cleanPayload(payload);

      expect(cleaned).toEqual({
        prompt: 'test',
        steps: 20
      });
      expect('negative_prompt' in cleaned).toBe(false);
    });

    it('should preserve empty strings', () => {
      const payload = {
        prompt: 'test',
        negative_prompt: '',
        steps: 20
      };

      const cleaned = client.cleanPayload(payload);

      expect(cleaned).toEqual({
        prompt: 'test',
        negative_prompt: '',
        steps: 20
      });
    });

    it('should preserve zero values', () => {
      const payload = {
        steps: 0,
        cfg_scale: 0.0,
        seed: 0
      };

      const cleaned = client.cleanPayload(payload);

      expect(cleaned).toEqual({
        steps: 0,
        cfg_scale: 0.0,
        seed: 0
      });
    });

    it('should handle arrays correctly', () => {
      const payload = {
        images: ['img1', 'img2'],
        nullArray: null,
        emptyArray: []
      };

      const cleaned = client.cleanPayload(payload);

      expect(cleaned).toEqual({
        images: ['img1', 'img2'],
        emptyArray: []
      });
      expect(cleaned.nullArray).toBeUndefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle 422 validation error', async () => {
      const errorResponse = {
        response: {
          status: 422,
          data: {
            detail: [
              {
                loc: ['body', 'prompt'],
                msg: 'field required',
                type: 'value_error.missing'
              }
            ]
          }
        }
      };

      mockAxiosInstance.post.mockRejectedValueOnce(errorResponse);

      await expect(client.post('/test', {})).rejects.toThrow('Validation error');
    });

    it('should handle timeout error', async () => {
      const timeoutError: any = new Error('timeout of 120000ms exceeded');
      timeoutError.code = 'ECONNABORTED';

      mockAxiosInstance.post.mockRejectedValueOnce(timeoutError);

      await expect(client.post('/test', {})).rejects.toThrow('Request timeout');
    });

    it('should handle network error', async () => {
      const networkError: any = new Error('Network Error');
      networkError.code = 'ECONNREFUSED';

      mockAxiosInstance.post.mockRejectedValueOnce(networkError);

      await expect(client.post('/test', {})).rejects.toThrow('Connection failed');
    });
  });

  describe('HTTP Methods', () => {
    it('should make GET request', async () => {
      mockAxiosInstance.get.mockResolvedValueOnce({
        data: { result: 'success' },
        status: 200
      });

      const result = await client.get('/test');

      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        '/test',
        expect.objectContaining({
          params: undefined
        })
      );
      expect(result).toEqual({ result: 'success' });
    });

    it('should make POST request with cleaned payload', async () => {
      mockAxiosInstance.post.mockResolvedValueOnce({
        data: { result: 'success' },
        status: 200
      });

      const payload = {
        prompt: 'test',
        nullValue: null,
        steps: 20
      };

      const result = await client.post('/test', payload);

      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/test',
        {
          prompt: 'test',
          steps: 20
        }
      );
      expect(result).toEqual({ result: 'success' });
    });
  });
});