# Issue #014: Dynamic Prompts機能の統合

## 📋 概要

26番プリセットにDynamic Prompts機能を統合し、プロンプトの自動展開とバリエーション生成を可能にする。

## 🎯 実装目標

### 基本機能
- [x] Dynamic Prompts動的有効化（デフォルト有効）
- [x] Magic Prompt機能制御
- [x] Combinatorial Generation対応
- [x] Max Generations設定

### 高度機能
- [x] プロンプト展開パターンの制御
- [x] 18引数API構造完全対応
- [x] Fixed seed制御
- [x] 自動組み合わせ生成

## 🔧 Dynamic Prompts概要

### 機能説明
Dynamic Promptsは、プロンプト内の**ワイルドカード**や**選択肢**を自動展開してバリエーション豊富な画像を生成する機能。

### 基本構文
```
# 選択肢展開
{red|blue|green} hair
→ "red hair" または "blue hair" または "green hair"

# ワイルドカード
__emotion__ girl
→ ワイルドカードファイルから感情表現を自動選択

# 複数選択
{casual|formal} {dress|outfit}
→ "casual dress", "formal dress", "casual outfit", "formal outfit"
```

## 🔧 技術実装

### API構造調査
```typescript
// SD WebUI API での Dynamic Prompts 構造
"alwayson_scripts": {
  "dynamic prompts v2.17.1": {
    "args": [
      true,   // enable_dynamic_prompts
      false,  // combinatorial_generation
      0,      // max_generations (0 = unlimited)
      false   // magic_prompt
    ]
  }
}
```

### パラメータ設計
```typescript
// 26番プリセット用パラメータ
schema.enable_dynamic_prompts = {
  type: 'boolean',
  description: 'Enable Dynamic Prompts for automatic prompt expansion',
  default: true  // デフォルト有効
};
schema.magic_prompt = {
  type: 'boolean',
  description: 'Enable Magic Prompt for enhanced prompt generation',
  default: false
};
schema.combinatorial_generation = {
  type: 'boolean',
  description: 'Enable combinatorial generation for all prompt combinations',
  default: false
};
schema.max_generations = {
  type: 'number',
  description: 'Maximum number of prompt variations (0 = unlimited)',
  default: 0,
  minimum: 0,
  maximum: 100
};
```

## 🧪 使用例

### 基本的な選択肢展開
```typescript
prompt="{cute|beautiful|elegant} anime girl with {red|blue|black} hair"
enable_dynamic_prompts=true
batch_size=4
// → 各画像で異なる組み合わせの自動展開
```

### Magic Prompt使用
```typescript
prompt="anime girl"
enable_dynamic_prompts=true
magic_prompt=true
// → AIが自動的にプロンプトを拡張・詳細化
```

### Combinatorial Generation
```typescript
prompt="{red|blue} hair, {smile|serious} expression"
enable_dynamic_prompts=true
combinatorial_generation=true
max_generations=4
// → 全組み合わせ（2×2=4パターン）を生成
```

## 📊 期待効果

### クリエイティブ支援
- **アイデア拡張**: 1つのプロンプトから多様な展開
- **効率向上**: 手動バリエーション作成の自動化
- **発見機能**: 予期しない魅力的な組み合わせ

### ワークフロー向上
- **バッチ生成との相乗効果**: 複数画像で多様な展開
- **A/Bテスト支援**: 異なるプロンプト展開の比較
- **アセット制作**: ゲーム・アニメ用の大量バリエーション

## 🔄 今後の展開

Dynamic Prompts統合により、26番プリセットは**完全なクリエイティブ支援ツール**となります：

1. **構造制御**: ControlNet
2. **品質向上**: ADetailer
3. **解像度向上**: Hires Fix
4. **大量生成**: Batch Generation
5. **創造性拡張**: Dynamic Prompts
6. **領域制御**: Regional Prompter（次回実装）

**最終目標**: AIアーティストの創作プロセス全体をサポートする包括的ツールの実現

## ✅ 実装完了結果

### 修正された技術課題
1. **API引数構造エラー**: 4引数 → 18引数の正しい構造に修正
2. **Combinatorial Generationタイムアウト**: 引数構造修正により解決
3. **プロンプト消失問題**: 正しいAPI呼び出しで解決

### 動作確認済み機能
#### 基本展開（ランダム選択）
- **テスト**: `{girl|boy}` with different seeds
- **結果**: Seed依存の再現性確保（77777→girl, 99999→boy）

#### Combinatorial Generation（全組み合わせ）
- **テスト**: `{girl|boy}` with combinatorial_generation=true
- **結果**: 2枚生成成功（girl版: seed=77777, boy版: seed=77778）
- **処理時間**: 標準設定（1024×1024, steps=28）で2分以内完了

### 実証された仕様
- **18引数API**: 正式なDynamic Prompts v2.17.1準拠
- **自動seed管理**: Combinatorial時の自動seed調整
- **プロンプト展開**: 選択肢→実際のプロンプト変換
- **再現性**: 同じseedで同じ選択結果

## 🎨 完成した26番プリセット機能

**5つの動的制御システム完成:**
1. ControlNet（構造制御）
2. ADetailer（品質向上）
3. Hires Fix（解像度向上）
4. Batch Generation（大量生成）
5. **Dynamic Prompts（創造性拡張）** ← 完全実装完了

**革命的成果**: 1つのプリセットで画像生成の全機能を動的制御可能