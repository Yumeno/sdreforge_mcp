/**
 * Preset Manager Integration Test
 * プリセットマネージャーの統合テスト
 */

import { PresetManager } from '../../src/presets';
import { SDWebUIClient } from '../../src/api/client';
import * as fs from 'fs';
import * as path from 'path';

async function testPresetManager() {
  console.log('=== Preset Manager Integration Test ===\n');

  // プリセットマネージャーを初期化
  const manager = new PresetManager('./presets');

  // 1. プリセットの読み込みテスト
  console.log('1. Loading preset: 01_txt2img_animagine_base.yaml');
  const preset = manager.loadPreset('01_txt2img_animagine_base.yaml');
  console.log('   ✅ Preset loaded successfully');
  console.log(`   Name: ${preset.name}`);
  console.log(`   Type: ${preset.type}`);
  console.log(`   Description: ${preset.description}`);
  console.log(`   Model: ${preset.base_settings.model}`);
  console.log(`   ADetailer: ${preset.extensions?.adetailer?.enabled ? 'Enabled' : 'Disabled'}\n`);

  // 2. プリセットからAPIペイロードへの変換テスト
  console.log('2. Converting preset to API payload');
  const userParams = {
    prompt: '1girl, school uniform, smile',
    seed: 12345
  };
  const payload = manager.presetToPayload(preset, userParams);

  console.log('   Generated payload:');
  console.log(`   - Prompt: ${payload.prompt}`);
  console.log(`   - Negative: ${payload.negative_prompt?.substring(0, 50)}...`);
  console.log(`   - Steps: ${payload.steps}`);
  console.log(`   - CFG Scale: ${payload.cfg_scale}`);
  console.log(`   - Size: ${payload.width}x${payload.height}`);
  console.log(`   - Seed: ${payload.seed}`);
  console.log(`   - Extensions: ${payload.alwayson_scripts ? Object.keys(payload.alwayson_scripts).join(', ') : 'None'}\n`);

  // 3. 実際の画像生成テスト（オプション）
  console.log('3. Testing with actual API');
  const client = new SDWebUIClient();

  try {
    // APIに必須のフィールドを追加
    const apiPayload = {
      ...payload,
      send_images: true,
      save_images: false
    };

    console.log('   Generating image with preset...');
    const response = await client.txt2img(apiPayload);

    if (response.images && response.images.length > 0) {
      // 画像を保存
      const outputDir = path.join(__dirname, '../../output');
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `preset-test-${timestamp}.png`;
      const filepath = path.join(outputDir, filename);

      const buffer = Buffer.from(response.images[0], 'base64');
      fs.writeFileSync(filepath, buffer);

      console.log(`   ✅ Image generated successfully`);
      console.log(`   Saved to: ${filename}`);
      console.log(`   File size: ${(buffer.length / 1024).toFixed(2)} KB`);
    }
  } catch (error: any) {
    console.log(`   ⚠️ API test skipped: ${error.message}`);
  }

  // 4. 全プリセットの読み込みテスト
  console.log('\n4. Loading all presets');
  const allPresets = manager.loadAllPresets();
  console.log(`   Found ${allPresets.length} preset(s):`);
  allPresets.forEach((p, i) => {
    console.log(`   ${i + 1}. ${p.name} (${p.type})`);
  });

  console.log('\n=== Test Complete ===');
}

// 実行
testPresetManager().catch(console.error);