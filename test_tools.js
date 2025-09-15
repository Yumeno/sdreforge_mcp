const path = require('path');
const { ToolGenerator } = require('./dist/server/tool-generator');

const presetsDir = path.join(__dirname, 'presets');
console.log('Presets directory:', presetsDir);

const generator = new ToolGenerator(presetsDir);
const tools = generator.generateTools();

console.log(`\nGenerated ${tools.length} tools:\n`);

tools.forEach((tool, index) => {
  console.log(`${index + 1}. ${tool.name}`);
  console.log(`   Description: ${tool.description}`);
  console.log(`   Required: ${tool.inputSchema.required.join(', ') || 'none'}`);
});

if (tools.length !== 20) {
  console.error(`\n⚠️ Warning: Expected 20 tools but got ${tools.length}`);
}