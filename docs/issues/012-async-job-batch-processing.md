# Issue #012: 非同期ジョブベース処理によるバッチ生成タイムアウト回避

## 📋 概要

MCPクライアントの2分タイムアウト制限を回避し、大量バッチ生成を可能にするため、非同期ジョブベース処理システムを実装する。

## 🚩 現在の問題

### MCPタイムアウト制約
- **制限時間**: 2分（120秒）
- **影響**: batch_size×n_iter > 4枚でタイムアウト
- **結果**: 生成途中で通信切断、結果取得不可

### 発生事例
```
# タイムアウト発生
batch_size=2, n_iter=2 (計4枚)
→ Request timeout after 120000ms
→ サーバー側では生成継続中だが結果取得不可
```

## 🎯 要件定義

### 機能要件
1. **大量バッチ生成**: 10枚以上の画像を生成可能
2. **タイムアウト回避**: MCPクライアント制限を完全回避
3. **進行状況確認**: リアルタイムでの生成進捗表示
4. **結果取得**: 完了後の確実なファイル取得

### 非機能要件
1. **ユーザビリティ**: 直感的な3ステップ操作
2. **信頼性**: ジョブ管理とエラーハンドリング
3. **スケーラビリティ**: 複数ジョブの並行実行
4. **永続性**: サーバー再起動後もジョブ情報保持

## 🏗️ 基本設計

### アーキテクチャ概要
```
従来方式（同期処理）:
Claude → MCPサーバー → SD WebUI API → 完了まで待機 → レスポンス
                                    ↑
                                 2分でタイムアウト

新方式（非同期処理）:
1. 開始: Claude → MCPサーバー → 即座にジョブID返却
2. 処理: バックグラウンドでSD WebUI API呼び出し
3. 確認: 別ツールでジョブステータス確認
4. 取得: 完了後に結果ファイル取得
```

### データ構造設計
```typescript
interface JobInfo {
  id: string;                          // ユニークID
  status: 'pending' | 'running' | 'completed' | 'failed';
  startTime: Date;                     // 開始時刻
  endTime?: Date;                      // 完了時刻
  params: any;                         // 生成パラメータ
  progress?: {                         // 進行状況
    current: number;
    total: number;
    message: string;
  };
  resultFiles?: string[];              // 生成ファイルパス
  error?: string;                      // エラーメッセージ
}

class JobManager {
  private jobs: Map<string, JobInfo>;  // メモリ上ジョブ管理
  private jobsDir: string;             // ディスク永続化
}
```

### 新MCPツール設計
```yaml
# 1. バッチ生成開始
name: sdreforge_batch_start
parameters:
  prompt: string
  batch_size: number (1-8)
  n_iter: number (1-100)
  # 全26番プリセットパラメータ対応
response:
  job_id: "job_20250915_001"
  message: "Batch generation started"
  estimated_time: "5-10 minutes"

# 2. ジョブステータス確認
name: sdreforge_batch_status
parameters:
  job_id: string
response:
  status: "running" | "completed" | "failed"
  progress: "3/8 images completed"
  elapsed_time: "2m 15s"
  estimated_remaining: "3m 45s"

# 3. 結果取得
name: sdreforge_batch_result
parameters:
  job_id: string
response:
  status: "completed"
  total_images: 8
  files: ["path1.png", "path2.png", ...]
```

## 🔧 実装計画

### Phase 1: ジョブ管理システム
1. **JobManagerクラス**: ジョブ作成・管理・永続化
2. **BackgroundProcessorクラス**: 非同期API呼び出し
3. **ファイル保存システム**: jobs/job_id/ ディレクトリ構造

### Phase 2: MCPツール実装
1. **batch_start**: ジョブ投入とID生成
2. **batch_status**: 進行状況確認API
3. **batch_result**: 完了後データ取得

### Phase 3: エラーハンドリング
1. **タイムアウト処理**: SD WebUI API呼び出し時
2. **ジョブクリーンアップ**: 古いジョブの自動削除
3. **リソース管理**: メモリ・ディスク使用量制限

## 🧪 使用フロー例

### ユーザー操作
```typescript
// 1. バッチ生成開始
sdreforge_batch_start({
  prompt: "anime girl variations",
  batch_size: 4,
  n_iter: 3,
  adetailer_model_2: "hand_yolov8n.pt"
})
// → job_id: "job_001"

// 2. 進行確認（必要に応じて繰り返し）
sdreforge_batch_status({ job_id: "job_001" })
// → "5/12 images completed"

// 3. 結果取得
sdreforge_batch_result({ job_id: "job_001" })
// → 12個のファイルパス
```

## 📊 期待効果

### 解決される問題
- ✅ **タイムアウト制限**: 完全回避
- ✅ **大量生成**: 50枚以上も理論上可能
- ✅ **進行可視化**: リアルタイム確認
- ✅ **結果保証**: 確実なファイル取得

### 追加メリット
- **並行作業**: 生成中に他作業が可能
- **バッチ管理**: 複数ジョブの同時実行
- **エラー耐性**: 個別画像失敗時の部分取得

## ⏱️ 開発工数見積もり

### 実装規模
- **新ファイル**: 3-4個（JobManager, BackgroundProcessor等）
- **既存修正**: mcp-server.ts、tool-generator.ts
- **新MCPツール**: 3個（start, status, result）
- **テスト**: 各段階での動作確認

### 開発時間
- **設計・実装**: 4-6時間
- **デバッグ・テスト**: 2-3時間
- **ドキュメント**: 1時間
- **合計**: 7-10時間

## 💭 代替案

### 簡易版（タイムアウト延長のみ）
- APIクライアントタイムアウト: 120秒→300秒
- 対応範囲: 中規模バッチ（4-6枚）
- 実装工数: 30分

### 判断基準
- **即効性重視**: 簡易版
- **完全解決**: 非同期版

## 🔄 今後の検討

この機能は**大規模画像生成ワークフロー**の基盤となり得ます：
- バリエーション生成
- A/Bテスト用画像作成
- データセット構築
- 商用利用での大量処理

**実装タイミング**: 現在の26番プリセット完成度を考慮して決定。