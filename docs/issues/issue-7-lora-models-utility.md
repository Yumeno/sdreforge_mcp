# Issue #7: LoRAモデル一覧取得ユーティリティの実装

## 📋 概要
LoRAモデルの一覧を取得するユーティリティプリセットを実装する。LLMが正確にLoRAモデルを指定できるようにする。

## 🎯 目的
- 動的プリセットでLoRAモデルを正確に指定可能にする
- 利用可能なLoRAモデルの一覧をMCP経由で取得
- LLMによる自動選択の精度向上

## 📊 現状分析

### 現在のLoRA指定方法
```yaml
# 01_txt2img_dynamic.yaml内
loras:
  - path: "https://v3.fal.media/files/..."  # URLでの指定
    scale: 1.0
```

### SD WebUI ReforgeのLoRA API
```
GET /sdapi/v1/loras
Response: [
  {
    "name": "lora_name",
    "alias": "lora_alias",
    "path": "path/to/lora.safetensors"
  }
]
```

## 🔄 実装計画

### Phase 1: ユーティリティプリセット作成
```yaml
# 14_utility_lora_models.yaml
name: utility_lora_models
type: utility
description: "Get list of available LoRA models"

settings:
  endpoint: "/sdapi/v1/loras"
  method: "GET"
```

### Phase 2: MCPツール生成対応
- tool-generator.tsでLoRAユーティリティを認識
- 適切なツール名とdescriptionを生成

### Phase 3: 動的プリセット更新
- txt2img_dynamicとimg2img_dynamicのLoRA設定を改善
- ローカルLoRAとURL LoRAの両対応

## 📝 技術的考慮事項

### LoRA指定の統一化
```typescript
interface LoRASpecification {
  // ローカルLoRA
  name?: string;      // SD WebUI内のLoRA名

  // リモートLoRA
  path?: string;      // URLパス

  // 共通パラメータ
  scale: number;      // LoRA適用強度
}
```

### エラーハンドリング
- 存在しないLoRAの指定
- LoRAファイルの読み込みエラー
- ネットワークエラー（URL LoRA）

## ✅ 受け入れ基準
- [ ] LoRAモデル一覧取得が動作する
- [ ] MCPツールとして利用可能
- [ ] 動的プリセットでLoRAが正確に指定できる
- [ ] ドキュメントが更新されている

## 🚨 リスクと対策
- **リスク**: LoRA拡張機能が未インストール
- **対策**: エラーメッセージで明確に通知

## 📅 タイムライン
- 実装: 30分
- テスト: 30分
- ドキュメント: 15分

## 🔗 関連
- Issue #4: 動的プリセット移行
- txt2img_dynamic/img2img_dynamicプリセット
- SD WebUI Reforge API仕様