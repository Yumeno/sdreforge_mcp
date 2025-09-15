# Issue #009: 動的プリセットパラダイムの革命

## 📋 概要

従来の「固定設定プリセット」から「デフォルト値＋動的カスタマイズ」への革命的転換を実現。1つのプリセットで無限のバリエーションを可能にする新しいプリセット設計パラダイムの確立。

## 🎯 実装目標

### パラダイムシフト
- [x] 静的プリセット → 動的プリセット
- [x] 専用設定 → 汎用設定
- [x] 固定バリエーション → 無限バリエーション

### 技術実装
- [x] デフォルト値定義（YAML）
- [x] パラメータ上書き（MCP）
- [x] 選択的有効化（動的制御）
- [x] 完全パラメータ化

## 🔧 技術設計

### 従来方式（問題）
```yaml
# 専用プリセット × N個
txt2img_face_only.yaml      # 顔検出のみ
txt2img_face_hand.yaml      # 顔+手検出
txt2img_face_hand_person.yaml # 顔+手+人物検出
txt2img_cn_pose.yaml        # ControlNet pose
txt2img_cn_pose_hand.yaml   # ControlNet pose + hand
...                         # 組み合わせ爆発
```

### 新方式（解決）
```yaml
# 汎用プリセット × 1個
txt2img_cn_multi_3units.yaml
```

```typescript
// 動的設定
controlnet_image=pose.png           // → CN Unit 0有効
adetailer_model_2=hand_yolov8n.pt  // → ADetailer 2段有効
controlnet_weight_1=0.7            // → 重み調整
```

## 🧪 実証済み機能

### ControlNet動的制御
- [x] **0段**: ControlNet完全無効化
- [x] **1段**: controlnet_image指定
- [x] **2段**: controlnet_image + controlnet_image_2
- [x] **3段**: 全画像パラメータ指定

### ADetailer動的制御
- [x] **1段**: デフォルト（face検出のみ）
- [x] **2段**: adetailer_model_2指定
- [x] **3段**: adetailer_model_2 + adetailer_model_3指定
- [x] **4段**: 全モデルパラメータ指定

### パラメータ上書き
- [x] **モデル指定**: controlnet_model_1/2/3
- [x] **重み調整**: controlnet_weight_1/2/3
- [x] **プリプロセッサ**: controlnet_module_1/2/3
- [x] **ADetailerモデル**: adetailer_model_2/3/4

## 📊 効果測定

### プリセット数削減効果
- **従来**: 100+ 専用プリセット（組み合わせ爆発）
- **新方式**: 1 汎用プリセット（無限バリエーション）

### ユーザビリティ向上
- **学習コスト**: 複数プリセット覚える → 1つのパラメータ体系
- **カスタマイズ**: 固定設定 → 自由調整
- **保守性**: 大量ファイル → 単一ファイル

## 🚀 今後の展開

### 適用可能な領域
1. **Regional Prompter**: 領域分割の動的制御
2. **Dynamic Prompts**: プロンプト生成の柔軟設定
3. **Hires Fix**: 高解像度処理の段階制御
4. **Sampling**: サンプラー設定の詳細調整

### 次世代プリセット設計
この成功により、**全プリセットの動的化**が視野に入りました：
- 1つのメガプリセットで全機能を包含
- ユーザーは必要な機能のみパラメータ指定
- 極限までシンプルな運用

## 💡 パラダイム革命の意義

**これはプリセット設計における根本的な発想転換です。**

従来の「機能ごとに専用プリセット作成」から「1つの汎用プリセットで全機能対応」への完全な移行を実現しました。この手法は他のAI生成システムにも応用可能な普遍的なアプローチです。