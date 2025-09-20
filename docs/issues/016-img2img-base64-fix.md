# Issue #3: img2img/inpaint Base64 Conversion Fix

## 問題の概要
preset 27 (img2img_cn_multi_3units) のinpaintモード実装で、ファイルパスがbase64に変換されずAPIに送信される問題が発生していました。

## 症状
- `init_image` と `mask_image` にファイルパスを指定すると「Invalid encoded image」エラー
- APIペイロードにbase64データではなくファイルパスが含まれる

## 原因
1. **重複コード問題**
   - mcp-server.tsにimg2img処理コードが2箇所存在
   - switch文の前（290-356行）とswitch文内（835-898行）
   - switch文内のコードが実行され、前処理が無視されていた

2. **ファイルパス判定の不備**
   - base64とファイルパスの判定ロジックが不正確
   - ファイル読み込み失敗時のエラーハンドリング不足

## 解決策（2025-09-20実装）

### 1. 重複コード削除
```typescript
// 削除: switch文内の重複img2img処理（835-898行）
case 'img2img':
  // img2img processing is already handled before the switch statement
  response = await this.apiClient.img2img(payload);
  break;
```

### 2. ファイルパス検出ロジックの改善
```typescript
// より堅牢なbase64 vs ファイルパス判定
const isBase64 = /^[A-Za-z0-9+/]+=*$/.test(params.init_image) ||
                 params.init_image.startsWith('data:image');
const isFilePath = !isBase64 && (
  params.init_image.includes('\\') ||
  params.init_image.includes('/') ||
  /^[A-Z]:/i.test(params.init_image) ||
  fs.existsSync(params.init_image)
);
```

### 3. 詳細なデバッグログ追加
- 入力タイプの判定結果
- ファイルサイズとパス情報
- base64変換の成功/失敗
- 最終ペイロードの検証

## テスト結果
### テストケース
```javascript
// inpaintモードテスト
{
  prompt: "1girl, school uniform, outdoor, the maple tree with autumn leaves",
  init_image: "C:\\Users\\...\\txt2img_cn_multi_3units-2025-09-19T11-39-39-223Z.png",
  mask_image: "C:\\Users\\...\\mask5.png",
  denoising_strength: 0.7,
  mask_blur: 4,
  inpainting_fill: 1,
  inpaint_full_res: true
}
```

### 結果
✅ ファイルパスが正しくbase64に変換
✅ APIへの送信成功
✅ 画像生成完了

## 影響範囲
- preset 27 (img2img_cn_multi_3units)
- その他のimg2imgプリセット（04, 05, 06, 11, 12, 13, 14）

## 今後の考慮事項
1. **リモートサーバー対応**
   - ローカルファイルパスを直接送信できない
   - base64変換は必須

2. **パフォーマンス**
   - 大きな画像ファイルのbase64変換時のメモリ使用量
   - 必要に応じてストリーミング処理の検討

## 関連コミット
- 90990a3: fix: Resolve img2img/inpaint file path to base64 conversion issue

## 参考資料
- [SD WebUI Reforge API Documentation](https://github.com/Panchovix/stable-diffusion-webui-reforge)
- [MCP Protocol Specification](https://modelcontextprotocol.io/)