# Issue #6: 未使用コード・モジュールの洗い出しと削除

## 📋 概要
コードベース全体を精査し、未使用の関数、インポート、型定義、依存関係を特定して削除する。デッドコードの除去によりメンテナンス性とパフォーマンスを向上させる。

## 🎯 目的
- コードベースの健全性向上
- バンドルサイズの削減
- 型チェックの高速化
- 依存関係の最小化
- 技術的負債の解消

## 📊 現状分析

### 調査対象ファイル
```typescript
// src/api/
- client.ts       // APIクライアント実装
- types.ts        // 318行の型定義ファイル

// src/presets/
- manager.ts      // プリセットマネージャー
- types.ts        // プリセット型定義

// src/server/
- mcp-server.ts   // 55KB - MCPサーバー実装
- tool-generator.ts // ツール生成ロジック
- types.ts        // サーバー型定義
- index.ts        // エントリーポイント
```

### 未使用の可能性がある要素

#### 1. 型定義（src/api/types.ts）
```typescript
// 使用頻度が低い可能性のある型
- ExtrasSingleImageRequest
- ExtrasBatchImagesRequest
- InterrogateRequest
- MemoryResponse
- EmbeddingsResponse
- UnloadCheckpointsRequest
```

#### 2. APIメソッド（src/api/client.ts）
```typescript
// 実装済みだが未使用の可能性
- getEmbeddings()
- getMemory()
- unloadCheckpoints()
- interrupt()
- skip()
```

#### 3. npm依存関係
```json
// package.json - 要確認
- jimp（画像処理 - base64変換で使用？）
- dotenv（環境変数 - 必須）
- その他の開発依存関係
```

## 🔍 検出手法

### 静的解析ツール
```bash
# TypeScript未使用エクスポート検出
npx ts-prune

# 未使用依存関係検出
npx depcheck

# ESLint未使用変数検出
npx eslint --ext .ts,.js src/
```

### 手動調査
```typescript
// インポートグラフの作成
interface ImportGraph {
  file: string;
  imports: string[];
  exports: string[];
  usage: {
    internal: number;  // プロジェクト内参照数
    external: number;  // 外部からの参照数
  };
}
```

## 🔄 実施計画

### Phase 1: 検出
1. 静的解析ツールの実行
2. インポート/エクスポートマップ作成
3. 使用状況レポート生成

### Phase 2: 分類
```typescript
interface CodeClassification {
  // 安全に削除可能
  safeToDelete: {
    functions: string[];
    types: string[];
    constants: string[];
  };

  // 要確認（外部APIやプラグインで使用？）
  needsVerification: {
    functions: string[];
    reason: string[];
  };

  // 将来使用予定
  keepForFuture: {
    functions: string[];
    plannedUsage: string[];
  };
}
```

### Phase 3: 段階的削除
1. **未使用インポート削除**
   ```typescript
   // Before
   import { unused1, unused2, used } from './types';

   // After
   import { used } from './types';
   ```

2. **未使用関数削除**
   ```typescript
   // 削除対象の明確化
   // @deprecated - Will be removed in v0.2.0
   function unusedFunction() { }
   ```

3. **未使用型削除**
   ```typescript
   // 使用箇所がない型定義を削除
   ```

## 📝 削除判定基準

### 削除可能 ✅
- プロジェクト内で参照がない
- テストでも使用されていない
- ドキュメントで言及されていない
- 公開APIではない

### 保持必須 ❌
- MCPツールで使用される
- 公開APIの一部
- 型安全性のために必要
- 将来の拡張で使用予定

### グレーゾーン ⚠️
- SD WebUI API仕様の一部
- まだ実装されていない機能用
- プラグイン互換性のため

## 🏗️ リファクタリング提案

### API Client整理
```typescript
// Before: 巨大な単一クラス
class SDWebUIClient {
  // 30+ methods
}

// After: 機能別分割
class SDWebUIClient {
  readonly txt2img: Txt2ImgAPI;
  readonly img2img: Img2ImgAPI;
  readonly extras: ExtrasAPI;
  readonly utility: UtilityAPI;
}
```

### 型定義の整理
```typescript
// Before: 1ファイルに全型定義
// types.ts (318行)

// After: 機能別ファイル分割
// types/
//   ├── common.ts
//   ├── txt2img.ts
//   ├── img2img.ts
//   ├── extensions.ts
//   └── index.ts
```

## ✅ 受け入れ基準
- [ ] ts-pruneで警告が0になる
- [ ] depcheckで未使用依存関係が0
- [ ] バンドルサイズが10%以上削減
- [ ] 型チェック時間が改善
- [ ] すべてのテストがパス

## 🚨 リスクと対策
- **リスク**: ランタイムでのみ使用されるコードの削除
- **対策**:
  - 動的インポートの確認
  - evalやrequireの使用箇所確認
  - 統合テストの充実

## 📊 期待される成果
- コード行数: 15-20%削減
- バンドルサイズ: 10-15%削減
- 型チェック速度: 20-30%向上
- npm install時間: 短縮

## 🔧 ツール設定

### tsconfig.json
```json
{
  "compilerOptions": {
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "allowUnusedLabels": false
  }
}
```

### .eslintrc
```json
{
  "rules": {
    "no-unused-vars": "error",
    "no-unused-expressions": "error",
    "@typescript-eslint/no-unused-vars": "error"
  }
}
```

## 📅 タイムライン
- 検出・分析: 1時間
- 実装: 1.5時間
- テスト: 30分
- ドキュメント: 30分

## 🔗 関連
- Issue #5: リポジトリクリーンアップ
- TypeScript設定の最適化
- CI/CDパイプラインの高速化