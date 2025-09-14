/**
 * Full Template Validation Test
 * フルテンプレートの書式検証と動作確認
 */

import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { PresetManager } from '../../src/presets';

async function testFullTemplates() {
  console.log('=== Full Template Validation Test ===\n');

  const manager = new PresetManager('./presets/templates');

  // 1. txt2imgフルテンプレートの検証
  console.log('1. Testing FULL_TEMPLATE_txt2img.yaml');
  try {
    const yamlContent = fs.readFileSync(
      path.join(__dirname, '../../presets/templates/FULL_TEMPLATE_txt2img.yaml'),
      'utf-8'
    );
    const preset = yaml.load(yamlContent) as any;

    console.log('   ✅ YAML parsing successful');
    console.log(`   - Name: ${preset.name}`);
    console.log(`   - Type: ${preset.type}`);
    console.log(`   - Hires Fix: ${preset.base_settings?.enable_hr ? 'Enabled' : 'Disabled'}`);
    console.log(`   - Extensions: ${Object.keys(preset.extensions || {}).length}`);

    // ADetailerの構造確認
    if (preset.extensions?.adetailer?.models) {
      console.log(`   - ADetailer models: ${preset.extensions.adetailer.models.length}`);
      preset.extensions.adetailer.models.forEach((m: any, i: number) => {
        console.log(`     ${i + 1}. ${m.model} - "${m.prompt || 'default'}"`);
      });
    }

    // ControlNetの構造確認
    if (preset.extensions?.controlnet?.units) {
      console.log(`   - ControlNet units: ${preset.extensions.controlnet.units.length}`);
      preset.extensions.controlnet.units.forEach((u: any, i: number) => {
        console.log(`     ${i + 1}. ${u.module} / ${u.model || 'none'}`);
      });
    }

    // ペイロード変換テスト
    const payload = manager.presetToPayload(preset, {
      prompt: 'test prompt'
    });
    console.log('   ✅ Payload conversion successful');
    console.log(`   - Hires settings preserved: ${payload.enable_hr === true}`);
    console.log(`   - Extension scripts: ${Object.keys(payload.alwayson_scripts || {}).join(', ')}`);

  } catch (error: any) {
    console.error(`   ❌ Error: ${error.message}`);
  }

  // 2. img2imgフルテンプレートの検証
  console.log('\n2. Testing FULL_TEMPLATE_img2img.yaml');
  try {
    const yamlContent = fs.readFileSync(
      path.join(__dirname, '../../presets/templates/FULL_TEMPLATE_img2img.yaml'),
      'utf-8'
    );
    const preset = yaml.load(yamlContent) as any;

    console.log('   ✅ YAML parsing successful');
    console.log(`   - Name: ${preset.name}`);
    console.log(`   - Type: ${preset.type}`);
    console.log(`   - Denoising: ${preset.base_settings?.denoising_strength}`);
    console.log(`   - Inpaint settings: ${preset.base_settings?.inpaint_full_res ? 'Full res' : 'Standard'}`);

    // img2img特有の拡張機能確認
    const img2imgExtensions = ['soft_inpainting', 'color_grading', 'inpaint_difference', 'outpainting'];
    const availableExtensions = img2imgExtensions.filter(ext =>
      preset.extensions?.[ext]?.enabled
    );
    console.log(`   - img2img extensions: ${availableExtensions.join(', ') || 'none'}`);

  } catch (error: any) {
    console.error(`   ❌ Error: ${error.message}`);
  }

  // 3. ユーティリティテンプレートの検証
  console.log('\n3. Testing UTILITY_TEMPLATES.yaml');
  try {
    const yamlContent = fs.readFileSync(
      path.join(__dirname, '../../presets/templates/UTILITY_TEMPLATES.yaml'),
      'utf-8'
    );

    // YAMLのマルチドキュメントをパース
    const documents = yaml.loadAll(yamlContent) as any[];
    console.log(`   ✅ Found ${documents.length} utility templates`);

    const typeCount: Record<string, number> = {};
    documents.forEach((doc: any) => {
      if (doc?.type) {
        typeCount[doc.type] = (typeCount[doc.type] || 0) + 1;
      }
    });

    console.log('   Template types:');
    Object.entries(typeCount).forEach(([type, count]) => {
      console.log(`   - ${type}: ${count}`);
    });

  } catch (error: any) {
    console.error(`   ❌ Error: ${error.message}`);
  }

  // 4. 未実装機能のリスト
  console.log('\n4. Future TODOs (not yet implemented):');
  const todos = [
    'img2img sketch',
    'inpaint (dedicated mode)',
    'inpaint sketch',
    'outpaint variations',
    'X/Y/Z plot scripts',
    'Batch processing scripts'
  ];
  todos.forEach(todo => {
    console.log(`   - ${todo}`);
  });

  console.log('\n=== Validation Complete ===');
}

// 実行
testFullTemplates().catch(console.error);