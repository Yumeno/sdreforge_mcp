/**
 * Preset Manager Unit Tests
 * TDD: プリセット管理機能のテスト
 */

import { PresetManager } from '../../../src/presets/manager';
import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';

// モックの設定
jest.mock('fs');
jest.mock('js-yaml');

const mockedFs = fs as jest.Mocked<typeof fs>;
const mockedYaml = yaml as jest.Mocked<typeof yaml>;

describe('PresetManager', () => {
  let manager: PresetManager;

  beforeEach(() => {
    jest.clearAllMocks();
    manager = new PresetManager('./presets');
  });

  describe('Loading Presets', () => {
    it('should load YAML preset file', () => {
      const yamlContent = `
name: txt2img_animagine_base
description: Basic txt2img with ADetailer
type: txt2img

base_settings:
  prompt_suffix: "masterpiece, best quality"
  negative_prompt: "low quality, worst quality"
  steps: 20
  cfg_scale: 7.0
  width: 1024
  height: 1024
  sampler_name: "DPM++ 2M Karras"
  batch_size: 1
  seed: -1
  model: "animagineXL40_v4Opt"

extensions:
  adetailer:
    enabled: true
    models:
      - face_yolov8n.pt
`;

      mockedFs.readFileSync.mockReturnValue(yamlContent);
      mockedYaml.load.mockReturnValue({
        name: 'txt2img_animagine_base',
        description: 'Basic txt2img with ADetailer',
        type: 'txt2img',
        base_settings: {
          prompt_suffix: 'masterpiece, best quality',
          negative_prompt: 'low quality, worst quality',
          steps: 20,
          cfg_scale: 7.0,
          width: 1024,
          height: 1024,
          sampler_name: 'DPM++ 2M Karras',
          batch_size: 1,
          seed: -1,
          model: 'animagineXL40_v4Opt'
        },
        extensions: {
          adetailer: {
            enabled: true,
            models: ['face_yolov8n.pt']
          }
        }
      });

      const preset = manager.loadPreset('txt2img_animagine_base.yaml');

      expect(preset.name).toBe('txt2img_animagine_base');
      expect(preset.type).toBe('txt2img');
      expect(preset.base_settings.steps).toBe(20);
      expect(preset.extensions.adetailer.enabled).toBe(true);
    });

    it('should handle invalid YAML', () => {
      mockedFs.readFileSync.mockReturnValue('invalid: yaml: content:');
      mockedYaml.load.mockImplementation(() => {
        throw new Error('Invalid YAML');
      });

      expect(() => manager.loadPreset('invalid.yaml')).toThrow('Failed to load preset');
    });

    it('should validate required fields', () => {
      mockedFs.readFileSync.mockReturnValue('name: test');
      mockedYaml.load.mockReturnValue({
        name: 'test'
        // Missing required fields
      });

      expect(() => manager.loadPreset('incomplete.yaml')).toThrow('Invalid preset structure');
    });
  });

  describe('Loading All Presets', () => {
    it('should load all presets from directory', () => {
      mockedFs.readdirSync.mockReturnValue([
        '01_txt2img_base.yaml',
        '02_txt2img_cn3.yaml',
        'not_yaml.txt',
        '.hidden.yaml'
      ] as any);

      mockedFs.readFileSync.mockImplementation((filePath) => {
        if (filePath.toString().includes('01_txt2img_base.yaml')) {
          return 'name: txt2img_base\ntype: txt2img\nbase_settings:\n  steps: 20';
        }
        if (filePath.toString().includes('02_txt2img_cn3.yaml')) {
          return 'name: txt2img_cn3\ntype: txt2img\nbase_settings:\n  steps: 30';
        }
        return '';
      });

      mockedYaml.load.mockImplementation((content) => {
        if (content.includes('txt2img_base')) {
          return {
            name: 'txt2img_base',
            type: 'txt2img',
            base_settings: { steps: 20 }
          };
        }
        if (content.includes('txt2img_cn3')) {
          return {
            name: 'txt2img_cn3',
            type: 'txt2img',
            base_settings: { steps: 30 }
          };
        }
        return {};
      });

      const presets = manager.loadAllPresets();

      expect(presets).toHaveLength(2);
      expect(presets[0].name).toBe('txt2img_base');
      expect(presets[1].name).toBe('txt2img_cn3');
    });

    it('should skip non-YAML files', () => {
      mockedFs.readdirSync.mockReturnValue([
        'preset.yaml',
        'readme.md',
        'config.json'
      ] as any);

      mockedFs.readFileSync.mockReturnValue('name: test\ntype: txt2img');
      mockedYaml.load.mockReturnValue({
        name: 'test',
        type: 'txt2img',
        base_settings: {}
      });

      const presets = manager.loadAllPresets();

      expect(presets).toHaveLength(1);
      expect(mockedFs.readFileSync).toHaveBeenCalledTimes(1);
    });
  });

  describe('Preset Validation', () => {
    it('should validate txt2img preset', () => {
      const validPreset = {
        name: 'test',
        type: 'txt2img',
        base_settings: {
          steps: 20,
          cfg_scale: 7.0,
          width: 1024,
          height: 1024,
          sampler_name: 'DPM++ 2M Karras',
          batch_size: 1,
          seed: -1
        }
      };

      expect(manager.validatePreset(validPreset)).toBe(true);
    });

    it('should validate img2img preset', () => {
      const validPreset = {
        name: 'test',
        type: 'img2img',
        base_settings: {
          denoising_strength: 0.75,
          steps: 20,
          cfg_scale: 7.0,
          width: 1024,
          height: 1024,
          sampler_name: 'DPM++ 2M Karras',
          batch_size: 1,
          seed: -1
        }
      };

      expect(manager.validatePreset(validPreset)).toBe(true);
    });

    it('should reject preset with invalid type', () => {
      const invalidPreset = {
        name: 'test',
        type: 'invalid_type',
        base_settings: {}
      };

      expect(manager.validatePreset(invalidPreset)).toBe(false);
    });

    it('should reject preset without name', () => {
      const invalidPreset = {
        type: 'txt2img',
        base_settings: {}
      };

      expect(manager.validatePreset(invalidPreset)).toBe(false);
    });
  });

  describe('Preset to API Payload Conversion', () => {
    it('should convert txt2img preset to API payload', () => {
      const preset = {
        name: 'test',
        type: 'txt2img',
        base_settings: {
          prompt_suffix: ', masterpiece',
          negative_prompt: 'low quality',
          steps: 20,
          cfg_scale: 7.0,
          width: 1024,
          height: 1024,
          sampler_name: 'DPM++ 2M Karras',
          batch_size: 1,
          seed: -1,
          model: 'animagineXL40_v4Opt'
        },
        extensions: {
          adetailer: {
            enabled: true,
            models: ['face_yolov8n.pt']
          }
        }
      };

      const payload = manager.presetToPayload(preset, { prompt: 'a girl' });

      expect(payload.prompt).toBe('a girl, masterpiece');
      expect(payload.negative_prompt).toBe('low quality');
      expect(payload.steps).toBe(20);
      expect(payload.alwayson_scripts).toBeDefined();
      expect(payload.alwayson_scripts.ADetailer).toBeDefined();
    });

    it('should handle ControlNet in preset', () => {
      const preset = {
        name: 'test',
        type: 'txt2img',
        base_settings: {
          steps: 20,
          cfg_scale: 7.0,
          width: 1024,
          height: 1024
        },
        extensions: {
          controlnet: {
            enabled: true,
            units: [{
              model: 'CN-Anytest3_animagine4_A',
              module: 'none',
              pixel_perfect: true
            }]
          }
        }
      };

      const payload = manager.presetToPayload(preset, { prompt: 'test' });

      expect(payload.alwayson_scripts.ControlNet).toBeDefined();
      expect(payload.alwayson_scripts.ControlNet.args).toHaveLength(1);
      expect(payload.alwayson_scripts.ControlNet.args[0].model).toBe('CN-Anytest3_animagine4_A');
    });

    it('should merge user parameters with preset', () => {
      const preset = {
        name: 'test',
        type: 'txt2img',
        base_settings: {
          steps: 20,
          cfg_scale: 7.0,
          width: 1024,
          height: 1024,
          seed: -1
        }
      };

      const userParams = {
        prompt: 'custom prompt',
        steps: 30, // Override preset value
        seed: 12345 // Override preset value
      };

      const payload = manager.presetToPayload(preset, userParams);

      expect(payload.prompt).toBe('custom prompt');
      expect(payload.steps).toBe(30); // User value
      expect(payload.seed).toBe(12345); // User value
      expect(payload.cfg_scale).toBe(7.0); // Preset value
    });
  });
});