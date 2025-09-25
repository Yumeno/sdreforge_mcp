# Changelog

## [0.1.2] - 2025-09-26

### Fixed
- **Issue #23**: ログファイル出力先をMCPサーバーディレクトリに統一
  - すべてのログファイルがユーザー作業ディレクトリ（process.cwd()）に出力される問題を修正
  - globalThis.mcpDir実装によりMCP_DIR環境変数を活用した統一パス管理
  - 対象ログファイル: mcp-debug.log, mcp-tool-execution.log, rp-debug.log, payload-debug.log
  - マスク画像ファイルもMCPサーバーディレクトリ/output/に統一
- **Issue #22/24**: プロンプトprefix/suffixが正しく適用されない問題を修正
  - prefixまたはsuffixの片方のみ指定時に正常動作しない不具合を修正
  - Regional Prompter処理での同様の問題も解決
  - undefined/empty値の適切なデフォルト値処理を実装

### Improved
- **MCP_DIR環境変数対応**: パス解決の信頼性向上
  - インテリジェントフォールバック機能追加
  - クロスプラットフォーム対応（Windows/Linux/Mac）
- **README.md大幅改善**:
  - 開発環境パス情報の漏洩対応（プレースホルダー化）
  - Windows/Mac/Linux別のMCP設定例を追加
  - MCP_DIR環境変数設定の重要性を明記
- **ドキュメント整備**: logging-and-debugging.mdをログファイル統一に合わせて更新

### Security
- 開発環境の実際のパス情報を適切なプレースホルダーに置換
- セキュリティ向上とプライバシー保護を実現

### Technical
- globalThis活用によるTypeScriptでの安全なクロスモジュール変数共有
- 循環依存回避とモジュール間データ共有の効率化
- 統一ログ管理による運用効率向上

## [0.1.1] - 2025-09-23

### Added
- **Issue #4**: テンプレートベースプリセット初期化システム実装 🚀
  - 完全な環境変数ベース設定管理システム
  - templates/ → presets/ 自動変換機能
  - インタラクティブセットアップ（npm run setup:presets:interactive）
  - 強制セットアップ（npm run setup:presets:force）
  - クロスプラットフォーム対応（Windows/Linux/macOS完全対応）
- **Issue #5**: 動的プリセットシステム完全実装
  - **2つの究極動的プリセット**で全機能をカバー：
    - `01_txt2img_dynamic.yaml`: 完全パラメータ対応テキスト→画像生成
    - `02_img2img_dynamic.yaml`: 完全パラメータ対応画像→画像変換・インペイント
  - max_models/max_units メタデータによる動的パラメータ生成
  - 自動有効化ロジック（ControlNet, ADetailer の後方互換性）
- **16個のユーティリティツール**追加:
  - PNG情報抽出、アップスケール、背景除去、タグ付け等
  - 各種モデル情報取得（サンプラー、アップスケーラー、ControlNet等）

### Fixed
- **Issue #14**: 生成YAMLプリセットのコメント記述例の実態不一致を修正
- **Issue #6**: ControlNet情報がPNG Infoに記録されない問題を修正
- **Issue #10**: 初期導入テスト中の異常を解決
- **Issue #11**: ESLint設定改善とコード品質向上
- **Issue #20**: .env.sampleの初期パラメータ変更
  - REMBG_DEFAULT_MODEL を isnet-anime に変更（汎用性向上）
  - template-processor.ts のデフォルト値同期
- **TypeScript lint エラー修正**:
  - 未使用変数 imageData と existingPostprocessing を解決
  - クリーンビルド成功（エラー0件）

### Removed
- **Issue #9**: 開発アーティファクトとテストデータのクリーンアップ
- **npm run setup:presets:sample コマンド廃止**
  - 混乱を招くコマンドを削除
  - .env.sample からの手動コピーを推奨方式に変更

### Improved
- **Issue #8**: ドキュメント大幅更新
  - 動的プリセットシステム完全仕様化
  - 包括的なインストールガイド作成
- **Issue #12**: README.mdの初期インストール手順改善
- **Issue #15**: Claude Code起動時CLIオプション対応解説追加
- **Issue #17**: READMEに機能説明を追加
- **包括的ログ・デバッグドキュメント**: docs/logging-and-debugging.md
  - 5種類のログファイルの詳細仕様
  - DEBUG環境変数とトラブルシューティングガイド
  - Windows PowerShell直接実行方法
- **環境変数管理の最適化**:
  - MCP config の env セクション問題を解決
  - .envファイルベースの設定に統一
  - SD_WEBUI_URL設定の信頼性向上

### Technical Achievements
- **完全テンプレートシステム**: 22→2プリセットの劇的簡素化
- **TDD開発**: 単体テスト27個、統合テスト実施
- **実績**: 152モデル、74サンプラーでの動作確認
- **プロダクション準備**: 開発アーティファクト完全除去

## [0.1.1] - 2025-09-20

### Fixed
- **Issue #3**: img2img/inpaint mode file path to base64 conversion issue
  - Removed duplicate img2img processing code in switch statement
  - Enhanced file path detection logic with robust base64 vs file path checking
  - Added comprehensive debug logging for conversion process
  - Improved error handling for file reading operations
  - Both `init_image` and `mask_image` now properly convert local file paths to base64 encoded data

### Improved
- Better debug logging for img2img/inpaint operations
- More accurate file path vs base64 detection algorithm
- Enhanced error messages for troubleshooting

## [0.1.0] - 2025-09-19

### Added
- **Preset 27**: img2img_cn_multi_3units - Ultimate dynamic IMG2IMG preset
  - Full inpaint mode support with mask processing
  - Dynamic upscaler selection
  - Complete parameterization for all features

### Features
- Regional Prompter Mask Mode implementation
- Dynamic preset loading (no hardcoding required)
- Comprehensive inpaint parameters support

## [0.0.9] - 2025-09-17

### Added
- **Preset 26**: txt2img_cn_multi_3units - Ultimate dynamic preset
  - ControlNet support (0-3 units)
  - ADetailer support (1-4 models)
  - Regional Prompter (Matrix/Mask modes)
  - Dynamic Prompts integration
  - Hires Fix configuration
  - Batch generation support

## [0.0.8] - 2025-09-15

### Fixed
- YAML parsing errors in 12 preset files
- Model name issues with SD WebUI Reforge API
- MCP tool loading (now all 22 tools load successfully)

### Changed
- Model names standardized to `sd_` prefix format
- Improved preset validation logic

## [0.0.7] - 2025-09-14

### Added
- Initial MCP server implementation
- 22 default presets for various use cases
- API client with automatic null value cleaning
- Preset manager with YAML support
- Tool generator for dynamic MCP tool creation

### Features
- txt2img/img2img support
- ControlNet integration
- ADetailer integration
- Regional Prompter support (with version caveats)
- PNG info extraction
- Utility tools (upscale, background removal, tagging)