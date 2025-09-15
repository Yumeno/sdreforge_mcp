const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const presetsDir = path.join(__dirname, 'presets');
console.log('Checking presets directory:', presetsDir);
console.log('');

const files = fs.readdirSync(presetsDir).sort();
let count = 0;

for (const file of files) {
  if (!file.endsWith('.yaml')) continue;
  if (file.includes('template') || file.includes('placeholder')) continue;

  try {
    const content = fs.readFileSync(path.join(presetsDir, file), 'utf-8');
    const preset = yaml.load(content);
    count++;
    console.log(`${count}. ${file}`);
    console.log(`   Name: ${preset.name}`);
    console.log(`   Type: ${preset.type}`);
    console.log(`   Description: ${preset.description || 'No description'}`);
    console.log('');
  } catch (error) {
    console.error(`Error loading ${file}:`, error.message);
  }
}

console.log(`Total presets found: ${count}`);