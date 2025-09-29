# Issue #004: Preset Loading Problem - YAML Indentation Error

## Status: RESOLVED ✅

## Problem Description
YAMLファイル18と19がMCPツールリストに正しく読み込まれない問題が発生していました。

### Affected Files:
- `presets/18_img2img_dynamic_wai.yaml`
- `presets/19_txt2img_kaori.yaml`

### Symptoms:
- ファイルは存在するが、MCPリストに表示されない
- デバッグログに「Invalid preset structure」エラーが記録される

## Root Cause Analysis

### 1. YAML構造エラー
両ファイルで`base_settings:`セクションが誤って`extensions:`の下にインデントされていました。

**Before (Incorrect):**
```yaml
extensions:
  # ... extension configs ...

  # Base generation settings (can be overridden dynamically)
  base_settings:  # ← 間違ったインデント（extensionsの子要素）
  prompt: ""
```

**After (Correct):**
```yaml
extensions:
  # ... extension configs ...

# Base generation settings (can be overridden dynamically)
base_settings:    # ← 正しいインデント（ルートレベル）
  prompt: ""
```

### 2. TypeScript型定義不足
`BaseSettings`インターフェースに`prompt_prefix`プロパティが未定義でした。

**Error:**
```
Property 'prompt_prefix' does not exist on type 'BaseSettings'
```

## Solution Applied

### 1. YAML Structure Fix
- `18_img2img_dynamic_wai.yaml`: line 42-43のインデント修正
- `19_txt2img_kaori.yaml`: line 38-39のインデント修正

### 2. TypeScript Type Definition Fix
`src/presets/types.ts` line 29に追加:
```typescript
export interface BaseSettings {
  // プロンプト
  prompt_prefix?: string;  // ← 追加
  prompt_suffix?: string;
  negative_prompt?: string;
  // ...
}
```

## Validation Rules Reference
PresetManagerの`validatePreset`メソッドによる検証ルール:
- `name`: required string
- `type`: must be one of valid types
- `txt2img`/`img2img` types: require `base_settings` object
- Other types: require `settings` object

## Testing Results
✅ TypeScript compilation successful
✅ Both YAML files now load correctly in MCP list
✅ Tools `img2img_dynamic_wainsfw` and `txt2img_kaori` are now available

## Prevention
- YAML構造の一貫性チェック
- プリセット追加時のテンプレート使用
- CI/CDでのYAML validation追加を推奨

## Files Changed
- `src/presets/types.ts` - BaseSettings型定義に`prompt_prefix`追加
- `presets/18_img2img_dynamic_wai.yaml` - base_settingsインデント修正
- `presets/19_txt2img_kaori.yaml` - base_settingsインデント修正

## Date: 2025-09-30
## Resolved by: Claude Code Assistant