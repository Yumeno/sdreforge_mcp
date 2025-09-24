#!/usr/bin/env node

import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';
import { TemplateProcessor } from './template-processor';

interface SetupOptions {
  interactive?: boolean;
  force?: boolean;
  validate?: boolean;
  generateSample?: boolean;
}

class SetupCLI {
  private templateProcessor: TemplateProcessor;
  private templateDir: string;
  private presetsDir: string;

  constructor() {
    this.templateDir = path.join(process.cwd(), 'preset-templates');
    this.presetsDir = path.join(process.cwd(), 'presets');
    this.templateProcessor = new TemplateProcessor();
  }

  async run(options: SetupOptions = {}): Promise<void> {
    console.log('🚀 SD WebUI Reforge MCP - Preset Setup Tool');
    console.log('============================================\n');

    try {
      if (options.generateSample) {
        await this.generateSampleEnv();
        return;
      }

      if (options.validate) {
        await this.validateOnly();
        return;
      }

      if (options.interactive) {
        await this.interactiveSetup();
      } else {
        await this.automaticSetup(options.force);
      }

    } catch (error) {
      console.error('❌ Setup failed:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  }

  private async generateSampleEnv(): Promise<void> {
    console.log('⚠️  WARNING: The --generate-sample option is deprecated!');
    console.log('');
    console.log('📋 Recommended approach:');

    const platform = process.platform;
    if (platform === 'win32') {
      console.log('   Windows (Command Prompt): copy .env.sample .env');
      console.log('   Windows (PowerShell):     Copy-Item .env.sample .env');
    } else {
      console.log('   Linux/macOS: cp .env.sample .env');
    }

    console.log('   Then customize the .env file with your preferences');
    console.log('   Run: npm run setup:presets');
    console.log('');
    console.log('💡 The .env.sample file is now maintained as a static file with');
    console.log('   comprehensive comments and up-to-date default values.');
    console.log('   This prevents configuration from being overwritten.');

    return;
  }

  private async validateOnly(): Promise<void> {
    const validation = this.templateProcessor.validateConfiguration(this.templateDir);

    if (validation.valid) {
      console.log('✅ Configuration is valid. All required variables are present.');
    } else {
      console.log('❌ Configuration validation failed. Missing variables:');
      validation.missing.forEach(variable => {
        console.log(`   - ${variable}`);
      });
      console.log('\nPlease check your .env file or run with --generate-sample to create a template.');
      process.exit(1);
    }
  }

  private async automaticSetup(force: boolean = false): Promise<void> {
    // Validate configuration first
    const validation = this.templateProcessor.validateConfiguration(this.templateDir);

    if (!validation.valid) {
      console.log('❌ Configuration validation failed. Missing variables:');
      validation.missing.forEach(variable => {
        console.log(`   - ${variable}`);
      });
      console.log('\nPlease run with --generate-sample to create a template .env file.');
      return;
    }

    // Check if presets directory has existing files
    if (!force && fs.existsSync(this.presetsDir)) {
      const existingFiles = fs.readdirSync(this.presetsDir)
        .filter(file => file.endsWith('.yaml') || file.endsWith('.yml'));

      if (existingFiles.length > 0) {
        console.log('⚠️  Warning: Existing preset files found in presets/ directory:');
        existingFiles.forEach(file => console.log(`   - ${file}`));
        console.log('\nTo overwrite existing files, use one of:');
        console.log('   npm run setup:presets:force');
        console.log('   npm run setup:presets -- --force');
        console.log('   npm run setup:presets:interactive (for selective processing)');
        return;
      }
    }

    console.log('📋 Processing templates...\n');
    this.templateProcessor.processAllTemplates(this.templateDir, this.presetsDir);
    console.log('\n✅ All presets generated successfully!');
    console.log('\n🔄 Next steps:');
    console.log('   1. Review the generated presets in the presets/ directory');
    console.log('   2. Run: npm run build');
    console.log('   3. Restart Claude Code to load the new presets');
  }

  private async interactiveSetup(): Promise<void> {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    const _question = (prompt: string): Promise<string> => {
      return new Promise(resolve => rl.question(prompt, resolve));
    };

    const questionWithDefault = (prompt: string, defaultValue: string): Promise<string> => {
      return new Promise(resolve => {
        rl.question(`${prompt} [${defaultValue}]: `, (answer) => {
          // ENTERキーで空入力の場合、デフォルト値を使用
          resolve(answer.trim() === '' ? defaultValue : answer.trim());
        });
      });
    };

    try {
      console.log('\n🎯 Interactive Template Setup');
      console.log('Press ENTER to use recommended default values shown in brackets.\n');

      // 推奨設定
      const recommendedDefaults = {
        DEFAULT_CHECKPOINT: 'sd_animagineXL40_v4Opt',
        DEFAULT_SAMPLER: 'Euler a',
        DEFAULT_STEPS: '28',
        DEFAULT_CFG_SCALE: '7',
        DEFAULT_WIDTH: '1024',
        DEFAULT_HEIGHT: '1024',
        DEFAULT_POSITIVE_SUFFIX: 'masterpiece, high quality, absurdres',
        DEFAULT_NEGATIVE: 'lowres, bad anatomy, bad hands, text, error, missing finger, extra digits, fewer digits, cropped, worst quality, low quality',
        CONTROLNET_MAX_UNITS: '3',
        ADETAILER_MAX_MODELS: '2',
        ADETAILER_DEFAULT_MODEL: 'face_yolov8n.pt',
        ADETAILER_CONFIDENCE: '0.3',
        ENABLE_HIRES_FIX: 'false',
        HR_UPSCALER: 'R-ESRGAN 4x+ Anime6B',
        HR_SCALE: '2.0',
        HR_DENOISING_STRENGTH: '0.7'
      };

      const userConfig: Record<string, string> = {};

      // 基本生成設定
      console.log('📐 Basic Generation Settings:');
      userConfig.DEFAULT_CHECKPOINT = await questionWithDefault(
        'Default Model Checkpoint',
        recommendedDefaults.DEFAULT_CHECKPOINT
      );
      userConfig.DEFAULT_SAMPLER = await questionWithDefault(
        'Default Sampler',
        recommendedDefaults.DEFAULT_SAMPLER
      );
      userConfig.DEFAULT_STEPS = await questionWithDefault(
        'Default Steps',
        recommendedDefaults.DEFAULT_STEPS
      );
      userConfig.DEFAULT_CFG_SCALE = await questionWithDefault(
        'Default CFG Scale',
        recommendedDefaults.DEFAULT_CFG_SCALE
      );
      userConfig.DEFAULT_WIDTH = await questionWithDefault(
        'Default Width',
        recommendedDefaults.DEFAULT_WIDTH
      );
      userConfig.DEFAULT_HEIGHT = await questionWithDefault(
        'Default Height',
        recommendedDefaults.DEFAULT_HEIGHT
      );

      // プロンプト設定
      console.log('\n📝 Prompt Settings:');
      userConfig.DEFAULT_POSITIVE_SUFFIX = await questionWithDefault(
        'Default Positive Suffix',
        recommendedDefaults.DEFAULT_POSITIVE_SUFFIX
      );
      userConfig.DEFAULT_NEGATIVE = await questionWithDefault(
        'Default Negative Prompt',
        recommendedDefaults.DEFAULT_NEGATIVE
      );

      // 拡張機能設定
      console.log('\n🔧 Extension Settings:');
      userConfig.CONTROLNET_MAX_UNITS = await questionWithDefault(
        'ControlNet Max Units',
        recommendedDefaults.CONTROLNET_MAX_UNITS
      );
      userConfig.ADETAILER_MAX_MODELS = await questionWithDefault(
        'ADetailer Max Models',
        recommendedDefaults.ADETAILER_MAX_MODELS
      );
      userConfig.ADETAILER_DEFAULT_MODEL = await questionWithDefault(
        'ADetailer Default Model',
        recommendedDefaults.ADETAILER_DEFAULT_MODEL
      );
      userConfig.ADETAILER_CONFIDENCE = await questionWithDefault(
        'ADetailer Confidence',
        recommendedDefaults.ADETAILER_CONFIDENCE
      );

      // 高度な設定
      console.log('\n⚙️ Advanced Settings:');
      userConfig.ENABLE_HIRES_FIX = await questionWithDefault(
        'Enable Hires Fix (true/false)',
        recommendedDefaults.ENABLE_HIRES_FIX
      );
      userConfig.HR_UPSCALER = await questionWithDefault(
        'Hires Fix Upscaler',
        recommendedDefaults.HR_UPSCALER
      );
      userConfig.HR_SCALE = await questionWithDefault(
        'Hires Fix Scale',
        recommendedDefaults.HR_SCALE
      );
      userConfig.HR_DENOISING_STRENGTH = await questionWithDefault(
        'Hires Fix Denoising Strength',
        recommendedDefaults.HR_DENOISING_STRENGTH
      );

      // 設定を保存
      console.log('\n💾 Saving configuration...');
      await this.saveConfigurationToFile(userConfig);

      // Check for existing files
      if (fs.existsSync(this.presetsDir)) {
        const existingFiles = fs.readdirSync(this.presetsDir)
          .filter(file => file.endsWith('.yaml') || file.endsWith('.yml'));

        if (existingFiles.length > 0) {
          console.log('\n⚠️  Existing preset files found:');
          existingFiles.forEach(file => console.log(`   - ${file}`));

          const overwrite = await questionWithDefault(
            '\nOverwrite existing files? (y/n)', 'n'
          );
          if (overwrite.toLowerCase() !== 'y' && overwrite.toLowerCase() !== 'yes') {
            console.log('Setup cancelled.');
            return;
          }
        }
      }

      console.log('\n📋 Processing templates...');

      // Create new template processor with the new config
      const newProcessor = new TemplateProcessor('.env');
      newProcessor.processAllTemplates(this.templateDir, this.presetsDir);

      console.log('\n✅ All presets generated successfully!');
      console.log('\n🔄 Next steps:');
      console.log('   1. Review the generated presets in the presets/ directory');
      console.log('   2. Run: npm run build');
      console.log('   3. Restart Claude Code to load the new presets');

    } finally {
      rl.close();
    }
  }

  private async saveConfigurationToFile(config: Record<string, string>): Promise<void> {
    try {
      const envContent = `${Object.entries(config)
        .map(([key, value]) => `${key}=${value}`)
        .join('\n')  }\n`;

      await fs.promises.writeFile('.env', envContent, 'utf-8');
      console.log('✅ Configuration saved to .env file');
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`❌ Failed to save configuration: ${message}`);
      throw new Error(`Configuration save failed: ${message}`);
    }
  }
}

// CLI argument parsing
function parseArgs(): { options: SetupOptions; command?: string } {
  const args = process.argv.slice(2);
  const options: SetupOptions = {};

  for (const arg of args) {
    switch (arg) {
      case '--interactive':
      case '-i':
        options.interactive = true;
        break;
      case '--force':
      case '-f':
        options.force = true;
        break;
      case '--validate':
      case '-v':
        options.validate = true;
        break;
      case '--generate-sample':
      case '-g':
        options.generateSample = true;
        break;
      case '--help':
      case '-h':
        showHelp();
        process.exit(0);
        break;
    }
  }

  return { options };
}

function showHelp(): void {
  console.log(`
SD WebUI Reforge MCP - Preset Setup Tool

Usage: npm run setup:presets [options]

Options:
  -i, --interactive      Run in interactive mode with prompts
  -f, --force           Force overwrite existing preset files
  -v, --validate        Validate configuration only (no generation)
  -g, --generate-sample Generate a sample .env file
  -h, --help           Show this help message

Examples:
  npm run setup:presets                    # Automatic setup
  npm run setup:presets --interactive      # Interactive setup
  npm run setup:presets --force            # Force overwrite
  npm run setup:presets --validate         # Validate only
  npm run setup:presets --generate-sample  # Generate .env template
`);
}

// Main execution
async function main() {
  const { options } = parseArgs();
  const cli = new SetupCLI();
  await cli.run(options);
}

if (require.main === module) {
  main().catch(error => {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
  });
}

export { SetupCLI, SetupOptions };