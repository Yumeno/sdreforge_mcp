# Issue #015: Regional Prompter統合 - Matrix & Mask Mode実装

## 📋 概要

26番プリセットにRegional Prompter機能を統合し、画像の領域別プロンプト制御を可能にする。Matrix ModeとMask Modeの両方に対応し、完全体26番プリセットを実現する。

## 🎯 実装目標

### Matrix Mode（基本機能）
- [x] 研究完了：ADDBASE/ADDCOL構文の理解
- [ ] 2分割（Columns/Rows）動的制御
- [ ] 3分割以上（グリッド）対応
- [ ] 分割比率の柔軟設定
- [ ] 計算モード（Attention/Latent）選択

### Mask Mode（挑戦機能）
- [x] マスク画像による任意領域分割 ✅ 2025年9月19日実装
- [x] 複数マスクファイル対応 ✅ 2025年9月19日実装
- [x] マスク＋プロンプトの組み合わせ ✅ 2025年9月19日実装
- [x] 自由形状領域の精密制御 ✅ 2025年9月19日実装

### 動的パラメータ化
- [ ] デフォルト無効（オプション機能）
- [ ] モード選択（Matrix/Mask）
- [ ] 全設定のパラメータ上書き
- [ ] 16引数API構造完全対応

## 🔧 Regional Prompter技術仕様

### API構造（16引数）
```typescript
args = [
  active,           // 1: Bool - Regional Prompter有効
  debug,            // 2: Bool - デバッグ情報表示
  mode,             // 3: "Matrix"/"Mask"/"Prompt"
  matrix_submode,   // 4: "Columns"/"Rows"/"Cols;Rows"
  mask_submode,     // 5: "Mask"
  prompt_submode,   // 6: "Prompt"
  divide_ratio,     // 7: "1,1" or "1,2,1" (分割比率)
  base_ratio,       // 8: "0.2" (ベース影響度)
  use_base,         // 9: Bool - ベース使用
  use_common,       // 10: Bool - 共通部分使用
  use_ncommon,      // 11: Bool - 非共通部分使用
  calc_mode,        // 12: "Attention"/"Latent"
  not_change_and,   // 13: Bool
  lora_stop_step,   // 14: string
  lora_hires_stop_step, // 15: string
  threshold,        // 16: string
  mask_path         // 17: string (Mask mode用)
]
```

### プロンプト構文

#### Matrix Mode - ADDBASE構文（実証済み）
```
2 girls ADDBASE red hair, blue eyes ADDCOL green hair, red eyes
→ 左側: 赤髪青目、右側: 緑髪赤目
```

#### Matrix Mode - BREAK構文
```
landscape BREAK sky, clouds BREAK mountains BREAK lake
→ 上: 空雲、中: 山、下: 湖
```

#### Mask Mode（新規挑戦）
```
prompt="fantasy character"
rp_active=true
rp_mode="Mask"
rp_mask_1="face_area.png"    # 顔領域マスク
rp_mask_2="body_area.png"    # 体領域マスク
rp_prompt_1="beautiful detailed face"
rp_prompt_2="armor and sword"
```

## 🎨 使用例設計

### 簡単な2キャラクター（Matrix Mode）
```typescript
prompt="2 girls ADDBASE red hair, blue eyes ADDCOL green hair, red eyes"
rp_active=true
rp_mode="Matrix"
rp_matrix_submode="Columns"
rp_divide_ratio="1,1"
rp_calc_mode="Latent"
```

### 3分割風景（Matrix Mode）
```typescript
prompt="beautiful landscape BREAK sunset sky BREAK mountain forest BREAK clear lake"
rp_active=true
rp_mode="Matrix"
rp_matrix_submode="Rows"
rp_divide_ratio="1,2,1"
rp_calc_mode="Attention"
```

### 自由形状制御（Mask Mode）
```typescript
prompt="fantasy warrior"
rp_active=true
rp_mode="Mask"
rp_mask_1="character_face.png"
rp_mask_2="armor_body.png"
rp_prompt_1="beautiful detailed face, blue eyes"
rp_prompt_2="golden armor, intricate details"
```

## 🧪 実装計画

### Phase 1: Matrix Mode実装
1. **26番プリセット拡張**
   - Regional Prompter設定をYAMLに追加
   - デフォルト無効設定

2. **パラメータ定義**
   - tool-generator.tsで全パラメータ追加
   - mode, submode, ratios, calc_mode等

3. **動的処理実装**
   - mcp-server.tsでパラメータ上書き処理
   - 16引数構造の正確な実装

### Phase 2: Mask Mode実装
1. **マスクファイル処理**
   - 複数マスク画像のBase64変換
   - ファイルパスからマスク配列への変換

2. **プロンプト配列化**
   - 領域別プロンプトの動的構成
   - マスク数に応じた自動調整

3. **統合テスト**
   - Matrix Mode動作確認
   - Mask Mode動作確認
   - 他機能との組み合わせテスト

## 🔧 技術課題

### Matrix Mode
- **プロンプト構文**: ADDBASE/BREAK構文の正確な処理
- **分割比率**: "1,1", "1,2,1" 等の柔軟対応
- **計算モード**: Attention（柔らか境界）/Latent（硬い境界）

### Mask Mode
- **マスク画像管理**: 複数ファイルの処理とBase64変換
- **領域-プロンプト対応**: マスクとプロンプトの正確な紐付け
- **ファイル存在確認**: マスクファイルのエラーハンドリング

## 📊 期待効果

### クリエイティブ機能拡張
- **複数キャラクター**: 1画像で複数キャラの詳細制御
- **複合シーン**: 風景＋人物の統合制御
- **部分編集**: マスクによる精密制御

### ワークフロー革命
- **従来**: 複数画像生成→合成編集
- **新方式**: 1回生成で複合制御完了

## 🚀 完成時の26番プリセット

**6つの完全動的制御システム:**
1. ControlNet（構造制御）
2. ADetailer（品質向上）
3. Hires Fix（解像度向上）
4. Batch Generation（大量生成）
5. Dynamic Prompts（創造性拡張）
6. **Regional Prompter（領域制御）** ← 最終機能

**究極目標**: 1つのプリセットでAI画像生成の全可能性を解放

## 🔄 開発スケジュール

### 優先順位
1. **Matrix Mode**: 実証済み技術の確実な実装
2. **Mask Mode**: 新規挑戦機能、実験的実装

### 成功基準
- [x] 既存機能維持（ControlNet, ADetailer等）
- [x] 2キャラクター生成成功（Matrix Mode） ✅ 動作確認済み
- [x] マスク制御成功（Mask Mode） ✅ 2025年9月19日実装完了
- [x] 全機能組み合わせ動作確認 ✅ CN + ADetailer + RP動作確認済み

**Revolutionary Achievement**: AIアーティストの創作プロセスを完全に変革する統合ツールの実現

## ✅ Mask Mode実装完了（2025年9月19日）

### 実装内容
- Regional Prompterの`deterministic_colours`アルゴリズムを完全再現
- 複数の白黒マスクを単一のカラーコード化マスクに合成
- Jimp v1.6.0を使用した画像処理
- Base64エンコードでのpolymaskパラメータ送信
- API経由でのMask Mode完全動作確認

### 既知の問題
**GitHub Issue #408**: 一部バージョンで動作不良
- 影響: プロンプトで指定した領域分割が正しく反映されない
- 対処: 以前の安定バージョンへのロールバック推奨
- 確認日: 2025年9月19日

## 🚨 現在の具体的問題（2025-09-16）【Matrix Mode関連、未解決】

### 発生している事実
**テスト条件:**
```
プロンプト: "red girl ADDCOL blue girl"
パラメータ: rp_use_common=false, rp_use_base=false
期待結果: 両方のチャンクにsuffix適用
```

**実際の結果:**
```
出力: "red girl, masterpiece, high score, great score, absurdres ADDCOL blue girl"
```

**デバッグログの事実:**
```
shouldWrapAllChunks: false, chunks: 2
Common: 1, Base: 1, Regions: 0
Chunk[0]: "red girl"
Chunk[1]: "blue girl"
```

### 問題の核心
1. **shouldWrapAllChunks判定が間違っている**: false（実際） vs true（期待）
2. **Common/Base count計算が間違っている**: Common:1, Base:1（実際） vs Common:0, Base:0（期待）
3. **ユーザー指定値が反映されていない**: rp_use_common=false, rp_use_base=false が無視されている

### 技術的分析
**条件判定ロジック:**
```typescript
const hasUseCommon = rpConfig?.use_common || userPrompt.includes('ADDCOMM');
const hasUseBase = rpConfig?.use_base || userPrompt.includes('ADDBASE');
const shouldWrapAllChunks = !hasUseCommon && !hasUseBase;
```

**問題箇所:**
- rpConfigの実際の値が期待値と異なる
- パラメータ集約処理に問題がある可能性

### 実現したいこと
```
入力: "red girl ADDCOL blue girl"
設定: rp_use_common=false, rp_use_base=false
期待: "red girl, masterpiece... ADDCOL blue girl, masterpiece..."
```

仕様通り、common/base未使用時は全チャンクにprefix/suffix適用が必要。