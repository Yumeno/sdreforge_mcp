# YAML プリセットリファレンスマニュアル

## 📋 概要

SD WebUI Reforge MCP サーバーでは、YAML ファイルを使用してプリセットを定義し、MCPツールを動的に生成します。このリファレンスは、プリセットYAMLファイルの完全な仕様を説明します。

## 🏗️ プリセット基本構造

```yaml
name: string              # プリセット名（必須）- MCPツール名は "sdreforge_{name}" となる
type: string              # プリセットタイプ（必須）
description: string       # プリセットの説明（オプション）
base_settings: object    # 基本設定（オプション）
extensions: object       # 拡張機能設定（オプション）
prompt_template: object  # プロンプトテンプレート（オプション）
settings: object         # ユーティリティ用設定（オプション）
```

## 📝 プリセットタイプ (type)

### 画像生成タイプ
- `txt2img` - テキストから画像生成
- `img2img` - 画像から画像生成

### 処理タイプ
- `extras` - 画像処理（複数画像対応）
- `extras_combined` - 統合画像処理（背景除去+アップスケール）
- `extras-single-image` - 単一画像処理
- `rembg` - 背景除去
- `tagger` - 画像タグ付け
- `png-info` - PNG メタデータ抽出

### ユーティリティタイプ
- `utility` - ユーティリティ機能

## ⚙️ base_settings - 基本設定

### 共通パラメータ

```yaml
base_settings:
  # プロンプト設定
  prompt_suffix: string           # プロンプト自動追加テキスト
  negative_prompt: string         # ネガティブプロンプト

  # 生成パラメータ
  steps: number                   # 生成ステップ数 (1-150)
  cfg_scale: number              # CFG スケール (1.0-30.0)
  width: number                  # 画像幅 (64-2048)
  height: number                 # 画像高さ (64-2048)
  sampler_name: string           # サンプラー名
  scheduler: string              # スケジューラー名
  batch_size: number             # バッチサイズ (1-8)
  n_iter: number                 # 反復回数 (1-100)
  seed: number                   # シード値 (-1 = ランダム)
  subseed: number                # サブシード値
  subseed_strength: number       # サブシード強度 (0.0-1.0)

  # モデル設定
  model: string                  # 使用モデル名
  checkpoint: string             # チェックポイント名
  vae: string                    # VAE 名
  clip_skip: number              # CLIP スキップ (1-12)
```

### txt2img 専用パラメータ

```yaml
base_settings:
  # Hires Fix (高解像度修正)
  enable_hr: boolean             # Hires Fix 有効化
  hr_scale: number               # アップスケール倍率 (1.0-4.0)
  hr_upscaler: string            # アップスケーラー名
  hr_second_pass_steps: number   # 2次パス ステップ数 (0-150)
  hr_resize_x: number            # リサイズ幅
  hr_resize_y: number            # リサイズ高さ
  hr_prompt: string              # Hires Fix 用プロンプト
  hr_negative_prompt: string     # Hires Fix 用ネガティブプロンプト

  # Refiner (SDXL)
  refiner_checkpoint: string     # Refiner チェックポイント
  refiner_switch_at: number      # Refiner 切り替えタイミング (0.0-1.0)

  # その他
  restore_faces: boolean         # 顔修復
  tiling: boolean               # タイリング
  eta: number                   # Eta 値
  s_churn: number               # S Churn
  s_tmax: number                # S Tmax
  s_tmin: number                # S Tmin
  s_noise: number               # S Noise
```

### img2img 専用パラメータ

```yaml
base_settings:
  # 入力画像設定
  init_images: string[]          # 入力画像リスト (base64 or URL)
  denoising_strength: number     # デノイジング強度 (0.0-1.0)
  resize_mode: number            # リサイズモード (0-3)

  # マスク設定 (inpaint)
  mask: string                   # マスク画像 (base64 or URL)
  mask_blur: number              # マスクぼかし (0-64)
  mask_blur_x: number            # マスクぼかし X
  mask_blur_y: number            # マスクぼかし Y
  inpainting_fill: number        # インペイント埋め方 (0-3)
  inpaint_full_res: boolean      # フル解像度インペイント
  inpaint_full_res_padding: number # フル解像度パディング
  inpainting_mask_invert: number # マスク反転 (0-1)

  # その他
  image_cfg_scale: number        # Image CFG スケール
  sketch: string                 # スケッチ画像
```

## 🔧 extensions - 拡張機能設定

### ADetailer - 自動検出・修正

```yaml
extensions:
  adetailer:
    enabled: boolean             # ADetailer 有効化
    max_models: number           # 最大モデル数 (動的ツール生成用)
    models:
      - model: string            # 検出モデル名
        prompt: string           # 修正用プロンプト
        negative_prompt: string  # 修正用ネガティブプロンプト
        confidence: number       # 検出信頼度 (0.0-1.0)
        mask_blur: number        # マスクぼかし
        dilate_erode: number     # 拡張・収縮
        x_offset: number         # X オフセット
        y_offset: number         # Y オフセット
        mask_merge_invert: string # マスクマージ反転
        mask_preprocessor: string # マスク前処理
        inpaint_only_masked: boolean # マスク領域のみ
        inpaint_padding: number  # インペイントパディング
        denoising_strength: number # デノイジング強度
        use_separate_width: boolean # 個別幅使用
        width: number            # 幅
        use_separate_height: boolean # 個別高さ使用
        height: number           # 高さ
        use_separate_cfg_scale: boolean # 個別 CFG 使用
        cfg_scale: number        # CFG スケール
        use_separate_steps: boolean # 個別ステップ使用
        steps: number            # ステップ数
        use_separate_checkpoint: boolean # 個別チェックポイント使用
        checkpoint: string       # チェックポイント
        use_separate_vae: boolean # 個別 VAE 使用
        vae: string              # VAE
        use_separate_sampler: boolean # 個別サンプラー使用
        sampler: string          # サンプラー
        scheduler: string        # スケジューラー
        use_separate_clip_skip: boolean # 個別 CLIP スキップ使用
        clip_skip: number        # CLIP スキップ
        restore_faces_after: boolean # 後で顔修復
        controlnet_model: string # ControlNet モデル
```

#### 利用可能な ADetailer モデル
- **顔検出**: `face_yolov8n.pt`, `face_yolov8s.pt`, `face_yolov8m.pt`
- **手検出**: `hand_yolov8n.pt`, `hand_yolov8s.pt`
- **人物検出**: `person_yolov8n-seg.pt`, `person_yolov8s-seg.pt`
- **目検出**: `eye_yolov8n.pt`

### ControlNet - 構図・ポーズ制御

```yaml
extensions:
  controlnet:
    enabled: boolean             # ControlNet 有効化
    max_units: number            # 最大ユニット数 (動的ツール生成用)
    units:
      - enabled: boolean         # ユニット有効化
        module: string           # 前処理モジュール
        model: string            # ControlNet モデル
        weight: number           # 重み (0.0-2.0)
        resize_mode: number      # リサイズモード (0-2)
        pixel_perfect: boolean   # ピクセル完璧
        control_mode: number     # コントロールモード (0-2)
        threshold_a: number      # 閾値 A
        threshold_b: number      # 閾値 B
        guidance_start: number   # ガイダンス開始 (0.0-1.0)
        guidance_end: number     # ガイダンス終了 (0.0-1.0)
        processor_res: number    # プロセッサー解像度
```

#### 利用可能な ControlNet モデル例
- **ポーズ**: `CN-anytest3_animagine4_A`, `CN-posetest_v2_1`
- **カニー**: `CN-canny_animagine4_A`
- **深度**: `CN-depth_animagine4_A`
- **QR コード**: `CN-qr_animagine4_A`

#### 前処理モジュール例
- `None` - 前処理なし（画像そのまま）
- `canny` - Canny エッジ検出
- `openpose` / `openpose_full` - OpenPose ポーズ検出
- `depth_midas` / `depth_leres` - 深度推定
- `normal_map` - 法線マップ
- `seg_ofade20k` - セグメンテーション

### Regional Prompter - 領域別プロンプト

```yaml
extensions:
  regional_prompter:
    # 新しいプロパティ名（推奨）
    rp_active: boolean           # Regional Prompter 有効化
    rp_debug: boolean            # デバッグモード
    rp_mode: string              # モード ("Matrix" | "Mask" | "Prompt")
    rp_matrix_submode: string    # マトリックスサブモード ("Columns" | "Rows" | "Cols;Rows")
    rp_mask_submode: string      # マスクサブモード
    rp_prompt_submode: string    # プロンプトサブモード
    rp_divide_ratio: string      # 分割比率 (例: "1,1", "1,2,1")
    rp_base_ratio: string        # ベース比率 (例: "0.2")
    rp_use_base: boolean         # ベース使用
    rp_use_common: boolean       # 共通使用
    rp_use_ncommon: boolean      # 共通ネガティブ使用
    rp_calc_mode: string         # 計算モード ("Attention" | "Latent")
    rp_not_change_and: boolean   # AND 変更なし
    rp_lora_stop_step: string    # LoRA 停止ステップ
    rp_lora_hires_stop_step: string # LoRA Hires 停止ステップ
    rp_threshold: string         # 閾値

    # 従来のプロパティ名（互換性のため）
    enabled: boolean             # 有効化
    mode: string                 # モード
    split_mode: string           # 分割モード
    split_ratio: string          # 分割比率
    base_prompt: string          # ベースプロンプト
    common_prompt: string        # 共通プロンプト
    lora_in_common: boolean      # 共通内 LoRA
    lora_in_negative: boolean    # ネガティブ内 LoRA
    disable_convert_and: boolean # AND 変換無効化
    use_base: boolean            # ベース使用
    use_common: boolean          # 共通使用
    use_negative_common: boolean # 共通ネガティブ使用
```

#### Regional Prompter 使用例

**Matrix モード (列分割)**:
```yaml
rp_active: true
rp_mode: "Matrix"
rp_matrix_submode: "Columns"
rp_divide_ratio: "1,1"
```
プロンプト例: `2girls ADDBASE red hair, blue eyes ADDCOL green hair, red eyes`

**Mask モード**:
```yaml
rp_active: true
rp_mode: "Mask"
```
動的パラメータ: `rp_mask_1`, `rp_mask_2`, `rp_prompt_1`, `rp_prompt_2`

### Dynamic Prompts - 動的プロンプト拡張

```yaml
extensions:
  dynamic_prompts:
    enable_dynamic_prompts: boolean # Dynamic Prompts 有効化
    combinatorial_generation: boolean # 組み合わせ生成
    max_generations: number      # 最大生成数 (0 = 無制限)
    magic_prompt: boolean        # Magic Prompt 有効化

    # 従来のプロパティ名（互換性のため）
    enabled: boolean             # 有効化
    combinatorial: boolean       # 組み合わせ
    enable_jinja_templates: boolean # Jinja テンプレート
    unlink_seed: boolean         # シード分離
    template: string             # テンプレート
    wildcard_folder: string      # ワイルドカードフォルダ
    wildcards: object            # ワイルドカード定義
```

#### Dynamic Prompts 使用例
```yaml
enable_dynamic_prompts: true
combinatorial_generation: false
magic_prompt: false
```
プロンプト例: `{cute|beautiful|elegant} anime girl with {red|blue|black} hair`

### その他の拡張機能

#### Latent Couple
```yaml
extensions:
  latent_couple:
    enabled: boolean
    divisions: number
    positions: string[]
    weights: number[]
    prompts: string[]
```

#### Tiled Diffusion
```yaml
extensions:
  tiled_diffusion:
    enabled: boolean
    method: string
    tile_width: number
    tile_height: number
    tile_overlap: number
    tile_batch_size: number
    upscaler: string
    scale_factor: number
```

#### Ultimate SD Upscale
```yaml
extensions:
  ultimate_upscale:
    enabled: boolean
    target_size_type: string
    upscaler_index: string
    scale: number
    tile_width: number
    tile_height: number
    mask_blur: number
    padding: number
    seams_fix_width: number
    seams_fix_padding: number
    seams_fix_denoise: number
    seams_fix_mask_blur: number
    seams_fix_type: string
```

## 🎯 プロンプトテンプレート

```yaml
prompt_template:
  positive_prefix: string        # プロンプト前置詞
  positive_suffix: string        # プロンプト後置詞
  negative: string               # デフォルトネガティブプロンプト
```

## 🔧 動的パラメータ生成

### メタデータによる動的生成

動的プリセット（`01_txt2img_dynamic.yaml`, `02_img2img_dynamic.yaml`）では、拡張機能のメタデータを使用してMCPツールパラメータを動的生成します。

#### ControlNet 動的パラメータ
```yaml
extensions:
  controlnet:
    max_units: 3               # この値により動的パラメータが生成される
```

生成されるMCPツールパラメータ:
- `controlnet_image`, `controlnet_image_2`, `controlnet_image_3`
- `controlnet_enable_1`, `controlnet_enable_2`, `controlnet_enable_3`
- `controlnet_model_1`, `controlnet_model_2`, `controlnet_model_3`
- `controlnet_module_1`, `controlnet_module_2`, `controlnet_module_3`
- `controlnet_weight_1`, `controlnet_weight_2`, `controlnet_weight_3`

#### ADetailer 動的パラメータ
```yaml
extensions:
  adetailer:
    max_models: 2              # この値により動的パラメータが生成される
```

生成されるMCPツールパラメータ:
- `adetailer_model_1`, `adetailer_model_2`

### 自動有効化ロジック

#### ControlNet 自動有効化
- `controlnet_enable_X=true` が明示的に指定された場合: 指定された値を使用
- `controlnet_image_X` が提供され、`controlnet_enable_X` が未指定の場合: 自動的に有効化
- 後方互換性を保ちつつ、より直感的な使用を可能にする

#### ADetailer 自動有効化
- Model 1: デフォルトで `face_yolov8n.pt` が有効
- Model 2以降: `adetailer_model_X` が指定された場合のみ有効化

## 📚 プリセット例

### 基本的な txt2img プリセット

```yaml
name: txt2img_basic
type: txt2img
description: "Basic text-to-image generation"

base_settings:
  checkpoint: "sd_animagineXL40_v4Opt"
  sampler_name: "Euler a"
  steps: 28
  cfg_scale: 5
  width: 1024
  height: 1024
  seed: -1

prompt_template:
  positive_suffix: "masterpiece, high quality"
  negative: "lowres, bad quality"
```

### ControlNet + ADetailer プリセット

```yaml
name: txt2img_advanced
type: txt2img
description: "Advanced generation with ControlNet and ADetailer"

base_settings:
  checkpoint: "sd_animagineXL40_v4Opt"
  steps: 28
  cfg_scale: 7
  width: 1024
  height: 1024

extensions:
  adetailer:
    enabled: true
    models:
      - model: "face_yolov8n.pt"
        confidence: 0.3
      - model: "hand_yolov8n.pt"
        confidence: 0.4

  controlnet:
    enabled: true
    units:
      - module: "openpose_full"
        model: "CN-anytest3_animagine4_A"
        weight: 1.0
        pixel_perfect: true
```

### 動的プリセットの使用例

```yaml
name: txt2img_dynamic
type: txt2img
description: "Ultimate dynamic preset"

extensions:
  adetailer:
    enabled: true
    max_models: 15             # 最大15モデルの動的パラメータ生成

  controlnet:
    enabled: true
    max_units: 10              # 最大10ユニットの動的パラメータ生成

  dynamic_prompts:
    enable_dynamic_prompts: true

  regional_prompter:
    rp_active: false           # デフォルト無効、必要時に有効化
```

## ⚠️ 注意事項

### YAML 記述ルール
1. **記載しない項目はAPIペイロードに含まれません**
2. **null値は自動的に除去されます**（422エラー防止）
3. **必須フィールドのタイプチェックが行われます**

### パフォーマンス考慮事項
1. **batch_size**: VRAM容量に応じて調整
2. **max_models/max_units**: 必要以上に大きくしない
3. **動的プリセット**: 必要な機能のみ有効化

### 互換性
1. **Regional Prompter**: バージョンにより動作が異なる場合があります
2. **ControlNet モデル**: SD WebUI Reforge にインストールされているモデルのみ使用可能
3. **ADetailer モデル**: 拡張機能がインストールされている必要があります

## 🔗 関連ドキュメント

- [ツール登録・リビルドガイド](TOOL_REGISTRATION_GUIDE.md)
- [開発者ガイド](DEVELOPER_GUIDE.md)
- [プリセットテンプレートガイド](PRESET_TEMPLATES_GUIDE.md)