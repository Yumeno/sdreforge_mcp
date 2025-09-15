/**
 * MCP Tools Test - MCPサーバーが実際に返すツールを確認
 */

const { MCPServer } = require('./dist/server/mcp-server');
const { ListToolsRequestSchema } = require('@modelcontextprotocol/sdk/types.js');

async function testMCPTools() {
  console.log('=== MCP Server Tools Test ===\n');

  // MCPサーバーのインスタンスを作成
  const server = new MCPServer({
    presetsDir: './presets',
    debug: true
  });

  // サーバーのハンドラーを直接呼び出してツールリストを取得
  const mockRequest = {
    jsonrpc: '2.0',
    id: 1,
    method: 'tools/list',
    params: {}
  };

  try {
    // ツールジェネレーターから直接ツールを取得
    const toolGenerator = server.getToolGenerator();
    const tools = toolGenerator.generateTools();

    const response = { tools };

    console.log(`Total tools returned by MCP: ${response.tools.length}\n`);

    // ツールをインデックス付きで表示
    response.tools.forEach((tool, index) => {
      console.log(`${index + 1}. ${tool.name}`);
      console.log(`   Description: ${tool.description}`);
      console.log(`   Type: ${tool.inputSchema?.properties?.prompt ? 'Generation' : 'Utility'}`);
      console.log('');
    });

    // 重複チェック
    const toolNames = response.tools.map(t => t.name);
    const uniqueNames = [...new Set(toolNames)];
    if (toolNames.length !== uniqueNames.length) {
      console.warn('⚠️  Duplicate tool names detected!');
      const duplicates = toolNames.filter((name, index) => toolNames.indexOf(name) !== index);
      console.warn('   Duplicates:', duplicates);
    }

    // 期待されるツール名のチェック
    const expectedTools = [
      'sdreforge_txt2img_animagine_base',
      'sdreforge_txt2img_animagine_cn3',
      'sdreforge_txt2img_animagine_cn4',
      'sdreforge_img2img_animagine_base',
      'sdreforge_img2img_animagine_cn3',
      'sdreforge_img2img_animagine_cn4',
      'sdreforge_txt2img_cn3_rp_matrix',
      'sdreforge_txt2img_cn3_rp_mask',
      'sdreforge_txt2img_cn4_rp_matrix',
      'sdreforge_txt2img_cn4_rp_mask',
      'sdreforge_img2img_cn3_rp_matrix',
      'sdreforge_img2img_cn3_rp_mask',
      'sdreforge_img2img_cn4_rp_matrix',
      'sdreforge_img2img_cn4_rp_mask',
      'sdreforge_utility_png_info',
      'sdreforge_extras_upscale_ultrasharp',
      'sdreforge_extras_upscale_fatal_anime',
      'sdreforge_extras_rembg_u2net',
      'sdreforge_extras_rembg_isnet_anime',
      'sdreforge_tagger_wd_eva02'
    ];

    console.log('\n=== Verification ===');
    const missing = expectedTools.filter(name => !toolNames.includes(name));
    const extra = toolNames.filter(name => !expectedTools.includes(name));

    if (missing.length > 0) {
      console.warn('❌ Missing tools:', missing);
    }
    if (extra.length > 0) {
      console.warn('❌ Extra/unexpected tools:', extra);
    }
    if (missing.length === 0 && extra.length === 0) {
      console.log('✅ All 20 expected tools are present!');
    }

  } catch (error) {
    console.error('Error testing MCP tools:', error);
  }
}

testMCPTools().catch(console.error);