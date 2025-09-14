# SD WebUI Reforge MCP Server

MCP (Model Context Protocol) server for SD WebUI Reforge integration with Claude Code.

## 概要

このプロジェクトは、SD WebUI ReforgeをClaude Codeから利用可能にするMCPサーバーです。プリセットベースで画像生成ツールを動的に生成し、様々な画像生成・処理タスクを効率的に実行できます。

## 特徴

- 🎨 **20種類のデフォルトプリセット** - txt2img, img2img, ユーティリティ機能
- 🔧 **拡張機能サポート** - ADetailer, ControlNet, Regional Prompter, Dynamic Prompts
- 📝 **YAMLベースの設定** - 簡単にカスタマイズ可能
- 🚀 **動的ツール生成** - プリセットに基づいてMCPツールを自動生成
- ✅ **TDD開発** - 高品質なコードとテストカバレッジ

## インストール

```bash
# リポジトリをクローン
git clone https://github.com/Yumeno/sdreforge_mcp.git
cd sdreforge_mcp

# 依存関係をインストール
npm install

# 環境設定ファイルを作成
cp .env.example .env.local
# .env.localを編集してSD WebUIのURLを設定
```

## 設定

### 環境変数 (.env.local)

```env
# SD WebUI Reforge API Endpoint
SD_WEBUI_URL=http://localhost:7860

# MCP Server Settings
MCP_SERVER_NAME=sdreforge-mcp
MCP_SERVER_VERSION=0.1.0

# Debug Mode
DEBUG=false
```

## 使用方法

### MCPサーバーの起動

```bash
npm start
```

### 開発モード

```bash
npm run dev
```

### テストの実行

```bash
# 全テストを実行
npm test

# ウォッチモード
npm run test:watch

# カバレッジレポート
npm run test:coverage
```

## プリセット

### デフォルトプリセット一覧

#### txt2img系
1. `txt2img_animagine_base` - 基本的なtxt2img + ADetailer
2. `txt2img_animagine_cn3` - ControlNet Anytest3付き
3. `txt2img_animagine_cn4` - ControlNet Anytest4付き
7-10. Regional Prompter組み合わせ

#### img2img系
4. `img2img_animagine_base` - 基本的なimg2img + ADetailer
5-6. ControlNet付き
11-14. Regional Prompter組み合わせ

#### ユーティリティ系
15. `png_info` - PNG メタデータ抽出
16. `upscale_ultrasharp` - 4x_ultrasharpアップスケール
17. `upscale_fatal_anime` - 4x_fatal_animeアップスケール
18. `rembg_u2net` - u2net背景除去
19. `rembg_isnet_anime` - isnet_anime背景除去
20. `tagger_wd_eva02` - wd-EVA02-Large-v3タグ付け

### カスタムプリセットの作成

`presets/custom/`ディレクトリにYAMLファイルを作成：

```yaml
name: my_custom_preset
description: "My custom preset description"
type: txt2img

base_settings:
  prompt_suffix: ", masterpiece, best quality"
  negative_prompt: "low quality, worst quality"
  steps: 20
  cfg_scale: 7.0
  width: 1024
  height: 1024
  sampler_name: "DPM++ 2M Karras"
  seed: -1

extensions:
  adetailer:
    enabled: true
    models:
      - face_yolov8n.pt
```

## 開発

### プロジェクト構造

```
sdreforge_mcp/
├── src/                  # ソースコード
│   ├── api/             # APIクライアント
│   ├── server/          # MCPサーバー
│   ├── presets/         # プリセット管理
│   └── tools/           # ツールハンドラー
├── tests/               # テストコード
│   ├── unit/           # 単体テスト
│   ├── integration/    # 統合テスト
│   └── e2e/           # E2Eテスト
├── presets/            # プリセットYAML
│   └── default/       # デフォルトプリセット
└── docs/              # ドキュメント
```

### ビルド

```bash
npm run build
```

### コード品質

```bash
# Linting
npm run lint

# フォーマット
npm run format
```

## トラブルシューティング

### SD WebUI Reforgeに接続できない

1. SD WebUI Reforgeが起動していることを確認
2. `--api`フラグが有効になっていることを確認
3. `.env.local`のURLが正しいことを確認

### 422エラーが発生する

APIペイロードにnull値が含まれている可能性があります。自動的にnull値は除去されますが、問題が続く場合はログを確認してください。

## ライセンス

MIT

## 貢献

Issues、Pull Requestsは歓迎します。開発はTDDで行っているため、新機能追加時はテストも含めてください。

## 参考資料

- [SD WebUI Reforge](https://github.com/Panchovix/stable-diffusion-webui-reforge)
- [Model Context Protocol](https://modelcontextprotocol.io/)
- [Claude Code](https://claude.ai/code)