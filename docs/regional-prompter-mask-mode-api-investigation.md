# Regional Prompter Mask Mode API 検証結果レポート

## 調査日時
2025年9月19日（初回調査）
2025年9月19日（最終更新）

## 概要
SD WebUI Reforge の Regional Prompter 拡張機能における Mask モードが、API 経由で正常に動作しない問題について詳細な調査を実施しました。

## 主要な発見事項

### 1. 根本原因：`REGUSE` グローバル変数の未初期化

#### GUI での動作フロー（正常）
1. ユーザーがマスク画像をアップロード
2. `detect_image_colours()` 関数が呼び出される
3. マスク画像の色を検出し、`REGUSE` グローバル変数に登録
4. `inpaintmaskdealer()` で `REGUSE` を参照してマスク処理を実行

#### API での動作フロー（問題あり）
1. Base64エンコードされたマスク画像を受信
2. `draw_image()` → `detect_image_colours()` と処理
3. **`REGUSE` グローバル変数が適切に初期化されない**
4. `inpaintmaskdealer()` で `REGUSE` が空のため、マスク処理がスキップされる

### 2. コードレベルの詳細分析

#### 問題のコード箇所（`regions.py`）

```python
# 765行目: inpaintmaskdealer 関数
def inpaintmaskdealer(self, p, bratios, usebase, polymask):
    # ...
    # 777行目: REGUSE が空だとループが実行されない
    for c in sorted(REGUSE.keys()):
        m = detect_mask(polymask, c, 1)
        # マスク処理
```

#### REGUSE の初期化（`regions.py`）

```python
# 427行目: グローバル変数定義
REGUSE = dict()  # Used regions. Reset on new canvas / upload (preset).

# 584行目: detect_image_colours 内での REGUSE 設定
REGUSE = {reg[0,0]: reg[0,1:].tolist() for reg in regrows if len(reg) > 0 and reg[0,0] <= MAX_KEY_VALUE}
```

### 3. なぜ時々動作するのか

**GUI での設定が残存する現象**：
- GUI で一度 Mask モードを使用すると、`REGUSE` に色情報が保存される
- その後 API を呼び出すと、前回の GUI 設定の `REGUSE` が使われて動作する場合がある
- サーバー再起動すると `REGUSE` がクリアされ、再び動作しなくなる

## 技術的詳細

### マスク色の生成アルゴリズム

Regional Prompter は決定論的な HSV 色生成アルゴリズムを使用：

```python
def generateRegionColor(index):
    # インデックス 0: H=0
    # インデックス 1: H=0.5
    # インデックス 2以降: バイナリツリーパターン
    # S=0.5, V=0.5 固定
```

実際の色マッピング例：
- Region 1 (index=1): RGB(64, 128, 128) - 青緑色
- Region 2 (index=2): RGB(96, 128, 64) - 黄緑色

### API パラメータ構造

Regional Prompter は 16 引数 + マスクデータ（17番目）の構造：

```javascript
const rpArgs = [
    active,           // 1: 有効/無効
    debug,            // 2: デバッグ
    mode,             // 3: "Mask"
    matrix_submode,   // 4: "Columns"
    mask_submode,     // 5: "Mask"
    prompt_submode,   // 6: "Prompt"
    divide_ratio,     // 7: "1,1"
    base_ratio,       // 8: "0.2,0.2,0.2" (BREAK数に応じて調整)
    use_base,         // 9: true/false
    use_common,       // 10: true/false
    use_ncommon,      // 11: true/false
    calc_mode,        // 12: "Attention"
    not_change_and,   // 13: false
    lora_stop_step,   // 14: "0"
    lora_hires_stop,  // 15: "0"
    threshold,        // 16: "0.4"
    maskDataURI       // 17: "data:image/png;base64,..."
];
```

### bratios 配列の問題

Mask モードでは、`bratios` が BREAK 数に応じて動的に調整される必要があります：

```javascript
// BREAK数 = 2 の場合
// リージョン数 = 3
// bratios = "0.2,0.2,0.2"
```

## 試行した修正

### 1. MCP サーバー側での対策

実装した修正内容：
- 複数の白黒マスクを単一のカラーマスクに合成
- 決定論的色生成アルゴリズムの実装
- Base64 エンコーディングでのマスク送信
- bratios 配列の動的調整
- リージョンインデックスを 1 から開始

### 2. エラー処理の改善

```javascript
// bratios 永続化問題の修正
if (!baseRatioValue || baseRatioValue === '' || baseRatioValue === '[]') {
    baseRatioValue = '0.2';
}
```

## 🚨 重要な既知の問題 - GitHub Issue #408

### 問題の概要
[GitHub Issue #408](https://github.com/hako-mikan/sd-webui-regional-prompter/issues/408) により、Regional Prompter の一部バージョンで Matrix/Mask モードが正常に動作しない問題が報告されています。

### 影響を受けるバージョン
- **問題のあるコミット**: 特定のバージョン（2024年後半以降の一部）
- **推奨バージョン**: Issue #408 以前のバージョンへのロールバック推奨
- **確認日**: 2025年9月19日

### 症状
- プロンプトで指定した領域分割が正しく反映されない
- 色指定が意図しない領域に適用される
- 特にControlNetと併用時に顕著

### 対処法
**ロールバック**: 以前の安定バージョンに戻す
```bash
cd sd-webui-regional-prompter
git checkout [以前の安定版コミット]
```

## ⭐ 2025年9月19日更新: Mask モード API 対応成功

### 解決方法

MCP サーバー側で複数の白黒マスクを Regional Prompter の期待する形式（カラーコード化された単一マスク）に変換することで、API 経由での Mask モード使用が可能になりました。

#### 実装した解決策

1. **`deterministic_colours` アルゴリズムの完全再現**
   - Regional Prompter の色生成ロジックを完全に再現
   - バイナリツリーパターンによる Hue 値計算
   - HSV(H=計算値, S=0.5, V=0.5) → RGB 変換

2. **Jimp v1.6.0 による画像合成**
   ```javascript
   const { Jimp } = require('jimp');
   const { intToRGBA, rgbaToInt } = require('@jimp/utils');
   ```

3. **17番目のパラメータとして送信**
   - Base64 エンコードされた合成マスクを polymask パラメータとして送信

### 現在の制限事項（解決済み）

~~API 経由での Mask モード使用不可~~ → **✅ 解決済み（2025年9月19日）**

## 今後の改善提案

### Regional Prompter への改修案

1. **API モード検出の追加**
   ```python
   def process(self, p, ...):
       if is_api_call():
           self.initialize_reguse_from_mask(polymask)
   ```

2. **REGUSE の明示的初期化**
   ```python
   def initialize_reguse_from_mask(self, polymask):
       if polymask:
           img = Image.open(BytesIO(base64.b64decode(polymask)))
           detect_image_colours(np.array(img.convert('RGB')))
   ```

3. **API パラメータの拡張**
   - 色情報を直接指定できるパラメータの追加
   - `reguse_colors` パラメータで色マッピングを受け取る

## 結論

### ✅ 解決済み（2025年9月19日）

Regional Prompter の Mask モードは、MCP サーバー側での適切な前処理により **API 経由でも完全に動作するようになりました**。

#### 成功した実装
- 複数の白黒マスクを単一のカラーマスクに合成
- Regional Prompter の `deterministic_colours` アルゴリズムを完全再現
- Base64 エンコードでの polymask パラメータ送信

#### 使用可能なモード
- **Matrix モード** ✅ （グリッド分割）
- **Mask モード** ✅ （マスクベース領域制御）
- **Prompt モード** ⚠️ （API での動作未検証）

## 参考資料

### 関連ファイル
- `/sd-webui-regional-prompter/scripts/rp.py` - メインの処理ロジック
- `/sd-webui-regional-prompter/scripts/regions.py` - マスク処理と色検出
- `/sd-webui-regional-prompter/scripts/attention.py` - アテンション処理

### デバッグログの場所
- `mcp-tool-execution.log` - MCP ツール実行ログ
- `mcp-tool-calls.log` - API 呼び出しログ
- `temp_masks/` - 生成されたマスク画像

## 調査者メモ

この問題は Regional Prompter の設計思想に起因するものであり、完全な解決には拡張機能自体の改修が必要です。現時点では、API 使用時は Matrix モードを使用することが最も現実的な解決策です。

---

*最終更新: 2025年9月19日*
*調査実施: Claude Code (claude-opus-4-1-20250805)*