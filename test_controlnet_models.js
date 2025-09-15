/**
 * Test script to get actual ControlNet model names from SD WebUI Reforge
 */

const { SDWebUIClient } = require('./dist/api/client');

async function testControlNetModels() {
  const client = new SDWebUIClient('http://192.168.91.2:7863');

  try {
    console.log('Getting ControlNet models...');
    const models = await client.getControlNetModels();
    console.log('\n=== Available ControlNet Models ===');
    models.forEach((model, index) => {
      console.log(`${index + 1}. ${model}`);
      if (model.toLowerCase().includes('anytest')) {
        console.log(`   *** ANYTEST MODEL FOUND: ${model} ***`);
      }
    });

    console.log('\n=== Available ControlNet Modules ===');
    const modules = await client.getControlNetModules();
    modules.forEach((module, index) => {
      console.log(`${index + 1}. ${module}`);
    });

  } catch (error) {
    console.error('Error:', error.message);
  }
}

testControlNetModels();