# SD WebUI Reforge API スキーマ仕様書

このドキュメントは、sdreforge_wrapperのコード分析から抽出した、SD WebUI Reforge APIの正確なスキーマ仕様です。MCPサーバー実装時の参照資料として使用します。

## 1. APIエンドポイント

### 基本エンドポイント
- **ベースURL**: `http://localhost:7860` (デフォルト)
- **カスタムURL**: `.env.local`で設定可能
- **APIプレフィックス**: `/sdapi/v1/`

### 主要エンドポイント一覧
```
POST /sdapi/v1/txt2img           - テキストから画像生成
POST /sdapi/v1/img2img           - 画像から画像生成
POST /sdapi/v1/png-info          - PNG メタデータ取得
POST /sdapi/v1/interrogate       - 画像からプロンプト生成（CLIP/DeepBooru）
POST /sdapi/v1/extra-single-image - 単一画像の後処理（アップスケール等）
POST /sdapi/v1/extra-batch-images - 複数画像の後処理
GET  /sdapi/v1/sd-models         - 利用可能なモデル一覧
GET  /sdapi/v1/samplers          - 利用可能なサンプラー一覧
GET  /sdapi/v1/schedulers        - 利用可能なスケジューラー一覧
```

## 2. txt2img エンドポイント

### リクエスト構造
```json
{
  "prompt": "string",              // 必須: プロンプト
  "negative_prompt": "string",     // 必須: ネガティブプロンプト
  "steps": 20,                     // 必須: サンプリングステップ数
  "cfg_scale": 7.0,                // 必須: CFGスケール
  "width": 1024,                   // 必須: 画像幅
  "height": 1024,                  // 必須: 画像高さ
  "sampler_name": "DPM++ 2M Karras", // 必須: サンプラー名
  "batch_size": 1,                 // 必須: バッチサイズ
  "seed": -1,                      // 必須: シード値（-1でランダム）
  "send_images": true,             // 必須: 画像を返すか
  "save_images": false,            // 必須: サーバー側で保存するか

  // Hires Fix (オプション)
  "enable_hr": false,
  "hr_scale": 2.0,
  "hr_upscaler": "R-ESRGAN 4x+ Anime6B",
  "hr_second_pass_steps": 0,
  "denoising_strength": 0.7,
  "hr_resize_x": 0,
  "hr_resize_y": 0,

  // モデル変更 (オプション)
  "override_settings": {
    "sd_model_checkpoint": "animagineXL40_v4Opt"
  },
  "override_settings_restore_afterwards": true,

  // 拡張機能 (オプション)
  "alwayson_scripts": {
    // 詳細は後述
  }
}
```

### レスポンス構造
```json
{
  "images": ["base64_string", ...],  // Base64エンコードされた画像
  "parameters": {},                   // 使用されたパラメータ
  "info": "string"                    // 生成情報のJSON文字列
}
```

## 3. img2img エンドポイント

### リクエスト構造
```json
{
  "init_images": ["base64_string"],  // 必須: 入力画像（Base64）
  "resize_mode": 0,                   // 必須: リサイズモード（0-2）
  "denoising_strength": 0.75,         // 必須: ノイズ除去強度
  "prompt": "string",                 // 必須: プロンプト
  "negative_prompt": "string",        // 必須: ネガティブプロンプト
  "seed": -1,                         // 必須: シード値
  "sampler_name": "DPM++ 2M Karras",  // 必須: サンプラー
  "batch_size": 1,                    // 必須: バッチサイズ
  "n_iter": 1,                        // 必須: イテレーション数
  "steps": 20,                        // 必須: ステップ数
  "cfg_scale": 7.0,                   // 必須: CFGスケール
  "width": 1024,                      // 必須: 出力幅
  "height": 1024,                     // 必須: 出力高さ
  "restore_faces": false,             // 顔復元
  "tiling": false,                    // タイリング
  "send_images": true,                // 画像を返すか
  "save_images": false,               // サーバー側保存

  // インペイント用 (オプション)
  "mask": "base64_string",
  "mask_blur": 4,
  "inpainting_fill": 0,
  "inpaint_full_res": true,
  "inpaint_full_res_padding": 0,
  "inpainting_mask_invert": 0,

  // 拡張機能 (オプション)
  "alwayson_scripts": {}
}
```

## 4. 拡張機能 (alwayson_scripts)

### 4.1 ADetailer
```json
"alwayson_scripts": {
  "ADetailer": {
    "args": [
      true,   // ad_enable
      false,  // skip_img2img
      {
        "ad_model": "face_yolov8n.pt",  // または "hand_yolov8n.pt"
        "ad_prompt": "",                 // オプション
        "ad_negative_prompt": "",        // オプション
        "ad_confidence": 0.3             // オプション
      }
    ]
  }
}
```

**重要な注意点**:
- `args`配列の最初の2要素は必須のブール値
- 3番目以降の要素が実際のADetailer設定
- 複数のADetailerを使用する場合は、設定オブジェクトを追加

### 4.2 ControlNet
```json
"alwayson_scripts": {
  "ControlNet": {
    "args": [
      {
        "image": "base64_string",       // 入力画像
        "mask": null,                    // マスク画像（オプション）
        "module": "none",                // プリプロセッサ
        "model": "CN-Anytest3_animagine4_A", // モデル名
        "weight": 1.0,                   // 重み
        "resize_mode": "Just Resize",   // リサイズモード（文字列）
        "lowvram": false,
        "processor_res": 512,
        "threshold_a": 100.0,            // Canny用
        "threshold_b": 200.0,            // Canny用
        "guidance_start": 0.0,
        "guidance_end": 1.0,
        "control_mode": "Balanced",     // 制御モード（文字列）
        "pixel_perfect": true,           // 推奨: true
        "enabled": true,
        "guessmode": false
      }
    ]
  }
}
```

**制御モードの値**:
- `"Balanced"` - バランス型（0）
- `"My prompt is more important"` - プロンプト優先（1）
- `"ControlNet is more important"` - ControlNet優先（2）

**リサイズモードの値**:
- `"Just Resize"` - 単純リサイズ（0）
- `"Crop and Resize"` - クロップ＆リサイズ（1）
- `"Resize and Fill"` - リサイズ＆フィル（2）

### 4.3 Regional Prompter
```json
"alwayson_scripts": {
  "Regional Prompter": {
    "args": [
      true,                  // active
      false,                 // debug
      "Matrix",              // mode: "Matrix" or "Mask"
      "Rows",                // type: "Rows", "Columns", etc.
      "1,1",                 // ratios
      "0.2",                 // base_ratios
      false,                 // use_base
      true,                  // use_common
      false,                 // use_ncommon
      "Attention",          // options
      "",                   // mask (for Mask mode)
      "ADDCOMM",            // main_prompt placeholder
      "",                   // negative prompt
      "region1 ADDCOMM",    // region 1 prompt
      "region2 ADDCOMM",    // region 2 prompt
      "",                   // region 1 negative
      ""                    // region 2 negative
    ]
  }
}
```

### 4.4 Dynamic Prompts
```json
"alwayson_scripts": {
  "dynamic prompts v2.17.1": {
    "args": [
      true,    // enable
      false,   // combinatorial_generation
      0,       // max_generations
      false    // magic_prompt
    ]
  }
}
```

## 5. その他のエンドポイント

### 5.1 PNG Info
```json
// リクエスト
{
  "image": "base64_string"  // PNG画像のBase64
}

// レスポンス
{
  "info": "generation_parameters_text",
  "items": {
    "parameters": "parsed_parameters_dict"
  }
}
```

### 5.2 Extras (アップスケール等)
```json
// リクエスト (extra-single-image)
{
  "image": "base64_string",
  "resize_mode": 0,
  "show_extras_results": true,
  "gfpgan_visibility": 0,
  "codeformer_visibility": 0,
  "codeformer_weight": 0,
  "upscaling_resize": 2,           // スケール倍率
  "upscaling_resize_w": 0,
  "upscaling_resize_h": 0,
  "upscaling_crop": true,
  "upscaler_1": "4x_ultrasharp",   // アップスケーラー
  "upscaler_2": "None",
  "extras_upscaler_2_visibility": 0,
  "upscale_first": true
}

// レスポンス
{
  "image": "base64_string",
  "html_info": "string"
}
```

### 5.3 Interrogate (Tagger)
```json
// リクエスト
{
  "image": "base64_string",
  "model": "deepdanbooru"  // または "clip"
}

// レスポンス
{
  "caption": "generated tags or description"
}
```

## 6. エラー処理

### HTTPステータスコード
- `200` - 成功
- `422` - バリデーションエラー（パラメータ不正）
- `500` - サーバーエラー

### 422エラーの主な原因
1. **null値の混入** - APIはnull値を受け付けない
2. **型の不一致** - 数値型に文字列を送信等
3. **必須パラメータ不足**
4. **不正な拡張機能構造**

### エラー回避のベストプラクティス
```javascript
// null値を除去する関数
function cleanPayload(obj) {
  return Object.entries(obj).reduce((acc, [key, value]) => {
    if (value !== null && value !== undefined) {
      if (typeof value === 'object' && !Array.isArray(value)) {
        acc[key] = cleanPayload(value);
      } else {
        acc[key] = value;
      }
    }
    return acc;
  }, {});
}
```

## 7. 特記事項

### パラメータの送信ルール
1. **デフォルト値は送信しない** - 特にADetailerで重要
2. **null値は絶対に送信しない** - 422エラーの原因
3. **空文字列は許容される** - promptフィールド等
4. **数値は正確な型で** - floatとintを区別

### 拡張機能の互換性
- ADetailerとControlNetは同時使用可能
- Regional PrompterとDynamic Promptsは組み合わせ注意
- 複数ControlNetユニットは配列で送信

### モデル名の指定
- 完全なファイル名で指定: `"animagineXL40_v4Opt"`
- 拡張子は不要
- 大文字小文字は区別される

## 8. デフォルトプリセット用パラメータ

### txt2img基本設定（プリセット1）
```json
{
  "prompt": "masterpiece, best quality, 1 girl",
  "negative_prompt": "low quality, worst quality",
  "steps": 20,
  "cfg_scale": 7.0,
  "width": 1024,
  "height": 1024,
  "sampler_name": "DPM++ 2M Karras",
  "batch_size": 1,
  "seed": -1,
  "override_settings": {
    "sd_model_checkpoint": "animagineXL40_v4Opt"
  }
}
```

### ControlNet設定（プリセット2, 3）
```json
{
  "module": "none",
  "model": "CN-Anytest3_animagine4_A",  // または CN-Anytest4_animagine4_A
  "pixel_perfect": true,
  "weight": 1.0,
  "guidance_start": 0.0,
  "guidance_end": 1.0
}
```

---

*このドキュメントは、sdreforge_wrapperの実装コードから抽出した正確なAPI仕様です。*
*最終更新: 2025年1月*