/**
 * Test All Presets
 * Validates that all presets can be loaded and generate valid tool schemas
 */

import * as fs from 'fs';
import * as path from 'path';
import { ToolGenerator } from '../../src/server/tool-generator';
import { PresetManager } from '../../src/presets';

describe('All Presets Validation', () => {
  let toolGenerator: ToolGenerator;
  let presetManager: PresetManager;
  const presetsDir = path.join(__dirname, '../../presets');

  beforeAll(() => {
    toolGenerator = new ToolGenerator(presetsDir);
    presetManager = new PresetManager(presetsDir);
  });

  describe('Preset Files', () => {
    it('should have exactly 20 preset files', () => {
      const files = fs.readdirSync(presetsDir)
        .filter(f => f.endsWith('.yaml') && !f.includes('template'));

      expect(files.length).toBe(20);
    });

    it('should load all presets without errors', () => {
      const files = fs.readdirSync(presetsDir)
        .filter(f => f.endsWith('.yaml') && !f.includes('template'));

      const loadedPresets = [];
      for (const file of files) {
        const preset = presetManager.loadPreset(file);
        expect(preset).toBeDefined();
        expect(preset?.name).toBeDefined();
        loadedPresets.push(preset);
      }

      expect(loadedPresets.length).toBe(20);
    });
  });

  describe('Preset Categories', () => {
    const expectedPresets = {
      artistic: [
        'art_anime',
        'art_realistic',
        'art_watercolor',
        'art_oil_painting',
        'art_pencil_sketch'
      ],
      photo: [
        'photo_portrait',
        'photo_landscape',
        'photo_product',
        'photo_architecture'
      ],
      creative: [
        'creative_fantasy',
        'creative_scifi',
        'creative_retro',
        'creative_abstract'
      ],
      practical: [
        'practical_logo',
        'practical_texture',
        'practical_concept_art',
        'practical_illustration'
      ],
      img2img: [
        'img2img_style_transfer',
        'img2img_upscale',
        'img2img_variation'
      ]
    };

    for (const [category, presetNames] of Object.entries(expectedPresets)) {
      describe(`${category} presets`, () => {
        for (const presetName of presetNames) {
          it(`should have ${presetName} preset`, () => {
            const preset = presetManager.loadPreset(`${presetName}.yaml`);
            expect(preset).toBeDefined();
            expect(preset?.name).toBe(presetName);

            // Check type
            if (presetName.startsWith('img2img')) {
              expect(preset?.type).toBe('img2img');
            } else {
              expect(preset?.type).toBe('txt2img');
            }
          });
        }
      });
    }
  });

  describe('Tool Generation', () => {
    it('should generate tools from all presets', () => {
      const tools = toolGenerator.generateTools();

      // Should have 20 tools (all txt2img and img2img presets)
      expect(tools.length).toBe(20);

      // Check tool structure
      for (const tool of tools) {
        expect(tool.name).toMatch(/^sdreforge_/);
        expect(tool.description).toBeDefined();
        expect(tool.inputSchema).toBeDefined();
        expect(tool.inputSchema.type).toBe('object');
        expect(tool.inputSchema.properties).toBeDefined();
        expect(tool.inputSchema.required).toBeDefined();
      }
    });

    it('should have correct required fields for txt2img tools', () => {
      const tools = toolGenerator.generateTools();
      const txt2imgTools = tools.filter(t => !t.name.includes('img2img'));

      for (const tool of txt2imgTools) {
        expect(tool.inputSchema.required).toContain('prompt');
        expect(tool.inputSchema.properties.prompt).toBeDefined();
      }
    });

    it('should have correct required fields for img2img tools', () => {
      const tools = toolGenerator.generateTools();
      const img2imgTools = tools.filter(t => t.name.includes('img2img'));

      for (const tool of img2imgTools) {
        expect(tool.inputSchema.required).toContain('prompt');
        expect(tool.inputSchema.required).toContain('init_image');
        expect(tool.inputSchema.properties.prompt).toBeDefined();
        expect(tool.inputSchema.properties.init_image).toBeDefined();
      }
    });
  });

  describe('Preset Configurations', () => {
    it('should have valid base_settings', () => {
      const files = fs.readdirSync(presetsDir)
        .filter(f => f.endsWith('.yaml') && !f.includes('template'));

      for (const file of files) {
        const preset = presetManager.loadPreset(file);
        expect(preset?.base_settings).toBeDefined();

        // Check common settings
        expect(preset?.base_settings?.sampler_name).toBeDefined();
        expect(preset?.base_settings?.steps).toBeGreaterThan(0);
        expect(preset?.base_settings?.cfg_scale).toBeGreaterThan(0);
      }
    });

    it('should have valid prompt templates', () => {
      const files = fs.readdirSync(presetsDir)
        .filter(f => f.endsWith('.yaml') && !f.includes('template'));

      for (const file of files) {
        const preset = presetManager.loadPreset(file);
        // prompt_template is stored in base_settings or as separate field
        const presetData = preset as any;
        expect(presetData?.prompt_template).toBeDefined();

        // At least one prompt field should be defined
        const hasPromptField =
          presetData?.prompt_template?.positive_prefix ||
          presetData?.prompt_template?.positive_suffix ||
          presetData?.prompt_template?.negative;

        expect(hasPromptField).toBeTruthy();
      }
    });
  });
});