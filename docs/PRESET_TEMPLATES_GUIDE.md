# Preset Templates Guide

## 概要

プリセットマネージャーは、SD WebUI Reforgeの複雑な設定をYAMLファイルで管理し、再利用可能にします。
このガイドでは、利用可能な全機能と書式について説明します。

## 🎯 テンプレートベースシステム

### テンプレートシステムの利用

環境変数を使用してユーザー固有のデフォルト設定を持つプリセットを生成できます。

#### 初回セットアップ

```bash
# 1. 設定サンプル生成
npm run setup:presets:sample

# 2. 設定ファイルをコピー
# Windows (Command Prompt): copy .env.sample .env
# Windows (PowerShell):     Copy-Item .env.sample .env
# Linux/macOS:              cp .env.sample .env

# 3. 設定カスタマイズ
# .env ファイルを編集してデフォルト値を設定

# 4. プリセット生成
npm run setup:presets
```

#### インタラクティブ設定（推奨）

```bash
# インタラクティブ設定（ENTERで推奨設定を使用）
npm run setup:presets:interactive
```

**推奨設定の自動適用**:
- デフォルトモデル: `sd_animagineXL40_v4Opt`
- デフォルトサンプラー: `Euler a`
- デフォルトステップ数: `28`
- CFGスケール: `7`
- 解像度: `1024x1024`

#### テンプレート変数

**利用可能な変数**:
```env
# 基本生成設定
DEFAULT_CHECKPOINT=sd_animagineXL40_v4Opt
DEFAULT_SAMPLER=Euler a
DEFAULT_STEPS=28
DEFAULT_CFG_SCALE=7
DEFAULT_WIDTH=1024
DEFAULT_HEIGHT=1024

# プロンプト設定
DEFAULT_POSITIVE_SUFFIX=masterpiece, high quality, absurdres
DEFAULT_NEGATIVE=lowres, bad anatomy, bad hands, text, error, missing finger, extra digits, fewer digits, cropped, worst quality, low quality

# 拡張機能設定
CONTROLNET_MAX_UNITS=3
ADETAILER_MAX_MODELS=2
ADETAILER_DEFAULT_MODEL=face_yolov8n.pt
ADETAILER_CONFIDENCE=0.3

# 高度な設定
ENABLE_HIRES_FIX=false
HR_UPSCALER=R-ESRGAN 4x+ Anime6B
HR_SCALE=2.0
HR_DENOISING_STRENGTH=0.7
```

#### テンプレートから手動プリセット作成

テンプレートシステムで初回作成後は、生成されたYAMLをコピーして新しいプリセットを作成できます：

```bash
# 1. 既存プリセットをコピー
cp presets/01_txt2img_dynamic.yaml presets/17_custom_preset.yaml

# 2. ファイルを編集
# - name フィールドを変更: custom_preset
# - description を更新
# - 必要に応じて設定をカスタマイズ

# 3. ビルド・テスト
npm run build
# Claude Code 再起動
```

**手動作成のメリット**:
- 既存設定を継承
- 特定の用途に特化した設定
- テンプレートより自由度が高い

## 対応プリセットタイプ

### 1. 画像生成プリセット
- `txt2img` - テキストから画像生成
- `img2img` - 画像から画像生成

### 2. ユーティリティプリセット
- `png-info` - PNG画像からメタデータ抽出
- `extras-single-image` - 単一画像の後処理
- `extras-batch-images` - バッチ画像処理
- `interrogate` - 画像からプロンプト生成
- `progress` - 生成進行状況確認
- `options-get` - 設定取得
- `options-set` - 設定変更
- `models` - モデル管理
- `refresh` - モデルリスト更新
- `samplers` - サンプラー情報
- `unload-checkpoint` - メモリ解放

## txt2img/img2img拡張機能

### 基本設定 (base_settings)
```yaml
base_settings:
  # プロンプト
  prompt_suffix: ", masterpiece, best quality"
  negative_prompt: "low quality"

  # 生成パラメータ
  steps: 28
  cfg_scale: 7.0
  width: 1024
  height: 1024
  sampler_name: "DPM++ 2M"
  scheduler: "Karras"
  seed: -1

  # Hires Fix (txt2img)
  enable_hr: true
  hr_scale: 2.0
  hr_upscaler: "R-ESRGAN 4x+ Anime6B"
  hr_second_pass_steps: 15
  denoising_strength: 0.45

  # img2img特有
  init_images: []
  denoising_strength: 0.75
  resize_mode: 0
  mask: ""
  inpaint_full_res: true
```

### 拡張機能 (extensions)

#### ADetailer（顔・手・人物検出修正）
```yaml
adetailer:
  enabled: true
  models:
    - model: "face_yolov8n.pt"
      prompt: "detailed face"
      confidence: 0.3
      mask_blur: 4
      inpaint_only_masked: true
    - model: "hand_yolov8n.pt"
      prompt: "perfect hands"
    - model: "person_yolov8n-seg.pt"
```

#### ControlNet（ポーズ・構図制御）
```yaml
controlnet:
  enabled: true
  units:
    - module: "openpose_full"
      model: "control_v11p_sd15_openpose"
      weight: 1.0
      pixel_perfect: true
    - module: "depth_midas"
      model: "control_v11f1p_sd15_depth"
      weight: 0.5
    - module: "canny"
      model: "control_v11p_sd15_canny"
```

#### Regional Prompter（領域別プロンプト）

**⚠️ 注意**: GitHub Issue #408により一部バージョンで動作不良あり（2025年9月19日確認）
**✅ 更新**: Mask モードがAPI経由でも動作可能に（2025年9月19日）

```yaml
regional_prompter:
  enabled: true
  mode: "Matrix"        # Matrix, Mask, Prompt (API経由ではMatrixとMaskが動作確認済み)
  split_mode: "Columns" # Columns, Rows, Cols;Rows (Matrixモード用)
  split_ratio: "1,1"    # 分割比率
  base_ratio: "0.2"     # ベースプロンプトの比率
  use_base: true        # ベースプロンプトを使用
  use_common: false     # 共通プロンプトを使用
  calc_mode: "Attention" # Attention or Latent
  # Maskモード用（MCPサーバーが自動処理）
  mask_paths:           # 白黒マスク画像のパス（複数指定可）
    - "mask1.png"
    - "mask2.png"
```

#### Dynamic Prompts（動的プロンプト）
```yaml
dynamic_prompts:
  enabled: true
  template: |
    {red|blue|green} hair,
    {smile|serious} expression
  wildcards:
    hair_color: ["red", "blue", "green"]
```

#### その他の拡張機能
- `latent_couple` - 複数キャラクター生成
- `tiled_diffusion` - 大規模画像生成
- `tiled_vae` - メモリ効率化
- `ultimate_upscale` - 高度なアップスケール
- `self_attention_guidance` - 注意機構ガイダンス
- `freeu` - FreeUパラメータ
- `soft_inpainting` - ソフトインペイント（img2img）
- `color_grading` - カラーグレーディング（img2img）
- `outpainting` - アウトペイント（img2img）

## フルテンプレート

完全な機能を含むテンプレートは以下のファイルを参照してください：

- `presets/templates/FULL_TEMPLATE_txt2img.yaml` - txt2img全機能
- `presets/templates/FULL_TEMPLATE_img2img.yaml` - img2img全機能
- `presets/templates/UTILITY_TEMPLATES.yaml` - ユーティリティ機能

## 使用例

```typescript
// プリセットを読み込み
const manager = new PresetManager('./presets');
const preset = manager.loadPreset('01_txt2img_animagine_base.yaml');

// ユーザーパラメータとマージしてAPIペイロードを生成
const payload = manager.presetToPayload(preset, {
  prompt: "1girl, smile",
  seed: 12345
});

// 画像生成
const result = await client.txt2img(payload);
```

## 将来の拡張予定（TODO）

- img2img sketch
- inpaint（専用モード）
- inpaint sketch
- outpaint variations
- X/Y/Z plot scripts
- Batch processing scripts
- Extension固有のユーティリティ

## 注意事項

1. **サーバー設定依存**: ControlNetやADetailerの最大数はサーバー設定に依存します
2. **モデル名**: 使用するモデル名は実際のサーバーにインストールされているものと一致する必要があります
3. **拡張機能**: 有効化する拡張機能は事前にSD WebUI Reforgeにインストールされている必要があります