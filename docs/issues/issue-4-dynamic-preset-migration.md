# Issue #4: 動的プリセットへの移行とレガシープリセット廃止

## 📋 概要
動的プリセット（preset 26, 27）をメインシステムとして採用し、レガシーな基本プリセットを段階的に廃止する。

## 🎯 目的
- コードベースの簡素化
- メンテナンス性の向上
- ユーザー体験の統一化
- 動的プリセットの優位性を活かした機能拡張

## 📊 現状分析

### 動的プリセット（保持）
- **26_txt2img_cn_multi_3units.yaml**: 究極のtxt2img動的プリセット
  - ControlNet (0-3 units)
  - ADetailer (1-4 models)
  - Regional Prompter
  - Dynamic Prompts
  - Hires Fix
  - 完全なパラメータ制御

- **27_img2img_cn_multi_3units.yaml**: 究極のimg2img動的プリセット
  - img2img/inpaint完全対応
  - ControlNet (0-3 units)
  - ADetailer (1-4 models)
  - 動的アップスケーラー選択

### レガシープリセット（廃止候補）
```
01_txt2img_animagine_base.yaml     # → 26で代替可能
02_txt2img_animagine_cn3.yaml      # → 26で代替可能
03_txt2img_animagine_cn4.yaml      # → 26で代替可能
04_img2img_animagine_base.yaml     # → 27で代替可能
05_img2img_animagine_cn3.yaml      # → 27で代替可能
06_img2img_animagine_cn4.yaml      # → 27で代替可能
07_txt2img_cn3_rp_matrix.yaml      # → 26で代替可能
08_txt2img_cn3_rp_mask.yaml        # → 26で代替可能
09_txt2img_cn4_rp_matrix.yaml      # → 26で代替可能
10_txt2img_cn4_rp_mask.yaml        # → 26で代替可能
11_img2img_cn3_rp_matrix.yaml      # → 27で代替可能
12_img2img_cn3_rp_mask.yaml        # → 27で代替可能
13_img2img_cn4_rp_matrix.yaml      # → 27で代替可能
14_img2img_cn4_rp_mask.yaml        # → 27で代替可能
```

### ユーティリティプリセット（保持）
```
15_utility_png_info.yaml            # PNG情報抽出
16_extras_upscale_ultrasharp.yaml   # アップスケール
17_extras_upscale_fatal_anime.yaml  # アニメ特化アップスケール
18_extras_rembg_u2net.yaml          # 背景削除
19_extras_rembg_isnet_anime.yaml    # アニメ特化背景削除
20_tagger_wd_eva02.yaml             # 自動タグ付け
21_utility_check_model.yaml         # モデル確認
22_utility_switch_model.yaml        # モデル切替
23_txt2img_animagine_face_hand.yaml # ADetailer特化（検討）
24_txt2img_animagine_multi_detect.yaml # ADetailer特化（検討）
25_utility_controlnet_models.yaml   # ControlNetモデル一覧
```

## 🔄 移行計画

### Phase 1: 準備
1. 動的プリセットの完全性確認
2. レガシープリセットの使用頻度分析
3. 移行ガイドライン作成

### Phase 2: 実装
1. レガシープリセットを`deprecated/`フォルダに移動
2. MCPツール生成ロジックの更新
3. ドキュメントの更新

### Phase 3: テスト
1. 動的プリセットでの全機能カバレッジ確認
2. 既存ワークフローの動作確認
3. パフォーマンステスト

## 📝 技術的考慮事項

### MCPツール生成への影響
- tool-generator.tsの更新が必要
- ツール名のマッピング変更
- 後方互換性の考慮

### ユーザー移行パス
```typescript
// 移行マッピング例
const migrationMap = {
  'sdreforge_txt2img_animagine_base': 'sdreforge_txt2img_cn_multi_3units',
  'sdreforge_img2img_animagine_base': 'sdreforge_img2img_cn_multi_3units',
  // ...
}
```

## ✅ 受け入れ基準
- [ ] すべての機能が動的プリセットで実現可能
- [ ] MCPツールが正常に生成される
- [ ] 既存のテストがすべてパス
- [ ] ドキュメントが更新されている
- [ ] 移行ガイドが作成されている

## 🚨 リスクと対策
- **リスク**: 既存ユーザーのワークフロー破壊
- **対策**: 移行期間を設け、deprecation warningを表示

## 📅 タイムライン
- 分析・計画: 30分
- 実装: 1時間
- テスト: 30分
- ドキュメント: 30分

## 🔗 関連
- Issue #3: img2img/inpaint Base64変換修正（完了）
- preset 26, 27の実装