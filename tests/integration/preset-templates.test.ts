/**
 * Preset Templates Validation
 * preset-templates/ の全テンプレートを .env.sample の値で一時ディレクトリに生成し、
 * プリセットの読み込みとMCPツール生成まで通ることを検証する(SD WebUI 不要)
 */

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { TemplateProcessor } from '../../src/setup/template-processor';
import { ToolGenerator } from '../../src/server/tool-generator';
import { PresetManager, Preset } from '../../src/presets';

const rootDir = path.join(__dirname, '../..');
const templateDir = path.join(rootDir, 'preset-templates');

describe('Preset Templates Validation', () => {
  let presetsDir: string;
  let templateFiles: string[];

  beforeAll(() => {
    presetsDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sdreforge-presets-'));
    templateFiles = fs.readdirSync(templateDir).filter(f => f.endsWith('.yaml.template'));

    const processor = new TemplateProcessor(path.join(rootDir, '.env.sample'));
    processor.processAllTemplates(templateDir, presetsDir);
  });

  afterAll(() => {
    fs.rmSync(presetsDir, { recursive: true, force: true });
  });

  it('should find template files', () => {
    expect(templateFiles.length).toBeGreaterThan(0);
  });

  it('should resolve all template variables with .env.sample', () => {
    for (const file of fs.readdirSync(presetsDir)) {
      const content = fs.readFileSync(path.join(presetsDir, file), 'utf-8');
      expect(content).not.toMatch(/\{\{[A-Z_][A-Z0-9_]*\}\}/);
    }
  });

  it('should load every generated preset', () => {
    const presets = new PresetManager(presetsDir).loadAllPresets();

    expect(presets).toHaveLength(templateFiles.length);
    for (const preset of presets) {
      expect(preset.name).toBeDefined();
      expect(preset.type).toBeDefined();
    }
  });

  it('should generate one MCP tool per template', () => {
    const tools = new ToolGenerator(presetsDir).generateTools();

    expect(tools).toHaveLength(templateFiles.length);
    expect(new Set(tools.map(t => t.name)).size).toBe(tools.length);

    for (const tool of tools) {
      expect(tool.name).toMatch(/^sdreforge_/);
      expect(tool.description).toBeDefined();
      expect(tool.inputSchema.type).toBe('object');
      for (const field of tool.inputSchema.required ?? []) {
        expect(tool.inputSchema.properties[field]).toBeDefined();
      }
    }
  });

  it('should require prompt (and init_image for img2img) on generation tools', () => {
    const presets = new PresetManager(presetsDir).loadAllPresets();
    const presetByToolName = new Map<string, Preset>(presets.map(p => [`sdreforge_${p.name}`, p]));
    const tools = new ToolGenerator(presetsDir).generateTools();

    for (const tool of tools) {
      const type = presetByToolName.get(tool.name)?.type;
      if (type === 'txt2img') {
        expect(tool.inputSchema.required).toContain('prompt');
      }
      if (type === 'img2img') {
        expect(tool.inputSchema.required).toEqual(expect.arrayContaining(['prompt', 'init_image']));
      }
    }
  });
});
