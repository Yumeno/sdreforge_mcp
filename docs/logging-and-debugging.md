# SD WebUI Reforge MCP - Logging and Debugging Guide

このドキュメントでは、SD WebUI Reforge MCP サーバーのロギングとデバッグ機能について詳しく説明します。

## 🔧 デバッグオプションの設定

### 1. DEBUG環境変数

最も基本的なデバッグオプションです。

**推奨設定方法（.envファイル）:**
```bash
# .envファイルに追加
DEBUG=true
SD_WEBUI_URL=http://192.168.91.2:7863
```

**直接実行時の環境変数設定:**
```bash
DEBUG=true npx tsx src/index.ts
```

**MCP設定ファイル（非推奨、環境変数が効かない場合がある）:**
```json
{
  "mcpServers": {
    "sdreforge": {
      "command": "npx",
      "args": ["-y", "tsx", "C:\\path\\to\\sdreforge_mcp\\src\\index.ts"]
    }
  }
}
```

**DEBUG=true の効果:**
- サーバー起動時に詳細な情報を stderr に出力
- txt2img API呼び出し時にペイロードを console.log に出力
- 各種ログファイルへの書き込みが有効化

**重要**: MCPサーバー設定での環境変数指定（`"env"`項目）は、npx実行時に正しく伝達されない場合があります。`.env`ファイルでの設定を推奨します。

### 2. Regional Prompter デバッグ

プリセット内で `rp_debug: true` を設定することで、Regional Prompter の詳細なデバッグログを有効にできます。

```yaml
# プリセットファイル例
extensions:
  regional_prompter:
    rp_debug: true
```

## 📁 ログファイル一覧

MCPサーバーは以下の5種類のログファイルを生成します。すべてのファイルは実行ディレクトリ（`process.cwd()`）に作成されます。

### 1. `mcp-debug.log` - プリセット管理ログ

**目的**: プリセットファイルの読み込み状況を記録
**場所**: `{実行ディレクトリ}/mcp-debug.log`
**記録タイミング**: サーバー起動時・プリセット読み込み時

**記録内容:**
- プリセットディレクトリのスキャン
- 各プリセットファイルの読み込み成功/失敗
- プリセット数の統計

**ログ例:**
```
[DEBUG 2024-01-15T10:30:00.000Z] Loading presets from: C:\path\to\presets
[DEBUG 2024-01-15T10:30:00.100Z] Found 15 files in presets directory
[DEBUG 2024-01-15T10:30:00.150Z] Loading preset: 01_txt2img_dynamic.yaml
[DEBUG 2024-01-15T10:30:00.200Z] Successfully loaded preset: Dynamic Text-to-Image (type: txt2img)
[ERROR 2024-01-15T10:30:00.250Z] Failed to load preset invalid.yaml: Invalid YAML syntax
```

### 2. `mcp-tool-execution.log` - ツール実行ログ

**目的**: MCP ツールの実行詳細を記録
**場所**: `{実行ディレクトリ}/mcp-tool-execution.log`
**記録タイミング**: 各ツール実行時

**記録内容:**
- マスク結合処理の詳細
- img2img/inpaint パラメータ設定
- ControlNet の有効化・無効化
- ADetailer モデル設定
- Hires Fix 設定
- Dynamic Prompts 設定
- Regional Prompter 設定
- エラー・警告メッセージ

**ログ例:**
```
Combining 3 masks, dimensions: 1024x1024
Generated colors: [{"r":255,"g":0,"b":0},{"r":0,"g":255,"b":0},{"r":0,"g":0,"b":255}]
Processing mask 0 as region 0 with color RGB(255,0,0)
Processing mask 1 as region 1 with color RGB(0,255,0)
Saved combined mask to: C:\path\to\output\combined_mask_1234567890123.png
[IMG2IMG] Inpaint parameters set
Enabled ControlNet Unit 0 (image provided: image_1)
ADetailer configured with 2 models
Hires Fix enabled: true
Dynamic Prompts configured: enabled=true, combinatorial=false, max_gen=10
Regional Prompter configured: mode=Columns, active=true
```

### 3. `rp-debug.log` - Regional Prompter 詳細ログ

**目的**: Regional Prompter のプロンプト処理を詳細に記録
**場所**: `{実行ディレクトリ}/rp-debug.log`
**記録タイミング**: Regional Prompter 使用時（rp_debug=true 時のみ）

**記録内容:**
- プロンプトの分割結果
- ADDCOMM/ADDBASE キーワード検出
- チャンクの検出とラッピング処理
- 条件判定の詳細

**ログ例:**
```
Split result: ["1girl, smile","forest background","detailed lighting"]
Filtered chunks: ["1girl, smile","forest background","detailed lighting"]
rpConfig: {"rp_use_common":true,"rp_use_base":true}
rpConfig.rp_use_common: true, rpConfig.rp_use_base: true
userPrompt.includes('ADDCOMM'): false, userPrompt.includes('ADDBASE'): false
Condition1 (!rp_use_common): false
shouldWrapAllChunks: true
Chunks detected: 3
Chunk[0]: "1girl, smile"
Chunk[1]: "forest background"
Chunk[2]: "detailed lighting"
Wrapping chunk 1: "1girl, smile" -> "[1girl, smile]"
```

### 4. `payload-debug.log` - API ペイロードログ

**目的**: SD WebUI API への送信ペイロード全体を記録
**場所**: `{実行ディレクトリ}/payload-debug.log`
**記録タイミング**: txt2img API 呼び出し時

**記録内容:**
- タイムスタンプとプリセット名
- すべてのコアパラメータ
- モデルチェックポイント情報
- AlwaysOn Scripts の完全な設定
- 完全なペイロード JSON

**ログ例:**
```
========== txt2img API Call at 2024-01-15T10:30:00.000Z ==========
Preset: Dynamic Text-to-Image

--- Core Parameters ---
prompt: "masterpiece, 1girl, detailed"
negative_prompt: "lowres, bad anatomy"
steps: 28
cfg_scale: 5.0
sampler_name: "Euler a"
width: 1024
height: 1024
seed: -1

--- Model Checkpoint ---
checkpoint_from_preset: "sd_animagineXL40_v4Opt"
override_checkpoint: "not specified"

--- AlwaysOn Scripts ---
{
  "ControlNet": {
    "args": [...]
  },
  "ADetailer": {
    "args": [...]
  }
}
========== End of payload log ==========
```

### 5. `output/combined_mask_[timestamp].png` - マスク画像ファイル

**目的**: Regional Prompter で使用する結合済みマスク画像を保存
**場所**: `{実行ディレクトリ}/output/combined_mask_[timestamp].png`
**作成タイミング**: 複数のマスクを結合した時

**ファイル仕様:**
- PNG 形式
- ファイル名に Unix タイムスタンプを含む
- 各領域が異なる色で塗り分けられた画像

## 🔍 デバッグ方法

### Claude Code 環境でのデバッグ

Claude Code で npx 実行する場合、stderr 出力は見えないため、主にログファイルを使用してデバッグを行います。

**推奨デバッグ手順:**

1. **DEBUG=true を設定**
   ```json
   // .claude/mcp_sdreforge.json
   {
     "mcpServers": {
       "sdreforge": {
         "env": {
           "DEBUG": "true"
         }
       }
     }
   }
   ```

2. **ログファイルを確認**
   - サーバー起動後、実行ディレクトリに各種ログファイルが作成される
   - リアルタイムでログを確認したい場合は `tail -f` を使用

3. **問題のある処理を実行**
   - MCP ツールを実行してエラーを再現
   - ログファイルに詳細な情報が記録される

### 外部ターミナルでの直接実行

より詳細なデバッグには、外部ターミナルで直接実行することも可能です：

**Linux/macOS (bash/zsh):**
```bash
cd /path/to/sdreforge_mcp
DEBUG=true npx tsx src/index.ts
```

**Windows (Command Prompt):**
```cmd
cd C:\path\to\sdreforge_mcp
set DEBUG=true && npx tsx src/index.ts
```

**Windows (PowerShell):**
```powershell
cd C:\path\to\sdreforge_mcp
$env:DEBUG = "true"
npx tsx src/index.ts
```

この場合、stderr に以下の情報が出力されます：
- サーバー起動情報
- API URL
- プリセットディレクトリ
- 利用可能なツール数

## 🚨 よくある問題とログでの診断

### 1. MCP サーバーがツールリストに表示されない

**確認するログ**: `mcp-debug.log`
```
[DEBUG] Loading presets from: /path/to/presets
[DEBUG] Found 0 files in presets directory
```
→ プリセットファイルが見つからない

**解決方法**: プリセットディレクトリとファイルの存在を確認

### 2. プリセットが正しく動作しない

**確認するログ**: `mcp-tool-execution.log`
```
Checking preset 26 conditions: presetName=Dynamic, has_alwayson=false
```
→ AlwaysOn Scripts が正しく設定されていない

**解決方法**: プリセットファイルの extensions 設定を確認

### 3. ControlNet が動作しない

**確認するログ**: `mcp-tool-execution.log`
```
Disabled ControlNet entirely (no images provided)
WARNING: ControlNet model not found: control_sd15_canny
```
→ 画像が提供されていないか、モデルが見つからない

**解決方法**: 画像パラメータとモデル名を確認

### 4. Regional Prompter の分割が期待通りでない

**確認するログ**: `rp-debug.log` (rp_debug=true 時のみ)
```
Split result: ["entire prompt"]
shouldWrapAllChunks: false
```
→ プロンプトが分割されていない

**解決方法**: 区切り文字（カンマ）と rp_use_common/rp_use_base 設定を確認

## 📊 ログファイルのローテーションと管理

現在の実装では、ログファイルは追記モードで動作し、自動的なローテーションは行われません。長期間の使用でファイルサイズが大きくなる場合は、定期的に手動で削除してください。

```bash
# ログファイルのクリア
del mcp-debug.log mcp-tool-execution.log rp-debug.log payload-debug.log
```

## 🛠️ 今後の改善予定

- [ ] 統合Logger実装（Issue #22）
- [ ] ログレベルの設定機能
- [ ] ログファイルの自動ローテーション
- [ ] 構造化ログ（JSON形式）の対応
- [ ] ログビューアーツールの提供

---

このドキュメントは SD WebUI Reforge MCP v1.0.0 時点の仕様に基づいています。最新の情報については、プロジェクトの README.md とソースコードを参照してください。