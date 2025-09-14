/**
 * API Client Unit Tests
 * TDD: APIクライアントの基本機能テスト
 */

import { SDWebUIClient } from '../../../src/api/client';
import axios from 'axios';

// Axiosモックの設定
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('SDWebUIClient', () => {
  let client: SDWebUIClient;

  beforeEach(() => {
    jest.clearAllMocks();
    client = new SDWebUIClient('http://localhost:7860');
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
      mockedAxios.get.mockResolvedValueOnce({
        data: { version: '1.0.0' },
        status: 200,
      });

      const result = await client.testConnection();
      expect(result).toBe(true);
      expect(mockedAxios.get).toHaveBeenCalledWith(
        'http://localhost:7860/sdapi/v1/sd-models',
        expect.any(Object)
      );
    });

    it('should handle connection failure', async () => {
      mockedAxios.get.mockRejectedValueOnce(new Error('Connection refused'));

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

      mockedAxios.post.mockRejectedValueOnce(errorResponse);

      await expect(client.post('/test', {})).rejects.toThrow('Validation error');
    });

    it('should handle timeout error', async () => {
      const timeoutError = new Error('timeout of 120000ms exceeded');
      timeoutError.code = 'ECONNABORTED';

      mockedAxios.post.mockRejectedValueOnce(timeoutError);

      await expect(client.post('/test', {})).rejects.toThrow('Request timeout');
    });

    it('should handle network error', async () => {
      const networkError = new Error('Network Error');
      networkError.code = 'ECONNREFUSED';

      mockedAxios.post.mockRejectedValueOnce(networkError);

      await expect(client.post('/test', {})).rejects.toThrow('Connection failed');
    });
  });

  describe('HTTP Methods', () => {
    it('should make GET request', async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: { result: 'success' },
        status: 200
      });

      const result = await client.get('/test');

      expect(mockedAxios.get).toHaveBeenCalledWith(
        'http://localhost:7860/sdapi/v1/test',
        expect.objectContaining({
          timeout: 120000
        })
      );
      expect(result).toEqual({ result: 'success' });
    });

    it('should make POST request with cleaned payload', async () => {
      mockedAxios.post.mockResolvedValueOnce({
        data: { result: 'success' },
        status: 200
      });

      const payload = {
        prompt: 'test',
        nullValue: null,
        steps: 20
      };

      const result = await client.post('/test', payload);

      expect(mockedAxios.post).toHaveBeenCalledWith(
        'http://localhost:7860/sdapi/v1/test',
        {
          prompt: 'test',
          steps: 20
        },
        expect.objectContaining({
          timeout: 120000,
          headers: {
            'Content-Type': 'application/json'
          }
        })
      );
      expect(result).toEqual({ result: 'success' });
    });
  });
});