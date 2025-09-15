# Issue #013: バッチ生成機能の実装

## 📋 概要

26番プリセットにバッチ生成機能を実装し、複数画像の並列生成とバリエーション作成を可能にする。

## 🎯 実装目標

### 基本機能
- [x] バッチサイズ制御（batch_size: 1-8）
- [x] バッチ反復制御（n_iter: 1-100）
- [x] 自動ファイル命名（サフィックス付き）
- [x] パラメータ上書き対応

### 高度機能
- [x] 自動Seedインクリメント発見
- [x] タイムアウト制約の理解
- [x] 軽量設定での高速生成

## 🔧 技術実装

### パラメータ定義
```typescript
// tool-generator.ts でのバッチパラメータ
schema.batch_size = {
  type: 'number',
  description: 'Number of images to generate in parallel (1-8)',
  default: 1,
  minimum: 1,
  maximum: 8
};
schema.n_iter = {
  type: 'number',
  description: 'Number of batch iterations (batch count) (1-100)',
  default: 1,
  minimum: 1,
  maximum: 100
};
```

### パラメータ上書き処理
```typescript
// mcp-server.ts での動的設定
if (params.batch_size !== undefined) {
  payload.batch_size = params.batch_size;
}
if (params.n_iter !== undefined) {
  payload.n_iter = params.n_iter;
}
```

### ファイル保存システム
```typescript
// 自動ファイル命名
filename = `${presetName}-${timestamp}${i > 0 ? `-${i}` : ''}.png`
// 結果: image.png, image-1.png, image-2.png, image-3.png
```

## 🧪 テスト結果

### 成功テスト
**設定**: 2並列×2反復（計4枚）、軽量設定
```
prompt="1 girl, portrait, anime style, simple background"
batch_size=2
n_iter=2
width=512, height=512
steps=10, cfg_scale=3
sampler_name="Euler a"
```

**結果**: 4枚生成成功、2分以内完了

### Seed自動管理の発見
**重要な発見**: SD WebUIは固定seedでも自動的にインクリメント
- **1枚目**: Seed: 12345（指定値）
- **2枚目**: Seed: 12346（+1）
- **3枚目**: Seed: 12347（+2）
- **4枚目**: Seed: 12348（+3）

**メリット**:
- 固定seed指定でも自動バリエーション生成
- 1枚目は再現性確保、2枚目以降は類似変化
- ユーザーは「同じ画像4枚」を心配する必要なし

### 制約の確認
**MCPタイムアウト制約**: 2分（120秒）
- **軽量設定**: 4枚生成可能
- **標準設定**: 2-3枚が限界
- **高品質設定**: 1枚のみ安全

## 📊 パフォーマンス分析

### 生成時間要因
1. **解像度**: 512×512 vs 1024×1024
2. **ステップ数**: 10 vs 28
3. **CFGスケール**: 3 vs 7
4. **ADetailer**: 無効 vs 多段
5. **Hires Fix**: 無効 vs 有効

### 推奨設定パターン
```yaml
# 高速バッチ（4-6枚）
size: 512x512
steps: 10-15
cfg_scale: 3-5
adetailer: face only
hires_fix: disabled

# 標準バッチ（2-3枚）
size: 1024x1024
steps: 20-28
cfg_scale: 5-7
adetailer: 1-2 models
hires_fix: optional

# 高品質シングル（1枚）
size: 1024x1024
steps: 28+
cfg_scale: 7+
adetailer: full
hires_fix: enabled
```

## 💡 使用例

### バリエーション生成
```typescript
// 同キャラクターの表情バリエーション
prompt="1girl, various expressions, portrait"
seed=12345  // 基準seed
batch_size=4
n_iter=1
// → 12345, 12346, 12347, 12348 の4バリエーション
```

### A/Bテスト
```typescript
// 設定違いでの比較生成
prompt="anime girl portrait"
batch_size=2
n_iter=2
// → 同条件で4枚、微細な差を比較
```

## 🔄 制約と今後の課題

### 現在の制約
- **MCPタイムアウト**: 2分制限
- **実用範囲**: 軽量設定で4枚、標準設定で2-3枚
- **大量生成**: 非同期処理実装が必要（Issue #012）

### 将来の拡張
- [ ] 非同期ジョブベース処理（Issue #012）
- [ ] バッチ設定プリセット（高速/標準/高品質）
- [ ] 進行状況表示（現在は不可視）

## 🎨 今後の展開

バッチ生成機能により、26番プリセットは**個人クリエイターから商用利用**まで対応可能な本格ツールとなりました。

**完成した機能体系:**
- 構造制御（ControlNet）
- 品質向上（ADetailer）
- 解像度向上（Hires Fix）
- **大量生成（Batch Generation）**
- 基本制御（全パラメータ）

**次の目標**: Regional Prompter統合による完全体実現