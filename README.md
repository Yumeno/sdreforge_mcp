# SD WebUI Reforge MCP Server

MCP (Model Context Protocol) server for SD WebUI Reforge integration with Claude Code.

## 🚀 概要

このプロジェクトは、SD WebUI ReforgeをClaude Codeから利用可能にするMCPサーバーです。プリセットベースで画像生成ツールを動的に生成し、様々な画像生成・処理タスクを効率的に実行できます。

## ✨ 実装状況

### 完了済み ✅
- **APIクライアント** - SD WebUI Reforge APIとの通信層
  - 自動null値クリーニング（422エラー防止）
  - 包括的なエラーハンドリング
  - 全主要エンドポイント対応
- **プリセットマネージャー** - YAMLベースの設定管理
  - 全拡張機能対応（ADetailer, ControlNet等）
  - txt2img/img2img/ユーティリティプリセット
  - ユーザーパラメータマージ機能
- **テスト** - TDD開発
  - 単体テスト: 27個
  - 統合テスト: 実サーバー接続確認済み

- **MCPサーバー** - MCP仕様準拠のサーバー実装
  - 動的ツール生成
  - リクエスト/レスポンスハンドリング
  - 自動画像保存機能
- **20種類のデフォルトプリセット** - 様々なユースケースに対応
  - アーティスティックスタイル（5種）
  - フォトエンハンスメント（4種）
  - クリエイティブエフェクト（4種）
  - 実用的ユースケース（4種）
  - Image-to-Image（3種）

## 📋 特徴

- 🎨 **フル機能対応** - SD WebUI Reforgeの全機能をサポート
- 🔧 **拡張機能サポート** - 10種類以上の拡張機能に対応
- 📝 **YAMLベースの設定** - 簡単にカスタマイズ可能
- 🚀 **動的ツール生成** - プリセットに基づいてMCPツールを自動生成
- ✅ **実サーバー検証済み** - 152モデル、74サンプラーで動作確認

## 🛠️ インストール

```bash
# リポジトリをクローン
git clone https://github.com/Yumeno/sdreforge_mcp.git
cd sdreforge_mcp

# 依存関係をインストール
npm install

# ビルド
npm run build

# 環境設定ファイルを作成
cp .env.example .env.local
# .env.localを編集してSD WebUIのURLを設定
```

## 🔧 Claude Codeへの設定

### 1. Claude Code設定ファイルの作成

Windows: `%APPDATA%\Claude\claude_desktop_config.json`
Mac/Linux: `~/.config/Claude/claude_desktop_config.json`

### 2. MCPサーバー設定の追加

以下の設定を`claude_desktop_config.json`に追加します：

```json
{
  "mcpServers": {
    "sdreforge": {
      "command": "node",
      "args": ["C:\\Users\\vz7a-\\Desktop\\kamuicode\\kamuicode_20250811\\sdreforge_mcp\\dist\\index.js"],
      "env": {
        "SD_WEBUI_URL": "http://192.168.91.2:7863"
      }
    }
  }
}
```

#### パスをご自身の環境に合わせて変更してください：
- `args`のパス: プロジェクトの`dist/index.js`へのフルパス
- `SD_WEBUI_URL`: お使いのSD WebUI ReforgeサーバーのURL

### 3. 複数サーバーがある場合の設定例

```json
{
  "mcpServers": {
    "sdreforge": {
      "command": "node",
      "args": ["C:\\Users\\vz7a-\\Desktop\\kamuicode\\kamuicode_20250811\\sdreforge_mcp\\dist\\index.js"],
      "env": {
        "SD_WEBUI_URL": "http://192.168.91.2:7863"
      }
    },
    "other-server": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "C:\\Users\\vz7a-\\Desktop"],
      "env": {}
    }
  }
}
```

### 4. 設定の確認

1. Claude Codeを再起動
2. 新しい会話を開始
3. 以下のコマンドでツールが利用可能か確認：
   ```
   利用可能なツールを教えて
   ```
4. `sdreforge_`で始まるツールが表示されれば成功です

### トラブルシューティング

**ツールが表示されない場合：**
- パスが正しいか確認（バックスラッシュをエスケープ `\\`）
- `npm run build`を実行して`dist`フォルダが作成されているか確認
- SD WebUI Reforgeが起動しているか確認
- Claude Codeのログを確認：`%APPDATA%\Claude\logs`

## ⚙️ 設定

### 環境変数 (.env.local)

```env
# SD WebUI Reforge API Endpoint
SD_WEBUI_URL=http://192.168.91.2:7863  # あなたのサーバーURLに変更

# MCP Server Settings
MCP_SERVER_NAME=sdreforge-mcp
MCP_SERVER_VERSION=0.1.0

# Debug Mode
DEBUG=false
```

### SD WebUI Reforge起動設定

```bash
# APIモードで起動（必須）
python launch.py --api --listen

# 推奨設定（メモリ効率化）
python launch.py --api --listen --xformers --medvram
```

## 📚 プリセットYAMLリファレンス

### 基本構造

```yaml
name: preset_name           # プリセット名（必須）
description: 説明            # 説明（オプション）
type: txt2img               # タイプ（必須）

base_settings:              # 基本設定
  # 記載した項目のみAPIペイロードに含まれます
  # 省略した項目はデフォルト値または未設定となります

extensions:                 # 拡張機能設定
  # 有効にしたい拡張機能のみ記載
  # 記載しない拡張機能は無効（JSONに含まれない）
```

### YAMLの省略ルール

**重要**: YAMLに記載しない項目は、APIペイロードのJSONに含まれません。

```yaml
# 例1: ADetailerを使わない場合
extensions:
  # adetailerを記載しない = ADetailerは無効

# 例2: 一部の設定のみ使用
base_settings:
  steps: 20        # これは含まれる
  # widthを記載しない = デフォルト値が使用される
```

### txt2img完全リファレンス

```yaml
name: txt2img_full
type: txt2img

base_settings:
  # プロンプト設定
  prompt_suffix: ", masterpiece"     # プロンプトに自動追加
  negative_prompt: "low quality"     # ネガティブプロンプト

  # 基本パラメータ（省略可能）
  steps: 28                          # 生成ステップ数
  cfg_scale: 7.0                     # プロンプト忠実度
  width: 1024                        # 画像幅
  height: 1024                       # 画像高さ
  sampler_name: "DPM++ 2M"          # サンプラー
  scheduler: "Karras"                # スケジューラー
  batch_size: 1                      # バッチサイズ
  n_iter: 1                          # 反復回数
  seed: -1                           # シード値（-1=ランダム）

  # モデル設定
  model: "animagineXL40_v40"        # 使用モデル名
  vae: "Automatic"                   # VAE選択
  clip_skip: 2                       # CLIPレイヤースキップ

  # Hires Fix（高解像度修正）
  enable_hr: true                    # Hires Fix有効化
  hr_scale: 2.0                      # アップスケール倍率
  hr_upscaler: "R-ESRGAN 4x+"       # アップスケーラー
  hr_second_pass_steps: 15           # 2回目のステップ数
  denoising_strength: 0.45          # デノイジング強度

extensions:
  # ADetailer（顔・手修正）
  adetailer:
    enabled: true
    models:                          # 最大3モデル（サーバー設定による）
      - model: "face_yolov8n.pt"
        prompt: "detailed face"
        confidence: 0.3
        mask_blur: 4
        inpaint_only_masked: true
      - model: "hand_yolov8n.pt"
        prompt: "perfect hands"

  # ControlNet（ポーズ・構図制御）
  controlnet:
    enabled: true
    units:                           # 最大3ユニット（サーバー設定による）
      - module: "openpose_full"
        model: "control_v11p_sd15_openpose"
        weight: 1.0
        pixel_perfect: true

  # Regional Prompter（領域別プロンプト）
  regional_prompter:
    enabled: true
    mode: "Matrix"
    split_ratio: "1,1"
    regions:
      - "1girl, red hair"
      - "blue sky"

  # Dynamic Prompts（動的プロンプト）
  dynamic_prompts:
    enabled: true
    template: "{red|blue} hair"

  # その他の拡張機能（省略時は無効）
  # latent_couple, tiled_diffusion, tiled_vae,
  # ultimate_upscale, self_attention_guidance, freeu
```

### img2img完全リファレンス

```yaml
name: img2img_full
type: img2img

base_settings:
  # img2img特有の設定
  init_images: []                   # 入力画像（base64またはパス）
  denoising_strength: 0.75          # 変更強度（0.0-1.0）
  resize_mode: 0                    # リサイズモード

  # マスク設定（inpaint用）
  mask: ""                          # マスク画像
  mask_blur: 4                      # マスクぼかし
  inpaint_full_res: true           # フル解像度インペイント
  inpaint_full_res_padding: 32     # パディング

  # その他はtxt2imgと同じ
  steps: 20
  cfg_scale: 7.0
  # ...

extensions:
  # img2img特有の拡張機能
  soft_inpainting:
    enabled: true
    mask_influence: 0.5

  color_grading:
    enabled: true
    factor: 1.0

  outpainting:
    enabled: true
    pixels_to_expand: 128
    direction: "all"

  # txt2imgと共通の拡張機能も使用可能
  adetailer:
    enabled: true
    # ...
```

### ユーティリティプリセット

```yaml
# PNG情報抽出
---
name: png_info
type: png-info
settings:
  image: ""  # base64画像

# アップスケール
---
name: upscale
type: extras-single-image
settings:
  image: ""
  upscaling_resize: 2
  upscaler_1: "R-ESRGAN 4x+"

# 画像解析
---
name: interrogate
type: interrogate
settings:
  image: ""
  model: "clip"  # または "deepbooru"
```

## 🎯 使用例

### プログラム内での使用

```typescript
import { PresetManager } from './src/presets';
import { SDWebUIClient } from './src/api/client';

// 初期化
const manager = new PresetManager('./presets');
const client = new SDWebUIClient();

// プリセット読み込み
const preset = manager.loadPreset('01_txt2img_animagine_base.yaml');

// ユーザー入力とマージ
const payload = manager.presetToPayload(preset, {
  prompt: "1girl, smile",
  seed: 12345
});

// 画像生成
const result = await client.txt2img(payload);
```

### 統合テスト実行

```bash
# APIサーバー接続テスト
npm run test:integration -- api-connection

# プリセットテスト
npm run test:integration -- preset-test

# フルテンプレート検証
npm run test:integration -- full-template
```

## 📁 プロジェクト構造

```
sdreforge_mcp/
├── src/                     # ソースコード
│   ├── api/                # APIクライアント ✅
│   │   ├── client.ts       # メインクライアント
│   │   └── types.ts        # 型定義
│   ├── presets/            # プリセット管理 ✅
│   │   ├── manager.ts      # プリセットマネージャー
│   │   └── types.ts        # 318行の完全型定義
│   └── server/             # MCPサーバー 🚧
├── tests/                  # テストコード
│   ├── unit/              # 単体テスト
│   └── integration/       # 統合テスト
├── presets/               # プリセットYAML
│   ├── templates/         # テンプレート
│   │   ├── FULL_TEMPLATE_txt2img.yaml
│   │   ├── FULL_TEMPLATE_img2img.yaml
│   │   └── UTILITY_TEMPLATES.yaml
│   └── *.yaml            # カスタムプリセット
├── output/                # 生成画像出力
└── docs/                  # ドキュメント
    ├── SD_WEBUI_REFORGE_API_SCHEMA.md
    ├── PRESET_TEMPLATES_GUIDE.md
    └── issues/            # 開発イシュー
```

## 🔍 トラブルシューティング

### SD WebUI Reforgeに接続できない

```bash
# 1. サーバーが起動していることを確認
curl http://192.168.91.2:7863/sdapi/v1/options

# 2. --apiフラグが有効か確認
# launch.pyの起動コマンドに --api が含まれているか

# 3. .env.localのURLを確認
cat .env.local
```

### 422エラーが発生する

- 自動的にnull値は除去されます
- プリセットYAMLで不要な項目を削除してください
- `DEBUG=true`でログを確認

### 拡張機能が動作しない

- SD WebUI Reforgeに該当拡張機能がインストールされているか確認
- プリセットのextensions内でenabledがtrueになっているか確認
- モデル名が正確か確認

## 📊 テスト実績

- **接続テスト**: ✅ 152モデル、74サンプラーで動作確認
- **画像生成**: ✅ 512x512〜1024x1024で複数回生成成功
- **拡張機能**: ✅ ADetailer、ControlNet動作確認
- **プリセット**: ✅ 全テンプレート解析成功

## 🚀 今後の開発予定

- [ ] Phase 1: MCPサーバー基礎実装
- [ ] Phase 2: 20種類のデフォルトプリセット作成
- [ ] Phase 3: Claude Code統合
- [ ] Future: img2img sketch, inpaint modes, X/Y/Z plots

## 📝 ライセンス

MIT

## 🤝 貢献

Issues、Pull Requestsは歓迎します。開発はTDDで行っているため、新機能追加時はテストも含めてください。

## 📚 参考資料

- [SD WebUI Reforge](https://github.com/Panchovix/stable-diffusion-webui-reforge)
- [Model Context Protocol](https://modelcontextprotocol.io/)
- [Claude Code](https://claude.ai/code)
- [プリセットテンプレートガイド](docs/PRESET_TEMPLATES_GUIDE.md)