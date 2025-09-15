/**
 * Test available models
 */

const { SDWebUIClient } = require('./dist/api/client');

async function testModels() {
  const client = new SDWebUIClient('http://192.168.91.2:7863');

  console.log('Fetching available models...\n');

  try {
    // Get models
    const models = await client.getModels();

    console.log(`Found ${models.length} models:\n`);

    models.forEach((model, index) => {
      console.log(`${index + 1}. ${model.title}`);
      console.log(`   Hash: ${model.hash}`);
      console.log(`   Filename: ${model.filename}`);
      console.log('');
    });

    // Find animagine model
    const animagineModel = models.find(m =>
      m.title.toLowerCase().includes('animagine') ||
      m.filename.toLowerCase().includes('animagine')
    );

    if (animagineModel) {
      console.log('✅ Found animagine model:');
      console.log(`   Use this in preset: "${animagineModel.title}"`);
    } else {
      console.log('⚠️  No animagine model found');
      console.log('   Available XL models:');
      models
        .filter(m => m.title.toLowerCase().includes('xl'))
        .forEach(m => console.log(`   - ${m.title}`));
    }

    // Get current model
    const options = await client.getOptions();
    console.log('\n📌 Current model:', options.sd_model_checkpoint);

  } catch (error) {
    console.error('Error:', error.message);
  }
}

testModels().catch(console.error);