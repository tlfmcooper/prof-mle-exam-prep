#!/usr/bin/env tsx

import { readFileSync, writeFileSync } from 'fs';
import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { validateQuestions } from './validate-questions.js';
import { transformQuestion } from './ingest-to-supabase.js';
import { ingestionConfig } from '../config/ingestion.config.js';

interface BatchQuestion {
  id: string;
  question_text: string;
  question_type: 'multiple_choice' | 'multiple_select' | 'case_study';
  options: Array<{
    id: string;
    text: string;
    is_correct: boolean;
  }>;
  correct_answer_ids: string[];
  explanation?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  topics?: string[];
  source?: any;
  created_at?: string;
}

/**
 * Test ingestion with a small sample
 */
async function testIngestion(sampleSize: number = 5) {
  console.log(chalk.bold.green('\n╔═══════════════════════════════════════════════════════════╗'));
  console.log(chalk.bold.green('║           Test Ingestion - Sample Run                    ║'));
  console.log(chalk.bold.green('╚═══════════════════════════════════════════════════════════╝\n'));

  const spinner = ora('Reading merged questions...').start();

  try {
    // Read merged questions
    const content = readFileSync(ingestionConfig.outputFile, 'utf-8');
    const allQuestions: BatchQuestion[] = JSON.parse(content);

    // Take sample
    const questions = allQuestions.slice(0, sampleSize);

    spinner.succeed(`Loaded ${questions.length} sample questions (of ${allQuestions.length} total)`);

    // Validate
    console.log();
    spinner.start('Validating sample...');

    const validationResult = validateQuestions(questions);

    if (validationResult.valid) {
      spinner.succeed('Sample validation passed!');
    } else {
      spinner.warn(`Sample has ${validationResult.errors.length} errors`);
    }

    // Show validation details
    console.log('\n' + chalk.bold('Validation Summary:'));
    console.log(chalk.gray('─'.repeat(60)));
    console.log(`  Valid: ${chalk.green(validationResult.validQuestions)}`);
    console.log(`  Invalid: ${validationResult.invalidQuestions > 0 ? chalk.red(validationResult.invalidQuestions) : chalk.gray(validationResult.invalidQuestions)}`);
    console.log(`  Errors: ${validationResult.errors.length > 0 ? chalk.red(validationResult.errors.length) : chalk.gray(validationResult.errors.length)}`);
    console.log(`  Warnings: ${validationResult.warnings.length > 0 ? chalk.yellow(validationResult.warnings.length) : chalk.gray(validationResult.warnings.length)}`);
    console.log(chalk.gray('─'.repeat(60)));

    if (validationResult.errors.length > 0) {
      console.log('\n' + chalk.red('Errors found:'));
      validationResult.errors.forEach(err => {
        console.log(chalk.red(`  [${err.questionId}] ${err.field}: ${err.message}`));
      });
    }

    if (validationResult.warnings.length > 0) {
      console.log('\n' + chalk.yellow('Warnings:'));
      validationResult.warnings.forEach(warn => {
        console.log(chalk.yellow(`  [${warn.questionId}] ${warn.field}: ${warn.message}`));
      });
    }

    // Show sample transformation
    console.log('\n' + chalk.bold('Sample Transformation:'));
    console.log(chalk.gray('─'.repeat(60)));

    console.log(chalk.cyan('\nOriginal (batch format):'));
    console.log(chalk.gray(JSON.stringify(questions[0], null, 2)));

    const transformed = transformQuestion(questions[0]);

    console.log(chalk.cyan('\nTransformed (database format):'));
    console.log(chalk.gray(JSON.stringify(transformed, null, 2)));

    console.log(chalk.gray('\n' + '─'.repeat(60)));

    // Summary
    console.log('\n' + chalk.bold.green('✓ Test completed successfully!\n'));
    console.log(chalk.gray('Next steps:'));
    console.log(chalk.gray('  1. Review the sample data above'));
    console.log(chalk.gray('  2. If everything looks good, run: npm run ingest-all:dry-run'));
    console.log(chalk.gray('  3. Then run: npm run ingest-all\n'));

  } catch (error: any) {
    spinner.fail('Test failed');
    console.error(chalk.red.bold('\n❌ Error:\n'));
    console.error(error.message);
    process.exit(1);
  }
}

/**
 * Main execution
 */
async function main() {
  const program = new Command();

  program
    .name('test-ingestion')
    .description('Test ingestion pipeline with a small sample')
    .option('-s, --sample <size>', 'Number of questions to test', '5')
    .parse();

  const options = program.opts();

  const sampleSize = parseInt(options.sample);

  await testIngestion(sampleSize);
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1].replace(/\\/g, '/')}`) {
  main();
}

export { testIngestion };
