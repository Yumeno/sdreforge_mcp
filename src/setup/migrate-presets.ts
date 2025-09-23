#!/usr/bin/env node

import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';

interface MigrationConfig {
  backupDir?: string;
  dryRun?: boolean;
  force?: boolean;
}

class PresetMigrator {
  private presetsDir: string;
  private backupDir: string;

  constructor(config: MigrationConfig = {}) {
    this.presetsDir = path.join(process.cwd(), 'presets');
    this.backupDir = config.backupDir ?? path.join(process.cwd(), 'presets-backup');
  }

  /**
   * Main migration method
   */
  async migrate(config: MigrationConfig = {}): Promise<void> {
    console.log('🔄 SD WebUI Reforge MCP - Preset Migration Tool');
    console.log('==============================================\n');

    try {
      // Check if presets directory exists
      if (!fs.existsSync(this.presetsDir)) {
        console.log('❌ Presets directory not found. Nothing to migrate.');
        return;
      }

      // Analyze current presets
      const analysis = this.analyzePresets();
      this.showAnalysis(analysis);

      if (analysis.totalFiles === 0) {
        console.log('No preset files found. Nothing to migrate.');
        return;
      }

      // Create backup
      if (!config.dryRun) {
        this.createBackup();
      }

      // Perform migration
      this.performMigration(analysis, config);

      if (!config.dryRun) {
        console.log('\n✅ Migration completed successfully!');
        console.log(`📁 Backup created in: ${this.backupDir}`);
        console.log('\n🔄 Next steps:');
        console.log('   1. Review the migrated presets');
        console.log('   2. Run: npm run build');
        console.log('   3. Restart Claude Code to load the new presets');
      }

    } catch (error) {
      console.error('❌ Migration failed:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  }

  /**
   * Analyze existing presets
   */
  private analyzePresets(): any {
    const files = fs.readdirSync(this.presetsDir);
    const yamlFiles = files.filter(file =>
      (file.endsWith('.yaml') || file.endsWith('.yml')) &&
      !file.includes('template') &&
      !file.startsWith('.')
    );

    const analysis = {
      totalFiles: yamlFiles.length,
      deprecated: [] as string[],
      current: [] as string[],
      dynamic: [] as string[],
      utility: [] as string[],
      extras: [] as string[],
      unknown: [] as string[]
    };

    for (const file of yamlFiles) {
      const filePath = path.join(this.presetsDir, file);

      try {
        const content = fs.readFileSync(filePath, 'utf-8');
        const preset = yaml.load(content) as any;

        if (!preset?.name || !preset.type) {
          analysis.unknown.push(file);
          continue;
        }

        // Categorize presets
        if (file.includes('dynamic')) {
          analysis.dynamic.push(file);
        } else if (preset.type === 'utility') {
          analysis.utility.push(file);
        } else if (preset.type === 'extras' || preset.type === 'extras_combined') {
          analysis.extras.push(file);
        } else if (this.isDeprecatedPreset(preset)) {
          analysis.deprecated.push(file);
        } else {
          analysis.current.push(file);
        }

      } catch (error) {
        console.warn(`⚠️  Failed to parse ${file}: ${error instanceof Error ? error.message : String(error)}`);
        analysis.unknown.push(file);
      }
    }

    return analysis;
  }

  /**
   * Check if a preset is deprecated (can be replaced by dynamic presets)
   */
  private isDeprecatedPreset(preset: any): boolean {
    const deprecatedPatterns = [
      'animagine_base',
      'animagine_face_hand',
      'animagine_multi_detect',
      'cn_multi_3units',
      'cn4_rp_matrix'
    ];

    return deprecatedPatterns.some(pattern =>
      preset.name.includes(pattern) ||
      (preset.description?.includes(pattern))
    );
  }

  /**
   * Show analysis results
   */
  private showAnalysis(analysis: any): void {
    console.log('📊 Preset Analysis:');
    console.log(`   Total files: ${analysis.totalFiles}`);
    console.log(`   Dynamic presets: ${analysis.dynamic.length}`);
    console.log(`   Utility presets: ${analysis.utility.length}`);
    console.log(`   Extras presets: ${analysis.extras.length}`);
    console.log(`   Current presets: ${analysis.current.length}`);
    console.log(`   Deprecated presets: ${analysis.deprecated.length}`);
    console.log(`   Unknown/Invalid: ${analysis.unknown.length}\n`);

    if (analysis.deprecated.length > 0) {
      console.log('📋 Deprecated presets (can be replaced by dynamic presets):');
      analysis.deprecated.forEach((file: string) => console.log(`   - ${file}`));
      console.log('');
    }

    if (analysis.unknown.length > 0) {
      console.log('⚠️  Unknown/Invalid presets:');
      analysis.unknown.forEach((file: string) => console.log(`   - ${file}`));
      console.log('');
    }
  }

  /**
   * Create backup of current presets
   */
  private createBackup(): void {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
    const backupPath = `${this.backupDir}-${timestamp}`;

    if (fs.existsSync(this.presetsDir)) {
      try {
        // Use recursive copy (Node.js 16+ feature)
        if (fs.cpSync) {
          fs.cpSync(this.presetsDir, backupPath, { recursive: true });
        } else {
          // Fallback for older Node.js versions
          this.copyDirectorySync(this.presetsDir, backupPath);
        }
        console.log(`📁 Backup created: ${path.resolve(backupPath)}`);
      } catch (error) {
        console.warn(`⚠️  Backup creation failed: ${error instanceof Error ? error.message : String(error)}`);
        console.log('   Continuing without backup...');
      }
    }
  }

  /**
   * Recursive directory copy for Node.js compatibility
   */
  private copyDirectorySync(src: string, dest: string): void {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }

    const entries = fs.readdirSync(src, { withFileTypes: true });

    for (const entry of entries) {
      const srcPath = path.join(src, entry.name);
      const destPath = path.join(dest, entry.name);

      if (entry.isDirectory()) {
        this.copyDirectorySync(srcPath, destPath);
      } else {
        fs.copyFileSync(srcPath, destPath);
      }
    }
  }

  /**
   * Perform the actual migration
   */
  private performMigration(analysis: any, config: MigrationConfig): void {
    console.log('\n🔄 Migration Plan:');

    // Create deprecated directory
    const deprecatedDir = path.join(this.presetsDir, 'deprecated');

    if (analysis.deprecated.length > 0) {
      console.log(`   Move ${analysis.deprecated.length} deprecated presets to deprecated/ folder`);

      if (!config.dryRun) {
        if (!fs.existsSync(deprecatedDir)) {
          fs.mkdirSync(deprecatedDir, { recursive: true });
        }

        for (const file of analysis.deprecated) {
          const sourcePath = path.join(this.presetsDir, file);
          const targetPath = path.join(deprecatedDir, file);
          fs.renameSync(sourcePath, targetPath);
          console.log(`   ✓ Moved ${file} to deprecated/`);
        }
      }
    }

    // Handle unknown files
    if (analysis.unknown.length > 0) {
      console.log(`   Review ${analysis.unknown.length} unknown/invalid files manually`);
      analysis.unknown.forEach((file: string) => {
        console.log(`   ⚠️  Please review: ${file}`);
      });
    }

    // Show what remains
    const remaining = analysis.dynamic.length + analysis.utility.length +
                     analysis.extras.length + analysis.current.length;
    console.log(`   Keep ${remaining} current presets in main directory`);

    if (config.dryRun) {
      console.log('\n💭 This was a dry run. No files were actually moved.');
      console.log('   Run without --dry-run to perform the migration.');
    }
  }

  /**
   * Generate migration report
   */
  generateReport(): void {
    const analysis = this.analyzePresets();
    const reportPath = path.join(process.cwd(), 'migration-report.txt');

    let report = 'SD WebUI Reforge MCP - Preset Migration Report\n';
    report += '==============================================\n\n';
    report += `Generated: ${new Date().toISOString()}\n\n`;

    report += 'Analysis Results:\n';
    report += `- Total files: ${analysis.totalFiles}\n`;
    report += `- Dynamic presets: ${analysis.dynamic.length}\n`;
    report += `- Utility presets: ${analysis.utility.length}\n`;
    report += `- Extras presets: ${analysis.extras.length}\n`;
    report += `- Current presets: ${analysis.current.length}\n`;
    report += `- Deprecated presets: ${analysis.deprecated.length}\n`;
    report += `- Unknown/Invalid: ${analysis.unknown.length}\n\n`;

    if (analysis.deprecated.length > 0) {
      report += 'Deprecated Presets (recommended for migration):\n';
      analysis.deprecated.forEach((file: string) => {
        report += `- ${file}\n`;
      });
      report += '\n';
    }

    if (analysis.unknown.length > 0) {
      report += 'Unknown/Invalid Presets (require manual review):\n';
      analysis.unknown.forEach((file: string) => {
        report += `- ${file}\n`;
      });
      report += '\n';
    }

    report += 'Migration Recommendations:\n';
    report += '1. Deprecated presets can be safely moved to deprecated/ folder\n';
    report += '2. Dynamic presets (txt2img_dynamic, img2img_dynamic) provide equivalent functionality\n';
    report += '3. Utility and extras presets should remain in the main directory\n';
    report += '4. Unknown presets should be reviewed manually\n\n';

    fs.writeFileSync(reportPath, report, 'utf-8');
    console.log(`📄 Migration report generated: ${reportPath}`);
  }
}

// CLI argument parsing
function parseArgs(): MigrationConfig & { command?: string } {
  const args = process.argv.slice(2);
  const config: MigrationConfig & { command?: string } = {};

  for (const arg of args) {
    switch (arg) {
      case '--dry-run':
      case '-d':
        config.dryRun = true;
        break;
      case '--force':
      case '-f':
        config.force = true;
        break;
      case '--report':
      case '-r':
        config.command = 'report';
        break;
      case '--help':
      case '-h':
        showHelp();
        process.exit(0);
        break;
    }
  }

  return config;
}

function showHelp(): void {
  console.log(`
SD WebUI Reforge MCP - Preset Migration Tool

Usage: npm run migrate:presets [options]

Options:
  -d, --dry-run    Show what would be migrated without making changes
  -f, --force      Force migration even if backup fails
  -r, --report     Generate migration report only
  -h, --help       Show this help message

Examples:
  npm run migrate:presets --dry-run     # Preview migration
  npm run migrate:presets --report      # Generate report
  npm run migrate:presets               # Perform migration
`);
}

// Main execution
async function main() {
  const config = parseArgs();
  const migrator = new PresetMigrator(config);

  if (config.command === 'report') {
    migrator.generateReport();
  } else {
    await migrator.migrate(config);
  }
}

if (require.main === module) {
  main().catch(error => {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
  });
}

export { PresetMigrator, MigrationConfig };