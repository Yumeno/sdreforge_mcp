const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const presetsDir = path.join(__dirname, 'presets');

console.log('=== Testing Preset Loading ===');
console.log('Presets directory:', presetsDir);
console.log('');

const files = fs.readdirSync(presetsDir);
console.log(`Found ${files.length} files in presets directory\n`);

let successCount = 0;
let failCount = 0;
const failedFiles = [];

for (const file of files) {
  if (!file.endsWith('.yaml') && !file.endsWith('.yml')) {
    continue;
  }

  try {
    const filepath = path.join(presetsDir, file);
    const content = fs.readFileSync(filepath, 'utf-8');
    const preset = yaml.load(content);

    // Validate preset structure
    if (!preset.name || !preset.type) {
      throw new Error(`Missing name or type`);
    }

    const validTypes = ['txt2img', 'img2img', 'extras', 'png-info', 'tagger', 'rembg', 'utility'];
    if (!validTypes.includes(preset.type)) {
      throw new Error(`Invalid type: ${preset.type}`);
    }

    // Check required fields based on type
    if (['txt2img', 'img2img'].includes(preset.type)) {
      if (!preset.base_settings) {
        throw new Error(`Missing base_settings for ${preset.type}`);
      }
    } else if (['extras', 'png-info', 'tagger', 'rembg', 'utility'].includes(preset.type)) {
      if (!preset.settings) {
        throw new Error(`Missing settings for ${preset.type}`);
      }
    }

    console.log(`✅ ${file}: ${preset.name} (type: ${preset.type})`);
    successCount++;
  } catch (error) {
    console.log(`❌ ${file}: ${error.message}`);
    failedFiles.push({ file, error: error.message });
    failCount++;
  }
}

console.log('\n=== Summary ===');
console.log(`Success: ${successCount}`);
console.log(`Failed: ${failCount}`);

if (failedFiles.length > 0) {
  console.log('\nFailed files:');
  failedFiles.forEach(f => {
    console.log(`  - ${f.file}: ${f.error}`);
  });
}