# Issue #6: txt2img Implementation & Testing

## 📋 概要
txt2img機能の完全実装とテスト

## 🎯 目標
MCPツール経由でtxt2img APIを呼び出し、画像を生成・保存できること

## 📊 現在の状況

### ✅ 実装済み
- プリセット定義（1-3, 7-10）
- APIクライアントのtxt2imgメソッド
- MCPサーバーのexecuteTool内のtxt2img処理

### ❌ 未実装・要修正
1. **チェックポイント切り替え処理**
   - 現在: プリセットにcheckpoint設定はあるが適用されない
   - 必要: API呼び出し前にモデル切り替え

2. **拡張機能の統合**
   - ADetailer設定の適用
   - ControlNet設定の適用
   - Regional Prompter設定の適用

3. **プロンプトテンプレート処理**
   - 現在: 基本的な結合のみ
   - 必要: ADDBASE, ADDCOL等の特殊記法対応

## 🔧 実装タスク

### Task 1: チェックポイント切り替え
```typescript
// src/server/mcp-server.ts に追加
if (preset.base_settings?.checkpoint) {
  await this.apiClient.setOptions({
    sd_model_checkpoint: preset.base_settings.checkpoint
  });
}
```

### Task 2: 拡張機能パラメータの確認
- alwayson_scripts構造の検証
- ADetailerパラメータマッピング
- ControlNetパラメータマッピング
- Regional Prompterパラメータマッピング

### Task 3: テストケース作成

#### Test 1: シンプルなtxt2img
```javascript
// プリセット: txt2img_animagine_base
{
  prompt: "1girl, school uniform, smile",
  seed: 12345,
  steps: 28,
  cfg_scale: 5
}
```

#### Test 2: ControlNet付きtxt2img
```javascript
// プリセット: txt2img_animagine_cn3
{
  prompt: "1girl, school uniform, smile",
  // ControlNet画像が必要
}
```

#### Test 3: Regional Prompter付きtxt2img
```javascript
// プリセット: txt2img_cn3_rp_matrix
{
  prompt: "2girls ADDBASE red hair ADDCOL blue hair",
}
```

## 📝 受け入れ条件

1. [ ] txt2img_animagine_baseで画像生成成功
2. [ ] 生成画像がoutputフォルダに保存される
3. [ ] MCPツール経由で実行可能
4. [ ] チェックポイントが正しく切り替わる
5. [ ] ADetailerが動作する（顔検出・補正）

## 🐛 既知の問題

1. **チェックポイント名の不一致**
   - プリセット: `animagineXL40_v4Opt`
   - 実際のモデル名要確認

2. **ControlNetモデル名**
   - プリセット: `CN-Anytest3_animagine4_A`
   - 実際のモデル名要確認

## 📌 参考情報

- SD WebUI API ドキュメント: `/docs`
- 既存のPNG Info実装: 動作確認済み
- APIエンドポイント: `http://192.168.91.2:7863/sdapi/v1/txt2img`

## 🔄 進捗

- [ ] チェックポイント切り替え実装
- [ ] 基本的なtxt2img動作確認
- [ ] ADetailer統合
- [ ] ControlNet統合（後回し可）
- [ ] Regional Prompter統合（後回し可）