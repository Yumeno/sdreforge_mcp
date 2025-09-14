# Issue #3: プリセットマネージャー実装

## 概要
YAMLベースのプリセット管理システムの実装。20種類のプリセットを管理し、APIペイロードへの変換機能を提供。

## 完了条件
- [ ] PresetManagerクラスの実装
- [ ] YAML読み込み・解析機能
- [ ] プリセット検証機能
- [ ] APIペイロード変換機能
- [ ] 拡張機能（ADetailer, ControlNet等）対応
- [ ] 単体テスト

## 実装内容

### 1. プリセット構造
```yaml
name: preset_name
description: プリセットの説明
type: txt2img | img2img
base_settings:
  prompt_suffix: "追加プロンプト"
  negative_prompt: "ネガティブプロンプト"
  steps: 20
  cfg_scale: 7.0
  width: 1024
  height: 1024
  sampler_name: "DPM++ 2M"
  model: "モデル名"
extensions:
  adetailer:
    enabled: true
    models: [face_yolov8n.pt]
  controlnet:
    enabled: true
    units: [...]
```

### 2. PresetManager機能
- `loadPreset(filename)` - 単一プリセット読み込み
- `loadAllPresets()` - 全プリセット読み込み
- `validatePreset(preset)` - プリセット検証
- `presetToPayload(preset, userParams)` - APIペイロード変換
- `mergeWithUserParams(preset, params)` - ユーザーパラメータマージ

### 3. 対応する拡張機能
- ADetailer (顔検出・修正)
- ControlNet (ポーズ・構図制御)
- Regional Prompter (領域別プロンプト)
- Dynamic Prompts (動的プロンプト生成)

### 4. エラーハンドリング
- 無効なYAML形式
- 必須フィールド不足
- 型の不一致
- ファイル読み込みエラー

## テストケース
1. YAML読み込みテスト
2. プリセット検証テスト
3. APIペイロード変換テスト
4. ユーザーパラメータマージテスト
5. 拡張機能設定テスト

## ステータス
**🚧 実装中**

## 関連ファイル
- `src/presets/manager.ts` - プリセットマネージャー実装
- `src/presets/types.ts` - TypeScript型定義
- `tests/unit/presets/manager.test.ts` - 単体テスト
- `presets/` - プリセットファイル格納ディレクトリ