# Changelog

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