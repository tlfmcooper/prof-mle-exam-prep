#!/usr/bin/env tsx

import { Command } from 'commander';
import chalk from 'chalk';
import { writeFileSync } from 'fs';
import { config } from 'dotenv';
import { mergeQuestions } from './merge-questions.js';
import { validateQuestions } from './validate-questions.js';
import { ingestQuestions } from './ingest-to-supabase.js';
import { ingestionConfig } from '../config/ingestion.config.js';
import { readFileSync } from 'fs';

// Load environment variables
config();

interface PipelineResult {
  merge?: any;
  validation?: any;
  ingestion?: any;
  duration: number;
  success: boolean;
}

/**
 * Display step header
 */
function displayStepHeader(stepNumber: number, totalSteps: number, title: string) {
  console.log(chalk.bold.blue(`\n[${'='.repeat(60)}]`));
  console.log(chalk.bold.blue(`  STEP ${stepNumber}/${totalSteps}: ${title}`));
  console.log(chalk.bold.blue(`[${'='.repeat(60)}]\n`));
}

/**
 * Run the complete ingestion pipeline
 */
async function runPipeline(dryRun: boolean = false): Promise<PipelineResult> {
  const startTime = Date.now();

  console.log(chalk.bold.cyan('\n╔═══════════════════════════════════════════════════════════╗'));
  console.log(chalk.bold.cyan('║      Question Data Ingestion Pipeline                    ║'));
  console.log(chalk.bold.cyan('╚═══════════════════════════════════════════════════════════╝\n'));

  if (dryRun) {
    console.log(chalk.yellow.bold('  🔍 DRY RUN MODE - No data will be inserted to database\n'));
  }

  const result: PipelineResult = {
    duration: 0,
    success: false
  };

  try {
    // STEP 1: Merge batch files
    displayStepHeader(1, 3, 'Merge Batch Files');

    const { questions, result: mergeResult } = await mergeQuestions();

    result.merge = mergeResult;

    if (mergeResult.errors.length > 0) {
      console.log(chalk.yellow(`⚠️  Merged with ${mergeResult.errors.length} file errors\n`));
    }

    // STEP 2: Validate questions
    displayStepHeader(2, 3, 'Validate Questions');

    const validationResult = validateQuestions(questions);

    result.validation = validationResult;

    if (!validationResult.valid) {
      console.log(chalk.red.bold('\n❌ Validation failed - aborting pipeline\n'));
      console.log(chalk.gray('Fix validation errors and try again.\n'));

      result.duration = Date.now() - startTime;
      return result;
    }

    console.log(chalk.green(`✅ All ${questions.length} questions validated successfully\n`));

    // STEP 3: Ingest to Supabase
    displayStepHeader(3, 3, 'Ingest to Supabase');

    const ingestionResult = await ingestQuestions(dryRun);

    result.ingestion = ingestionResult;

    result.duration = Date.now() - startTime;
    result.success = ingestionResult.failed === 0;

    // Final summary
    console.log(chalk.bold.blue(`\n[${'='.repeat(60)}]`));
    console.log(chalk.bold.blue('  PIPELINE SUMMARY'));
    console.log(chalk.bold.blue(`[${'='.repeat(60)}]\n`));

    console.log(chalk.bold('Merge Results:'));
    console.log(`  Files Processed: ${chalk.cyan(mergeResult.filesProcessed)}`);
    console.log(`  Total Questions: ${chalk.cyan(mergeResult.totalQuestions)}`);
    console.log(`  Unique Questions: ${chalk.cyan(mergeResult.uniqueQuestions)}`);
    console.log(`  Duplicates Removed: ${chalk.yellow(mergeResult.duplicatesRemoved)}`);

    console.log(chalk.bold('\nValidation Results:'));
    console.log(`  Valid Questions: ${chalk.green(validationResult.validQuestions)}`);
    console.log(`  Invalid Questions: ${validationResult.invalidQuestions > 0 ? chalk.red(validationResult.invalidQuestions) : chalk.gray(validationResult.invalidQuestions)}`);
    console.log(`  Errors: ${validationResult.errors.length > 0 ? chalk.red(validationResult.errors.length) : chalk.gray(validationResult.errors.length)}`);
    console.log(`  Warnings: ${validationResult.warnings.length > 0 ? chalk.yellow(validationResult.warnings.length) : chalk.gray(validationResult.warnings.length)}`);

    console.log(chalk.bold('\nIngestion Results:'));
    console.log(`  Inserted: ${chalk.green(ingestionResult.inserted)}`);
    console.log(`  Failed: ${ingestionResult.failed > 0 ? chalk.red(ingestionResult.failed) : chalk.gray(ingestionResult.failed)}`);

    console.log(chalk.bold('\nTiming:'));
    console.log(`  Total Duration: ${chalk.cyan((result.duration / 1000).toFixed(2) + 's')}`);

    console.log('\n' + chalk.bold.blue(`[${'='.repeat(60)}]\n`));

    // Save report
    if (ingestionConfig.saveReport) {
      const reportData = {
        timestamp: new Date().toISOString(),
        dryRun,
        merge: mergeResult,
        validation: {
          validQuestions: validationResult.validQuestions,
          invalidQuestions: validationResult.invalidQuestions,
          errorCount: validationResult.errors.length,
          warningCount: validationResult.warnings.length,
          errors: validationResult.errors.slice(0, 20),
          warnings: validationResult.warnings.slice(0, 20)
        },
        ingestion: ingestionResult,
        duration: result.duration,
        success: result.success
      };

      writeFileSync(
        ingestionConfig.reportPath,
        JSON.stringify(reportData, null, 2),
        'utf-8'
      );

      console.log(chalk.gray(`Report saved to ${ingestionConfig.reportPath}\n`));
    }

    if (result.success) {
      if (dryRun) {
        console.log(chalk.yellow.bold('✓ DRY RUN COMPLETED SUCCESSFULLY\n'));
        console.log(chalk.gray('Run without --dry-run to actually insert data\n'));
      } else {
        console.log(chalk.green.bold('✅ PIPELINE COMPLETED SUCCESSFULLY!\n'));
      }
    } else {
      console.log(chalk.red.bold('❌ PIPELINE COMPLETED WITH ERRORS\n'));
    }

    return result;

  } catch (error: any) {
    console.error(chalk.red.bold('\n❌ PIPELINE FAILED\n'));
    console.error(error);

    result.duration = Date.now() - startTime;
    return result;
  }
}

/**
 * Main execution
 */
async function main() {
  const program = new Command();

  program
    .name('ingest-all')
    .description('Complete question ingestion pipeline: merge → validate → ingest')
    .version('1.0.0')
    .option('-d, --dry-run', 'Run without inserting data (validation only)', false)
    .option('-v, --verbose', 'Show verbose output', false)
    .parse();

  const options = program.opts();

  // Update config verbosity
  if (options.verbose) {
    ingestionConfig.logging.verbose = true;
  }

  try {
    const result = await runPipeline(options.dryRun);

    if (result.success) {
      process.exit(0);
    } else {
      process.exit(1);
    }
  } catch (error) {
    process.exit(1);
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1].replace(/\\/g, '/')}`) {
  main();
}

export { runPipeline };
