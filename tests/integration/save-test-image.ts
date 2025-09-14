/**
 * テスト画像を生成して保存するスクリプト
 */

import { SDWebUIClient } from '../../src/api/client';
import * as fs from 'fs';
import * as path from 'path';

async function generateAndSaveTestImage() {
  const client = new SDWebUIClient();
  console.log(`Connecting to: ${client.baseUrl}`);

  const payload = {
    prompt: 'a cute cat, simple cartoon style, solid background',
    negative_prompt: 'complex, detailed, realistic',
    steps: 20,
    cfg_scale: 7.0,
    width: 512,
    height: 512,
    sampler_name: 'DPM++ 2M',
    batch_size: 1,
    seed: 42,
    send_images: true,
    save_images: false
  };

  console.log('Generating image with:', {
    prompt: payload.prompt,
    steps: payload.steps,
    size: `${payload.width}x${payload.height}`
  });

  try {
    const response = await client.txt2img(payload);

    if (response.images && response.images.length > 0) {
      // base64画像をデコードして保存
      const base64Data = response.images[0];
      const buffer = Buffer.from(base64Data, 'base64');

      // 出力ディレクトリを作成
      const outputDir = path.join(__dirname, '../../output');
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      // ファイル名を生成
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `test-image-${timestamp}.png`;
      const filepath = path.join(outputDir, filename);

      // ファイルを保存
      fs.writeFileSync(filepath, buffer);
      console.log(`✅ Image saved to: ${filepath}`);
      console.log(`File size: ${(buffer.length / 1024).toFixed(2)} KB`);

      // パラメータ情報も保存
      const infoPath = filepath.replace('.png', '.json');
      fs.writeFileSync(infoPath, JSON.stringify({
        payload,
        info: response.info,
        parameters: response.parameters
      }, null, 2));
      console.log(`📝 Parameters saved to: ${infoPath}`);
    }
  } catch (error) {
    console.error('Failed to generate image:', error);
  }
}

// 実行
generateAndSaveTestImage();