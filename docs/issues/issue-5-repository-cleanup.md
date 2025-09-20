# Issue #5: リポジトリ全体構造の整理とテンポラリファイル削除

## 📋 概要
開発過程で作成された一時的なテストファイル、作業用コード、デバッグ用スクリプトを特定し、本番環境に不要なファイルを整理削除する。

## 🎯 目的
- リポジトリのクリーン化
- 公開準備の完了
- ビルドサイズの最適化
- 新規開発者の混乱防止

## 📊 現状分析

### ルートレベルの散在テストファイル
```bash
# 開発中に作成された単発テストファイル
test-mcp-tools.js          # MCPツール動作確認用
test-model-switch.js       # モデル切替テスト
test-models.js             # モデル一覧取得テスト
test-png-info.js           # PNG情報抽出テスト
test-presets.js            # プリセット読み込みテスト（重複）
test-txt2img.js            # txt2img動作テスト
test_controlnet_models.js  # ControlNetモデル確認
test_generation.py         # Python版生成テスト
test_tools.js              # ツール一覧確認
```

### 正規のテストファイル（保持）
```bash
tests/
├── unit/
│   ├── api/client.test.ts       # APIクライアント単体テスト
│   ├── presets/manager.test.ts  # プリセットマネージャーテスト
│   └── server/mcp-server.test.ts # MCPサーバーテスト
├── integration/
│   ├── api-connection.test.ts   # API接続テスト
│   ├── full-template-test.ts    # テンプレート検証
│   ├── preset-test.ts           # プリセット統合テスト
│   ├── save-test-image.ts       # 画像保存テスト
│   └── test-all-presets.test.ts # 全プリセットテスト
└── helpers/
    └── test-utils.ts             # テストユーティリティ
```

### その他の確認対象
```bash
# 開発ログ・一時ファイル
*.log
*.tmp
.DS_Store
Thumbs.db

# ビルド成果物
dist/
build/
*.tsbuildinfo

# 設定ファイルの重複
.env.local
.env.development
.env.test
```

## 🔍 影響範囲調査

### package.jsonスクリプト確認
```json
{
  "scripts": {
    // どのテストファイルが実際に使用されているか確認
    "test": "jest",
    "test:unit": "jest tests/unit",
    "test:integration": "jest tests/integration",
    // カスタムスクリプトの存在確認
  }
}
```

### 依存関係の確認
- 削除対象ファイルを参照しているコードがないか
- CI/CDパイプラインでの使用有無
- READMEやドキュメントでの言及

## 🔄 実施計画

### Phase 1: 調査
1. 各テストファイルの最終更新日時確認
2. gitログで使用履歴確認
3. 依存関係グラフの作成

### Phase 2: 分類
```typescript
interface FileClassification {
  delete: string[];        // 安全に削除可能
  archive: string[];       // アーカイブ推奨
  keep: string[];         // 保持必須
  uncertain: string[];    // 要確認
}
```

### Phase 3: 実装
1. 削除対象ファイルのバックアップ作成
2. 段階的削除（コミット単位を小さく）
3. ビルド・テストの実行
4. .gitignore更新

## 📝 削除判定基準

### 削除可能
- ✅ 正規のテストスイートでカバーされている機能
- ✅ 3ヶ月以上更新されていない
- ✅ どこからも参照されていない
- ✅ ドキュメントに記載がない

### 保持必須
- ❌ package.jsonスクリプトから参照
- ❌ CI/CDで使用
- ❌ READMEで言及
- ❌ 他のファイルからインポート

## ✅ 受け入れ基準
- [ ] すべてのテストファイルが適切に分類されている
- [ ] npm test が正常に動作する
- [ ] npm run build が正常に完了する
- [ ] リポジトリサイズが削減されている
- [ ] 新規クローン後のセットアップが問題ない

## 🚨 リスクと対策
- **リスク**: 必要なファイルの誤削除
- **対策**:
  - 削除前にブランチ作成
  - 段階的削除とテスト
  - 削除リストのレビュー

## 📊 期待される成果
- リポジトリサイズ: 約20-30%削減
- ファイル数: 10-15ファイル削減
- 開発者体験: 構造の明確化

## 📅 タイムライン
- 調査・分類: 45分
- 実装: 30分
- テスト: 30分
- ドキュメント更新: 15分

## 🔗 関連
- Issue #6: 未使用コードの削除（次フェーズ）
- .gitignoreの最適化
- CI/CD設定の確認