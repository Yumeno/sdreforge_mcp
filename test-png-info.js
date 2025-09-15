/**
 * Test PNG Info extraction
 */

const { MCPServer } = require('./dist/server/mcp-server');

async function testPNGInfo() {
  const server = new MCPServer({
    presetsDir: './presets',
    apiUrl: 'http://192.168.91.2:7863',
    debug: true
  });

  const imagePath = 'C:\\Users\\vz7a-\\Downloads\\image (18).png';

  console.log('Testing PNG Info extraction...');
  console.log('Image:', imagePath);
  console.log('');

  try {
    const result = await server.executeTool('utility_png_info', {
      image: imagePath
    });

    if (result.success) {
      console.log('✅ PNG Info extracted successfully!');
      console.log('\n=== PNG Metadata ===');
      console.log(JSON.stringify(result.data, null, 2));
    } else {
      console.error('❌ Failed:', result.error);
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testPNGInfo().catch(console.error);