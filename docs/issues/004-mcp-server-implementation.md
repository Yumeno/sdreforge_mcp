# Issue #4: MCPサーバー基礎実装

## 概要
Model Context Protocol (MCP)サーバーの基礎実装。プリセットからMCPツールを動的に生成し、Claude Codeから利用可能にする。

## 完了条件
- [ ] MCPサーバークラスの実装
- [ ] ツール動的生成機能
- [ ] リクエスト/レスポンスハンドリング
- [ ] エラーハンドリング
- [ ] 単体テスト
- [ ] 統合テスト（Claude Code接続）

## 実装内容

### 1. MCPサーバー構造
```typescript
class MCPServer {
  // プリセットベースのツール生成
  generateToolsFromPresets(): Tool[]

  // リクエストハンドラー
  handleRequest(request: MCPRequest): MCPResponse

  // ツール実行
  executeTool(toolName: string, params: any): Promise<any>
}
```

### 2. ツール定義
各プリセットから以下の形式でツールを生成：
```json
{
  "name": "sdreforge_txt2img_animagine_base",
  "description": "Generate anime-style images with ADetailer",
  "inputSchema": {
    "type": "object",
    "properties": {
      "prompt": { "type": "string" },
      "seed": { "type": "number" }
    }
  }
}
```

### 3. MCPプロトコル実装
- `initialize` - サーバー初期化
- `tools/list` - 利用可能なツール一覧
- `tools/call` - ツール実行
- `completion/complete` - 補完機能

### 4. エラーハンドリング
- 接続エラー
- タイムアウト
- 無効なパラメータ
- API エラー

## テストケース
1. サーバー起動テスト
2. ツール生成テスト
3. ツール実行テスト
4. エラーハンドリングテスト
5. Claude Code統合テスト

## ステータス
**🚧 実装中**

## 関連ファイル
- `src/server/mcp-server.ts` - MCPサーバー実装
- `src/server/tool-generator.ts` - ツール生成ロジック
- `src/server/handlers.ts` - リクエストハンドラー
- `tests/unit/server/mcp-server.test.ts` - 単体テスト
- `.claude/mcp-kamui-code.json` - MCP設定ファイル