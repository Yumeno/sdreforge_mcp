# Issue #011: Hires Fix動的制御の実装

## 📋 概要

26番プリセットにHires Fix（高解像度修正）の動的制御機能を統合し、解像度向上の有効/無効とパラメータカスタマイズを可能にする。

## 🎯 実装目標

### 基本機能
- [x] Hires Fix動的有効化/無効化
- [x] スケール調整（1.0〜4.0倍）
- [x] アップスケーラー選択
- [x] デノイジング強度調整

### 動的制御
- [x] デフォルト無効設定
- [x] ユーザーパラメータによる有効化
- [x] 詳細設定のパラメータ上書き
- [x] PNG情報への記録確認

## 🔧 技術実装

### パラメータ定義
```typescript
// tool-generator.ts でのパラメータ追加
schema.enable_hr = {
  type: 'boolean',
  description: 'Enable Hires Fix for high resolution generation',
  default: false
};
schema.hr_scale = {
  type: 'number',
  description: 'Hires Fix scale factor (1.0-4.0)',
  default: 2.0,
  minimum: 1.0,
  maximum: 4.0
};
schema.hr_upscaler = {
  type: 'string',
  description: 'Upscaler model (e.g., "4x_fatal_Anime_500000_G", "R-ESRGAN 4x+ Anime6B")',
  default: 'R-ESRGAN 4x+ Anime6B'
};
```

### 動的上書き処理
```typescript
// mcp-server.ts でのパラメータ適用
if (params.enable_hr !== undefined) {
  payload.enable_hr = params.enable_hr;

  if (params.enable_hr) {
    if (params.hr_scale !== undefined) payload.hr_scale = params.hr_scale;
    if (params.hr_upscaler) payload.hr_upscaler = params.hr_upscaler;
    if (params.hr_denoising_strength !== undefined) payload.denoising_strength = params.hr_denoising_strength;
  }
}
```

## 🧪 テスト結果

### 動作確認済み機能
- [x] **Hires Fix無効**（デフォルト）
  - パラメータ指定なし
  - PNG情報にHires関連項目なし
  - 通常解像度（1024x1024）生成

- [x] **Hires Fix有効**（カスタム設定）
  - `enable_hr=true`
  - `hr_scale=2, hr_upscaler=4x_fatal_Anime_500000_G`
  - PNG情報: `Hires upscale: 2.0, Hires upscaler: 4x_fatal_Anime_500000_G`

### パラメータ上書きテスト
- [x] **スケール調整**: 2.0倍で動作確認
- [x] **アップスケーラー**: 4x_fatal_Anime_500000_G で動作確認
- [x] **デノイジング強度**: 0.5で動作確認
- [x] **他機能との併用**: ADetailer 2段と同時動作

## 📊 性能向上効果

### 解像度向上
- **標準**: 1024x1024
- **Hires Fix**: 2048x2048（2倍スケール）
- **品質**: アニメ特化アップスケーラーで最適化

### 動的制御の利点
- **必要時のみ**: パフォーマンス負荷を最小化
- **柔軟設定**: 用途に応じたスケール・強度調整
- **アップスケーラー選択**: コンテンツに最適なモデル使用

## 🎨 使用例

### 基本使用（Hires Fix無効）
```typescript
prompt="anime girl portrait"
// enable_hr指定なし → デフォルトfalse
```

### 高解像度生成（Hires Fix有効）
```typescript
prompt="anime girl portrait"
enable_hr=true
hr_scale=2.0
hr_upscaler="4x_fatal_Anime_500000_G"
hr_denoising_strength=0.5
```

### 他機能との組み合わせ
```typescript
prompt="anime girl full body"
enable_hr=true
hr_scale=1.5
controlnet_image="pose.png"
adetailer_model_2="hand_yolov8n.pt"
```

## 💡 今後の展開

Hires Fix統合により、26番プリセットは**完全な画像生成コントロールセンター**となりました：

1. **構造制御**: ControlNet多段
2. **品質向上**: ADetailer多段
3. **解像度向上**: Hires Fix動的制御
4. **基本生成**: 全パラメータ対応

**1つのプリセットであらゆる画像生成ニーズに対応可能**な究極ツールの完成です。