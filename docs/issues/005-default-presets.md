# Issue #5: Create 20 Default Presets for Various Use Cases

## Overview
Create a comprehensive set of 20 default presets covering various image generation use cases.

## Requirements

### Preset Categories

#### 1. Artistic Styles (5 presets)
- [ ] `art_anime` - Anime/manga style artwork
- [ ] `art_realistic` - Photorealistic images
- [ ] `art_watercolor` - Watercolor painting style
- [ ] `art_oil_painting` - Oil painting style
- [ ] `art_pencil_sketch` - Pencil sketch/drawing style

#### 2. Photo Enhancement (4 presets)
- [ ] `photo_portrait` - Portrait photography with face enhancement
- [ ] `photo_landscape` - Landscape photography
- [ ] `photo_product` - Product photography
- [ ] `photo_architecture` - Architecture photography

#### 3. Creative Effects (4 presets)
- [ ] `creative_fantasy` - Fantasy art with magical elements
- [ ] `creative_scifi` - Science fiction themed
- [ ] `creative_retro` - Retro/vintage style
- [ ] `creative_abstract` - Abstract art

#### 4. Practical Use Cases (4 presets)
- [ ] `practical_logo` - Logo/icon generation
- [ ] `practical_texture` - Texture/pattern generation
- [ ] `practical_concept_art` - Concept art for games/movies
- [ ] `practical_illustration` - Book/article illustrations

#### 5. Image-to-Image (3 presets)
- [ ] `img2img_style_transfer` - Style transfer
- [ ] `img2img_upscale` - Image upscaling with enhancement
- [ ] `img2img_variation` - Create variations of existing images

## Technical Specifications

### Required for Each Preset:
1. Optimized model selection (from available 152 models)
2. Appropriate sampler (from available 74 samplers)
3. Tuned parameters (steps, CFG scale, etc.)
4. Extension configurations where applicable
5. Clear documentation of use case

### Testing Requirements:
- [ ] Each preset must generate valid images
- [ ] Parameters must be optimized for quality vs speed
- [ ] Extension configurations must be validated
- [ ] Documentation must include example prompts

## Deliverables
1. 20 YAML preset files in `presets/` directory
2. Test script to validate all presets
3. Example outputs for each preset
4. Documentation in README.md

## Success Criteria
- All 20 presets generate images successfully
- Each preset has clear use case documentation
- Test coverage for all presets
- Example outputs demonstrate preset capabilities