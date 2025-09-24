import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

export interface TemplateConfig {
  [key: string]: string | number | boolean;
}

export class TemplateProcessor {
  private config: TemplateConfig;

  constructor(envFilePath?: string) {
    this.config = {};
    this.loadConfig(envFilePath);
  }

  /**
   * Load configuration from .env file
   */
  private loadConfig(envFilePath?: string): void {
    // Load from specified file or default .env locations
    const envPaths = envFilePath ? [envFilePath] : [
      '.env',
      '.env.local'
    ];

    for (const envPath of envPaths) {
      if (fs.existsSync(envPath)) {
        const result = dotenv.config({ path: envPath });
        if (result.parsed) {
          Object.assign(this.config, result.parsed);
        }
        console.log(`📄 Loaded configuration from: ${envPath}`);
        break;
      }
    }

    // Ensure numeric and boolean values are properly typed
    this.normalizeConfig();
  }

  /**
   * Normalize configuration values to proper types
   */
  private normalizeConfig(): void {
    const numericKeys = [
      'DEFAULT_STEPS', 'DEFAULT_CFG_SCALE', 'DEFAULT_CLIP_SKIP',
      'DEFAULT_WIDTH', 'DEFAULT_HEIGHT', 'HIRES_DEFAULT_SCALE',
      'IMG2IMG_DEFAULT_DENOISING_STRENGTH', 'CONTROLNET_MAX_UNITS',
      'ADETAILER_MAX_MODELS', 'UPSCALER_DEFAULT_SCALE',
      'TAGGER_DEFAULT_THRESHOLD'
    ];

    const booleanKeys = [
      'REMBG_DEFAULT_ALPHA_MATTING', 'TAGGER_DEFAULT_REPLACE_UNDERSCORE',
      'TAGGER_DEFAULT_UNLOAD_MODEL'
    ];

    // Convert numeric values
    for (const key of numericKeys) {
      if (this.config[key] && typeof this.config[key] === 'string') {
        const num = parseFloat(this.config[key] as string);
        if (!isNaN(num)) {
          this.config[key] = num;
        }
      }
    }

    // Convert boolean values
    for (const key of booleanKeys) {
      if (this.config[key] && typeof this.config[key] === 'string') {
        const str = (this.config[key] as string).toLowerCase();
        this.config[key] = str === 'true' || str === '1' || str === 'yes';
      }
    }
  }

  /**
   * Process a single template file and generate the final preset
   */
  public processTemplate(templatePath: string, outputPath: string): void {
    if (!fs.existsSync(templatePath)) {
      throw new Error(`Template file not found: ${templatePath}`);
    }

    const templateContent = fs.readFileSync(templatePath, 'utf-8');
    const processedContent = this.replaceVariables(templateContent);

    // Ensure output directory exists
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    fs.writeFileSync(outputPath, processedContent, 'utf-8');
  }

  /**
   * Process all template files in a directory
   */
  public processAllTemplates(templateDir: string, outputDir: string): void {
    if (!fs.existsSync(templateDir)) {
      throw new Error(`Template directory not found: ${templateDir}`);
    }

    const files = fs.readdirSync(templateDir);
    const templateFiles = files.filter(file =>
      file.endsWith('.yaml.template') || file.endsWith('.yml.template')
    );

    if (templateFiles.length === 0) {
      console.log('⚠️  No template files found in the template directory.');
      console.log(`   Template directory: ${path.resolve(templateDir)}`);
      return;
    }

    for (const templateFile of templateFiles) {
      const templatePath = path.join(templateDir, templateFile);
      const outputFileName = templateFile.replace(/\.template$/, '');
      const outputPath = path.join(outputDir, outputFileName);

      console.log(`   📝 Processing: ${templateFile} -> ${outputFileName}`);
      this.processTemplate(templatePath, outputPath);
    }
  }

  /**
   * Replace template variables with actual values
   */
  private replaceVariables(content: string): string {
    return content.replace(/\{\{([A-Z_][A-Z0-9_]*)\}\}/g, (match, varName) => {
      if (varName in this.config) {
        return String(this.config[varName]);
      } else {
        console.warn(`Warning: Template variable ${varName} not found in configuration`);
        return match; // Keep original placeholder if not found
      }
    });
  }

  /**
   * Validate that all required variables are present
   */
  public validateConfiguration(templateDir: string): { valid: boolean; missing: string[] } {
    const allVariables = this.extractAllVariables(templateDir);
    const missing = allVariables.filter(varName => !(varName in this.config));

    return {
      valid: missing.length === 0,
      missing
    };
  }

  /**
   * Extract all template variables from template files
   */
  private extractAllVariables(templateDir: string): string[] {
    const variables = new Set<string>();

    if (!fs.existsSync(templateDir)) {
      return [];
    }

    const files = fs.readdirSync(templateDir);
    const templateFiles = files.filter(file =>
      file.endsWith('.yaml.template') || file.endsWith('.yml.template')
    );

    for (const templateFile of templateFiles) {
      const templatePath = path.join(templateDir, templateFile);
      const content = fs.readFileSync(templatePath, 'utf-8');

      const matches = content.matchAll(/\{\{([A-Z_][A-Z0-9_]*)\}\}/g);
      for (const match of matches) {
        variables.add(match[1]);
      }
    }

    return Array.from(variables).sort();
  }

  /**
   * Get current configuration
   */
  public getConfig(): TemplateConfig {
    return { ...this.config };
  }

  /**
   * Set configuration value
   */
  public setConfig(key: string, value: string | number | boolean): void {
    this.config[key] = value;
  }

  /**
   * Generate a sample .env file with all required variables
   * @deprecated This method is deprecated. Use static .env.sample file instead.
   * The .env.sample file is now maintained manually with comprehensive comments
   * and up-to-date default values to prevent configuration overwrites.
   */
  public generateSampleEnv(templateDir: string, outputPath: string): void {
    const variables = this.extractAllVariables(templateDir);
    const defaultValues: { [key: string]: string } = {
      'SD_WEBUI_URL': 'http://localhost:7860',
      'DEFAULT_CHECKPOINT': 'sd_animagineXL40_v4Opt',
      'DEFAULT_SAMPLER': 'Euler a',
      'DEFAULT_SCHEDULER': 'Automatic',
      'DEFAULT_STEPS': '28',
      'DEFAULT_CFG_SCALE': '5',
      'DEFAULT_CLIP_SKIP': '1',
      'DEFAULT_WIDTH': '1024',
      'DEFAULT_HEIGHT': '1024',
      'POSITIVE_SUFFIX': 'masterpiece, high score, great score, absurdres',
      'NEGATIVE_BASE': 'lowres, bad anatomy, bad hands, text, error, missing finger, extra digits, fewer digits, cropped, worst quality, low quality, low score, bad score, average score, signature, watermark, username, blurry',
      'HIRES_DEFAULT_SCALE': '2.0',
      'HIRES_DEFAULT_UPSCALER': 'R-ESRGAN 4x+ Anime6B',
      'IMG2IMG_DEFAULT_DENOISING_STRENGTH': '0.5',
      'CONTROLNET_MAX_UNITS': '3',
      'ADETAILER_MAX_MODELS': '2',
      'RP_DEFAULT_MODE': 'Matrix',
      'RP_DEFAULT_BASE_RATIO': '0.2',
      'RP_DEFAULT_CALC_MODE': 'Attention',
      'UPSCALER_DEFAULT_MODEL': 'R-ESRGAN 4x+ Anime6B',
      'UPSCALER_DEFAULT_SCALE': '2',
      'REMBG_DEFAULT_MODEL': 'isnet-anime',
      'REMBG_DEFAULT_ALPHA_MATTING': 'true',
      'TAGGER_DEFAULT_MODEL': 'wd-v1-4-moat-tagger-v2',
      'TAGGER_DEFAULT_THRESHOLD': '0.35',
      'TAGGER_DEFAULT_REPLACE_UNDERSCORE': 'true',
      'TAGGER_DEFAULT_UNLOAD_MODEL': 'false'
    };

    let content = '# Preset Template Configuration\n';
    content += '# Modify these values to match your preferences\n\n';

    for (const variable of variables) {
      const defaultValue = defaultValues[variable] || 'VALUE_NEEDED';
      content += `${variable}=${defaultValue}\n`;
    }

    fs.writeFileSync(outputPath, content, 'utf-8');
    console.log(`Generated sample environment file: ${outputPath}`);
  }
}