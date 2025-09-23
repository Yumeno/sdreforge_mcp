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
- **動的プリセットシステム** - 効率化された設定管理
  - **2つの動的プリセット**で全機能をカバー：`txt2img_dynamic`, `img2img_dynamic`
  - 動的パラメータ生成：max_models, max_units メタデータベース
  - 自動有効化ロジック：ControlNet, ADetailer の後方互換性
  - **16個のユーティリティツール**：PNG情報、アップスケール、背景除去等
- **テンプレートベース初期化システム** - ユーザーカスタマイズ対応
  - **環境変数ベース設定**：.envファイルでデフォルト値をカスタマイズ
  - **自動プリセット生成**：テンプレート→実際のプリセット自動変換
  - **クロスプラットフォーム対応**：Windows/Linux/macOS完全対応
  - **インタラクティブセットアップ**：対話式設定とマイグレーション
- **全拡張機能対応** - 10種類以上の拡張機能統合
  - **ControlNet**: 最大10ユニット、auto-enable機能
  - **ADetailer**: 最大15モデル、顔・手・人物検出
  - **Regional Prompter**: Matrix/Maskモード、無制限マスク
  - **Dynamic Prompts**: 自動拡張、Magic Prompt
- **テスト・検証済み** - TDD開発
  - 単体テスト: 27個
  - 統合テスト: 実サーバー接続確認済み
  - **実績**: 152モデル、74サンプラーで動作確認
  - **テンプレートシステム**: 全機能動作確認済み
- **MCPサーバー** - MCP仕様準拠の完全実装
  - 動的ツール生成（プリセット→MCPツール自動変換）
  - リクエスト/レスポンスハンドリング
  - 自動画像保存機能
  - **img2img/inpaint** - ファイルパス→base64自動変換対応

## 📋 特徴

- 🎨 **完全統合システム** - 2つの動的プリセットで全機能を効率的にカバー
- 🔧 **拡張機能フルサポート** - ControlNet, ADetailer, Regional Prompter等10種類以上
- ⚡ **動的パラメータ生成** - max_models/max_units メタデータによる自動拡張
- 🔄 **自動有効化** - 画像提供時のControlNet/ADetailer自動有効化
- 📝 **YAMLベース設定** - 直感的なプリセット定義とカスタマイズ
- 🎛️ **テンプレートベースカスタマイズ** - 環境変数でデフォルト設定を一元管理
- 🌐 **クロスプラットフォーム** - Windows/Linux/macOS完全対応
- 🚀 **リアルタイム生成** - プリセット→MCPツール動的変換
- ✅ **本格運用対応** - 152モデル、74サンプラーで動作検証済み

## 🛠️ インストール

### システム要件

- **Node.js**: 16.0.0以上（推奨: 18.0.0以上）
- **npm**: 8.0.0以上
- **対応OS**: Windows 10+, macOS 10.15+, Ubuntu 18.04+
- **SD WebUI Reforge**: APIモード対応版

### セットアップ

```bash
# リポジトリをクローン
git clone https://github.com/Yumeno/sdreforge_mcp.git
cd sdreforge_mcp

# 依存関係をインストール
npm install

# ビルド
npm run build

# 環境設定ファイルを作成
cp .env.sample .env
# .envを編集してSD WebUIのURLを設定
```

## 🔧 Claude Codeへの設定

### 1. Claude Code設定ファイルの作成

Windows: `%APPDATA%\Claude\claude_desktop_config.json`
Mac/Linux: `~/.config/Claude/claude_desktop_config.json`

### 2. MCPサーバー設定の追加

以下の設定を`claude_desktop_config.json`に追加します：

#### 方法1: npxを使用（推奨）
```json
{
  "mcpServers": {
    "sdreforge": {
      "command": "npx",
      "args": ["-y", "tsx", "C:\\path\\to\\sdreforge_mcp\\src\\index.ts"],
      "env": {
        "SD_WEBUI_URL": "http://localhost:7860"
      }
    }
  }
}
```

#### 方法2: ビルド済みファイルを使用
```json
{
  "mcpServers": {
    "sdreforge": {
      "command": "node",
      "args": ["C:\\path\\to\\sdreforge_mcp\\dist\\index.js"],
      "env": {
        "SD_WEBUI_URL": "http://localhost:7860"
      }
    }
  }
}
```

#### パスをご自身の環境に合わせて変更してください：
- `args`のパス: プロジェクトの`src/index.ts`または`dist/index.js`へのフルパス
- `SD_WEBUI_URL`: お使いのSD WebUI ReforgeサーバーのURL

### 3. 複数サーバーがある場合の設定例

```json
{
  "mcpServers": {
    "sdreforge": {
      "command": "npx",
      "args": ["-y", "tsx", "C:\\path\\to\\sdreforge_mcp\\src\\index.ts"],
      "env": {
        "SD_WEBUI_URL": "http://localhost:7860"
      }
    },
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "C:\\path\\to\\workspace"],
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

## 🔧 利用可能なツール一覧

### 画像生成ツール (2個)
- `sdreforge_txt2img_dynamic` - 究極の動的テキスト→画像生成
- `sdreforge_img2img_dynamic` - 究極の動的画像→画像生成・編集

### ユーティリティツール (16個)
- `sdreforge_extras_upscale_dynamic` - 画像アップスケール
- `sdreforge_extras_rembg_dynamic` - 背景除去
- `sdreforge_extras_combined_rembg_upscale` - 背景除去+アップスケール統合
- `sdreforge_tagger_dynamic` - 画像タグ自動生成
- `sdreforge_utility_png_info` - PNG メタデータ抽出
- `sdreforge_utility_check_model` - 現在のモデル確認
- `sdreforge_utility_switch_model` - モデル切り替え
- `sdreforge_utility_controlnet_models` - ControlNet モデル一覧
- `sdreforge_utility_samplers` - サンプラー一覧
- `sdreforge_utility_upscalers` - アップスケーラー一覧
- `sdreforge_utility_controlnet_modules` - ControlNet モジュール一覧
- `sdreforge_utility_adetailer_models` - ADetailer モデル一覧
- `sdreforge_utility_tagger_models` - Tagger モデル一覧
- `sdreforge_utility_rembg_models` - RemBG モデル一覧

## 🎯 クイックスタート

### 基本的な画像生成

```bash
# Claude Code で以下を実行
sdreforge_txt2img_dynamic(
  prompt="beautiful anime girl, masterpiece",
  steps=28,
  cfg_scale=7,
  width=1024,
  height=1024
)
```

### ControlNet を使った構図制御

```bash
# ポーズ画像を使った生成
sdreforge_txt2img_dynamic(
  prompt="anime girl dancing",
  controlnet_image="pose_reference.png",
  controlnet_model_1="CN-anytest3_animagine4_A",
  controlnet_weight_1=0.8
)
```

### 高解像度生成

```bash
# Hires Fix を使った高品質生成
sdreforge_txt2img_dynamic(
  prompt="detailed anime portrait",
  enable_hr=true,
  hr_scale=2.0,
  hr_upscaler="R-ESRGAN 4x+ Anime6B"
)
```

### 複数拡張機能の組み合わせ

```bash
# ControlNet + ADetailer + Dynamic Prompts
sdreforge_txt2img_dynamic(
  prompt="{cute|beautiful} anime girl with {red|blue} hair",
  controlnet_image="pose.png",
  controlnet_model_1="CN-anytest3_animagine4_A",
  adetailer_model_2="hand_yolov8n.pt",
  enable_dynamic_prompts=true,
  batch_size=4
)
```

### トラブルシューティング

**ツールが表示されない場合：**
- パスが正しいか確認（バックスラッシュをエスケープ `\\`）
- 方法1（npx）の場合：`tsx`がインストールされているか確認
- 方法2（node）の場合：`npm run build`を実行して`dist`フォルダが作成されているか確認
- SD WebUI Reforgeが起動しているか確認（`--api`フラグ必須）
- Claude Codeのログを確認：`%APPDATA%\Claude\logs`

**SD WebUI Reforgeの起動方法：**
```bash
# APIモードで起動（必須）
./webui.bat --api --listen
```

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

## 📚 ドキュメント

### 包括的なガイド

- **[YAML プリセットリファレンス](docs/PRESET_YAML_REFERENCE.md)** - 完全なプリセット仕様（350+項目）
- **[ツール登録・リビルドガイド](docs/TOOL_REGISTRATION_GUIDE.md)** - MCPツール生成とリビルド手順
- **[開発者ガイド](docs/DEVELOPER_GUIDE.md)** - 新機能開発とカスタマイズ
- **[プリセットテンプレートガイド](docs/PRESET_TEMPLATES_GUIDE.md)** - 拡張機能別設定例

### 動的プリセットシステム

**2つの万能プリセット**で全機能をカバー：

#### txt2img_dynamic - 究極のテキスト→画像生成

```yaml
# メタデータで動的パラメータ生成
extensions:
  adetailer:
    max_models: 15           # adetailer_model_1-15 を自動生成
  controlnet:
    max_units: 10            # controlnet_* パラメータを10セット生成
  regional_prompter:
    rp_active: false         # 必要時に有効化
  dynamic_prompts:
    enable_dynamic_prompts: true
```

**生成される動的パラメータ例**:
- ControlNet: `controlnet_image_1-10`, `controlnet_enable_1-10`, `controlnet_model_1-10` 等
- ADetailer: `adetailer_model_1-15`
- Hires Fix: `enable_hr`, `hr_scale`, `hr_upscaler` 等
- 全350+項目がユーザーパラメータで動的制御可能

#### プリセット省略ルール

**重要**: YAMLに記載しない項目は、APIペイロードのJSONに含まれません。

```yaml
# 必要最小限の定義
extensions:
  # adetailerを記載しない = ADetailerは無効

# 例2: 一部の設定のみ使用
base_settings:
  steps: 20        # これは含まれる
  # widthを記載しない = デフォルト値が使用される
```

### 自動有効化システム

#### ControlNet 自動有効化
```bash
# 画像を提供すると自動的にControlNetが有効化
sdreforge_txt2img_dynamic(
  prompt="anime girl",
  controlnet_image="pose.png"  # これだけで自動有効化
)

# 明示的制御も可能
sdreforge_txt2img_dynamic(
  prompt="anime girl",
  controlnet_image="pose.png",
  controlnet_enable_1=true,    # 明示的有効化
  controlnet_model_1="CN-anytest3_animagine4_A"
)
```

#### ADetailer 自動有効化
```bash
# Model 1は常に face_yolov8n.pt で有効
# Model 2以降は指定時のみ有効化
sdreforge_txt2img_dynamic(
  prompt="anime girl",
  adetailer_model_2="hand_yolov8n.pt"  # Model 2を自動有効化
)
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

## 🎯 実用例

### Regional Prompter - 領域別制御

```bash
# Matrix モード: 左右で異なるキャラクター
sdreforge_txt2img_dynamic(
  prompt="2girls ADDBASE red hair, blue eyes ADDCOL green hair, red eyes",
  rp_active=true,
  rp_mode="Matrix",
  rp_matrix_submode="Columns",
  rp_divide_ratio="1,1"
)

# Mask モード: マスク画像で領域指定
sdreforge_txt2img_dynamic(
  prompt="fantasy warrior",
  rp_active=true,
  rp_mode="Mask",
  rp_mask_1="face_area.png",
  rp_mask_2="body_area.png"
)
```

### Dynamic Prompts - 自動バリエーション

```bash
# ワイルドカード展開
sdreforge_txt2img_dynamic(
  prompt="{cute|beautiful|elegant} anime girl with {red|blue|black} hair",
  enable_dynamic_prompts=true,
  batch_size=4,  # 4枚の異なるバリエーション
  combinatorial_generation=false
)

# Magic Prompt でプロンプト強化
sdreforge_txt2img_dynamic(
  prompt="anime girl",
  enable_dynamic_prompts=true,
  magic_prompt=true  # AIが自動的にプロンプトを詳細化
)
```

### プログラマティック利用

```typescript
import { PresetManager } from './src/presets';
import { SDWebUIClient } from './src/api/client';

// 初期化
const manager = new PresetManager('./presets');
const client = new SDWebUIClient();

// 動的プリセット使用
const preset = manager.loadPreset('01_txt2img_dynamic.yaml');

// 複数拡張機能の組み合わせ
const payload = manager.presetToPayload(preset, {
  prompt: "masterpiece anime girl",
  controlnet_image: "pose_reference.png",
  controlnet_model_1: "CN-anytest3_animagine4_A",
  adetailer_model_2: "hand_yolov8n.pt",
  enable_hr: true,
  hr_scale: 2.0,
  batch_size: 2
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
│   ├── setup/              # テンプレートシステム ✅
│   │   ├── template-processor.ts  # テンプレート処理エンジン
│   │   ├── setup-cli.ts    # セットアップCLI
│   │   └── migrate-presets.ts     # マイグレーション
│   └── server/             # MCPサーバー ✅
├── tests/                  # テストコード
│   ├── unit/              # 単体テスト
│   └── integration/       # 統合テスト
├── preset-templates/      # プリセットテンプレート ✅
│   ├── 01_txt2img_dynamic.yaml.template
│   ├── 02_img2img_dynamic.yaml.template
│   ├── 03_extras_upscale_dynamic.yaml.template
│   ├── 04_extras_rembg_dynamic.yaml.template
│   ├── 06_tagger_dynamic.yaml.template
│   └── 08_utility_check_model.yaml.template
├── presets/               # 生成されたプリセット
│   ├── deprecated/        # 非推奨プリセット保管
│   ├── templates/         # 手動テンプレート
│   └── *.yaml            # アクティブプリセット
├── output/                # 生成画像出力
└── docs/                  # ドキュメント ✅
    ├── PRESET_YAML_REFERENCE.md     # 完全仕様書
    ├── TOOL_REGISTRATION_GUIDE.md   # ツール登録ガイド
    ├── DEVELOPER_GUIDE.md           # 開発者ガイド
    └── PRESET_TEMPLATES_GUIDE.md    # テンプレートガイド
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

## 📊 検証実績

- **接続テスト**: ✅ 152モデル、74サンプラーで動作確認済み
- **動的プリセット**: ✅ 2つのプリセットで全26種類の機能を統合
- **拡張機能**: ✅ ControlNet, ADetailer, Regional Prompter 実動作確認
- **自動有効化**: ✅ 後方互換性を保ちつつ直感的操作を実現
- **ユーティリティ**: ✅ 16種類のツールで包括的な画像処理サポート
- **TDD開発**: ✅ 27個の単体テスト + 統合テスト完備

## 📈 システム進化

### v0.1.0 → 現在
- ✅ **26個の個別プリセット** → **2個の動的プリセット**に効率化
- ✅ **静的パラメータ** → **動的パラメータ生成**システム
- ✅ **手動設定** → **自動有効化ロジック**
- ✅ **基本機能** → **全拡張機能統合**
- ✅ **固定設定** → **テンプレートベース初期化**システム (Issue #4)
- ✅ **単一OS** → **クロスプラットフォーム対応**

### 完了した主要機能
- ✅ **Issue #4**: テンプレートベース初期化システム
  - 環境変数による設定カスタマイズ
  - 自動プリセット生成
  - インタラクティブセットアップ
  - マイグレーション機能

### 今後の展開
- [ ] **Phase 4**: X/Y/Z プロット機能
- [ ] **Phase 5**: カスタム拡張機能プラグインシステム
- [ ] **Future**: Batch処理とワークフロー自動化

## 📝 ライセンス

MIT

## 🤝 貢献

Issues、Pull Requestsは歓迎します。開発はTDDで行っているため、新機能追加時はテストも含めてください。

## 🎛️ テンプレートベース初期化システム (Issue #4)

### 概要

ユーザー固有のデフォルト設定を簡単に適用できるテンプレートベースのプリセット初期化システムです。

### セットアップ手順

#### 1. 設定ファイルの準備

```bash
# サンプル環境ファイルの生成
npm run setup:presets:sample
```

**設定ファイルのコピー:**
```bash
# Linux/macOS
cp .env.sample .env

# Windows (Command Prompt)
copy .env.sample .env

# Windows (PowerShell)
Copy-Item .env.sample .env
```

#### 2. 設定のカスタマイズ

`.env` ファイルでお好みの設定を指定：

```env
# モデル・基本設定
DEFAULT_CHECKPOINT=sd_animagineXL40_v4Opt
DEFAULT_SAMPLER=Euler a
DEFAULT_STEPS=28
DEFAULT_CFG_SCALE=5

# 画像サイズ
DEFAULT_WIDTH=1024
DEFAULT_HEIGHT=1024

# プロンプトテンプレート
POSITIVE_SUFFIX=masterpiece, high score, great score, absurdres
NEGATIVE_BASE=lowres, bad anatomy, bad hands, text, error, missing finger, extra digits, fewer digits, cropped, worst quality, low quality, low score, bad score, average score, signature, watermark, username, blurry

# 拡張機能設定
CONTROLNET_MAX_UNITS=3
ADETAILER_MAX_MODELS=2
UPSCALER_DEFAULT_MODEL=4x-UltraSharp
```

#### 3. プリセット生成

```bash
# 自動セットアップ
npm run setup:presets

# インタラクティブセットアップ（推奨）
npm run setup:presets:interactive

# 設定検証のみ
npm run setup:presets:validate
```

#### 4. ビルド・起動

```bash
npm run build
# Claude Code を再起動して新しいプリセットを読み込み
```

### 利用可能なコマンド

```bash
# セットアップ関連
npm run setup:presets                 # 自動セットアップ
npm run setup:presets:interactive     # インタラクティブモード
npm run setup:presets:validate        # 設定検証
npm run setup:presets:sample          # サンプル.env生成

# マイグレーション関連
npm run migrate:presets               # 既存プリセットの整理
npm run migrate:presets:dry-run       # 変更内容のプレビュー
npm run migrate:presets:report        # マイグレーション分析レポート
```

### テンプレート変数一覧

| カテゴリ | 変数名 | デフォルト値 | 説明 |
|---------|-------|-------------|------|
| **モデル設定** | `DEFAULT_CHECKPOINT` | `sd_animagineXL40_v4Opt` | デフォルトモデル |
| | `DEFAULT_SAMPLER` | `Euler a` | デフォルトサンプラー |
| | `DEFAULT_SCHEDULER` | `Automatic` | デフォルトスケジューラー |
| **生成設定** | `DEFAULT_STEPS` | `28` | 生成ステップ数 |
| | `DEFAULT_CFG_SCALE` | `5` | CFGスケール |
| | `DEFAULT_CLIP_SKIP` | `1` | CLIPスキップ |
| **画像サイズ** | `DEFAULT_WIDTH` | `1024` | デフォルト幅 |
| | `DEFAULT_HEIGHT` | `1024` | デフォルト高さ |
| **ControlNet** | `CONTROLNET_MAX_UNITS` | `3` | 最大ユニット数 |
| **ADetailer** | `ADETAILER_MAX_MODELS` | `2` | 最大モデル数 |
| **アップスケール** | `UPSCALER_DEFAULT_MODEL` | `4x-UltraSharp` | デフォルトアップスケーラー |
| | `UPSCALER_DEFAULT_SCALE` | `2` | デフォルトスケール倍率 |

### プリセットマイグレーション

既存の個別プリセットを整理し、動的プリセットに統合：

```bash
# マイグレーション分析
npm run migrate:presets:report

# プレビュー実行
npm run migrate:presets:dry-run

# 実際のマイグレーション
npm run migrate:presets
```

**マイグレーション処理内容:**
- 非推奨プリセット → `presets/deprecated/` に移動
- 動的プリセット、ユーティリティプリセット → そのまま保持
- 自動バックアップ作成 (`presets-backup-YYYY-MM-DD`)

### カスタマイズ例

#### アニメ特化設定
```env
DEFAULT_CHECKPOINT=animagineXL40_v40
DEFAULT_SAMPLER=DPM++ 2M Karras
DEFAULT_STEPS=20
DEFAULT_CFG_SCALE=7
POSITIVE_SUFFIX=masterpiece, best quality, anime style
UPSCALER_DEFAULT_MODEL=R-ESRGAN 4x+ Anime6B
```

#### 写実特化設定
```env
DEFAULT_CHECKPOINT=realismEngineSDXL_v30VAE
DEFAULT_SAMPLER=DPM++ SDE Karras
DEFAULT_STEPS=30
DEFAULT_CFG_SCALE=6
POSITIVE_SUFFIX=photorealistic, highly detailed, 8k resolution
UPSCALER_DEFAULT_MODEL=4x-UltraSharp
```

#### 高性能環境設定
```env
CONTROLNET_MAX_UNITS=10
ADETAILER_MAX_MODELS=15
DEFAULT_WIDTH=1536
DEFAULT_HEIGHT=1536
UPSCALER_DEFAULT_SCALE=4
```

### トラブルシューティング

**設定検証失敗:**
```bash
# 不足している変数を確認
npm run setup:presets:validate

# サンプルファイルを再生成
npm run setup:presets:sample
```

**テンプレート処理エラー:**
- `.env` ファイルの構文を確認
- 数値項目は数値で指定（クォート不要）
- ブール値は `true`/`false` で指定

**プリセット競合:**
```bash
# 強制上書き
npm run setup:presets -- --force

# インタラクティブ選択
npm run setup:presets:interactive
```

## 📚 参考資料

- [SD WebUI Reforge](https://github.com/Panchovix/stable-diffusion-webui-reforge)
- [Model Context Protocol](https://modelcontextprotocol.io/)
- [Claude Code](https://claude.ai/code)
- [プリセットテンプレートガイド](docs/PRESET_TEMPLATES_GUIDE.md)