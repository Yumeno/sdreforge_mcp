/**
 * Test txt2img functionality
 */

const { MCPServer } = require('./dist/server/mcp-server');

async function testTxt2img() {
  const server = new MCPServer({
    presetsDir: './presets',
    apiUrl: 'http://192.168.91.2:7863',
    debug: true
  });

  console.log('=== txt2img Test Suite ===\n');

  // Test case 1: Simple txt2img
  console.log('Test 1: Simple txt2img_animagine_base');
  console.log('---------------------------------------');

  try {
    const result = await server.executeTool('sdreforge_txt2img_animagine_base', {
      prompt: '1girl, school uniform, smile, standing, classroom background',
      seed: 12345,
      steps: 14,  // Reduced for faster testing
      cfg_scale: 5,
      width: 512,  // Smaller size for testing
      height: 512
    });

    if (result.success) {
      console.log('✅ Image generated successfully!');
      if (result.data.images && result.data.images.length > 0) {
        console.log('   Saved to:', result.data.images[0]);
      }
      if (result.data.parameters) {
        console.log('   Model used:', result.data.parameters.override_settings?.sd_model_checkpoint || 'default');
        console.log('   Seed:', result.data.parameters.seed);
      }
    } else {
      console.error('❌ Failed:', result.error);
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }

  console.log('\n');

  // Test case 2: With negative prompt
  console.log('Test 2: txt2img with negative prompt');
  console.log('------------------------------------');

  try {
    const result = await server.executeTool('sdreforge_txt2img_animagine_base', {
      prompt: '1girl, fantasy, magic, detailed',
      negative_prompt: 'lowres, bad anatomy, bad hands',
      seed: 54321,
      steps: 14,
      cfg_scale: 7,
      width: 512,
      height: 512
    });

    if (result.success) {
      console.log('✅ Image generated with negative prompt!');
      if (result.data.images && result.data.images.length > 0) {
        console.log('   Saved to:', result.data.images[0]);
      }
    } else {
      console.error('❌ Failed:', result.error);
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }

  console.log('\n');

  // Test case 3: Test ADetailer integration
  console.log('Test 3: Check ADetailer integration');
  console.log('-----------------------------------');

  try {
    const result = await server.executeTool('sdreforge_txt2img_animagine_base', {
      prompt: '1girl, portrait, close-up, detailed face',
      seed: 99999,
      steps: 20,
      cfg_scale: 5,
      width: 512,
      height: 512
    });

    if (result.success) {
      console.log('✅ Image generated with ADetailer!');
      if (result.data.images && result.data.images.length > 0) {
        console.log('   Saved to:', result.data.images[0]);
      }
      // Check if ADetailer was applied in the info
      if (result.data.info && result.data.info.includes('ADetailer')) {
        console.log('   ✅ ADetailer was applied');
      } else {
        console.log('   ⚠️  ADetailer status unknown');
      }
    } else {
      console.error('❌ Failed:', result.error);
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }

  console.log('\n=== Test Complete ===');
}

testTxt2img().catch(console.error);