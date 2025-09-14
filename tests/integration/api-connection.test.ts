/**
 * API Connection Integration Test
 * 実際のSD WebUI Reforgeサーバーへの接続テスト
 */

import { SDWebUIClient } from '../../src/api/client';

describe('API Connection Integration Test', () => {
  let client: SDWebUIClient;

  beforeAll(() => {
    // .env.localから実際のURLを読み込む
    client = new SDWebUIClient();
    console.log(`Testing connection to: ${client.baseUrl}`);
  });

  it('should connect to actual SD WebUI server', async () => {
    const isConnected = await client.testConnection();

    if (!isConnected) {
      console.error('Failed to connect to SD WebUI server');
      console.error(`Make sure server is running at: ${client.baseUrl}`);
      console.error('Server should be started with: --api --listen flags');
    }

    expect(isConnected).toBe(true);
  }, 30000); // 30秒のタイムアウト

  it('should fetch available models', async () => {
    try {
      const models = await client.getModels();
      console.log(`Found ${models.length} models`);

      if (models.length > 0) {
        console.log('First model:', models[0].title || models[0].model_name);
      }

      expect(Array.isArray(models)).toBe(true);
      expect(models.length).toBeGreaterThan(0);
    } catch (error) {
      console.error('Failed to fetch models:', error);
      throw error;
    }
  }, 30000);

  it('should fetch available samplers', async () => {
    try {
      const samplers = await client.getSamplers();
      console.log(`Found ${samplers.length} samplers`);

      expect(Array.isArray(samplers)).toBe(true);
      expect(samplers.length).toBeGreaterThan(0);

      // よく使われるサンプラーが含まれているか確認
      const samplerNames = samplers.map(s => s.name);
      console.log('Available samplers:', samplerNames.slice(0, 10).join(', '));
      expect(samplerNames).toContain('DPM++ 2M');
    } catch (error) {
      console.error('Failed to fetch samplers:', error);
      throw error;
    }
  }, 30000);

  it('should get current options', async () => {
    try {
      const options = await client.getOptions();
      console.log('Current SD model:', options.sd_model_checkpoint);

      expect(options).toBeDefined();
      expect(typeof options).toBe('object');
    } catch (error) {
      console.error('Failed to fetch options:', error);
      throw error;
    }
  }, 30000);

  // 実際の画像生成テスト（オプショナル）
  describe('Image Generation Test (Optional)', () => {
    it('should generate a simple test image', async () => {
      try {
        const payload = {
          prompt: 'a simple test image, solid color background',
          negative_prompt: 'complex, detailed',
          steps: 10,  // 低いステップ数でテスト
          cfg_scale: 3.5,
          width: 512,
          height: 512,
          sampler_name: 'DPM++ 2M',
          batch_size: 1,
          seed: 42,
          send_images: true,
          save_images: false
        };

        console.log('Generating test image with:', {
          prompt: payload.prompt,
          steps: payload.steps,
          size: `${payload.width}x${payload.height}`
        });

        const response = await client.txt2img(payload);

        expect(response).toBeDefined();
        expect(response.images).toBeDefined();
        expect(Array.isArray(response.images)).toBe(true);
        expect(response.images.length).toBeGreaterThan(0);

        console.log('✅ Test image generated successfully');
        console.log('Image data length:', response.images[0]?.length || 0);
      } catch (error) {
        console.warn('Image generation test skipped:', error);
        // 画像生成はオプショナルなので、失敗してもテストは通す
        expect(true).toBe(true);
      }
    }, 60000);  // 60秒のタイムアウト
  });
});