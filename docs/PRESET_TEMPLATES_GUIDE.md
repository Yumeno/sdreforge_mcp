# Preset Templates Guide

## 概要

プリセットマネージャーは、SD WebUI Reforgeの複雑な設定をYAMLファイルで管理し、再利用可能にします。
このガイドでは、利用可能な全機能と書式について説明します。

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