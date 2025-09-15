# Issue #1: Original Project Requirements - 正式要件定義

## デフォルトプリセット仕様（20個）

### 基本モデル
- **checkpoint**: animagineXL40_v4Opt

### プリセット詳細

1. **txt2img_animagine_base**
   - checkpoint: animagineXL40_v4Opt
   - type: txt2img
   - adetailer: face有効

2. **txt2img_animagine_cn3**
   - (1)に加えて
   - ControlNet:
     - model: CN-Anytest3_animagine4_A
     - pixel_perfect: true
     - preprocessor: none

3. **txt2img_animagine_cn4**
   - (1)に加えて
   - ControlNet:
     - model: CN-Anytest4_animagine4_A
     - pixel_perfect: true
     - preprocessor: none

4. **img2img_animagine_base**
   - checkpoint: animagineXL40_v4Opt
   - type: img2img
   - adetailer: face有効

5. **img2img_animagine_cn3**
   - (4)に加えて
   - ControlNet:
     - model: CN-Anytest3_animagine4_A
     - pixel_perfect: true
     - preprocessor: none

6. **img2img_animagine_cn4**
   - (4)に加えて
   - ControlNet:
     - model: CN-Anytest4_animagine4_A
     - pixel_perfect: true
     - preprocessor: none

7. **txt2img_cn3_rp_matrix**
   - (2)に加えて
   - Regional Prompter:
     - mode: Matrix

8. **txt2img_cn3_rp_mask**
   - (2)に加えて
   - Regional Prompter:
     - mode: Mask

9. **txt2img_cn4_rp_matrix**
   - (3)に加えて
   - Regional Prompter:
     - mode: Matrix

10. **txt2img_cn4_rp_mask**
    - (3)に加えて
    - Regional Prompter:
      - mode: Mask

11. **img2img_cn3_rp_matrix**
    - (5)に加えて
    - Regional Prompter:
      - mode: Matrix

12. **img2img_cn3_rp_mask**
    - (5)に加えて
    - Regional Prompter:
      - mode: Mask

13. **img2img_cn4_rp_matrix**
    - (6)に加えて
    - Regional Prompter:
      - mode: Matrix

14. **img2img_cn4_rp_mask**
    - (6)に加えて
    - Regional Prompter:
      - mode: Mask

15. **utility_png_info**
    - type: png-info
    - PNG Info読み取り

16. **extras_upscale_ultrasharp**
    - type: extras
    - upscaler: 4x_ultrasharp

17. **extras_upscale_fatal_anime**
    - type: extras
    - upscaler: 4x_fatal_anime_500000_G

18. **extras_rembg_u2net**
    - type: extras
    - rembg: u2net

19. **extras_rembg_isnet_anime**
    - type: extras
    - rembg: isnet_anime

20. **tagger_wd_eva02**
    - type: tagger
    - model: wd-EVA02-Large-v3

## 重要な注意事項
- コンテキスト長に限界があるため、この仕様書は必ず保持すること
- プリセットは実際に使用されるモデル名・設定を使用すること
- 適当な汎用プリセットではなく、具体的な設定であること