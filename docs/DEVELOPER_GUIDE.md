# 開発者ガイド

## 📋 概要

SD WebUI Reforge MCP サーバーの開発者向けガイドです。新機能追加、プリセット作成、拡張機能開発の手順を詳しく説明します。

## 🏗️ 開発環境セットアップ

### 必要な環境

- **Node.js** 18+
- **TypeScript** 5.9+
- **SD WebUI Reforge** (API モード起動)
- **Claude Code** (MCP サポート)

### 初期セットアップ

```bash
# リポジトリクローン
git clone https://github.com/Yumeno/sdreforge_mcp.git
cd sdreforge_mcp

# 依存関係インストール
npm install

# 環境設定
cp .env.example .env.local
# .env.local を編集してSD WebUI URLを設定

# 初回ビルド
npm run build

# 開発モード起動（ホットリロード）
npm run dev
```

### Claude Code 設定

```json
{
  "mcpServers": {
    "sdreforge": {
      "command": "npx",
      "args": ["-y", "tsx", "/absolute/path/to/sdreforge_mcp/src/index.ts"],
      "env": {
        "SD_WEBUI_URL": "http://localhost:7860",
        "DEBUG": "true"
      }
    }
  }
}
```

## 🎯 新規プリセット作成

### 基本プリセット作成

#### 1. プリセットファイル作成

```bash
# 新しいプリセットファイル
touch presets/XX_new_preset.yaml
```

**命名規則**:
- 番号プレフィックス: `01-99`
- 機能別グループ化推奨
- アンダースコア区切り

#### 2. 基本構造定義

```yaml
name: new_preset                # MCPツール名: sdreforge_new_preset
type: txt2img                   # サポートタイプ一覧は後述
description: "新機能のプリセット"

base_settings:
  checkpoint: "sd_animagineXL40_v4Opt"
  sampler_name: "Euler a"
  steps: 28
  cfg_scale: 7
  width: 1024
  height: 1024

prompt_template:
  positive_suffix: "masterpiece, high quality"
  negative: "lowres, bad quality"
```

#### 3. 拡張機能追加

```yaml
extensions:
  # ADetailer を追加
  adetailer:
    enabled: true
    models:
      - model: "face_yolov8n.pt"
        confidence: 0.3

  # ControlNet を追加
  controlnet:
    enabled: true
    units:
      - module: "openpose_full"
        model: "CN-anytest3_animagine4_A"
        weight: 1.0
```

#### 4. 動作テスト

```bash
# ビルド
npm run build

# Claude Code 再起動後テスト
# "sdreforge_new_preset" が利用可能か確認
```

### 動的プリセット作成

動的プリセットは `max_models`, `max_units` メタデータを使用してMCPパラメータを自動生成します。

```yaml
name: dynamic_advanced
type: txt2img
description: "高機能動的プリセット"

extensions:
  adetailer:
    enabled: true
    max_models: 5               # adetailer_model_1-5 を生成
    models:
      - model: "face_yolov8n.pt"

  controlnet:
    enabled: true
    max_units: 5                # controlnet_* パラメータを5セット生成
    units:
      - module: "None"
        model: "CN-anytest3_animagine4_A"
        weight: 1.0

  regional_prompter:
    rp_active: false            # 必要時に有効化
    rp_mode: "Matrix"

  dynamic_prompts:
    enable_dynamic_prompts: true
```

**生成されるパラメータ例**:
- `adetailer_model_1`, `adetailer_model_2`, ..., `adetailer_model_5`
- `controlnet_image`, `controlnet_image_2`, ..., `controlnet_image_5`
- `controlnet_enable_1`, `controlnet_enable_2`, ..., `controlnet_enable_5`
- その他 ControlNet 関連パラメータ 5 セット

## 🎯 テンプレートシステム開発

### テンプレートベースプリセット初期化システム

テンプレートシステムは、環境変数を使用してユーザー固有のデフォルト設定を持つプリセットを生成する仕組みです。

#### アーキテクチャ概要

```
Templates (preset-templates/) → Environment Variables (.env) → Generated Presets (presets/)
         ↓                              ↓                           ↓
   テンプレートファイル           設定カスタマイズ              実際のプリセット
```

#### 主要コンポーネント

**1. TemplateProcessor (src/setup/template-processor.ts)**

```typescript
export class TemplateProcessor {
  private config: Record<string, string | number | boolean>;

  constructor(envPath?: string) {
    this.config = this.loadConfig(envPath);
  }

  // テンプレート変数の置換処理
  private replaceVariables(content: string): string {
    return content.replace(/\{\{([A-Z_][A-Z0-9_]*)\}\}/g, (match, varName) => {
      if (varName in this.config) {
        return String(this.config[varName]);
      }
      return match; // 未定義変数はそのまま残す
    });
  }

  // プリセット生成
  async generatePresets(): Promise<void> {
    const templates = await this.getTemplateFiles();

    for (const template of templates) {
      const content = await fs.readFile(template, 'utf-8');
      const processed = this.replaceVariables(content);
      const outputPath = this.getOutputPath(template);

      await fs.writeFile(outputPath, processed, 'utf-8');
    }
  }
}
```

**2. 設定CLI (src/setup/setup-cli.ts)**

```typescript
export class SetupCLI {
  // インタラクティブ設定
  async runInteractiveSetup(): Promise<void> {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    try {
      console.log('\n🎯 テンプレートシステム設定');

      const checkpoint = await this.question(rl, 'デフォルトモデル: ');
      const sampler = await this.question(rl, 'デフォルトサンプラー: ');
      const steps = await this.question(rl, 'デフォルトステップ数: ');

      // .envファイルに設定を保存
      await this.saveConfiguration({
        DEFAULT_CHECKPOINT: checkpoint,
        DEFAULT_SAMPLER: sampler,
        DEFAULT_STEPS: parseInt(steps) || 28
      });

    } finally {
      rl.close();
    }
  }
}
```

**3. マイグレーション (src/setup/migrate-presets.ts)**

```typescript
export class PresetMigrator {
  // 既存プリセットの分析
  async analyzeCurrentPresets(): Promise<MigrationReport> {
    const presets = await this.loadAllPresets();
    const deprecated = presets.filter(p => this.isDeprecated(p));
    const active = presets.filter(p => !this.isDeprecated(p));

    return {
      total: presets.length,
      active: active.length,
      deprecated: deprecated.length,
      recommendations: this.generateRecommendations(presets)
    };
  }

  // 安全なマイグレーション実行
  async migrate(options: MigrationOptions): Promise<void> {
    // 1. バックアップ作成
    await this.createBackup();

    // 2. 非推奨プリセットを移動
    await this.moveDeprecatedPresets();

    // 3. アクティブプリセットを整理
    await this.reorganizeActivePresets();

    // 4. 検証
    await this.validateMigration();
  }
}
```

#### テンプレート変数システム

**変数命名規則**:
```
{{VARIABLE_NAME}}  - 大文字とアンダースコア、英数字のみ
```

**サポートされる変数タイプ**:
```typescript
interface TemplateConfig {
  // 基本生成設定
  DEFAULT_CHECKPOINT: string;        // "sd_animagineXL40_v4Opt"
  DEFAULT_SAMPLER: string;           // "Euler a"
  DEFAULT_STEPS: number;             // 28
  DEFAULT_CFG_SCALE: number;         // 7
  DEFAULT_WIDTH: number;             // 1024
  DEFAULT_HEIGHT: number;            // 1024

  // プロンプト設定
  DEFAULT_POSITIVE_SUFFIX: string;   // "masterpiece, high quality"
  DEFAULT_NEGATIVE: string;          // "lowres, bad quality"

  // 拡張機能設定
  CONTROLNET_MAX_UNITS: number;      // 3
  ADETAILER_MAX_MODELS: number;      // 2
  ADETAILER_DEFAULT_MODEL: string;   // "face_yolov8n.pt"

  // 高度な設定
  ENABLE_HIRES_FIX: boolean;         // false
  HR_UPSCALER: string;               // "R-ESRGAN 4x+ Anime6B"
  HR_SCALE: number;                  // 2.0
}
```

#### テンプレートファイル例

**preset-templates/01_txt2img_dynamic.yaml.template**:
```yaml
name: txt2img_dynamic
type: txt2img
description: "{{TEMPLATE_DESCRIPTION}}"

base_settings:
  checkpoint: "{{DEFAULT_CHECKPOINT}}"
  sampler_name: "{{DEFAULT_SAMPLER}}"
  steps: {{DEFAULT_STEPS}}
  cfg_scale: {{DEFAULT_CFG_SCALE}}
  width: {{DEFAULT_WIDTH}}
  height: {{DEFAULT_HEIGHT}}

prompt_template:
  positive_suffix: "{{DEFAULT_POSITIVE_SUFFIX}}"
  negative: "{{DEFAULT_NEGATIVE}}"

extensions:
  adetailer:
    enabled: {{ENABLE_ADETAILER}}
    max_models: {{ADETAILER_MAX_MODELS}}
    models:
      - model: "{{ADETAILER_DEFAULT_MODEL}}"
        confidence: {{ADETAILER_CONFIDENCE}}

  controlnet:
    enabled: {{ENABLE_CONTROLNET}}
    max_units: {{CONTROLNET_MAX_UNITS}}
    units:
      - module: "None"
        model: "{{CONTROLNET_DEFAULT_MODEL}}"
        weight: {{CONTROLNET_DEFAULT_WEIGHT}}

  hires_fix:
    enable_hr: {{ENABLE_HIRES_FIX}}
    hr_upscaler: "{{HR_UPSCALER}}"
    hr_scale: {{HR_SCALE}}
    hr_denoising_strength: {{HR_DENOISING_STRENGTH}}
```

#### 開発ワークフロー

**1. 新しいテンプレート作成**:
```bash
# 新しいテンプレートファイル作成
touch preset-templates/XX_new_template.yaml.template

# テンプレート変数定義
echo "DEFAULT_NEW_FEATURE=enabled" >> .env.example
```

**2. 環境変数の追加**:
```typescript
// src/setup/template-processor.ts に新しい変数処理を追加
private getDefaultConfig(): Record<string, any> {
  return {
    // 既存の設定...
    DEFAULT_NEW_FEATURE: 'enabled',
    NEW_FEATURE_PARAMETER: 10
  };
}
```

**3. テスト**:
```bash
# 設定サンプル生成
npm run setup:presets:sample

# 設定検証
npm run setup:presets:validate

# プリセット生成
npm run setup:presets

# ビルド・テスト
npm run build
npm test
```

#### クロスプラットフォーム対応

**環境固有の処理**:
```typescript
// プラットフォーム検出
const platform = process.platform;

if (platform === 'win32') {
  // Windows固有の処理
  console.log('Windows環境での設定手順:');
  console.log('   Command Prompt: copy .env.sample .env');
  console.log('   PowerShell:     Copy-Item .env.sample .env');
} else {
  // Unix系システム
  console.log('Unix環境での設定手順:');
  console.log('   cp .env.sample .env');
}
```

**ファイル操作の互換性**:
```typescript
// fs.cpSync のフォールバック実装
if (fs.cpSync) {
  // Node.js 16.7.0以降
  fs.cpSync(source, dest, { recursive: true });
} else {
  // 古いバージョン向けフォールバック
  this.copyDirectorySync(source, dest);
}
```

#### エラーハンドリング

**TypeScript エラー対応**:
```typescript
try {
  await this.processTemplate(template);
} catch (error) {
  // TypeScript 4.4以降のエラーハンドリング
  const message = error instanceof Error ? error.message : String(error);
  this.logger.error(`テンプレート処理エラー: ${message}`);
  throw new Error(`Template processing failed: ${message}`);
}
```

**設定ファイル検証**:
```typescript
validateConfig(config: Record<string, any>): void {
  const required = ['DEFAULT_CHECKPOINT', 'DEFAULT_SAMPLER'];

  for (const key of required) {
    if (!(key in config)) {
      throw new Error(`必須設定項目が不足: ${key}`);
    }
  }

  // 数値型チェック
  if (typeof config.DEFAULT_STEPS !== 'number') {
    throw new Error('DEFAULT_STEPS は数値である必要があります');
  }
}
```

#### NPM スクリプト

**package.json 設定**:
```json
{
  "scripts": {
    "setup:presets": "tsx src/setup/setup-cli.ts",
    "setup:presets:sample": "tsx src/setup/setup-cli.ts --sample",
    "setup:presets:validate": "tsx src/setup/setup-cli.ts --validate",
    "setup:presets:interactive": "tsx src/setup/setup-cli.ts --interactive",
    "migrate:presets": "tsx src/setup/migrate-presets.ts",
    "migrate:presets:dry-run": "tsx src/setup/migrate-presets.ts --dry-run",
    "migrate:presets:report": "tsx src/setup/migrate-presets.ts --report"
  }
}
```

## 🔧 拡張機能開発

### 新しい拡張機能の追加

#### 1. 型定義の拡張

**ファイル**: `src/presets/types.ts`

```typescript
// Extensions インターフェースに追加
export interface Extensions {
  // 既存の拡張機能...
  adetailer?: ADetailerConfig;
  controlnet?: ControlNetConfig;

  // 新しい拡張機能を追加
  new_extension?: NewExtensionConfig;
}

// 新しい拡張機能の設定インターフェース
export interface NewExtensionConfig {
  enabled: boolean;
  parameter1?: string;
  parameter2?: number;
  advanced_settings?: {
    option1: boolean;
    option2: string;
  };
}
```

#### 2. ツール生成ロジックの拡張

**ファイル**: `src/server/tool-generator.ts`

```typescript
// generateInputSchema メソッドに追加
private generateInputSchema(preset: Preset): Record<string, any> {
  const schema: Record<string, any> = {};

  // 既存のロジック...

  // 新しい拡張機能のパラメータ生成
  if (preset.extensions?.new_extension?.enabled) {
    schema.new_extension_param1 = {
      type: 'string',
      description: '新しい拡張機能のパラメータ1'
    };

    schema.new_extension_param2 = {
      type: 'number',
      description: '新しい拡張機能のパラメータ2',
      minimum: 0,
      maximum: 10,
      default: 5
    };
  }

  return schema;
}
```

#### 3. MCPサーバーでの処理追加

**ファイル**: `src/server/mcp-server.ts`

```typescript
// configureExtensions メソッドに追加
private configureExtensions(preset: Preset, userParams: any): any {
  const alwaysonScripts: any = {};

  // 既存の拡張機能処理...

  // 新しい拡張機能の処理
  if (preset.extensions?.new_extension?.enabled) {
    alwaysonScripts['New Extension'] = {
      args: [
        userParams.new_extension_param1 || preset.extensions.new_extension.parameter1,
        userParams.new_extension_param2 || preset.extensions.new_extension.parameter2,
        // その他のパラメータ...
      ]
    };
  }

  return { alwayson_scripts: alwaysonScripts };
}
```

#### 4. テストの追加

**ファイル**: `tests/unit/presets/types.test.ts`

```typescript
describe('NewExtensionConfig', () => {
  it('should validate new extension config', () => {
    const config: NewExtensionConfig = {
      enabled: true,
      parameter1: 'test_value',
      parameter2: 7,
      advanced_settings: {
        option1: true,
        option2: 'advanced_value'
      }
    };

    expect(config.enabled).toBe(true);
    expect(config.parameter1).toBe('test_value');
  });
});
```

### API ペイロード生成のカスタマイズ

#### ペイロードクリーニング

**ファイル**: `src/presets/manager.ts`

```typescript
// presetToPayload メソッドの拡張
presetToPayload(preset: Preset, userParams: Record<string, any>): any {
  // 基本ペイロード生成
  let payload = this.buildBasePayload(preset, userParams);

  // 拡張機能設定
  if (preset.extensions) {
    const extensions = this.configureExtensions(preset, userParams);
    payload = { ...payload, ...extensions };
  }

  // null値除去（422エラー防止）
  return this.cleanNullValues(payload);
}

// null値除去メソッド
private cleanNullValues(obj: any): any {
  if (obj === null || obj === undefined) {
    return undefined;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => this.cleanNullValues(item)).filter(item => item !== undefined);
  }

  if (typeof obj === 'object') {
    const cleaned: any = {};
    for (const [key, value] of Object.entries(obj)) {
      const cleanedValue = this.cleanNullValues(value);
      if (cleanedValue !== undefined) {
        cleaned[key] = cleanedValue;
      }
    }
    return Object.keys(cleaned).length > 0 ? cleaned : undefined;
  }

  return obj;
}
```

## 🧪 テスト開発

### TDD アプローチ

プロジェクトは Test-Driven Development を採用しています。

#### 単体テスト

```bash
# 全テスト実行
npm test

# ウォッチモード
npm run test:watch

# カバレッジ確認
npm run test:coverage
```

#### 新機能のテスト作成

**例**: 新しい拡張機能のテスト

```typescript
// tests/unit/extensions/new-extension.test.ts
import { NewExtensionConfig } from '../../../src/presets/types';
import { ToolGenerator } from '../../../src/server/tool-generator';

describe('NewExtension', () => {
  describe('Parameter Generation', () => {
    it('should generate correct parameters for new extension', () => {
      const preset = {
        name: 'test_new_extension',
        type: 'txt2img' as const,
        extensions: {
          new_extension: {
            enabled: true,
            parameter1: 'default_value',
            parameter2: 5
          }
        }
      };

      const generator = new ToolGenerator('./tests/fixtures/presets');
      const tool = generator['presetToTool'](preset);

      expect(tool?.inputSchema.properties).toHaveProperty('new_extension_param1');
      expect(tool?.inputSchema.properties).toHaveProperty('new_extension_param2');
    });
  });

  describe('Payload Generation', () => {
    it('should generate correct API payload', () => {
      // PayloadManager のテスト
      const manager = new PresetManager('./tests/fixtures/presets');
      const payload = manager.presetToPayload(preset, {
        prompt: 'test prompt',
        new_extension_param1: 'custom_value',
        new_extension_param2: 8
      });

      expect(payload.alwayson_scripts).toHaveProperty('New Extension');
      expect(payload.alwayson_scripts['New Extension'].args[0]).toBe('custom_value');
      expect(payload.alwayson_scripts['New Extension'].args[1]).toBe(8);
    });
  });
});
```

#### 統合テスト

```typescript
// tests/integration/full-workflow.test.ts
describe('Full Workflow Integration', () => {
  it('should handle new extension end-to-end', async () => {
    // 1. プリセット読み込み
    const manager = new PresetManager('./tests/fixtures/presets');
    const preset = manager.loadPreset('new_extension_test.yaml');

    // 2. ツール生成
    const generator = new ToolGenerator('./tests/fixtures/presets');
    const tools = generator.generateTools();
    const tool = tools.find(t => t.name === 'sdreforge_new_extension_test');

    // 3. MCP リクエスト処理
    const server = new MCPServer({ debug: false });
    const result = await server.callTool({
      name: 'sdreforge_new_extension_test',
      arguments: {
        prompt: 'test prompt',
        new_extension_param1: 'test_value'
      }
    });

    expect(result.content).toBeDefined();
  });
});
```

### モックとフィクスチャ

#### SD WebUI API モック

```typescript
// tests/mocks/sd-webui-api.ts
export class MockSDWebUIClient {
  async txt2img(payload: any): Promise<any> {
    return {
      images: ['base64_encoded_image'],
      parameters: payload,
      info: 'Mock generation info'
    };
  }

  async img2img(payload: any): Promise<any> {
    return {
      images: ['base64_encoded_image'],
      parameters: payload,
      info: 'Mock generation info'
    };
  }
}
```

#### テスト用プリセット

```yaml
# tests/fixtures/presets/test_new_extension.yaml
name: new_extension_test
type: txt2img
description: "New extension test preset"

base_settings:
  checkpoint: "test_model"
  steps: 10
  cfg_scale: 5

extensions:
  new_extension:
    enabled: true
    parameter1: "test_default"
    parameter2: 3
    advanced_settings:
      option1: true
      option2: "advanced_test"
```

## 🐛 デバッグとトラブルシューティング

### デバッグツール

#### ログ設定

```typescript
// src/utils/logger.ts
export class Logger {
  private debug: boolean;

  constructor(debug: boolean = false) {
    this.debug = debug || process.env.DEBUG === 'true';
  }

  log(message: string, data?: any) {
    if (this.debug) {
      console.log(`[DEBUG] ${new Date().toISOString()} ${message}`, data || '');
    }
  }

  error(message: string, error?: any) {
    console.error(`[ERROR] ${new Date().toISOString()} ${message}`, error || '');
  }
}
```

#### デバッグモード実行

```bash
# 環境変数でデバッグ有効化
DEBUG=true npm run dev

# または
DEBUG=true npx tsx src/index.ts
```

### 一般的な問題と解決方法

#### 1. プリセット読み込みエラー

**症状**: プリセットが認識されない
**原因**: YAML 構文エラー、必須フィールド不足
**解決方法**:

```bash
# YAML 構文チェック
npx js-yaml presets/your_preset.yaml

# デバッグログ確認
cat mcp-debug.log | grep "your_preset"
```

#### 2. 動的パラメータが生成されない

**症状**: `max_models`, `max_units` が効かない
**原因**: プリセット名が動的対象外、メタデータ不足
**解決方法**:

```yaml
# 動的生成対象はこれらのプリセット名のみ
name: txt2img_dynamic
name: img2img_dynamic

# メタデータ必須
extensions:
  controlnet:
    max_units: 3        # 必須
  adetailer:
    max_models: 15      # 必須
```

#### 3. API 422 エラー

**症状**: SD WebUI API が 422 エラーを返す
**原因**: null 値がペイロードに含まれている
**解決方法**:

```typescript
// 自動 null 値除去が有効か確認
// src/presets/manager.ts の cleanNullValues メソッド
```

#### 4. 拡張機能が動作しない

**症状**: ControlNet, ADetailer が効かない
**原因**: SD WebUI Reforge に拡張機能が未インストール
**解決方法**:

```bash
# SD WebUI Reforge の拡張機能確認
curl http://localhost:7860/sdapi/v1/extensions

# 必要な拡張機能をインストール
```

### パフォーマンス最適化

#### メモリ使用量削減

```typescript
// キャッシュサイズ制限
export class MCPServer {
  private static readonly MAX_CACHE_SIZE = 50;
  private cachedTools: Map<string, MCPTool[]> = new Map();

  private cacheTools(key: string, tools: MCPTool[]) {
    if (this.cachedTools.size >= MCPServer.MAX_CACHE_SIZE) {
      const firstKey = this.cachedTools.keys().next().value;
      this.cachedTools.delete(firstKey);
    }
    this.cachedTools.set(key, tools);
  }
}
```

#### API リクエスト最適化

```typescript
// 不要なパラメータ除去
private optimizePayload(payload: any): any {
  // デフォルト値と同じパラメータを除去
  // null/undefined 値を除去
  // 空の配列・オブジェクトを除去
  return this.cleanNullValues(payload);
}
```

## 📚 ベストプラクティス

### プリセット設計

1. **最小構成原則**: 必要最小限のパラメータのみ定義
2. **デフォルト値活用**: 一般的な値はデフォルトに設定
3. **拡張性考慮**: 将来の機能追加を見越した構造
4. **命名規則**: 一貫した命名パターンの使用

### コード品質

1. **型安全性**: TypeScript の型チェックを活用
2. **エラーハンドリング**: 適切な例外処理の実装
3. **テストカバレッジ**: 新機能には必ずテストを追加
4. **ドキュメント**: コードコメントとドキュメント更新

### パフォーマンス

1. **キャッシュ活用**: 頻繁にアクセスされるデータのキャッシュ
2. **遅延読み込み**: 必要時のみプリセット読み込み
3. **メモリ管理**: 不要なオブジェクトの適切な解放

## 🔄 リリースプロセス

### バージョン管理

```bash
# バージョンアップ
npm version patch   # バグフィックス
npm version minor   # 新機能追加
npm version major   # 破壊的変更

# タグ作成・プッシュ
git push origin main --tags
```

### 変更ログ更新

```markdown
# CHANGELOG.md

## [0.2.0] - 2025-09-21

### Added
- 新しい拡張機能サポート
- 動的パラメータ生成の改善

### Fixed
- プリセット読み込みのバグ修正
- API エラーハンドリング改善

### Changed
- 内部アーキテクチャの最適化
```

## 🔗 関連リソース

### 開発ツール
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Jest Testing Framework](https://jestjs.io/)
- [Model Context Protocol](https://modelcontextprotocol.io/)

### SD WebUI Reforge
- [API Documentation](https://github.com/Panchovix/stable-diffusion-webui-reforge/wiki/API)
- [Extension Development Guide](https://github.com/AUTOMATIC1111/stable-diffusion-webui/wiki/Developing-extensions)

### 関連ドキュメント
- [YAML プリセットリファレンス](PRESET_YAML_REFERENCE.md)
- [ツール登録ガイド](TOOL_REGISTRATION_GUIDE.md)
- [プリセットテンプレートガイド](PRESET_TEMPLATES_GUIDE.md)